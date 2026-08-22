const express = require('express');
const { isAuthenticated, setSessionCookie, clearSessionCookie } = require('../utils/adminAuth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin login is not configured on this server. Set ADMIN_PASSWORD.' });
  }

  const { password } = req.body;
  if (typeof password !== 'string' || password !== adminPassword) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  setSessionCookie(res);
  res.json({ loggedIn: true });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ loggedIn: false });
});

// GET /api/admin/me — used by the admin page on load to decide whether to
// show the login form or the book management panel
router.get('/me', (req, res) => {
  res.json({ loggedIn: isAuthenticated(req) });
});

module.exports = router;
