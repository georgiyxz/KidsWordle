import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { Palette, LOGICAL_W, LOGICAL_H } from './theme';

function syncViewportVars(): void {
  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width ?? window.innerWidth);
  const height = Math.round(viewport?.height ?? window.innerHeight);
  document.documentElement.style.setProperty('--app-width', `${Math.max(1, width)}px`);
  document.documentElement.style.setProperty('--app-height', `${Math.max(1, height)}px`);
}

syncViewportVars();

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
  // antialias + mipmap filtering keep downscaled images (dino, CTA buttons) clean;
  // text sharpness comes from the higher RENDER_RESOLUTION in theme.ts.
  render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', roundPixels: false, powerPreference: 'low-power' },
  banner: false, // no console banner spam
  audio: { disableWebAudio: false }, // WebAudio on; unlocks on first user gesture
  scene: [BootScene, MainMenuScene, GameScene],
});

let refitFrame = 0;

// Keep the FIT canvas matched to the *visible* viewport. Mobile landscape can
// report a taller CSS viewport than the actually visible area while browser
// chrome is present, so drive the parent size from visualViewport when available.
const refit = (): void => {
  syncViewportVars();
  if (refitFrame) cancelAnimationFrame(refitFrame);
  refitFrame = requestAnimationFrame(() => {
    syncViewportVars();
    game.scale.refresh();
    refitFrame = 0;
  });
};
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => {
  refit();
  window.setTimeout(refit, 250);
});
window.visualViewport?.addEventListener('resize', refit);
window.visualViewport?.addEventListener('scroll', refit);

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
