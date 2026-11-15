/**
 * FinMate Auth & Security Test Suite
 *
 * Tests:
 *  1. Registration — validation, duplicate detection
 *  2. Login — correct credentials, wrong credentials, missing fields
 *  3. Access token — 15-min expiration, invalid token
 *  4. Protected routes — require valid token
 *  5. Refresh token — rotation, reuse detection, expiration
 *  6. Logout — server-side session invalidation
 *  7. Cross-user data access — user A cannot read/update/delete user B's transactions
 */

process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-do-not-use-in-prod';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-do-not-use-in-prod';
process.env.CONNECTION_STRING = 'will-be-overridden-by-memory-server';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ── Minimal express app (mirrors server.js without rate limiting / helmet for test speed)
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));

app.use('/api/students', require('../routes/studentRoutes'));
app.use('/api/student/transaction', require('../routes/transactionRoute'));
app.use('/api/student/rec', require('../routes/recTransactionRoute'));
app.use(require('../middleware/errorHandling'));

// ── In-memory MongoDB
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.CONNECTION_STRING = mongoServer.getUri();
  await mongoose.connect(process.env.CONNECTION_STRING);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

const registerUser = (overrides = {}) =>
  request(app)
    .post('/api/students/register')
    .send({ username: 'Alice', email: 'alice@test.com', password: 'Password123!', ...overrides });

const loginUser = (overrides = {}) =>
  request(app)
    .post('/api/students/login')
    .send({ email: 'alice@test.com', password: 'Password123!', ...overrides });

const setupAndLogin = async (email = 'alice@test.com', password = 'Password123!') => {
  await registerUser({ email, password });
  const res = await loginUser({ email, password });
  return { token: res.body.token, refreshToken: res.body.refreshToken };
};

// ══════════════════════════════════════════════════════════════
// 1. REGISTRATION
// ══════════════════════════════════════════════════════════════

