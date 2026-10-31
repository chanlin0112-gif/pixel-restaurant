import { state, onStateChange } from '../state/gameState.js';
import { FURNITURE } from '../data/furniture.js';
import { ECONOMY } from '../data/customers.js';

const SAVE_KEY = 'pixel-restaurant:save';
const BACKUP_KEY = 'pixel-restaurant:backup';
const SAVE_VERSION = 1;

// 儲存位置：第一階段存在手機／電腦本機，第二階段可換成 Supabase
const localStore = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ } }
};
const store = localStore;

let lastSavedAt = null;
let timer = null;
let locked = false; // 匯入、還原、重新開始時暫停自動存檔，避免蓋掉

const parse = (text) => { try { return JSON.parse(text); } catch (e) { return null; } };
const toB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));

function snapshot() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    data: {
      level: state.level,
      coins: state.coins,
      popularity: state.popularity,
      servedTotal: state.servedTotal,
      furniture: state.furniture,
      nextFurnitureId: state.nextFurnitureId
    }
  };
}

// 檢查存檔內容，正確就回傳整理好的資料，錯誤回傳 null
function validate(obj) {
  if (!obj || typeof obj !== 'object' || !obj.data) return null;
  const d = obj.data;
  const num = (v, min) => (Number.isFinite(v) && v >= min ? Math.floor(v) : null);
  const level = num(d.level, 1);
  const coins = num(d.coins, 0);
  const popularity = num(d.popularity, 0);
  const servedTotal = num(d.servedTotal, 0);
  if ([level, coins, popularity, servedTotal].includes(null) || !Array.isArray(d.furniture)) return null;
  const furniture = d.furniture
    .filter((f) => f && FURNITURE[f.type] && [f.id, f.col, f.row, f.rot].every(Number.isInteger))
    .map((f) => ({ id: f.id, type: f.type, col: f.col, row: f.row, rot: ((f.rot % 4) + 4) % 4 }));
  const maxId = furniture.reduce((m, f) => Math.max(m, f.id), 0);
  const nextFurnitureId = Math.max(num(d.nextFurnitureId, 1) || 1, maxId + 1);
  return {
    level, coins, servedTotal, furniture, nextFurnitureId,
    popularity: Math.min(popularity, ECONOMY.popularityMax)
  };
}

// 遊戲開始時讀取存檔，成功回傳 true
export function loadGame() {
  const raw = store.get(SAVE_KEY);
  if (!raw) return false;
  const obj = parse(raw);
  const data = validate(obj);
  if (!data) {
    store.set(`${SAVE_KEY}:broken:${Date.now()}`, raw); // 壞掉的存檔另存一份，不直接刪掉
    return false;
  }
  Object.assign(state, data, { isOpen: false });
  lastSavedAt = obj.savedAt || null;
  return true;
}

export function saveGame() {
  if (locked) return false;
  const snap = snapshot();
  const ok = store.set(SAVE_KEY, JSON.stringify(snap));
  if (ok) lastSavedAt = snap.savedAt;
  return ok;
}

// 狀態一改變就在 0.8 秒後自動存檔；關閉或切換 App 時立刻存
export function startAutoSave() {
  onStateChange(() => {
    clearTimeout(timer);
    timer = setTimeout(saveGame, 800);
  });
  const flush = () => {
    clearTimeout(timer);
    saveGame();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function getLastSavedAt() {
  return lastSavedAt;
}

export function getBackupTime() {
  const o = parse(store.get(BACKUP_KEY));
  return o && validate(o) ? o.savedAt || null : null;
}

function backupCurrent() {
  const current = store.get(SAVE_KEY);
  if (current && validate(parse(current))) store.set(BACKUP_KEY, current);
}

// 下載存檔檔案
export function downloadSave() {
  saveGame();
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `像素餐廳存檔-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// 存檔代碼（一串文字，可以貼到備忘錄保存）
export function exportCode() {
  saveGame();
  return toB64(JSON.stringify(snapshot()));
}

// 匯入：可以貼存檔代碼或存檔檔案內容
export function importSave(text) {
  const t = (text || '').trim();
  let obj = parse(t);
  if (!obj) {
    try { obj = parse(fromB64(t)); } catch (e) { obj = null; }
  }
  const data = validate(obj);
  if (!data) return false;
  locked = true;
  backupCurrent();
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), data }));
  return true;
}

// 還原備份：目前進度和備份互換，所以還原後還能再換回來
export function restoreBackup() {
  const backup = store.get(BACKUP_KEY);
  if (!backup || !validate(parse(backup))) return false;
  locked = true;
  saveGameUnlocked();
  const current = store.get(SAVE_KEY);
  store.set(SAVE_KEY, backup);
  if (current) store.set(BACKUP_KEY, current);
  return true;
}

function saveGameUnlocked() {
  store.set(SAVE_KEY, JSON.stringify(snapshot()));
}

// 重新開始：先備份目前進度，再清除存檔
export function resetGame() {
  locked = true;
  saveGameUnlocked();
  backupCurrent();
  store.remove(SAVE_KEY);
}
