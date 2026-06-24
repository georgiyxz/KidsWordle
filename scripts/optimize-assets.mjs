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
  {
    out: 'dino-idle',
    src: 'dino1',
    left: 0,
    top: 0,
    width: 318,
    height: 395,
    clearOutputEyes: [
      { x: 60, y: 41, rx: 8, ry: 11 },
      { x: 79, y: 41, rx: 8, ry: 11 },
    ],
  },
  { out: 'dino-hint', src: 'dino1', left: 320, top: 20, width: 370, height: 355, minComponent: 1800 },
  { out: 'dino-excited', src: 'dino1', left: 580, top: 20, width: 460, height: 367, minComponent: 5000 },
  { out: 'dino-face', src: 'dino1', left: 1080, top: 20, width: 295, height: 286 },
  { out: 'dino-encourage', src: 'dino1', left: 15, top: 390, width: 360, height: 365 },
  { out: 'dino-proud', src: 'dino1', left: 395, top: 405, width: 430, height: 320 },
  { out: 'dino-cheer', src: 'dino1', left: 878, top: 310, width: 402, height: 414, minComponent: 3000 },
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

function dropSmallComponents(data, w, h, minPixels = 0) {
  if (!minPixels) return;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const pixels = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p] || data[p * 4 + 3] === 0) return;
    seen[p] = 1;
    stack.push(x, y);
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (seen[p] || data[p * 4 + 3] === 0) continue;
      pixels.length = 0;
      pushIf(x, y);
      while (stack.length) {
        const cy = stack.pop();
        const cx = stack.pop();
        const cp = cy * w + cx;
        pixels.push(cp);
        pushIf(cx + 1, cy);
        pushIf(cx - 1, cy);
        pushIf(cx, cy + 1);
        pushIf(cx, cy - 1);
      }
      if (pixels.length < minPixels) {
        for (const index of pixels) data[index * 4 + 3] = 0;
      }
    }
  }
}

function paintEyeWhites(data, w, h, eyes = []) {
  const fill = [244, 242, 234, 255];
  for (const eye of eyes) {
    const minX = Math.max(0, Math.floor(eye.x - eye.rx));
    const maxX = Math.min(w - 1, Math.ceil(eye.x + eye.rx));
    const minY = Math.max(0, Math.floor(eye.y - eye.ry));
    const maxY = Math.min(h - 1, Math.ceil(eye.y + eye.ry));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - eye.x) / eye.rx;
        const ny = (y - eye.y) / eye.ry;
        if (nx * nx + ny * ny > 1) continue;
        const i = (y * w + x) * 4;
        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = fill[3];
      }
    }
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
  paintEyeWhites(data, info.width, info.height, crop.clearEyes);
  dropSmallComponents(data, info.width, info.height, crop.minComponent);

  const outputRegion = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim() // drop the now-transparent margin
    .resize({ width: RUNTIME_WIDTH, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  paintEyeWhites(outputRegion.data, outputRegion.info.width, outputRegion.info.height, crop.clearOutputEyes);

  const out = path.join(outDir, `${crop.out}.webp`);
  const result = await sharp(outputRegion.data, {
    raw: { width: outputRegion.info.width, height: outputRegion.info.height, channels: 4 },
  })
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(out);
  console.log(`${crop.out}.webp  ${result.width}x${result.height}  ${(result.size / 1024).toFixed(1)} KB`);
}

console.log('Done. Cutout dinos written to public/art/dinos/');
