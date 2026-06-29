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

let adminCats = [...DEFAULT_CATEGORIES];

// Imaginile curente per slot (base64) pentru produsul aflat în editare
let slotData = ['', '', ''];

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
    renderAdminOrderList(),
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
    adminCats = data?.items ? [...data.items] : [...DEFAULT_CATEGORIES];
    return adminCats;
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
    buildSubcategorySelect();
  } catch (e) { console.error('buildCategorySelect:', e); }
}

function buildSubcategorySelect() {
  const catId = document.getElementById('fCategory').value;
  const cat   = adminCats.find(c => c.id === catId);
  const subs  = cat?.subcategories || [];
  const group = document.getElementById('fSubcategoryGroup');
  const sel   = document.getElementById('fSubcategory');
  if (subs.length === 0) {
    group.style.display = 'none';
    sel.innerHTML = '';
  } else {
    group.style.display = 'block';
    sel.innerHTML = `<option value="">Fără subcategorie</option>` +
      subs.map(s => `<option value="${escHtml(s.id)}">${escHtml(s.label)}</option>`).join('');
  }
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
    const [cats, types] = await Promise.all([getCategories(), getPaperTypes()]);

    const PKG_OPTS = [
      { value: 'nunta',  label: '💍 Invitații Nuntă' },
      { value: 'botez',  label: '👶 Invitații Botez' },
      { value: 'simplu', label: '📋 Simplu (Nume + Info)' },
      { value: 'none',   label: '— Fără formular' },
    ];

    function pkgOptions(current, withInherit, inheritLabel) {
      let html = withInherit
        ? `<option value="" ${current === '' ? 'selected' : ''}>↑ Același ca ${escHtml(inheritLabel)}</option>`
        : '';
      html += PKG_OPTS.map(o =>
        `<option value="${o.value}" ${current === o.value ? 'selected' : ''}>${o.label}</option>`
      ).join('');
      return html;
    }

    function extrasChecks(allowedExtras, containerId, onchangeFn) {
      if (types.length === 0) return '';
      const checks = types.map(t => {
        const checked = !allowedExtras || allowedExtras.includes(t.id) ? 'checked' : '';
        return `<label class="extras-check-item">
          <input type="checkbox" value="${escHtml(t.id)}" ${checked} onchange="${onchangeFn}" />
          ${escHtml(t.name)}
        </label>`;
      }).join('');
      return `<div class="cat-extras-config" id="${containerId}">
        <span class="extras-config-label">Extra opțiuni permise:</span>
        <div class="extras-check-list">${checks}</div>
      </div>`;
    }

    function subExtrasChecks(allowedExtras, containerId, onchangeFn) {
      if (types.length === 0) return '';
      const checks = types.map(t => {
        const checked = !allowedExtras || allowedExtras.includes(t.id) ? 'checked' : '';
        return `<label class="extras-check-item">
          <input type="checkbox" value="${escHtml(t.id)}" ${checked} onchange="${onchangeFn}" />
          ${escHtml(t.name)}
        </label>`;
      }).join('');
      return `<div class="subcat-extras-config" id="${containerId}">
        <span class="extras-config-label">Extra opțiuni:</span>
        <div class="extras-check-list">${checks}</div>
      </div>`;
    }

    document.getElementById('categoryList').innerHTML = cats.map(c => {
      const catPkg    = c.formPackage !== undefined ? c.formPackage : getCatDefaultPkg(c.id);
      const subs      = c.subcategories || [];

      const subsHtml = subs.map((s, idx) => {
        const subPkg = s.formPackage !== undefined ? s.formPackage : '';
        const isFirst = idx === 0;
        const isLast  = idx === subs.length - 1;
        return `
          <div class="subcat-item">
            <span class="subcat-bullet">—</span>
            <span class="subcat-label">${escHtml(s.label)}</span>
            <button class="btn-move-subcat" onclick="moveSubcategory('${escHtml(c.id)}','${escHtml(s.id)}',-1)" ${isFirst ? 'disabled' : ''} title="Mută sus">▲</button>
            <button class="btn-move-subcat" onclick="moveSubcategory('${escHtml(c.id)}','${escHtml(s.id)}',1)" ${isLast ? 'disabled' : ''} title="Mută jos">▼</button>
            <button class="btn-delete-subcat" onclick="deleteSubcategory('${escHtml(c.id)}','${escHtml(s.id)}')">✕</button>
          </div>
          <div class="subcat-pkg-row" id="subPkg_${escHtml(c.id)}_${escHtml(s.id)}">
            <span class="subcat-pkg-label">📄 Formular:</span>
            <select class="cat-package-select subcat-pkg-select" onchange="saveSubcategoryPackage('${escHtml(c.id)}','${escHtml(s.id)}')">
              ${pkgOptions(subPkg, true, c.label)}
            </select>
          </div>
          ${subExtrasChecks(s.allowedExtras, `subExtras_${escHtml(c.id)}_${escHtml(s.id)}`, `saveSubcategoryExtras('${escHtml(c.id)}','${escHtml(s.id)}')`)}`;
      }).join('');

      return `
        <div class="cat-item-wrap">
          <div class="cat-item">
            <span class="cat-icon">${c.icon}</span>
            <span class="cat-label">${escHtml(c.label)}</span>
            <button class="btn-delete-cat" onclick="deleteCategory('${escHtml(c.id)}')">Șterge</button>
          </div>
          <div class="cat-package-row" id="catPkg_${escHtml(c.id)}">
            <span class="cat-package-label">📄 Formular comandă:</span>
            <select class="cat-package-select" onchange="saveCategoryPackage('${escHtml(c.id)}')">
              ${pkgOptions(catPkg, false, '')}
            </select>
          </div>
          ${extrasChecks(c.allowedExtras, `catExtras_${escHtml(c.id)}`, `saveCategoryExtras('${escHtml(c.id)}')`)}
          <div class="subcat-section">
            ${subsHtml}
            <div class="subcat-add-row">
              <input type="text" class="cat-input subcat-input" id="newSub_${escHtml(c.id)}" placeholder="Subcategorie nouă…" />
              <button class="btn-add-subcat" onclick="addSubcategory('${escHtml(c.id)}')">+ Sub</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (e) { console.error('renderCategoryList:', e); }
}

async function saveCategoryPackage(catId) {
  const container = document.getElementById('catPkg_' + catId);
  const sel = container?.querySelector('select');
  if (!sel) return;
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    cat.formPackage = sel.value;
    await saveCategories(cats);
    showToast('Formular salvat!');
  } catch (e) {
    showToast('Eroare. Verifică Firebase.');
    console.error('saveCategoryPackage:', e);
  }
}

async function saveSubcategoryPackage(catId, subId) {
  const container = document.getElementById(`subPkg_${catId}_${subId}`);
  const sel = container?.querySelector('select');
  if (!sel) return;
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    const sub = (cat.subcategories || []).find(s => s.id === subId);
    if (!sub) return;
    if (sel.value === '') { delete sub.formPackage; }
    else { sub.formPackage = sel.value; }
    await saveCategories(cats);
    showToast('Formular salvat!');
  } catch (e) {
    showToast('Eroare. Verifică Firebase.');
    console.error('saveSubcategoryPackage:', e);
  }
}

async function saveCategoryExtras(catId) {
  const container = document.getElementById('catExtras_' + catId);
  if (!container) return;
  const checked = [...container.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    cat.allowedExtras = checked;
    await saveCategories(cats);
    showToast('Opțiuni salvate!');
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('saveCategoryExtras:', e);
  }
}

async function saveSubcategoryExtras(catId, subId) {
  const container = document.getElementById('subExtras_' + catId + '_' + subId);
  if (!container) return;
  const checked = [...container.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    const sub = (cat.subcategories || []).find(s => s.id === subId);
    if (!sub) return;
    sub.allowedExtras = checked;
    await saveCategories(cats);
    showToast('Opțiuni salvate!');
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('saveSubcategoryExtras:', e);
  }
}

async function addSubcategory(catId) {
  const input = document.getElementById('newSub_' + catId);
  const label = input ? input.value.trim() : '';
  if (!label) { alert('Introdu numele subcategoriei.'); return; }
  const id = label.toLowerCase()
    .replace(/ă/g,'a').replace(/â/g,'a').replace(/î/g,'i')
    .replace(/ș/g,'s').replace(/ț/g,'t')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    const subs = cat.subcategories || [];
    if (subs.find(s => s.id === id)) { alert('Această subcategorie există deja.'); return; }
    cat.subcategories = [...subs, { id, label }];
    await saveCategories(cats);
    input.value = '';
    await renderCategoryList();
    buildSubcategorySelect();
    showToast(`Subcategoria "${label}" a fost adăugată!`);
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('addSubcategory:', e);
  }
}

async function deleteSubcategory(catId, subId) {
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    const sub = (cat.subcategories || []).find(s => s.id === subId);
    if (!sub) return;
    if (!confirm(`Ștergi subcategoria "${sub.label}"?`)) return;
    cat.subcategories = (cat.subcategories || []).filter(s => s.id !== subId);
    await saveCategories(cats);
    await renderCategoryList();
    buildSubcategorySelect();
    showToast('Subcategorie ștearsă.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deleteSubcategory:', e);
  }
}

async function moveSubcategory(catId, subId, direction) {
  try {
    const cats = await getCategories();
    const cat  = cats.find(c => c.id === catId);
    if (!cat) return;
    const subs = cat.subcategories || [];
    const idx  = subs.findIndex(s => s.id === subId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= subs.length) return;
    [subs[idx], subs[newIdx]] = [subs[newIdx], subs[idx]];
    cat.subcategories = subs;
    await saveCategories(cats);
    await renderCategoryList();
    buildSubcategorySelect();
    showToast('Ordine actualizată!');
  } catch (e) {
    showToast('Eroare la reordonare. Verifică Firebase.');
    console.error('moveSubcategory:', e);
  }
}

/* ── CLEANUP ── */
async function fixSubcategories() {
  try {
    const cats = await getCategories();
    cats.forEach(cat => {
      const subs = cat.subcategories || [];
      const seen = new Set();
      cat.subcategories = subs.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    });
    await saveCategories(cats);
    await renderCategoryList();
    buildSubcategorySelect();
    showToast('Subcategorii curățate!');
    console.log('Date după cleanup:', JSON.stringify(cats, null, 2));
  } catch (e) {
    console.error('fixSubcategories:', e);
    showToast('Eroare la cleanup. Vezi consola.');
  }
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
    await Promise.all([renderPaperTypeList(), renderCategoryList()]);
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
    await Promise.all([renderPaperTypeList(), renderCategoryList()]);
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
  slotData = ['', '', ''];
  for (let i = 0; i < 3; i++) clearSlot(i);
}

function loadSlotsFromProduct(images) {
  resetAllSlots();
  images.forEach((img, i) => {
    if (i < 3 && img) {
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
  const name        = document.getElementById('fName').value.trim();
  const category    = document.getElementById('fCategory').value;
  const subcategory = document.getElementById('fSubcategory')?.value || '';
  const price       = document.getElementById('fPrice').value.trim();
  const desc        = document.getElementById('fDesc').value.trim();
  const editId      = document.getElementById('editId').value;

  if (!name)  { alert('Te rog introdu numele produsului.'); return; }
  if (!price) { alert('Te rog introdu prețul.'); return; }

  const btn = document.querySelector('.btn-save');
  btn.textContent = 'Se salvează...'; btn.disabled = true;

  try {
    const docRef = editId
      ? db.collection('products').doc(editId)
      : db.collection('products').doc();

    const images = [];
    for (let i = 0; i < 3; i++) {
      const fi = document.getElementById('fImage' + i);
      if (fi && fi.files && fi.files[0]) {
        const b64 = await compressImage(fi.files[0]);
        images.push(b64);
      } else if (slotData[i]) {
        images.push(slotData[i]);
      }
    }

    const data = { name, category, subcategory, price, description: desc, images };

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
    buildSubcategorySelect();
    if (p.subcategory) document.getElementById('fSubcategory').value = p.subcategory;
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
  document.getElementById('fSubcategoryGroup').style.display = 'none';
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
      const subLabel = p.subcategory && cat.subcategories
        ? (cat.subcategories.find(s => s.id === p.subcategory)?.label || '')
        : '';
      const metaStr = escHtml(cat.label) +
        (subLabel ? ` / ${escHtml(subLabel)}` : '') +
        (images.length > 1 ? ` · ${images.length} foto` : '');
      return `
        <div class="admin-product-item">
          ${thumb}
          <div class="admin-product-info">
            <div class="admin-product-name">${escHtml(p.name)}</div>
            <div class="admin-product-meta">${metaStr}</div>
          </div>
          <div class="admin-product-price">${escHtml(String(p.price))} lei</div>
          ${images.length > 0 ? `<button class="btn-blur-zone" onclick="openBlurEditor('${p.id}')">Blur Foto</button>` : ''}
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

/* ── ORDERS ── */
async function renderAdminOrderList() {
  const el = document.getElementById('adminOrderList');
  if (!el) return;
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').get();

    if (snap.empty) {
      el.innerHTML = '<div class="admin-orders-empty">Nicio comandă primită încă.</div>';
      return;
    }

    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const newCount = orders.filter(o => o.status === 'new').length;
    const badge = document.getElementById('ordersNewBadge');
    if (badge) {
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? 'inline-flex' : 'none';
    }

    const typeLabel = { nunta: '💍 Nuntă', botez: '👶 Botez', other: '📋 Altele' };

    el.innerHTML = orders.map(o => {
      const date = o.createdAt
        ? new Date(o.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      const statusClass = o.status === 'completed' ? 'order-status-completed' : 'order-status-new';
      const statusLabel = o.status === 'completed' ? 'Finalizată' : 'Comandă nouă';

      const itemsHtml = (o.items || []).map(item => {
        const extrasNote = item.extras && item.extras.length ? ` <span style="color:var(--text-light);font-size:0.78rem;">(${escHtml(item.extras.join(', '))})</span>` : '';
        return `<div class="admin-order-product">
          <span>${escHtml(item.name)}${extrasNote} × ${item.qty}</span>
          <span>${(item.subtotal || 0).toFixed(2)} lei</span>
        </div>`;
      }).join('');

      const detailsHtml = Object.entries(o.details || {}).map(([sectionKey, sectionVal]) => {
        if (!sectionVal || typeof sectionVal !== 'object') {
          return sectionVal ? `<div class="admin-order-detail-row"><strong>${escHtml(sectionKey)}</strong>${escHtml(String(sectionVal))}</div>` : '';
        }
        const pkgEntry = Object.values(FORM_PACKAGES).find(p => p.label === sectionKey);
        let rows = '';
        if (pkgEntry) {
          pkgEntry.sections.forEach(section => {
            section.fields.forEach(field => {
              const v = sectionVal[field.label];
              if (v) rows += `<div class="admin-order-detail-row"><strong>${escHtml(field.label)}</strong>${escHtml(String(v))}</div>`;
            });
          });
        } else {
          rows = Object.entries(sectionVal).filter(([, v]) => v).map(([k, v]) =>
            `<div class="admin-order-detail-row"><strong>${escHtml(k)}</strong>${escHtml(String(v))}</div>`
          ).join('');
        }
        return rows ? `<div class="admin-order-section-title">${escHtml(sectionKey)}</div><div class="admin-order-details-grid">${rows}</div>` : '';
      }).filter(Boolean).join('');

      const finalizeBtn = o.status !== 'completed'
        ? `<button class="btn-finalize" onclick="finalizeOrder('${o.id}')">✓ Finalizează</button>`
        : '';

      return `
        <div class="admin-order-item" id="order_${o.id}">
          <div class="admin-order-header">
            <span class="${statusClass}">${statusLabel}</span>
            <span class="admin-order-type">${typeLabel[o.type] || o.type}</span>
            <span class="admin-order-date">${date}</span>
            <span class="admin-order-id">#${o.id.slice(0,8)}</span>
          </div>
          <div class="admin-order-items">${itemsHtml}</div>
          <div class="admin-order-total">Total: ${(o.total || 0).toFixed(2)} lei</div>
          ${detailsHtml ? `<div class="admin-order-details"><div class="admin-order-details-grid">${detailsHtml}</div></div>` : ''}
          <div class="admin-order-actions">
            ${finalizeBtn}
            <button class="btn-delete" onclick="deleteOrder('${o.id}')">Șterge</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="admin-orders-empty">Eroare la încărcarea comenzilor. Verifică Firebase.</div>';
    console.error('renderAdminOrderList:', e);
  }
}

async function finalizeOrder(id) {
  if (!confirm('Marchezi această comandă ca finalizată?')) return;
  try {
    await db.collection('orders').doc(id).update({ status: 'completed' });
    await renderAdminOrderList();
    showToast('Comandă finalizată! ✓');
  } catch (e) {
    showToast('Eroare la actualizare. Verifică Firebase.');
    console.error('finalizeOrder:', e);
  }
}

async function deleteOrder(id) {
  if (!confirm('Ștergi această comandă definitiv?')) return;
  try {
    await db.collection('orders').doc(id).delete();
    await renderAdminOrderList();
    showToast('Comandă ștearsă.');
  } catch (e) {
    showToast('Eroare la ștergere. Verifică Firebase.');
    console.error('deleteOrder:', e);
  }
}

/* ── BLUR EDITOR ── */
let blurProductId = null;
let blurImages    = [];
let blurActiveIdx = 0;
let blurOriginal  = null;
let blurDirty     = false;
let blurSel       = null;
let blurSelecting = false;

function openBlurEditor(productId) {
  db.collection('products').doc(productId).get().then(snap => {
    if (!snap.exists) return;
    const p = { id: snap.id, ...snap.data() };
    blurImages = getProductImages(p);
    if (blurImages.length === 0) { alert('Acest produs nu are imagini.'); return; }
    blurProductId = productId;
    blurActiveIdx = 0;
    blurDirty     = false;
    blurSel       = null;
    renderBlurTabs();
    loadBlurImage(0);
    document.getElementById('blurModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }).catch(e => { showToast('Eroare la încărcarea produsului.'); console.error('openBlurEditor:', e); });
}

function renderBlurTabs() {
  const tabs = document.getElementById('blurImageTabs');
  if (blurImages.length <= 1) { tabs.innerHTML = ''; return; }
  tabs.innerHTML = blurImages.map((img, i) =>
    `<img class="blur-tab-thumb ${i === blurActiveIdx ? 'active' : ''}"
          src="${img}" alt="Foto ${i + 1}" onclick="loadBlurImage(${i})" />`
  ).join('');
}

function loadBlurImage(idx) {
  blurActiveIdx = idx;
  blurOriginal  = blurImages[idx];
  blurSel       = null;
  document.querySelectorAll('.blur-tab-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
  const canvas = document.getElementById('blurCanvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();
  img.onload = () => {
    const maxW    = Math.min(720, window.innerWidth - 120);
    const scale   = img.width > maxW ? maxW / img.width : 1;
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    canvas._imgEl = img;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = blurImages[idx];
}

function initBlurCanvas() {
  const canvas = document.getElementById('blurCanvas');
  let startX, startY;

  function getPos(e, touch) {
    const r = canvas.getBoundingClientRect();
    const s = touch ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  }

  function drawSel() {
    const ctx = canvas.getContext('2d');
    if (canvas._imgEl) ctx.drawImage(canvas._imgEl, 0, 0, canvas.width, canvas.height);
    if (!blurSel || blurSel.w < 2 || blurSel.h < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(201,98,122,0.95)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(blurSel.x, blurSel.y, blurSel.w, blurSel.h);
    ctx.fillStyle = 'rgba(201,98,122,0.15)';
    ctx.fillRect(blurSel.x, blurSel.y, blurSel.w, blurSel.h);
    ctx.restore();
  }

  canvas.addEventListener('mousedown', e => {
    const p = getPos(e, false); startX = p.x; startY = p.y;
    blurSelecting = true; blurSel = null;
  });
  canvas.addEventListener('mousemove', e => {
    if (!blurSelecting) return;
    const p = getPos(e, false);
    blurSel = { x: Math.min(startX, p.x), y: Math.min(startY, p.y),
                w: Math.abs(p.x - startX),  h: Math.abs(p.y - startY) };
    drawSel();
  });
  canvas.addEventListener('mouseup',    () => { blurSelecting = false; });
  canvas.addEventListener('mouseleave', () => { blurSelecting = false; });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const p = getPos(e, true); startX = p.x; startY = p.y;
    blurSelecting = true; blurSel = null;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!blurSelecting) return;
    const p = getPos(e, true);
    blurSel = { x: Math.min(startX, p.x), y: Math.min(startY, p.y),
                w: Math.abs(p.x - startX),  h: Math.abs(p.y - startY) };
    drawSel();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { blurSelecting = false; });
}

function applyBlur() {
  if (!blurSel || blurSel.w < 8 || blurSel.h < 8) {
    alert('Te rog selectează mai întâi o zonă (trage cu mouse-ul peste numărul de telefon).');
    return;
  }
  const canvas    = document.getElementById('blurCanvas');
  const ctx       = canvas.getContext('2d');
  const { x, y, w, h } = blurSel;
  const blockSize = Math.max(8, Math.round(Math.min(w, h) / 8));

  for (let bx = x; bx < x + w; bx += blockSize) {
    for (let by = y; by < y + h; by += blockSize) {
      const bw    = Math.min(blockSize, x + w - bx);
      const bh    = Math.min(blockSize, y + h - by);
      const pixel = ctx.getImageData(Math.round(bx), Math.round(by), 1, 1).data;
      ctx.fillStyle = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
      ctx.fillRect(Math.round(bx), Math.round(by), Math.ceil(bw), Math.ceil(bh));
    }
  }

  const newUrl = canvas.toDataURL('image/jpeg', 0.88);
  blurImages[blurActiveIdx] = newUrl;
  blurDirty = true;
  blurSel   = null;

  const newImg = new Image();
  newImg.onload = () => { canvas._imgEl = newImg; };
  newImg.src = newUrl;

  const tabs = document.querySelectorAll('.blur-tab-thumb');
  if (tabs[blurActiveIdx]) tabs[blurActiveIdx].src = newUrl;

  showToast('Blur aplicat! Apasă "Salvează Imaginea" pentru a salva în Firebase.');
}

function undoBlur() {
  if (!blurOriginal) return;
  if (!confirm('Anulezi toate modificările și revii la imaginea originală?')) return;
  blurImages[blurActiveIdx] = blurOriginal;
  blurDirty = false;
  loadBlurImage(blurActiveIdx);
  showToast('Imagine restaurată la original.');
}

async function saveBlurredImage() {
  if (!blurDirty) { showToast('Nu există modificări de salvat.'); return; }
  const btn = document.querySelector('.btn-blur-save');
  btn.disabled = true; btn.textContent = 'Se salvează...';
  try {
    await db.collection('products').doc(blurProductId).update({
      images: blurImages,
      updatedAt: new Date().toISOString(),
    });
    blurOriginal = blurImages[blurActiveIdx];
    blurDirty    = false;
    await renderAdminList();
    showToast('Imagine salvată cu succes! ✓');
  } catch (e) {
    showToast('Eroare la salvare. Verifică Firebase.');
    console.error('saveBlurredImage:', e);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvează Imaginea';
  }
}

function closeBlurEditor() {
  if (blurDirty && !confirm('Ai modificări nesalvate. Ești sigură că vrei să închizi?')) return;
  document.getElementById('blurModal').style.display = 'none';
  document.body.style.overflow = '';
  blurProductId = null; blurImages = []; blurOriginal = null;
  blurSel = null; blurDirty = false;
}

function closeBlurModal(e) {
  if (e.target.id === 'blurModal') closeBlurEditor();
}

checkAuth();
initBlurCanvas();
