const mongoose = require('mongoose');

/**
 * A separate, standalone database of public figures (actors/actresses)
 * with just name + DOB, from which Driver/Conductor/Lo Shu are computed
 * live using the existing calculation engine -- this model only stores
 * the raw facts (name, DOB, category, gender), never any numerology
 * values themselves, so it stays correct automatically if the engine
 * changes.
 */
const ActorProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120, index: true },
  day: { type: Number, required: true, min: 1, max: 31 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true, min: 1000, max: 9999 },
  category: { type: String, required: true, trim: true, maxlength: 40, index: true }, // free-text, not a fixed list -- new categories can be added any time
  gender: { type: String, required: true, enum: ['Actor', 'Actress'], index: true },
  trending: { type: Boolean, default: false, index: true }, // shown in the initial view before "Show All"
  createdAt: { type: Date, default: Date.now },
});

ActorProfileSchema.index({ name: 'text' });

module.exports = mongoose.model('ActorProfile', ActorProfileSchema);
