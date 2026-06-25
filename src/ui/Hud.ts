import Phaser from 'phaser';
import { Palette, FONT, Hex, LOGICAL_W, LOGICAL_H } from '../theme';
import { makeImageButton } from './Pill';
import { addShadowText, ShadowedText } from './ShadowText';

type Ball = { container: Phaser.GameObjects.Container; alive: boolean };

const BALL_X = 30;
const BALL_Y = 48;
const BALL_GAP = 28;

// Game HUD: a "tries left" row of seed-balls (top-left), the Funbrain DONE
// button (top-right) and the FULL SCREEN pill (bottom-right). The balls pop in
// one-by-one and pop out as guesses are spent (REEL MATH cast-ball feel).
export class Hud {
  private scene: Phaser.Scene;
  private max: number;
  readonly container: Phaser.GameObjects.Container;
  private label: ShadowedText;
  private balls: Ball[] = [];
  private doneBtn: Phaser.GameObjects.Image;
  private fsBtn: Phaser.GameObjects.Image;
  private reduceMotion: boolean;
  private doneY: number;
  private fsY: number;

  constructor(scene: Phaser.Scene, opts: { maxGuesses: number; onDone: () => void }) {
    this.scene = scene;
    this.max = opts.maxGuesses;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.container = scene.add.container(0, 0);

    this.label = addShadowText(scene, 24, 22, 'TRIES LEFT', {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: Hex.teal,
    }, { origin: [0, 0.5], shadowColor: Hex.white, shadowAlpha: 0.9, offsetX: 1, offsetY: 2 });
    this.container.add(this.label.container);

    for (let i = 0; i < this.max; i++) {
      const g = scene.add.graphics();
      drawBall(g);
      const c = scene.add.container(BALL_X + i * BALL_GAP, BALL_Y, [g]);
      this.container.add(c);
      this.balls.push({ container: c, alive: true });
    }

    // Done + Full Screen live together in the bottom-right corner.
    this.fsBtn = makeImageButton(scene, LOGICAL_W - 80, LOGICAL_H - 30, 'btnFs', 'btnFsActive', () => this.goFullscreen(), 34);
    this.doneBtn = makeImageButton(scene, LOGICAL_W - 80, LOGICAL_H - 77, 'btnDone', 'btnDoneActive', opts.onDone, 44);
    this.doneY = this.doneBtn.y;
    this.fsY = this.fsBtn.y;
  }

  // Stage 1 of the intro: pop the tries label, then the seed-balls one-by-one.
  introHud(): void {
    if (this.reduceMotion) return;
    popObject(this.scene, this.label.container, 0.6, 0);
    this.balls.forEach((b, i) => this.popBallIn(b, 90 + i * 50));
  }

  // Last stage of the intro: fade in the bottom-right Done + Full Screen.
  introCorners(): void {
    if (this.reduceMotion) return;
    fadeButtonIn(this.scene, this.doneBtn, 0);
    fadeButtonIn(this.scene, this.fsBtn, 90);
  }

  // Pre-hide the corner buttons so they only appear with the last intro stage.
  hideCorners(): void {
    if (this.reduceMotion) return;
    this.doneBtn.setAlpha(0);
    this.fsBtn.setAlpha(0);
  }

  resetForIntro(): void {
    this.scene.tweens.killTweensOf([this.container, this.doneBtn, this.fsBtn]);
    this.container.setPosition(0, 0).setScale(1).setAlpha(1).setVisible(true);
    this.balls.forEach((b) => {
      this.scene.tweens.killTweensOf(b.container);
      b.alive = true;
      b.container.setVisible(true).setPosition(b.container.x, BALL_Y).setScale(1).setAlpha(1);
    });
    this.doneBtn.setY(this.doneY).setScale(1).setAlpha(1).setVisible(true).setInteractive(this.scene.input.makePixelPerfect());
    this.fsBtn.setY(this.fsY).setScale(1).setAlpha(1).setVisible(true).setInteractive(this.scene.input.makePixelPerfect());
  }

  hideForLoss(delay = 0): number {
    this.doneBtn.disableInteractive();
    this.fsBtn.disableInteractive();
    if (this.reduceMotion) {
      this.container.setAlpha(0);
      this.doneBtn.setAlpha(0);
      this.fsBtn.setAlpha(0);
      return 80;
    }

    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 8,
      scale: 0.9,
      alpha: 0,
      duration: 220,
      delay,
      ease: 'Back.in',
    });
    this.scene.tweens.add({
      targets: [this.doneBtn, this.fsBtn],
      y: '-=8',
      alpha: 0,
      duration: 220,
      delay: delay + 70,
      ease: 'Quad.in',
    });
    return delay + 310;
  }

  // Restore all balls and pop them back in (a fresh word in the same run).
  resetBalls(): void {
    this.balls.forEach((b, i) => {
      b.alive = true;
      if (this.reduceMotion) {
        b.container.setScale(1).setAlpha(1).setVisible(true);
      } else {
        this.popBallIn(b, i * 55);
      }
    });
  }

  setGuessesLeft(n: number): void {
    for (let i = 0; i < this.max; i++) {
      const alive = i < n;
      if (!alive && this.balls[i].alive) this.popBallOut(this.balls[i]);
    }
  }

  private popBallIn(b: Ball, delay: number): void {
    b.alive = true;
    b.container.setVisible(true).setScale(0).setAlpha(0);
    this.scene.tweens.add({ targets: b.container, scale: 1, alpha: 1, ease: 'Back.out', duration: 300, delay });
  }

  private popBallOut(b: Ball): void {
    b.alive = false;
    if (this.reduceMotion) { b.container.setVisible(false); return; }
    this.scene.tweens.add({
      targets: b.container,
      scale: 0,
      alpha: 0,
      ease: 'Back.in',
      duration: 240,
      onComplete: () => b.container.setVisible(false),
    });
  }

  private goFullscreen(): void {
    const el = (document.getElementById('game') ?? this.scene.game.canvas) as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    el.requestFullscreen?.().catch(() => {});
  }
}

// A glossy round ball (no stem) so the tries counters read as balls, not fruit.
function drawBall(g: Phaser.GameObjects.Graphics): void {
  const r = 9;
  g.fillStyle(Palette.ctaPrimary, 1);
  g.lineStyle(3, 0x176f6d, 1);
  g.fillCircle(0, 0, r);
  g.strokeCircle(0, 0, r);
  g.fillStyle(Palette.white, 0.5);
  g.fillCircle(-3, -3.2, 3.3);
  g.fillStyle(Palette.white, 0.95);
  g.fillCircle(-3.6, -4, 1.5);
}

function popObject(scene: Phaser.Scene, c: Phaser.GameObjects.Container, from: number, delay: number): void {
  c.setScale(from).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, ease: 'Back.out', duration: 280, delay });
}

// Image CTAs already carry a fixed display size, so fade + slide them in (never
// tween scale, which would fight setDisplaySize).
function fadeButtonIn(scene: Phaser.Scene, img: Phaser.GameObjects.Image, delay: number): void {
  const y = img.y;
  img.setAlpha(0).setY(y - 10);
  scene.tweens.add({ targets: img, alpha: 1, y, duration: 260, delay, ease: 'Quad.out' });
}
