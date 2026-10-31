import { state, updateState, onStateChange } from '../state/gameState.js';

// 下方功能列
const TABS = [
  { id: 'restaurant', icon: '🏠', label: '餐廳', ready: true },
  { id: 'menu', icon: '📋', label: '菜單', ready: false, desc: '設定要賣的料理和價格。' },
  { id: 'staff', icon: '🧑‍🍳', label: '員工', ready: false, desc: '招募廚師和服務生，讓出餐更快。' },
  { id: 'decor', icon: '🪑', label: '裝潢', ready: false, desc: '購買桌椅、廚房設備和裝飾，下一關就會開放！' },
  { id: 'stats', icon: '📊', label: '統計', ready: false, desc: '查看每天的收入、來客數和人氣變化。' }
];

let refs = {};

export function createHud() {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <header class="hud-top">
      <div class="hud-chip"><b id="hud-level"></b></div>
      <div class="hud-chip">🪙 <b id="hud-coins"></b></div>
      <div class="hud-chip">⭐ <b id="hud-pop"></b></div>
      <button class="hud-chip hud-open" id="hud-open"></button>
      <button class="hud-chip hud-icon-btn" id="hud-settings" aria-label="設定">⚙️</button>
    </header>
    <nav class="hud-nav" id="hud-nav"></nav>
    <div class="hud-panel" id="hud-panel" hidden>
      <div class="hud-panel-box">
        <div class="hud-panel-head">
          <h2 id="hud-panel-title"></h2>
          <button class="hud-close" id="hud-panel-close" aria-label="關閉">✕</button>
        </div>
        <div class="hud-panel-body" id="hud-panel-body"></div>
      </div>
    </div>`;
  document.body.appendChild(root);

  refs = {
    level: root.querySelector('#hud-level'),
    coins: root.querySelector('#hud-coins'),
    pop: root.querySelector('#hud-pop'),
    open: root.querySelector('#hud-open'),
    nav: root.querySelector('#hud-nav'),
    panel: root.querySelector('#hud-panel'),
    panelTitle: root.querySelector('#hud-panel-title'),
    panelBody: root.querySelector('#hud-panel-body')
  };

  buildNav();
  bindEvents(root);
  onStateChange(render);
}

function buildNav() {
  TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = 'hud-tab' + (tab.id === 'restaurant' ? ' active' : '');
    btn.dataset.id = tab.id;
    btn.innerHTML = `<span class="hud-tab-icon">${tab.icon}</span><span>${tab.label}</span>`
      + (tab.ready ? '' : '<em class="hud-soon">即將開放</em>');
    btn.addEventListener('click', () => selectTab(tab));
    refs.nav.appendChild(btn);
  });
}

function bindEvents(root) {
  refs.open.addEventListener('click', () => {
    updateState({ isOpen: !state.isOpen });
    showMessage(state.isOpen ? '開始營業！顧客會在關卡 4 登場' : '已暫停營業');
  });
  root.querySelector('#hud-settings').addEventListener('click', openSettings);
  root.querySelector('#hud-panel-close').addEventListener('click', closePanel);
  refs.panel.addEventListener('click', (e) => {
    if (e.target === refs.panel) closePanel();
  });
  // 電腦快捷鍵：1～5 切換功能列、Esc 關閉視窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
    const n = Number(e.key);
    if (n >= 1 && n <= TABS.length) selectTab(TABS[n - 1]);
  });
}

function setActive(id) {
  refs.nav.querySelectorAll('.hud-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === id);
  });
}

function selectTab(tab) {
  if (tab.ready) {
    closePanel();
    return;
  }
  setActive(tab.id);
  openPanel(`${tab.icon} ${tab.label}`,
    `<p class="hud-soon-big">即將開放</p><p>${tab.desc}</p>`);
}

function openPanel(title, html) {
  refs.panelTitle.textContent = title;
  refs.panelBody.innerHTML = html;
  refs.panel.hidden = false;
}

function closePanel() {
  refs.panel.hidden = true;
  setActive('restaurant');
}

function openSettings() {
  openPanel('⚙️ 設定', `
    <p><b>手機操作</b><br>單指拖曳：移動畫面<br>雙指縮放：放大／縮小<br>點一下：選取格子</p>
    <p><b>電腦操作</b><br>滑鼠拖曳：移動畫面<br>滾輪：放大／縮小<br>WASD／方向鍵：移動畫面<br>數字鍵 1～5：切換功能列<br>Esc：關閉視窗</p>
    <p style="opacity:0.6">遊戲版本 0.2.0</p>`);
}

function render(s) {
  refs.level.textContent = `Lv.${s.level}`;
  refs.coins.textContent = s.coins.toLocaleString('zh-TW');
  refs.pop.textContent = s.popularity;
  refs.open.textContent = s.isOpen ? '營業中' : '休息中';
  refs.open.classList.toggle('is-open', s.isOpen);
}

function showMessage(text) {
  const el = document.getElementById('hud-info');
  if (el) el.textContent = text;
}
