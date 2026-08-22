const express = require('express');
const calc = require('../utils/calculationEngine');
const { compareNameCandidates, suggestNameVariations } = require('../knowledge/nameCorrectionEngine');
const { buildBookInsights } = require('../knowledge/bookSearch');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

// POST /api/name-correction/compare — rank candidate name spellings by
// compatibility with a person's fixed Driver/Conductor numbers
router.post('/compare', async (req, res) => {
  try {
    const { day, month, year, system, names, bookIds } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'Enter at least one name to compare.' });
    }
    if (names.length > 10) {
      return res.status(400).json({ error: 'Compare up to 10 names at a time.' });
    }
    const cleanNames = names.map((n) => String(n).trim()).filter(Boolean);
    const invalid = cleanNames.filter((n) => !/^[a-zA-Z\s'-]+$/.test(n));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `These aren't valid names (letters only): ${invalid.join(', ')}` });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const driverNumber = calc.calculateDriverNumber(d).value;
    const conductorNumber = calc.calculateConductorNumber(d, m, y).value;
    const loshuMissing = calc.getMissingNumbers(calc.generateLoShuGrid(d, m, y));

    const results = compareNameCandidates(cleanNames, cleanSystem, { driver: driverNumber, conductor: conductorNumber, loshuMissing });

    const cleanBookIds = Array.isArray(bookIds) ? bookIds.filter(Boolean) : null;
    const bookInsights = await buildBookInsights(
      { driver: driverNumber, conductor: conductorNumber, missing: loshuMissing, repeated: [], nameNumber: results[0] ? results[0].nameNumber : null, system: cleanSystem },
      cleanBookIds
    );
    const nameCorrectionInsight = bookInsights.find((t) => t.topic === 'nameCorrection') || null;

    res.json({
      coreNumbers: { driverNumber, conductorNumber },
      loshuMissing,
      results,
      bookInsights: nameCorrectionInsight ? [nameCorrectionInsight] : [],
    });
  } catch (err) {
    console.error('Name correction compare failed:', err.message);
    res.status(500).json({ error: 'Could not compare these names right now.' });
  }
});

// POST /api/name-correction/suggest — auto-generate minimal spelling
// variations of a base name and rank them by compatibility
router.post('/suggest', async (req, res) => {
  try {
    const { day, month, year, system, baseName } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    const cleanName = typeof baseName === 'string' ? baseName.trim() : '';
    if (!cleanName || !/^[a-zA-Z\s'-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Enter a valid name (letters only) to generate suggestions from.' });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const driverNumber = calc.calculateDriverNumber(d).value;
    const conductorNumber = calc.calculateConductorNumber(d, m, y).value;
    const loshuMissing = calc.getMissingNumbers(calc.generateLoShuGrid(d, m, y));

    const results = suggestNameVariations(cleanName, cleanSystem, { driver: driverNumber, conductor: conductorNumber, loshuMissing });

    res.json({
      coreNumbers: { driverNumber, conductorNumber },
      loshuMissing,
      baseName: cleanName,
      results,
    });
  } catch (err) {
    console.error('Name correction suggest failed:', err.message);
    res.status(500).json({ error: 'Could not generate name suggestions right now.' });
  }
});

module.exports = router;
