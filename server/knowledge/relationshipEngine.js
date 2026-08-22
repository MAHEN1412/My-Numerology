/**
 * RELATIONSHIP COMPATIBILITY ENGINE
 * ===================================
 * Compares two people's numerology profiles against EACH OTHER, rather
 * than one person's number against a fixed reference (which is what every
 * other engine in this app does). Every cross-pair (A's Driver vs B's
 * Driver, A's Driver vs B's Conductor, etc.) is checked against the
 * existing compatible/challenging number data, so this reuses the same
 * knowledge base rather than inventing a separate relationship-specific
 * compatibility table.
 */

const { getNumberRecord } = require('./numberKnowledge');

function classifyOverall(score) {
  if (score >= 8) return 'Excellent';
  if (score >= 4) return 'Good';
  if (score >= 0) return 'Neutral';
  return 'Challenging';
}

/**
 * Checks one pair of numbers (e.g. Person A's Driver vs Person B's
 * Conductor) for compatibility, returning points + a reason if relevant,
 * or null if there's no direct relationship either way.
 */
function checkPair(labelA, valueA, labelB, valueB) {
  if (valueA === valueB) {
    return { points: 2, text: `${labelA} (${valueA}) matches ${labelB} (${valueB}) exactly.` };
  }
  const recA = getNumberRecord(valueA);
  if (recA.compatibleNumbers.includes(valueB)) {
    return { points: 2, text: `${labelA} (${valueA}) is traditionally compatible with ${labelB} (${valueB}).` };
  }
  if (recA.challengingNumbers.includes(valueB)) {
    return { points: -2, text: `${labelA} (${valueA}) is traditionally challenging for ${labelB} (${valueB}).` };
  }
  return null;
}

/**
 * Scores compatibility between two people's numerology profiles.
 * personA/personB: { label, driver, conductor, nameNumber? }
 */
function scoreRelationshipCompatibility(personA, personB) {
  const reasons = [];
  let score = 0;

  const pairs = [
    [`${personA.label}'s Driver`, personA.driver, `${personB.label}'s Driver`, personB.driver],
    [`${personA.label}'s Driver`, personA.driver, `${personB.label}'s Conductor`, personB.conductor],
    [`${personA.label}'s Conductor`, personA.conductor, `${personB.label}'s Driver`, personB.driver],
    [`${personA.label}'s Conductor`, personA.conductor, `${personB.label}'s Conductor`, personB.conductor],
  ];

  if (personA.nameNumber && personB.nameNumber) {
    pairs.push([`${personA.label}'s Name Number`, personA.nameNumber, `${personB.label}'s Name Number`, personB.nameNumber]);
  }

  pairs.forEach(([labelA, valueA, labelB, valueB]) => {
    const result = checkPair(labelA, valueA, labelB, valueB);
    if (result) {
      score += result.points;
      reasons.push(result);
    }
  });

  if (reasons.length === 0) {
    reasons.push({ points: 0, text: 'No direct compatibility or conflict found between these core numbers.' });
  }

  return {
    score,
    classification: classifyOverall(score),
    reasons,
  };
}

module.exports = { scoreRelationshipCompatibility, classifyOverall };
