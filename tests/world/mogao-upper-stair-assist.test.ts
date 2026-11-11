import { describe, expect, it } from 'vitest';
import { startUpperStairAssist, advanceUpperStairAssist, advanceUpperStairAssistFrame, getUpperStairOptions, isUpperStairAssistArea, type UpperStairDirection } from '../../src/world/mogao-upper-stair-assist';
import { MOGAO_UPPER_LAYOUT, UPPER_MAX_SLOPE, upperToWorld, upperFromWorld, upperFloorHeight, upperNavigation, exhibitUpperNavigation, type UpperWalkState } from '../../src/world/mogao-upper-navigation';
import { PLAYER_RADIUS } from '../../src/world/movement';

function worldState(x: number, z: number, surfaceId: string): UpperWalkState {
  const world = upperToWorld({ x, z }); return { position: { x: world.x, z: world.z }, surfaceId };
}
function completeTrip(current: UpperWalkState, direction: UpperStairDirection, stopAtHallDoors = false) {
  let assist = startUpperStairAssist(current, direction, stopAtHallDoors);
  expect(assist).not.toBeNull();
  const navigation = stopAtHallDoors ? exhibitUpperNavigation : upperNavigation;
  const visitedFlights = new Set<string>(), flightDirections: number[] = [], visitedSurfaces = new Set([current.surfaceId]);
  let ticks = 0;
  for (; assist && ticks < 4000; ticks++) {
    const before = current.position, step = advanceUpperStairAssist(assist, current, 1 / 30, undefined, stopAtHallDoors);
    expect(step.blocked).toBe(false);
    expect(Math.hypot(step.walk.position.x - before.x, step.walk.position.z - before.z)).toBeLessThanOrEqual(4.2 / 30 + 1e-6);
    expect(Math.abs(upperFloorHeight(step.walk.position, step.walk.surfaceId, stopAtHallDoors)! - upperFloorHeight(before, current.surfaceId, stopAtHallDoors)!))
      .toBeLessThanOrEqual(4.2 / 30 * UPPER_MAX_SLOPE + .045);
    expect(navigation.validOnSurface(upperFromWorld(step.walk.position), step.walk.surfaceId!)).toBe(true);
    visitedSurfaces.add(step.walk.surfaceId);
    for (const id of [current.surfaceId, step.walk.surfaceId]) if (id?.startsWith('flight-')) visitedFlights.add(id);
    if (current.surfaceId?.startsWith('flight-') && step.walk.surfaceId?.startsWith('flight-')) {
      const dz = upperFromWorld(step.walk.position).z - upperFromWorld(before).z;
      if (Math.abs(dz) > 1e-5 && flightDirections.at(-1) !== Math.sign(dz)) flightDirections.push(Math.sign(dz));
    }
    current = step.walk; assist = step.assist;
  }
  expect(assist).toBeNull();
  return { current, seconds: ticks / 30, visitedFlights: [...visitedFlights], flightDirections, visitedSurfaces };
}

function completeFrameTrip(current: UpperWalkState, direction: UpperStairDirection, fps: number) {
  const dt = 1 / fps, speed = 4.2;
  let assist = startUpperStairAssist(current, direction), frames = 0;
  expect(assist).not.toBeNull();
  for (; assist && frames < fps * 20; frames++) {
    const before = current, step = advanceUpperStairAssistFrame(assist, current, dt, speed);
    expect(step.blocked).toBe(false);
    expect(Math.hypot(step.walk.position.x - before.position.x, step.walk.position.z - before.position.z))
      .toBeLessThanOrEqual(speed * dt + 1e-6);
    expect(Math.abs(upperFloorHeight(step.walk.position, step.walk.surfaceId)! - upperFloorHeight(before.position, before.surfaceId)!))
      .toBeLessThanOrEqual(speed * dt * UPPER_MAX_SLOPE + .045);
    expect(upperNavigation.validOnSurface(upperFromWorld(step.walk.position), step.walk.surfaceId!)).toBe(true);
    current = step.walk; assist = step.assist;
  }
  expect(assist).toBeNull();
  return { current, seconds: frames * dt };
}

