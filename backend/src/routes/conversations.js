/**
 * schedulerService.js — In-memory scheduler (sem Bull/Redis)
 * Compatível com SQLite para desenvolvimento local.
 * Em produção, substituir por Bull + Redis (ver schedulerService.prod.js).
 */
const config = require('../config')
const logger = require('../utils/logger')
const whatsappService = require('./whatsappService')
const { decrypt } = require('../utils/crypto')

const prisma = require('../utils/prismaClient')

// ─── MAPA DE TIMERS (job em memória) ─────────────────────────────────────────
// agendamentoId → NodeJS.Timeout
const timers = new Map()

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function buildTemplateComponents(variaveis) {
  if (!variaveis) return []
  const components = []
  if (variaveis.header) {
    components.push({ type: 'header', parameters: [{ type: 'text', text: variaveis.header }] })
  }
  if (variaveis.body && Array.isArray(variaveis.body)) {
    components.push({
      type: 'body',
      parameters: variaveis.body.map(v => ({ type: 'text', text: String(v) })),
    })
  }
  return components
}

// ─── EXECUTOR DO JOB ─────────────────────────────────────────────────────────
async function executeJob(agendamentoId) {
  timers.delete(agendamentoId)

  let agendamento
  try {
    agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { tenant: true, eleitor: true },
    })
  } catch (err) {
    logger.error(`Erro ao buscar agendamento ${agendamentoId}:`, err.message)
    return
  }

  if (!agendamento || agendamento.status !== 'PENDENTE') {
    logger.info(`Agendamento ${agendamentoId} ignorado (status: ${agendamento?.status ?? 'não encontrado'})`)
    return
  }

  // Verificar opt-in do eleitor
  if (agendamento.eleitor && agendamento.eleitor.optInStatus !== 'ACEITO') {
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'CANCELADO', erroMensagem: 'Eleitor sem opt-in ativo' },
    })
    logger.warn(`Agendamento ${agendamentoId} cancelado: eleitor sem opt-in`)
    return
  }

  // Verificar anti-ban
  const safeCheck = whatsappService.isSafeToSend(agendamento.tenant)
  if (!safeCheck.safe) {
    logger.warn(`Envio bloqueado para ${agendamentoId}: ${safeCheck.reason}`)
    // Re-agenda para 1h depois
    const novaData = new Date(Date.now() + 3_600_000)
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { agendadoPara: novaData, erroMensagem: `Adiado: ${safeCheck.reason}` },
    })
    scheduleTimer(agendamentoId, novaData)
    return
  }

  let tentativas = agendamento.tentativas
  const MAX_TENTATIVAS = 3

  try {
    const numero = decrypt(agendamento.eleitor.whatsappNumberEnc)
    const variaveis = agendamento.variaveis ? JSON.parse(agendamento.variaveis) : {}
    const components = buildTemplateComponents(variaveis)

    await whatsappService.sendTemplate(
      agendamento.tenant,
      numero,
      agendamento.templateNome,
      'pt_BR',
      components
    )

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'ENVIADO', enviadoAt: new Date() },
    })

    await prisma.tenant.update({
      where: { id: agendamento.tenantId },
      data: { mensagensHoje: { increment: 1 } },
    })

    logger.info(`Agendamento ${agendamentoId} enviado com sucesso`)
  } catch (err) {
    tentativas += 1
    logger.error(`Erro ao executar agendamento ${agendamentoId} (tentativa ${tentativas}):`, err.message)

    if (tentativas < MAX_TENTATIVAS) {
      const retryDelay = Math.pow(2, tentativas) * 60_000 // 2min, 4min
      const retryAt = new Date(Date.now() + retryDelay)
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { tentativas, erroMensagem: err.message, agendadoPara: retryAt },
      })
      scheduleTimer(agendamentoId, retryAt)
      logger.info(`Agendamento ${agendamentoId} reagendado para retry em ${retryDelay / 1000}s`)
    } else {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: 'ERRO', tentativas, erroMensagem: err.message },
      })
    }
  }
}

