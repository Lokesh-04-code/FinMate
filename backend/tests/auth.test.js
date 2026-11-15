/**
 * FinMate Comprehensive Auth & Backend Security Test Suite
 *
 * Tests:
 *  1. Registration — validation, duplicate detection, password hashing
 *  2. Login — credential verification, missing fields, HttpOnly cookie setup
 *  3. JWT access token security — expiration, signature tampering, algorithm pinning (HS256), malformed payload
 *  4. Protected routes — authorization header check, password/token stripping
 *  5. Refresh token — rotation, reuse attack detection, expiration
 *  6. Logout & session revocation — single session and all-devices revocation
 *  7. Cross-user data isolation — User A cannot read, update, or delete User B's transactions
 *  8. Transaction authorization & validation — positive numbers, category check, malformed ObjectId handling (no 500 CastError)
 *  9. Google OAuth Security — State parameter & PKCE code challenge generation
 * 10. OAuth CSRF protection — State mismatch rejection in callback
 * 11. Secure Token Handoff — Single-use code exchange (/api/auth/exchange), preventing raw JWT in URLs
 * 12. CSRF Origin Verification — Unauthorized cross-origin requests blocked on cookie endpoints
 */

process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-do-not-use-in-prod';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-do-not-use-in-prod';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.CONNECTION_STRING = 'will-be-overridden-by-memory-server';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyOrigin } = require('../middleware/csrfProtection');

// ── Test Express App ──────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));

app.use('/api/students/refresh', verifyOrigin);
app.use('/api/students/logout', verifyOrigin);
app.use('/api/auth/exchange', verifyOrigin);

app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/students', require('../routes/studentRoutes'));
app.use('/api/student/transaction', require('../routes/transactionRoute'));
app.use('/api/student/rec', require('../routes/recTransactionRoute'));
app.use(require('../middleware/errorHandling'));

// ── In-memory MongoDB ─────────────────────────────────────────
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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ── Helpers ───────────────────────────────────────────────────
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
  return { token: res.body.token, refreshToken: res.body.refreshToken, cookies: res.headers['set-cookie'] };
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
    expect(res.body).not.toHaveProperty('password');
  });

  test('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fill all/i);
  });

  test('rejects duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
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
    expect(bodyStr).not.toContain('$2b$');
  });
});

