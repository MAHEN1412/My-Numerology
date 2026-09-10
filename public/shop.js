/**
 * Shop widget — shared between the standalone client-facing page
 * (shop.html, linked directly to clients) and the "Shop" tab inside the
 * main practitioner app (index.html), so both stay in sync automatically
 * and there's only one place to fix bugs or add features.
 *
 * Usage: NumerologyShop.init('containerElementId')
 *
 * Cart state persists in localStorage so a client doesn't lose their
 * selections on an accidental reload.
 */
(function () {
  const CART_KEY = 'numerologyShopCart';
  const CATEGORY_LABELS = { crystal: 'Crystals', book: 'Books', pen: 'Pens', other: 'Other' };
  const CATEGORY_ORDER = ['crystal', 'book', 'pen', 'other'];

  let injectedStyles = false;
  function injectStyles() {
    if (injectedStyles) return;
    injectedStyles = true;
    const style = document.createElement('style');
    style.textContent = `
      .shop-root{font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--text,#0F172A);}
      .shop-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:20px;}
      .shop-chips{display:flex;flex-wrap:wrap;gap:8px;}
      .shop-chip{background:var(--surface,#fff);border:1px solid var(--border-strong,#CBD5E1);border-radius:20px;padding:7px 16px;font-size:13px;font-weight:600;color:var(--text-dim,#475569);cursor:pointer;font-family:inherit;}
      .shop-chip.active{background:var(--indigo,#5E0D69);color:#fff;border-color:var(--indigo,#5E0D69);}
      .shop-cart-btn{position:relative;background:var(--indigo,#5E0D69);color:#fff;border:none;border-radius:10px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;}
      .shop-cart-count{background:var(--gold,#CA8A04);color:#1a1a1a;border-radius:999px;min-width:20px;height:20px;padding:0 5px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;}
      .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;}
      .shop-card{background:var(--surface,#fff);border:1px solid var(--border,#E2E8F0);border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,0.03);display:flex;flex-direction:column;}
      .shop-card-img{width:100%;aspect-ratio:1/1;background:var(--navy-2,#F1F5F9);object-fit:cover;display:block;}
      .shop-card-img-placeholder{width:100%;aspect-ratio:1/1;background:var(--navy-2,#F1F5F9);display:flex;align-items:center;justify-content:center;color:var(--text-muted,#94A3B8);font-size:12px;}
      .shop-card-body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1;}
      .shop-card-cat{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#CA8A04);}
      .shop-card-name{font-size:14px;font-weight:700;margin:0;color:var(--text,#0F172A);}
      .shop-card-desc{font-size:12px;color:var(--text-dim,#475569);flex:1;margin:0;line-height:1.5;}
      .shop-card-price{font-size:16px;font-weight:800;color:var(--indigo,#5E0D69);margin-top:4px;}
      .shop-card-oos{font-size:11px;color:var(--danger,#DC2626);font-weight:700;}
      .shop-card-actions{margin-top:8px;}
      .shop-btn{background:var(--indigo,#5E0D69);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;width:100%;font-family:inherit;}
      .shop-btn:hover:not(:disabled){opacity:.92;}
      .shop-btn:disabled{opacity:.5;cursor:default;}
      .shop-btn.ghost{background:var(--surface-2,#F3E8F5);color:var(--indigo,#5E0D69);}
      .shop-qty-row{display:flex;align-items:center;gap:10px;width:100%;}
      .shop-qty-row button{background:var(--navy-2,#F1F5F9);border:1px solid var(--border-strong,#CBD5E1);border-radius:6px;width:30px;height:30px;font-size:16px;font-weight:700;cursor:pointer;color:var(--text,#0F172A);}
      .shop-qty-row span{font-size:14px;font-weight:700;min-width:20px;text-align:center;}
      .shop-empty{font-size:13px;color:var(--text-muted,#94A3B8);padding:40px 0;text-align:center;}
      .shop-overlay{position:fixed;inset:0;background:rgba(6,7,15,0.6);display:none;align-items:center;justify-content:center;z-index:200;padding:16px;}
      .shop-overlay.open{display:flex;}
      .shop-panel{background:var(--navy,#F8FAFC);border-radius:14px;max-width:480px;width:100%;max-height:88vh;overflow-y:auto;border:1px solid var(--border-strong,#CBD5E1);}
      .shop-panel-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border,#E2E8F0);position:sticky;top:0;background:var(--navy,#F8FAFC);}
      .shop-panel-title{font-size:16px;font-weight:800;margin:0;}
      .shop-panel-close{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--text-dim,#475569);padding:4px 8px;}
      .shop-panel-body{padding:16px 20px 20px;}
      .shop-cart-item{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border,#E2E8F0);}
      .shop-cart-item-name{font-size:13px;font-weight:700;flex:1;}
      .shop-cart-item-price{font-size:12px;color:var(--text-dim,#475569);}
      .shop-cart-remove{background:none;border:none;color:var(--danger,#DC2626);font-size:12px;cursor:pointer;font-weight:600;}
      .shop-cart-total{display:flex;justify-content:space-between;padding:14px 0 4px;font-size:15px;font-weight:800;}
      .shop-field{margin-bottom:14px;}
      .shop-field label{display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text,#0F172A);}
      .shop-field input,.shop-field textarea{width:100%;background:var(--navy-2,#F1F5F9);border:1px solid var(--border-strong,#CBD5E1);border-radius:9px;padding:10px 12px;font-size:14px;font-family:inherit;color:var(--text,#0F172A);}
      .shop-field textarea{resize:vertical;min-height:60px;}
      .shop-err{color:var(--danger,#DC2626);font-size:12px;margin-top:8px;display:none;}
      .shop-err.show{display:block;}
      .shop-success{text-align:center;padding:24px 8px;}
      .shop-success h3{margin:0 0 8px;font-size:18px;}
      .shop-success p{font-size:13px;color:var(--text-dim,#475569);margin:0 0 4px;}
      .shop-loading{font-size:13px;color:var(--text-dim,#475569);padding:30px 0;text-align:center;}
    `;
    document.head.appendChild(style);
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
  }

  function formatMoney(amount, currency) {
    const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ');
    return symbol + Number(amount).toLocaleString('en-IN');
  }

  function mount(containerId) {
    injectStyles();
    const root = document.getElementById(containerId);
    if (!root) return;

    let products = [];
    let activeCategory = '';
    let cart = readCart();

    root.innerHTML = `
      <div class="shop-root">
        <div class="shop-toolbar">
          <div class="shop-chips" id="${containerId}_chips"></div>
          <button type="button" class="shop-cart-btn" id="${containerId}_cartBtn">
            Cart <span class="shop-cart-count" id="${containerId}_cartCount">0</span>
          </button>
        </div>
        <div id="${containerId}_grid"><p class="shop-loading">Loading products…</p></div>
      </div>
      <div class="shop-overlay" id="${containerId}_cartOverlay">
        <div class="shop-panel">
          <div class="shop-panel-header">
            <h3 class="shop-panel-title">Your cart</h3>
            <button type="button" class="shop-panel-close" data-close-cart>&times;</button>
          </div>
          <div class="shop-panel-body" id="${containerId}_cartBody"></div>
        </div>
      </div>
      <div class="shop-overlay" id="${containerId}_orderOverlay">
        <div class="shop-panel">
          <div class="shop-panel-header">
            <h3 class="shop-panel-title">Order request</h3>
            <button type="button" class="shop-panel-close" data-close-order>&times;</button>
          </div>
          <div class="shop-panel-body" id="${containerId}_orderBody"></div>
        </div>
      </div>
    `;

    const chipsEl = document.getElementById(`${containerId}_chips`);
    const gridEl = document.getElementById(`${containerId}_grid`);
    const cartBtn = document.getElementById(`${containerId}_cartBtn`);
    const cartCountEl = document.getElementById(`${containerId}_cartCount`);
    const cartOverlay = document.getElementById(`${containerId}_cartOverlay`);
    const cartBody = document.getElementById(`${containerId}_cartBody`);
    const orderOverlay = document.getElementById(`${containerId}_orderOverlay`);
    const orderBody = document.getElementById(`${containerId}_orderBody`);

    function cartItemCount() {
      return Object.values(cart).reduce((sum, it) => sum + it.quantity, 0);
    }

    function updateCartCount() {
      cartCountEl.textContent = cartItemCount();
    }

    function setQuantity(product, qty) {
      if (qty <= 0) {
        delete cart[product.id];
      } else {
        cart[product.id] = { id: product.id, name: product.name, price: product.price, currency: product.currency, quantity: qty };
      }
      writeCart(cart);
      updateCartCount();
      renderGrid();
    }

    function renderChips() {
      const cats = CATEGORY_ORDER.filter((c) => products.some((p) => p.category === c));
      chipsEl.innerHTML = '';
      const allChip = document.createElement('button');
      allChip.type = 'button';
      allChip.className = 'shop-chip' + (activeCategory === '' ? ' active' : '');
      allChip.textContent = 'All';
      allChip.addEventListener('click', () => { activeCategory = ''; renderChips(); renderGrid(); });
      chipsEl.appendChild(allChip);
      cats.forEach((c) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'shop-chip' + (activeCategory === c ? ' active' : '');
        chip.textContent = CATEGORY_LABELS[c] || c;
        chip.addEventListener('click', () => { activeCategory = c; renderChips(); renderGrid(); });
        chipsEl.appendChild(chip);
      });
    }

    function renderGrid() {
      const visible = activeCategory ? products.filter((p) => p.category === activeCategory) : products;
      if (visible.length === 0) {
        gridEl.innerHTML = '<p class="shop-empty">No products here yet.</p>';
        return;
      }
      gridEl.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'shop-grid';
      visible.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'shop-card';
        const img = p.imageUrl
          ? `<img class="shop-card-img" src="${p.imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy">`
          : `<div class="shop-card-img-placeholder">No photo</div>`;
        const inCart = cart[p.id];
        card.innerHTML = `
          ${img}
          <div class="shop-card-body">
            <span class="shop-card-cat">${CATEGORY_LABELS[p.category] || p.category}</span>
            <p class="shop-card-name">${escapeHtml(p.name)}</p>
            ${p.description ? `<p class="shop-card-desc">${escapeHtml(p.description)}</p>` : '<div style="flex:1;"></div>'}
            <div class="shop-card-price">${formatMoney(p.price, p.currency)}</div>
            ${!p.inStock ? '<span class="shop-card-oos">Out of stock</span>' : ''}
            <div class="shop-card-actions"></div>
          </div>
        `;
        const actions = card.querySelector('.shop-card-actions');
        if (!p.inStock) {
          const btn = document.createElement('button');
          btn.className = 'shop-btn';
          btn.disabled = true;
          btn.textContent = 'Out of stock';
          actions.appendChild(btn);
        } else if (inCart) {
          const row = document.createElement('div');
          row.className = 'shop-qty-row';
          row.innerHTML = `<button type="button" data-dec>−</button><span>${inCart.quantity}</span><button type="button" data-inc>+</button>`;
          row.querySelector('[data-dec]').addEventListener('click', () => setQuantity(p, inCart.quantity - 1));
          row.querySelector('[data-inc]').addEventListener('click', () => setQuantity(p, inCart.quantity + 1));
          actions.appendChild(row);
        } else {
          const btn = document.createElement('button');
          btn.className = 'shop-btn';
          btn.textContent = 'Add to cart';
          btn.addEventListener('click', () => setQuantity(p, 1));
          actions.appendChild(btn);
        }
        grid.appendChild(card);
      });
      gridEl.innerHTML = '';
      gridEl.appendChild(grid);
    }

    function renderCartPanel() {
      const items = Object.values(cart);
      if (items.length === 0) {
        cartBody.innerHTML = '<p class="shop-empty">Your cart is empty.</p>';
        return;
      }
      let total = 0;
      let currency = items[0].currency || 'INR';
      const rows = items.map((it) => {
        total += it.price * it.quantity;
        return `
          <div class="shop-cart-item">
            <div style="flex:1;">
              <div class="shop-cart-item-name">${escapeHtml(it.name)}</div>
              <div class="shop-cart-item-price">${formatMoney(it.price, it.currency)} &times; ${it.quantity}</div>
            </div>
            <button type="button" class="shop-cart-remove" data-remove="${it.id}">Remove</button>
          </div>
        `;
      }).join('');
      cartBody.innerHTML = `
        ${rows}
        <div class="shop-cart-total"><span>Total</span><span>${formatMoney(total, currency)}</span></div>
        <button type="button" class="shop-btn" id="${containerId}_checkoutBtn" style="margin-top:10px;">Request this order</button>
      `;
      cartBody.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          delete cart[btn.dataset.remove];
          writeCart(cart);
          updateCartCount();
          renderCartPanel();
          renderGrid();
        });
      });
      document.getElementById(`${containerId}_checkoutBtn`).addEventListener('click', () => {
        cartOverlay.classList.remove('open');
        openOrderForm();
      });
    }

    function openOrderForm() {
      const items = Object.values(cart);
      if (items.length === 0) return;
      let total = 0;
      const currency = items[0].currency || 'INR';
      items.forEach((it) => { total += it.price * it.quantity; });

      orderBody.innerHTML = `
        <p style="font-size:13px;color:var(--text-dim,#475569);margin-top:0;">
          ${items.length} item${items.length > 1 ? 's' : ''} &middot; ${formatMoney(total, currency)} total.
          We'll contact you to confirm and arrange payment.
        </p>
        <div class="shop-field">
          <label for="${containerId}_ofName">Your name</label>
          <input type="text" id="${containerId}_ofName" autocomplete="name">
        </div>
        <div class="shop-field">
          <label for="${containerId}_ofPhone">Phone number</label>
          <input type="tel" id="${containerId}_ofPhone" autocomplete="tel">
        </div>
        <div class="shop-field">
          <label for="${containerId}_ofEmail">Email <span style="color:var(--text-muted,#94A3B8);font-weight:400;">(optional)</span></label>
          <input type="email" id="${containerId}_ofEmail" autocomplete="email">
        </div>
        <div class="shop-field">
          <label for="${containerId}_ofNote">Note <span style="color:var(--text-muted,#94A3B8);font-weight:400;">(optional)</span></label>
          <textarea id="${containerId}_ofNote" placeholder="Delivery address, preferred contact time, etc."></textarea>
        </div>
        <div class="shop-err" id="${containerId}_ofErr"></div>
        <button type="button" class="shop-btn" id="${containerId}_ofSubmit">Submit order request</button>
      `;
      orderOverlay.classList.add('open');

      document.getElementById(`${containerId}_ofSubmit`).addEventListener('click', async () => {
        const nameEl = document.getElementById(`${containerId}_ofName`);
        const phoneEl = document.getElementById(`${containerId}_ofPhone`);
        const emailEl = document.getElementById(`${containerId}_ofEmail`);
        const noteEl = document.getElementById(`${containerId}_ofNote`);
        const errEl = document.getElementById(`${containerId}_ofErr`);
        const btn = document.getElementById(`${containerId}_ofSubmit`);
        errEl.classList.remove('show');

        if (!nameEl.value.trim()) { errEl.textContent = 'Please enter your name.'; errEl.classList.add('show'); return; }
        if (!phoneEl.value.trim()) { errEl.textContent = 'Please enter a phone number.'; errEl.classList.add('show'); return; }

        btn.disabled = true; btn.textContent = 'Submitting…';
        try {
          const res = await fetch('/api/shop/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: Object.values(cart).map((it) => ({ productId: it.id, quantity: it.quantity })),
              customerName: nameEl.value.trim(),
              customerPhone: phoneEl.value.trim(),
              customerEmail: emailEl.value.trim(),
              note: noteEl.value.trim(),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            errEl.textContent = data.error || 'Could not submit your order.';
            errEl.classList.add('show');
            btn.disabled = false; btn.textContent = 'Submit order request';
            return;
          }
          cart = {};
          writeCart(cart);
          updateCartCount();
          renderGrid();
          orderBody.innerHTML = `
            <div class="shop-success">
              <h3>Request received</h3>
              <p>Thank you, ${escapeHtml(nameEl.value.trim())}.</p>
              <p>We'll reach out on ${escapeHtml(phoneEl.value.trim())} shortly to confirm your order and arrange payment.</p>
            </div>
          `;
        } catch (err) {
          errEl.textContent = 'Could not reach the server. Please try again.';
          errEl.classList.add('show');
          btn.disabled = false; btn.textContent = 'Submit order request';
        }
      });
    }

    cartBtn.addEventListener('click', () => {
      renderCartPanel();
      cartOverlay.classList.add('open');
    });
    document.getElementById(`${containerId}_cartOverlay`).addEventListener('click', (e) => {
      if (e.target.closest('[data-close-cart]') || e.target === cartOverlay) cartOverlay.classList.remove('open');
    });
    document.getElementById(`${containerId}_orderOverlay`).addEventListener('click', (e) => {
      if (e.target.closest('[data-close-order]') || e.target === orderOverlay) orderOverlay.classList.remove('open');
    });

    updateCartCount();

    fetch('/api/shop/products')
      .then((res) => res.json())
      .then((data) => {
        products = data.products || [];
        renderChips();
        renderGrid();
      })
      .catch(() => {
        gridEl.innerHTML = '<p class="shop-empty">Could not load the shop right now. Please refresh.</p>';
      });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NumerologyShop = { init: mount };
})();
