const mongoose = require('mongoose');

// Caches YouTube search results per (category, driver, conductor, DOB) key
// so repeat visits don't re-hit the YouTube Data API's daily quota.
const VideoCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  driver: { type: Number, required: true },
  conductor: { type: Number, required: true },
  category: { type: String, enum: ['driver', 'conductor', 'loshu', 'combined', 'missing', 'repeated', 'arrow', 'mobile'], required: true },
  videos: [
    {
      videoId: String,
      title: String,
      description: String,
      channelTitle: String,
      thumbnail: String,
      publishedAt: Date,
    },
  ],
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VideoCache', VideoCacheSchema);
