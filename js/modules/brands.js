// js/modules/brands.js

function brandsRender() {
  const el = document.getElementById('brands-list');
  if (!db.brands.length) {
    el.innerHTML = '<div class="card"><div class="empty">No brands added yet.</div></div>';
    return;
  }
  el.innerHTML = db.brands.map((b, i) => {
    const productCount = db.products.filter(p => p.brand === b.name).length;
    return `<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px">
      ${b.logo ? `<img src="${b.logo}" style="width:40px;height:40px;object-fit:contain;border-radius:var(--radius)">` :
        `<div style="width:40px;height:40px;border-radius:var(--radius);background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--text2)">${b.name.charAt(0).toUpperCase()}</div>`}
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${b.name}</div>
        ${b.country?`<div style="font-size:11px;color:var(--text2)">${b.country}</div>`:''}
        ${b.notes?`<div style="font-size:11px;color:var(--text2)">${b.notes}</div>`:''}
      </div>
      <span class="badge badge-gray">${productCount} product${productCount!==1?'s':''}</span>
      <button class="btn btn-sm" onclick="brandsOpenEdit(${i})"><i class="ti ti-edit"></i></button>
      <button class="btn btn-sm btn-danger" onclick="brandsDelete(${i})"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');
}

function brandsOpenAdd() {
  document.getElementById('brand-edit-idx').value = -1;
  document.getElementById('brand-modal-title').textContent = 'Add Brand';
  ['brand-name','brand-country','brand-notes'].forEach(id=>document.getElementById(id).value='');
  uiOpenModal('brand-modal');
}
function brandsOpenEdit(i) {
  const b = db.brands[i];
  document.getElementById('brand-edit-idx').value = i;
  document.getElementById('brand-modal-title').textContent = 'Edit Brand';
  document.getElementById('brand-name').value    = b.name;
  document.getElementById('brand-country').value = b.country||'';
  document.getElementById('brand-notes').value   = b.notes||'';
  uiOpenModal('brand-modal');
}
function brandsSave() {
  const name = document.getElementById('brand-name').value.trim();
  if (!name) return;
  const record = {
    name,
    country: document.getElementById('brand-country').value.trim(),
    notes:   document.getElementById('brand-notes').value.trim(),
  };
  const ei = parseInt(document.getElementById('brand-edit-idx').value);
  if (ei >= 0) db.brands[ei] = record;
  else db.brands.push(record);
  dbPersist(); brandsRender(); uiCloseModal('brand-modal'); uiToast('Brand saved');
}
function brandsDelete(i) {
  if (!confirm('Delete this brand?')) return;
  db.brands.splice(i,1); dbPersist(); brandsRender();
}

function brandsInit() {
  uiRegisterPageHook('brands', brandsRender);
  document.getElementById('btn-add-brand')?.addEventListener('click', brandsOpenAdd);
  document.getElementById('btn-save-brand')?.addEventListener('click', brandsSave);
}
