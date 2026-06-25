import Phaser from 'phaser';
import { LOGICAL_W, LOGICAL_H } from '../theme';
import { makeImageButton } from './Pill';

// Game HUD corner buttons: the Funbrain DONE button (top-right) and the FULL
// SCREEN button (bottom-right). The tries-left display was removed — the board's
// guess rows already show how many tries remain, so no separate counter is needed.
export class Hud {
  private scene: Phaser.Scene;
  readonly container: Phaser.GameObjects.Container;
  private doneBtn: Phaser.GameObjects.Image;
  private fsBtn: Phaser.GameObjects.Image;
  private reduceMotion: boolean;
  private doneY: number;
  private fsY: number;
  // The image buttons are sized via setDisplaySize, so their real rest scale is a
  // fraction (not 1). Remember it so resets restore the intended size, not native.
  private doneScale!: { x: number; y: number };
  private fsScale!: { x: number; y: number };

  constructor(scene: Phaser.Scene, opts: { maxGuesses: number; onDone: () => void }) {
    this.scene = scene;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.container = scene.add.container(0, 0);

    // Done + Full Screen live together in the bottom-right corner.
    this.fsBtn = makeImageButton(scene, LOGICAL_W - 80, LOGICAL_H - 30, 'btnFs', 'btnFsActive', () => this.goFullscreen(), 34);
    this.doneBtn = makeImageButton(scene, LOGICAL_W - 80, LOGICAL_H - 77, 'btnDone', 'btnDoneActive', opts.onDone, 44);
    this.doneY = this.doneBtn.y;
    this.fsY = this.fsBtn.y;
    this.doneScale = { x: this.doneBtn.scaleX, y: this.doneBtn.scaleY };
    this.fsScale = { x: this.fsBtn.scaleX, y: this.fsBtn.scaleY };
  }

  // Tries-left visuals were removed; these stay as no-ops so the intro and
  // per-word flow can keep calling them without branching.
  introHud(): void {}
  resetBalls(): void {}
  setGuessesLeft(_n: number): void {}

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
    this.doneBtn.setY(this.doneY).setScale(this.doneScale.x, this.doneScale.y).setAlpha(1).setVisible(true).setInteractive(this.scene.input.makePixelPerfect());
    this.fsBtn.setY(this.fsY).setScale(this.fsScale.x, this.fsScale.y).setAlpha(1).setVisible(true).setInteractive(this.scene.input.makePixelPerfect());
  }

  hideForLoss(delay = 0): number {
    this.doneBtn.disableInteractive();
    this.fsBtn.disableInteractive();
    if (this.reduceMotion) {
      this.doneBtn.setAlpha(0);
      this.fsBtn.setAlpha(0);
      return 80;
    }
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

  private goFullscreen(): void {
    const el = (document.getElementById('game') ?? this.scene.game.canvas) as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }
}

// Image CTAs already carry a fixed display size, so fade + slide them in (never
// tween scale, which would fight setDisplaySize).
function fadeButtonIn(scene: Phaser.Scene, img: Phaser.GameObjects.Image, delay: number): void {
  const y = img.y;
  img.setAlpha(0).setY(y - 10);
  scene.tweens.add({ targets: img, alpha: 1, y, duration: 260, delay, ease: 'Quad.out' });
}
