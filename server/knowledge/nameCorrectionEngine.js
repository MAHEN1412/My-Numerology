/**
 * NAME CORRECTION ENGINE
 * =======================
 * Lets someone compare multiple spellings/variations of their name to see
 * which one aligns best with their (fixed, DOB-derived) Driver and
 * Conductor numbers — the traditional "name correction" practice, where
 * the birth numbers stay fixed and the name is adjusted toward them,
 * never the other way around.
 *
 * Scoring mirrors the same transparent, itemized approach as
 * mobileSuggestionEngine.js and crystalEngine.js — every point traces to
 * a specific, listed reason.
 */

const calc = require('../utils/calculationEngine');
const { getNumberRecord } = require('./numberKnowledge');

function classifyScore(score) {
  if (score >= 3) return 'Favorable';
  if (score >= 0) return 'Neutral';
  return 'Challenging';
}

/**
 * Scores one candidate name against a person's fixed Driver/Conductor
 * numbers, and optionally their Lo Shu missing numbers (a Name Number
 * that fills a missing Lo Shu number is traditionally read as helping
 * "complete" the grid — same technique already used for crystals).
 * Returns the calculated Name Number, Soul Urge, Personality, and a
 * compatibility score + classification + itemized reasons.
 */
function scoreNameCandidate(name, system, { driver, conductor, loshuMissing = [] }) {
  const nameNumber = calc.calculateNameNumber(name, system);
  const soulUrge = calc.calculateSoulUrgeNumber(name, system);
  const personality = calc.calculatePersonalityNumber(name, system);

  const driverRec = getNumberRecord(driver);
  const conductorRec = getNumberRecord(conductor);
  const reasons = [];
  let score = 0;

  const value = nameNumber.value;
  if (value === driver) {
    score += 3;
    reasons.push({ points: 3, text: `Name Number matches your Driver Number (${driver}) exactly.` });
  } else if (driverRec.compatibleNumbers.includes(value)) {
    score += 2;
    reasons.push({ points: 2, text: `Name Number is compatible with your Driver Number (${driver}).` });
  } else if (driverRec.challengingNumbers.includes(value)) {
    score -= 2;
    reasons.push({ points: -2, text: `Name Number is traditionally challenging for your Driver Number (${driver}).` });
  }

  if (value === conductor) {
    score += 3;
    reasons.push({ points: 3, text: `Name Number matches your Conductor Number (${conductor}) exactly.` });
  } else if (conductorRec.compatibleNumbers.includes(value)) {
    score += 2;
    reasons.push({ points: 2, text: `Name Number is compatible with your Conductor Number (${conductor}).` });
  } else if (conductorRec.challengingNumbers.includes(value)) {
    score -= 2;
    reasons.push({ points: -2, text: `Name Number is traditionally challenging for your Conductor Number (${conductor}).` });
  }

  if (loshuMissing.includes(value)) {
    score += 2;
    reasons.push({ points: 2, text: `Name Number fills missing number ${value} in your Lo Shu grid.` });
  }

  if (nameNumber.isMaster) {
    score += 1;
    reasons.push({ points: 1, text: `Reduces to a master number (${value}) \u2014 traditionally considered a strong Name Number.` });
  }

  if (reasons.length === 0) {
    reasons.push({ points: 0, text: 'No direct compatibility or conflict found with your Driver, Conductor, or Lo Shu grid.' });
  }

  return {
    name,
    nameNumber: nameNumber.value,
    soulUrge: soulUrge.value,
    personality: personality.value,
    score,
    classification: classifyScore(score),
    reasons,
  };
}

/**
 * Scores a list of candidate names and returns them ranked best-first.
 */
function compareNameCandidates(names, system, { driver, conductor, loshuMissing = [] }) {
  const results = names.map((name) => scoreNameCandidate(name, system, { driver, conductor, loshuMissing }));
  results.sort((a, b) => b.score - a.score);
  return results;
}

const COMMON_NAME_ENDING_LETTERS = ['a', 'e', 'h', 'i', 'n', 'o', 's', 'y'];

/**
 * Generates minimal, low-risk spelling variations of a name — each
 * candidate differs from the original by exactly ONE small change (a
 * single letter added to the end of a word, or an existing letter
 * doubled), so results stay recognizably close to the real name rather
 * than becoming an unrecognizable different word. This can't guarantee a
 * result "sounds natural" — that needs real linguistic judgement — but
 * keeping changes this minimal is what keeps the risk of an odd result
 * low, and mirrors how name correction is actually practiced (a single
 * added or doubled letter, not a rewritten name).
 */
function generateNameVariations(baseName, maxCandidates = 20) {
  const words = baseName.trim().split(/\s+/);
  const variants = new Set();

  words.forEach((word, wordIndex) => {
    // Append a common name-ending letter to this word only.
    COMMON_NAME_ENDING_LETTERS.forEach((letter) => {
      const newWords = [...words];
      newWords[wordIndex] = word + letter;
      variants.add(newWords.join(' '));
    });
    // Double the last letter of this word.
    const lastChar = word.slice(-1);
    if (/[a-zA-Z]/.test(lastChar)) {
      const newWords = [...words];
      newWords[wordIndex] = word + lastChar;
      variants.add(newWords.join(' '));
    }
  });

  variants.delete(baseName.trim());
  return Array.from(variants).slice(0, maxCandidates);
}

/**
 * Generates minimal spelling variations of a base name and ranks them by
 * compatibility, same scoring as compareNameCandidates. The original name
 * is always included in the results too, so the user can see exactly how
 * much (or little) each suggestion actually improves on it.
 */
function suggestNameVariations(baseName, system, { driver, conductor, loshuMissing = [] }) {
  const variations = generateNameVariations(baseName);
  const allCandidates = [baseName.trim(), ...variations];
  const results = compareNameCandidates(allCandidates, system, { driver, conductor, loshuMissing });
  return results.map((r) => ({ ...r, isOriginal: r.name === baseName.trim() }));
}

module.exports = { scoreNameCandidate, compareNameCandidates, generateNameVariations, suggestNameVariations };
