/**
 * COLORS & NUMBERS ENGINE
 * ========================
 * Combines a person's Driver, Conductor, and Name numbers into a single,
 * explained set of favorable/challenging numbers and a personalized color
 * palette. Every recommendation traces back to which specific number
 * produced it — never a bare "your colors are X, Y, Z" with no reasoning.
 *
 * No medical, financial, or guaranteed-outcome claims are made anywhere
 * here — colors are framed as traditional associations only.
 */

const { getNumberRecord } = require('./numberKnowledge');

/**
 * Builds the "Numbers Analysis" section: favorable/challenging numbers
 * derived from the union of each core number's compatible/challenging
 * numbers (plus the core numbers themselves), with every entry traceable
 * to the number that produced it.
 */
function buildNumbersAnalysis({ driver, conductor, nameNumber }) {
  const coreNumbers = [
    { role: 'Driver Number', value: driver },
    { role: 'Conductor Number', value: conductor },
  ];
  if (nameNumber) coreNumbers.push({ role: 'Name Number', value: nameNumber });

  const favorableMap = new Map(); // number -> Set of reasons
  const challengingMap = new Map();

  const addFavorable = (n, reason) => {
    if (!favorableMap.has(n)) favorableMap.set(n, new Set());
    favorableMap.get(n).add(reason);
  };
  const addChallenging = (n, reason) => {
    if (!challengingMap.has(n)) challengingMap.set(n, new Set());
    challengingMap.get(n).add(reason);
  };

  coreNumbers.forEach(({ role, value }) => {
    addFavorable(value, `Your ${role} itself`);
    const rec = getNumberRecord(value);
    rec.compatibleNumbers.forEach((n) => addFavorable(n, `Compatible with your ${role} (${value})`));
    rec.challengingNumbers.forEach((n) => addChallenging(n, `Traditionally challenging for your ${role} (${value})`));
  });

  const favorableNumbers = Array.from(favorableMap.entries())
    .map(([number, reasons]) => ({ number, reasons: Array.from(reasons) }))
    .sort((a, b) => a.number - b.number);

  const challengingNumbers = Array.from(challengingMap.entries())
    // A number that's favorable for one core number and challenging for
    // another is genuinely ambiguous — surfaced as favorable (the more
    // useful framing) rather than silently dropped or double-counted.
    .filter(([number]) => !favorableMap.has(number))
    .map(([number, reasons]) => ({ number, reasons: Array.from(reasons) }))
    .sort((a, b) => a.number - b.number);

  // Supportive combinations: pairs of favorable numbers that are also each
  // other's traditionally compatible numbers -- i.e. genuinely reinforcing
  // pairs, not just "any two numbers that happen to both be favorable."
  const favorableSet = new Set(favorableNumbers.map((f) => f.number));
  const combinations = [];
  const seenPairs = new Set();
  favorableNumbers.forEach(({ number }) => {
    const rec = getNumberRecord(number);
    rec.compatibleNumbers.forEach((other) => {
      if (!favorableSet.has(other)) return;
      const pairKey = [number, other].sort((a, b) => a - b).join('-');
      if (seenPairs.has(pairKey)) return;
      seenPairs.add(pairKey);
      combinations.push(pairKey);
    });
  });

  return { coreNumbers, favorableNumbers, challengingNumbers, supportiveCombinations: combinations };
}

/**
 * Builds the personalized "My Colors" card: a prioritized palette where
 * every color is traced to the specific number that produced it.
 */
function buildColorProfile({ driver, conductor, nameNumber, loshuPresent = [], loshuMissing = [] }) {
  const driverRec = getNumberRecord(driver);
  const conductorRec = getNumberRecord(conductor);
  const nameRec = nameNumber ? getNumberRecord(nameNumber) : null;

  const byNumber = {
    driver: { number: driver, primaryColor: driverRec.primaryColor, supportingColors: driverRec.supportingColors, challengingColors: driverRec.challengingColors, meaning: driverRec.colorMeaning },
    conductor: { number: conductor, primaryColor: conductorRec.primaryColor, supportingColors: conductorRec.supportingColors, challengingColors: conductorRec.challengingColors, meaning: conductorRec.colorMeaning },
  };
  if (nameRec) {
    byNumber.name = { number: nameNumber, primaryColor: nameRec.primaryColor, supportingColors: nameRec.supportingColors, challengingColors: nameRec.challengingColors, meaning: nameRec.colorMeaning };
  }

  const best = [
    { color: driverRec.primaryColor, source: `Driver Number ${driver}` },
    { color: conductorRec.primaryColor, source: `Conductor Number ${conductor}` },
  ];
  if (nameRec) best.push({ color: nameRec.primaryColor, source: `Name Number ${nameNumber}` });

  const useModerately = [];
  const seenCaution = new Set();
  [driverRec, conductorRec, ...(nameRec ? [nameRec] : [])].forEach((rec, i) => {
    const source = i === 0 ? `Driver Number ${driver}` : i === 1 ? `Conductor Number ${conductor}` : `Name Number ${nameNumber}`;
    rec.challengingColors.forEach((c) => {
      const key = c.toLowerCase();
      if (seenCaution.has(key)) return;
      seenCaution.add(key);
      useModerately.push({ color: c, source: `Traditionally challenging for your ${source}` });
    });
  });

  // Personal palette: dedupe best + a couple of supporting colors, capped at 6.
  const paletteSeen = new Set();
  const palette = [];
  const addToPalette = (color, source) => {
    const key = color.toLowerCase();
    if (paletteSeen.has(key) || palette.length >= 6) return;
    paletteSeen.add(key);
    palette.push({ color, source });
  };
  best.forEach((b) => addToPalette(b.color, b.source));
  addToPalette(driverRec.supportingColors[0], `Supports Driver Number ${driver}`);
  addToPalette(conductorRec.supportingColors[0], `Supports Conductor Number ${conductor}`);
  if (nameRec) addToPalette(nameRec.supportingColors[0], `Supports Name Number ${nameNumber}`);

  return { byNumber, best, useModerately, palette };
}

module.exports = { buildNumbersAnalysis, buildColorProfile };
