import config from '../content/world/music-companion-v001.json';
import { PLAYER_RADIUS, movePlayer, type WorldCollider } from './movement';
import { TERRAIN_BOUNDS, TERRAIN_REGIONS } from './terrain-rules-v001';
import {
  legacyMusicInteriorNavigation, musicInteriorToWorld, type MusicInteriorNavigation, MUSIC_INTERIOR_LAYOUT,
} from './music-interior-navigation';
import type { UpperWalkState } from './mogao-upper-navigation';
import type { WorldPoint } from './types';

export interface MusicCompanionV2State {
  position: WorldPoint; surfaceId: string | null; height: number;
  heading: number; speed: number; distance: number; chasing: boolean;
  mode: 'idle' | 'following' | 'dialogue' | 'waiting'; settling: boolean;
  dialogue?: { id: number; text: string; elapsed: number; duration: number };
}
export interface MusicCompanionV2Update {
  player: WorldPoint; playerSurfaceId?: string | null; playerHeading: number;
  playerMoving: boolean; playerRunning?: boolean; dt: number; blocked?: boolean;
  /** Only a completed stair assist may let the NPC finish reaching its landing. */
  assistArrived?: boolean;
}

const settings = config.follow, BODY_HEIGHT = 1.8;
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const copyWalk = (state: UpperWalkState): UpperWalkState => ({ position: { ...state.position }, surfaceId: state.surfaceId });
const normalize = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const surfaces = new Map(MUSIC_INTERIOR_LAYOUT.surfaces.map(surface => [surface.id, surface]));

