require('dotenv').config();

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');
const compression    = require('compression');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./config/swagger');
const logger         = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const postsRoutes      = require('./routes/posts');
const usersRoutes      = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const healthRoute      = require('./routes/health');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN?.split(',') || '*',
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// ── Performance ───────────────────────────────────────────────
app.use(compression());

// ── Logging ───────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip:   (req) => req.path === '/api/v1/health',
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate limiting (global) ────────────────────────────────────
app.use(globalLimiter);

// ── API v1 prefix ─────────────────────────────────────────────
const BASE = '/api/v1';

app.use(`${BASE}/health`,     healthRoute);
app.use(`${BASE}/auth`,       authRoutes);
app.use(`${BASE}/posts`,      postsRoutes);
app.use(`${BASE}/users`,      usersRoutes);
app.use(`${BASE}/categories`, categoriesRoutes);

// ── Swagger docs ──────────────────────────────────────────────
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Stellen API Docs',
    customCss: `
      .swagger-ui .topbar { background: #030305; border-bottom: 2px solid #00f5ff; }
      .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml,<svg/>'); }
      body { background: #0a0a0f; }
      .swagger-ui { color: #e0e0f0; }
      .swagger-ui .opblock-tag { color: #00f5ff; }
      .swagger-ui .btn.authorize { background: #00f5ff20; border-color: #00f5ff; color: #00f5ff; }
    `,
    swaggerOptions: { persistAuthorization: true },
  })
);

// ── Raw OpenAPI JSON ──────────────────────────────────────────
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

// ── Root ──────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  success: true,
  message: 'Stellen API v1.0.0',
  docs:    '/docs',
  health:  '/api/v1/health',
  author:  'Stellen Ncube — officialstellen@gmail.com',
}));

// ── 404 + error handlers ──────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
