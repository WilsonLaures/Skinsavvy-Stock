// js/modules/cashflow.js
// Records income and expense items outside of sales/purchases.
// These feed into the P&L Report as "Other Income" and "Other Expenses".

const CASHFLOW_TYPES = ['Income', 'Expense'];
const CASHFLOW_CATS  = [
  'Advertising','Packaging','Shipping Cost','Salary','Rent','Software',
  'Equipment','Refund Given','Platform Fee','Other Income','Other Expense',
];

function cashflowRender(filter='') {
  const tbody = document.getElementById('cashflow-body');
  const list = db.cashflow.filter(c =>
    !filter ||
    (c.description||'').toLowerCase().includes(filter) ||
    (c.category||'').toLowerCase().includes(filter)
  );
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty">No entries yet.</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map((c,i) => `<tr>
    <td><code>${c.id}</code></td>
    <td>${c.date}</td>
    <td><span class="badge ${c.type==='Income'?'badge-teal':'badge-red'}">${c.type}</span></td>
    <td><span class="badge badge-gray">${c.category}</span></td>
    <td>${c.description||'—'}</td>
    <td class="${c.type==='Income'?'profit-pos':'profit-neg'}">${c.type==='Expense'?'−':''}${fmtRp(c.amount)}</td>
    <td style="font-size:11px;color:var(--text2)">${c.notes||'—'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="cashflowDelete(${i})"><i class="ti ti-trash"></i></button></td>
  </tr>`).join('');

  // Summary bar
  const totalIncome  = db.cashflow.filter(c=>c.type==='Income').reduce((s,c)=>s+c.amount,0);
  const totalExpense = db.cashflow.filter(c=>c.type==='Expense').reduce((s,c)=>s+c.amount,0);
  const net = totalIncome - totalExpense;
  const sumEl = document.getElementById('cashflow-summary');
  if (sumEl) sumEl.innerHTML = `
    <div class="metric"><div class="metric-label">Total Other Income</div><div class="metric-value profit-pos">${fmtRp(totalIncome)}</div></div>
    <div class="metric"><div class="metric-label">Total Other Expense</div><div class="metric-value profit-neg">${fmtRp(totalExpense)}</div></div>
    <div class="metric"><div class="metric-label">Net Other Cashflow</div><div class="metric-value ${net>=0?'profit-pos':'profit-neg'}">${fmtRp(net)}</div></div>`;
}

function cashflowOpenAdd() {
  document.getElementById('cf-date').value        = todayStr();
  document.getElementById('cf-amount').value      = '';
  document.getElementById('cf-description').value = '';
  document.getElementById('cf-notes').value       = '';
  document.getElementById('cf-type').value        = 'Expense';
  uiOpenModal('cashflow-modal');
}
function cashflowSave() {
  const amount = parseFloat(document.getElementById('cf-amount').value)||0;
  if (!amount) { alert('Enter an amount.'); return; }
  const record = {
    id:          genId('CF'),
    date:        document.getElementById('cf-date').value,
    type:        document.getElementById('cf-type').value,
    category:    document.getElementById('cf-category').value,
    description: document.getElementById('cf-description').value.trim(),
    amount,
    notes:       document.getElementById('cf-notes').value.trim(),
  };
  db.cashflow.push(record);
  dbPersist(); cashflowRender(); uiCloseModal('cashflow-modal'); uiToast('Entry saved');
}
function cashflowDelete(i) {
  if (!confirm('Delete this entry?')) return;
  db.cashflow.splice(i,1); dbPersist(); cashflowRender();
}

// Helpers used by P&L module
function cashflowMonthIncome(m, y) {
  return db.cashflow.filter(c => c.type==='Income' && inMonth(c.date,m,y)).reduce((s,c)=>s+c.amount,0);
}
function cashflowMonthExpense(m, y) {
  return db.cashflow.filter(c => c.type==='Expense' && inMonth(c.date,m,y)).reduce((s,c)=>s+c.amount,0);
}
function inMonth(dateStr, m, y) {
  const d = new Date(dateStr);
  return d.getMonth()+1===m && d.getFullYear()===y;
}

function cashflowInit() {
  uiRegisterPageHook('cashflow', ()=>cashflowRender());
  document.getElementById('btn-add-cashflow')?.addEventListener('click', cashflowOpenAdd);
  document.getElementById('btn-save-cashflow')?.addEventListener('click', cashflowSave);
  document.getElementById('btn-export-cashflow')?.addEventListener('click', ()=>exportCSV('cashflow'));
  document.getElementById('cashflow-search')?.addEventListener('input', e=>cashflowRender(e.target.value.toLowerCase()));
}
