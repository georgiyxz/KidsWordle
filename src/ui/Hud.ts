import Phaser from 'phaser';
import { Palette, FONT, Hex, LOGICAL_W, LOGICAL_H } from '../theme';
import { makeImageButton } from './Pill';
import { addShadowText } from './ShadowText';

// Game HUD: a "tries left" row of leaf seeds (top-left), the Funbrain DONE
// button (top-right) and the FULL SCREEN pill (bottom-right). Seeds turn to mud
// as guesses are spent so the player always sees how many are left.
export class Hud {
  private scene: Phaser.Scene;
  private seeds: Phaser.GameObjects.Graphics;
  private max: number;
  readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, opts: { maxGuesses: number; onDone: () => void }) {
    this.scene = scene;
    this.max = opts.maxGuesses;
    this.container = scene.add.container(0, 0);

    const label = addShadowText(scene, 24, 22, 'TRIES LEFT', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: Hex.soil,
      }, {
        origin: [0, 0.5],
        shadowColor: Hex.cream,
        shadowAlpha: 0.86,
        offsetX: 1,
        offsetY: 2,
      });

    this.seeds = scene.add.graphics();
    this.container.add([label.container, this.seeds]);
    this.setGuessesLeft(opts.maxGuesses);

    // DONE (top-right) — returns to the menu.
    makeImageButton(scene, LOGICAL_W - 68, 36, 'btnDone', 'btnDoneActive', opts.onDone, 44);

    // FULL SCREEN (bottom-right).
    makeImageButton(
      scene,
      LOGICAL_W - 80,
      LOGICAL_H - 30,
      'btnFs',
      'btnFsActive',
      () => this.goFullscreen(),
      34,
    );
  }

  setGuessesLeft(n: number): void {
    const g = this.seeds;
    g.clear();
    const startX = 30;
    const y = 48;
    const gap = 28;
    const r = 9;
    for (let i = 0; i < this.max; i++) {
      const used = i >= n; // the first (max - n) seeds are spent
      const x = startX + i * gap;
      g.fillStyle(used ? Palette.mud : Palette.grass, 1);
      g.lineStyle(3, used ? 0x4f3a29 : Palette.grassDark, 1);
      g.fillCircle(x, y, r);
      g.strokeCircle(x, y, r);
      if (!used) {
        // a tiny sprout on the living seeds
        g.lineStyle(3, Palette.grassDark, 1);
        g.lineBetween(x, y - r, x, y - r - 6);
      }
    }
  }

  private goFullscreen(): void {
    // Fullscreen the app-shell wrapper so DOM + canvas both expand. iOS Safari
    // on iPhone has no element fullscreen — the optional call simply no-ops.
    const el = (document.getElementById('game') ?? this.scene.game.canvas) as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    el.requestFullscreen?.().catch(() => {});
  }
}
