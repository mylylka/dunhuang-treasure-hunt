import { describe, expect, it } from 'vitest';
import { createMusicCompanionV2 } from '../../src/world/companion-follow-v002';
import { createMusicInteriorNavigation, musicInteriorFromWorld, musicInteriorHeight, musicInteriorMove, musicInteriorToWorld, musicInteriorValid } from '../../src/world/music-interior-navigation';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../../src/content/world/music-instrument-display-layout-v001';
import { TERRAIN_REGIONS } from '../../src/world/terrain-rules-v001';
import { advanceMusicInteriorStairAssistFrame, startMusicInteriorStairAssist } from '../../src/world/music-interior-stair-assist';
import type { UpperWalkState } from '../../src/world/mogao-upper-navigation';

const point = (x: number, z: number, surfaceId = 'music-floor-1'): UpperWalkState => {
  const p = musicInteriorToWorld({ x, z }); return { position: { x: p.x, z: p.z }, surfaceId };
};
const gap = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const yaw = TERRAIN_REGIONS.music.yaw;
type Companion = ReturnType<typeof createMusicCompanionV2>;

function walkPair(companion: Companion, initial: UpperWalkState, destinations: [number, number][], running = false) {
  let player = initial, blockedFrames = 0;
  const npcSurfaces = new Set<string | null>(), playerSurfaces = new Set<string | null>();
  for (const [x, z] of destinations) {
    const target = point(x, z).position;
    for (let frame = 0; frame < 600 && gap(player.position, target) > .025; frame++) {
      const before = player, npcBefore = companion.state, remaining = gap(player.position, target);
      const amount = Math.min((running ? 7 : 2.1) / 30, remaining);
      const delta = { x: (target.x - player.position.x) / remaining * amount, z: (target.z - player.position.z) / remaining * amount };
      player = companion.constrainPlayerMove(player, delta);
      const moving = gap(before.position, player.position) > 1e-5;
      if (!moving) blockedFrames++;
      const state = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
        playerHeading: Math.atan2(-delta.x, -delta.z), playerMoving: moving, playerRunning: running, dt: 1 / 30 });
      expect(musicInteriorValid(player)).toBe(true);
      expect(musicInteriorValid(state)).toBe(true);
      if (Math.abs(musicInteriorHeight(player) - state.height) < 1.77) expect(gap(player.position, state.position)).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(gap(npcBefore.position, state.position)).toBeLessThanOrEqual(7.6 / 30 + 1e-6);
      expect(Math.abs(state.height - npcBefore.height)).toBeLessThanOrEqual(gap(npcBefore.position, state.position) * Math.tan(Math.PI / 5) + .045);
      npcSurfaces.add(state.surfaceId); playerSurfaces.add(player.surfaceId);
    }
    expect(gap(player.position, target), JSON.stringify({ target: [x, z], player: musicInteriorFromWorld(player.position), npc: musicInteriorFromWorld(companion.state.position), npcSurface: companion.state.surfaceId })).toBeLessThan(.025);
  }
  return { player, blockedFrames, npcSurfaces, playerSurfaces };
}

function stationaryTrace(companion: Companion, player: UpperWalkState, heading: number, assisted: boolean, turnInPlace = false) {
  const dt = 1 / 60;
  let previous = companion.state, travel = 0, lateTravel = 0, reversals = 0;
  let priorDirection: { x: number; z: number } | undefined;
  let invalid = 0, minimumGap = Infinity, largestHeightStep = 0;
  for (let frame = 0; frame < 600; frame++) {
    companion.constrainPlayerMove(player, { x: 0, z: 0 });
    const state = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
      playerHeading: heading + (turnInPlace ? frame * dt : 0), playerMoving: false,
      assistArrived: assisted && frame === 0, dt });
    const dx = state.position.x - previous.position.x, dz = state.position.z - previous.position.z;
    const length = Math.hypot(dx, dz);
    travel += length;
    if (frame >= 360) lateTravel += length;
    if (length > .001) {
      if (priorDirection && (dx * priorDirection.x + dz * priorDirection.z) / length < 0) reversals++;
      priorDirection = { x: dx / length, z: dz / length };
    }
    if (!musicInteriorValid(state)) invalid++;
    if (Math.abs(state.height - musicInteriorHeight(player)) < 1.77) minimumGap = Math.min(minimumGap, gap(state.position, player.position));
    largestHeightStep = Math.max(largestHeightStep, Math.abs(state.height - previous.height));
    expect(length).toBeLessThanOrEqual(7.6 * dt + 1e-6);
    previous = state;
  }
  return { travel, lateTravel, reversals, invalid, minimumGap, largestHeightStep };
}

