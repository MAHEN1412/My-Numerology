/**
 * ADMIN AUTH
 * ==========
 * Simple single-admin authentication for the book management panel — not a
 * full user account system, just password-gated access to upload/delete
 * books. Sessions are stateless signed tokens (HMAC-SHA256), stored in an
 * httpOnly cookie, so no session database is required.
 *
 * Requires two environment variables:
 *   ADMIN_PASSWORD  — the password to log into the admin panel
 *   SESSION_SECRET   — random string used to sign session tokens
 */

const crypto = require('crypto');
const cookie = require('cookie');

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured on the server.');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function createSessionToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_DURATION_MS });
  const encoded = Buffer.from(payload).toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;

  const expectedSignature = sign(encoded);
  // Constant-time comparison to avoid timing attacks on the signature check.
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch (err) {
    return false;
  }
}

function setSessionCookie(res) {
  const token = createSessionToken();
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  }));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  }));
}

function getTokenFromRequest(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parsed = cookie.parse(header);
  return parsed[COOKIE_NAME] || null;
}

function isAuthenticated(req) {
  return verifySessionToken(getTokenFromRequest(req));
}

/** Express middleware — 401s any request without a valid admin session. */
function requireAdmin(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  next();
}

module.exports = { requireAdmin, isAuthenticated, setSessionCookie, clearSessionCookie, createSessionToken, verifySessionToken };
