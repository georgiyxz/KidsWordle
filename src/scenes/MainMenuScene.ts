import Phaser from 'phaser';
import { Palette, Hex, FONT, LOGICAL_W, LOGICAL_H, Mode } from '../theme';
import { drawGarden, addClouds, addButterflies } from '../ui/Garden';
import { makeImageButton, makeTextPill, TextPill } from '../ui/Pill';
import { addShadowText } from '../ui/ShadowText';

// Eye layout for the height-286 menu hero (the game's height-150 values scaled).
const MENU_EYE = {
  left: { x: -46, y: -107 },
  right: { x: -23, y: -107 },
  radius: 5,
  range: 5.2,
};

// Title screen: the Word Garden logo, a one-line joke, the Easy / Hard patch
// picker (Easy is selected by default), and the START button.
export class MainMenuScene extends Phaser.Scene {
  private mode: Mode = 'easy';
  private easyPill!: TextPill;
  private hardPill!: TextPill;
  private heroDino?: Phaser.GameObjects.Image;
  private heroEyes?: Phaser.GameObjects.Graphics;
  private eyeTarget = new Phaser.Math.Vector2(LOGICAL_W / 2, LOGICAL_H / 2);
  private eyeOffset = new Phaser.Math.Vector2(0, 0);
  private lastEyeInputAt = 0;

  constructor() {
    super('MainMenuScene');
  }

  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? 'easy';
  }

  create(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    drawGarden(this);
    addClouds(this);
    addButterflies(this);

    const titleX = 336;

    // Logo: chunky Poppins, bright orange, straight and centered with a close shadow.
    const title = addShadowText(this, titleX, 108, 'WORD GARDEN', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: Hex.orange,
        align: 'center',
      }, { shadowColor: '#000000', shadowAlpha: 0.82, offsetX: 3, offsetY: 3 });

    // Simple, clear rules.
    const tagline = addShadowText(this, titleX, 182, 'Guess the secret word.\nScore points.\nBeat your best!', {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: Hex.ink,
        align: 'center',
        lineSpacing: 5,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1.5, offsetY: 1.5 });

    // Patch picker.
    const pick = addShadowText(this, titleX, 250, 'PICK YOUR PATCH', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: Hex.teal,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });

    this.easyPill = makeTextPill(this, titleX - 92, 296, 160, 58, 'EASY', () => this.setMode('easy'));
    this.hardPill = makeTextPill(this, titleX + 92, 296, 160, 58, 'HARD', () => this.setMode('hard'));
    this.setMode(this.mode);

    // START button.
    const start = makeImageButton(this, titleX, 388, 'btnStart', 'btnStartActive', () => this.scene.start('GameScene', { mode: this.mode }), 74);

    // Controls legend (works for keyboard, trackpad and touch).
    const legend = addShadowText(this, titleX, 450, 'Type or tap letters  ·  ENTER to guess', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: Hex.ink,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1.5, offsetY: 1.5 });

    // Hero dino, bobbing happily, with eyes that follow the cursor / last tap.
    this.add.ellipse(770, 458, 160, 26, 0x5b7d3a, 0.18);
    const heroWrap = this.add.container(770, 318);
    const hero = this.add.image(0, 0, 'dinoIdle').setOrigin(0.5);
    hero.setDisplaySize(286 * (hero.width / hero.height), 286);
    this.heroEyes = this.add.graphics();
    heroWrap.add([hero, this.heroEyes]);
    this.heroDino = hero;
    this.tweens.add({ targets: hero, y: -12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.input.on('pointermove', this.trackEyes, this);
    this.input.on('pointerdown', this.trackEyes, this);

    // A little stegosaurus friend peeking from the corner.
    const steg = this.add.image(96, 486, 'dinoSteg').setOrigin(0.5);
    steg.setDisplaySize(150 * (steg.width / steg.height), 150);

    // FULL SCREEN pill, bottom-right.
    makeImageButton(this, LOGICAL_W - 105, LOGICAL_H - 28, 'btnFs', 'btnFsActive', () => this.goFullscreen(), 40);

    if (!reduce) {
      this.popContainer(title.container, 0);
      heroWrap.setAlpha(0);
      this.tweens.add({ targets: heroWrap, alpha: 1, duration: 280, delay: 120, ease: 'Quad.out' });
      this.popContainer(tagline.container, 140);
      this.popContainer(pick.container, 210);
      this.popContainer(this.easyPill.container, 260);
      this.popContainer(this.hardPill.container, 300);
      this.fadeIn(start, 360);
      this.popContainer(legend.container, 430);
      this.fadeIn(steg, 480);
    }
  }

  private trackEyes(pointer: Phaser.Input.Pointer): void {
    this.eyeTarget.set(pointer.x, pointer.y);
    this.lastEyeInputAt = this.time.now;
  }

  update(_time: number, delta: number): void {
    const dino = this.heroDino;
    const eyes = this.heroEyes;
    if (!dino || !eyes) return;
    const recent = this.lastEyeInputAt > 0 && this.time.now - this.lastEyeInputAt < 3500;
    let targetX = 0;
    let targetY = 0;
    if (recent) {
      const cx = dino.parentContainer.x + (MENU_EYE.left.x + MENU_EYE.right.x) / 2;
      const cy = dino.parentContainer.y + dino.y + (MENU_EYE.left.y + MENU_EYE.right.y) / 2;
      const dx = this.eyeTarget.x - cx;
      const dy = this.eyeTarget.y - cy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const travel = Math.min(MENU_EYE.range, len * 0.02);
      targetX = (dx / len) * travel;
      targetY = (dy / len) * travel;
    }
    const ease = Phaser.Math.Clamp(delta / 120, 0, 1);
    this.eyeOffset.x = Phaser.Math.Linear(this.eyeOffset.x, targetX, ease);
    this.eyeOffset.y = Phaser.Math.Linear(this.eyeOffset.y, targetY, ease);
    const ox = this.eyeOffset.x;
    const oy = dino.y + this.eyeOffset.y;
    eyes.clear();
    eyes.fillStyle(Palette.ink, 1);
    eyes.fillCircle(MENU_EYE.left.x + ox, MENU_EYE.left.y + oy, MENU_EYE.radius);
    eyes.fillCircle(MENU_EYE.right.x + ox, MENU_EYE.right.y + oy, MENU_EYE.radius);
  }

  // Pop a container in from small + transparent with a playful overshoot.
  private popContainer(c: Phaser.GameObjects.Container, delay: number): void {
    const y = c.y;
    c.setScale(0.6).setAlpha(0).setY(y + 14);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, y, ease: 'Back.out', duration: 300, delay });
  }

  // Image CTAs / sprites carry a fixed display size, so fade + slide them in
  // (tweening scale would fight setDisplaySize). alphaOnly avoids fighting a bob.
  private fadeIn(img: Phaser.GameObjects.Image, delay: number, alphaOnly = false): void {
    const y = img.y;
    img.setAlpha(0);
    if (!alphaOnly) img.setY(y - 12);
    this.tweens.add({ targets: img, alpha: 1, y, duration: 280, delay, ease: 'Quad.out' });
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
