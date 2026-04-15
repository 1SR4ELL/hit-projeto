const jwt = require('jsonwebtoken')
const config = require('../config')
const prisma = require('../utils/prismaClient')

async function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }
  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, config.jwt.secret)
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId }, include: { tenant: true } })
    if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Usuário inativo' })
    req.user = usuario
    req.tenant = usuario.tenant
    req.tenantId = usuario.tenantId
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permissão insuficiente' })
    next()
  }
}

module.exports = { authenticate, requireRole }
