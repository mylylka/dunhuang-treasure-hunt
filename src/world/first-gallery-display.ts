import measured from '../content/world/first-gallery-stations-v001.json';
import * as THREE from 'three';
import { FIRST_GALLERY_MURAL_REGIONS } from '../content/world/first-gallery-mural-regions';
import { createMuralLight, muralLightTiming } from './first-gallery-mural-light';
import { createMuralWall } from './first-gallery-mural-wall';
import { createGalleryPortalLight } from './first-gallery-portal-light';
import { GALLERY_TARGETS, type GalleryInteraction } from '../content/world/first-gallery-v001';
import { TERRAIN_REGIONS, toTerrainPoint } from './terrain-rules-v001';
import type { FirstGalleryMuralPart } from '../services/first-gallery';

/** Isolated overlays: original architecture/model bytes and shared materials
 * remain untouched. Canvas copies own their textures and are all released. */
export function createFirstGalleryDisplay(scene: THREE.Scene, traveler: THREE.Object3D) {
  const root = new THREE.Group(); root.name = 'first-gallery-display'; scene.add(root);
  const scrollMaterials: THREE.MeshStandardMaterial[] = [];
  const scrollOriginals: { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }[] = [];
  const scrollCenter = new THREE.Vector3();
  scene.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node.name !== 'hall-v003-workshop-paper-art') return;
    new THREE.Box3().setFromObject(node).getCenter(scrollCenter);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    scrollOriginals.push({ mesh: node, material: node.material });
    const copies = list.map(material => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return material;
      const copy = material.clone(); copy.emissive.set(0xe5bb76); copy.emissiveMap = copy.map; copy.emissiveIntensity = 0;
      scrollMaterials.push(copy); return copy;
    });
    node.material = Array.isArray(node.material) ? copies : copies[0];
  });
  const portal = scrollOriginals.length ? createGalleryPortalLight(root, scrollCenter) : null;
  const resources: { dispose(): void }[] = [];
  const wallCanvas = document.createElement('canvas'); wallCanvas.width = 2168; wallCanvas.height = 725;
  const wallMap = new THREE.CanvasTexture(wallCanvas); wallMap.colorSpace = THREE.SRGBColorSpace;
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 1, emissive: 0xffffff, emissiveMap: wallMap, emissiveIntensity: .12, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 4.1666667), wallMaterial);
  wall.name = 'first-gallery-mural'; wall.position.copy(GALLERY_TARGETS.wall as THREE.Vector3);
  const center = toTerrainPoint('courtyard', { x: -12, y: .65 + 4.1666667 / 2, z: -23.105 });
  wall.position.set(center.x, center.y, center.z); wall.rotation.y = TERRAIN_REGIONS.courtyard.yaw;
  wall.visible = false; wall.receiveShadow = true; root.add(wall);
  resources.push(wall.geometry, wallMaterial, wallMap);
  const muralWall = createMuralWall(wall, wallCanvas, wallMap);
  let unlocked = false;

  const easelRoot = scene.getObjectByName('coloring-station');
  // Exact original GLB triangles, clipped to paper; frame/wood remains intact.
  const paper = new THREE.BufferGeometry();
  paper.setAttribute('position', new THREE.Float32BufferAttribute(measured.paper.positions, 3));
  paper.setAttribute('uv', new THREE.Float32BufferAttribute(measured.paper.uv, 2));
  paper.setIndex(measured.paper.indices); paper.computeVertexNormals();
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xfff5e5, roughness: 1, emissive: 0xffffff, emissiveIntensity: .2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const paperMesh = new THREE.Mesh(paper, paperMaterial); paperMesh.name = 'first-gallery-easel-picture'; paperMesh.visible = false;
  easelRoot?.add(paperMesh); resources.push(paper, paperMaterial);
  let paperMap: THREE.CanvasTexture | null = null;

  const light = createMuralLight(root);
  let previewPart: FirstGalleryMuralPart | null = null, previewElapsed = 0;

  const ringCanvas = document.createElement('canvas'); ringCanvas.width = ringCanvas.height = 128;
  const ringContext = ringCanvas.getContext('2d')!;
  const glow = ringContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(.62, 'rgba(255,255,255,0)');
  glow.addColorStop(.74, 'rgba(255,255,255,.14)');
  glow.addColorStop(.8, 'rgba(255,255,255,.64)');
  glow.addColorStop(.86, 'rgba(255,255,255,.2)');
  glow.addColorStop(.98, 'rgba(255,255,255,0)');
  ringContext.fillStyle = glow; ringContext.fillRect(0, 0, 128, 128);
  const ringMap = new THREE.CanvasTexture(ringCanvas);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf4cd8d, map: ringMap, transparent: true, depthWrite: false, toneMapped: false });
  const ringGeometry = new THREE.PlaneGeometry(1.72, 1.72);
  const muralMarker = new THREE.Mesh(ringGeometry, ringMaterial);
  muralMarker.name = 'first-gallery-mural-observation-marker'; muralMarker.rotation.x = -Math.PI / 2; muralMarker.visible = false;
  root.add(muralMarker); resources.push(ringMap, ringMaterial, ringGeometry);
  let markerPlaced = false;

  const muralRoot = scene.getObjectByName('mural-station');
  let sourceGlow: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  function awakenSource(part: FirstGalleryMuralPart) {
    let source: THREE.Mesh | undefined;
    muralRoot?.traverse(node => {
      if (!source && node instanceof THREE.Mesh && node.geometry.index && node.geometry.index.count / 3 > measured.muralObjects[part].faces.at(-1)![1]) source = node;
    });
    if (!source) return [];
    source.updateWorldMatrix(true, false);
    const index = source.geometry.index!;
    const position = source.geometry.getAttribute('position');
    const normal = source.geometry.getAttribute('normal');
    const positions: number[] = [], normals: number[] = [];
    for (const [start, end] of measured.muralObjects[part].faces) {
      for (let corner = start * 3; corner < (end + 1) * 3; corner++) {
        const vertex = index.getX(corner);
        positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
        if (normal) normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normal) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    else geometry.computeVertexNormals();
    if (!sourceGlow) {
      const material = new THREE.ShaderMaterial({
        uniforms: { energy: { value: 0 } }, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        vertexShader: `#include <common>
          #include <logdepthbuf_pars_vertex>
          varying vec3 rimNormal; varying vec3 rimEye;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position + normal * 0.00075, 1.0);
            rimNormal = normalMatrix * normal;
            rimEye = -viewPosition.xyz;
            gl_Position = projectionMatrix * viewPosition;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `#include <logdepthbuf_pars_fragment>
          uniform float energy; varying vec3 rimNormal; varying vec3 rimEye;
          void main() {
            #include <logdepthbuf_fragment>
            float rim = pow(1.0 - abs(dot(normalize(rimNormal), normalize(rimEye))), 2.1);
            gl_FragColor = vec4(vec3(1.0, 0.70, 0.36), energy * (0.035 + 0.54 * rim));
            #include <colorspace_fragment>
          }`,
      });
      sourceGlow = new THREE.Mesh(geometry, material);
      sourceGlow.raycast = () => {};
      sourceGlow.renderOrder = 3;
    } else {
      sourceGlow.geometry.dispose();
      sourceGlow.geometry = geometry;
    }
    source.add(sourceGlow);
    sourceGlow.visible = false;
    const count = positions.length / 3;
    return Array.from({ length: 24 }, (_, i) => {
      const offset = Math.min(count - 1, Math.floor((i + .37) * count / 24)) * 3;
      return source!.localToWorld(new THREE.Vector3().fromArray(positions, offset));
    });
  }
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  function visible(hit: THREE.Intersection) {
    for (let node: THREE.Object3D | null = hit.object; node; node = node.parent) if (!node.visible || node === traveler || node === muralMarker) return false;
    if (!(hit.object instanceof THREE.Mesh)) return false;
    const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
    return material?.visible && material.opacity > .02;
  }
  function closestHit(camera: THREE.Camera, point: { x: number; y: number }, target: THREE.Object3D = scene) {
    ray.setFromCamera(cursor.set(point.x, point.y), camera);
    return ray.intersectObject(target, true).find(visible);
  }
  function station(hit: THREE.Object3D) {
    for (let node: THREE.Object3D | null = hit; node; node = node.parent) if (node.name === 'mural-station' || node.name === 'coloring-station') return node;
    return null;
  }
  function muralPart(hit?: THREE.Intersection): FirstGalleryMuralPart | undefined {
    if (!hit || !muralRoot || station(hit.object) !== muralRoot || hit.faceIndex == null) return;
    const face = hit.faceIndex;
    return (['lotus', 'bird', 'grapes'] as const).find(part => measured.muralObjects[part].faces.some(([start, end]) => face >= start && face <= end));
  }
  return {
    ready: muralWall.ready,
    setMuralMarker(visible: boolean, position?: { x: number; y: number; z: number }) {
      if (position) {
        muralMarker.position.set(position.x, position.y + .012, position.z);
        markerPlaced = true;
      }
      muralMarker.visible = visible && markerPlaced;
    },
    setPortalReveal(progress: number) {
      unlocked = progress === 1;
      portal?.setReveal(progress);
      scrollMaterials.forEach(material => { material.emissiveIntensity = .42 * progress; });
    },
    setParts: muralWall.setParts,
    renewMural: muralWall.renew,
    stopMuralLight() {
      previewPart = null;
      light.stop();
      muralWall.stopPreview();
      if (sourceGlow) sourceGlow.visible = false;
    },
    setArtwork(canvas: HTMLCanvasElement) {
      const copy = document.createElement('canvas');
      copy.height = 1536; copy.width = Math.round(copy.height * measured.paper.aspect);
      const context = copy.getContext('2d')!;
      context.fillStyle = '#f9edcf'; context.fillRect(0, 0, copy.width, copy.height);
      const scale = Math.min(copy.width / canvas.width, copy.height / canvas.height);
      const width = canvas.width * scale, height = canvas.height * scale;
      context.drawImage(canvas, (copy.width - width) / 2, (copy.height - height) / 2, width, height);
      context.fillStyle = 'rgba(220,187,133,.035)'; context.fillRect(0, 0, copy.width, copy.height);
      const next = new THREE.CanvasTexture(copy); next.colorSpace = THREE.SRGBColorSpace; next.anisotropy = 4;
      paperMap?.dispose(); paperMap = next; paperMaterial.map = next; paperMaterial.emissiveMap = next; paperMaterial.needsUpdate = true; paperMesh.visible = true;
    },
    playTrail(part: FirstGalleryMuralPart) {
      previewPart = part;
      previewElapsed = 0;
      muralWall.beginPreview(part);
      const targets = FIRST_GALLERY_MURAL_REGIONS[part].map(({ anchor: [x, y] }) =>
        wall.localToWorld(new THREE.Vector3((x / 2168 - .5) * 12.5, (.5 - y / 725) * 4.1666667, 0)));
      light.start(part, GALLERY_TARGETS[part], targets, awakenSource(part));
    },
    update(dt: number, reduced: boolean) {
      portal?.update(dt, reduced);
      light.update(dt, reduced);
      if (!previewPart) return;
      previewElapsed += dt;
      muralWall.preview(previewElapsed, reduced);
      const { awake, flow, wall: duration } = muralLightTiming(previewPart);
      if (sourceGlow) {
        sourceGlow.visible = !reduced && previewElapsed < awake + .13;
        sourceGlow.material.uniforms.energy.value = THREE.MathUtils.smoothstep(previewElapsed, 0, .21) * (1 - THREE.MathUtils.smoothstep(previewElapsed, .31, awake + .13));
      }
      if (previewElapsed >= awake + flow + duration) previewPart = null;
    },
    pick(camera: THREE.Camera, point: { x: number; y: number }): { interaction: GalleryInteraction; object?: FirstGalleryMuralPart } | null {
      const hit = closestHit(camera, point); if (!hit) return null;
      const device = station(hit.object);
      if (device?.name === 'coloring-station') return { interaction: 'easel' };
      if (device?.name === 'mural-station') {
        const object = muralPart(hit);
        return object ? { interaction: 'mural', object } : { interaction: 'mural' };
      }
      if (hit.object === wall) return { interaction: 'mural' };
      if (scrollOriginals.some(item => item.mesh === hit.object)) return { interaction: 'scroll' };
      for (let node: THREE.Object3D | null = hit.object; node; node = node.parent) if (node.name.startsWith('three-hares-caisson')) return { interaction: 'caisson' };
      return null;
    },
    pickMuralObject(camera: THREE.Camera, point: { x: number; y: number }, viewportPx?: { width: number; height: number }): FirstGalleryMuralPart | null {
      if (!muralRoot) return null;
      const direct = closestHit(camera, point);
      const object = muralPart(direct);
      if (object) return object;
      if (!viewportPx || !(viewportPx.width > 0 && viewportPx.height > 0)) return null;
      // Only a nearby visible triangle can extend a touch target. Check the
      // station first so empty samples skip a full scene intersection.
      for (const radius of [8, 16]) for (let direction = 0; direction < 8; direction++) {
        const angle = direction * Math.PI / 4;
        const sample = { x: point.x + Math.cos(angle) * radius * 2 / viewportPx.width, y: point.y + Math.sin(angle) * radius * 2 / viewportPx.height };
        if (Math.abs(sample.x) > 1 || Math.abs(sample.y) > 1) continue;
        const candidate = closestHit(camera, sample, muralRoot);
        if (!candidate || !muralPart(candidate) || (direct && direct.distance < candidate.distance)) continue;
        const hit = muralPart(closestHit(camera, sample));
        if (hit) return hit;
      }
      return null;
    },
    inspect: () => ({ muralVisible: wall.visible, ...muralWall.inspect(), muralMarker: muralMarker.visible, easelVisible: paperMesh.visible, easelVertices: paper.attributes.position.count, trail: light.inspect().active, muralLight: light.inspect(), scrollUnlocked: unlocked, scrollFaces: scrollMaterials.length, portalLight: portal?.inspect() }),
    dispose() { muralWall.dispose(); light.dispose(); portal?.dispose(); sourceGlow?.removeFromParent(); sourceGlow?.geometry.dispose(); sourceGlow?.material.dispose(); root.removeFromParent(); paperMesh.removeFromParent(); paperMap?.dispose(); scrollOriginals.forEach(({ mesh, material }) => { mesh.material = material; }); scrollMaterials.forEach(material => material.dispose()); resources.forEach(item => item.dispose()); },
  };
}
