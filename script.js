const DEFAULT_CATEGORIES = [
  { id: 'nunta', label: 'Invitații Nuntă', icon: '💍' },
  { id: 'botez', label: 'Invitații Botez', icon: '👶' },
  { id: 'plic',  label: 'Plicuri',         icon: '✉️' },
];
const DEFAULT_PAPER_TYPES = [];

let currentFilter    = 'all';
let currentSubFilter = '';
let allProducts      = [];
let cachedCategories = DEFAULT_CATEGORIES;
let cachedPaperTypes = DEFAULT_PAPER_TYPES;
let productImagesMap = {};
let productsLoaded   = false;

// Lightbox
let lbImages = [];
let lbIndex  = 0;

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getProductImages(p) {
  if (p.images && p.images.length > 0) return p.images.filter(Boolean);
  if (p.image) return [p.image];
  return [];
}

/* ── CONFIG ── */
async function loadConfig() {
  try {
    const [catSnap, paperSnap, contactSnap] = await Promise.all([
      db.collection('config').doc('categories').get(),
      db.collection('config').doc('paperTypes').get(),
      db.collection('config').doc('contact').get(),
    ]);
    if (catSnap.exists)   cachedCategories = catSnap.data().items   ? [...catSnap.data().items]   : [...DEFAULT_CATEGORIES];
    if (paperSnap.exists) cachedPaperTypes = paperSnap.data().items ? [...paperSnap.data().items] : [...DEFAULT_PAPER_TYPES];
    const contact = contactSnap.exists ? contactSnap.data() : {};
    applyContactLinks(contact);
  } catch (e) { console.error('Config error:', e); }
  doRender();
}

function applyContactLinks(c) {
  const wa = document.getElementById('linkWA');
  const fb = document.getElementById('linkFB');
  const ig = document.getElementById('linkIG');
  if (wa && c.phone) {
    const num  = c.phone.replace(/\s+/g,'').replace(/[^0-9]/g,'');
    const intl = num.startsWith('0') ? '40' + num.slice(1) : num;
    wa.href = 'https://wa.me/' + intl;
  }
  if (fb && c.facebook)  fb.href = c.facebook;
  if (ig && c.instagram) ig.href = c.instagram;
}

/* ── RENDER ── */
function doRender() {
  buildFilterTabs();
  renderProducts();
}

function buildFilterTabs() {
  // Dacă filtrul curent nu există în categorii, setăm prima categorie
  if (currentFilter === 'all' || !cachedCategories.find(c => c.id === currentFilter)) {
    currentFilter    = cachedCategories.length > 0 ? cachedCategories[0].id : 'all';
    currentSubFilter = '';
  }

  const container = document.getElementById('filterTabs');
  container.innerHTML = cachedCategories.map(c =>
    `<button class="tab ${currentFilter === c.id ? 'active' : ''}" data-filter="${escHtml(c.id)}">${escHtml(c.label)}</button>`
  ).join('');

  container.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter    = btn.dataset.filter;
      currentSubFilter = '';
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      buildSubFilterTabs();
      renderProducts();
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  buildSubFilterTabs();
}

