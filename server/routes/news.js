const express = require('express');
const NewsCache = require('../models/NewsCache');
const { parseRssItems } = require('../utils/rssParser');

const router = express.Router();

// Curated, verified-working RSS feeds. "Headline + link out" only --
// never article body content.
const NEWS_SOURCES = [
  { url: 'https://numerology4yoursoul.com/blog/feed/', name: 'Numerology4YourSoul' },
  { url: 'https://creativenumerology.com/feed', name: 'Creative Numerology' },
];

const NEWS_CACHE_KEY = 'numerology-news';
const NEWS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isFresh(fetchedAt) {
  return fetchedAt && (Date.now() - new Date(fetchedAt).getTime()) < NEWS_TTL_MS;
}

// GET /api/news — cached headline list from curated RSS sources
router.get('/', async (req, res) => {
  try {
    const cached = await NewsCache.findOne({ key: NEWS_CACHE_KEY });
    if (cached && isFresh(cached.fetchedAt) && cached.items.length > 0) {
      return res.json({ items: cached.items, cached: true });
    }

    const allItems = [];
    for (const source of NEWS_SOURCES) {
      try {
        const resp = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NumerologyApp/1.0)' } });
        if (!resp.ok) continue;
        const xml = await resp.text();
        allItems.push(...parseRssItems(xml, source.name, 5));
      } catch (err) {
        console.error(`News fetch failed for ${source.name}:`, err.message);
      }
    }

    allItems.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
    const items = allItems.slice(0, 12);

    if (items.length > 0) {
      await NewsCache.findOneAndUpdate(
        { key: NEWS_CACHE_KEY },
        { key: NEWS_CACHE_KEY, items, fetchedAt: new Date() },
        { upsert: true }
      );
    }

    res.json({ items, cached: false });
  } catch (err) {
    console.error('News fetch failed:', err.message);
    res.json({ items: [], error: true });
  }
});

module.exports = router;
