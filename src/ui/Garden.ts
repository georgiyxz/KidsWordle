import Phaser from 'phaser';
import { Palette, LOGICAL_W, LOGICAL_H } from '../theme';

// Draws the cheerful sky + rolling grass + sun + flowers backdrop shared by the
// menu and the game. Pure decoration: one Graphics object, no interaction.
export function drawGarden(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // Sky: soft blue fading to pale green near the horizon.
  g.fillGradientStyle(Palette.skyTop, Palette.skyTop, Palette.skyHorizon, Palette.skyHorizon, 1);
  g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Sun with a soft halo, tucked in the top-left.
  g.fillStyle(Palette.sun, 0.25);
  g.fillCircle(112, 96, 86);
  g.fillStyle(Palette.sun, 1);
  g.fillCircle(112, 96, 60);

  // Rolling hills, then the flat grass band the garden sits on.
  g.fillStyle(Palette.hillDark, 1);
  g.fillCircle(180, 470, 170);
  g.fillCircle(520, 480, 200);
  g.fillCircle(860, 470, 180);
  g.fillStyle(Palette.hill, 1);
  g.fillRect(0, 452, LOGICAL_W, LOGICAL_H - 452);

  // A scatter of little flowers along the grass.
  const flowers: [number, number, number][] = [
    [70, 500, Palette.pink],
    [250, 520, Palette.sun],
    [430, 498, Palette.tomato],
    [900, 512, Palette.lilac],
    [760, 522, Palette.sun],
  ];
  flowers.forEach(([x, y, c]) => flower(g, x, y, c));
}

function flower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.lineStyle(4, Palette.grassDark, 1);
  g.lineBetween(x, y, x, y + 22);
  g.fillStyle(color, 1);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 6);
  }
  g.fillStyle(Palette.sun, 1);
  g.fillCircle(x, y, 5);
}
