import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import courtyardProps from '../content/world/courtyard-props.json';
import {
  TERRAIN_BOUNDS, TERRAIN_REGIONS, TERRAIN_ROUTES, lakeMayBeWithin, lakeSignedDistance,
  terrainHeight, toTerrainPoint, fromTerrainPoint, TERRAIN_SCENERY_SOURCE_OVERRIDES, type TerrainRegion,
} from '../content/world/terrain-layout-v001';
import {environmentSampleAxes, environmentSurfaceHeight, environmentVisualHeight} from '../content/world/environment-layout-v001';
import {createEnvironmentGroundMaterial} from './terrain-environment-materials';
import {ENVIRONMENT_SUN_DIRECTION} from './terrain-environment-lighting-v001';
import {createTerrainWater} from './terrain-water-v001';
import {clearTerrainPlant, terrainRoadClearance} from './terrain-planting-v003';
import {terrainRoadStones} from './terrain-road-paving';

function nearEarlierRoute(point:{x:number;z:number},routeIndex:number,clearance:number){
  for(const route of TERRAIN_ROUTES.slice(0,routeIndex))for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=THREE.MathUtils.clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    if(Math.hypot(point.x-a.x-dx*t,point.z-a.z-dz*t)<clearance)return true;
  }
  return false;
}

function setGroundGridIndex(geometry: THREE.BufferGeometry, columns: number, rows: number) {
  const IndexArray = (columns + 1) * (rows + 1) > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(columns * rows * 6);
  let offset = 0;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column;
    const b = a + columns + 1;
    indices[offset++] = a;
    indices[offset++] = b;
    indices[offset++] = a + 1;
    indices[offset++] = a + 1;
    indices[offset++] = b;
    indices[offset++] = b + 1;
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
}

function tileGroundGrid(source: THREE.BufferGeometry, columns: number, rows: number) {
  const geometries: THREE.BufferGeometry[] = [];
  const tileSize = 48;
  const attributes = ['position', 'color', 'normal'].map(name =>
    [name, source.getAttribute(name).array as Float32Array] as const);
  // Copy the normals from the complete grid so adjacent tiles share exact
  // positions and lighting along every edge.
  for (let z = 0; z < rows; z += tileSize) for (let x = 0; x < columns; x += tileSize) {
    const width = Math.min(tileSize, columns - x);
    const height = Math.min(tileSize, rows - z);
    const rowStride = (width + 1) * 3;
    const tile = new THREE.BufferGeometry();
    for (const [name, sourceValues] of attributes) {
      const values = new Float32Array(rowStride * (height + 1));
      for (let row = 0; row <= height; row++) {
        const offset = ((z + row) * (columns + 1) + x) * 3;
        values.set(sourceValues.subarray(offset, offset + rowStride), row * rowStride);
      }
      tile.setAttribute(name, new THREE.BufferAttribute(values, 3));
    }
    setGroundGridIndex(tile, width, height);
    geometries.push(tile);
  }
  return geometries;
}

/** The spatial study owns only its new terrain, paving, backdrop and water.
 * Loaded GLBs retain their existing owners, animations and material resources.
 */
