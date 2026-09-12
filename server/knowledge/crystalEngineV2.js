/**
 * CRYSTAL ENGINE V2 -- 37-Stone Recommendation Engine
 * ====================================================
 * Deterministic, transparent, auditable scoring across all 37 stones.
 * Kept entirely separate from the existing crystalEngine.js (used
 * elsewhere in the app) so nothing currently working is touched.
 *
 * HONESTY NOTE: this project has no authoritative per-crystal planetary
 * or purpose data (only per-NUMBER data exists). Rather than fabricate
 * crystal-level mappings to fill out every dimension the spec describes,
 * PLANETARY_COMPATIBILITY is weighted 0 and explicitly documented as
 * having no data source. PURPOSE_MATCH is scored only as an indirect
 * signal derived from real number->purpose data (a number's own
 * purposeTags), clearly labeled as such -- never a direct crystal-purpose
 * claim this project doesn't actually have data for.
 */

const CrystalStone = require('../models/CrystalStone');
const { getNumberRecord } = require('./numberKnowledge');

const WEIGHTS = {
  CORE_COMPATIBILITY: 30,
  CORE_SUPPORTING: 15,
  LO_SHU_BALANCE: 20,
  PLANETARY_COMPATIBILITY: 0,
  PURPOSE_MATCH: 10,
  CONFLICT_PENALTY: -15,
};

// EVIDENCE-STRENGTH MULTIPLIER -- requested by the client so a crystal
// backed by many independent websites doesn't score identically to one
// backed by only one or two. A point value earned from a numberAssociation
// is scaled by how strong the real-world evidence for that association is:
// Tier A (3+ independent sources agree) keeps full points, Tier B (exactly
// 2 sources) keeps most of the points, Tier D (a single source) keeps only
// half. Anything with no evidenceTier at all (legacy/unresearched data) is
// treated as conservatively as a single source, never as strong as one.
// As of the 2026 expanded research pass every scored association in
// crystalDatabase37.js is Tier A (the research bar itself was raised to
// require 3+ sources before an association is scored at all), so this
// multiplier is currently a 1.0x no-op across the board -- but it's real,
// permanent infrastructure: the moment a weaker (Tier B/D) association is
// ever added back (a future number, a purpose-specific pass, etc.), it
// will automatically be worth less than a well-documented one instead of
// being treated as equally certain.
const EVIDENCE_MULTIPLIER = { A: 1, B: 0.75, D: 0.5 };
const DEFAULT_EVIDENCE_MULTIPLIER = 0.5; // no evidenceTier at all -- treat as unverified, not as strong as Tier A/B.

function evidenceMultiplierFor(assoc) {
  if (!assoc || !assoc.evidenceTier) return DEFAULT_EVIDENCE_MULTIPLIER;
  return EVIDENCE_MULTIPLIER[assoc.evidenceTier] ?? DEFAULT_EVIDENCE_MULTIPLIER;
}

const TIER_THRESHOLDS = {
  PRIMARY: 40,
  HARMONY: 25,
  BALANCE: 15,
  PURPOSE: 10,
};

function scoreStone(stone, profile) {
  const { driverNumber, conductorNumber, nameNumber, missingNumbers = [], dominantNumbers = [], purpose } = profile;
  const coreNumbers = [
    { role: 'Driver', value: driverNumber },
    { role: 'Conductor', value: conductorNumber },
    ...(nameNumber ? [{ role: 'Name Number', value: nameNumber }] : []),
  ];

  const matchedRules = [];
  const penaltyRules = [];
  const scoreComponents = {
    coreCompatibility: 0,
    loShuBalance: 0,
    planetaryCompatibility: 0,
    purposeMatch: 0,
    conflictPenalty: 0,
  };

  const stoneNumbers = stone.numberAssociations.map((a) => a.number);

  // Pulls the real citation list off an association, so the UI can show
  // exactly which named websites back a given pick and how many agreed --
  // never just an unsourced score. Falls back to the older single-string
  // `source` field for associations that predate the multi-source schema.
  function citationsFor(assoc) {
    if (!assoc) return { evidenceTier: null, sourceCount: 0, sources: [] };
    const sources = (assoc.sources && assoc.sources.length) ? assoc.sources : (assoc.source ? [assoc.source] : []);
    return { evidenceTier: assoc.evidenceTier || null, sourceCount: sources.length, sources };
  }

  coreNumbers.forEach(({ role, value }) => {
    const assoc = stone.numberAssociations.find((a) => a.number === value);
    if (assoc) {
      const basePoints = assoc.role === 'primary' ? WEIGHTS.CORE_COMPATIBILITY : WEIGHTS.CORE_SUPPORTING;
      const multiplier = evidenceMultiplierFor(assoc);
      const points = Math.round(basePoints * multiplier);
      scoreComponents.coreCompatibility += points;
      matchedRules.push({
        dimension: 'CORE_COMPATIBILITY', points, basePoints, evidenceMultiplier: multiplier,
        text: `${assoc.role === 'primary' ? 'Primary' : 'Supporting'} association with your ${role} (${value}).`,
        ...citationsFor(assoc),
      });
    }
  });

  missingNumbers.forEach((n) => {
    if (stoneNumbers.includes(n)) {
      const assoc = stone.numberAssociations.find((a) => a.number === n);
      const multiplier = evidenceMultiplierFor(assoc);
      const points = Math.round(WEIGHTS.LO_SHU_BALANCE * multiplier);
      scoreComponents.loShuBalance += points;
      matchedRules.push({
        dimension: 'LO_SHU_BALANCE', points, basePoints: WEIGHTS.LO_SHU_BALANCE, evidenceMultiplier: multiplier,
        text: `Number ${n} is absent from the Lo Shu grid; this stone is associated with that number.`,
        ...citationsFor(assoc),
      });
    }
  });

  if (purpose) {
    stone.numberAssociations.forEach((assoc) => {
      const rec = getNumberRecord(assoc.number);
      if (rec && rec.purposeTags && rec.purposeTags.includes(purpose)) {
        scoreComponents.purposeMatch += WEIGHTS.PURPOSE_MATCH;
        matchedRules.push({ dimension: 'PURPOSE_MATCH', points: WEIGHTS.PURPOSE_MATCH, text: `Associated with Number ${assoc.number}, whose traditional purposes include "${purpose}" (indirect, via number association).` });
      }
    });
  }

  coreNumbers.forEach(({ role, value }) => {
    const rec = getNumberRecord(value);
    if (!rec || !rec.challengingNumbers) return;
    stone.numberAssociations.forEach((assoc) => {
      if (rec.challengingNumbers.includes(assoc.number)) {
        scoreComponents.conflictPenalty += WEIGHTS.CONFLICT_PENALTY;
        penaltyRules.push({ dimension: 'CONFLICT_PENALTY', points: WEIGHTS.CONFLICT_PENALTY, text: `This stone's Number ${assoc.number} association is listed as challenging for your ${role} (${value}).` });
      }
    });
  });

  const rawScore = scoreComponents.coreCompatibility + scoreComponents.loShuBalance + scoreComponents.planetaryCompatibility + scoreComponents.purposeMatch + scoreComponents.conflictPenalty;

  // Whether this stone is the actual "primary" pick (not just "supporting")
  // for at least one of the person's own core numbers. Used only to break
  // ties in overall score -- a stone that IS someone's primary crystal
  // should outrank one that's merely supporting when both land on the same
  // final score, so the "Top Match" card never contradicts its own reason
  // text (e.g. showing a stone whose listed reason says "Supporting...").
  const hasPrimaryCoreMatch = matchedRules.some((r) => r.dimension === 'CORE_COMPATIBILITY' && r.points === WEIGHTS.CORE_COMPATIBILITY);

  return {
    id: stone.stoneId,
    name: stone.name,
    hasDirectNumberData: stone.numberAssociations.length > 0,
    sourceNotes: stone.sourceNotes,
    rawScore,
    hasPrimaryCoreMatch,
    scoreComponents,
    matchedRules,
    penaltyRules,
  };
}

