import type * as Phaser from 'phaser';
import type { Point, Viewport } from './geometry';

/** Phaser backing pixels are deliberately independent from layout and interaction CSS pixels. */
export function applyLogicalCamera(scene: Phaser.Scene, viewport: Viewport) {
  const ratio = scene.game.scale.gameSize.width / Math.max(1, viewport.width);
  scene.cameras.main.setOrigin(0, 0).setScroll(0, 0).setZoom(ratio);
}
export function logicalPointer(scene: Phaser.Scene, pointer: Phaser.Input.Pointer, viewport: Viewport): Point {
  return { x: pointer.x * viewport.width / scene.game.scale.gameSize.width,
    y: pointer.y * viewport.height / scene.game.scale.gameSize.height };
}
