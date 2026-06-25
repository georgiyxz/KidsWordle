import Phaser from 'phaser';
import { Palette, Hex, FONT, LOGICAL_W, LOGICAL_H, Mode } from '../theme';
import { drawGarden, addClouds, addButterflies } from '../ui/Garden';
import { Hud } from '../ui/Hud';
import { makeImageButton } from '../ui/Pill';
import { addShadowText, ShadowedText } from '../ui/ShadowText';
import { bindWordInput } from '../input/GameInput';
import { scoreGuess, LetterResult } from '../game/scoreGuess';
import { reportScore, getHighScore } from '../game/session';
import {
  playText,
  playPopup,
  playCharge,
  stopCharge,
  playButtonShow,
  playTada,
  playLetterHit,
  playDinoVoice,
  startBirdAmbience,
  stopBirdAmbience,
  playFlowerDead,
  stopFlowerDead,
} from '../audio';
import validWordsRaw from '../../data/5letter_clean.txt?raw';
import easyWordsRaw from '../../data/words-easy.txt?raw';
import mediumWordsRaw from '../../data/medium-words.txt?raw';
import hardWordsRaw from '../../data/words-hard.txt?raw';

const ROWS = 6;
const COLS = 5;
// Board tiles ~20% larger than before (was 43/50/49) — the board is the focus.
const CELL = 52;
const STEP_X = 60;
const STEP_Y = 59;
// ---- Layout (960 x 540). Tweak these to move whole UI groups around. ----
// Board is the centered focus; keyboard sits directly below it. Dino + chat +
// Dino Hint form a left-side column. Tries stay top-left, score top-right.
const BOARD_CX = 502;
const BOARD_CY = 210;
const KEYBOARD_CX = 480;
const KEYBOARD_CY = 470;
const DINO_X = 176; // dino + chat + hint column, on the left
const DINO_Y = 286;
const CHAT_X = 176;
const CHAT_Y = 120;
const HELP_X = 170; // Dino Hints cluster in the old top-left Tries area (above chat)
const HELP_Y = 36;
const HINTS_PER_RUN = 5;
// On-screen keyboard sizing (~20% smaller than the original 62/96/38/8/44 set).
const KEY_W = 50;
const KEY_WIDE = 76;
const KEY_H = 30;
const KEY_GAP = 6;
const KEY_ROW_DY = 35;

type Score = LetterResult;
type TileState = 'empty' | 'active' | 'typing' | Score;
type LetterState = 'unknown' | Score;

type Cell = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  txt: ShadowedText;
  lx: number;
  ly: number;
};

type KeyObj = {
  container: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
  setState: (s: LetterState) => void;
  pulse: () => void;
  reset: () => void;
  fall: () => void;
  baseX: number;
  baseY: number;
};

type EyeLayout = {
  left: { x: number; y: number };
  right: { x: number; y: number };
  radius: number;
  range: number;
};

type DinoPoseLayout = {
  height: number;
  x: number;
  y: number;
};

type FlowerType = {
  petals: number;
  petalColor: number;
  centerColor: number;
  radius: number;
};

type FlowerSpot = {
  x: number;
  y: number;
};

const FALLBACK_EASY = [
  'APPLE', 'TIGER', 'ROBOT', 'CLOUD', 'PIZZA',
  'MUSIC', 'OCEAN', 'LEMON', 'BUNNY', 'MAGIC',
];
const FALLBACK_MEDIUM = [
  'ABOUT', 'ABOVE', 'AFTER', 'BEACH', 'CHAIR',
  'DREAM', 'EAGLE', 'FLAME', 'GRAPE', 'HONEY',
];
const FALLBACK_HARD = [
  'PLANT', 'CRANE', 'SNAIL', 'BRAVE', 'SHARK',
  'STONE', 'WHALE', 'FRUIT', 'BREAD', 'DANCE',
];

// Per-difficulty secret pools, parsed once from the local word lists.
// Easy -> words-easy, Medium -> medium-words, Hard -> words-hard.
function parseWordList(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => /^[A-Z]{5}$/.test(w));
}
const EASY_WORDS = parseWordList(easyWordsRaw);
const MEDIUM_WORDS = parseWordList(mediumWordsRaw);
const HARD_WORDS = parseWordList(hardWordsRaw);

const BIG_CHEERS = ['NICE SPROUT!!', 'AWESOME GUESS!!', 'SO CLOSE!!', 'KEEP GOING, SUPER SPELLER!!'];
const SMALL_CHEERS = ['Nice sprout!', 'Your word garden is growing!', 'Getting warmer!'];
const WHIFFS = ['Nope-a-saurus!', 'The dino ate that guess.', 'That letter is hiding somewhere else!'];
const TOO_SHORT = ['Please enter a 5-letter word.', 'Tiny word! It needs 5 letters!', 'Almost! Use 5 letters!'];
const NO_HINTS = ['No helper eggs left!', 'The dino is out of clues!', 'No more hints, super speller!'];
const VOWELS = 'AEIOU';
const INVALID_WORD = "That word doesn't exist! Try again!";
const REPEAT_GUESS = 'You already tried that word!';
const VALID_GUESSES = new Set(
  validWordsRaw
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => /^[A-Z]{5}$/.test(w)),
);

// Right hill from Garden.ts: circle(cx,cy,r). The flower's stem base is its
// container origin, so planting at hillSurfaceY(x) puts the base exactly on the
// green — never floating. Used for every flower so offsets/wraps stay planted.
const RIGHT_HILL = { cx: 860, cy: 470, r: 180 };
function hillSurfaceY(x: number): number {
  const { cx, cy, r } = RIGHT_HILL;
  const dx = Phaser.Math.Clamp(x - cx, -(r - 4), r - 4);
  return Math.round(cy - Math.sqrt(r * r - dx * dx));
}

// Flowers plant only on the RIGHT hill, spread down its inner slope so they sit
// lower (clearly planted, not floating). x is what matters — the base y is derived
// from hillSurfaceY(x) at spawn. Every spot stays above the keyboard (top ~420)
// and well left of the Done / Full Screen cluster (x>836), clear of the board.
const FLOWER_PLANT_OFFSET_Y = 8;
const FLOWER_MIN_X = 700;
const FLOWER_MAX_X = 830;
const FLOWER_MIN_SPACING_X = 34;
const FLOWER_SPAWN_ATTEMPTS = 14;
const FLOWER_SPOTS: FlowerSpot[] = [
  { x: 700, y: 397 },
  { x: 734, y: 349 },
  { x: 768, y: 323 },
  { x: 802, y: 308 },
  { x: 830, y: 300 },
  { x: 718, y: 368 },
  { x: 752, y: 333 },
  { x: 786, y: 313 },
];

const FLOWER_TYPES: FlowerType[] = [
  { petals: 5, petalColor: Palette.pinkBright, centerColor: Palette.sun, radius: 6 },
  { petals: 6, petalColor: Palette.sun, centerColor: Palette.orange, radius: 5 },
  { petals: 7, petalColor: Palette.lilac, centerColor: Palette.yellow, radius: 5 },
  { petals: 8, petalColor: Palette.white, centerColor: Palette.sun, radius: 4 },
  { petals: 5, petalColor: Palette.orange, centerColor: Palette.yellow, radius: 6 },
];

const EYE_LAYOUTS: Record<string, EyeLayout> = {
  dinoIdle: {
    left: { x: -24, y: -56 },
    right: { x: -12, y: -56 },
    radius: 2.6,
    range: 2.7,
  },
};

