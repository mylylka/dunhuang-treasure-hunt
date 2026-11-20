import type { DesertDecorationAssetId } from './desert-decoration-layout-v001';

// Keep legacy plant placements disabled. The connected world streams the independent V013 layout.
export const CONNECTED_DESERT_VEGETATION = false;

const standaloneRock = new Set<DesertDecorationAssetId>(['r01', 'r02', 'r03', 'r04']);

export function isDesertVegetationAsset(assetId: DesertDecorationAssetId) {
  return !standaloneRock.has(assetId);
}

export function isEmbeddedCourtyardVegetation(name: string) {
  return /^(?:tree-|shrub-|road-grass)/.test(name) || name === 'hall-v003-workshop-shrubs';
}
