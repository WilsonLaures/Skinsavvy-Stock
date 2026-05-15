// js/modules/targets.js

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function targetsRender() {
  const el = document.getElementById('targets-list');
  if (!db.targets.length) {
    el.innerHTML = '<div class="card"><div class="empty">No targets set.</div></div>';
    return;
  }

  el.innerHTML = [...db.targets]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map(t => {
      const idx     = db.targets.indexOf(t);
      const mSales  = db.sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() + 1 === +t.month && d.getFullYear() === +t.year;
      });
      const rev     = mSales.reduce((s, x) => s + x.price * x.qty, 0);
      const revPct  = Math.min(100, Math.round(rev / (t.revenue || 1) * 100));
      const ordPct  = t.orders ? Math.min(100, Math.round(mSales.length / (t.orders || 1) * 100)) : null;
      const revColor = revPct >= 100 ? 'var(--teal)' : 'var(--pink)';
      const ordColor = ordPct >= 100 ? 'var(--teal)' : 'var(--blue)';

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-weight:700;font-size:14px">${MONTHS[+t.month - 1]} ${t.year}</span>
            <button class="btn btn-sm btn-danger" onclick="targetsDelete(${idx})"><i class="ti ti-trash"></i></button>
          </div>
          <div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:3px">
            <span>Revenue</span>
            <span>${fmtRp(rev)} / ${fmtRp(t.revenue)}
              <strong style="color:${revColor}">${revPct}%</strong>
            </span>
          </div>
          <div class="target-bar-wrap" style="margin-bottom:10px">
            <div class="target-bar" style="width:${revPct}%;background:${revColor}"></div>
          </div>
          ${ordPct !== null ? `
            <div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:3px">
              <span>Orders</span>
              <span>${mSales.length} / ${t.orders}
                <strong style="color:${ordColor}">${ordPct}%</strong>
              </span>
            </div>
            <div class="target-bar-wrap">
              <div class="target-bar" style="width:${ordPct}%;background:${ordColor}"></div>
            </div>` : ''}
        </div>`;
    }).join('');
}

function targetsSave() {
  db.targets.push({
    month:   document.getElementById('tgt-month').value,
    year:    document.getElementById('tgt-year').value,
    revenue: parseFloat(document.getElementById('tgt-revenue').value) || 0,
    orders:  parseInt(document.getElementById('tgt-orders').value) || 0,
  });
  dbPersist();
  targetsRender();
  dashboardRender();
  uiCloseModal('target-modal');
  uiToast('Target saved');
}

function targetsDelete(idx) {
  if (!confirm('Delete this target?')) return;
  db.targets.splice(idx, 1);
  dbPersist();
  targetsRender();
}

function targetsInit() {
  uiRegisterPageHook('targets', targetsRender);
  document.getElementById('btn-add-target')?.addEventListener('click', () => uiOpenModal('target-modal'));
  document.getElementById('btn-save-target')?.addEventListener('click', targetsSave);
}
