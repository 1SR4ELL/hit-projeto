const express = require('express')
const axios = require('axios')
const { authenticate } = require('../middleware/auth')
const { decrypt } = require('../utils/crypto')
const config = require('../config')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const templates = await prisma.templateMeta.findMany({ where: { tenantId: req.tenantId }, orderBy: { createdAt: 'desc' } })
    res.json(templates)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { nome, categoria, idioma, headerTipo, headerConteudo, corpo, rodape, botoes } = req.body
    const t = await prisma.templateMeta.create({ data: { tenantId: req.tenantId, nome, categoria, idioma: idioma||'pt_BR', headerTipo, headerConteudo, corpo, rodape, botoes: botoes ? JSON.stringify(botoes) : null } })
    res.status(201).json(t)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/submit', async (req, res) => {
  try {
    const template = await prisma.templateMeta.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } })
    if (!template) return res.status(404).json({ error: 'Template não encontrado' })
    const token = decrypt(req.tenant.metaAccessTokenEnc)
    const phoneNumberId = req.tenant.whatsappNumberId
    const payload = { name: template.nome, category: template.categoria, language: template.idioma, components: [{ type: 'BODY', text: template.corpo }] }
    if (template.rodape) payload.components.push({ type: 'FOOTER', text: template.rodape })
    const resp = await axios.post(`${config.meta.baseUrl}/${config.meta.apiVersion}/${phoneNumberId}/message_templates`, payload, { headers: { Authorization: `Bearer ${token}` } })
    await prisma.templateMeta.update({ where: { id: template.id }, data: { status: 'PENDENTE', metaTemplateId: resp.data.id } })
    res.json({ ok: true, metaId: resp.data.id })
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.templateMeta.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
