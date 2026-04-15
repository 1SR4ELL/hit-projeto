require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_insecure',
    expiresIn: '8h',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', // 32 chars
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxTokens: 1024,
    temperature: 0.4,
  },

  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'verify_token_dev',
    apiVersion: 'v19.0',
    baseUrl: 'https://graph.facebook.com',
  },

  upload: {
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
    allowedMimes: ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Anti-ban: limites por tier (80% do máximo Meta para margem de segurança)
  whatsapp: {
    tierLimits: { 1: 200, 2: 800, 3: 8000 }, // 80% dos limites Meta
    blackoutStart: 22, // hora de início do blackout (22h)
    blackoutEnd: 8,    // hora de fim do blackout (8h)
    minIntervalHours: 24, // intervalo mínimo entre mensagens pro mesmo eleitor
    optOutKeywords: ['sair', 'stop', 'parar', 'cancelar', 'descadastrar', 'remover', 'nao quero'],
    escalateKeywords: ['humano', 'pessoa', 'atendente', 'falar com alguem', 'reclamacao'],
  },

  session: {
    inactiveAfterHours: 24, // nova sessão após 24h de inatividade
    maxHistoryMessages: 10,  // máximo de mensagens no histórico injetado no prompt
  },
};
