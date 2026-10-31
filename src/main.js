import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { CustomerSystem } from './systems/CustomerSystem.js';
import { loadGame, startAutoSave } from './systems/SaveSystem.js';
import { createHud, showMessage } from './ui/Hud.js';
import './ui/ui.css';

// 防止 iPhone 雙指縮放整個網頁
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// 先讀取存檔，再建立介面與遊戲
const loaded = loadGame();
createHud();
startAutoSave();

// 把各個系統組合進遊戲畫面
class MainScene extends GameScene {
  create() {
    super.create();
    this.customerSystem = new CustomerSystem(this);
    const kb = this.input.keyboard;
    if (kb && kb.disableGlobalCapture) kb.disableGlobalCapture(); // 讓輸入框可以正常打字
    if (loaded) showMessage('已讀取上次的進度', 2500);
  }
}

new Game({
  type: AUTO,
  parent: 'game',
  backgroundColor: '#f5ead8',
  pixelArt: true,
  scale: { mode: Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [MainScene]
});