function buildSubFilterTabs() {
  const container = document.getElementById('subFilterTabs');
  if (!container) return;
  if (currentFilter === 'all') {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  const cat  = cachedCategories.find(c => c.id === currentFilter);
  const subs = cat?.subcategories || [];
  if (subs.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  if (!currentSubFilter) currentSubFilter = subs[0].id;

  container.style.display = 'flex';
  container.innerHTML = subs.map(s =>
    `<button class="sub-tab ${currentSubFilter === s.id ? 'active' : ''}" data-sub="${escHtml(s.id)}">${escHtml(s.label)}</button>`
  ).join('');
  container.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSubFilter = btn.dataset.sub;
      container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
      document.getElementById('filterTabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderProducts() {
  const grid   = document.getElementById('productsGrid');
  const catMap = Object.fromEntries(cachedCategories.map(c => [c.id, c]));
  const list   = currentFilter === 'all'
    ? allProducts
    : allProducts.filter(p => {
        if (p.category !== currentFilter) return false;
        if (currentSubFilter && p.subcategory !== currentSubFilter) return false;
        return true;
      });

  productImagesMap = {};

  if (list.length === 0) {
    grid.innerHTML = productsLoaded
      ? `<div class="empty-state"><p>Nu există produse în această categorie încă.</p></div>`
      : `<div class="loading-state"><div class="loading-spinner"></div><p>Se încarcă produsele...</p></div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const cat    = catMap[p.category] || { label: p.category, icon: '🎀', id: p.category };
    const images = getProductImages(p);
    productImagesMap[p.id] = images;

    const catData = cachedCategories.find(c => c.id === p.category);
    const subData = p.subcategory && catData?.subcategories
      ? catData.subcategories.find(s => s.id === p.subcategory)
      : null;
    let allowedExtras = null;
    if (subData && subData.allowedExtras !== undefined) allowedExtras = subData.allowedExtras;
    else if (catData && catData.allowedExtras !== undefined) allowedExtras = catData.allowedExtras;
    const visibleExtras = allowedExtras === null
      ? cachedPaperTypes
      : cachedPaperTypes.filter(t => allowedExtras.includes(t.id));
    const extraOptsHtml = visibleExtras.map(t =>
      `<label class="extra-opt">` +
      `<input type="checkbox" class="calc-extra" data-increase="${t.priceIncrease}" onchange="calcTotal(this.closest('.product-card'))" />` +
      `<span class="extra-opt-name">${escHtml(t.name)}</span>` +
      (t.priceIncrease > 0 ? `<span class="extra-price">(+${t.priceIncrease} lei/buc)</span>` : '') +
      `</label>`
    ).join('');

    let imgHtml;
    if (images.length > 0) {
      imgHtml = `
        <div class="product-img-wrap" onclick="openLightbox('${escHtml(p.id)}')">
          <img class="product-card-img" src="${images[0]}" alt="${escHtml(p.name)}" loading="lazy" />
          ${images.length > 1 ? `<span class="img-count">📷 ${images.length}</span>` : ''}
        </div>`;
    } else {
      imgHtml = `<div class="product-img-placeholder">${cat.icon}</div>`;
    }

    const descHtml = p.description
      ? `<p class="product-desc">${escHtml(p.description)}</p>` : '';

    return `
      <div class="product-card">
        ${imgHtml}
        <div class="product-card-body">
          <span class="product-badge badge-custom" style="background:${catColor(cat.id,0.12)};color:${catColor(cat.id,1)}">${escHtml(cat.label)}</span>
          <div class="product-name">${escHtml(p.name)}</div>
          ${descHtml}
          <div class="product-footer">
            <div class="product-price">${escHtml(String(p.price))} lei <span class="unit">/ buc</span></div>
            <button class="btn-add-cart" onclick="addToCart('${escHtml(p.id)}', this.closest('.product-card'))">Adaugă în coș</button>
          </div>
          <div class="calc-section">
            <div class="calc-row">
              <div class="calc-field">
                <label class="calc-label">Nr. invitații</label>
                <input type="number" class="calc-qty" min="1" value="1"
                       data-base="${escHtml(String(p.price))}"
                       oninput="calcTotal(this.closest('.product-card'))" />
              </div>
            </div>
            ${extraOptsHtml ? `<div class="calc-extras"><label class="calc-label">Extra opțiuni</label><div class="extras-list">${extraOptsHtml}</div></div>` : ''}
            <div class="calc-total">Total estimat: <strong class="calc-total-val">— lei</strong></div>
          </div>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.product-card').forEach(card => calcTotal(card));
}

function calcTotal(card) {
  const qty  = Math.max(1, parseInt(card.querySelector('.calc-qty').value) || 1);
  const base = parseFloat(card.querySelector('.calc-qty').dataset.base) || 0;
  let extraTotal = 0;
  card.querySelectorAll('.calc-extra:checked').forEach(cb => {
    extraTotal += parseFloat(cb.dataset.increase || '0') || 0;
  });
  card.querySelector('.calc-total-val').textContent = ((base + extraTotal) * qty).toFixed(2) + ' lei';
}

function catColor(id, alpha) {
  const colors = {
    nunta: `rgba(201,98,122,${alpha})`,
    botez: `rgba(74,120,201,${alpha})`,
    plic:  `rgba(201,160,70,${alpha})`,
  };
  if (colors[id]) return colors[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsla(${h},55%,${alpha < 1 ? 92 : 38}%,${alpha})`;
}

/* ── LIGHTBOX ── */
function openLightbox(productId) {
  const images = productImagesMap[productId] || [];
  if (images.length === 0) return;
  lbImages = images;
  lbIndex  = 0;
  updateLightbox();
  document.getElementById('lightbox').classList.add('lb-active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  if (e && e.target.id !== 'lightbox' && !e.target.classList.contains('lb-close')) return;
  document.getElementById('lightbox').classList.remove('lb-active');
  document.body.style.overflow = '';
}

function lbNav(dir) {
  if (lbImages.length < 2) return;
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  updateLightbox();
}

function lbGoTo(i) {
  lbIndex = i;
  updateLightbox();
}

function updateLightbox() {
  document.getElementById('lbImg').src = lbImages[lbIndex];
  const show = lbImages.length > 1;
  document.getElementById('lbPrev').style.display = show ? 'flex' : 'none';
  document.getElementById('lbNext').style.display = show ? 'flex' : 'none';
  document.getElementById('lbDots').innerHTML = show
    ? lbImages.map((_, i) =>
        `<span class="lb-dot ${i === lbIndex ? 'active' : ''}" onclick="lbGoTo(${i})"></span>`
      ).join('')
    : '';
}

// Taste săgeți + Escape
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('lb-active')) return;
  if (e.key === 'Escape')    closeLightbox();
  if (e.key === 'ArrowLeft') lbNav(-1);
  if (e.key === 'ArrowRight') lbNav(1);
});

// Swipe mobil
(function () {
  let startX = 0;
  document.addEventListener('touchstart', e => {
    if (!document.getElementById('lightbox').classList.contains('lb-active')) return;
    startX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!document.getElementById('lightbox').classList.contains('lb-active')) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) lbNav(diff > 0 ? 1 : -1);
  }, { passive: true });
})();

/* ── FEEDBACK ── */
let selectedRating = 0;

function initStarRating() {
  const stars = document.querySelectorAll('#starRating .star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.val)));
    star.addEventListener('mouseout',  () => highlightStars(selectedRating));
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.val);
      highlightStars(selectedRating);
    });
  });
}

function highlightStars(n) {
  document.querySelectorAll('#starRating .star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}

function renderFeedback(list) {
  const grid = document.getElementById('feedbackGrid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="fb-empty">Niciun feedback încă. Fii primul care lasă o părere! ✨</div>';
    return;
  }
  grid.innerHTML = list.map(f => {
    const rating  = Math.min(5, Math.max(0, parseInt(f.rating) || 5));
    const filled  = '<span class="star-filled">' + '★'.repeat(rating) + '</span>';
    const empty   = rating < 5 ? '<span class="star-empty">' + '☆'.repeat(5 - rating) + '</span>' : '';
    return `
      <div class="feedback-card">
        <span class="fb-quote">❝</span>
        <p class="fb-message">${escHtml(f.message)}</p>
        <div class="fb-stars">${filled}${empty}</div>
        <div class="fb-author">— ${escHtml(f.name)}</div>
      </div>`;
  }).join('');
}

async function submitFeedback() {
  const name    = document.getElementById('fbName').value.trim();
  const message = document.getElementById('fbMessage').value.trim();
  if (!name)              { alert('Te rog introdu numele tău.');          return; }
  if (!message)           { alert('Te rog lasă un mesaj.');               return; }
  if (selectedRating === 0) { alert('Te rog selectează o notă (stele).'); return; }

  const btn = document.querySelector('.btn-fb-submit');
  btn.disabled = true; btn.textContent = 'Se trimite...';

  try {
    await db.collection('feedback').add({
      name, message, rating: selectedRating,
      createdAt: new Date().toISOString(),
    });
    document.getElementById('fbName').value    = '';
    document.getElementById('fbMessage').value = '';
    selectedRating = 0;
    highlightStars(0);
    const ok = document.getElementById('fbSuccess');
    ok.style.display = 'block';
    setTimeout(() => { ok.style.display = 'none'; }, 5000);
  } catch (e) {
    alert('Eroare la trimitere. Încearcă din nou.');
    console.error('submitFeedback:', e);
  } finally {
    btn.disabled = false; btn.textContent = 'Trimite Feedback';
  }
}

db.collection('feedback').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  renderFeedback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
}, err => console.error('Feedback listener:', err));

/* ── NAVIGARE SECȚIUNI ── */
const PAGE_SECTIONS = {
  acasa:    ['acasa', 'contact'],
  produse:  ['produse'],
  culori:   ['culori'],
  feedback: ['feedback'],
  contact:  ['contact'],
  despre:   ['despre'],
};

function showPage(page) {
  const toShow = new Set(PAGE_SECTIONS[page] || [page]);
  document.querySelectorAll('section[data-page]').forEach(el => {
    const pages = el.dataset.page.trim().split(/\s+/);
    el.style.display = pages.some(p => toShow.has(p)) ? '' : 'none';
  });
  document.querySelectorAll('.nav-row a[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-row a[data-page]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    showPage(a.dataset.page);
  });
});

showPage('acasa');

/* ── SCROLL COMPACT HEADER ── */
(function () {
  const header = document.querySelector('header');
  function onFirstScroll() {
    if (window.scrollY > 5) {
      header.classList.add('compact');
      window.removeEventListener('scroll', onFirstScroll);
    }
  }
  window.addEventListener('scroll', onFirstScroll, { passive: true });
})();

/* ── INIT ── */
db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  productsLoaded = true;
  allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}, err => console.error('Products listener:', err));

loadConfig();
initStarRating();


/* ══════════════════════════════
   COȘ DE CUMPĂRĂTURI
══════════════════════════════ */

let cart = [];

function addToCart(productId, card) {
  const p = allProducts.find(p => p.id === productId);
  if (!p) return;

  const qty    = Math.max(1, parseInt(card.querySelector('.calc-qty').value) || 1);
  const extras = [...card.querySelectorAll('.calc-extra:checked')].map(cb => ({
    name: cb.closest('label').querySelector('.extra-opt-name').textContent.trim(),
    priceIncrease: parseFloat(cb.dataset.increase) || 0,
  }));
  const unitPrice = (parseFloat(p.price) || 0) + extras.reduce((s, e) => s + e.priceIncrease, 0);

  const key      = productId + JSON.stringify(extras);
  const existing = cart.find(item => item.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, productId, name: p.name, category: p.category, subcategory: p.subcategory || '', basePrice: parseFloat(p.price) || 0, extras, unitPrice, qty });
  }

  updateCartBadge();
  showPublicToast(`"${p.name}" adăugat în coș!`);
  document.getElementById('cartFab').style.display = 'flex';
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartBadge();
  renderCart();
  if (cart.length === 0) document.getElementById('cartFab').style.display = 'none';
}

function updateCartQty(index, value) {
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, parseInt(value) || 1);
  refreshCartPrices();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const count = cart.reduce((s, item) => s + item.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function openCart() {
  renderCart();
  document.getElementById('cartModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeCartOnOverlay(e) {
  if (e.target.id === 'cartModal') closeCart();
}

function renderCart() {
  const el     = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (cart.length === 0) {
    el.innerHTML = '<div class="cart-empty">Coșul tău este gol.<br>Adaugă produse pentru a continua. ✨</div>';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  el.innerHTML = cart.map((item, i) => {
    const extrasStr = item.extras.map(e => e.name + (e.priceIncrease > 0 ? ` (+${e.priceIncrease} lei)` : '')).join(', ');
    return `
      <div class="cart-item">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        ${extrasStr ? `<div class="cart-item-extras">${escHtml(extrasStr)}</div>` : ''}
        <div class="cart-item-controls">
          <input type="number" class="cart-qty-input" value="${item.qty}" min="1"
                 onchange="updateCartQty(${i}, this.value)" oninput="refreshCartPrices()" />
          <span class="cart-item-price" id="cartItemPrice_${i}">${(item.unitPrice * item.qty).toFixed(2)} lei</span>
          <button class="cart-remove" onclick="removeFromCart(${i})">✕</button>
        </div>
      </div>`;
  }).join('');
  refreshCartPrices();
}

function refreshCartPrices() {
  cart.forEach((item, i) => {
    const inp = document.querySelector(`#cartItems .cart-item:nth-child(${i+1}) .cart-qty-input`);
    if (inp) item.qty = Math.max(1, parseInt(inp.value) || 1);
    const priceEl = document.getElementById('cartItemPrice_' + i);
    if (priceEl) priceEl.textContent = (item.unitPrice * item.qty).toFixed(2) + ' lei';
  });
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = getCartTotal().toFixed(2) + ' lei';
}

function showPublicToast(msg) {
  let t = document.getElementById('publicToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'publicToast';
    Object.assign(t.style, {
      position: 'fixed', bottom: '100px', right: '28px',
      background: 'var(--pink-dark)', color: '#fff',
      padding: '12px 22px', borderRadius: '30px',
      fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem',
      boxShadow: '0 6px 24px rgba(90,45,64,0.25)',
      zIndex: '9999', transition: 'opacity 0.4s', opacity: '1',
      maxWidth: '280px', lineHeight: '1.4',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

/* ══════════════════════════════
   FORMULAR COMANDĂ MULTI-STEP
══════════════════════════════ */

let orderSteps   = [];
let currentStep  = 0;
let stepData     = {};

function getItemPackage(item) {
  const catData = cachedCategories.find(c => c.id === item.category);
  const subData = item.subcategory && catData?.subcategories
    ? catData.subcategories.find(s => s.id === item.subcategory)
    : null;
  if (subData && subData.formPackage !== undefined) return subData.formPackage;
  if (catData && catData.formPackage !== undefined) return catData.formPackage;
  return getCatDefaultPkg(item.category);
}

function buildOrderSteps() {
  const groups = {};
  cart.forEach(item => {
    const pkgId = getItemPackage(item);
    if (!groups[pkgId]) groups[pkgId] = [];
    groups[pkgId].push(item);
  });
  const PKG_ORDER = ['nunta', 'botez', 'simplu'];
  const remaining = Object.keys(groups).filter(k => !PKG_ORDER.includes(k));
  const allKeys   = [...PKG_ORDER.filter(k => groups[k]), ...remaining.filter(k => groups[k])];
  orderSteps = allKeys
    .filter(pkgId => pkgId !== 'none' && FORM_PACKAGES[pkgId]?.sections.length > 0)
    .map(pkgId => ({ packageId: pkgId, packageDef: FORM_PACKAGES[pkgId], items: groups[pkgId] }));
  stepData = {};
  orderSteps.forEach(s => { stepData[s.packageId] = {}; });
}

function openOrderForm() {
  if (cart.length === 0) return;
  closeCart();
  buildOrderSteps();
  currentStep = 0;
  if (orderSteps.length === 0) { submitOrderDirect(); return; }
  renderOrderStep(0);
  document.getElementById('orderModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOrderForm() {
  document.getElementById('orderModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeOrderOnOverlay(e) {
  if (e.target.id === 'orderModal') closeOrderForm();
}

function renderOrderStep(stepIndex) {
  const step     = orderSteps[stepIndex];
  const isLast   = stepIndex === orderSteps.length - 1;
  const isFirst  = stepIndex === 0;
  const hasMulti = orderSteps.length > 1;

  // Step indicator
  let stepIndicator = '';
  if (hasMulti) {
    const dots = orderSteps.map((s, i) => {
      const cls = i === stepIndex ? 'active' : i < stepIndex ? 'done' : '';
      return `<span class="step-dot ${cls}" title="${s.packageDef.label}"></span>`;
    }).join('');
    stepIndicator = `
      <div class="order-step-indicator">
        <div class="step-dots">${dots}</div>
        <div class="step-label">Pas ${stepIndex + 1} din ${orderSteps.length}: <strong>${step.packageDef.label}</strong></div>
      </div>`;
  }

  // Summary for this step's items
  const stepTotal = step.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const stepItemsHtml = step.items.map(item => {
    const ext = item.extras.length ? ` (${item.extras.map(e => e.name).join(', ')})` : '';
    return `<div class="order-summary-item">
      <span>${escHtml(item.name)}${escHtml(ext)} × ${item.qty}</span>
      <span>${(item.unitPrice * item.qty).toFixed(2)} lei</span>
    </div>`;
  }).join('');
  const summary = `
    <div class="order-summary">
      <div class="order-summary-title">${step.packageDef.icon} ${step.packageDef.label}</div>
      ${stepItemsHtml}
      ${hasMulti ? `<div class="order-summary-item" style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)">
        <span style="font-style:italic;">Subtotal</span><span>${stepTotal.toFixed(2)} lei</span></div>` : ''}
      ${isLast || !hasMulti ? `<div class="order-summary-total"><span>Total comandă</span><span>${getCartTotal().toFixed(2)} lei</span></div>` : ''}
    </div>`;

  // Form fields from package definition
  let fieldsHtml = '';
  step.packageDef.sections.forEach(section => {
    fieldsHtml += `<div class="order-section-title">${section.title}</div><div class="order-fields-grid">`;
    section.fields.forEach(field => {
      const style    = field.fullWidth ? 'grid-column:1/-1;' : '';
      const reqMark  = field.required ? ' *' : '';
      const saved    = stepData[step.packageId]?.[field.id] || '';
      const inputId  = `of_${step.packageId}_${field.id}`;
      if (field.type === 'textarea') {
        fieldsHtml += `<div class="order-field" style="${style}">
          <label>${field.label}${reqMark}</label>
          <textarea class="order-input" id="${inputId}" placeholder="${field.placeholder || ''}">${escHtml(saved)}</textarea>
        </div>`;
      } else {
        fieldsHtml += `<div class="order-field" style="${style}">
          <label>${field.label}${reqMark}</label>
          <input type="${field.type}" class="order-input" id="${inputId}" placeholder="${field.placeholder || ''}" value="${escHtml(saved)}" />
        </div>`;
      }
    });
    fieldsHtml += '</div>';
  });

  // Navigation buttons
  const backBtn = !isFirst
    ? `<button class="btn-order-back" onclick="goOrderStep(${stepIndex - 1})">← Înapoi</button>`
    : '';
  const nextBtn = isLast
    ? `<button class="btn-submit-order" onclick="submitOrder()">Trimite Comanda</button>`
    : `<button class="btn-submit-order" onclick="goOrderStep(${stepIndex + 1})">Continuă →</button>`;

  document.getElementById('orderBody').innerHTML =
    summary + stepIndicator + fieldsHtml +
    `<div class="order-nav-row">${backBtn}${nextBtn}</div>`;
}

function collectCurrentStep() {
  const step = orderSteps[currentStep];
  if (!step) return;
  stepData[step.packageId] = stepData[step.packageId] || {};
  step.packageDef.sections.forEach(section => {
    section.fields.forEach(field => {
      const el = document.getElementById(`of_${step.packageId}_${field.id}`);
      if (el) stepData[step.packageId][field.id] = el.value.trim();
    });
  });
}

function validateCurrentStep() {
  const step = orderSteps[currentStep];
  for (const section of step.packageDef.sections) {
    for (const field of section.fields) {
      if (field.required) {
        const el = document.getElementById(`of_${step.packageId}_${field.id}`);
        if (!el || !el.value.trim()) {
          alert(`Te rog completează câmpul "${field.label}".`);
          el?.focus();
          return false;
        }
      }
    }
  }
  return true;
}

function goOrderStep(target) {
  if (!validateCurrentStep()) return;
  collectCurrentStep();
  currentStep = target;
  renderOrderStep(currentStep);
  document.querySelector('.order-body').scrollTop = 0;
}

async function submitOrder() {
  if (!validateCurrentStep()) return;
  collectCurrentStep();

  const btn = document.querySelector('.btn-submit-order');
  if (btn) { btn.disabled = true; btn.textContent = 'Se trimite…'; }

  // Build nested details object
  const details = {};
  orderSteps.forEach(step => {
    const pkg     = step.packageDef;
    const pkgVals = {};
    pkg.sections.forEach(section => {
      section.fields.forEach(field => {
        const val = stepData[step.packageId]?.[field.id] || '';
        if (val) pkgVals[field.label] = val;
      });
    });
    if (Object.keys(pkgVals).length > 0) details[pkg.label] = pkgVals;
  });

  const primaryType = orderSteps.length > 0 ? orderSteps[0].packageId : 'other';

  try {
    await db.collection('orders').add({
      status:    'new',
      type:      primaryType,
      createdAt: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.productId,
        name:      item.name,
        category:  item.category,
        extras:    item.extras.map(e => e.name + (e.priceIncrease > 0 ? ` (+${e.priceIncrease} lei)` : '')),
        unitPrice: item.unitPrice,
        qty:       item.qty,
        subtotal:  parseFloat((item.unitPrice * item.qty).toFixed(2)),
      })),
      total:   parseFloat(getCartTotal().toFixed(2)),
      details,
    });

    cart = []; orderSteps = []; stepData = {};
    updateCartBadge();
    document.getElementById('cartFab').style.display = 'none';

    document.getElementById('orderBody').innerHTML = `
      <div class="order-thank-you">
        <span class="ty-icon">🌸</span>
        <h4>Îți mulțumim!</h4>
        <p>Comanda ta a fost primită cu succes.<br>
           Vei fi contactat(ă) în cel mai scurt timp<br>
           pentru confirmarea tuturor detaliilor.</p>
        <button class="btn-close-ty" onclick="closeOrderForm()">Închide</button>
      </div>`;
  } catch (e) {
    console.error('submitOrder:', e);
    alert('Eroare la trimiterea comenzii. Te rugăm să încerci din nou.');
    if (btn) { btn.disabled = false; btn.textContent = 'Trimite Comanda'; }
  }
}

async function submitOrderDirect() {
  try {
    await db.collection('orders').add({
      status: 'new', type: 'other',
      createdAt: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.productId, name: item.name, category: item.category,
        extras: item.extras.map(e => e.name), unitPrice: item.unitPrice,
        qty: item.qty, subtotal: parseFloat((item.unitPrice * item.qty).toFixed(2)),
      })),
      total: parseFloat(getCartTotal().toFixed(2)), details: {},
    });
    cart = []; updateCartBadge();
    document.getElementById('cartFab').style.display = 'none';
    document.getElementById('orderModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('orderBody').innerHTML = `
      <div class="order-thank-you">
        <span class="ty-icon">🌸</span><h4>Îți mulțumim!</h4>
        <p>Comanda a fost primită. Vei fi contactat(ă) în cel mai scurt timp.</p>
        <button class="btn-close-ty" onclick="closeOrderForm()">Închide</button>
      </div>`;
  } catch(e) { console.error(e); }
}

/* ── POLITICI ── */
const POLICY_CONTENT = {
  termeni: {
    title: 'Termeni și Condiții',
    html: `
      <p><strong>Ultima actualizare:</strong> Iunie 2026</p>

      <h2>Despre noi</h2>
      <p>Invitații cu Dichis by Ale este o activitate de creare și vânzare de invitații personalizate pentru nunți și botezuri, cu sediul în Iași, România. Prin plasarea unei comenzi pe acest site, acceptați termenii și condițiile de mai jos.</p>

      <h2>Produsele noastre</h2>
      <p>Toate produsele sunt realizate manual și personalizate conform datelor furnizate de client. Pozele de pe site sunt orientative — culorile reale pot varia ușor față de afișajul monitorului. Pentru o mostră de culoare, ne puteți contacta înainte de comandă.</p>

      <h2>Cum se plasează o comandă</h2>
      <p>Comanda se plasează prin formularul de pe site, selectând produsele dorite și completând datele evenimentului. Comanda devine fermă doar după confirmarea noastră explicită prin WhatsApp sau alt mijloc de contact. Până la confirmare, nu începem producția.</p>

      <h2>Prețuri și plată</h2>
      <p>Prețurile afișate sunt exprimate în lei și nu includ TVA. Plata se realizează conform înțelegerii stabilite la confirmarea comenzii (avans și/sau plată integrală la livrare). Ne rezervăm dreptul de a modifica prețurile fără notificare prealabilă, dar prețul convenit la confirmarea comenzii rămâne fix.</p>

      <h2>Producție și livrare</h2>
      <p>Termenul de producție este stabilit de comun acord la confirmarea comenzii și depinde de complexitate și volumul comenzilor în curs. Nu ne asumăm răspunderea pentru întârzieri cauzate de forță majoră sau de furnizarea tardivă a datelor de către client. Livrarea se face prin curier sau ridicare personală din Iași, conform înțelegerii.</p>

      <h2>Responsabilitatea clientului</h2>
      <p>Clientul este responsabil pentru corectitudinea tuturor datelor furnizate (nume, date, locații, numere de telefon). Verificați cu atenție toate informațiile înainte de confirmare. Nu ne asumăm răspunderea pentru greșeli provenite din date eronate transmise de client.</p>

      <h2>Proprietate intelectuală</h2>
      <p>Toate modelele și designurile prezentate pe site aparțin Invitații cu Dichis by Ale. Este interzisă reproducerea sau utilizarea lor comercială fără acordul nostru scris.</p>

      <h2>Modificarea termenilor</h2>
      <p>Ne rezervăm dreptul de a modifica acești termeni oricând. Versiunea actualizată va fi publicată pe site. Continuarea utilizării site-ului după modificări reprezintă acceptul noilor termeni.</p>

      <h2>Legislație aplicabilă</h2>
      <p>Acești termeni sunt guvernați de legislația română în vigoare. Orice litigiu va fi soluționat pe cale amiabilă sau, în caz contrar, prin instanțele competente din Iași.</p>
    `
  },
  confidentialitate: {
    title: 'Politica de Confidențialitate',
    html: `
      <p><strong>Ultima actualizare:</strong> Iunie 2026</p>

      <h2>Cine suntem</h2>
      <p>Invitații cu Dichis by Ale este o activitate de creare și vânzare de invitații personalizate pentru nunți și botezuri, cu sediul în Iași, România. Ne puteți contacta prin WhatsApp sau rețelele sociale indicate pe site.</p>

      <h2>Ce date colectăm</h2>
      <p>Prin formularul de comandă, colectăm:</p>
      <ul>
        <li>Nume și prenume (ale dumneavoastră și ale celor menționați în invitație)</li>
        <li>Număr de telefon</li>
        <li>Data și locația evenimentului</li>
        <li>Produsele selectate și detaliile comenzii</li>
      </ul>
      <p>Nu colectăm adrese de email, date de card bancar sau orice alte date sensibile.</p>

      <h2>De ce colectăm aceste date</h2>
      <p>Datele sunt folosite exclusiv pentru procesarea și finalizarea comenzii dumneavoastră. Nu le folosim în scopuri de marketing și nu le transmitem unor terțe părți.</p>

      <h2>Unde sunt stocate datele</h2>
      <p>Comenzile sunt stocate în Firebase Firestore (serviciu Google LLC), pe servere securizate. Google respectă reglementările GDPR aplicabile în Uniunea Europeană.</p>

      <h2>Cât timp păstrăm datele</h2>
      <p>Datele comenzii sunt păstrate până la finalizarea acesteia și maximum 12 luni ulterior, pentru evidență internă. La cerere, le putem șterge oricând.</p>

      <h2>Drepturile dumneavoastră</h2>
      <p>Conform GDPR, aveți dreptul să:</p>
      <ul>
        <li>Solicitați accesul la datele dumneavoastră</li>
        <li>Solicitați corectarea sau ștergerea acestora</li>
        <li>Vă opuneți prelucrării lor</li>
      </ul>
      <p>Pentru orice solicitare, ne contactați prin WhatsApp sau rețelele sociale de pe site. Răspundem în maximum 30 de zile.</p>

      <h2>Cookie-uri</h2>
      <p>Site-ul nu folosește cookie-uri de urmărire sau publicitate. Firebase poate stoca date tehnice minime necesare funcționării aplicației.</p>
    `
  },
  retur: {
    title: 'Politica de Retur',
    html: `
      <p><strong>Ultima actualizare:</strong> Iunie 2026</p>

      <h2>Produse personalizate</h2>
      <p>Toate produsele noastre sunt <strong>realizate la comandă</strong>, personalizate cu datele evenimentului dumneavoastră (nume, date, locații). Conform art. 16 lit. c din OUG 34/2014 (care transpune Directiva UE 2011/83/UE), produsele confecționate după specificațiile consumatorului sunt <strong>exceptate de la dreptul de retragere</strong> de 14 zile.</p>
      <p>Prin urmare, comenzile plasate și confirmate nu pot fi returnate sau anulate după începerea producției.</p>

      <h2>Anularea comenzii</h2>
      <p>O comandă poate fi anulată <strong>înainte de confirmarea producției</strong>, adică înainte ca Alexandra să confirme că a început lucrul. Dacă doriți să anulați, contactați-ne cât mai rapid prin WhatsApp.</p>

      <h2>Reclamații de calitate</h2>
      <p>Dacă produsele primite prezintă defecte de calitate sau diferențe față de ce s-a agreat (culori greșite, greșeli de tipar care nu aparțin clientului), vă rugăm să:</p>
      <ul>
        <li>Ne contactați în maximum <strong>48 de ore</strong> de la primirea coletului</li>
        <li>Trimiteți fotografii clare cu produsele și defectul semnalat</li>
      </ul>
      <p>Analizăm fiecare situație și propunem o soluție: refacerea produselor afectate sau o altă rezolvare convenită de comun acord.</p>

      <h2>Responsabilitatea clientului</h2>
      <p>Nu ne asumăm responsabilitatea pentru greșeli provenite din datele transmise incorect de client (nume greșite, date eronate, locații incorecte). Vă recomandăm să verificați cu atenție toate informațiile înainte de confirmarea comenzii.</p>

      <h2>Contact</h2>
      <p>Pentru orice nelămurire legată de comandă sau calitatea produselor, ne contactați prin WhatsApp sau rețelele sociale indicate pe site. Răspundem în cel mai scurt timp posibil.</p>
    `
  }
};

function openPolicy(type) {
  const content = POLICY_CONTENT[type];
  if (!content) return;
  document.getElementById('policyTitle').textContent = content.title;
  document.getElementById('policyBody').innerHTML = content.html;
  document.getElementById('policyModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePolicy() {
  document.getElementById('policyModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closePolicyOnOverlay(e) {
  if (e.target.id === 'policyModal') closePolicy();
}
