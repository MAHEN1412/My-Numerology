const fs = require('fs');
const path = require('path');

/**
 * Loader for the static Harish Johari book-data reference files
 * (server/knowledge/bookData/number-1.json .. number-9.json and
 * compound-numbers.json).
 *
 * This is deliberately separate from bookSearch.js / BookChunk — that
 * pipeline is built around arbitrary admin-uploaded PDFs, chunked by page,
 * searched, and hard-capped to short excerpts (MAX_EXCERPT_CHARS) so no
 * single uploaded work is reproduced at length. This file's data is a
 * fixed, pre-extracted reference from one specific, credited book, shown
 * in full per the product's own choice — so it gets its own loader and
 * its own API surface rather than being forced through the excerpt engine.
 *
 * Files are read once and cached in memory (they're static — the process
 * needs a restart to pick up edits, same as any other require()'d data
 * module in this codebase).
 */

const DATA_DIR = path.join(__dirname, 'bookData');

let numberCache = null; // { 1: {...}, ..., 9: {...} }
let compoundCache = null; // full compound-numbers.json contents

function loadNumberProfile(num) {
  if (!numberCache) numberCache = {};
  if (numberCache[num]) return numberCache[num];

  const filePath = path.join(DATA_DIR, `number-${num}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  // Rewrite the relative image paths ("images/number-1/deity_sun.png")
  // baked into the extracted JSON into the URL path server.js serves them
  // under, so the frontend can use them directly without knowing the
  // on-disk layout.
  const rewriteImagePath = (p) => (p ? `/book-data-images/${p.replace(/^images\//, '')}` : p);
  if (parsed.images) {
    if (parsed.images.deity) parsed.images.deity = rewriteImagePath(parsed.images.deity);
    if (parsed.images.relationships) {
      Object.keys(parsed.images.relationships).forEach((k) => {
        parsed.images.relationships[k] = rewriteImagePath(parsed.images.relationships[k]);
      });
    }
  }

  numberCache[num] = parsed;
  return parsed;
}

function loadCompoundNumbers() {
  if (compoundCache) return compoundCache;
  const filePath = path.join(DATA_DIR, 'compound-numbers.json');
  if (!fs.existsSync(filePath)) return null;
  compoundCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return compoundCache;
}

function getCompoundEntry(day) {
  const data = loadCompoundNumbers();
  if (!data) return null;
  const entry = data.compoundNumbers[String(day)];
  if (!entry) return null;
  return { day: Number(day), title: data.title, source: data.source, ...entry };
}

module.exports = { loadNumberProfile, loadCompoundNumbers, getCompoundEntry };
