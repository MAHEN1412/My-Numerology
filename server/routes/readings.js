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

  let nameNumber = null, soulUrgeNumber = null, personalityNumber = null, karmicNumbers = null, pyramidNumber = null;
  if (name) {
    nameNumber = calc.calculateNameNumber(name, system);
    soulUrgeNumber = calc.calculateSoulUrgeNumber(name, system);
    personalityNumber = calc.calculatePersonalityNumber(name, system);
    karmicNumbers = calc.calculateKarmicNumbers(name, system);
    pyramidNumber = calc.calculatePyramidNumber(name, system);
    if (pyramidNumber) {
      // "Destiny Match" per the source method: the pyramid apex matching
      // either the Driver (birth day) or Conductor (full date sum) is
      // considered a notable alignment -- a real, checkable fact about
      // the two numbers, not an invented claim about outcomes.
      pyramidNumber.matchesDriver = pyramidNumber.value === driverNumber.value;
      pyramidNumber.matchesConductor = pyramidNumber.value === conductorNumber.value;
    }
  }

  // Per the app owner's explicit request, when a name is given, the Name
  // Number's compound (pre-reduction) digits are also folded into the Lo
  // Shu grid alongside the birth-date digits and Driver/Conductor — not
  // the default mainstream Chaldean convention (documented separately),
  // but an intentional, explicit extension for this specific build.
  const loshuCounts = calc.generateLoShuGrid(day, month, year, {
    nameNumberValue: nameNumber ? nameNumber.value : null,
  });
  const loshuSources = calc.generateLoShuGridWithSources(day, month, year, {
    nameNumberValue: nameNumber ? nameNumber.value : null,
  });
  const loshu = {
    layout: calc.LOSHU_LAYOUT,
    counts: loshuCounts,
    sources: loshuSources,
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
    pyramidNumber,
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

// POST /api/readings/lo-shu-projection
// Keeps the person's day+month fixed (from their real birth date) but
// varies the YEAR across a run of consecutive years, showing how the Lo
// Shu grid itself shifts year to year -- a personal-year-style timeline,
// not a re-calculation of their actual birth numbers (Driver/Conductor
// stay tied to their real birth year; this is a separate exploratory view).
router.post('/lo-shu-projection', (req, res) => {
  try {
    const { day, month, startYear, yearsCount, nameNumberValue } = req.body;
    const d = Number(day);
    const m = Number(month);
    const start = Number(startYear);
    const count = Math.min(Math.max(Number(yearsCount) || 20, 1), 30); // sane cap, default 20

    if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(start)) {
      return res.status(400).json({ error: 'Valid day, month, and startYear are required.' });
    }

    const years = [];
    for (let i = 0; i < count; i++) {
      const y = start + i;
      const counts = calc.generateLoShuGrid(d, m, y, { nameNumberValue: nameNumberValue || null });
      years.push({
        year: y,
        counts,
        present: calc.getPresentNumbers(counts),
        missing: calc.getMissingNumbers(counts),
        repeated: calc.getRepeatedNumbers(counts),
      });
    }

    res.json({ day: d, month: m, years });
  } catch (err) {
    console.error('Lo Shu projection failed:', err.message);
    res.status(500).json({ error: 'Could not calculate the projection right now.' });
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

// POST /api/readings/kua-number
// Separate from the main /readings calculation since Kua only needs
// birth year + gender, not the full DOB/name profile.
router.post('/kua-number', async (req, res) => {
  try {
    const { day, month, year, gender } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);
    if (!isValidCalendarDate(d, m, y)) return res.status(400).json({ error: 'A valid full date of birth (day, month, year) is required -- the lunar-year adjustment needs the exact date, not just the year.' });
    if (!['Male', 'Female'].includes(gender)) return res.status(400).json({ error: 'Gender must be Male or Female to calculate Kua Number.' });

    const kua = calc.calculateKuaNumber(d, m, y, gender);
    const reference = calc.KUA_REFERENCE[kua.value];

    res.json({ value: kua.value, steps: kua.steps, specialRuleApplied: kua.specialRuleApplied, lunarYear: kua.lunarYear, lunarAdjustmentApplied: kua.lunarAdjustmentApplied, reference });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not calculate Kua Number.' });
  }
});

// POST /api/readings/total-chaldean
// Per-letter Chaldean breakdown, vowel/consonant split, and a lookup into
// the Compound Number table (10-80) for the raw, un-reduced total --
// distinct from the reduced Name Number, since compound numbers are
// traditionally read for names, nicknames, phone/vehicle numbers, etc.
router.post('/total-chaldean', async (req, res) => {
  try {
    const { name, day, month, year } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a name to calculate.' });

    // DOB is optional here -- Birth Number and Destiny Number are only
    // included if a complete, valid date was actually given.
    let birthNumber = null, destinyNumber = null, destinyChunked = null;
    const d = Number(day), m = Number(month), y = Number(year);
    if (isValidCalendarDate(d, m, y)) {
      birthNumber = calc.calculateDriverNumber(d);
      destinyNumber = calc.calculateConductorNumber(d, m, y);
      destinyChunked = calc.calculateDestinyNumberChunked(d, m, y);
      destinyChunked.day.chaldeanLetters = calc.lettersForNumber(destinyChunked.day.total, 'chaldean');
      destinyChunked.month.chaldeanLetters = calc.lettersForNumber(destinyChunked.month.total, 'chaldean');
      destinyChunked.year.chaldeanLetters = calc.lettersForNumber(destinyChunked.year.total, 'chaldean');
    }

    const VOWEL_SET = new Set(['A', 'E', 'I', 'O', 'U']);
    const lookupCompound = (value) => (value >= 10 && value <= 80) ? { value, ...calc.COMPOUND_NUMBER_TABLE[value] } : null;

    // ----- Chaldean (with Compound Number reading -- a Chaldean-specific concept) -----
    const chNameResult = calc.calculateNameNumber(name, 'chaldean');
    const chVowelResult = calc.calculateSoulUrgeNumber(name, 'chaldean');
    const chConsonantResult = calc.calculatePersonalityNumber(name, 'chaldean');
    const chTotal = chNameResult.compound;
    const chVowelTotal = chVowelResult.compound;
    const chConsonantTotal = chConsonantResult.compound;

    const chaldean = {
      letters: chNameResult.breakdown.map((l) => ({ ...l, isVowel: VOWEL_SET.has(l.letter) })),
      total: chTotal,
      vowelTotal: chVowelTotal,
      consonantTotal: chConsonantTotal,
      identityCheck: chVowelTotal + chConsonantTotal === chTotal,
      reducedNameNumber: chNameResult.value,
      compound: lookupCompound(chTotal),
      vowelCompound: lookupCompound(chVowelTotal),
      consonantCompound: lookupCompound(chConsonantTotal),
    };

    // ----- Pythagorean (letter breakdown + totals only -- NO compound
    // number reading, since that table is specifically a Chaldean
    // concept and applying it here would mix two different traditions'
    // methods) -----
    const pyNameResult = calc.calculateNameNumber(name, 'pythagorean');
    const pyVowelResult = calc.calculateSoulUrgeNumber(name, 'pythagorean');
    const pyConsonantResult = calc.calculatePersonalityNumber(name, 'pythagorean');
    const pyTotal = pyNameResult.compound;
    const pyVowelTotal = pyVowelResult.compound;
    const pyConsonantTotal = pyConsonantResult.compound;

    const pythagorean = {
      letters: pyNameResult.breakdown.map((l) => ({ ...l, isVowel: VOWEL_SET.has(l.letter) })),
      total: pyTotal,
      vowelTotal: pyVowelTotal,
      consonantTotal: pyConsonantTotal,
      identityCheck: pyVowelTotal + pyConsonantTotal === pyTotal,
      reducedNameNumber: pyNameResult.value,
    };

    // Lo Shu grid: DOB + Driver + Conductor + the name's Chaldean Name
    // Number digits. Confirmed final: the grid SHOULD reflect name
    // changes (this was reverted once, then explicitly re-confirmed).
    let loShuGrid = null, missingCenterSuggestion = null;
    if (isValidCalendarDate(d, m, y)) {
      const counts = calc.generateLoShuGrid(d, m, y, { nameNumberValue: chaldean.reducedNameNumber });
      loShuGrid = {
        layout: calc.LOSHU_LAYOUT,
        counts,
        present: calc.getPresentNumbers(counts),
        missing: calc.getMissingNumbers(counts),
        repeated: calc.getRepeatedNumbers(counts),
      };
      if (counts[5] === 0) {
        // Center box (5) is empty -- suggest the Chaldean value-5
        // letters (E, H, N, X) as candidates to add to the name. All
        // four share the same value, so there's no single "best" one;
        // showing all as options rather than picking one arbitrarily.
        missingCenterSuggestion = { missingNumber: 5, candidateLetters: calc.lettersForNumber(5, 'chaldean') };
      }
    }

    res.json({
      name, chaldean, pythagorean, compoundTableRange: { min: 10, max: 80 },
      birthNumber: birthNumber ? { value: birthNumber.value, steps: birthNumber.steps, chaldeanLetters: calc.lettersForNumber(birthNumber.value, 'chaldean') } : null,
      destinyNumber: destinyNumber ? { value: destinyNumber.value, steps: destinyNumber.steps, chaldeanLetters: calc.lettersForNumber(destinyNumber.value, 'chaldean') } : null,
      destinyChunked,
      loShuGrid,
      missingCenterSuggestion,
    });
  } catch (err) {
    console.error('Total Chaldean failed:', err.message);
    res.status(400).json({ error: 'Could not calculate right now.' });
  }
});

// POST /api/readings/letter-compatibility
// Looks up the Ascendant/Harmonious/Clashing letter groups for a Driver
// Number (from day of birth). If a name is also given, classifies each
// of its letters into one of those three groups -- directly supporting
// name-change decisions, which is what this table is traditionally used
// for.
router.post('/letter-compatibility', async (req, res) => {
  try {
    const { day, name } = req.body;
    const d = Number(day);
    if (!d || d < 1 || d > 31) return res.status(400).json({ error: 'A valid day of birth (1-31) is required.' });

    const driverNumber = calc.calculateDriverNumber(d).value;
    const group = calc.LETTER_COMPATIBILITY_TABLE[driverNumber];
    if (!group) return res.status(400).json({ error: 'No letter compatibility data for this Driver Number.' });

    let nameAnalysis = null;
    if (name && name.trim()) {
      const letters = name.toUpperCase().replace(/[^A-Z]/g, '').split('');
      nameAnalysis = letters.map((letter) => {
        let status = 'neutral';
        if (group.ascendant.includes(letter)) status = 'ascendant';
        else if (group.harmonious.includes(letter)) status = 'harmonious';
        else if (group.clashing.includes(letter)) status = 'clashing';
        return { letter, alphabetPosition: calc.alphabetPosition(letter), status };
      });
    }

    res.json({
      day: d,
      driverNumber,
      ascendant: group.ascendant,
      harmonious: group.harmonious,
      clashing: group.clashing,
      nameAnalysis,
    });
  } catch (err) {
    console.error('Letter compatibility failed:', err.message);
    res.status(400).json({ error: 'Could not calculate right now.' });
  }
});

// POST /api/readings/number-relationships
// Given a core number (e.g. Driver/Birth Number), returns which other
// numbers 1-9 are Friendly (favorable/lucky), Neutral, or Enemy --
// transcribed from the planetary friendship/enmity table provided, with
// unlisted relationships treated as Enemy per explicit instruction.
router.post('/number-relationships', async (req, res) => {
  try {
    const { number } = req.body;
    const n = Number(number);
    if (!n || n < 1 || n > 9) return res.status(400).json({ error: 'A valid number (1-9) is required.' });

    const rel = calc.NUMBER_RELATIONSHIPS[n];
    res.json({
      number: n,
      planet: rel.planet,
      favorable: rel.friendly,
      neutral: rel.neutral,
      enemy: rel.enemy,
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not look up this number right now.' });
  }
});

// POST /api/readings/number-relationships-v2
// Given Driver and Conductor numbers, returns their Friendly/Enemy/Neutral
// lists SEPARATELY (per explicit confirmation -- not merged), using the
// corrected v2 table (asterisk conflicts resolved: Enemy wins over
// Friendly, and the same "more cautious wins" principle extended to
// Friendly-vs-Neutral conflicts).
router.post('/number-relationships-v2', async (req, res) => {
  try {
    const { driverNumber, conductorNumber } = req.body;
    const d = Number(driverNumber), c = Number(conductorNumber);
    if (!d || d < 1 || d > 9 || !c || c < 1 || c > 9) return res.status(400).json({ error: 'Valid Driver and Conductor numbers (1-9) are required.' });

    const driverRel = calc.NUMBER_RELATIONSHIPS_V2[d];
    const conductorRel = calc.NUMBER_RELATIONSHIPS_V2[c];

    res.json({
      driver: { number: d, friendly: driverRel.friendly, enemy: driverRel.enemy, neutral: driverRel.neutral },
      conductor: { number: c, friendly: conductorRel.friendly, enemy: conductorRel.enemy, neutral: conductorRel.neutral },
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not look up these numbers right now.' });
  }
});

// POST /api/readings/lucky-number
// Combines Driver Number, Destiny Number (aka "Life Path"), and Name
// Number, plus each of their Friendly numbers (from NUMBER_RELATIONSHIPS_V2),
// into a single deduplicated Luck Number list.
router.post('/lucky-number', async (req, res) => {
  try {
    const { name, day, month, year } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a name to calculate.' });
    const d = Number(day), m = Number(month), y = Number(year);
    if (!isValidCalendarDate(d, m, y)) return res.status(400).json({ error: 'Enter a valid date of birth.' });

    const driverNumber = calc.calculateDriverNumber(d).value;
    const destinyNumber = calc.calculateConductorNumber(d, m, y).value; // "Life Path"
    const nameNumber = calc.calculateNameNumber(name, 'chaldean').value;

    const friendlyOf = (n) => calc.NUMBER_RELATIONSHIPS_V2[n] ? calc.NUMBER_RELATIONSHIPS_V2[n].friendly : [];

    // Intersection (not union) of Driver/Destiny/Name Number's Friendly
    // lists, per confirmed narrowing -- a union tends to cover most of
    // 1-9 since each core number's own Friendly list already has 4-5
    // entries, making it unhelpfully broad as a "lucky number" list.
    const driverFriendly = friendlyOf(driverNumber);
    const destinyFriendly = friendlyOf(destinyNumber);
    const nameFriendly = friendlyOf(nameNumber);
    const luckyNumbers = driverFriendly.filter((n) => destinyFriendly.includes(n) && nameFriendly.includes(n)).sort((a, b) => a - b);

    res.json({
      name, day: d, month: m, year: y,
      luckyNumbers,
      destinyNumber,
      mainPlanetNumber: driverNumber, // "Main Planet" -- the Driver Number, which traditionally determines a person's ruling planet
      lifePath: destinyNumber,
      nameNumber,
    });
  } catch (err) {
    console.error('Lucky Number failed:', err.message);
    res.status(400).json({ error: 'Could not calculate right now.' });
  }
});

module.exports = router;
module.exports.buildResultObject = buildResultObject;
