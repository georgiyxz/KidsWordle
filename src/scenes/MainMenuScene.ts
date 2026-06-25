import Phaser from 'phaser';
import { Palette, Hex, FONT, LOGICAL_W, LOGICAL_H, Mode } from '../theme';
import { drawGarden, addClouds, addButterflies } from '../ui/Garden';
import { makeImageButton, makeTextPill, TextPill } from '../ui/Pill';
import { addShadowText } from '../ui/ShadowText';
import { startMenuMusic, stopMenuMusic, playButtonShow } from '../audio';

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
  private mediumPill!: TextPill;
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
    this.addMenuFlowers(reduce);

    // Looped lofi while on the menu; stopped when we leave (no overlap on return).
    startMenuMusic(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopMenuMusic());

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

    // Difficulty picker.
    const pick = addShadowText(this, titleX, 250, 'Pick your difficulty', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: Hex.teal,
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });

    // Three equal pills: Easy / Medium / Hard. Same size + selected visuals; each
    // hit area matches its visible pill (rectangle set inside makeTextPill).
    const pillW = 132;
    const pillGap = 140;
    this.easyPill = makeTextPill(this, titleX - pillGap, 296, pillW, 56, 'EASY', () => this.setMode('easy'));
    this.mediumPill = makeTextPill(this, titleX, 296, pillW, 56, 'MEDIUM', () => this.setMode('medium'));
    this.hardPill = makeTextPill(this, titleX + pillGap, 296, pillW, 56, 'HARD', () => this.setMode('hard'));
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
    this.add.ellipse(770, 462, 118, 16, 0x5b7d3a, 0.08);
    const heroWrap = this.add.container(770, 318);
    const hero = this.add.image(0, 0, 'dinoIdle').setOrigin(0.5);
    hero.setDisplaySize(286 * (hero.width / hero.height), 286);
    this.heroEyes = this.add.graphics();
    heroWrap.add([hero, this.heroEyes]);
    this.heroDino = hero;
    this.tweens.add({ targets: hero, y: -12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.input.on('pointermove', this.trackEyes, this);
    this.input.on('pointerdown', this.trackEyes, this);

    // FULL SCREEN pill, bottom-right.
    makeImageButton(this, LOGICAL_W - 105, LOGICAL_H - 28, 'btnFs', 'btnFsActive', () => this.goFullscreen(), 40);

    if (!reduce) {
      this.popContainer(title.container, 0);
      heroWrap.setAlpha(0);
      this.tweens.add({ targets: heroWrap, alpha: 1, duration: 280, delay: 120, ease: 'Quad.out' });
      this.popContainer(tagline.container, 140);
      this.popContainer(pick.container, 210);
      this.popContainer(this.easyPill.container, 260);
      this.popContainer(this.mediumPill.container, 300);
      this.popContainer(this.hardPill.container, 340);
      this.fadeIn(start, 400);
      this.popContainer(legend.container, 460);
      // Tasteful button-pop ticks: one for the difficulty pills, one for START.
      this.time.delayedCall(260, () => playButtonShow(this));
      this.time.delayedCall(400, () => playButtonShow(this));
    }
  }

  private addMenuFlowers(reduce: boolean): Phaser.GameObjects.Container {
    const layer = this.add.container(0, 0);
    const flowers: [number, number, number][] = [
      [74, 502, Palette.pinkBright],
      [124, 514, Palette.sun],
      [198, 506, Palette.lilac],
      [716, 510, Palette.orange],
      [770, 502, Palette.pinkBright],
      [832, 514, Palette.white],
      [900, 506, Palette.sun],
    ];
    flowers.forEach(([x, y, color], i) => {
      const g = this.add.graphics();
      drawMenuFlower(g, color, i % 2 === 0 ? Palette.yellow : Palette.orange);
      // Each flower blooms in place from scale 0 (origin is its own base point),
      // so there is no sliding from the layer corner.
      const target = i % 3 === 0 ? 0.9 : 1;
      const f = this.add.container(x, y, [g]);
      layer.add(f);
      if (reduce) {
        f.setScale(target);
      } else {
        f.setScale(0);
        this.tweens.add({ targets: f, scale: target, duration: 420, delay: 480 + i * 70, ease: 'Back.out' });
      }
    });
    return layer;
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
    this.mediumPill.setSelected(mode === 'medium');
    this.hardPill.setSelected(mode === 'hard');
  }

  private goFullscreen(): void {
    const el = (document.getElementById('game') ?? this.game.canvas) as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }
}

function drawMenuFlower(g: Phaser.GameObjects.Graphics, petal: number, center: number): void {
  g.lineStyle(4, Palette.grassDark, 1);
  g.lineBetween(0, 0, 0, -24);
  g.fillStyle(Palette.leafGreen, 1);
  g.fillEllipse(-7, -12, 12, 7);
  g.fillEllipse(7, -17, 12, 7);
  g.fillStyle(petal, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillCircle(Math.cos(a) * 8, -30 + Math.sin(a) * 8, 6);
  }
  g.fillStyle(center, 1);
  g.fillCircle(0, -30, 5);
}
