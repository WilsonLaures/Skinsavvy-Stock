// js/modules/categories.js

function categoriesRender() {
  const el   = document.getElementById('cat-list');
  const tops = db.categories.filter(c => !c.parent);

  if (!tops.length) {
    el.innerHTML = '<div class="card"><div class="empty">No categories.</div></div>';
    return;
  }

  el.innerHTML = tops.map(c => {
    const children = db.categories.filter(x => x.parent === c.name);
    const pCount   = db.products.filter(p =>
      p.category === c.name || children.some(ch => ch.name === p.category)
    ).length;
    const topIdx = db.categories.indexOf(c);

    return `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${children.length ? '10px' : '0'}">
          <div>
            <span style="font-weight:700;font-size:13px">${c.name}</span>
            ${c.desc ? `<span style="font-size:11px;color:var(--text2);margin-left:8px">${c.desc}</span>` : ''}
            <span class="badge badge-gray" style="margin-left:8px">${pCount} product${pCount !== 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="categoriesOpenEdit(${topIdx})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="categoriesDelete(${topIdx})"><i class="ti ti-trash"></i></button>
          </div>
        </div>
        ${children.length ? `
          <div class="cat-children">
            ${children.map(ch => {
              const cnt    = db.products.filter(p => p.category === ch.name).length;
              const chIdx  = db.categories.indexOf(ch);
              return `<div class="cat-child">
                <span>${ch.name}</span>
                <span style="font-size:11px;color:var(--text2)">${cnt}</span>
                <button class="btn btn-sm" onclick="categoriesOpenEdit(${chIdx})" style="padding:1px 6px"><i class="ti ti-edit" style="font-size:11px"></i></button>
                <button class="btn btn-sm btn-danger" onclick="categoriesDelete(${chIdx})" style="padding:1px 6px"><i class="ti ti-trash" style="font-size:11px"></i></button>
              </div>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }).join('');
}

function categoriesOpenAdd() {
  document.getElementById('cat-edit-idx').value = -1;
  document.getElementById('cat-modal-title').textContent = 'Add Category';
  ['cat-name','cat-desc'].forEach(id => document.getElementById(id).value = '');
  categoriesPopulateParentSelect();
  uiOpenModal('cat-modal');
}

function categoriesOpenEdit(idx) {
  const c = db.categories[idx];
  document.getElementById('cat-edit-idx').value          = idx;
  document.getElementById('cat-modal-title').textContent = 'Edit Category';
  document.getElementById('cat-name').value = c.name;
  document.getElementById('cat-desc').value = c.desc || '';
  categoriesPopulateParentSelect(c.parent);
  uiOpenModal('cat-modal');
}

function categoriesPopulateParentSelect(selected = '') {
  const el = document.getElementById('cat-parent');
  el.innerHTML = '<option value="">— Top Level —</option>' +
    db.categories
      .filter(c => !c.parent)
      .map(c => `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${c.name}</option>`)
      .join('');
}

function categoriesSave() {
  const name = document.getElementById('cat-name').value.trim();
  if (!name) return;

  const record = {
    name,
    parent: document.getElementById('cat-parent').value,
    desc:   document.getElementById('cat-desc').value,
  };

  const editIdx = parseInt(document.getElementById('cat-edit-idx').value);
  if (editIdx >= 0) db.categories[editIdx] = record;
  else db.categories.push(record);

  dbPersist();
  appRenderAll();
  uiCloseModal('cat-modal');
  uiToast('Category saved');
}

function categoriesDelete(idx) {
  if (!confirm('Delete category? Products in this category will become uncategorised.')) return;
  db.categories.splice(idx, 1);
  dbPersist();
  appRenderAll();
}

function categoriesInit() {
  uiRegisterPageHook('categories', categoriesRender);
  document.getElementById('btn-add-category')?.addEventListener('click', categoriesOpenAdd);
  document.getElementById('btn-save-category')?.addEventListener('click', categoriesSave);
}
