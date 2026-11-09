import { describe, expect, it } from 'vitest';
import { createMusicCompanion, MUSIC_COMPANION_CONFIG } from '../../src/world/companion-follow';
import { isMusicCompanionWalkable } from '../../src/world/companion-navigation';
import { isTerrainWalkable, fromTerrainPoint, terrainSurfaceHeight, toTerrainPoint, TERRAIN_REGIONS, TERRAIN_RUN_SPEED, TERRAIN_WALK_SPEED } from '../../src/world/terrain-rules-v001';

const world = (x: number, z: number) => toTerrainPoint('music', { x, z });
const heading = -Math.PI / 2 + TERRAIN_REGIONS.music.yaw;
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

function walkPair(companion: ReturnType<typeof createMusicCompanion>, initial: { x: number; z: number }, goals: { x: number; z: number }[], playerRunning = false) {
  let player = { x: initial.x, z: initial.z }, playerHeading = heading, blockedFrames = 0;
  for (const goal of goals) {
    for (let frame = 0; frame < 500 && distance(player, goal) > .025; frame++) {
      const before = player, beforeCompanion = companion.state.position;
      const remaining = distance(player, goal), amount = Math.min((playerRunning ? TERRAIN_RUN_SPEED : TERRAIN_WALK_SPEED) / 30, remaining);
      const delta = { x: (goal.x - player.x) / remaining * amount, z: (goal.z - player.z) / remaining * amount };
      player = companion.constrainPlayerMove(player, delta);
      const moving = distance(before, player) * 30 > .05;
      if (moving) {
        const desired = Math.atan2(-delta.x, -delta.z);
        playerHeading += Math.atan2(Math.sin(desired - playerHeading), Math.cos(desired - playerHeading)) * (1 - Math.exp(-.5));
      } else blockedFrames++;
      const state = companion.update({ player, playerHeading, playerMoving: moving, playerRunning, dt: 1 / 30 });
      expect(isTerrainWalkable(player)).toBe(true);
      expect(isMusicCompanionWalkable(state.position)).toBe(true);
      expect(distance(player, state.position)).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(distance(beforeCompanion, state.position)).toBeLessThanOrEqual(7.6 / 30 + 1e-6);
    }
    expect(distance(player, goal)).toBeLessThan(.025);
  }
  return { player, blockedFrames };
}

function turnFixture() {
  const companion = createMusicCompanion();
  // Reach the measured NPC position through its ordinary formation API.
  for (let i = 0; i < 180; i++) companion.update({ player: world(52.911, -5.314), playerHeading: heading, playerMoving: true, dt: 1 / 30 });
  return companion;
}

