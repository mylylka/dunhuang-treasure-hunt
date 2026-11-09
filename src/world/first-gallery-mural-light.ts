import * as THREE from 'three';
import { TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import type { FirstGalleryMuralPart } from '../services/first-gallery';

const AWAKE = .42;
const FLOW = 1.28;
const UP = new THREE.Vector3(0, 1, 0);
const WALL_RIGHT = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, TERRAIN_REGIONS.courtyard.yaw);
const WALL_FRONT = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, TERRAIN_REGIONS.courtyard.yaw);
const GOLD = new THREE.Color(0xffd390);
const PALE_GOLD = new THREE.Color(0xffedbc);
const STYLES = {
  lotus: { lift: .88, bend: .28, twist: 1.1, width: .24, pigment: new THREE.Color(0xb4c7a1), dust: .36 },
  bird: { lift: 1.22, bend: .34, twist: .68, width: .17, pigment: new THREE.Color(0x9ac4d0), dust: .31 },
  grapes: { lift: .53, bend: .21, twist: 1.65, width: .20, pigment: new THREE.Color(0xa5b887), dust: .25 },
};

export function muralLightTiming(part: FirstGalleryMuralPart) {
  return { awake: AWAKE, flow: FLOW, wall: part === 'lotus' ? 1.65 : 1.5 };
}

const smooth = THREE.MathUtils.smoothstep;
const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
function grain(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 83.13) * 43758.5453;
  return value - Math.floor(value);
}

const STEPS = 52;
const LANE_GLOW = [1, .67, .83, .55];
const ribbonVertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 silk;
  void main() {
    silk = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;
const ribbonFragment = `
  #include <logdepthbuf_pars_fragment>
  uniform vec3 tint;
  uniform float glow;
  uniform float clock;
  varying vec2 silk;
  void main() {
    #include <logdepthbuf_fragment>
    float crossSilk = abs(silk.y * 2.0 - 1.0);
    float edge = 1.0 - smoothstep(0.05, 1.0, crossSilk);
    float seam = exp(-16.0 * crossSilk * crossSilk);
    float tips = smoothstep(0.0, 0.25, silk.x) * (1.0 - smoothstep(0.85, 1.0, silk.x));
    float weave = 0.74 + 0.26 * sin(28.0 * silk.x - clock * 12.0 + silk.y * 4.0);
    vec3 color = mix(tint, vec3(1.0, 0.91, 0.72), seam * 0.55);
    gl_FragColor = vec4(color, glow * tips * (edge * 0.56 + seam * 0.40) * weave);
    #include <colorspace_fragment>
  }
`;

function makeRibbon(group: THREE.Group) {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array((STEPS + 1) * 6), 3).setUsage(THREE.DynamicDrawUsage);
  const uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    uv.push(i / STEPS, 0, i / STEPS, 1);
    const j = i * 2;
    if (i < STEPS) indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
  }
  geometry.setAttribute('position', positions);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    vertexShader: ribbonVertex, fragmentShader: ribbonFragment,
    uniforms: { tint: { value: GOLD.clone() }, glow: { value: 0 }, clock: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 3;
  mesh.raycast = () => {};
  group.add(mesh);
  return { mesh, positions, material };
}

const MAX_FLAKES = 100;
function makeDust(group: THREE.Group) {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(MAX_FLAKES * 12), 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(MAX_FLAKES * 16), 4).setUsage(THREE.DynamicDrawUsage);
  const uv: number[] = [], indices: number[] = [];
  for (let i = 0; i < MAX_FLAKES; i++) {
    uv.push(0, 0, 0, 1, 1, 0, 1, 1);
    const j = i * 4;
    indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
  }
  geometry.setAttribute('position', positions);
  geometry.setAttribute('flake', colors);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      attribute vec4 flake;
      varying vec4 grainColor;
      varying vec2 grainUv;
      void main() {
        grainColor = flake; grainUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
      varying vec4 grainColor;
      varying vec2 grainUv;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 delta = abs(grainUv * 2.0 - 1.0);
        float shape = 1.0 - smoothstep(0.08, 1.0, delta.x * 0.82 + delta.y * 0.92);
        gl_FragColor = vec4(grainColor.rgb, grainColor.a * shape);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.renderOrder = 4;
  mesh.raycast = () => {};
  group.add(mesh);
  let count = 0;
  return {
    reset() { count = 0; },
    add(center: THREE.Vector3, along: THREE.Vector3, across: THREE.Vector3, length: number, width: number, color: THREE.Color, alpha: number) {
      if (alpha < .012 || count >= MAX_FLAKES) return;
      const j = count++ * 4;
      for (let i = 0; i < 4; i++) {
        const a = (i < 2 ? -1 : 1) * length;
        const b = (i % 2 ? 1 : -1) * width;
        positions.setXYZ(j + i, center.x + along.x * a + across.x * b, center.y + along.y * a + across.y * b, center.z + along.z * a + across.z * b);
        colors.setXYZW(j + i, color.r, color.g, color.b, alpha);
      }
    },
    finish() { geometry.setDrawRange(0, count * 6); positions.needsUpdate = colors.needsUpdate = true; },
  };
}

