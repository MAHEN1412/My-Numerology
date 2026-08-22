const mongoose = require('mongoose');

// Caches short Wikipedia summaries (Driver/Conductor number pages, Lo Shu
// Square) so we don't re-fetch on every visit. Wikipedia content is
// CC BY-SA 4.0 — we store only a short truncated extract plus a link back
// to the full article, never the full article text.
const ReferenceCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "number:3", "loshu"
  title: String,
  extract: String,
  sourceUrl: String,
  thumbnail: String,
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ReferenceCache', ReferenceCacheSchema);
