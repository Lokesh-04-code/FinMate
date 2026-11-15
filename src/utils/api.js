/**
 * FinMate Unified API & Authentication Client
 *
 * Provides:
 *  - Centralized base URL configuration (VITE_BACKEND_URL)
 *  - Automatic Bearer token header attachment
 *  - Automatic HttpOnly cookie / refreshToken support (`credentials: 'include'`)
 *  - Automatic 401 handling with Refresh Token rotation
 *  - Server-side logout and session invalidation
 *  - OAuth 2.1 Google Sign-In helper
 */

export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://backendfinmate.onrender.com';

// ── Token Storage Helpers ─────────────────────────────────────
export const getAccessToken = () => localStorage.getItem('token');
export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const setAuthSession = (token, refreshToken) => {
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('isLoggedIn', 'true');
};

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isLoggedIn');
};

// ── Auth Endpoints ───────────────────────────────────────────

/**
 * Log in with email & password.
 */
export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/students/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  setAuthSession(data.token, data.refreshToken);
  return data;
};

/**
 * Register a new user.
 */
export const registerUser = async (username, email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/students/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
};

/**
 * Google OAuth 2.1 / OIDC Login.
 * Exchanges the Google ID credential token for an access & refresh token.
 */
export const googleOAuthLogin = async (credential) => {
  const response = await fetch(`${API_BASE_URL}/api/students/oauth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Google authentication failed');
  }

  setAuthSession(data.token, data.refreshToken);
  return data;
};

/**
 * Refresh access token using stored refresh token / cookie.
 */
export const refreshAuthToken = async () => {
  const refreshToken = getRefreshToken();
  const response = await fetch(`${API_BASE_URL}/api/students/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuthSession();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  setAuthSession(data.token, data.refreshToken);
  return data.token;
};

/**
 * Server-side logout — invalidates refresh token and clears client state.
 */
export const logoutUser = async () => {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  try {
    if (token) {
      await fetch(`${API_BASE_URL}/api/students/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (err) {
    console.warn('Backend logout call failed:', err.message);
  } finally {
    clearAuthSession();
  }
};

// ── Authenticated Fetch Wrapper ──────────────────────────────

/**
 * Drop-in wrapper around fetch() that:
 *  1. Attaches the Bearer authorization header
 *  2. Sends cookies (`credentials: 'include'`)
 *  3. On 401, attempts token refresh once and retries the request
 *  4. Redirects to logout if refresh fails
 */
export const authFetch = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  let token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If token expired, try to refresh and retry request once
  if (response.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAuthToken();
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (refreshErr) {
      clearAuthSession();
      window.dispatchEvent(new Event('auth:logout'));
      return response;
    }
  }

  return response;
};

export default {
  API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  loginUser,
  registerUser,
  googleOAuthLogin,
  refreshAuthToken,
  logoutUser,
  authFetch,
};
