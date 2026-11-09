import * as THREE from 'three';
import { terrainVector } from './terrain-camera-v001';
import { TERRAIN_CAISSON_CONFIG, terrainCaissonCenter } from './terrain-caisson-v001';

export const GALLERY_CAISSON_CAMERA_SECONDS = 1.05;

export function firstGalleryCaissonCameraPose(aspect: number) {
  const position = terrainVector('courtyard', new THREE.Vector3(-12, 2.35, -17.4));
  const horizontalFit = Math.max(1, 1.15 / Math.max(.35, aspect));
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37)) * horizontalFit));
  return { position, target: terrainCaissonCenter(), fov };
}

const IMAGE_CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;

function isVisible(object: THREE.Object3D) {
  for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) {
    if (!ancestor.visible) return false;
  }
  return true;
}

function galleryCaissonFace(scene: THREE.Object3D) {
  const panel = scene.getObjectByName(TERRAIN_CAISSON_CONFIG.centerPanel.nodeId);
  if (!panel || !isVisible(panel)) return undefined;
  let face: THREE.Mesh | undefined;
  panel.traverseVisible(node => {
    if (!face && node instanceof THREE.Mesh) face = node;
  });
  return face;
}

/** A projected center only counts when the fitted image is in front of the
 * camera, inside the central half of the viewport and unobstructed. */
export function galleryCaissonCoreVisible(scene: THREE.Object3D, camera: THREE.PerspectiveCamera) {
  const face = galleryCaissonFace(scene);
  if (!face) return false;
  face.geometry.boundingBox ?? face.geometry.computeBoundingBox();
  const center = face.geometry.boundingBox?.getCenter(new THREE.Vector3());
  if (!center) return false;
  face.updateWorldMatrix(true, false);
  camera.updateWorldMatrix(true, false);
  center.applyMatrix4(face.matrixWorld).project(camera);
  if (Math.abs(center.x) > .5 || Math.abs(center.y) > .5 || center.z < -1 || center.z > 1 || !Number.isFinite(center.z)) return false;

  const ray = new THREE.Raycaster();
  ray.layers.mask = camera.layers.mask;
  ray.setFromCamera(new THREE.Vector2(center.x, center.y), camera);
  const art = ray.intersectObject(face, false)[0];
  if (!art) return false;
  ray.far = art.distance;
  const cover = ray.intersectObject(scene, true).find(({ object, face: triangle, distance }) => {
    if (distance >= art.distance - .001 || !(object instanceof THREE.Mesh) || !isVisible(object)) return false;
    const material = Array.isArray(object.material) ? object.material[triangle?.materialIndex ?? 0] : object.material;
    return !!material?.visible && material.colorWrite && (!material.transparent || material.opacity >= .5);
  });
  return !cover;
}

/** Project in original texture order. The ceiling face is fitted by the GLB
 * loader, so both its geometry and its live world matrix matter. */
export function projectGalleryCaissonQuad(
  scene: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  viewport: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>,
): readonly { x: number; y: number }[] | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  const face = galleryCaissonFace(scene);
  if (!face) return null;
  const position = face.geometry.getAttribute('position');
  const uv = face.geometry.getAttribute('uv');
  if (!position || !uv || position.count !== uv.count) return null;
  face.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);
  const point = new THREE.Vector3(), cameraPoint = new THREE.Vector3();
  const corners: { x: number; y: number }[] = [];
  for (const [u, v] of IMAGE_CORNERS) {
    let index = -1;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(uv.getX(i) - u) < 1e-4 && Math.abs(uv.getY(i) - v) < 1e-4) { index = i; break; }
    }
    if (index < 0) return null;
    point.fromBufferAttribute(position, index).applyMatrix4(face.matrixWorld);
    cameraPoint.copy(point).applyMatrix4(camera.matrixWorldInverse);
    if (cameraPoint.z >= -camera.near) return null;
    point.project(camera);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1) return null;
    corners.push({ x: viewport.left + (1 + point.x) * viewport.width / 2, y: viewport.top + (1 - point.y) * viewport.height / 2 });
  }
  return corners;
}
