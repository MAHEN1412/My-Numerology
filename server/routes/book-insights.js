const express = require('express');
const { buildBookInsights } = require('../knowledge/bookSearch');

const router = express.Router();

// POST /api/book-insights — 360° book-based analysis for a calculated reading
router.post('/', async (req, res) => {
  try {
    const { driver, conductor, missing, repeated, nameNumber, bookIds } = req.body;

    const d = Number(driver);
    const c = Number(conductor);
    if (!d || !c || d < 1 || d > 9 || c < 1 || c > 9) {
      return res.status(400).json({ error: 'Driver and conductor must each be 1-9.' });
    }

    const params = {
      driver: d,
      conductor: c,
      missing: Array.isArray(missing) ? missing.map(Number).filter((n) => n >= 1 && n <= 9) : [],
      repeated: Array.isArray(repeated) ? repeated.map(Number).filter((n) => n >= 1 && n <= 9) : [],
      nameNumber: nameNumber ? Number(nameNumber) : null,
    };

    const cleanBookIds = Array.isArray(bookIds) ? bookIds.filter(Boolean) : null;
    const insights = await buildBookInsights(params, cleanBookIds);

    const totalSources = insights.reduce((sum, t) => sum + t.sourceCount, 0);
    res.json({ insights, totalSources, hasAnyBooks: totalSources > 0 });
  } catch (err) {
    console.error('Book insights failed:', err.message);
    res.status(500).json({ error: 'Could not generate book insights right now.' });
  }
});

module.exports = router;