export function createMuralLight(parent: THREE.Group) {
  const group = new THREE.Group();
  group.name = 'first-gallery-mural-light';
  group.visible = false;
  parent.add(group);
  const lanes = Array.from({ length: 4 }, () => makeRibbon(group));
  const dust = makeDust(group);
  const source = new THREE.Vector3();
  const wallRight = new THREE.Vector3(), wallFront = new THREE.Vector3(), up = new THREE.Vector3();
  const localFrame = new THREE.Matrix4();
  const center = new THREE.Vector3(), previous = new THREE.Vector3(), next = new THREE.Vector3(), axis = new THREE.Vector3(), cross = new THREE.Vector3();
  let elapsed = 0;
  let part: FirstGalleryMuralPart = 'lotus';
  let endpoints: THREE.Vector3[] = [], outlines: THREE.Vector3[] = [], routes: THREE.CubicBezierCurve3[] = [];

  function route(destination: THREE.Vector3) {
    const style = STYLES[part];
    const lift = Math.max(source.dot(up), destination.dot(up)) + style.lift;
    const first = source.clone().lerp(destination, .24).addScaledVector(wallFront, .32).addScaledVector(wallRight, style.bend);
    first.addScaledVector(up, lift - first.dot(up));
    const last = source.clone().lerp(destination, .72).addScaledVector(wallFront, .14).addScaledVector(wallRight, -style.bend);
    last.addScaledVector(up, destination.dot(up) + style.lift * .52 - last.dot(up));
    return new THREE.CubicBezierCurve3(source, first, last, destination);
  }

  function point(t: number, lane: number, out: THREE.Vector3) {
    const style = STYLES[part];
    routes[0].getPoint(t, out);
    if (lane >= 2 && t > .46) out.lerp(routes[1].getPoint(t, next), smooth(t, .46, .9));
    const spin = t * Math.PI * 2 * style.twist - elapsed * 4.3 + lane * 1.8;
    const amplitude = Math.sin(t * Math.PI) * style.bend * (lane % 2 ? .77 : .32);
    out.addScaledVector(wallRight, Math.cos(spin) * amplitude).addScaledVector(up, Math.sin(spin) * amplitude);
  }

  function ribbons(flow: number) {
    const style = STYLES[part];
    for (const [i, lane] of lanes.entries()) {
      const progress = flow - (i % 2) * .047;
      const head = clamp01(progress * 1.045);
      const tail = smooth(progress, .10, 1.43);
      const glow = smooth(progress, 0, .18) * (1 - smooth(progress, 1.03, 1.43));
      lane.mesh.visible = !!routes[i < 2 ? 0 : 1] && head - tail > .015 && glow > .015;
      if (!lane.mesh.visible) continue;
      lane.material.uniforms.glow.value = glow * LANE_GLOW[i];
      lane.material.uniforms.clock.value = elapsed;
      const beginning = i >= 2 ? Math.max(tail, .46) : tail;
      if (beginning >= head) { lane.mesh.visible = false; continue; }
      for (let j = 0; j <= STEPS; j++) {
        const u = j / STEPS;
        const t = THREE.MathUtils.lerp(beginning, head, u);
        point(t, i, center);
        point(Math.max(0, t - .008), i, previous);
        point(Math.min(1, t + .008), i, axis);
        axis.sub(previous).normalize();
        cross.copy(up).addScaledVector(wallRight, Math.sin(t * 8 - elapsed * 3 + i) * .68);
        cross.addScaledVector(axis, -cross.dot(axis)).normalize();
        const profile = Math.pow(Math.sin(u * Math.PI), .55);
        const width = style.width * .5 * profile * (i % 2 ? .47 : 1) * (.86 + .14 * Math.sin(t * 15 - elapsed * 6 + i));
        previous.copy(center).addScaledVector(cross, -width);
        lane.positions.setXYZ(j * 2, previous.x, previous.y, previous.z);
        previous.copy(center).addScaledVector(cross, width);
        lane.positions.setXYZ(j * 2 + 1, previous.x, previous.y, previous.z);
      }
      lane.positions.needsUpdate = true;
    }
  }

  function drawDust(flow: number, wallProgress: number) {
    const style = STYLES[part];
    dust.reset();
    const awake = smooth(elapsed, 0, .23) * (1 - smooth(elapsed, .36, .73));
    for (const [i, sample] of outlines.entries()) {
      center.copy(sample).addScaledVector(wallFront, .025).addScaledVector(up, elapsed * .14);
      axis.copy(wallRight).addScaledVector(up, (grain(i, 3) - .5) * 1.7).normalize();
      cross.crossVectors(wallFront, axis).normalize();
      dust.add(center, axis, cross, .029 + grain(i, 4) * .042, .012, i % 4 ? GOLD : style.pigment, awake * (.34 + .55 * grain(i, 8)));
    }
    for (let i = 0; i < 16; i++) {
      const t = flow * 1.09 - grain(i, 4) * .58;
      if (t <= 0 || t >= 1) continue;
      const lane = routes.length > 1 && i % 4 === 0 ? 2 : 0;
      point(t, lane, center);
      point(Math.min(1, t + .014), lane, axis);
      axis.sub(center).normalize();
      cross.copy(up).addScaledVector(axis, -up.dot(axis)).normalize();
      center.addScaledVector(cross, (grain(i, 8) - .5) * .33).addScaledVector(wallFront, (grain(i, 2) - .5) * .14);
      dust.add(center, axis, cross, .027 + grain(i, 6) * .052, .008 + grain(i, 9) * .009, i % 5 ? PALE_GOLD : style.pigment,
        Math.sin(t * Math.PI) * (.2 + grain(i, 7) * .62));
    }
    if (wallProgress >= 0) for (const [j, destination] of endpoints.entries()) {
      for (let i = 0; i < 20; i++) {
        const t = clamp01((wallProgress - grain(i, 3) * .38) * 1.5);
        const alpha = smooth(t, 0, .16) * (1 - smooth(t, .48, 1)) * (.28 + .48 * grain(i, 7));
        const phase = grain(i, 1) * 2 * Math.PI + t * style.twist + j;
        const radius = style.dust * (.18 + grain(i, 5)) * (1 - t);
        axis.copy(wallRight).multiplyScalar(Math.cos(phase)).addScaledVector(up, Math.sin(phase));
        center.copy(destination).addScaledVector(axis, radius).addScaledVector(wallFront, .07 * (1 - t));
        cross.crossVectors(wallFront, axis).normalize();
        dust.add(center, axis, cross, .018 + grain(i, 8) * .039, .013, i % 3 ? GOLD : style.pigment, alpha);
      }
    }
    dust.finish();
  }

  function stop() { group.visible = false; }
  return {
    start(kind: FirstGalleryMuralPart, from: THREE.Vector3Like, targets: readonly THREE.Vector3Like[], sourcePoints: readonly THREE.Vector3Like[] = []) {
      if (!targets.length) { stop(); return; }
      elapsed = 0; part = kind; group.visible = true;
      group.updateWorldMatrix(true, false);
      localFrame.copy(group.matrixWorld).invert();
      wallRight.copy(WALL_RIGHT).transformDirection(localFrame);
      wallFront.copy(WALL_FRONT).transformDirection(localFrame);
      up.copy(UP).transformDirection(localFrame);
      source.copy(from).applyMatrix4(localFrame).addScaledVector(up, .065);
      endpoints = targets.slice(0, 2).map(target => new THREE.Vector3().copy(target).applyMatrix4(localFrame).addScaledVector(wallFront, .019));
      routes = endpoints.map(route);
      outlines = sourcePoints.slice(0, 28).map(sample => new THREE.Vector3().copy(sample).applyMatrix4(localFrame));
      if (!outlines.length) {
        for (let i = 0; i < 16; i++) {
          const angle = i / 16 * 2 * Math.PI;
          const radius = .13 + grain(i, 8) * .13;
          outlines.push(source.clone().addScaledVector(wallRight, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius * .66));
        }
      }
      lanes.forEach((lane, i) => { lane.mesh.visible = false; lane.material.uniforms.tint.value.copy(i % 2 ? STYLES[part].pigment : GOLD); });
      dust.reset(); dust.finish();
    },
    update(dt: number, reduced: boolean) {
      if (!group.visible) return;
      const { wall } = muralLightTiming(part);
      if (reduced) { stop(); return; }
      elapsed += Math.max(0, dt);
      if (elapsed >= AWAKE + FLOW + wall) { stop(); return; }
      const flow = (elapsed - AWAKE) / FLOW;
      ribbons(flow);
      drawDust(flow, (elapsed - AWAKE - FLOW) / wall);
    },
    stop,
    inspect() { return { active: group.visible, elapsed, part, targets: endpoints.length }; },
    dispose() {
      stop();
      group.traverse(node => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); node.material.dispose(); } });
      group.removeFromParent();
    },
  };
}
