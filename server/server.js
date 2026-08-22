const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly by resolved path (rather than a bare dotenv.config(),
// which depends on the process's current working directory) and print
// exactly what happened — this turns "it's missing but the file looks
// right" into a concrete, visible fact instead of a guessing game.
const envPath = path.join(__dirname, '..', '.env');
console.log('[env] Looking for .env at:', envPath);
console.log('[env] File exists at that path:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  const parsed = dotenv.parse(raw);
  Object.assign(process.env, parsed);
  console.log('[env] Keys found in file:', Object.keys(parsed).join(', ') || '(none)');
} else {
  console.log('[env] No .env file found at the path above \u2014 that\'s the actual problem.');
}
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const readingsRouter = require('./routes/readings');
const videosRouter = require('./routes/videos');
const referenceRouter = require('./routes/reference');
const booksRouter = require('./routes/books');
const bookInsightsRouter = require('./routes/book-insights');
const adminRouter = require('./routes/admin');
const mobileRouter = require('./routes/mobile');
const crystalsRouter = require('./routes/crystals');
const nameCorrectionRouter = require('./routes/nameCorrection');
const businessNameRouter = require('./routes/businessName');
const genericNumberRouter = require('./routes/genericNumber');
const relationshipRouter = require('./routes/relationship');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. See .env.example.');
  process.exit(1);
}

if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.warn('ADMIN_PASSWORD and/or SESSION_SECRET not set — the book management admin panel will be inaccessible until both are configured. See .env.example.');
}

app.use(express.json());

// Basic abuse protection on the write endpoint
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});
app.use('/api/readings', (req, res, next) => (req.method === 'POST' ? createLimiter(req, res, next) : next()));

app.use('/api/readings', readingsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/reference', referenceRouter);

// Uploads are heavier (file I/O + PDF parsing), so they get their own tighter limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many uploads. Please wait before uploading more books.' },
});
app.use('/api/books', (req, res, next) => (req.method === 'POST' ? uploadLimiter(req, res, next) : next()));
app.use('/api/books', booksRouter);
app.use('/api/book-insights', bookInsightsRouter);

// Login attempts are deliberately throttled hard — this is the one
// endpoint an attacker could brute-force a password against.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});
app.use('/api/admin/login', loginLimiter);
app.use('/api/admin', adminRouter);

app.use('/api/mobile', mobileRouter);

app.use('/api/crystals', crystalsRouter);

app.use('/api/name-correction', nameCorrectionRouter);

app.use('/api/business-name', businessNameRouter);
app.use('/api/numbers', genericNumberRouter);
app.use('/api/relationship', relationshipRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, dbState: mongoose.connection.readyState });
});

// Serve the frontend
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
