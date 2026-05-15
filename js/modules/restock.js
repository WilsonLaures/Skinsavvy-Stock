// js/modules/restock.js

function restockRender() {
  const el = document.getElementById('restock-list');
  if (!db.restockRules.length) {
    el.innerHTML = '<div class="card"><div class="empty">No restock rules set.</div></div>';
    return;
  }

  el.innerHTML = db.restockRules.map((r, idx) => {
    const p     = db.products.find(x => x.sku === r.sku);
    const stock = p ? p.stock : 0;
    const isLow = stock <= r.min;
    return `
      <div class="card restock-row">
        <div style="flex:1">
          <span style="font-weight:700;font-size:13px">${p ? p.name : r.sku}</span>
          <code style="margin-left:6px">${r.sku}</code>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">
            Alert when ≤ ${r.min} units · Reorder qty: ${r.qty}
          </div>
        </div>
        <span style="font-weight:700;color:${isLow ? 'var(--red)' : 'var(--teal)'}">${stock} in stock</span>
        ${isLow ? '<span class="badge badge-red">Low Stock</span>' : ''}
        <button class="btn btn-sm btn-danger" onclick="restockDelete(${idx})"><i class="ti ti-trash"></i></button>
      </div>`;
  }).join('');
}

function restockOpenAdd() {
  populateProductSelect('rs-sku');
  document.getElementById('rs-min').value = 5;
  document.getElementById('rs-qty').value = 20;
  uiOpenModal('restock-modal');
}

function restockSave() {
  db.restockRules.push({
    sku: document.getElementById('rs-sku').value,
    min: parseInt(document.getElementById('rs-min').value) || 5,
    qty: parseInt(document.getElementById('rs-qty').value) || 20,
  });
  dbPersist();
  restockRender();
  dashboardRender();
  uiCloseModal('restock-modal');
  uiToast('Restock rule saved');
}

function restockDelete(idx) {
  if (!confirm('Delete this rule?')) return;
  db.restockRules.splice(idx, 1);
  dbPersist();
  restockRender();
}

function restockInit() {
  uiRegisterPageHook('restock', restockRender);
  document.getElementById('btn-add-restock')?.addEventListener('click', restockOpenAdd);
  document.getElementById('btn-save-restock')?.addEventListener('click', restockSave);
}
