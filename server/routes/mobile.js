const express = require('express');
const calc = require('../utils/calculationEngine');
const { analyzeMobileNumber, isValidMobileNumber } = require('../utils/mobileNumberEngine');
const { scoreMobileNumber, generateAndScoreCandidates } = require('../knowledge/mobileSuggestionEngine');
const { getVideosForCategory } = require('./videos');
const { buildMobileBookInsights } = require('../knowledge/bookSearch');
const { getNumberRecord } = require('../knowledge/numberKnowledge');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

function computeCoreNumbers({ day, month, year, name, system }) {
  const driverNumber = calc.calculateDriverNumber(day).value;
  const conductorNumber = calc.calculateConductorNumber(day, month, year).value;
  const nameNumber = name ? calc.calculateNameNumber(name, system || 'chaldean').value : null;
  return { driverNumber, conductorNumber, nameNumber };
}

const VALID_PURPOSES_FOR_SCORING = ['personal', 'business', 'career', 'finance', 'communication', 'relationships'];

// Converts the 0-100 numeric score into the three-way label the spec asks
// for. Thresholds are simple and documented here (not buried in the UI) so
// they're easy to tune later.
function compatibilityLabel(score) {
  if (score >= 65) return 'Favorable';
  if (score >= 40) return 'Neutral';
  return 'Challenging';
}

// A single plain-English sentence for the simplified UI — collapses the
// three-way label down to a binary "lucky" framing, since that's what
// this simplified view asks for. The underlying score/label/breakdown are
// still returned too, for anywhere that wants the fuller picture.
function simpleLuckyVerdict(label) {
  if (label === 'Favorable') return 'This mobile number is lucky for you.';
  if (label === 'Neutral') return 'This mobile number is fairly neutral for you \u2014 no strong pull either way.';
  return 'This mobile number may not be the most fortunate match for you.';
}

// POST /api/mobile/analyze — analyze an existing mobile number against a person's core numbers
router.post('/analyze', async (req, res) => {
  try {
    const { day, month, year, name, system, mobileNumber } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    if (!mobileNumber || !isValidMobileNumber(mobileNumber)) {
      return res.status(400).json({ error: 'Enter a valid mobile number (7-15 digits).' });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const core = computeCoreNumbers({ day: d, month: m, year: y, name, system: cleanSystem });
    const loshuMissing = calc.getMissingNumbers(calc.generateLoShuGrid(d, m, y));
    const scored = scoreMobileNumber(mobileNumber, { driver: core.driverNumber, conductor: core.conductorNumber, nameNumber: core.nameNumber, loshuMissing });
    const label = compatibilityLabel(scored.score);

    const finalDigit = scored.analysis.finalDigit;
    const cacheKey = `mobile:${finalDigit}`;
    const videoResult = await getVideosForCategory('mobile', { mobileFinalDigit: finalDigit }, cacheKey);

    res.json({
      coreNumbers: core,
      analysis: scored.analysis,
      compatibilityScore: scored.score,
      compatibilityLabel: label,
      simpleVerdict: simpleLuckyVerdict(label),
      breakdown: scored.breakdown,
      corroboration: scored.corroboration,
      videos: videoResult.videos || [],
    });
  } catch (err) {
    console.error('Mobile analyze failed:', err.message);
    res.status(500).json({ error: 'Could not analyze this mobile number right now.' });
  }
});

// POST /api/mobile/compare — compare multiple existing mobile numbers side by side
router.post('/compare', async (req, res) => {
  try {
    const { day, month, year, name, system, mobileNumbers } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    if (!Array.isArray(mobileNumbers) || mobileNumbers.length === 0) {
      return res.status(400).json({ error: 'Enter at least one mobile number to compare.' });
    }
    if (mobileNumbers.length > 10) {
      return res.status(400).json({ error: 'Compare up to 10 numbers at a time.' });
    }

    const invalid = mobileNumbers.filter((n) => !isValidMobileNumber(n));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `These aren't valid mobile numbers: ${invalid.join(', ')}` });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const core = computeCoreNumbers({ day: d, month: m, year: y, name, system: cleanSystem });
    const loshuMissing = calc.getMissingNumbers(calc.generateLoShuGrid(d, m, y));

    const results = mobileNumbers.map((mobileNumber) => {
      const scored = scoreMobileNumber(mobileNumber, { driver: core.driverNumber, conductor: core.conductorNumber, nameNumber: core.nameNumber, loshuMissing });
      return {
        mobileNumber: scored.mobileNumber,
        total: scored.analysis.total,
        finalDigit: scored.analysis.finalDigit,
        compatibilityScore: scored.score,
        compatibilityLabel: compatibilityLabel(scored.score),
      };
    });

    res.json({ coreNumbers: core, results });
  } catch (err) {
    console.error('Mobile compare failed:', err.message);
    res.status(500).json({ error: 'Could not compare these numbers right now.' });
  }
});

// POST /api/mobile/suggest — generate and rank candidate mobile numbers
router.post('/suggest', async (req, res) => {
  try {
    const { day, month, year, name, system, prefix, freeDigitCount, purpose, bookIds } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    const cleanPrefix = typeof prefix === 'string' ? prefix.replace(/[^0-9]/g, '') : '';
    const cleanFreeDigitCount = Number(freeDigitCount);
    if (!cleanFreeDigitCount || cleanFreeDigitCount < 1 || cleanFreeDigitCount > 10) {
      return res.status(400).json({ error: 'Number of digits to generate must be between 1 and 10.' });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const core = computeCoreNumbers({ day: d, month: m, year: y, name, system: cleanSystem });
    const loshuMissing = calc.getMissingNumbers(calc.generateLoShuGrid(d, m, y));

    const result = generateAndScoreCandidates({
      prefix: cleanPrefix,
      freeDigitCount: cleanFreeDigitCount,
      driver: core.driverNumber,
      conductor: core.conductorNumber,
      nameNumber: core.nameNumber,
      loshuMissing,
      purpose: VALID_PURPOSES_FOR_SCORING.includes(purpose) ? purpose : null,
    });

    let bookInsights = null;
    if (result.recommended.length > 0) {
      const top = result.recommended[0];
      const cleanBookIds = Array.isArray(bookIds) ? bookIds.filter(Boolean) : null;
      bookInsights = await buildMobileBookInsights(
        { finalDigit: top.analysis.finalDigit, firstDigit: top.analysis.firstDigit, lastDigit: top.analysis.lastDigit },
        cleanBookIds
      );
    }

    res.json({
      coreNumbers: core,
      purpose: purpose || null,
      evaluated: result.evaluated,
      recommended: result.recommended,
      bookInsightsForTopPick: bookInsights,
    });
  } catch (err) {
    console.error('Mobile suggest failed:', err.message);
    res.status(500).json({ error: err.message.includes('freeDigitCount') ? err.message : 'Could not generate suggestions right now.' });
  }
});

module.exports = router;
