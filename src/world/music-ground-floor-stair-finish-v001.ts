import * as THREE from 'three';

// Source-pavilion coordinates from the actual 36-riser stair profile. The
// soffit lies 0.32 m below the walkable profile and spans only the stair width.
export const MUSIC_GROUND_STAIR_FINISH = {
  upperX: 46.27, lowerX: 55.69, rearZ: -32.025, frontZ: -28.425,
  upperY: 7.915375, lowerY: 1.8, soffitDepth: .32, floorY: 1.8,
  rearWallZ: -32.153,
} as const;

/** Thin architectural finish on the existing stair, without navigation solids. */
export function createMusicGroundFloorStairFinish(root: THREE.Object3D) {
  const c = MUSIC_GROUND_STAIR_FINISH;
  const group = new THREE.Group(); group.name = 'music-ground-floor-stair-finish-v001';
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const slope = (c.upperY - c.lowerY) / (c.lowerX - c.upperX);
  const undersideY = (x: number) => c.upperY - c.soffitDepth - slope * (x - c.upperX);
  const endX = c.upperX + (c.upperY - c.soffitDepth - (c.floorY + .014)) / slope;
  // A tiny gap along the underside normal prevents z-fighting without changing
  // the stair silhouette. Width stays within the measured stair opening.
  const normal = new THREE.Vector3(-slope, -1, 0).normalize();
  const point = (x: number, z: number) => new THREE.Vector3(x, undersideY(x), z).addScaledVector(normal, .012);
  const x0 = c.upperX, x1 = endX;
  const p0 = point(x0, c.rearZ), p1 = point(x1, c.rearZ);
  const soffit = new THREE.BufferGeometry();
  // A smooth, restrained ambient gradient suggests the changing depth at both
  // stair edges. It remains integral to the surface, rather than extra stripes.
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const across = [0, .07, .23, .5, .77, .93, 1];
  const acrossLight = [.84, .91, .97, 1, .97, .91, .84];
  const along = [0, .5, 1], alongLight = [.94, 1, .96];
  for (let a = 0; a < along.length; a++) for (let b = 0; b < across.length; b++) {
    positions.push(...point(THREE.MathUtils.lerp(x0, x1, along[a]), THREE.MathUtils.lerp(c.rearZ, c.frontZ, across[b])));
    const light = alongLight[a] * acrossLight[b]; colors.push(light, light, light);
  }
  for (let a = 0; a < along.length - 1; a++) for (let b = 0; b < across.length - 1; b++) {
    const first = a * across.length + b, next = first + across.length;
    indices.push(first, next + 1, next, first, first + 1, next + 1);
  }
  soffit.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  soffit.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  soffit.setIndex(indices); soffit.computeVertexNormals();
  const plaster = new THREE.MeshStandardMaterial({ color: '#c4b398', vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  materials.push(plaster); geometries.push(soffit);
  const panel = new THREE.Mesh(soffit, plaster); panel.name = 'music-stair-soffit-plaster';
  panel.receiveShadow = true; panel.raycast = () => {}; group.add(panel);

  // Narrow rounded-looking returns articulate the 32 cm structural depth
  // without placing a beam or obstruction across the stair mouth.
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#a79178', roughness: .98 });
  materials.push(edgeMaterial);
  const direction = p1.clone().sub(p0), length = direction.length();
  const edgeGeometry = new THREE.BoxGeometry(length, .075, .065); geometries.push(edgeGeometry);
  for (const [name, z] of [['rear', c.rearZ + .035], ['front', c.frontZ - .035]] as const) {
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.name = `music-stair-soffit-edge-${name}`;
    edge.position.copy(point((x0 + x1) / 2, z));
    edge.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize());
    edge.receiveShadow = true; edge.castShadow = false; edge.raycast = () => {}; group.add(edge);
  }

  // Very soft painted contact shadow at the back wall; it fades to transparent
  // within 18 cm and does not alter or replace the historic wall texture.
  const data = new Uint8Array(4 * 64);
  for (let i = 0; i < 64; i++) {
    const t = i / 63, alpha = Math.round(30 * (1 - t) * (1 - t));
    data.set([48, 31, 22, alpha], i * 4);
  }
  const texture = new THREE.DataTexture(data, 1, 64, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true; textures.push(texture);
  const shade = new THREE.BufferGeometry();
  shade.setAttribute('position', new THREE.Float32BufferAttribute([
    x0, undersideY(x0), c.rearWallZ + .026, x1, undersideY(x1), c.rearWallZ + .026,
    x1, undersideY(x1) - .18, c.rearWallZ + .026, x0, undersideY(x0) - .18, c.rearWallZ + .026,
  ], 3));
  shade.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  shade.setIndex([0, 1, 2, 0, 2, 3]); geometries.push(shade);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(shade, shadowMaterial); shadow.name = 'music-stair-wall-contact-shadow';
  shadow.raycast = () => {}; shadow.renderOrder = 2; group.add(shadow);
  root.add(group);
  return {
    group,
    inspect: () => ({ upperX: x0, lowerX: x1, rearZ: c.rearZ, frontZ: c.frontZ, parts: group.children.map(child => child.name) }),
    dispose() { group.removeFromParent(); group.clear(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); },
  };
}
