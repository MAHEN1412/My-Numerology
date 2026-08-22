/**
 * INTERPRETATION ENGINE
 * =====================
 * Takes a calculation result plus the knowledge base and produces a
 * structured report with distinct sections (not one big paragraph). This
 * is the only layer that combines calculation + knowledge — it contains no
 * math of its own and no interpretation text of its own; it just assembles
 * what the other two layers already produced.
 */

const { getNumberRecord } = require('./numberKnowledge');
const { SOURCES } = require('./sources');

function buildOverallProfile(driver, conductor, nameNum) {
  const d = getNumberRecord(driver.value);
  const c = getNumberRecord(conductor.value);
  const summary = `Driver Number ${driver.value} (${d.personalityThemes.toLowerCase()}) shapes day-to-day behaviour, while Conductor Number ${conductor.value} points toward a life path built around ${c.keywords[0]} and ${c.keywords[1]}.` +
    (nameNum ? ` The Name Number ${nameNum.value} adds a public-facing layer of ${getNumberRecord(nameNum.value).keywords[0]}.` : '');
  return { summary };
}

function buildCoreNumbers(calc) {
  const entries = [
    { label: 'Driver Number (Mulank)', value: calc.driverNumber.value, steps: calc.driverNumber.steps },
    { label: 'Conductor Number (Bhagyank)', value: calc.conductorNumber.value, steps: calc.conductorNumber.steps },
  ];
  if (calc.nameNumber) entries.push({ label: 'Name Number (Expression)', value: calc.nameNumber.value, steps: calc.nameNumber.steps, system: calc.system });
  if (calc.soulUrgeNumber) entries.push({ label: 'Soul Urge Number', value: calc.soulUrgeNumber.value, steps: calc.soulUrgeNumber.steps });
  if (calc.personalityNumber) entries.push({ label: 'Personality Number', value: calc.personalityNumber.value, steps: calc.personalityNumber.steps });
  return entries;
}

function buildLoshuAnalysis(loshu) {
  return {
    present: loshu.present,
    missing: loshu.missing,
    repeated: loshu.repeated,
    counts: loshu.counts,
  };
}

function buildStrengths(driver, conductor) {
  const d = getNumberRecord(driver.value);
  const c = getNumberRecord(conductor.value);
  return Array.from(new Set([...d.strengths, ...c.strengths]));
}

function buildMissingNumberThemes(missing) {
  return missing.map((n) => {
    const rec = getNumberRecord(n);
    return {
      number: n,
      interpretation: `Missing ${n}: possible under-emphasis on ${rec.keywords.join(', ')}. Traditionally associated with ${rec.positiveQualities[0].toLowerCase()} needing conscious cultivation.`,
      areasAssociated: rec.keywords,
      awarenessAreas: rec.challenges,
      sources: rec.sources,
    };
  });
}

function buildRepeatedNumberThemes(repeated, counts, repetitionStrengthFn) {
  return repeated.map((n) => {
    const rec = getNumberRecord(n);
    const count = counts[n];
    return {
      number: n,
      occurrences: count,
      strength: repetitionStrengthFn(count),
      interpretation: `Repeated ${n} (${repetitionStrengthFn(count)}): amplifies ${rec.keywords[0]} and ${rec.keywords[1]}, for better and for worse.`,
      sources: rec.sources,
    };
  });
}

function buildPlanesSection(planes) {
  return planes.map((p) => ({
    ...p,
    interpretation: p.complete
      ? `The ${p.name.toLowerCase()} is complete \u2014 all of ${p.nums.join(', ')} are present in the grid.`
      : `The ${p.name.toLowerCase()} is incomplete.`,
    source: SOURCES.original,
  }));
}

function buildArrowsSection(arrows) {
  const ARROW_DESCRIPTIONS = {
    'Arrow of intellect': 'suggests a sharp, orderly mind and natural planning ability.',
    'Arrow of emotional balance': 'points to steady emotional footing and self-possession.',
    'Arrow of practicality': 'favours hands-on skill and getting things done in the material world.',
    'Arrow of planning': 'suggests methodical, grounded thinking before action.',
    'Arrow of willpower': 'is linked to strong determination and staying power.',
    'Arrow of compassion': 'points to sensitivity toward others and a caring streak.',
    'Arrow of determination': 'suggests discipline paired with responsibility.',
    'Arrow of spirituality': 'points to an inward, reflective streak.',
  };
  return arrows.map((a) => ({
    ...a,
    interpretation: a.active ? `A complete ${a.name} ${ARROW_DESCRIPTIONS[a.name] || ''}` : 'Not present in this grid.',
    source: SOURCES.original,
  }));
}

function buildNameVibration(nameNumber, soulUrge, personality, karmicNumbers) {
  if (!nameNumber) return null;
  const nameRec = getNumberRecord(nameNumber.value);
  return {
    summary: `The name carries a ${nameNumber.value} vibration \u2014 ${nameRec.nameInterpretation}`,
    soulUrge: soulUrge ? { value: soulUrge.value, interpretation: getNumberRecord(soulUrge.value).personalityThemes } : null,
    personality: personality ? { value: personality.value, interpretation: getNumberRecord(personality.value).personalityThemes } : null,
    karmicNumbers,
    karmicInterpretation: karmicNumbers && karmicNumbers.length
      ? `Numbers ${karmicNumbers.join(', ')} don't appear among the name's letter values \u2014 traditionally read as "karmic lessons," areas requiring conscious development rather than ones that come naturally through the name.`
      : 'Every number 1\u20139 appears at least once in the name\u2019s letter values \u2014 no karmic lesson numbers by this method.',
  };
}

function buildTraditionalGuidance(driver, conductor) {
  const d = getNumberRecord(driver.value);
  const c = getNumberRecord(conductor.value);
  return `Traditional guidance for this combination leans on ${driver.value}'s strength in ${d.strengths[0].toLowerCase()} to support ${conductor.value}'s path toward ${c.keywords[0]}. The most commonly suggested practice is to lean into ${d.positiveQualities[0].toLowerCase()} while staying mindful of ${c.challenges[0].toLowerCase()}.`;
}

/**
 * Assembles the full structured report. Expects a calc object shaped like:
 * { driverNumber, conductorNumber, nameNumber?, soulUrgeNumber?, personalityNumber?,
 *   karmicNumbers?, system?, loshu: { counts, present, missing, repeated },
 *   planes, arrows, repetitionStrengthFn }
 */
function buildInterpretationReport(calc) {
  return {
    overallProfile: buildOverallProfile(calc.driverNumber, calc.conductorNumber, calc.nameNumber),
    coreNumbers: buildCoreNumbers(calc),
    loshuAnalysis: buildLoshuAnalysis(calc.loshu),
    strengths: buildStrengths(calc.driverNumber, calc.conductorNumber),
    missingNumberThemes: buildMissingNumberThemes(calc.loshu.missing),
    repeatedNumberThemes: buildRepeatedNumberThemes(calc.loshu.repeated, calc.loshu.counts, calc.repetitionStrengthFn),
    planes: buildPlanesSection(calc.planes),
    arrows: buildArrowsSection(calc.arrows),
    nameVibration: buildNameVibration(calc.nameNumber, calc.soulUrgeNumber, calc.personalityNumber, calc.karmicNumbers),
    traditionalGuidance: buildTraditionalGuidance(calc.driverNumber, calc.conductorNumber),
  };
}

module.exports = { buildInterpretationReport };
