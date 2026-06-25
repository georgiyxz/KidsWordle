import Phaser from 'phaser';
import { Palette, FONT } from '../theme';
import { addShadowText, ShadowedText } from './ShadowText';
import { playButtonPress } from '../audio';

// Funbrain image CTA (the CTA-*-Default / CTA-*-Active asset pairs).
// Shows the default art at rest, swaps to the active art on hover/press, nudges
// down + shrinks slightly while held, and fires on release (so a drag-off
// cancels). Uses pointer events for instant touch response.
export function makeImageButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  defaultKey: string,
  activeKey: string,
  onPress: () => void,
  height = 58,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, defaultKey).setOrigin(0.5);
  const aspect = img.width / img.height; // lock aspect from the default frame
  const setH = (h: number) => img.setDisplaySize(h * aspect, h);
  setH(height);
  // Pixel-perfect hit test so only the visible pill is clickable (the rounded
  // corners and any transparent padding are not), with no dead zones inside it.
  img.setInteractive(scene.input.makePixelPerfect());
  if (img.input) img.input.cursor = 'pointer';

  let held = false;
  img.on('pointerover', () => img.setTexture(activeKey));
  img.on('pointerout', () => {
    held = false;
    img.setTexture(defaultKey);
    setH(height);
  });
  img.on('pointerdown', () => {
    held = true;
    img.setTexture(activeKey);
    setH(height * 0.95);
  });
  img.on('pointerup', () => {
    if (!held) return;
    held = false;
    setH(height);
    playButtonPress(scene);
    onPress();
  });
  return img;
}

export type TextPill = {
  container: Phaser.GameObjects.Container;
  setSelected: (on: boolean) => void;
};

// A drawn rounded pill with a label — used for choices that have no ready-made
// asset (the Easy / Hard patch picker). Has a clear selected state plus hover
// and press feedback.
export function makeTextPill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onPress: () => void,
): TextPill {
  const container = scene.add.container(x, y);
  const hit = scene.add.zone(0, 0, w, h).setOrigin(0.5);
  const bg = scene.add.graphics();
  const txt: ShadowedText = addShadowText(
    scene,
    0,
    0,
    label,
    {
      fontFamily: FONT,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#2A2928',
    },
    { shadowColor: '#FFFFFF', shadowAlpha: 0.82, offsetX: 1, offsetY: 2 },
  );
  container.add([hit, bg, txt.container]);

  let selected = false;
  let hover = false;
  let pressed = false;

  const redraw = () => {
    bg.clear();
    const fill = selected ? Palette.grass : hover ? 0xfff6e0 : Palette.cream;
    const stroke = selected ? Palette.grassDark : 0xcabfae;
    const off = pressed ? 2 : 0;
    bg.fillStyle(fill, 1);
    bg.lineStyle(4, stroke, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + off, w, h, h / 2);
    bg.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, h / 2);
    txt.setColor(selected ? '#FFFFFF' : '#2A2928');
    txt.setShadowColor(selected ? '#000000' : '#FFFFFF', selected ? 0.78 : 0.82);
    txt.setY(off);
  };
  redraw();

  hit.setInteractive({ useHandCursor: true });
  if (hit.input) hit.input.cursor = 'pointer';

  hit.on('pointerover', () => {
    hover = true;
    redraw();
  });
  hit.on('pointerout', () => {
    hover = false;
    pressed = false;
    redraw();
  });
  hit.on('pointerdown', () => {
    pressed = true;
    redraw();
  });
  hit.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    redraw();
    playButtonPress(scene);
    onPress();
  });

  return {
    container,
    setSelected: (on: boolean) => {
      selected = on;
      redraw();
    },
  };
}
