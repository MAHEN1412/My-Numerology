/**
 * CALCULATION ENGINE
 * ===================
 * Pure numerology math. This module contains ZERO interpretation text —
 * it only calculates numbers and records how each one was derived. All
 * meaning/interpretation lives in server/knowledge/, kept deliberately
 * separate so calculation logic can never accidentally get mixed with
 * (or contradict) interpretation text.
 *
 * Terminology:
 *   Driver Number (Mulank)      = Psychic/Birth Number  -> day of birth only
 *   Conductor Number (Bhagyank) = Life Path/Destiny Number -> full DOB
 *   Name Number (Expression)    = full name, Chaldean or Pythagorean
 *   Soul Urge                   = vowels of the name only
 *   Personality Number          = consonants of the name only
 */

const { Solar } = require('lunar-javascript');

const MASTER_NUMBERS = [11, 22, 33];

// --- Configurable letter-value mappings -----------------------------------
// Kept as plain data so the methodology can be changed or extended (e.g. a
// third system) without touching any calculation logic below.
const CHALDEAN_MAP = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  F: 8, P: 8,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
};

const PYTHAGOREAN_MAP = (() => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const map = {};
  letters.forEach((l, i) => { map[l] = (i % 9) + 1; });
  return map;
})();

const LETTER_SYSTEMS = { chaldean: CHALDEAN_MAP, pythagorean: PYTHAGOREAN_MAP };
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// --- Core digit reduction ---------------------------------------------------

function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((a, d) => a + Number(d), 0);
}

/**
 * Reduces a number to a single digit, logging every step. If
 * preserveMasters is true, stops early when the running total is a master
 * number (11/22/33) and reports it as such; the caller decides whether the
 * *final* value should keep the master number or be forced down to 1-9.
 */
function reduceNumber(n, preserveMasters) {
  const log = [];
  let current = n;
  const encounteredMasters = [];
  while (current > 9) {
    if (MASTER_NUMBERS.includes(current)) encounteredMasters.push(current);
    if (preserveMasters && MASTER_NUMBERS.includes(current)) break;
    const next = digitSum(current);
    log.push({ from: current, to: next });
    current = next;
  }
  return { result: current, log, encounteredMasters };
}

function stepsText(log) {
  return log.map((s) => `${String(s.from).split('').join(' + ')} = ${s.to}`).join('\n');
}

// --- Driver / Conductor -----------------------------------------------------
// Per standard Mulank/Bhagyank practice, these two always fully reduce to a
// single digit 1-9 (e.g. day 29 -> 2+9=11 -> 1+1=2). Any master number that
// appears mid-calculation is still recorded, for knowledge-layer use.

function calculateDriverNumber(day) {
  const { result, log, encounteredMasters } = reduceNumber(day, false);
  const steps = log.length
    ? `Day of birth: ${day}\n${stepsText(log)}\nDriver Number = ${result}`
    : `Day of birth: ${day}\nAlready a single digit.\nDriver Number = ${result}`;
  return { value: result, steps, encounteredMasters, rawInput: day };
}

function calculateConductorNumber(day, month, year) {
  const digits = `${day}${month}${year}`.split('').map(Number);
  const total = digits.reduce((a, b) => a + b, 0);
  const { result, log, encounteredMasters } = reduceNumber(total, false);
  const dobText = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  const steps = `${dobText}\n${digits.join(' + ')} = ${total}\n${stepsText(log)}\nConductor Number = ${result}`;
  return { value: result, steps, encounteredMasters, compound: total };
}

