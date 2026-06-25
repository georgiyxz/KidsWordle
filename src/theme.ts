// Funbrain brand palette (project skill §3.1) exposed as Phaser numeric colors
// plus the handful of CSS strings we need for text fills. Tweak freely — these
// are the game's color knobs.

export const Palette = {
  // Brand primaries / secondaries
  sun: 0xfcbe55,
  sunShadow: 0xd3994c,
  grass: 0xa8bc53,
  grassDark: 0x6f8a2f,
  tomato: 0xff5a58,
  sky: 0x65a0ca,
  lilac: 0xa383bc,
  pink: 0xdb87b5,
  orange: 0xf28f52,
  orangeDark: 0xc87543,

  // Word Garden feedback colors: correct = pink, present = yellow, absent = mud.
  pinkBright: 0xf267a6,
  pinkDark: 0xcf4f86,
  yellow: 0xffcf4d,
  yellowDark: 0xd9a72b,
  leafGreen: 0x6f8a2f,

  // Paper / ink
  paper: 0xf0ece7,
  cream: 0xeeeae5,
  ink: 0x2a2928,

  // CTAs
  ctaPrimary: 0x2d8c8b,
  ctaNext: 0xf08a3e,

  // Funbrain backdrop + garden extras
  purple: 0x2a1f66,
  skyTop: 0x9fd8ef,
  skyHorizon: 0xdcf2c4,
  hill: 0x9ec25a,
  hillDark: 0x86ab47,
  soil: 0x6b4f3a,
  soilLight: 0xe9dcc4,
  mud: 0x5e4a3a,
  white: 0xffffff,
};

// CSS hex strings for Phaser Text color/stroke options. Bright, vibrant UI
// colors — avoid muddy brown for important text; use these instead.
export const Hex = {
  sun: '#FCBE55',
  gold: '#FFB52C',
  ink: '#2A2928',
  white: '#FFFFFF',
  cream: '#EEEAE5',
  grassDark: '#3F6B21',
  tomato: '#FF5A58',
  ctaPrimary: '#2D8C8B',
  teal: '#1E7E7C',
  orange: '#F08A3E',
  pink: '#F267A6',
  soil: '#5E4A3A',
};

export const FONT = 'Poppins';
export const LOGICAL_W = 960;
export const LOGICAL_H = 540;

// Supersampled text resolution for crisp glyphs. Bumped up (standard 3, retina 4)
// so text and fake-shadow text stay sharp even when the FIT canvas is scaled up to
// a big display or fullscreen. Display size is unchanged — only the glyph texture
// is rendered at higher density.
export const RENDER_RESOLUTION = (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 2) ? 4 : 3;

export type Mode = 'easy' | 'medium' | 'hard';
