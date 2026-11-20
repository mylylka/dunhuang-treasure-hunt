import * as THREE from 'three';
import type { OasisTone } from '../content/world/desert-oasis-layout-v013';

export const oasisToneIndex: Record<OasisTone, number> = { natural: 0, dry: 0, fresh: 1, olive: 2, gold: 3, bare: 0 };

// Strip only leaf triangles so that the winter branches also cast the correct shadow.
export function oasisBareBranches(original: THREE.BufferGeometry) {
  const geometry = original.clone();
  const colors = geometry.getAttribute('color');
  if (!colors) throw new Error('The approved bare poplar requires foliage vertex colours');
  const index: number[] = [];
  const source = geometry.index;
  const count = source ? source.count : colors.count;
  for (let face = 0; face < count; face += 3) {
    const a = source ? source.getX(face) : face;
    if (colors.getY(a) / Math.max(.001, colors.getX(a)) > .85) continue;
    index.push(a, source ? source.getX(face + 1) : face + 1, source ? source.getX(face + 2) : face + 2);
  }
  geometry.setIndex(index);
  return geometry;
}

// Colour variants share a draw for each model. The original trunk texture and
// albedo are preserved, including when the far texture contains a baked silhouette.
export function installOasisMaterial(material: THREE.MeshStandardMaterial, id: string, shoreVolume = false) {
  const court = id === '大树9';
  const grass = id === 'w01b' || id.startsWith('W01') || id === 'g02';
  const before = material.onBeforeCompile;
  material.onBeforeCompile = function(shader, renderer) {
    before.call(this, shader, renderer);
    shader.vertexShader = 'attribute float oasisTone;\nvarying float vOasisTone;\n'
      + shader.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
        vOasisTone = oasisTone;
        #ifdef USE_COLOR
          if (oasisTone > 2.5 && color.g / max(.001, color.r) > .85) {
            vColor.rgb = vec3(min(.85, color.r * 1.59), color.g * .92, color.b * .36);
          }
        #endif`);
    shader.fragmentShader = 'varying float vOasisTone;\n' + shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       if (vOasisTone > .5 && vOasisTone < 2.5) {
         float leaf = smoothstep(.74,.94,diffuseColor.g/max(.001,diffuseColor.r))
           * smoothstep(1.10,1.55,diffuseColor.g/max(.001,diffuseColor.b));
         vec3 gain = vOasisTone < 1.5 ? vec3(${grass ? '.33,.84,.53' : '.45,.88,.63'}) : vec3(.47,.68,.58);
         diffuseColor.rgb *= mix(vec3(1.),gain,leaf);
       }`);
    if (shoreVolume && grass) {
      // Thin green blades transmit a little warm light across the shaded side.
      // Gate the fill by actual shadowed direct irradiance; a blade lit by the
      // sun retains the source highlight even when viewed against dark reeds.
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        vec3 bladeAlbedo = material.diffuseColor;
        const vec3 luminanceWeight = vec3(.2126,.7152,.0722);
        float bladeLuma = dot(bladeAlbedo,luminanceWeight);
        float directRatio = dot(reflectedLight.directDiffuse,luminanceWeight) / max(.004,bladeLuma);
        float greenBlade = smoothstep(.96,1.25,bladeAlbedo.g / max(.002,bladeAlbedo.r));
        float shade = 1. - smoothstep(.04,.38,directRatio);
        reflectedLight.indirectDiffuse += bladeAlbedo * vec3(.24,.18,.12) * greenBlade * shade;`);
    }
    if (court) {
      shader.vertexShader = 'attribute vec2 treeExposure;\nvarying vec2 vTreeExposure;\n'
        + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTreeExposure=treeExposure;');
      shader.fragmentShader = 'varying vec2 vTreeExposure;\n' + shader.fragmentShader.replace('#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        float throughCrown=smoothstep(.08,.91,vTreeExposure.r);
        float skyAccess=smoothstep(.035,.96,vTreeExposure.g);
        reflectedLight.directDiffuse*=mix(.38,1.04,throughCrown);
        reflectedLight.directSpecular*=mix(.39,1.,throughCrown);
        reflectedLight.indirectDiffuse*=mix(vec3(.46,.485,.525),vec3(.94,.97,1.),skyAccess);
        reflectedLight.indirectSpecular*=mix(.44,.96,skyAccess);`);
    }
  };
  material.customProgramCacheKey = () => 'desert-oasis-v013-' + (court ? 'court' : grass ? (shoreVolume ? 'shore-grass' : 'grass') : 'foliage');
  material.needsUpdate = true;
}
