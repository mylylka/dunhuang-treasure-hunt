import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import baseBounds from '../../src/content/world/desert-decoration-bounds-v001.json';
import additionalBounds from '../../src/content/world/desert-decoration-bounds-v002.json';
import courtyardBounds from '../../src/content/world/desert-decoration-bounds-v004.json';
import shrubBounds from '../../src/content/world/desert-decoration-bounds-v006.json';
import { DESERT_DECORATION_LAYOUT, DESERT_DECORATION_PREVIOUS_LAYOUT } from '../../src/content/world/desert-decoration-layout-v001';
import { fromTerrainPoint, LAKE_SHORELINE, LAKE_WATER_LEVEL, lakeSignedDistance, TERRAIN_ANCHORS, TERRAIN_ROUTES } from '../../src/content/world/terrain-layout-v001';
import { environmentSurfaceHeight } from '../../src/content/world/environment-layout-v001';
import { desertDecorationRootFootprint, resolveDesertDecorations } from '../../src/world/desert-decoration-placement';
import { createMusicInteriorNavigation } from '../../src/world/music-interior-navigation';
import { terrainPlantFits, terrainRoadClearance } from '../../src/world/terrain-planting-v003';

describe('desert decoration placement', () => {
  const locations = resolveDesertDecorations();
  const previous = resolveDesertDecorations({ version: 'v004' });
  const bounds = { ...baseBounds, ...additionalBounds, ...courtyardBounds, ...shrubBounds };
  const radius = (location: typeof locations[number]) => {
    const asset = bounds[location.assetId];
    return Math.hypot(asset.width, asset.depth) * location.scale / 2;
  };
  const groupFor = (location: typeof locations[number]) =>
    DESERT_DECORATION_LAYOUT.find(group => location.id.startsWith(`${group.region}-${group.id}-`))!;

  it('preserves the enabled v004 layout and uses sparse composed ground groups in the current world', () => {
    expect(previous).toHaveLength(461);
    expect(locations.length).toBeLessThan(65);
    expect(locations.some(location => location.roadVerge)).toBe(false);
    expect(previous.some(location => location.roadVerge === 'courtyard-to-valley')).toBe(true);
    const oldTree = previous.find(placement => placement.id === 'a-oasis-first-court-frame-1')!;
    const tree = locations.find(placement => placement.id === oldTree.id)!;
    const oldRoot = desertDecorationRootFootprint(oldTree, oldTree.assetId, oldTree.scale, oldTree.yaw)[4];
    const root = desertDecorationRootFootprint(tree, tree.assetId, tree.scale, tree.yaw)[4];
    expect(tree.assetId).toBe('small-tree-2');
    expect(tree.scale * bounds['small-tree-2'].height).toBeCloseTo(3, 8);
    expect(Math.hypot(root.x - oldRoot.x, root.z - oldRoot.z)).toBeLessThan(.01);
    for (const i of [1, 2]) {
      const oldTree = previous.find(placement => placement.id === `a-west-road-tree-beacons-${i + 1}`)!;
      const tree = locations.find(placement => placement.id === `a-dune-road-tree-silhouettes-${i}`)!;
      const usedRoot = desertDecorationRootFootprint(tree, tree.assetId, tree.scale, tree.yaw)[4];
      const previousRoot = desertDecorationRootFootprint(oldTree, oldTree.assetId, oldTree.scale, oldTree.yaw)[4];
      expect(Math.hypot(usedRoot.x - previousRoot.x, usedRoot.z - previousRoot.z)).toBeLessThan(.01);
    }
    const foreground = locations.filter(location => location.id.startsWith('a-gallery-entry-foreground-'));
    expect(foreground).toHaveLength(3);
    const extent = foreground.map(item => ({
      min: item.x - bounds[item.assetId].width * item.scale / 2,
      max: item.x + bounds[item.assetId].width * item.scale / 2,
    }));
    const width = Math.max(...extent.map(item => item.max)) - Math.min(...extent.map(item => item.min));
    expect(width).toBeGreaterThan(3);
    expect(width).toBeLessThan(5);
  });

  it('resolves each authored location without moving it into a new sector', () => {
    expect(locations.filter(location => !location.roadVerge)).toHaveLength(DESERT_DECORATION_LAYOUT
      .filter(group => !group.roadVerge).reduce((count, group) => count + group.entries.length, 0));
    expect(new Set(locations.map(location => location.id)).size).toBe(locations.length);
    for (const location of locations) {
      const group = groupFor(location);
      const index = Number(location.id.split('-').at(-1)) - 1;
      const [, x, z] = group.entries[index];
      const position = group.coordinateSpace === 'music-local' ? fromTerrainPoint('music', location) : location;
      if (group.wallAlignment || group.shoreBand) {
        expect(Math.hypot(position.x - x, position.z - z)).toBeLessThan(5);
      } else {
        expect(position.x).toBeCloseTo(x, 8);
        expect(position.z).toBeCloseTo(z, 8);
      }
      expect(Number.isFinite(location.y)).toBe(true);
    }
  });

  it('keeps outdoor footprints clear of both routes, the lake, the deeper courtyard and tower stairs', () => {
    for (const location of locations) {
      const group = groupFor(location);
      if (location.requiresMusicCourtyard || group.shoreBand || group.roadVerge) continue;
      const margin = radius(location);
      if (group.wallRoot) {
        expect(terrainRoadClearance(location)).toBeGreaterThan(margin + .55);
        expect(lakeSignedDistance(location.x, location.z)).toBeGreaterThanOrEqual(margin + .3);
        if (location.region === 'd') {
          expect(Math.abs(fromTerrainPoint('cliff', location).x - 122)).toBeGreaterThan(margin + 7.35);
        }
        continue;
      }
      const local = fromTerrainPoint('music', location);
      const courtClearance = Math.hypot(
        Math.max(24 - local.x, local.x - 70, 0),
        Math.max(-33.1 - local.z, local.z - 3, 0),
      );
      expect(terrainPlantFits(location, margin)).toBe(true);
      expect(courtClearance).toBeGreaterThan(margin + 1.35);
      if (location.region === 'd') {
        const foot = TERRAIN_ANCHORS.cliffStairFoot;
        expect(Math.hypot(location.x - foot.x, location.z - foot.z)).toBeGreaterThan(margin + 13);
      }
    }
  });

  it('preserves both historical paved verges in the v004 comparison', () => {
    for (const route of TERRAIN_ROUTES) {
      const verge = previous.filter(location => location.roadVerge === route.id);
      const shrubs = verge.filter(location => location.assetId === 'shrub-2');
      const leads = verge.filter(location => Number(location.id.split('-').at(-1)) % 3 === 1);
      expect(shrubs.length).toBeGreaterThanOrEqual(leads.length / 2);
      for (const shrub of shrubs) {
        const size = Math.max(bounds['shrub-2'].width, bounds['shrub-2'].depth) * shrub.scale;
        expect(size).toBeGreaterThanOrEqual(1.199);
        expect(size).toBeLessThanOrEqual(1.451);
      }
      let positiveSide = 0;
      for (const plant of verge) {
        const gap = terrainRoadClearance(plant) - radius(plant);
        expect(gap).toBeGreaterThanOrEqual(.25);
        expect(gap).toBeLessThanOrEqual(1);
        expect(plant.venue).toBeUndefined();
        const nearest = route.points.reduce((best, p, i) =>
          Math.hypot(p.x - plant.x, p.z - plant.z) < Math.hypot(route.points[best].x - plant.x, route.points[best].z - plant.z) ? i : best, 0);
        const a = route.points[Math.max(0, nearest - 1)];
        const b = route.points[Math.min(route.points.length - 1, nearest + 1)];
        if ((b.x - a.x) * (plant.z - a.z) - (b.z - a.z) * (plant.x - a.x) > 0) positiveSide++;
      }
      expect(positiveSide).toBeGreaterThan(25);
      expect(verge.length - positiveSide).toBeGreaterThan(25);
    }
  });

  it('keeps two low pockets visible from the route overlook with an open gap between them', () => {
    const shore = locations.filter(location => location.shoreBand);
    const south = shore.filter(location => location.id.startsWith('b-crescent-south-pocket-'));
    const mid = shore.filter(location => location.id.startsWith('b-crescent-mid-pocket-'));
    expect(shore).toEqual([...south, ...mid]);
    expect(south).toHaveLength(5);
    expect(mid).toHaveLength(5);
    for (const [pocket, shoreStart] of [[south, 66], [mid, 54]] as const) {
      const arc = LAKE_SHORELINE.slice(shoreStart - 1, shoreStart + 6);
      for (const plant of pocket) {
        expect(arc.some(point => Math.hypot(plant.x - point.x, plant.z - point.z) < 3.5)).toBe(true);
      }
    }
    for (const point of south) {
      expect(Math.min(...mid.map(plant => Math.hypot(plant.x - point.x, plant.z - point.z)))).toBeGreaterThan(15);
    }

    // The in-game 16:9 overlook camera recorded for the fourth reference.
    const camera = new PerspectiveCamera(49, 16 / 9, .2, 1000);
    camera.position.set(135.83, 21.046, 22.61);
    camera.lookAt(144.278, 18.346, 21.669);
    camera.updateMatrixWorld();
    const ray = new Vector3();
    for (const plant of shore) {
      const height = bounds[plant.assetId].height * plant.scale;
      expect(height).toBeLessThan(1.3);
      const crown = new Vector3(plant.x, plant.y + height * .72, plant.z);
      const projected = crown.clone().project(camera);
      expect(Math.max(Math.abs(projected.x), Math.abs(projected.y), Math.abs(projected.z))).toBeLessThan(1);
      for (let i = 1; i < 160; i++) {
        ray.lerpVectors(camera.position, crown, i / 160);
        expect(ray.y).toBeGreaterThan(environmentSurfaceHeight(ray.x, ray.z));
      }
    }
  });

  it('keeps two low stone groups on the open side of the cliff route', () => {
    const rocks = locations.filter(location => location.id.startsWith('d-gobi-route-far-bends-'));
    expect(rocks.map(location => location.assetId)).toEqual(['rock-shrub-3', 'r02', 'rock-shrub-3', 'r02']);
    const nearRidge = rocks.filter(rock => rock.x >= 278 && rock.x <= 282 && rock.z >= 39 && rock.z <= 42);
    expect(nearRidge).toHaveLength(2);
    for (const rock of nearRidge) {
      expect(terrainRoadClearance(rock)).toBeGreaterThan(radius(rock) + .55);
      expect(bounds[rock.assetId].height * rock.scale).toBeLessThan(.85);
    }
  });

  it('keeps bank plants at authored proportions and their full root footprints dry', () => {
    for (const plant of locations) {
      const group = groupFor(plant);
      const index = Number(plant.id.split('-').at(-1)) - 1;
      const [, , , target, , sizeBy] = group.entries[index];
      const asset = bounds[plant.assetId];
      const taggedPlant = plant.shoreBand && ['w01b', 'shrub-1', 'shrub-2'].includes(plant.assetId);
      const dimension = sizeBy === 'height' ? asset.height : Math.max(asset.width, asset.depth);
      expect(plant.scale).toBeCloseTo(target / dimension, 12);
      if (taggedPlant) {
        const roots = desertDecorationRootFootprint(plant, plant.assetId, plant.scale, plant.yaw);
        expect(plant.y).toBeGreaterThan(LAKE_WATER_LEVEL);
        for (const root of roots) {
          expect(lakeSignedDistance(root.x, root.z)).toBeGreaterThanOrEqual(.0349);
          expect(environmentSurfaceHeight(root.x, root.z)).toBeGreaterThan(LAKE_WATER_LEVEL + .025);
        }
      }
      if (plant.shoreBand || plant.roadVerge) expect(plant.venue).toBeUndefined();
      if (plant.requiresMusicCourtyard) expect(plant.venue).toBe('music');
    }
    expect(locations.filter(location => location.id.startsWith('c-pavilion-front-'))).toHaveLength(4);
    expect(locations.filter(location => location.id.startsWith('c-pavilion-')).every(location => location.venue === 'music')).toBe(true);
    expect(locations.filter(location => location.id.startsWith('d-cliff-step-flank-')).every(location => location.venue === 'cliff')).toBe(true);
  });

  it('stages both shrub profiles across the shoreline and the pavilion', () => {
    for (const region of ['b', 'c']) {
      const shrubs = locations.filter(location => location.region === region
        && (location.assetId === 'shrub-1' || location.assetId === 'shrub-2'));
      expect(new Set(shrubs.map(shrub => shrub.assetId))).toEqual(new Set(['shrub-1', 'shrub-2']));
      const heights = shrubs.map(shrub => bounds[shrub.assetId].height * shrub.scale);
      expect(Math.min(...heights)).toBeLessThan(.38);
      expect(Math.max(...heights)).toBeGreaterThan(.65);
    }
  });

  it('keeps the earlier large-bank sizing available for the enabled comparison', () => {
    const shore = previous.filter(plant => plant.shoreBand && ['w01b', 'shrub-2'].includes(plant.assetId));
    expect(shore).toHaveLength(109);
    for (const plant of shore) {
      const group = DESERT_DECORATION_PREVIOUS_LAYOUT.find(group => plant.id.startsWith(`${group.region}-${group.id}-`))!;
      const index = Number(plant.id.split('-').at(-1)) - 1;
      const target = group.entries[index][3];
      const asset = bounds[plant.assetId];
      expect(plant.scale).toBeCloseTo(target * 3 / Math.max(asset.width, asset.depth), 12);
    }
  });

  it('pulls the front-wall scenery in along its wall normal while preserving the dry roots and solid plant bases', () => {
    const frontWall = locations.filter(location => location.id.startsWith('c-pavilion-front-'));
    for (const plant of frontWall) {
      const group = groupFor(plant);
      const index = Number(plant.id.split('-').at(-1)) - 1;
      const [, x, z] = group.entries[index];
      const original = fromTerrainPoint('music', { x, z });
      const center = fromTerrainPoint('music', plant);
      expect(plant.wallRoot).toBe(true);
      expect(center.x).toBeCloseTo(original.x, 8);
      expect(center.z).toBeLessThan(original.z - .25);
      const roots = desertDecorationRootFootprint(plant, plant.assetId, plant.scale, plant.yaw);
      expect(Math.min(...roots.map(root => fromTerrainPoint('music', root).z))).toBeGreaterThan(3.25 + .049);
    }
  });

  it('uses one crown language and a clear hierarchy for the added small trees', () => {
    const trees = locations.filter(location => ['small-tree-2', 't01', 't02', 't03'].includes(location.assetId));
    expect(trees).toHaveLength(3);
    for (const tree of trees) {
      expect(tree.assetId).toBe('small-tree-2');
      expect(tree.scale * bounds[tree.assetId].height).toBeGreaterThanOrEqual(1.8);
      expect(tree.scale * bounds[tree.assetId].height).toBeLessThanOrEqual(3.6);
      expect(terrainRoadClearance(tree)).toBeGreaterThan(8.5 + radius(tree));
      expect(tree.pitch ?? 0).toBe(0);
      expect(tree.roll ?? 0).toBe(0);
    }
    expect(locations.some(rock => rock.assetId === 'r03' || Math.abs(rock.roll ?? 0) >= Math.PI / 6)).toBe(false);
  });

  it('keeps solid rocks distinct while soft foliage overlaps to fill gaps', () => {
    const rocks = locations.filter(location => ['r01', 'r02', 'r03', 'r04', 'c02', 'c04'].includes(location.assetId));
    for (const [index, location] of rocks.entries()) {
      for (const other of rocks.slice(index + 1)) {
        expect(Math.hypot(location.x - other.x, location.z - other.z)).toBeGreaterThan(radius(location) + radius(other));
      }
    }
  });

  it('places the courtyard group on the existing paving away from the gates and stairs', () => {
    const nav = createMusicInteriorNavigation({ compactBalcony: true });
    const court = locations.filter(location => location.requiresMusicCourtyard);
    expect(court.length).toBeGreaterThan(0);
    for (const location of court) {
      const state = { position: location, surfaceId: 'music-courtyard' };
      const local = fromTerrainPoint('music', location);
      expect(nav.musicInteriorValid(state)).toBe(true);
      expect(location.y).toBeCloseTo(nav.musicInteriorHeight(state) + .03, 8);
      expect(local.x).toBeGreaterThan(65.5);
      expect(local.z).toBeGreaterThan(-13.5);
      expect(local.z).toBeLessThan(-4.5);
    }
  });
});
