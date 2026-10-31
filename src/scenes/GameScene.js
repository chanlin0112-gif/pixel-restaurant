import { Scene } from 'phaser';
import { TILE_W, TILE_H, WALL_H, TILE_TYPES, MAP_ROWS } from '../config/map.js';
import { gridToWorld, worldToGrid, diamondPoints } from '../iso/IsoGrid.js';
import { CameraController } from '../systems/CameraController.js';
import { FURNITURE, REFUND_RATE } from '../data/furniture.js';
import { footprint, furnitureAt, canPlace, cellsOf } from '../systems/FurnitureSystem.js';
import { drawFurniture, drawFootprint } from '../systems/FurnitureRenderer.js';
import { state, updateState } from '../state/gameState.js';
import { on } from '../state/events.js';
import { showMessage, showActions, hideActions } from '../ui/Hud.js';

const money = (n) => n.toLocaleString('zh-TW');

export class GameScene extends Scene {
  constructor() { super('GameScene'); }

  create() {
    this.rows = MAP_ROWS.length;
    this.cols = MAP_ROWS[0].length;
    this.mode = 'idle';        // idle 一般、selected 選取家具、placing 擺放中
    this.selectedId = null;
    this.placing = null;
    this.grab = { dc: 0, dr: 0 };
    this.views = new Map();

    this.drawWalls();
    this.drawFloor();
    this.highlight = this.add.graphics().setDepth(4998);
    this.ghostBase = this.add.graphics().setDepth(4999).setVisible(false);
    this.ghost = this.add.graphics().setDepth(5000).setAlpha(0.8).setVisible(false);
    this.renderFurniture();

    const c = gridToWorld(this.cols / 2, this.rows / 2);
    const mapW = (this.cols + this.rows) * TILE_W / 2;
    const mapH = (this.cols + this.rows) * TILE_H / 2 + WALL_H;
    this.camCtrl = new CameraController(this, { x: c.x, y: c.y - WALL_H / 2 }, mapW, mapH);
    this.camCtrl.onTap = (x, y) => this.handleTap(x, y);
    this.camCtrl.onPress = (x, y) => this.handlePress(x, y);
    this.camCtrl.onLongPress = (x, y) => this.handleLongPress(x, y);
    this.camCtrl.onDragMove = (x, y) => this.handleDragMove(x, y);

    on('buy', (type) => this.startPlacingNew(type));
    this.bindKeys();
    showMessage('單指拖曳移動・雙指縮放・長按家具可以移動', 4000);
  }

  update(time, delta) {
    this.camCtrl.update(delta);
  }

  // ===== 地圖 =====
  tileAt(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return MAP_ROWS[row][col];
  }

