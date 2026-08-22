const mongoose = require('mongoose');

/**
 * Caches parsed RSS headlines. Only title, link, source, and pubDate are
 * stored — deliberately never the article body/description, to stay
 * strictly within "headline + link out" territory rather than
 * reproducing article content.
 */
const NewsCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. 'numerology-news'
  items: [{
    title: String,
    link: String,
    source: String,
    pubDate: Date,
  }],
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('NewsCache', NewsCacheSchema);
