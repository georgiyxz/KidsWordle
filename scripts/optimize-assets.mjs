// One-off runtime-art optimizer (dev only — not bundled into the game).
// The source dino art lives as 1376x768 PNG *sheets* (~0.7-1 MB each), several
// poses per sheet, on a solid near-white background with no alpha. For the game
// we want small, single-pose cutouts with a transparent background.
//
// For each crop we:
//   1. extract the single-pose region,
//   2. flood-fill the OUTER near-white pixels to transparent (flooding from the
//      borders keeps the dino's white eyes, which are sealed inside dark
//      outlines, fully opaque),
//   3. trim leftover transparent margin,
//   4. downscale and re-encode as WebP-with-alpha.
//
// Re-run with: npm run optimize-assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const srcDir = path.join(repoRoot, 'assets', 'characters', 'dinos');
const outDir = path.join(here, '..', 'public', 'art', 'dinos');

// Single-pose crop boxes hand-picked from the source sheets (source pixels).
const CROPS = [
  { out: 'dino-idle', src: 'dino1', left: 20, top: 10, width: 300, height: 330 },
  { out: 'dino-face', src: 'dino1', left: 1075, top: 5, width: 301, height: 300 },
  { out: 'dino-cheer', src: 'dino1', left: 905, top: 360, width: 471, height: 408 },
  { out: 'dino-steg', src: 'dino2', left: 10, top: 5, width: 380, height: 250 },
];

const WHITE = 232; // a pixel counts as background if its smallest channel is >= this
const RUNTIME_WIDTH = 360; // generous for on-screen size x2 retina; trim happens first

await mkdir(outDir, { recursive: true });

// Flood-fill transparency from the image borders inward over near-white pixels.
function knockOutBackground(data, w, h) {
  const isWhite = (i) => data[i] >= WHITE && data[i + 1] >= WHITE && data[i + 2] >= WHITE;
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    if (data[i + 3] !== 0 && isWhite(i)) {
      data[i + 3] = 0; // mark transparent so we never revisit
      stack.push(x, y);
    }
  };
  for (let x = 0; x < w; x++) {
    pushIf(x, 0);
    pushIf(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIf(0, y);
    pushIf(w - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    pushIf(x + 1, y);
    pushIf(x - 1, y);
    pushIf(x, y + 1);
    pushIf(x, y - 1);
  }
}

for (const crop of CROPS) {
  const src = path.join(srcDir, `${crop.src}.png`);
  if (!existsSync(src)) {
    console.warn(`skip ${crop.out}: source not found at ${src}`);
    continue;
  }
  const region = await sharp(src)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = region;
  knockOutBackground(data, info.width, info.height);

  const out = path.join(outDir, `${crop.out}.webp`);
  const result = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim() // drop the now-transparent margin
    .resize({ width: RUNTIME_WIDTH, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(out);
  console.log(`${crop.out}.webp  ${result.width}x${result.height}  ${(result.size / 1024).toFixed(1)} KB`);
}

console.log('Done. Cutout dinos written to public/art/dinos/');
