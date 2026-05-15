// js/modules/suppliers.js

function suppliersRender() {
  const el = document.getElementById('supplier-list');
  if (!db.suppliers.length) {
    el.innerHTML = '<div class="card"><div class="empty">No suppliers added.</div></div>';
    return;
  }
  el.innerHTML = db.suppliers.map((s, idx) => `
    <div class="card supplier-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:13px">${s.name}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="suppliersOpenEdit(${idx})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="suppliersDelete(${idx})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div class="supplier-meta">
        ${s.contact ? `<span><i class="ti ti-user"></i> ${s.contact}</span>` : ''}
        ${s.phone   ? `<span><i class="ti ti-phone"></i> ${s.phone}</span>` : ''}
        <span><i class="ti ti-credit-card"></i> ${s.terms}</span>
        <span><i class="ti ti-clock"></i> ${s.lead}d lead</span>
        ${s.notes   ? `<span><i class="ti ti-notes"></i> ${s.notes}</span>` : ''}
      </div>
    </div>`).join('');
}

function suppliersOpenAdd() {
  document.getElementById('sup-edit-idx').value = -1;
  document.getElementById('sup-modal-title').textContent = 'Add Supplier';
  ['sup-name','sup-contact','sup-phone','sup-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('sup-lead').value = 3;
  uiOpenModal('supplier-modal');
}

function suppliersOpenEdit(idx) {
  const s = db.suppliers[idx];
  document.getElementById('sup-edit-idx').value          = idx;
  document.getElementById('sup-modal-title').textContent = 'Edit Supplier';
  document.getElementById('sup-name').value    = s.name;
  document.getElementById('sup-contact').value = s.contact;
  document.getElementById('sup-phone').value   = s.phone;
  document.getElementById('sup-terms').value   = s.terms;
  document.getElementById('sup-lead').value    = s.lead;
  document.getElementById('sup-notes').value   = s.notes;
  uiOpenModal('supplier-modal');
}

function suppliersSave() {
  const name = document.getElementById('sup-name').value.trim();
  if (!name) return;

  const record = {
    name,
    contact: document.getElementById('sup-contact').value,
    phone:   document.getElementById('sup-phone').value,
    terms:   document.getElementById('sup-terms').value,
    lead:    document.getElementById('sup-lead').value,
    notes:   document.getElementById('sup-notes').value,
  };

  const editIdx = parseInt(document.getElementById('sup-edit-idx').value);
  if (editIdx >= 0) db.suppliers[editIdx] = record;
  else db.suppliers.push(record);

  dbPersist();
  suppliersRender();
  uiCloseModal('supplier-modal');
  uiToast('Supplier saved');
}

function suppliersDelete(idx) {
  if (!confirm('Delete this supplier?')) return;
  db.suppliers.splice(idx, 1);
  dbPersist();
  suppliersRender();
}

function suppliersInit() {
  uiRegisterPageHook('suppliers', suppliersRender);
  document.getElementById('btn-add-supplier')?.addEventListener('click', suppliersOpenAdd);
  document.getElementById('btn-save-supplier')?.addEventListener('click', suppliersSave);
}
