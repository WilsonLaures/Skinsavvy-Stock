// js/charts.js — Chart.js wrappers that always destroy before redrawing

const _charts = {};

function chartDestroy(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function chartDoughnut(canvasId, labels, data, colors) {
  chartDestroy(canvasId);
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  _charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 8, padding: 8 } },
      },
    },
  });
}

function chartBar(canvasId, labels, data, color) {
  chartDestroy(canvasId);
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  _charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color + '88', borderColor: color, borderWidth: 1 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, autoSkip: false, maxRotation: 45 } },
        y: { ticks: { callback: v => 'Rp' + fmtNum(v), font: { size: 9 } } },
      },
    },
  });
}

function chartLine(canvasId, labels, datasets) {
  chartDestroy(canvasId);
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  _charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 10 }, boxWidth: 8 } } },
      scales: {
        x: { ticks: { font: { size: 9 } } },
        y: { ticks: { callback: v => 'Rp' + fmtNum(v), font: { size: 9 } } },
      },
    },
  });
}

// Redraw all active charts on window resize (e.g. orientation change)
window.addEventListener('resize', () => {
  Object.values(_charts).forEach(chart => {
    try { chart.resize(); } catch(e) {}
  });
});
