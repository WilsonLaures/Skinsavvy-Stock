// js/modules/fees.js

function feesRender() {
  const el = document.getElementById('fee-list');
  if (!db.fees.length) {
    el.innerHTML = '<div class="empty">No admin fees configured.</div>';
    return;
  }
  el.innerHTML = db.fees.map((f, idx) => `
    <div class="fee-row">
      <div class="row-info">
        <strong>${f.name}</strong>
        <span style="font-size:11px;color:var(--text2)">
          ${f.type === 'percent' ? f.amount + '%' : fmtRp(f.amount)}
          ${f.cap ? ' · cap ' + fmtRp(f.cap) : ''}
        </span>
      </div>
      <span class="badge ${f.type === 'percent' ? 'badge-pink' : 'badge-blue'}">${f.type === 'percent' ? '%' : 'Fixed'}</span>
      <button class="btn btn-sm" onclick="feesOpenEdit(${idx})"><i class="ti ti-edit"></i></button>
      <button class="btn btn-sm btn-danger" onclick="feesDelete(${idx})"><i class="ti ti-trash"></i></button>
    </div>`).join('');
}

function feesOpenAdd() {
  document.getElementById('fee-edit-idx').value = -1;
  document.getElementById('fee-modal-title').textContent = 'Add Admin Fee';
  ['fee-name','fee-amount','fee-cap'].forEach(id => document.getElementById(id).value = '');
  uiOpenModal('fee-modal');
}

function feesOpenEdit(idx) {
  const f = db.fees[idx];
  document.getElementById('fee-edit-idx').value          = idx;
  document.getElementById('fee-modal-title').textContent = 'Edit Fee';
  document.getElementById('fee-name').value   = f.name;
  document.getElementById('fee-type').value   = f.type;
  document.getElementById('fee-amount').value = f.amount;
  document.getElementById('fee-cap').value    = f.cap || '';
  uiOpenModal('fee-modal');
}

function feesSave() {
  const name = document.getElementById('fee-name').value.trim();
  if (!name) return;

  const record = {
    name,
    type:   document.getElementById('fee-type').value,
    amount: parseFloat(document.getElementById('fee-amount').value) || 0,
    cap:    document.getElementById('fee-cap').value ? parseFloat(document.getElementById('fee-cap').value) : null,
  };

  const editIdx = parseInt(document.getElementById('fee-edit-idx').value);
  if (editIdx >= 0) db.fees[editIdx] = record;
  else db.fees.push(record);

  dbPersist();
  feesRender();
  uiCloseModal('fee-modal');
  uiToast('Fee saved');
}

function feesDelete(idx) {
  if (!confirm('Delete this fee?')) return;
  db.fees.splice(idx, 1);
  dbPersist();
  feesRender();
  uiToast('Fee deleted');
}

function feesInit() {
  uiRegisterPageHook('admin-fees', feesRender);
  document.getElementById('btn-add-fee')?.addEventListener('click', feesOpenAdd);
  document.getElementById('btn-save-fee')?.addEventListener('click', feesSave);
}