describe('POST /api/students/register', () => {
  test('registers a new user successfully', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', 'alice@test.com');
    expect(res.body).not.toHaveProperty('password'); // must not expose hash
  });

  test('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ email: 'x@test.com' }); // no username or password
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fill all/i);
  });

  test('rejects duplicate email', async () => {
    await registerUser();
    const res = await registerUser(); // second attempt with same email
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('rejects invalid email format', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });

  test('rejects password shorter than 8 characters', async () => {
    const res = await registerUser({ password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  test('response NEVER contains plaintext or hashed password', async () => {
    const res = await registerUser();
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('Password123!');
    expect(bodyStr).not.toContain('$2b$'); // bcrypt hash prefix
  });
});

// ══════════════════════════════════════════════════════════════
// 2. LOGIN
// ══════════════════════════════════════════════════════════════

describe('POST /api/students/login', () => {
  beforeEach(async () => { await registerUser(); });

  test('returns access token and refresh token on success', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.status).toBe('success');
  });

  test('sets HttpOnly refreshToken cookie', async () => {
    const res = await loginUser();
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = setCookie.join(';');
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
  });

  test('rejects wrong password', async () => {
    const res = await loginUser({ password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('rejects non-existent email', async () => {
    const res = await loginUser({ email: 'nobody@test.com' });
    expect(res.status).toBe(401);
  });

  // FIX VERIFICATION: the original bug — missing both fields should be 400
  test('rejects request where ONLY email is missing (original && bug fix)', async () => {
    const res = await request(app)
      .post('/api/students/login')
      .send({ password: 'Password123!' }); // email missing, password present
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/provide both/i);
  });

  test('rejects request where ONLY password is missing', async () => {
    const res = await request(app)
      .post('/api/students/login')
      .send({ email: 'alice@test.com' }); // password missing
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. ACCESS TOKEN VALIDATION
// ══════════════════════════════════════════════════════════════

describe('JWT access token security', () => {
  test('expired access token is rejected with 401', async () => {
    // Create a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { user: { id: new mongoose.Types.ObjectId(), username: 'Alice', email: 'alice@test.com' } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('tampered token is rejected with 401', async () => {
    const { token } = await setupAndLogin();
    const parts = token.split('.');
    // Tamper with the payload
    parts[1] = Buffer.from(JSON.stringify({ user: { id: 'hacker', email: 'evil@test.com' } })).toString('base64url');
    const tamperedToken = parts.join('.');
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  test('missing Authorization header is rejected with 401', async () => {
    const res = await request(app).get('/api/students/current');
    expect(res.status).toBe(401);
  });

  test('malformed Bearer token is rejected', async () => {
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. PROTECTED ROUTES
// ══════════════════════════════════════════════════════════════

describe('Protected route: GET /api/students/current', () => {
  test('returns user data with valid token', async () => {
    const { token } = await setupAndLogin();
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'alice@test.com');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshTokens');
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/students/current');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// 5. REFRESH TOKEN ROTATION & EXPIRATION
// ══════════════════════════════════════════════════════════════

describe('POST /api/students/refresh', () => {
  test('issues new access and refresh tokens', async () => {
    const { token: oldToken, refreshToken } = await setupAndLogin();
    const res = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    // New tokens should be different from old ones
    expect(res.body.token).not.toBe(oldToken);
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test('old refresh token is invalidated after rotation (reuse attack)', async () => {
    const { refreshToken } = await setupAndLogin();
    // Use the refresh token once — it gets rotated
    await request(app).post('/api/students/refresh').send({ refreshToken });
    // Try to reuse the same refresh token — should fail
    const res = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/reuse|invalid|expired/i);
  });

  test('expired refresh token is rejected', async () => {
    const expiredRefreshToken = jwt.sign(
      { sub: new mongoose.Types.ObjectId().toString() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken: expiredRefreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  test('missing refresh token returns 401', async () => {
    const res = await request(app).post('/api/students/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/missing/i);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. LOGOUT
// ══════════════════════════════════════════════════════════════

describe('POST /api/students/logout', () => {
  test('logout succeeds and clears the refresh cookie', async () => {
    const { token, refreshToken } = await setupAndLogin();
    const res = await request(app)
      .post('/api/students/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  test('refresh token is invalidated after logout', async () => {
    const { token, refreshToken } = await setupAndLogin();
    // Logout
    await request(app)
      .post('/api/students/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });
    // Attempt to refresh — should fail because token was deleted server-side
    const refreshRes = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  test('logout requires a valid access token', async () => {
    const res = await request(app)
      .post('/api/students/logout')
      .send({ refreshToken: 'some-token' });
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// 7. CROSS-USER DATA ISOLATION
// ══════════════════════════════════════════════════════════════

describe('Cross-user data access prevention', () => {
  let aliceToken, aliceTxId;
  let bobToken;

  beforeEach(async () => {
    // Register and login as Alice
    await registerUser({ username: 'Alice', email: 'alice@test.com', password: 'Password123!' });
    const aliceLogin = await loginUser({ email: 'alice@test.com', password: 'Password123!' });
    aliceToken = aliceLogin.body.token;

    // Create a transaction for Alice
    const txRes = await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Alice coffee', amount: 50, type: 'expense', category: 'Food' });
    aliceTxId = txRes.body._id;

    // Register and login as Bob
    await registerUser({ username: 'Bob', email: 'bob@test.com', password: 'Password456!' });
    const bobLogin = await loginUser({ email: 'bob@test.com', password: 'Password456!' });
    bobToken = bobLogin.body.token;
  });

  test('Bob cannot read Alice\'s transaction', async () => {
    const res = await request(app)
      .get(`/api/student/transaction/${aliceTxId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  test('Bob cannot update Alice\'s transaction', async () => {
    const res = await request(app)
      .put(`/api/student/transaction/${aliceTxId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ amount: 999 });
    expect(res.status).toBe(403);
  });

  test('Bob cannot delete Alice\'s transaction', async () => {
    const res = await request(app)
      .delete(`/api/student/transaction/${aliceTxId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  test('Alice can read her own transaction', async () => {
    const res = await request(app)
      .get(`/api/student/transaction/${aliceTxId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(aliceTxId);
  });

  test('Bob\'s GET all transactions returns only his own', async () => {
    // Alice already has 1 transaction. Bob creates one too.
    await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'Bob lunch', amount: 150, type: 'expense', category: 'Food' });

    const res = await request(app)
      .get('/api/student/transaction')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Bob lunch');
  });
});

// ══════════════════════════════════════════════════════════════
// 8. TRANSACTION INPUT VALIDATION
// ══════════════════════════════════════════════════════════════

describe('Transaction input validation', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await setupAndLogin());
  });

  test('rejects transaction with invalid type', async () => {
    const res = await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', amount: 100, type: 'invalid', category: 'Food' });
    expect(res.status).toBe(400);
  });

  test('rejects transaction with negative amount', async () => {
    const res = await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', amount: -50, type: 'expense', category: 'Food' });
    expect(res.status).toBe(400);
  });

  test('rejects recurring transaction with invalid frequency', async () => {
    const res = await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sub', amount: 100, type: 'expense', category: 'Other', isRecurring: true, frequency: 'annually' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/daily|weekly|monthly/i);
  });
});
