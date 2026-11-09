import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MUSIC_RELIEF_CEILING } from './music-interior-relief-ceiling-v001';

// Coordinates are in the untransformed music pavilion model's metres.  The
// stair starts beyond the rear panel's end. The west wall extends past the
// covered gallery to the balcony opening.
const floor = 7.915375;
// Move the cornice to the underside of the existing ceiling and give the
// lower green dado exactly the same extra height.
const topBandShift = MUSIC_RELIEF_CEILING.undersideY - 13.20;
const dadoTrimTop = floor + .80 + topBandShift;
const corniceBottom = 12.79 + topBandShift;
const frameWidth = 2.75;
const frameHeight = 3.18;
const frameCenterY = (dadoTrimTop + corniceBottom) / 2;
const frameFront = .049;
const walls = [
  { id: 'west', start: -3.61, end: 10.28, frameCount: 4, position: [34.80, 0, -21.85] as const, rotation: Math.PI / 2 },
  { id: 'rear', start: 0, end: 11.44, frameCount: 3, position: [34.80, 0, -32.145] as const, rotation: 0 },
] as const;

/** Identical shallow architectural frames, independently spaced on each wall.
 * They are made of merged, low-poly geometry; they never participate in the
 * navigation or instrument picking meshes.
 */
export function createMusicUpperWallRelief(root: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = 'music-upper-wall-relief-v001';
  const materials = {
    plaster: new THREE.MeshStandardMaterial({ color: '#e7d8b7', roughness: 1 }),
    green: new THREE.MeshStandardMaterial({ color: '#819d8e', roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: '#744334', roughness: .93 }),
    red: new THREE.MeshStandardMaterial({ color: '#99513a', roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c8ab79', roughness: .88, metalness: .12 }),
    relief: new THREE.MeshStandardMaterial({ color: '#f2e3c7', roughness: .98 }),
  };
  const geometries: THREE.BufferGeometry[] = [];
  const panels: { id: string; start: number; length: number; centers: number[] }[] = [];

  function rectangle(parent: THREE.Group, material: THREE.Material, width: number, bottom: number, top: number, depth: number, start = 0) {
    const geometry = new THREE.PlaneGeometry(width, top - bottom);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(start + width / 2, (bottom + top) / 2, depth);
    mesh.receiveShadow = true;
    // The existing solid wall already occludes picks. This finish must never
    // mask an instrument target when a player clicks it near the wall.
    mesh.raycast = () => {};
    mesh.userData.musicUpperRelief = true;
    parent.add(mesh);
  }

  for (const wall of walls) {
    const face = new THREE.Group();
    face.name = `music-upper-wall-relief-${wall.id}`;
    face.position.set(wall.position[0], wall.position[1], wall.position[2]);
    face.rotation.y = wall.rotation;
    group.add(face);
    const finishWidth = wall.end - wall.start, finishStart = wall.start;
    rectangle(face, materials.plaster, finishWidth, floor + .015, MUSIC_RELIEF_CEILING.undersideY, 0, finishStart);
    rectangle(face, materials.green, finishWidth, floor + .015, floor + .75 + topBandShift, .004, finishStart);
    rectangle(face, materials.red, finishWidth, floor + .015, floor + .06, .009, finishStart);
    rectangle(face, materials.red, finishWidth, floor + .75 + topBandShift, dadoTrimTop, .009, finishStart);
    rectangle(face, materials.wood, finishWidth, corniceBottom, 13.20 + topBandShift, .010, finishStart);
    rectangle(face, materials.gold, finishWidth, 12.84 + topBandShift, 12.86 + topBandShift, .014, finishStart);
    rectangle(face, materials.gold, finishWidth, 13.12 + topBandShift, 13.14 + topBandShift, .014, finishStart);

    const strips: THREE.BufferGeometry[] = [];
    const accents: THREE.BufferGeometry[] = [];
    function line(target: THREE.BufferGeometry[], a: readonly [number, number], b: readonly [number, number], width: number, depth: number, z: number) {
      const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      if (length < 1e-5) return;
      const geometry = new THREE.BoxGeometry(length, width, depth);
      geometry.rotateZ(Math.atan2(dy, dx));
      geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
      target.push(geometry);
    }
    function trace(path: THREE.Path, points: readonly (readonly [number, number])[]) {
      path.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) path.lineTo(x, y);
      path.closePath();
    }
    function outline(cx: number, width: number, height: number, step: number, thickness: number, depth: number, ornament: boolean) {
      const l = cx - width / 2, r = cx + width / 2, b = frameCenterY - height / 2, t = frameCenterY + height / 2;
      const il = l + thickness, ir = r - thickness, ib = b + thickness, it = t - thickness;
      const insideStep = Math.max(.035, step - thickness), radius = ornament ? .185 : 0;
      const outerTop: [number, number][] = ornament ? [[cx - radius, t], [cx, t + radius], [cx + radius, t]] : [];
      const outerBottom: [number, number][] = ornament ? [[cx + radius, b], [cx, b - radius], [cx - radius, b]] : [];
      const innerRadius = Math.max(0, radius - thickness);
      const innerTop: [number, number][] = ornament ? [[cx - innerRadius, it], [cx, it - innerRadius], [cx + innerRadius, it]] : [];
      const innerBottom: [number, number][] = ornament ? [[cx + innerRadius, ib], [cx, ib + innerRadius], [cx - innerRadius, ib]] : [];
      const shape = new THREE.Shape();
      trace(shape, [
        [l + step, t], ...outerTop, [r - step, t], [r - step, t - step], [r, t - step],
        [r, b + step], [r - step, b + step], [r - step, b], ...outerBottom, [l + step, b],
        [l + step, b + step], [l, b + step], [l, t - step], [l + step, t - step],
      ]);
      const inner = new THREE.Path();
      trace(inner, [
        [il + insideStep, it], ...innerTop, [ir - insideStep, it], [ir - insideStep, it - insideStep], [ir, it - insideStep],
        [ir, ib + insideStep], [ir - insideStep, ib + insideStep], [ir - insideStep, ib], ...innerBottom, [il + insideStep, ib],
        [il + insideStep, ib + insideStep], [il, ib + insideStep], [il, it - insideStep], [il + insideStep, it - insideStep],
      ]);
      shape.holes.push(inner);
      if (ornament) for (const y of [t, b]) {
        const diamondHole = new THREE.Path(), holeRadius = Math.max(.025, radius - thickness * 1.35);
        trace(diamondHole, [[cx, y + holeRadius], [cx + holeRadius, y], [cx, y - holeRadius], [cx - holeRadius, y]]);
        shape.holes.push(diamondHole);
      }
      // The two continuous rings share their front plane. The physical bevels
      // shade the edges without a second, displaced outline at oblique views.
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .007, bevelThickness: .004, bevelSegments: 1 });
      geometry.translate(0, 0, frameFront - depth);
      strips.push(geometry);
    }
    function diamond(target: THREE.BufferGeometry[], x: number, y: number, radius: number, thickness: number, depth: number, z: number) {
      const points: [number, number][] = [[x, y + radius], [x + radius, y], [x, y - radius], [x - radius, y]];
      for (let i = 0; i < points.length; i++) line(target, points[i], points[(i + 1) % points.length], thickness, depth, z);
    }
    const gap = (finishWidth - wall.frameCount * frameWidth) / (wall.frameCount + 1);
    const centers = Array.from({ length: wall.frameCount }, (_, i) => wall.start + gap * (i + 1) + frameWidth * (i + .5));
    for (const cx of centers) {
      outline(cx, frameWidth, frameHeight, .18, .10, .035, true);
      outline(cx, frameWidth - .28, frameHeight - .44, .12, .05, .020, false);
    }
    // Restrained geometric accents on the wood band, separate from the frames.
    for (let x = wall.id === 'west' ? -2.55 : .55; x < wall.end - .35; x += 1.55) diamond(accents, x, 12.99 + topBandShift, .085, .014, .01, .026);
    for (const [parts, material] of [[strips, materials.relief], [accents, materials.gold]] as const) {
      const merged = mergeGeometries(parts);
      for (const part of parts) part.dispose();
      if (!merged) throw new Error('music-upper-relief-merge-failed');
      geometries.push(merged);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.raycast = () => {};
      mesh.userData.musicUpperRelief = true;
      face.add(mesh);
    }
    panels.push({ id: wall.id, start: wall.start, length: finishWidth, centers });
  }
  root.add(group);

  return {
    group,
    inspect: () => ({ version: 'music-upper-wall-relief-v001', panels, frameWidth, frameHeight, frameCenterY }),
    dispose() {
      group.removeFromParent(); group.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
  };
}
