import * as THREE from 'three';
import config from '../content/world/music-interior-decoration-v004.json';
import { createMusicInteriorDaylight } from './music-interior-daylight';

const KEY = 'music-interior-diffuse-v004';
const LANTERN_COUNT = config.lights.length, VOLUME_COUNT = config.ambient.volumes.length;
interface SourcePosition { readonly x: number; readonly y: number; readonly z: number }
const finitePosition = (p: SourcePosition) => [p.x, p.y, p.z].every(Number.isFinite);

/** Closed wall/floor/ceiling intersections stay fully lit. Only the tiny outer
 * tolerance belongs to the spatial shell; viewer adaptation owns the entry fade.
 */
export function musicInteriorVolumeWeight(p: SourcePosition): number {
  if (!finitePosition(p)) return 0;
  return Math.max(...config.ambient.volumes.map(({ min, max }) => {
    const outside = Math.max(0, min[0]-p.x, p.x-max[0], min[1]-p.y, p.y-max[1], min[2]-p.z, p.z-max[2]);
    return 1 - THREE.MathUtils.smoothstep(outside, 0, config.ambient.outerToleranceMetres);
  }));
}

/** Player feet in source coordinates, not the camera or a wall sample. The front
 * left porch is outside the door. The right room and the connected upper floor
 * are interior despite sharing some of its Z range.
 */
export function musicInteriorAdaptationTarget(p: SourcePosition): number {
  const settings = config.adaptation, door = settings.doorway, room = config.ambient.volumes[0];
  if (!finitePosition(p) || p.y < settings.minimumPlayerY) return 0;
  const inside = config.ambient.volumes.some(({ min, max }) => p.x >= min[0] && p.x <= max[0]
    && p.y >= min[1] && p.y <= max[1] && p.z >= min[2] && p.z <= max[2]);
  if (!inside) return 0;
  if (p.y >= settings.upperFloorY) return 1;
  if (p.x >= settings.rightRoom.minX && p.z <= settings.rightRoom.frontZ) return 1;
  const inRearRoom = p.x >= room.min[0] && p.x <= room.max[0] && p.z <= door.roomFrontZ;
  const inDoorApproach = p.x >= door.minX && p.x <= door.maxX && p.z >= door.roomFrontZ && p.z <= door.outsideZ;
  return inRearRoom || inDoorApproach
    ? THREE.MathUtils.smoothstep(door.outsideZ-p.z, 0, door.outsideZ-door.insideZ) : 0;
}

const HEADER = /* glsl */`
varying vec3 vMusicInteriorWorldPosition;
uniform mat4 uMusicInteriorFromWorld;
uniform vec3 uMusicInteriorAmbient;
uniform vec3 uMusicInteriorMin[${VOLUME_COUNT}];
uniform vec3 uMusicInteriorMax[${VOLUME_COUNT}];
uniform float uMusicInteriorTolerance;
uniform float uMusicInteriorNormalVariation;
uniform float uMusicInteriorGain;
uniform vec3 uMusicLanternPositions[${LANTERN_COUNT}];
uniform float uMusicLanternRadii[${LANTERN_COUNT}];
uniform vec3 uMusicDaylightDirection;
uniform bool uMusicDaylightEnabled;

float musicInteriorBoxWeight(vec3 p, vec3 lo, vec3 hi) {
  vec3 outside = max(max(lo - p, p - hi), vec3(0.0));
  return 1.0 - smoothstep(0.0, uMusicInteriorTolerance, max(max(outside.x, outside.y), outside.z));
}
float musicInteriorWeight() {
  vec3 p = (uMusicInteriorFromWorld * vec4(vMusicInteriorWorldPosition, 1.0)).xyz;
  float weight = 0.0;
  for (int volume = 0; volume < ${VOLUME_COUNT}; volume++) {
    weight = max(weight, musicInteriorBoxWeight(p, uMusicInteriorMin[volume], uMusicInteriorMax[volume]));
  }
  return weight;
}
float musicDaylightWeight() {
  vec3 p = (uMusicInteriorFromWorld * vec4(vMusicInteriorWorldPosition, 1.0)).xyz;
  // The open balcony lights the rear display, but stops at the stairwell.
  float towardMuralLanding = smoothstep(-28.4, -23.2, p.z);
  float eastEdge = 1.0 - smoothstep(mix(44.5, 43.9, towardMuralLanding),
    mix(46.5, 45.7, towardMuralLanding), p.x);
  float upper = step(7.90, p.y) * (1.0 - smoothstep(13.54, 13.58, p.y))
    * step(34.46, p.x) * eastEdge
    * step(-32.19, p.z) * (1.0 - smoothstep(-17.66, -17.60, p.z))
    * mix(0.82, 1.0, smoothstep(-32.175, -21.95, p.z));
  // The opening on the first floor is narrower. The key fades before the
  // interior stair and its three walls of paintings.
  float lower = step(1.78, p.y) * (1.0 - smoothstep(7.30, 7.43, p.y))
    * smoothstep(34.74, 37.0, p.x) * (1.0 - smoothstep(43.2, 46.6, p.x))
    * smoothstep(-30.8, -22.6, p.z) * (1.0 - smoothstep(-20.4, -18.9, p.z));
  return max(upper, lower);
}
// Only the configured owned lanterns are scoped/softened. Other lights keep their
// original attenuation. A finite emitter avoids a hot wall at a bracket .27m away.
float musicLanternWeight(vec3 viewPosition, vec3 surfacePosition, float decay) {
  vec3 worldPosition = ((vec4(viewPosition, 1.0) - viewMatrix[3]) * viewMatrix).xyz;
  float weight = 1.0;
  for (int m = 0; m < ${LANTERN_COUNT}; m++) {
    vec3 offset = worldPosition - uMusicLanternPositions[m];
    if (dot(offset, offset) < 0.0001) {
      float distanceSquared = dot(viewPosition - surfacePosition, viewPosition - surfacePosition);
      float sourceSquared = uMusicLanternRadii[m] * uMusicLanternRadii[m];
      // Three's point light uses max(pow(distance, decay), .01).
      weight = musicInteriorWeight() * uMusicInteriorGain * max(pow(sqrt(distanceSquared), decay), 0.01)
        / pow(sqrt(distanceSquared + sourceSquared), decay);
    }
  }
  return weight;
}
`;

