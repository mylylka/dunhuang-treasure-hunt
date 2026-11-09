import * as THREE from 'three';

const tau = Math.PI * 2;
type StripPoint = readonly [x: number, y: number, z: number];

function revealGeometry() {
  const positions: number[] = [], uvs: number[] = [], kinds: number[] = [], indices: number[] = [];
  function strip(kind: number, segments: number, sample: (u: number, side: number) => StripPoint) {
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      positions.push(...sample(u, -1), ...sample(u, 1));
      uvs.push(u, 0, u, 1);
      kinds.push(kind, kind);
      if (i < segments) {
        const a = start + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const floorY = .008;
  for (const [radius, width] of [[.582, .018], [.518, .010]]) {
    strip(0, 64, (u, side) => {
      const r = radius + side * width;
      return [r * Math.cos(u * tau), floorY, r * Math.sin(u * tau)];
    });
  }
  for (let tick = 0; tick < 12; tick++) {
    strip(0, 1, (u, side) => {
      const radius = .527 + .036 * u;
      const angle = tick * tau / 12 + side * .011;
      return [radius * Math.cos(angle), floorY, radius * Math.sin(angle)];
    });
  }
  for (let ribbon = 0; ribbon < 3; ribbon++) {
    strip(1, 48, (u, side) => {
      const angle = (u * (1.02 + ribbon * .06) + ribbon / 3) * tau;
      const radius = .55 - .18 * u + side * (.022 + .015 * Math.sin(u * Math.PI));
      return [radius * Math.cos(angle), u, radius * Math.sin(angle)];
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('effectKind', new THREE.Float32BufferAttribute(kinds, 1));
  geometry.setIndex(indices);
  // The shader scales the rising strips to the current outfit's height.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 1.6);
  return geometry;
}

const surfaceVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float effectKind;
  uniform float height, clock;
  varying vec2 pathUv;
  varying float kind;
  void main() {
    pathUv = uv;
    kind = effectKind;
    vec3 point = position;
    point.y = mix(point.y, point.y * height, kind);
    float orbit = clock * 1.22 * kind;
    point.xz = mat2(cos(orbit), sin(orbit), -sin(orbit), cos(orbit)) * point.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const surfaceFragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform float clock, strength, rise, ribbonStrength;
  varying vec2 pathUv;
  varying float kind;
  void main() {
    #include <logdepthbuf_fragment>
    float edge = abs(pathUv.y * 2.0 - 1.0);
    float core = exp(-18.0 * edge * edge);
    float halo = exp(-3.0 * edge * edge) * (1.0 - smoothstep(.75, 1.0, edge));
    float shimmer = .72 + .28 * cos(6.283 * (pathUv.x - clock * .65));
    float head = 1.0 - smoothstep(rise - .08, rise + .12, pathUv.x);
    float tail = smoothstep(rise - .62, rise - .22, pathUv.x);
    float ribbon = head * mix(.42, 1.0, tail) * (1.0 - smoothstep(.93, 1.0, pathUv.x));
    float alpha = (core * .88 + halo * .24) * shimmer;
    alpha *= mix(strength, ribbonStrength * ribbon, kind);
    vec3 color = mix(vec3(.82, .48, .20), vec3(1.0, .87, .61), core);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const dustVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float clock, height, rise, dustStrength;
  varying float glimmer;
  void main() {
    float age = fract(position.x + clock * (.52 + .24 * position.z));
    float angle = position.y * 6.283 + 3.5 * age - .54 * clock;
    float radius = .49 + .14 * position.z - .18 * age;
    vec3 point = vec3(cos(angle) * radius, .024 + age * rise * height, sin(angle) * radius);
    vec4 view = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * view;
    #include <logdepthbuf_vertex>
    gl_PointSize = clamp((14.0 + 15.0 * position.z) / max(.1, -view.z), 2.0, 7.2);
    glimmer = dustStrength * sin(age * 3.14159) * (.55 + .45 * position.z);
  }
`;

const dustFragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  varying float glimmer;
  void main() {
    #include <logdepthbuf_fragment>
    vec2 point = abs(gl_PointCoord * 2.0 - 1.0);
    float spark = 1.0 - smoothstep(.05, .93, point.x + point.y);
    gl_FragColor = vec4(1.0, .71, .23, glimmer * spark);
    #include <colorspace_fragment>
  }
`;

/** Orbit and motes share the prepared outfit's local bounds and lifetime. */
export function createMusicGuideReveal(parent: THREE.Object3D, bounds: THREE.Box3) {
  const group = new THREE.Group();
  group.name = 'music-guide-reveal';
  group.visible = false;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(.58, Math.hypot(size.x, size.z) * .5 + .13);
  const scale = radius / .582;
  const placement = new THREE.Matrix4().makeScale(scale, 1, scale);
  placement.setPosition(center.x, bounds.min.y, center.z);
  group.matrixAutoUpdate = false;
  group.matrix.copy(parent.matrixWorld).invert().multiply(placement);
  const uniforms = { clock: { value: 0 }, height: { value: size.y + .10 }, strength: { value: 0 },
    rise: { value: 0 }, ribbonStrength: { value: 0 }, dustStrength: { value: 0 } };
  const style = { uniforms, transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false };
  const strokes = new THREE.Mesh(revealGeometry(), new THREE.ShaderMaterial({ ...style,
    vertexShader: surfaceVertex, fragmentShader: surfaceFragment, side: THREE.DoubleSide, forceSinglePass: true }));
  strokes.name = 'music-guide-reveal-strokes';
  const dustGeometry = new THREE.BufferGeometry();
  const fraction = (value: number) => value - Math.floor(value);
  const seeds = Array.from({ length: 26 }, (_, i) => [
    fraction(Math.sin(i * 17.12 + 1) * 271.23), fraction(Math.sin(i * 41.87 + 2) * 587.12),
    fraction(Math.sin(i * 27.84 + 3) * 723.57),
  ]).flat();
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seeds, 3));
  dustGeometry.boundingSphere = strokes.geometry.boundingSphere;
  const dust = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({ ...style,
    vertexShader: dustVertex, fragmentShader: dustFragment }));
  dust.name = 'music-guide-reveal-dust';
  for (const part of [strokes, dust]) {
    part.raycast = () => {};
    part.userData.musicGuideReveal = true;
    part.userData.excludeEnvironmentShadowBake = true;
    part.renderOrder = 6;
  }
  group.add(strokes, dust);

  return {
    attach() { parent.add(group); },
    detach() { group.removeFromParent(); },
    update(progress: number, elapsed: number) {
      const fade = 1 - THREE.MathUtils.smoothstep(progress, .79, 1);
      const strength = THREE.MathUtils.lerp(.26, .63, THREE.MathUtils.smoothstep(progress, 0, .13)) * fade;
      group.visible = progress > 0 && progress < 1;
      uniforms.clock.value = elapsed;
      uniforms.strength.value = strength;
      uniforms.rise.value = THREE.MathUtils.lerp(.10, 1.08, THREE.MathUtils.smoothstep(progress, 0, .83));
      uniforms.ribbonStrength.value = strength * THREE.MathUtils.lerp(.32, .88, THREE.MathUtils.smoothstep(progress, 0, .24));
      uniforms.dustStrength.value = strength * .87;
    },
    dispose() {
      group.removeFromParent();
      strokes.geometry.dispose();
      strokes.material.dispose();
      dust.geometry.dispose();
      dust.material.dispose();
    },
  };
}

export interface MusicGuideMaskRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type MusicGuideMaskPhase = 'rise' | 'covered' | 'release';

const mistVertex = /* glsl */ `
  uniform vec2 mistCenter, mistRadius;
  varying vec2 mistPoint;
  void main() {
    mistPoint = position.xy;
    gl_Position = vec4(mistCenter + mistPoint * mistRadius, 0.0, 1.0);
  }
`;

const mistFragment = /* glsl */ `
  uniform int mistPhase;
  uniform float mistProgress;
  varying vec2 mistPoint;
  void main() {
    float flow = mistPhase == 0 ? mistProgress : 1.0;
    if (mistPhase == 2) flow += mistProgress;
    vec2 p = mistPoint;
    if (mistPhase == 2) p.x /= 1.0 + 0.13 * mistProgress;

    // Turbulence colors the silk and softens its fringe. Alpha inside the
    // ellipse stays exactly one throughout the covered phase.
    float distanceFromCenter = length(p);
    float drift = sin(p.y * 5.2 + p.x * 4.1 - flow * 2.2);
    float edgeRipples = drift * sin(p.x * 7.6 - p.y * 5.5 + flow * 2.0);
    float fringe = max(0.0, distanceFromCenter - 1.0);
    fringe *= 1.0 + 0.22 * edgeRipples;
    float alpha = 1.0 - smoothstep(0.0, 0.27, fringe);

    float heightAtFront = p.y + 0.09 * sin(p.x * 4.2 + flow * 2.0);
    if (mistPhase == 0) {
      float front = mix(-1.16, 1.80, mistProgress);
      alpha *= (1.0 - smoothstep(front - 0.19, front + 0.24, heightAtFront))
        * smoothstep(0.0, 0.22, mistProgress);
    } else if (mistPhase == 2) {
      float centerLift = 0.33 * (1.0 - smoothstep(0.05, 1.1, abs(p.x)));
      float front = mix(2.08, -1.77, mistProgress);
      alpha *= (1.0 - smoothstep(front - 0.17, front + 0.26, heightAtFront + centerLift))
        * (1.0 - smoothstep(0.58, 1.0, mistProgress));
    }

    float broadFold = 0.5 + 0.5 * sin(p.y * 7.1 + p.x * 2.8 + drift * 1.3 - flow * 2.7);
    float fineFold = 0.5 + 0.5 * sin(p.y * 14.3 - p.x * 4.1 + drift * 1.7 + flow * 1.8);
    float fold = 0.24 * broadFold + 0.09 * fineFold;
    float warmth = fold + 0.15 * smoothstep(0.38, 1.3, distanceFromCenter);
    vec3 milk = vec3(1.0, 0.969, 0.898);
    vec3 gold = vec3(0.78, 0.59, 0.35);
    gl_FragColor = vec4(mix(milk, gold, warmth), alpha);
    #include <colorspace_fragment>
  }
`;

/** Render after the 3D scene with autoClear disabled. The mask is independent
 * of scene depth and sized to the projected union of the two outfits. */
export function createMusicGuideMask() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    mistCenter: { value: new THREE.Vector2() },
    mistRadius: { value: new THREE.Vector2() },
    mistPhase: { value: 0 },
    mistProgress: { value: 0 },
  };
  // Allow the sides to drift outward on release without clipping the fringe.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.9), new THREE.ShaderMaterial({
    uniforms, vertexShader: mistVertex, fragmentShader: mistFragment,
    transparent: true, blending: THREE.NormalBlending, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  mesh.name = 'music-guide-opaque-mist';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  mesh.visible = false;
  scene.add(mesh);

  let drawn = false;
  mesh.onAfterRender = () => { drawn = true; };
  return {
    scene, camera,
    get hasDrawn() { return drawn; },
    update(rect: MusicGuideMaskRect, progress: number, phase: MusicGuideMaskPhase, aspect: number) {
      drawn = false;
      const { minX, minY, maxX, maxY } = rect;
      const valid = [minX, minY, maxX, maxY, aspect, progress].every(Number.isFinite)
        && maxX > minX && maxY > minY && aspect > 0;
      if (!valid) { mesh.visible = false; return false; }

      const amount = THREE.MathUtils.clamp(progress, 0, 1);
      uniforms.mistCenter.value.set((minX + maxX) / 2, (minY + maxY) / 2);
      // Scale both half extents by more than sqrt(2) so even the corners lie
      // strictly inside the opaque core. Add a small viewport-relative margin.
      uniforms.mistRadius.value.set((maxX - minX) * .73 + .018 / aspect, (maxY - minY) * .73 + .018);
      uniforms.mistPhase.value = phase === 'rise' ? 0 : phase === 'covered' ? 1 : 2;
      uniforms.mistProgress.value = amount;
      mesh.visible = phase === 'covered' || (phase === 'rise' ? amount > 0 : amount < 1);
      return true;
    },
    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  };
}
