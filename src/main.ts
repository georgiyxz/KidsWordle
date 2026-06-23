import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { Palette, LOGICAL_W, LOGICAL_H } from './theme';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: LOGICAL_W,
  height: LOGICAL_H,
  backgroundColor: Palette.purple,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, powerPreference: 'low-power' },
  scene: [BootScene, MainMenuScene, GameScene],
});

// Pause whatever scene is running while the iframe tab is hidden (battery
// etiquette §1), then resume the same scenes when it comes back.
let pausedByHide: Phaser.Scene[] = [];
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pausedByHide = game.scene.getScenes(true);
    pausedByHide.forEach((s) => s.scene.pause());
  } else {
    pausedByHide.forEach((s) => s.scene.resume());
    pausedByHide = [];
  }
});
