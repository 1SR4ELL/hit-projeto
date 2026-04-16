require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');

// ─── ROTAS ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const dashboardRoutes = require('./routes/dashboard');
const conversationsRoutes = require('./routes/conversations');
const knowledgeRoutes = require('./routes/knowledge');
const templatesRoutes = require('./routes/templates');
const schedulerRoutes = require('./routes/scheduler');
const votersRoutes = require('./routes/voters');
const settingsRoutes = require('./routes/settings')
const adminSeedRoutes = require('./routes/adminSeed');

// ─── APP ──────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO (real-time dashboard) ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Expõe io para uso nas rotas
module.exports.io = io;

io.on('connection', (socket) => {
  logger.debug(`Socket conectado: ${socket.id}`);

  socket.on('join_tenant', (tenantId) => {
    socket.join(tenantId);
    logger.debug(`Socket ${socket.id} entrou na sala ${tenantId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket desconectado: ${socket.id}`);
  });
});

// ─── MIDDLEWARES GLOBAIS ──────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Logger HTTP
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
}));

// Body parsers
app.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    // Captura raw body para validação HMAC
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch { req.body = {}; }
      next();
    });
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── ROTAS DA API ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/voters', votersRoutes);
app.use('/api/settings', settingsRoutes)
app.use('/api/admin/seed', adminSeedRoutes);

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({
    error: config.env === 'production' ? 'Erro interno do servidor.' : err.message,
  });
});

// ─── CRON JOBS ────────────────────────────────────────────────────────────────
const { resetDailyCounters, monitorQualityScores, restoreSchedules } = require('./services/schedulerService');

// Reset de contadores à meia-noite (horário de Brasília)
function scheduleAt(hour, minute, fn) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, delay);
}

scheduleAt(0, 0, resetDailyCounters);           // 00:00 — reset contadores
scheduleAt(9, 0, monitorQualityScores);          // 09:00 — verifica quality score
scheduleAt(15, 0, monitorQualityScores);         // 15:00 — verifica quality score

// ─── START ────────────────────────────────────────────────────────────────────
server.listen(config.port, async () => {
  logger.info(`🚀 HIT Politic-AI backend rodando na porta ${config.port} [${config.env}]`);
  // Restaura agendamentos pendentes do banco (substituí Bull+Redis)
  await restoreSchedules();
});

module.exports.app = app;
module.exports.server = server;
