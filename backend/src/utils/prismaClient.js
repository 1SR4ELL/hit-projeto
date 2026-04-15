/**
 * prismaClient.js — Singleton do PrismaClient.
 * Exporta uma única instância reutilizável em todos os módulos.
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

module.exports = prisma
