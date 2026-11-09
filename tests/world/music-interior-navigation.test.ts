import { describe, expect, it } from 'vitest';
import balcony from '../../src/content/world/music-balcony-ensemble-v001.json';
import compactBalcony from '../../src/content/world/music-balcony-ensemble-v002.json';
import { createMusicInteriorNavigation, MUSIC_INTERIOR_LAYOUT, musicInteriorFromWorld, musicInteriorHeight, musicInteriorMove, musicInteriorPath, musicInteriorSafeState, musicInteriorToWorld, musicInteriorValid, sanitizeMusicInteriorState, type MusicInteriorWalkState } from '../../src/world/music-interior-navigation';

const state = (x: number, z: number, surfaceId: string): MusicInteriorWalkState => {
  const p = musicInteriorToWorld({ x, z }); return { position: { x: p.x, z: p.z }, surfaceId };
};
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
function walk(from: MusicInteriorWalkState, x: number, z: number, samples?: MusicInteriorWalkState[]) {
  let current = from;
  const destination = musicInteriorToWorld({ x, z });
  for (let frame = 0; frame < 1500 && distance(current.position, destination) > .008; frame++) {
    const remaining = distance(current.position, destination), amount = Math.min(.055, remaining), before = current;
    current = musicInteriorMove(current, { x: (destination.x - current.position.x) / remaining * amount, z: (destination.z - current.position.z) / remaining * amount });
    expect(musicInteriorValid(current)).toBe(true);
    expect(distance(before.position, current.position)).toBeLessThanOrEqual(amount + 1e-6);
    expect(Math.abs(musicInteriorHeight(current) - musicInteriorHeight(before))).toBeLessThanOrEqual(amount * Math.tan(36 * Math.PI / 180) + .045);
    samples?.push(current);
    if (distance(before.position, current.position) < 1e-6) break;
  }
  expect(distance(current.position, destination), JSON.stringify({ local: musicInteriorFromWorld(current.position), surface: current.surfaceId, target: [x, z] })).toBeLessThan(.01);
  return current;
}

