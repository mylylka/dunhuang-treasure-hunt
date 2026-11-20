import * as THREE from 'three';
import originalBounds from '../content/world/desert-decoration-bounds-v001.json';
import additionalBounds from '../content/world/desert-decoration-bounds-v002.json';
import compositionBounds from '../content/world/desert-decoration-bounds-v004.json';
import shrubBounds from '../content/world/desert-decoration-bounds-v006.json';
import { desertDecorationShape } from './desert-decoration-overlook';
import { environmentSampleAxes, environmentSurfaceHeight } from '../content/world/environment-layout-v001';
import { LAKE_WATER_LEVEL, lakeMayBeWithin, lakeSignedDistance } from '../content/world/terrain-layout-v001';
import type { DesertDecorationPlacement } from './desert-decoration-placement';
import { ENVIRONMENT_SUN_DIRECTION } from './terrain-environment-lighting-v001';

const assetBounds = { ...originalBounds, ...additionalBounds, ...compositionBounds, ...shrubBounds };
const downstream = new THREE.Vector2(-ENVIRONMENT_SUN_DIRECTION.x, -ENVIRONMENT_SUN_DIRECTION.z);
const projectionPerMetre = downstream.length() / ENVIRONMENT_SUN_DIRECTION.y;
downstream.normalize();

type Venue = 'outdoor' | 'music' | 'cliff';
type GeometryBatch = { positions: number[]; indices: number[] };
type Batch = GeometryBatch & { colors: number[] };
type AddShadowVertex = (x: number, z: number, alpha: number) => void;
type GroundHeight = (x: number, z: number) => number;

function cachedGroundHeight(): GroundHeight {
  const { xs, zs } = environmentSampleAxes();
  const samples = new Map<number, number>();
  function cell(axis: readonly number[], coordinate: number) {
    let low = 0, high = axis.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (axis[middle] <= coordinate) low = middle;
      else high = middle;
    }
    return low;
  }
  function corner(i: number, j: number) {
    const id = i + j * xs.length;
    const sample = samples.get(id);
    if (sample !== undefined) return sample;
    const height = environmentSurfaceHeight(xs[i], zs[j]);
    samples.set(id, height);
    return height;
  }
  return (x, z) => {
    const i = cell(xs, x), j = cell(zs, z);
    const u = THREE.MathUtils.clamp((x - xs[i]) / (xs[i + 1] - xs[i]), 0, 1);
    const v = THREE.MathUtils.clamp((z - zs[j]) / (zs[j + 1] - zs[j]), 0, 1);
    const b = corner(i, j + 1), c = corner(i + 1, j);
    // The rendered sand cell is split on the same descending diagonal.
    if (u + v <= 1) {
      const a = corner(i, j);
      return a + (c - a) * u + (b - a) * v;
    }
    const d = corner(i + 1, j + 1);
    return d + (b - d) * (1 - u) + (c - d) * (1 - v);
  };
}

function appendTreeCanopy(
  batch: Batch,
  placement: DesertDecorationPlacement,
  height: number,
  alongRadius: number,
  acrossRadius: number,
  addVertex: AddShadowVertex,
  groundHeight: GroundHeight,
) {
  // Project the crown off the trunk in the same direction as the sun-baked
  // shadows. Correct the runout against the local elevation at its far end.
  const crownHeight = height * .71;
  let offset = crownHeight * projectionPerMetre;
  for (let i = 0; i < 2; i++) {
    const y = groundHeight(placement.x + downstream.x * offset, placement.z + downstream.y * offset);
    offset = THREE.MathUtils.clamp((placement.y + crownHeight - y) * projectionPerMetre, height * .47, height * 1.86);
  }
  const opacity = placement.castShadow ? .16 : .24;
  const radiusAlong = alongRadius * .88 + height * .11;
  const radiusAcross = acrossRadius * .92;
  const start = batch.positions.length / 3;
  const point = (dx: number, dz: number, alpha: number) => addVertex(
    placement.x + downstream.x * dx + downstream.y * dz,
    placement.z + downstream.y * dx - downstream.x * dz,
    alpha,
  );
  point(offset, 0, opacity);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const edge = .93 + .12 * Math.sin(i * 2.6 + placement.yaw);
    point(offset + Math.cos(angle) * radiusAlong * edge, Math.sin(angle) * radiusAcross * edge, 0);
    batch.indices.push(start, start + 1 + i, start + 1 + (i + 1) % 8);
  }
  // A feathered, narrow runout connects the crown to its tree even when the
  // detailed foliage and its real far shadow are not in the render budget.
  const stem = start + 9;
  point(offset * .16, 0, opacity * .60);
  point(offset * .50, -.10 * placement.scale, 0);
  point(offset * .52, 0, opacity * .46);
  point(offset * .50, .10 * placement.scale, 0);
  point(offset * .89, 0, opacity * .28);
  batch.indices.push(stem, stem + 2, stem + 3, stem, stem + 1, stem + 2,
    stem + 2, stem + 4, stem + 3, stem + 1, stem + 4, stem + 2);
}

