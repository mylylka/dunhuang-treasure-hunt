import type { Scene } from 'three';
import { createGalleryGamePortal } from './first-gallery-portal-light';
import { upperToWorld } from './mogao-upper-navigation';
import type { WorldCheckpoint } from './types';

// Cave-local coordinates at the outside of the Buddha's left foot as viewed from the entrance.
const CENTER = upperToWorld({ x: -4.2, y: .037, z: -11.9 });
const INTERACT_DISTANCE = 2.25;

export function nearMogaoGamePortal(checkpoint: WorldCheckpoint): boolean {
  return checkpoint.walkSurface === 'ground' &&
    Math.hypot(checkpoint.position.x - CENTER.x, checkpoint.position.z - CENTER.z) < INTERACT_DISTANCE;
}

export function createMogaoGamePortal(scene: Scene) {
  return createGalleryGamePortal(scene, 'mogao-story-game-portal', CENTER);
}
