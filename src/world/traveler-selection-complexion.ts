import { MeshStandardMaterial, SkinnedMesh, type Object3D } from 'three';
import type { TravelerId } from '../content/world/assets';

// Coordinates measured on each GLB's neutral mesh, in fractions of body height.
// The models have opposite forward axes and different head proportions.
const faceRegions = {
  classic: { forward: -1, face: [0.748, 0.865, 0.109, 0.045], cheek: [0.051, 0.795], nose: 0.789, ear: [0.098, 0.810], lips: 0.767 },
  tripo: { forward: 1, face: [0.810, 0.920, 0.085, 0.060], cheek: [0.039, 0.850], nose: 0.845, ear: [0.070, 0.862], lips: 0.831 },
} satisfies Record<TravelerId, { forward: number; face: number[]; cheek: number[]; nose: number; ear: number[]; lips: number }>;

/** Correct the selector's independently loaded materials. The roaming model and its atlas stay as authored. */
export function applySelectionComplexion(root: Object3D, id: TravelerId): void {
  const regions = faceRegions[id];
  root.traverse(object => {
    if (!(object instanceof SkinnedMesh) || !(object.material instanceof MeshStandardMaterial) || !object.material.map) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox;
    if (!bounds || bounds.max.y <= bounds.min.y) return;
    const height = bounds.max.y - bounds.min.y;
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const material = object.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.skinOrigin = { value: [centerX, bounds.min.y, height, regions.forward] };
      shader.uniforms.skinArea = { value: regions.face };
      shader.uniforms.skinFeatures = { value: [...regions.cheek, regions.nose, regions.lips] };
      shader.uniforms.skinEar = { value: regions.ear };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec4 skinOrigin;\nvarying vec3 skinPoint;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          skinPoint = (position - vec3(skinOrigin.xy, 0.0)) / skinOrigin.z;
          skinPoint.z *= skinOrigin.w;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 skinPoint;
          uniform vec4 skinArea;
          uniform vec4 skinFeatures;
          uniform vec2 skinEar;
          float complexionFeature(vec2 point, vec2 center, vec2 width) {
            vec2 distanceFromCenter = (point - center) / width;
            return exp(-dot(distanceFromCenter, distanceFromCenter) * 1.5);
          }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          // Gate by both neutral mesh location and original atlas color.
          // This protects eyes, hair, collar and warm areas elsewhere on the atlas.
          vec3 albedo = diffuseColor.rgb;
          vec2 mirroredFace = vec2(abs(skinPoint.x), skinPoint.y);
          float face = smoothstep(skinArea.x - 0.012, skinArea.x, skinPoint.y)
            * (1.0 - smoothstep(skinArea.y, skinArea.y + 0.014, skinPoint.y))
            * (1.0 - smoothstep(skinArea.z, skinArea.z + 0.012, mirroredFace.x))
            * smoothstep(skinArea.w - 0.037, skinArea.w, skinPoint.z);
          float ear = complexionFeature(mirroredFace, skinEar, vec2(0.017, 0.018))
            * smoothstep(-0.034, 0.010, skinPoint.z);
          float mouth = complexionFeature(skinPoint.xy, vec2(0.0, skinFeatures.w), vec2(0.016, 0.007));
          float skin = smoothstep(0.28, 0.55, albedo.r)
            * smoothstep(0.045, 0.17, albedo.r - albedo.g)
            * smoothstep(0.001, 0.050, albedo.g - albedo.b);
          float cheek = complexionFeature(mirroredFace, skinFeatures.xy, vec2(0.024, 0.019));
          float nose = complexionFeature(skinPoint.xy, vec2(0.0, skinFeatures.z), vec2(0.013, 0.011));
          float flush = max(max(cheek * 0.82, nose * 0.72), mouth * 0.72);
          float complexion = skin * max(face, ear);
          vec3 warm = albedo * vec3(1.025, 0.982, 0.960) + vec3(0.007, 0.002, 0.003);
          warm += max(flush * face, ear * 0.65) * vec3(0.020, -0.016, -0.003);
          diffuseColor.rgb = mix(albedo, warm, complexion);`);
    };
    material.customProgramCacheKey = () => 'traveler-selection-complexion';
    material.needsUpdate = true;
  });
}