function normalizeScores(scored) {
  const rawScores = scored.map((s) => s.rawScore);
  const min = Math.min(...rawScores, 0);
  const max = Math.max(...rawScores, 1);
  return scored.map((s) => ({
    ...s,
    finalScore: max === min ? 0 : Math.round(((s.rawScore - min) / (max - min)) * 100),
  }));
}

function classifyTiers(ranked) {
  const tiers = { primary: null, harmony: null, balance: null, purpose: null, alternative: null };

  const topOverall = ranked[0];
  if (topOverall && topOverall.finalScore >= TIER_THRESHOLDS.PRIMARY) tiers.primary = topOverall;

  const harmonyCandidate = ranked.find((s) => s.id !== tiers.primary?.id && s.scoreComponents.coreCompatibility >= WEIGHTS.CORE_COMPATIBILITY && s.finalScore >= TIER_THRESHOLDS.HARMONY);
  if (harmonyCandidate) tiers.harmony = harmonyCandidate;

  const balanceCandidate = ranked.find((s) => ![tiers.primary?.id, tiers.harmony?.id].includes(s.id) && s.scoreComponents.loShuBalance > 0 && s.finalScore >= TIER_THRESHOLDS.BALANCE);
  if (balanceCandidate) tiers.balance = balanceCandidate;

  const purposeCandidate = ranked.find((s) => ![tiers.primary?.id, tiers.harmony?.id, tiers.balance?.id].includes(s.id) && s.scoreComponents.purposeMatch > 0 && s.finalScore >= TIER_THRESHOLDS.PURPOSE);
  if (purposeCandidate) tiers.purpose = purposeCandidate;

  const usedIds = [tiers.primary, tiers.harmony, tiers.balance, tiers.purpose].filter(Boolean).map((s) => s.id);
  const alternativeCandidate = ranked.find((s) => !usedIds.includes(s.id) && s.finalScore > 0);
  if (alternativeCandidate) tiers.alternative = alternativeCandidate;

  return tiers;
}

async function calculateCrystalRecommendations(numerologyProfile) {
  const stones = await CrystalStone.find({ active: true });
  const scored = stones.map((stone) => scoreStone(stone, numerologyProfile));
  const normalized = normalizeScores(scored);
  const ranked = [...normalized].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    // Tie-break: a stone that's the actual PRIMARY pick for one of the
    // person's core numbers outranks one that's only SUPPORTING, even if
    // Lo Shu/purpose bonuses brought them to the same overall score.
    if (b.hasPrimaryCoreMatch !== a.hasPrimaryCoreMatch) return (b.hasPrimaryCoreMatch ? 1 : 0) - (a.hasPrimaryCoreMatch ? 1 : 0);
    return b.scoreComponents.coreCompatibility - a.scoreComponents.coreCompatibility;
  });
  const tiers = classifyTiers(ranked);

  return { ranked, tiers, weightsUsed: { ...WEIGHTS }, thresholdsUsed: { ...TIER_THRESHOLDS } };
}

module.exports = { calculateCrystalRecommendations, scoreStone, normalizeScores, classifyTiers, WEIGHTS, TIER_THRESHOLDS, EVIDENCE_MULTIPLIER };
