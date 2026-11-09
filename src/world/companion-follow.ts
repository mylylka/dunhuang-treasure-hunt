import config from '../content/world/music-companion-v001.json';
import { moveTerrainPlayer, toTerrainPoint, TERRAIN_BOUNDS, TERRAIN_REGIONS } from './terrain-rules-v001';
import { movePlayer, PLAYER_RADIUS, type WorldCollider } from './movement';
import { createMusicCompanionNavigation, inMusicCompanionArea, isMusicCompanionWalkable } from './companion-navigation';
import type { WorldPoint } from './types';

export const MUSIC_COMPANION_CONFIG = config;
export interface MusicCompanionState {
  position: WorldPoint; heading: number; speed: number;
  mode: 'idle' | 'following' | 'dialogue' | 'waiting';
  distance: number; chasing: boolean;
  dialogue?: { id: number; text: string; elapsed: number; duration: number };
}
export interface MusicCompanionUpdate { player: WorldPoint; playerHeading: number; playerMoving: boolean; playerRunning?: boolean; dt: number; blocked?: boolean }
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const point = (p: WorldPoint) => { const w = toTerrainPoint('music', p); return { x: w.x, z: w.z }; };
const normalize = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createMusicCompanion() {
  const nav = createMusicCompanionNavigation(), settings = config.follow, zone = point(config.dialogueZone);
  let current: MusicCompanionState;
  let path: WorldPoint[] = [], lastGoal: WorldPoint | undefined, repath = 0, active = false, zoneArmed = true, dialogueId = 0;
  let movementIntent: { heading: number; companionBlocked: boolean } | undefined;
  const snapshot = (): MusicCompanionState => ({ ...current, position: { ...current.position }, ...(current.dialogue ? { dialogue: { ...current.dialogue } } : {}) });
  function reset() {
    current = { position: point(config.spawn), heading: config.spawn.heading + TERRAIN_REGIONS.music.yaw, speed: 0, mode: 'idle', distance: distance(point(config.playerSpawn), point(config.spawn)), chasing: false };
    path = []; lastGoal = undefined; repath = 0; active = false; zoneArmed = true; movementIntent = undefined;
  }
  reset();
  function finishDialogue() { current.dialogue = undefined; current.mode = 'idle'; current.speed = 0; current.chasing = false; active = false; path = []; movementIntent = undefined; }
  function personCollider(position: WorldPoint): WorldCollider {
    const radius = settings.minimumSeparation - PLAYER_RADIUS;
    return { id: 'temporary-companion-body', minX: position.x - radius, maxX: position.x + radius, minZ: position.z - radius, maxZ: position.z + radius, height: 1.8, circle: { ...position, radius } };
  }
  function moveWithPerson(from: WorldPoint, delta: WorldPoint, other: WorldPoint, confined: boolean) {
    const terrain = moveTerrainPlayer(from, delta);
    const body = movePlayer(from, { x: terrain.x - from.x, z: terrain.z - from.z }, [personCollider(other)], TERRAIN_BOUNDS);
    const next = moveTerrainPlayer(from, { x: body.x - from.x, z: body.z - from.z });
    const personBlocked = distance(next, other) < settings.minimumSeparation - 1e-5;
    return {
      position: personBlocked || confined && !isMusicCompanionWalkable(next) ? { ...from } : next,
      terrain,
      companionBlocked: personBlocked || distance(terrain, body) > 1e-4,
    };
  }
  function goalCandidates(player: WorldPoint, heading: number): WorldPoint[] {
    const forward = { x: -Math.sin(heading), z: -Math.cos(heading) }, side = { x: -Math.cos(heading), z: Math.sin(heading) };
    const ideal = { x: player.x + forward.x * settings.forwardOffset + side.x * settings.sideOffset, z: player.z + forward.z * settings.forwardOffset + side.z * settings.sideOffset };
    const angle = Math.atan2(ideal.x - player.x, ideal.z - player.z);
    return [ideal, ...[-.5, .5, -1, 1, -1.5, 1.5, Math.PI].map(offset => ({ x: player.x + Math.sin(angle + offset) * settings.distance, z: player.z + Math.cos(angle + offset) * settings.distance }))];
  }
  function update(input: MusicCompanionUpdate): MusicCompanionState {
    const dt = Number.isFinite(input.dt) ? Math.max(0, Math.min(.15, input.dt)) : 0;
    // Consume once: a released key, pause or a wall-only block cannot keep a
    // previous avoidance request alive in a later frame.
    const intent = movementIntent; movementIntent = undefined;
    current.distance = distance(current.position, input.player); current.speed = 0; current.chasing = false;
    if (input.blocked) { if (!current.dialogue) current.mode = 'idle'; return snapshot(); }
    const insideArea = inMusicCompanionArea(input.player), zoneDistance = distance(input.player, zone);
    if (zoneDistance > config.dialogueZone.radius + .25) zoneArmed = true;
    if (insideArea && zoneArmed && zoneDistance <= config.dialogueZone.radius && !current.dialogue) {
      zoneArmed = false; active = false; path = [];
      current.dialogue = { id: ++dialogueId, text: config.dialogueZone.text, elapsed: 0, duration: config.dialogueZone.duration };
    }
    if (current.dialogue) {
      current.mode = 'dialogue';
      current.heading = Math.atan2(current.position.x - input.player.x, current.position.z - input.player.z);
      current.dialogue.elapsed += dt;
      if (current.dialogue.elapsed < current.dialogue.duration) return snapshot();
      finishDialogue();
    }
    if (!insideArea) { current.mode = 'waiting'; active = false; path = []; return snapshot(); }
    if (!input.playerMoving && !intent?.companionBlocked) { current.mode = 'idle'; active = false; path = []; return snapshot(); }
    // A player blocked by this body cannot turn their locomotion heading yet.
    // Let the companion safely yield towards the intended new formation first.
    const candidates = goalCandidates(input.player, intent?.heading ?? input.playerHeading);
    // A companion beside the player must move while its centre distance stays
    // nearly constant. Use formation error, rather than trailing-distance gates.
    const formationError = distance(current.position, candidates[0]);
    if (formationError <= settings.formationStopError || !active && formationError <= settings.formationStartError) {
      current.mode = 'idle'; active = false; path = []; return snapshot();
    }
    active = true; repath -= dt;
    if (nav.clear(current.position, candidates[0], input.player)) { path = [candidates[0]]; lastGoal = candidates[0]; repath = settings.repathSeconds; }
    else if (!path.length || repath <= 0 || !lastGoal || distance(lastGoal, candidates[0]) > .7) {
      path = [];
      for (const candidate of candidates) {
        const route = nav.findPath(current.position, candidate, input.player);
        if (route) { path = route; lastGoal = candidate; break; }
      }
      repath = settings.repathSeconds;
    }
    const start = { ...current.position };
    const catchingUp = current.distance > settings.catchupDistance;
    const desiredSpeed = catchingUp ? settings.catchupSpeed : input.playerRunning ? settings.runSpeed : settings.walkSpeed;
    let budget = desiredSpeed * dt;
    while (budget > 1e-6 && path.length) {
      const goal = path[0], remaining = distance(current.position, goal);
      if (remaining < settings.formationStopError * .5) { path.shift(); continue; }
      const amount = Math.min(budget, remaining, .18), delta = { x: (goal.x - current.position.x) / remaining * amount, z: (goal.z - current.position.z) / remaining * amount };
      const next = moveWithPerson(current.position, delta, input.player, true).position, progressed = distance(next, current.position);
      current.position = next; budget -= amount;
      if (progressed < amount * .3) { path = []; repath = 0; break; }
    }
    const moved = distance(start, current.position);
    current.speed = dt ? moved / dt : 0;
    current.distance = distance(current.position, input.player);
    current.mode = moved > .0001 ? 'following' : 'idle';
    current.chasing = moved > .0001 && catchingUp;
    if (moved > .0001) {
      const heading = Math.atan2(start.x - current.position.x, start.z - current.position.z);
      current.heading = normalize(current.heading + normalize(heading - current.heading) * (1 - Math.exp(-dt * 10)));
    }
    return snapshot();
  }
  return { get state() { return snapshot(); }, update, finishDialogue, reset,
    constrainPlayerMove(from: WorldPoint, delta: WorldPoint) {
      movementIntent = undefined;
      const next = moveWithPerson(from, delta, current.position, false), terrain = next.terrain;
      if (distance(from, terrain) > 1e-5) {
        movementIntent = {
          heading: Math.atan2(from.x - terrain.x, from.z - terrain.z),
          companionBlocked: next.companionBlocked,
        };
      }
      return next.position;
    } };
}
