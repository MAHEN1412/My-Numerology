const mongoose = require('mongoose');

/**
 * An order REQUEST submitted from the Shop page — not a paid order. The
 * client picks items and leaves contact details; the practitioner follows
 * up (via phone/WhatsApp/email) to confirm items, arrange payment, and
 * fulfill it. Status tracks that manual follow-up, it doesn't reflect a
 * payment gateway state (there isn't one).
 */
const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  quantity: { type: Number, required: true, min: 1, max: 999 },
}, { _id: false });

const ShopOrderSchema = new mongoose.Schema({
  items: {
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.length <= 50,
      message: 'An order must contain between 1 and 50 items.',
    },
  },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  customerName: { type: String, required: true, trim: true, maxlength: 200 },
  customerPhone: { type: String, required: true, trim: true, maxlength: 40 },
  customerEmail: { type: String, trim: true, maxlength: 200, default: '' },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  status: {
    type: String,
    enum: ['new', 'contacted', 'fulfilled', 'cancelled'],
    default: 'new',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ShopOrder', ShopOrderSchema);