function appendShadow(batch: Batch, placement: DesertDecorationPlacement, groundHeight: GroundHeight,
  composition: boolean, baked: boolean) {
  const { assetId, scale, yaw, roll = 0, castShadow, requiresMusicCourtyard, wallRoot } = placement;
  const bounds = assetBounds[assetId];
  if (!bounds) return;
  const tree = assetId === 't01' || assetId === 't02' || assetId === 't03' || assetId === 'small-tree-2';
  const small = !wallRoot && (assetId === 'r01' || assetId === 'g02');
  const looseFoliage = assetId === 'g02' || assetId === 'w01b' || assetId === 's02' || assetId === 's04b';
  const originalHeight = bounds.height * scale;
  const laidOnSide = (assetId === 'r02' || assetId === 'r04') && Math.abs(roll) > .35;
  const width = scale * bounds.width * (tree ? .18 : 1);
  const depth = scale * bounds.depth * (tree ? .18 : 1);
  const rotatedWidth = laidOnSide ? width * Math.cos(roll) + originalHeight * Math.abs(Math.sin(roll)) : width;
  const height = laidOnSide ? originalHeight * Math.cos(roll) + width * Math.abs(Math.sin(roll)) : originalHeight;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const lean = laidOnSide ? -originalHeight * Math.sin(roll) * .43 : 0;
  const originX = placement.x + lean * c;
  const originZ = placement.z - lean * s;
  const localSunX = downstream.x * c - downstream.y * s;
  const localSunZ = downstream.x * s + downstream.y * c;
  const alongRadius = .55 * Math.hypot(rotatedWidth * localSunX, depth * localSunZ);
  const acrossRadius = .55 * Math.hypot(rotatedWidth * localSunZ, depth * localSunX);
  let reach = Math.min(height * projectionPerMetre * .73, 3.15);
  if (castShadow) reach = Math.min(height * .14, .35);
  if (wallRoot) reach = Math.min(height * .40, .46);
  const spread = looseFoliage ? .68 : 1;
  const opacity = composition ? .20
    : wallRoot ? (looseFoliage ? .33 : .42) : castShadow ? .24 : looseFoliage ? .25 : .38;
  if (composition) reach = Math.min(height * (baked ? .17 : .54), baked ? .17 : .36);
  const contactRadius = composition ? .76 : 1;
  const sides = small ? 6 : 8;
  const vertexStart = batch.positions.length / 3;

  function pushVertex(x: number, z: number, alpha: number) {
    // Courtyard placements sit in the built pavers rather than the sand mesh.
    const y = requiresMusicCourtyard ? placement.y + .005 : groundHeight(x, z);
    const bank = lakeMayBeWithin(x, z, .5)
      ? THREE.MathUtils.smoothstep(lakeSignedDistance(x, z), .04, .42)
      : 1;
    batch.positions.push(x, y + (composition ? .008 : .022), z);
    batch.colors.push(1, 1, 1, y > LAKE_WATER_LEVEL + .012 ? alpha * bank : 0);
  }
  pushVertex(originX, originZ, opacity);

  const ringCount = small ? 1 : 2;
  for (let ring = 0; ring < ringCount; ring++) {
    const outer = ring === ringCount - 1;
    const radius = outer ? 1 : wallRoot ? .54 : .48;
    for (let side = 0; side < sides; side++) {
      const angle = side * 2 * Math.PI / sides;
      const along = Math.cos(angle);
      const forward = along > 0;
      const length = forward ? alongRadius + reach : alongRadius * .82;
      const x = along * length * radius * contactRadius;
      const z = Math.sin(angle) * acrossRadius * spread * radius * contactRadius;
      pushVertex(originX + downstream.x * x + downstream.y * z,
        originZ + downstream.y * x - downstream.x * z,
        outer ? 0 : opacity * (forward ? .64 : .52));
    }
  }

  for (let side = 0; side < sides; side++) {
    const current = vertexStart + 1 + side;
    const next = vertexStart + 1 + (side + 1) % sides;
    batch.indices.push(vertexStart, current, next);
    if (!small) batch.indices.push(current, current + sides, next + sides, current, next + sides, next);
  }
  if (tree && !composition) appendTreeCanopy(batch, placement, height, alongRadius / .18, acrossRadius / .18, pushVertex, groundHeight);
}

