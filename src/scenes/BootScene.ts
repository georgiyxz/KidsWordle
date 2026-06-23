import Phaser from 'phaser';
import { FONT, Hex, LOGICAL_W, LOGICAL_H } from '../theme';
import { addShadowText } from '../ui/ShadowText';
import cloudSpriteUrl from '../../assets/Cloud_Sprite.png?url';

// Loads every asset once, makes sure the local Poppins font is actually
// rendered, then hands off to the Main Menu. Nothing here is gameplay.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    addShadowText(this, LOGICAL_W / 2, LOGICAL_H / 2, 'Growing your garden…', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: Hex.white,
      }, { shadowColor: '#000000', shadowAlpha: 0.8, offsetX: 2, offsetY: 3 });

    // Dino cutouts (optimized in scripts/optimize-assets.mjs).
    this.load.image('dinoIdle', 'art/dinos/dino-idle.webp');
    this.load.image('dinoCheer', 'art/dinos/dino-cheer.webp');
    this.load.image('dinoFace', 'art/dinos/dino-face.webp');
    this.load.image('dinoSteg', 'art/dinos/dino-steg.webp');
    this.load.image('cloudSprite', cloudSpriteUrl);

    // Funbrain CTA buttons (default + active press states).
    const buttons: [string, string][] = [
      ['btnStart', 'CTA-Start-Default'],
      ['btnStartActive', 'CTA-Start-Active'],
      ['btnPlayAgain', 'CTA-PlayAgain-Default'],
      ['btnPlayAgainActive', 'CTA-PlayAgain-Active'],
      ['btnTryAgain', 'CTA-TryAgain-Default'],
      ['btnTryAgainActive', 'CTA-TryAgain-Active'],
      ['btnDone', 'CTA-Done-Default'],
      ['btnDoneActive', 'CTA-Done-Active'],
      ['btnFs', 'CTA-Fullscreen-Default'],
      ['btnFsActive', 'CTA-Fullscreen-Active'],
      ['btnContinue', 'CTA-Continue-Default'],
      ['btnContinueActive', 'CTA-Continue-Active'],
    ];
    buttons.forEach(([key, file]) => this.load.image(key, `ui/${file}.png`));
    this.load.image('cardWin', 'ui/CTA-YouWinCard.png');
    this.load.image('cardOver', 'ui/CTA-GameOverCard.png');

    // Word lists (5-letter, uppercase, one per line).
    this.load.text('easyWords', 'data/easy_words.txt');
    this.load.text('hardWords', 'data/hard_words.txt');
  }

  async create(): Promise<void> {
    // Canvas text uses whatever font is loaded at draw time, so wait for the
    // local Poppins faces before showing the title — otherwise it flashes a
    // system fallback. Guarded in case the Font Loading API is unavailable.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts) {
      try {
        await Promise.all([fonts.load(`700 48px "${FONT}"`), fonts.load(`300 20px "${FONT}"`)]);
        await fonts.ready;
      } catch {
        /* keep going with the fallback font */
      }
    }
    this.scene.start('MainMenuScene', { mode: 'easy' });
  }
}