describe('music interior continuous layered movement', () => {
  it('uses the selected balcony and optional instruments in movement, path and camera geometry', () => {
    const display = { id: 'example-display', min: [39, 7.915375, -30], max: [41, 9.2, -28] };
    const compact = createMusicInteriorNavigation({ compactBalcony: true, additionalSolids: [display] });
    const displayPoint = state(40, -29, 'music-floor-2');
    expect(musicInteriorValid(displayPoint)).toBe(true);
    expect(compact.musicInteriorValid(displayPoint)).toBe(false);
    expect(compact.cameraSolids).toContain(display);
    for (const performer of compactBalcony.players) {
      expect(compact.cameraSolids.find(solid => solid.id === `music-gallery-ensemble-${performer.id}`))
        .toMatchObject({ min: performer.min, max: performer.max });
      const x = (performer.min[0] + performer.max[0]) / 2, z = (performer.min[2] + performer.max[2]) / 2;
      expect(compact.musicInteriorValid(state(x, z, 'music-gallery'))).toBe(false);
    }
    // The compaction frees the former performer edge along the back of the stage.
    const lane = state(38.2, -20.55, 'music-gallery');
    expect(musicInteriorValid(lane)).toBe(false);
    expect(compact.musicInteriorValid(lane)).toBe(true);
    const route = compact.musicInteriorPath(state(44.8, -30.225, 'music-floor-2'), lane);
    expect(route?.at(-1)?.surfaceId).toBe('music-gallery');
    const safe = compact.sanitizeMusicInteriorState(displayPoint);
    expect(safe.surfaceId).toBe('music-floor-2');
    expect(compact.musicInteriorValid(safe)).toBe(true);
  });

  it('uses all four measured balcony musician bounds for bodies and the camera', () => {
    const musicians = MUSIC_INTERIOR_LAYOUT.solids.filter(solid => solid.id.startsWith('music-gallery-ensemble-'));
    expect(musicians.map(solid => solid.id)).toEqual(['pipa', 'flute', 'zheng', 'waist-drum'].map(id => `music-gallery-ensemble-${id}`));
    expect(MUSIC_INTERIOR_LAYOUT.solids.some(solid => solid.id.startsWith('music-gallery-musician-'))).toBe(false);
    for (const performer of balcony.players) {
      const solid = musicians.find(candidate => candidate.id === `music-gallery-ensemble-${performer.id}`);
      expect(solid?.min).toEqual(performer.min);
      expect(solid?.max).toEqual(performer.max);
      const x = (performer.min[0] + performer.max[0]) / 2, z = (performer.min[2] + performer.max[2]) / 2;
      expect(musicInteriorValid(state(x, z, 'music-gallery'))).toBe(false);
    }
  });
  it('blocks the Z-platform edge rails without closing the stair mouth or changing floor height', () => {
    for (const rail of MUSIC_INTERIOR_LAYOUT.guardrails) {
      const solid = MUSIC_INTERIOR_LAYOUT.solids.find(s => s.id === rail.id);
      expect(solid?.min).toEqual(rail.min); expect(solid?.max).toEqual(rail.max);
      expect(rail.max[1] - rail.min[1]).toBeCloseTo(1.05);
    }
    const eastStart = state(44.8, -25, 'music-floor-2'), eastTarget = musicInteriorToWorld({ x: 49, z: -25 });
    const east = musicInteriorMove(eastStart, { x: eastTarget.x - eastStart.position.x, z: eastTarget.z - eastStart.position.z });
    expect(musicInteriorFromWorld(east.position).x).toBeLessThanOrEqual(45.49 + 1e-4);
    expect(east.surfaceId).toBe('music-floor-2'); expect(musicInteriorValid(east)).toBe(true);
    const frontStart = state(45.3, -24, 'music-floor-2'), frontTarget = musicInteriorToWorld({ x: 45.3, z: -19 });
    const front = musicInteriorMove(frontStart, { x: frontTarget.x - frontStart.position.x, z: frontTarget.z - frontStart.position.z });
    expect(musicInteriorFromWorld(front.position).z).toBeLessThanOrEqual(-22.63 + 1e-4);
    expect(front.surfaceId).toBe('music-floor-2'); expect(musicInteriorValid(front)).toBe(true);
    expect(musicInteriorHeight(front)).toBeCloseTo(musicInteriorHeight(frontStart));
    const mouth = walk(state(47.5, -30.225, 'music-stair'), 44.8, -30.225);
    expect(mouth.surfaceId).toBe('music-floor-2');
    expect(MUSIC_INTERIOR_LAYOUT.solids.some(s => s.id === 'music-original-gallery-front-railing')).toBe(true);
    const gallery = state(38.5, -20.8, 'music-gallery'), beyond = musicInteriorToWorld({ x: 38.5, z: -16.5 });
    expect(musicInteriorValid(gallery)).toBe(true);
    const guarded = musicInteriorMove(gallery, { x: beyond.x - gallery.position.x, z: beyond.z - gallery.position.z });
    expect(musicInteriorFromWorld(guarded.position).z).toBeLessThanOrEqual(-18.44 + 1e-4);
    expect(guarded.surfaceId).toBe('music-gallery'); expect(musicInteriorValid(guarded)).toBe(true);
  });

  it('keeps the body clear of the new gallery-side rail while leaving the route from the upper hall open', () => {
    const gallery = walk(state(43.4, -24, 'music-floor-2'), 43.4, -20.6);
    expect(gallery.surfaceId).toBe('music-gallery');
    const edge = state(44.2, -20.6, 'music-gallery');
    expect(musicInteriorValid(edge)).toBe(false);
    expect(musicInteriorPath(gallery, edge)).toBeNull();
    const outside = musicInteriorToWorld({ x: 46, z: -20.6 });
    const stopped = musicInteriorMove(gallery, { x: outside.x - gallery.position.x, z: outside.z - gallery.position.z });
    expect(musicInteriorFromWorld(stopped.position).x).toBeLessThanOrEqual(44.0001 + 1e-4);
    expect(musicInteriorValid(stopped)).toBe(true);
    expect(stopped.surfaceId).toBe('music-gallery');
  });

  it('has legal adjacent player/companion spawns on the accepted first-floor porch', () => {
    const player = state(39.5, -19.4, 'music-floor-1'), companion = state(37.9, -19.8, 'music-floor-1');
    expect(musicInteriorValid(player)).toBe(true); expect(musicInteriorValid(companion)).toBe(true);
    expect(musicInteriorHeight(player)).toBeCloseTo(4.3);
    expect(distance(player.position, companion.position)).toBeCloseTo(Math.hypot(1.6, .4));
  });

  it('walks continuously from the courtyard across the original platform and through the opened ground door', () => {
    let player = state(41, -10.5, 'music-courtyard');
    player = walk(player, 41, -19.4);
    player = walk(player, 39.5, -19.4);
    expect(player.surfaceId).toBe('music-floor-1');
    player = walk(player, 39.5, -24);
    expect(player.surfaceId).toBe('music-floor-1'); expect(musicInteriorHeight(player)).toBeCloseTo(4.3);
  });

  it('descends the front steps from the open ground door onto the courtyard', () => {
    for (const x of [39.2, 40.2, 41.2]) {
      const samples: MusicInteriorWalkState[] = [];
      const player = walk(state(x, -24, 'music-floor-1'), x, -8, samples);
      expect(samples.some(s => s.surfaceId === 'music-front-ramp')).toBe(true);
      expect(player.surfaceId).toBe('music-courtyard');
      expect(musicInteriorHeight(player)).toBeCloseTo(2.5);
    }
  });

  it('uses the full-height 6.09m ground entry and keeps its fixed vertical panels and door leaves collision solid', () => {
    for (const x of [37.7, 39.5, 41.7]) {
      let player = walk(state(x, -19.4, 'music-floor-1'), x, -24.5);
      player = walk(player, x, -19.4);
      expect(player.surfaceId).toBe('music-floor-1');
    }
    for (const [x, z] of [[35.7, -21.8], [43.7, -21.8], [44.5, -20.2], [36.575, -20], [42.665, -20]]) {
      expect(musicInteriorValid(state(x, z, 'music-floor-1')), `fixed panel/leaf ${x},${z}`).toBe(false);
    }
  });

  it('stops swept movement at the fixed vertical panels, solid side return and both open vertical-bar leaves', () => {
    const attempts = [
      { from: state(35.7, -19.4, 'music-floor-1'), target: [35.7, -24.5], axis: 'z' as const, minimum: -21.06 },
      { from: state(43.7, -19.4, 'music-floor-1'), target: [43.7, -24.5], axis: 'z' as const, minimum: -21.06 },
      { from: state(35.6, -20, 'music-floor-1'), target: [38, -20], axis: 'x' as const, maximum: 35.785 },
      { from: state(43.6, -20, 'music-floor-1'), target: [41, -20], axis: 'x' as const, minimum: 43.455 },
      { from: state(43.5, -20.4, 'music-floor-1'), target: [46.5, -20.4], axis: 'x' as const, maximum: 43.75125 },
    ];
    for (const attempt of attempts) {
      expect(musicInteriorValid(attempt.from), JSON.stringify(attempt)).toBe(true);
      const target = musicInteriorToWorld({ x: attempt.target[0], z: attempt.target[1] });
      const moved = musicInteriorMove(attempt.from, { x: target.x - attempt.from.position.x, z: target.z - attempt.from.position.z });
      const p = musicInteriorFromWorld(moved.position);
      if (attempt.minimum !== undefined) expect(p[attempt.axis]).toBeGreaterThanOrEqual(attempt.minimum - .001);
      if (attempt.maximum !== undefined) expect(p[attempt.axis]).toBeLessThanOrEqual(attempt.maximum + .001);
      expect(musicInteriorValid(moved)).toBe(true); expect(moved.surfaceId).toBe('music-floor-1');
      expect(musicInteriorHeight(moved)).toBeCloseTo(musicInteriorHeight(attempt.from));
    }
  });

  it('ascends the rear single stair, crosses the enlarged second floor to the original gallery and descends', () => {
    const samples: MusicInteriorWalkState[] = [];
    let player = walk(state(56.8, -30.225, 'music-floor-1'), 44.8, -30.225, samples);
    expect(samples.some(s => s.surfaceId === 'music-stair')).toBe(true);
    expect(player.surfaceId).toBe('music-floor-2'); expect(musicInteriorHeight(player)).toBeCloseTo(10.415375);
    player = walk(player, 43.4, -30.225);
    player = walk(player, 43.4, -20.8);
    expect(player.surfaceId).toBe('music-gallery'); expect(musicInteriorHeight(player)).toBeCloseTo(10.415375);
    player = walk(player, 43.4, -30.225);
    player = walk(player, 56.8, -30.225);
    expect(player.surfaceId).toBe('music-floor-1'); expect(musicInteriorHeight(player)).toBeCloseTo(4.3);
  });

  it('crosses the former upper wall along the full retained gallery width while preserving the musicians', () => {
    for (const x of [35.7, 38.5, 40.8, 43.4]) {
      let player = walk(state(x, -24, 'music-floor-2'), x, -20.8);
      expect(player.surfaceId).toBe('music-gallery');
      player = walk(player, x, -24);
      expect(player.surfaceId).toBe('music-floor-2');
    }
    for (const x of [37.3, 42]) expect(musicInteriorValid(state(x, -19.6, 'music-gallery'))).toBe(false);
  });

  it('keeps the expanded rear floor below the real rear wall and never re-acquires the old stair projection', () => {
    let lower = walk(state(40, -25, 'music-floor-1'), 40, -31.4);
    expect(lower.surfaceId).toBe('music-floor-1');
    const wall = musicInteriorToWorld({ x: 40, z: -33 });
    lower = musicInteriorMove(lower, { x: wall.x - lower.position.x, z: wall.z - lower.position.z });
    expect(musicInteriorFromWorld(lower.position).z).toBeGreaterThanOrEqual(-31.485 - 1e-4);
    const oldStair = walk(state(48.5, -23, 'music-floor-1'), 48.5, -26.5);
    expect(oldStair.surfaceId).toBe('music-floor-1'); expect(musicInteriorHeight(oldStair)).toBeCloseTo(4.3);
  });

  it('keeps the first floor under the high stair separate from its overlapping upper walk surface', () => {
    const below = state(48.5, -30.225, 'music-floor-1'), above = state(48.5, -30.225, 'music-stair');
    expect(musicInteriorValid(below)).toBe(true); expect(musicInteriorValid(above)).toBe(true);
    expect(musicInteriorHeight(above) - musicInteriorHeight(below)).toBeGreaterThan(4);
    const moved = walk(state(48.5, -26.5, 'music-floor-1'), 48.5, -31);
    expect(moved.surfaceId).toBe('music-floor-1'); expect(musicInteriorHeight(moved)).toBeCloseTo(4.3);
  });

  it('does not let an upper edge or stair edge fall onto the floor sharing its projection', () => {
    let upper = state(45.2, -22.9, 'music-floor-2');
    const target = musicInteriorToWorld({ x: 51, z: -22.9 });
    upper = musicInteriorMove(upper, { x: target.x - upper.position.x, z: target.z - upper.position.z });
    expect(upper.surfaceId).toBe('music-floor-2'); expect(musicInteriorValid(upper)).toBe(true);
    expect(musicInteriorHeight(upper)).toBeCloseTo(10.415375);
    let stair = state(50.98, -30.225, 'music-stair');
    const outside = musicInteriorToWorld({ x: 50.98, z: -20 });
    stair = musicInteriorMove(stair, { x: outside.x - stair.position.x, z: outside.z - stair.position.z });
    expect(stair.surfaceId).toBe('music-stair'); expect(musicInteriorValid(stair)).toBe(true);
    expect(musicInteriorFromWorld(stair.position).z).toBeLessThanOrEqual(-29.115 + 1e-5);
  });

  it('finds a collision-checked layered route from the porch through the stair to the old gallery', () => {
    const start = state(39.5, -19.4, 'music-floor-1'), end = musicInteriorSafeState('music-gallery');
    const route = musicInteriorPath(start, end);
    expect(route).not.toBeNull(); expect(route!.some(s => s.surfaceId === 'music-stair')).toBe(true);
    let current = start;
    for (const waypoint of route!.slice(1)) {
      const p = musicInteriorFromWorld(waypoint.position);
      current = walk(current, p.x, p.z);
      expect(current.surfaceId).toBe(waypoint.surfaceId);
    }
    expect(distance(current.position, end.position)).toBeLessThan(.01);
  });

  it('preserves the saved layer while repairing an invalid second-floor point', () => {
    const safe = sanitizeMusicInteriorState(state(90, -23, 'music-floor-2'));
    expect(safe.surfaceId).toBe('music-floor-2'); expect(musicInteriorValid(safe)).toBe(true);
    expect(musicInteriorHeight(safe)).toBeCloseTo(10.415375);
    for (const surface of MUSIC_INTERIOR_LAYOUT.surfaces) expect(musicInteriorValid(musicInteriorSafeState(surface.id))).toBe(true);
  });
});