const DINO_POSE_LAYOUTS: Record<string, DinoPoseLayout> = {
  dinoIdle: { height: 150, x: 0, y: 0 },
  dinoHint: { height: 132, x: -24, y: 8 },
  dinoExcited: { height: 130, x: -24, y: 10 },
  dinoEncourage: { height: 144, x: -10, y: 4 },
  dinoProud: { height: 138, x: -16, y: 8 },
  dinoCheer: { height: 136, x: -18, y: 8 },
  dinoFace: { height: 116, x: 0, y: -34 },
};

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'easy';
  // The difficulty selected on the menu, plus the score-gated auto-switches still
  // pending for this run (each fires once, in order).
  private startMode: Mode = 'easy';
  private pendingTransitions: { score: number; mode: Mode }[] = [];

  // run-level state (persists across words until a fresh run)
  private score = 0;
  private hintsLeft = HINTS_PER_RUN;
  private streak = 0;

  // word-level state
  private secret = 'PLANT';
  private prevSecret = '';
  private row = 0;
  private current = '';
  private guessesMade = 0;
  private busy = false;
  private over = false;
  private letterStates: Record<string, LetterState> = {};
  private guessedLetters = new Set<string>();
  private submittedGuesses = new Set<string>();
  private solvedPos = [false, false, false, false, false];
  private usedHints = new Set<string>();
  private flowersGrown = 0;
  private lastFlowerPos = { x: LOGICAL_W / 2, y: 392 };
  private grownFlowers: { container: Phaser.GameObjects.Container; graphics: Phaser.GameObjects.Graphics; type: FlowerType }[] = [];

  private reduceMotion = false;

  // layers / refs
  private boardLayer!: Phaser.GameObjects.Container;
  private bottomPanelLayer!: Phaser.GameObjects.Container;
  private kbLayer!: Phaser.GameObjects.Container;
  private dinoLayer!: Phaser.GameObjects.Container;
  private chatLayer!: Phaser.GameObjects.Container;
  private flowerLayer!: Phaser.GameObjects.Container;
  private cells: Cell[][] = [];
  private keyObjs: Record<string, KeyObj> = {};
  private letterKeys: Record<string, KeyObj> = {};
  private hud!: Hud;
  private dino!: Phaser.GameObjects.Image;
  private bubble!: Phaser.GameObjects.Graphics;
  private chatText!: ShadowedText;
  private scoreText!: ShadowedText;
  private bestText!: ShadowedText;
  private helpLayer!: Phaser.GameObjects.Container;
  private helpEggs!: Phaser.GameObjects.Graphics;
  private helpHit!: Phaser.GameObjects.Zone;
  private hintLabel!: ShadowedText;
  private scoreLayer!: Phaser.GameObjects.Container;
  private emotionTimer?: Phaser.Time.TimerEvent;
  private eyePupils!: Phaser.GameObjects.Graphics;
  private eyeTarget = new Phaser.Math.Vector2(LOGICAL_W / 2, LOGICAL_H / 2);
  private gazeTarget = new Phaser.Math.Vector2(LOGICAL_W / 2, LOGICAL_H / 2);
  private eyeOffset = new Phaser.Math.Vector2(0, 0);
  private lastEyeInputAt = 0;
  private eyesDrawn = false;
  private gazeUntil = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? 'easy';
    this.resetDifficultyProgression();
    // A fresh start (menu or Try Again) resets the whole run.
    this.score = 0;
    this.hintsLeft = HINTS_PER_RUN;
    this.streak = 0;
    this.flowersGrown = 0;
    this.grownFlowers = [];
    this.prevSecret = '';
    this.cells = [];
    this.keyObjs = {};
    this.letterKeys = {};
  }

  create(): void {
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.ensureSpark();
    this.cameras.main.setBounds(0, 0, LOGICAL_W, LOGICAL_H);
    startBirdAmbience(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { stopBirdAmbience(); stopFlowerDead(); stopCharge(); });

    drawGarden(this, false);
    addClouds(this);
    addButterflies(this);
    this.flowerLayer = this.add.container(0, 0);

    this.hud = new Hud(this, {
      maxGuesses: ROWS,
      onDone: () => this.scene.start('MainMenuScene', { mode: this.mode }),
    });

    this.buildScoreUi();
    this.buildBottomPanel();
    this.buildHelpUi();
    this.buildBoard();
    this.buildDinoAndChat();
    this.buildKeyboard();

    this.input.on('pointermove', this.trackDinoEyes, this);
    this.input.on('pointerdown', this.trackDinoEyes, this);

    bindWordInput(this, {
      onLetter: (ch) => this.onLetter(ch),
      onEnter: () => this.onEnter(),
      onDelete: () => this.onDelete(),
    });

    this.startWord(true);
    this.playIntro(() => this.showRulesPopup());
  }

  update(_time: number, delta: number): void {
    this.updateDinoEyes(delta);
  }

  private trackDinoEyes(pointer: Phaser.Input.Pointer): void {
    this.eyeTarget.set(pointer.x, pointer.y);
    this.lastEyeInputAt = this.time.now;
  }

  // Sequential intro: each group pops in only after the previous group finishes.
  // 1) HUD  2) board  3) dino + chat  4) keyboard + corner buttons. Input stays
  // blocked (busy) until the keyboard is ready.
  private playIntro(onComplete?: () => void): void {
    if (this.reduceMotion) {
      onComplete?.();
      return;
    }
    this.busy = true;
    [this.boardLayer, this.dinoLayer, this.helpLayer, this.chatLayer, this.bottomPanelLayer, this.kbLayer].forEach((c) => c.setAlpha(0));
    this.hud.hideCorners();

    // Order: 1) tries/score HUD  2) board  3) dino  4) Dino Hint + eggs
    // 5) chat bubble  6) keyboard + corner buttons. Same pop-in style throughout.
    const stages: { run: () => void; dur: number }[] = [
      { run: () => { playButtonShow(this); this.hud.introHud(); this.popIn(this.scoreLayer, 0.6, 0); }, dur: 540 },
      { run: () => { this.popIn(this.boardLayer, 0.6, 0); }, dur: 340 },
      { run: () => { this.popIn(this.dinoLayer, 0.7, 0); }, dur: 340 },
      { run: () => { playButtonShow(this); this.popIn(this.helpLayer, 0.6, 0); }, dur: 320 },
      { run: () => { this.popIn(this.chatLayer, 0.6, 0); }, dur: 320 },
      { run: () => { playButtonShow(this); this.popIn(this.bottomPanelLayer, 0.8, 0); this.popIn(this.kbLayer, 0.8, 60); this.hud.introCorners(); }, dur: 380 },
    ];
    let i = 0;
    const next = () => {
      if (i >= stages.length) { this.busy = false; onComplete?.(); return; }
      const stage = stages[i++];
      stage.run();
      this.time.delayedCall(stage.dur, next);
    };
    next();
  }

  private showRulesPopup(): void {
    this.busy = true;
    playPopup(this);
    const scrim = this.add
      .rectangle(0, 0, LOGICAL_W, LOGICAL_H, 0x000000, 0.34)
      .setOrigin(0)
      .setInteractive()
      .setDepth(70);
    const layer = this.add.container(LOGICAL_W / 2, LOGICAL_H / 2).setDepth(71);
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.16);
    panel.fillRoundedRect(-242, -173, 496, 366, 28);
    panel.fillStyle(Palette.paper, 1);
    panel.lineStyle(6, Palette.ctaPrimary, 1);
    panel.fillRoundedRect(-250, -183, 500, 366, 28);
    panel.strokeRoundedRect(-250, -183, 500, 366, 28);
    layer.add(panel);

    const title = addShadowText(this, 0, -122, 'HOW TO PLAY', {
      fontFamily: FONT,
      fontSize: '30px',
      fontStyle: 'bold',
      color: Hex.orange,
    }, { shadowColor: '#000000', shadowAlpha: 0.55, offsetX: 2, offsetY: 2 });
    const intro = addShadowText(this, 0, -78, 'Guess the 5-letter word!', {
      fontFamily: FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: Hex.ink,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1.5, offsetY: 1.5 });
    layer.add([title.container, intro.container]);

    const legend: [number, Score, string][] = [
      [-28, 'correct', 'Pink = right spot'],
      [12, 'present', 'Yellow = wrong spot'],
      [52, 'absent', 'Brown = not here'],
    ];
    legend.forEach(([y, state, label]) => {
      const g = this.add.graphics();
      paintTile(g, -122, y, 28, state);
      const text = addShadowText(this, -98, y, label, {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: Hex.ink,
      }, { origin: [0, 0.5], shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
      layer.add([g, text.container]);
    });

    const outro = addShadowText(this, 0, 96, 'Solve words to score points!', {
      fontFamily: FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: Hex.teal,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1.5, offsetY: 1.5 });
    const btn = makeImageButton(this, 0, 146, 'btnContinue', 'btnContinueActive', () => this.closeRulesPopup(layer, scrim, btn), 44);
    layer.add([outro.container, btn]);

    if (this.reduceMotion) return;
    this.popIn(layer, 0.55, 0, 320);
    scrim.setAlpha(0);
    this.tweens.add({ targets: scrim, alpha: 1, duration: 180 });
  }

  private closeRulesPopup(
    layer: Phaser.GameObjects.Container,
    scrim: Phaser.GameObjects.Rectangle,
    btn: Phaser.GameObjects.Image,
  ): void {
    btn.disableInteractive();
    const finish = () => {
      layer.destroy();
      scrim.destroy();
      this.busy = false;
    };
    if (this.reduceMotion) { finish(); return; }
    this.tweens.add({ targets: layer, y: layer.y + 18, scale: 0, alpha: 0, duration: 220, ease: 'Back.in', onComplete: finish });
    this.tweens.add({ targets: scrim, alpha: 0, duration: 200 });
  }

  // One-time tiny white dot used by the particle bursts.
  private ensureSpark(): void {
    if (this.textures.exists('spark')) return;
    const gg = this.add.graphics();
    gg.fillStyle(0xffffff, 1).fillCircle(5, 5, 5);
    gg.generateTexture('spark', 10, 10);
    gg.destroy();
  }

  // ---- static UI ----------------------------------------------------------

  private buildScoreUi(): void {
    // Top-right corner: large SCORE with a smaller HIGH best underneath — display
    // text, not a button. Right-aligned so the numbers grow toward screen center.
    this.scoreLayer = this.add.container(LOGICAL_W - 18, 16);
    this.scoreText = addShadowText(this, 0, 0, 'SCORE: 0', {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: Hex.orange,
      }, { origin: [1, 0], shadowColor: '#000000', shadowAlpha: 0.78, offsetX: 2, offsetY: 2 });
    this.bestText = addShadowText(this, 0, 33, `HIGH: ${getHighScore()}`, {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: Hex.gold,
      }, { origin: [1, 0], shadowColor: '#000000', shadowAlpha: 0.7, offsetX: 1.5, offsetY: 1.5 });
    this.scoreLayer.add([this.scoreText.container, this.bestText.container]);
  }

  private setScore(n: number): void {
    const old = this.score;
    const gained = n > this.score;
    const prevBest = getHighScore();
    this.score = n;
    if (gained && !this.reduceMotion) this.animateScoreCount(old, n);
    else this.scoreText.setText(`SCORE: ${n}`);
    const best = reportScore(n);
    this.bestText.setText(`HIGH: ${best}`);
    if (gained) this.bumpScoreText();
    if (gained && best > prevBest && !this.reduceMotion) this.newBestCelebrate();
  }

  // Juice: a gold sparkle + extra pop on HIGH when a brand-new best is reached.
  private newBestCelebrate(): void {
    this.tweens.killTweensOf(this.bestText.container);
    this.bestText.container.setScale(1);
    this.tweens.add({ targets: this.bestText.container, scale: { from: 1.45, to: 1 }, duration: 360, ease: 'Back.out' });
    this.burst(LOGICAL_W - 70, 52, { tints: [Palette.sun, Palette.white, Palette.yellow], count: 12, speed: [40, 120], lifespan: 600, depth: 62 });
  }

  // Juice: revealed tiles do a happy staggered bounce on a strong (2+ useful) guess.
  private rowSuccessBounce(row: number): void {
    if (this.reduceMotion) return;
    this.cells[row].forEach((cell, c) => {
      this.tweens.killTweensOf(cell.container);
      cell.container.setScale(1).setAngle(0).setRotation(0).setPosition(cell.lx, cell.ly);
      this.tweens.add({
        targets: cell.container,
        scale: { from: 1, to: 1.16 },
        yoyo: true,
        duration: 120,
        delay: c * 45,
        ease: 'Quad.out',
        onComplete: () => cell.container.setScale(1).setAngle(0).setRotation(0).setPosition(cell.lx, cell.ly),
      });
    });
  }

  private animateScoreCount(from: number, to: number): void {
    const counter = { value: from };
    this.tweens.add({
      targets: counter,
      value: to,
      duration: 460,
      ease: 'Quad.out',
      onUpdate: () => this.scoreText.setText(`SCORE: ${Math.round(counter.value)}`),
      onComplete: () => this.scoreText.setText(`SCORE: ${to}`),
    });
  }

  private bumpScoreText(): void {
    if (this.reduceMotion) return;
    this.tweens.killTweensOf(this.scoreLayer);
    this.scoreLayer.setScale(1);
    this.tweens.add({
      targets: this.scoreLayer,
      scale: { from: 1.18, to: 1 },
      duration: 280,
      ease: 'Back.out',
    });
  }

  private buildHelpUi(): void {
    // Centered cluster: the DINO HINT button on the left, the 5 eggs to its right.
    this.helpLayer = this.add.container(HELP_X, HELP_Y);
    const button = this.buildHintButton(-70, 0);
    this.helpEggs = this.add.graphics();
    this.helpLayer.add([button, this.helpEggs]);
    this.drawHelpMeter();
  }

  private buildBottomPanel(): void {
    // The brown backing panel behind the keyboard/Dino Hint was removed; the layer
    // is kept (empty) so the intro and loss-transition sequences still reference it.
    this.bottomPanelLayer = this.add.container(0, 0);
  }

  private drawHelpMeter(): void {
    const g = this.helpEggs;
    g.clear();
    for (let i = 0; i < HINTS_PER_RUN; i++) {
      const x = 30 + i * 27;
      const full = i < this.hintsLeft;
      drawEgg(g, x, 0, full);
    }
    // Plural when 2+ hints remain, singular at 1 or 0 (the 0 state keeps its
    // existing "no hints" behavior on press).
    this.hintLabel?.setText(this.hintsLeft >= 2 ? 'DINO HINTS' : 'DINO HINT');
  }

  private buildHintButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 154;
    const h = 42;
    const hit = this.add.zone(0, 0, w, h).setOrigin(0.5);
    const g = this.add.graphics();
    const txt = addShadowText(this, 0, 0, 'DINO HINTS', {
      fontFamily: FONT,
      fontSize: '17px',
      fontStyle: 'bold',
      color: Hex.white,
    }, { shadowColor: '#000000', shadowAlpha: 0.76, offsetX: 2, offsetY: 2 });
    this.hintLabel = txt; // text origin is centered, so the label stays centered in the fixed-width pill
    container.add([hit, g, txt.container]);
    let hover = false;
    let pressed = false;
    const redraw = () => {
      g.clear();
      const fill = pressed ? 0x216b6a : hover ? 0x37a3a1 : Palette.ctaPrimary;
      const off = pressed ? 2 : 0;
      g.fillStyle(fill, 1);
      g.lineStyle(4, 0x1b5654, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + off, w, h, h / 2);
      g.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, h / 2);
      txt.setY(off);
    };
    redraw();
    this.helpHit = hit;
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { hover = true; redraw(); });
    hit.on('pointerout', () => { hover = false; pressed = false; redraw(); });
    hit.on('pointerdown', () => { pressed = true; redraw(); });
    hit.on('pointerup', () => { pressed = false; redraw(); this.useHint(); });
    return container;
  }

  private buildBoard(): void {
    this.boardLayer = this.add.container(BOARD_CX, BOARD_CY);
    const halfW = 2 * STEP_X + CELL / 2 + 13;
    const halfH = 2.5 * STEP_Y + CELL / 2 + 13;
    const bed = this.add.graphics();
    bed.fillStyle(0x7a5a40, 1);
    bed.lineStyle(6, 0x5a4230, 1);
    bed.fillRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 20);
    bed.strokeRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 20);
    this.boardLayer.add(bed);

    for (let r = 0; r < ROWS; r++) {
      this.cells[r] = [];
      for (let c = 0; c < COLS; c++) {
        const lx = (c - 2) * STEP_X;
        const ly = (r - 2.5) * STEP_Y;
        const bg = this.add.graphics();
        const icon = this.add.graphics();
        const txt = addShadowText(this, 0, 0, '', {
          fontFamily: FONT,
          fontSize: '27px',
          fontStyle: 'bold',
          color: Hex.ink,
        }, { shadowColor: Hex.cream, shadowAlpha: 0.85, offsetX: 1, offsetY: 2 });
        const container = this.add.container(lx, ly, [bg, icon, txt.container]);
        this.boardLayer.add(container);
        const cell: Cell = { container, bg, icon, txt, lx, ly };
        this.cells[r][c] = cell;
        this.paintCell(cell, 'empty', '');
      }
    }
  }

  private buildDinoAndChat(): void {
    this.dinoLayer = this.add.container(DINO_X, DINO_Y);
    this.dino = this.add.image(0, 0, 'dinoIdle').setOrigin(0.5);
    this.eyePupils = this.add.graphics();
    this.dinoLayer.add([this.dino, this.eyePupils]);
    this.setDino('dinoIdle');
    // No idle vertical bob — the dino stays still unless a gameplay animation moves it.

    this.chatLayer = this.add.container(CHAT_X, CHAT_Y);
    this.bubble = this.add.graphics();
    this.chatText = addShadowText(this, 4, 0, '', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: Hex.ink,
        align: 'center',
        wordWrap: { width: 214 },
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
    this.chatLayer.add([this.bubble, this.chatText.container]);
    this.redrawBubble(false);
  }

  private redrawBubble(emph: boolean): void {
    const g = this.bubble;
    g.clear();
    const fill = Palette.white;
    // tail points down toward the dino below; drawn first so the body covers its base
    g.fillStyle(Palette.ink, 1);
    g.fillTriangle(-23, 32, 12, 32, -7, 76);
    g.fillStyle(fill, 1);
    g.fillTriangle(-20, 34, 8, 34, -7, 70);
    g.fillRoundedRect(-122, -47, 243, 94, 14);
    g.lineStyle(emph ? 6 : 5, Palette.ink, 1);
    g.strokeRoundedRect(-122, -47, 243, 94, 14);
  }

  private buildKeyboard(): void {
    this.kbLayer = this.add.container(KEYBOARD_CX, KEYBOARD_CY);
    const rows: { label: string; w: number }[][] = [
      'QWERTYUIOP'.split('').map((l) => ({ label: l, w: KEY_W })),
      'ASDFGHJKL'.split('').map((l) => ({ label: l, w: KEY_W })),
      [
        { label: 'ENTER', w: KEY_WIDE },
        ...'ZXCVBNM'.split('').map((l) => ({ label: l, w: KEY_W })),
        { label: 'DEL', w: KEY_WIDE },
      ],
    ];
    const rowY = [-KEY_ROW_DY, 0, KEY_ROW_DY];
    rows.forEach((items, r) => this.layoutKeyRow(items, rowY[r]));
  }

  private layoutKeyRow(items: { label: string; w: number }[], ly: number): void {
    const total = items.reduce((s, it) => s + it.w, 0) + KEY_GAP * (items.length - 1);
    let x = -total / 2;
    for (const it of items) {
      this.makeKey(x + it.w / 2, ly, it.w, KEY_H, it.label);
      x += it.w + KEY_GAP;
    }
  }

  private makeKey(lx: number, ly: number, w: number, h: number, label: string): void {
    const isLetter = label.length === 1;
    const container = this.add.container(lx, ly);
    // Hit zone is a touch larger than the key so the gaps stay tappable.
    const hit = this.add.zone(lx, ly, w + KEY_GAP, h + 4).setOrigin(0.5);
    const g = this.add.graphics();
    const txt = addShadowText(this, 0, 0, label, {
      fontFamily: FONT,
      fontSize: isLetter ? '16px' : '12px',
      fontStyle: 'bold',
      color: Hex.ink,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.84, offsetX: 1, offsetY: 1.5 });
    container.add([g, txt.container]);
    this.kbLayer.add([hit, container]);

    let pressed = false;
    let hover = false;
    let fallen = false;
    let state: LetterState = 'unknown';
    const resetRestTransform = () => {
      this.tweens.killTweensOf([container, g, txt.container, txt.text, txt.shadow]);
      container.setPosition(lx, ly).setScale(1).setAngle(0).setRotation(0).setAlpha(1);
      g.setPosition(0, 0).setScale(1).setAngle(0).setRotation(0).setAlpha(1);
      txt.container.setPosition(0, pressed ? 2 : 0).setScale(1).setAngle(0).setRotation(0).setAlpha(1);
      txt.text.setAngle(0).setRotation(0).setScale(1).setAlpha(1);
      txt.shadow.setAngle(0).setRotation(0).setScale(1);
    };
    const redraw = () => {
      g.clear();
      const k = keyColor(state, hover);
      const off = pressed ? 2 : 0;
      g.fillStyle(k.fill, 1);
      g.lineStyle(2.5, k.stroke, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + off, w, h, 8);
      g.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, 8);
      txt.setColor(k.text);
      txt.setShadowColor(k.text === Hex.white ? '#000000' : Hex.cream, k.text === Hex.white ? 0.78 : 0.84);
      txt.setY(off);
    };
    redraw();

    hit.setInteractive({ useHandCursor: true });

    const press = () => {
      if (fallen) return;
      if (label === 'ENTER') this.onEnter();
      else if (label === 'DEL') this.onDelete();
      else this.onLetter(label);
    };
    hit.on('pointerover', () => { if (!fallen) { hover = true; redraw(); } });
    hit.on('pointerout', () => { hover = false; pressed = false; redraw(); });
    hit.on('pointerdown', () => { if (!fallen) { pressed = true; redraw(); } });
    hit.on('pointerup', () => { pressed = false; redraw(); press(); });

    const keyObj: KeyObj = {
      container,
      hit,
      baseX: lx,
      baseY: ly,
      setState: (s) => {
        state = s;
        if (fallen && s !== 'absent') {
          fallen = false;
          hit.setVisible(true).setInteractive({ useHandCursor: true });
          container.setVisible(true);
        }
        if (!fallen) resetRestTransform();
        redraw();
      },
      pulse: () => {
        if (fallen || this.reduceMotion) return;
        resetRestTransform();
        this.tweens.add({
          targets: container,
          scale: { from: 1.12, to: 1 },
          angle: { from: 0, to: 0 },
          duration: 170,
          ease: 'Back.out',
          onComplete: resetRestTransform,
        });
      },
      fall: () => {
        if (fallen) return;
        this.tweens.killTweensOf(container);
        fallen = true;
        hit.disableInteractive().setVisible(false);
        if (this.reduceMotion) { container.setVisible(false); return; }
        this.tweens.add({
          targets: container,
          y: ly + 320,
          angle: Phaser.Math.Between(140, 360),
          duration: 620,
          ease: 'Quad.in',
          onComplete: () => container.setVisible(false),
        });
      },
      reset: () => {
        fallen = false;
        state = 'unknown';
        hover = false;
        pressed = false;
        hit.setVisible(true).setPosition(lx, ly).setInteractive({ useHandCursor: true });
        container.setVisible(true);
        resetRestTransform();
        redraw();
      },
    };
    this.keyObjs[label] = keyObj;
    if (isLetter) this.letterKeys[label] = keyObj;
  }

  // ---- per-word lifecycle -------------------------------------------------

  private startWord(first: boolean, staged = false): void {
    this.secret = this.pickSecret();
    this.prevSecret = this.secret;
    this.row = 0;
    this.current = '';
    this.guessesMade = 0;
    this.busy = false;
    this.over = false;
    this.letterStates = {};
    this.guessedLetters = new Set();
    this.submittedGuesses = new Set();
    this.solvedPos = [false, false, false, false, false];
    this.usedHints = new Set();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r][c];
        cell.container.setScale(1).setAngle(0).setPosition(cell.lx, cell.ly);
        this.paintCell(cell, 'empty', '');
      }
    }
    Object.values(this.keyObjs).forEach((k) => k.reset());
    // When staged, the intro animation reveals everything, so skip the per-word pops.
    if (!first && !staged) this.hud.resetBalls();
    this.emotionTimer?.remove(false);
    this.emotionTimer = undefined;
    this.setDino('dinoIdle');

    if (!first && !staged) this.popIn(this.boardLayer, 0.9, 0, 240);
    this.renderCurrentRow();
    this.say(first ? 'Plant a 5-letter word and press ENTER!' : 'Fresh word! Keep your garden growing!');
  }

  private resetGameplayUiForIntro(): void {
    this.tweens.killTweensOf([
      this.boardLayer,
      this.bottomPanelLayer,
      this.kbLayer,
      this.dinoLayer,
      this.chatLayer,
      this.scoreLayer,
      this.helpLayer,
    ]);
    this.boardLayer.setPosition(BOARD_CX, BOARD_CY).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.bottomPanelLayer.setPosition(0, 0).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.kbLayer.setPosition(KEYBOARD_CX, KEYBOARD_CY).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.dinoLayer.setPosition(DINO_X, DINO_Y).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.chatLayer.setPosition(CHAT_X, CHAT_Y).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.scoreLayer.setPosition(LOGICAL_W - 18, 16).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.helpLayer.setPosition(HELP_X, HELP_Y).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.helpHit.setVisible(true).setInteractive({ useHandCursor: true });
  }

  private pickSecret(): string {
    const pool = this.mode === 'easy' ? EASY_WORDS : this.mode === 'medium' ? MEDIUM_WORDS : HARD_WORDS;
    // Every secret must also be a valid guess (it lives in 5letter_clean).
    const words = pool.filter((w) => VALID_GUESSES.has(w));
    const fallback = this.mode === 'easy' ? FALLBACK_EASY : this.mode === 'medium' ? FALLBACK_MEDIUM : FALLBACK_HARD;
    const list = words.length ? words : fallback;
    let pick = Phaser.Math.RND.pick(list);
    if (list.length > 1) {
      let guard = 0;
      while (pick === this.prevSecret && guard++ < 10) pick = Phaser.Math.RND.pick(list);
    }
    return pick;
  }

  // ---- auto difficulty progression ----------------------------------------

  // Score gates depend on the difficulty the run STARTED on:
  //   easy   -> Medium at 300, Hard at 600
  //   medium -> Hard at 300
  //   hard   -> none
  private resetDifficultyProgression(): void {
    this.startMode = this.mode;
    this.pendingTransitions =
      this.startMode === 'easy'
        ? [{ score: 300, mode: 'medium' }, { score: 600, mode: 'hard' }]
        : this.startMode === 'medium'
          ? [{ score: 300, mode: 'hard' }]
          : [];
  }

  // If the new score crosses the next pending gate, consume it (once), switch the
  // mode for upcoming words, and return the new mode so a popup can be shown.
  private takeDifficultyTransition(): Mode | null {
    const next = this.pendingTransitions[0];
    if (next && this.score >= next.score) {
      this.pendingTransitions.shift();
      this.mode = next.mode;
      return next.mode;
    }
    return null;
  }

  // ---- input --------------------------------------------------------------

  private onLetter(ch: string): void {
    if (this.busy || this.over || this.current.length >= COLS) return;
    this.current += ch;
    playText(this);
    this.renderCurrentRow();
    const col = this.current.length - 1;
    this.glanceAtCurrentTile(col, 620);
    this.animateTypedTile(col);
    this.keyObjs[ch]?.pulse();
    if (this.current.length === COLS) this.keyObjs.ENTER?.pulse(); // word ready — invite ENTER
  }

  private onDelete(): void {
    if (this.busy || this.over || this.current.length === 0) return;
    this.current = this.current.slice(0, -1);
    this.renderCurrentRow();
  }

  private onEnter(): void {
    if (this.busy || this.over) return;
    if (this.current.length !== COLS) {
      this.say(Phaser.Math.RND.pick(TOO_SHORT));
      this.shakeRow(this.row);
      return;
    }
    const guess = this.current.toUpperCase();
    if (!/^[A-Z]{5}$/.test(guess) || !VALID_GUESSES.has(guess)) {
      this.say(INVALID_WORD);
      return;
    }
    if (this.submittedGuesses.has(guess)) {
      this.say(REPEAT_GUESS);
      this.setEmotion('dinoHint', 1100);
      return;
    }
    this.glanceAtCurrentTile(COLS - 1, 520);
    this.submitGuess();
  }

  private renderCurrentRow(): void {
    for (let c = 0; c < COLS; c++) {
      const cell = this.cells[this.row][c];
      if (c < this.current.length) this.paintCell(cell, 'typing', this.current[c]);
      else this.paintCell(cell, 'active', '');
    }
  }

  private glanceAtCurrentTile(col: number, holdMs: number): void {
    const cell = this.cells[this.row]?.[Phaser.Math.Clamp(col, 0, COLS - 1)];
    if (!cell) return;
    this.gazeTarget.set(this.boardLayer.x + cell.lx, this.boardLayer.y + cell.ly);
    this.gazeUntil = this.time.now + holdMs;
  }

  private animateTypedTile(col: number): void {
    if (this.reduceMotion) return;
    const cell = this.cells[this.row]?.[col];
    if (!cell) return;
    this.tweens.killTweensOf(cell.container);
    cell.container.setScale(0.92).setY(cell.ly + 4);
    this.tweens.add({
      targets: cell.container,
      scale: 1,
      y: cell.ly,
      duration: 190,
      ease: 'Back.out',
    });
  }

  // ---- guessing -----------------------------------------------------------

  private submitGuess(): void {
    const guess = this.current.toUpperCase();
    this.submittedGuesses.add(guess);
    const score = scoreGuess(this.secret, guess);
    this.guessesMade += 1;
    this.busy = true;
    for (const ch of guess) this.guessedLetters.add(ch);

    // juice for committing a full guess
    this.shake(140, 0.004);

    const stepMs = this.reduceMotion ? 0 : 150;
    for (let c = 0; c < COLS; c++) {
      this.time.delayedCall(c * stepMs, () => {
        const cell = this.cells[this.row][c];
        this.paintCell(cell, score[c], guess[c]);
        this.animateReveal(cell, score[c]);
        if (!this.reduceMotion) playLetterHit(this); // one tick per tile, left-to-right
        if (score[c] === 'correct') this.solvedPos[c] = true;
        this.bumpLetterState(guess[c], score[c]);
      });
    }

    const finishAt = COLS * stepMs + (this.reduceMotion ? 0 : 340);
    this.time.delayedCall(finishAt, () => this.afterReveal(guess, score));
  }

  private afterReveal(guess: string, score: Score[]): void {
    this.hud.setGuessesLeft(ROWS - this.guessesMade);

    if (guess === this.secret) {
      this.winWord();
      return;
    }
    if (this.guessesMade >= ROWS) {
      this.reactLose();
      this.beginLossSequence();
      return;
    }

    const useful = score.filter((s) => s !== 'absent').length;
    if (useful >= 2) {
      this.say(Phaser.Math.RND.pick(BIG_CHEERS), true);
      this.reactCheer();
      this.leafSparkle();
      this.rowSuccessBounce(this.row);
    } else if (useful === 1) {
      this.say(Phaser.Math.RND.pick(SMALL_CHEERS));
      this.reactGood();
    } else {
      this.say(Phaser.Math.RND.pick(WHIFFS));
      this.reactBad();
    }

    this.row += 1;
    this.current = '';
    this.renderCurrentRow();
    this.busy = false;
  }

  private bumpLetterState(letter: string, score: Score): void {
    const rank: Record<LetterState, number> = { unknown: 0, absent: 1, present: 2, correct: 3 };
    const cur = this.letterStates[letter] ?? 'unknown';
    if (rank[score] > rank[cur]) {
      this.letterStates[letter] = score;
      const k = this.letterKeys[letter];
      k?.setState(score);
      if (score === 'absent') k?.fall();
    }
  }

  // ---- feedback / juice ---------------------------------------------------

  private paintCell(cell: Cell, state: TileState, letter: string): void {
    cell.bg.clear();
    cell.icon.clear();
    paintTile(cell.bg, 0, 0, CELL, state);
    cell.txt.setText(letter);
    cell.txt.setColor(state === 'correct' ? Hex.white : state === 'absent' ? '#C9BBA8' : Hex.ink);
    cell.txt.setShadowColor(state === 'correct' || state === 'absent' ? '#000000' : Hex.cream, state === 'correct' || state === 'absent' ? 0.78 : 0.86);
  }

  private animateReveal(cell: Cell, score: Score): void {
    if (this.reduceMotion) return;
    this.tweens.killTweensOf(cell.container);
    cell.container.setAngle(0).setRotation(0);
    if (score === 'correct') {
      cell.container.setScale(0.6);
      this.tweens.add({ targets: cell.container, scale: 1, duration: 320, ease: 'Back.out' });
      this.petalBurst(this.boardLayer.x + cell.lx, this.boardLayer.y + cell.ly, 8);
      this.shake(90, 0.0016); // very mild bump per correct letter
    } else if (score === 'present') {
      this.tweens.add({
        targets: cell.container,
        angle: { from: -8, to: 8 },
        duration: 90,
        yoyo: true,
        repeat: 2,
        onComplete: () => cell.container.setAngle(0).setRotation(0),
      });
    } else {
      this.tweens.add({
        targets: cell.container,
        scaleY: 0.78,
        y: cell.ly + 4,
        duration: 120,
        yoyo: true,
        ease: 'Quad.inOut',
      });
    }
  }

  // pink flower-petal burst that pops out from a tile then falls with gravity
  private petalBurst(wx: number, wy: number, count: number): void {
    if (this.reduceMotion) return;
    const colors = [Palette.pinkBright, 0xffa6cd, Palette.yellow, 0xff85b3];
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(wx, wy, Phaser.Math.Between(3, 5), Phaser.Math.RND.pick(colors)).setDepth(40);
      const ang = Phaser.Math.FloatBetween(-Math.PI, 0);
      const dist = Phaser.Math.Between(20, 52);
      const ox = wx + Math.cos(ang) * dist;
      const oy = wy + Math.sin(ang) * dist * 0.8;
      this.tweens.add({
        targets: p,
        x: ox,
        y: oy,
        duration: 200,
        ease: 'Quad.out',
        onComplete: () => {
          this.tweens.add({
            targets: p,
            y: LOGICAL_H + 20,
            x: ox + Phaser.Math.Between(-30, 30),
            angle: Phaser.Math.Between(-180, 180),
            alpha: 0,
            duration: Phaser.Math.Between(700, 1100),
            ease: 'Quad.in',
            onComplete: () => p.destroy(),
          });
        },
      });
    }
  }

  private leafSparkle(): void {
    if (this.reduceMotion) return;
    const wx = this.boardLayer.x;
    const wy = this.boardLayer.y - 150;
    for (let i = 0; i < 5; i++) {
      const s = this.add
        .circle(wx + Phaser.Math.Between(-90, 90), wy + Phaser.Math.Between(-10, 10), 4, Palette.leafGreen)
        .setDepth(40);
      this.tweens.add({
        targets: s,
        y: s.y - Phaser.Math.Between(14, 30),
        alpha: 0,
        duration: 600,
        ease: 'Quad.out',
        onComplete: () => s.destroy(),
      });
    }
  }

  private shake(duration: number, intensity: number): void {
    if (this.reduceMotion) return;
    this.cameras.main.shake(duration, intensity);
  }

  // One-shot Phaser particle burst (pooled emitter, destroyed when finished).
  private burst(
    x: number,
    y: number,
    opts: { tints: number[]; count: number; speed: [number, number]; lifespan: number; gravityY?: number; depth?: number },
  ): void {
    if (this.reduceMotion) return;
    const emitter = this.add
      .particles(x, y, 'spark', {
        lifespan: opts.lifespan,
        speed: { min: opts.speed[0], max: opts.speed[1] },
        angle: { min: 0, max: 360 },
        gravityY: opts.gravityY ?? 0,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: opts.tints,
        emitting: false,
      })
      .setDepth(opts.depth ?? 40);
    emitter.explode(opts.count);
    this.time.delayedCall(opts.lifespan + 80, () => emitter.destroy());
  }

  private loseBurst(): void {
    this.burst(this.boardLayer.x, this.boardLayer.y, {
      tints: [Palette.leafGreen, Palette.mud, Palette.soil],
      count: 14,
      speed: [50, 140],
      lifespan: 620,
      gravityY: 200,
    });
  }

  private streakSparkle(x: number, y: number): void {
    this.burst(x, y, {
      tints: [Palette.yellow, Palette.white, Palette.pinkBright],
      count: 16,
      speed: [60, 160],
      lifespan: 600,
      depth: 61,
    });
  }

  private shakeRow(row: number): void {
    if (this.reduceMotion) return;
    for (const cell of this.cells[row]) {
      this.tweens.add({
        targets: cell.container,
        x: cell.lx + 6,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.inOut',
        onComplete: () => cell.container.setX(cell.lx),
      });
    }
  }

  private say(text: string, emph = false): void {
    this.redrawBubble(emph);
    this.chatText.setText(text);
    this.chatText.setFontSize(emph ? 17 : 15);
    this.chatText.setColor(Hex.ink);
    this.chatText.setShadowColor('#000000', emph ? 0.22 : 0.16);
    if (this.reduceMotion) {
      playDinoVoice(this);
      return;
    }
    const fromScale = emph ? 1.14 : 1.06;
    const duration = emph ? 260 : 180;
    this.tweens.add({
      targets: this.chatLayer,
      scale: { from: fromScale, to: 1 },
      duration,
      ease: 'Back.out',
      onComplete: () => playDinoVoice(this),
    });
  }

  private setDino(key: string): void {
    this.dino.setTexture(key);
    const pose = DINO_POSE_LAYOUTS[key] ?? DINO_POSE_LAYOUTS.dinoIdle;
    this.dino.setPosition(pose.x, pose.y);
    const h = pose.height;
    this.dino.setDisplaySize(h * (this.dino.width / this.dino.height), h);
    this.updateDinoEyes(1000);
  }

  private updateDinoEyes(delta: number): void {
    if (!this.eyePupils || !this.dino) return;
    const layout = EYE_LAYOUTS[this.dino.texture.key];
    if (!layout) {
      // Most poses have no tracked pupils — clear once instead of every frame.
      if (this.eyesDrawn) {
        this.eyePupils.clear();
        this.eyesDrawn = false;
      }
      this.eyeOffset.set(0, 0);
      return;
    }
    this.eyePupils.clear();
    this.eyesDrawn = true;

    const activeGaze = this.time.now < this.gazeUntil;
    const recentInput = this.lastEyeInputAt > 0 && this.time.now - this.lastEyeInputAt < 3500;
    let targetX = 0;
    let targetY = 0;
    if (activeGaze || recentInput) {
      const target = activeGaze ? this.gazeTarget : this.eyeTarget;
      const eyeCenterX = this.dinoLayer.x + (layout.left.x + layout.right.x) / 2;
      const eyeCenterY = this.dinoLayer.y + this.dino.y + (layout.left.y + layout.right.y) / 2;
      const dx = target.x - eyeCenterX;
      const dy = target.y - eyeCenterY;
      const len = Math.max(1, Math.hypot(dx, dy));
      const travel = Math.min(layout.range, len * 0.018);
      targetX = (dx / len) * travel;
      targetY = (dy / len) * travel;
    }

    const ease = Phaser.Math.Clamp(delta / 120, 0, 1);
    this.eyeOffset.x = Phaser.Math.Linear(this.eyeOffset.x, targetX, ease);
    this.eyeOffset.y = Phaser.Math.Linear(this.eyeOffset.y, targetY, ease);

    const x = this.eyeOffset.x;
    const y = this.dino.y + this.eyeOffset.y;
    this.eyePupils.fillStyle(Palette.ink, 1);
    this.eyePupils.fillCircle(layout.left.x + x, layout.left.y + y, layout.radius);
    this.eyePupils.fillCircle(layout.right.x + x, layout.right.y + y, layout.radius);
  }

  private bounceDino(): void {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: this.dinoLayer,
      scale: { from: 1, to: 1.08 },
      duration: 150,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  // Show an emotion and hold it long enough to read. holdMs <= 0 keeps the face
  // until something else changes it (used for win / lose). A new emotion safely
  // cancels the previous hold timer.
  private setEmotion(key: string, holdMs: number): void {
    this.emotionTimer?.remove(false);
    this.emotionTimer = undefined;
    this.setDino(key);
    this.bounceDino();
    if (holdMs > 0) {
      this.emotionTimer = this.time.delayedCall(holdMs, () => {
        if (!this.over) this.setDino('dinoIdle');
      });
    }
  }

  private reactCheer(): void {
    this.setEmotion('dinoExcited', 2400);
  }

  private reactGood(): void {
    this.setEmotion(Phaser.Math.RND.pick(['dinoEncourage', 'dinoProud']), 1800);
  }

  private reactBad(): void {
    this.setEmotion('dinoFace', 1800);
  }

  private reactLose(): void {
    this.setEmotion('dinoFace', 0);
  }

  // ---- hints --------------------------------------------------------------

  private useHint(): void {
    if (this.busy || this.over) return;
    if (this.hintsLeft <= 0) {
      this.say(Phaser.Math.RND.pick(NO_HINTS));
      this.setEmotion('dinoFace', 1200);
      this.shakeHelp();
      return;
    }
    const hint = this.buildHint();
    if (!hint) return;
    this.usedHints.add(hint);
    this.hintsLeft -= 1;
    this.drawHelpMeter();
    this.hintEggSparkle(this.hintsLeft);
    if (!this.reduceMotion) {
      this.tweens.add({ targets: this.helpLayer, scale: { from: 1.12, to: 1 }, duration: 220, ease: 'Back.out' });
    }
    this.say(hint);
    this.setEmotion('dinoHint', 1600);
  }

  // Choose the most useful hint that has not been used yet for this word.
  private buildHint(): string | null {
    const s = this.secret;
    const unique = [...new Set(s.split(''))];
    const candidates: string[] = [];

    // 1) reveal an unguessed secret letter (prefer one we have not hinted yet)
    const unguessed = unique.filter((l) => !this.guessedLetters.has(l));
    const freshLetters = unguessed.filter((l) => !this.usedHints.has(`Try the letter ${l}!`));
    const letterPool = freshLetters.length ? freshLetters : unguessed;
    if (letterPool.length) candidates.push(`Try the letter ${Phaser.Math.RND.pick(letterPool)}!`);

    // 2) position clue for an unsolved spot (vowel/consonant, no full reveal)
    const unsolved = [0, 1, 2, 3, 4].filter((i) => !this.solvedPos[i]);
    if (unsolved.length) {
      const i = Phaser.Math.RND.pick(unsolved);
      candidates.push(`Spot ${i + 1} is a ${VOWELS.includes(s[i]) ? 'vowel' : 'consonant'}!`);
    }

    // 3) vowel count
    const vc = s.split('').filter((c) => VOWELS.includes(c)).length;
    candidates.push(`This word has ${vc} ${vc === 1 ? 'vowel' : 'vowels'}!`);

    // 4) repeated letter
    candidates.push(unique.length < s.length ? 'This word has a repeated letter!' : 'No letters repeat in this word!');

    // 5) first / last letter
    if (!this.solvedPos[0]) candidates.push(`The word starts with ${s[0]}!`);
    else if (!this.solvedPos[4]) candidates.push(`The word ends with ${s[4]}!`);

    for (const c of candidates) if (!this.usedHints.has(c)) return c;
    return candidates[0] ?? null;
  }

  private shakeHelp(): void {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: this.helpLayer,
      x: this.helpLayer.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.inOut',
      onComplete: () => this.helpLayer.setX(HELP_X),
    });
  }

  private hintEggSparkle(index: number): void {
    if (this.reduceMotion || index < 0 || index >= HINTS_PER_RUN) return;
    const x = this.helpLayer.x + 30 + index * 27;
    const y = this.helpLayer.y;
    this.burst(x, y, {
      tints: [Palette.sun, Palette.white, Palette.orange],
      count: 10,
      speed: [24, 78],
      lifespan: 420,
      depth: 42,
    });
  }

  // ---- win (ongoing run) --------------------------------------------------

  private winWord(): void {
    this.busy = true;
    this.streak += 1;
    const base = (7 - this.guessesMade) * 10;
    const bonus = (this.streak - 1) * 5; // win-streak reward (additive — easy to remove)
    this.reactWinDino();
    this.say('YOU GOT IT!!', true);
    this.boardBounce();
    const flowerMs = this.growRewardFlower();
    this.winShower();
    const camMs = flowerMs + 180;
    this.focusCameraOnGarden(this.lastFlowerPos.x, this.lastFlowerPos.y, camMs);
    this.time.delayedCall(camMs + 120, () => {
      this.setScore(this.score + base + bonus);
      const advancedTo = this.takeDifficultyTransition();
      if (advancedTo) this.showDifficultyPopup(advancedTo);
      else this.showNextWordPopup(base, bonus);
    });
  }

  // Subtle camera push toward the garden/flower area, then ease back out. Used to
  // spotlight the flower growing on a win and wilting on a loss.
  private focusCameraOnGarden(x: number, y: number, totalMs: number): void {
    if (this.reduceMotion) return;
    const cam = this.cameras.main;
    const targetZoom = 1.12;
    const inDur = Math.min(480, Math.max(220, totalMs * 0.4));
    const outDur = Math.min(460, Math.max(220, totalMs * 0.4));
    const panX = LOGICAL_W / 2 + (x - LOGICAL_W / 2) * 0.55;
    const panY = LOGICAL_H / 2 + (y - LOGICAL_H / 2) * 0.55;
    const focus = this.clampCameraCenter(panX, panY, targetZoom);
    cam.pan(focus.x, focus.y, inDur, 'Sine.easeInOut');
    cam.zoomTo(targetZoom, inDur, 'Sine.easeInOut');
    this.time.delayedCall(Math.max(0, totalMs - outDur), () => {
      cam.pan(LOGICAL_W / 2, LOGICAL_H / 2, outDur, 'Sine.easeInOut');
      cam.zoomTo(1, outDur, 'Sine.easeInOut');
    });
  }

  private clampCameraCenter(x: number, y: number, zoom: number): { x: number; y: number } {
    const visibleW = LOGICAL_W / zoom;
    const visibleH = LOGICAL_H / zoom;
    return {
      x: Phaser.Math.Clamp(x, visibleW / 2, LOGICAL_W - visibleW / 2),
      y: Phaser.Math.Clamp(y, visibleH / 2, LOGICAL_H - visibleH / 2),
    };
  }

  private reactWinDino(): void {
    this.setEmotion('dinoCheer', 0); // hold the cheer until the next word starts
  }

  private boardBounce(): void {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: this.boardLayer,
      scale: { from: 1, to: 1.06 },
      duration: 200,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  private winShower(): void {
    if (this.reduceMotion) return;
    for (let i = 0; i < 5; i++) {
      this.petalBurst(160 + i * 130, 120, 7);
    }
  }

  private chooseFlowerX(): number {
    const existing = this.grownFlowers.map((flower) => flower.container.x);
    for (let i = 0; i < FLOWER_SPAWN_ATTEMPTS; i++) {
      const candidate = Phaser.Math.Between(FLOWER_MIN_X, FLOWER_MAX_X);
      if (this.isFlowerXOpen(candidate, existing)) return candidate;
    }

    for (const spot of FLOWER_SPOTS) {
      if (this.isFlowerXOpen(spot.x, existing)) return spot.x;
    }

    return FLOWER_SPOTS.reduce((best, spot) => (
      this.nearestFlowerDistance(spot.x, existing) > this.nearestFlowerDistance(best.x, existing) ? spot : best
    ), FLOWER_SPOTS[0]).x;
  }

  private isFlowerXOpen(x: number, existing: number[]): boolean {
    return existing.every((grownX) => Math.abs(grownX - x) >= FLOWER_MIN_SPACING_X);
  }

  private nearestFlowerDistance(x: number, existing: number[]): number {
    if (existing.length === 0) return Number.POSITIVE_INFINITY;
    return Math.min(...existing.map((grownX) => Math.abs(grownX - x)));
  }

  private growRewardFlower(): number {
    const type = FLOWER_TYPES[this.flowersGrown % FLOWER_TYPES.length];
    const x = this.chooseFlowerX();
    const y = hillSurfaceY(x) + FLOWER_PLANT_OFFSET_Y;
    this.lastFlowerPos = { x, y };
    this.flowersGrown += 1;

    const g = this.add.graphics();
    drawRewardFlower(g, type);
    const flower = this.add.container(x, y, [g]);
    this.flowerLayer.add(flower);
    this.grownFlowers.push({ container: flower, graphics: g, type });

    if (this.reduceMotion) return 220;
    playCharge(this); // whirr that rides the growth animation
    flower.setScale(0.02).setAlpha(0).setY(y + 42);
    this.tweens.add({
      targets: flower,
      y: y - 16,
      scale: 1.48,
      alpha: 1,
      duration: 720,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: flower,
          y,
          scale: 1.04,
          duration: 280,
          ease: 'Sine.out',
          onComplete: () => { stopCharge(); this.settleFlower(flower); },
        });
      },
    });
    this.time.delayedCall(170, () => this.sunnyFlowerPop(x, y));
    this.time.delayedCall(330, () => this.flowerPetalPop(x, y));
    return 1100;
  }

  private sunnyFlowerPop(x: number, y: number): void {
    if (this.reduceMotion) return;
    const ringG = this.add.graphics();
    ringG.lineStyle(5, Palette.sun, 0.85);
    ringG.strokeCircle(0, -30, 18);
    const ring = this.add.container(x, y, [ringG]);
    this.flowerLayer.add(ring);
    ring.setScale(0.25);
    this.tweens.add({
      targets: ring,
      scale: 2.35,
      alpha: 0,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
    this.burst(x, y - 30, {
      tints: [Palette.sun, Palette.white, Palette.orange],
      count: 18,
      speed: [40, 130],
      lifespan: 650,
      depth: 39,
    });
  }

  private flowerPetalPop(x: number, y: number): void {
    if (this.reduceMotion) return;
    const colors = [Palette.pinkBright, Palette.sun, Palette.lilac, Palette.orange, Palette.white];
    for (let i = 0; i < 20; i++) {
      const p = this.add
        .ellipse(x, y - 34, Phaser.Math.Between(5, 8), Phaser.Math.Between(3, 5), Phaser.Math.RND.pick(colors), 0.95)
        .setDepth(39)
        .setAngle(Phaser.Math.Between(0, 180));
      const a = Phaser.Math.FloatBetween(Math.PI * 1.05, Math.PI * 1.95);
      const dist = Phaser.Math.Between(30, 76);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * dist,
        y: y - 34 + Math.sin(a) * dist * 0.65,
        angle: p.angle + Phaser.Math.Between(70, 180),
        alpha: 0,
        duration: Phaser.Math.Between(700, 920),
        ease: 'Quad.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private wiltFlowers(): number {
    if (this.grownFlowers.length === 0) return 450;
    playFlowerDead(this); // sad sting; stopped when the death animation ends
    if (this.reduceMotion) {
      this.grownFlowers.forEach((flower) => {
        drawRewardFlower(flower.graphics, flower.type, 1);
        flower.container.setAlpha(0.45);
      });
      return 260;
    }

    this.grownFlowers.forEach((flower, i) => {
      const delay = i * 35;
      const shade = { value: 0 };
      this.tweens.add({
        targets: flower.container,
        scale: 1.22,
        duration: 230,
        delay,
        ease: 'Sine.out',
      });
      this.tweens.add({
        targets: shade,
        value: 1,
        duration: 680,
        delay: delay + 170,
        ease: 'Sine.inOut',
        onUpdate: () => drawRewardFlower(flower.graphics, flower.type, shade.value),
      });
      this.tweens.add({
        targets: flower.container,
        y: flower.container.y + 18,
        scale: 0.12,
        alpha: 0,
        duration: 340,
        delay: delay + 900,
        ease: 'Back.in',
      });
    });
    return 1320 + this.grownFlowers.length * 35;
  }

  private beginLossSequence(): void {
    this.busy = true;
    this.over = true;
    if (this.grownFlowers.length === 0) {
      this.time.delayedCall(420, () => this.showGameOver());
      return;
    }

    const hideMs = this.hideGameplayUiForLoss();
    this.time.delayedCall(hideMs, () => {
      const focus = this.getFlowerFocusPoint();
      const wiltMs = this.wiltFlowers();
      this.focusCameraOnGarden(focus.x, focus.y, wiltMs);
      this.time.delayedCall(wiltMs + 140, () => {
        stopFlowerDead(); // never let the death sting bleed into the lose screen
        this.showGameOver();
      });
    });
  }

  private getFlowerFocusPoint(): { x: number; y: number } {
    if (this.grownFlowers.length === 0) return this.lastFlowerPos;
    const totals = this.grownFlowers.reduce(
      (acc, flower) => ({ x: acc.x + flower.container.x, y: acc.y + flower.container.y }),
      { x: 0, y: 0 },
    );
    return {
      x: totals.x / this.grownFlowers.length,
      y: totals.y / this.grownFlowers.length,
    };
  }

  private hideGameplayUiForLoss(): number {
    Object.values(this.keyObjs).forEach((key) => key.hit.disableInteractive());
    this.disableContainerInput(this.helpLayer);

    if (this.reduceMotion) {
      [this.kbLayer, this.bottomPanelLayer, this.boardLayer, this.scoreLayer, this.helpLayer, this.chatLayer, this.dinoLayer].forEach((layer) => {
        layer.setAlpha(0);
      });
      this.hud.hideForLoss();
      return 120;
    }

    const layers = [this.kbLayer, this.bottomPanelLayer, this.boardLayer, this.scoreLayer, this.helpLayer, this.chatLayer, this.dinoLayer];
    layers.forEach((layer, i) => this.fadeLayerOut(layer, i * 90));
    const hudMs = this.hud.hideForLoss(160);
    return Math.max(hudMs, (layers.length - 1) * 90 + 310);
  }

  private fadeLayerOut(layer: Phaser.GameObjects.Container, delay: number): void {
    this.tweens.killTweensOf(layer);
    this.tweens.add({
      targets: layer,
      y: layer.y + 14,
      scale: 0.86,
      alpha: 0,
      duration: 260,
      delay,
      ease: 'Back.in',
    });
  }

  private disableContainerInput(container: Phaser.GameObjects.Container): void {
    container.each((child: Phaser.GameObjects.GameObject) => {
      const maybeInteractive = child as Phaser.GameObjects.GameObject & { disableInteractive?: () => void };
      maybeInteractive.disableInteractive?.();
      if (child instanceof Phaser.GameObjects.Container) this.disableContainerInput(child);
    });
  }

  private settleFlower(flower: Phaser.GameObjects.Container): void {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: flower,
      angle: { from: -3, to: 3 },
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.inOut',
      onComplete: () => flower.setAngle(0),
    });
  }

  private showNextWordPopup(base: number, bonus: number): void {
    playPopup(this);
    playTada(this); // win fanfare layered over the popup pop
    const scrim = this.add
      .rectangle(0, 0, LOGICAL_W, LOGICAL_H, Palette.purple, 0.28)
      .setOrigin(0)
      .setInteractive()
      .setDepth(59);
    const layer = this.add.container(LOGICAL_W / 2, 250).setDepth(60);
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.16); // soft drop shadow for depth
    panel.fillRoundedRect(-204, -142, 420, 300, 26);
    panel.fillStyle(Palette.paper, 1);
    panel.lineStyle(6, Palette.pinkDark, 1);
    panel.fillRoundedRect(-210, -150, 420, 300, 26);
    panel.strokeRoundedRect(-210, -150, 420, 300, 26);
    layer.add(panel);

    const line = (y: number, text: string, size: number, color: string, dark: boolean) =>
      layer.add(
        addShadowText(this, 0, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color }, {
          shadowColor: dark ? '#000000' : Hex.cream,
          shadowAlpha: dark ? 0.5 : 0.86,
          offsetX: dark ? 2 : 1.5,
          offsetY: dark ? 2 : 1.5,
        }).container,
      );

    line(-108, 'GREAT JOB!', 30, Hex.pink, true);
    line(-62, `+${base} points`, 26, Hex.ink, false);
    if (bonus > 0) line(-26, `Streak x${this.streak}   +${bonus}!`, 19, Hex.orange, true);
    line(bonus > 0 ? 8 : -4, `Score: ${this.score}`, 22, Hex.teal, false);
    line(46, 'Ready for the next word?', 17, Hex.ink, false);

    const btn = makeImageButton(this, 0, 104, 'btnContinue', 'btnContinueActive', () => this.continueFromPopup(layer, scrim, btn), 56);
    layer.add(btn);
    this.popIn(layer, 0, 0);
    if (bonus > 0) this.time.delayedCall(180, () => this.streakSparkle(LOGICAL_W / 2, 250 - 26));
  }

  // Shown when the run auto-advances difficulty (Easy->Medium->Hard). Same chassis
  // and Continue flow as the next-word popup, so the run keeps its score, high
  // score, flowers and remaining hints; only the next secret uses the new mode.
  private showDifficultyPopup(mode: Mode): void {
    playPopup(this);
    const label = mode === 'hard' ? 'Hard' : 'Medium';
    const scrim = this.add
      .rectangle(0, 0, LOGICAL_W, LOGICAL_H, Palette.purple, 0.28)
      .setOrigin(0)
      .setInteractive()
      .setDepth(59);
    const layer = this.add.container(LOGICAL_W / 2, 250).setDepth(60);
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.16); // soft drop shadow for depth
    panel.fillRoundedRect(-204, -132, 420, 280, 26);
    panel.fillStyle(Palette.paper, 1);
    panel.lineStyle(6, Palette.ctaPrimary, 1);
    panel.fillRoundedRect(-210, -140, 420, 280, 26);
    panel.strokeRoundedRect(-210, -140, 420, 280, 26);
    layer.add(panel);

    const line = (y: number, text: string, size: number, color: string, dark: boolean) =>
      layer.add(
        addShadowText(this, 0, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center' }, {
          shadowColor: dark ? '#000000' : Hex.cream,
          shadowAlpha: dark ? 0.5 : 0.86,
          offsetX: dark ? 2 : 1.5,
          offsetY: dark ? 2 : 1.5,
        }).container,
      );

    line(-92, 'Congratulations!', 30, Hex.pink, true);
    line(-30, "You're doing great, so now", 19, Hex.ink, false);
    line(0, `you're on ${label} mode!`, 19, Hex.ink, false);

    const btn = makeImageButton(this, 0, 96, 'btnContinue', 'btnContinueActive', () => this.continueFromPopup(layer, scrim, btn), 56);
    layer.add(btn);
    this.popIn(layer, 0, 0);
  }

  private continueFromPopup(
    layer: Phaser.GameObjects.Container,
    scrim: Phaser.GameObjects.Rectangle,
    btn: Phaser.GameObjects.Image,
  ): void {
    btn.disableInteractive(); // no double-advance while the transition plays
    this.busy = true;
    const finish = () => {
      layer.destroy();
      scrim.destroy();
      this.transitionToNextWord();
    };
    if (this.reduceMotion) { finish(); return; }
    this.tweens.add({ targets: layer, y: layer.y + 18, scale: 0, alpha: 0, duration: 220, ease: 'Back.in', onComplete: finish });
    this.tweens.add({ targets: scrim, alpha: 0, duration: 220 });
  }

  // After the win popup leaves, sweep the whole board/keyboard/dino off, swap in a
  // fresh word, then bring everything back with the normal staged intro. Run-level
  // values (score, high score, hints, grown flowers) are all preserved. Input stays
  // blocked until the intro finishes.
  private transitionToNextWord(): void {
    const hideMs = this.hideGameplayUiForLoss();
    this.time.delayedCall(hideMs, () => {
      this.hud.resetForIntro();
      this.resetGameplayUiForIntro();
      this.startWord(false, true);
      this.playIntro();
    });
  }

  // ---- loss ---------------------------------------------------------------

  private showGameOver(): void {
    this.over = true;
    this.busy = true;
    playPopup(this);
    const best = reportScore(this.score);
    this.shake(260, 0.006);
    this.loseBurst();

    const scrim = this.add.rectangle(0, 0, LOGICAL_W, LOGICAL_H, 0x000000, 0.45).setOrigin(0).setInteractive().setDepth(50);

    const signY = 196;
    const signLayer = this.add.container(LOGICAL_W / 2, -290).setDepth(52);
    const card = this.add.image(0, 0, 'cardOver');
    const cardW = 650;
    card.setDisplaySize(cardW, cardW / (card.width / card.height));
    const cover = this.add.graphics();
    cover.fillStyle(Palette.ink, 1);
    cover.fillRoundedRect(-282, -78, 564, 186, 18);
    const headline = addShadowText(this, 0, -40, 'GAME OVER', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: Hex.tomato,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 3, offsetY: 3 });
    const wordText = addShadowText(this, 0, 16, `The word was ${this.secret}`, {
        fontFamily: FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: Hex.cream,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 2, offsetY: 2 });
    const finalScore = addShadowText(this, 0, 52, `Final score: ${this.score}`, {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: Hex.sun,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 2, offsetY: 2 });
    const highScore = addShadowText(this, 0, 84, `High score: ${best}`, {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: Hex.gold,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 2, offsetY: 2 });
    signLayer.add([card, cover, headline.container, wordText.container, finalScore.container, highScore.container]);
    if (this.reduceMotion) {
      signLayer.setY(signY);
    } else {
      this.tweens.add({
        targets: signLayer,
        y: signY + 20,
        duration: 500,
        ease: 'Cubic.out',
        onComplete: () => {
          this.tweens.add({ targets: signLayer, y: signY, duration: 220, ease: 'Sine.out' });
        },
      });
    }

    const tryAgain = makeImageButton(
      this,
      LOGICAL_W / 2,
      462,
      'btnTryAgain',
      'btnTryAgainActive',
      () => this.closeGameOverAndRestart(signLayer, scrim, tryAgain),
      58,
    ).setDepth(52);
  }

  private closeGameOverAndRestart(
    signLayer: Phaser.GameObjects.Container,
    scrim: Phaser.GameObjects.Rectangle,
    tryAgain: Phaser.GameObjects.Image,
  ): void {
    tryAgain.disableInteractive();
    this.busy = true;
    if (this.reduceMotion) {
      this.restartRunAfterGameOver(signLayer, scrim, tryAgain);
      return;
    }

    this.tweens.add({
      targets: signLayer,
      y: -300,
      scale: 0.9,
      alpha: 0,
      duration: 320,
      ease: 'Back.in',
      onComplete: () => this.restartRunAfterGameOver(signLayer, scrim, tryAgain),
    });
    this.tweens.add({
      targets: tryAgain,
      y: tryAgain.y + 18,
      scale: 0,
      alpha: 0,
      duration: 220,
      ease: 'Back.in',
    });
    this.tweens.add({ targets: scrim, alpha: 0, duration: 260 });
  }

  private restartRunAfterGameOver(
    signLayer: Phaser.GameObjects.Container,
    scrim: Phaser.GameObjects.Rectangle,
    tryAgain: Phaser.GameObjects.Image,
  ): void {
    signLayer.destroy();
    scrim.destroy();
    tryAgain.destroy();
    const cam = this.cameras.main;
    cam.setZoom(1);
    cam.setScroll(0, 0);

    // A fresh run restarts on the originally-selected difficulty with fresh gates.
    this.mode = this.startMode;
    this.resetDifficultyProgression();
    this.score = 0;
    this.hintsLeft = HINTS_PER_RUN;
    this.streak = 0;
    this.flowersGrown = 0;
    this.lastFlowerPos = { x: LOGICAL_W / 2, y: 392 };
    this.grownFlowers = [];
    this.flowerLayer.removeAll(true);
    this.setScore(0);
    this.drawHelpMeter();
    this.hud.resetForIntro();
    this.resetGameplayUiForIntro();
    this.startWord(true);
    this.playIntro();
  }

  // ---- shared helpers -----------------------------------------------------

  private popIn(target: Phaser.GameObjects.Container, from = 0, delay = 0, duration = 340): void {
    const y = target.y;
    if (this.reduceMotion) {
      target.setScale(1).setAlpha(1).setY(y);
      return;
    }
    target.setScale(from).setAlpha(0).setY(y + 15);
    this.tweens.add({ targets: target, y, scale: 1, alpha: 1, ease: 'Back.out', duration, delay });
  }
}

