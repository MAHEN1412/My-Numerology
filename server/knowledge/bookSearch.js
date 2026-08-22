/**
 * BOOK SEARCH ENGINE
 * ==================
 * Retrieves short, citation-tracked excerpts from uploaded books, grouped
 * by topic AND by book. Deliberately does NOT merge or synthesize across
 * books — if three books discuss "missing number 4," the caller gets three
 * separate excerpts, each attributed to its own book and page, so the user
 * can see where perspectives agree or differ themselves rather than being
 * told a single "answer."
 *
 * No interpretation is invented here — only retrieval of what the uploaded
 * books actually contain, with a hard length cap per excerpt to avoid
 * reproducing more than a short snippet of any copyrighted work.
 */

const BookChunk = require('../models/BookChunk');

const MAX_EXCERPT_CHARS = 320;
const MAX_BOOKS_PER_TOPIC = 5;
const MAX_EXCERPTS_PER_BOOK = 2;

function truncateExcerpt(text) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;
  const cut = clean.slice(0, MAX_EXCERPT_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 0 ? lastSpace : MAX_EXCERPT_CHARS) + '\u2026';
}

/**
 * Topic definitions: each builds its own search terms from the calculated
 * result, plus a relevance requirement used to filter results AFTER the
 * text search (MongoDB $text search alone isn't precise enough for
 * number-specific topics — a page mentioning "400 degrees" can match a
 * search for "missing number 4" purely because "4" appears as a
 * substring/token. requiredNumber + requiredKeyword close that gap).
 */
function buildTopicList(params) {
  const { driver, conductor, missing = [], repeated = [], nameNumber, system } = params;
  const topics = [
    { key: 'driver', label: `Driver Number ${driver}`, terms: [`driver number ${driver}`, `mulank ${driver}`, `psychic number ${driver}`, `birth number ${driver}`, `ruling number ${driver}`], requiredNumber: driver, requiredKeywords: ['driver number', 'mulank', 'psychic number', 'birth number', 'ruling number'] },
    { key: 'conductor', label: `Conductor Number ${conductor}`, terms: [`conductor number ${conductor}`, `bhagyank ${conductor}`, `life path number ${conductor}`, `destiny number ${conductor}`], requiredNumber: conductor, requiredKeywords: ['conductor number', 'bhagyank', 'life path', 'destiny number'] },
    // "Magic square" is the generic/mathematical name several authors use
    // instead of the specifically Chinese "Lo Shu" term.
    { key: 'loshu', label: 'Lo Shu Grid / Magic Square', terms: ['lo shu grid', 'lo shu', 'magic square'], requiredNumber: null, requiredKeywords: ['lo shu', 'magic square'] },
    { key: 'nameCorrection', label: 'Name correction', terms: ['name correction', 'name change', 'lucky name', 'name compatibility', 'correcting your name'], requiredNumber: null, requiredKeywords: ['name correction', 'name change', 'lucky name'] },
    // Many numerology traditions (esp. Ayurvedic/Vedic) discuss health via
    // gemstones and remedies rather than clinical "health number" phrasing.
    { key: 'health', label: 'Health associations', terms: [`health number ${driver}`, `disease number ${conductor}`, 'health numerology', 'ayurveda numerology', 'gemstone remedy', 'disease', 'illness'], requiredNumber: null, requiredKeywords: ['health', 'disease', 'illness', 'ayurveda', 'gemstone', 'gem '] },
    { key: 'relationships', label: 'Relationships', terms: [`relationship number ${driver}`, `marriage number ${conductor}`, 'compatibility numerology', 'marriage', 'love compatibility'], requiredNumber: null, requiredKeywords: ['relationship', 'marriage', 'compatibility', 'love'] },
    { key: 'career', label: 'Career', terms: [`career number ${driver}`, `profession number ${conductor}`, 'business numerology', 'career', 'profession'], requiredNumber: null, requiredKeywords: ['career', 'profession', 'business', 'job'] },
    { key: 'finance', label: 'Finance', terms: [`finance number ${driver}`, `wealth number ${conductor}`, 'money numerology', 'wealth', 'financial'], requiredNumber: null, requiredKeywords: ['finance', 'money', 'wealth', 'financial'] },
    { key: 'remedies', label: 'Remedies', terms: ['numerology remedy', 'remedies', 'lucky gemstone', 'lucky color', 'favorable color'], requiredNumber: null, requiredKeywords: ['remedy', 'remedies', 'gem', 'lucky color', 'lucky colour'] },
  ];

  if (nameNumber) {
    topics.push({ key: 'nameNumber', label: `Name Number ${nameNumber}`, terms: [`name number ${nameNumber}`, `expression number ${nameNumber}`, `compound number ${nameNumber}`], requiredNumber: nameNumber, requiredKeywords: ['name', 'compound'] });
  }

  missing.slice(0, 5).forEach((n) => {
    topics.push({ key: `missing:${n}`, label: `Missing Number ${n}`, terms: [`missing number ${n}`, `number ${n} missing`, `absence of ${n}`, `without ${n}`], requiredNumber: n, requiredKeywords: ['missing', 'absence', 'without', 'lacking'] });
  });

  repeated.slice(0, 5).forEach((n) => {
    topics.push({ key: `repeated:${n}`, label: `Repeated Number ${n}`, terms: [`repeated number ${n}`, `number ${n} repeated`, `${n} appears multiple times`, `double ${n}`, `triple ${n}`], requiredNumber: n, requiredKeywords: ['repeat', 'multiple', 'double', 'triple', 'twice', 'thrice'] });
  });

  return topics;
}

