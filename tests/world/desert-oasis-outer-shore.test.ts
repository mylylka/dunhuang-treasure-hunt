import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { DESERT_OASIS_PLACEMENTS, type OasisPlacement } from '../../src/content/world/desert-oasis-layout-v013';
import { LAKE_SHORELINE } from '../../src/content/world/terrain-layout-v001';

function fingerprint(rows: readonly OasisPlacement[]) {
  const fields = rows.map(p => [p.area, p.id, p.x, p.z, p.height, p.yaw, p.tone, p.burial, p.baseY ?? null]);
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

// Measure against the actual water outline, independently of the planting generator.
// On the 3,452-placement baseline this selects exactly all 1,229 outer-bank roots.
function outerBankStation(plant: OasisPlacement) {
  const distances = LAKE_SHORELINE.map(p => Math.hypot(p.x - plant.x, p.z - plant.z));
  const distance = Math.min(...distances);
  const station = distances.indexOf(distance);
  return distance < 15 && station < 80 ? station : null;
}

it('retains every inner-bank, valley, road and venue placement from the approved landscape', () => {
  const protectedPlants = DESERT_OASIS_PLACEMENTS.filter(p => outerBankStation(p) === null);
  // Captured before thinning, in original order: 1,189 inner-bank and 1,034 other placements.
  expect(protectedPlants).toHaveLength(2223);
  expect(fingerprint(protectedPlants)).toBe('3e56d8446625c5c707112afb76d671f98c513f157d0a61dce4de748e682fa878');
});

it('retains four original outer-bank trees and seven irregular pockets of low grass', () => {
  const outer = DESERT_OASIS_PLACEMENTS.filter(p => outerBankStation(p) !== null);
  const grass = outer.filter(p => p.id === 'g02');
  const trees = outer.filter(p => p.id !== 'g02');
  expect(trees).toHaveLength(4);
  expect(fingerprint(trees)).toBe('53535aa8b0de17e23c1f3d0fcbe543e26befddee1a673867a64d254b6031892a');
  expect(grass).toHaveLength(23);
  expect(grass.every(p => p.height > .25 && p.height < .65)).toBe(true);

  const stations = grass.map(p => outerBankStation(p)!).sort((a, b) => a - b);
  const pocketSizes: number[] = [];
  stations.forEach((station, index) => {
    if (!index || station - stations[index - 1] > 3) pocketSizes.push(0);
    pocketSizes[pocketSizes.length - 1]++;
  });
  expect(pocketSizes).toEqual([2, 7, 1, 4, 3, 5, 1]);
});
