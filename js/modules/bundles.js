// js/modules/bundles.js — uses product selector modal instead of plain <select>

let _bundleItems = [];

function bundlesRender() {
  const el = document.getElementById('bundles-list');
  if (!db.bundles.length) { el.innerHTML='<div class="card"><div class="empty">No bundles created.</div></div>'; return; }
  el.innerHTML = db.bundles.map((b,idx) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <span style="font-weight:700;font-size:13px">${b.name}</span>
          <code style="margin-left:6px">${b.sku}</code>
          <span style="color:var(--teal);font-weight:700;margin-left:10px">${fmtRp(b.price)}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="bundlesOpenEdit(${idx})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="bundlesDelete(${idx})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${b.items.map(it=>{const p=db.products.find(x=>x.sku===it.sku);return`<div class="bundle-item"><code>${it.sku}</code><span>${p?p.name:it.sku}</span><span style="color:var(--pink);font-weight:700">×${it.qty}</span></div>`;}).join('')}
      </div>
    </div>`).join('');
}

function bundlesOpenAdd() {
  _bundleItems=[];
  document.getElementById('bun-edit-idx').value=-1;
  document.getElementById('bun-modal-title').textContent='Create Bundle';
  ['bun-name','bun-sku','bun-price'].forEach(id=>document.getElementById(id).value='');
  _bundlesRenderItems();
  uiOpenModal('bundle-modal');
}
function bundlesOpenEdit(idx) {
  const b=db.bundles[idx];
  _bundleItems=b.items.map(x=>({...x}));
  document.getElementById('bun-edit-idx').value=idx;
  document.getElementById('bun-modal-title').textContent='Edit Bundle';
  document.getElementById('bun-name').value=b.name;
  document.getElementById('bun-sku').value=b.sku;
  document.getElementById('bun-price').value=b.price;
  _bundlesRenderItems();
  uiOpenModal('bundle-modal');
}

function _bundlesRenderItems() {
  const el=document.getElementById('bun-items-list');
  if (!_bundleItems.length) { el.innerHTML='<div style="font-size:12px;color:var(--text2);padding:6px 0">No items added yet. Click <strong>Add Products</strong>.</div>'; return; }
  el.innerHTML=_bundleItems.map((it,i)=>{
    const p=db.products.find(x=>x.sku===it.sku);
    return `<div class="bundle-item">
      <code>${it.sku}</code>
      <span style="flex:1">${p?p.name:it.sku}</span>
      <input type="number" class="entry-input" value="${it.qty}" min="1" style="width:60px;text-align:center"
        oninput="bundleItemQtyChange(${i},this.value)">
      <span style="font-size:11px;color:var(--text2)">×qty</span>
      <button class="btn btn-sm btn-danger" onclick="bundlesRemoveItem(${i})" style="padding:1px 6px"><i class="ti ti-x" style="font-size:11px"></i></button>
    </div>`;
  }).join('');
}
function bundleItemQtyChange(i, v) { _bundleItems[i].qty=parseInt(v)||1; }

// Called from product selector
function bundlesAddFromSelector(selected) {
  selected.forEach(sel=>{
    const ex=_bundleItems.find(x=>x.sku===sel.sku);
    if (ex) ex.qty+=1;
    else _bundleItems.push({sku:sel.sku, qty:1});
  });
  _bundlesRenderItems();
}

function bundlesRemoveItem(i) { _bundleItems.splice(i,1); _bundlesRenderItems(); }

function bundlesSave() {
  const name=document.getElementById('bun-name').value.trim();
  const sku=document.getElementById('bun-sku').value.trim().toUpperCase();
  if (!name||!sku||!_bundleItems.length) { alert('Name, SKU, and at least one item are required.'); return; }
  const rec={name,sku,price:parseFloat(document.getElementById('bun-price').value)||0,items:[..._bundleItems]};
  const ei=parseInt(document.getElementById('bun-edit-idx').value);
  if (ei>=0) db.bundles[ei]=rec; else db.bundles.push(rec);
  dbPersist(); bundlesRender(); uiCloseModal('bundle-modal'); uiToast('Bundle saved');
}
function bundlesDelete(idx) {
  if (!confirm('Delete this bundle?')) return;
  db.bundles.splice(idx,1); dbPersist(); bundlesRender();
}

function bundlesInit() {
  uiRegisterPageHook('bundles', bundlesRender);
  document.getElementById('btn-add-bundle')?.addEventListener('click', bundlesOpenAdd);
  document.getElementById('btn-save-bundle')?.addEventListener('click', bundlesSave);
  document.getElementById('btn-bun-add-products')?.addEventListener('click', ()=>productSelectorOpen('multi', bundlesAddFromSelector, false));
}