// ---- pure draw helpers ------------------------------------------------------

function mixColor(from: number, to: number, amount: number): number {
  const a = Phaser.Display.Color.IntegerToColor(from);
  const b = Phaser.Display.Color.IntegerToColor(to);
  return Phaser.Display.Color.GetColor(
    Math.round(Phaser.Math.Linear(a.red, b.red, amount)),
    Math.round(Phaser.Math.Linear(a.green, b.green, amount)),
    Math.round(Phaser.Math.Linear(a.blue, b.blue, amount)),
  );
}

function grayscaleColor(color: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const gray = Math.round(c.red * 0.3 + c.green * 0.59 + c.blue * 0.11);
  return Phaser.Display.Color.GetColor(gray, gray, gray);
}

function wiltColor(color: number, amount: number): number {
  return mixColor(color, grayscaleColor(color), Phaser.Math.Clamp(amount, 0, 1));
}

function drawRewardFlower(g: Phaser.GameObjects.Graphics, type: FlowerType, wilt = 0): void {
  g.clear();
  g.lineStyle(4, wiltColor(Palette.grassDark, wilt), 1);
  g.lineBetween(0, 0, 0, -26);
  g.fillStyle(wiltColor(Palette.leafGreen, wilt), 1);
  g.fillEllipse(-6, -12, 13, 7);
  g.fillEllipse(7, -18, 13, 7);

  const cy = -34;
  g.fillStyle(wiltColor(type.petalColor, wilt), 1);
  for (let i = 0; i < type.petals; i++) {
    const a = (i / type.petals) * Math.PI * 2;
    const px = Math.cos(a) * 8;
    const py = cy + Math.sin(a) * 8;
    g.fillCircle(px, py, type.radius);
  }
  g.fillStyle(wiltColor(type.centerColor, wilt), 1);
  g.fillCircle(0, cy, Math.max(4, type.radius * 0.75));
}

