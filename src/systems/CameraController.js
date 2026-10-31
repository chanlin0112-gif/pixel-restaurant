// 視角操作：拖曳、雙指縮放、滾輪、WASD／方向鍵，以及長按拖曳家具
export class CameraController {
  constructor(scene, center, mapW, mapH) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.minZoom = 0.4;
    this.maxZoom = 3;
    this.onTap = null;
    this.onPress = null;
    this.onLongPress = null;
    this.onDragMove = null;
    this.onDragEnd = null;
    this.last = null;
    this.downPos = null;
    this.moved = false;
    this.pinchDist = 0;
    this.wasPinching = false;
    this.capturing = false;
    this.pressTimer = null;

    this.cam.centerOn(center.x, center.y);
    const fit = Math.min(this.cam.width / (mapW + 40), this.cam.height / (mapH + 160));
    this.setZoom(Math.min(2, fit));

    scene.input.addPointer(1);
    scene.input.on('pointerdown', this.handleDown, this);
    scene.input.on('pointermove', this.handleMove, this);
    scene.input.on('pointerup', this.handleUp, this);
    scene.input.on('wheel', (p, objs, dx, dy) => {
      this.setZoom(this.cam.zoom * (dy > 0 ? 0.9 : 1.1));
    });

    if (scene.input.keyboard) {
      this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    }
  }

  setZoom(z) {
    this.cam.setZoom(Math.min(this.maxZoom, Math.max(this.minZoom, z)));
  }

  touches() {
    const inp = this.scene.input;
    return [inp.pointer1, inp.pointer2].filter((p) => p && p.isDown);
  }

  stopCapture() {
    clearTimeout(this.pressTimer);
    if (this.capturing) {
      this.capturing = false;
      if (this.onDragEnd) this.onDragEnd();
    }
  }

  handleDown(p) {
    this.downPos = { x: p.x, y: p.y };
    this.last = { x: p.x, y: p.y };
    this.moved = false;
    const t = this.touches();
    if (t.length >= 2) {
      this.wasPinching = true;
      this.pinchDist = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
      this.stopCapture();
      return;
    }
    const wp = this.cam.getWorldPoint(p.x, p.y);
    if (this.onPress && this.onPress(wp.x, wp.y)) {
      this.capturing = true;
      return;
    }
    clearTimeout(this.pressTimer);
    if (this.onLongPress) {
      this.pressTimer = setTimeout(() => {
        if (this.moved || this.wasPinching || !this.downPos) return;
        if (this.onLongPress(wp.x, wp.y)) {
          this.capturing = true;
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }, 450);
    }
  }

  handleMove(p) {
    if (!p.isDown || !this.last) return;
    const t = this.touches();
    if (t.length >= 2) {
      const d = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
      if (this.pinchDist > 0) this.setZoom(this.cam.zoom * d / this.pinchDist);
      this.pinchDist = d;
      this.wasPinching = true;
      return;
    }
    if (this.wasPinching) return;
    if (Math.hypot(p.x - this.downPos.x, p.y - this.downPos.y) > 8) {
      this.moved = true;
      clearTimeout(this.pressTimer);
    }
    if (this.capturing) {
      const wp = this.cam.getWorldPoint(p.x, p.y);
      if (this.onDragMove) this.onDragMove(wp.x, wp.y);
    } else if (this.moved) {
      this.cam.scrollX -= (p.x - this.last.x) / this.cam.zoom;
      this.cam.scrollY -= (p.y - this.last.y) / this.cam.zoom;
    }
    this.last = { x: p.x, y: p.y };
  }

  handleUp(p) {
    clearTimeout(this.pressTimer);
    const wasCapturing = this.capturing;
    this.stopCapture();
    if (!wasCapturing && !this.moved && !this.wasPinching && this.downPos && this.onTap) {
      const wp = this.cam.getWorldPoint(p.x, p.y);
      this.onTap(wp.x, wp.y);
    }
    if (this.touches().length === 0) {
      this.wasPinching = false;
      this.pinchDist = 0;
      this.downPos = null;
      this.last = null;
    }
  }

  update(delta) {
    if (!this.keys) return;
    const k = this.keys;
    const s = 0.6 * delta / this.cam.zoom;
    if (k.A.isDown || k.LEFT.isDown) this.cam.scrollX -= s;
    if (k.D.isDown || k.RIGHT.isDown) this.cam.scrollX += s;
    if (k.W.isDown || k.UP.isDown) this.cam.scrollY -= s;
    if (k.S.isDown || k.DOWN.isDown) this.cam.scrollY += s;
  }
}
