const express = require('express')
const { authenticate } = require('../middleware/auth')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/metrics', async (req, res) => {
  try {
    const tenantId = req.tenantId
    const tenant = req.tenant

    const [totalEleitores, eleitoresOptIn, totalSessoes, sessoesEscalonadas] = await Promise.all([
      prisma.eleitor.count({ where: { tenantId } }),
      prisma.eleitor.count({ where: { tenantId, optInStatus: 'ACEITO' } }),
      prisma.sessao.count({ where: { tenantId } }),
      prisma.sessao.count({ where: { tenantId, escalonadoParaHumano: true, ativa: true } }),
    ])

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const sessoesHoje = await prisma.sessao.count({ where: { tenantId, createdAt: { gte: hoje } } })

    // Últimos 7 dias
    const ultimosSete = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const d2 = new Date(d); d2.setDate(d2.getDate() + 1)
      const total = await prisma.sessao.count({ where: { tenantId, createdAt: { gte: d, lt: d2 } } })
      ultimosSete.push({ data: d.toISOString().slice(0, 10), total })
    }

    // Distribuição de intents
    const sessoesComIntent = await prisma.sessao.findMany({
      where: { tenantId, intentDetectada: { not: null } },
      select: { intentDetectada: true },
    })
    const intentMap = {}
    sessoesComIntent.forEach(s => {
      const k = s.intentDetectada || 'OUTRO'
      intentMap[k] = (intentMap[k] || 0) + 1
    })
    const intents = Object.entries(intentMap)
      .map(([intent, total]) => ({ intent, total }))
      .sort((a, b) => b.total - a.total).slice(0, 5)

    // Interesses dos eleitores
    const eleitoresComInteresse = await prisma.eleitor.findMany({
      where: { tenantId, interessePrincipal: { not: null } },
      select: { interessePrincipal: true },
    })
    const interesseMap = {}
    eleitoresComInteresse.forEach(e => {
      const k = e.interessePrincipal || 'Outros'
      interesseMap[k] = (interesseMap[k] || 0) + 1
    })
    const interesses = Object.entries(interesseMap)
      .map(([interesse, total]) => ({ interesse, total }))
      .sort((a, b) => b.total - a.total).slice(0, 6)

    const tierLimits = { 1: 250, 2: 1000, 3: 10000 }
    const limiteDiario = tierLimits[tenant.tierEnvio] || 250

    res.json({
      eleitores: {
        total: totalEleitores,
        taxaOptin: totalEleitores > 0 ? Math.round((eleitoresOptIn / totalEleitores) * 100) : 0,
      },
      conversas: {
        hoje: sessoesHoje,
        total: totalSessoes,
        aguardandoHumano: sessoesEscalonadas,
        satisfacaoMedia: null,
        totalAvaliadas: 0,
      },
      whatsapp: {
        qualityScore: tenant.qualityScore,
        tier: tenant.tierEnvio,
        mensagensHoje: tenant.mensagensHoje,
        limiteDiario,
        disparosPausados: tenant.disparosPausados,
      },
      tendencias: {
        ultimosSete,
        intents,
        interesses,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
