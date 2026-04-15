const express = require('express')
const { authenticate } = require('../middleware/auth')
const { decrypt } = require('../utils/crypto')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { q, optIn, interesse, page = 1, limit = 20 } = req.query
    const where = { tenantId: req.tenantId }
    if (optIn) where.optInStatus = optIn
    if (interesse) where.interessePrincipal = { contains: interesse }

    const [eleitores, total] = await Promise.all([
      prisma.eleitor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.eleitor.count({ where }),
    ])

    res.json({
      data: eleitores.map(e => ({ ...e, whatsappNumberEnc: undefined })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/export/csv', async (req, res) => {
  try {
    const eleitores = await prisma.eleitor.findMany({ where: { tenantId: req.tenantId } })
    const rows = ['Nome,Municipio,Bairro,Interesse,OptIn,Interacoes,Criado']
    eleitores.forEach(e => rows.push(`${e.nomePreferido || ''},${e.municipio || ''},${e.bairro || ''},${e.interessePrincipal || ''},${e.optInStatus},${e.totalInteracoes},${e.createdAt.toISOString()}`))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="eleitores.csv"')
    res.send('\uFEFF' + rows.join('\n'))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const e = await prisma.eleitor.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { sessoes: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    if (!e) return res.status(404).json({ error: 'Eleitor não encontrado' })
    res.json({ ...e, whatsappNumberEnc: undefined })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const { nomePreferido, municipio, bairro, interessePrincipal, zonaEleitoral, secaoEleitoral } = req.body
    await prisma.eleitor.updateMany({
      where: { id: req.params.id, tenantId: req.tenantId },
      data: { nomePreferido, municipio, bairro, interessePrincipal, zonaEleitoral, secaoEleitoral },
    })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
