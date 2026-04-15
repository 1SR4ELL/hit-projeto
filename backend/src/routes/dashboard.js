const express = require('express')
const { authenticate } = require('../middleware/auth')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/metrics', async (req, res) => {
  try {
    const tenantId = req.tenantId
    const tenant = req.tenant
    const [totalEleitores, totalSessoes, sessoesEscalonadas, sessoesAtivas, eleitoresOptIn] = await Promise.all([
      prisma.eleitor.count({ where: { tenantId } }),
      prisma.sessao.count({ where: { tenantId } }),
      prisma.sessao.count({ where: { tenantId, escalonadoParaHumano: true, ativa: true } }),
      prisma.sessao.count({ where: { tenantId, ativa: true } }),
      prisma.eleitor.count({ where: { tenantId, optInStatus: 'ACEITO' } }),
    ])
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const sessoesHoje = await prisma.sessao.count({ where: { tenantId, createdAt: { gte: hoje } } })
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
      const d2 = new Date(d); d2.setDate(d2.getDate()+1)
      const count = await prisma.sessao.count({ where: { tenantId, createdAt: { gte: d, lt: d2 } } })
      trend.push({ date: d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}), count })
    }
    res.json({
      eleitores: { total: totalEleitores, optIn: totalEleitores > 0 ? Math.round(eleitoresOptIn/totalEleitores*100) : 0 },
      conversas: { hoje: sessoesHoje, total: totalSessoes, escaladas: sessoesEscalonadas, ativas: sessoesAtivas },
      whatsapp: { qualityScore: tenant.qualityScore, tierEnvio: tenant.tierEnvio, mensagensHoje: tenant.mensagensHoje, limiteHoje: [200,800,8000][tenant.tierEnvio-1]||200, disparosPausados: tenant.disparosPausados },
      trend,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
