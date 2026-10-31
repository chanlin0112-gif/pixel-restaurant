// 簡單的事件通知：讓介面和遊戲畫面互相溝通
const handlers = {};

export function on(name, fn) {
  if (!handlers[name]) handlers[name] = [];
  handlers[name].push(fn);
}

export function emit(name, data) {
  (handlers[name] || []).forEach((fn) => fn(data));
}
