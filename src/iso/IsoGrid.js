import { TILE_W, TILE_H } from '../config/map.js';

// 格子座標 → 畫面座標（回傳菱形最上方的點）
export function gridToWorld(col, row) {
  return { x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 };
}

// 畫面座標 → 格子座標
export function worldToGrid(x, y) {
  const col = (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2;
  const row = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { col: Math.floor(col), row: Math.floor(row) };
}

// 一格菱形的四個角
export function diamondPoints(x, y) {
  return [
    { x, y },
    { x: x + TILE_W / 2, y: y + TILE_H / 2 },
    { x, y: y + TILE_H },
    { x: x - TILE_W / 2, y: y + TILE_H / 2 }
  ];
}
