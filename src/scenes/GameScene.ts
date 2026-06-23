import Phaser from 'phaser';
import { Palette, Hex, FONT, LOGICAL_W, LOGICAL_H, Mode } from '../theme';
import { drawGarden } from '../ui/Garden';
import { Hud } from '../ui/Hud';
import { makeImageButton } from '../ui/Pill';
import { addShadowText, ShadowedText } from '../ui/ShadowText';
import { bindWordInput } from '../input/GameInput';
import { scoreGuess, LetterResult } from '../game/scoreGuess';

const ROWS = 6;
const COLS = 5;
const CELL = 38;
const STEP_X = 44;
const STEP_Y = 43;
const BOARD_CX = 176;
const BOARD_CY = 205;
const HINTS_PER_RUN = 5;
const HELP_X = 330;
const HELP_Y = 48;
const KEYBOARD_CX = 420;
const CHAT_X = 620;
const CHAT_Y = 160;

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
  reset: () => void;
  fall: () => void;
  baseX: number;
  baseY: number;
};

const FALLBACK_EASY = [
  'APPLE', 'TIGER', 'ROBOT', 'CLOUD', 'PIZZA',
  'MUSIC', 'OCEAN', 'LEMON', 'BUNNY', 'MAGIC',
];
const FALLBACK_HARD = [
  'PLANT', 'CRANE', 'SNAIL', 'BRAVE', 'SHARK',
  'STONE', 'WHALE', 'FRUIT', 'BREAD', 'DANCE',
];

