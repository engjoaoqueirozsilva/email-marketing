require('dotenv').config();
require('express-async-errors');

const path    = require('path');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const emailRoutes      = require('./routes/email.routes');
const credentialRoutes = require('./routes/credential.routes');
const campaignRoutes   = require('./routes/campaign.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const logger = require('./config/logger');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// ── Segurança ─────────────────────────────────────────────────────────────
// CSP relaxado para /client e /docs — carregam fontes e scripts externos
app.use((req, res, next) => {
  if (req.path.startsWith('/docs') || req.path.startsWith('/client')) return next();
  helmet()(req, res, next);
});
app.use(cors());

// ── Rate Limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true,
  legacyHeaders:   false,
  // SSE streams não devem ser rate-limitados
  skip: (req) => req.path.endsWith('/stream'),
  message: { success: false, message: 'Muitas requisições. Tente novamente mais tarde.' },
});
app.use(limiter);

// ── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
);

// ── Cliente estático — sempre disponível (teste e campanha) ───────────────
// Servido em todos os ambientes para que `npm start` funcione para testes.
// Em produção real, prefira servir via Nginx ou CDN.
app.use('/client', express.static(path.join(__dirname, '..', 'client')));

// Redireciona / para o cliente de teste
app.get('/', (_req, res) =>
  res.redirect('/client/login.html')
);

logger.info('Cliente: http://localhost:' + (process.env.PORT || 3000) + '/client/index.html');
logger.info('Campanha: http://localhost:' + (process.env.PORT || 3000) + '/client/campaign.html');

// ── Documentação Swagger — apenas fora de produção ────────────────────────
if (!isProd) {
  app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));
  logger.info('Docs: http://localhost:' + (process.env.PORT || 3000) + '/docs');
}

// ── Rotas da API ──────────────────────────────────────────────────────────
app.use('/api/v1/emails',      emailRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/campaigns',   campaignRoutes);

// ── 404 & Erros ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;