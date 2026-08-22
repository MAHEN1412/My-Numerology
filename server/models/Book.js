const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  author: { type: String, trim: true, maxlength: 200 },
  edition: { type: String, trim: true, maxlength: 100 },
  filename: { type: String, required: true }, // stored filename on disk
  originalFilename: { type: String },
  pageCount: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Book', BookSchema);
