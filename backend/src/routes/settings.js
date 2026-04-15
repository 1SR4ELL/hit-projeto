const express = require('express')
const bcrypt = require('bcryptjs')
const { authenticate, requireRole } = require('../middleware/auth')
const { encrypt } = require('../utils/crypto')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } })
    res.json({ tenant: { ...tenant, metaAccessTokenEnc: undefined, openaiApiKeyEnc: undefined } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/persona', async (req, res) => {
  try {
    const { nomeAssistente, tomVoz, formalidade, bioAssistente, saudacaoPersonalizada, palavrasChaveEscalonamento } = req.body
    await prisma.tenant.update({ where: { id: req.tenantId }, data: { nomeAssistente, tomVoz, formalidade, bioAssistente, saudacaoPersonalizada, palavrasChaveEscalonamento } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/api-keys', requireRole('ADMIN'), async (req, res) => {
  try {
    const { metaAccessToken, openaiApiKey } = req.body
    const data = {}
    if (metaAccessToken) data.metaAccessTokenEnc = encrypt(metaAccessToken)
    if (openaiApiKey) data.openaiApiKeyEnc = encrypt(openaiApiKey)
    await prisma.tenant.update({ where: { id: req.tenantId }, data })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/users', requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({ where: { tenantId: req.tenantId }, select: { id: true, nome: true, email: true, role: true, ativo: true, ultimoLogin: true, createdAt: true } })
    res.json(users)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/users', requireRole('ADMIN'), async (req, res) => {
  try {
    const { nome, email, password, role } = req.body
    const senhaHash = await bcrypt.hash(password, 12)
    const u = await prisma.usuario.create({ data: { tenantId: req.tenantId, nome, email, senhaHash, role: role||'OPERADOR' } })
    res.status(201).json({ id: u.id, nome: u.nome, email: u.email, role: u.role })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await prisma.usuario.findUnique({ where: { id: req.user.id } })
    const valid = await bcrypt.compare(currentPassword, user.senhaHash)
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' })
    const senhaHash = await bcrypt.hash(newPassword, 12)
    await prisma.usuario.update({ where: { id: req.user.id }, data: { senhaHash } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
