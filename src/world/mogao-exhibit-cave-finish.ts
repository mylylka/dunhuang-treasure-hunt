import * as THREE from 'three';
import legacyLayout from '../content/world/mogao-upper-v002.json';
import exhibitLayout from '../content/world/mogao-upper-v003.json';

export type MogaoCavePart = 'entry' | 'interior' | 'upper';
type StoneRole = 'wall' | 'ceiling' | 'floor';
export type MogaoCaveSurfaceCounts = Record<StoneRole, number>;

/** Linear RGB, from the approved v005 cave study. */
export const MOGAO_EXHIBIT_STONE = {
  wall: [.133, .111, .092],
  ceiling: [.103, .088, .075],
  floor: [.123, .099, .078],
} as const;

// The entry GLB also contains external stairs and the backing to the facade.
// The main chamber's Thousand Buddhas, narratives, caisson and floral skirts
// occupy separate materials. Only assign a finish to verified plain surfaces.
export function mogaoCaveStoneRole(part: MogaoCavePart, name: string, material: string): StoneRole | undefined {
  if (part === 'entry' && material === 'passage-shadow') {
    if (name === 'passage-head-v007') return 'ceiling';
    if (/^passage-return-v007--?1$/.test(name)) return 'wall';
  } else if (part === 'interior' && material === 'cave-plaster') {
    if (name === 'continuous-tunnel-ceiling-v010') return 'ceiling';
    if (/^(?:back-plinth|door-lintel|entry-head|(?:entry-wall|extended-tunnel-side|plain-door-jamb)(?:[._]?\d{3})?|side-shell--?1-[0-3])$/.test(name)) return 'wall';
  } else if (part === 'upper') {
    if (material === 'graybox-warm-stone' && /^(?:[ab]-(?:view-(?:link-)?)?floor|stair-entry-floor|slab-landing-[0-4])$/.test(name)) return 'floor';
    if (material === 'graybox-wood-tread' && /^flight-[1-4]-tread-\d+$/.test(name)) return 'floor';
    if (material === 'graybox-edge' && /^(?:stair-entry-opening|view-opening-[ab])-(?:lintel|jamb(?:[._]?\d{3})?)$/.test(name)) return 'wall';
    if (material === 'graybox-warm-plaster') {
      if (/^(?:[ab]-(?:vault-ceiling-(?:crown|(?:east|west|north|south)-\d+)|view-ceiling)|entry-side-ceiling|stair-top-ceiling)$/.test(name)) return 'ceiling';
      if (/^(?:[ab]-(?:east-wall|north-wall|south-east-wall|south-lintel|south-west-pier|view-(?:north|south)-wall|west-lintel|west-wall)|entry-side-(?:north|south)|stair-(?:back|east|west)-shell)$/.test(name)) return 'wall';
    }
  }
  return undefined;
}

/** Preserve the GLB geometry and maps. Clones split rock, roof and the hall floors
 * where the old graybox used the same warm plaster for several surfaces. */
export function applyMogaoExhibitCaveFinish(root: THREE.Object3D, part: MogaoCavePart) {
  const materials = new Set<THREE.MeshStandardMaterial>();
  const counts: MogaoCaveSurfaceCounts = { wall: 0, ceiling: 0, floor: 0 };
  const keptMaterials = new Set<THREE.Material>();
  const replacements = new Map<THREE.MeshStandardMaterial, Map<StoneRole, THREE.MeshStandardMaterial>>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const replace = (source: THREE.Material) => {
      const role = source instanceof THREE.MeshStandardMaterial && !source.map
        ? mogaoCaveStoneRole(part, object.name, source.name) : undefined;
      if (!role || !(source instanceof THREE.MeshStandardMaterial)) { keptMaterials.add(source); return source; }
      counts[role]++;
      let finishes = replacements.get(source);
      if (!finishes) { finishes = new Map(); replacements.set(source, finishes); }
      let finish = finishes.get(role);
      if (!finish) {
        finish = source.clone();
        finish.name = `mogao-exhibit-stone-${role}`;
        const [red, green, blue] = MOGAO_EXHIBIT_STONE[role];
        finish.color.setRGB(red, green, blue);
        // Floors and tread boxes are closed. Culling their internal back faces
        // keeps abutting treads from drawing two shaded faces at the same depth.
        if (role === 'floor') finish.side = THREE.FrontSide;
        finishes.set(role, finish);
        materials.add(finish);
      }
      return finish;
    };
    object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
  });
  for (const source of replacements.keys()) if (!keptMaterials.has(source)) source.dispose();
  return { materials, counts };
}

