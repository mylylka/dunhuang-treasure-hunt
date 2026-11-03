import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import courtyardProps from '../content/world/courtyard-props.json';
import {
  TERRAIN_BOUNDS, TERRAIN_REGIONS, TERRAIN_ROUTES, lakeSignedDistance,
  terrainHeight, toTerrainPoint, fromTerrainPoint, TERRAIN_SCENERY_SOURCE_OVERRIDES, type TerrainRegion,
} from '../content/world/terrain-layout-v001';
import {createTerrainWater} from './terrain-water-v001';
import {clearTerrainPlant, terrainRoadClearance} from './terrain-planting-v003';

/** The spatial study owns only its new terrain, paving, backdrop and water.
 * Loaded GLBs retain their existing owners, animations and material resources.
 */
export function createTerrainScene(scene: THREE.Scene) {
  const root = new THREE.Group(); root.name = 'continuous-terrain-v001';
  // These are the graybox's old plane, test stand and fixed-height road.
  // Hide them only in this explicit preview; old previews keep their geometry.
  for (const child of scene.children) if (child instanceof THREE.Mesh) child.visible = false;
  const horizon = new THREE.Color(.62, .61, .55);
  scene.background = horizon.clone();
  scene.fog = new THREE.Fog(horizon, 550, 1050);
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
  const xs = sampleAxis(minX, maxX), zs = sampleAxis(minZ, maxZ);
  const columns = xs.length - 1, rows = zs.length - 1;
  function visualHeight(x: number, z: number) {
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
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const dry = new THREE.Color('#dcb77a'), wet = new THREE.Color('#ae9970'), high = new THREE.Color('#e3c18c');
  const distantOchre = new THREE.Color('#9f8e75');
  const color = new THREE.Color();
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const x = xs[column], z = zs[row];
    const y = visualHeight(x, z), shore = lakeSignedDistance(x, z);
    positions.push(x, y - .025, z);
    color.copy(dry).lerp(high, THREE.MathUtils.clamp((y - 10) / 70, 0, .3));
    if (shore < 6) color.lerp(wet, .38 * (1 - THREE.MathUtils.smoothstep(shore, 0, 6)));
    const outside = Math.hypot(Math.max(minX - x, x - maxX, 0), Math.max(minZ - z, z - maxZ, 0));
    if (outside > 60) {
      const relief = THREE.MathUtils.clamp((y - terrainHeight(x, z)) / 45, 0, 1);
      color.lerp(distantOchre, .15 * relief * THREE.MathUtils.smoothstep(outside, 60, 140));
    }
    color.multiplyScalar(.985 + .015 * Math.sin(x * .083 + Math.sin(z * .036)));
    colors.push(color.r, color.g, color.b);
    if (row < rows && column < columns) {
      const a = row * (columns + 1) + column, b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeometry.setIndex(indices); groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1}));
  ground.name = 'continuous-sand-heightfield'; ground.receiveShadow = true; root.add(ground); owned.push(ground);

  // Bake irregular low-relief slabs into four batches. All corners, including
  // the full road width, bend with the shared height field rather than float.
  const stoneMaterials = ['#c7b69b', '#d0bea0', '#bbaa90', '#d6c6a9'].map(value => new THREE.MeshStandardMaterial({color: value, roughness: 1}));
  const batches: THREE.BufferGeometry[][] = stoneMaterials.map(() => []);
  let stone = 0;
  for (const route of TERRAIN_ROUTES) {
    let accumulated = 2;
    for (let index = 1; index < route.points.length; index++) {
      const a = route.points[index - 1], b = route.points[index];
      accumulated += Math.hypot(b.x - a.x, b.z - a.z);
      if (accumulated < 1.12 && index !== route.points.length - 1) continue;
      accumulated = 0;
      const angle = Math.atan2(b.x - a.x, b.z - a.z), across = Math.min(1.06, route.width / 3);
      for (let column = 0; column < 3; column++) {
        const seed = stone++, offset = (column - 1) * across;
        const cx = b.x + Math.cos(angle) * offset, cz = b.z - Math.sin(angle) * offset;
        const corners = [[-.44, -.43], [.28, -.46], [.46, -.24], [.42, .34], [-.24, .44], [-.46, .16]];
        const vertices: number[] = [], faces: number[] = [];
        for (const [i, [u, v]] of corners.entries()) {
          const jitter = Math.sin(seed * 13.37 + i * 7.9) * .035;
          const px = (u + jitter) * across, pz = v * 1.08;
          const x = cx + px * Math.cos(angle) + pz * Math.sin(angle);
          const z = cz - px * Math.sin(angle) + pz * Math.cos(angle);
          const y = terrainHeight(x, z);
          vertices.push(x, y + .045, z, x, y - .015, z);
        }
        vertices.push(cx, terrainHeight(cx, cz) + .045, cz);
        for (let i = 0; i < 6; i++) {
          const a = i * 2, b = ((i + 1) % 6) * 2;
          faces.push(12, b, a, a, b, a + 1, b, b + 1, a + 1);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(faces); geometry.computeVertexNormals(); batches[seed % batches.length].push(geometry);
      }
    }
  }
  for (const [index, batch] of batches.entries()) {
    const geometry = batch.length ? mergeGeometries(batch) : null;
    batch.forEach(item => item.dispose());
    if (!geometry) {stoneMaterials[index].dispose(); continue;}
    const road = new THREE.Mesh(geometry, stoneMaterials[index]); road.name = `terrain-following-stone-road-${index}`;
    road.receiveShadow = true; root.add(road); owned.push(road);
  }

  // A world-up blue sky is an actual reflection subject. Centering it on each
  // render camera also works for the lake's reflected camera and high overview.
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

  const water = createTerrainWater({sunDirection: new THREE.Vector3(-14, 35, 22).normalize()});
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
  function placeOutdoorShrub(object:THREE.Object3D,region?:TerrainRegion){
    object.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(object,true),center=bounds.getCenter(new THREE.Vector3());
    const radius=Math.hypot(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)/2;
    const original=region?toTerrainPoint(region,center):center;
    const target=clearTerrainPlant(original,radius);
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
    for (const route of TERRAIN_ROUTES) for (let i = 10; i < route.points.length - 8; i += 23) {
      const a = route.points[i - 1], p = route.points[i], side = plant++ % 2 ? -1 : 1;
      const dx = p.x - a.x, dz = p.z - a.z, length = Math.hypot(dx, dz) || 1;
      const offset = side * (route.width / 2 + 2.5 + .9 * Math.sin(plant * 2.1));
      const x = p.x + dz / length * offset, z = p.z - dx / length * offset;
      if (lakeSignedDistance(x, z) < 2.5) continue;
      const instance = shrub.clone(true); instance.visible = true;
      instance.name = `terrain-route-shrub-${plant}`;
      instance.position.set(x, 0, z);
      instance.scale.setScalar(.65 + (plant % 4) * .12); instance.rotation.y = plant * 1.37;
      placeOutdoorShrub(instance);
    }
    // The template is deliberately not an owned duplicate resource.
    void tree;
  }
  return {
    root, attachRegionObject, groundCourtyardAttachments, addNatureTemplates, placeOutdoorShrub,
    update(dt: number, reduced: boolean) {water.update(dt, reduced);},
    inspect: () => ({groundVertices: positions.length / 3, groundTriangles: indices.length / 3,
      visualBounds: {minX: xs[0], maxX: xs.at(-1), minZ: zs[0], maxZ: zs.at(-1)},
      stones: stone, groundedAttachments: grounded, outdoorShrubs:planted}),
    dispose() {
      water.dispose();
      for (const object of owned) if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      }
      root.removeFromParent(); root.clear();
      for (const group of regionRoots.values()) {group.removeFromParent(); group.clear();}
      regionRoots.clear();
    },
  };
}