describe('continuous stair assistance', () => {
  it('limits the exhibit controls to the ground stair approach, stair hall, landings and flights', () => {
    expect(isUpperStairAssistArea(worldState(12.85, -23, 'ground'))).toBe(true);
    expect(isUpperStairAssistArea(worldState(6.2, -9.8, 'ground'))).toBe(false);
    for (const [x, z] of [[12.85, -24.5], [12.85, -21.7]]) {
      const outsideMouth = worldState(x, z, 'ground');
      expect(isUpperStairAssistArea(outsideMouth)).toBe(false);
      expect(getUpperStairOptions(outsideMouth).up.available).toBe(true);
    }
    expect(isUpperStairAssistArea(worldState(14.75, -23, 'stair-entry'))).toBe(true);
    for (const surface of MOGAO_UPPER_LAYOUT.surfaces.filter(s => /^(landing|flight)-/.test(s.id))) {
      const middle = worldState((surface.minX + surface.maxX) / 2, (surface.minZ + surface.maxZ) / 2, surface.id);
      expect(isUpperStairAssistArea(middle), surface.id).toBe(true);
    }
    for (const id of ['hall-a', 'hall-b']) {
      const oldStop = worldState(18.7, -18.8, id);
      expect(isUpperStairAssistArea(oldStop)).toBe(false);
      expect(isUpperStairAssistArea(worldState(18.7, -21.2, id))).toBe(false);
      expect(getUpperStairOptions(oldStop).down.available).toBe(true);
    }
  });

  it('reaches each gallery and returns with two flights and one reversal per interval, without teleporting', () => {
    let current = worldState(12.85, -23, 'ground');
    expect(getUpperStairOptions(current).down.available).toBe(false);
    for (const [direction, expected, flights] of [
      ['up', 'hall-a', ['flight-1', 'flight-2']],
      ['up', 'hall-b', ['flight-3', 'flight-4']],
      ['down', 'hall-a', ['flight-4', 'flight-3']],
      ['down', 'ground', ['flight-2', 'flight-1']],
    ] as const) {
      const trip = completeTrip(current, direction);
      expect(trip.current.surfaceId).toBe(expected);
      expect(trip.visitedFlights).toEqual(flights);
      expect(trip.flightDirections).toHaveLength(2);
      expect(trip.flightDirections[0]).toBe(-trip.flightDirections[1]);
      // One simulation tick of tolerance around the eight-second experience goal.
      expect(trip.seconds).toBeLessThanOrEqual(8 + 1 / 30);
      current = trip.current;
      if (expected !== 'ground') {
        const point = upperFromWorld(current.position);
        expect(point.x).toBeCloseTo(18.7, 2);
        expect(point.z).toBeCloseTo(-18.8, 2);
        expect(isUpperStairAssistArea(current)).toBe(false);
      }
      if (expected === 'hall-b') expect(getUpperStairOptions(current).up.available).toBe(false);
    }
    expect(current.surfaceId).toBe('ground');
    expect(getUpperStairOptions(current).down.available).toBe(false);
  });

  it('does not offer an upstairs trip past the last gallery', () => {
    const world = upperToWorld({ x: 18.7, z: -18.8 });
    const current = { position: world, surfaceId: 'hall-b' };
    expect(getUpperStairOptions(current).up.available).toBe(false);
    expect(startUpperStairAssist(current, 'up')).toBeNull();
  });

  it('stops current exhibit ascents at both exterior landings without entering either hall', () => {
    let current = worldState(12.85, -23, 'ground');
    for (const [landing, label, flights] of [
      ['landing-2', '二层绘世厅门口', ['flight-1', 'flight-2']],
      ['landing-4', '三层佛法厅门口', ['flight-3', 'flight-4']],
    ] as const) {
      expect(getUpperStairOptions(current, true).up).toEqual({ available: true, label, surfaceId: landing });
      expect(startUpperStairAssist(current, 'up', true)?.destination.label).toBe(label);
      const trip = completeTrip(current, 'up', true);
      expect(trip.visitedFlights).toEqual(flights);
      expect(trip.visitedSurfaces.has('hall-a') || trip.visitedSurfaces.has('hall-b')).toBe(false);
      expect(trip.current.surfaceId).toBe(landing);
      const point = upperFromWorld(trip.current.position);
      expect(point.x).toBeCloseTo(20.3, 2);
      expect(point.z).toBeCloseTo(-23, 2);
      expect(isUpperStairAssistArea(trip.current)).toBe(true);
      current = trip.current;
    }
    expect(getUpperStairOptions(current, true).up.available).toBe(false);
    expect(startUpperStairAssist(current, 'up', true)).toBeNull();
  });

  it('returns from the third floor to the second-floor stair landing without entering the mural hall', () => {
    const thirdFloor = worldState(20.3, -23, 'landing-4');
    expect(getUpperStairOptions(thirdFloor, true).down).toEqual({
      available: true, label: '二层楼梯平台', surfaceId: 'landing-2',
    });
    const toSecond = completeTrip(thirdFloor, 'down', true);
    expect(toSecond.visitedFlights).toEqual(['flight-4', 'flight-3']);
    expect(toSecond.visitedSurfaces.has('hall-a')).toBe(false);
    expect(toSecond.current.surfaceId).toBe('landing-2');
    expect(isUpperStairAssistArea(toSecond.current, true)).toBe(true);

    const toGround = completeTrip(toSecond.current, 'down', true);
    expect(toGround.visitedFlights).toEqual(['flight-2', 'flight-1']);
    expect(toGround.visitedSurfaces.has('hall-a')).toBe(false);
    expect(toGround.current.surfaceId).toBe('ground');
  });

  it('keeps the same route and real-time travel duration at 12 fps and 30 fps', () => {
    let normal = worldState(12.85, -23, 'ground'), slow = worldState(12.85, -23, 'ground');
    for (const [direction, destination] of [
      ['up', 'hall-a'], ['up', 'hall-b'], ['down', 'hall-a'], ['down', 'ground'],
    ] as const) {
      const normalTrip = completeFrameTrip(normal, direction, 30);
      const slowTrip = completeFrameTrip(slow, direction, 12);
      expect(normalTrip.current.surfaceId).toBe(destination);
      expect(slowTrip.current.surfaceId).toBe(destination);
      expect(slowTrip.current.position.x).toBeCloseTo(normalTrip.current.position.x, 6);
      expect(slowTrip.current.position.z).toBeCloseTo(normalTrip.current.position.z, 6);
      // Arrival is observed on the next rendered frame, so allow one frame at each rate.
      expect(Math.abs(slowTrip.seconds - normalTrip.seconds)).toBeLessThanOrEqual(1 / 12 + 1 / 30 + 1e-6);
      expect(slowTrip.seconds).toBeLessThanOrEqual(8 + 1 / 12);
      normal = normalTrip.current; slow = slowTrip.current;
    }
  });

  it('caps an abnormally long frame to 150 ms without jumping over the staircase', () => {
    const flight = MOGAO_UPPER_LAYOUT.surfaces.find(s => s.id === 'flight-3')!;
    const current = worldState((flight.minX + flight.maxX) / 2, (flight.minZ + flight.maxZ) / 2, flight.id);
    const assist = startUpperStairAssist(current, 'up')!;
    const capped = advanceUpperStairAssistFrame(assist, current, .15);
    for (const dt of [1, 30]) {
      const step = advanceUpperStairAssistFrame(assist, current, dt);
      expect(step.walk).toEqual(capped.walk);
      expect(step.done).toBe(false);
      expect(step.blocked).toBe(false);
      expect(step.assist).not.toBeNull();
      expect(step.walk.surfaceId).toBe(flight.id);
      expect(Math.hypot(step.delta.x, step.delta.z)).toBeLessThanOrEqual(4.2 * .15 + 1e-6);
      expect(Math.abs(upperFloorHeight(step.walk.position, step.walk.surfaceId)! - upperFloorHeight(current.position, current.surfaceId)!))
        .toBeLessThanOrEqual(4.2 * .15 * UPPER_MAX_SLOPE + .045);
      expect(upperNavigation.validOnSurface(upperFromWorld(step.walk.position), step.walk.surfaceId!)).toBe(true);
    }
  });

  it('can recover from both edges of every unrailed flight and refuses distant starts', () => {
    for (const surface of MOGAO_UPPER_LAYOUT.surfaces.filter(s => s.kind === 'ramp')) {
      const upperInterval = Math.min(surface.y, surface.endY!) >= 8.11 - 1e-6;
      for (const [x, direction, destination] of [
        [surface.minX + PLAYER_RADIUS + .001, 'up', upperInterval ? 'hall-b' : 'hall-a'],
        [surface.maxX - PLAYER_RADIUS - .001, 'down', upperInterval ? 'hall-a' : 'ground'],
      ] as const) {
        const current = worldState(x, (surface.minZ + surface.maxZ) / 2, surface.id);
        const options = getUpperStairOptions(current);
        expect(options.up.available && options.down.available).toBe(true);
        expect(completeTrip(current, direction).current.surfaceId).toBe(destination);
      }
    }
    expect(startUpperStairAssist(worldState(23, -15, 'hall-a'), 'up')).toBeNull();
    expect(startUpperStairAssist(worldState(11.2, -12.2, 'view-a'), 'up')).toBeNull();
  });
});
