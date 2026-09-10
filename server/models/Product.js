const mongoose = require('mongoose');

/**
 * A product in the practitioner's shop (crystals, books, pens, and other
 * items sold alongside readings). Deliberately simple — no inventory
 * ledger, no variants — just enough to list items with a photo and price,
 * and let clients submit an order request against them.
 */
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  category: {
    type: String,
    required: true,
    enum: ['crystal', 'book', 'pen', 'other'],
    default: 'other',
  },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', trim: true, maxlength: 8 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  // Either an uploaded file's served path (/product-images/xyz.jpg) or a
  // pasted external URL — either way just a plain string here.
  imageUrl: { type: String, trim: true, default: '' },
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProductSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
