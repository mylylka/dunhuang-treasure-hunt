import * as THREE from 'three';
import { createMusicGuideReveal } from './music-guide-reveal';

const revealVertex = /* glsl */ `
  uniform mat4 guideRevealWorldToRoot;
  varying vec3 guideRevealPosition;
`;

const revealField = /* glsl */ `
  uniform vec2 guideRevealHeight;
  uniform float guideRevealProgress, guideRevealElapsed;
  const float guideRevealFull = 0.89;

  float guideRevealHash(vec3 cell) {
    cell = fract(cell * 0.3183099 + vec3(0.11, 0.19, 0.31)) * 17.0;
    return fract(cell.x * cell.y * cell.z * (cell.x + cell.y + cell.z));
  }

  float guideRevealNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 blend = fract(point);
    blend = blend * blend * (3.0 - 2.0 * blend);
    vec4 nearLayer = vec4(
      guideRevealHash(cell),
      guideRevealHash(cell + vec3(1.0, 0.0, 0.0)),
      guideRevealHash(cell + vec3(0.0, 1.0, 0.0)),
      guideRevealHash(cell + vec3(1.0, 1.0, 0.0))
    );
    cell.z += 1.0;
    vec4 farLayer = vec4(
      guideRevealHash(cell),
      guideRevealHash(cell + vec3(1.0, 0.0, 0.0)),
      guideRevealHash(cell + vec3(0.0, 1.0, 0.0)),
      guideRevealHash(cell + vec3(1.0, 1.0, 0.0))
    );
    vec4 corners = mix(nearLayer, farLayer, blend.z);
    return mix(mix(corners.x, corners.y, blend.x), mix(corners.z, corners.w, blend.x), blend.y);
  }

  float guideRevealContour(vec3 point) {
    vec3 positionInHeights = point * guideRevealHeight.y;
    positionInHeights.y -= guideRevealHeight.x * guideRevealHeight.y;
    float broadNoise = guideRevealNoise(positionInHeights * vec3(7.5, 2.2, 7.5)
      + vec3(11.3, -3.7, 5.6) + guideRevealElapsed * vec3(0.18, -0.10, 0.12)) - 0.5;
    float fineNoise = guideRevealNoise(positionInHeights * 24.0 + vec3(7.1, 4.2, 9.5)) - 0.5;
    float edgeDetail = smoothstep(0.015, 0.12, positionInHeights.y);
    return positionInHeights.y + edgeDetail * (broadNoise * 0.22 + fineNoise * 0.034);
  }

  float guideRevealFront() {
    float normalized = clamp(guideRevealProgress / guideRevealFull, 0.0, 1.0);
    float progress = mix(normalized, smoothstep(0.0, 1.0, normalized), 0.46);
    return mix(0.035, 1.18, progress);
  }
`;

const revealFragment = /* glsl */ `
  ${revealField}
  varying vec3 guideRevealPosition;

  float guideRevealCoverage() {
    if (guideRevealProgress <= 0.0) return 0.0;
    if (guideRevealProgress >= guideRevealFull) return 1.0;
    return smoothstep(-0.021, 0.021, guideRevealFront() - guideRevealContour(guideRevealPosition));
  }

  vec3 guideRevealSilk(vec3 surface, float coverage) {
    float band = 4.0 * coverage * (1.0 - coverage);
    float fold = 0.8 + 0.2 * sin(guideRevealPosition.x * 7.0 + guideRevealPosition.y * 11.0
      + guideRevealPosition.z * 4.0 - guideRevealElapsed * 1.6);
    return mix(surface, vec3(1.0, 0.90, 0.76), 0.19 * band * fold);
  }

  float guideRevealBodyFill() {
    return 0.18 * smoothstep(0.0, 0.12, guideRevealProgress);
  }
`;

/** Uses the entire prepared guide in its future parent space, including
 * deformed skinned vertices and any separate garment/accessory meshes. */
export function createMusicGuideSurfaceReveal(model: THREE.Object3D, root: THREE.Object3D, alphaToCoverage: boolean) {
  // A restored outfit may still carry the inverse skin binding from its last
  // world position. SkinnedMesh refreshes that binding in updateMatrixWorld.
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('music-guide-surface-reveal-bounds');

  const uniforms = {
    guideRevealWorldToRoot: { value: new THREE.Matrix4() },
    guideRevealHeight: { value: new THREE.Vector2(bounds.min.y, 1 / height) },
    guideRevealProgress: { value: 0 },
    guideRevealElapsed: { value: 0 },
  };
  const materials = new Map<THREE.Material, THREE.Material>();
  const bindings: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; masked: THREE.Material | THREE.Material[] }[] = [];

  function maskedMaterial(original: THREE.Material) {
    const existing = materials.get(original);
    if (existing) return existing;
    const material = original.clone();
    const keepAlpha = original.transparent || original.alphaHash || original.alphaToCoverage
      || original.blending !== THREE.NormalBlending;
    const useCoverage = alphaToCoverage && !original.transparent && !original.alphaHash;
    if (!original.transparent) {
      material.alphaToCoverage = useCoverage;
      material.alphaHash = !useCoverage;
    }
    const hardCutout = useCoverage && !original.alphaToCoverage && original.alphaTest > 0;
    material.customProgramCacheKey = () => `music-guide-surface-v004|${keepAlpha}|${hardCutout}`;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = revealVertex + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
        guideRevealPosition = (guideRevealWorldToRoot * modelMatrix * vec4(transformed, 1.0)).xyz;
        #include <project_vertex>
      `);
      shader.fragmentShader = revealFragment + shader.fragmentShader.replace('#include <alphahash_fragment>', /* glsl */ `
        float coverage = guideRevealCoverage();
        if (coverage <= 0.0) discard;
        diffuseColor.a ${keepAlpha ? '*=' : '='} coverage;
        #include <alphahash_fragment>
      `).replace('#include <opaque_fragment>', /* glsl */ `
        outgoingLight += diffuseColor.rgb * guideRevealBodyFill();
        outgoingLight = guideRevealSilk(outgoingLight, coverage);
        #include <opaque_fragment>
      `);
      if (hardCutout) shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', /* glsl */ `
        #ifdef USE_ALPHATEST
          if (diffuseColor.a < alphaTest) discard;
        #endif
      `);
    };
    materials.set(original, material);
    return material;
  }

  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material;
    const masked = Array.isArray(original) ? original.map(maskedMaterial) : maskedMaterial(original);
    bindings.push({ mesh: object, original, masked });
  });
  const orbit = createMusicGuideReveal(model, bounds);

  let disposed = false;
  function restore() {
    orbit.detach();
    for (const { mesh, original, masked } of bindings) if (mesh.material === masked) mesh.material = original;
  }
  return {
    apply() {
      if (disposed) return;
      for (const { mesh, masked } of bindings) mesh.material = masked;
      orbit.attach();
    },
    restore,
    update(progress: number, elapsed: number) {
      root.updateWorldMatrix(true, false);
      uniforms.guideRevealWorldToRoot.value.copy(root.matrixWorld).invert();
      uniforms.guideRevealProgress.value = THREE.MathUtils.clamp(progress, 0, 1);
      uniforms.guideRevealElapsed.value = elapsed;
      orbit.update(uniforms.guideRevealProgress.value, elapsed);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      restore();
      orbit.dispose();
      for (const material of materials.values()) material.dispose();
    },
  };
}
