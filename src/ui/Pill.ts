import Phaser from 'phaser';
import { Palette, FONT } from '../theme';
import { addShadowText, ShadowedText } from './ShadowText';

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
  img.setInteractive({ useHandCursor: true });

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
  container.add([bg, txt.container]);

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

  container
    .setSize(w, h)
    .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  if (container.input) container.input.cursor = 'pointer';

  container.on('pointerover', () => {
    hover = true;
    redraw();
  });
  container.on('pointerout', () => {
    hover = false;
    pressed = false;
    redraw();
  });
  container.on('pointerdown', () => {
    pressed = true;
    redraw();
  });
  container.on('pointerup', () => {
    pressed = false;
    redraw();
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