/** Adds diffuse irradiance before the material BRDF/AO/tone mapping. It does not
 * recolor albedo, lift emissive, change exposure, or overwrite sunlight shadows.
 * Uses deformed vertices, including both skinned travelers and instanced meshes.
 */
export function musicInteriorLightingShaderSource(vertex: string, fragment: string) {
  const vertexAnchor = '#include <project_vertex>', diffuseAnchor = '#include <lights_fragment_maps>';
  if (!vertex.includes(vertexAnchor) || !fragment.includes(diffuseAnchor)) throw new Error('music-interior-lighting-shader-anchor-missing');
  const pointAnchor = 'light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );';
  let lighting = fragment;
  // Keep lights_fragment_begin intact: the outer static-sun module owns that
  // anchor. Gate only the point-light function, preserving directional shadows.
  if (lighting.includes('#include <lights_pars_begin>')) {
    lighting = lighting.replace('#include <lights_pars_begin>', THREE.ShaderChunk.lights_pars_begin);
  }
  if (!lighting.includes(pointAnchor)) throw new Error('music-interior-point-light-shader-anchor-missing');
  lighting = lighting.replace(pointAnchor, `${pointAnchor}
    light.color *= musicLanternWeight(pointLight.position, geometryPosition, pointLight.decay);`);
  const directionalAnchor = 'light.direction = directionalLight.direction;\n\t\tlight.visible = true;';
  if (!lighting.includes(directionalAnchor)) throw new Error('music-interior-directional-light-shader-anchor-missing');
  lighting = lighting.replace(directionalAnchor, `${directionalAnchor}
    if (uMusicDaylightEnabled) {
      if (dot(directionalLight.direction, transformDirection(uMusicDaylightDirection, viewMatrix)) > 0.99999) {
        float daylight = musicDaylightWeight();
        light.color *= daylight;
        light.visible = daylight > 0.0001;
      } else {
        light.color *= mix(1.0, 0.10, musicInteriorWeight());
      }
    }`);
  return {
    vertex: 'varying vec3 vMusicInteriorWorldPosition;\n' + vertex.replace(vertexAnchor, `${vertexAnchor}
      vec4 musicPosition = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        musicPosition = batchingMatrix * musicPosition;
      #endif
      #ifdef USE_INSTANCING
        musicPosition = instanceMatrix * musicPosition;
      #endif
      vMusicInteriorWorldPosition = (modelMatrix * musicPosition).xyz;`),
    fragment: HEADER + lighting.replace(diffuseAnchor, `${diffuseAnchor}
      #if defined(RE_IndirectDiffuse)
        vec3 musicWorldNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
        float musicFacing = 1.0 - uMusicInteriorNormalVariation + uMusicInteriorNormalVariation * musicWorldNormal.y;
        float musicFill = uMusicDaylightEnabled ? mix(1.0, 0.74, musicDaylightWeight()) : 1.0;
        irradiance += uMusicInteriorAmbient * musicInteriorWeight() * uMusicInteriorGain * musicFacing * musicFill;
      #endif`),
  };
}

/** Install after all models/avatars and the terrain transform, before the static
 * environment-shadow hook. All scene PBR receivers are registered so owned point
 * lights cannot leak onto an unregistered exterior. The volume is fixed in world
 * space: characters walk through it continuously, independent of camera position.
 * Dispose the outer environment hook first, then this hook.
 */
