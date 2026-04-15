const { hash, encrypt, decrypt } = require('../utils/crypto')
const config = require('../config')
const logger = require('../utils/logger')
const prisma = require('../utils/prismaClient')

async function getOrCreateEleitor(tenantId, waId, waNumber) {
  const waIdHash = hash(waId)
  const waNumberEnc = encrypt(waNumber)
  let eleitor = await prisma.eleitor.findUnique({ where: { tenantId_whatsappIdHash: { tenantId, whatsappIdHash: waIdHash } } })
  if (!eleitor) {
    eleitor = await prisma.eleitor.create({ data: { tenantId, whatsappIdHash: waIdHash, whatsappNumberEnc: waNumberEnc } })
    logger.info(`Novo eleitor criado: ${eleitor.id}`)
  }
  return eleitor
}

async function getOrCreateSession(tenantId, eleitorId) {
  const inactiveThreshold = new Date(Date.now() - config.session.inactiveAfterHours * 3600000)
  let sessao = await prisma.sessao.findFirst({ where: { tenantId, eleitorId, ativa: true, createdAt: { gte: inactiveThreshold } }, orderBy: { createdAt: 'desc' } })
  if (!sessao) {
    if (sessao) await prisma.sessao.update({ where: { id: sessao.id }, data: { ativa: false, encerradoAt: new Date() } })
    sessao = await prisma.sessao.create({ data: { tenantId, eleitorId, mensagensEnc: encrypt(JSON.stringify([])) } })
    logger.info(`Nova sessão criada: ${sessao.id}`)
  }
  return sessao
}

async function appendMessage(sessaoId, role, content) {
  const sessao = await prisma.sessao.findUnique({ where: { id: sessaoId } })
  let msgs = []
  try { msgs = JSON.parse(decrypt(sessao.mensagensEnc) || '[]') } catch {}
  msgs.push({ role, content, timestamp: new Date().toISOString() })
  if (msgs.length > config.session.maxHistoryMessages * 2) msgs = msgs.slice(-config.session.maxHistoryMessages * 2)
  await prisma.sessao.update({ where: { id: sessaoId }, data: { mensagensEnc: encrypt(JSON.stringify(msgs)) } })
  return msgs
}

async function getHistory(sessaoId) {
  const sessao = await prisma.sessao.findUnique({ where: { id: sessaoId } })
  if (!sessao) return []
  try { return JSON.parse(decrypt(sessao.mensagensEnc) || '[]') } catch { return [] }
}

async function escalateToHuman(sessaoId, operadorId) {
  await prisma.sessao.update({ where: { id: sessaoId }, data: { escalonadoParaHumano: true, operadorId } })
}

async function updateEleitorOptin(eleitorId, status) {
  await prisma.eleitor.update({ where: { id: eleitorId }, data: { optInStatus: status, optInTimestamp: new Date(), totalInteracoes: { increment: 1 }, ultimaInteracao: new Date() } })
}

async function processOptOut(eleitorId, tenantId) {
  await prisma.eleitor.update({ where: { id: eleitorId }, data: { optInStatus: 'OPTOUT' } })
  await prisma.agendamento.updateMany({ where: { eleitorId, tenantId, status: 'PENDENTE' }, data: { status: 'CANCELADO', erroMensagem: 'Opt-out do eleitor' } })
  logger.info(`Opt-out processado para eleitor ${eleitorId}`)
}

module.exports = { getOrCreateEleitor, getOrCreateSession, appendMessage, getHistory, escalateToHuman, updateEleitorOptin, processOptOut }