/** World-coordinate two-floor companion; every step is owned by the layered navigator. */
export function createMusicCompanionV2(initial?: UpperWalkState, navigation: MusicInteriorNavigation = legacyMusicInteriorNavigation,
  options: { musicGuide?: boolean } = {}) {
  const { musicInteriorHeight, musicInteriorMove, musicInteriorPath, musicInteriorSafeState, musicInteriorValid } = navigation;
  const authored = navigation.layout.companionSpawn;
  const worldSpawn = musicInteriorToWorld({ x: authored.position[0], y: authored.position[1], z: authored.position[2] });
  const defaultSpawn: UpperWalkState = { position: { x: worldSpawn.x, z: worldSpawn.z }, surfaceId: authored.surfaceId };
  const worldZone = musicInteriorToWorld(config.dialogueZone);
  const zone: WorldPoint = { x: worldZone.x, z: worldZone.z };
  let current: MusicCompanionV2State;
  let path: UpperWalkState[] = [], lastGoal: UpperWalkState | undefined;
  let active = false, repath = 0, zoneArmed = true, dialogueId = 0, settleRemaining = 0;
  let movementIntent: { heading: number; companionBlocked: boolean } | undefined;
  const walkState = (): UpperWalkState => ({ position: current.position, surfaceId: current.surfaceId });
  const snapshot = (): MusicCompanionV2State => ({ ...current, position: { ...current.position },
    ...(current.dialogue ? { dialogue: { ...current.dialogue } } : {}) });
  const spatialDistance = (a: UpperWalkState, b: UpperWalkState) => Math.hypot(distance(a.position, b.position), musicInteriorHeight(a) - musicInteriorHeight(b));

  function reset(spawn: UpperWalkState = initial ?? defaultSpawn) {
    const safe = musicInteriorValid(spawn) ? copyWalk(spawn) : musicInteriorSafeState(spawn.surfaceId);
    current = { ...safe, height: musicInteriorHeight(safe), heading: authored.heading + TERRAIN_REGIONS.music.yaw,
      speed: 0, distance: settings.distance, mode: 'idle', chasing: false, settling: false };
    path = []; lastGoal = undefined; active = false; repath = 0; zoneArmed = true;
    movementIntent = undefined; settleRemaining = 0;
  }
  reset();

  function finishDialogue() {
    current.dialogue = undefined; current.mode = 'idle'; current.speed = 0;
    current.chasing = false; current.settling = false; active = false; path = [];
    movementIntent = undefined; settleRemaining = 0;
  }
  function cancelSettling() {
    settleRemaining = 0; current.settling = false;
  }

  /** Swept XZ separation applies only where the bodies overlap vertically. */
  function bodyClear(from: UpperWalkState, to: UpperWalkState, other: UpperWalkState) {
    const a = musicInteriorHeight(from), b = musicInteriorHeight(to), otherY = musicInteriorHeight(other);
    let low = 0, high = 1;
    if (Math.abs(b - a) < 1e-8) {
      if (Math.abs(a - otherY) >= BODY_HEIGHT - .03) return true;
    } else {
      const t0 = (otherY - BODY_HEIGHT + .03 - a) / (b - a);
      const t1 = (otherY + BODY_HEIGHT - .03 - a) / (b - a);
      low = Math.max(0, Math.min(t0, t1)); high = Math.min(1, Math.max(t0, t1));
      if (low >= high) return true;
    }
    const dx = to.position.x - from.position.x, dz = to.position.z - from.position.z;
    const length2 = dx * dx + dz * dz;
    const t = length2 ? Math.max(low, Math.min(high,
      ((other.position.x - from.position.x) * dx + (other.position.z - from.position.z) * dz) / length2)) : low;
    return Math.hypot(from.position.x + dx * t - other.position.x, from.position.z + dz * t - other.position.z)
      >= settings.minimumSeparation - 1e-5;
  }
  function personCollider(position: WorldPoint): WorldCollider {
    const radius = settings.minimumSeparation - PLAYER_RADIUS;
    return { id: 'temporary-companion-v2-body', minX: position.x - radius, maxX: position.x + radius,
      minZ: position.z - radius, maxZ: position.z + radius, height: BODY_HEIGHT, circle: { ...position, radius } };
  }
  function moveWithPerson(from: UpperWalkState, delta: WorldPoint, other: UpperWalkState) {
    const length = Math.hypot(delta.x, delta.z);
    if (!Number.isFinite(length) || length < 1e-9) return { walk: copyWalk(from), terrain: copyWalk(from), companionBlocked: false };
    const count = Math.max(1, Math.ceil(length / .16)), steps = Math.min(count, 128);
    const step = { x: delta.x / count, z: delta.z / count };
    let result = copyWalk(from), terrain = copyWalk(from), companionBlocked = false;
    for (let i = 0; i < steps; i++) {
      const next = musicInteriorMove(result, step); terrain = next;
      if (bodyClear(result, next, other)) { result = next; continue; }
      companionBlocked = true;
      const body = movePlayer(result.position, { x: next.position.x - result.position.x, z: next.position.z - result.position.z },
        [personCollider(other.position)], TERRAIN_BOUNDS);
      const slid = musicInteriorMove(result, { x: body.x - result.position.x, z: body.z - result.position.z });
      if (bodyClear(result, slid, other)) result = slid;
    }
    return { walk: result, terrain, companionBlocked };
  }
  function candidate(player: UpperWalkState, offset: WorldPoint): UpperWalkState | null {
    const target = { position: { x: player.position.x + offset.x, z: player.position.z + offset.z }, surfaceId: player.surfaceId };
    if (options.musicGuide) {
      // A ground surface also covers the ramp footprint. Resolve the actual
      // uphill join before accepting a same-layer goal below the guide's feet.
      const joined = musicInteriorMove(player, offset);
      if (distance(joined.position, target.position) < .025 && musicInteriorValid(joined)) return joined;
    }
    if (musicInteriorValid(target)) return target;
    // At a stair/landing seam the formation point can lie on the adjoining face.
    const joined = musicInteriorMove(player, offset);
    return distance(joined.position, target.position) < .025 && musicInteriorValid(joined) ? joined : null;
  }
  function goals(player: UpperWalkState, heading: number) {
    const forward = { x: -Math.sin(heading), z: -Math.cos(heading) }, side = { x: -Math.cos(heading), z: Math.sin(heading) };
    const idealOffset = { x: forward.x * settings.forwardOffset + side.x * settings.sideOffset,
      z: forward.z * settings.forwardOffset + side.z * settings.sideOffset };
    const ideal = candidate(player, idealOffset);
    const ahead = (current.position.x - player.position.x) * forward.x + (current.position.z - player.position.z) * forward.z >= 0;
    // A narrow passage keeps the existing front/back order, including a reversal
    // on the ramp, instead of making the two people try to exchange places.
    const along = (ahead ? 1 : -1) * settings.distance;
    const queue = [candidate(player, { x: forward.x * along, z: forward.z * along }),
      candidate(player, { x: -forward.x * along, z: -forward.z * along })];
    const angle = Math.atan2(idealOffset.x, idealOffset.z);
    const alternatives = [-.5, .5, -1, 1, -1.5, 1.5, Math.PI].map(offset =>
      candidate(player, { x: Math.sin(angle + offset) * settings.distance, z: Math.cos(angle + offset) * settings.distance }));
    return { ideal, alternatives: [...queue, ...alternatives].filter((p): p is UpperWalkState => !!p) };
  }
  function routeTo(goal: UpperWalkState, player: UpperWalkState, from = walkState()): UpperWalkState[] | null {
    const route = musicInteriorPath(from, goal);
    if (!route) return null;
    const points = [from, ...route];
    if (points.some((state, i) => i > 0 && !bodyClear(points[i - 1], state, player))) return null;
    return route.filter((state, i) => i > 0 || spatialDistance(state, from) > .02).map(copyWalk);
  }
  function directRoute(goal: UpperWalkState, player: UpperWalkState): UpperWalkState[] | null {
    const start = copyWalk(walkState()), length = distance(start.position, goal.position);
    if (length > 8 || Math.abs(musicInteriorHeight(start) - musicInteriorHeight(goal)) > length * Math.tan(Math.PI / 5) + .045) return null;
    const count = Math.max(1, Math.ceil(length / .16));
    let previous = start;
    for (let index = 1; index <= count; index++) {
      const expected = { x: start.position.x + (goal.position.x - start.position.x) * index / count,
        z: start.position.z + (goal.position.z - start.position.z) * index / count };
      const moved = musicInteriorMove(previous, { x: expected.x - previous.position.x, z: expected.z - previous.position.z });
      if (distance(moved.position, expected) > .002 || !bodyClear(previous, moved, player)) return null;
      previous = moved;
    }
    // At two adjacent level faces their shared seam may retain the old ID.
    // The actual resolver's layer wins; equal XZ on another floor never qualifies.
    return Math.abs(musicInteriorHeight(previous) - musicInteriorHeight(goal)) < .02 ? [previous] : null;
  }
  function bypassPlayer(ideal: UpperWalkState, player: UpperWalkState): UpperWalkState[] | null {
    const start = copyWalk(walkState());
    const angle = Math.atan2(start.position.x - player.position.x, start.position.z - player.position.z);
    const endAngle = Math.atan2(ideal.position.x - player.position.x, ideal.position.z - player.position.z);
    const radius = settings.minimumSeparation + .15;
    let best: UpperWalkState[] | null = null, bestLength = Infinity;
    // Plan a complete, collision-checked arc around the player's body. Repeatedly
    // pursuing a single tangential point can alternate sides at a stair seam and
    // never reach the landing, even though every individual step is legal.
    for (const sign of [-1, 1]) {
      let sweep = normalize(endAngle - angle);
      if (sign < 0 && sweep > 0) sweep -= Math.PI * 2;
      if (sign > 0 && sweep < 0) sweep += Math.PI * 2;
      const steps = Math.max(1, Math.ceil(Math.abs(sweep) / .22));
      const waypoints: UpperWalkState[] = [];
      for (let i = 0; i <= steps; i++) {
        const direction = angle + sweep * i / steps;
        const point = candidate(player, { x: Math.sin(direction) * radius, z: Math.cos(direction) * radius });
        if (!point) { waypoints.length = 0; break; }
        waypoints.push(point);
      }
      if (!waypoints.length) continue;
      waypoints.push(ideal);
      let from = start, route: UpperWalkState[] = [], length = 0, valid = true;
      for (const point of waypoints) {
        if (spatialDistance(from, point) < .02) continue;
        const part = routeTo(point, player, from);
        if (!part) { valid = false; break; }
        for (const step of part) { length += spatialDistance(from, step); from = step; }
        route.push(...part);
      }
      if (valid && route.length && length < bestLength) { best = route; bestLength = length; }
    }
    return best;
  }
  function plan(player: UpperWalkState, desired: ReturnType<typeof goals>) {
    if (desired.ideal) {
      const direct = routeTo(desired.ideal, player);
      if (direct) return { route: direct, goal: desired.ideal };
      const bypass = bypassPlayer(desired.ideal, player);
      if (bypass) return { route: bypass, goal: desired.ideal };
    }
    for (const goal of desired.alternatives) {
      // A nearby wall can invalidate the nominal side-by-side point. An
      // assisted arrival still needs the same full, checked bypass to its safe
      // fallback landing; trying only the straight segment leaves it on a step.
      const route = routeTo(goal, player) ?? (current.settling ? bypassPlayer(goal, player) : null);
      if (route) return { route, goal };
    }
    return null;
  }

  function update(input: MusicCompanionV2Update): MusicCompanionV2State {
    const dt = Number.isFinite(input.dt) ? Math.max(0, Math.min(.15, input.dt)) : 0;
    const intent = movementIntent; movementIntent = undefined;
    const player: UpperWalkState = { position: input.player, surfaceId: input.playerSurfaceId ?? null };
    current.height = musicInteriorHeight(walkState()); current.distance = spatialDistance(walkState(), player);
    current.speed = 0; current.chasing = false;
    if (input.blocked) {
      settleRemaining = 0; current.settling = false; active = false; path = [];
      if (!current.dialogue) current.mode = 'idle'; return snapshot();
    }
    if (input.assistArrived) settleRemaining = 8;
    settleRemaining = Math.max(0, settleRemaining - dt);
    if (settleRemaining > 0 && surfaces.get(current.surfaceId ?? '')?.kind !== 'ramp' &&
      Math.abs(current.height - musicInteriorHeight(player)) < .15 && current.distance <= settings.distance + .35) settleRemaining = 0;
    current.settling = settleRemaining > 0;
    const zoneDistance = distance(input.player, zone);
    if (zoneDistance > config.dialogueZone.radius + .25) zoneArmed = true;
    if (!options.musicGuide && zoneArmed && zoneDistance <= config.dialogueZone.radius && musicInteriorHeight(player) < TERRAIN_REGIONS.music.target.y + .15 && !current.dialogue) {
      zoneArmed = false; active = false; path = []; settleRemaining = 0;
      current.dialogue = { id: ++dialogueId, text: config.dialogueZone.text, elapsed: 0, duration: config.dialogueZone.duration };
    }
    if (current.dialogue) {
      current.mode = 'dialogue'; current.settling = false;
      current.heading = Math.atan2(current.position.x - input.player.x, current.position.z - input.player.z);
      current.dialogue.elapsed += dt;
      if (current.dialogue.elapsed < current.dialogue.duration) return snapshot();
      finishDialogue();
    }
    if (!player.surfaceId || !musicInteriorValid(player)) { current.mode = 'waiting'; active = false; path = []; return snapshot(); }
    if (!input.playerMoving && !intent?.companionBlocked && !current.settling) {
      current.mode = 'idle'; active = false; path = []; return snapshot();
    }
    let desired = goals(player, intent?.heading ?? input.playerHeading);
    if (current.settling) {
      const onLanding = (goal: UpperWalkState | null) => !!goal && surfaces.get(goal.surfaceId ?? '')?.kind === 'floor'
        && Math.abs(musicInteriorHeight(goal) - musicInteriorHeight(player)) < .15;
      // A valid queue point on the last stair is not an assisted arrival.
      desired = { ideal: onLanding(desired.ideal) ? desired.ideal : null, alternatives: desired.alternatives.filter(onLanding) };
    }
    const ideal = desired.ideal ?? desired.alternatives[0];
    if (!ideal) { current.mode = 'waiting'; active = false; path = []; return snapshot(); }
    const formationError = spatialDistance(walkState(), ideal);
    if (formationError <= settings.formationStopError || !active && formationError <= settings.formationStartError) {
      current.mode = 'idle'; active = false; path = []; return snapshot();
    }
    active = true; repath -= dt;
    const keepArrivalRoute = current.settling && !input.playerMoving && path.length > 0;
    const direct = keepArrivalRoute ? null : directRoute(ideal, player);
    if (direct) { path = direct; lastGoal = ideal; repath = settings.repathSeconds; }
    else if (!keepArrivalRoute && (!path.length || repath <= 0 || !lastGoal || lastGoal.surfaceId !== ideal.surfaceId || distance(lastGoal.position, ideal.position) > .7)) {
      const next = plan(player, desired); path = next?.route ?? []; lastGoal = next?.goal; repath = settings.repathSeconds;
    }
    const start = copyWalk(walkState()), catchingUp = current.distance > settings.catchupDistance;
    const desiredSpeed = catchingUp ? settings.catchupSpeed : input.playerRunning ? settings.runSpeed : settings.walkSpeed;
    let budget = desiredSpeed * dt;
    while (budget > 1e-6 && path.length) {
      const goal = path[0], remaining = distance(current.position, goal.position);
      if (remaining < .015) {
        if (Math.abs(musicInteriorHeight(goal) - current.height) > .12) { path = []; break; }
        path.shift(); continue;
      }
      const amount = Math.min(budget, remaining, .16);
      const moved = moveWithPerson(walkState(), { x: (goal.position.x - current.position.x) / remaining * amount,
        z: (goal.position.z - current.position.z) / remaining * amount }, player).walk;
      const progressed = distance(current.position, moved.position);
      current.position = moved.position; current.surfaceId = moved.surfaceId; current.height = musicInteriorHeight(moved); budget -= amount;
      if (progressed < amount * .3) { path = []; repath = 0; break; }
    }
    const moved = distance(start.position, current.position);
    current.speed = dt ? moved / dt : 0; current.distance = spatialDistance(walkState(), player);
    current.mode = moved > .0001 ? 'following' : 'idle'; current.chasing = moved > .0001 && catchingUp;
    if (moved > .0001) {
      const heading = Math.atan2(start.position.x - current.position.x, start.position.z - current.position.z);
      current.heading = normalize(current.heading + normalize(heading - current.heading) * (1 - Math.exp(-dt * 10)));
    }
    return snapshot();
  }

  return { get state() { return snapshot(); }, update, finishDialogue, reset, cancelSettling,
    facePlayer(player: WorldPoint) {
      current.heading = Math.atan2(current.position.x - player.x, current.position.z - player.z);
    },
    constrainPlayerMove(from: UpperWalkState, delta: WorldPoint): UpperWalkState {
      movementIntent = undefined;
      const next = moveWithPerson(from, delta, walkState());
      if (distance(from.position, next.terrain.position) > 1e-5) movementIntent = {
        heading: Math.atan2(from.position.x - next.terrain.position.x, from.position.z - next.terrain.position.z),
        companionBlocked: next.companionBlocked,
      };
      return copyWalk(next.walk);
    } };
}
