import Phaser from 'phaser';
import { Palette, Hex, FONT, LOGICAL_W, LOGICAL_H, Mode } from '../theme';
import { drawGarden } from '../ui/Garden';
import { makeImageButton, makeTextPill, TextPill } from '../ui/Pill';
import { addShadowText } from '../ui/ShadowText';

// Title screen: the Word Garden logo, a one-line joke, the Easy / Hard patch
// picker (Easy is selected by default), and the START button.
export class MainMenuScene extends Phaser.Scene {
  private mode: Mode = 'easy';
  private easyPill!: TextPill;
  private hardPill!: TextPill;

  constructor() {
    super('MainMenuScene');
  }

  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? 'easy';
  }

  create(): void {
    drawGarden(this);

    const titleX = 336;

    // Logo: chunky Poppins, sun-yellow with a shadow-only cartoon lift.
    addShadowText(
      this,
      titleX,
      116,
      'WORD GARDEN',
      {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: Hex.sun,
        align: 'center',
      },
      { shadowColor: '#000000', shadowAlpha: 0.78, offsetX: 5, offsetY: 7 },
    ).container.setAngle(-4);

    // Joke tagline (humor beat #1).
    addShadowText(this, titleX, 178, "Plant letters, grow words — don't wake the dino!", {
        fontFamily: FONT,
        fontSize: '20px',
        color: Hex.ink,
        align: 'center',
        wordWrap: { width: 560 },
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });

    // Patch picker.
    addShadowText(this, titleX, 246, 'PICK YOUR PATCH', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: Hex.soil,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });

    this.easyPill = makeTextPill(this, titleX - 92, 296, 160, 58, 'EASY', () => this.setMode('easy'));
    this.hardPill = makeTextPill(this, titleX + 92, 296, 160, 58, 'HARD', () => this.setMode('hard'));
    this.setMode(this.mode);

    // START button.
    makeImageButton(
      this,
      titleX,
      388,
      'btnStart',
      'btnStartActive',
      () => this.scene.start('GameScene', { mode: this.mode }),
      74,
    );

    // Controls legend (works for keyboard, trackpad and touch).
    addShadowText(this, titleX, 450, 'Type or tap letters  ·  ENTER plants your word', {
        fontFamily: FONT,
        fontSize: '15px',
        color: Hex.ink,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });

    // Hero dino, bobbing happily.
    const hero = this.add.image(770, 318, 'dinoIdle').setOrigin(0.5);
    hero.setDisplaySize(300 * (hero.width / hero.height), 300);
    this.tweens.add({
      targets: hero,
      y: '-=12',
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // A little stegosaurus friend peeking from the corner.
    const steg = this.add.image(96, 486, 'dinoSteg').setOrigin(0.5);
    steg.setDisplaySize(150 * (steg.width / steg.height), 150);

    // FULL SCREEN pill, bottom-right.
    makeImageButton(
      this,
      LOGICAL_W - 105,
      LOGICAL_H - 28,
      'btnFs',
      'btnFsActive',
      () => this.goFullscreen(),
      40,
    );
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.easyPill.setSelected(mode === 'easy');
    this.hardPill.setSelected(mode === 'hard');
  }

  private goFullscreen(): void {
    const el = (document.getElementById('game') ?? this.game.canvas) as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    el.requestFullscreen?.().catch(() => {});
  }
}