const BIG_CHEERS = ['NICE SPROUT!!', 'AWESOME GUESS!!', 'SO CLOSE!!', 'KEEP GOING, SUPER SPELLER!!'];
const SMALL_CHEERS = ['Nice sprout!', 'Your word garden is growing!', 'Getting warmer!'];
const WHIFFS = ['Nope-a-saurus!', 'The dino ate that guess.', 'That letter is hiding somewhere else!'];
const TOO_SHORT = ['Please enter a 5-letter word.', 'Tiny word! It needs 5 letters!', 'Almost! Use 5 letters!'];
const NO_HINTS = ['No helper eggs left!', 'The dino is out of clues!', 'No more hints, super speller!'];
const VOWELS = 'AEIOU';

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'easy';

  // run-level state (persists across words until a fresh run)
  private score = 0;
  private hintsLeft = HINTS_PER_RUN;

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
  private solvedPos = [false, false, false, false, false];
  private usedHints = new Set<string>();

  private reduceMotion = false;

  // layers / refs
  private boardLayer!: Phaser.GameObjects.Container;
  private kbLayer!: Phaser.GameObjects.Container;
  private dinoLayer!: Phaser.GameObjects.Container;
  private chatLayer!: Phaser.GameObjects.Container;
  private legendLayer!: Phaser.GameObjects.Container;
  private cloudLayer!: Phaser.GameObjects.Container;
  private cloudEvent?: Phaser.Time.TimerEvent;
  private cells: Cell[][] = [];
  private keyObjs: Record<string, KeyObj> = {};
  private letterKeys: Record<string, KeyObj> = {};
  private hud!: Hud;
  private dino!: Phaser.GameObjects.Image;
  private bubble!: Phaser.GameObjects.Graphics;
  private chatText!: ShadowedText;
  private scoreText!: ShadowedText;
  private helpLayer!: Phaser.GameObjects.Container;
  private helpEggs!: Phaser.GameObjects.Graphics;
  private scoreLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: Mode }): void {
    this.mode = data.mode ?? 'easy';
    // A fresh start (menu or Try Again) resets the whole run.
    this.score = 0;
    this.hintsLeft = HINTS_PER_RUN;
    this.prevSecret = '';
    this.cells = [];
    this.keyObjs = {};
    this.letterKeys = {};
  }

  create(): void {
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    drawGarden(this);
    this.buildClouds();

    this.hud = new Hud(this, {
      maxGuesses: ROWS,
      onDone: () => this.scene.start('MainMenuScene', { mode: this.mode }),
    });

    this.buildScoreUi();
    this.buildHelpUi();
    this.buildBoard();
    this.buildDinoAndChat();
    this.buildLegend();
    this.buildKeyboard();

    bindWordInput(this, {
      onLetter: (ch) => this.onLetter(ch),
      onEnter: () => this.onEnter(),
      onDelete: () => this.onDelete(),
    });

    // playful pop-in of the major groups
    this.popIn(this.hud.container, 0, 20);
    this.popIn(this.scoreLayer, 0, 40);
    this.popIn(this.helpLayer, 0, 70);
    this.popIn(this.boardLayer, 0, 0);
    this.popIn(this.dinoLayer, 0, 110);
    this.popIn(this.chatLayer, 0, 150);
    this.popIn(this.legendLayer, 0, 120);
    this.popIn(this.kbLayer, 0, 90);

    this.startWord(true);
  }

  // ---- static UI ----------------------------------------------------------

  private buildScoreUi(): void {
    this.scoreLayer = this.add.container(LOGICAL_W - 190, 34);
    this.scoreText = addShadowText(this, 0, 0, 'SCORE: 0', {
        fontFamily: FONT,
        fontSize: '21px',
        fontStyle: 'bold',
        color: Hex.sun,
      }, { shadowColor: '#000000', shadowAlpha: 0.8, offsetX: 2, offsetY: 3 });
    this.scoreLayer.add(this.scoreText.container);
  }

  private buildClouds(): void {
    this.cloudLayer = this.add.container(0, 0);
    [260, 640, 980].forEach((x) => this.spawnCloud(x));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cloudEvent?.remove(false));
    this.scheduleCloud();
  }

  private scheduleCloud(): void {
    this.cloudEvent = this.time.delayedCall(Phaser.Math.Between(5200, 8600), () => {
      this.spawnCloud();
      this.scheduleCloud();
    });
  }

  private spawnCloud(startX?: number): void {
    const w = Phaser.Math.Between(150, 230);
    const h = w * 0.5625;
    const y = Phaser.Math.Between(76, 146);
    const x = startX ?? LOGICAL_W + w / 2 + 40;
    const speed = Phaser.Math.Between(16, 28);
    const cloud = this.add
      .image(x, y, 'cloudSprite')
      .setOrigin(0.5)
      .setAlpha(Phaser.Math.FloatBetween(0.58, 0.82))
      .setDisplaySize(w, h);
    this.cloudLayer.add(cloud);
    this.tweens.add({
      targets: cloud,
      x: -w / 2 - 80,
      duration: ((x + w / 2 + 80) / speed) * 1000,
      ease: 'Linear',
      onComplete: () => cloud.destroy(),
    });
  }

  private setScore(n: number): void {
    this.score = n;
    this.scoreText.setText(`SCORE: ${n}`);
  }

  private buildHelpUi(): void {
    this.helpLayer = this.add.container(HELP_X, HELP_Y);
    const button = this.buildHintButton(0, 0);
    this.helpEggs = this.add.graphics();
    this.helpLayer.add([button, this.helpEggs]);
    this.drawHelpMeter();
  }

  private drawHelpMeter(): void {
    const g = this.helpEggs;
    g.clear();
    for (let i = 0; i < HINTS_PER_RUN; i++) {
      const x = 98 + i * 28;
      const full = i < this.hintsLeft;
      drawEgg(g, x, 0, full);
    }
  }

  private buildHintButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 154;
    const h = 42;
    const g = this.add.graphics();
    const txt = addShadowText(this, 0, 0, 'DINO HELP', {
      fontFamily: FONT,
      fontSize: '17px',
      fontStyle: 'bold',
      color: Hex.white,
    }, { shadowColor: '#000000', shadowAlpha: 0.76, offsetX: 2, offsetY: 2 });
    container.add([g, txt.container]);
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
    container
      .setSize(w, h)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (container.input) container.input.cursor = 'pointer';
    container.on('pointerover', () => { hover = true; redraw(); });
    container.on('pointerout', () => { hover = false; pressed = false; redraw(); });
    container.on('pointerdown', () => { pressed = true; redraw(); });
    container.on('pointerup', () => { pressed = false; redraw(); this.useHint(); });
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
          fontSize: '23px',
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
    this.dinoLayer = this.add.container(398, 236);
    this.dino = this.add.image(0, 0, 'dinoIdle').setOrigin(0.5);
    this.dinoLayer.add(this.dino);
    this.setDino('dinoIdle');
    this.tweens.add({
      targets: this.dino,
      y: -8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.chatLayer = this.add.container(CHAT_X, CHAT_Y);
    this.bubble = this.add.graphics();
    this.chatText = addShadowText(this, 4, 0, '', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: Hex.ink,
        align: 'center',
        wordWrap: { width: 268 },
      }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
    this.chatLayer.add([this.bubble, this.chatText.container]);
    this.redrawBubble(false);
  }

  private redrawBubble(emph: boolean): void {
    const g = this.bubble;
    g.clear();
    const fill = emph ? Palette.yellow : Palette.paper;
    g.fillStyle(fill, 1);
    // tail toward the dino (left), drawn first so the body covers its base
    g.fillTriangle(-150, 8, -150, 40, -182, 24);
    g.fillRoundedRect(-150, -58, 300, 116, 18);
    g.lineStyle(5, emph ? Palette.pinkDark : 0xcdbfa8, 1);
    g.strokeRoundedRect(-150, -58, 300, 116, 18);
  }

  private buildLegend(): void {
    this.legendLayer = this.add.container(560, 378);
    const g = this.add.graphics();
    this.legendLayer.add(g);
    const items: [number, Score, string][] = [
      [-170, 'correct', 'Right spot'],
      [-12, 'present', 'Wrong spot'],
      [150, 'absent', 'Not here'],
    ];
    items.forEach(([x, state, label]) => {
      paintTile(g, x, 0, 24, state);
      paintIcon(g, x, 0, 24, state);
      const t = addShadowText(this, x + 18, 0, label, {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: Hex.soil,
      }, { origin: [0, 0.5], shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
      this.legendLayer.add(t.container);
    });
  }

  private buildKeyboard(): void {
    this.kbLayer = this.add.container(KEYBOARD_CX, 462);
    const rows: { label: string; w: number }[][] = [
      'QWERTYUIOP'.split('').map((l) => ({ label: l, w: 62 })),
      'ASDFGHJKL'.split('').map((l) => ({ label: l, w: 62 })),
      [
        { label: 'ENTER', w: 96 },
        ...'ZXCVBNM'.split('').map((l) => ({ label: l, w: 62 })),
        { label: 'DEL', w: 96 },
      ],
    ];
    const rowY = [-44, 0, 44];
    rows.forEach((items, r) => this.layoutKeyRow(items, rowY[r]));
  }

  private layoutKeyRow(items: { label: string; w: number }[], ly: number): void {
    const gap = 8;
    const total = items.reduce((s, it) => s + it.w, 0) + gap * (items.length - 1);
    let x = -total / 2;
    for (const it of items) {
      this.makeKey(x + it.w / 2, ly, it.w, 38, it.label);
      x += it.w + gap;
    }
  }

  private makeKey(lx: number, ly: number, w: number, h: number, label: string): void {
    const isLetter = label.length === 1;
    const container = this.add.container(lx, ly);
    const hit = this.add.zone(lx, ly, w, h).setOrigin(0.5);
    const g = this.add.graphics();
    const txt = addShadowText(this, 0, 0, label, {
      fontFamily: FONT,
      fontSize: isLetter ? '20px' : '15px',
      fontStyle: 'bold',
      color: Hex.ink,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.84, offsetX: 1, offsetY: 2 });
    container.add([g, txt.container]);
    this.kbLayer.add([hit, container]);

    let pressed = false;
    let hover = false;
    let fallen = false;
    let state: LetterState = 'unknown';
    const redraw = () => {
      g.clear();
      const k = keyColor(state, hover);
      const off = pressed ? 2 : 0;
      g.fillStyle(k.fill, 1);
      g.lineStyle(3, k.stroke, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + off, w, h, 10);
      g.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, 10);
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
      setState: (s) => { state = s; redraw(); },
      fall: () => {
        if (fallen) return;
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
        container.setVisible(true).setAngle(0).setScale(1).setPosition(lx, ly);
        redraw();
      },
    };
    this.keyObjs[label] = keyObj;
    if (isLetter) this.letterKeys[label] = keyObj;
  }

  // ---- per-word lifecycle -------------------------------------------------

  private startWord(first: boolean): void {
    this.secret = this.pickSecret();
    this.prevSecret = this.secret;
    this.row = 0;
    this.current = '';
    this.guessesMade = 0;
    this.busy = false;
    this.over = false;
    this.letterStates = {};
    this.guessedLetters = new Set();
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
    this.hud.setGuessesLeft(ROWS);
    this.setDino('dinoIdle');

    if (!first) this.popIn(this.boardLayer, 0.9, 0, 240);
    this.renderCurrentRow();
    this.say(first ? 'Plant a 5-letter word and press ENTER!' : 'Fresh word! Keep your garden growing!');
  }

  private pickSecret(): string {
    const key = this.mode === 'easy' ? 'easyWords' : 'hardWords';
    const raw = (this.cache.text.get(key) as string | undefined) ?? '';
    const words = raw
      .split(/\s+/)
      .map((w) => w.trim().toUpperCase())
      .filter((w) => /^[A-Z]{5}$/.test(w));
    const list = words.length ? words : this.mode === 'easy' ? FALLBACK_EASY : FALLBACK_HARD;
    let pick = Phaser.Math.RND.pick(list);
    if (list.length > 1) {
      let guard = 0;
      while (pick === this.prevSecret && guard++ < 10) pick = Phaser.Math.RND.pick(list);
    }
    return pick;
  }

  // ---- input --------------------------------------------------------------

  private onLetter(ch: string): void {
    if (this.busy || this.over || this.current.length >= COLS) return;
    this.current += ch;
    this.renderCurrentRow();
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
    this.submitGuess();
  }

  private renderCurrentRow(): void {
    for (let c = 0; c < COLS; c++) {
      const cell = this.cells[this.row][c];
      if (c < this.current.length) this.paintCell(cell, 'typing', this.current[c]);
      else this.paintCell(cell, 'active', '');
    }
  }

  // ---- guessing -----------------------------------------------------------

  private submitGuess(): void {
    const guess = this.current;
    const score = scoreGuess(this.secret, guess);
    this.guessesMade += 1;
    this.busy = true;
    for (const ch of guess) this.guessedLetters.add(ch);

    const stepMs = this.reduceMotion ? 0 : 150;
    for (let c = 0; c < COLS; c++) {
      this.time.delayedCall(c * stepMs, () => {
        const cell = this.cells[this.row][c];
        this.paintCell(cell, score[c], guess[c]);
        this.animateReveal(cell, score[c]);
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
      this.time.delayedCall(450, () => this.showGameOver());
      return;
    }

    const useful = score.filter((s) => s !== 'absent').length;
    if (useful >= 2) {
      this.say(Phaser.Math.RND.pick(BIG_CHEERS), true);
      this.reactGood();
      this.leafSparkle();
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
    paintIcon(cell.icon, 0, 0, CELL, state);
    cell.txt.setText(letter);
    cell.txt.setColor(state === 'correct' ? Hex.white : state === 'absent' ? '#C9BBA8' : Hex.ink);
    cell.txt.setShadowColor(state === 'correct' || state === 'absent' ? '#000000' : Hex.cream, state === 'correct' || state === 'absent' ? 0.78 : 0.86);
  }

  private animateReveal(cell: Cell, score: Score): void {
    if (this.reduceMotion) return;
    if (score === 'correct') {
      cell.container.setScale(0.6);
      this.tweens.add({ targets: cell.container, scale: 1, duration: 320, ease: 'Back.out' });
      this.petalBurst(this.boardLayer.x + cell.lx, this.boardLayer.y + cell.ly, 8);
    } else if (score === 'present') {
      this.tweens.add({
        targets: cell.container,
        angle: { from: -8, to: 8 },
        duration: 90,
        yoyo: true,
        repeat: 2,
        onComplete: () => cell.container.setAngle(0),
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
    this.chatText.setFontSize(emph ? 21 : 18);
    this.chatText.setColor(emph ? '#B5346F' : Hex.ink);
    this.chatText.setShadowColor(emph ? '#000000' : Hex.cream, emph ? 0.24 : 0.86);
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: this.chatLayer,
      scale: { from: emph ? 1.14 : 1.06, to: 1 },
      duration: emph ? 260 : 180,
      ease: 'Back.out',
    });
  }

  private setDino(key: string): void {
    this.dino.setTexture(key);
    const h = 150;
    this.dino.setDisplaySize(h * (this.dino.width / this.dino.height), h);
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

  private reactGood(): void {
    this.setDino('dinoCheer');
    this.bounceDino();
    this.time.delayedCall(1000, () => { if (!this.over) this.setDino('dinoIdle'); });
  }

  private reactBad(): void {
    this.setDino('dinoFace');
    this.bounceDino();
    this.time.delayedCall(1000, () => { if (!this.over) this.setDino('dinoIdle'); });
  }

  private reactLose(): void {
    this.setDino('dinoFace');
  }

  // ---- hints --------------------------------------------------------------

  private useHint(): void {
    if (this.busy || this.over) return;
    if (this.hintsLeft <= 0) {
      this.say(Phaser.Math.RND.pick(NO_HINTS));
      this.shakeHelp();
      return;
    }
    const hint = this.buildHint();
    if (!hint) return;
    this.usedHints.add(hint);
    this.hintsLeft -= 1;
    this.drawHelpMeter();
    if (!this.reduceMotion) {
      this.tweens.add({ targets: this.helpLayer, scale: { from: 1.12, to: 1 }, duration: 220, ease: 'Back.out' });
    }
    this.say(hint);
    this.setDino('dinoCheer');
    this.bounceDino();
    this.time.delayedCall(900, () => { if (!this.over) this.setDino('dinoIdle'); });
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

  // ---- win (ongoing run) --------------------------------------------------

  private winWord(): void {
    this.busy = true;
    const points = (7 - this.guessesMade) * 10;
    this.reactWinDino();
    this.say('YOU GOT IT!!', true);
    this.boardBounce();
    this.winShower();
    this.time.delayedCall(750, () => {
      this.setScore(this.score + points);
      this.showNextWordPopup(points);
    });
  }

  private reactWinDino(): void {
    this.setDino('dinoCheer');
    this.bounceDino();
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

  private showNextWordPopup(points: number): void {
    const scrim = this.add
      .rectangle(0, 0, LOGICAL_W, LOGICAL_H, Palette.purple, 0.28)
      .setOrigin(0)
      .setInteractive()
      .setDepth(59);
    const layer = this.add.container(LOGICAL_W / 2, 250).setDepth(60);
    const panel = this.add.graphics();
    panel.fillStyle(Palette.paper, 1);
    panel.lineStyle(6, Palette.pinkDark, 1);
    panel.fillRoundedRect(-210, -150, 420, 300, 26);
    panel.strokeRoundedRect(-210, -150, 420, 300, 26);
    const t1 = addShadowText(this, 0, -106, 'YOU GREW A WORD!', {
      fontFamily: FONT,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#CF4F86',
    }, { shadowColor: '#000000', shadowAlpha: 0.5, offsetX: 2, offsetY: 3 });
    const t2 = addShadowText(this, 0, -54, `+${points} points`, {
      fontFamily: FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: Hex.ink,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
    const t3 = addShadowText(this, 0, -14, `Score: ${this.score}`, {
      fontFamily: FONT,
      fontSize: '22px',
      fontStyle: 'bold',
      color: Hex.soil,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
    const t4 = addShadowText(this, 0, 28, 'Ready for the next word?', {
      fontFamily: FONT,
      fontSize: '18px',
      color: Hex.ink,
    }, { shadowColor: Hex.cream, shadowAlpha: 0.86, offsetX: 1, offsetY: 2 });
    const btn = makeImageButton(this, 0, 100, 'btnContinue', 'btnContinueActive', () => this.continueFromPopup(layer, scrim), 56);
    layer.add([panel, t1.container, t2.container, t3.container, t4.container, btn]);
    this.popIn(layer, 0, 0);
  }

  private continueFromPopup(layer: Phaser.GameObjects.Container, scrim: Phaser.GameObjects.Rectangle): void {
    const finish = () => {
      layer.destroy();
      scrim.destroy();
      this.startWord(false);
    };
    if (this.reduceMotion) { finish(); return; }
    this.tweens.add({ targets: layer, y: layer.y + 18, scale: 0, alpha: 0, duration: 220, ease: 'Back.in', onComplete: finish });
    this.tweens.add({ targets: scrim, alpha: 0, duration: 220 });
  }

  // ---- loss ---------------------------------------------------------------

  private showGameOver(): void {
    this.over = true;
    this.busy = true;

    this.add.rectangle(0, 0, LOGICAL_W, LOGICAL_H, 0x000000, 0.45).setOrigin(0).setInteractive().setDepth(50);

    const signY = 196;
    const signLayer = this.add.container(LOGICAL_W / 2, -290).setDepth(52);
    const card = this.add.image(0, 0, 'cardOver');
    const cardW = 650;
    card.setDisplaySize(cardW, cardW / (card.width / card.height));
    const cover = this.add.graphics();
    cover.fillStyle(Palette.ink, 1);
    cover.fillRoundedRect(-282, -74, 564, 132, 18);
    const headline = addShadowText(this, 0, -34, 'GAME OVER', {
        fontFamily: FONT,
        fontSize: '54px',
        fontStyle: 'bold',
        color: Hex.tomato,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 4, offsetY: 5 });
    const wordText = addShadowText(this, 0, 44, `The word was ${this.secret}`, {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: Hex.cream,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 2, offsetY: 3 });
    const finalScore = addShadowText(this, 0, 82, `Final score: ${this.score}`, {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: Hex.sun,
      }, { shadowColor: '#000000', shadowAlpha: 0.86, offsetX: 2, offsetY: 3 });
    signLayer.add([card, cover, headline.container, wordText.container, finalScore.container]);
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

    makeImageButton(this, LOGICAL_W / 2, 462, 'btnTryAgain', 'btnTryAgainActive', () => this.scene.restart({ mode: this.mode }), 58).setDepth(52);
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

// Shape backs up color: a flower means the letter is home, a leaf means it grows
// in another spot, mud (no icon) means it is not in the word.
function paintIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, state: TileState): void {
  const ix = cx + size * 0.28;
  const iy = cy - size * 0.28;
  if (state === 'correct') {
    const pr = size * 0.1;
    g.fillStyle(Palette.white, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillCircle(ix + Math.cos(a) * pr, iy + Math.sin(a) * pr, pr * 0.9);
    }
    g.fillStyle(Palette.sun, 1);
    g.fillCircle(ix, iy, pr * 0.8);
  } else if (state === 'present') {
    const s = size * 0.16;
    g.fillStyle(Palette.leafGreen, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(ix, iy - s),
        new Phaser.Geom.Point(ix + s * 0.8, iy),
        new Phaser.Geom.Point(ix, iy + s),
        new Phaser.Geom.Point(ix - s * 0.8, iy),
      ],
      true,
    );
    g.lineStyle(2, 0x3f5a1c, 1);
    g.lineBetween(ix, iy - s, ix, iy + s);
  }
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
