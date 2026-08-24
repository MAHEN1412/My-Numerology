const express = require('express');
const ReferenceCache = require('../models/ReferenceCache');
const calc = require('../utils/calculationEngine');

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

async function fetchTodaysBirthdays() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const cacheKey = `birthdays:${month}-${day}`;

  const cached = await ReferenceCache.findOne({ key: cacheKey });
  if (cached && isFresh(cached.fetchedAt) && cached.extract) {
    try { return JSON.parse(cached.extract); } catch (e) { /* fall through and refetch */ }
  }

  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${month}/${day}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'numerology-calculator-app/1.0 (personal project; no contact email set)' },
  });
  if (!res.ok) throw new Error(`Wikipedia onthisday API returned HTTP ${res.status}`);
  const data = await res.json();

  // Only people with a full page + a real birth year -- filters out
  // ancient/uncertain dates where numerology on the DOB wouldn't be
  // meaningful anyway, and keeps this to well-documented figures. Keep a
  // larger pool here (not just the top few) so the Indian filter below
  // has enough to actually search through, rather than being starved by
  // an early cutoff applied before filtering.
  const people = (data.births || [])
    .filter((b) => b.year && b.pages && b.pages[0])
    // No cap here -- keep the ENTIRE day's feed (Wikipedia's onthisday
    // births list for a single date is small to begin with, typically well
    // under a couple hundred entries), so the Indian filter below has the
    // full pool to search rather than being starved by an early cutoff.
    .map((b) => {
      const page = b.pages[0];
      const year = Number(b.year);
      let numerology = null;
      // Only compute numerology for plausible modern birth years -- the
      // Driver/Conductor system is a birth-date calculation, not
      // meaningful for a figure born in antiquity where the calendar
      // itself doesn't map cleanly.
      if (year >= 1000 && year <= now.getFullYear()) {
        try {
          numerology = {
            driver: calc.calculateDriverNumber(Number(day)).value,
            conductor: calc.calculateConductorNumber(Number(day), Number(month), year).value,
          };
        } catch (e) { numerology = null; }
      }
      return {
        name: page.titles?.normalized || page.title || 'Unknown',
        year,
        description: (page.description || '').slice(0, 80), // short, factual (job title / one-liner), not a reproduced extract
        sourceUrl: page.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || '')}`,
        thumbnail: page.thumbnail?.source || '',
        numerology,
      };
    });

  await ReferenceCache.findOneAndUpdate(
    { key: cacheKey },
    { key: cacheKey, title: 'birthdays-cache', extract: JSON.stringify(people), sourceUrl: url, thumbnail: '', fetchedAt: new Date() },
    { upsert: true }
  );

  return people;
}

// GET /api/reference/todays-birthdays?filter=indian
// Real people who share today's calendar date of birth, sourced from
// Wikipedia's own "On This Day" feed (same CC BY-SA license as the rest
// of the Reference Library) -- with their actual Driver/Conductor numbers
// computed from their real birthdate, not invented.
//
// The optional "indian" filter is a best-effort heuristic: it keeps only
// entries whose short Wikipedia description happens to mention "Indian"
// (as in "Indian politician", "Indian actor", etc.) -- there's no
// structured nationality field in this feed to filter on reliably, so
// this can miss people whose description is phrased differently, and
// isn't presented as a complete or curated Indian personalities database.
router.get('/todays-birthdays', async (req, res) => {
  try {
    const people = await fetchTodaysBirthdays();
    const filtered = req.query.filter === 'indian'
      ? people.filter((p) => /indian/i.test(p.description || ''))
      : people;
    res.json({ people: filtered.slice(0, 10), license: 'CC BY-SA 4.0', source: 'Wikipedia "On this day"' });
  } catch (err) {
    console.error('[reference] todays-birthdays failed:', err.message);
    res.json({ people: [], error: true });
  }
});

// GET /api/reference/indian-celebrities
// A SEPARATE, deliberately more limited feature from todays-birthdays above:
// wishiy.com's celebrity API is purpose-built for actors/politicians/
// sportspeople and covers many more Indian names than Wikipedia's feed,
// but its documented output has no birth date/year field at all -- so
// numerology cannot be computed for these entries. Shown as name +
// occupation only, clearly labeled as such on the frontend.
async function fetchIndianCelebrities() {
  const now = new Date();
  const cacheKey = `indian-celebs:${now.getMonth() + 1}-${now.getDate()}`;

  const cached = await ReferenceCache.findOne({ key: cacheKey });
  if (cached && isFresh(cached.fetchedAt) && cached.extract) {
    try { return JSON.parse(cached.extract); } catch (e) { /* fall through and refetch */ }
  }

  const res = await fetch('http://wishiy.com/page/api/today', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'response=JSON&limit=100',
  });
  if (!res.ok) throw new Error(`wishiy.com API returned HTTP ${res.status}`);
  const data = await res.json();

  // Defensive about the exact shape -- this is a small, unmaintained
  // third-party API (its GitHub docs were archived), so field names and
  // wrapper structure aren't guaranteed to be exactly as documented.
  const rawList = Array.isArray(data) ? data : (data.data || data.results || data.celebrities || []);

  const isIndian = (person) => {
    const iso = (person.country_iso || person.countryiso || person['country iso'] || '').toString().toUpperCase();
    const country = (person.country || '').toString().toLowerCase();
    return iso === 'IN' || country === 'india';
  };

  const people = rawList
    .filter(isIndian)
    .slice(0, 20)
    .map((person) => ({
      name: [person.first_name || person['first name'], person.last_name || person['last name']].filter(Boolean).join(' ') || person.name || 'Unknown',
      occupation: person.occupation || '',
      birthplace: person.birthplace || '',
    }));

  await ReferenceCache.findOneAndUpdate(
    { key: cacheKey },
    { key: cacheKey, title: 'indian-celebs-cache', extract: JSON.stringify(people), sourceUrl: 'http://wishiy.com/page/api', thumbnail: '', fetchedAt: new Date() },
    { upsert: true }
  );

  return people;
}

router.get('/indian-celebrities', async (req, res) => {
  try {
    const people = await fetchIndianCelebrities();
    res.json({ people, note: 'Name and occupation only -- this source does not provide birth dates, so numerology cannot be computed for these entries.' });
  } catch (err) {
    console.error('[reference] indian-celebrities failed:', err.message);
    res.json({ people: [], error: true });
  }
});

module.exports = router;
