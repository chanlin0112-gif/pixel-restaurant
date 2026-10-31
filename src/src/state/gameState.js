// 遊戲狀態（之後經營系統、存檔都會用到）
const listeners = new Set();

export const state = {
  level: 1,
  coins: 12000,
  popularity: 0,
  isOpen: false
};

// 更新狀態，並通知介面重新顯示
export function updateState(changes) {
  Object.assign(state, changes);
  listeners.forEach((fn) => fn(state));
}

// 狀態改變時要執行的動作
export function onStateChange(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}
