const express = require('express');
const calc = require('../utils/calculationEngine');
const { buildCrystalCompatibility } = require('../knowledge/crystalEngine');
const { calculateCrystalRecommendations } = require('../knowledge/crystalEngineV2');
const { buildCrystalBookInsights } = require('../knowledge/bookSearch');
const { getVideosForCategory } = require('./videos');
const { requireAdmin } = require('../utils/adminAuth');

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

// POST /api/crystals/analyze-v2 -- the new 37-stone, multi-factor,
// auditable engine. Deliberately a SEPARATE endpoint from /analyze above,
// which continues to work exactly as before for any existing callers.
router.post('/analyze-v2', async (req, res) => {
  try {
    const { day, month, year, name, system, purpose } = req.body;
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
    const missingNumbers = calc.getMissingNumbers(loshuCounts);
    const dominantNumbers = calc.getRepeatedNumbers(loshuCounts);

    const result = await calculateCrystalRecommendations({
      driverNumber, conductorNumber, nameNumber, missingNumbers, dominantNumbers, purpose: cleanPurpose,
    });

    res.json({
      coreNumbers: { driverNumber, conductorNumber, nameNumber },
      missingNumbers, dominantNumbers, purpose: cleanPurpose,
      ...result,
    });
  } catch (err) {
    console.error('Crystal analyze-v2 failed:', err.message);
    res.status(500).json({ error: 'Could not analyze crystal compatibility right now.' });
  }
});

// GET /api/crystals/stones -- list all 37 stones with their current
// number associations and sources, for the admin curation UI.
router.get('/stones', async (req, res) => {
  try {
    const CrystalStone = require('../models/CrystalStone');
    const stones = await CrystalStone.find({}).sort({ name: 1 });
    res.json({ stones });
  } catch (err) {
    res.status(500).json({ error: 'Could not load stones.' });
  }
});

// GET /api/crystals/stones/:stoneId/book-search
// Searches the consultant's own uploaded books for this specific stone
// name appearing together with any number 1-9 in the same passage --
// real, cited evidence only, never a fabricated association.
router.get('/stones/:stoneId/book-search', async (req, res) => {
  try {
    const CrystalStone = require('../models/CrystalStone');
    const { searchByExactTerm } = require('../knowledge/bookSearch');
    const stone = await CrystalStone.findOne({ stoneId: req.params.stoneId });
    if (!stone) return res.status(404).json({ error: 'Stone not found.' });

    const termEntry = { id: stone.stoneId, original_term: stone.name, original_language: 'English', system: 'Crystal healing', alternative_terms: [] };
    const result = await searchByExactTerm(termEntry, null);

    // Further filter to passages that ALSO mention a number 1-9, since a
    // bare mention of the stone's name isn't evidence of a NUMBER
    // association specifically.
    const numberPattern = /\b[1-9]\b/;
    const filteredBooks = result.books.map((b) => ({
      ...b,
      excerpts: b.excerpts.filter((e) => numberPattern.test(e.excerpt)),
    })).filter((b) => b.excerpts.length > 0);

    res.json({ stoneId: stone.stoneId, stoneName: stone.name, books: filteredBooks, sourceCount: filteredBooks.length });
  } catch (err) {
    console.error('Crystal book search failed:', err.message);
    res.status(500).json({ error: 'Could not search books right now.' });
  }
});

// PUT /api/crystals/stones/:stoneId/associations -- add a sourced number
// association. Source is required; nothing gets added without saying
// where it came from.
router.put('/stones/:stoneId/associations', requireAdmin, async (req, res) => {
  try {
    const CrystalStone = require('../models/CrystalStone');
    const { number, role, source } = req.body;
    if (!number || number < 1 || number > 9) return res.status(400).json({ error: 'A valid number (1-9) is required.' });
    if (!source || !source.trim()) return res.status(400).json({ error: 'A source is required for every association -- where did this come from?' });

    const stone = await CrystalStone.findOne({ stoneId: req.params.stoneId });
    if (!stone) return res.status(404).json({ error: 'Stone not found.' });

    stone.numberAssociations.push({ number: Number(number), role: role === 'primary' ? 'primary' : 'supporting', source: source.trim() });
    await stone.save();
    res.json({ stone });
  } catch (err) {
    console.error('Add association failed:', err.message);
    res.status(400).json({ error: 'Could not save this association.' });
  }
});

// DELETE /api/crystals/stones/:stoneId/associations/:index -- remove one
// association by its array index, in case a mapping was added in error.
router.delete('/stones/:stoneId/associations/:index', requireAdmin, async (req, res) => {
  try {
    const CrystalStone = require('../models/CrystalStone');
    const stone = await CrystalStone.findOne({ stoneId: req.params.stoneId });
    if (!stone) return res.status(404).json({ error: 'Stone not found.' });
    const idx = Number(req.params.index);
    if (idx < 0 || idx >= stone.numberAssociations.length) return res.status(400).json({ error: 'Invalid association index.' });
    stone.numberAssociations.splice(idx, 1);
    await stone.save();
    res.json({ stone });
  } catch (err) {
    res.status(400).json({ error: 'Could not remove this association.' });
  }
});

module.exports = router;
