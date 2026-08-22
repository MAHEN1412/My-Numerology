const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 }, // optional — DOB-only readings still work
  day: { type: Number, required: true, min: 1, max: 31 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true, min: 1000, max: 9999 },
  system: { type: String, enum: ['chaldean', 'pythagorean'], default: 'chaldean' },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

ReadingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reading', ReadingSchema);
