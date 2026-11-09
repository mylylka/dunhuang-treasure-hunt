import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Coordinates are the measured music-pavilion source coordinates in metres. */
export const MUSIC_RELIEF_CEILING = {
  minX: 34.79, maxX: 46.23,
  minZ: -32.145, maxZ: -21.885,
  undersideY: 13.475,
  centerX: 40.51, centerZ: -27.015,
} as const;

/** A shallow, physically modelled geometric ceiling. It introduces no textures,
 * lights, shadow maps or collision surfaces; its three static batches live in the
 * same pavilion-local coordinate system as the existing roof and instruments.
 */
export function createMusicInteriorReliefCeiling(root: THREE.Object3D) {
  const c = MUSIC_RELIEF_CEILING;
  const group = new THREE.Group();
  group.name = 'music-interior-relief-ceiling-v001';
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: '#f4e4c6', roughness: 1, emissive: '#e2cba5', emissiveIntensity: .22,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: '#f5e7ce', roughness: .92, emissive: '#dfc8a4', emissiveIntensity: .16,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: '#bda17a', roughness: 1, emissive: '#957b59', emissiveIntensity: .10,
  });
  const panelGeometry = new THREE.BoxGeometry(c.maxX - c.minX, .04, c.maxZ - c.minZ);
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.name = 'music-relief-ceiling-plaster';
  panel.position.set((c.minX + c.maxX) / 2, c.undersideY + .02, (c.minZ + c.maxZ) / 2);
  panel.receiveShadow = true; panel.raycast = () => {};
  group.add(panel);

  const paleParts: THREE.BufferGeometry[] = [], edgeParts: THREE.BufferGeometry[] = [];
  type Point = readonly [number, number];
  const rectangle = (w: number, h: number): Point[] => [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  const star = (outer: number, inner: number): Point[] => Array.from({ length: 16 }, (_, i) => {
    const angle = i * Math.PI / 8, radius = i % 2 ? inner : outer;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
  // Each outline is a single continuous extruded ring: no touching bar ends,
  // crossing edges or coplanar joints can break up under moving perspective.
  function ring(parts: THREE.BufferGeometry[], outside: Point[], inside: Point[], topY: number, depth: number) {
    const shape = new THREE.Shape();
    outside.forEach(([x,z], i) => i ? shape.lineTo(x,z) : shape.moveTo(x,z)); shape.closePath();
    const hole = new THREE.Path();
    [...inside].reverse().forEach(([x,z], i) => i ? hole.lineTo(x,z) : hole.moveTo(x,z)); hole.closePath();
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(c.centerX, topY, c.centerZ);
    parts.push(geometry);
  }
  const paleY = 13.477;
  // The contrasting rim occupies only the narrow regions outside the ivory
  // ring. Both fronts share one plane, eliminating parallax and depth fighting.
  const edge = (outer: Point[], ivoryOuter: Point[], ivoryInner: Point[], inner: Point[]) => {
    ring(edgeParts, outer, ivoryOuter, paleY, .025);
    ring(edgeParts, ivoryInner, inner, paleY, .025);
  };
  edge(rectangle(9.46,8.96), rectangle(9.4,8.9), rectangle(9.12,8.62), rectangle(9.06,8.56));
  edge(rectangle(8.91,8.41), rectangle(8.85,8.35), rectangle(8.58,8.08), rectangle(8.52,8.02));
  edge(star(3.81,3.13), star(3.78,3.10), star(3.61,2.96), star(3.58,2.93));
  edge(rectangle(3.66,3.66), rectangle(3.6,3.6), rectangle(3.34,3.34), rectangle(3.28,3.28));
  edge(star(1.33,.945), star(1.30,.92), star(1.12,.79), star(1.09,.765));
  ring(paleParts, rectangle(9.4,8.9), rectangle(9.12,8.62), paleY, .025);
  ring(paleParts, rectangle(8.85,8.35), rectangle(8.58,8.08), paleY, .025);
  ring(paleParts, star(3.78,3.10), star(3.61,2.96), paleY, .025);
  ring(paleParts, rectangle(3.6,3.6), rectangle(3.34,3.34), paleY, .025);
  ring(paleParts, star(1.30,.92), star(1.12,.79), paleY, .025);

  function batch(name: string, parts: THREE.BufferGeometry[], material: THREE.Material) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) throw new Error('music-relief-ceiling-geometry-failed');
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.receiveShadow = true; mesh.castShadow = false; mesh.raycast = () => {};
    group.add(mesh);
    return geometry;
  }
  const pale = batch('music-relief-ceiling-ivory', paleParts, trimMaterial);
  const edgeGeometry = batch('music-relief-ceiling-shadow-edge', edgeParts, edgeMaterial);
  root.add(group);
  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      panelGeometry.dispose(); pale.dispose(); edgeGeometry.dispose();
      panelMaterial.dispose(); trimMaterial.dispose(); edgeMaterial.dispose();
    },
  };
}
