/**
 * GENERIC NUMBER COMPATIBILITY ENGINE
 * =====================================
 * Bank account, house/flat, and vehicle registration numbers all reduce
 * to a single digit exactly the same way a mobile number does — same
 * digit-sum math, same present/missing/repeated pattern, same
 * compatibility scoring against Driver/Conductor/Name. Rather than
 * duplicate that logic three more times, this wraps the existing
 * analyzeMobileNumber/scoreMobileNumber engines with type-appropriate
 * validation (a house number can be 1 digit; a mobile number can't).
 */

const { cleanDigits, analyzeMobileNumber } = require('../utils/mobileNumberEngine');
const { scoreMobileNumber } = require('./mobileSuggestionEngine');

const NUMBER_TYPES = {
  bank_account: { label: 'Bank Account Number', minDigits: 4, maxDigits: 20 },
  house: { label: 'House/Flat Number', minDigits: 1, maxDigits: 10 },
  vehicle: { label: 'Vehicle Number', minDigits: 1, maxDigits: 15 },
};

function isValidNumberType(type) {
  return Object.prototype.hasOwnProperty.call(NUMBER_TYPES, type);
}

function isValidForType(value, type) {
  if (!isValidNumberType(type)) return false;
  const digits = cleanDigits(value);
  const { minDigits, maxDigits } = NUMBER_TYPES[type];
  return digits.length >= minDigits && digits.length <= maxDigits;
}

/**
 * Analyzes and scores a number of the given type against a person's core
 * numbers. Reuses the mobile number math directly — a house number and a
 * mobile number are numerologically identical operations, just applied to
 * a different real-world object.
 */
function analyzeGenericNumber(value, type, { driver, conductor, nameNumber }) {
  const analysis = analyzeMobileNumber(value);
  const scored = scoreMobileNumber(value, { driver, conductor, nameNumber });
  return {
    type,
    typeLabel: NUMBER_TYPES[type].label,
    value: analysis.raw,
    analysis,
    score: scored.score,
    breakdown: scored.breakdown,
  };
}

module.exports = { NUMBER_TYPES, isValidNumberType, isValidForType, analyzeGenericNumber };
