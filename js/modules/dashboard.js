// js/modules/dashboard.js

// ── Date range filter state ───────────────────────────────────────────
let _dashFilter = 'all'; // 'today','7d','30d','month','year','all'
let _dashMonth  = new Date().getMonth() + 1;
let _dashYear   = new Date().getFullYear();

function _dashFilterSales(sales) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  return sales.filter(s => {
    const d = new Date(s.date);
    if (_dashFilter === 'today')  return s.date === today;
    if (_dashFilter === '7d')     return d >= new Date(now - 7*864e5);
    if (_dashFilter === '30d')    return d >= new Date(now - 30*864e5);
    if (_dashFilter === 'month')  return d.getMonth()+1===_dashMonth && d.getFullYear()===_dashYear;
    if (_dashFilter === 'year')   return d.getFullYear()===_dashYear;
    return true; // 'all'
  });
}

function _dashFilterPurchases(purchases) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  return purchases.filter(p => {
    const d = new Date(p.date);
    if (_dashFilter === 'today')  return p.date === today;
    if (_dashFilter === '7d')     return d >= new Date(now - 7*864e5);
    if (_dashFilter === '30d')    return d >= new Date(now - 30*864e5);
    if (_dashFilter === 'month')  return d.getMonth()+1===_dashMonth && d.getFullYear()===_dashYear;
    if (_dashFilter === 'year')   return d.getFullYear()===_dashYear;
    return true;
  });
}

