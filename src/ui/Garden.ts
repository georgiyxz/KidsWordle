import Phaser from 'phaser';
import { Palette, LOGICAL_W, LOGICAL_H } from '../theme';

// Draws the cheerful sky + rolling grass backdrop shared by the menu and the
// game. Pure decoration: one Graphics object, no interaction. The sun is opt-in
// (the menu keeps it; the game scene leaves it off for a cleaner top-left).
export function drawGarden(scene: Phaser.Scene, withSun = true): void {
  const g = scene.add.graphics();

  // Sky: soft blue fading to pale green near the horizon.
  g.fillGradientStyle(Palette.skyTop, Palette.skyTop, Palette.skyHorizon, Palette.skyHorizon, 1);
  g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (withSun) {
    // Sun with a soft halo, tucked into the top-right background.
    g.fillStyle(Palette.sun, 0.25);
    g.fillCircle(850, 78, 78);
    g.fillStyle(Palette.sun, 1);
    g.fillCircle(850, 78, 52);
  }

  // Rolling hills, then the flat grass band the garden sits on.
  g.fillStyle(Palette.hillDark, 1);
  g.fillCircle(180, 470, 170);
  g.fillCircle(520, 480, 200);
  g.fillCircle(860, 470, 180);
  g.fillStyle(Palette.hill, 1);
  g.fillRect(0, 452, LOGICAL_W, LOGICAL_H - 452);
}

// Drifting clouds shared by the menu and the game. Spawns a few right away then
// keeps gently sending more across; auto-cleans its timer on scene shutdown.
export function addClouds(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const layer = scene.add.container(0, 0);
  let stopped = false;
  let event: Phaser.Time.TimerEvent | undefined;

  const spawn = (startX?: number): void => {
    if (stopped) return;
    const w = Phaser.Math.Between(150, 230);
    const h = w * 0.5625;
    const y = Phaser.Math.Between(70, 150);
    const x = startX ?? LOGICAL_W + w / 2 + 40;
    const speed = Phaser.Math.Between(16, 28);
    const cloud = scene.add
      .image(x, y, 'cloudSprite')
      .setOrigin(0.5)
      .setAlpha(Phaser.Math.FloatBetween(0.58, 0.82))
      .setDisplaySize(w, h);
    layer.add(cloud);
    scene.tweens.add({
      targets: cloud,
      x: -w / 2 - 80,
      duration: ((x + w / 2 + 80) / speed) * 1000,
      ease: 'Linear',
      onComplete: () => cloud.destroy(),
    });
  };

  [260, 640, 980].forEach((x) => spawn(x));
  const schedule = (): void => {
    if (stopped) return;
    event = scene.time.delayedCall(Phaser.Math.Between(5200, 8600), () => {
      if (stopped) return;
      spawn();
      schedule();
    });
  };
  schedule();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    stopped = true;
    event?.remove(false);
    scene.tweens.killTweensOf(layer.list);
  });
  return layer;
}

// Ambient butterflies that flutter across the garden — a little living detail.
// Lightweight (one drawn sprite at a time) and skipped when reduced motion is on.
export function addButterflies(scene: Phaser.Scene): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = [Palette.pink, Palette.sun, Palette.lilac, Palette.tomato];
  let stopped = false;
  let event: Phaser.Time.TimerEvent | undefined;

  const release = (): void => {
    if (stopped) return;
    const fromLeft = Math.random() < 0.5;
    const y = Phaser.Math.Between(150, 320);
    const startX = fromLeft ? -30 : LOGICAL_W + 30;
    const endX = fromLeft ? LOGICAL_W + 30 : -30;
    const g = scene.add.graphics();
    drawButterfly(g, Phaser.Math.RND.pick(colors));
    const bug = scene.add.container(startX, y, [g]).setDepth(6).setScale(0.9);
    if (!fromLeft) bug.setScale(-0.9, 0.9);

    const flap = scene.tweens.add({ targets: g, scaleX: 0.5, duration: 140, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const bob = scene.tweens.add({ targets: bug, y: y - Phaser.Math.Between(20, 44), duration: Phaser.Math.Between(700, 1100), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({
      targets: bug,
      x: endX,
      duration: Phaser.Math.Between(7000, 9500),
      ease: 'Sine.inOut',
      onComplete: () => {
        flap.remove();
        bob.remove();
        bug.destroy();
      },
    });
  };

  const schedule = (delay: number): void => {
    if (stopped) return;
    event = scene.time.delayedCall(delay, () => {
      if (stopped) return;
      release();
      schedule(Phaser.Math.Between(7000, 13000));
    });
  };
  schedule(Phaser.Math.Between(1500, 3500));
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    stopped = true;
    event?.remove(false);
  });
}

function drawButterfly(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(0x3a2e26, 1);
  g.fillRoundedRect(-2, -8, 4, 16, 2);
  g.fillStyle(color, 0.95);
  g.fillCircle(-8, -4, 7);
  g.fillCircle(-9, 6, 6);
  g.fillCircle(8, -4, 7);
  g.fillCircle(9, 6, 6);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(-8, -4, 3);
  g.fillCircle(8, -4, 3);
}
