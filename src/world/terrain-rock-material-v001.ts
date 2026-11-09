import * as THREE from 'three';

/** Same sandstone colour family used by the surrounding baked yardang assets. */
export const TERRAIN_SANDSTONE_PALETTE = {
  dark: '#84664a',
  light: '#bca17e',
  roughness: .94,
} as const;

const ROCK_HEADER = /* glsl */`
varying vec3 vTerrainRockWorld;
uniform vec3 uTerrainRockDark;
uniform vec3 uTerrainRockLight;
float terrainRockHash(vec2 p) {
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float terrainRockNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(terrainRockHash(i),terrainRockHash(i+vec2(1,0)),f.x),
             mix(terrainRockHash(i+vec2(0,1)),terrainRockHash(i+vec2(1,1)),f.x),f.y);
}
`;

const ROCK_COLOR = /* glsl */`
// Metre-scale fields are continuous across material slots and separate faces.
// Their intensity is deliberately small: real facets and the fixed sun supply
// the strong light/dark contrast, not painted black stripes or fake shadows.
vec3 rockP=vTerrainRockWorld;
float rockMass=terrainRockNoise(rockP.xz*.095+vec2(17.0,29.0));
float rockWarp=.30*(terrainRockNoise(rockP.xz*.055)-.5)
              +.10*(terrainRockNoise(rockP.xz*.16+11.0)-.5);
float rockStrata=terrainRockNoise(vec2(rockP.y*.68+rockWarp,23.7));
float rockFine=terrainRockNoise(vec2(rockP.y*2.3+rockWarp*.7,51.8));
float rockBlend=clamp(.50+(rockMass-.5)*.48+(rockStrata-.5)*.30+(rockFine-.5)*.07,.19,.81);
diffuseColor.rgb=mix(uTerrainRockDark,uTerrainRockLight,rockBlend);
`;

/**
 * Match only the existing third-hall mountain to the surrounding sandstone.
 * Call before the environment shadow module prepares its material hooks.
 * Original GLB materials, UVs, geometry and texture ownership remain intact.
 */
export function applyTerrainSandstoneMaterial(root: THREE.Object3D) {
  const replacements = new Map<THREE.MeshStandardMaterial, THREE.MeshStandardMaterial>();
  const bindings: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[] = [];
  const geometryRevisions = new Set<string>();
  const dark = new THREE.Color(TERRAIN_SANDSTONE_PALETTE.dark);
  const light = new THREE.Color(TERRAIN_SANDSTONE_PALETTE.light);
  let disposed = false;

  function replace(material: THREE.Material): THREE.Material {
    if (!(material instanceof THREE.MeshStandardMaterial)
      || !/^(sandstone-baked-|sand-foot$)/.test(material.name)) return material;
    const cached = replacements.get(material);
    if (cached) return cached;
    const matched = material.clone();
    matched.name = `terrain-matched-${material.name}`;
    matched.color.set(0xffffff);
    matched.map = null;
    matched.roughnessMap = null;
    matched.metalnessMap = null;
    matched.roughness = TERRAIN_SANDSTONE_PALETTE.roughness;
    matched.metalness = 0;
    matched.aoMapIntensity = .35;
    // Keep the correctly mapped old erosion normals, with gentler amplitude
    // than the orange-rock candidate. Shared textures are never disposed here.
    matched.normalScale.multiplyScalar(.42);
    matched.onBeforeCompile = shader => {
      shader.uniforms.uTerrainRockDark = { value: dark };
      shader.uniforms.uTerrainRockLight = { value: light };
      shader.vertexShader = 'varying vec3 vTerrainRockWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvTerrainRockWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader = ROCK_HEADER + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n' + ROCK_COLOR);
    };
    matched.customProgramCacheKey = () => 'terrain-matched-sandstone-v001';
    matched.userData.terrainSandstone = true;
    replacements.set(material, matched);
    return matched;
  }

  root.traverse(object => {
    if (typeof object.userData.geometryRevision === 'string') geometryRevisions.add(object.userData.geometryRevision);
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material as THREE.Material | THREE.Material[];
    const next = Array.isArray(original) ? original.map(replace) : replace(original);
    const changed = Array.isArray(original)
      ? (next as THREE.Material[]).some((material, index) => material !== original[index])
      : next !== original;
    if (changed) { bindings.push({ mesh: object, original }); object.material = next; }
  });

  return {
    inspect: () => ({
      version: 'v001', matchedMeshes: bindings.length, matchedMaterials: replacements.size,
      palette: { ...TERRAIN_SANDSTONE_PALETTE }, unchangedGeometry: true,
      geometryRevisions: [...geometryRevisions],
      bakedLighting: false, disposed,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh, original } of bindings) mesh.material = original;
      for (const material of replacements.values()) material.dispose();
    },
  };
}
