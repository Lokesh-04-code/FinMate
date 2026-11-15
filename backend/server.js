const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { verifyOrigin, getAllowedOrigins } = require('./middleware/csrfProtection');

require('dotenv').config();

// ─────────────────────────────────────────────
// Validate required env variables at startup.
// ─────────────────────────────────────────────
const REQUIRED_ENV = ['CONNECTION_STRING', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[startup] Missing required env variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const connectDb = require('./config/dbConnection');
connectDb();

const app = express();
const port = process.env.PORT || 5000;

// Enable reverse proxy trust for Render / Cloudflare deployments
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────

// Helmet sets secure HTTP headers
app.use(helmet());

// Restrict CORS to known frontend origins (supports Render, Netlify, and localhost)
const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true, // Required for HttpOnly cross-origin cookie transport
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// General rate limiter — 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

// Stricter rate limiter for auth endpoints — 15 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts, please try again later.' },
});

app.use(generalLimiter);

// Body parsing with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Cookie parsing
app.use(cookieParser());

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Apply rate limiter and CSRF origin verification on sensitive auth endpoints
app.use('/api/students/login', authLimiter);
app.use('/api/students/register', authLimiter);
app.use('/api/students/refresh', authLimiter, verifyOrigin);
app.use('/api/students/logout', verifyOrigin);
app.use('/api/students/oauth/google', authLimiter);
app.use('/api/auth/exchange', authLimiter, verifyOrigin);
app.use('/api/auth', authLimiter);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/student/transaction', require('./routes/transactionRoute'));
app.use('/api/student/rec', require('./routes/recTransactionRoute'));

// Health check endpoint (useful for Render keep-alive)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// ─────────────────────────────────────────────
// Error handler (must be last)
// ─────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandling');
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});
