import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {
  LAKE_SHORELINE,
  LAKE_WATER_LEVEL,
  lakeSignedDistance,
  terrainHeight,
} from './terrain-rules-v001';

export interface TerrainWaterOptions {
  /** World-space direction from the scene toward the sun. */
  sunDirection?: THREE.Vector3;
  reflectionSize?: number;
}

export interface TerrainWater {
  object: THREE.Object3D;
  update(dt: number, reduced: boolean): void;
  dispose(): void;
}

const NORMAL_SIZE = 256;
const DEPTH_SIZE = 256;

/** The accepted water-study normal field, in metres rather than lake UVs. */
function createWaterNormals(): THREE.DataTexture {
  const data = new Uint8Array(NORMAL_SIZE * NORMAL_SIZE * 4);
  const waves = [
    [3, 2, .12, 0],
    [5, -3, .065, 1.4],
    [11, 4, .024, 2.3],
    [15, -8, .012, 4.3],
    [23, 19, .006, 3.2],
  ];
  for (let y = 0; y < NORMAL_SIZE; y++) {
    for (let x = 0; x < NORMAL_SIZE; x++) {
      let dx = 0;
      let dz = 0;
      for (const [kx, kz, amplitude, phase] of waves) {
        const angle = (kx * x + kz * y) / NORMAL_SIZE * Math.PI * 2 + phase;
        dx += Math.cos(angle) * amplitude * kx * .1;
        dz += Math.cos(angle) * amplitude * kz * .1;
      }
      const length = Math.hypot(dx, dz, 1);
      const offset = (y * NORMAL_SIZE + x) * 4;
      data[offset] = (-dx / length * .5 + .5) * 255;
      data[offset + 1] = (-dz / length * .5 + .5) * 255;
      data[offset + 2] = (1 / length * .5 + .5) * 255;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, NORMAL_SIZE, NORMAL_SIZE);
  texture.name = 'terrain-water-calm-normals-v001';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Match the actual carved lake bed, including its shallow shoreline blend. */
function createLakeDepths() {
  const bounds = new THREE.Box2();
  for (const point of LAKE_SHORELINE) bounds.expandByPoint(new THREE.Vector2(point.x, point.z));
  bounds.expandByScalar(2);
  const size = bounds.getSize(new THREE.Vector2());
  const samples = new Float32Array(DEPTH_SIZE * DEPTH_SIZE);
  let maxDepth = .01;
  for (let y = 0; y < DEPTH_SIZE; y++) {
    for (let x = 0; x < DEPTH_SIZE; x++) {
      const worldX = bounds.min.x + x / (DEPTH_SIZE - 1) * size.x;
      const worldZ = bounds.min.y + y / (DEPTH_SIZE - 1) * size.y;
      const depth = lakeSignedDistance(worldX, worldZ) < 0
        ? Math.max(0, LAKE_WATER_LEVEL - terrainHeight(worldX, worldZ))
        : 0;
      samples[y * DEPTH_SIZE + x] = depth;
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  const bytes = new Uint8Array(DEPTH_SIZE * DEPTH_SIZE * 4);
  for (let index = 0; index < samples.length; index++) {
    const depth = Math.round(samples[index] / maxDepth * 255);
    bytes[index * 4] = bytes[index * 4 + 1] = bytes[index * 4 + 2] = depth;
    bytes[index * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, DEPTH_SIZE, DEPTH_SIZE);
  texture.name = 'terrain-water-lake-bed-depth-v001';
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, bounds, size, maxDepth };
}

const vertexShader = /* glsl */`
  uniform mat4 textureMatrix;
  varying vec4 mirrorCoord;
  varying vec4 worldPosition;
  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  void main() {
    worldPosition = modelMatrix * vec4(position, 1.0);
    // Reflector's matrix already includes modelMatrix (unlike Water's matrix).
    mirrorCoord = textureMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D tDiffuse, normalSampler, depthSampler;
  uniform float time, wind, maxDepth, reflectionWeight;
  uniform vec2 depthOrigin, depthExtent;
  uniform vec3 sunDirection, sunColor, distantSky;
  varying vec4 mirrorCoord;
  varying vec4 worldPosition;
  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec2 p = worldPosition.xz;
    float depth = texture2D(depthSampler, (p - depthOrigin) / depthExtent).r * maxDepth;
    vec2 n1 = texture2D(normalSampler, p / 12.0 + time * vec2(.0021, .0013)).rg * 2.0 - 1.0;
    vec2 n2 = texture2D(normalSampler, mat2(.82, -.57, .57, .82) * p / 4.7 + time * vec2(-.0014, .0018)).rg * 2.0 - 1.0;
    vec2 n3 = texture2D(normalSampler, mat2(.36, .93, -.93, .36) * p / 2.2 + time * vec2(.001, -.0017)).rg * 2.0 - 1.0;
    vec2 slopes = (n1 * .7 + n2 * .38 + n3 * .17) * (.42 + wind * .72);
    vec3 N = normalize(vec3(slopes.x, 1.0, slopes.y));
    vec3 V = normalize(cameraPosition - worldPosition.xyz);
    float grazing = 1.0 - max(dot(N, V), 0.0);
    float fresnel = .025 + .975 * pow(grazing, 5.0);
    vec2 reflectedUv = mirrorCoord.xy / mirrorCoord.w + slopes * .052;
    // The reflection target is linear; decode neither its RGB nor the depth map.
    vec3 reflected = mix(distantSky, texture2D(tDiffuse, reflectedUv).rgb, reflectionWeight);
    vec3 transmittance = exp(-vec3(.95, .44, .29) * depth);
    vec3 sandBed = vec3(.40, .27, .14) * (1.0 + .035 * sin(p.x * 3.1 + p.y * 2.4));
    vec3 deepWater = vec3(.006, .085, .125);
    vec3 below = sandBed * transmittance + deepWater * (1.0 - transmittance);
    float sunAngle = max(dot(reflect(-sunDirection, N), V), 0.0);
    float glitter = pow(sunAngle, 180.0);
    float softLight = pow(sunAngle, 18.0);
    float rippleLight = (n1.x + n2.y * .6 + n3.x * .25) * (.18 + wind * .18);
    vec3 color = mix(below, reflected, clamp(.105 + fresnel * .895, 0.0, 1.0));
    color *= 1.0 + rippleLight;
    color += sunColor * (glitter * .42 + softLight * .035);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** A single continuous, reflective lake using the shared terrain shoreline. */
export function createTerrainWater(options: TerrainWaterOptions = {}): TerrainWater {
  const normals = createWaterNormals();
  const depths = createLakeDepths();
  const shape = new THREE.Shape();
  LAKE_SHORELINE.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, -point.z);
    else shape.lineTo(point.x, -point.z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const reflectionSize = THREE.MathUtils.clamp(Math.round(options.reflectionSize ?? (mobile ? 512 : 768)), 256, 1024);
  const direction = (options.sunDirection ?? new THREE.Vector3(-38, 32, -45)).clone().normalize();
  const water = new Reflector(geometry, {
    textureWidth: reflectionSize,
    textureHeight: reflectionSize,
    multisample: 0,
    clipBias: .002,
    shader: {
      name: 'DunhuangTerrainCalmWaterV001',
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          tDiffuse: { value: null },
          color: { value: new THREE.Color() },
          textureMatrix: { value: new THREE.Matrix4() },
          normalSampler: { value: null },
          depthSampler: { value: null },
          depthOrigin: { value: depths.bounds.min },
          depthExtent: { value: depths.size },
          maxDepth: { value: depths.maxDepth },
          time: { value: 0 },
          wind: { value: .22 },
          reflectionWeight: { value: 1 },
          distantSky: { value: new THREE.Color('#7bb9df') },
          sunDirection: { value: direction },
          sunColor: { value: new THREE.Color('#fff1cf') },
        },
      ]),
      vertexShader,
      fragmentShader,
    },
  });
  const material = water.material as THREE.ShaderMaterial;
  material.fog = true;
  material.uniforms.normalSampler.value = normals;
  material.uniforms.depthSampler.value = depths.texture;
  water.getRenderTarget().texture.colorSpace = THREE.LinearSRGBColorSpace;
  water.name = 'terrain-calm-crescent-water-v001';
  water.rotation.x = -Math.PI / 2;
  water.position.y = LAKE_WATER_LEVEL;
  water.userData = {
    reflectionSize,
    waterLevel: LAKE_WATER_LEVEL,
    depthMapSize: DEPTH_SIZE,
    maxDepth: depths.maxDepth,
    reflectionUpdates: 0,
    reflectionSkipped: 0,
  };
  geometry.computeBoundingSphere();
  const worldSphere = new THREE.Sphere();
  const cameraPosition = new THREE.Vector3();
  const renderReflection = water.onBeforeRender;
  let reflectionInitialized = false;
  water.onBeforeRender = (renderer, scene, camera, renderGeometry, renderMaterial, group) => {
    worldSphere.copy(geometry.boundingSphere!).applyMatrix4(water.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    const distance = cameraPosition.distanceTo(worldSphere.center);
    const isOverview = cameraPosition.y - LAKE_WATER_LEVEL >= 90;
    material.uniforms.reflectionWeight.value = isOverview ? 1 : 1 - THREE.MathUtils.smoothstep(distance, 190, 220);
    if (scene.background instanceof THREE.Color) material.uniforms.distantSky.value.copy(scene.background);
    // The ridge can hide the lake without excluding it from the camera frustum.
    // Far ground views need no second render of the entire architectural scene.
    if (reflectionInitialized && !isOverview && distance > 220) {
      water.userData.reflectionSkipped++;
      return;
    }
    renderReflection.call(water, renderer, scene, camera, renderGeometry, renderMaterial, group);
    reflectionInitialized = true;
    water.userData.reflectionUpdates++;
  };
  let disposed = false;
  return {
    object: water,
    update(dt, reduced) {
      if (disposed || reduced || !Number.isFinite(dt)) return;
      material.uniforms.time.value += THREE.MathUtils.clamp(dt, 0, .05);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      water.removeFromParent();
      water.onBeforeRender = () => {};
      geometry.dispose();
      normals.dispose();
      depths.texture.dispose();
      // Reflector exposes disposal of its render target, unlike the Water helper.
      water.dispose();
    },
  };
}
