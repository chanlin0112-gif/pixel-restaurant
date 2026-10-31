// 地圖與格子設定
export const TILE_W = 64;   // 一格的寬度
export const TILE_H = 32;   // 一格的高度
export const WALL_H = 56;   // 牆壁高度

// 格子種類：K 廚房、C 櫃檯區、. 用餐區、E 入口
export const TILE_TYPES = {
  K: { name: '廚房', colorA: 0xd5dcdf, colorB: 0xc3ccd0 },
  C: { name: '櫃檯區', colorA: 0xe6c49a, colorB: 0xdab387 },
  '.': { name: '用餐區', colorA: 0xe9d3b5, colorB: 0xdcc29f },
  E: { name: '入口', colorA: 0xc9714b, colorB: 0xb8623f }
};

// 初始小餐廳（10 欄 × 8 列）
export const MAP_ROWS = [
  'KKKC......',
  'KKKC......',
  'KKKC......',
  'CCCC......',
  '..........',
  '..........',
  '..........',
  '...EE.....'
];
