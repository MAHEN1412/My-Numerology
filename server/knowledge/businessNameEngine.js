/**
 * BUSINESS NAME NUMEROLOGY ENGINE
 * =================================
 * A business name is scored using the exact same letter-value math as a
 * personal name (calculateNameNumber, calculateSoulUrgeNumber,
 * calculatePersonalityNumber from calculationEngine.js) — the numerology
 * math doesn't care whether the string is a person's name or a company's.
 * What's different is the interpretation: this pulls careerThemes and
 * moneyThemes from the knowledge base (already written for business/money
 * relevance) rather than personalityThemes/relationshipThemes.
 *
 * If the owner's DOB is provided, the business name is also scored for
 * compatibility with their Driver/Conductor — same transparent, itemized
 * approach as every other scoring engine in this app.
 */

const calc = require('../utils/calculationEngine');
const { getNumberRecord } = require('./numberKnowledge');

function classifyScore(score) {
  if (score >= 3) return 'Favorable';
  if (score >= 0) return 'Neutral';
  return 'Challenging';
}

/**
 * Analyzes a business name: its own Compound/Name Number plus (if an
 * owner DOB is given) compatibility with the owner's Driver/Conductor.
 */
function analyzeBusinessName(businessName, system, ownerCore) {
  const nameNumber = calc.calculateNameNumber(businessName, system);
  const record = getNumberRecord(nameNumber.value);

  const result = {
    businessName,
    nameNumber: nameNumber.value,
    compound: nameNumber.compound,
    isMaster: nameNumber.isMaster,
    steps: nameNumber.steps,
    breakdown: nameNumber.breakdown,
    careerThemes: record.careerThemes,
    moneyThemes: record.moneyThemes,
    keywords: record.keywords,
    ownerCompatibility: null,
  };

  if (ownerCore && ownerCore.driver && ownerCore.conductor) {
    const { driver, conductor } = ownerCore;
    const driverRec = getNumberRecord(driver);
    const conductorRec = getNumberRecord(conductor);
    const reasons = [];
    let score = 0;

    const value = nameNumber.value;
    if (value === driver) {
      score += 3;
      reasons.push({ points: 3, text: `Business Name Number matches the owner's Driver Number (${driver}) exactly.` });
    } else if (driverRec.compatibleNumbers.includes(value)) {
      score += 2;
      reasons.push({ points: 2, text: `Business Name Number is compatible with the owner's Driver Number (${driver}).` });
    } else if (driverRec.challengingNumbers.includes(value)) {
      score -= 2;
      reasons.push({ points: -2, text: `Business Name Number is traditionally challenging for the owner's Driver Number (${driver}).` });
    }

    if (value === conductor) {
      score += 3;
      reasons.push({ points: 3, text: `Business Name Number matches the owner's Conductor Number (${conductor}) exactly.` });
    } else if (conductorRec.compatibleNumbers.includes(value)) {
      score += 2;
      reasons.push({ points: 2, text: `Business Name Number is compatible with the owner's Conductor Number (${conductor}).` });
    } else if (conductorRec.challengingNumbers.includes(value)) {
      score -= 2;
      reasons.push({ points: -2, text: `Business Name Number is traditionally challenging for the owner's Conductor Number (${conductor}).` });
    }

    if (reasons.length === 0) {
      reasons.push({ points: 0, text: 'No direct compatibility or conflict found with the owner\u2019s Driver or Conductor numbers.' });
    }

    result.ownerCompatibility = { score, classification: classifyScore(score), reasons };
  }

  return result;
}

/**
 * Compares multiple candidate business names, ranked best-first when an
 * owner DOB is provided (otherwise returned in input order, since there's
 * no compatibility basis to rank by without owner numbers).
 */
function compareBusinessNames(names, system, ownerCore) {
  const results = names.map((name) => analyzeBusinessName(name, system, ownerCore));
  if (ownerCore && ownerCore.driver && ownerCore.conductor) {
    results.sort((a, b) => (b.ownerCompatibility?.score || 0) - (a.ownerCompatibility?.score || 0));
  }
  return results;
}

module.exports = { analyzeBusinessName, compareBusinessNames };
