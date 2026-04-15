const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/crypto');

/**
 * Obtém o cliente OpenAI — usa chave do tenant se disponível, senão usa global.
 */
function getClient(tenant) {
  const apiKey = tenant?.openaiApiKeyEnc
    ? decrypt(tenant.openaiApiKeyEnc)
    : config.openai.apiKey;

  if (!apiKey) throw new Error('Chave OpenAI não configurada.');
  return new OpenAI({ apiKey });
}

/**
 * Envia uma mensagem para o GPT-4o e retorna a resposta.
 * @param {object} tenant - Dados do tenant
 * @param {string} systemPrompt - System prompt completo
 * @param {string} userMessage - Mensagem do eleitor
 * @returns {{ content: string, tokens: number }}
 */
async function chat(tenant, systemPrompt, userMessage) {
  const client = getClient(tenant);

  const response = await client.chat.completions.create({
    model: config.openai.model,
    max_tokens: config.openai.maxTokens,
    temperature: config.openai.temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content || '';
  const tokens = response.usage?.total_tokens || 0;

  return { content, tokens };
}

/**
 * Modera o conteúdo de uma mensagem antes de enviar ao eleitor.
 * Retorna true se o conteúdo for seguro.
 */
async function moderate(tenant, content) {
  try {
    const client = getClient(tenant);
    const result = await client.moderations.create({ input: content });
    const flagged = result.results[0]?.flagged || false;
    if (flagged) {
      logger.warn('Conteúdo flagged pela moderação OpenAI', { categories: result.results[0]?.categories });
    }
    return !flagged;
  } catch (err) {
    logger.error('Erro na moderação OpenAI:', err.message);
    return true; // fail-open para não bloquear o atendimento
  }
}

/**
 * Gera embeddings para um texto (usado no pipeline RAG).
 * @param {string} text - Texto para gerar embedding
 * @param {object} tenant - Dados do tenant (para chave de API)
 * @returns {number[]} - Vetor de embedding
 */
async function generateEmbedding(text, tenant = null) {
  const client = getClient(tenant);
  const response = await client.embeddings.create({
    model: config.openai.embeddingModel,
    input: text.replace(/\n/g, ' ').trim(),
  });
  return response.data[0].embedding;
}

module.exports = { chat, moderate, generateEmbedding };
