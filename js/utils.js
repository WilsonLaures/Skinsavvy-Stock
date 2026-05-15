// js/utils.js — pure helpers + product selector modal engine

// ── Formatting ────────────────────────────────────────────────────────
function fmtRp(n) { return 'Rp ' + Math.round(n||0).toLocaleString('id-ID'); }
function fmtNum(n) { return Math.round(n||0).toLocaleString('id-ID'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function genId(pfx) { return pfx + '-' + Date.now().toString().slice(-6); }

// ── Category helpers ──────────────────────────────────────────────────
function catColorKey(name) {
  const c = db.categories.find(x => x.name === name);
  const top = (c && c.parent) ? c.parent : name;
  if (top === 'Skincare')     return 'pink';
  if (top === 'Makeup')       return 'teal';
  if (top === 'Makeup Tools') return 'blue';
  if (top === 'Beauty Care')  return 'amber';
  return 'gray';
}
function catBadge(name) {
  return `<span class="badge badge-${catColorKey(name)}">${name||'—'}</span>`;
}

// ── Business calculations ─────────────────────────────────────────────
function getAvgBuyPrice(sku) {
  let cost = 0, qty = 0;
  db.purchases.forEach(p => {
    const items = (p.items && p.items.length) ? p.items.filter(it => it.sku === sku) : (p.sku === sku ? [{price:p.price,qty:p.qty}] : []);
    items.forEach(it => { cost += it.price * it.qty; qty += it.qty; });
  });
  return qty ? cost / qty : 0;
}
function getLastBuyPrice(sku) {
  const matches = [];
  db.purchases.forEach(p => {
    if (p.items && p.items.length) { const it = p.items.find(x => x.sku === sku); if (it) matches.push({date:p.date,price:it.price}); }
    else if (p.sku === sku) matches.push({date:p.date,price:p.price});
  });
  return matches.sort((a,b) => new Date(b.date)-new Date(a.date))[0]?.price || 0;
}
function calcFeeAmount(idx, gross) {
  if (idx === '' || idx == null) return 0;
  const f = db.fees[idx]; if (!f) return 0;
  let a = f.type === 'percent' ? gross * f.amount / 100 : f.amount;
  if (f.cap && a > f.cap) a = f.cap;
  return a;
}
function calcSelectedFees(indices, gross) {
  return (indices||[]).reduce((t,i) => t + calcFeeAmount(i, gross), 0);
}

// ── Select populators ─────────────────────────────────────────────────
function populateCatSelect(id, sel='') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = db.categories.map(c =>
    `<option value="${c.name}" ${c.name===sel?'selected':''}>${c.parent?'└ ':''}${c.name}</option>`).join('');
}
function populateBrandSelect(id, sel='') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = '<option value="">— No Brand —</option>' + db.brands.map(b =>
    `<option value="${b.name}" ${b.name===sel?'selected':''}>${b.name}</option>`).join('');
}
function populateSupplierSelect(id, sel='') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = '<option value="">— None —</option>' + db.suppliers.map(s =>
    `<option value="${s.name}" ${s.name===sel?'selected':''}>${s.name}</option>`).join('');
}
function populateProductSelect(id, sel='') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = db.products.map(p =>
    `<option value="${p.sku}" ${p.sku===sel?'selected':''}>${p.sku} — ${p.name}</option>`).join('')
    || '<option value="">No products yet</option>';
}
function populateFeeSelect(id, sel='') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = '<option value="">No fee</option>' + db.fees.map((f,i) =>
    `<option value="${i}" ${String(i)===String(sel)?'selected':''}>${f.name}</option>`).join('');
}
function populateCategoryFilters() {
  ['inv-filter-cat','sale-filter-cat'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">All Categories</option>' + db.categories.map(c =>
      `<option value="${c.name}" ${c.name===cur?'selected':''}>${c.parent?'└ ':''}${c.name}</option>`).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  PRODUCT SELECTOR MODAL
//  productSelectorOpen(mode, callback, includesBundles)
//  mode = 'multi' | 'single'
//  callback([{ sku, name, price, stock }])
// ═══════════════════════════════════════════════════════════════════════
let _psMode = 'multi', _psCb = null, _psBundles = false;

function productSelectorOpen(mode, callback, includeBundles) {
  _psMode    = mode || 'multi';
  _psCb      = callback;
  _psBundles = !!includeBundles;

  // Populate filter selects
  const catSel = document.getElementById('ps-cat');
  catSel.innerHTML = '<option value="">All Categories</option>' +
    db.categories.map(c => `<option value="${c.name}">${c.parent?'└ ':''}${c.name}</option>`).join('');

  const brandSel = document.getElementById('ps-brand');
  brandSel.innerHTML = '<option value="">All Brands</option>' +
    db.brands.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

  document.getElementById('ps-search').value = '';
  document.getElementById('ps-select-all').checked = false;
  document.getElementById('ps-select-all-row').style.display = _psMode === 'multi' ? '' : 'none';

  _psRender();
  uiOpenModal('product-selector-modal');
  setTimeout(() => document.getElementById('ps-search').focus(), 80);
}

function _psAllItems() {
  const products = db.products.map(p => ({
    sku: p.sku, name: p.name, price: p.sell, stock: p.stock,
    brand: p.brand||'', category: p.category||'', isBundle: false,
    minStock: p.minStock||5,
  }));
  if (!_psBundles) return products;
  const bundles = db.bundles.map(b => ({
    sku: b.sku, name: b.name + ' [Bundle]', price: b.price, stock: '—',
    brand: '', category: '', isBundle: true, minStock: 0,
  }));
  return [...products, ...bundles];
}

function _psRender() {
  const q      = (document.getElementById('ps-search').value||'').toLowerCase();
  const catF   = document.getElementById('ps-cat').value;
  const brandF = document.getElementById('ps-brand').value;
  const tbody  = document.getElementById('ps-tbody');

  const items = _psAllItems().filter(it => {
    const matchQ = !q || it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q);
    const matchC = !catF   || it.category === catF;
    const matchB = !brandF || it.brand === brandF;
    return matchQ && matchC && matchB;
  });

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty">No products match your filters.</div></td></tr>`;
    document.getElementById('ps-count').textContent = '0 results';
    return;
  }
  document.getElementById('ps-count').textContent = `${items.length} product${items.length!==1?'s':''}`;

  const inputType = _psMode === 'multi' ? 'checkbox' : 'radio';
  tbody.innerHTML = items.map(it => {
    const isLow = !it.isBundle && typeof it.stock === 'number' && it.stock <= it.minStock;
    const stockCell = typeof it.stock === 'number'
      ? `<span style="${isLow?'color:var(--red);font-weight:700':''}">${it.stock}${isLow?' ⚠':''}` + `</span>`
      : '—';
    return `<tr class="ps-row" onclick="psToggle(this)">
      <td style="width:36px;text-align:center">
        <input type="${inputType}" class="ps-chk" name="ps-item"
          value="${it.sku}"
          data-name="${it.name.replace(/"/g,'&quot;')}"
          data-price="${it.price}"
          data-stock="${it.stock}"
          onclick="event.stopPropagation();psOnCheck()">
      </td>
      <td><code style="font-size:11px">${it.sku}</code></td>
      <td style="font-weight:500">${it.name}</td>
      <td>${it.brand ? `<span class="badge badge-gray" style="font-size:10px">${it.brand}</span>` : (it.isBundle ? '<span class="badge badge-blue" style="font-size:10px">Bundle</span>' : '—')}</td>
      <td style="color:var(--teal);font-weight:600;text-align:right">${fmtRp(it.price)}</td>
      <td style="text-align:right">${stockCell}</td>
    </tr>`;
  }).join('');

  psOnCheck();
}

