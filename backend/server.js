const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

require('dotenv').config();

// ─────────────────────────────────────────────
// FIX: Validate required env variables at startup.
// Server won't start with a silent misconfiguration.
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

// ─────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────

// FIX: helmet sets secure HTTP headers (XSS protection, content-type sniffing, etc.)
app.use(helmet());

// FIX: Restrict CORS to known frontend origins for Render deployment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://backendfinmate.onrender.com', // production frontend origin
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true, // Required for HttpOnly cookie transport
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// Stricter rate limiter for auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use(generalLimiter);

// Body parsing with size limit (prevents large-payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Cookie parsing (required for HttpOnly refresh token cookies)
app.use(cookieParser());

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Apply stricter rate limit to auth endpoints
app.use('/api/students/login', authLimiter);
app.use('/api/students/register', authLimiter);
app.use('/api/students/refresh', authLimiter);
app.use('/api/students/oauth/google', authLimiter);
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
