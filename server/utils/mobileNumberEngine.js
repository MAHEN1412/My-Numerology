/**
 * MOBILE NUMBER CALCULATION ENGINE
 * =================================
 * Pure math on a phone number's digits — no interpretation text, no
 * compatibility scoring (that lives in mobileSuggestionEngine.js, which
 * combines this with the existing number knowledge base). Mirrors the
 * same present/missing/repeated pattern already used for the Lo Shu grid,
 * applied to the digits 0-9 of a phone number instead of a birth date.
 */

const { reduceNumber } = require('./calculationEngine');

function cleanDigits(mobileNumber) {
  return String(mobileNumber).replace(/[^0-9]/g, '');
}

function isValidMobileNumber(mobileNumber) {
  const digits = cleanDigits(mobileNumber);
  return digits.length >= 7 && digits.length <= 15; // covers most real-world mobile formats
}

/**
 * Analyzes a mobile number's digits. Unlike Driver/Conductor, phone-number
 * totals are commonly reduced WITH master numbers preserved (11/22/33),
 * matching how most numerology sources treat "total number" calculations
 * for names/other multi-digit sums — kept consistent with the Name Number
 * convention already in this app.
 */
function analyzeMobileNumber(mobileNumber) {
  const raw = cleanDigits(mobileNumber);
  const digits = raw.split('').map(Number);
  const total = digits.reduce((a, b) => a + b, 0);
  const { result: finalDigit, log } = reduceNumber(total, true);

  const counts = {};
  for (let i = 0; i <= 9; i++) counts[i] = 0;
  digits.forEach((d) => counts[d]++);

  const present = Object.keys(counts).filter((k) => counts[k] > 0).map(Number).sort((a, b) => a - b);
  const missing = Object.keys(counts).filter((k) => counts[k] === 0).map(Number).sort((a, b) => a - b);
  const repeated = Object.keys(counts).filter((k) => counts[k] > 1).map(Number).sort((a, b) => a - b);

  const steps = `Mobile number: ${raw}\n${digits.join(' + ')} = ${total}\n${log.map((s) => `${String(s.from).split('').join(' + ')} = ${s.to}`).join('\n')}${log.length ? '\n' : ''}Final digit = ${finalDigit}`;

  return {
    raw,
    digits,
    total,
    finalDigit,
    isMaster: [11, 22, 33].includes(finalDigit),
    steps,
    counts,
    present,
    missing,
    repeated,
    firstDigit: digits[0],
    lastDigit: digits[digits.length - 1],
  };
}

module.exports = { cleanDigits, isValidMobileNumber, analyzeMobileNumber };
