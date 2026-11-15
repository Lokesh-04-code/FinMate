/**
 * Unified Cookie Configuration Helper
 *
 * Configured specifically for cross-site Netlify / Render deployments
 * and seamless local development.
 *
 * In Production:
 *   - sameSite: 'none' (required for cross-origin cookies between Netlify and Render)
 *   - secure: true (mandatory by browser spec when sameSite is 'none')
 *   - httpOnly: true (prevents JavaScript access, mitigates XSS)
 *   - path: '/'
 *
 * In Development:
 *   - sameSite: 'lax' (works with http://localhost without HTTPS requirements)
 *   - secure: false
 *   - httpOnly: true
 *   - path: '/'
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Cookie options for the 7-day refresh token.
 */
const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

/**
 * Cookie options for short-lived OAuth state and PKCE verifier (15 minutes).
 */
const getOAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

/**
 * Exact options needed to successfully clear cookies.
 * Browsers require path, secure, and sameSite to match the set options.
 */
const getCookieClearOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
});

module.exports = {
  isProduction,
  getRefreshTokenCookieOptions,
  getOAuthCookieOptions,
  getCookieClearOptions,
};
