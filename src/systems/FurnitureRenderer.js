import { TILE_W, TILE_H } from '../config/map.js';

const HW = TILE_W / 2;
const HH = TILE_H / 2;

// 格子內的位置（c、r 可以是小數），z 是高度
const P = (c, r, z = 0) => ({ x: (c - r) * HW, y: (c + r) * HH - z });

// 畫一個等角方塊
function box(g, c0, c1, r0, r1, z0, z1, top, left, right) {
  g.fillStyle(left, 1);
  g.fillPoints([P(c0, r1, z0), P(c1, r1, z0), P(c1, r1, z1), P(c0, r1, z1)], true);
  g.fillStyle(right, 1);
  g.fillPoints([P(c1, r1, z0), P(c1, r0, z0), P(c1, r0, z1), P(c1, r1, z1)], true);
  const topPts = [P(c0, r0, z1), P(c1, r0, z1), P(c1, r1, z1), P(c0, r1, z1)];
  g.fillStyle(top, 1);
  g.fillPoints(topPts, true);
  g.lineStyle(1, 0x3d2a1d, 0.6);
  g.strokePoints(topPts, true);
}

// 畫家具（w、h 是轉向後佔用的格子數）
export function drawFurniture(g, type, rot, w, h) {
  g.clear();
  if (type === 'table') {
    box(g, 0.42, 0.58, 0.42, 0.58, 0, 18, 0x8a5a36, 0x5e3f2a, 0x6b4830);
    box(g, 0.1, 0.9, 0.1, 0.9, 18, 24, 0xd9a46c, 0x8a5a36, 0xa86f44);
  } else if (type === 'chair') {
    box(g, 0.25, 0.75, 0.25, 0.75, 0, 12, 0xc98f5a, 0x8a5a36, 0xa86f44);
    const backs = [
      [0.25, 0.37, 0.25, 0.75],
      [0.25, 0.75, 0.25, 0.37],
      [0.63, 0.75, 0.25, 0.75],
      [0.25, 0.75, 0.63, 0.75]
    ];
    const [c0, c1, r0, r1] = backs[rot % 4];
    box(g, c0, c1, r0, r1, 12, 30, 0xb57a48, 0x7a4d2e, 0x95623b);
  } else if (type === 'counter') {
    box(g, 0.05, w - 0.05, 0.05, h - 0.05, 0, 26, 0x9c6b45, 0x6b4527, 0x825635);
    box(g, 0, w, 0, h, 26, 30, 0xf3ece0, 0xcfc6b8, 0xe0d8ca);
    box(g, 0.3, 0.7, 0.3, 0.7, 30, 40, 0x7d8a8f, 0x4c565a, 0x636e72);
  } else if (type === 'stove') {
    box(g, 0.08, 0.92, 0.08, 0.92, 0, 24, 0xb8c0c4, 0x6f777b, 0x899196);
    box(g, 0.2, 0.45, 0.2, 0.45, 24, 26, 0x333333, 0x222222, 0x2a2a2a);
    box(g, 0.55, 0.8, 0.2, 0.45, 24, 26, 0x333333, 0x222222, 0x2a2a2a);
    box(g, 0.2, 0.45, 0.55, 0.8, 24, 26, 0x333333, 0x222222, 0x2a2a2a);
    box(g, 0.55, 0.8, 0.55, 0.8, 24, 26, 0x333333, 0x222222, 0x2a2a2a);
  } else if (type === 'fridge') {
    box(g, 0.12, 0.88, 0.12, 0.88, 0, 50, 0xf4f7f8, 0xbcc6ca, 0xd8e0e3);
    const a = P(0.12, 0.88, 32);
    const b = P(0.88, 0.88, 32);
    g.lineStyle(1, 0x8a959a, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
  } else if (type === 'plant') {
    box(g, 0.32, 0.68, 0.32, 0.68, 0, 12, 0xc9714b, 0x8f4a2e, 0xa95a39);
    box(g, 0.22, 0.78, 0.22, 0.78, 12, 28, 0x7fbf5a, 0x4f8a35, 0x649f45);
    box(g, 0.34, 0.66, 0.34, 0.66, 28, 38, 0x96d070, 0x5f9a42, 0x77b355);
  }
}

// 畫家具佔用的地板範圍（綠色＝可以放、紅色＝不能放）
export function drawFootprint(g, w, h, color) {
  const pts = [P(0, 0), P(w, 0), P(w, h), P(0, h)];
  g.fillStyle(color, 0.35);
  g.fillPoints(pts, true);
  g.lineStyle(2, color, 1);
  g.strokePoints(pts, true);
}