  drawWalls() {
    const g = this.add.graphics();
    const hw = TILE_W / 2, hh = TILE_H / 2;
    for (let c = 0; c < this.cols; c++) {
      const { x, y } = gridToWorld(c, 0);
      g.fillStyle(c % 2 ? 0xd2a77e : 0xcb9f75, 1);
      g.fillPoints([
        { x, y }, { x: x + hw, y: y + hh },
        { x: x + hw, y: y + hh - WALL_H }, { x, y: y - WALL_H }
      ], true);
    }
    for (let r = 0; r < this.rows; r++) {
      const { x, y } = gridToWorld(0, r);
      g.fillStyle(r % 2 ? 0xb88a62 : 0xb1835b, 1);
      g.fillPoints([
        { x: x - hw, y: y + hh }, { x, y },
        { x, y: y - WALL_H }, { x: x - hw, y: y + hh - WALL_H }
      ], true);
    }
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

  drawHighlight(col, row, w, h, color) {
    this.highlight.clear();
    drawFootprint(this.highlight, w, h, color);
    const p = gridToWorld(col, row);
    this.highlight.setPosition(p.x, p.y);
  }

  // ===== 家具顯示 =====
  renderFurniture() {
    this.views.forEach((g) => g.destroy());
    this.views.clear();
    state.furniture.forEach((f) => {
      const { w, h } = footprint(f);
      const g = this.add.graphics();
      drawFurniture(g, f.type, f.rot, w, h);
      const p = gridToWorld(f.col, f.row);
      g.setPosition(p.x, p.y);
      g.setDepth(10 + (f.col + f.row + w + h) * 10);
      this.views.set(f.id, g);
    });
  }

  getSelected() {
    return state.furniture.find((f) => f.id === this.selectedId) || null;
  }

  // ===== 觸控／滑鼠 =====
  handleTap(wx, wy) {
    const { col, row } = worldToGrid(wx, wy);
    if (this.mode === 'placing') {
      this.placing.item.col = col;
      this.placing.item.row = row;
      this.refreshGhost();
      return;
    }
    const f = furnitureAt(state.furniture, col, row);
    if (f) {
      this.selectFurniture(f);
      return;
    }
    this.clearSelection();
    const code = this.tileAt(col, row);
    if (!code) {
      showMessage('這裡不在餐廳範圍內');
      return;
    }
    this.drawHighlight(col, row, 1, 1, 0xffffff);
    showMessage(`${TILE_TYPES[code].name}（${col}, ${row}）`);
  }

  handlePress(wx, wy) {
    if (this.mode !== 'placing') return false;
    const { col, row } = worldToGrid(wx, wy);
    const item = this.placing.item;
    const inside = cellsOf(item).some((c) => c.col === col && c.row === row);
    if (!inside) return false;
    this.grab = { dc: col - item.col, dr: row - item.row };
    return true;
  }

  handleLongPress(wx, wy) {
    if (this.mode === 'placing') return false;
    const { col, row } = worldToGrid(wx, wy);
    const f = furnitureAt(state.furniture, col, row);
    if (!f) return false;
    this.startMove(f);
    this.grab = { dc: col - f.col, dr: row - f.row };
    return true;
  }

  handleDragMove(wx, wy) {
    if (this.mode !== 'placing') return;
    const { col, row } = worldToGrid(wx, wy);
    const item = this.placing.item;
    const nc = col - this.grab.dc;
    const nr = row - this.grab.dr;
    if (nc === item.col && nr === item.row) return;
    item.col = nc;
    item.row = nr;
    this.refreshGhost();
  }

  bindKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-R', () => {
      if (this.mode === 'placing') this.rotateGhost();
      else if (this.mode === 'selected') this.rotateSelected();
    });
    kb.on('keydown-ENTER', () => {
      if (this.mode === 'placing') this.confirmPlacing();
    });
    kb.on('keydown-ESC', () => {
      if (this.mode === 'placing') this.cancelPlacing();
      else this.clearSelection();
    });
    kb.on('keydown-DELETE', () => {
      const f = this.getSelected();
      if (f) this.askRemove(f);
    });
  }

  // ===== 選取家具 =====
  selectFurniture(f) {
    this.mode = 'selected';
    this.selectedId = f.id;
    const { w, h } = footprint(f);
    this.drawHighlight(f.col, f.row, w, h, 0xffd54a);
    const def = FURNITURE[f.type];
    const refund = Math.floor(def.price * REFUND_RATE);
    showActions(def.name, [
      { label: '↻ 旋轉', onClick: () => this.rotateSelected() },
      { label: '✥ 移動', onClick: () => { const s = this.getSelected(); if (s) this.startMove(s); } },
      { label: `拆除 +${money(refund)}`, style: 'danger', onClick: () => { const s = this.getSelected(); if (s) this.askRemove(s); } },
      { label: '完成', onClick: () => this.clearSelection() }
    ]);
  }

  clearSelection() {
    this.mode = 'idle';
    this.selectedId = null;
    this.highlight.clear();
    hideActions();
  }

  rotateSelected() {
    const f = this.getSelected();
    if (!f) return;
    const next = { ...f, rot: (f.rot + 1) % 4 };
    const v = canPlace(state.furniture, next);
    if (!v.ok) {
      showMessage(`不能旋轉：${v.reason}`);
      return;
    }
    updateState({ furniture: state.furniture.map((x) => (x.id === f.id ? next : x)) });
    this.renderFurniture();
    this.selectFurniture(next);
  }

  askRemove(f) {
    const def = FURNITURE[f.type];
    const refund = Math.floor(def.price * REFUND_RATE);
    showActions(`確定要拆除${def.name}嗎？`, [
      { label: `確定拆除（退還 🪙${money(refund)}）`, style: 'danger', onClick: () => this.removeFurniture(f.id) },
      { label: '取消', onClick: () => { const s = this.getSelected(); if (s) this.selectFurniture(s); } }
    ]);
  }

  removeFurniture(id) {
    const f = state.furniture.find((x) => x.id === id);
    if (!f) return;
    const refund = Math.floor(FURNITURE[f.type].price * REFUND_RATE);
    updateState({
      furniture: state.furniture.filter((x) => x.id !== id),
      coins: state.coins + refund
    });
    this.renderFurniture();
    this.clearSelection();
    showMessage(`已拆除，退還 🪙${money(refund)}`);
  }

  // ===== 擺放家具 =====
  startPlacingNew(type) {
    const def = FURNITURE[type];
    if (!def) return;
    if (this.mode === 'placing') this.cancelPlacing(true);
    this.clearSelection();
    if (state.coins < def.price) {
      showMessage('金幣不足');
      return;
    }
    const item = { id: null, type, col: 0, row: 0, rot: 0 };
    this.findFreeSpot(item);
    this.placing = { item, isNew: true };
    this.enterPlacing();
  }

  startMove(f) {
    this.clearSelection();
    this.placing = { item: { ...f }, isNew: false };
    const view = this.views.get(f.id);
    if (view) view.setVisible(false);
    this.enterPlacing();
  }

  findFreeSpot(item) {
    const cc = Math.floor(this.cols / 2);
    const cr = Math.floor(this.rows / 2);
    const spots = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        spots.push({ c, r, d: Math.abs(c - cc) + Math.abs(r - cr) });
      }
    }
    spots.sort((a, b) => a.d - b.d);
    for (const s of spots) {
      item.col = s.c;
      item.row = s.r;
      if (canPlace(state.furniture, item).ok) return;
    }
    item.col = cc;
    item.row = cr;
  }

  enterPlacing() {
    this.mode = 'placing';
    this.highlight.clear();
    this.ghost.setVisible(true);
    this.ghostBase.setVisible(true);
    const { item, isNew } = this.placing;
    const def = FURNITURE[item.type];
    showActions(isNew ? `擺放${def.name}：點地板或拖曳移動` : `移動${def.name}：點地板或拖曳移動`, [
      { label: '↻ 旋轉', onClick: () => this.rotateGhost() },
      { label: isNew ? `確定 🪙${money(def.price)}` : '確定', style: 'primary', onClick: () => this.confirmPlacing() },
      { label: '取消', onClick: () => this.cancelPlacing() }
    ]);
    this.refreshGhost();
  }

  refreshGhost() {
    const { item } = this.placing;
    const { w, h } = footprint(item);
    const v = canPlace(state.furniture, item);
    const p = gridToWorld(item.col, item.row);
    this.ghostBase.clear();
    drawFootprint(this.ghostBase, w, h, v.ok ? 0x6aa84f : 0xd9534f);
    this.ghostBase.setPosition(p.x, p.y);
    drawFurniture(this.ghost, item.type, item.rot, w, h);
    this.ghost.setPosition(p.x, p.y);
    showMessage(v.ok ? '✅ 可以放在這裡' : `❌ ${v.reason}`, 0);
  }

  rotateGhost() {
    if (this.mode !== 'placing') return;
    this.placing.item.rot = (this.placing.item.rot + 1) % 4;
    this.refreshGhost();
  }

  confirmPlacing() {
    if (this.mode !== 'placing') return;
    const { item, isNew } = this.placing;
    const v = canPlace(state.furniture, item);
    if (!v.ok) {
      showMessage(`❌ ${v.reason}`);
      return;
    }
    const def = FURNITURE[item.type];
    if (isNew) {
      if (state.coins < def.price) {
        showMessage('金幣不足');
        return;
      }
      const placed = { ...item, id: state.nextFurnitureId };
      updateState({
        furniture: [...state.furniture, placed],
        coins: state.coins - def.price,
        nextFurnitureId: state.nextFurnitureId + 1
      });
      this.endPlacing();
      showMessage(`已購買${def.name}，花費 🪙${money(def.price)}`);
    } else {
      updateState({ furniture: state.furniture.map((f) => (f.id === item.id ? { ...item } : f)) });
      this.endPlacing();
      showMessage('已移動');
    }
  }

  cancelPlacing(silent) {
    if (this.mode !== 'placing') return;
    this.endPlacing();
    if (!silent) showMessage('已取消');
  }

  endPlacing() {
    this.mode = 'idle';
    this.placing = null;
    this.ghost.setVisible(false);
    this.ghostBase.setVisible(false);
    this.ghostBase.clear();
    this.ghost.clear();
    hideActions();
    this.renderFurniture();
  }
}
