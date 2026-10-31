import { state, updateState, onStateChange } from '../state/gameState.js';
import { emit } from '../state/events.js';
import { FURNITURE, SHOP_ORDER } from '../data/furniture.js';
import {
  getLastSavedAt, getBackupTime, downloadSave, exportCode,
  importSave, restoreBackup, resetGame
} from '../systems/SaveSystem.js';

// 下方功能列
const TABS = [
  { id: 'restaurant', icon: '🏠', label: '餐廳', ready: true },
  { id: 'menu', icon: '📋', label: '菜單', ready: false, desc: '設定要賣的料理和價格。' },
  { id: 'staff', icon: '🧑‍🍳', label: '員工', ready: false, desc: '招募廚師和服務生，讓出餐更快。' },
  { id: 'decor', icon: '🪑', label: '裝潢', ready: true },
  { id: 'stats', icon: '📊', label: '統計', ready: false, desc: '查看每天的收入、來客數和人氣變化。' }
];

let refs = {};
let toastTimer = null;

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
    <div class="hud-toast" id="hud-toast"></div>
    <div class="hud-actions" id="hud-actions" hidden>
      <div class="hud-actions-title" id="hud-actions-title"></div>
      <div class="hud-actions-btns" id="hud-actions-btns"></div>
    </div>
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
    toast: root.querySelector('#hud-toast'),
    actions: root.querySelector('#hud-actions'),
    actionsTitle: root.querySelector('#hud-actions-title'),
    actionsBtns: root.querySelector('#hud-actions-btns'),
    nav: root.querySelector('#hud-nav'),
    panel: root.querySelector('#hud-panel'),
    panelTitle: root.querySelector('#hud-panel-title'),
    panelBody: root.querySelector('#hud-panel-body')
  };

  buildNav();
  bindEvents(root);
  onStateChange(render);
}

// 顯示提示訊息（ms 設 0 代表不會自動消失）
export function showMessage(text, ms = 2500) {
  refs.toast.textContent = text;
  refs.toast.classList.add('show');
  clearTimeout(toastTimer);
  if (ms > 0) toastTimer = setTimeout(() => refs.toast.classList.remove('show'), ms);
}

// 顯示家具操作按鈕
export function showActions(title, buttons) {
  refs.actionsTitle.textContent = title;
  refs.actionsBtns.innerHTML = '';
  buttons.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'hud-btn' + (b.style ? ' ' + b.style : '');
    btn.textContent = b.label;
    if (b.disabled) btn.disabled = true;
    btn.addEventListener('click', b.onClick);
    refs.actionsBtns.appendChild(btn);
  });
  refs.actions.hidden = false;
}

export function hideActions() {
  refs.actions.hidden = true;
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
  });
  root.querySelector('#hud-settings').addEventListener('click', openSettings);
  root.querySelector('#hud-panel-close').addEventListener('click', closePanel);
  refs.panel.addEventListener('click', (e) => {
    if (e.target === refs.panel) closePanel();
  });
  // 電腦快捷鍵：1～5 切換功能列、Esc 關閉視窗（在輸入框打字時不觸發）
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
  if (tab.id === 'restaurant') {
    closePanel();
    return;
  }
  setActive(tab.id);
  if (tab.id === 'decor') {
    openShop();
    return;
  }
  openPanel(`${tab.icon} ${tab.label}`,
    `<p class="hud-soon-big">即將開放</p><p>${tab.desc}</p>`);
}

function openShop() {
  const rows = SHOP_ORDER.map((id) => {
    const f = FURNITURE[id];
    const canBuy = state.coins >= f.price;
    return `
      <div class="shop-item">
        <div class="shop-icon">${f.icon}</div>
        <div class="shop-info">
          <div class="shop-name">${f.name}</div>
          <div class="shop-desc">${f.desc}</div>
        </div>
        <button class="hud-btn primary" data-buy="${id}" ${canBuy ? '' : 'disabled'}>🪙 ${f.price.toLocaleString('zh-TW')}</button>
      </div>`;
  }).join('');
  openPanel('🪑 裝潢商店', `<div class="shop-list">${rows}</div>`);
  refs.panelBody.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closePanel();
      emit('buy', btn.dataset.buy);
    });
  });
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

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-TW', { hour12: false }) : '尚未存檔';
}