// ══════════════════════════════════════════════════════════════
// 2. LOGIN & COOKIE CONFIGURATION
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

  test('sets HttpOnly refreshToken cookie with proper path', async () => {
    const res = await loginUser();
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = setCookie.join(';');
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
    expect(cookieStr.toLowerCase()).toContain('path=/');
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

  test('rejects request where ONLY email is missing', async () => {
    const res = await request(app)
      .post('/api/students/login')
      .send({ password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/provide both/i);
  });

  test('rejects request where ONLY password is missing', async () => {
    const res = await request(app)
      .post('/api/students/login')
      .send({ email: 'alice@test.com' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. JWT ACCESS TOKEN SECURITY & ALGORITHM PINNING
// ══════════════════════════════════════════════════════════════
describe('JWT access token security', () => {
  test('expired access token is rejected with 401', async () => {
    const expiredToken = jwt.sign(
      { user: { id: new mongoose.Types.ObjectId().toString(), username: 'Alice', email: 'alice@test.com' } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '-1s', algorithm: 'HS256' }
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
    parts[1] = Buffer.from(JSON.stringify({ user: { id: 'hacker', email: 'evil@test.com' } })).toString('base64url');
    const tamperedToken = parts.join('.');
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  test('rejects token signed with unauthorized "none" algorithm (algorithm confusion attack)', async () => {
    // Unsigned token with alg: "none"
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ user: { id: 'fake-id', email: 'fake@test.com' } })).toString('base64url');
    const unsignedToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${unsignedToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  test('rejects token with missing user identifier in payload', async () => {
    const invalidPayloadToken = jwt.sign(
      { randomClaim: 'no-user-id' },
      process.env.ACCESS_TOKEN_SECRET,
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .get('/api/students/current')
      .set('Authorization', `Bearer ${invalidPayloadToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token payload/i);
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
// 4. PROTECTED ROUTES & DATA STRIPPING
// ══════════════════════════════════════════════════════════════
describe('Protected route: GET /api/students/current', () => {
  test('returns user data with valid token and strips password & refreshTokens', async () => {
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
// 5. REFRESH TOKEN ROTATION & REUSE ATTACK PREVENTION
// ══════════════════════════════════════════════════════════════
describe('POST /api/students/refresh', () => {
  test('issues new access and refresh tokens upon rotation', async () => {
    const { token: oldToken, refreshToken } = await setupAndLogin();
    const res = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.token).not.toBe(oldToken);
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test('old refresh token is invalidated after rotation (reuse attack)', async () => {
    const { refreshToken } = await setupAndLogin();
    await request(app).post('/api/students/refresh').send({ refreshToken });
    // Attempt reuse
    const res = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/reuse|invalid|expired/i);
  });

  test('expired refresh token is rejected', async () => {
    const expiredRefreshToken = jwt.sign(
      { sub: new mongoose.Types.ObjectId().toString(), jti: crypto.randomUUID() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '-1s', algorithm: 'HS256' }
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
// 6. LOGOUT & SESSION INVALIDATION
// ══════════════════════════════════════════════════════════════
describe('POST /api/students/logout', () => {
  test('logout succeeds, clears cookie, and invalidates session in DB', async () => {
    const { token, refreshToken } = await setupAndLogin();
    const res = await request(app)
      .post('/api/students/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Attempting refresh must fail because token was revoked in DB
    const refreshRes = await request(app)
      .post('/api/students/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  test('allDevices logout revokes all refresh tokens for user', async () => {
    await registerUser();
    // Simulate logging in from two devices
    const device1 = await loginUser();
    const device2 = await loginUser();

    // Logout all devices using device 1's access token
    const logoutRes = await request(app)
      .post('/api/students/logout')
      .set('Authorization', `Bearer ${device1.body.token}`)
      .send({ allDevices: true });
    expect(logoutRes.status).toBe(200);

    // Both device tokens should now be invalidated
    const refresh1 = await request(app).post('/api/students/refresh').send({ refreshToken: device1.body.refreshToken });
    const refresh2 = await request(app).post('/api/students/refresh').send({ refreshToken: device2.body.refreshToken });
    expect(refresh1.status).toBe(401);
    expect(refresh2.status).toBe(401);
  });

  test('logout requires a valid access token', async () => {
    const res = await request(app)
      .post('/api/students/logout')
      .send({ refreshToken: 'some-token' });
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// 7. CROSS-USER DATA ISOLATION & AUTHORIZATION
// ══════════════════════════════════════════════════════════════
describe('Cross-user data access prevention', () => {
  let aliceToken, aliceTxId, bobToken;

  beforeEach(async () => {
    await registerUser({ username: 'Alice', email: 'alice@test.com', password: 'Password123!' });
    const aliceLogin = await loginUser({ email: 'alice@test.com', password: 'Password123!' });
    aliceToken = aliceLogin.body.token;

    const txRes = await request(app)
      .post('/api/student/transaction')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Alice coffee', amount: 50, type: 'expense', category: 'Food' });
    aliceTxId = txRes.body._id;

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
// 8. TRANSACTION INPUT VALIDATION & MALFORMED OBJECTID HANDLING
// ══════════════════════════════════════════════════════════════
describe('Transaction input validation & Mongoose ObjectId security', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await setupAndLogin());
  });

  test('malformed transaction ID returns 400 Validation Failed instead of 500 CastError', async () => {
    const res = await request(app)
      .get('/api/student/transaction/not-a-valid-id-123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid.*id format/i);
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

// ══════════════════════════════════════════════════════════════
// 9. GOOGLE OAUTH SECURITY (STATE, PKCE & SECURE TOKEN HANDOFF)
// ══════════════════════════════════════════════════════════════
describe('Google OAuth 2.1 Security (State & PKCE)', () => {
  test('GET /api/auth/google initiates flow with state and PKCE code_challenge', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    const location = res.headers.location;
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(location).toContain('state=');
    expect(location).toContain('code_challenge=');
    expect(location).toContain('code_challenge_method=S256');

    // Must set oauth_state and oauth_pkce_verifier cookies
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = setCookie.join(';');
    expect(cookieStr).toContain('oauth_state=');
    expect(cookieStr).toContain('oauth_pkce_verifier=');
  });

  test('OAuth callback rejects state mismatch (CSRF prevention)', async () => {
    const res = await request(app)
      .get('/api/auth/google/callback?code=mock_code&state=forged_state')
      .set('Cookie', ['oauth_state=legitimate_state']);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=');
    expect(res.headers.location).toContain('CSRF');
  });

  test('OAuth callback rejects missing state', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=mock_code');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=');
  });
});

// ══════════════════════════════════════════════════════════════
// 10. SECURE TOKEN HANDOFF: /api/auth/exchange
// ══════════════════════════════════════════════════════════════
describe('POST /api/auth/exchange (Secure Token Handoff)', () => {
  test('rejects request with missing code', async () => {
    const res = await request(app)
      .post('/api/auth/exchange')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/code is required/i);
  });

  test('rejects non-existent or forged handoff code', async () => {
    const res = await request(app)
      .post('/api/auth/exchange')
      .send({ code: 'non-existent-handoff-code-12345' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid.*handoff code/i);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. CSRF ORIGIN PROTECTION
// ══════════════════════════════════════════════════════════════
describe('CSRF Origin Verification Middleware', () => {
  test('blocks cookie-based refresh from untrusted third-party Origin', async () => {
    const res = await request(app)
      .post('/api/students/refresh')
      .set('Origin', 'https://malicious-attacker-site.com')
      .set('Cookie', ['refreshToken=mock-token'])
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF Protection/i);
  });

  test('allows cookie-based refresh from trusted Netlify origin', async () => {
    // Should pass origin verification (will fail on token lookup, but not 403 CSRF)
    const res = await request(app)
      .post('/api/students/refresh')
      .set('Origin', 'https://studysave.netlify.app')
      .send({});
    // Expected 401 (Refresh token missing) rather than 403 (CSRF blocked)
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/missing/i);
  });
});
