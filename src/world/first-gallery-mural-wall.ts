import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';
import { FIRST_GALLERY_MURAL_REGIONS, FIRST_GALLERY_MURAL_SIZE, type FirstGalleryMuralRegion } from '../content/world/first-gallery-mural-regions';
import type { FirstGalleryMuralPart } from '../services/first-gallery';
import { muralLightTiming } from './first-gallery-mural-light';

const [width, height] = FIRST_GALLERY_MURAL_SIZE;
const wallWidth = 12.5, wallHeight = 4.1666667;
const parts = ['lotus', 'bird', 'grapes'] as const;
const ease = THREE.MathUtils.smoothstep;

function loadImage(path: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const abort = () => { image.src = ''; reject(new Error('Gallery image cancelled')); };
    image.onload = () => { signal.removeEventListener('abort', abort); resolve(image); };
    image.onerror = () => { signal.removeEventListener('abort', abort); reject(new Error('第一馆图像未能加载，请重试。')); };
    signal.addEventListener('abort', abort, { once: true });
    image.src = worldAssetUrl(path);
  });
}

function croppedImage(source: HTMLImageElement, mask: HTMLImageElement, [x, y, right, bottom]: FirstGalleryMuralRegion['crop'], trace: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = right - x;
  canvas.height = bottom - y;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  ctx.drawImage(mask, x, y, w, h, 0, 0, w, h);
  const alpha = ctx.getImageData(0, 0, w, h);
  if (!trace) ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
  const image = trace ? alpha : ctx.getImageData(0, 0, w, h);
  for (let index = 0; index < alpha.data.length; index += 4) {
    const opacity = alpha.data[index];
    image.data[index + 3] = opacity;
    if (trace) {
      image.data[index] = 237;
      image.data[index + 1] = 193;
      image.data[index + 2] = 123;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Masks are decoded once. During the show only small shader uniforms change. */
export function createMuralWall(wall: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>, canvas: HTMLCanvasElement, map: THREE.CanvasTexture) {
  const ctx = canvas.getContext('2d')!;
  const abort = new AbortController();
  const resources: { dispose(): void }[] = [];
  const layers = new Map<FirstGalleryMuralPart, { region: FirstGalleryMuralRegion; pixels: HTMLCanvasElement; color: ReturnType<typeof layer>; trace: ReturnType<typeof layer> }[]>();
  let full: HTMLImageElement | null = null, worn: HTMLImageElement | null = null;
  let saved: readonly FirstGalleryMuralPart[] = [], whole = false;
  let showing: FirstGalleryMuralPart | null = null, renewing = false;
  let completeLayer: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null = null;

  function layer(image: HTMLCanvasElement, region: FirstGalleryMuralRegion, isTrace: boolean) {
    const [x, y, right, bottom] = region.crop;
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry((right - x) / width * wallWidth, (bottom - y) / height * wallHeight);
    const material = isTrace ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) : wall.material.clone();
    material.map = texture;
    if (material instanceof THREE.MeshStandardMaterial) material.emissiveMap = texture;
    material.transparent = true;
    material.depthWrite = false;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -3;
    const progress = { value: 0 };
    const origin = { value: new THREE.Vector2((region.anchor[0] - x) / (right - x), 1 - (region.anchor[1] - y) / (bottom - y)) };
    material.onBeforeCompile = shader => {
      shader.uniforms.muralProgress = progress;
      shader.uniforms.muralOrigin = origin;
      shader.vertexShader = `varying vec2 muralUv;\n${shader.vertexShader}`.replace('#include <uv_vertex>', '#include <uv_vertex>\nmuralUv = uv;');
      shader.fragmentShader = `uniform float muralProgress;\nuniform vec2 muralOrigin;\nvarying vec2 muralUv;\n${shader.fragmentShader}`.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        float grain = sin(muralUv.x * 139.0 + muralUv.y * 163.0) * sin(muralUv.x * 93.0 - muralUv.y * 141.0) * 0.026;
        float radius = length((muralUv - muralOrigin) * vec2(1.0, 0.9)) + grain;
        diffuseColor.a *= smoothstep(radius - 0.09, radius + 0.065, mix(-0.12, 1.6, muralProgress));`);
    };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(((x + right) / 2 / width - .5) * wallWidth, (.5 - (y + bottom) / 2 / height) * wallHeight, isTrace ? .009 : .005);
    mesh.visible = false;
    mesh.receiveShadow = !isTrace;
    mesh.renderOrder = isTrace ? 2 : 1;
    mesh.raycast = () => {};
    wall.add(mesh);
    resources.push(geometry, material, texture);
    return { mesh, material, progress };
  }

  function paint() {
    if (!full || !worn) return;
    ctx.drawImage(whole ? full : worn, 0, 0, width, height);
    if (!whole) for (const part of saved) {
      for (const { region, pixels } of layers.get(part) ?? []) ctx.drawImage(pixels, region.crop[0], region.crop[1]);
    }
    map.needsUpdate = true;
  }

  const ready = (async () => {
    [full, worn] = await Promise.all(['mural-full.jpg', 'mural-worn.jpg'].map(name => loadImage(`first-gallery/v001/${name}`, abort.signal)));
    if (abort.signal.aborted) return;
    function showSavedWall() {
      if (!wall.visible && (whole || saved.every(part => layers.has(part)))) {
        paint();
        wall.visible = true;
      }
    }
    showSavedWall();
    // Sequential region decode caps peak memory on smaller phones.
    for (const part of [...new Set([...saved, ...parts])]) {
      const entries = [];
      for (const region of FIRST_GALLERY_MURAL_REGIONS[part]) {
        const [restoreMask, traceMask] = await Promise.all([region.restoreMask, region.traceMask].map(path => loadImage(path, abort.signal)));
        if (abort.signal.aborted) return;
        const pixels = croppedImage(full, restoreMask, region.crop, false);
        const outline = croppedImage(full, traceMask, region.crop, true);
        entries.push({ region, pixels, color: layer(pixels, region, false), trace: layer(outline, region, true) });
      }
      layers.set(part, entries);
      showSavedWall();
    }
    if (abort.signal.aborted) return;
    const fullMap = new THREE.Texture(full);
    fullMap.colorSpace = THREE.SRGBColorSpace;
    fullMap.needsUpdate = true;
    const material = wall.material.clone();
    material.map = material.emissiveMap = fullMap;
    material.transparent = true;
    material.depthWrite = false;
    material.polygonOffsetFactor = -3;
    completeLayer = new THREE.Mesh(wall.geometry, material);
    completeLayer.position.z = .008;
    completeLayer.receiveShadow = true;
    completeLayer.visible = false;
    completeLayer.raycast = () => {};
    wall.add(completeLayer);
    resources.push(fullMap, material);
    paint();
    wall.visible = true;
  })();

  function stopPreview() {
    if (showing) for (const { color, trace } of layers.get(showing) ?? []) color.mesh.visible = trace.mesh.visible = false;
    showing = null;
  }

  return {
    ready,
    setParts(next: readonly FirstGalleryMuralPart[], immediate = false) {
      if (next.join(',') === saved.join(',') && !immediate) return;
      saved = [...next];
      whole = immediate && saved.length === 3;
      if (showing && saved.includes(showing)) stopPreview();
      if (immediate && completeLayer) { completeLayer.visible = false; renewing = false; }
      paint();
    },
    beginPreview(part: FirstGalleryMuralPart) { stopPreview(); showing = part; },
    preview(elapsed: number, reduced: boolean) {
      if (!showing) return;
      const { awake, flow, wall: duration } = muralLightTiming(showing);
      const p = THREE.MathUtils.clamp((elapsed - awake - flow) / duration, 0, 1);
      for (const { color, trace } of layers.get(showing) ?? []) {
        color.progress.value = ease(p, .13, 1);
        color.material.opacity = ease(p, .18, .88);
        color.mesh.visible = p > .13;
        trace.progress.value = ease(p, 0, .58);
        trace.material.opacity = reduced ? 0 : .68 * ease(p, 0, .18) * (1 - ease(p, .46, .94));
        trace.mesh.visible = trace.material.opacity > .005;
      }
    },
    stopPreview,
    renew(progress: number) {
      if (!completeLayer || whole) return;
      renewing = progress < 1;
      completeLayer.visible = renewing;
      completeLayer.material.opacity = ease(progress, 0, 1);
      if (!renewing) { whole = true; paint(); }
    },
    inspect: () => ({ muralParts: saved, whole, renewing, preview: showing }),
    dispose() { abort.abort(); resources.forEach(resource => resource.dispose()); },
  };
}
