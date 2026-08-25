const express = require('express');
const { buildBookInsights, searchByExactTerm } = require('../knowledge/bookSearch');
const { getTerminologyDictionary, findTermEntry } = require('../knowledge/terminologyDictionary');

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

// GET /api/book-insights/terminology
// Phase 1/2: the curated terminology dictionary itself -- lets the
// frontend show which exact terms are recognized, with their honest
// "potentially related, verify by source" status rather than claimed
// equivalence.
router.get('/terminology', (req, res) => {
  res.json({ terms: getTerminologyDictionary() });
});

// POST /api/book-insights/terminology/:termId/search
// Phase 1: search for ONE exact literal term across the book library,
// without grouping in any alternative terms. Returns which specific
// books use this specific term, honestly separate from any other term.
router.post('/terminology/:termId/search', async (req, res) => {
  try {
    const termEntry = findTermEntry(req.params.termId);
    if (!termEntry) return res.status(404).json({ error: 'Unknown term.' });

    const { bookIds } = req.body;
    const cleanBookIds = Array.isArray(bookIds) ? bookIds.filter(Boolean) : null;
    const result = await searchByExactTerm(termEntry, cleanBookIds);
    res.json(result);
  } catch (err) {
    console.error('Exact term search failed:', err.message);
    res.status(500).json({ error: 'Could not search for this term right now.' });
  }
});

module.exports = router;
