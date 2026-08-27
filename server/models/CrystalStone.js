const mongoose = require('mongoose');

/**
 * Database-backed version of the 37-stone crystal database. Replaces the
 * static crystalDatabase37.js file so number associations can actually be
 * added or edited over time -- every association REQUIRES a source, so
 * nothing gets added without saying where it came from (a book citation,
 * a web reference, or the consultant's own stated methodology).
 */
const NumberAssociationSchema = new mongoose.Schema({
  number: { type: Number, required: true, min: 1, max: 9 },
  role: { type: String, enum: ['primary', 'supporting'], default: 'supporting' },
  source: { type: String, required: true, trim: true, maxlength: 300 }, // e.g. "Book: X, Author Y, p.42" or "Consultant's own methodology"
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const CrystalStoneSchema = new mongoose.Schema({
  stoneId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  aliases: [String],
  materialType: String,
  numberAssociations: [NumberAssociationSchema],
  active: { type: Boolean, default: true },
  sourceNotes: String, // original honest note from the initial data audit
});

module.exports = mongoose.model('CrystalStone', CrystalStoneSchema);
