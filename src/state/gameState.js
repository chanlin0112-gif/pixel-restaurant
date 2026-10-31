// 遊戲狀態（之後經營系統、存檔都會用到）
const listeners = new Set();

export const state = {
  level: 1,
  coins: 12000,
  popularity: 0,
  isOpen: false,
  servedTotal: 0,
  // 餐廳裡的家具（type 種類、col/row 位置、rot 方向 0～3）
  furniture: [
    { id: 1, type: 'stove', col: 0, row: 0, rot: 0 },
    { id: 2, type: 'counter', col: 1, row: 3, rot: 0 },
    { id: 3, type: 'table', col: 6, row: 4, rot: 0 },
    { id: 4, type: 'chair', col: 5, row: 4, rot: 0 },
    { id: 5, type: 'chair', col: 7, row: 4, rot: 2 }
  ],
  nextFurnitureId: 6
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
