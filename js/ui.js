// js/ui.js

// ── Toast ─────────────────────────────────────────────────────────────
let _toastTimer = null;
function uiToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Modals ────────────────────────────────────────────────────────────
function uiOpenModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.classList.add('modal-open');
}
function uiCloseModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.classList.remove('modal-open');
  }
}

function uiInitModalBackdrops() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        if (!document.querySelector('.modal-overlay.open')) {
          document.body.classList.remove('modal-open');
        }
      }
    });
  });
}

function uiInitCloseButtons() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => uiCloseModal(btn.dataset.close));
  });
}

// ── Navigation ────────────────────────────────────────────────────────
const _pageHooks = {};
function uiRegisterPageHook(page, fn) { _pageHooks[page] = fn; }
function uiOnPageActivate(page)       { if (_pageHooks[page]) _pageHooks[page](); }

function uiInitNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      const pageEl = document.getElementById('page-' + page);
      if (pageEl) pageEl.classList.add('active');
      uiOnPageActivate(page);
      closeMobileSidebar();
    });
  });
}

// ── Desktop sidebar collapse ──────────────────────────────────────────
function uiInitSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const btn     = document.getElementById('btn-sidebar-toggle');
  const icon    = document.getElementById('sidebar-toggle-icon');
  if (!btn || !sidebar) return;

  if (localStorage.getItem('gs_sidebar_collapsed') === '1') {
    sidebar.classList.add('collapsed');
    if (icon) icon.className = 'ti ti-layout-sidebar-left-expand';
  }

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const c = sidebar.classList.contains('collapsed');
    if (icon) icon.className = c
      ? 'ti ti-layout-sidebar-left-expand'
      : 'ti ti-layout-sidebar-left-collapse';
    localStorage.setItem('gs_sidebar_collapsed', c ? '1' : '0');
  });
}

// ── Mobile sidebar drawer ─────────────────────────────────────────────
function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('mobile-open');
  if (overlay) overlay.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.classList.remove('modal-open');
  }
}

function uiInitMobileMenu() {
  // Use event delegation on document in case btn isn't in DOM yet
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-mobile-menu')) {
      openMobileSidebar();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────
function uiInit() {
  uiInitNav();
  uiInitModalBackdrops();
  uiInitCloseButtons();
  uiInitSidebarToggle();
  uiInitMobileMenu();
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 600) closeMobileSidebar();
  });
}
