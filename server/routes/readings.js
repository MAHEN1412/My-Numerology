const express = require('express');
const Reading = require('../models/Reading');
const calc = require('../utils/calculationEngine');
const { buildInterpretationReport } = require('../knowledge/interpretationEngine');
const { buildNumbersAnalysis, buildColorProfile } = require('../knowledge/colorEngine');
const { NUMBER_RECORDS } = require('../knowledge/numberKnowledge');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

function isFutureDate(d, m, y) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d).getTime() > today.getTime();
}

/**
 * Builds the single normalized result object described in the spec (section
 * 18) — the one source of truth the frontend renders from.
 */
function buildResultObject({ name, day, month, year, system }) {
  const driverNumber = calc.calculateDriverNumber(day);
  const conductorNumber = calc.calculateConductorNumber(day, month, year);

  let nameNumber = null, soulUrgeNumber = null, personalityNumber = null, karmicNumbers = null;
  if (name) {
    nameNumber = calc.calculateNameNumber(name, system);
    soulUrgeNumber = calc.calculateSoulUrgeNumber(name, system);
    personalityNumber = calc.calculatePersonalityNumber(name, system);
    karmicNumbers = calc.calculateKarmicNumbers(name, system);
  }

  // Per the app owner's explicit request, when a name is given, the Name
  // Number's compound (pre-reduction) digits are also folded into the Lo
  // Shu grid alongside the birth-date digits and Driver/Conductor — not
  // the default mainstream Chaldean convention (documented separately),
  // but an intentional, explicit extension for this specific build.
  const loshuCounts = calc.generateLoShuGrid(day, month, year, {
    nameNumberValue: nameNumber ? nameNumber.value : null,
  });
  const loshu = {
    layout: calc.LOSHU_LAYOUT,
    counts: loshuCounts,
    present: calc.getPresentNumbers(loshuCounts),
    missing: calc.getMissingNumbers(loshuCounts),
    repeated: calc.getRepeatedNumbers(loshuCounts),
  };
  const planes = calc.findPlanes(loshuCounts);
  const arrows = calc.findArrows(loshuCounts);

  // Collect every master number encountered anywhere during calculation,
  // per the spec's "Master Numbers" category — even though Driver/Conductor
  // themselves always fully reduce to 1-9 (Mulank/Bhagyank convention).
  const masterNumbersEncountered = Array.from(new Set([
    ...driverNumber.encounteredMasters,
    ...conductorNumber.encounteredMasters,
    ...(nameNumber ? nameNumber.encounteredMasters : []),
    ...(soulUrgeNumber ? soulUrgeNumber.encounteredMasters : []),
    ...(personalityNumber ? personalityNumber.encounteredMasters : []),
  ]));

  const interpretations = buildInterpretationReport({
    driverNumber, conductorNumber, nameNumber, soulUrgeNumber, personalityNumber,
    karmicNumbers, system, loshu, planes, arrows, repetitionStrengthFn: calc.repetitionStrength,
  });

  const numbersAnalysis = buildNumbersAnalysis({
    driver: driverNumber.value, conductor: conductorNumber.value, nameNumber: nameNumber ? nameNumber.value : null,
  });
  const colorProfile = buildColorProfile({
    driver: driverNumber.value, conductor: conductorNumber.value, nameNumber: nameNumber ? nameNumber.value : null,
    loshuPresent: loshu.present, loshuMissing: loshu.missing,
  });

  return {
    name: name || null,
    day, month, year, system,
    driverNumber,
    conductorNumber,
    nameNumber,
    chaldeanNameNumber: name ? calc.calculateNameNumber(name, 'chaldean') : null,
    pythagoreanNameNumber: name ? calc.calculateNameNumber(name, 'pythagorean') : null,
    soulUrgeNumber,
    personalityNumber,
    expressionNumber: nameNumber, // Expression Number is the same calculation as Name Number
    compoundNumbers: {
      conductor: conductorNumber.compound,
      name: nameNumber ? nameNumber.compound : null,
    },
    masterNumbers: masterNumbersEncountered,
    karmicNumbers,
    loShuGrid: loshu,
    numberFrequency: loshuCounts,
    missingNumbers: loshu.missing,
    repeatedNumbers: loshu.repeated,
    planes,
    arrows,
    interpretations,
    numbersAnalysis,
    colorProfile,
    numberKnowledgeBase: NUMBER_RECORDS,
  };
}

// POST /api/readings
router.post('/', async (req, res) => {
  try {
    const { name, day, month, year, system } = req.body;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const cleanName = typeof name === 'string' ? name.trim() : '';

    if (cleanName && !/^[a-zA-Z\s'-]+$/.test(cleanName)) {
      return res.status(400).json({ error: 'Enter a name using letters only, or leave it blank.' });
    }
    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    if (isFutureDate(d, m, y)) {
      return res.status(400).json({ error: 'Date of birth cannot be in the future.' });
    }

    const result = buildResultObject({ name: cleanName, day: d, month: m, year: y, system: cleanSystem });
    const reading = await Reading.create({ name: cleanName || undefined, day: d, month: m, year: y, system: cleanSystem, result });

    res.status(201).json({ id: reading._id, result, createdAt: reading.createdAt });
  } catch (err) {
    console.error('Failed to create reading:', err);
    res.status(500).json({ error: 'Something went wrong generating that reading. Try again.' });
  }
});

// GET /api/readings/:id
router.get('/:id', async (req, res) => {
  try {
    const reading = await Reading.findById(req.params.id);
    if (!reading) return res.status(404).json({ error: 'Reading not found.' });
    res.json({ id: reading._id, result: reading.result, createdAt: reading.createdAt });
  } catch (err) {
    res.status(400).json({ error: 'Invalid reading id.' });
  }
});

module.exports = router;
