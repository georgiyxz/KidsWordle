# Word Garden

A kid-friendly, dinosaur-themed 5-letter word-guessing game for Funbrain. Plant a
secret word one guess at a time and grow your garden before the dino gets hungry.

## Engine choice

**Phaser 3 + TypeScript + Vite.** The game needs animated sprites, a scene flow
(menu → game → win/lose overlays), tweened feedback, and a touch-friendly
on-screen keyboard. Phaser covers all of that cleanly and is bundled locally —
no CDN, no remote fonts, no network calls after first paint. Logical resolution
is 960 × 540, scaled to fit any iframe with `Scale.FIT`.

## Run it

```bash
npm install      # (npm.cmd install on Windows)
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## How to play

- Pick **Easy** or **Hard** on the menu, then press **START**.
- **Type** letters (physical keyboard) or **tap** the on-screen keyboard.
- **ENTER** plants your 5-letter word, **DEL / Backspace** removes a letter.
- Feedback is a garden, not colored squares:
  - 🌸 **Bloom** (orange + flower) — right letter, right spot.
  - 🍃 **Leaf** (green + leaf) — right letter, hiding in another spot.
  - 🟫 **Mud** (brown, no icon) — letter is not in the word.
- Six guesses. Win to make the garden bloom; run out and the dino reveals the word.

## Assets

- **Fonts:** local Poppins (`public/fonts/`), inlined via `@font-face` — no remote fonts.
- **Dinos:** cut out from the source sheets in `assets/characters/dinos/` and
  optimized to small transparent WebP via `npm run optimize-assets`
  (`scripts/optimize-assets.mjs`). Re-run that script to regenerate
  `public/art/dinos/`.
- **Buttons / cards:** Funbrain CTA assets in `public/ui/`.
- **Word lists:** bundled from `data/words-easy.txt`, `data/medium-words.txt`,
  `data/words-hard.txt`, and `data/5letter_clean.txt` via Vite raw imports.

## Notes / scope

- First playable: Main Menu + one gameplay round with win/lose handled inline
  (no separate Game Over / Win scenes yet).
- No `localStorage`, cookies, backend, analytics, or outbound links. Refreshing
  the iframe resets everything.
- Audio is not wired up yet (would be muted-by-default with a toggle when added).
