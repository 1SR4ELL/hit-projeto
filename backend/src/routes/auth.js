const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')
const { authenticate } = require('../middleware/auth')
const prisma = require('../utils/prismaClient')

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' })
    const usuario = await prisma.usuario.findUnique({ where: { email }, include: { tenant: true } })
    if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Credenciais inválidas' })
    const valid = await bcrypt.compare(password, usuario.senhaHash)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } })
    const token = jwt.sign({ userId: usuario.id, tenantId: usuario.tenantId, role: usuario.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
    res.json({ token, user: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, tenantId: usuario.tenantId }, tenant: { id: usuario.tenant.id, nomeCandidato: usuario.tenant.nomeCandidato, nomeAssistente: usuario.tenant.nomeAssistente } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: { id: req.user.id, nome: req.user.nome, email: req.user.email, role: req.user.role, tenantId: req.user.tenantId }, tenant: { id: req.tenant.id, nomeCandidato: req.tenant.nomeCandidato, nomeAssistente: req.tenant.nomeAssistente } })
})

module.exports = router
