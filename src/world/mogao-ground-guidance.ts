import { toTerrainPoint } from '../content/world/terrain-layout-v001';
import { BUDDHA_HEAD } from './buddha-gaze';
import { MOGAO_EXHIBIT_UPPER_LAYOUT, upperFromWorld, type UpperWalkState } from './mogao-upper-navigation';
import type { WorldCheckpoint } from './types';

const tunnel = MOGAO_EXHIBIT_UPPER_LAYOUT.surfaces.find(surface => surface.id === 'entry-tunnel')!;
const gateway = MOGAO_EXHIBIT_UPPER_LAYOUT.gateways.find(entrance => entrance.surfaceId === tunnel.id)!;
const buddha = toTerrainPoint('cliff', BUDDHA_HEAD);
const facingTolerance = Math.cos(Math.PI / 4);

function nearInnerDoor({ position, surfaceId }: UpperWalkState) {
  if (surfaceId !== 'ground') return false;
  const { x, z } = upperFromWorld(position);
  return x >= tunnel.minX - 1.2 && x <= tunnel.maxX + 1.2
    && z >= tunnel.minZ - 4.5 && z <= tunnel.minZ + .01;
}

/** Follow an actual outdoor-to-tunnel crossing before arming a single prompt. */
export function createMogaoGroundGuidance() {
  let enteredTunnel = false;
  let armed = false;
  function dismiss() { enteredTunnel = false; armed = false; }

  return {
    update(before: UpperWalkState, after: UpperWalkState) {
      if (after.surfaceId === null) { dismiss(); return; }
      if (before.surfaceId === null && after.surfaceId === 'entry-tunnel') {
        const outside = upperFromWorld(before.position), inside = upperFromWorld(after.position);
        enteredTunnel = outside.x >= gateway.minX && outside.x <= gateway.maxX
          && outside.z >= gateway.minZ && outside.z <= gateway.maxZ && inside.z < outside.z;
      }
      if (before.surfaceId === 'entry-tunnel' && after.surfaceId === 'ground') {
        armed = enteredTunnel && nearInnerDoor(after);
        enteredTunnel = false;
      }
      if (armed && !nearInnerDoor(after)) armed = false;
    },
    visible({ position, heading, cameraYaw }: Pick<WorldCheckpoint, 'position' | 'heading' | 'cameraYaw'>) {
      if (!armed) return false;
      const towardBuddha = Math.atan2(position.x - buddha.x, position.z - buddha.z);
      return Math.cos(heading - towardBuddha) >= facingTolerance
        && Math.cos(cameraYaw - towardBuddha) >= facingTolerance;
    },
    dismiss,
  };
}
