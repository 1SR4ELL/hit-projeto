const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Valida a assinatura HMAC-SHA256 dos webhooks da Meta.
 * A Meta envia o header X-Hub-Signature-256 com sha256=<assinatura>.
 */
function validateMetaWebhook(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    logger.warn('Webhook recebido sem assinatura Meta');
    return res.status(401).json({ error: 'Assinatura ausente.' });
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', config.meta.appSecret || 'dev_secret')
    .update(req.rawBody || JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )) {
    logger.warn('Assinatura do webhook Meta inválida');
    return res.status(401).json({ error: 'Assinatura inválida.' });
  }

  next();
}

/**
 * Middleware para capturar o raw body antes do JSON parser.
 * Necessário para validação de assinatura.
 */
function captureRawBody(req, res, next) {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
}

module.exports = { validateMetaWebhook, captureRawBody };
