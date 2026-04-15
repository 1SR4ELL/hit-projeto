const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/crypto');

const { meta } = config;

/**
 * Retorna o access token do tenant (decifrado).
 */
function getToken(tenant) {
  return decrypt(tenant.metaAccessTokenEnc);
}

/**
 * Monta a URL base da Graph API para um número de WhatsApp.
 */
function apiUrl(phoneNumberId, path = '') {
  return `${meta.baseUrl}/${meta.apiVersion}/${phoneNumberId}${path}`;
}

/**
 * Envia uma mensagem de texto simples para um número WhatsApp.
 * Só deve ser usado dentro da janela de 24h (UIC).
 */
async function sendText(tenant, to, text) {
  try {
    const response = await axios.post(
      apiUrl(tenant.whatsappNumberId, '/messages'),
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text, preview_url: false },
      },
      {
        headers: {
          Authorization: `Bearer ${getToken(tenant)}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    const errData = err.response?.data || err.message;
    logger.error('Erro ao enviar mensagem de texto WhatsApp:', errData);
    throw err;
  }
}

/**
 * Envia uma mensagem com botões interativos (máx. 3 botões).
 */
async function sendButtons(tenant, to, bodyText, buttons, headerText = '') {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(headerText && { header: { type: 'text', text: headerText } }),
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn, i) => ({
          type: 'reply',
          reply: { id: `btn_${i}`, title: btn.slice(0, 20) }, // max 20 chars
        })),
      },
    },
  };

  try {
    const response = await axios.post(
      apiUrl(tenant.whatsappNumberId, '/messages'),
      payload,
      {
        headers: {
          Authorization: `Bearer ${getToken(tenant)}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error('Erro ao enviar botões WhatsApp:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Envia um menu de lista (máx. 10 itens).
 */
async function sendList(tenant, to, bodyText, buttonLabel, sections) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections,
      },
    },
  };

  try {
    const response = await axios.post(
      apiUrl(tenant.whatsappNumberId, '/messages'),
      payload,
      {
        headers: {
          Authorization: `Bearer ${getToken(tenant)}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error('Erro ao enviar lista WhatsApp:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Envia um Template HSM (Highly Structured Message) — obrigatório fora da janela de 24h.
 */
async function sendTemplate(tenant, to, templateName, languageCode, components = []) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'pt_BR' },
      ...(components.length > 0 && { components }),
    },
  };

  try {
    const response = await axios.post(
      apiUrl(tenant.whatsappNumberId, '/messages'),
      payload,
      {
        headers: {
          Authorization: `Bearer ${getToken(tenant)}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error('Erro ao enviar template WhatsApp:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Marca uma mensagem como lida.
 */
async function markAsRead(tenant, messageId) {
  try {
    await axios.post(
      apiUrl(tenant.whatsappNumberId, '/messages'),
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken(tenant)}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    logger.warn('Erro ao marcar mensagem como lida:', err.message);
  }
}

/**
 * Obtém o Quality Score do número WhatsApp via API Meta.
 */
async function getQualityScore(tenant) {
  try {
    const response = await axios.get(
      `${meta.baseUrl}/${meta.apiVersion}/${tenant.whatsappNumberId}`,
      {
        params: { fields: 'quality_rating,messaging_limit_tier' },
        headers: { Authorization: `Bearer ${getToken(tenant)}` },
      }
    );
    return {
      qualityRating: response.data.quality_rating, // GREEN | YELLOW | RED | UNKNOWN
      messagingLimitTier: response.data.messaging_limit_tier,
    };
  } catch (err) {
    logger.error('Erro ao obter Quality Score:', err.message);
    return { qualityRating: 'UNKNOWN', messagingLimitTier: null };
  }
}

/**
 * Verifica se é seguro enviar uma mensagem agora (blackout + rate limit).
 */
function isSafeToSend(tenant) {
  const hora = new Date().getHours();
  const blackoutStart = config.whatsapp.blackoutStart; // 22
  const blackoutEnd = config.whatsapp.blackoutEnd;     // 8

  const inBlackout = hora >= blackoutStart || hora < blackoutEnd;
  if (inBlackout) return { safe: false, reason: 'blackout_period' };

  if (tenant.disparosPausados) return { safe: false, reason: 'disparos_pausados' };
  if (tenant.qualityScore === 'VERMELHO') return { safe: false, reason: 'quality_score_vermelho' };

  const limite = (config.whatsapp.tierLimits[tenant.tierEnvio] || 200);
  if (tenant.mensagensHoje >= limite) return { safe: false, reason: 'limite_diario_atingido' };

  return { safe: true };
}

module.exports = {
  sendText,
  sendButtons,
  sendList,
  sendTemplate,
  markAsRead,
  getQualityScore,
  isSafeToSend,
};
