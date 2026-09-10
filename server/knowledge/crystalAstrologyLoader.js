const fs = require('fs');
const path = require('path');

/**
 * Loader for the static Crystal Astrology reference data
 * (server/knowledge/crystalAstrology/crystal-astrology.json), extracted
 * from Marina Costelloe's "The Complete Guide to Crystal Astrology"
 * (360 entries, one per zodiac degree).
 *
 * Same rationale as bookDataLoader.js: this is a fixed, pre-extracted
 * reference from one specific, credited book, shown in full per this
 * product's own choice, so it gets its own loader rather than going
 * through the arbitrary-PDF book-insights excerpt engine.
 *
 * Each entry carries a "range" (startMonth/startDay/endMonth/endDay) used
 * only for the date lookup below — the displayed "birthdays" text is kept
 * exactly as printed in the book, including its handful of small printed
 * typos; the "range" values used for matching correct those few typos
 * (verified by hand against the surrounding, sequential entries) so the
 * lookup itself still works correctly. Ranges legitimately overlap: the
 * book's own method (see its "Karmic Condition / Focus / Quest" idea) is
 * that a single birth date usually falls inside 2-4 adjacent degrees, and
 * which one is your exact "Focus" depends on birth time and location —
 * which this app doesn't calculate. So the lookup below returns every
 * degree whose range contains the given date, in book order.
 */

const DATA_DIR = path.join(__dirname, 'crystalAstrology');
const DATA_FILE = path.join(DATA_DIR, 'crystal-astrology.json');

let cache = null; // full parsed file, with image paths rewritten

function rewriteImagePath(p) {
  return p ? `/crystal-astrology-images/${p.replace(/^images\//, '')}` : p;
}

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DATA_FILE)) return null;
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.entries = (parsed.entries || []).map((e) => ({
    ...e,
    image: rewriteImagePath(e.image),
  }));
  cache = parsed;
  return cache;
}

function getMeta() {
  const data = load();
  if (!data) return null;
  const { entries, ...meta } = data;
  return meta;
}

function isInRange(month, day, range) {
  const key = (m, d) => m * 100 + d;
  const start = key(range.startMonth, range.startDay);
  const end = key(range.endMonth, range.endDay);
  const cur = key(month, day);
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end; // wraps the Dec/Jan boundary
}

/**
 * Returns every book entry whose printed birthday range covers the given
 * month/day, in the book's own sequential order (Aries 1 -> Pisces 30).
 * Usually 2-4 entries for a real calendar date; never zero (full-year
 * coverage was verified when this data was built).
 */
function lookupByDate(month, day) {
  const data = load();
  if (!data) return [];
  return data.entries.filter((e) => isInRange(month, day, e.range));
}

module.exports = { load, getMeta, lookupByDate };
