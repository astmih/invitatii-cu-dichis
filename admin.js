/* ════════════════════════════
   UTILIZATORI — modifică aici
   ════════════════════════════ */
const USERS = [
  { username: 'Admin',     password: 'ale2024'       },
  { username: 'Alexandra', password: 'alexandra2024' },
];
/* ════════════════════════════ */

const SESSION_KEY  = 'admin_auth';
const SESSION_USER = 'admin_user';

const DEFAULT_CATEGORIES  = [
  { id: 'nunta', label: 'Invitații Nuntă', icon: '💍' },
  { id: 'botez', label: 'Invitații Botez', icon: '👶' },
  { id: 'plic',  label: 'Plicuri',         icon: '✉️' },
];
const DEFAULT_PAPER_TYPES = [];

// Imaginile curente per slot (base64) pentru produsul aflat în editare
let slotData = ['', '', '', ''];

/* ── AUTH ── */
function checkAuth() {
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showAdmin(sessionStorage.getItem(SESSION_USER) || '');
  }
}

function doLogin() {
  const user  = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginInput').value;
  const found = USERS.find(u =>
    u.username.toLowerCase() === user.toLowerCase() && u.password === pass
  );
  if (found) {
    sessionStorage.setItem(SESSION_KEY,  '1');
    sessionStorage.setItem(SESSION_USER, found.username);
    showAdmin(found.username);
  } else {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginInput').value = '';
    document.getElementById('loginInput').focus();
  }
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_USER);
  location.reload();
}

async function showAdmin(username) {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('adminUI').style.display      = 'block';
  const el = document.getElementById('loggedInAs');
  if (el && username) el.textContent = '👤 ' + username;
  runFirebaseDiagnostic();
  await Promise.allSettled([
    buildCategorySelect(),
    renderCategoryList(),
    renderAdminList(),
    loadContactForm(),
    renderPaperTypeList(),
    renderAdminFeedbackList(),
  ]);
}

async function runFirebaseDiagnostic() {
  const diag = document.getElementById('firebaseDiag');
  if (!diag) return;
  diag.style.display = 'block';
  try {
    diag.textContent = '🔄 Testez conexiunea Firebase...';
    await db.collection('_diag').doc('test').get();
    await db.collection('_diag').doc('test').set({ ts: Date.now() });
    await db.collection('_diag').doc('test').delete();
    diag.textContent = '✓ Firebase conectat și funcțional — poți folosi adminul normal.';
    diag.style.background = '#4CAF50';
    setTimeout(() => { diag.style.display = 'none'; }, 4000);
  } catch (e) {
    const code = e.code || e.message || String(e);
    diag.innerHTML =
      `⚠️ <strong>Eroare Firebase: ${code}</strong><br>` +
      getFirebaseErrorHelp(code);
    diag.style.background = '#C96070';
  }
}

function getFirebaseErrorHelp(code) {
  if (code.includes('permission-denied'))
    return 'Regulile Firestore blochează scrierile. Mergi la Firebase Console → Firestore → Rules și setează <code>allow read, write: if true;</code> apoi apasă Publish.';
  if (code.includes('not-found') || code.includes('unavailable'))
    return 'Firestore nu este activat sau proiectul nu există. Verifică Firebase Console.';
  if (code.includes('network') || code.includes('offline'))
    return 'Problemă de rețea. Verifică conexiunea la internet.';
  return 'Verifică Firebase Console pentru detalii și asigură-te că Firestore este activat cu regulile corecte.';
}