describe('temporary music companion on the accepted ground floor', () => {
  it('walks alongside and slightly ahead while moving, then immediately idles with the player', () => {
    const companion = createMusicCompanion();
    expect(companion.state.distance).toBeGreaterThan(1.5);
    expect(companion.state.distance).toBeLessThan(2);
    let movingFrames = 0;
    const forward = { x: -Math.sin(heading), z: -Math.cos(heading) };
    const side = { x: -Math.cos(heading), z: Math.sin(heading) };
    for (let i = 0; i < 60; i++) {
      const player = world(44 + i * .06, -4);
      const state = companion.update({ player, playerHeading: heading, playerMoving: true, dt: 1 / 30 });
      expect(isMusicCompanionWalkable(state.position)).toBe(true);
      expect(state.distance).toBeGreaterThanOrEqual(1.4 - 1e-5);
      if (state.speed > 0) movingFrames++;
      if (i > 15) {
        const offset = { x: state.position.x - player.x, z: state.position.z - player.z };
        expect(offset.x * forward.x + offset.z * forward.z).toBeGreaterThan(.25);
        expect(offset.x * forward.x + offset.z * forward.z).toBeLessThan(.5);
        expect(offset.x * side.x + offset.z * side.z).toBeCloseTo(1.6, 1);
      }
    }
    expect(movingFrames).toBeGreaterThan(45);
    expect(companion.state.distance).toBeLessThan(2.1);
    const before = companion.state.position;
    const stopped = companion.update({ player: world(47.54, -4), playerHeading: heading, playerMoving: false, dt: .1 });
    expect(stopped.position).toEqual(before);
    expect(stopped.speed).toBe(0);
    expect(stopped.mode).toBe('idle');
  });

  it('catches up at a bounded speed without a positional jump and returns cloned snapshots', () => {
    const companion = createMusicCompanion(), player = world(55, -4), before = companion.state.position;
    const state = companion.update({ player, playerHeading: heading, playerMoving: true, dt: .1 });
    expect(state.chasing).toBe(true);
    expect(state.speed).toBeGreaterThan(MUSIC_COMPANION_CONFIG.follow.walkSpeed);
    expect(distance(before, state.position)).toBeLessThanOrEqual(7.6 * .1 + 1e-6);
    state.position.x = 1e6;
    expect(companion.state.position.x).not.toBe(1e6);
    const checkpoint = companion.state.position;
    companion.update({ player, playerHeading: heading, playerMoving: true, dt: 10 });
    expect(distance(checkpoint, companion.state.position)).toBeLessThanOrEqual(7.6 * .15 + 1e-6);
  });

  it.each([60, 120])('keeps walking at %ifps inside the old trailing-distance gate', fps => {
    const companion = createMusicCompanion();
    for (let i = 0; i < fps * 2; i++) {
      const player = world(44 + i * 1.8 / fps, -4);
      const state = companion.update({ player, playerHeading: heading, playerMoving: true, dt: 1 / fps });
      if (i > fps * .5) {
        expect(state.mode).toBe('following');
        expect(state.speed).toBeGreaterThan(1.7);
        const offset = { x: state.position.x - player.x, z: state.position.z - player.z };
        expect(-Math.sin(heading) * offset.x - Math.cos(heading) * offset.z).toBeCloseTo(.4, 2);
        expect(-Math.cos(heading) * offset.x + Math.sin(heading) * offset.z).toBeCloseTo(1.6, 2);
        expect(state.distance).toBeLessThan(1.7);
      }
    }
  });

  it('runs continuously beside the player without calling ordinary running a chase, then walks and stops', () => {
    const companion = createMusicCompanion(), fps = 60, runFrames = fps * 1.25;
    // This clear front-courtyard lane avoids the dialogue circle while covering
    // a continuous 8.75m run before the authored drum/gong furniture cluster.
    for (let i = 0; i < 120; i++) companion.update({ player: world(44, -2), playerHeading: heading, playerMoving: true, dt: 1 / fps });
    let player: { x: number; z: number } = world(44, -2);
    expect(MUSIC_COMPANION_CONFIG.follow.runSpeed).toBeGreaterThanOrEqual(TERRAIN_RUN_SPEED);
    expect(MUSIC_COMPANION_CONFIG.follow.runSpeed).toBeLessThanOrEqual(MUSIC_COMPANION_CONFIG.follow.catchupSpeed);
    for (let frame = 0; frame < runFrames; frame++) {
      const before = companion.state.position, destination = world(44 + (frame + 1) * TERRAIN_RUN_SPEED / fps, -2);
      player = companion.constrainPlayerMove(player, { x: destination.x - player.x, z: destination.z - player.z });
      expect(distance(player, destination)).toBeLessThan(1e-6);
      const state = companion.update({ player, playerHeading: heading, playerMoving: true, playerRunning: true, dt: 1 / fps });
      expect(state.chasing).toBe(false);
      expect(isTerrainWalkable(player)).toBe(true);
      expect(isMusicCompanionWalkable(state.position)).toBe(true);
      expect(state.distance).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(distance(before, state.position)).toBeLessThanOrEqual(MUSIC_COMPANION_CONFIG.follow.runSpeed / fps + 1e-6);
      if (frame > fps * .5) {
        const offset = { x: state.position.x - player.x, z: state.position.z - player.z };
        expect(state.mode).toBe('following');
        expect(state.speed).toBeCloseTo(TERRAIN_RUN_SPEED, 2);
        expect(-Math.sin(heading) * offset.x - Math.cos(heading) * offset.z).toBeCloseTo(.4, 2);
        expect(-Math.cos(heading) * offset.x + Math.sin(heading) * offset.z).toBeCloseTo(1.6, 2);
      }
    }
    for (let frame = 0; frame < fps; frame++) {
      const destination = world(44 + runFrames * TERRAIN_RUN_SPEED / fps + (frame + 1) * TERRAIN_WALK_SPEED / fps, -2);
      player = companion.constrainPlayerMove(player, { x: destination.x - player.x, z: destination.z - player.z });
      const state = companion.update({ player, playerHeading: heading, playerMoving: true, playerRunning: false, dt: 1 / fps });
      expect(state.chasing).toBe(false);
      expect(state.speed).toBeCloseTo(TERRAIN_WALK_SPEED, 2);
    }
    const before = companion.state.position;
    const stopped = companion.update({ player, playerHeading: heading, playerMoving: false, playerRunning: true, dt: 1 / fps });
    expect(stopped.mode).toBe('idle'); expect(stopped.speed).toBe(0);
    expect(stopped.chasing).toBe(false); expect(stopped.position).toEqual(before);
  });

  it('keeps both running bodies collision-safe through the courtyard turn and around the pipa rack', () => {
    const companion = createMusicCompanion();
    const result = walkPair(companion, world(44, -4), [world(47, -4), world(51, -4), world(54, -5.5), world(54, -9.2), world(61, -9.2), world(61, -7.8)], true);
    expect(distance(result.player, world(61, -7.8))).toBeLessThan(.025);
  });

  it('routes around the real pipa rack instead of chasing through its collision envelope', () => {
    const companion = createMusicCompanion();
    for (let i = 0; i < 180; i++) companion.update({ player: world(54, -7.8), playerHeading: heading, playerMoving: true, dt: 1 / 30 });
    expect(fromTerrainPoint('music', companion.state.position).x).toBeLessThan(56);
    let passedRack = false;
    for (let i = 0; i < 240; i++) {
      const before = companion.state.position;
      const state = companion.update({ player: world(61, -7.8), playerHeading: heading, playerMoving: true, dt: 1 / 30 });
      const local = fromTerrainPoint('music', state.position);
      expect(isTerrainWalkable(state.position)).toBe(true);
      expect(terrainSurfaceHeight(state.position)).toBeCloseTo(2.5);
      expect(state.distance).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(distance(before, state.position)).toBeLessThanOrEqual(7.6 / 30 + 1e-6);
      if (local.x > 56.3 && local.x < 58.9) {
        passedRack = true;
        expect(local.z < -9.04 || local.z > -6.56).toBe(true);
      }
    }
    expect(passedRack).toBe(true);
    expect(companion.state.distance).toBeLessThan(2.05);
    expect(fromTerrainPoint('music', companion.state.position).x).toBeGreaterThan(60.9);
  });

  it('preserves furniture/wall collision and prevents the player backing through the companion', () => {
    const companion = createMusicCompanion();
    let player = world(44, -4), destination = companion.state.position;
    for (let i = 0; i < 40; i++) {
      const length = distance(player, destination);
      player = { ...player, ...companion.constrainPlayerMove(player, { x: (destination.x - player.x) / length * .08, z: (destination.z - player.z) / length * .08 }) };
      expect(distance(player, destination)).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(isTerrainWalkable(player)).toBe(true);
    }
    const from = world(50, 0), to = world(50, 4);
    const wall = companion.constrainPlayerMove(from, { x: to.x - from.x, z: to.z - from.z });
    expect(isTerrainWalkable(wall)).toBe(true);
    // Front wall Z=3, half-depth .25, authored padding .21, body radius .69.
    expect(fromTerrainPoint('music', wall).z).toBeLessThanOrEqual(1.85 + 1e-5);
    const beyondPrototype = world(46, -10.5), same = companion.constrainPlayerMove(beyondPrototype, { x: 0, z: 0 });
    expect(same.x).toBe(beyondPrototype.x);
    expect(same.z).toBe(beyondPrototype.z);
  });

  it('yields at the measured 1.4069m turn deadlock before the player can update their heading', () => {
    const companion = turnFixture(), player = world(53.91, -5.641);
    const local = fromTerrainPoint('music', companion.state.position);
    expect(local.x).toBeCloseTo(53.311, 6);
    expect(local.z).toBeCloseTo(-6.914, 6);
    expect(distance(player, companion.state.position)).toBeCloseTo(1.40688663367, 6);
    const result = walkPair(companion, player, [world(54, -9.2)]);
    expect(result.blockedFrames).toBeGreaterThan(0);
    expect(fromTerrainPoint('music', result.player).z).toBeCloseTo(-9.2, 1);
  });

  it('continues through the courtyard turn while preserving both body and furniture collision', () => {
    const companion = createMusicCompanion();
    const result = walkPair(companion, world(44, -4), [world(47, -4), world(51, -4), world(54, -5.5), world(54, -9.2)]);
    expect(distance(result.player, world(54, -9.2))).toBeLessThan(.025);
  });

  it('discards yield intent on key release, consumes it once, and does not yield against a wall alone', () => {
    const companion = turnFixture(), player = world(53.91, -5.641), goal = world(53.91, -5.701);
    const delta = { x: goal.x - player.x, z: goal.z - player.z }, before = companion.state.position;
    companion.constrainPlayerMove(player, delta);
    companion.constrainPlayerMove(player, { x: 0, z: 0 });
    const released = companion.update({ player, playerHeading: heading, playerMoving: false, dt: 1 / 30 });
    expect(released.mode).toBe('idle'); expect(released.position).toEqual(before);
    companion.constrainPlayerMove(player, delta);
    const paused = companion.update({ player, playerHeading: heading, playerMoving: false, dt: 1 / 30, blocked: true });
    expect(paused.position).toEqual(before);
    const resumedWithoutInput = companion.update({ player, playerHeading: heading, playerMoving: false, dt: 1 / 30 });
    expect(resumedWithoutInput.mode).toBe('idle'); expect(resumedWithoutInput.position).toEqual(before);
    const wallFrom = world(68.84, -6), wallTo = world(69.5, -6);
    const wall = companion.constrainPlayerMove(wallFrom, { x: wallTo.x - wallFrom.x, z: wallTo.z - wallFrom.z });
    const stopped = companion.update({ player: wall, playerHeading: heading, playerMoving: false, dt: 1 / 30 });
    expect(stopped.mode).toBe('idle'); expect(stopped.position).toEqual(before);
  });

  it('stops and faces the player once per zone visit, then resumes after the test line', () => {
    const companion = createMusicCompanion(), player = world(50, -5), before = companion.state.position;
    const talking = companion.update({ player, playerHeading: heading, playerMoving: true, dt: .05 });
    expect(talking.mode).toBe('dialogue');
    expect(talking.position).toEqual(before);
    expect(talking.speed).toBe(0);
    expect(talking.dialogue?.text).toBe('我会陪你一起参观乐舞坊。');
    expect(talking.heading).toBeCloseTo(Math.atan2(before.x - player.x, before.z - player.z));
    for (let i = 0; i < 101; i++) companion.update({ player, playerHeading: heading, playerMoving: true, dt: .05 });
    expect(companion.state.dialogue).toBeUndefined();
    expect(companion.state.mode).toBe('following');
    companion.update({ player, playerHeading: heading, playerMoving: false, dt: .1 });
    expect(companion.state.dialogue).toBeUndefined();
    companion.update({ player: world(50, -2), playerHeading: heading, playerMoving: true, dt: .05 });
    const nextVisit = companion.update({ player, playerHeading: heading, playerMoving: true, dt: .05 });
    expect(nextVisit.dialogue?.id).toBe(2);
    companion.finishDialogue();
    expect(companion.state.mode).toBe('idle');
    expect(companion.state.dialogue).toBeUndefined();
  });

  it('freezes when blocked and waits at its current position when the player leaves the flat area', () => {
    const companion = createMusicCompanion(), before = companion.state.position;
    const blocked = companion.update({ player: world(55, -4), playerHeading: heading, playerMoving: true, dt: .1, blocked: true });
    expect(blocked.position).toEqual(before); expect(blocked.speed).toBe(0);
    const outside = companion.update({ player: world(72, -4), playerHeading: heading, playerMoving: true, dt: .1 });
    expect(outside.mode).toBe('waiting'); expect(outside.position).toEqual(before); expect(outside.speed).toBe(0);
    const talking = companion.update({ player: world(50, -5), playerHeading: heading, playerMoving: false, dt: .1 });
    const frozen = companion.update({ player: world(50, -5), playerHeading: heading, playerMoving: true, dt: .1, blocked: true });
    expect(frozen.dialogue?.elapsed).toBe(talking.dialogue?.elapsed);
    companion.reset();
    expect(companion.state.position).toEqual({ x: world(44.4, -5.6).x, z: world(44.4, -5.6).z });
    expect(companion.state.mode).toBe('idle');
  });
});