/**
 * Mobile-number-specific topics, per the spec's Book Intelligence
 * extension. Kept as a separate function (not merged into buildTopicList)
 * since these are only relevant when analyzing/suggesting phone numbers,
 * not every reading.
 */
function buildMobileTopicList({ finalDigit, firstDigit, lastDigit }) {
  const topics = [
    { key: 'mobileTotal', label: `Mobile Number Total ${finalDigit}`, terms: [`mobile number ${finalDigit}`, `phone number total ${finalDigit}`, `mobile total number ${finalDigit}`], requiredNumber: finalDigit, requiredKeywords: ['mobile', 'phone number', 'cell number'] },
    { key: 'mobileFirstDigit', label: `First Digit ${firstDigit}`, terms: [`first digit ${firstDigit} mobile`, `starting digit ${firstDigit} phone`], requiredNumber: firstDigit, requiredKeywords: ['first digit', 'starting digit', 'begins with'] },
    { key: 'mobileLastDigit', label: `Last Digit ${lastDigit}`, terms: [`last digit ${lastDigit} mobile`, `ending digit ${lastDigit} phone`], requiredNumber: lastDigit, requiredKeywords: ['last digit', 'ending digit', 'ends with'] },
    { key: 'mobileCombinations', label: 'Number combinations', terms: ['mobile number combination', 'lucky number combination', 'phone number pair'], requiredNumber: null, requiredKeywords: ['combination', 'pair'] },
    { key: 'mobileBusiness', label: 'Business mobile numbers', terms: ['business mobile number', 'business phone number', 'shop number numerology'], requiredNumber: null, requiredKeywords: ['business', 'shop', 'office number'] },
    { key: 'mobileSuggested', label: 'Suggested/avoided numbers', terms: ['suggested mobile number', 'avoid mobile number', 'lucky mobile number', 'unlucky mobile number'], requiredNumber: null, requiredKeywords: ['suggested', 'avoid', 'lucky mobile', 'unlucky'] },
  ];
  return topics;
}

/**
 * Crystal-specific topics, mirroring the mobile-number topic pattern —
 * kept as its own function since these only matter when analyzing
 * crystals, not every reading.
 */
function buildCrystalTopicList({ driver, conductor, nameNumber, missing = [] }) {
  const topics = [
    { key: 'crystalDriver', label: `Crystals for Driver Number ${driver}`, terms: [`crystal driver number ${driver}`, `gemstone psychic number ${driver}`], requiredNumber: driver, requiredKeywords: ['crystal', 'gemstone', 'gem'] },
    { key: 'crystalConductor', label: `Crystals for Conductor Number ${conductor}`, terms: [`crystal conductor number ${conductor}`, `gemstone life path ${conductor}`], requiredNumber: conductor, requiredKeywords: ['crystal', 'gemstone', 'gem'] },
    { key: 'crystalGeneral', label: 'Crystal & gemstone recommendations', terms: ['numerology crystal recommendation', 'lucky gemstone numerology', 'birthstone numerology'], requiredNumber: null, requiredKeywords: ['crystal', 'gemstone', 'birthstone'] },
  ];
  if (nameNumber) {
    topics.push({ key: 'crystalName', label: `Crystals for Name Number ${nameNumber}`, terms: [`crystal name number ${nameNumber}`], requiredNumber: nameNumber, requiredKeywords: ['crystal', 'gemstone', 'gem'] });
  }
  missing.slice(0, 3).forEach((n) => {
    topics.push({ key: `crystalMissing:${n}`, label: `Crystals for missing number ${n}`, terms: [`crystal missing number ${n}`, `gemstone missing number ${n}`], requiredNumber: n, requiredKeywords: ['crystal', 'gemstone', 'missing'] });
  });
  return topics;
}

