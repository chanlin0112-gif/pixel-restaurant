import { MAP_ROWS } from '../config/map.js';

const key = (c, r) => `${c},${r}`;

export function inMap(c, r) {
  return r >= 0 && r < MAP_ROWS.length && c >= 0 && c < MAP_ROWS[0].length;
}

// 找最短路線：blocked 是被家具擋住的格子，終點可以是家具格（例如椅子）
export function findPath(start, goal, blocked) {
  const startK = key(start.col, start.row);
  const goalK = key(goal.col, goal.row);
  if (startK === goalK) return [{ col: start.col, row: start.row }];
  const prev = new Map([[startK, null]]);
  const queue = [{ col: start.col, row: start.row }];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { col: cur.col + dc, row: cur.row + dr };
      const k = key(n.col, n.row);
      if (prev.has(k) || !inMap(n.col, n.row)) continue;
      if (blocked.has(k) && k !== goalK) continue;
      prev.set(k, cur);
      if (k === goalK) {
        const path = [n];
        let p = cur;
        while (p) {
          path.unshift(p);
          p = prev.get(key(p.col, p.row));
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}
