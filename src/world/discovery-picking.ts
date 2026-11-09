import { Mesh, Raycaster, Vector2, type Camera, type Intersection, type Material, type Object3D } from 'three';
import type { DiscoveryId } from './types';

/** Match actual artwork surfaces, rather than any part of the surrounding hall. */
function artworkDiscovery(hit: Intersection): DiscoveryId | null {
  for (let object: Object3D | null = hit.object; object; object = object.parent) {
    // The two story walls share a semanticGroup, but retain individual names.
    for (const name of [object.name,String(object.userData.semanticGroup??'')]) {
      if (/^(deer-door-head|deer-side-tail|deer-mural|story-wall)(?:$|[_-])/.test(name)) return 'story-demo';
      if (/^(novice-side-head|novice-door-tail)(?:$|[_-])/.test(name)) return 'novice-story';
      if (name === 'flying-original-art' || name.startsWith('flying-ribbon-')) return 'flying';
      if (name.startsWith('caisson-') || name.startsWith('three-hares-caisson')) return 'caisson';
    }
  }
  const mesh = hit.object;
  if (mesh instanceof Mesh) {
    const material: Material | undefined = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
    // Exported interior batches may combine multiple surfaces into one mesh.
    if (material?.name === 'deer') return 'story-demo';
    if (material?.name === 'novice') return 'novice-story';
  }
  return null;
}

function visibleSurface(hit: Intersection, ignored: Object3D) {
  for (let object: Object3D | null = hit.object; object; object = object.parent) {
    if (!object.visible || object === ignored || object.name==='mural-awakening-mist') return false;
  }
  if (!(hit.object instanceof Mesh)) return false;
  const material: Material | undefined = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
  return !!material?.visible && material.opacity > .02;
}

/** The nearest visible surface blocks clicks on artwork behind walls. */
export function pickDiscoveryAt(scene: Object3D, camera: Camera, point: { x: number; y: number }, ignored: Object3D): DiscoveryId | null {
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2(point.x, point.y), camera);
  const hit = ray.intersectObject(scene, true).find(item => visibleSurface(item, ignored));
  return hit ? artworkDiscovery(hit) : null;
}
