import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT } from '../../src/content/world/mogao-exhibit-v001';
import { MOGAO_EXHIBIT_PROGRESS_KEY } from '../../src/services/mogao-exhibit-progress';
import { saveMogaoHallAProgress } from '../../src/services/mogao-hall-a-progress';
import { createMogaoExhibitScene } from '../../src/world/mogao-exhibit-scene';
import {
  initializeMogaoExhibitPreviewSession, MOGAO_EXHIBIT_SESSION_KEY, restrictMogaoExhibitCheckpoint,
} from '../../src/world/mogao-exhibit-session';
import { settleUpperCamera } from '../../src/world/mogao-upper-camera';
import {
  MOGAO_BUDDHA_GATE, MOGAO_HALL_A_BUDDHA_GATE, moveUpperPlayer, upperFromWorld, upperToWorld,
} from '../../src/world/mogao-upper-navigation';
import { upperPreviewCheckpoint } from '../../src/world/mogao-upper-session';
import { previewApproachRegions, previewRegionAt, worldPreviewResourceProfile } from '../../src/world/preview-resource-profile';

const point = (x: number, y: number, z: number) => {
  const p = upperToWorld({ x, y, z });
  return new THREE.Vector3(p.x, p.y, p.z);
};
function memory() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
}

describe('Mogao independent viewing doors', () => {
  it('uses the measured room mouth and keeps four combinations of player and camera collision independent', () => {
    expect(MOGAO_HALL_A_BUDDHA_GATE.min).toEqual([14.5, 8.11, -14]);
    expect(MOGAO_HALL_A_BUDDHA_GATE.max).toEqual([14.8, 11.21, -12]);
    for (const bLocked of [false, true]) for (const aLocked of [false, true]) {
      for (const [hall, gate, locked] of [
        ['a', MOGAO_HALL_A_BUDDHA_GATE, aLocked],
        ['b', MOGAO_BUDDHA_GATE, bLocked],
      ] as const) {
        const y = gate.min[1];
        for (const z of [-13.25, -13, -12.75]) {
          const start = point(17, y, z), end = point(11.2, y, z);
          // The same straight line works in both directions across the full clear band.
          const player = moveUpperPlayer({ position: start, surfaceId: `hall-${hall}` },
            { x: end.x - start.x, z: end.z - start.z }, bLocked, aLocked, true)!;
          const camera = settleUpperCamera(point(17, y + 1.65, z), point(11.2, y + 1.65, z), bLocked, true, aLocked);
          expect(player.surfaceId).toBe(locked ? `hall-${hall}` : `view-${hall}`);
          if (locked) {
            expect(upperFromWorld(player.position).x).toBeGreaterThan(15.48);
            expect(upperFromWorld(camera).x).toBeGreaterThan(14.8);
          } else {
            expect(upperFromWorld(player.position).x).toBeCloseTo(11.2);
            expect(upperFromWorld(camera).x).toBeCloseTo(11.2);
            const returned = moveUpperPlayer(player,
              { x: start.x - end.x, z: start.z - end.z }, bLocked, aLocked, true)!;
            expect(returned.surfaceId).toBe(`hall-${hall}`);
            expect(upperFromWorld(returned.position).x).toBeCloseTo(17);
          }
        }
      }
    }
  });

  it('creates A gold before A art loads and retains physical blocking through independent fades', () => {
    const root = new THREE.Scene();
    const scene = createMogaoExhibitScene(root, { gateLocked: true, hallAGateLocked: true });
    const start = point(17, 8.11, -13), end = point(11.2, 8.11, -13);
    const crossA = () => moveUpperPlayer({ position: start, surfaceId: 'hall-a' },
      { x: end.x - start.x, z: end.z - start.z }, scene.isGateBlocking(), scene.isHallAGateBlocking(), true)?.surfaceId;
    try {
      const veil = root.getObjectByName('mogao-hall-a-gold-barrier') as THREE.Mesh<THREE.PlaneGeometry>;
      expect(veil.geometry.parameters.width).toBeCloseTo(2);
      expect(veil.geometry.parameters.height).toBeCloseTo(3.1);
      expect(veil.position.toArray()).toEqual([14.65, 9.66, -13]);
      expect(scene.inspect().imagesStarted).toBe(false);
      expect(crossA()).toBe('hall-a');
      for (let frame = 0; frame < 4; frame++) scene.update(start, 'hall-a', .15, true, false, false);
      expect(scene.inspect().hallAGate.visible).toBe(true);
      expect(crossA()).toBe('hall-a');
      scene.update(start, 'hall-a', .13, true, false, false);
      expect(scene.inspect().hallAGate).toEqual({ visible: false, strength: 0 });
      expect(crossA()).toBe('view-a');
      expect(scene.isGateBlocking()).toBe(true);
      scene.update(start, 'hall-a', 0, false, true, false);
      expect(scene.isGateBlocking()).toBe(false);
    } finally {
      scene.dispose();
    }
    const completed = createMogaoExhibitScene(root, { gateLocked: true, hallAGateLocked: false });
    try {
      expect(completed.inspect().hallAGate).toEqual({ visible: false, strength: 0 });
      expect(completed.isGateBlocking()).toBe(true);
    } finally {
      completed.dispose();
    }
  });

  it('reanchors locked A view-link, door-edge and direct platform saves without crossing floors', () => {
    const a = upperPreviewCheckpoint('upper-a', true), b = upperPreviewCheckpoint('upper-b', true);
    for (const [surface, position] of [['view-a', a.position], ['view-link-a', point(14.4, 8.11, -12.8)],
      ['hall-a', point(15.1, 8.11, -12.8)]] as const) {
      const saved = { ...a, walkSurface: surface, position: { x: position.x, z: position.z } };
      const locked = restrictMogaoExhibitCheckpoint(saved, true, false);
      expect(locked.walkSurface).toBe('hall-a');
      expect(upperFromWorld(locked.position).x).toBeCloseTo(17);
      expect(locked.cameraYaw).toBe(saved.cameraYaw);
    }
    expect(restrictMogaoExhibitCheckpoint(a, false, true)).toEqual(a);
    expect(restrictMogaoExhibitCheckpoint(b, true, false)).toEqual(b);
    expect(restrictMogaoExhibitCheckpoint(b, false, true).walkSurface).toBe('hall-b');
    const oldA = upperPreviewCheckpoint('upper-a');
    const migratedA = restrictMogaoExhibitCheckpoint(oldA, true, true);
    expect(migratedA.walkSurface).toBe('view-a');
    expect(upperFromWorld(migratedA.position).z).toBeCloseTo(-13);

    const walkStore = memory(), progressStore = memory();
    const surface = () => JSON.parse(walkStore.getItem(MOGAO_EXHIBIT_SESSION_KEY)!).walkSurface;
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    saveMogaoHallAProgress({ completed: ['bandits'], opened: true, noticeSeen: false }, progressStore);
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    saveMogaoHallAProgress({ completed: ['burning-house'], opened: true, noticeSeen: false }, progressStore);
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    saveMogaoHallAProgress({ completed: ['story-demo'], opened: false, noticeSeen: false }, progressStore);
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    saveMogaoHallAProgress({ completed: ['novice-story'], opened: false, noticeSeen: false }, progressStore);
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('view-a');
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-b', progressStore);
    expect(surface()).toBe('hall-b');
    progressStore.setItem(MOGAO_EXHIBIT_PROGRESS_KEY, JSON.stringify({
      version: 1, viewed: MOGAO_EXHIBIT.items.map(item => item.id),
    }));
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-b', progressStore);
    expect(surface()).toBe('view-b');
  });

  it('restores the A viewing platform for a legacy save that unlocked the old two-story gate', () => {
    const walkStore = memory(), progressStore = memory();
    const legacy = 'dunhuang:mogao-hall-a:progress:v1';
    const surface = () => JSON.parse(walkStore.getItem(MOGAO_EXHIBIT_SESSION_KEY)!).walkSurface;
    progressStore.setItem(`${legacy}:bandits`, 'complete');
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    saveMogaoHallAProgress({ completed: ['burning-house'], opened: true, noticeSeen: false }, progressStore);
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('hall-a');
    progressStore.setItem(`${legacy}:burning-house`, 'complete');
    initializeMogaoExhibitPreviewSession(walkStore, 'upper-a', progressStore);
    expect(surface()).toBe('view-a');
  });

  it('defers the A viewing assets when the player approaches the locked mouth', () => {
    const profile = worldPreviewResourceProfile('/mogao-exhibit-v001.html')!;
    const position = point(17, 8.11, -13);
    const context = { profile, position, terrain: true, upper: true, surfaceId: 'hall-a' };
    expect(previewRegionAt(context)).toBeNull();
    expect(previewApproachRegions(context, false, false)).toEqual([]);
    expect(previewApproachRegions(context, false, true)).toEqual(['cliff-interior']);
    const stationary = { ...context, position: point(21.9, 8.11, -16.9) };
    expect(previewApproachRegions(stationary, false, false)).toEqual([]);
    expect(previewApproachRegions(stationary, false, true)).toEqual(['cliff-interior']);
    expect(previewApproachRegions(stationary, false)).toEqual([]);
    expect(previewRegionAt({ ...context, surfaceId: 'view-link-a' })).toBe('cliff-interior');
  });

  it('shows a noninteractive dark recess after the gate fades until the room has attached', () => {
    const root = new THREE.Scene();
    const scene = createMogaoExhibitScene(root, { hallAGateLocked: true, gateLocked: false, viewingRoomReady: false });
    try {
      expect(scene.inspect().viewingRecess).toEqual({ hallA: true, hallB: true });
      scene.update(point(21.9, 8.11, -16.9), 'hall-a', 0, false, true, false);
      expect(scene.inspect().hallAGate).toEqual({ strength: 0, visible: false });
      expect(scene.inspect().viewingRecess.hallA).toBe(true);
      const recess = root.getObjectByName('mogao-hall-a-viewing-recess')!;
      expect(recess.position.x).toBeLessThan(MOGAO_HALL_A_BUDDHA_GATE.min[0]);
      root.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(17, 9.6, -12.8), new THREE.Vector3(-1, 0, 0));
      expect(ray.intersectObject(recess)).toHaveLength(0);
      scene.setViewingRoomReady();
      expect(scene.inspect().viewingRecess).toEqual({ hallA: false, hallB: false });
    } finally {
      scene.dispose();
    }
  });
});