export function createMusicInteriorLighting(scene: THREE.Object3D, musicRoot: THREE.Object3D,
  daylightOptions?: { avatars: readonly THREE.Object3D[]; mobile: boolean }) {
  scene.updateWorldMatrix(true, true);
  const lanterns: THREE.PointLight[] = [];
  musicRoot.traverse(object => {
    if (object instanceof THREE.PointLight && object.userData.musicInteriorLantern) lanterns.push(object);
  });
  const definitions = config.lights.filter(lamp => !daylightOptions || lamp.id !== 'upper-rear');
  if (lanterns.length !== definitions.length) throw new Error('music-interior-lantern-count-mismatch');
  const positions = config.lights.map(definition => {
    const lamp = lanterns.find(light => light.userData.musicInteriorLanternId === definition.id);
    return lamp ? lamp.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(1e5, 1e5, 1e5);
  });
  const daylight = daylightOptions && createMusicInteriorDaylight(scene, musicRoot, daylightOptions.avatars, daylightOptions.mobile);
  const uniforms = {
    uMusicInteriorFromWorld: { value: musicRoot.matrixWorld.clone().invert() },
    uMusicInteriorAmbient: { value: new THREE.Color(config.ambient.color).multiplyScalar(config.ambient.intensity) },
    uMusicInteriorMin: { value: config.ambient.volumes.map(volume => new THREE.Vector3(...volume.min as [number, number, number])) },
    uMusicInteriorMax: { value: config.ambient.volumes.map(volume => new THREE.Vector3(...volume.max as [number, number, number])) },
    uMusicInteriorTolerance: { value: config.ambient.outerToleranceMetres },
    uMusicInteriorNormalVariation: { value: config.ambient.normalVariation },
    uMusicInteriorGain: { value: config.adaptation.outsideGain },
    uMusicLanternPositions: { value: positions },
    uMusicLanternRadii: { value: config.lights.map(lamp => lamp.sourceRadius) },
    uMusicDaylightDirection: { value: daylight?.direction ?? new THREE.Vector3() },
    uMusicDaylightEnabled: { value: !!daylight },
  };
  const hooks = new Map<THREE.MeshStandardMaterial, {
    before: THREE.Material['onBeforeCompile']; key: THREE.Material['customProgramCacheKey'];
    installed: THREE.Material['onBeforeCompile'];
  }>();
  function includeMaterial(material: THREE.MeshStandardMaterial) {
    if (hooks.has(material)) return;
    const before = material.onBeforeCompile, key = material.customProgramCacheKey, previousKey = key.call(material);
    const installed: THREE.Material['onBeforeCompile'] = function(this: THREE.Material, shader, renderer) {
      before.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      const source = musicInteriorLightingShaderSource(shader.vertexShader, shader.fragmentShader);
      shader.vertexShader = source.vertex; shader.fragmentShader = source.fragment;
    };
    material.onBeforeCompile = installed;
    material.customProgramCacheKey = () => `${previousKey}|${KEY}`;
    material.needsUpdate = true;
    hooks.set(material, { before, key, installed });
  }
  function include(root: THREE.Object3D) {
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial) includeMaterial(material);
      }
    });
  }
  include(scene);
  let target = 0, blend = 0, sourcePlayer: number[] | null = null;
  const source = new THREE.Vector3();
  let disposed = false;
  return {
    include,
    exclude(root: THREE.Object3D) {
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(material instanceof THREE.MeshStandardMaterial)) continue;
          const hook = hooks.get(material);
          if (hook && material.onBeforeCompile === hook.installed) {
            material.onBeforeCompile = hook.before; material.customProgramCacheKey = hook.key;
          }
          hooks.delete(material);
        }
      });
    },
    refreshAvatar(root: THREE.Object3D) { daylight?.refreshAvatar(root); },
    includeExhibit(root: THREE.Object3D) {
      include(root);
      daylight?.includeExhibit(root);
    },
    update(playerWorld: THREE.Vector3, dt: number, immediate = false) {
      if (disposed || !finitePosition(playerWorld)) return;
      source.copy(playerWorld).applyMatrix4(uniforms.uMusicInteriorFromWorld.value);
      sourcePlayer = source.toArray(); target = musicInteriorAdaptationTarget(source);
      const alpha = immediate ? 1 : Number.isFinite(dt) && dt > 0 ? 1-Math.exp(-dt/config.adaptation.responseSeconds) : 0;
      blend = THREE.MathUtils.lerp(blend, target, alpha);
      uniforms.uMusicInteriorGain.value = THREE.MathUtils.lerp(config.adaptation.outsideGain, config.adaptation.insideGain, blend);
      daylight?.update();
    },
    inspect: () => ({ version: KEY, materials: hooks.size, disposed,
      ambient: { ...config.ambient }, lanterns: lanterns.length, extraShadowMaps: daylight ? 1 : 0,
      daylight: daylight?.inspect(),
      adaptation: { target, blend, gain: uniforms.uMusicInteriorGain.value, sourcePlayer,
        responseSeconds: config.adaptation.responseSeconds, outsideGain: config.adaptation.outsideGain, insideGain: config.adaptation.insideGain },
      sourceToWorld: musicRoot.matrixWorld.toArray() }),
    dispose() {
      if (disposed) return; disposed = true;
      daylight?.dispose();
      for (const [material, { before, key, installed }] of hooks) if (material.onBeforeCompile === installed) {
        material.onBeforeCompile = before; material.customProgramCacheKey = key; material.needsUpdate = true;
      }
    },
  };
}
