require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const hpp = require('hpp');

const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const logger = require('./src/config/logger');
const errorHandler = require('./src/middleware/errorHandler');
const notFound = require('./src/middleware/notFound');
const { globalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// ─── Webhook Route (MUST be before express.json — needs raw Buffer) ──
const { handleRazorpayWebhook } = require('./src/controllers/subscription.controller');
app.post(
  '/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

// ─── Security Middleware ────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

// ─── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ─── Global Rate Limiter ────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Health Check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DocPoint API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────
const userRoutes = require('./src/routes/user.routes');
const patientRoutes = require('./src/routes/patient.routes');
const subscriptionRoutes = require('./src/routes/subscription.routes');

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

// Steps 5–13 routes registered incrementally:
// Step 5  → /api/v1/doctors
// Step 6  → /api/v1/admin
// Step 7  → /api/v1/schedules
// Step 8  → /api/v1/search
// Step 9  → /api/v1/bookings
// Step 12 → /api/v1/prescriptions
// Step 13 → /api/v1/reviews

// ─── 404 + Error Handlers ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Bootstrap ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    connectRedis();
  } catch (err) {
    logger.warn('Redis not available — queue features degraded:', err.message);
  }

  server.listen(PORT, () => {
    logger.info(`DocPoint server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = { app, server };
