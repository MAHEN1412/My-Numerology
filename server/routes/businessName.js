const express = require('express');
const calc = require('../utils/calculationEngine');
const { analyzeBusinessName, compareBusinessNames } = require('../knowledge/businessNameEngine');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

function computeOwnerCore(day, month, year) {
  if (!day || !month || !year) return null;
  if (!isValidCalendarDate(Number(day), Number(month), Number(year))) return null;
  return {
    driver: calc.calculateDriverNumber(Number(day)).value,
    conductor: calc.calculateConductorNumber(Number(day), Number(month), Number(year)).value,
  };
}

// POST /api/business-name/compare — analyze/compare business name candidates
router.post('/compare', (req, res) => {
  try {
    const { names, system, ownerDay, ownerMonth, ownerYear } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'Enter at least one business name.' });
    }
    if (names.length > 10) {
      return res.status(400).json({ error: 'Compare up to 10 business names at a time.' });
    }
    const cleanNames = names.map((n) => String(n).trim()).filter(Boolean);
    const invalid = cleanNames.filter((n) => !/^[a-zA-Z0-9\s'&.-]+$/.test(n));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `These aren't valid business names: ${invalid.join(', ')}` });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const ownerCore = computeOwnerCore(ownerDay, ownerMonth, ownerYear);

    const results = compareBusinessNames(cleanNames, cleanSystem, ownerCore);

    res.json({ ownerCore, results });
  } catch (err) {
    console.error('Business name compare failed:', err.message);
    res.status(500).json({ error: 'Could not analyze these business names right now.' });
  }
});

module.exports = router;
