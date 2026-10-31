import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { createHud } from './ui/Hud.js';
import './ui/ui.css';

// 防止 iPhone 雙指縮放整個網頁
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

createHud();

new Game({
  type: AUTO,
  parent: 'game',
  backgroundColor: '#f5ead8',
  pixelArt: true,
  scale: { mode: Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [GameScene]
});

