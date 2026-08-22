const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const BookChunk = require('../models/BookChunk');
const { extractPdfPages } = require('../utils/pdfExtractor');
const { requireAdmin } = require('../utils/adminAuth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'books');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB — generous for a scanned book, still bounded
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are supported right now. EPUB support may be added later.'));
    }
    cb(null, true);
  },
});

// POST /api/books — upload and index a book (admin only)
router.post('/', requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const { title, author, edition } = req.body;
    if (!title || !title.trim()) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'A book title is required.' });
    }

    let book;
    try {
      const buffer = fs.readFileSync(req.file.path);
      const { pages, numPages } = await extractPdfPages(buffer);

      if (numPages === 0 || pages.every((p) => !p.trim())) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'No extractable text was found in this PDF. It may be a scanned image without OCR text — those aren\u2019t supported yet.' });
      }

      book = await Book.create({
        title: title.trim(),
        author: (author || '').trim() || undefined,
        edition: (edition || '').trim() || undefined,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        pageCount: numPages,
      });

      const chunkDocs = pages
        .map((text, i) => ({ bookId: book._id, bookTitle: book.title, bookAuthor: book.author, page: i + 1, text: text.trim() }))
        .filter((c) => c.text.length > 0);

      if (chunkDocs.length > 0) {
        await BookChunk.insertMany(chunkDocs);
      }

      res.status(201).json({ id: book._id, title: book.title, author: book.author, pageCount: numPages, chunksIndexed: chunkDocs.length });
    } catch (err) {
      console.error('Book upload failed:', err.message);
      fs.unlink(req.file.path, () => {});
      if (book) await Book.deleteOne({ _id: book._id }).catch(() => {});
      res.status(500).json({ error: 'Could not process this PDF. It may be corrupted or in an unsupported format.' });
    }
  });
});

// GET /api/books — list uploaded books (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const books = await Book.find().sort({ uploadedAt: -1 }).select('title author edition pageCount uploadedAt');
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch book list.' });
  }
});

// DELETE /api/books/:id — remove a book and its indexed content (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    await BookChunk.deleteMany({ bookId: book._id });
    const filePath = path.join(UPLOAD_DIR, book.filename);
    fs.unlink(filePath, () => {}); // best-effort; don't fail the request if this errors
    await Book.deleteOne({ _id: book._id });

    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete this book.' });
  }
});

module.exports = router;
