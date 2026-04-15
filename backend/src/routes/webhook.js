const express = require('express')
const crypto = require('crypto')
const config = require('../config')
const logger = require('../utils/logger')
const { getOrCreateEleitor, getOrCreateSession, appendMessage, getHistory, escalateToHuman, updateEleitorOptin, processOptOut } = require('../services/sessionManager')
const { buildSystemPrompt, detectIntent, detectOptOut } = require('../services/promptBuilder')
const { chat, moderate } = require('../services/openaiService')
const { search } = require('../services/ragService')
const { sendText, markAsRead, isSafeToSend } = require('../services/whatsappService')
const prisma = require('../utils/prismaClient')

const router = express.Router()

// GET /webhook/:tenantId — verificação Meta
router.get('/:tenantId', async (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query
  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    logger.info(`Webhook verificado para tenant ${req.params.tenantId}`)
    return res.send(challenge)
  }
  res.status(403).send('Forbidden')
})

// POST /webhook/:tenantId — recebe mensagens
router.post('/:tenantId', async (req, res) => {
  // Responde 200 imediatamente para a Meta
  res.sendStatus(200)

  try {
    const { tenantId } = req.params

    // Valida assinatura HMAC
    const sig = req.headers['x-hub-signature-256']
    if (sig && config.meta.appSecret) {
      const expected = 'sha256=' + crypto.createHmac('sha256', config.meta.appSecret).update(req.rawBody || '').digest('hex')
      if (sig !== expected) { logger.warn('Assinatura HMAC inválida'); return }
    }

    const body = req.body
    if (body.object !== 'whatsapp_business_account') return

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant || !tenant.ativo) return

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue
        const value = change.value
        for (const msg of (value.messages || [])) {
          await processMessage(msg, value.contacts?.[0], tenant)
        }
      }
    }
  } catch (err) {
    logger.error('Erro no webhook:', err.message)
  }
})

async function processMessage(msg, contact, tenant) {
  try {
    const waId = msg.from
    const waNumber = contact?.wa_id || msg.from

    // Extrai texto
    let text = ''
    if (msg.type === 'text') text = msg.text?.body || ''
    else if (msg.type === 'interactive') {
      text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || ''
    } else if (msg.type === 'button') {
      text = msg.button?.text || ''
    } else {
      // Mídia — ignora silenciosamente
      return
    }

    if (!text.trim()) return

    // Marca como lida
    await markAsRead(tenant, msg.id).catch(() => {})

    // Busca/cria eleitor e sessão
    const eleitor = await getOrCreateEleitor(tenant.id, waId, waNumber)
    const sessao = await getOrCreateSession(tenant.id, eleitor.id)

    // Verifica se sessão já está escalada para humano
    if (sessao.escalonadoParaHumano) {
      await appendMessage(sessao.id, 'user', text)
      // Emite para o dashboard via socket
      const { io } = require('../index')
      if (io) io.to(tenant.id).emit('new_message', { sessaoId: sessao.id, role: 'user', content: text })
      return
    }

    // Detecta opt-out
    const optOutKeywords = tenant.palavrasChaveEscalonamento ? [] : config.whatsapp.optOutKeywords
    if (detectOptOut(text, config.whatsapp.optOutKeywords)) {
      await processOptOut(eleitor.id, tenant.id)
      await sendText(tenant, waNumber, 'Você foi removido da nossa lista. Para se recadastrar, entre em contato novamente.')
      return
    }

    // Verifica opt-in
    if (eleitor.optInStatus === 'PENDENTE') {
      const sim = /sim|aceito|pode|ok|s|yes/i.test(text)
      const nao = /não|nao|recuso|parar|stop/i.test(text)
      if (sim) {
        await updateEleitorOptin(eleitor.id, 'ACEITO')
        const nome = contact?.profile?.name || ''
        if (nome) await prisma.eleitor.update({ where: { id: eleitor.id }, data: { nomePreferido: nome } })
      } else if (nao) {
        await processOptOut(eleitor.id, tenant.id)
        await sendText(tenant, waNumber, 'Tudo bem! Não enviaremos mais mensagens. Tchau!')
        return
      } else {
        // Ainda não respondeu — não processa
        return
      }
    }

    if (eleitor.optInStatus === 'OPTOUT') return

    // Anti-ban check
    const safeCheck = isSafeToSend(tenant)
    if (!safeCheck.safe) {
      logger.warn(`Mensagem bloqueada anti-ban: ${safeCheck.reason}`)
      return
    }

    // Detecta escalamento
    const escalonamento = tenant.palavrasChaveEscalonamento || config.whatsapp.escalateKeywords.join(',')
    const palavrasEsc = escalonamento.split(',').map(p => p.trim().toLowerCase())
    const precisaEscalar = palavrasEsc.some(p => text.toLowerCase().includes(p))

    if (precisaEscalar) {
      await escalateToHuman(sessao.id, null)
      await appendMessage(sessao.id, 'user', text)
      await sendText(tenant, waNumber, `Entendido! Sua mensagem foi encaminhada para um membro da nossa equipe. Em breve entraremos em contato. 📞`)
      const { io } = require('../index')
      if (io) io.to(tenant.id).emit('escalation', { sessaoId: sessao.id, eleitorId: eleitor.id, message: text })
      return
    }

    // Busca RAG
    const contextRAG = await search(text, tenant.id, tenant)

    // Histórico
    const historico = await getHistory(sessao.id)
    const intentAtual = detectIntent(text)

    // Atualiza intent na sessão
    if (intentAtual !== 'indefinido') {
      await prisma.sessao.update({ where: { id: sessao.id }, data: { intentDetectada: intentAtual } })
    }

    // Atualiza interesse do eleitor
    if (intentAtual !== 'indefinido' && intentAtual !== 'saudacao') {
      await prisma.eleitor.update({ where: { id: eleitor.id }, data: { interessePrincipal: intentAtual } }).catch(() => {})
    }

    // Constrói prompt e chama GPT
    const systemPrompt = buildSystemPrompt({ tenant, eleitor, intentAtual, historico, contextRAG })
    const { content: resposta, tokens } = await chat(tenant, systemPrompt, text)

    // Moderação
    const bloqueado = await moderate(tenant, resposta)
    if (bloqueado) {
      logger.warn(`Resposta bloqueada pela moderação para sessão ${sessao.id}`)
      return
    }

    // Envia resposta
    await sendText(tenant, waNumber, resposta)

    // Persiste mensagens
    await appendMessage(sessao.id, 'user', text)
    await appendMessage(sessao.id, 'assistant', resposta)

    // Atualiza contadores
    await prisma.sessao.update({ where: { id: sessao.id }, data: { totalTokens: { increment: tokens } } })
    await prisma.tenant.update({ where: { id: tenant.id }, data: { mensagensHoje: { increment: 1 } } })
    await prisma.eleitor.update({ where: { id: eleitor.id }, data: { totalInteracoes: { increment: 1 }, ultimaInteracao: new Date() } })

    // Emite para o dashboard
    const { io } = require('../index')
    if (io) io.to(tenant.id).emit('new_message', { sessaoId: sessao.id, eleitorId: eleitor.id, role: 'user', content: text })

  } catch (err) {
    logger.error('Erro ao processar mensagem:', err.message)
  }
}

module.exports = router
