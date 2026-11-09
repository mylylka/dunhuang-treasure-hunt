import * as THREE from 'three';
import layout from '../content/world/mogao-upper-v002.json';
import exhibitLayout from '../content/world/mogao-upper-v003.json';
import { clearCameraPosition, type CameraBoxDefinition } from './camera';
import { MOGAO_EXHIBIT_UPPER_LAYOUT, MOGAO_UPPER_LAYOUT, upperBuddhaGateIndex, upperBuddhaGateSolids, upperFromWorld, upperSurfaceHeightAt, upperToWorld } from './mogao-upper-navigation';
import { isUpperRailing } from './mogao-upper-presentation';

// Floor-aware camera volumes come from the same authored geometry as the stairs.
// The old ground-only cliff box would seal every new doorway and upper room.
const volumes = (layout as unknown as { cameraSolids?: CameraBoxDefinition[]; solids: CameraBoxDefinition[] });
// Removed rail meshes must not continue to push the camera from empty space.
const definitions = (volumes.cameraSolids ?? volumes.solids).filter(box => !isUpperRailing(box.id));
const cameraBox = ({ min, max }: { min: readonly number[]; max: readonly number[] }) => new THREE.Box3(
  new THREE.Vector3(min[0], min[1], min[2]), new THREE.Vector3(max[0], max[1], max[2]),
).expandByScalar(.22);
const boxes = definitions.map(cameraBox);
const exhibitBoxes = exhibitLayout.cameraSolids.filter(box => !isUpperRailing(box.id)).map(cameraBox);
const gateBoxes = upperBuddhaGateSolids.map(gates => gates.map(cameraBox));
const spaces = [boxes, exhibitBoxes].map(base =>
  gateBoxes.map(gates => ({ boxes: gates.length ? [...base, ...gates] : base, cylinders: [] })));
const cameraSpace = (bLocked = false, exhibit = false, aLocked = false) =>
  spaces[Number(exhibit)][upperBuddhaGateIndex(bLocked, aLocked)];

export interface UpperFollowOptions {
  surfaceId?: string | null;
  travelHeading?: number;
  /** Disable automatic stair-axis / shoulder selection during manual looking. */
  assist?: boolean;
  previousPosition?: THREE.Vector3;
  buddhaGateLocked?: boolean;
  hallAGateLocked?: boolean;
  exhibit?: boolean;
}

const surfaceMaps = [MOGAO_UPPER_LAYOUT, MOGAO_EXHIBIT_UPPER_LAYOUT].map(
  source => new Map(source.surfaces.map(surface => [surface.id, surface])));
export const isUpperStairSurface = (id?: string | null) => !!id && /^(flight|landing)-/.test(id);

export function upperFollowPose(x: number, floor: number, z: number, yaw: number, options: UpperFollowOptions = {}) {
  const surfaces = surfaceMaps[Number(!!options.exhibit)];
  const surface = options.surfaceId ? surfaces.get(options.surfaceId) : undefined;
  if (surface && isUpperStairSurface(surface.id)) {
    // Aim at the torso, with a short eye-height arm. The outdoor high boom hits
    // the next landing's underside and collapses into the traveller's head.
    const target = new THREE.Vector3(x, floor + 1.25, z);
    const local = upperFromWorld({ x, y: floor, z });
    const localTarget = new THREE.Vector3(local.x, local.y + 1.25, local.z);
    const assist = options.assist !== false;
    // Runtime supplies an eased heading; snapping to the next ramp axis would
    // undo that easing and whip the view at the single switchback.
    const heading = assist ? options.travelHeading ?? yaw : yaw;
    const support = new Set([surface.id, ...surface.neighbors]);
    for (const id of [...support]) for (const neighbor of surfaces.get(id)?.neighbors ?? []) support.add(neighbor);
    const nearby = [...support].map(id => surfaces.get(id)).filter(s => !!s);
    let best = target.clone(), bestScore = -Infinity;
    // At the turn select the clear shoulder instead of retracting to 50 cm.
    // Manual looking keeps its requested direction, including both vertical axes.
    for (const angle of assist ? [0, -.5, .5, -1, 1, -1.5, 1.5] : [0]) {
      const direction = heading + angle;
      const desired = new THREE.Vector3(x + Math.sin(direction) * 2.4, floor + 1.6, z + Math.cos(direction) * 2.4);
      const p = upperFromWorld(desired);
      const under = nearby.filter(s => p.x >= s.minX && p.x <= s.maxX && p.z >= s.minZ && p.z <= s.maxZ)
        .map(s => upperSurfaceHeightAt(s, p))
        .sort((a, b) => Math.abs(a - local.y) - Math.abs(b - local.y))[0];
      // Follow the current flight grade, never the unrelated floor overhead.
      p.y = (under ?? local.y) + 1.6;
      const clear = clearCameraPosition(localTarget, new THREE.Vector3(p.x, p.y, p.z),
        cameraSpace(options.buddhaGateLocked, options.exhibit, options.hallAGateLocked));
      const world = upperToWorld(clear);
      const position = new THREE.Vector3(world.x, world.y, world.z);
      const arm = position.distanceTo(target);
      const continuity = options.previousPosition ? Math.min(3, position.distanceTo(options.previousPosition)) * .08 : 0;
      const score = Math.min(2.4, arm) - Math.abs(angle) * .1 - continuity;
      if (score > bestScore) { bestScore = score; best = position; }
    }
    return { target, position: best };
  }
  const target = new THREE.Vector3(x, floor + 1.65, z);
  return { target, position: target.clone().add(new THREE.Vector3(Math.sin(yaw) * 4.5, 1.1, Math.cos(yaw) * 4.5)) };
}

/** Apply again after camera smoothing so corners cannot be cut during a turn. */
export function settleUpperCamera(target: THREE.Vector3, desired: THREE.Vector3,
  buddhaGateLocked = false, exhibit = false, hallAGateLocked = false) {
  const a = upperFromWorld(target), b = upperFromWorld(desired);
  const clear = clearCameraPosition(new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z),
    cameraSpace(buddhaGateLocked, exhibit, hallAGateLocked));
  const p = upperToWorld(clear);
  return new THREE.Vector3(p.x, p.y, p.z);
}