document.getElementById('loginUser').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('loginInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

/* ── FIRESTORE HELPERS ── */
async function fsGet(path) {
  const snap = await db.doc(path).get();
  return snap.exists ? snap.data() : null;
}
async function fsSet(path, data) {
  await db.doc(path).set(data);
}

/* ── CONTACT ── */
async function loadContactForm() {
  try {
    const c = (await fsGet('config/contact')) || {};
    document.getElementById('cPhone').value     = c.phone     || '';
    document.getElementById('cFacebook').value  = c.facebook  || '';
    document.getElementById('cInstagram').value = c.instagram || '';
  } catch (e) { console.error('loadContactForm:', e); }
}

async function saveContact() {
  try {
    await fsSet('config/contact', {
      phone:     document.getElementById('cPhone').value.trim(),
      facebook:  document.getElementById('cFacebook').value.trim(),
      instagram: document.getElementById('cInstagram').value.trim(),
    });
    showToast('Date de contact salvate! ✓');
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('saveContact:', e);
  }
}

/* ── CATEGORIES ── */
async function getCategories() {
  try {
    const data = await fsGet('config/categories');
    return data?.items ? [...data.items] : [...DEFAULT_CATEGORIES];
  } catch (e) {
    console.error('getCategories:', e);
    return [...DEFAULT_CATEGORIES];
  }
}

async function saveCategories(list) {
  await fsSet('config/categories', { items: list });
}

async function buildCategorySelect() {
  try {
    const cats = await getCategories();
    document.getElementById('fCategory').innerHTML = cats.map(c =>
      `<option value="${escHtml(c.id)}">${escHtml(c.label)}</option>`
    ).join('');
  } catch (e) { console.error('buildCategorySelect:', e); }
}

async function addCategory() {
  const label = document.getElementById('newCatLabel').value.trim();
  const icon  = document.getElementById('newCatIcon').value.trim() || '🎀';
  if (!label) { alert('Introdu numele categoriei.'); return; }
  const id = label.toLowerCase()
    .replace(/ă/g,'a').replace(/â/g,'a').replace(/î/g,'i')
    .replace(/ș/g,'s').replace(/ț/g,'t')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  try {
    const cats = await getCategories();
    if (cats.find(c => c.id === id)) { alert('Această categorie există deja.'); return; }
    cats.push({ id, label, icon });
    await saveCategories(cats);
    document.getElementById('newCatLabel').value = '';
    document.getElementById('newCatIcon').value  = '';
    await buildCategorySelect();
    await renderCategoryList();
    showToast(`Categoria "${label}" a fost adăugată!`);
  } catch (e) {
    showToast('Eroare: nu s-a putut adăuga categoria. Verifică Firebase.');
    console.error('addCategory:', e);
  }
}

async function deleteCategory(id) {
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === id);
    if (!cat) return;
    if (!confirm(`Ștergi categoria "${cat.label}"? Produsele din ea rămân, dar nu vor mai apărea în filtre.`)) return;
    await saveCategories(cats.filter(c => c.id !== id));
    await buildCategorySelect();
    await renderCategoryList();
    showToast('Categorie ștearsă.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deleteCategory:', e);
  }
}

async function renderCategoryList() {
  try {
    const cats = await getCategories();
    document.getElementById('categoryList').innerHTML = cats.map(c => `
      <div class="cat-item">
        <span class="cat-icon">${c.icon}</span>
        <span class="cat-label">${escHtml(c.label)}</span>
        <button class="btn-delete-cat" onclick="deleteCategory('${escHtml(c.id)}')">Șterge</button>
      </div>`).join('');
  } catch (e) { console.error('renderCategoryList:', e); }
}

/* ── PAPER TYPES ── */
async function getPaperTypes() {
  try {
    const data = await fsGet('config/paperTypes');
    return data?.items ? [...data.items] : [...DEFAULT_PAPER_TYPES];
  } catch (e) {
    console.error('getPaperTypes:', e);
    return [...DEFAULT_PAPER_TYPES];
  }
}

async function savePaperTypes(list) {
  await fsSet('config/paperTypes', { items: list });
}

async function addPaperType() {
  const name = document.getElementById('newPaperName').value.trim();
  const inc  = parseFloat(document.getElementById('newPaperIncrease').value) || 0;
  if (!name) { alert('Introdu numele opțiunii extra.'); return; }
  const id = name.toLowerCase()
    .replace(/ă/g,'a').replace(/â/g,'a').replace(/î/g,'i')
    .replace(/ș/g,'s').replace(/ț/g,'t')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  try {
    const types = await getPaperTypes();
    if (types.find(t => t.id === id)) { alert('Această opțiune există deja.'); return; }
    types.push({ id, name, priceIncrease: inc });
    await savePaperTypes(types);
    document.getElementById('newPaperName').value     = '';
    document.getElementById('newPaperIncrease').value = '';
    await renderPaperTypeList();
    showToast(`Opțiunea "${name}" a fost adăugată!`);
  } catch (e) {
    showToast('Eroare: nu s-a putut adăuga opțiunea. Verifică Firebase.');
    console.error('addPaperType:', e);
  }
}

