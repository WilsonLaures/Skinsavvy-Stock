// js/modules/sales.js

let _salePageState = { page: 1, perPage: 50, filter: '', catF: '' };

function salesNormalise(s) {
  if (s.items&&s.items.length) return s;
  return {...s,items:[{sku:s.sku||'',product:s.product||'',qty:s.qty||1,price:s.price||0}]};
}
function salesTotals(s) {
  const n=salesNormalise(s);
  const sub=n.items.reduce((t,it)=>t+it.qty*it.price,0);
  const fee=Array.isArray(n.feeIndices)?calcSelectedFees(n.feeIndices,sub):(n.feeIdx!==''&&n.feeIdx!=null?calcFeeAmount(n.feeIdx,sub):0);
  return {subtotal:sub,feeAmt:fee,net:sub-fee};
}

// ── List ──────────────────────────────────────────────────────────────
function salesRender(filter, catF) {
  if (filter !== undefined) _salePageState.filter = filter;
  if (catF   !== undefined) _salePageState.catF   = catF;
  const {filter:f, catF:c, page, perPage} = _salePageState;

  const all = db.sales.filter(s => {
    const n=salesNormalise(s);
    const mt=!f||(s.customer||'').toLowerCase().includes(f)||s.id.toLowerCase().includes(f)||(s.notes||'').toLowerCase().includes(f)||n.items.some(it=>it.sku.toLowerCase().includes(f)||it.product.toLowerCase().includes(f));
    const mc=!c||n.items.some(it=>{const p=db.products.find(x=>x.sku===it.sku);return p&&p.category===c;});
    return mt&&mc;
  });

  const pages = Math.max(1, Math.ceil(all.length/perPage));
  _salePageState.page = Math.min(page, pages);
  const start = (_salePageState.page-1)*perPage;
  const list  = all.slice(start, start+perPage);

  const tbody = document.getElementById('sale-body');
  if (!list.length) { tbody.innerHTML='<tr><td colspan="8"><div class="empty">No sales found.</div></td></tr>'; }
  else {
    tbody.innerHTML = list.map(s => {
      const n=salesNormalise(s);
      const {subtotal,feeAmt,net}=salesTotals(s);
      const idx=db.sales.indexOf(s);
      const cnt=n.items.length;
      const sum=n.items.slice(0,2).map(it=>it.product||it.sku).join(', ')+(cnt>2?` +${cnt-2} more`:'');
      return `<tr class="txn-row" onclick="salesOpenDetail(${idx})" style="cursor:pointer">
        <td><code>${s.id}</code></td>
        <td>${s.date}</td>
        <td>${s.customer||'Unknown'}</td>
        <td><span class="item-count-badge">${cnt} item${cnt!==1?'s':''}</span><span class="item-summary"> ${sum}</span></td>
        <td>${fmtRp(subtotal)}</td>
        <td>${feeAmt>0?`<span style="color:var(--red);font-size:12px">−${fmtRp(feeAmt)}</span>`:'—'}</td>
        <td class="profit-pos">${fmtRp(net)}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button class="btn btn-sm" title="Edit" onclick="salesOpenEdit(${idx})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-danger" title="Delete" onclick="salesDelete(${idx})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }

  renderPagination('sale-pagination', all.length, _salePageState.page, perPage,
    p => { _salePageState.page=p; salesRender(); },
    pp => { _salePageState.perPage=pp; _salePageState.page=1; salesRender(); }
  );
}

// ── Detail/View page (dedicated) ─────────────────────────────────────
function salesOpenDetail(idx) {
  const s = db.sales[idx]; if (!s) return;
  const n = salesNormalise(s);
  const {subtotal,feeAmt,net} = salesTotals(s);
  const feeIdxs = Array.isArray(n.feeIndices)?n.feeIndices:(n.feeIdx!==''&&n.feeIdx!=null?[n.feeIdx]:[]);

  document.getElementById('detail-modal-title').textContent = 'Sale — ' + s.id;
  document.getElementById('detail-modal-body').innerHTML = `
    <div class="detail-meta-grid">
      <div class="detail-meta-item"><div class="detail-meta-label">Date</div><div class="detail-meta-value">${s.date}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Customer</div><div class="detail-meta-value">${s.customer||'Unknown'}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Sale ID</div><div class="detail-meta-value"><code>${s.id}</code></div></div>
      ${s.notes?`<div class="detail-meta-item fg2"><div class="detail-meta-label">Notes</div><div class="detail-meta-value">${s.notes}</div></div>`:''}
    </div>
    <div class="sec-title" style="margin-top:16px;margin-bottom:8px">Items</div>
    <div class="tbl-wrap" style="margin:0 0 14px">
      <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
      <tbody>${n.items.map((it,i)=>`<tr>
        <td style="color:var(--text2)">${i+1}</td><td><code>${it.sku}</code></td><td>${it.product}</td>
        <td>${it.qty}</td><td>${fmtRp(it.price)}</td><td style="font-weight:600">${fmtRp(it.qty*it.price)}</td>
      </tr>`).join('')}</tbody></table>
    </div>
    <div class="entry-totals">
      <div class="entry-totals-row"><span>Subtotal</span><span>${fmtRp(subtotal)}</span></div>
      <div class="entry-totals-row"><span>Admin Fees${feeIdxs.length?` (${feeIdxs.map(i=>db.fees[i]?.name).filter(Boolean).join(', ')})`:''}</span><span class="profit-neg">−${fmtRp(feeAmt)}</span></div>
      <div class="entry-totals-row entry-totals-grand"><span>Net Sales</span><span class="profit-pos">${fmtRp(net)}</span></div>
    </div>`;
  document.getElementById('detail-edit-btn').onclick = () => { uiCloseModal('detail-modal'); salesOpenEdit(idx); };
  document.getElementById('detail-delete-btn').onclick = () => { uiCloseModal('detail-modal'); salesDelete(idx); };
  uiOpenModal('detail-modal');
}

// ── Modal state ───────────────────────────────────────────────────────
let _sItems=[], _sEditIdx=-1;

function _salesRenderFeeChecks(savedIndices) {
  const el=document.getElementById('sale-fee-checks');if(!el)return;
  if(!db.fees.length){el.innerHTML='<span style="font-size:12px;color:var(--text2)">No admin fees configured.</span>';return;}
  const defaults=savedIndices!==undefined?savedIndices:db.fees.map((_,i)=>i);
  el.innerHTML=db.fees.map((f,i)=>{
    const desc=f.type==='percent'?f.amount+'%':fmtRp(f.amount);
    return `<label class="fee-check-label"><input type="checkbox" class="fee-check" value="${i}" ${defaults.includes(i)?'checked':''} onchange="_salesRecalc()"><span>${f.name}</span><span class="fee-check-desc">${desc}${f.cap?' cap '+fmtRp(f.cap):''}</span></label>`;
  }).join('');
}
function _salesGetFees() { return [...document.querySelectorAll('.fee-check:checked')].map(c=>parseInt(c.value)); }

function salesOpenAdd() {
  _sEditIdx=-1;_sItems=[];
  document.getElementById('sale-modal-title').textContent='Record Sale';
  document.getElementById('sale-id-row').style.display='none';
  document.getElementById('sale-date').value=todayStr();
  document.getElementById('sale-customer').value='';
  document.getElementById('sale-notes').value='';
  _salesRenderFeeChecks();_salesRenderItems();_salesRecalc();
  uiOpenModal('sale-modal');
}
function salesOpenEdit(idx) {
  const s=db.sales[idx];if(!s)return;
  _sEditIdx=idx;
  const n=salesNormalise(s);
  document.getElementById('sale-modal-title').textContent='Edit Sale';
  document.getElementById('sale-id-row').style.display='';
  document.getElementById('sale-id-display').textContent=s.id;
  document.getElementById('sale-date').value=s.date;
  document.getElementById('sale-customer').value=s.customer||'';
  document.getElementById('sale-notes').value=s.notes||'';
  const saved=Array.isArray(s.feeIndices)?s.feeIndices:(s.feeIdx!==''&&s.feeIdx!=null?[s.feeIdx]:[]);
  _salesRenderFeeChecks(saved);
  _sItems=n.items.map(it=>({...it}));
  _salesRenderItems();_salesRecalc();
  uiOpenModal('sale-modal');
}

function _salesRenderItems() {
  const tbody=document.getElementById('sale-items-body');
  if(!_sItems.length){tbody.innerHTML=`<tr><td colspan="6"><div class="empty" style="padding:20px">Click <strong>Add Products</strong> to pick items.</div></td></tr>`;return;}
  tbody.innerHTML=_sItems.map((it,i)=>`<tr class="entry-row">
    <td style="font-weight:500">${it.product||it.sku}</td><td><code>${it.sku}</code></td>
    <td><input type="number" class="entry-input" value="${it.qty}" min="1" style="width:70px" oninput="sRowChange(${i},'qty',this.value)"></td>
    <td><input type="number" class="entry-input" value="${it.price||''}" min="0" placeholder="0" oninput="sRowChange(${i},'price',this.value)"></td>
    <td class="entry-subtotal" id="s-sub-${i}">${fmtRp(it.qty*it.price)}</td>
    <td><button class="btn btn-sm btn-danger" onclick="sRowRemove(${i})"><i class="ti ti-trash"></i></button></td>
  </tr>`).join('');
}
function sRowChange(i,f,v){_sItems[i][f]=f==='qty'?(parseInt(v)||1):(parseFloat(v)||0);const el=document.getElementById('s-sub-'+i);if(el)el.textContent=fmtRp(_sItems[i].qty*_sItems[i].price);_salesRecalc();}
function sRowRemove(i){_sItems.splice(i,1);_salesRenderItems();_salesRecalc();}
function salesAddFromSelector(selected){selected.forEach(sel=>{const ex=_sItems.find(it=>it.sku===sel.sku);if(ex)ex.qty+=1;else _sItems.push({sku:sel.sku,product:sel.name,qty:1,price:sel.price});});_salesRenderItems();_salesRecalc();}
function _salesRecalc(){const sub=_sItems.reduce((t,it)=>t+(it.qty||0)*(it.price||0),0);const fees=_salesGetFees();const fee=calcSelectedFees(fees,sub);document.getElementById('sale-subtotal').textContent=fmtRp(sub);document.getElementById('sale-fee-amount').textContent='− '+fmtRp(fee);document.getElementById('sale-grand-total').textContent=fmtRp(sub-fee);const names=fees.map(i=>db.fees[i]?.name).filter(Boolean);document.getElementById('sale-fee-label').textContent=names.length?names.join(' + '):'Admin Fees';}

function salesSave() {
  const valid=_sItems.filter(it=>it.sku&&it.qty>0);
  if(!valid.length){alert('Add at least one product first.');return;}
  if(valid.some(it=>it.price===0)&&!confirm('Some items have price Rp 0. Continue?'))return;
  const fees=_salesGetFees();
  const rec={id:_sEditIdx>=0?db.sales[_sEditIdx].id:genId('SALE'),date:document.getElementById('sale-date').value,customer:document.getElementById('sale-customer').value.trim()||'Unknown',feeIndices:fees,feeIdx:fees[0]??'',notes:document.getElementById('sale-notes').value.trim(),items:valid,sku:valid[0].sku,product:valid[0].product,qty:valid[0].qty,price:valid[0].price};
  if(_sEditIdx>=0){const oldN=salesNormalise(db.sales[_sEditIdx]);oldN.items.forEach(it=>{const b=db.bundles.find(b=>b.sku===it.sku);if(b)b.items.forEach(bi=>{const p=db.products.find(x=>x.sku===bi.sku);if(p)p.stock=(p.stock||0)+bi.qty*it.qty;});else{const p=db.products.find(x=>x.sku===it.sku);if(p)p.stock=(p.stock||0)+it.qty;}});db.sales[_sEditIdx]=rec;uiToast('Sale '+rec.id+' updated');}
  else{db.sales.push(rec);uiToast('Sale '+rec.id+' saved');}
  valid.forEach(it=>{const b=db.bundles.find(b=>b.sku===it.sku);if(b)b.items.forEach(bi=>{const p=db.products.find(x=>x.sku===bi.sku);if(p)p.stock=Math.max(0,p.stock-bi.qty*it.qty);});else{const p=db.products.find(x=>x.sku===it.sku);if(p)p.stock=Math.max(0,p.stock-it.qty);}});
  dbPersist();appRenderAll();uiCloseModal('sale-modal');
}
function salesDelete(idx){confirmDelete('Delete this sale?',()=>{db.sales.splice(idx,1);dbPersist();appRenderAll();uiToast('Sale deleted');});}

function salesInit() {
  uiRegisterPageHook('sales', ()=>salesRender());
  document.getElementById('btn-add-sale')?.addEventListener('click', salesOpenAdd);
  document.getElementById('btn-save-sale')?.addEventListener('click', salesSave);
  document.getElementById('btn-sale-add-products')?.addEventListener('click', ()=>productSelectorOpen('multi',salesAddFromSelector,true));
  document.getElementById('btn-import-csv-sales')?.addEventListener('click', importOpenModal);
  document.getElementById('btn-export-sales-page')?.addEventListener('click', ()=>exportCSV('sales'));
  document.getElementById('sale-search')?.addEventListener('input', e=>salesRender(e.target.value.toLowerCase(),document.getElementById('sale-filter-cat').value));
  document.getElementById('sale-filter-cat')?.addEventListener('change', e=>salesRender(document.getElementById('sale-search').value.toLowerCase(),e.target.value));
}