// Kua Number (Feng Shui / Eight Mansions system). Formula verified against
// multiple independent sources and their worked examples -- different
// arithmetic for birth years before vs. from 2000, and for male vs.
// female. A calculated result of 5 has no standalone Kua number in this
// system and is always substituted: 2 for males, 8 for females.
//
// Feng Shui follows the lunar calendar, not January 1st -- someone born
// before that year's Lunar New Year (which falls between Jan 21 and Feb
// 20 depending on the year) belongs to the PREVIOUS lunar year for this
// calculation. Uses the lunar-javascript library (verified against
// several independently-confirmed Lunar New Year dates, including the
// exact worked example of Jan 15 1990 -> lunar year 1989 from one of the
// source articles) rather than a manually-transcribed date table.
function calculateKuaNumber(day, month, year, gender) {
  if (!['Male', 'Female'].includes(gender)) {
    throw new Error('Kua Number requires gender to be exactly "Male" or "Female".');
  }

  const solar = Solar.fromYmd(year, month, day);
  const lunarYear = solar.getLunar().getYear();
  const lunarAdjustmentApplied = lunarYear !== year;

  const lastTwoDigits = lunarYear % 100;
  const rawSum = Math.floor(lastTwoDigits / 10) + (lastTwoDigits % 10);
  let digitSum = rawSum;
  const reductionSteps = [];
  while (digitSum > 9) {
    const next = Math.floor(digitSum / 10) + (digitSum % 10);
    reductionSteps.push(`${digitSum} \u2192 ${Math.floor(digitSum / 10)} + ${digitSum % 10} = ${next}`);
    digitSum = next;
  }

  const isPost2000 = lunarYear >= 2000;
  let kua;
  let formulaText;

  if (gender === 'Male') {
    const base = isPost2000 ? 9 : 10;
    kua = base - digitSum;
    if (kua === 0) kua = 9; // only possible for post-2000 males when digitSum is 9
    formulaText = `Male, born ${isPost2000 ? '2000 or later' : 'before 2000'} (lunar year): ${base} - ${digitSum} = ${kua}`;
  } else {
    const addend = isPost2000 ? 6 : 5;
    let sum = digitSum + addend;
    const addSteps = [`${digitSum} + ${addend} = ${sum}`];
    while (sum > 9) {
      const next = Math.floor(sum / 10) + (sum % 10);
      addSteps.push(`${sum} \u2192 ${Math.floor(sum / 10)} + ${sum % 10} = ${next}`);
      sum = next;
    }
    kua = sum;
    formulaText = `Female, born ${isPost2000 ? '2000 or later' : 'before 2000'} (lunar year): ${addSteps.join(' | ')}`;
  }

  let specialRuleApplied = false;
  if (kua === 5) {
    specialRuleApplied = true;
    kua = gender === 'Male' ? 2 : 8;
  }

  const steps = [
    lunarAdjustmentApplied
      ? `Birth date ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year} falls before that year's Lunar New Year \u2192 using lunar year ${lunarYear} instead of calendar year ${year}`
      : `Lunar year for this birth date matches the calendar year: ${lunarYear}`,
    `Last two digits of lunar year ${lunarYear}: ${lastTwoDigits}`,
    `${Math.floor(lastTwoDigits / 10)} + ${lastTwoDigits % 10} = ${rawSum}`,
    ...reductionSteps,
    formulaText,
    specialRuleApplied ? `Result was 5 (no standalone Kua 5 in this system) \u2192 substituted to ${kua} for ${gender}` : null,
    `Kua Number = ${kua}`,
  ].filter(Boolean).join('\n');

  return { value: kua, steps, specialRuleApplied, lunarYear, lunarAdjustmentApplied };
}

// --- Name-based numbers ------------------------------------------------------
// These preserve master numbers in the final value (standard Western
// convention for name-derived numbers, distinct from Driver/Conductor).

function lettersOf(name) {
  return name.toUpperCase().replace(/[^A-Z]/g, '').split('');
}

function sumAndReduce(letters, system, label) {
  const map = LETTER_SYSTEMS[system];
  const breakdown = letters.map((l) => ({ letter: l, value: map[l] || 0 }));
  const compound = breakdown.reduce((a, b) => a + b.value, 0);
  const { result, log, encounteredMasters } = reduceNumber(compound, true);
  const steps = `${label}\nSystem: ${system}\n${breakdown.map((b) => `${b.letter}=${b.value}`).join('  ')}\nCompound = ${compound}\n${stepsText(log)}\nResult = ${result}`;
  const isMaster = MASTER_NUMBERS.includes(result);
  return { value: result, compound, steps, breakdown, isMaster, encounteredMasters };
}

function calculateNameNumber(fullName, system) {
  return sumAndReduce(lettersOf(fullName), system, `Name Number (Expression): ${fullName}`);
}

function calculateSoulUrgeNumber(fullName, system) {
  const vowels = lettersOf(fullName).filter((l) => VOWELS.has(l));
  return sumAndReduce(vowels, system, `Soul Urge (vowels): ${fullName}`);
}

function calculatePersonalityNumber(fullName, system) {
  const consonants = lettersOf(fullName).filter((l) => !VOWELS.has(l));
  return sumAndReduce(consonants, system, `Personality (consonants): ${fullName}`);
}

