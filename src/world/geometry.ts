import * as THREE from 'three';
import { WORLD_BOUNDARY_STONES, WORLD_CLIFFS, WORLD_DUNES } from './scenery';
import { COURTYARD_ROAD } from './road';

export interface GrayboxScene {
  scene: THREE.Scene;
  traveler: THREE.Group;
  animateTraveler(speed: number, elapsed: number, reduced: boolean): void;
  dispose(): void;
}

/** All geometry is a deliberately untextured spatial study; no formal artwork. */
export function createGrayboxScene({ artSample = false }: { artSample?: boolean } = {}): GrayboxScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(artSample ? '#afcfdf' : '#d9ded8');
  scene.fog = new THREE.Fog(artSample ? '#d9d6c3' : '#d9ded8', 46, 115);
  const materials = {
    sand: new THREE.MeshStandardMaterial({ color: '#c9c4ae', roughness: 1 }),
    dune: new THREE.MeshStandardMaterial({ color: '#bcbba8', roughness: 1, flatShading: true }),
    path: new THREE.MeshStandardMaterial({ color: '#e3dcca', roughness: 1 }),
    wall: new THREE.MeshStandardMaterial({ color: '#e7e1d4', roughness: .95 }),
    stone: new THREE.MeshStandardMaterial({ color: '#a3a79c', roughness: .95 }),
    beam: new THREE.MeshStandardMaterial({ color: '#888b7e', roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: '#717e78', roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: '#c2ac8c', roughness: .9 }),
    green: new THREE.MeshStandardMaterial({ color: '#8e9b82', roughness: 1, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: '#5c6e68', roughness: .9 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#ad7059', roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: '#cfb590', roughness: 1 }),
    marker: new THREE.MeshStandardMaterial({ color: '#c9a45f', emissive: '#715628', emissiveIntensity: .25, roughness: .6 }),
  };
  if (artSample) {
    materials.sand.color.set('#dfbd83'); materials.dune.color.set('#cfa36b');
    materials.path.color.set('#efd5a0'); materials.wall.color.set('#dfc5a1');
    materials.stone.color.set('#ae8c68'); materials.beam.color.set('#714a36');
    materials.roof.color.set('#557a72'); materials.trim.color.set('#b79052');
    materials.green.color.set('#8a9b65');
    materials.dune.flatShading = false;
  }
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeometry = new THREE.IcosahedronGeometry(1, artSample ? 3 : 1);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);
  const geometries = new Set<THREE.BufferGeometry>([boxGeometry, sphereGeometry, cylinderGeometry]);
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, parent: THREE.Object3D = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material = materials.wall, parent: THREE.Object3D = scene) { return mesh(boxGeometry, material, x, y, z, w, h, d, parent); }
  function post(x: number, z: number, height: number) {
    box(x, .14, z, .96, .28, .96, materials.stone);
    mesh(cylinderGeometry, materials.beam, x, height / 2 + .28, z, .29, height, .29);
    box(x, height + .24, z, 1, .28, .8, materials.trim);
  }
  function roof(x: number, z: number, y: number, w: number, d: number) {
    box(x, y, z, w, .26, d, materials.beam);
    box(x, y + .24, z, w + .6, .20, d + .6, materials.roof);
    box(x, y + .51, z, w - .4, .34, d - .7, materials.roof);
    box(x, y + .80, z, w - 1.6, .25, d - 2, materials.roof);
    box(x, y + .99, z, w - 3, .15, d - 3.2, materials.trim);
  }
  function tree(x: number, z: number, scale = 1) {
    mesh(cylinderGeometry, materials.beam, x, .9 * scale, z, .13 * scale, 1.8 * scale, .13 * scale);
    mesh(sphereGeometry, materials.green, x - .23 * scale, 2.05 * scale, z, 1 * scale, 1.25 * scale, .85 * scale);
    mesh(sphereGeometry, materials.green, x + .55 * scale, 1.8 * scale, z + .18, .7 * scale, 1 * scale, .75 * scale);
  }
  const ground = box(0, -.22, -5, 180, .4, 180, materials.sand); ground.castShadow = false;
  const pathVertices: number[] = []; const pathIndices: number[] = [];
  for (let i = 0; i < COURTYARD_ROAD.length; i++) {
    const { left, right } = COURTYARD_ROAD[i];
    pathVertices.push(left.x, .005, left.z, right.x, .005, right.z);
    if (i < COURTYARD_ROAD.length - 1) { const n = i * 2; pathIndices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  }
  const pathGeometry = new THREE.BufferGeometry(); geometries.add(pathGeometry);
  pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3)); pathGeometry.setIndex(pathIndices); pathGeometry.computeVertexNormals();
  mesh(pathGeometry, materials.path, 0, 0, 0).name = 'courtyard-road';
  // Shared placement data keeps complete scenery meshes outside the walking
  // surface; distant dunes also leave room for the follow camera behind it.
  for (const item of [...WORLD_DUNES, ...WORLD_BOUNDARY_STONES]) {
    mesh(sphereGeometry, materials.dune, item.x, item.y, item.z, item.radiusX, item.radiusY, item.radiusZ).name = item.id;
  }
  if (!artSample) {
  box(-12, .015, -10.8, 19.7, .05, 25.5, materials.path);
  // Courtyard perimeter and the two gate piers.
  box(-22, 1.35, -11, .6, 2.7, 26);
  box(-2, 1.35, -11, .6, 2.7, 26);
  box(-12, 2.25, -24, 20, 4.5, .6);
  for (const x of [-18.5, -5.5]) {
    box(x, 1.35, 2, 7, 2.7, .6); box(x, 2.77, 2, 7.2, .22, .9, materials.trim);
  }
  for (const x of [-15, -9]) { box(x, 1.8, 2, .9, 3.6, 1.2, materials.stone); box(x, 3.7, 2, 1.3, .18, 1.5, materials.trim); }
  roof(-12, 2, 4, 7, 3);
  // Raised hall uses a continuous walk proxy; front stair shapes do not trap feet.
  box(-12, .07, -13.1, 17, .14, 1.4, materials.stone);
  box(-12, .14, -18.5, 17, .28, 10, materials.path);
  box(-20.5, 2.7, -18.5, .6, 5.4, 11); box(-3.5, 2.7, -18.5, .6, 5.4, 11);
  box(-12, 2.7, -23.5, 17, 5.4, .6);
  for (const x of [-18, -6]) for (const z of [-14, -20]) post(x, z, 4.8);
  box(-12, 5.15, -14, 17.5, .48, .65, materials.beam);
  box(-12, 5.15, -20, 17.5, .48, .65, materials.beam);
  box(-12, 5.4, -18.5, 17.5, .3, 11, materials.wall);
  // Down-facing concentric square caisson study beneath the slab.
  for (let i = 0; i < 5; i++) {
    const side = 6.7 - i * 1.05; const y = 5.14 - i * .07;
    const material = i % 2 === 0 ? materials.trim : materials.roof;
    box(-12, y, -18 - side / 2, side, .15, .25, material);
    box(-12, y, -18 + side / 2, side, .15, .25, material);
    box(-12 - side / 2, y, -18, .25, .15, side, material);
    box(-12 + side / 2, y, -18, .25, .15, side, material);
  }
  mesh(cylinderGeometry, materials.marker, -12, 4.76, -18, .63, .12, .63);
  // Visible but inaccessible second floor with gallery, not a fake climbable level.
  box(-12, 6.2, -20.5, 16, 1.35, 5.4);
  for (let x = -19; x <= -5; x += 2.8) {
    box(x, 6.75, -14, .24, 2.4, .24, materials.beam);
    box(x, 6.17, -14, .8, .85, .14, materials.trim);
  }
  box(-12, 6.7, -14, 15, .16, .24, materials.beam);
  roof(-12, -18.5, 7.95, 18, 12.3);
  // Workshop and vegetation establish scale while keeping the central route readable.
  box(-18, .9, -7.5, 3.3, .22, 1.4, materials.beam);
  for (const x of [-19.3, -16.7]) for (const z of [-8, -7]) box(x, .46, z, .14, .9, .14, materials.beam);
  for (let i = 0; i < 3; i++) mesh(cylinderGeometry, materials.trim, -19 + i, 1.1, -7.5, .18, .18, .18);
  }
  // Story screen is a test stand in this stage, not a reconstructed mural.
  box(-4.4, 1.35, -7.8, .35, 2.7, 3, materials.roof);
  box(-4.61, 1.5, -7.8, .04, 1.6, 2.4, materials.trim);
  if (!artSample) {
  tree(-18, -2, .9); tree(-6, -2, .85); tree(-6, -11, .8);
  tree(5, 13, .65); tree(-6, 12, .65); tree(7, 3, .8); tree(-27, -10, .9);
  }
  // Keep loose roadside pebbles on the straight approach, clear of the gate turn.
  for (let i = 0; i < 8; i++) {
    const x = i % 2 === 0 ? 4.5 : -4.5;
    mesh(sphereGeometry, materials.stone, x, .16, 26 - i * 1.7, .26, .25, .3);
  }
  // Honest distant block masses reserve space for later stage work.
  box(18, 3.3, -18, 14, 6.6, 12, materials.wall); roof(18, -18, 6.7, 15.5, 13);
  for (let x = 12; x <= 24; x += 3) box(x, 5.1, -11.94, 1.5, 2.3, .1, materials.roof);
  for (const item of WORLD_CLIFFS) {
    mesh(sphereGeometry, materials.stone, item.x, item.y, item.z, item.radiusX, item.radiusY, item.radiusZ).name = item.id;
  }

  const traveler = new THREE.Group();
  if (!artSample) scene.add(traveler);
  mesh(cylinderGeometry, materials.cloth, 0, 1.03, 0, .34, .72, .29, traveler);
  const head = mesh(sphereGeometry, materials.skin, 0, 1.62, 0, .23, .26, .23, traveler);
  mesh(cylinderGeometry, materials.dark, 0, 1.83, .01, .34, .12, .34, traveler);
  box(0, 1.12, .27, .42, .56, .18, materials.dark, traveler);
  const leftLeg = new THREE.Group(); leftLeg.position.set(-.15, .77, 0); traveler.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(.15, .77, 0); traveler.add(rightLeg);
  box(0, -.31, 0, .18, .62, .21, materials.dark, leftLeg); box(0, -.31, 0, .18, .62, .21, materials.dark, rightLeg);
  const leftArm = new THREE.Group(); leftArm.position.set(-.37, 1.3, 0); traveler.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(.37, 1.3, 0); traveler.add(rightArm);
  box(0, -.23, 0, .15, .48, .17, materials.cloth, leftArm); box(0, -.23, 0, .15, .48, .17, materials.cloth, rightArm);
  // Small scarf is rigid in graybox; formal cloth/skin is a later visual milestone.
  box(-.13, 1.35, .45, .16, .1, .55, materials.trim, traveler);
  const hemi = new THREE.HemisphereLight(artSample ? '#fff2d7' : '#f6f1dc', artSample ? '#ab825a' : '#797d70', artSample ? 1.65 : 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2d6', 2.4); sun.position.set(-18, 35, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(artSample ? 2048 : 1024, artSample ? 2048 : 1024); sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.near = 1; sun.shadow.camera.far = 100;
  sun.shadow.normalBias = .04; sun.shadow.bias = -.0002; scene.add(sun); sun.target.position.set(-4, 0, -4); scene.add(sun.target);
  return {
    scene, traveler,
    animateTraveler(speed, elapsed, reduced) {
      const amount = reduced ? 0 : Math.min(1, speed / 3.2);
      const gait = Math.sin(elapsed * (speed > 4 ? 12 : 8)) * .55 * amount;
      leftLeg.rotation.x = gait; rightLeg.rotation.x = -gait;
      leftArm.rotation.x = -gait * .7; rightArm.rotation.x = gait * .7;
      head.position.y = 1.62 + (reduced ? 0 : Math.abs(Math.sin(elapsed * 8)) * .02 * amount);
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      sun.shadow.map?.dispose();
      scene.clear();
    },
  };
}
