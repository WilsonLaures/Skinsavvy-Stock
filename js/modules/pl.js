// js/modules/pl.js

function plPopulateDropdowns() {
  const mSel=document.getElementById('pl-month'), ySel=document.getElementById('pl-year');
  if(!mSel||!ySel) return;
  const savedM=mSel.value, savedY=ySel.value, now=new Date();
  mSel.innerHTML = MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  mSel.value = savedM||now.getMonth()+1;
  const allYears=[...new Set([now.getFullYear(),now.getFullYear()-1,now.getFullYear()+1,
    ...db.sales.map(s=>new Date(s.date).getFullYear()),
    ...db.purchases.map(p=>new Date(p.date).getFullYear()),
  ])].sort();
  ySel.innerHTML=allYears.map(y=>`<option value="${y}">${y}</option>`).join('');
  ySel.value=savedY||now.getFullYear();
  plRender();
}

function plRender() {
  const m=parseInt(document.getElementById('pl-month').value);
  const y=parseInt(document.getElementById('pl-year').value);
  const isMon=(dateStr,tm,ty)=>{const d=new Date(dateStr);return d.getMonth()+1===tm&&d.getFullYear()===ty;};

  const mSales     = db.sales.filter(s=>isMon(s.date,m,y));
  const mPurchases = db.purchases.filter(p=>isMon(p.date,m,y));
  const mReturns   = db.returns.filter(r=>isMon(r.date,m,y));
  const mCFIncome  = db.cashflow.filter(c=>c.type==='Income'&&isMon(c.date,m,y)).reduce((s,c)=>s+c.amount,0);
  const mCFExpense = db.cashflow.filter(c=>c.type==='Expense'&&isMon(c.date,m,y)).reduce((s,c)=>s+c.amount,0);

  const revenue     = mSales.reduce((s,x)=>s+salesTotals(x).subtotal,0);
  const feesTotal   = mSales.reduce((s,x)=>s+salesTotals(x).feeAmt,0);
  const netRevenue  = revenue - feesTotal;
  const cogs        = mSales.reduce((s,x)=>{
    const norm=salesNormalise(x);
    return s+norm.items.reduce((sum,it)=>sum+getAvgBuyPrice(it.sku)*it.qty,0);
  },0);
  const grossProfit = netRevenue - cogs;
  const delivery    = mPurchases.reduce((s,p)=>s+(p.delivery||0),0);
  const refunds     = mReturns.reduce((s,r)=>s+(r.refund||0),0);
  const netProfit   = grossProfit - delivery - refunds + mCFIncome - mCFExpense;
  const margin      = revenue?Math.round(netProfit/revenue*100):0;

  document.getElementById('pl-summary').innerHTML=`
    <div class="sec-title">Summary — ${MONTHS[m-1]} ${y}</div>
    <div class="pl-section">
      <div class="pl-section-title">Revenue</div>
      <div class="pl-row"><span>Gross Revenue</span><span class="profit-pos">${fmtRp(revenue)}</span></div>
      <div class="pl-row"><span>Admin Fees Deducted</span><span class="profit-neg">−${fmtRp(feesTotal)}</span></div>
      <div class="pl-row"><span style="font-weight:600">Net Revenue</span><span style="font-weight:600">${fmtRp(netRevenue)}</span></div>
    </div>
    <div class="pl-section">
      <div class="pl-section-title">Cost of Goods</div>
      <div class="pl-row"><span>COGS</span><span class="profit-neg">−${fmtRp(cogs)}</span></div>
      <div class="pl-row"><span style="font-weight:600">Gross Profit</span><span class="${grossProfit>=0?'profit-pos':'profit-neg'}">${fmtRp(grossProfit)}</span></div>
    </div>
    <div class="pl-section">
      <div class="pl-section-title">Other Deductions</div>
      <div class="pl-row"><span>Delivery Costs</span><span class="profit-neg">−${fmtRp(delivery)}</span></div>
      <div class="pl-row"><span>Refunds / Returns</span><span class="profit-neg">−${fmtRp(refunds)}</span></div>
      <div class="pl-row"><span>Other Expenses</span><span class="profit-neg">−${fmtRp(mCFExpense)}</span></div>
    </div>
    <div class="pl-section">
      <div class="pl-section-title">Other Income</div>
      <div class="pl-row"><span>Other Income</span><span class="profit-pos">+${fmtRp(mCFIncome)}</span></div>
    </div>
    <div class="pl-row total ${netProfit>=0?'profit-pos':'profit-neg'}"><span>Net Profit</span><span>${fmtRp(netProfit)}</span></div>
    <div style="margin-top:6px;font-size:11px;color:var(--text2)">Net Margin: ${margin}% | Orders: ${mSales.length}</div>`;

  // 6-month chart
  const labels=[],revData=[],costData=[];
  for(let i=5;i>=0;i--){
    let tm=m-i,ty=y; while(tm<=0){tm+=12;ty--;}
    const ms=db.sales.filter(s=>isMon(s.date,tm,ty));
    const mp=db.purchases.filter(p=>isMon(p.date,tm,ty));
    const cfExp=db.cashflow.filter(c=>c.type==='Expense'&&isMon(c.date,tm,ty)).reduce((s,c)=>s+c.amount,0);
    labels.push(MONTHS[tm-1].slice(0,3)+' '+ty);
    revData.push(ms.reduce((s,x)=>s+salesTotals(x).subtotal,0));
    costData.push(
      ms.reduce((s,x)=>{const n=salesNormalise(x);return s+n.items.reduce((sum,it)=>sum+getAvgBuyPrice(it.sku)*it.qty,0);},0)+
      mp.reduce((s,p)=>s+(p.delivery||0),0)+cfExp
    );
  }
  chartLine('plLineChart',labels,[
    {label:'Revenue',data:revData,borderColor:'#D4537E',backgroundColor:'#D4537E22',tension:.3,fill:true},
    {label:'Total Cost',data:costData,borderColor:'#E24B4A',borderDash:[4,4],tension:.3,fill:false},
  ]);

  // Detail tables
  document.getElementById('pl-detail').innerHTML=`
    <div class="sec-title">Sales Detail — ${MONTHS[m-1]} ${y}</div>
    ${mSales.length?`<table><thead><tr><th>Sale ID</th><th>Date</th><th>Items</th><th>Subtotal</th><th>Fees</th><th>Net</th></tr></thead>
    <tbody>${mSales.map(s=>{
      const {subtotal,feeAmt,net}=salesTotals(s);
      const norm=salesNormalise(s);
      const itemsStr=norm.items.map(it=>it.product||it.sku).join(', ');
      return`<tr><td><code>${s.id}</code></td><td>${s.date}</td><td style="font-size:11px;color:var(--text2)">${itemsStr}</td>
        <td>${fmtRp(subtotal)}</td><td class="profit-neg">−${fmtRp(feeAmt)}</td><td class="profit-pos">${fmtRp(net)}</td></tr>`;
    }).join('')}</tbody></table>`:'<div class="empty">No sales this month.</div>'}
    ${mCFIncome||mCFExpense?`
      <div class="sec-title" style="margin-top:16px">Other Income & Expenses — ${MONTHS[m-1]} ${y}</div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${db.cashflow.filter(c=>isMon(c.date,m,y)).map(c=>`
        <tr><td>${c.date}</td>
        <td><span class="badge ${c.type==='Income'?'badge-teal':'badge-red'}">${c.type}</span></td>
        <td>${c.category||'—'}</td><td>${c.description||'—'}</td>
        <td class="${c.type==='Income'?'profit-pos':'profit-neg'}">${c.type==='Expense'?'−':''}${fmtRp(c.amount)}</td></tr>`).join('')}
      </tbody></table>`:''}`;
}

function plInit() {
  uiRegisterPageHook('pl', plPopulateDropdowns);
  document.getElementById('btn-export-pl')?.addEventListener('click',()=>exportCSV('pl'));
  document.getElementById('pl-month')?.addEventListener('change', plRender);
  document.getElementById('pl-year')?.addEventListener('change', plRender);
}
