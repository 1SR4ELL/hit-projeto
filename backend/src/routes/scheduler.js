const express = require('express')
const { authenticate } = require('../middleware/auth')
const { scheduleMessage, cancelSchedule } = require('../services/schedulerService')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query
    const where = { tenantId: req.tenantId }
    if (status) where.status = status

    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        include: { eleitor: true },
        orderBy: { agendadoPara: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.agendamento.count({ where }),
    ])

    res.json({ data: agendamentos, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { eleitorId, tipo, templateNome, variaveis, agendadoPara } = req.body
    if (!templateNome || !agendadoPara) return res.status(400).json({ error: 'templateNome e agendadoPara obrigatórios' })
    const ag = await scheduleMessage({ tenantId: req.tenantId, eleitorId, tipo: tipo || 'INDIVIDUAL', templateNome, variaveis, agendadoPara })
    res.status(201).json(ag)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/bulk', async (req, res) => {
  try {
    const { templateNome, variaveis, agendadoPara, filtros } = req.body
    const where = { tenantId: req.tenantId, optInStatus: 'ACEITO' }
    if (filtros?.municipio) where.municipio = filtros.municipio
    if (filtros?.interesse) where.interessePrincipal = filtros.interesse

    const eleitores = await prisma.eleitor.findMany({ where, select: { id: true } })
    const base = new Date(agendadoPara)
    let count = 0
    for (let i = 0; i < eleitores.length; i++) {
      const delay = i * (10 + Math.floor(Math.random() * 30)) * 1000
      const agFor = new Date(base.getTime() + delay)
      await scheduleMessage({ tenantId: req.tenantId, eleitorId: eleitores[i].id, tipo: 'MASSA', templateNome, variaveis, agendadoPara: agFor })
      count++
    }
    res.json({ ok: true, agendados: count })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await cancelSchedule(req.params.id)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
