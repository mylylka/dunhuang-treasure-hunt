/** Rock groups marked in the connected first-gallery landscape review. */
export const ENLARGED_COURTYARD_ROCKS = new Set([
  'rock-west-group-large', 'rock-west-group-small', 'rock-west-group-flat',
]);
export const COURTYARD_ROCK_SCALE = 1.18;
export const REFINED_COURTYARD_ROCKS = new Set([
  ...ENLARGED_COURTYARD_ROCKS,
  'rock-east-group-large', 'rock-east-group-medium', 'rock-east-group-small',
  'rock-road-east-low',
]);


// This front-gate cluster was integrated into a lower landscape composition.
const REPLACED_COURTYARD_ROCKS = new Set([
  ...ENLARGED_COURTYARD_ROCKS,
  'shrub-rock-west-large', 'rock-road-west-single', 'rock-road-west-low', 'shrub-rock-west-low',
  'rock-east-group-large', 'rock-east-group-medium', 'rock-east-group-small', 'shrub-rock-east-large',
  'rock-road-east-single', 'shrub-rock-east-single',
]);
export function isReplacedCourtyardRock(id = '') {
  return REPLACED_COURTYARD_ROCKS.has(id.replace(/^terrain-courtyard-/, ''));
}