function psToggle(row) {
  const chk = row.querySelector('.ps-chk');
  if (!chk || document.activeElement === chk) return;
  if (chk.type === 'radio') {
    document.querySelectorAll('.ps-chk').forEach(c => c.checked = false);
    chk.checked = true;
  } else {
    chk.checked = !chk.checked;
  }
  psOnCheck();
  if (_psMode === 'single' && chk.checked) psConfirm();
}

function psOnCheck() {
  const checked = [...document.querySelectorAll('.ps-chk:checked')];
  const total   = document.querySelectorAll('.ps-chk').length;
  const btn     = document.getElementById('ps-confirm-btn');
  if (btn) {
    if (checked.length > 0) {
      btn.textContent = _psMode === 'multi'
        ? `Add ${checked.length} product${checked.length!==1?'s':''}`
        : 'Select';
      btn.disabled = false;
    } else {
      btn.textContent = 'Select products above';
      btn.disabled = true;
    }
  }
  const sa = document.getElementById('ps-select-all');
  if (sa && _psMode === 'multi') {
    sa.indeterminate = checked.length > 0 && checked.length < total;
    sa.checked = total > 0 && checked.length === total;
  }
}

function psSelectAll(chk) {
  document.querySelectorAll('.ps-chk').forEach(c => c.checked = chk.checked);
  psOnCheck();
}

function psConfirm() {
  const checked = [...document.querySelectorAll('.ps-chk:checked')];
  if (!checked.length) return;
  const items = checked.map(c => ({
    sku: c.value, name: c.dataset.name,
    price: parseFloat(c.dataset.price)||0,
    stock: c.dataset.stock,
  }));
  uiCloseModal('product-selector-modal');
  if (_psCb) _psCb(items);
}