function appendSunCaster(batch: GeometryBatch, placement: DesertDecorationPlacement, composition: boolean) {
  const proxy = desertDecorationShape(placement.assetId, composition);
  if (!proxy) return;
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(placement.pitch ?? 0, placement.yaw, placement.roll ?? 0, 'YXZ'));
  const point = new THREE.Vector3();
  const vertexStart = batch.positions.length / 3;
  for (let i = 0; i < proxy.positions.length; i += 3) {
    point.fromArray(proxy.positions, i).multiplyScalar(placement.scale).applyQuaternion(rotation);
    batch.positions.push(point.x + placement.x, point.y + placement.y, point.z + placement.z);
  }
  for (const index of proxy.indices) batch.indices.push(vertexStart + index);
}

function createGeometry(batch: GeometryBatch) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
  geometry.setIndex(batch.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Baked terrain-following contact shadows used by both model detail levels. */
export function createDesertGroundShadows(placements: readonly DesertDecorationPlacement[], composition: boolean) {
  const root = new THREE.Group();
  root.name = 'desert-decoration-ground-shadows';
  const batches = new Map<Venue, Batch>();
  const casterBatches = new Map<Venue, GeometryBatch>();
  const groundHeight = cachedGroundHeight();
  for (const placement of placements) {
    const venue = placement.venue ?? (placement.requiresMusicCourtyard ? 'music' : 'outdoor');
    let batch = batches.get(venue);
    if (!batch) {
      batch = { positions: [], colors: [], indices: [] };
      batches.set(venue, batch);
    }
    const height = assetBounds[placement.assetId].height * placement.scale;
    const baked = placement.wallRoot || (composition && (
      placement.castShadow || placement.assetId === 'rock-shrub-3' || placement.assetId === 'r02'
      || (height >= .34 && placement.assetId !== 'w01b')
    ));
    appendShadow(batch, placement, groundHeight, composition, baked);
    if (baked) {
      let sunBatch = casterBatches.get(venue);
      if (!sunBatch) {
        sunBatch = { positions: [], indices: [] };
        casterBatches.set(venue, sunBatch);
      }
      appendSunCaster(sunBatch, placement, composition);
    }
  }
  const material = new THREE.MeshBasicMaterial({
    color: composition ? '#4b381f' : '#24180e',
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const meshes = new Map<Venue, THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>();
  for (const [venue, batch] of batches) {
    if (!batch.indices.length) continue;
    const geometry = createGeometry(batch);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 4));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `desert-decoration-ground-shadows-${venue}`;
    mesh.visible = venue === 'outdoor';
    mesh.raycast = () => {};
    root.add(mesh);
    meshes.set(venue, mesh);
  }
  const casterMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const casters = new Map<Venue, THREE.Mesh>();
  for (const [venue, batch] of casterBatches) {
    if (!batch.indices.length) continue;
    // The existing environment bake assigns its caster layer. The native
    // maps handle sunlight strength, building occlusion and shadow softness.
    const mesh = new THREE.Mesh(createGeometry(batch), casterMaterial);
    mesh.name = `desert-decoration-sun-casters-${venue}`;
    mesh.layers.disable(0);
    mesh.castShadow = true;
    mesh.visible = venue === 'outdoor';
    mesh.raycast = () => {};
    root.add(mesh);
    casters.set(venue, mesh);
  }
  return {
    root,
    setVenueVisibility({ music, cliff }: { music: boolean; cliff: boolean }) {
      for (const batches of [meshes, casters]) {
        const musicMesh = batches.get('music'), cliffMesh = batches.get('cliff');
        if (musicMesh) musicMesh.visible = music;
        if (cliffMesh) cliffMesh.visible = cliff;
      }
    },
    cost(frustum: THREE.Frustum) {
      let draws = 0, triangles = 0;
      if (root.visible) for (const mesh of meshes.values()) {
        if (!mesh.visible || !frustum.intersectsObject(mesh)) continue;
        draws++;
        triangles += (mesh.geometry.index?.count ?? 0) / 3;
      }
      return { draws, triangles };
    },
    dispose() {
      root.removeFromParent();
      root.clear();
      for (const mesh of meshes.values()) mesh.geometry.dispose();
      meshes.clear();
      for (const mesh of casters.values()) mesh.geometry.dispose();
      casters.clear();
      material.dispose();
      casterMaterial.dispose();
    },
  };
}
