// js/app.js

// ── CSV line parser ───────────────────────────────────────────────────
function parseCSVLine(line) {
  const result=[]; let cur='',inQ=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){inQ=!inQ;}else if(c===','&&!inQ){result.push(cur.trim());cur='';}else{cur+=c;}}
  result.push(cur.trim()); return result;
}

// ── Shared: Confirm-delete dialog ────────────────────────────────────
function confirmDelete(message, onConfirm) {
  document.getElementById('confirm-delete-msg').textContent = message;
  document.getElementById('confirm-delete-ok').onclick = () => {
    uiCloseModal('confirm-delete-modal');
    onConfirm();
  };
  uiOpenModal('confirm-delete-modal');
}

// ── Shared: Pagination renderer ───────────────────────────────────────
function renderPagination(containerId, total, currentPage, perPage, onPageChange, onPerPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) { el.innerHTML=''; return; }

  // Page buttons — show max 7 around current
  let pageBtns = '';
  const range = (s,e) => Array.from({length:e-s+1},(_,i)=>s+i);
  let nums;
  if (pages <= 7) {
    nums = range(1, pages);
  } else if (currentPage <= 4) {
    nums = [...range(1,5), '…', pages];
  } else if (currentPage >= pages-3) {
    nums = [1, '…', ...range(pages-4, pages)];
  } else {
    nums = [1, '…', ...range(currentPage-1, currentPage+1), '…', pages];
  }
  pageBtns = nums.map(n => n==='…'
    ? `<span class="pg-ellipsis">…</span>`
    : `<button class="pg-btn ${n===currentPage?'active':''}" onclick="(${onPageChange.toString()})(${n})">${n}</button>`
  ).join('');

  el.innerHTML = `
    <div class="pagination-wrap">
      <div class="pg-info">${total} record${total!==1?'s':''} · Page ${currentPage} of ${pages}</div>
      <div class="pg-controls">
        <button class="pg-btn" ${currentPage===1?'disabled':''} onclick="(${onPageChange.toString()})(${currentPage-1})"><i class="ti ti-chevron-left" style="font-size:12px"></i></button>
        ${pageBtns}
        <button class="pg-btn" ${currentPage===pages?'disabled':''} onclick="(${onPageChange.toString()})(${currentPage+1})"><i class="ti ti-chevron-right" style="font-size:12px"></i></button>
      </div>
      <div class="pg-perpage">
        Show
        <select onchange="(${onPerPageChange.toString()})(parseInt(this.value))" style="font-size:12px;padding:3px 6px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text)">
          ${[50,100,200].map(n=>`<option value="${n}" ${n===perPage?'selected':''}>${n}</option>`).join('')}
        </select>
        per page
      </div>
    </div>`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────
function appInit() {
  dbLoad(); uiInit();
  inventoryInit(); salesInit(); purchasesInit(); returnsInit();
  feesInit(); suppliersInit(); categoriesInit(); brandsInit();
  bundlesInit(); targetsInit(); restockInit(); cashflowInit();
  plInit(); dashboardInit();

  document.getElementById('btn-backup')?.addEventListener('click', dbExport);
  document.getElementById('btn-restore')?.addEventListener('click', ()=>document.getElementById('import-db-file').click());
  document.getElementById('import-db-file')?.addEventListener('change', e=>{if(e.target.files[0])dbImport(e.target.files[0]);e.target.value='';});
  document.getElementById('btn-process-import')?.addEventListener('click', importProcess);
  document.getElementById('import-file')?.addEventListener('change', e=>importLoadFile(e.target));
  document.getElementById('import-csv')?.addEventListener('input', importPreview);

  appRenderAll();
}

function appRenderAll() {
  inventoryRender(); salesRender(); purchasesRender(); returnsRender();
  feesRender(); suppliersRender(); categoriesRender(); brandsRender();
  bundlesRender(); restockRender(); targetsRender(); cashflowRender();
  dashboardRender(); populateCategoryFilters(); plPopulateDropdowns();
}

