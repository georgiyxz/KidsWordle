---
name: funbrain-game
description: Scaffolds and constraints for building new Funbrain.com games. Use this skill whenever a request involves "building a Funbrain game", "Mighty Guy sequel", "add a game to Funbrain", or any prototype that must drop into the Funbrain site as an iframe. Loads the brand palette, type, UI chrome (start / game-over / win signs), CTA styles, input/device requirements, an engine-selection framework, and starter scaffolds.
metadata:
  type: project-skill
  audience: Codex
  project: Funbrain
---

# Funbrain Game Skill

A reusable spec + scaffold for building modern Funbrain games. Pulled from the in-repo asset and the original site (https://funbrain.com).

## Failure Prevention Rules

To achieve the highest success rate, follow these principles:

- Never edit without first understanding the current context.
- Always explore relevant code, prefabs, and documentation before making changes.
- For bugs: try to understand reproduction steps before attempting a fix.
- Verify after every change. Do not consider a task complete until verification is done.
- Prefer the smallest, safest, most isolated change possible.
- When in doubt or when a change feels risky, stop and ask instead of proceeding.

## Core Rules

1. Do not touch `main`.
2. Work only on the current feature/bug branch.
3. Do not refactor unrelated code.
4. Do not rename files, classes, variables, prefabs, scenes, serialized fields, ScriptableObjects, folders, or public methods unless explicitly asked.
5. Do not change teammate work unless the task directly requires it.
6. Do not delete files.
7. Do not reorganize the project.
8. Do not make architecture changes unless explicitly asked.
9. Make the smallest safe change that solves the task.
10. Prefer changing Inspector values, prefab settings, ScriptableObject values, or small isolated methods before rewriting systems.
11. Do not edit existing code unless the task clearly requires code changes.
12. If a risky rewrite is needed, stop and ask before editing.

---

## Code Style

Code must be simple enough for a basic Unity user to understand.

Use the fewest reasonable lines of code, but do not make the code confusing.

Prefer:
- clear names
- simple logic
- small methods
- existing systems already in the project
- Inspector-exposed values when designers need tuning
- putting relevant balance/gameplay values in the Unity Inspector when useful

When a value affects gameplay, balance, feel, or tuning, expose it and make it easy to change and tweak.

Examples:
- speed
- HP
- damage
- cooldown
- duration
- range
- radius
- spawn rate
- knockback
- enemy stats
- ability stats
- item stats
- boss stats
- projectile speed
- projectile lifetime
- animation timing
- VFX duration
- camera shake amount
- drop rate
- coin reward
- XP reward

Designers should be able to play around with important values without digging through code, when that makes sense.

Avoid:
- clever code
- large abstractions
- unnecessary managers
- new frameworks
- hidden magic numbers
- rewriting working systems

## KidsWordle Iteration Loop

Follow this loop for every non-trivial task.

For tiny safe tasks, keep the loop brief. Do not over-explain obvious steps.

### Loop Steps

1. **Load State & Identify Scope**  
   Read the relevant project files. Identify what needs to change and which documents will be affected.

2. **Define Success Criteria**  
   Before implementing anything, clearly state what “correctly done” looks like for this task.

3. **State What Will Change**  
   Briefly state:
   - What the task is
   - Which files, objects, prefabs, scenes, ScriptableObjects, or values may be touched
   - Confirmation that this follows the smallest safe change rule

4. **Explore & Understand**  
   Read the relevant code, prefabs, and documentation. For bugs, attempt to understand the root cause.

5. **Execute**  
   Make the change while strictly following all Core Rules. Prefer Inspector-exposed values when appropriate.

6. **Verify**  
   After making changes, verify the work:
   - Check compilation if the environment supports it.
   - If Unity compilation cannot be run reliably, inspect the changed code for compile errors and ask the human to test in Unity.
   - Review the logic and confirm it matches the defined success criteria.
   - For Inspector values, balance changes, or data-driven systems, confirm the values are correctly set.
   - For gameplay, playtesting, or visual/behavioral changes, ask the human to test if running the game in Unity would take significant time or is unreliable.
   - Only consider the task complete after verification.

7. **Final Summary**  
   - Output a summary using the required final response structure below.
  
---

## 1. Non-negotiable game requirements

Every Funbrain game **must** satisfy all of these. Treat them as acceptance criteria, not nice-to-haves.

1. **Fast load in an iframe.** First interaction in ≤ 3 s on a school-grade Chromebook. Single bundled `index.html` (or `index.html` + one `bundle.js` + one `bundle.css`) — no remote font calls during the critical render, no CDN that may be blocked by school networks. Total payload target: **< 1.5 MB compressed**, hard ceiling 3 MB.
2. **Chromebook + trackpad + keyboard.** All actions must work with `Space`, `↑/↓/←/→`, and single-button mouse click. No right-click, no scroll-wheel-required, no multi-key chords. Add an in-game key legend on the start screen.
3. **iPad / iPhone touch.** All actions must work with single-finger tap and short swipe. No long-press, no pinch, no multi-touch chords. Buttons must be ≥ 44 × 44 px hit area. Use `pointerdown` (not `click`) so iOS Safari fires immediately.
4. **Self-contained, no saved state.** No `localStorage`, no cookies, no auth, no backend writes. Refreshing the iframe resets the game. Score is in-memory only.
5. **Age 7–12 appropriate.** No blood, no romance, no scary jump-scares, no real-world violence, no chat, no ads, no outbound links. Cartoon peril (chase, dodge, fall, ridiculous situations) is fine. Reading level ≤ 4th grade for any on-screen text.
6. **Humor.** At least three intentional jokes per game: a silly title tagline, a goofy death/fail line, and at least one absurd visual gag baked into gameplay. Funbrain games are warm and slightly weird — never mean-spirited.
7. **Interactive** Every click should be interactive. All buttons should have mousedown states for example
8. **Clarity** Interactions should be simple and clear
9. **Consistency** All Funbrain games should have a standard templated load screen, instruction screen, and end screen. All should have standard buttons and elements such as full screen icons. These can be found in the "Common UI Assets" directory

### Iframe hygiene checklist

- `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`
- `touch-action: none;` on the canvas to suppress iOS scroll/zoom on swipe
- `body { margin: 0; overflow: hidden; background: #2A1F66; }` to avoid white flash before assets paint
- All fonts loaded as base64 in CSS or pre-inlined `<style>`, never `@import url(googleapis)`
- No `window.top` access, no `parent.postMessage` unless explicitly requested by the site shell
- Pause loop when `document.hidden` is true so a hidden tab doesn't drain battery
- Provide a `FULL SCREEN` button (lower-right pill) that calls `requestFullscreen()` on the canvas wrapper

## 2. Tech stack

### 2.1 Engine selection

There is no house engine. Pick the **lightest tool that covers the game's actual needs**, and record the choice + one-paragraph rationale in the game's PLAN/README. Whatever you pick must be bundled locally, never loaded from a CDN.

| Choose | When the game needs | Cost |
|---|---|---|
| **Vanilla Canvas 2D / DOM** (no engine) | A handful of sprites, simple shapes/lines, AABB or distance hit tests, easing, a screen state machine. Most Funbrain-scale games land here. | ~0 KB; you own the loop |
| **Phaser 3** (latest stable) | Real physics (arcade bodies, gravity, bounce), tilemaps, cameras, many animated sprites, particle systems, complex input juggling | ~300 KB+ gzipped — must still fit §6 budget |
| **PixiJS** | Heavy 2D rendering (hundreds of sprites, filters, WebGL perf) but no physics/scene framework needed | ~100 KB+ gzipped |
| **three.js** | Genuinely 3D presentation | ~150 KB+ gzipped; mind Chromebook GPUs |

Decision rules:

1. List what the game mechanically requires (physics? camera? particle count? 3D?). If vanilla covers it in a few hundred lines, use vanilla — payload and load time win on school Chromebooks.
2. An engine must pay for itself: if you'd use < 3 of its major subsystems, drop down a tier.
3. Never mix engines in one game; never pick an engine to get one utility (tweening, audio) — inline a tiny lib or write it.

### 2.2 Common stack (engine-independent)

- **Build:** Vite with `build.target: 'es2019'`, output to a single-folder dist that can be zipped and dropped into the Funbrain CDN path. No SSR, no hydration.
- **Language:** TypeScript when the game has > ~500 LOC of logic; plain JS for jam-style one-screen games.
- **Assets:** SVG for UI chrome and characters where possible (sharp at any DPI, tiny payload). PNG (or WebP with PNG fallback) only for raster art that can't be vector. Audio as `.mp3` (best Safari support) + optional `.ogg` for Chromebook.
- **Resolution:** Design at **960 × 540** logical pixels (16:9). Letterbox/scale-to-fit the canvas inside whatever iframe the site gives us — Phaser's `Scale.FIT`, or a ~10-line resize handler in vanilla/Pixi/three. All games should be equally playable fullscreen as they are on a small phone. 

## 3. Brand system

### 3.1 Color palette for title and end screens

Use as CSS variables / engine color constants.

```
/* Backgrounds */

/* Brand Colors */
--fb-brand-teal: #7bb3b1;
--fb-brand-teal-dark: #6c9997;
--fb-grass-green: #abbd5a;
--fb-grass-green-dark: #9aa64f;
--fb--orange-sun: #f28f52;
--fb--orange-sun-dark: #c87543;
--fb--watermelon: #c87543;
--fb--watermelon-dark: #c87543;
--fb--prince-purple: #c87543;
--fb--prince-purple-dark: #c87543;
--fb--prince-sunny-yellow: ;
--fb--prince-sunny-yellow-dark: ;


/* Brand primaries */
--fb-sun:          #FCBE55;  /* Title text, "GAME OVER" sign body */
--fb-sun-shadow:   #D3994C;  /* Pole/notch shadow on yellow signs */


/* Brand secondaries */
--fb-grass:        #A8BC53;  /* "YOU WON" sign pole, BallHogs court, croc body */
--fb-grass-shadow: #98A64A;
--fb-tomato:       #FF5A58;  /* Alerts, "GAME OVER" headline text */
--fb-tomato-deep:  #DC4E4B;
--fb-sky:          #65A0CA;
--fb-sky-shadow:   #578BAE;
--fb-lilac:        #A383BC;
--fb-plum:         #88719C;
--fb-pink:         #DB87B5;

/* Sign / paper */
--fb-paper:        #F0ECE7;  /* "YOU WON" sign face */
--fb-paper-edge:   #DBD7D2;
--fb-cream:        #EEEAE5;

/* Frame / ink */
--fb-ink:          #2A2928;  /* "GAME OVER" sign face, character outlines */
--fb-ink-deep:     #1F1C1A;

/* Buttons */
--fb-cta-primary:  #2D8C8B;  /* Teal pill ("START", "PLAY AGAIN", "TRY AGAIN") */
--fb-cta-next:     #F08A3E;  /* Orange pill ("CONTINUE", "NEXT", "SUBMIT") */
--fb-cta-text:     #FFFFFF;
```


### 3.2 Typography

- **Display / titles:** chunky all-caps display sans-serif. Use **Bungee** (Google Fonts, free, OFL). Slight ~3–5° tilt on title lettering for energy. Subset to A–Z 0–9 punctuation only, base64-inline.
- **UI / body:** **Nunito** or **Fredoka** — rounded, friendly, readable on small screens. Weight 700 for buttons, 600 for HUD numbers.
- **Score / counter:** monospace tabular figures (Nunito has `font-variant-numeric: tabular-nums`).

### 3.3 UI chrome — the "sign" system

Funbrain's signature UI element is a **wood-mounted plaque on two poles** (see `Screen Examples/sign_gameover.svg` and `sign_win.svg`).

- **Game Over plaque:** dark `--fb-ink` face, `--fb-sun` poles, `--fb-sun-shadow` pole notches, red `GAME OVER` headline (`--fb-tomato`), teal `TRY AGAIN` pill underneath.
- **You Won plaque:** cream `--fb-paper` face, `--fb-grass` poles, `--fb-grass-shadow` notches, `--fb-sun` headline, teal `PLAY AGAIN` pill.
- **Generic dialog plaque:** same chassis, swap the face color to suit context.

Pole notches are stamped triangular cuts down the post — preserve this detail; it is a strong brand tell. Re-use the SVGs as-is and re-color via `<use>` or by swapping `fill` values at build time.

### 3.4 CTA buttons

Pill-shaped, ~48 px tall, white text, optional small icon on the left and a right-pointing chevron on the right when the button advances state.

- **Primary action** (START, PLAY AGAIN, TRY AGAIN): teal `--fb-cta-primary`.
- **Forward action** (CONTINUE, NEXT, SUBMIT): orange `--fb-cta-next`.
- **Dismiss** (DONE ×): outline only, white text, no fill.

Hover/press states are required for **every** button in the app, including image buttons, setup controls, HUD icons, and end-screen CTAs. On hover, brighten or darken the button enough to be visible. On pointerdown / mousedown / touch, shift down 2 px and scale to ~0.96 for ~80 ms, or swap to the matching `*-Active` asset when one exists. Keyboard focus must also be visible, using a high-contrast outline that does not resize the button.

### 3.5 HUD

- Top-left: a row of hollow star icons that fill as the player earns them (see Screen Examples). Stars use `--fb-sun` when filled. Use **3–7 stars** depending on the game's scoring granularity — 3 is a common default, not a hard cap. Not every game uses stars; a game with no point/progress system can omit the star row entirely.
- Top-right: small DONE × button (returns to Funbrain hub — for now a no-op that calls `parent.postMessage({type:'funbrain:exit'},'*')`).
- Bottom-right: FULL SCREEN pill.

## 4. Start / Game Over / Win screens

Every game ships with these four screens, in this exact order. They are part of the brand — don't reinvent the flow.

1. **Start screen** — game title (Bungee, `--fb-sun`), one-line tagline (humor beat), character art in the right third, single teal `START` pill, FULL SCREEN pill bottom-right, controls legend ("SPACE / TAP to jump") in small text under the START button.
2. **Active gameplay** — HUD (stars top-left, DONE top-right, score / lives if relevant, FULL SCREEN bottom-right).
3. **Game Over** — dark sign drops in on chains from the top, `GAME OVER` in red, `TRY AGAIN` teal pill. Background dims to 60%. Show final score / a humor line.
4. **You Won** — cream sign drops in on chains from the top, `YOU WON!` in yellow, `PLAY AGAIN` teal pill. Confetti / star burst optional but on-brand.

Drop animation: signs swing in from above on two visible chains (`--fb-ink`), overshoot 8 px, settle. ~600 ms ease-out-back.

## 5. Input abstraction

Wrap input so the rest of the game never branches on device. Required surface:

```ts
type GameInput = {
  onPrimary: (cb: () => void) => void;   // SPACE, TAP, mouse click, ↑
  onLeft:    (cb: () => void) => void;   // ←, swipe-left
  onRight:   (cb: () => void) => void;   // →, swipe-right
  onDown:    (cb: () => void) => void;   // ↓, swipe-down
  isPrimaryHeld: () => boolean;
};
```

- Tap detection: `pointerdown` → `pointerup` < 200 ms and < 10 px movement.
- Swipe detection: `pointerdown` → `pointerup` with > 30 px on the dominant axis.
- Prevent default on `touchmove` inside the canvas to stop iOS rubber-band.

## 6. Performance budget

- 60 fps on a 2018-era Chromebook (Intel Celeron N4000).
- Asset budget per game: ≤ 300 KB JS engine/runtime gzipped (0 KB if vanilla — spend the savings on art), ≤ 400 KB game logic, ≤ 800 KB art, ≤ 100 KB audio.
- No physics body counts > 200. Pool sprites; never `destroy()` in a tight loop.
- Cap `devicePixelRatio` at 2 when sizing the canvas backing store (sharp on Retina, doesn't melt iPads) — Phaser scale config, or manual `canvas.width = cssWidth * Math.min(devicePixelRatio, 2)`.

### 6.1 Runtime asset optimization

Keep source art and runtime art separate. Source files may be large PSDs, high-resolution PNGs, or reference mockups, but the build may only import optimized runtime assets sized for the 960 x 540 logical canvas.

- Before implementation, audit asset dimensions and file sizes. Any single runtime image that is visibly overweight for its on-screen size must be downscaled and compressed before it ships.
- Export backgrounds and large raster art as WebP with PNG fallback when transparency or Safari support requires it. Keep crisp UI chrome and simple shapes as SVG when possible.
- Crop transparent padding, flatten unused layers, and remove metadata. Do not ship PSDs, reference images, or unneeded alternate crops in the game bundle.
- Match exported dimensions to the largest expected on-screen display size, with enough resolution for `devicePixelRatio` 2. Avoid importing 2K/4K source art for small sprites or 960 x 540 scenes.
- After optimization, re-check the compressed bundle and the Network panel. Each browser should download only the asset variant it can use, and the zipped build must still stay under the Funbrain payload limits.

## 7. Audio

- Optional but encouraged. **Must** be muted by default and toggleable from a small speaker icon top-right next to DONE.
- One looped music bed (≤ 60 KB) + a handful of short SFX (≤ 10 KB each). Use `WebAudio` (directly, or via the engine's audio manager).
- Never autoplay sound on screen 1 — iOS will block it and the game will look broken.

## 8. Accessibility

- Color is never the sole signal — pair color with shape or motion (e.g., a hazard is red **and** spiky).
- All text passes WCAG AA contrast against its background.
- Provide `prefers-reduced-motion` honoring: cut screen-shake and particle counts in half.
- The game must be winnable without sound.

## 9. File layout

Engine-neutral. "Scene" means a Phaser Scene, or a plain state object in a screen
state machine for vanilla/Pixi — same five screens either way.

```
<game-name>/
├── index.html              ← single entry, loads bundle.js + bundle.css
├── src/
│   ├── main.ts             ← engine config / canvas setup + boot
│   ├── scenes/             ← (or screens/ for vanilla)
│   │   ├── BootScene.ts    ← preload everything, then start Start
│   │   ├── StartScene.ts   ← title, tagline, START pill
│   │   ├── GameScene.ts    ← gameplay
│   │   ├── GameOverScene.ts
│   │   └── WinScene.ts
│   ├── ui/
│   │   ├── Sign.ts         ← reusable plaque component
│   │   ├── Pill.ts         ← reusable CTA button
│   │   └── Hud.ts          ← stars, score, full-screen pill
│   ├── input/
│   │   └── GameInput.ts    ← abstraction from §5
│   └── theme.ts            ← exports the §3.1 palette as numeric constants
├── public/
│   ├── art/                ← .svg / .png
│   ├── audio/              ← .mp3 / .ogg
│   └── fonts/              ← Bungee.woff2, Nunito.woff2 (subsetted)
├── vite.config.ts
└── package.json
```

## 10. Starter snippets

### 10.1 Vanilla Canvas 2D starter (default for simple games)

```ts
const LOGICAL_W = 960, LOGICAL_H = 540;
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;

function resize() {
  const dpr = Math.min(devicePixelRatio, 2);
  const scale = Math.min(innerWidth / LOGICAL_W, innerHeight / LOGICAL_H);
  canvas.style.width = `${LOGICAL_W * scale}px`;
  canvas.style.height = `${LOGICAL_H * scale}px`;
  canvas.width = LOGICAL_W * dpr;
  canvas.height = LOGICAL_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize); resize();

type Screen = { update(dt: number): void; draw(c: CanvasRenderingContext2D): void };
let screen: Screen; // start with StartScreen, swap on transitions

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 20); // clamp tab-switch spikes
  last = now;
  if (!document.hidden) { screen.update(dt); screen.draw(ctx); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

### 10.2 Phaser 3 starter (when §2.1 justifies it)

Drop this into `src/main.ts` of a new game to get the right scale, input, and scene order.

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { WinScene } from './scenes/WinScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#2A1F66',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    max: { width: 1920, height: 1080 },
  },
  render: { pixelArt: false, antialias: true, powerPreference: 'low-power' },
  fps: { target: 60, forceSetTimeOut: false },
  physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
  input: { activePointers: 2 },
  scene: [BootScene, StartScene, GameScene, GameOverScene, WinScene],
});

// Pause when the iframe is hidden (battery + Funbrain hub etiquette).
document.addEventListener('visibilitychange', () => {
  const game = Phaser.GAMES[0];
  if (!game) return;
  document.hidden ? game.scene.pause('GameScene') : game.scene.resume('GameScene');
});
```

## 11. Build / ship checklist

Before declaring a game done, walk through this list:

- [ ] Loads to interactive in ≤ 3 s on a throttled "Slow 4G" device profile
- [ ] Plays end-to-end with **only** keyboard, then **only** trackpad, then **only** touch
- [ ] Refresh mid-game resets cleanly with no console errors
- [ ] Tested in Chrome (Chromebook), Safari (iPad and iPhone)
- [ ] No outbound network requests after first paint (verify in DevTools Network tab)
- [ ] Lighthouse Performance ≥ 90
- [ ] Title screen, Game Over sign, You Won sign all use the brand chrome from §3
- [ ] At least 3 humor beats verified
- [ ] Runtime art is compressed, downscaled to its actual display needs, and separated from source/reference art
- [ ] No PII collected, no `localStorage`, no cookies set
- [ ] Bundle zipped is < 1.5 MB
- [ ] `FULL SCREEN` pill works on Chrome and Safari
- [ ] Sound is muted by default and toggle works

## 12. Working from this skill

When asked to start a new Funbrain game:

1. Confirm the game concept, art direction, and any specific mechanic.
2. Choose the engine using the §2.1 decision rules and state the rationale in one paragraph. The user can override; default to the lightest fit.
3. Restate the 6 non-negotiables back to the user with the concept overlaid (e.g. "for a runner game, jump = SPACE / tap; left-right is auto-scroll, so no swipe needed").
4. Generate the file layout from §9 and the matching starter from §10.
5. Prepare optimized runtime art from the provided source/reference assets before importing it into gameplay code.
6. Build the **Start screen first**, then the **gameplay loop**, then Game Over / Win. This ordering keeps the brand chrome correct from day one.
7. Pull characters from `Funbrain UI assets/SVG Characters/compressed versions/` rather than generating new ones unless the game's hero is genuinely new.
8. Run the §11 checklist before saying "done".

## 13. Common UI Assets — where the brand chrome lives

Every game ships with a **`Common UI Assets/`** folder at the project root (shared, reusable across all Funbrain games). Reach for it before drawing any chrome — do not reinvent buttons, signs, or icons.

Inventory (PNG unless noted):

- **CTA buttons, each as a `*-Default` + `*-Active` pair:** `CTA-Start`, `CTA-Continue`, `CTA-Next`, `CTA-Submit`, `CTA-PlayAgain`, `CTA-TryAgain`, `CTA-Done`, `CTA-Fullscreen`. Plus `CTA-Play-Now-.png` (landing CTA, teal pill w/ gamepad + chevron).
- **Sign plaques (the brand "sign on ropes"):** `CTA-YouWinCard.png`, `CTA-GameOverCard.png`, each with a hi-res `*-WithOverlay@4x.png` variant. Cream face on green/grass ropes for the win sign; dark face for game-over.
- **Overlay / misc:** `Overlay-StartScreen.png`, and SVG icons `clearexit.svg` (the × / DONE), `checkmark.svg`, `questionmark.svg`, `undo.svg`.

Rules of use:

- **Press states are free — use them.** Each CTA's `*-Active` is the pressed look. Swap `img.src` to the Active asset on `pointerdown` (and back on `pointerup`/`pointerleave`). A generic helper that reads `data-default` / `data-active` off the `<img>` handles every image button at once. Keyboard focus still needs a visible high-contrast outline.
- **Preserve aspect ratio.** Size image CTAs with `height` fixed and `width:auto` (`object-fit:contain`) — never stretch with `object-fit:fill`.
- **The win/game-over plaque text may be baked in** (e.g. `CTA-YouWinCard.png` says "YOU WON!"). For a **2-player** game that wording is wrong — paint the text out with the face color (sample it; the win card's is `#F0ECE7`) to get a blank plaque, then overlay your own copy (e.g. `"{name} wins!"`). See §15 for placement.
- Characters (flyers, heroes) live separately under the game's `runtime-assets/characters/` (or `Funbrain UI assets/SVG Characters/`), not in `Common UI Assets/`.

## 14. The FULL SCREEN button (standard recipe)

Required on every game (lower-right). Implement it consistently:

- **Action:** on `pointerdown`, call `requestFullscreen()` on the **app-shell wrapper** (the element that contains both the canvas and the DOM UI), and swallow the rejected promise: `el.requestFullscreen().catch(() => {})`. Fullscreen must be triggered by a real user gesture. iOS Safari on iPhone does not support element fullscreen — degrade gracefully (the button is simply a no-op there; never show a broken state).
- **Style — match it to the sound toggle.** Both are **icon buttons: a white icon on a grey button with a white border**, ≥ 44×44 px. Use a simple white **4-corner-bracket SVG** for fullscreen (not the wordy `CTA-Fullscreen` pill — that doesn't match the round sound icon).
- **Affordance:** render it as a **circle that expands into a labelled pill ("FULL SCREEN") on hover/focus** — animate a `max-width` (and opacity) transition on the label so it's a circle at rest and a pill on hover. Anchor the icon so the pill grows toward screen-center (away from the corner) and never clips off-edge.
- Place it in a bottom-right `corner-actions` cluster next to the sound toggle; share one `.icon-button` style so the two always match.

## 15. Two-player, turn-based, single-machine ("hot-seat") flow

This is the canonical structure for a turn-based 2-player game played on one device (Connect Four, checkers, tic-tac-toe, battle games). Both players share the keyboard/touchscreen; there is no network and no accounts.

### 15.1 Screen + phase state machine

Two layers of state:

1. **Screen** (which DOM panel shows): `start → mode (Play a Friend / Play the Computer) → setup → playing → roundOver → matchOver`.
2. **Phase** (drives gameplay + input gating inside `playing`): a single string such as
   `attract | announcing | awaitingInput | computerThinking | dropping | roundOver | matchOver | replaying`.

Everything keys off `phase`. Input handlers must early-return unless it's a human's turn:

```ts
private isHumanInputOpen(): boolean {
  return this.phase === "awaitingInput" && !this.players[this.active].isComputer;
}
```

This single guard makes pointer, keyboard, and timer code device- and turn-agnostic.

### 15.2 Turn ownership & handoff cadence

- Track `activePlayer: 0 | 1`; flip it after each resolved move.
- Track `currentStarter` and **alternate who starts each round** so neither player has a permanent first-move edge.
- On each turn start, run a short **announce** beat (`announcing` phase): bring the active player's avatar/carrier in, then open input (`awaitingInput`).
- **Signal whose turn it is subtly.** A big "YOUR TURN" popup is distracting for 6–9 year-olds — instead **blink the active player's HUD chip ~3×** (and/or the column selector). Avatar fly-in + a quick blink is enough.

### 15.3 Computer opponent

- Reuse the *same* pipeline as a human turn; just swap the phase to `computerThinking` so human input is ignored, then drive the move with a `delayedCall` (a beat of "thinking") and a `chooseColumn(board, player, difficulty)` function.
- Offer difficulty in setup; for easy mode also offer a "who goes first" toggle.

### 15.4 Optional per-move timer

- A countdown in `awaitingInput`; on expiry, auto-commit the current selection (and post a light, funny "time!" message). Never punish harshly — this is for kids.

### 15.5 Match structure (best-of-N)

- `wins: [number, number]`, `targetWins = Math.ceil(bestOf / 2)`, plus `finalWinner | null`.
- After a round: a win that reaches `targetWins` ends the **match**; otherwise start the next round (alternating starter).
- **HUD shows progress as the brand fillable star row** — render `targetWins` stars per player, fill them gold as rounds are won (hollow `--fb-ink` outline → `--fb-sun` fill). Don't use ad-hoc dots.

### 15.6 Round end vs match end

- **Round end** (`roundOver`): a small, compact panel placed **over the top of the board** (not off to the side, and not covering the play grid) with a `Continue` CTA + a `Replay`.
- **Match end** (`matchOver`): the full brand **You-Win plaque** (§13) reading `"{name} wins!"` — no "YOU WON!", no "Best of N". Pin it to the **top of the frame so the ropes run off-frame** (preserve the illusion they hang from off-screen — no sky gap above the ropes).

### 15.7 Replay

- Record each round's moves as `{player, position}` in order. `Replay` re-runs the animation by re-dropping in sequence. Make it available from both `roundOver` and `matchOver`.
- On **reset / play-again**, fully clear board state, settled pieces, FX, looping tweens, and any repeating timers — orphaned `repeat:-1` tweens or `time.addEvent` loops pointing at destroyed sprites will throw or leak.

### 15.8 Setup screen (hot-seat specifics)

- Name inputs for **both** players (with fun defaults), match length (best of 3/5), optional timer, and — vs computer — difficulty + who-goes-first + checker color.
- Self-contained: **no localStorage, no accounts**; refresh resets everything.

### 15.9 Architecture: decouple engine from DOM UI

- Keep gameplay in the engine (e.g. a Phaser `Scene`) and all panels/HUD in DOM. Bridge them with a tiny event bus (`emit`/`on`) and a single serializable **status object** the UI renders. One `render()` rebuilds the DOM from state; the engine never touches the DOM directly. This keeps the brand chrome in plain HTML/CSS (easy to restyle) while the engine owns animation and rules.

### 15.10 Feedback & juice (what reads for this age group)

- **Victory must be unmistakable on every piece color.** Spinning the winning pieces is too subtle (and invisible on black). Use **bright overlays** instead — glow halos, a drawn line through the four, popping stars, smiley faces, or bright colored discs *on top of* the pieces. Tinting a near-black sprite stays dark; overlay color instead. Ship several variations and pick one at random per win.
- **Blocked / illegal-ish moves:** play a buzzer, **shake the board** (camera shake), then a brief "Blocked!" callout — in that order.
- **Audio:** muted by default with a toggle (§7). Short celebratory/feedback stings (win fanfare, buzzer) can be **synthesized via WebAudio** (oscillators) so they cost zero asset budget; gate every play behind the sound flag. Win = a trumpet flare; make it generous.
- **Carrier/avatar sound parity:** if an avatar has a flight sound, play it both on entrance **and** when it darts between columns (throttled), for every avatar — not just one.
- Honor `prefers-reduced-motion`: halve/disable shake, particle spam, and looping pulses.

### 15.11 Asset pipeline notes (learned the hard way)

- **Audio → MP3** (Safari-safe), mono ~96 kbps for SFX. If `ffmpeg` is broken on the machine, `lame` converts WAV→MP3 directly; `cwebp`/`magick` handle images.
- **Art → WebP with PNG fallback.** Resolve at runtime with a sync check
  (`canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0`) and a Vite
  `import.meta.glob("../runtime-assets/**/*.{png,webp}", { eager:true, query:"?url", import:"default" })`
  map keyed by path. (`import.meta.glob`/`import.meta.env` need `/// <reference types="vite/client" />` in a `*.d.ts`.) The glob ships both variants in the bundle, but each browser downloads only what it supports.
- When a sprite-sheet frame "doesn't animate," verify the frames actually differ (`magick compare -metric RMSE a b x.png`); a near-zero RMSE means a duplicate export, not a code bug.