const BOX = 'width:100%; box-sizing:border-box; font-size:12px; -webkit-user-select:text; user-select:text;';

function openSettings() {
  const backupTime = getBackupTime();
  openPanel('⚙️ 設定', `
    <p><b>💾 存檔</b><br>自動存檔：開啟<br>上次存檔：${formatTime(getLastSavedAt())}</p>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
      <button class="hud-btn primary" style="flex:1 1 45%" data-act="download">下載存檔檔案</button>
      <button class="hud-btn primary" style="flex:1 1 45%" data-act="copy">複製存檔代碼</button>
      <button class="hud-btn" style="flex:1 1 45%" data-act="import">匯入存檔</button>
      <button class="hud-btn" style="flex:1 1 45%" data-act="restore" ${backupTime ? '' : 'disabled'}>還原備份</button>
      <button class="hud-btn danger" style="flex:1 1 100%" data-act="reset">重新開始遊戲</button>
    </div>
    <p style="font-size:13px; opacity:0.7">${backupTime ? `備份時間：${formatTime(backupTime)}` : '目前沒有備份。匯入或重新開始前，會自動備份目前進度。'}</p>
    <p><b>手機操作</b><br>單指拖曳：移動畫面<br>雙指縮放：放大／縮小<br>點家具：旋轉、移動、拆除<br>長按家具：直接拖曳移動</p>
    <p><b>電腦操作</b><br>滑鼠拖曳：移動畫面<br>滾輪：放大／縮小<br>WASD／方向鍵：移動畫面<br>R：旋轉　Enter：確定　Delete：拆除<br>數字鍵 1～5：切換功能列　Esc：取消</p>
    <p style="opacity:0.6">遊戲版本 0.5.0</p>`);
  const q = (a) => refs.panelBody.querySelector(`[data-act="${a}"]`);
  q('download').addEventListener('click', () => {
    downloadSave();
    showMessage('已下載存檔檔案');
  });
  q('copy').addEventListener('click', copyCode);
  q('import').addEventListener('click', openImport);
  q('restore').addEventListener('click', () => {
    if (!confirm('要還原到備份的進度嗎？目前進度會變成新的備份。')) return;
    if (restoreBackup()) location.reload();
    else showMessage('備份無法讀取');
  });
  q('reset').addEventListener('click', () => {
    if (!confirm('確定要重新開始嗎？目前進度會先備份，之後可以用「還原備份」找回。')) return;
    resetGame();
    location.reload();
  });
}

function copyCode() {
  const code = exportCode();
  const showBox = () => openPanel('📋 存檔代碼', `
    <p>請長按下方文字，全選後複製，貼到備忘錄保存：</p>
    <textarea readonly style="${BOX} height:140px;">${code}</textarea>`);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => showMessage('已複製存檔代碼，可以貼到備忘錄保存', 3500))
      .catch(showBox);
  } else {
    showBox();
  }
}

function openImport() {
  openPanel('📥 匯入存檔', `
    <p>選擇之前下載的存檔檔案，或貼上存檔代碼。匯入前會自動備份目前進度。</p>
    <input type="file" accept=".json,application/json" data-act="file" style="margin-bottom:10px; max-width:100%;">
    <textarea data-act="text" placeholder="或在這裡貼上存檔代碼" style="${BOX} height:120px;"></textarea>
    <button class="hud-btn primary" data-act="go" style="width:100%; margin-top:10px;">確定匯入</button>`);
  const body = refs.panelBody;
  const textEl = body.querySelector('[data-act="text"]');
  body.querySelector('[data-act="file"]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) textEl.value = await file.text();
  });
  body.querySelector('[data-act="go"]').addEventListener('click', () => {
    if (!textEl.value.trim()) {
      showMessage('請先選擇檔案或貼上代碼');
      return;
    }
    if (!confirm('匯入後會取代目前進度（目前進度會先備份），確定嗎？')) return;
    if (importSave(textEl.value)) location.reload();
    else showMessage('存檔內容有誤，無法匯入', 3500);
  });
}

function render(s) {
  refs.level.textContent = `Lv.${s.level}`;
  refs.coins.textContent = s.coins.toLocaleString('zh-TW');
  refs.pop.textContent = s.popularity;
  refs.open.textContent = s.isOpen ? '營業中' : '休息中';
  refs.open.classList.toggle('is-open', s.isOpen);
}
