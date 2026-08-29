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

// Reverse lookup: given a number, which letters map to it in the chosen
// system? Used to answer "what letters correspond to my Destiny Number"
// style questions -- e.g. lettersForNumber(6, 'chaldean') -> ['U','V','W'].
function lettersForNumber(number, system) {
  const map = LETTER_SYSTEMS[system];
  return Object.keys(map).filter((letter) => map[letter] === number).sort();
}
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

// Destiny Number, shown as 4 chunks (Day, Month, Year, then their sum
// reduced to the final total) rather than summing every digit at once.
// Mathematically always agrees with calculateConductorNumber's result --
// digital-root reduction is additive -- this is purely an alternate,
// more granular presentation of the same calculation, verified to match
// across multiple test dates before being added.
function reduceToSingleDigit(n) {
  const stepsLog = [];
  while (n > 9) {
    const digits = String(n).split('').map(Number);
    const next = digits.reduce((a, b) => a + b, 0);
    stepsLog.push(`${digits.join(' + ')} = ${next}`);
    n = next;
  }
  return { value: n, stepsLog };
}

function calculateDestinyNumberChunked(day, month, year) {
  const dayReduced = reduceToSingleDigit(day);
  const monthReduced = reduceToSingleDigit(month);
  const yearReduced = reduceToSingleDigit(year);
  const combined = dayReduced.value + monthReduced.value + yearReduced.value;
  const finalReduced = reduceToSingleDigit(combined);

  return {
    day: { raw: day, total: dayReduced.value, steps: dayReduced.stepsLog },
    month: { raw: month, total: monthReduced.value, steps: monthReduced.stepsLog },
    year: { raw: year, total: yearReduced.value, steps: yearReduced.stepsLog },
    combinedSum: combined,
    finalTotal: finalReduced.value,
    finalSteps: finalReduced.stepsLog,
  };
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
// Chaldean Compound Number reference (10-80). Distinct from the reduced
// single-digit Name Number -- this looks up the RAW, un-reduced letter
// sum directly, since compound numbers are traditionally read for names,
// nicknames, phone numbers, vehicle numbers, etc., not birth dates.
// Table transcribed exactly as provided.
const COMPOUND_NUMBER_TABLE = {
  10: { status: '+', meaning: 'Wheel of Fortune \u2014 fame, confidence, belief, success and changing destiny through effort.' },
  11: { status: '\u2212', meaning: 'Hungry Lion \u2014 difficulties and betrayal.' },
  12: { status: '\u2212', meaning: 'Self-Sacrifice \u2014 tension and problems caused by others.' },
  13: { status: '\u2212', meaning: 'Extremity \u2014 extreme success or extreme failure.' },
  14: { status: '\u2212', meaning: 'Storm, Fire & Flood \u2014 favourable for betting, shares, business changes and gambling.' },
  15: { status: '+', meaning: 'Magic & Occult Mysteries \u2014 lucky; less favourable with 4 and 8.' },
  16: { status: '\u2212', meaning: 'Falling Tower \u2014 failure, accidents and misfortune.' },
  17: { status: '+', meaning: 'Twinkling Star of Venus \u2014 name and fame; very unlucky with 4 and 8.' },
  18: { status: '\u2212', meaning: 'Family & Social Problems \u2014 enemies, family difficulties; unsuitable for auspicious work.' },
  19: { status: '+', meaning: 'Sun \u2014 happiness, success, fame and fulfilment.' },
  20: { status: '+', meaning: 'Success Later \u2014 justice, opportunities and eventual success.' },
  21: { status: '+', meaning: 'The World \u2014 fame and success; reaching the peak after struggle.' },
  22: { status: '\u2212', meaning: 'Blindness \u2014 errors, failures, wrong decisions and problems caused by others.' },
  23: { status: '+', meaning: 'Royal Star of the Lion \u2014 success and help from powerful people.' },
  24: { status: '+', meaning: 'Love & Success \u2014 success in love and benefits through the opposite sex.' },
  25: { status: '+', meaning: 'Experience & Struggle \u2014 success gained through experience and effort.' },
  26: { status: '\u2212', meaning: 'Future Problems \u2014 defamation, failure through associations and gambling losses.' },
  27: { status: '+', meaning: 'Sceptre \u2014 power, leadership and success through personal decisions.' },
  28: { status: '\u2212', meaning: 'Opposition & Betrayal \u2014 defamation, business difficulties and court problems.' },
  29: { status: '\u2212', meaning: 'Uncertainty & Betrayal \u2014 problems through friends and the opposite sex.' },
  30: { status: '+', meaning: 'Intelligence & Thinking \u2014 success or failure depends on thinking; learning through experience.' },
  31: { status: '\u2212', meaning: 'Solitude \u2014 isolation and limited family or social support.' },
  32: { status: '+', meaning: 'Unity & Fame \u2014 success through confidence and independent decisions.' },
  33: { status: '+', meaning: 'Love & Success \u2014 success in love and benefits through the opposite sex.' },
  34: { status: '+', meaning: 'Experience & Struggle \u2014 success through experience and effort.' },
  35: { status: '\u2212', meaning: 'Future Problems \u2014 defamation, association-related failure and gambling losses.' },
  36: { status: '+', meaning: 'Sceptre \u2014 power, leadership and success through personal decisions.' },
  37: { status: '+', meaning: 'Rising Fortune \u2014 partnership, support and benefits through the opposite sex.' },
  38: { status: '\u2212', meaning: 'Uncertainty & Betrayal \u2014 problems through friends and the opposite sex.' },
  39: { status: '+', meaning: 'Intelligence & Thinking \u2014 results depend on thinking, intelligence and experience.' },
  40: { status: '\u2212', meaning: 'Solitude \u2014 isolation and limited family or social benefit.' },
  41: { status: '+', meaning: 'Unity & Fame \u2014 success through confidence and independent decisions.' },
  42: { status: '+', meaning: 'Love & Success \u2014 success in love and benefits through the opposite sex.' },
  43: { status: '\u2212', meaning: 'Struggle & Rivalry \u2014 tension, defamation, rivalry and obstacles.' },
  44: { status: '\u2212', meaning: 'Future Problems \u2014 defamation, association-related failure and financial losses.' },
  45: { status: '+', meaning: 'Sceptre \u2014 power, leadership and success through personal decisions.' },
  46: { status: '+', meaning: 'Rising Fortune \u2014 partnership and opposite-sex support bring benefits.' },
  47: { status: '\u2212', meaning: 'Uncertainty & Betrayal \u2014 problems through friends and the opposite sex.' },
  48: { status: '+', meaning: 'Intelligence & Thinking \u2014 success or failure depends on thinking and experience.' },
  49: { status: '\u2212', meaning: 'Solitude \u2014 isolation and limited family or social support.' },
  50: { status: '+', meaning: 'Unity & Fame \u2014 confidence and independent decisions bring success.' },
  51: { status: '+', meaning: 'Warrior & Victory \u2014 unexpected opportunities, success and victory over enemies.' },
  52: { status: '\u2212', meaning: 'Struggle & Rivalry \u2014 tension, rivalry, defamation and obstacles.' },
  53: { status: '+', meaning: 'Intelligence & Success \u2014 favourable for politics, detective and military fields; financial growth.' },
  54: { status: '+', meaning: 'Success & Prosperity \u2014 intelligence, prosperity and good fortune.' },
  55: { status: '+', meaning: 'Hasty Decisions \u2014 impulsive decisions may cause later regret; business change advised.' },
  56: { status: '\u2212', meaning: 'Effort & Spending \u2014 success requires considerable effort; spendthrift nature.' },
  57: { status: '+', meaning: 'Lucky Business \u2014 good business ability, cheerful nature and favourable opportunities.' },
  58: { status: '+', meaning: 'Kind & Emotional \u2014 emotional, kind-hearted and good planner; weak budgeting.' },
  59: { status: '\u2212', meaning: 'Problems & Travel \u2014 difficulties but benefits through travel; sufficient money for needs.' },
  60: { status: '+', meaning: 'Lucky & Successful \u2014 success; positive attitude is more important than changing the name.' },
  61: { status: '+', meaning: 'Late Success \u2014 early difficulties followed by success; travel improves fortune.' },
  62: { status: '+', meaning: 'Hard Work & Rise \u2014 dedication, hard work and sudden rise; business change may help.' },
  63: { status: '+', meaning: 'Lucky & Helpful \u2014 success and helpful nature; tendency to spend money.' },
  64: { status: '\u2212', meaning: 'Family & Colleague Problems \u2014 difficulties through family or colleagues; positivity recommended.' },
  65: { status: '+', meaning: 'Success & Comfort \u2014 prosperity and material comfort; caution regarding accidents.' },
  66: { status: '+', meaning: 'Business & Contacts \u2014 luck, business success, contacts and success in multiple areas.' },
  67: { status: '+', meaning: 'Alert & Fearless \u2014 practical, healthy and fearless; success comes later.' },
  68: { status: '\u2212', meaning: 'Depression & Obstacles \u2014 lack of support, obstacles and unsuccessful results.' },
  69: { status: '+', meaning: 'Wealth & Happiness \u2014 financial prosperity, happiness, partnership and social connections.' },
  70: { status: '+', meaning: 'Positive Result \u2014 luxury and success after initial financial difficulties.' },
  71: { status: '+', meaning: 'Emotional & Intelligent \u2014 kind-hearted, hardworking, good planning and advisory ability.' },
  72: { status: '\u2212', meaning: 'Hardship & Lack of Support \u2014 childhood struggles, helping others without receiving enough support.' },
  73: { status: '+', meaning: 'Religious & Prosperous \u2014 soft-spoken, financially strong, prosperous and self-reliant.' },
  74: { status: '+', meaning: 'Patient & Alert \u2014 understanding and patient; possible property/family opposition.' },
  75: { status: '\u2212', meaning: 'Problems Through Others \u2014 difficulties, health-related concerns and betrayal by friends.' },
  76: { status: '+', meaning: 'Overall Success \u2014 success in different areas, favourable marriage, partnerships and contacts.' },
  77: { status: '\u2212', meaning: 'Struggle & Obstacles \u2014 difficulties and obstacles; saving and travel can help business.' },
  78: { status: '\u2212', meaning: 'Obstacles & Failure \u2014 tension, obstacles and failure despite hard work.' },
  79: { status: '+', meaning: 'Success & Prosperity \u2014 success, prosperity and social support; caution regarding accidents.' },
  80: { status: '\u2212', meaning: 'Emotional & Sympathetic \u2014 religious, emotional and helpful nature; others may benefit more from their help.' },
};

// Name-Letter / Day-of-Birth Compatibility table. Maps Driver Number
// (1-9, from the day of birth) to three letter groups: Ascendant
// (letters that directly match the day-of-birth group), Harmonious
// (supportive), and Clashing (conflicting). Uses RAW alphabet position
// (A=1...Z=26, unreduced) -- a distinct system from both Chaldean and
// Pythagorean letter values used elsewhere in this app. Transcribed
// exactly from the table provided.
const LETTER_COMPATIBILITY_TABLE = {
  1: { days: [1, 10, 19, 28], ascendant: ['A', 'J', 'S'], harmonious: ['B', 'K', 'T', 'I', 'R', 'C', 'L', 'U'], clashing: ['F', 'O', 'X', 'H', 'Q', 'Z', 'D', 'M', 'V', 'G', 'P', 'Y'] },
  2: { days: [2, 11, 20, 29], ascendant: ['B', 'K', 'T'], harmonious: ['A', 'J', 'S', 'E', 'N', 'W'], clashing: ['D', 'M', 'V', 'G', 'P', 'Y'] },
  3: { days: [3, 12, 21, 30], ascendant: ['C', 'L', 'U'], harmonious: ['A', 'J', 'S', 'B', 'K', 'T', 'I', 'R', 'D', 'M'], clashing: ['E', 'N', 'W', 'F', 'O', 'X'] },
  4: { days: [4, 13, 22, 31], ascendant: ['D', 'M', 'V'], harmonious: ['F', 'O', 'X', 'H', 'Q', 'Z'], clashing: ['A', 'J', 'S', 'B', 'K', 'T', 'I', 'R', 'G', 'P', 'Y'] },
  5: { days: [5, 14, 23], ascendant: ['E', 'N', 'W'], harmonious: ['A', 'J', 'S', 'F', 'O', 'X'], clashing: ['B', 'K', 'T'] },
  6: { days: [6, 15, 24], ascendant: ['F', 'O', 'X'], harmonious: ['E', 'N', 'W', 'H', 'Q', 'X', 'D', 'M', 'V', 'G', 'P', 'Y'], clashing: ['A', 'J', 'S', 'B', 'K', 'T'] },
  7: { days: [7, 16, 25], ascendant: ['G', 'P', 'Y'], harmonious: ['I', 'R', 'F', 'O', 'X'], clashing: ['A', 'J', 'S', 'B', 'K', 'T', 'H', 'Q', 'Z', 'D', 'M', 'V'] },
  8: { days: [8, 17, 26], ascendant: ['H', 'Q', 'Z'], harmonious: ['E', 'N', 'W', 'F', 'O', 'X', 'D', 'M', 'V'], clashing: ['A', 'J', 'S', 'B', 'K', 'T', 'I', 'R', 'G', 'P', 'Y'] },
  9: { days: [9, 18, 27], ascendant: ['I', 'R'], harmonious: ['A', 'J', 'S', 'B', 'K', 'T', 'C', 'L', 'U', 'G', 'P', 'Y'], clashing: ['E', 'N', 'W', 'D', 'M', 'V'] },
};

// Raw alphabet position -- A=1 through Z=26, no reduction. A distinct
// letter-value system from Chaldean/Pythagorean, used specifically for
// this compatibility table's "Ascendant Letter" values (e.g. K=11).
function alphabetPosition(letter) {
  return letter.toUpperCase().charCodeAt(0) - 64;
}

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
  COMPOUND_NUMBER_TABLE,
  LETTER_COMPATIBILITY_TABLE,
  alphabetPosition,
  lettersForNumber,
  calculateDestinyNumberChunked,
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
