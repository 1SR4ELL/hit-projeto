const { generateEmbedding } = require('./openaiService')
const logger = require('../utils/logger')
const prisma = require('../utils/prismaClient')

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const TOP_K = 5
const MIN_SIMILARITY = 0.30

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk)
    start += size - overlap
  }
  return chunks
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; normA += a[i]*a[i]; normB += b[i]*b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

async function indexDocument(documentoId, conteudo, tenantId, tenant) {
  const chunks = chunkText(conteudo)
  logger.info(`Indexando documento ${documentoId}: ${chunks.length} chunks`)
  await prisma.documentoChunk.deleteMany({ where: { documentoId } })
  let indexed = 0
  for (let i = 0; i < chunks.length; i++) {
    try {
      let embeddingStr = null
      try {
        const vec = await generateEmbedding(chunks[i], tenant)
        embeddingStr = JSON.stringify(vec)
      } catch (e) {
        logger.warn(`Embedding indisponivel para chunk ${i}`)
      }
      await prisma.documentoChunk.create({
        data: { documentoId, tenantId, conteudo: chunks[i], embedding: embeddingStr, chunkIndex: i },
      })
      indexed++
    } catch (err) { logger.error(`Erro chunk ${i}:`, err.message) }
  }
  await prisma.documento.update({ where: { id: documentoId }, data: { processado: true, totalChunks: indexed } })
  return { indexed, total: chunks.length }
}

async function search(query, tenantId, tenant) {
  try {
    const chunks = await prisma.documentoChunk.findMany({ where: { tenantId }, select: { conteudo: true, embedding: true } })
    if (chunks.length === 0) return ''
    const withEmbedding = chunks.filter(c => c.embedding)
    let results = []
    if (withEmbedding.length > 0) {
      try {
        const queryVec = await generateEmbedding(query, tenant)
        const scored = withEmbedding.map(c => ({ conteudo: c.conteudo, similarity: cosineSimilarity(queryVec, JSON.parse(c.embedding)) }))
        results = scored.filter(r => r.similarity >= MIN_SIMILARITY).sort((a,b) => b.similarity-a.similarity).slice(0,TOP_K)
      } catch {}
    }
    if (results.length === 0) {
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      results = chunks.map(c => ({ conteudo: c.conteudo, similarity: words.reduce((acc,w) => acc+(c.conteudo.toLowerCase().includes(w)?1:0),0)/(words.length||1) })).filter(r=>r.similarity>0).sort((a,b)=>b.similarity-a.similarity).slice(0,TOP_K)
    }
    return results.map(r => r.conteudo).join('\n\n---\n\n')
  } catch (err) { logger.error('Erro RAG:', err.message); return '' }
}

module.exports = { indexDocument, search, chunkText }
