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
  source: { type: String, required: true, trim: true, maxlength: 600 }, // e.g. "Book: X, Author Y, p.42" or "Consultant's own methodology"
  // Optional multi-source citation list, used by the 2026 crystal-consensus
  // research pass (see server/knowledge/crystalConsensus2026.js) where
  // several independent websites were checked for a single number. `source`
  // above stays required and holds a short summary; the full per-site
  // citations (name + exact URL) live here so the association stays
  // traceable without breaking the existing single-string contract.
  sources: [{ type: String, trim: true, maxlength: 400 }],
  // How strong the cross-source agreement was when this association was
  // added: A = 3+ independent sources agreed, B = 2, C = 1-2 with real
  // disagreement present, D = a single source only. Left unset for older
  // associations that predate this research pass.
  evidenceTier: { type: String, enum: ['A', 'B', 'C', 'D'] },
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
