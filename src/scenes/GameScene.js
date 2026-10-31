import { Scene } from 'phaser';
import { TILE_W, TILE_H, WALL_H, TILE_TYPES, MAP_ROWS } from '../config/map.js';
import { gridToWorld, worldToGrid, diamondPoints } from '../iso/IsoGrid.js';
import { CameraController } from '../systems/CameraController.js';

export class GameScene extends Scene {
  constructor() { super('GameScene'); }

  create() {
    this.rows = MAP_ROWS.length;
    this.cols = MAP_ROWS[0].length;

    this.drawWalls();
    this.drawFloor();
    this.highlight = this.add.graphics();
    this.createHud();

    const c = gridToWorld(this.cols / 2, this.rows / 2);
    const mapW = (this.cols + this.rows) * TILE_W / 2;
    const mapH = (this.cols + this.rows) * TILE_H / 2 + WALL_H;
    this.camCtrl = new CameraController(this, { x: c.x, y: c.y - WALL_H / 2 }, mapW, mapH);
    this.camCtrl.onTap = (wx, wy) => this.selectTile(wx, wy);
  }

  update(time, delta) {
    this.camCtrl.update(delta);
  }

  tileAt(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return MAP_ROWS[row][col];
  }

  drawWalls() {
    const g = this.add.graphics();
    const hw = TILE_W / 2, hh = TILE_H / 2;
    // 右後方牆
    for (let c = 0; c < this.cols; c++) {
      const { x, y } = gridToWorld(c, 0);
      g.fillStyle(c % 2 ? 0xd2a77e : 0xcb9f75, 1);
      g.fillPoints([
        { x, y }, { x: x + hw, y: y + hh },
        { x: x + hw, y: y + hh - WALL_H }, { x, y: y - WALL_H }
      ], true);
    }
    // 左後方牆
    for (let r = 0; r < this.rows; r++) {
      const { x, y } = gridToWorld(0, r);
      g.fillStyle(r % 2 ? 0xb88a62 : 0xb1835b, 1);
      g.fillPoints([
        { x: x - hw, y: y + hh }, { x, y },
        { x, y: y - WALL_H }, { x: x - hw, y: y + hh - WALL_H }
      ], true);
    }
    // 牆頂邊線
    const top = gridToWorld(0, 0);
    const right = gridToWorld(this.cols, 0);
    const left = gridToWorld(0, this.rows);
    g.lineStyle(4, 0x6e4a30, 1);
    g.beginPath();
    g.moveTo(left.x, left.y - WALL_H);
    g.lineTo(top.x, top.y - WALL_H);
    g.lineTo(right.x, right.y - WALL_H);
    g.strokePath();
  }

  drawFloor() {
    const g = this.add.graphics();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = TILE_TYPES[MAP_ROWS[r][c]];
        const { x, y } = gridToWorld(c, r);
        const pts = diamondPoints(x, y);
        g.fillStyle((r + c) % 2 ? type.colorA : type.colorB, 1);
        g.fillPoints(pts, true);
        g.lineStyle(1, 0x000000, 0.08);
        g.strokePoints(pts, true);
      }
    }
  }

  createHud() {
    let el = document.getElementById('hud-info');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hud-info';
      Object.assign(el.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        padding: '8px 14px', borderRadius: '12px',
        background: 'rgba(90, 62, 43, 0.85)', color: '#fff8ee',
        font: '14px sans-serif', whiteSpace: 'nowrap',
        pointerEvents: 'none', zIndex: 10
      });
      document.body.appendChild(el);
    }
    this.hud = el;
    el.textContent = '單指拖曳移動・雙指縮放・點格子選取';
  }

  selectTile(wx, wy) {
    const { col, row } = worldToGrid(wx, wy);
    const code = this.tileAt(col, row);
    this.highlight.clear();
    if (!code) {
      this.hud.textContent = '這裡不在餐廳範圍內';
      return;
    }
    const { x, y } = gridToWorld(col, row);
    const pts = diamondPoints(x, y);
    this.highlight.fillStyle(0xffffff, 0.35);
    this.highlight.fillPoints(pts, true);
    this.highlight.lineStyle(2, 0xffffff, 1);
    this.highlight.strokePoints(pts, true);
    this.hud.textContent = `${TILE_TYPES[code].name}（${col}, ${row}）`;
  }
}
