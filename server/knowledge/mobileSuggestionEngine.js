/**
 * MOBILE NUMBER SUGGESTION ENGINE
 * ================================
 * Scores a mobile number's compatibility with a person's Driver, Conductor,
 * and (optionally) Name numbers, and can generate/rank candidate numbers.
 *
 * Scoring is fully transparent and deterministic — every point is
 * traceable to a specific rule (compatible number match, challenging
 * number penalty, master number bonus, repeated-digit amplification). This
 * is the "Standard Calculation" mode from the spec. It is kept separate
 * from Book Intelligence (mobileBookTopics in bookSearch.js) — the two are
 * never blended into one number, per the same design principle already
 * used for the main reading (originally-calculated content vs. book
 * excerpts are always shown as distinct, separately-labeled sections).
 */

const { analyzeMobileNumber, isValidMobileNumber } = require('../utils/mobileNumberEngine');
const { getNumberRecord } = require('./numberKnowledge');
const { getCorroboratingSources } = require('./sources');

/**
 * Scores one mobile number against a person's core numbers. Returns a
 * 0-100 score plus a fully itemized breakdown of how it was reached —
 * never a bare number with no explanation. Also collects any external
 * corroboration for the specific compatible-number pairs that applied
 * (see sources.js CORROBORATED_PAIRS — narrowly scoped, not a blanket claim).
 */
