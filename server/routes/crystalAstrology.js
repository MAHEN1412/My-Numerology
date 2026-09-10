const express = require('express');
const { lookupByDate, getMeta } = require('../knowledge/crystalAstrologyLoader');

const router = express.Router();

// GET /api/crystal-astrology/:month/:day — every Crystal Astrology book
// entry whose printed birthday range covers this calendar date (usually
// 2-4 adjacent zodiac degrees; see crystalAstrologyLoader.js for why).
//
// Wrapped in try/catch for the same reason as numberProfile.js: the
// frontend always calls res.json() on the response, so any internal
// error here must still come back as JSON, not an HTML error page.
router.get('/:month/:day', (req, res) => {
  try {
    const month = Number(req.params.month);
    const day = Number(req.params.day);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12.' });
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return res.status(400).json({ error: 'Day must be between 1 and 31.' });
    }
    const meta = getMeta();
    if (!meta) {
      return res.status(404).json({ error: 'Crystal Astrology data is not available right now.' });
    }
    const entries = lookupByDate(month, day);
    res.json({ source: meta.source, title: meta.title, entries });
  } catch (err) {
    console.error('Crystal Astrology lookup failed:', err.message);
    res.status(500).json({ error: 'Could not load Crystal Astrology data right now.' });
  }
});

module.exports = router;
