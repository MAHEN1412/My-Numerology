const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const ShopOrder = require('../models/ShopOrder');
const { requireAdmin, isAuthenticated } = require('../utils/adminAuth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — a product photo, not a scan
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are supported.'));
    }
    cb(null, true);
  },
});

const CATEGORIES = ['crystal', 'book', 'pen', 'other'];

function serializeProduct(p) {
  return {
    id: p._id,
    name: p.name,
    category: p.category,
    price: p.price,
    currency: p.currency,
    description: p.description,
    imageUrl: p.imageUrl,
    inStock: p.inStock,
    featured: p.featured,
    sortOrder: p.sortOrder,
  };
}

// ---------------------------------------------------------------------
// Public: browse products
// ---------------------------------------------------------------------

// GET /api/shop/products — public catalog. Only in-stock items, unless
// the caller has an admin session and explicitly asks for everything
// (the admin panel's product list needs to see out-of-stock items too).
router.get('/products', async (req, res) => {
  try {
    const showAll = req.query.all === '1' && isAuthenticated(req);
    const filter = showAll ? {} : { inStock: true };
    const products = await Product.find(filter).sort({ featured: -1, sortOrder: 1, createdAt: -1 });
    res.json({ products: products.map(serializeProduct) });
  } catch (err) {
    console.error('Failed to load products:', err.message);
    res.status(500).json({ error: 'Could not load the shop right now.' });
  }
});

// ---------------------------------------------------------------------
// Admin: manage products
// ---------------------------------------------------------------------

// POST /api/shop/products — create a product (admin only)
router.post('/products', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message || 'Image upload failed.' });

    const { name, category, price, currency, description, imageUrl, inStock, featured, sortOrder } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required.' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Category must be one of: ' + CATEGORIES.join(', ') });
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Enter a valid price.' });

    let finalImageUrl = '';
    if (req.file) {
      finalImageUrl = `/product-images/${req.file.filename}`;
    } else if (imageUrl && imageUrl.trim()) {
      finalImageUrl = imageUrl.trim();
    }

    try {
      const product = await Product.create({
        name: name.trim(),
        category,
        price: priceNum,
        currency: (currency || 'INR').trim() || 'INR',
        description: (description || '').trim(),
        imageUrl: finalImageUrl,
        inStock: inStock === undefined ? true : inStock === 'true' || inStock === true,
        featured: featured === 'true' || featured === true,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      });
      res.status(201).json({ product: serializeProduct(product) });
    } catch (err) {
      console.error('Failed to create product:', err.message);
      res.status(500).json({ error: 'Could not save this product.' });
    }
  });
});

// PUT /api/shop/products/:id — update a product (admin only)
router.put('/products/:id', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message || 'Image upload failed.' });

    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found.' });

      const { name, category, price, currency, description, imageUrl, inStock, featured, sortOrder, removeImage } = req.body;

      if (name !== undefined) {
        if (!name.trim()) return res.status(400).json({ error: 'Product name cannot be empty.' });
        product.name = name.trim();
      }
      if (category !== undefined) {
        if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Category must be one of: ' + CATEGORIES.join(', ') });
        product.category = category;
      }
      if (price !== undefined) {
        const priceNum = Number(price);
        if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Enter a valid price.' });
        product.price = priceNum;
      }
      if (currency !== undefined) product.currency = currency.trim() || 'INR';
      if (description !== undefined) product.description = description.trim();
      if (inStock !== undefined) product.inStock = inStock === 'true' || inStock === true;
      if (featured !== undefined) product.featured = featured === 'true' || featured === true;
      if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) product.sortOrder = Number(sortOrder);

      const oldImagePath = product.imageUrl && product.imageUrl.startsWith('/product-images/')
        ? path.join(UPLOAD_DIR, path.basename(product.imageUrl))
        : null;

      if (req.file) {
        product.imageUrl = `/product-images/${req.file.filename}`;
        if (oldImagePath) fs.unlink(oldImagePath, () => {});
      } else if (removeImage === 'true') {
        product.imageUrl = '';
        if (oldImagePath) fs.unlink(oldImagePath, () => {});
      } else if (imageUrl !== undefined && imageUrl.trim()) {
        product.imageUrl = imageUrl.trim();
      }

      await product.save();
      res.json({ product: serializeProduct(product) });
    } catch (err) {
      console.error('Failed to update product:', err.message);
      res.status(400).json({ error: 'Could not update this product.' });
    }
  });
});

// DELETE /api/shop/products/:id — remove a product (admin only)
router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    if (product.imageUrl && product.imageUrl.startsWith('/product-images/')) {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(product.imageUrl)), () => {});
    }
    await Product.deleteOne({ _id: product._id });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete this product.' });
  }
});

// ---------------------------------------------------------------------
// Orders — public submits a request, admin reviews/manages them
// ---------------------------------------------------------------------

// POST /api/shop/orders — public: submit an order request. Prices/names
// are re-read from the database rather than trusted from the client, so a
// tampered request body can't misstate what something costs.
router.post('/orders', async (req, res) => {
  try {
    const { items, customerName, customerPhone, customerEmail, note } = req.body;

    if (!customerName || !customerName.trim()) return res.status(400).json({ error: 'Your name is required.' });
    if (!customerPhone || !customerPhone.trim()) return res.status(400).json({ error: 'A phone number is required so we can reach you.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });
    if (items.length > 50) return res.status(400).json({ error: 'Too many distinct items in one order.' });

    const resolvedItems = [];
    for (const raw of items) {
      const qty = Math.max(1, Math.min(999, Math.round(Number(raw.quantity) || 1)));
      const product = await Product.findById(raw.productId);
      if (!product) return res.status(400).json({ error: `One of the items in your cart is no longer available.` });
      if (!product.inStock) return res.status(400).json({ error: `"${product.name}" is currently out of stock.` });
      resolvedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        quantity: qty,
      });
    }

    const totalAmount = resolvedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const currency = resolvedItems[0].currency || 'INR';

    const order = await ShopOrder.create({
      items: resolvedItems,
      totalAmount,
      currency,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      note: (note || '').trim(),
    });

    res.status(201).json({
      orderId: order._id,
      totalAmount: order.totalAmount,
      currency: order.currency,
      itemCount: resolvedItems.length,
    });
  } catch (err) {
    console.error('Failed to create order:', err.message);
    res.status(500).json({ error: 'Could not submit your order request. Please try again.' });
  }
});

// GET /api/shop/orders — admin: list order requests, newest first
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await ShopOrder.find().sort({ createdAt: -1 }).limit(500);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// PATCH /api/shop/orders/:id — admin: update an order's follow-up status
router.patch('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'contacted', 'fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const order = await ShopOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: 'Could not update this order.' });
  }
});

module.exports = router;
