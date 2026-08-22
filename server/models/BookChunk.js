const mongoose = require('mongoose');

// One record per page of extracted text. Book title/author are denormalized
// here (duplicated from Book) so every search result can show a citation
// without an extra lookup — this is a searchable index, not the book itself.
const BookChunkSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  bookTitle: { type: String, required: true },
  bookAuthor: { type: String },
  page: { type: Number, required: true },
  text: { type: String, required: true },
});

BookChunkSchema.index({ bookId: 1, page: 1 });
BookChunkSchema.index({ text: 'text' });

module.exports = mongoose.model('BookChunk', BookChunkSchema);
