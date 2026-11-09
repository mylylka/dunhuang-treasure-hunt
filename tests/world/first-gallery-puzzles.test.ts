import { describe, expect, it } from 'vitest';
import {
  CAISSON_EAR_HOTSPOTS, CAISSON_EARS, CAISSON_RABBIT_HOTSPOTS, CAISSON_RABBITS,
  FIRST_GALLERY_MURAL_ROUNDS, MURAL_ROUNDS, caissonTargets, createCaissonState, hitCaissonTarget,
  muralRoundArt, nextMuralRound, selectCaissonTarget, type CaissonSelection, type CaissonState,
} from '../../src/world/first-gallery-puzzles';

describe('first gallery mural puzzles', () => {
  it('picks the next outstanding round and exposes its actual candidate set', () => {
    expect(nextMuralRound([])).toBe('lotus');
    expect(nextMuralRound(['lotus'])).toBe('bird');
    expect(nextMuralRound(['lotus', 'bird'])).toBe('grapes');
    expect(nextMuralRound(MURAL_ROUNDS)).toBeNull();
    for (const [round, count] of [['lotus', 3], ['bird', 2], ['grapes', 3]] as const) {
      const pieces = muralRoundArt(round).pieces;
      expect(pieces).toHaveLength(count);
      expect(pieces.filter(piece => piece.id === FIRST_GALLERY_MURAL_ROUNDS[round].correctPiece)).toHaveLength(1);
    }
  });
});

describe('three hares in the actual caisson artwork', () => {
  function tap(state: CaissonState, target: CaissonSelection) {
    const point = target.kind === 'rabbit' ? CAISSON_RABBIT_HOTSPOTS[target.id].center : CAISSON_EAR_HOTSPOTS[target.id].center;
    const selected = hitCaissonTarget(state, point, 10);
    expect(selected).toEqual(target);
    return selectCaissonTarget(state, selected!);
  }

  for (const first of CAISSON_RABBITS) {
    for (const second of CAISSON_RABBITS.filter(id => id !== first)) {
      for (const sharedFirst of [true, false]) {
        it(`finds ${first} then ${second} with the shared ear ${sharedFirst ? 'first' : 'last'}`, () => {
          const start = createCaissonState();
          const third = CAISSON_RABBITS.find(id => id !== first && id !== second)!;
          const firstEars = CAISSON_RABBIT_HOTSPOTS[first].ears;
          const secondEars = CAISSON_RABBIT_HOTSPOTS[second].ears;
          const shared = secondEars.find(ear => firstEars.includes(ear))!;
          const other = secondEars.find(ear => ear !== shared)!;
          const [firstEar, lastEar] = sharedFirst ? firstEars : [...firstEars].reverse();
          const [firstSecondEar, lastSecondEar] = sharedFirst ? [shared, other] : [other, shared];

          let state = tap(start, { kind: 'rabbit', id: first }).state;
          expect(state).toEqual({ step: 'ears', current: first, found: [], rabbits: [first], ears: [] });
          expect(tap(state, { kind: 'ear', id: other })).toEqual({ state, result: 'incorrect' });
          state = tap(state, { kind: 'ear', id: firstEar }).state;
          expect(state).toMatchObject({ step: 'ears', found: [firstEar], ears: [firstEar] });
          expect(tap(state, { kind: 'ear', id: firstEar })).toEqual({ state, result: 'repeat' });
          expect(selectCaissonTarget(state, { kind: 'rabbit', id: second })).toEqual({ state, result: 'incorrect' });
          state = tap(state, { kind: 'ear', id: lastEar }).state;
          expect(state).toEqual({ step: 'rabbit', rabbits: [first], ears: [firstEar, lastEar] });
          expect(tap(state, { kind: 'rabbit', id: first })).toEqual({ state, result: 'repeat' });

          state = tap(state, { kind: 'rabbit', id: second }).state;
          expect(state).toMatchObject({ step: 'ears', current: second, found: [], rabbits: [first, second], ears: [firstEar, lastEar] });
          const wrongSecond = firstEars.find(ear => ear !== shared)!;
          expect(tap(state, { kind: 'ear', id: wrongSecond })).toEqual({ state, result: 'incorrect' });
          const confirmed = tap(state, { kind: 'ear', id: firstSecondEar });
          expect(confirmed.result).toBe('accepted');
          state = confirmed.state;
          expect(state).toMatchObject({ step: 'ears', current: second, found: [firstSecondEar], ears: sharedFirst ? [firstEar, lastEar] : [firstEar, lastEar, other] });
          expect(tap(state, { kind: 'ear', id: firstSecondEar })).toEqual({ state, result: 'repeat' });
          expect(selectCaissonTarget(state, { kind: 'rabbit', id: third })).toEqual({ state, result: 'incorrect' });

          state = tap(state, { kind: 'ear', id: lastSecondEar }).state;
          expect(state).toEqual({ step: 'reveal', rabbits: [first, second], ears: [firstEar, lastEar, other], shared, remaining: third });
          expect(tap(state, { kind: 'rabbit', id: first })).toEqual({ state, result: 'repeat' });
          expect(tap(state, { kind: 'rabbit', id: second })).toEqual({ state, result: 'repeat' });
          expect(selectCaissonTarget(state, { kind: 'ear', id: shared })).toEqual({ state, result: 'incorrect' });

          const complete = tap(state, { kind: 'rabbit', id: third });
          expect(complete).toEqual({ state: { step: 'complete', rabbits: [first, second, third], ears: [firstEar, lastEar, other], shared }, result: 'accepted' });
          expect(new Set(complete.state.ears)).toEqual(new Set(CAISSON_EARS));
          expect(caissonTargets(complete.state)).toEqual([]);
          expect(selectCaissonTarget(complete.state, { kind: 'rabbit', id: third })).toEqual({ state: complete.state, result: 'incorrect' });
        });
      }
    }
  }

  it('does not accept a point far from the actual ink contours', () => {
    expect(hitCaissonTarget(createCaissonState(), [315, 320], 10)).toBeUndefined();
  });
});