describe('second pavilion two-floor companion', () => {
  it('lets the guide lead over the entrance ramp when the tree blocks the side-by-side goal', () => {
    const navigation = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: MUSIC_INSTRUMENT_DISPLAY_SOLIDS });
    let player: UpperWalkState = { position: { x: 203.22539177269906, z: -42.232326732646285 }, surfaceId: 'music-courtyard' };
    const companion = createMusicCompanionV2({
      position: { x: 202.52535865926424, z: -43.46501799177761 }, surfaceId: 'music-front-ramp',
    }, navigation, { musicGuide: true });
    const heading = .5593184112615376, dt = 1 / 30;
    for (let frame = 0; frame < 150; frame++) {
      const before = player, npcBefore = companion.state;
      player = companion.constrainPlayerMove(player, { x: -Math.sin(heading) * 2.1 * dt, z: -Math.cos(heading) * 2.1 * dt });
      const state = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: heading,
        playerMoving: gap(before.position, player.position) > 1e-5, dt });
      expect(navigation.musicInteriorValid(player)).toBe(true);
      expect(navigation.musicInteriorValid(state)).toBe(true);
      expect(gap(player.position, state.position)).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(gap(npcBefore.position, state.position)).toBeLessThanOrEqual(2.6 * dt + 1e-6);
      expect(Math.abs(state.height - npcBefore.height)).toBeLessThanOrEqual(gap(npcBefore.position, state.position) * Math.tan(Math.PI / 5) + .045);
    }
    expect(musicInteriorFromWorld(player.position).z).toBeLessThan(-18);
    expect(player.surfaceId).toBe('music-floor-1');
    expect(companion.state.surfaceId).toBe('music-floor-1');
    const at = companion.state.position;
    companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: heading, playerMoving: false, dt });
    expect(companion.state.position).toEqual(at);
  });

  it.each([false, true])('passes both actors through the restored full-width door in both directions (running=%s)', running => {
    for (const direction of [
      { player: point(40.2, -19.4), npc: point(38.6, -19.8), targetZ: -24.5, entering: true, heading: yaw },
      { player: point(40.2, -24.5), npc: point(41.8, -24.1), targetZ: -19.4, entering: false, heading: yaw + Math.PI },
    ]) {
      const companion = createMusicCompanionV2(direction.npc);
      const crossed = walkPair(companion, direction.player, [[40.2, direction.targetZ]], running);
      const npc = musicInteriorFromWorld(companion.state.position);
      if (direction.entering) expect(npc.z).toBeLessThan(-21.85);
      else expect(npc.z).toBeGreaterThan(-21.75);
      expect(companion.state.distance).toBeLessThan(2.01);
      const trace = stationaryTrace(companion, crossed.player, direction.heading, false);
      expect(trace.travel).toBe(0); expect(trace.invalid).toBe(0);
    }
  });

  it('runs alongside on the courtyard, returns to walking speed and immediately idles', () => {
    const companion = createMusicCompanionV2(point(44.4, -3.6, 'music-courtyard'));
    const run = walkPair(companion, point(44, -2, 'music-courtyard'), [[51, -2]], true);
    expect(companion.state.speed).toBeGreaterThan(6.8); expect(companion.state.chasing).toBe(false);
    expect(companion.state.distance).toBeLessThan(1.8);
    const walked = walkPair(companion, run.player, [[51.7, -2]]);
    expect(companion.state.speed).toBeLessThanOrEqual(2.6 + 1e-6);
    const at = companion.state.position;
    const stopped = companion.update({ player: walked.player.position, playerSurfaceId: walked.player.surfaceId,
      playerHeading: -Math.PI / 2 + yaw, playerMoving: false, dt: .1 });
    expect(stopped.position).toEqual(at); expect(stopped.speed).toBe(0); expect(stopped.mode).toBe('idle');
    at.x = 1e6; expect(companion.state.position.x).not.toBe(1e6);
  });

  it('follows through the wide ground entry, deeper room, rear stair and open upper gallery, then returns downstairs', () => {
    const companion = createMusicCompanionV2();
    const up = walkPair(companion, point(39.5, -19.4), [
      [39.5, -25.4], [56.8, -25.4], [56.8, -30.225],
      [44.8, -30.225], [43.4, -30.225], [43.4, -20.8],
    ]);
    expect(up.player.surfaceId).toBe('music-gallery');
    expect(up.npcSurfaces.has('music-stair')).toBe(true);
    const down = walkPair(companion, up.player, [[43.4, -30.225], [56.8, -30.225], [56.8, -25.4], [39.5, -25.4], [39.5, -19.4]]);
    expect(down.player.surfaceId).toBe('music-floor-1');
    expect(down.npcSurfaces.has('music-stair')).toBe(true);
  }, 30000);

  it('keeps safe order when both actors reverse on the stair and uses running speed', () => {
    const companion = createMusicCompanionV2(point(54, -30.225, 'music-stair'));
    const up = walkPair(companion, point(55.65, -30.225, 'music-stair'), [[50.5, -30.225]], true);
    expect(companion.state.speed).toBeGreaterThan(2.6);
    const down = walkPair(companion, up.player, [[56.8, -30.225]], true);
    expect(down.player.surfaceId).toBe('music-floor-1');
    companion.update({ player: down.player.position, playerSurfaceId: down.player.surfaceId,
      playerHeading: -Math.PI / 2 + yaw, playerMoving: false, playerRunning: true, assistArrived: true, dt: 1 / 30 });
    for (let frame = 0; frame < 240 && companion.state.settling; frame++) companion.update({ player: down.player.position,
      playerSurfaceId: down.player.surfaceId, playerHeading: -Math.PI / 2 + yaw, playerMoving: false, dt: 1 / 30 });
    expect(companion.state.surfaceId).toBe('music-floor-1');
    expect(companion.state.settling).toBe(false); expect(companion.state.distance).toBeLessThan(2.01);
  }, 30000);

  it('completes assisted trips on the moved rear stair with actor-aware collision and stable landing arrivals', () => {
    const companion = createMusicCompanionV2(point(58.4, -30.225));
    let player = point(56.8, -30.225), heading = yaw + Math.PI / 2;
    for (const direction of ['up', 'down'] as const) {
      let assist = startMusicInteriorStairAssist(player, direction);
      expect(assist).not.toBeNull();
      let done = false;
      for (let frame = 0; frame < 900 && assist; frame++) {
        const before = companion.state;
        const result = advanceMusicInteriorStairAssistFrame(assist, player, 1 / 30, 3.2,
          (walk, delta) => companion.constrainPlayerMove(walk, delta));
        const moving = Math.hypot(result.delta.x, result.delta.z) > 1e-5;
        if (moving) heading = Math.atan2(-result.delta.x, -result.delta.z);
        player = result.walk;
        const state = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
          playerHeading: heading, playerMoving: moving, assistArrived: result.done, dt: 1 / 30 });
        expect(result.blocked).toBe(false);
        expect(musicInteriorValid(player)).toBe(true); expect(musicInteriorValid(state)).toBe(true);
        if (Math.abs(musicInteriorHeight(player) - state.height) < 1.77) expect(gap(player.position, state.position)).toBeGreaterThanOrEqual(1.4 - 1e-5);
        expect(gap(state.position, before.position)).toBeLessThanOrEqual(7.6 / 30 + 1e-6);
        assist = result.assist; done = result.done;
      }
      expect(done).toBe(true);
      const trace = stationaryTrace(companion, player, heading, false);
      expect(trace.lateTravel).toBeLessThan(1e-8); expect(trace.invalid).toBe(0);
      expect(companion.state.surfaceId).toBe(direction === 'up' ? 'music-floor-2' : 'music-floor-1');
      expect(companion.state.height).toBeCloseTo(musicInteriorHeight(player));
      expect(companion.state.settling).toBe(false); expect(companion.state.speed).toBe(0);
    }
  }, 30000);

  it('follows across the open upper connection in both directions', () => {
    const companion = createMusicCompanionV2(point(45, -29.825, 'music-floor-2'));
    const out = walkPair(companion, point(43.4, -30.225, 'music-floor-2'), [[43.4, -20.8]]);
    expect(out.player.surfaceId).toBe('music-gallery');
    expect(companion.state.distance, JSON.stringify(musicInteriorFromWorld(companion.state.position))).toBeLessThan(2.01);
    const back = walkPair(companion, out.player, [[43.4, -30.225]]);
    expect(back.player.surfaceId).toBe('music-floor-2');
    expect(companion.state.surfaceId).toBe('music-floor-2');
  }, 30000);

  it('does not dynamically collide across separate floors but protects overlapping bodies', () => {
    const npc = point(48.5, -30.225, 'music-stair'), companion = createMusicCompanionV2(npc);
    const player = point(48.5, -30.325), target = point(48.5, -30.125);
    const delta = { x: target.position.x - player.position.x, z: target.position.z - player.position.z };
    expect(musicInteriorHeight(npc) - musicInteriorHeight(player)).toBeGreaterThan(4);
    const withoutBody = musicInteriorMove(player, delta), moved = companion.constrainPlayerMove(player, delta);
    expect(moved.surfaceId).toBe(withoutBody.surfaceId); expect(gap(moved.position, withoutBody.position)).toBeLessThan(1e-8);
    const sameLevel = point(50.2, -30.225, 'music-stair');
    const intoNpc = { x: npc.position.x - sameLevel.position.x, z: npc.position.z - sameLevel.position.z };
    const stopped = companion.constrainPlayerMove(sameLevel, intoNpc);
    expect(gap(stopped.position, npc.position)).toBeGreaterThanOrEqual(1.4 - 1e-5);
  });

  it('idles on ordinary key release but finishes an assisted arrival onto the safe landing', () => {
    const companion = createMusicCompanionV2(point(47.7, -30.225, 'music-stair')), player = point(44.8, -30.225, 'music-floor-2');
    const before = companion.state;
    const stopped = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: Math.PI / 2 + yaw, playerMoving: false, dt: .1 });
    expect(stopped.position).toEqual(before.position); expect(stopped.speed).toBe(0);
    companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: Math.PI / 2 + yaw, playerMoving: false, assistArrived: true, dt: 1 / 30 });
    let settled = companion.state;
    for (let frame = 0; frame < 240 && settled.settling; frame++) settled = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: Math.PI / 2 + yaw, playerMoving: false, dt: 1 / 30 });
    expect(settled.surfaceId).toBe('music-floor-2'); expect(settled.settling).toBe(false);
    expect(settled.distance).toBeLessThan(2.01);
    const final = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: yaw, playerMoving: false, dt: .1 });
    expect(final.mode).toBe('idle'); expect(final.speed).toBe(0);
    companion.reset(point(47.7, -30.225, 'music-stair'));
    companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: yaw, playerMoving: false, assistArrived: true, dt: .1 });
    const pause = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: yaw, playerMoving: false, blocked: true, dt: .1 });
    expect(pause.settling).toBe(false); expect(pause.speed).toBe(0);
  }, 30000);

  it.each([
    { name: 'left offset', x: 47.5, z: -29.925 },
    { name: 'right offset', x: 47, z: -30.425 },
    { name: 'centered', x: 47.7, z: -30.225 },
  ].flatMap(start => [Math.PI / 2, -Math.PI / 2, 0, Math.PI].map(angle => ({ ...start, angle }))))(
    'finishes an offset upper arrival without sustained oscillation: $name, heading $angle', ({ x, z, angle }) => {
      const companion = createMusicCompanionV2(point(x, z, 'music-stair'));
      const player = point(44.8, -30.225, 'music-floor-2');
      const trace = stationaryTrace(companion, player, yaw + angle, true);
      // The reported offset case used to walk >20 m and reverse 25 times over
      // ten seconds, then time out on the stair. An instant Idle check missed it.
      expect(trace.travel).toBeGreaterThan(.3);
      expect(trace.travel).toBeLessThan(4);
      expect(trace.reversals).toBeLessThanOrEqual(1);
      expect(trace.lateTravel).toBeLessThan(1e-8);
      expect(trace.invalid).toBe(0);
      expect(trace.minimumGap).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(trace.largestHeightStep).toBeLessThan(.04);
      expect(companion.state.surfaceId).toBe('music-floor-2');
      expect(companion.state.height).toBeCloseTo(musicInteriorHeight(player));
      expect(companion.state.distance).toBeLessThan(2.01);
      expect(companion.state.settling).toBe(false);
      expect(companion.state.mode).toBe('idle'); expect(companion.state.speed).toBe(0);
    }, 30000,
  );

  it('stays still for ten seconds after release beside doorways and the stair, including turn-only input', () => {
    const cases = [
      { player: point(39.5, -23.4), npc: point(39.5, -21.8) },
      { player: point(43.4, -20.8, 'music-gallery'), npc: point(43.4, -22.4, 'music-floor-2') },
      { player: point(44.8, -30.225, 'music-floor-2'), npc: point(47.5, -29.925, 'music-stair') },
    ];
    for (const { player, npc } of cases) {
      expect(musicInteriorValid(player)).toBe(true); expect(musicInteriorValid(npc)).toBe(true);
      const companion = createMusicCompanionV2(npc), at = companion.state;
      const trace = stationaryTrace(companion, player, yaw + Math.PI / 2, false, true);
      expect(trace.travel).toBe(0); expect(trace.reversals).toBe(0);
      expect(trace.invalid).toBe(0); expect(trace.minimumGap).toBeGreaterThanOrEqual(1.4 - 1e-5);
      expect(companion.state.position).toEqual(at.position); expect(companion.state.heading).toBe(at.heading);
      expect(companion.state.mode).toBe('idle'); expect(companion.state.speed).toBe(0);
    }
  });

  it('yields to a fresh blocked assist intent, then stops after release or blocking', () => {
    const companion = createMusicCompanionV2(point(50, -30.225, 'music-stair'));
    const player = point(51.4, -30.225, 'music-stair'), goal = point(49.9, -30.225, 'music-stair');
    let moved = companion.constrainPlayerMove(player, { x: (goal.position.x - player.position.x) / 10, z: (goal.position.z - player.position.z) / 10 });
    expect(gap(moved.position, player.position)).toBeLessThan(.001);
    const yielded = companion.update({ player: moved.position, playerSurfaceId: moved.surfaceId, playerHeading: Math.PI / 2 + yaw, playerMoving: false, dt: .1 });
    expect(yielded.speed).toBeGreaterThan(0);
    const at = yielded.position;
    const released = companion.update({ player: moved.position, playerSurfaceId: moved.surfaceId, playerHeading: yaw, playerMoving: false, dt: .1 });
    expect(released.position).toEqual(at); expect(released.speed).toBe(0);
    moved = companion.constrainPlayerMove(moved, { x: goal.position.x - moved.position.x, z: goal.position.z - moved.position.z });
    const blocked = companion.update({ player: moved.position, playerSurfaceId: moved.surfaceId, playerHeading: yaw, playerMoving: false, blocked: true, dt: .1 });
    expect(blocked.speed).toBe(0);
  });

  it('cancels arrival settling on manual takeover without interrupting current following or dialogue', () => {
    const companion = createMusicCompanionV2(point(47.7, -30.225, 'music-stair')), player = point(44.8, -30.225, 'music-floor-2');
    const arriving = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
      playerHeading: Math.PI / 2 + yaw, playerMoving: false, assistArrived: true, dt: .1 });
    expect(arriving.settling).toBe(true); expect(arriving.mode).toBe('following');
    companion.cancelSettling();
    expect(companion.state.settling).toBe(false); expect(companion.state.mode).toBe(arriving.mode);
    expect(companion.state.speed).toBe(arriving.speed); expect(companion.state.position).toEqual(arriving.position);
    const manual = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
      playerHeading: Math.PI / 2 + yaw, playerMoving: true, dt: .1 });
    expect(manual.mode).toBe('following');
    const released = companion.update({ player: player.position, playerSurfaceId: player.surfaceId,
      playerHeading: Math.PI / 2 + yaw, playerMoving: false, dt: .1 });
    expect(released.mode).toBe('idle'); expect(released.speed).toBe(0); expect(released.position).toEqual(manual.position);
    companion.reset(point(48.4, -5.4, 'music-courtyard'));
    const courtyardPlayer = point(50, -5, 'music-courtyard');
    const dialogue = companion.update({ player: courtyardPlayer.position, playerSurfaceId: courtyardPlayer.surfaceId,
      playerHeading: yaw, playerMoving: true, dt: .1 });
    companion.cancelSettling();
    expect(companion.state.mode).toBe('dialogue'); expect(companion.state.dialogue).toEqual(dialogue.dialogue);
  });

  it('retains courtyard test dialogue, faces the player and resumes only after finishing', () => {
    const companion = createMusicCompanionV2(point(48.4, -5.4, 'music-courtyard')), player = point(50, -5, 'music-courtyard');
    const at = companion.state.position;
    const talking = companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: yaw, playerMoving: true, dt: .1 });
    expect(talking.mode).toBe('dialogue'); expect(talking.position).toEqual(at); expect(talking.speed).toBe(0);
    expect(talking.heading).toBeCloseTo(Math.atan2(at.x - player.position.x, at.z - player.position.z));
    expect(talking.dialogue?.text).toBe('我会陪你一起参观乐舞坊。');
    companion.finishDialogue();
    expect(companion.update({ player: player.position, playerSurfaceId: player.surfaceId, playerHeading: -Math.PI / 2 + yaw, playerMoving: true, dt: .1 }).mode).toBe('following');
  });
});
