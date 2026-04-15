const express = require('express')
const { authenticate } = require('../middleware/auth')
const { decrypt, encrypt } = require('../utils/crypto')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { escalonado, ativa, page = 1, limit = 20 } = req.query
    const where = { tenantId: req.tenantId }
    if (escalonado !== undefined) where.escalonadoParaHumano = escalonado === 'true'
    if (ativa !== undefined) where.ativa = ativa === 'true'

    const [sessoes, total] = await Promise.all([
      prisma.sessao.findMany({
        where,
        include: { eleitor: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.sessao.count({ where }),
    ])

    // Adiciona preview da última mensagem
    const data = sessoes.map(s => {
      let previewUltimaMensagem = null
      try {
        const msgs = JSON.parse(decrypt(s.mensagensEnc) || '[]')
        if (msgs.length > 0) previewUltimaMensagem = msgs[msgs.length - 1].content?.slice(0, 80)
      } catch {}
      return { ...s, mensagensEnc: undefined, previewUltimaMensagem }
    })

    res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { eleitor: true },
    })
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada' })

    let historico = []
    try { historico = JSON.parse(decrypt(sessao.mensagensEnc) || '[]') } catch {}

    res.json({ ...sessao, mensagensEnc: undefined, historico })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/send', async (req, res) => {
  try {
    const { message } = req.body
    const sessao = await prisma.sessao.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { eleitor: true, tenant: true },
    })
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada' })

    let msgs = []
    try { msgs = JSON.parse(decrypt(sessao.mensagensEnc) || '[]') } catch {}
    msgs.push({ role: 'human_agent', content: message, timestamp: new Date().toISOString(), operatorId: req.user.id })
    await prisma.sessao.update({ where: { id: sessao.id }, data: { mensagensEnc: encrypt(JSON.stringify(msgs)) } })

    const { sendText } = require('../services/whatsappService')
    const numero = decrypt(sessao.eleitor.whatsappNumberEnc)
    await sendText(sessao.tenant, numero, message)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id/return-to-ai', async (req, res) => {
  try {
    await prisma.sessao.updateMany({ where: { id: req.params.id, tenantId: req.tenantId }, data: { escalonadoParaHumano: false, operadorId: null } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id/close', async (req, res) => {
  try {
    await prisma.sessao.updateMany({ where: { id: req.params.id, tenantId: req.tenantId }, data: { ativa: false, encerradoAt: new Date() } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
