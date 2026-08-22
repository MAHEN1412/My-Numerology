const express = require('express');
const ReferenceCache = require('../models/ReferenceCache');

const router = express.Router();

const CACHE_MAX_AGE_DAYS = 90; // reference content barely changes, cache longer than videos
const MAX_EXTRACT_CHARS = 260; // hard cap so we only ever show a short, clearly-attributed snippet

function isFresh(fetchedAt) {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs < CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function truncateExtract(text) {
  if (!text) return '';
  if (text.length <= MAX_EXTRACT_CHARS) return text;
  const cut = text.slice(0, MAX_EXTRACT_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 0 ? lastSpace : MAX_EXTRACT_CHARS) + '\u2026';
}

async function fetchWikipediaSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: {
      // Wikimedia asks all API clients to identify themselves.
      'User-Agent': 'numerology-calculator-app/1.0 (personal project; no contact email set)',
    },
  });
  if (!res.ok) throw new Error(`Wikipedia API returned HTTP ${res.status} for "${title}"`);
  const data = await res.json();
  return {
    title: data.title || title,
    extract: truncateExtract(data.extract || ''),
    sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: data.thumbnail?.source || '',
  };
}

async function getReferenceEntry(key, wikiTitle) {
  const cached = await ReferenceCache.findOne({ key });
  if (cached && isFresh(cached.fetchedAt) && cached.extract) {
    return { key, title: cached.title, extract: cached.extract, sourceUrl: cached.sourceUrl, thumbnail: cached.thumbnail, cached: true };
  }
  const summary = await fetchWikipediaSummary(wikiTitle);
  await ReferenceCache.findOneAndUpdate(
    { key },
    { key, ...summary, fetchedAt: new Date() },
    { upsert: true }
  );
  return { key, ...summary, cached: false };
}

// GET /api/reference/:driver/:conductor
// Returns short, attributed Wikipedia extracts for both numbers and Lo Shu Square.
router.get('/:driver/:conductor', async (req, res) => {
  const driver = Number(req.params.driver);
  const conductor = Number(req.params.conductor);

  if (![driver, conductor].every((n) => n >= 1 && n <= 9)) {
    return res.status(400).json({ error: 'Driver and conductor must each be 1-9.' });
  }

  const targets = [
    { key: `number:${driver}`, wikiTitle: `${driver} (number)`, label: `Driver Number ${driver}` },
    { key: `number:${conductor}`, wikiTitle: `${conductor} (number)`, label: `Conductor Number ${conductor}` },
    { key: 'loshu', wikiTitle: 'Lo Shu Square', label: 'Lo Shu Grid' },
  ];

  const entries = [];
  let anyError = null;

  for (const t of targets) {
    try {
      const entry = await getReferenceEntry(t.key, t.wikiTitle);
      entries.push({ ...entry, label: t.label });
    } catch (err) {
      console.error(`[reference] ${t.key} failed:`, err.message);
      anyError = err.message;
      entries.push({ key: t.key, label: t.label, error: true });
    }
  }

  res.json({
    entries,
    license: 'CC BY-SA 4.0',
    warning: anyError ? 'Reference material is temporarily unavailable for one or more topics.' : null,
  });
});

module.exports = router;
