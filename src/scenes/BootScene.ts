import Phaser from 'phaser';
import { FONT, Hex, LOGICAL_W, LOGICAL_H } from '../theme';
import { addShadowText } from '../ui/ShadowText';

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
    this.load.image('dinoHint', 'art/dinos/dino-hint.webp');
    this.load.image('dinoExcited', 'art/dinos/dino-excited.webp');
    this.load.image('dinoEncourage', 'art/dinos/dino-encourage.webp');
    this.load.image('dinoProud', 'art/dinos/dino-proud.webp');
    this.load.image('dinoCheer', 'art/dinos/dino-cheer.webp');
    this.load.image('dinoFace', 'art/dinos/dino-face.webp');
    this.load.image('dinoSteg', 'art/dinos/dino-steg.webp');
    this.load.image('cloudSprite', 'art/cloud.webp');

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

    // Secret word lists are bundled via ?raw imports in GameScene (Easy/Medium/
    // Hard), and 5letter_clean is the guess-validation dictionary — no text loads
    // needed here.

    // Audio (compressed mono mp3 in public/audio): typing tick, popup pop,
    // flower charge-up, and the looped menu lofi bed.
    this.load.audio('sfxText', 'audio/Text.mp3');
    this.load.audio('sfxPopup', 'audio/intro_popup.mp3');
    this.load.audio('sfxCharge', 'audio/charge_up.mp3');
    this.load.audio('musicLofi', 'audio/Lofi.mp3');
    this.load.audio('sfxCastHook', 'audio/Cast_Hook_UI.mp3');
    this.load.audio('sfxButtonShow', 'audio/Button_Show.mp3');
    this.load.audio('sfxTada', 'audio/Tada.mp3');
    this.load.audio('sfxLetterHit', 'audio/LetterHit.mp3');
    this.load.audio('voice1', 'audio/voice1.mp3');
    this.load.audio('voice2', 'audio/voice2.mp3');
    this.load.audio('voice3', 'audio/voice3.mp3');
    this.load.audio('birdschirping', 'audio/birdschirping.mp3');
    this.load.audio('sfxCharacterSelected', 'audio/CharacterSelected.mp3');
    this.load.audio('sfxFlowerDead', 'audio/flower_dead.mp3');
  }

  async create(): Promise<void> {
    // Canvas text uses whatever font is loaded at draw time, so wait for the
    // local Poppins faces before showing the title — otherwise it flashes a
    // system fallback. Guarded in case the Font Loading API is unavailable.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts) {
      try {
        await fonts.load(`700 48px "${FONT}"`);
        await fonts.ready;
      } catch {
        /* keep going with the fallback font */
      }
    }
    this.scene.start('MainMenuScene', { mode: 'easy' });
  }
}
