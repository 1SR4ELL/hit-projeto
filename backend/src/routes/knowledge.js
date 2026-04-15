const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticate } = require('../middleware/auth')
const { indexDocument } = require('../services/ragService')
const config = require('../config')
const prisma = require('../utils/prismaClient')

const router = express.Router()
router.use(authenticate)

const upload = multer({ dest: config.upload.dir, limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 } })

router.get('/', async (req, res) => {
  try {
    const docs = await prisma.documento.findMany({ where: { tenantId: req.tenantId }, orderBy: { createdAt: 'desc' } })
    res.json(docs)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { titulo, tipo, conteudo } = req.body
    if (!titulo || !conteudo) return res.status(400).json({ error: 'titulo e conteudo obrigatorios' })
    const doc = await prisma.documento.create({ data: { tenantId: req.tenantId, titulo, tipo: tipo||'TEXTO', conteudo } })
    indexDocument(doc.id, conteudo, req.tenantId, req.tenant).catch(e => console.error(e))
    res.status(201).json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' })
    let conteudo = ''
    if (req.file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse')
      const buf = fs.readFileSync(req.file.path)
      const data = await pdfParse(buf)
      conteudo = data.text
    } else {
      conteudo = fs.readFileSync(req.file.path, 'utf-8')
    }
    const doc = await prisma.documento.create({ data: { tenantId: req.tenantId, titulo: req.body.titulo||req.file.originalname, tipo: req.body.tipo||'ARQUIVO', conteudo, arquivoPath: req.file.path, tamanhoBytes: req.file.size, mimeType: req.file.mimetype } })
    indexDocument(doc.id, conteudo, req.tenantId, req.tenant).catch(e => console.error(e))
    res.status(201).json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { titulo, tipo, conteudo } = req.body
    const doc = await prisma.documento.updateMany({ where: { id: req.params.id, tenantId: req.tenantId }, data: { titulo, tipo, conteudo, processado: false, updatedAt: new Date() } })
    if (conteudo) indexDocument(req.params.id, conteudo, req.tenantId, req.tenant).catch(e => console.error(e))
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.documentoChunk.deleteMany({ where: { documentoId: req.params.id } })
    await prisma.documento.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