function dashboardRender() {
  const fSales     = _dashFilterSales(db.sales);
  const fPurchases = _dashFilterPurchases(db.purchases);
  const fReturns   = _dashFilterSales(db.returns); // same date logic

  const totalRev    = fSales.reduce((s,x) => s + salesTotals(x).subtotal, 0);
  const totalFees   = fSales.reduce((s,x) => s + salesTotals(x).feeAmt, 0);
  const netRev      = totalRev - totalFees;
  const cogs        = fSales.reduce((s,x) => {
    const n = salesNormalise(x);
    return s + n.items.reduce((t,it) => t + getAvgBuyPrice(it.sku)*it.qty, 0);
  }, 0);
  const grossProfit = netRev - cogs;
  const totalSpend  = fPurchases.reduce((s,p) => {
    const n = purchasesNormalise(p);
    return s + n.items.reduce((t,it) => t+it.qty*it.price, 0) + (p.delivery||0);
  }, 0);
  const totalRets   = fReturns.reduce((s,r) => s + (r.refund||0), 0);

  // ── Date filter controls ──
  const filterEl = document.getElementById('dash-filter-bar');
  if (filterEl) {
    filterEl.innerHTML = `
      <div class="dash-filter-row">
        <div class="dash-filter-btns">
          ${['all','today','7d','30d','month','year'].map(f => `
            <button class="dash-filt-btn ${_dashFilter===f?'active':''}" onclick="dashSetFilter('${f}')">
              ${f==='all'?'All Time':f==='today'?'Today':f==='7d'?'7 Days':f==='30d'?'30 Days':f==='month'?'Month':'Year'}
            </button>`).join('')}
        </div>
        ${_dashFilter==='month'?`<div class="dash-filter-selects">
          <select onchange="dashSetMonth(this.value)" style="font-size:12px;padding:5px 8px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text)">
            ${MONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===_dashMonth?'selected':''}>${m}</option>`).join('')}
          </select>
          <input type="number" value="${_dashYear}" onchange="dashSetYear(this.value)" style="width:80px;font-size:12px;padding:5px 8px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text)">
        </div>`:''}
        ${_dashFilter==='year'?`<div class="dash-filter-selects">
          <input type="number" value="${_dashYear}" onchange="dashSetYear(this.value)" style="width:80px;font-size:12px;padding:5px 8px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text)">
        </div>`:''}
      </div>`;
  }

  // ── Metrics ──
  document.getElementById('dash-metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Total Revenue</div><div class="metric-value" style="color:var(--pink)">${fmtRp(totalRev)}</div></div>
    <div class="metric"><div class="metric-label">Net After Fees</div><div class="metric-value" style="color:var(--teal)">${fmtRp(netRev)}</div></div>
    <div class="metric"><div class="metric-label">Gross Profit</div><div class="metric-value ${grossProfit>=0?'profit-pos':'profit-neg'}">${fmtRp(grossProfit)}</div></div>
    <div class="metric"><div class="metric-label">Total Purchases</div><div class="metric-value" style="color:var(--amber)">${fmtRp(totalSpend)}</div></div>
    <div class="metric"><div class="metric-label">Total Returns</div><div class="metric-value profit-neg">${fmtRp(totalRets)}</div></div>
    <div class="metric"><div class="metric-label">Orders</div><div class="metric-value" style="color:var(--blue)">${fSales.length}</div></div>`;

  // ── Monthly target bar (always current month) ──
  const now = new Date(); const m = now.getMonth()+1, y = now.getFullYear();
  const tgt = db.targets.find(t => +t.month===m && +t.year===y);
  const mRev = db.sales.filter(s=>{const d=new Date(s.date);return d.getMonth()+1===m&&d.getFullYear()===y;}).reduce((s,x)=>s+salesTotals(x).subtotal,0);
  const tbarEl = document.getElementById('dash-target-bar');
  if (tgt) {
    const pct = Math.min(100,Math.round(mRev/tgt.revenue*100));
    tbarEl.innerHTML = `<div class="card" style="padding:12px 16px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:5px;font-size:12px">
        <span style="font-weight:600">Monthly Target — ${MONTHS[m-1]} ${y}</span>
        <span style="color:var(--text2)">${fmtRp(mRev)} / ${fmtRp(tgt.revenue)} (${pct}%)</span>
      </div>
      <div class="target-bar-wrap"><div class="target-bar" style="width:${pct}%;background:${pct>=100?'var(--teal)':'var(--pink)'}"></div></div>
    </div>`;
  } else { tbarEl.innerHTML = ''; }

  // ── Charts ──
  const catTotals = {};
  fSales.forEach(s => {
    const n = salesNormalise(s);
    n.items.forEach(it => {
      const p = db.products.find(x=>x.sku===it.sku);
      const cat = p?p.category:'Other';
      catTotals[cat] = (catTotals[cat]||0) + it.qty*it.price;
    });
  });
  const catKeys = Object.keys(catTotals);
  const palette = ['#D4537E','#1D9E75','#378ADD','#BA7517','#534AB7','#5DCAA5','#F0997B','#97C459'];
  chartDoughnut('catChart', catKeys, catKeys.map(k=>catTotals[k]), palette.slice(0,catKeys.length));
  const recent = [...fSales].slice(-8);
  chartBar('salesChart', recent.map(s=>s.id.slice(-5)), recent.map(s=>salesTotals(s).subtotal), '#D4537E');

  // ── Restock alerts ──
  const alertsEl = document.getElementById('dash-alerts');
  const seen = new Set(), alerts = [];
  db.restockRules.forEach(r => {
    const p = db.products.find(x=>x.sku===r.sku);
    if (p&&p.stock<=r.min&&!seen.has(p.sku)) { alerts.push({...p,rMin:r.min,rQty:r.qty}); seen.add(p.sku); }
  });
  db.products.forEach(p => {
    if (!seen.has(p.sku)&&p.stock<=(p.minStock||5)) { alerts.push({...p,rMin:p.minStock||5,rQty:null}); seen.add(p.sku); }
  });
  if (!alerts.length) {
    alertsEl.innerHTML = '<div style="font-size:12px;color:var(--text2)">✓ All products have sufficient stock.</div>';
  } else {
    alertsEl.innerHTML = alerts.map(a=>`<div class="alert-row ${a.stock===0?'danger':'warn'}">
      <i class="ti ti-${a.stock===0?'alert-circle':'bell'}" style="color:${a.stock===0?'var(--red)':'var(--amber)'}"></i>
      <span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.name}</span>
      <code style="flex-shrink:0">${a.sku}</code>
      <span style="font-weight:700;color:${a.stock===0?'var(--red)':'var(--amber)'};flex-shrink:0">${a.stock} left</span>
      ${a.rQty?`<span style="font-size:11px;color:var(--text2);flex-shrink:0">reorder ${a.rQty}</span>`:''}
    </div>`).join('');
  }

  // ── Top products ──
  const skuRev = {};
  fSales.forEach(s => { const n=salesNormalise(s); n.items.forEach(it=>{skuRev[it.sku]=(skuRev[it.sku]||0)+it.qty*it.price;}); });
  const top = Object.entries(skuRev).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topEl = document.getElementById('dash-top');
  if (!top.length) { topEl.innerHTML='<div style="font-size:12px;color:var(--text2)">No sales in this period.</div>'; return; }
  topEl.innerHTML = `<div class="tbl-wrap" style="margin:0"><table><thead><tr><th>Product</th><th>SKU</th><th>Units</th><th>Revenue</th></tr></thead>
    <tbody>${top.map(([sku,rev])=>{
      const p=db.products.find(x=>x.sku===sku);
      const units=fSales.reduce((s,sale)=>{const n=salesNormalise(sale);return s+n.items.filter(it=>it.sku===sku).reduce((a,it)=>a+it.qty,0);},0);
      return `<tr><td style="font-weight:600">${p?p.name:sku}</td><td><code>${sku}</code></td><td>${units}</td><td class="profit-pos">${fmtRp(rev)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function dashSetFilter(f) { _dashFilter = f; dashboardRender(); }
function dashSetMonth(v)   { _dashMonth = parseInt(v); dashboardRender(); }
function dashSetYear(v)    { _dashYear  = parseInt(v); dashboardRender(); }

function dashboardInit() {
  uiRegisterPageHook('dashboard', dashboardRender);
  document.getElementById('btn-import-csv')?.addEventListener('click', importOpenModal);
  document.getElementById('btn-export-sales')?.addEventListener('click', () => exportCSV('sales'));
}