// ─── TIMER HELPER ─────────────────────────────────────────────────────────────
function scheduleTimer(agendamentoId, dataAgendada) {
  const delay = Math.max(new Date(dataAgendada).getTime() - Date.now(), 0)

  // Limpar timer existente se houver
  if (timers.has(agendamentoId)) {
    clearTimeout(timers.get(agendamentoId))
  }

  const timer = setTimeout(() => executeJob(agendamentoId), delay)
  // Impede que o timer bloqueie o processo de fechar
  if (timer.unref) timer.unref()
  timers.set(agendamentoId, timer)
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * Agenda envio de template HSM para um eleitor.
 */
async function scheduleMessage({ tenantId, eleitorId, tipo, templateNome, variaveis, agendadoPara }) {
  const agendamento = await prisma.agendamento.create({
    data: {
      tenantId,
      eleitorId,
      tipo,
      templateNome,
      variaveis: variaveis ? JSON.stringify(variaveis) : null,
      agendadoPara: new Date(agendadoPara),
      status: 'PENDENTE',
    },
  })

  scheduleTimer(agendamento.id, agendamento.agendadoPara)

  logger.info(`Mensagem agendada: ${agendamento.id} para ${agendadoPara}`)
  return agendamento
}

/**
 * Cancela agendamento e remove timer da memória.
 */
async function cancelSchedule(agendamentoId) {
  if (timers.has(agendamentoId)) {
    clearTimeout(timers.get(agendamentoId))
    timers.delete(agendamentoId)
  }

  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: { status: 'CANCELADO' },
  })

  logger.info(`Agendamento ${agendamentoId} cancelado`)
}

/**
 * Ao iniciar o servidor, recarrega agendamentos PENDENTE do banco para a memória.
 * Necessário porque os timers não persistem entre reinicializações.
 */
async function restoreSchedules() {
  try {
    const pendentes = await prisma.agendamento.findMany({
      where: { status: 'PENDENTE' },
    })

    for (const ag of pendentes) {
      scheduleTimer(ag.id, ag.agendadoPara)
    }

    logger.info(`${pendentes.length} agendamento(s) restaurado(s) da base de dados`)
  } catch (err) {
    logger.error('Erro ao restaurar agendamentos:', err.message)
  }
}

/**
 * Reset diário dos contadores de mensagens (cron às 00:00).
 */
async function resetDailyCounters() {
  await prisma.tenant.updateMany({
    where: {},
    data: { mensagensHoje: 0, dataResetContador: new Date() },
  })
  logger.info('Contadores diários resetados')
}

/**
 * Monitora Quality Score de todos os tenants ativos (cron 09:00 e 15:00).
 */
async function monitorQualityScores() {
  const { getQualityScore } = require('./whatsappService')
  const tenants = await prisma.tenant.findMany({ where: { ativo: true } })

  for (const tenant of tenants) {
    try {
      const { qualityRating } = await getQualityScore(tenant)
      const scoreMap = { GREEN: 'VERDE', YELLOW: 'AMARELO', RED: 'VERMELHO' }
      const novoScore = scoreMap[qualityRating] || tenant.qualityScore

      const updateData = { qualityScore: novoScore }
      if (novoScore === 'VERMELHO') updateData.disparosPausados = true
      if (novoScore === 'VERDE') updateData.disparosPausados = false

      await prisma.tenant.update({ where: { id: tenant.id }, data: updateData })

      if (novoScore !== tenant.qualityScore) {
        logger.warn(`Quality Score tenant ${tenant.id}: ${tenant.qualityScore} → ${novoScore}`)
      }
    } catch (err) {
      logger.error(`Erro ao monitorar QS do tenant ${tenant.id}:`, err.message)
    }
  }
}

module.exports = {
  scheduleMessage,
  cancelSchedule,
  restoreSchedules,
  resetDailyCounters,
  monitorQualityScores,
}