type FloorRect = readonly [minX: number, maxX: number, minZ: number, maxZ: number];

function fitFloorSection(mesh: THREE.Mesh, rect: FloorRect) {
  const [x0, x1, z0, z1] = rect;
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  mesh.scale.x = (x1 - x0) / size.x;
  mesh.scale.z = (z1 - z0) / size.z;
  mesh.position.x = (x0 + x1) / 2 - center.x * mesh.scale.x;
  mesh.position.z = (z0 + z1) / 2 - center.z * mesh.scale.z;
}

function addFloorSection(mesh: THREE.Mesh, name: string, rect: FloorRect) {
  const section = mesh.clone(false);
  section.name = name;
  fitFloorSection(section, rect);
  mesh.parent?.add(section);
}

function fitGroundStairFloor(landing: THREE.Mesh, entry: THREE.Mesh, upperLayout: typeof legacyLayout | typeof exhibitLayout) {
  const { shaftMin, shaftMax } = upperLayout.stair;
  const { minZ, maxZ, y } = upperLayout.surfaces.find(surface => surface.id === 'stair-entry')!;
  const shaft = { x0: shaftMin[0] - .02, x1: shaftMax[0] + .02, z0: shaftMin[2] - .02,
    z1: Math.max(shaftMax[2], maxZ + .05) + .02 };
  const opening = upperLayout.openings.find(surface => surface.id === 'stair-entry-opening')!;
  const slab = upperLayout.solids.find(solid => solid.id === 'slab-landing-0')!;
  // The entrance and landing share one top. Hide the perimeter under the
  // side walls and overlap the original main-room floor by 12 mm at the mouth.
  const profile = new THREE.Shape([
    new THREE.Vector2(shaft.x0, shaft.z0), new THREE.Vector2(shaft.x1, shaft.z0),
    new THREE.Vector2(shaft.x1, shaft.z1), new THREE.Vector2(shaft.x0, shaft.z1),
    new THREE.Vector2(shaft.x0, maxZ + .012), new THREE.Vector2(opening.min[0] - .012, maxZ + .012),
    new THREE.Vector2(opening.min[0] - .012, minZ - .012), new THREE.Vector2(shaft.x0, minZ - .012),
  ]);
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: y - slab.min[1], bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);
  landing.geometry.dispose();
  landing.geometry = geometry;
  landing.position.set(0, y, 0);
  entry.visible = false;
  entry.raycast = () => {};
}

/** Refit the closed, axis-aligned upper GLB slabs without moving a walk surface. */
export function fitMogaoExhibitFloorJoints(root: THREE.Object3D, aligned = false) {
  const upperLayout = aligned ? exhibitLayout : legacyLayout;
  const landing = root.getObjectByName('slab-landing-0');
  const entry = root.getObjectByName('stair-entry-floor');
  if (landing instanceof THREE.Mesh && entry instanceof THREE.Mesh) {
    fitGroundStairFloor(landing, entry, upperLayout);
  }

  for (const level of [2, 4]) {
    const name = `slab-landing-${level}`;
    const platform = root.getObjectByName(name);
    if (!(platform instanceof THREE.Mesh)) continue;
    const slab = upperLayout.solids.find(solid => solid.id === name)!;
    // The stair shell stops short of each hall pier. Carry the existing floor
    // to the east rock lining so the exposed corner cannot show through to sand.
    addFloorSection(platform, `${name}-east-return`,
      [slab.max[0], upperLayout.stair.shaftMax[0] + .01, slab.min[2], slab.max[2]]);
  }

  for (const hall of aligned ? [] : ['a', 'b']) {
    const link = root.getObjectByName(`${hall}-view-link-floor`);
    if (!(link instanceof THREE.Mesh)) continue;
    const room = upperLayout.solids.find(solid => solid.id === `${hall}-floor`)!;
    const view = upperLayout.solids.find(solid => solid.id === `${hall}-view-floor`)!;
    const throat = upperLayout.solids.find(solid => solid.id === `${hall}-view-link-floor`)!;
    // Keep the link's exact footprint with the other two slabs. The duplicated
    // part of the top face under the gold portal used to alternate at depth.
    fitFloorSection(link, [throat.min[0], room.min[0], throat.min[2], view.min[2]]);
    addFloorSection(link, `${hall}-view-link-floor-return`,
      [room.min[0], throat.max[0], room.max[2], throat.max[2]]);
  }
}