function paintTile(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, state: TileState): void {
  const fills: Record<TileState, [number, number]> = {
    empty: [Palette.soilLight, Palette.soil],
    active: [0xfff9ec, Palette.grassDark],
    typing: [Palette.cream, Palette.grassDark],
    correct: [Palette.pinkBright, Palette.pinkDark],
    present: [Palette.yellow, Palette.yellowDark],
    absent: [Palette.mud, 0x4f3a29],
  };
  const [fill, stroke] = fills[state];
  g.fillStyle(fill, 1);
  g.lineStyle(4, stroke, 1);
  g.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 10);
  g.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 10);
}

function keyColor(state: LetterState, hover: boolean): { fill: number; stroke: number; text: string } {
  switch (state) {
    case 'correct':
      return { fill: Palette.pinkBright, stroke: Palette.pinkDark, text: Hex.white };
    case 'present':
      return { fill: Palette.yellow, stroke: Palette.yellowDark, text: Hex.ink };
    case 'absent':
      return { fill: Palette.mud, stroke: 0x4f3a29, text: '#C9BBA8' };
    default:
      return { fill: hover ? 0xfff6e0 : Palette.cream, stroke: 0xcabfae, text: Hex.ink };
  }
}

// little dino egg for the help meter: full = solid speckled egg, empty = cracked outline
function drawEgg(g: Phaser.GameObjects.Graphics, x: number, y: number, full: boolean): void {
  if (full) {
    g.fillStyle(0xfff3e0, 1);
    g.lineStyle(2, 0x9a7b53, 1);
    g.fillRoundedRect(x - 9, y - 11, 18, 22, 9);
    g.strokeRoundedRect(x - 9, y - 11, 18, 22, 9);
    g.fillStyle(0xcbb089, 1);
    g.fillCircle(x - 3, y - 2, 1.6);
    g.fillCircle(x + 3, y + 3, 1.6);
  } else {
    g.lineStyle(2, 0x9a7b53, 0.45);
    g.strokeRoundedRect(x - 9, y - 11, 18, 22, 9);
    g.lineBetween(x - 4, y - 6, x + 2, y - 1);
    g.lineBetween(x + 2, y - 1, x - 2, y + 4);
  }
}
