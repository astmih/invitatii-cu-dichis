const DEFAULT_CATEGORIES = [
  { id: 'nunta', label: 'Invitații Nuntă', icon: '💍' },
  { id: 'botez', label: 'Invitații Botez', icon: '👶' },
  { id: 'plic',  label: 'Plicuri',         icon: '✉️' },
];
const DEFAULT_PAPER_TYPES = [{ id: 'standard', name: 'Standard', priceIncrease: 0 }];

let currentFilter    = 'all';
let allProducts      = [];
let cachedCategories = DEFAULT_CATEGORIES;
let cachedPaperTypes = DEFAULT_PAPER_TYPES;
let productImagesMap = {};

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
  const container = document.getElementById('filterTabs');
  container.innerHTML =
    `<button class="tab ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Toate</button>` +
    cachedCategories.map(c =>
      `<button class="tab ${currentFilter === c.id ? 'active' : ''}" data-filter="${escHtml(c.id)}">${escHtml(c.label)}</button>`
    ).join('');

  container.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
    });
  });
}

function renderProducts() {
  const grid   = document.getElementById('productsGrid');
  const catMap = Object.fromEntries(cachedCategories.map(c => [c.id, c]));
  const list   = currentFilter === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === currentFilter);

  const paperOpts = cachedPaperTypes.map(t =>
    `<option value="${escHtml(t.id)}" data-increase="${t.priceIncrease}">` +
    `${escHtml(t.name)}${t.priceIncrease > 0 ? ' (+' + t.priceIncrease + ' lei)' : ''}` +
    `</option>`
  ).join('');

  productImagesMap = {};

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>${
      currentFilter === 'all'
        ? 'Nu există produse adăugate încă. Revino curând! ✨'
        : 'Nu există produse în această categorie încă.'
    }</p></div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const cat    = catMap[p.category] || { label: p.category, icon: '🎀', id: p.category };
    const images = getProductImages(p);
    productImagesMap[p.id] = images;

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
            <a href="#contact" class="btn-comanda">Comandă</a>
          </div>
          <div class="calc-section">
            <div class="calc-row">
              <div class="calc-field">
                <label class="calc-label">Nr. invitații</label>
                <input type="number" class="calc-qty" min="1" value="1"
                       data-base="${escHtml(String(p.price))}"
                       oninput="calcTotal(this.closest('.product-card'))" />
              </div>
              <div class="calc-field">
                <label class="calc-label">Tip hârtie</label>
                <select class="calc-paper" onchange="calcTotal(this.closest('.product-card'))">
                  ${paperOpts}
                </select>
              </div>
            </div>
            <div class="calc-total">Total estimat: <strong class="calc-total-val">— lei</strong></div>
          </div>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.product-card').forEach(card => calcTotal(card));
}

function calcTotal(card) {
  const qty      = Math.max(1, parseInt(card.querySelector('.calc-qty').value) || 1);
  const base     = parseFloat(card.querySelector('.calc-qty').dataset.base) || 0;
  const sel      = card.querySelector('.calc-paper');
  const increase = parseFloat(sel.selectedOptions[0]?.dataset.increase || '0') || 0;
  card.querySelector('.calc-total-val').textContent = ((base + increase) * qty).toFixed(2) + ' lei';
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
  allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}, err => console.error('Products listener:', err));

loadConfig();
initStarRating();
