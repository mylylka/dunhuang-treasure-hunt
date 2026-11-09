import * as THREE from 'three';
import { TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';

const coreHeight = 2.36;

// The veil stays upright in the scene and turns toward the viewer. Its depth
// still follows the table, so solid scenery can occlude the light normally.
const coreVertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 coreUv;
  varying float viewDistance;
  void main() {
    coreUv = uv;
    vec4 origin = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    viewDistance = length(origin.xyz);
    vec4 up = modelViewMatrix * vec4(0.0, position.y, 0.0, 0.0);
    gl_Position = projectionMatrix * (origin + up + vec4(position.x, 0.0, 0.0, 0.0));
    #include <logdepthbuf_vertex>
  }
`;

const coreFragment = `
  #include <logdepthbuf_pars_fragment>
  uniform float clock;
  uniform float energy;
  varying vec2 coreUv;
  varying float viewDistance;
  void main() {
    #include <logdepthbuf_fragment>
    float height = coreUv.y;
    float sway = sin(height * 6.0 - clock * 1.1) * sin(height * 3.14159) * 0.045;
    float across = abs(coreUv.x * 2.0 - 1.0 - sway);
    float width = 0.22 * (1.0 - 0.54 * height) + 0.056 * sin(height * 3.14159);
    float heart = exp(-2.8 * pow(across / width, 2.0));
    float halo = exp(-5.4 * across * across) * (1.0 - smoothstep(0.62, 0.92, across));
    float body = smoothstep(0.045, 0.23, height) * (1.0 - smoothstep(0.53, 1.0, height));
    float nearFade = mix(0.57, 1.0, smoothstep(3.0, 8.0, viewDistance));
    float white = smoothstep(0.08, 0.78, heart);
    vec3 tint = mix(vec3(1.0, 0.61, 0.22), vec3(1.0, 0.982, 0.90), white);
    float alpha = body * nearFade * (0.92 * heart + 0.19 * halo);
    gl_FragColor = vec4(tint, min(0.96, alpha * (0.95 + 0.20 * energy)));
    #include <colorspace_fragment>
  }
`;

const vertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 strand;
  varying vec2 silkUv;
  varying vec3 silkStrand;
  void main() {
    silkUv = uv;
    silkStrand = strand;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const fragment = `
  #include <logdepthbuf_pars_fragment>
  uniform float clock;
  uniform float energy;
  varying vec2 silkUv;
  varying vec3 silkStrand;
  void main() {
    #include <logdepthbuf_fragment>
    float across = abs(silkUv.y * 2.0 - 1.0);
    float falloff = 1.0 - smoothstep(0.0, 1.0, across);
    float core = exp(-18.0 * across * across);
    float wave = fract(silkUv.x - clock * mix(0.27, 0.72, silkStrand.x) + silkStrand.y);
    float head = smoothstep(0.15, 0.94, wave) * (1.0 - smoothstep(0.94, 1.0, wave));
    float arc = smoothstep(0.0, 0.1, silkUv.x) * (1.0 - smoothstep(0.85, 1.0, silkUv.x));
    float rise = smoothstep(0.0, 0.12, silkUv.x) * (1.0 - smoothstep(0.72, 1.0, silkUv.x));
    float shape = mix(arc, rise, silkStrand.x) * silkStrand.z;
    float alpha = shape * (0.40 + head * 0.60) * (falloff * 0.44 + core * 0.56);
    vec3 gold = mix(vec3(0.96, 0.36, 0.045), vec3(1.0, 0.82, 0.43), core * (0.45 + head * 0.55));
    gl_FragColor = vec4(gold, alpha * energy);
    #include <colorspace_fragment>
  }
`;

function ribbonGeometry() {
  const positions: number[] = [], uvs: number[] = [], strands: number[] = [], indices: number[] = [];
  const segments = 64;
  function strip(kind: number, phase: number, opacity: number, sample: (u: number, side: number) => number[]) {
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      positions.push(...sample(u, -1), ...sample(u, 1));
      uvs.push(u, 0, u, 1);
      strands.push(kind, phase, opacity, kind, phase, opacity);
      if (i < segments) {
        const a = start + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  for (let lane = 0; lane < 3; lane++) {
    strip(0, lane * .29, .80 - lane * .12, (u, side) => {
      const angle = u * Math.PI * 2.2 + lane * 2.1;
      const curl = .86 + .14 * u + .07 * Math.sin(angle * 2 + lane);
      const edge = side * (.018 + .024 * Math.sin(Math.PI * u));
      const radius = (.44 + lane * .15) * curl + edge;
      return [radius * Math.cos(angle), .068 + u * (.16 + .043 * lane) + .034 * Math.sin(angle + lane), radius * .72 * Math.sin(angle)];
    });
  }
  for (let lane = 0; lane < 3; lane++) {
    strip(1, lane * .33, .88 - lane * .15, (u, side) => {
      const angle = u * Math.PI * (3.3 + .27 * lane) + lane * 2.1;
      const edge = side * (.026 + .038 * Math.sin(Math.PI * u));
      const radius = (.58 + lane * .083) * (1 - .71 * u) + .04 * Math.sin(angle * 2) + edge * .55;
      const lift = .11 + (2.02 - lane * .19) * u + edge * .84;
      return [radius * Math.cos(angle), lift, radius * .77 * Math.sin(angle)];
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('strand', new THREE.Float32BufferAttribute(strands, 3));
  geometry.setIndex(indices);
  return geometry;
}

function portalDust(uniforms: Record<string, THREE.IUniform>) {
  const geometry = new THREE.BufferGeometry();
  const seeds = Array.from({ length: 56 }, (_, index) => {
    const x = Math.sin((index + 1) * 83.173) * 1764.421;
    const y = Math.sin((index + 1) * 62.933) * 5461.323;
    const z = Math.sin((index + 1) * 31.047) * 9685.816;
    return [x - Math.floor(x), y - Math.floor(y), z - Math.floor(z)];
  }).flat();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float clock;
      uniform float energy;
      varying float glimmer;
      void main() {
        float age = fract(position.x + clock * (0.24 + 0.18 * position.z));
        float theta = position.y * 6.283 + 2.4 * age;
        float radius = (0.14 + 0.63 * position.z) * (1.0 - 0.38 * age);
        vec3 drift = vec3(cos(theta) * radius, 0.12 + age * (0.55 + position.z * 1.49), sin(theta) * radius * 0.73);
        vec4 view = modelViewMatrix * vec4(drift, 1.0);
        gl_Position = projectionMatrix * view;
        #include <logdepthbuf_vertex>
        gl_PointSize = clamp((13.0 + position.x * position.x * 21.0) / -view.z, 1.7, 6.5);
        glimmer = energy * sin(age * 3.14159) * (0.34 + 0.66 * position.x * position.x);
      }`,
    fragmentShader: `
      #include <logdepthbuf_pars_fragment>
      varying float glimmer;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 point = abs(gl_PointCoord * 2.0 - 1.0);
        float diamond = 1.0 - smoothstep(0.0, 0.94, point.x + point.y);
        gl_FragColor = vec4(1.0, 0.68 + 0.23 * diamond, 0.29 + 0.32 * diamond, glimmer * diamond);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  // Vertices are seeds. The shader expands them around the paper.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.5);
  points.raycast = () => {};
  points.renderOrder = 7;
  return points;
}

export function createGalleryPortalLight(parent: THREE.Group, center: THREE.Vector3) {
  const group = new THREE.Group();
  group.name = 'first-gallery-scroll-portal-light';
  group.position.copy(center);
  group.rotation.y = TERRAIN_REGIONS.courtyard.yaw;
  group.visible = false;
  parent.add(group);
  const uniforms = { clock: { value: 0 }, energy: { value: 1 } };
  const coreGeometry = new THREE.PlaneGeometry(1.82, coreHeight);
  coreGeometry.translate(0, coreHeight * .5, 0);
  const core = new THREE.Mesh(coreGeometry, new THREE.ShaderMaterial({
    vertexShader: coreVertex, fragmentShader: coreFragment, uniforms,
    transparent: true, depthWrite: false, toneMapped: false,
  }));
  core.renderOrder = 5;
  core.raycast = () => {};
  const ribbons = new THREE.Mesh(ribbonGeometry(), new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  }));
  ribbons.renderOrder = 6;
  ribbons.raycast = () => {};
  const dust = portalDust(uniforms);
  group.add(core, ribbons, dust);
  let reveal = 0, clock = 0;
  return {
    setReveal(progress: number) {
      reveal = progress;
      group.visible = reveal > 0;
    },
    update(dt: number, reduced: boolean) {
      if (!reveal) return;
      clock = (clock + dt) % 100;
      dust.visible = !reduced;
      uniforms.clock.value = reduced ? 1.4 : clock;
      const rise = THREE.MathUtils.smoothstep(reveal, 0, 1);
      group.scale.y = reduced ? 1 : Math.max(.01, rise);
      group.rotation.y = TERRAIN_REGIONS.courtyard.yaw + (reduced ? 0 : clock * Math.PI / 10);
      uniforms.energy.value = reduced ? 1 : THREE.MathUtils.smoothstep(reveal, 0, .24) * (1 + .30 * Math.sin(Math.PI * rise));
    },
    inspect: () => ({ visible: group.visible, reveal, rotation: group.rotation.y, center: group.position.toArray() }),
    dispose() {
      group.removeFromParent();
      core.geometry.dispose(); core.material.dispose();
      ribbons.geometry.dispose(); ribbons.material.dispose();
      dust.geometry.dispose(); dust.material.dispose();
    },
  };
}

export function createGalleryGamePortal(scene: THREE.Scene, name: string, center: { x: number; y: number; z: number }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(center.x, center.y, center.z);
  scene.add(group);

  const disk = new THREE.Mesh(new THREE.CircleGeometry(.67, 48),
    new THREE.MeshBasicMaterial({ color: 0xc58e41, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  disk.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.RingGeometry(.595, .647, 48),
    new THREE.MeshBasicMaterial({ color: 0xffdfa0, toneMapped: false }));
  rim.position.y = .002;
  rim.rotation.x = disk.rotation.x;
  group.add(disk, rim);

  const light = createGalleryPortalLight(group, new THREE.Vector3(0, .015, 0));
  light.setReveal(1);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  return {
    update: light.update,
    inspect: light.inspect,
    pick(camera: THREE.Camera, point: { x: number; y: number }) {
      ray.setFromCamera(ndc.set(point.x, point.y), camera);
      return ray.intersectObject(disk, false).length > 0;
    },
    dispose() {
      light.dispose();
      group.removeFromParent();
      disk.geometry.dispose();
      disk.material.dispose();
      rim.geometry.dispose();
      rim.material.dispose();
    },
  };
}