// ── CSV Export ────────────────────────────────────────────────────────
function exportCSV(type) {
  let rows=[],filename='';
  switch(type){
    case 'sales':
      rows=[['Sale ID','Date','Customer','SKU','Product','Qty','Unit Price','Subtotal','Admin Fee','Net Sales']];
      db.sales.forEach(s=>{const n=salesNormalise(s);const {subtotal,feeAmt,net}=salesTotals(s);n.items.forEach((it,i)=>{rows.push([i===0?s.id:'',i===0?s.date:'',i===0?(s.customer||'Unknown'):'',it.sku,it.product,it.qty,it.price,i===0?subtotal.toFixed(0):'',i===0?feeAmt.toFixed(0):'',i===0?net.toFixed(0):'']);});});
      filename='glowstock_sales.csv';break;
    case 'purchases':
      rows=[['Purchase ID','Date','Arrival','Supplier','Status','SKU','Product','Qty','Unit Price','Eff. Price','Subtotal','Delivery','Total']];
      db.purchases.forEach(p=>{const n=purchasesNormalise(p);const {subtotal,delivery,total}=purchasesTotals(p);n.items.forEach((it,i)=>{rows.push([i===0?p.id:'',i===0?p.date:'',i===0?(p.arrival||''):'',i===0?p.supplier:'',i===0?(p.status||'received'):'',it.sku,it.product,it.qty,it.price,it.effectivePrice?it.effectivePrice.toFixed(0):'',i===0?subtotal.toFixed(0):'',i===0?delivery:'',i===0?total.toFixed(0):'']);});});
      filename='glowstock_purchases.csv';break;
    case 'inventory':
      rows=[['Name','SKU','Brand','Category','Stock','Avg Buy','Last Buy','Sell Price','Margin %','Net Profit','Supplier']];
      db.products.forEach(p=>{const avg=getAvgBuyPrice(p.sku),last=getLastBuyPrice(p.sku);const margin=avg?Math.round((p.sell-avg)/p.sell*100):0;rows.push([p.name,p.sku,p.brand||'',p.category,p.stock,Math.round(avg),Math.round(last),p.sell,margin,Math.round(p.sell-avg),p.supplier||'']);});
      filename='glowstock_inventory.csv';break;
    case 'cashflow':
      rows=[['ID','Date','Type','Category','Description','Amount','Notes']];
      db.cashflow.forEach(c=>rows.push([c.id,c.date,c.type,c.category||'',c.description||'',c.amount,c.notes||'']));
      filename='glowstock_cashflow.csv';break;
    case 'pl':{
      rows=[['Month','Revenue','Admin Fees','Net Revenue','COGS','Gross Profit','Delivery','Refunds','Other Income','Other Expense','Net Profit','Margin %']];
      const now=new Date();let m=now.getMonth()+1,y=now.getFullYear();
      for(let i=0;i<12;i++){const iM=(d,tm,ty)=>{const dt=new Date(d);return dt.getMonth()+1===tm&&dt.getFullYear()===ty;};const ms=db.sales.filter(s=>iM(s.date,m,y));const mp=db.purchases.filter(p=>iM(p.date,m,y));const mr=db.returns.filter(r=>iM(r.date,m,y));const rev=ms.reduce((s,x)=>s+salesTotals(x).subtotal,0);const fee=ms.reduce((s,x)=>s+salesTotals(x).feeAmt,0);const cog=ms.reduce((s,x)=>{const n=salesNormalise(x);return s+n.items.reduce((t,it)=>t+getAvgBuyPrice(it.sku)*it.qty,0);},0);const del=mp.reduce((s,p)=>s+(p.delivery||0),0);const ref=mr.reduce((s,r)=>s+(r.refund||0),0);const cfIn=db.cashflow.filter(c=>c.type==='Income'&&iM(c.date,m,y)).reduce((s,c)=>s+c.amount,0);const cfEx=db.cashflow.filter(c=>c.type==='Expense'&&iM(c.date,m,y)).reduce((s,c)=>s+c.amount,0);const net=rev-fee-cog-del-ref+cfIn-cfEx;rows.push([MONTHS[m-1]+' '+y,rev,fee,(rev-fee).toFixed(0),cog,(rev-fee-cog).toFixed(0),del,ref,cfIn,cfEx,net.toFixed(0),(rev?Math.round(net/rev*100):0)+'%']);if(--m===0){m=12;y--;}}
      filename='glowstock_pl.csv';break;
    }
  }
  const bom='\uFEFF';
  const csv=bom+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=filename;a.click();
  uiToast('Exported: '+filename);
}

// ── Shopee Import ─────────────────────────────────────────────────────
function importOpenModal(){document.getElementById('import-csv').value='';document.getElementById('import-preview').textContent='';document.getElementById('import-file').value='';uiOpenModal('import-modal');}
function importLoadFile(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{document.getElementById('import-csv').value=e.target.result;importPreview();};r.readAsText(f);}
function importPreview(){const lines=document.getElementById('import-csv').value.trim().split('\n').filter(Boolean);const count=lines.length-1;document.getElementById('import-preview').textContent=count>0?`Found ${count} data row${count!==1?'s':''}. Click Import.`:'Paste CSV above.';}
function importProcess(){
  const lines=document.getElementById('import-csv').value.trim().split('\n').filter(Boolean).slice(1);let count=0;
  lines.forEach(line=>{const cols=parseCSVLine(line);if(cols.length<7)return;const[orderId,date,buyer,sku,productName,qty,price]=cols;if(!sku||!price)return;db.sales.push({id:orderId||genId('SALE'),date:date||todayStr(),customer:buyer||'Unknown',sku,product:productName||sku,qty:parseInt(qty)||1,price:parseFloat(price)||0,feeIdx:'',feeIndices:[]});const p=db.products.find(x=>x.sku===sku);if(p)p.stock=Math.max(0,p.stock-(parseInt(qty)||1));count++;});
  dbPersist();appRenderAll();uiCloseModal('import-modal');uiToast(`Imported ${count} order${count!==1?'s':''}`);
}

document.addEventListener('DOMContentLoaded', appInit);
