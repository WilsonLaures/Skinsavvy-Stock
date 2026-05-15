// js/modules/inventory.js

// ── State ─────────────────────────────────────────────────────────────
let _invSort   = { field: 'name', dir: 'asc' };
let _invPage   = 1;
let _invPerPage = 50;

function inventoryRender(filter='', catFilter='') {
  let list = db.products.filter(p => {
    const t = !filter || p.name.toLowerCase().includes(filter) || p.sku.toLowerCase().includes(filter) || (p.brand||'').toLowerCase().includes(filter);
    const c = !catFilter || p.category === catFilter;
    return t && c;
  });

  // ── Sort ──
  list.sort((a, b) => {
    let av, bv;
    if (_invSort.field === 'name')  { av=a.name.toLowerCase();    bv=b.name.toLowerCase(); }
    else if (_invSort.field === 'sku')   { av=a.sku.toLowerCase();     bv=b.sku.toLowerCase(); }
    else if (_invSort.field === 'stock') { av=a.stock;                 bv=b.stock; }
    else if (_invSort.field === 'added') { av=db.products.indexOf(a);  bv=db.products.indexOf(b); }
    else { av=a.name.toLowerCase(); bv=b.name.toLowerCase(); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return _invSort.dir === 'asc' ? cmp : -cmp;
  });

  // ── Pagination ──
  const total   = list.length;
  const pages   = Math.max(1, Math.ceil(total / _invPerPage));
  _invPage      = Math.min(_invPage, pages);
  const start   = (_invPage - 1) * _invPerPage;
  const paged   = list.slice(start, start + _invPerPage);

  const tbody = document.getElementById('inv-body');
  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="13"><div class="empty">No products found.</div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(p => {
      const avg    = getAvgBuyPrice(p.sku);
      const last   = getLastBuyPrice(p.sku);
      const profit = p.sell - avg;
      const margin = avg ? Math.round((p.sell-avg)/p.sell*100) : 0;
      const isLow  = p.stock <= (p.minStock||5);
      const idx    = db.products.indexOf(p);
      // Pending stock from unreceived purchases
      const pending = db.purchases.filter(pur => {
        const st = pur.status||'received';
        return st !== 'received' && purchasesNormalise(pur).items.some(it=>it.sku===p.sku);
      }).reduce((s,pur) => {
        return s + purchasesNormalise(pur).items.filter(it=>it.sku===p.sku).reduce((a,it)=>a+it.qty,0);
      }, 0);
      return `<tr>
        <td style="width:32px;text-align:center">
          <input type="checkbox" class="inv-mass-chk" value="${idx}" onchange="invMassCheck()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--pink)">
        </td>
        <td style="font-weight:600">${p.name}</td>
        <td><code>${p.sku}</code></td>
        <td>${p.brand?`<span class="badge badge-gray">${p.brand}</span>`:'—'}</td>
        <td>${catBadge(p.category)}</td>
        <td>
          <span class="inline-val ${isLow?'profit-neg':''}" id="inv-stock-${idx}">${p.stock}</span>
          ${pending>0?`<span title="Pending incoming" style="font-size:10px;color:var(--amber);margin-left:3px">(+${pending} pending)</span>`:''}
          <button class="btn btn-sm inline-edit-btn" onclick="invInlineEdit(${idx},'stock')" title="Edit stock"><i class="ti ti-pencil" style="font-size:11px"></i></button>
        </td>
        <td>${avg?fmtRp(avg):'—'}</td>
        <td>${last?fmtRp(last):'—'}</td>
        <td>
          <span class="inline-val" id="inv-sell-${idx}">${fmtRp(p.sell)}</span>
          <button class="btn btn-sm inline-edit-btn" onclick="invInlineEdit(${idx},'sell')" title="Edit price"><i class="ti ti-pencil" style="font-size:11px"></i></button>
        </td>
        <td>${avg?`<span class="${margin>=0?'profit-pos':'profit-neg'}">${margin}%</span>`:'—'}</td>
        <td class="${profit>=0?'profit-pos':'profit-neg'}">${fmtRp(profit)}</td>
        <td style="font-size:11px;color:var(--text2)">${p.supplier||'—'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm" onclick="inventoryOpenEdit(${idx})" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="inventoryDelete(${idx})" title="Delete"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Render sort indicators in headers ──
  document.querySelectorAll('#page-inventory th[data-sort]').forEach(th => {
    const f = th.dataset.sort;
    const arrow = _invSort.field === f ? (_invSort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
    th.querySelector('.sort-indicator').textContent = arrow;
  });

  // ── Pagination controls ──
  renderPagination('inv-pagination', total, _invPage, _invPerPage,
    p => { _invPage = p; inventoryRender(document.getElementById('inv-search')?.value?.toLowerCase()||'', document.getElementById('inv-filter-cat')?.value||''); },
    pp => { _invPerPage = pp; _invPage = 1; inventoryRender(document.getElementById('inv-search')?.value?.toLowerCase()||'', document.getElementById('inv-filter-cat')?.value||''); }
  );

  invMassCheck();
}

function invSetSort(field) {
  if (_invSort.field === field) _invSort.dir = _invSort.dir === 'asc' ? 'desc' : 'asc';
  else { _invSort.field = field; _invSort.dir = 'asc'; }
  _invPage = 1;
  inventoryRender(document.getElementById('inv-search')?.value?.toLowerCase()||'', document.getElementById('inv-filter-cat')?.value||'');
}

// ── Inline quick-edit ─────────────────────────────────────────────────
function invInlineEdit(idx, field) {
  const p = db.products[idx];
  const cell = document.getElementById(`inv-${field}-${idx}`);
  if (!cell || cell.querySelector('input')) return;
  const cur = field === 'stock' ? p.stock : p.sell;
  cell.innerHTML = `<input type="number" class="inline-input" value="${cur}" min="0"
    onblur="invInlineSave(${idx},'${field}',this.value)"
    onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape')inventoryRender(document.getElementById('inv-search').value.toLowerCase(),document.getElementById('inv-filter-cat').value);"
    style="width:80px">`;
  const inp = cell.querySelector('input'); inp.focus(); inp.select();
}
function invInlineSave(idx, field, value) {
  const p = db.products[idx]; if (!p) return;
  p[field] = field === 'stock' ? parseInt(value)||0 : parseFloat(value)||0;
  dbPersist();
  inventoryRender(document.getElementById('inv-search')?.value?.toLowerCase()||'', document.getElementById('inv-filter-cat')?.value||'');
  uiToast(`${field==='stock'?'Stock':'Price'} updated — ${p.name}`);
}

// ── Full edit modal ───────────────────────────────────────────────────
function inventoryOpenAdd() {
  document.getElementById('inv-edit-idx').value = -1;
  document.getElementById('inv-modal-title').textContent = 'Add Product';
  ['inv-name','inv-sku','inv-sell'].forEach(id => document.getElementById(id).value='');
  document.getElementById('inv-stock').value = 0;
  document.getElementById('inv-min-stock').value = 5;
  populateCatSelect('inv-cat'); populateBrandSelect('inv-brand'); populateSupplierSelect('inv-supplier');
  uiOpenModal('inv-modal');
}
function inventoryOpenEdit(idx) {
  const p = db.products[idx];
  document.getElementById('inv-edit-idx').value = idx;
  document.getElementById('inv-modal-title').textContent = 'Edit Product';
  document.getElementById('inv-name').value = p.name;
  document.getElementById('inv-sku').value  = p.sku;
  document.getElementById('inv-sell').value = p.sell;
  document.getElementById('inv-stock').value = p.stock;
  document.getElementById('inv-min-stock').value = p.minStock||5;
  populateCatSelect('inv-cat', p.category); populateBrandSelect('inv-brand', p.brand||''); populateSupplierSelect('inv-supplier', p.supplier);
  uiOpenModal('inv-modal');
}
function inventorySave() {
  const name = document.getElementById('inv-name').value.trim();
  const sku  = document.getElementById('inv-sku').value.trim().toUpperCase();
  if (!name||!sku) { alert('Name and SKU are required.'); return; }
  const rec = { name, sku, brand:document.getElementById('inv-brand').value, category:document.getElementById('inv-cat').value, sell:parseFloat(document.getElementById('inv-sell').value)||0, stock:parseInt(document.getElementById('inv-stock').value)||0, minStock:parseInt(document.getElementById('inv-min-stock').value)||5, supplier:document.getElementById('inv-supplier').value };
  const ei = parseInt(document.getElementById('inv-edit-idx').value);
  if (ei>=0) { db.products[ei]={...db.products[ei],...rec}; uiToast('Product updated'); }
  else { db.products.push(rec); uiToast('Product added'); }
  dbPersist(); appRenderAll(); uiCloseModal('inv-modal');
}
function inventoryDelete(idx) {
  confirmDelete('Delete this product? This cannot be undone.', () => {
    db.products.splice(idx,1); dbPersist(); appRenderAll(); uiToast('Product deleted');
  });
}

// ── Mass select ───────────────────────────────────────────────────────
function invMassCheck() {
  const all = [...document.querySelectorAll('.inv-mass-chk')];
  const checked = all.filter(c=>c.checked);
  const sa = document.getElementById('inv-select-all');
  if (sa) { sa.indeterminate=checked.length>0&&checked.length<all.length; sa.checked=all.length>0&&checked.length===all.length; }
  const show = checked.length > 0;
  const priceBtn = document.getElementById('btn-mass-price');
  const delBtn   = document.getElementById('btn-mass-delete');
  const clearBtn = document.getElementById('btn-mass-clear');
  const countEl  = document.getElementById('inv-mass-count');
  if (priceBtn) priceBtn.style.display = show?'':'none';
  if (delBtn)   delBtn.style.display   = show?'':'none';
  if (clearBtn) clearBtn.style.display = show?'':'none';
  if (countEl)  countEl.textContent    = checked.length;
}
function invSelectAll(chk) { document.querySelectorAll('.inv-mass-chk').forEach(c=>c.checked=chk.checked); invMassCheck(); }
function invClearSelection() { document.querySelectorAll('.inv-mass-chk').forEach(c=>c.checked=false); invMassCheck(); }
function invGetSelectedIndices() { return [...document.querySelectorAll('.inv-mass-chk:checked')].map(c=>parseInt(c.value)); }

// ── Mass delete ───────────────────────────────────────────────────────
function invMassDelete() {
  const idxs = invGetSelectedIndices();
  if (!idxs.length) return;
  confirmDelete(`Delete ${idxs.length} product${idxs.length!==1?'s':''}? This cannot be undone.`, () => {
    // Remove in reverse order to preserve indices
    idxs.sort((a,b)=>b-a).forEach(i => db.products.splice(i,1));
    dbPersist(); appRenderAll(); uiToast(`${idxs.length} product${idxs.length!==1?'s':''} deleted`);
  });
}

// ── Mass price edit ───────────────────────────────────────────────────
function invOpenMassPrice() {
  const idxs = invGetSelectedIndices();
  if (!idxs.length) { alert('Select at least one product first.'); return; }
  document.getElementById('mass-price-mode').value = 'set';
  document.getElementById('mass-price-value').value = '';
  document.getElementById('mass-price-preview').textContent = `${idxs.length} product${idxs.length!==1?'s':''} selected`;
  uiOpenModal('mass-price-modal');
}
function invApplyMassPrice() {
  const idxs = invGetSelectedIndices();
  const mode = document.getElementById('mass-price-mode').value;
  const val  = parseFloat(document.getElementById('mass-price-value').value);
  if (isNaN(val)) { alert('Enter a valid number.'); return; }
  idxs.forEach(idx => {
    const p = db.products[idx]; if (!p) return;
    if (mode==='set')          p.sell = val;
    else if (mode==='increase_pct') p.sell = Math.round(p.sell*(1+val/100));
    else if (mode==='decrease_pct') p.sell = Math.round(Math.max(0,p.sell*(1-val/100)));
    else if (mode==='increase_amt') p.sell = p.sell+val;
    else if (mode==='decrease_amt') p.sell = Math.max(0,p.sell-val);
  });
  dbPersist(); appRenderAll(); uiCloseModal('mass-price-modal');
  uiToast(`Price updated for ${idxs.length} product${idxs.length!==1?'s':''}`);
}

// ── CSV Import ────────────────────────────────────────────────────────
function inventoryOpenImport() { document.getElementById('inv-import-csv').value=''; document.getElementById('inv-import-preview').textContent=''; document.getElementById('inv-import-file').value=''; uiOpenModal('inv-import-modal'); }
function inventoryImportLoad(input) { const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{document.getElementById('inv-import-csv').value=e.target.result;inventoryImportPreview();};r.readAsText(f); }
function inventoryImportPreview() { const lines=document.getElementById('inv-import-csv').value.trim().split('\n').filter(Boolean); document.getElementById('inv-import-preview').textContent=lines.length>1?`Found ${lines.length-1} rows.`:'Paste CSV above.'; }
function inventoryImportProcess() {
  const lines=document.getElementById('inv-import-csv').value.trim().split('\n').filter(Boolean).slice(1);
  let added=0,updated=0;
  lines.forEach(line=>{
    const cols=parseCSVLine(line);if(cols.length<2)return;
    const [name,sku,brand,category,sell,stock,minStock,supplier]=cols;if(!name||!sku)return;
    const rec={name:name.trim(),sku:sku.trim().toUpperCase(),brand:(brand||'').trim(),category:(category||'').trim(),sell:parseFloat(sell)||0,stock:parseInt(stock)||0,minStock:parseInt(minStock)||5,supplier:(supplier||'').trim()};
    const ex=db.products.find(p=>p.sku===rec.sku);
    if(ex){Object.assign(ex,rec);updated++;}else{db.products.push(rec);added++;}
  });
  dbPersist();appRenderAll();uiCloseModal('inv-import-modal');uiToast(`${added} added, ${updated} updated`);
}

function inventoryInit() {
  uiRegisterPageHook('inventory', ()=>inventoryRender());
  document.getElementById('btn-add-product')?.addEventListener('click', inventoryOpenAdd);
  document.getElementById('btn-save-product')?.addEventListener('click', inventorySave);
  document.getElementById('btn-export-inventory')?.addEventListener('click', ()=>exportCSV('inventory'));
  document.getElementById('btn-import-inventory')?.addEventListener('click', inventoryOpenImport);
  document.getElementById('btn-inv-import-process')?.addEventListener('click', inventoryImportProcess);
  document.getElementById('inv-import-file')?.addEventListener('change', e=>inventoryImportLoad(e.target));
  document.getElementById('inv-import-csv')?.addEventListener('input', inventoryImportPreview);
  document.getElementById('btn-mass-price')?.addEventListener('click', invOpenMassPrice);
  document.getElementById('btn-mass-delete')?.addEventListener('click', invMassDelete);
  document.getElementById('btn-apply-mass-price')?.addEventListener('click', invApplyMassPrice);
  document.getElementById('inv-select-all')?.addEventListener('change', e=>invSelectAll(e.target));
  document.getElementById('inv-search')?.addEventListener('input', e=>{_invPage=1;inventoryRender(e.target.value.toLowerCase(),document.getElementById('inv-filter-cat').value);});
  document.getElementById('inv-filter-cat')?.addEventListener('change', e=>{_invPage=1;inventoryRender(document.getElementById('inv-search').value.toLowerCase(),e.target.value);});
  document.getElementById('inv-sort-select')?.addEventListener('change', e=>{const [field,dir]=e.target.value.split('-');_invSort={field,dir};_invPage=1;inventoryRender(document.getElementById('inv-search')?.value?.toLowerCase()||'',document.getElementById('inv-filter-cat')?.value||'');});
}
