const mongoose = require('mongoose');

/**
 * Stores a manually-saved snapshot from any of the calculator tabs. Only
 * created when the person explicitly clicks "Save to Dashboard" — never
 * automatically on every calculation.
 */
const SavedProfileSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 20 },
  day: { type: Number, min: 1, max: 31 },
  month: { type: Number, min: 1, max: 12 },
  year: { type: Number, min: 1000, max: 9999 },
  system: { type: String, enum: ['chaldean', 'pythagorean'], default: 'chaldean' },

  tabSource: { type: String, required: true }, // e.g. 'lo-shu', 'crystal', 'mobile'
  status: { type: String, enum: ['Active', 'Review', 'Completed', 'Follow-up'], default: 'Active' },

  // Core numbers, stored flat for fast "common numbers" aggregation
  driverNumber: { type: Number },
  conductorNumber: { type: Number },
  nameNumber: { type: Number },

  crystalSuggestion: { type: String, trim: true, maxlength: 200 }, // top recommended crystal, if applicable
  matchScore: { type: Number }, // compatibility score, when the source tool computed one (mobile, crystal, relationship)

  // Consolidated case fields -- populated by the "New Case" guided wizard,
  // which walks through several tools for one client in sequence. Each is
  // optional since every step in the wizard can be skipped.
  correctedNameSuggestion: { type: String, trim: true, maxlength: 120 },
  mobileNumberChecked: { type: String, trim: true, maxlength: 20 },
  mobileAnalysisLabel: { type: String, trim: true, maxlength: 40 },
  businessNameChecked: { type: String, trim: true, maxlength: 120 },
  businessNameScore: { type: Number },
  genericNumberType: { type: String, trim: true, maxlength: 20 },
  genericNumberValue: { type: String, trim: true, maxlength: 40 },
  relationshipPersonBName: { type: String, trim: true, maxlength: 120 },
  relationshipScore: { type: Number },

  autoSummary: { type: String, trim: true, maxlength: 500 }, // auto-generated, regenerated on save
  userNotes: { type: String, trim: true, maxlength: 2000, default: '' }, // person's own editable notes

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SavedProfileSchema.index({ createdAt: -1 });
SavedProfileSchema.index({ driverNumber: 1 });
SavedProfileSchema.index({ conductorNumber: 1 });

module.exports = mongoose.model('SavedProfile', SavedProfileSchema);
