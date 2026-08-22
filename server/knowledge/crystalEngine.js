/**
 * CRYSTAL COMPATIBILITY ENGINE
 * =============================
 * Scores candidate crystals against a person's Driver, Conductor, Name
 * numbers, and Lo Shu Grid missing numbers — mirroring the same
 * transparent, itemized approach as mobileSuggestionEngine.js. Every
 * star rating traces back to specific, listed reasons; nothing is a bare
 * unexplained score.
 *
 * The candidate pool is built from the primary/supporting crystals of the
 * person's own core numbers plus the primary crystals traditionally used
 * to strengthen their Lo Shu missing numbers — not an arbitrary fixed
 * list, so the crystals shown are always ones with at least one real
 * connection to this specific person's profile.
 */

const { getNumberRecord } = require('./numberKnowledge');

function classifyScore(score) {
  if (score < 0) return { stars: Math.max(1, 2 + score), classification: 'Avoid' };
  if (score === 0) return { stars: 2, classification: 'Neutral' };
  if (score <= 2) return { stars: 3, classification: 'Neutral' };
  if (score <= 4) return { stars: 4, classification: 'Compatible' };
  return { stars: 5, classification: 'Compatible' };
}

/**
 * Builds the pool of candidate crystals worth evaluating for this person —
 * their core numbers' crystals, plus crystals traditionally used to
 * strengthen any Lo Shu numbers missing from their grid.
 */
function buildCandidatePool({ driver, conductor, nameNumber, loshuMissing = [] }) {
  const pool = new Set();
  [driver, conductor, ...(nameNumber ? [nameNumber] : [])].forEach((n) => {
    const rec = getNumberRecord(n);
    pool.add(rec.primaryCrystal);
    rec.supportingCrystals.forEach((c) => pool.add(c));
  });
  loshuMissing.forEach((n) => {
    const rec = getNumberRecord(n);
    pool.add(rec.primaryCrystal);
  });
  return Array.from(pool);
}

/**
 * Scores one crystal against the person's profile. Returns the raw score,
 * itemized reasons, and the derived star rating / classification.
 */
function scoreCrystal(crystalName, { driver, conductor, nameNumber, loshuMissing = [], purpose }) {
  let score = 0;
  const reasons = [];

  const coreNumbers = [
    { role: 'Driver Number', value: driver },
    { role: 'Conductor Number', value: conductor },
  ];
  if (nameNumber) coreNumbers.push({ role: 'Name Number', value: nameNumber });

  coreNumbers.forEach(({ role, value }) => {
    const rec = getNumberRecord(value);
    if (rec.primaryCrystal === crystalName) {
      score += 3;
      reasons.push({ points: 3, text: `Strong alignment with your ${role} (${value}).` });
    } else if (rec.supportingCrystals.includes(crystalName)) {
      score += 2;
      reasons.push({ points: 2, text: `Supportive for your ${role} (${value}).` });
    } else if (rec.challengingNumbers.some((cn) => getNumberRecord(cn).primaryCrystal === crystalName)) {
      score -= 2;
      reasons.push({ points: -2, text: `Traditionally associated with a number that challenges your ${role} (${value}).` });
    }
  });

  loshuMissing.forEach((n) => {
    const rec = getNumberRecord(n);
    if (rec.primaryCrystal === crystalName) {
      score += 2;
      reasons.push({ points: 2, text: `Traditionally used to strengthen missing number ${n} in your Lo Shu grid.` });
    }
  });

  if (purpose) {
    const matchesPurpose = coreNumbers.some(({ value }) => {
      const rec = getNumberRecord(value);
      return (rec.primaryCrystal === crystalName || rec.supportingCrystals.includes(crystalName)) && rec.purposeTags.includes(purpose);
    });
    if (matchesPurpose) {
      score += 1;
      reasons.push({ points: 1, text: `Aligned with your stated purpose (${purpose}).` });
    }
  }

  const { stars, classification } = classifyScore(score);
  return { crystal: crystalName, score, stars, classification, reasons };
}

/**
 * Builds the full ranked crystal compatibility list for a person.
 */
function buildCrystalCompatibility({ driver, conductor, nameNumber, loshuMissing = [], purpose }) {
  const pool = buildCandidatePool({ driver, conductor, nameNumber, loshuMissing });
  const scored = pool.map((crystal) => scoreCrystal(crystal, { driver, conductor, nameNumber, loshuMissing, purpose }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

module.exports = { buildCrystalCompatibility, scoreCrystal, buildCandidatePool, classifyScore };
