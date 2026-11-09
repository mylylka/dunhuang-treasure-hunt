import * as THREE from 'three';
import { MUSIC_COURTYARD_TREE } from '../content/world/music-courtyard-tree-v001';
import { clearCameraPosition, type CameraSpace } from './camera';
import type { UpperSolid } from './mogao-upper-navigation';
import { musicInteriorCameraSolids, musicInteriorFromWorld, musicInteriorToWorld, MUSIC_INTERIOR_LAYOUT } from './music-interior-navigation';

// The true door holes, slab and individual stair treads replace the old closed
// building proxy. Camera and actors therefore agree about what is open.
export function createMusicInteriorCameraSpace(solids: readonly UpperSolid[]): CameraSpace {
  return {
    boxes: [...solids, MUSIC_COURTYARD_TREE.trunkBounds].map(box => new THREE.Box3(
      new THREE.Vector3(...box.min as [number, number, number]),
      new THREE.Vector3(...box.max as [number, number, number]),
    ).expandByScalar(.22)),
    cylinders: [],
  };
}
const legacySpace = createMusicInteriorCameraSpace(musicInteriorCameraSolids);
export function musicInteriorFollowPose(x:number, floor:number, z:number, yaw:number, surfaceId?:string|null,
  previousPosition?:THREE.Vector3, space = legacySpace) {
  const stair = surfaceId === 'music-stair';
  const target = new THREE.Vector3(x, floor + (stair ? 1.3 : 1.55), z);
  const arm = stair ? 2.8 : 4.2;
  const desired = new THREE.Vector3(x + Math.sin(yaw) * arm, floor + (stair ? 1.7 : 2.7), z + Math.cos(yaw) * arm);
  if (stair) {
    const local = musicInteriorFromWorld(desired);
    const flight = MUSIC_INTERIOR_LAYOUT.surfaces.find(s => s.id === 'music-stair')!;
    // Follow the grade behind the traveller, keeping a descending camera above
    // the steps rather than placing it inside the uphill stair flight.
    if (local.z >= flight.minZ && local.z <= flight.maxZ) {
      const y = flight.y + (flight.endY! - flight.y) * THREE.MathUtils.clamp((local.x-flight.minX)/(flight.maxX-flight.minX),0,1);
      desired.y = musicInteriorToWorld({x:local.x,y:y+1.7,z:local.z}).y;
    }
  }
  if (!stair) {
    let best = settleMusicInteriorCamera(target,desired,space), score = best.distanceTo(target);
    // A porch column may be directly behind the player. A modest shoulder shift
    // keeps the traveller visible without moving through that real column.
    if (score < 3.8) for (const angle of [-.45,.45,-.85,.85]) {
      const candidate = settleMusicInteriorCamera(target,new THREE.Vector3(
        x+Math.sin(yaw+angle)*arm,desired.y,z+Math.cos(yaw+angle)*arm),space);
      const candidateScore = candidate.distanceTo(target)-Math.abs(angle)*.35
        -(previousPosition?Math.min(3,candidate.distanceTo(previousPosition))*.05:0);
      if(candidateScore>score){score=candidateScore;best=candidate;}
    }
    return {target,position:best};
  }
  return {target, position:desired};
}
export function settleMusicInteriorCamera(target:THREE.Vector3, desired:THREE.Vector3, space = legacySpace) {
  const a = musicInteriorFromWorld(target), b = musicInteriorFromWorld(desired);
  const clear = clearCameraPosition(new THREE.Vector3(a.x,a.y,a.z),new THREE.Vector3(b.x,b.y,b.z),space);
  const p = musicInteriorToWorld(clear);
  return new THREE.Vector3(p.x,p.y,p.z);
}