async function buildCrystalBookInsights({ driver, conductor, nameNumber, missing }, bookIds) {
  const topics = buildCrystalTopicList({ driver, conductor, nameNumber, missing });
  const results = [];
  for (const topic of topics) {
    try {
      results.push(await searchTopic(topic, bookIds));
    } catch (err) {
      results.push({ topic: topic.key, label: topic.label, sourceCount: 0, books: [], error: err.message });
    }
  }
  return results;
}

module.exports = { buildTopicList, buildMobileTopicList, buildCrystalTopicList, searchTopic, buildBookInsights, buildMobileBookInsights, buildCrystalBookInsights, truncateExcerpt };


function isRelevant(text, topic) {
  const lower = text.toLowerCase();
  if (topic.requiredNumber != null) {
    const numberMatch = new RegExp(`(^|[^0-9])${topic.requiredNumber}([^0-9]|$)`).test(lower);
    if (!numberMatch) return false;
  }
  if (topic.requiredKeywords && topic.requiredKeywords.length > 0) {
    const anyMatch = topic.requiredKeywords.some((kw) => lower.includes(kw));
    if (!anyMatch) return false;
  }
  return true;
}

/**
 * Searches for one topic across all (or a filtered set of) uploaded books,
 * using MongoDB text search, then groups hits by book and caps how many
 * excerpts and how many distinct books appear — so one very long or
 * repetitive book can't crowd out the others.
 */
async function searchTopic(topic, bookIds) {
  const searchString = topic.terms.join(' ');
  const filter = { $text: { $search: searchString } };
  if (bookIds && bookIds.length) filter.bookId = { $in: bookIds };

  const hits = await BookChunk.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(30);

  const relevantHits = hits.filter((h) => isRelevant(h.text, topic));

  const byBook = new Map();
  for (const hit of relevantHits) {
    const key = String(hit.bookId);
    if (!byBook.has(key)) byBook.set(key, []);
    const bucket = byBook.get(key);
    if (bucket.length < MAX_EXCERPTS_PER_BOOK) {
      bucket.push({
        page: hit.page,
        excerpt: truncateExcerpt(hit.text),
      });
    }
  }

  const books = Array.from(byBook.entries())
    .slice(0, MAX_BOOKS_PER_TOPIC)
    .map(([bookId, excerpts]) => {
      const anyHit = relevantHits.find((h) => String(h.bookId) === bookId);
      return {
        bookId,
        bookTitle: anyHit.bookTitle,
        bookAuthor: anyHit.bookAuthor,
        excerpts,
      };
    });

  return {
    topic: topic.key,
    label: topic.label,
    sourceCount: books.length,
    books,
  };
}

/**
 * Runs every applicable topic and returns the full 360° book-based
 * analysis, one entry per topic, each with its own list of per-book
 * excerpts. Topics with zero matches are still returned (sourceCount: 0)
 * so the frontend can show "no book coverage for this" honestly rather
 * than silently omitting sections.
 */
async function buildBookInsights(params, bookIds) {
  const topics = buildTopicList(params);
  const results = [];
  for (const topic of topics) {
    try {
      results.push(await searchTopic(topic, bookIds));
    } catch (err) {
      results.push({ topic: topic.key, label: topic.label, sourceCount: 0, books: [], error: err.message });
    }
  }
  return results;
}

async function buildMobileBookInsights({ finalDigit, firstDigit, lastDigit }, bookIds) {
  const topics = buildMobileTopicList({ finalDigit, firstDigit, lastDigit });
  const results = [];
  for (const topic of topics) {
    try {
      results.push(await searchTopic(topic, bookIds));
    } catch (err) {
      results.push({ topic: topic.key, label: topic.label, sourceCount: 0, books: [], error: err.message });
    }
  }
  return results;
}
