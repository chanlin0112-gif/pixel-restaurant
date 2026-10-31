import { MAP_ROWS, TILE_H } from '../config/map.js';
import { gridToWorld } from '../iso/IsoGrid.js';
import { findPath } from './Pathfinding.js';
import { cellsOf } from './FurnitureSystem.js';
import { drawCustomer } from './CustomerRenderer.js';
import { CUSTOMER_LOOKS, ECONOMY } from '../data/customers.js';
import { state, updateState, onStateChange } from '../state/gameState.js';
import { showMessage } from '../ui/Hud.js';

const key = (c, r) => `${c},${r}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// 顧客系統：進店 → 找座位 → 用餐 → 結帳 → 離開
export class CustomerSystem {
  constructor(scene) {
    this.scene = scene;
    this.customers = [];
    this.nextId = 1;
    this.spawnTimer = 1500;
    this.noSeatWarned = false;
    this.entrances = [];
    MAP_ROWS.forEach((line, r) => {
      [...line].forEach((ch, c) => {
        if (ch === 'E') this.entrances.push({ col: c, row: r });
      });
    });
    this.lastFurniture = state.furniture;
    this.lastOpen = state.isOpen;

    onStateChange((s) => {
      if (s.furniture !== this.lastFurniture) {
        this.lastFurniture = s.furniture;
        this.handleFurnitureChange();
      }
      if (s.isOpen !== this.lastOpen) {
        this.lastOpen = s.isOpen;
        if (s.isOpen) {
          this.spawnTimer = 1000;
          this.noSeatWarned = false;
        }
        setTimeout(() => showMessage(s.isOpen ? '開始營業！客人會陸續上門' : '暫停營業，店裡的客人吃完就會離開'), 0);
      }
    });
    scene.events.on('update', (time, delta) => this.update(delta));
  }

  blocked() {
    const set = new Set();
    state.furniture.forEach((f) => cellsOf(f).forEach((c) => set.add(key(c.col, c.row))));
    return set;
  }

  // 旁邊有餐桌的椅子才算座位
  seats() {
    const tables = new Set();
    state.furniture.forEach((f) => {
      if (f.type === 'table') cellsOf(f).forEach((c) => tables.add(key(c.col, c.row)));
    });
    return state.furniture.filter((f) => f.type === 'chair'
      && DIRS.some(([dc, dr]) => tables.has(key(f.col + dc, f.row + dr))));
  }

  cellOf(c) {
    return { col: Math.round(c.pos.col), row: Math.round(c.pos.row) };
  }

  update(delta) {
    if (state.isOpen) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.trySpawn();
        const wait = Math.max(ECONOMY.spawnMin, ECONOMY.spawnBase - state.popularity * 50);
        this.spawnTimer = wait * rand(0.8, 1.2);
      }
    }
    this.customers.slice().forEach((c) => this.updateCustomer(c, delta));
  }

  trySpawn() {
    const taken = new Set(this.customers.map((c) => c.seatId).filter((id) => id !== null));
    const blocked = this.blocked();
    const start = this.entrances[Math.floor(Math.random() * this.entrances.length)];
    let found = null;
    for (const seat of shuffle(this.seats())) {
      if (taken.has(seat.id)) continue;
      const path = findPath(start, seat, blocked);
      if (path) {
        found = { seat, path };
        break;
      }
    }
    if (!found) {
      if (!this.noSeatWarned) showMessage('客滿了！在餐桌旁多放椅子，就能接待更多客人', 3500);
      this.noSeatWarned = true;
      return;
    }
    this.noSeatWarned = false;
    const look = CUSTOMER_LOOKS[Math.floor(Math.random() * CUSTOMER_LOOKS.length)];
    const c = {
      id: this.nextId++, g: this.scene.add.graphics(), look, mode: 'toSeat',
      seatId: found.seat.id, seatCell: { col: found.seat.col, row: found.seat.row },
      path: null, step: 0, progress: 0, pos: { col: start.col, row: start.row },
      timer: 0, animTime: 0, frame: 0, front: true, bubble: null
    };
    this.setPath(c, found.path);
    this.placeAt(c, start.col, start.row);
    drawCustomer(c.g, look, 0, true);
    this.customers.push(c);
  }
  setPath(c, path) {
    c.path = path;
    c.step = 0;
    c.progress = 0;
  }

  placeAt(c, col, row) {
    const p = gridToWorld(col, row);
    c.pos = { col, row };
    c.g.setPosition(p.x, p.y + TILE_H / 2);
    c.g.setDepth(10 + (col + row + 2) * 10 + 5);
  }

  // 沿著路線走，走到終點時回傳 true
  walk(c, delta) {
    if (!c.path || c.step >= c.path.length - 1) return true;
    c.progress += (ECONOMY.walkSpeed * delta) / 1000;
    while (c.progress >= 1 && c.step < c.path.length - 1) {
      c.progress -= 1;
      c.step++;
    }
    if (c.step >= c.path.length - 1) {
      const end = c.path[c.path.length - 1];
      this.placeAt(c, end.col, end.row);
      return true;
    }
    const a = c.path[c.step];
    const b = c.path[c.step + 1];
    this.placeAt(c, a.col + (b.col - a.col) * c.progress, a.row + (b.row - a.row) * c.progress);
    const front = (b.col - a.col) + (b.row - a.row) > 0;
    c.animTime += delta;
    const frame = Math.floor(c.animTime / 150) % 4;
    if (frame !== c.frame || front !== c.front) {
      c.frame = frame;
      c.front = front;
      drawCustomer(c.g, c.look, frame, front);
    }
    return false;
  }

  updateCustomer(c, delta) {
    if (c.mode === 'toSeat') {
      if (this.walk(c, delta)) this.sitDown(c);
    } else if (c.mode === 'eating') {
      c.timer -= delta;
      if (c.timer <= 0) this.goToPay(c);
    } else if (c.mode === 'toPay') {
      if (this.walk(c, delta)) {
        c.mode = 'paying';
        c.timer = ECONOMY.payTime;
        drawCustomer(c.g, c.look, 0, false);
      }
    } else if (c.mode === 'paying') {
      c.timer -= delta;
      if (c.timer <= 0) {
        this.pay(c);
        this.goToExit(c);
      }
    } else if (c.mode === 'toExit') {
      if (this.walk(c, delta)) this.remove(c);
    }
  }

  sitDown(c) {
    c.mode = 'eating';
    c.timer = rand(ECONOMY.eatTimeMin, ECONOMY.eatTimeMax);
    c.g.y -= 8;
    drawCustomer(c.g, c.look, 0, true);
    c.bubble = this.scene.add.text(c.g.x, c.g.y - 46, '🍜', { fontSize: '16px' })
      .setOrigin(0.5).setDepth(6000);
  }

  standUp(c) {
    if (c.bubble) {
      c.bubble.destroy();
      c.bubble = null;
    }
    c.seatId = null;
  }

  goToPay(c) {
    this.standUp(c);
    const blocked = this.blocked();
    const from = this.cellOf(c);
    let best = null;
    state.furniture.filter((f) => f.type === 'counter').forEach((f) => {
      cellsOf(f).forEach((cell) => DIRS.forEach(([dc, dr]) => {
        const t = { col: cell.col + dc, row: cell.row + dr };
        if (blocked.has(key(t.col, t.row))) return;
        const path = findPath(from, t, blocked);
        if (path && (!best || path.length < best.length)) best = path;
      }));
    });
    if (best) {
      this.setPath(c, best);
      c.mode = 'toPay';
    } else {
      c.mode = 'paying';
      c.timer = ECONOMY.payTime;
    }
  }

  goToExit(c) {
    const blocked = this.blocked();
    const from = this.cellOf(c);
    let best = null;
    this.entrances.forEach((e) => {
      const path = findPath(from, e, blocked);
      if (path && (!best || path.length < best.length)) best = path;
    });
    if (!best) {
      this.remove(c);
      return;
    }
    this.setPath(c, best);
    c.mode = 'toExit';
  }

  pay(c) {
    const amount = Math.round(rand(ECONOMY.mealPriceMin, ECONOMY.mealPriceMax) / 10) * 10;
    const served = state.servedTotal + 1;
    const level = 1 + Math.floor(served / ECONOMY.customersPerLevel);
    const levelUp = level > state.level;
    updateState({
      coins: state.coins + amount,
      servedTotal: served,
      popularity: Math.min(ECONOMY.popularityMax, state.popularity + ECONOMY.popularityPerCustomer),
      level
    });
    const t = this.scene.add.text(c.g.x, c.g.y - 40, `+🪙${amount}`, {
      fontSize: '14px', fontStyle: 'bold', color: '#3d7a2a', stroke: '#fff8ee', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6000);
    this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    if (levelUp) showMessage(`🎉 餐廳升級到 Lv.${level}！`, 3000);
  }

  remove(c) {
    this.standUp(c);
    c.g.destroy();
    this.customers = this.customers.filter((x) => x !== c);
  }

  // 家具被移動或拆除時，重新安排顧客路線
  handleFurnitureChange() {
    const blocked = this.blocked();
    this.customers.slice().forEach((c) => {
      const seatOk = c.seatId !== null && state.furniture.some((f) => f.id === c.seatId
        && f.col === c.seatCell.col && f.row === c.seatCell.row);
      if (c.mode === 'toSeat' || c.mode === 'eating') {
        if (!seatOk) {
          showMessage('座位被移走了，客人只好離開…');
          this.standUp(c);
          this.goToExit(c);
          return;
        }
        if (c.mode === 'toSeat') {
          const path = findPath(this.cellOf(c), c.seatCell, blocked);
          if (path) this.setPath(c, path);
          else {
            this.standUp(c);
            this.goToExit(c);
          }
        }
      } else if (c.mode === 'toPay') {
        this.goToPay(c);
      } else if (c.mode === 'toExit') {
        this.goToExit(c);
      }
    });
  }
}
