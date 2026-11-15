const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  googleOAuth,
  refreshAccessToken,
  logoutStudent,
  currentStudent,
  categoryUpdate,
} = require('../controllers/studentController');
const validateToken = require('../middleware/validateTokenHandler');

// Public routes
router.post('/register', registerStudent);
router.post('/login', loginStudent);
router.post('/oauth/google', googleOAuth);          // OAuth 2.1 / OIDC Google Sign-In
router.post('/refresh', refreshAccessToken);        // Refresh token endpoint
router.post('/logout', validateToken, logoutStudent); // Proper server-side logout

// Protected routes
router.get('/current', validateToken, currentStudent);
router.put('/update', validateToken, categoryUpdate);

module.exports = router;