/**
 * Karmic Lesson Numbers: digits 1-9 that never appear among the name's
 * letter values in the chosen system. A standard numerology concept
 * distinct from the Lo Shu grid's missing numbers (which come from the
 * birth date instead).
 */
function calculateKarmicNumbers(fullName, system) {
  const map = LETTER_SYSTEMS[system];
  const present = new Set(lettersOf(fullName).map((l) => map[l]).filter(Boolean));
  const karmic = [];
  for (let i = 1; i <= 9; i++) if (!present.has(i)) karmic.push(i);
  return karmic;
}

/**
 * Pyramid Number (aka "Triangle of Life" in some traditions): start with
 * each letter's Chaldean value as the base row, then build each
 * successive row by summing adjacent pairs, reducing EACH pair-sum to a
 * single digit immediately (not accumulating multi-digit values across
 * rows, and not preserving master numbers -- e.g. 5+6=11 reduces to 2,
 * matching the worked example this was verified against). Continue until
 * a single apex number remains.
 */
function reduceSingleDigit(n) {
  while (n > 9) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

function calculatePyramidNumber(fullName, system) {
  const map = LETTER_SYSTEMS[system];
  const letters = lettersOf(fullName);
  if (letters.length === 0) return null;

  let row = letters.map((l) => map[l] || 0);
  const rows = [row.slice()];

  while (row.length > 1) {
    const nextRow = [];
    for (let i = 0; i < row.length - 1; i++) {
      nextRow.push(reduceSingleDigit(row[i] + row[i + 1]));
    }
    rows.push(nextRow.slice());
    row = nextRow;
  }

  const apex = row[0];
  const rowsText = rows.map((r, i) => `Row ${i + 1}: ${r.join(' ')}`).join('\n');
  const steps = `${fullName}\n${letters.join(' ')}\n${rowsText}\nPyramid (Apex) Number = ${apex}`;

  return { value: apex, rows, steps };
}

// --- Lo Shu grid --------------------------------------------------------------

const LOSHU_LAYOUT = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

/**
 * Generates the Lo Shu grid digit counts.
 *
 * By default (includeDriverConductor = true) this follows the documented
 * "modern Chaldean numerology method": birth-date digits (zeros excluded)
 * PLUS the Driver and Conductor numbers, which are added into the grid to
 * fill in gaps the raw birth date alone leaves. This is confirmed practice
 * across multiple independent numerology sources, not a guess.
 *
 * Passing includeDriverConductor: false reverts to the stricter classical
 * convention (birth-date digits only, nothing added) — kept available
 * since some traditions use that instead.
 *
 * Passing nameNumberValue also adds the Name Number's final REDUCED value
 * (e.g. 5, not its pre-reduction compound like 68) into the grid, the same
 * way Driver/Conductor are added. This exact rule — the reduced value, not
 * the compound's individual digits — was verified against two independent
 * real reference reports for the same person (their original name and a
 * corrected name), matching the reported grid exactly in both cases; using
 * the compound's raw digits instead did NOT match. If the value is a
 * master number (11/22/33), each of its own digits is added individually,
 * since a grid cell only holds 1-9.
 * This is an explicit, opt-in extension for this specific build — not the
 * mainstream Chaldean convention, which keeps the Name Number separate
 * from the Lo Shu grid (documented and tested against sources elsewhere
 * in this codebase). Pass it only where a name is available and this
 * specific extension is wanted.
 */
function generateLoShuGrid(day, month, year, options = {}) {
  const { includeDriverConductor = true, nameNumberValue = null } = options;
  const digits = `${day}${month}${year}`.split('').map(Number).filter((d) => d !== 0);

  if (includeDriverConductor) {
    digits.push(calculateDriverNumber(day).value);
    digits.push(calculateConductorNumber(day, month, year).value);
  }

  if (nameNumberValue !== null && nameNumberValue !== undefined) {
    String(nameNumberValue).split('').map(Number).forEach((d) => digits.push(d));
  }

  const counts = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  digits.forEach((d) => counts[d]++);
  return counts;
}

function getPresentNumbers(counts) { return Object.keys(counts).filter((k) => counts[k] > 0).map(Number).sort((a, b) => a - b); }
function getMissingNumbers(counts) { return Object.keys(counts).filter((k) => counts[k] === 0).map(Number).sort((a, b) => a - b); }
function getRepeatedNumbers(counts) { return Object.keys(counts).filter((k) => counts[k] > 1).map(Number).sort((a, b) => a - b); }

// Configurable repetition-strength thresholds — different numerology
// traditions weigh repeated digits differently, so this is data, not a
// hardcoded switch statement.
const REPETITION_THRESHOLDS = [
  { min: 1, max: 1, label: 'normal presence' },
  { min: 2, max: 2, label: 'enhanced presence' },
  { min: 3, max: 3, label: 'strong / repeated influence' },
  { min: 4, max: Infinity, label: 'highly repeated' },
];

function repetitionStrength(count) {
  return (REPETITION_THRESHOLDS.find((t) => count >= t.min && count <= t.max) || REPETITION_THRESHOLDS[0]).label;
}

// Configurable plane definitions — data, not hardcoded UI logic.
const PLANES = [
  { name: 'Mental plane', nums: [4, 9, 2] },
  { name: 'Emotional plane', nums: [3, 5, 7] },
  { name: 'Practical plane', nums: [8, 1, 6] },
  { name: 'Thought plane', nums: [4, 3, 8] },
  { name: 'Will plane', nums: [9, 5, 1] },
  { name: 'Action plane', nums: [2, 7, 6] },
];

function findPlanes(counts) {
  return PLANES.map((p) => ({ ...p, complete: p.nums.every((n) => counts[n] > 0) }));
}

// Configurable arrow definitions — data, not hardcoded UI logic.
const ARROWS = [
  { name: 'Arrow of intellect', nums: [4, 9, 2] },
  { name: 'Arrow of emotional balance', nums: [3, 5, 7] },
  { name: 'Arrow of practicality', nums: [8, 1, 6] },
  { name: 'Arrow of planning', nums: [4, 3, 8] },
  { name: 'Arrow of willpower', nums: [9, 5, 1] },
  { name: 'Arrow of compassion', nums: [2, 7, 6] },
  { name: 'Arrow of determination', nums: [4, 5, 6] },
  { name: 'Arrow of spirituality', nums: [2, 5, 8] },
];

function findArrows(counts) {
  return ARROWS.map((a) => ({ ...a, active: a.nums.every((n) => counts[n] > 0) }));
}

// Kua Number reference table -- Element, Group, and favorable directions
// are the standard Eight Mansions Feng Shui associations for each Kua
// number (no Kua 5 exists as its own entry; it's always substituted per
// calculateKuaNumber above).
const KUA_REFERENCE = {
  1: { element: 'Water', group: 'East', favorableDirections: ['North', 'East', 'Southeast', 'South'], summary: 'Associated with wisdom, intuition, and adaptable communication.' },
  2: { element: 'Earth', group: 'West', favorableDirections: ['Southwest', 'West', 'Northwest', 'Northeast'], summary: 'Associated with steadiness, patience, and a nurturing temperament.' },
  3: { element: 'Wood', group: 'East', favorableDirections: ['East', 'Southeast', 'South', 'North'], summary: 'Associated with ambition, drive, and forward momentum.' },
  4: { element: 'Wood', group: 'East', favorableDirections: ['Southeast', 'East', 'South', 'North'], summary: 'Associated with creativity, sharp thinking, and gentleness.' },
  6: { element: 'Metal', group: 'West', favorableDirections: ['Northwest', 'West', 'Northeast', 'Southwest'], summary: 'Associated with leadership, discipline, and resolve.' },
  7: { element: 'Metal', group: 'West', favorableDirections: ['West', 'Northwest', 'Southwest', 'Northeast'], summary: 'Associated with charm, sociability, and helpfulness.' },
  8: { element: 'Earth', group: 'West', favorableDirections: ['Northeast', 'Southwest', 'West', 'Northwest'], summary: 'Associated with groundedness, security, and steady success.' },
  9: { element: 'Fire', group: 'East', favorableDirections: ['South', 'Southeast', 'East', 'North'], summary: 'Associated with visibility, clarity, and enthusiasm.' },
};

module.exports = {
  LETTER_SYSTEMS,
  MASTER_NUMBERS,
  reduceNumber,
  calculateDriverNumber,
  calculateConductorNumber,
  calculateKuaNumber,
  KUA_REFERENCE,
  calculateNameNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  calculateKarmicNumbers,
  calculatePyramidNumber,
  generateLoShuGrid,
  getPresentNumbers,
  getMissingNumbers,
  getRepeatedNumbers,
  repetitionStrength,
  findPlanes,
  findArrows,
  LOSHU_LAYOUT,
};