export function createTerrainScene(scene: THREE.Scene, enhancedEnvironment = false, deferGroundDetail = false, compactGround = false) {
  const root = new THREE.Group(); root.name = 'continuous-terrain-v001';
  // These are the graybox's old plane, test stand and fixed-height road.
  // Hide them only in this explicit preview; old previews keep their geometry.
  for (const child of scene.children) if (child instanceof THREE.Mesh) child.visible = false;
  const horizon = new THREE.Color(.62, .61, .55);
  scene.background = horizon.clone();
  scene.fog = new THREE.Fog(horizon, enhancedEnvironment ? 950 : 550, enhancedEnvironment ? 1900 : 1050);
  scene.add(root);
  const owned: THREE.Object3D[] = [];
  const regionRoots = new Map<TerrainRegion, THREE.Group>();
  const grounded: {id: string; source: number[]; target: number[]; deltaY: number}[] = [];
  const planted: {id:string;x:number;z:number;radius:number;roadClearance:number;shift:number}[]=[];
  for (const region of ['courtyard', 'music', 'cliff'] as const) {
    const group = new THREE.Group(); group.name = `terrain-region-${region}`;
    const origin = toTerrainPoint(region, {x: 0, y: 0, z: 0});
    group.position.set(origin.x, origin.y, origin.z);
    group.rotation.y = TERRAIN_REGIONS[region].yaw;
    scene.add(group); regionRoots.set(region, group);
  }

  // Keep the approved near-field samples exactly. Outside the walkable bounds,
  // progressively coarser 8/16/24m samples continue the same surface by 1400m.
  // This visual apron does not enlarge the playable map or its collision bounds.
  const {minX, maxX, minZ, maxZ} = TERRAIN_BOUNDS;
  function sampleAxis(minimum: number, maximum: number) {
    const count = Math.ceil((maximum - minimum) / 2);
    const samples = Array.from({length: count + 1}, (_, i) => minimum + (maximum - minimum) * i / count);
    for (let distance = 8; distance <= 1400;) {
      samples.push(minimum - distance, maximum + distance);
      distance += distance < 96 ? 8 : distance < 320 ? 16 : 24;
    }
    return samples.sort((a, b) => a - b);
  }
  const {xs,zs} = enhancedEnvironment ? environmentSampleAxes() : {xs:sampleAxis(minX,maxX),zs:sampleAxis(minZ,maxZ)};
  const columns = xs.length - 1, rows = zs.length - 1;
  function visualHeight(x: number, z: number) {
    if (enhancedEnvironment) return environmentVisualHeight(x,z);
    const outside = Math.hypot(Math.max(minX - x, x - maxX, 0), Math.max(minZ - z, z - maxZ, 0));
    if (outside <= 30) return terrainHeight(x, z);
    const undulation = Math.sin(x * .012 + .7) * 32 + Math.sin(z * .009 - x * .004) * 24;
    let dunes = 0;
    // Three broad shoulders grow from continuous ground. Their 100–210m
    // half-widths create gentle sand slopes rather than a vertical backdrop.
    for (const [center, width, height, phase] of [[180, 100, 55, 0], [365, 155, 85, 1.7], [620, 210, 115, 3.2]]) {
      const band = (outside - center - undulation * Math.sin(phase + x * .003)) / width;
      const crest = .76 + .15 * Math.sin(x * .014 + z * .004 + phase) + .09 * Math.sin(z * .011 - x * .005 + phase);
      dunes = Math.max(dunes, height * crest * Math.exp(-band * band));
    }
    return terrainHeight(x, z) + dunes * THREE.MathUtils.smoothstep(outside, 30, 100);
  }
  const groundVertices = (columns + 1) * (rows + 1);
  const groundTriangles = columns * rows * 2;
  const positions = new Float32Array(groundVertices * 3), colors = new Float32Array(groundVertices * 3);
  const dry = new THREE.Color('#dcb77a'), wet = new THREE.Color('#ae9970'), high = new THREE.Color('#e3c18c');
  const distantOchre = new THREE.Color('#9f8e75');
  const color = new THREE.Color();
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const x = xs[column], z = zs[row];
    const y = visualHeight(x, z), shore = lakeMayBeWithin(x, z, 6) ? lakeSignedDistance(x, z) : 6;
    const offset = (row * (columns + 1) + column) * 3;
    positions[offset] = x;
    positions[offset + 1] = y - .025;
    positions[offset + 2] = z;
    color.copy(dry).lerp(high, THREE.MathUtils.clamp((y - 10) / 70, 0, .3));
    if (shore < 6) color.lerp(wet, .38 * (1 - THREE.MathUtils.smoothstep(shore, 0, 6)));
    const outside = Math.hypot(Math.max(minX - x, x - maxX, 0), Math.max(minZ - z, z - maxZ, 0));
    if (outside > 60) {
      const relief = THREE.MathUtils.clamp((y - terrainHeight(x, z)) / 45, 0, 1);
      color.lerp(distantOchre, .15 * relief * THREE.MathUtils.smoothstep(outside, 60, 140));
    }
    color.multiplyScalar(.985 + .015 * Math.sin(x * .083 + Math.sin(z * .036)));
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  setGroundGridIndex(groundGeometry, columns, rows);
  groundGeometry.computeVertexNormals();
  const groundGeometries = compactGround ? tileGroundGrid(groundGeometry, columns, rows) : [groundGeometry];
  if (compactGround) groundGeometry.dispose();
  const groundSurface = enhancedEnvironment ? createEnvironmentGroundMaterial(deferGroundDetail) : null;
  const groundMaterial = groundSurface?.material ?? new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1});
  for (const geometry of groundGeometries) {
    const ground = new THREE.Mesh(geometry, groundMaterial);
    ground.name = 'continuous-sand-heightfield';
    ground.castShadow = enhancedEnvironment;
    ground.receiveShadow = true;
    root.add(ground);
    owned.push(ground);
  }

  // Batch the mosaic by material. The stone bases extend into the rendered
  // ground so the narrow joints stay visible without exposing floating edges.
  const stoneMaterials = ['#c7b69b', '#d0bea0', '#bbaa90', '#d6c6a9', '#bfae92', '#dac7a7', '#c8b999', '#cab49a']
    .map(value => new THREE.MeshStandardMaterial({color: value, vertexColors: true, roughness: 1}));
  const batches: THREE.BufferGeometry[][] = stoneMaterials.map(() => []);
  const stones = terrainRoadStones(TERRAIN_ROUTES);
  const surfaceHeight = enhancedEnvironment ? environmentSurfaceHeight : terrainHeight;
  for (const { center, corners, shade } of stones) {
    const vertices: number[] = [], tints: number[] = [], faces: number[] = [];
    const topOffset = .078 + .026 * shade;
    function vertex(x: number, y: number, z: number, tint: number) {
      const index = vertices.length / 3;
      vertices.push(x, y, z);
      tints.push(tint, tint, tint);
      return index;
    }
    const top = corners.map(corner => {
      const dx = center.x - corner.x, dz = center.z - corner.z;
      const inset = Math.min(.08, .019 / Math.hypot(dx, dz));
      const x = corner.x + dx * inset, z = corner.z + dz * inset;
      return { x, z, y: surfaceHeight(x, z) + topOffset };
    });
    const topCenter = vertex(center.x, surfaceHeight(center.x, center.z) + topOffset, center.z, 1);
    for (const { x, y, z } of top) vertex(x, y, z, 1);
    const shoulder = corners.map(({ x, z }, index) => ({
      x, z, y: top[index].y - .012, base: surfaceHeight(x, z) - .048,
    }));
    for (let index = 0; index < corners.length; index++) {
      const next = (index + 1) % corners.length;
      const topA = top[index], topB = top[next], outerA = shoulder[index], outerB = shoulder[next];
      faces.push(topCenter, next + 1, index + 1);

      // Separate the top, bevel and individual cut faces so the normals
      // stay sharp at the corners. The bottom tint softens contact with sand.
      const bevel = vertex(topA.x, topA.y, topA.z, 1);
      vertex(topB.x, topB.y, topB.z, 1);
      vertex(outerA.x, outerA.y, outerA.z, .89);
      vertex(outerB.x, outerB.y, outerB.z, .89);
      faces.push(bevel, bevel + 1, bevel + 2, bevel + 1, bevel + 3, bevel + 2);

      const cut = vertex(outerA.x, outerA.y, outerA.z, .81);
      vertex(outerB.x, outerB.y, outerB.z, .81);
      vertex(outerA.x, outerA.base, outerA.z, .53);
      vertex(outerB.x, outerB.base, outerB.z, .53);
      faces.push(cut, cut + 1, cut + 2, cut + 1, cut + 3, cut + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    batches[Math.floor(shade * batches.length)].push(geometry);
  }
  for (const [index, batch] of batches.entries()) {
    const geometry = batch.length ? mergeGeometries(batch) : null;
    batch.forEach(item => item.dispose());
    if (!geometry) {stoneMaterials[index].dispose(); continue;}
    const road = new THREE.Mesh(geometry, stoneMaterials[index]); road.name = `terrain-following-stone-road-${index}`;
    // The compact view cannot resolve the slabs' small cast shadows cleanly.
    // Keep the shaded cut faces and let buildings and the traveler shade the road.
    road.castShadow = enhancedEnvironment && !compactGround;
    road.receiveShadow = true;
    root.add(road); owned.push(road);
  }

  // Center the blue sky on the active camera, including the high overview.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {horizon: {value: horizon.clone()}},
    vertexShader: `varying vec3 skyDirection;
      void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}`,
    fragmentShader: `uniform vec3 horizon;varying vec3 skyDirection;
      #include <common>
      void main(){vec3 d=normalize(skyDirection);float h=max(d.y,0.0);
        vec3 c=mix(horizon,vec3(.10,.34,.65),pow(h,.65));
        float cloud=smoothstep(.63,.91,sin(d.x*17.0+d.z*5.0)*.4+sin(d.z*27.0-d.x*7.0)*.25+sin(d.x*43.0+d.z*31.0)*.12);
        cloud*=smoothstep(.08,.24,h)*(1.0-smoothstep(.45,.72,h));
        c=mix(c,vec3(.82,.88,.91),cloud*.19);gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.name = 'terrain-blue-gradient-sky'; sky.renderOrder = -1000; sky.frustumCulled = false;
  sky.onBeforeRender = (_renderer, _scene, camera) => {sky.position.copy(camera.position); sky.updateMatrixWorld(true);};
  root.add(sky); owned.push(sky);

  const water = createTerrainWater({sunDirection: enhancedEnvironment ? ENVIRONMENT_SUN_DIRECTION : new THREE.Vector3(-14, 35, 22).normalize()});
  root.add(water.object);

  function attachRegionObject(region: TerrainRegion, object: THREE.Object3D) {
    regionRoots.get(region)!.add(object);
    object.updateWorldMatrix(true, true);
  }
  function groundCourtyardAttachments(courtyard: THREE.Object3D) {
    // Mesh vertices are baked in their original world-local coordinates. Move
    // semantic assemblies together, preserving canopy/trunk and rock parts.
    for (const prop of courtyardProps.props) {
      const outside = prop.x < -22 || prop.x > -2 || prop.z > 2 || prop.z < -24;
      if (!outside) continue;
      const source = TERRAIN_SCENERY_SOURCE_OVERRIDES.courtyard?.[prop.id]??prop;
      const point = toTerrainPoint('courtyard', {x: source.x, y: prop.y, z: source.z});
      const deltaY = terrainHeight(point.x, point.z) - TERRAIN_REGIONS.courtyard.target.y;
      courtyard.traverse(object => {
        const name = String(object.userData.semanticGroup ?? object.name);
        if (name === prop.id || name === `${prop.id}-canopy` || name === `${prop.id}-trunk`) {
          object.position.x+=source.x-prop.x;object.position.z+=source.z-prop.z;object.position.y+=deltaY;
        }
      });
      grounded.push({id: prop.id, source: [prop.x, prop.y, prop.z], target: [point.x, terrainHeight(point.x, point.z), point.z], deltaY});
    }
    courtyard.updateWorldMatrix(true, true);
  }
  function placeOutdoorShrub(object:THREE.Object3D,region?:TerrainRegion,spacing=0){
    object.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(object,true),center=bounds.getCenter(new THREE.Vector3());
    const radius=Math.hypot(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)/2;
    const original=region?toTerrainPoint(region,center):center;
    const target=clearTerrainPlant(original,radius);
    if(spacing>0&&planted.some(p=>Math.hypot(p.x-target.x,p.z-target.z)<p.radius+radius+spacing))return;
    const local=region?fromTerrainPoint(region,target):target;
    object.position.x+=local.x-center.x;object.position.z+=local.z-center.z;
    object.position.y+=terrainHeight(target.x,target.z)-(region?TERRAIN_REGIONS[region].target.y:0)-bounds.min.y;
    if(region)attachRegionObject(region,object);else root.add(object);
    planted.push({id:object.name,x:target.x,z:target.z,radius,roadClearance:terrainRoadClearance(target),shift:Math.hypot(target.x-original.x,target.z-original.z)});
  }
  function addNatureTemplates(tree: THREE.Object3D, shrub: THREE.Object3D) {
    // Keep the approved GLBs. A few passable shrubs guide the long new road;
    // tree placement is supplied by the existing shared collision layouts.
    let plant = 0;
    for (const [routeIndex,route] of TERRAIN_ROUTES.entries()) for (let i = 10; i < route.points.length - 8; i += 23) {
      const a = route.points[i - 1], p = route.points[i], side = plant++ % 2 ? -1 : 1;
      // One set of planting belongs to a shared approach, just like its paving.
      if(nearEarlierRoute(p,routeIndex,route.width+3))continue;
      const dx = p.x - a.x, dz = p.z - a.z, length = Math.hypot(dx, dz) || 1;
      const offset = side * (route.width / 2 + 2.5 + .9 * Math.sin(plant * 2.1));
      const x = p.x + dz / length * offset, z = p.z - dx / length * offset;
      if (lakeSignedDistance(x, z) < 2.5) continue;
      const instance = shrub.clone(true); instance.visible = true;
      instance.name = `terrain-route-shrub-${plant}`;
      instance.position.set(x, 0, z);
      instance.scale.setScalar(.65 + (plant % 4) * .12); instance.rotation.y = plant * 1.37;
      placeOutdoorShrub(instance,undefined,2.5);
    }
    // The template is deliberately not an owned duplicate resource.
    void tree;
  }
  return {
    root, ready:groundSurface?.ready ?? Promise.resolve(), attachRegionObject, groundCourtyardAttachments, addNatureTemplates, placeOutdoorShrub,
    loadGroundDetail: () => groundSurface?.loadDetail() ?? Promise.resolve(),
    inspect: () => ({environmentVersion:enhancedEnvironment?'v001':null,groundMaterial:groundSurface?.inspect(),groundVertices,groundTriangles,groundTiles:groundGeometries.length,
      visualBounds: {minX: xs[0], maxX: xs.at(-1), minZ: zs[0], maxZ: zs.at(-1)},
      stones: stones.length, groundedAttachments: grounded, outdoorShrubs:planted,
      water: { mode: water.object.userData.mode, reflectionUpdates: water.object.userData.reflectionUpdates }}),
    dispose() {
      water.dispose(); groundSurface?.dispose();
      const materials = new Set<THREE.Material>();
      for (const object of owned) if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material !== groundSurface?.material) materials.add(material);
      }
      for (const material of materials) material.dispose();
      root.removeFromParent(); root.clear();
      for (const group of regionRoots.values()) {group.removeFromParent(); group.clear();}
      regionRoots.clear();
    },
  };
}