async function deletePaperType(id) {
  try {
    const types = await getPaperTypes();
    const t = types.find(t => t.id === id);
    if (!t) return;
    if (!confirm(`Ștergi opțiunea "${t.name}"?`)) return;
    await savePaperTypes(types.filter(t => t.id !== id));
    await renderPaperTypeList();
    showToast('Opțiune ștearsă.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deletePaperType:', e);
  }
}

async function renderPaperTypeList() {
  try {
    const el = document.getElementById('paperTypeList');
    if (!el) return;
    const types = await getPaperTypes();
    if (types.length === 0) {
      el.innerHTML = '<div class="paper-empty">Nicio opțiune extra adăugată încă.</div>';
      return;
    }
    el.innerHTML = types.map(t => `
      <div class="cat-item">
        <span class="cat-icon">✨</span>
        <span class="cat-label">${escHtml(t.name)}</span>
        <span class="paper-increase">+${escHtml(String(t.priceIncrease))} lei/buc</span>
        <button class="btn-delete-cat" onclick="deletePaperType('${escHtml(t.id)}')">Șterge</button>
      </div>`).join('');
  } catch (e) { console.error('renderPaperTypeList:', e); }
}

/* ── IMAGE SLOTS ── */
function getProductImages(p) {
  if (p.images && p.images.length > 0) return p.images.filter(Boolean);
  if (p.image) return [p.image];
  return [];
}

function previewSlot(input, index) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => showSlotPreview(index, e.target.result);
  reader.readAsDataURL(input.files[0]);
}

function showSlotPreview(index, src) {
  document.getElementById('imgPreview' + index).src          = src;
  document.getElementById('imgPreview' + index).style.display = 'block';
  document.querySelector('#slot' + index + ' .slot-add-label').style.display = 'none';
  document.querySelector('#slot' + index + ' .slot-clear').style.display     = 'flex';
}

function clearSlot(index) {
  slotData[index] = '';
  document.getElementById('fImage' + index).value              = '';
  document.getElementById('imgPreview' + index).src             = '';
  document.getElementById('imgPreview' + index).style.display   = 'none';
  document.querySelector('#slot' + index + ' .slot-add-label').style.display = 'flex';
  document.querySelector('#slot' + index + ' .slot-clear').style.display     = 'none';
}

function resetAllSlots() {
  slotData = ['', '', '', ''];
  for (let i = 0; i < 4; i++) clearSlot(i);
}

function loadSlotsFromProduct(images) {
  resetAllSlots();
  images.forEach((img, i) => {
    if (i < 4 && img) {
      slotData[i] = img;
      showSlotPreview(i, img);
    }
  });
}

