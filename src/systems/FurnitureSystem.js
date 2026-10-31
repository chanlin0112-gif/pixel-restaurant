import { MAP_ROWS } from '../config/map.js';
import { FURNITURE } from '../data/furniture.js';

const key = (c, r) => `${c},${r}`;
const neighbors = (c, r) => [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];

function tileCode(col, row) {
  if (row < 0 || row >= MAP_ROWS.length || col < 0 || col >= MAP_ROWS[0].length) return null;
  return MAP_ROWS[row][col];
}

// 轉向後實際佔用的格子數
export function footprint(item) {
  const def = FURNITURE[item.type];
  const swap = item.rot % 2 === 1;
  return { w: swap ? def.h : def.w, h: swap ? def.w : def.h };
}

// 家具佔用的每一格
export function cellsOf(item) {
  const { w, h } = footprint(item);
  const cells = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) cells.push({ col: item.col + c, row: item.row + r });
  }
  return cells;
}

// 找出某一格上的家具
export function furnitureAt(list, col, row) {
  return list.find((f) => cellsOf(f).some((c) => c.col === col && c.row === row)) || null;
}

function buildOccupancy(list, ignoreId) {
  const occ = new Map();
  list.forEach((f) => {
    if (f.id !== null && f.id === ignoreId) return;
    cellsOf(f).forEach((c) => occ.set(key(c.col, c.row), f));
  });
  return occ;
}

// 所有空地都要能從入口走到
function allFloorReachable(occ) {
  const queue = [];
  const seen = new Set();
  let total = 0;
  for (let r = 0; r < MAP_ROWS.length; r++) {
    for (let c = 0; c < MAP_ROWS[0].length; c++) {
      if (occ.has(key(c, r))) continue;
      total++;
      if (MAP_ROWS[r][c] === 'E') {
        queue.push([c, r]);
        seen.add(key(c, r));
      }
    }
  }
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [nc, nr] of neighbors(c, r)) {
      const k = key(nc, nr);
      if (seen.has(k) || occ.has(k) || !tileCode(nc, nr)) continue;
      seen.add(k);
      queue.push([nc, nr]);
    }
  }
  return seen.size === total;
}

// 檢查能不能擺放，回傳 { ok, reason }
export function canPlace(list, item) {
  const def = FURNITURE[item.type];
  const occ = buildOccupancy(list, item.id);
  const cells = cellsOf(item);

  for (const c of cells) {
    const code = tileCode(c.col, c.row);
    if (!code) return { ok: false, reason: '超出餐廳範圍' };
    if (code === 'E') return { ok: false, reason: '不能擋住入口' };
    if (!def.zones.includes(code)) {
      return { ok: false, reason: def.zones.includes('K') ? '只能放在廚房' : '不能放在廚房' };
    }
    if (occ.has(key(c.col, c.row))) return { ok: false, reason: '這裡已經有家具了' };
  }

  cells.forEach((c) => occ.set(key(c.col, c.row), item));
  if (!allFloorReachable(occ)) return { ok: false, reason: '會擋住通道，顧客走不過去' };

  const all = list.filter((f) => f.id === null || f.id !== item.id).concat(item);
  for (const f of all) {
    if (f.type !== 'chair') continue;
    const free = neighbors(f.col, f.row).some(([c, r]) => tileCode(c, r) && !occ.has(key(c, r)));
    if (!free) return { ok: false, reason: '椅子旁邊要留空位讓顧客坐下' };
  }
  return { ok: true, reason: '' };
}