function scoreMobileNumber(mobileNumber, { driver, conductor, nameNumber, loshuMissing = [], purpose }) {
  const analysis = analyzeMobileNumber(mobileNumber);
  const breakdown = [];
  const corroboration = [];
  let score = 50; // neutral baseline

  const driverRecord = getNumberRecord(driver);
  const conductorRecord = getNumberRecord(conductor);

  // Final digit vs Driver Number
  if (analysis.finalDigit === driver) {
    score += 15;
    breakdown.push({ points: 15, reason: `Final digit (${analysis.finalDigit}) matches your Driver Number exactly.` });
  } else if (driverRecord.compatibleNumbers.includes(analysis.finalDigit)) {
    score += 10;
    breakdown.push({ points: 10, reason: `Final digit (${analysis.finalDigit}) is compatible with your Driver Number ${driver}.` });
    const sources = getCorroboratingSources(analysis.finalDigit, driver);
    if (sources) corroboration.push(...sources);
  } else if (driverRecord.challengingNumbers.includes(analysis.finalDigit)) {
    score -= 10;
    breakdown.push({ points: -10, reason: `Final digit (${analysis.finalDigit}) is traditionally challenging for your Driver Number ${driver}.` });
  }

  // Final digit vs Conductor Number
  if (analysis.finalDigit === conductor) {
    score += 15;
    breakdown.push({ points: 15, reason: `Final digit (${analysis.finalDigit}) matches your Conductor Number exactly.` });
  } else if (conductorRecord.compatibleNumbers.includes(analysis.finalDigit)) {
    score += 10;
    breakdown.push({ points: 10, reason: `Final digit (${analysis.finalDigit}) is compatible with your Conductor Number ${conductor}.` });
    const sources = getCorroboratingSources(analysis.finalDigit, conductor);
    if (sources) corroboration.push(...sources);
  } else if (conductorRecord.challengingNumbers.includes(analysis.finalDigit)) {
    score -= 10;
    breakdown.push({ points: -10, reason: `Final digit (${analysis.finalDigit}) is traditionally challenging for your Conductor Number ${conductor}.` });
  }

  // Name Number, if provided
  if (nameNumber) {
    const nameRecord = getNumberRecord(nameNumber);
    if (analysis.finalDigit === nameNumber) {
      score += 10;
      breakdown.push({ points: 10, reason: `Final digit (${analysis.finalDigit}) matches your Name Number exactly.` });
    } else if (nameRecord.compatibleNumbers.includes(analysis.finalDigit)) {
      score += 7;
      breakdown.push({ points: 7, reason: `Final digit (${analysis.finalDigit}) is compatible with your Name Number ${nameNumber}.` });
    } else if (nameRecord.challengingNumbers.includes(analysis.finalDigit)) {
      score -= 7;
      breakdown.push({ points: -7, reason: `Final digit (${analysis.finalDigit}) is traditionally challenging for your Name Number ${nameNumber}.` });
    }
  }

  // Repeated digits that are ALSO compatible numbers amplify positively;
  // repeated digits that are challenging numbers amplify negatively.
  analysis.repeated.forEach((d) => {
    const count = analysis.counts[d];
    const isCompatible = driverRecord.compatibleNumbers.includes(d) || conductorRecord.compatibleNumbers.includes(d);
    const isChallenging = driverRecord.challengingNumbers.includes(d) || conductorRecord.challengingNumbers.includes(d);
    if (isCompatible) {
      const pts = Math.min(count - 1, 3) * 3;
      score += pts;
      breakdown.push({ points: pts, reason: `Digit ${d} repeats ${count}\u00d7 and is compatible \u2014 amplifies positively.` });
    } else if (isChallenging) {
      const pts = -(Math.min(count - 1, 3) * 3);
      score += pts;
      breakdown.push({ points: pts, reason: `Digit ${d} repeats ${count}\u00d7 and is traditionally challenging \u2014 amplifies negatively.` });
    }
  });

  // Master-number totals are traditionally considered auspicious
  if (analysis.isMaster) {
    score += 8;
    breakdown.push({ points: 8, reason: `Total reduces through a master number (${analysis.finalDigit}) \u2014 traditionally considered a strong number.` });
  }

  // 0 present is sometimes read as amplifying whatever else is there,
  // sometimes neutral — kept as a small, clearly-labeled factor rather
  // than a strong claim either way.
  if (analysis.counts[0] > 0) {
    breakdown.push({ points: 0, reason: `Contains ${analysis.counts[0]} zero(s) \u2014 traditionally read as amplifying neighboring digits rather than adding its own value.` });
  }

  // Final digit fills a number missing from the person's Lo Shu grid --
  // same technique already used consistently in the crystal and
  // name-correction engines, now applied here too for consistency.
  if (loshuMissing.includes(analysis.finalDigit)) {
    score += 10;
    breakdown.push({ points: 10, reason: `Final digit (${analysis.finalDigit}) fills missing number ${analysis.finalDigit} in your Lo Shu grid.` });
  }

  // Purpose alignment -- checks whether the final digit's own number
  // record is traditionally associated with the stated purpose.
  if (purpose) {
    const finalDigitRecord = getNumberRecord(analysis.finalDigit);
    if (finalDigitRecord.purposeTags && finalDigitRecord.purposeTags.includes(purpose)) {
      score += 5;
      breakdown.push({ points: 5, reason: `Final digit (${analysis.finalDigit}) is traditionally associated with your stated purpose (${purpose}).` });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const seenTitles = new Set();
  const dedupedCorroboration = corroboration.filter((s) => {
    if (seenTitles.has(s.title)) return false;
    seenTitles.add(s.title);
    return true;
  });

  return { mobileNumber: analysis.raw, score, analysis, breakdown, corroboration: dedupedCorroboration };
}

/**
 * Generates candidate numbers matching a fixed prefix, with a given count
 * of free (variable) trailing digits, scores each one, and returns the
 * top N ranked by score. Uses random sampling rather than exhaustive
 * generation, since free digits can easily exceed millions of
 * combinations (e.g. 8 free digits = 100 million possibilities).
 */
function generateAndScoreCandidates({ prefix = '', freeDigitCount, driver, conductor, nameNumber, loshuMissing = [], purpose, sampleSize = 500, topN = 5 }) {
  if (freeDigitCount < 1 || freeDigitCount > 10) {
    throw new Error('freeDigitCount must be between 1 and 10.');
  }

  const seen = new Set();
  const candidates = [];
  let attempts = 0;
  const maxAttempts = sampleSize * 3; // safety cap in case of heavy duplicate collisions on tiny ranges

  while (candidates.length < sampleSize && attempts < maxAttempts) {
    attempts++;
    let suffix = '';
    for (let i = 0; i < freeDigitCount; i++) suffix += Math.floor(Math.random() * 10);
    const full = prefix + suffix;
    if (seen.has(full)) continue;
    seen.add(full);
    candidates.push(full);
  }

  const scored = candidates.map((c) => scoreMobileNumber(c, { driver, conductor, nameNumber, loshuMissing, purpose }));
  scored.sort((a, b) => b.score - a.score);

  return {
    evaluated: scored.length,
    recommended: scored.slice(0, topN),
  };
}

module.exports = { scoreMobileNumber, generateAndScoreCandidates, isValidMobileNumber };