/* ── PRODUCTS ── */
async function getProducts() {
  const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1000;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveProduct() {
  const name     = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value;
  const price    = document.getElementById('fPrice').value.trim();
  const desc     = document.getElementById('fDesc').value.trim();
  const editId   = document.getElementById('editId').value;

  if (!name)  { alert('Te rog introdu numele produsului.'); return; }
  if (!price) { alert('Te rog introdu prețul.'); return; }

  const btn = document.querySelector('.btn-save');
  btn.textContent = 'Se salvează...'; btn.disabled = true;

  try {
    const docRef = editId
      ? db.collection('products').doc(editId)
      : db.collection('products').doc();

    const images = [];
    for (let i = 0; i < 4; i++) {
      const fi = document.getElementById('fImage' + i);
      if (fi && fi.files && fi.files[0]) {
        const b64 = await compressImage(fi.files[0]);
        images.push(b64);
      } else if (slotData[i]) {
        images.push(slotData[i]);
      }
    }

    const data = { name, category, price, description: desc, images };

    if (editId) {
      await docRef.update({ ...data, updatedAt: new Date().toISOString() });
    } else {
      await docRef.set({ ...data, createdAt: new Date().toISOString() });
    }

    await resetForm();
    await renderAdminList();
    showToast(editId ? 'Produs actualizat!' : 'Produs adăugat cu succes!');
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('saveProduct:', e);
  } finally {
    btn.textContent = 'Salvează Produsul'; btn.disabled = false;
  }
}

async function editProduct(id) {
  try {
    const snap = await db.collection('products').doc(id).get();
    if (!snap.exists) return;
    const p = { id: snap.id, ...snap.data() };
    document.getElementById('editId').value = p.id;
    document.getElementById('fName').value  = p.name;
    document.getElementById('fPrice').value = p.price;
    document.getElementById('fDesc').value  = p.description || '';
    await buildCategorySelect();
    document.getElementById('fCategory').value = p.category;
    loadSlotsFromProduct(getProductImages(p));
    document.getElementById('formTitle').textContent   = 'Editează Produs';
    document.getElementById('btnCancel').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    showToast('Eroare la încărcarea produsului.');
    console.error('editProduct:', e);
  }
}

async function deleteProduct(id) {
  if (!confirm('Ești sigură că vrei să ștergi acest produs?')) return;
  try {
    await db.collection('products').doc(id).delete();
    await renderAdminList();
    showToast('Produs șters.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deleteProduct:', e);
  }
}

function cancelEdit() { resetForm(); }

async function resetForm() {
  ['editId','fName','fPrice','fDesc'].forEach(id => document.getElementById(id).value = '');
  resetAllSlots();
  await buildCategorySelect();
  document.getElementById('formTitle').textContent   = 'Adaugă Produs';
  document.getElementById('btnCancel').style.display = 'none';
}

async function renderAdminList() {
  const el = document.getElementById('adminList');
  try {
    const [list, cats] = await Promise.all([getProducts(), getCategories()]);
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

    if (list.length === 0) {
      el.innerHTML = '<div class="admin-empty">Nu ai adăugat niciun produs încă.<br>Folosește formularul din stânga pentru a începe. ✨</div>';
      return;
    }

    el.innerHTML = list.map(p => {
      const cat    = catMap[p.category] || { label: p.category, icon: '🎀' };
      const images = getProductImages(p);
      const thumb  = images.length > 0
        ? `<img class="admin-thumb" src="${images[0]}" alt="${escHtml(p.name)}" />`
        : `<div class="admin-thumb-ph">${cat.icon}</div>`;
      return `
        <div class="admin-product-item">
          ${thumb}
          <div class="admin-product-info">
            <div class="admin-product-name">${escHtml(p.name)}</div>
            <div class="admin-product-meta">${escHtml(cat.label)}${images.length > 1 ? ` · ${images.length} foto` : ''}</div>
          </div>
          <div class="admin-product-price">${escHtml(String(p.price))} lei</div>
          <button class="btn-edit"   onclick="editProduct('${p.id}')">Editează</button>
          <button class="btn-delete" onclick="deleteProduct('${p.id}')">Șterge</button>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="admin-empty">Eroare la încărcarea produselor. Verifică Firebase.</div>';
    console.error('renderAdminList:', e);
  }
}

/* ── FEEDBACK ── */
async function renderAdminFeedbackList() {
  const el = document.getElementById('adminFeedbackList');
  if (!el) return;
  try {
    const snap = await db.collection('feedback').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      el.innerHTML = '<div class="admin-empty">Niciun feedback primit încă.</div>';
      return;
    }
    el.innerHTML = snap.docs.map(doc => {
      const f      = doc.data();
      const rating = Math.min(5, Math.max(0, parseInt(f.rating) || 5));
      const stars  = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const date   = f.createdAt ? new Date(f.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      return `
        <div class="admin-feedback-item">
          <div class="admin-fb-stars">${escHtml(stars)}</div>
          <div class="admin-fb-info">
            <div class="admin-fb-name">${escHtml(f.name || '')}</div>
            <div class="admin-fb-message">${escHtml(f.message || '')}</div>
            ${date ? `<div class="admin-fb-date">${date}</div>` : ''}
          </div>
          <button class="btn-delete" onclick="deleteFeedback('${doc.id}')">Șterge</button>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="admin-empty">Eroare la încărcarea feedback-ului.</div>';
    console.error('renderAdminFeedbackList:', e);
  }
}

async function deleteFeedback(id) {
  if (!confirm('Ștergi acest feedback?')) return;
  try {
    await db.collection('feedback').doc(id).delete();
    await renderAdminFeedbackList();
    showToast('Feedback șters.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deleteFeedback:', e);
  }
}

/* ── UTILS ── */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    Object.assign(t.style, {
      position:'fixed', bottom:'28px', right:'28px',
      background:'var(--pink-dark)', color:'#fff',
      padding:'13px 26px', borderRadius:'30px',
      fontFamily:'Cormorant Garamond, serif', fontSize:'1rem',
      boxShadow:'0 6px 24px rgba(90,45,64,0.25)',
      zIndex:'9999', transition:'opacity 0.4s', opacity:'1',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 5000);
}

checkAuth();
