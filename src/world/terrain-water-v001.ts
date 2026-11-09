import * as THREE from 'three';
import {
  LAKE_SHORELINE,
  LAKE_WATER_LEVEL,
  terrainHeight,
} from './terrain-rules-v001';

export interface TerrainWaterOptions {
  /** World-space direction from the scene toward the sun. */
  sunDirection?: THREE.Vector3;
}

export interface TerrainWater {
  object: THREE.Object3D;
  dispose(): void;
}

const DEPTH_SIZE = 256;

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
      const depth = Math.max(0, LAKE_WATER_LEVEL - terrainHeight(worldX, worldZ));
      samples[y * DEPTH_SIZE + x] = depth;
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  const bytes = new Uint8Array(samples.length);
  for (let index = 0; index < samples.length; index++) {
    bytes[index] = Math.round(samples[index] / maxDepth * 255);
  }
  const texture = new THREE.DataTexture(bytes, DEPTH_SIZE, DEPTH_SIZE, THREE.RedFormat);
  texture.name = 'terrain-water-lake-bed-depth-v001';
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, bounds, size, maxDepth };
}

const vertexShader = /* glsl */`
  varying vec3 worldPosition;
  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  void main() {
    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D depthSampler;
  uniform float maxDepth;
  uniform vec2 depthOrigin, depthExtent;
  uniform vec3 sunDirection, skyTint;
  varying vec3 worldPosition;
  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec2 p = worldPosition.xz;
    float depth = texture2D(depthSampler, (p - depthOrigin) / depthExtent).r * maxDepth;
    vec3 view = normalize(cameraPosition - worldPosition);
    float grazing = 1.0 - clamp(view.y, 0.0, 1.0);
    float skyAmount = mix(.12, .67, pow(grazing, 5.0));
    vec3 transmittance = exp(-vec3(.95, .44, .29) * depth);
    vec3 sandBed = vec3(.40, .27, .14) * (1.0 + .035 * sin(p.x * 3.1 + p.y * 2.4));
    vec3 deepWater = vec3(.006, .085, .125);
    vec3 below = sandBed * transmittance + deepWater * (1.0 - transmittance);
    float sunAngle = max(dot(reflect(-sunDirection, vec3(0.0, 1.0, 0.0)), view), 0.0);
    vec3 color = mix(below, skyTint, skyAmount) + vec3(.075, .063, .039) * pow(sunAngle, 24.0);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Still water uses the carved lake depth and a sky tint in the main scene pass. */
export function createTerrainWater(options: TerrainWaterOptions = {}): TerrainWater {
  const depths = createLakeDepths();
  const shape = new THREE.Shape();
  LAKE_SHORELINE.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, -point.z);
    else shape.lineTo(point.x, -point.z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const direction = (options.sunDirection ?? new THREE.Vector3(-38, 32, -45)).clone().normalize();
  const uniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
  const material = new THREE.ShaderMaterial({
    name: 'DunhuangTerrainStillWater',
    fog: true,
    uniforms: {
      ...uniforms,
      depthSampler: { value: depths.texture },
      depthOrigin: { value: depths.bounds.min },
      depthExtent: { value: depths.size },
      maxDepth: { value: depths.maxDepth },
      skyTint: { value: new THREE.Color('#7bb9df') },
      sunDirection: { value: direction },
    },
    vertexShader,
    fragmentShader,
  });
  const water = new THREE.Mesh(geometry, material);
  water.name = 'terrain-calm-crescent-water-v001';
  water.rotation.x = -Math.PI / 2;
  water.position.y = LAKE_WATER_LEVEL;
  water.userData = {
    mode: 'still',
    waterLevel: LAKE_WATER_LEVEL,
    depthMapSize: DEPTH_SIZE,
    maxDepth: depths.maxDepth,
    reflectionUpdates: 0,
  };
  let disposed = false;
  return {
    object: water,
    dispose() {
      if (disposed) return;
      disposed = true;
      water.removeFromParent();
      geometry.dispose();
      depths.texture.dispose();
      material.dispose();
    },
  };
}
