import Phaser from 'phaser';
import { RENDER_RESOLUTION } from '../theme';

export type ShadowedText = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Text;
  setText: (value: string) => ShadowedText;
  setColor: (color: string) => ShadowedText;
  setShadowColor: (color: string, alpha?: number) => ShadowedText;
  setFontSize: (size: string | number) => ShadowedText;
  setPosition: (x: number, y: number) => ShadowedText;
  setY: (y: number) => ShadowedText;
};

type ShadowTextOptions = {
  origin?: number | [number, number];
  shadowColor?: string;
  shadowAlpha?: number;
  offsetX?: number;
  offsetY?: number;
  resolution?: number;
};

export function addShadowText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  opts: ShadowTextOptions = {},
): ShadowedText {
  const offsetX = opts.offsetX ?? 2;
  const offsetY = opts.offsetY ?? 2;
  const shadowColor = opts.shadowColor ?? '#000000';
  const shadowAlpha = opts.shadowAlpha ?? 0.82;
  const resolution = opts.resolution ?? RENDER_RESOLUTION;
  const origin = opts.origin ?? 0.5;
  const [originX, originY] = Array.isArray(origin) ? origin : [origin, origin];

  const container = scene.add.container(x, y);
  const shadow = scene.add.text(offsetX, offsetY, value, { ...style, color: shadowColor }).setOrigin(originX, originY);
  const text = scene.add.text(0, 0, value, style).setOrigin(originX, originY);
  shadow.setAlpha(shadowAlpha).setResolution(resolution);
  text.setResolution(resolution);
  container.add([shadow, text]);

  const api: ShadowedText = {
    container,
    text,
    shadow,
    setText: (next) => {
      text.setText(next);
      shadow.setText(next);
      return api;
    },
    setColor: (color) => {
      text.setColor(color);
      return api;
    },
    setShadowColor: (color, alpha = shadowAlpha) => {
      shadow.setColor(color);
      shadow.setAlpha(alpha);
      return api;
    },
    setFontSize: (size) => {
      text.setFontSize(size);
      shadow.setFontSize(size);
      return api;
    },
    setPosition: (nextX, nextY) => {
      container.setPosition(nextX, nextY);
      return api;
    },
    setY: (nextY) => {
      container.setY(nextY);
      return api;
    },
  };

  return api;
}
