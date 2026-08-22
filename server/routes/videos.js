const express = require('express');
const VideoCache = require('../models/VideoCache');

const router = express.Router();

const CACHE_MAX_AGE_DAYS = 30;
// These are independent on purpose: YouTube's search.list endpoint costs the
// same quota (100 units) per call regardless of maxResults, so requesting
// more results per call is effectively free. RESULTS_PER_CATEGORY is the
// final cap after merging and filtering all queries for a category.
const MAX_RESULTS_PER_API_CALL = 10;
const RESULTS_PER_CATEGORY = 8;

function isFresh(fetchedAt) {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs < CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Builds the search queries for a given category, per the relevance rules:
 * prioritize titles containing the exact terminology (Driver Number, Mulank,
 * Psychic Number, Conductor Number, Bhagyank, Life Path Number, Lo Shu Grid),
 * plus common variant phrasings numerology channels actually use (e.g.
 * "Psychic Number (Main Planet)").
 */
function buildQueries(category, params) {
  const { driver, conductor, day, month, missing = [], repeated = [], arrowName } = params;
  switch (category) {
    case 'driver':
      return [
        `Driver Number ${driver} numerology`,
        `Mulank ${driver} numerology`,
        `Psychic Number ${driver} numerology`,
        `Psychic Number ${driver} main planet numerology`,
        `Ruling Planet Number ${driver} numerology`,
      ];
    case 'conductor':
      return [
        `Conductor Number ${conductor} numerology`,
        `Bhagyank ${conductor} numerology`,
        `Life Path Number ${conductor} numerology`,
        `Destiny Number ${conductor} numerology`,
      ];
    case 'loshu':
      return [`Lo Shu Grid DOB ${day} ${month} numerology`, `Lo Shu Grid number ${driver} ${conductor} numerology`];
    case 'combined':
      return [`Driver ${driver} Conductor ${conductor} numerology`, `Mulank ${driver} Bhagyank ${conductor}`];
    case 'mobile':
      return [
        `Lucky Mobile Number ${params.mobileFinalDigit} numerology`,
        `Mobile Number ${params.mobileFinalDigit} numerology meaning`,
        `Phone Number ${params.mobileFinalDigit} numerology lucky`,
      ];
    case 'crystal':
      return [
        `${params.topCrystal} crystal numerology benefits`,
        `Crystal for Driver Number ${driver} numerology`,
        `Crystal for Life Path Number ${conductor} numerology`,
      ];
    case 'missing':
      return missing.length ? [`Lo Shu missing number ${missing.join(' ')} numerology`] : [];
    case 'repeated':
      return repeated.length ? [`Lo Shu repeated number ${repeated.join(' ')} numerology`] : [];
    case 'arrow':
      return arrowName ? [`Lo Shu ${arrowName} numerology`] : [];
    default:
      return [];
  }
}

async function searchYouTubeOnce(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set in your .env file.');

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(MAX_RESULTS_PER_API_CALL));
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    let reason = `YouTube API returned HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) reason += `: ${body.error.message}`;
    } catch (_) { /* response wasn't JSON, keep the generic reason */ }
    throw new Error(reason);
  }
  const data = await res.json();
  return (data.items || [])
    .filter((item) => item.id && item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt,
    }));
}

const RELEVANCE_TERMS = ['driver number', 'mulank', 'psychic number', 'birth number', 'conductor number', 'bhagyank', 'life path number', 'destiny number', 'lo shu grid', 'lo shu', 'main planet', 'ruling planet', 'missing number', 'repeated number', 'arrow of', 'mobile number', 'phone number', 'lucky mobile', 'lucky phone', 'crystal', 'gemstone', 'gem stone', 'ruby', 'moonstone', 'emerald', 'sapphire', 'diamond', 'coral', 'hessonite', 'cat\'s eye'];

function scoreRelevance(video, expectedNumbers, requireNumberMatch = true) {
  const title = (video.title || '').toLowerCase();
  const desc = (video.description || '').toLowerCase();
  const combined = title + ' ' + desc;
  let score = RELEVANCE_TERMS.reduce((s, term) => (combined.includes(term) ? s + 1 : s), 0);
  if (requireNumberMatch) {
    // A relevance-term match is necessary but not sufficient — a video titled
    // "Life Path Number 9" showing up for Driver Number 3 is still wrong.
    // Require at least one of the actual expected numbers to appear too,
    // as a standalone digit (word boundary) so "3" doesn't match inside "13".
    const numberMatch = expectedNumbers.some((n) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(combined));
    if (!numberMatch) score = 0;
  }
  return score;
}

function expectedNumbersFor(category, params) {
  switch (category) {
    case 'driver': return [params.driver];
    case 'conductor': return [params.conductor];
    case 'loshu':
    case 'combined': return [params.driver, params.conductor];
    case 'mobile': return [params.mobileFinalDigit];
    case 'crystal': return [params.driver, params.conductor];
    case 'missing': return params.missing || [];
    case 'repeated': return params.repeated || [];
    default: return [];
  }
}

async function fetchCategoryVideos(category, params) {
  const queries = buildQueries(category, params);
  if (queries.length === 0) return [];

  const expectedNumbers = expectedNumbersFor(category, params);
  // Arrow queries don't reference a specific number, so relax the number
  // requirement for that one category — relevance terms alone decide it.
  const requireNumberMatch = category !== 'arrow';

  const seen = new Map();
  for (const q of queries) {
    const results = await searchYouTubeOnce(q);
    results.forEach((v) => { if (!seen.has(v.videoId)) seen.set(v.videoId, v); });
  }

  const scored = Array.from(seen.values()).map((v) => ({ ...v, _score: scoreRelevance(v, expectedNumbers, requireNumberMatch) }));
  // Only keep videos that actually matched relevant terminology (and the
  // right number, where applicable) — anything scoring 0 is dropped rather
  // than shown as filler.
  const relevant = scored.filter((v) => v._score > 0);

  return relevant
    .sort((a, b) => b._score - a._score)
    .slice(0, RESULTS_PER_CATEGORY)
    .map(({ _score, ...v }) => v);
}

// GET /api/videos/:driver/:conductor/:day/:month/:year
// Optional query params: ?missing=3,4,5&repeated=1,2&arrow=Arrow%20of%20determination
// Returns every applicable category in one response, each independently cached.
router.get('/:driver/:conductor/:day/:month/:year', async (req, res) => {
  const driver = Number(req.params.driver);
  const conductor = Number(req.params.conductor);
  const day = Number(req.params.day);
  const month = Number(req.params.month);
  const year = Number(req.params.year);

  if (![driver, conductor].every((n) => n >= 1 && n <= 9)) {
    return res.status(400).json({ error: 'Driver and conductor must each be 1-9.' });
  }

  // Cap how many missing/repeated numbers get their own search, to keep
  // YouTube API quota usage bounded regardless of how sparse/repetitive a
  // grid is (a grid could have up to 9 missing numbers).
  const missing = (req.query.missing || '').split(',').filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 9).slice(0, 3);
  const repeated = (req.query.repeated || '').split(',').filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 9).slice(0, 3);
  const arrowName = req.query.arrow ? String(req.query.arrow).slice(0, 60) : null;

  const categories = ['driver', 'conductor', 'loshu', 'combined'];
  if (missing.length) categories.push('missing');
  if (repeated.length) categories.push('repeated');
  if (arrowName) categories.push('arrow');

  const output = {};
  let anyApiError = null;

  for (const category of categories) {
    const params = { driver, conductor, day, month, year, missing, repeated, arrowName };
    const cacheKeyExtra = category === 'missing' ? missing.join('-') : category === 'repeated' ? repeated.join('-') : category === 'arrow' ? arrowName : '';
    const cacheKey = `${category}:${driver}:${conductor}:${day}:${month}:${year}:${cacheKeyExtra}`;
    try {
      const cached = await VideoCache.findOne({ key: cacheKey });
      if (cached && isFresh(cached.fetchedAt) && cached.videos.length > 0) {
        output[category] = { videos: cached.videos, cached: true };
        continue;
      }

      const videos = await fetchCategoryVideos(category, params);

      if (videos.length > 0) {
        await VideoCache.findOneAndUpdate(
          { key: cacheKey },
          { key: cacheKey, driver, conductor, category, videos, fetchedAt: new Date() },
          { upsert: true }
        );
      }
      output[category] = { videos, cached: false };
    } catch (err) {
      console.error(`[videos] ${category} category failed:`, err.message);
      anyApiError = err.message;
      output[category] = { videos: [], error: true, reason: err.message };
    }
  }

  if (anyApiError) {
    return res.json({
      driver, conductor, categories: output,
      warning: 'Video recommendations are temporarily unavailable.',
      debugReason: anyApiError,
    });
  }

  res.json({ driver, conductor, categories: output });
});

/**
 * Reusable, cached video fetch for a single category — used by other
 * routes (e.g. mobile.js) that want a video recommendation without going
 * through the full multi-category endpoint above.
 */
async function getVideosForCategory(category, params, cacheKey) {
  try {
    const cached = await VideoCache.findOne({ key: cacheKey });
    if (cached && isFresh(cached.fetchedAt) && cached.videos.length > 0) {
      return { videos: cached.videos, cached: true };
    }
    const videos = await fetchCategoryVideos(category, params);
    if (videos.length > 0) {
      await VideoCache.findOneAndUpdate(
        { key: cacheKey },
        { key: cacheKey, driver: params.driver || 0, conductor: params.conductor || 0, category, videos, fetchedAt: new Date() },
        { upsert: true }
      );
    }
    return { videos, cached: false };
  } catch (err) {
    console.error(`[videos] ${category} category failed:`, err.message);
    return { videos: [], error: true, reason: err.message };
  }
}

module.exports = router;
module.exports.getVideosForCategory = getVideosForCategory;
