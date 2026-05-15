// js/modules/purchases.js
// Status: 'pending' | 'partial' | 'received'

let _purPageState = { page:1, perPage:50, filter:'' };

function purchasesNormalise(p) {
  if (p.items&&p.items.length) return p;
  return {...p,items:[{sku:p.sku||'',product:p.product||'',qty:p.qty||1,price:p.price||0}]};
}
function purchasesTotals(p) {
  const n=purchasesNormalise(p);
  const sub=n.items.reduce((t,it)=>t+it.qty*it.price,0);
  return {subtotal:sub,delivery:p.delivery||0,total:sub+(p.delivery||0)};
}

const PUR_STATUS = {
  pending:  { label:'Pending',   color:'amber', icon:'ti-clock' },
  partial:  { label:'Partial',   color:'blue',  icon:'ti-package-import' },
  received: { label:'Received',  color:'teal',  icon:'ti-circle-check' },
};

function _purStatusBadge(p) {
  const st = p.status || 'received';
  const s  = PUR_STATUS[st] || PUR_STATUS.received;
  return `<span class="badge badge-${s.color}"><i class="ti ${s.icon}" style="font-size:10px"></i> ${s.label}</span>`;
}

// ── List ──────────────────────────────────────────────────────────────
function purchasesRender(filter) {
  if (filter !== undefined) _purPageState.filter = filter;
  const {filter:f, page, perPage} = _purPageState;

  const all = db.purchases.filter(p => {
    const n=purchasesNormalise(p);
    return !f||(p.supplier||'').toLowerCase().includes(f)||p.id.toLowerCase().includes(f)||(p.notes||'').toLowerCase().includes(f)||n.items.some(it=>it.sku.toLowerCase().includes(f)||it.product.toLowerCase().includes(f));
  });

  const pages = Math.max(1, Math.ceil(all.length/perPage));
  _purPageState.page = Math.min(page, pages);
  const start = (_purPageState.page-1)*perPage;
  const list  = all.slice(start, start+perPage);

  const tbody = document.getElementById('pur-body');
  if (!list.length) { tbody.innerHTML='<tr><td colspan="10"><div class="empty">No purchases found.</div></td></tr>'; }
  else {
    tbody.innerHTML = list.map(p => {
      const n=purchasesNormalise(p);
      const {subtotal,delivery,total}=purchasesTotals(p);
      const idx=db.purchases.indexOf(p);
      const cnt=n.items.length;
      const sum=n.items.slice(0,2).map(it=>it.product||it.sku).join(', ')+(cnt>2?` +${cnt-2} more`:'');
      const st  = p.status||'received';
      return `<tr class="txn-row" onclick="purchasesOpenDetail(${idx})" style="cursor:pointer">
        <td><code>${p.id}</code></td><td>${p.date}</td><td>${p.arrival||'—'}</td><td>${p.supplier}</td>
        <td>${_purStatusBadge(p)}</td>
        <td><span class="item-count-badge">${cnt} item${cnt!==1?'s':''}</span><span class="item-summary"> ${sum}</span></td>
        <td>${fmtRp(subtotal)}</td><td>${delivery?fmtRp(delivery):'—'}</td>
        <td style="font-weight:700;color:var(--blue)">${fmtRp(total)}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button class="btn btn-sm" title="Edit" onclick="purchasesOpenEdit(${idx})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm btn-danger" title="Delete" onclick="purchasesDelete(${idx})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }

  renderPagination('pur-pagination', all.length, _purPageState.page, perPage,
    p => { _purPageState.page=p; purchasesRender(); },
    pp => { _purPageState.perPage=pp; _purPageState.page=1; purchasesRender(); }
  );
}

// ── Detail view ───────────────────────────────────────────────────────
function purchasesOpenDetail(idx) {
  const p=db.purchases[idx];if(!p)return;
  const n=purchasesNormalise(p);
  const {subtotal,delivery,total}=purchasesTotals(p);
  const st = p.status||'received';

  document.getElementById('detail-modal-title').textContent = 'Purchase — '+p.id;
  document.getElementById('detail-modal-body').innerHTML = `
    <div class="detail-meta-grid">
      <div class="detail-meta-item"><div class="detail-meta-label">Date</div><div class="detail-meta-value">${p.date}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Arrival</div><div class="detail-meta-value">${p.arrival||'—'}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Supplier</div><div class="detail-meta-value">${p.supplier}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Status</div><div class="detail-meta-value">${_purStatusBadge(p)}</div></div>
      ${p.notes?`<div class="detail-meta-item fg2"><div class="detail-meta-label">Notes</div><div class="detail-meta-value">${p.notes}</div></div>`:''}
    </div>

    ${st!=='received'?`<div class="status-action-bar">
      <span style="font-size:13px">Change status:</span>
      ${Object.entries(PUR_STATUS).filter(([k])=>k!==st).map(([k,v])=>`
        <button class="btn btn-sm badge-${v.color}" style="font-size:12px" onclick="purchasesSetStatus(${idx},'${k}')">
          Mark as ${v.label}
        </button>`).join('')}
      ${st!=='received'?`<button class="btn btn-sm btn-success" onclick="purchasesReceive(${idx})">
        <i class="ti ti-plus"></i> Receive & Add Stock
      </button>`:''}
    </div>`:''}

    <div class="sec-title" style="margin-top:16px;margin-bottom:8px">Items</div>
    <div class="tbl-wrap" style="margin:0 0 14px">
      <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Eff. Cost</th><th>Subtotal</th></tr></thead>
      <tbody>${n.items.map((it,i)=>{
        const totalUnits=n.items.reduce((s,x)=>s+x.qty,0);
        const ds=totalUnits?(delivery/totalUnits):0;
        return`<tr>
          <td style="color:var(--text2)">${i+1}</td><td><code>${it.sku}</code></td><td>${it.product}</td>
          <td>${it.qty}</td><td>${fmtRp(it.price)}</td>
          <td style="color:var(--teal);font-weight:600">${fmtRp(it.price+ds)}</td>
          <td style="font-weight:600">${fmtRp(it.qty*it.price)}</td>
        </tr>`;
      }).join('')}</tbody></table>
    </div>
    <div class="entry-totals">
      <div class="entry-totals-row"><span>Items Subtotal</span><span>${fmtRp(subtotal)}</span></div>
      <div class="entry-totals-row"><span>Delivery Fee</span><span>${fmtRp(delivery)}</span></div>
      <div class="entry-totals-row entry-totals-grand"><span>Total</span><span style="color:var(--blue)">${fmtRp(total)}</span></div>
    </div>`;

  document.getElementById('detail-edit-btn').onclick   = ()=>{ uiCloseModal('detail-modal'); purchasesOpenEdit(idx); };
  document.getElementById('detail-delete-btn').onclick = ()=>{ uiCloseModal('detail-modal'); purchasesDelete(idx); };
  uiOpenModal('detail-modal');
}

function purchasesSetStatus(idx, status) {
  db.purchases[idx].status = status;
  dbPersist(); uiCloseModal('detail-modal'); appRenderAll(); uiToast('Status updated');
}

function purchasesReceive(idx) {
  const p=db.purchases[idx];
  const n=purchasesNormalise(p);
  // Only add stock if not already received
  if (p.status !== 'received') {
    n.items.forEach(it=>{const prod=db.products.find(x=>x.sku===it.sku);if(prod)prod.stock=(prod.stock||0)+it.qty;});
    p.status='received';
    dbPersist(); uiCloseModal('detail-modal'); appRenderAll();
    uiToast('Purchase received — stock updated');
  }
}

// ── Modal state ───────────────────────────────────────────────────────
let _pItems=[], _pEditIdx=-1;

function purchasesOpenAdd() {
  _pEditIdx=-1;_pItems=[];
  document.getElementById('pur-modal-title').textContent='New Purchase';
  document.getElementById('pur-id').value=genId('PUR');
  document.getElementById('pur-supplier-sel').innerHTML=db.suppliers.length?db.suppliers.map(s=>`<option>${s.name}</option>`).join(''):'<option>Unknown</option>';
  document.getElementById('pur-date').value=todayStr();
  document.getElementById('pur-arrival').value='';
  document.getElementById('pur-delivery').value=0;
  document.getElementById('pur-notes').value='';
  document.getElementById('pur-status-sel').value='pending';
  _purRenderItems();_purRecalc();
  uiOpenModal('pur-modal');
}

function purchasesOpenEdit(idx) {
  const p=db.purchases[idx];if(!p)return;
  _pEditIdx=idx;
  const n=purchasesNormalise(p);
  document.getElementById('pur-modal-title').textContent='Edit Purchase';
  document.getElementById('pur-id').value=p.id;
  document.getElementById('pur-supplier-sel').innerHTML=db.suppliers.length?db.suppliers.map(s=>`<option ${s.name===p.supplier?'selected':''}>${s.name}</option>`).join(''):`<option>${p.supplier}</option>`;
  document.getElementById('pur-date').value=p.date;
  document.getElementById('pur-arrival').value=p.arrival||'';
  document.getElementById('pur-delivery').value=p.delivery||0;
  document.getElementById('pur-notes').value=p.notes||'';
  document.getElementById('pur-status-sel').value=p.status||'received';
  _pItems=n.items.map(it=>({...it}));
  _purRenderItems();_purRecalc();
  uiOpenModal('pur-modal');
}

function _purRenderItems() {
  const tbody=document.getElementById('pur-items-body');
  if(!_pItems.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty" style="padding:20px">Click <strong>Add Products</strong> to pick items.</div></td></tr>`;return;}
  tbody.innerHTML=_pItems.map((it,i)=>`<tr class="entry-row">
    <td style="font-weight:500">${it.product||it.sku}</td><td><code>${it.sku}</code></td>
    <td><input type="number" class="entry-input" value="${it.qty}" min="1" style="width:70px" oninput="pRowChange(${i},'qty',this.value)"></td>
    <td><input type="number" class="entry-input" value="${it.price||''}" min="0" placeholder="0" oninput="pRowChange(${i},'price',this.value)"></td>
    <td class="entry-subtotal" id="p-sub-${i}">${fmtRp(it.qty*it.price)}</td>
    <td class="entry-eff" id="p-eff-${i}" style="color:var(--teal);font-weight:600">${fmtRp(it.price)}</td>
    <td><button class="btn btn-sm btn-danger" onclick="pRowRemove(${i})"><i class="ti ti-trash"></i></button></td>
  </tr>`).join('');
}
function pRowChange(i,f,v){_pItems[i][f]=f==='qty'?(parseInt(v)||1):(parseFloat(v)||0);const el=document.getElementById('p-sub-'+i);if(el)el.textContent=fmtRp(_pItems[i].qty*_pItems[i].price);_purRecalc();}
function pRowRemove(i){_pItems.splice(i,1);_purRenderItems();_purRecalc();}
function purchasesAddFromSelector(selected){selected.forEach(sel=>{const ex=_pItems.find(it=>it.sku===sel.sku);if(ex)ex.qty+=1;else{const last=getLastBuyPrice(sel.sku);_pItems.push({sku:sel.sku,product:sel.name,qty:1,price:last||0});}});_purRenderItems();_purRecalc();}

function _purRecalc(){
  const sub=_pItems.reduce((t,it)=>t+(it.qty||0)*(it.price||0),0);
  const del=parseFloat(document.getElementById('pur-delivery').value)||0;
  const total=sub+del;const tu=_pItems.reduce((t,it)=>t+(it.qty||0),0);const dpu=tu?del/tu:0;
  document.getElementById('pur-subtotal').textContent=fmtRp(sub);
  document.getElementById('pur-delivery-display').textContent=fmtRp(del);
  document.getElementById('pur-grand-total').textContent=fmtRp(total);
  _pItems.forEach((_,i)=>{const el=document.getElementById('p-eff-'+i);if(el)el.textContent=fmtRp(_pItems[i].price+dpu);});
  const note=document.getElementById('pur-delivery-note');
  if(note)note.textContent=del>0&&tu>0?`Delivery ${fmtRp(del)} ÷ ${tu} units = ${fmtRp(dpu)}/unit effective cost`:'';
}

function purchasesSave() {
  const valid=_pItems.filter(it=>it.sku&&it.qty>0);
  if(!valid.length){alert('Add at least one product first.');return;}
  if(valid.some(it=>it.price===0)&&!confirm('Some items have price Rp 0. Continue?'))return;
  const del=parseFloat(document.getElementById('pur-delivery').value)||0;
  const tu=valid.reduce((t,it)=>t+it.qty,0);const dpu=tu?del/tu:0;
  const items=valid.map(it=>({...it,effectivePrice:it.price+dpu}));
  const newStatus = document.getElementById('pur-status-sel').value;
  const rec={
    id:document.getElementById('pur-id').value,
    date:document.getElementById('pur-date').value,
    arrival:document.getElementById('pur-arrival').value,
    supplier:document.getElementById('pur-supplier-sel').value,
    delivery:del,notes:document.getElementById('pur-notes').value.trim(),
    status:newStatus,
    items,sku:valid[0].sku,product:valid[0].product,qty:valid[0].qty,price:valid[0].price,
  };

  if(_pEditIdx>=0){
    const old=db.purchases[_pEditIdx];
    const oldSt=old.status||'received';
    // Reverse stock only if old was received
    if(oldSt==='received'){
      const oldN=purchasesNormalise(old);
      oldN.items.forEach(it=>{const p=db.products.find(x=>x.sku===it.sku);if(p)p.stock=Math.max(0,(p.stock||0)-it.qty);});
    }
    db.purchases[_pEditIdx]=rec;
    uiToast('Purchase updated');
  } else {
    db.purchases.push(rec);
    uiToast('Purchase saved');
  }

  // Add stock if status is received
  if(newStatus==='received'){
    valid.forEach(it=>{const p=db.products.find(x=>x.sku===it.sku);if(p)p.stock=(p.stock||0)+it.qty;});
  }

  dbPersist();appRenderAll();uiCloseModal('pur-modal');
}

function purchasesDelete(idx){
  confirmDelete('Delete this purchase?',()=>{
    const p=db.purchases[idx];
    // Reverse stock if was received
    if((p.status||'received')==='received'){
      const n=purchasesNormalise(p);
      n.items.forEach(it=>{const prod=db.products.find(x=>x.sku===it.sku);if(prod)prod.stock=Math.max(0,(prod.stock||0)-it.qty);});
    }
    db.purchases.splice(idx,1);dbPersist();appRenderAll();uiToast('Purchase deleted');
  });
}

// ── CSV Import ────────────────────────────────────────────────────────
function purchasesOpenImport(){document.getElementById('pur-import-csv').value='';document.getElementById('pur-import-preview').textContent='';document.getElementById('pur-import-file').value='';uiOpenModal('pur-import-modal');}
function purchasesImportLoad(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{document.getElementById('pur-import-csv').value=e.target.result;purchasesImportPreview();};r.readAsText(f);}
function purchasesImportPreview(){const lines=document.getElementById('pur-import-csv').value.trim().split('\n').filter(Boolean);document.getElementById('pur-import-preview').textContent=lines.length>1?`Found ${lines.length-1} rows.`:'Paste CSV above.';}
function purchasesImportProcess(){
  const raw=document.getElementById('pur-import-csv').value.trim();
  const lines=raw.split('\n').filter(Boolean).slice(1);const groups={};
  lines.forEach(line=>{const cols=parseCSVLine(line);if(cols.length<6)return;const[purId,date,arrival,supplier,sku,productName,qty,price,delivery]=cols;if(!sku)return;const id=purId||genId('PUR');if(!groups[id])groups[id]={id,date:date||todayStr(),arrival:arrival||'',supplier:supplier||'Unknown',delivery:parseFloat(delivery)||0,status:'received',items:[]};groups[id].items.push({sku:sku.trim().toUpperCase(),product:productName||sku,qty:parseInt(qty)||1,price:parseFloat(price)||0});});
  let count=0;
  Object.values(groups).forEach(rec=>{if(!rec.items.length)return;const tu=rec.items.reduce((s,it)=>s+it.qty,0);const dpu=tu?rec.delivery/tu:0;rec.items=rec.items.map(it=>({...it,effectivePrice:it.price+dpu}));rec.sku=rec.items[0].sku;rec.product=rec.items[0].product;rec.qty=rec.items[0].qty;rec.price=rec.items[0].price;db.purchases.push(rec);rec.items.forEach(it=>{const p=db.products.find(x=>x.sku===it.sku);if(p)p.stock=(p.stock||0)+it.qty;});count++;});
  dbPersist();appRenderAll();uiCloseModal('pur-import-modal');uiToast(`Imported ${count} purchase${count!==1?'s':''}`);
}

function purchasesInit(){
  uiRegisterPageHook('purchases',()=>purchasesRender());
  document.getElementById('btn-add-purchase')?.addEventListener('click',purchasesOpenAdd);
  document.getElementById('btn-save-purchase')?.addEventListener('click',purchasesSave);
  document.getElementById('btn-pur-add-products')?.addEventListener('click',()=>productSelectorOpen('multi',purchasesAddFromSelector,false));
  document.getElementById('btn-export-purchases')?.addEventListener('click',()=>exportCSV('purchases'));
  document.getElementById('btn-import-purchases')?.addEventListener('click',purchasesOpenImport);
  document.getElementById('btn-pur-import-process')?.addEventListener('click',purchasesImportProcess);
  document.getElementById('pur-import-file')?.addEventListener('change',e=>purchasesImportLoad(e.target));
  document.getElementById('pur-import-csv')?.addEventListener('input',purchasesImportPreview);
  document.getElementById('pur-delivery')?.addEventListener('input',_purRecalc);
  document.getElementById('pur-search')?.addEventListener('input',e=>purchasesRender(e.target.value.toLowerCase()));
}
