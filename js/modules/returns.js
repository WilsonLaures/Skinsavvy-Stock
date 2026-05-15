// js/modules/returns.js
let _retPageState = { page:1, perPage:50 };

function returnsRender() {
  const {page,perPage} = _retPageState;
  const all = db.returns;
  const pages = Math.max(1,Math.ceil(all.length/perPage));
  _retPageState.page = Math.min(page,pages);
  const list = all.slice((_retPageState.page-1)*perPage, _retPageState.page*perPage);

  const tbody=document.getElementById('return-body');
  if(!all.length){tbody.innerHTML='<tr><td colspan="10"><div class="empty">No returns logged.</div></td></tr>';return;}
  tbody.innerHTML=list.map((r,i)=>`<tr onclick="returnsOpenDetail(${all.indexOf(r)})" style="cursor:pointer">
    <td><code>${r.id}</code></td><td>${r.date}</td><td>${r.saleId||'—'}</td><td>${r.customer}</td>
    <td><code>${r.sku}</code></td><td>${r.product}</td><td>${r.qty}</td>
    <td class="profit-neg">−${fmtRp(r.refund)}</td><td>${r.reason}</td>
    <td onclick="event.stopPropagation()" style="white-space:nowrap">
      <button class="btn btn-sm btn-danger" onclick="returnsDelete(${all.indexOf(r)})"><i class="ti ti-trash"></i></button>
    </td>
  </tr>`).join('');

  renderPagination('ret-pagination',all.length,_retPageState.page,perPage,
    p=>{_retPageState.page=p;returnsRender();},
    pp=>{_retPageState.perPage=pp;_retPageState.page=1;returnsRender();}
  );
}

function returnsOpenDetail(idx) {
  const r=db.returns[idx];if(!r)return;
  document.getElementById('detail-modal-title').textContent='Return — '+r.id;
  document.getElementById('detail-modal-body').innerHTML=`
    <div class="detail-meta-grid">
      <div class="detail-meta-item"><div class="detail-meta-label">Date</div><div class="detail-meta-value">${r.date}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Customer</div><div class="detail-meta-value">${r.customer}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Linked Sale</div><div class="detail-meta-value">${r.saleId||'—'}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">SKU</div><div class="detail-meta-value"><code>${r.sku}</code></div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Product</div><div class="detail-meta-value">${r.product}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Qty Returned</div><div class="detail-meta-value">${r.qty}</div></div>
      <div class="detail-meta-item"><div class="detail-meta-label">Refund</div><div class="detail-meta-value profit-neg">−${fmtRp(r.refund)}</div></div>
      <div class="detail-meta-item fg2"><div class="detail-meta-label">Reason</div><div class="detail-meta-value">${r.reason||'—'}</div></div>
    </div>`;
  document.getElementById('detail-edit-btn').style.display='none';
  document.getElementById('detail-delete-btn').onclick=()=>{uiCloseModal('detail-modal');returnsDelete(idx);};
  uiOpenModal('detail-modal');
}

function returnsOpenAdd(){
  populateProductSelect('ret-sku');
  document.getElementById('ret-date').value=todayStr();
  document.getElementById('ret-qty').value=1;
  ['ret-sale-id','ret-customer','ret-refund','ret-reason'].forEach(id=>document.getElementById(id).value='');
  returnsFillProduct();uiOpenModal('return-modal');
}
function returnsFillProduct(){const sku=document.getElementById('ret-sku').value;const p=db.products.find(x=>x.sku===sku);document.getElementById('ret-product').value=p?p.name:'';}
function returnsSave(){
  const sku=document.getElementById('ret-sku').value;const qty=parseInt(document.getElementById('ret-qty').value)||1;
  const ret={id:genId('RET'),date:document.getElementById('ret-date').value,saleId:document.getElementById('ret-sale-id').value,customer:document.getElementById('ret-customer').value||'Unknown',sku,product:document.getElementById('ret-product').value,qty,refund:parseFloat(document.getElementById('ret-refund').value)||0,reason:document.getElementById('ret-reason').value};
  db.returns.push(ret);const p=db.products.find(x=>x.sku===sku);if(p)p.stock=(p.stock||0)+qty;
  dbPersist();appRenderAll();uiCloseModal('return-modal');uiToast('Return logged');
}
function returnsDelete(idx){confirmDelete('Delete this return?',()=>{db.returns.splice(idx,1);dbPersist();appRenderAll();});}

function returnsOpenImport(){document.getElementById('ret-import-csv').value='';document.getElementById('ret-import-preview').textContent='';document.getElementById('ret-import-file').value='';uiOpenModal('ret-import-modal');}
function returnsImportLoad(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{document.getElementById('ret-import-csv').value=e.target.result;returnsImportPreview();};r.readAsText(f);}
function returnsImportPreview(){const lines=document.getElementById('ret-import-csv').value.trim().split('\n').filter(Boolean);document.getElementById('ret-import-preview').textContent=lines.length>1?`Found ${lines.length-1} rows.`:'Paste CSV above.';}
function returnsImportProcess(){
  const lines=document.getElementById('ret-import-csv').value.trim().split('\n').filter(Boolean).slice(1);let count=0;
  lines.forEach(line=>{const cols=parseCSVLine(line);if(cols.length<4)return;const[date,saleId,customer,sku,product,qty,refund,reason]=cols;if(!sku)return;const ret={id:genId('RET'),date:date||todayStr(),saleId:saleId||'',customer:customer||'Unknown',sku:sku.trim().toUpperCase(),product:product||sku,qty:parseInt(qty)||1,refund:parseFloat(refund)||0,reason:reason||''};db.returns.push(ret);const p=db.products.find(x=>x.sku===ret.sku);if(p)p.stock=(p.stock||0)+ret.qty;count++;});
  dbPersist();appRenderAll();uiCloseModal('ret-import-modal');uiToast(`Imported ${count} return${count!==1?'s':''}`);
}

function returnsInit(){
  uiRegisterPageHook('returns',returnsRender);
  document.getElementById('btn-add-return')?.addEventListener('click',returnsOpenAdd);
  document.getElementById('btn-save-return')?.addEventListener('click',returnsSave);
  document.getElementById('ret-sku')?.addEventListener('change',returnsFillProduct);
  document.getElementById('btn-import-returns')?.addEventListener('click',returnsOpenImport);
  document.getElementById('btn-ret-import-process')?.addEventListener('click',returnsImportProcess);
  document.getElementById('ret-import-file')?.addEventListener('change',e=>returnsImportLoad(e.target));
  document.getElementById('ret-import-csv')?.addEventListener('input',returnsImportPreview);
}