const guidance = [
  { name: 'hall-a', point: [21.9, 12.75, -16.9], intensity: 38, range: 13, color: 0xfff1e4 },
  { name: 'hall-b', point: [21.9, 25.1, -16.9], intensity: 14, range: 11, color: 0xfff4ec },
  { name: 'lower-stair', point: [18.7, 5.6, -26.3], intensity: 35, range: 12, color: 0xffebd6 },
  { name: 'upper-stair', point: [18.7, 14.9, -29.2], intensity: 39, range: 12, color: 0xffebd6 },
  // The existing first chamber and the Buddha rely on this original fill.
  { name: 'main-chamber', point: [0, 23, -8], intensity: 950, range: 44, color: 0xffe3ba },
] as const;

/** Use the original number of local fills. The exhibits supply their own
 * focused lighting, so the overhead B fill only makes the walking route legible. */
export function addMogaoExhibitCaveGuidance(root: THREE.Object3D) {
  for (const spec of guidance) {
    const light = new THREE.PointLight(spec.color, spec.intensity, spec.range, 2);
    light.name = `mogao-exhibit-guidance-${spec.name}`;
    const [x, y, z] = spec.point;
    light.position.set(x, y, z);
    root.add(light);
  }
}

export function addMogaoStairEntryLight(root: THREE.Object3D) {
  const entry = exhibitLayout.openings.find(opening => opening.id === 'stair-entry-opening')!;
  const axis = (entry.min[2] + entry.max[2]) / 2;
  const light = new THREE.SpotLight(0xffca7e, 22, 5.9, .63, .85, 2);
  light.name = 'mogao-stair-outward-gold-light';
  light.position.set(13.79, 1.75, axis);
  light.target.position.set(10.8, .08, axis);
  root.add(light, light.target);

  // Two thin feathered rays spread from the doorway into the room. They are
  // ordinary depth-tested geometry, so the portal and statue still occlude them.
  const material = new THREE.ShaderMaterial({
    uniforms: { floorSpill: { value: false } },
    vertexShader: `
      varying vec2 ray;
      void main() { ray = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      varying vec2 ray;
      uniform bool floorSpill;
      void main() {
        float across = 1.0 - smoothstep(0.04, 0.5, abs(ray.y - 0.5));
        float along = smoothstep(0.0, 0.08, ray.x) * (1.0 - smoothstep(0.25, 1.0, ray.x));
        float softEllipse = 1.0 - smoothstep(0.05, 0.5, length(ray - 0.5));
        float opacity = floorSpill ? 0.19 * softEllipse : 0.31 * across * along;
        gl_FragColor = vec4(1.0, 0.68, 0.29, opacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  for (const [index, heights] of [[1.95, .78], [1.12, .06]].entries()) {
    const [startY, endY] = heights;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      13.83, startY, axis - .65, 13.83, startY, axis + .65,
      10.1, endY, axis + 1.75, 10.1, endY, axis - 1.75,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const ray = new THREE.Mesh(geometry, material);
    ray.name = `mogao-stair-outward-gold-ray-${index}`;
    ray.raycast = () => {};
    root.add(ray);
  }
  const spillMaterial = material.clone();
  spillMaterial.uniforms.floorSpill.value = true;
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), spillMaterial);
  spill.name = 'mogao-stair-outward-floor-spill';
  spill.position.set(11.85, .03, axis);
  spill.rotation.x = -Math.PI / 2;
  spill.raycast = () => {};
  root.add(spill);
}

type CaveSolid = { min: readonly number[]; max: readonly number[] };

function extendLowerStairWall(mesh: THREE.Mesh, shell: CaveSolid, cut: CaveSolid, end: number) {
  const [x0, y0, z0] = shell.min, [x1, y1, z1] = shell.max;
  const landingCeiling = cut.max[1];
  // Carry the hidden end into rock beyond the return. The 18 cm cliff shadow
  // texel otherwise samples daylight immediately beside the interior corner.
  // Extrude one Y/Z profile. Using a single inner face avoids a second face
  // or the shadow of the old end cap still appearing at the former seam.
  const profile = new THREE.Shape([
    new THREE.Vector2(y0, z0), new THREE.Vector2(y0, end),
    new THREE.Vector2(landingCeiling, end), new THREE.Vector2(landingCeiling, z1),
    new THREE.Vector2(y1, z1), new THREE.Vector2(y1, z0),
  ]);
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: x1 - x0, bevelEnabled: false });
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0),
  ));
  mesh.geometry.dispose();
  mesh.geometry = geometry;
  mesh.position.set(x0, 0, 0);

  // Give the filtered sun shadow an opaque backing outside the visible
  // wall. Its lower edge is buried so taps beside the floor still hit rock.
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(.36, landingCeiling - y0 + .24, end - z0 + .24),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, shadowSide: THREE.DoubleSide }),
  );
  backing.name = 'mogao-exhibit-stair-east-shadow-backing';
  backing.position.set(x1 + .17, (landingCeiling + y0 - .24) / 2, (z0 + end - .24) / 2);
  backing.castShadow = true;
  backing.raycast = () => {};
  mesh.parent?.add(backing);
}

/**
 * Some staircase rock faces belong to the deferred mountain GLB. Reuse the
 * exact already-cut rectangles from the camera layout as visual lining, with
 * the back faces culled so they cannot replace the exterior silhouette.
 */
export function addMogaoExhibitShaftLining(root: THREE.Object3D, aligned = false) {
  const upperLayout = aligned ? exhibitLayout : legacyLayout;
  const points: number[] = [], indices: number[] = [], faces: string[] = [];
  const inset = .012;
  function face(id: string, axis: number, coordinate: number, min: readonly number[], max: readonly number[], inward: number) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const first = points.length / 3;
    for (const [x, y] of [[min[u], min[v]], [max[u], min[v]], [max[u], max[v]], [min[u], max[v]]]) {
      const point = [0, 0, 0];
      point[axis] = coordinate; point[u] = x; point[v] = y;
      points.push(...point);
    }
    const order = inward > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    for (const index of order) indices.push(first + index);
    faces.push(id);
  }

  const eastShell = upperLayout.cameraSolids.find(solid => solid.id === 'geometry-stair-east-shell');
  const lowerEastCut = upperLayout.cameraSolids.find(solid => solid.id === 'shaft-cut-rock-0-2-0');
  const eastWall = root.getObjectByName('stair-east-shell');
  const continuousEastWall = eastWall instanceof THREE.Mesh && eastShell && lowerEastCut;
  if (continuousEastWall) {
    const entryReturn = upperLayout.solids.find(solid => solid.id === 'entry-side-north')!;
    extendLowerStairWall(eastWall, eastShell, lowerEastCut,
      aligned ? entryReturn.max[2] : lowerEastCut.max[2] + .24);
  }
  for (const cut of upperLayout.cameraSolids) {
    // The original stair plates and roof already cover the horizontal faces.
    const match = /^shaft-cut-rock-([02])-([12])-\d+$/.exec(cut.id);
    if (!match) continue;
    if (cut === lowerEastCut && continuousEastWall) continue;
    const axis = Number(match[1]), inward = match[2] === '1' ? 1 : -1;
    // At the foot of the stairs the concrete shell used to end 34 cm in
    // front of the cut rock. Line the entire lower face in the shell plane.
    const surface = cut.id === 'shaft-cut-rock-0-2-0' && eastShell
      ? eastShell.min[0]
      : (cut.min[axis] + cut.max[axis]) / 2;
    const coordinate = surface + inward * inset;
    face(cut.id, axis, coordinate, cut.min, cut.max, inward);
  }
  const westShell = upperLayout.cameraSolids.find(solid => solid.id === 'geometry-stair-west-shell');
  const aPier = upperLayout.cameraSolids.find(solid => solid.id === 'geometry-a-south-west-pier');
  const aWestCut = aPier && upperLayout.cameraSolids.find(solid => solid.id.startsWith('shaft-cut-rock-0-1-')
    && Math.abs(solid.min[1] - (aPier.min[1] - .35)) < .001);
  if (westShell && aPier && aWestCut) {
    // Meet the landing and both existing faces behind the left jamb. The
    // recessed cut ends 5 cm short of the pier and otherwise exposes the sky.
    const x = westShell.max[0] + inset;
    face('a-west-door-return', 0, x, [x, aWestCut.min[1], westShell.max[2] - inset],
      [x, aWestCut.max[1], aPier.min[2] + inset], 1);
  }
  const roof = upperLayout.cameraSolids.find(solid => solid.id === 'geometry-stair-top-ceiling');
  const lintel = upperLayout.cameraSolids.find(solid => solid.id === 'geometry-b-south-lintel');
  if (!aligned && roof && lintel && roof.max[1] < lintel.min[1]) {
    // Close the 8 cm view through the seam behind the existing B lintel,
    // overlapping both ends by 8 mm so no daylight survives the joint.
    const z = lintel.max[2] - inset;
    face('b-lintel-back-seam', 2, z, [lintel.min[0], roof.max[1] - .008, z],
      [lintel.max[0], lintel.min[1] + .008, z], 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const [r, g, b] = MOGAO_EXHIBIT_STONE.wall;
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(r, g, b), roughness: .9, side: THREE.FrontSide,
  });
  material.name = 'mogao-exhibit-stair-cut-rock';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'mogao-exhibit-stair-rock-lining';
  mesh.userData.faces = faces;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}
