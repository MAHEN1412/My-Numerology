const express = require('express');
const calc = require('../utils/calculationEngine');
const { buildCrystalCompatibility } = require('../knowledge/crystalEngine');
const { buildCrystalBookInsights } = require('../knowledge/bookSearch');
const { getVideosForCategory } = require('./videos');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

const VALID_PURPOSES = ['personal', 'business', 'career', 'finance', 'communication', 'relationships'];

// POST /api/crystals/analyze — crystal compatibility for a person's numerology profile
router.post('/analyze', async (req, res) => {
  try {
    const { day, month, year, name, system, purpose, bookIds } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    const cleanPurpose = VALID_PURPOSES.includes(purpose) ? purpose : null;
    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';

    const driverNumber = calc.calculateDriverNumber(d).value;
    const conductorNumber = calc.calculateConductorNumber(d, m, y).value;
    const nameNumber = name ? calc.calculateNameNumber(name, cleanSystem).value : null;
    const loshuCounts = calc.generateLoShuGrid(d, m, y);
    const loshuMissing = calc.getMissingNumbers(loshuCounts);

    const compatibility = buildCrystalCompatibility({
      driver: driverNumber, conductor: conductorNumber, nameNumber, loshuMissing, purpose: cleanPurpose,
    });

    const cleanBookIds = Array.isArray(bookIds) ? bookIds.filter(Boolean) : null;
    const bookInsights = await buildCrystalBookInsights(
      { driver: driverNumber, conductor: conductorNumber, nameNumber, missing: loshuMissing },
      cleanBookIds
    );

    // Video suggestions themed around the top recommended crystal plus the
    // person's Driver/Conductor (a.k.a. Psychic Number / Life Path
    // elsewhere) -- same tested, cached, relevance-filtered pipeline
    // already used for Lo Shu and mobile number videos.
    const topCrystal = compatibility.length > 0 ? compatibility[0].crystal : '';
    const cacheKey = `crystal:${driverNumber}:${conductorNumber}:${topCrystal}`;
    const videoResult = await getVideosForCategory('crystal', { driver: driverNumber, conductor: conductorNumber, topCrystal }, cacheKey);

    res.json({
      coreNumbers: { driverNumber, conductorNumber, nameNumber },
      loshuMissing,
      purpose: cleanPurpose,
      compatibility,
      bookInsights,
      videos: videoResult.videos || [],
    });
  } catch (err) {
    console.error('Crystal analyze failed:', err.message);
    res.status(500).json({ error: 'Could not analyze crystal compatibility right now.' });
  }
});

module.exports = router;
