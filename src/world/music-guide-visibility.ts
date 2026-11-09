import * as THREE from 'three';

interface ActorProjection {
  model: THREE.Object3D;
  bounds: THREE.Box3;
  worldToModel: THREE.Matrix4;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const localRigBounds = new WeakMap<THREE.Object3D, THREE.Box3>();

function modelBounds(model: THREE.Object3D, worldToModel: THREE.Matrix4) {
  const cached = localRigBounds.get(model);
  if (cached) return cached;

  // Refresh the skeleton once for the deformed-vertex measurement.
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  const meshToModel = new THREE.Matrix4();
  model.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh) || object.userData.musicGuideReveal) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return;
    meshToModel.multiplyMatrices(worldToModel, object.matrixWorld);
    for (let index = 0; index < positions.count; index++) {
      object.getVertexPosition(index, vertex);
      bounds.expandByPoint(vertex.applyMatrix4(meshToModel));
    }
  });
  if (bounds.isEmpty()) return null;
  // Allow for ordinary idle, walking and talking pose changes within the reveal.
  bounds.expandByScalar((bounds.max.y - bounds.min.y) * .025);
  localRigBounds.set(model, bounds);
  return bounds;
}

/** Fit the whole outfit in a clear, nearly frontal courtyard view. */
export function musicGuideShowcasePose(guide: THREE.Object3D, camera: THREE.PerspectiveCamera,
  settle: (target: THREE.Vector3, desired: THREE.Vector3) => THREE.Vector3) {
  const model = guide.children[0];
  if (!model) return null;
  model.updateWorldMatrix(true, false);
  const bounds = modelBounds(model, model.matrixWorld.clone().invert());
  if (!bounds) return null;
  const target = bounds.getCenter(new THREE.Vector3()).applyMatrix4(model.matrixWorld);
  const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
    i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y,
    i & 4 ? bounds.max.z : bounds.min.z,
  ).applyMatrix4(model.matrixWorld));
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
  const forward = guide.getWorldDirection(new THREE.Vector3()).negate();
  const heading = Math.atan2(forward.x, forward.z);
  const up = new THREE.Vector3(0, 1, 0);
  for (const offset of [0, -.28, .28, -.55, .55, -.86, .86, -1.2, 1.2, Math.PI]) {
    const yaw = heading + offset;
    const back = new THREE.Vector3(Math.sin(yaw), .035, Math.cos(yaw)).normalize();
    const right = new THREE.Vector3().crossVectors(up, back).normalize();
    const vertical = new THREE.Vector3().crossVectors(back, right);
    let distance = 1.55;
    for (const corner of corners) {
      const relative = corner.clone().sub(target);
      distance = Math.max(distance, relative.dot(back) + Math.max(
        Math.abs(relative.dot(right)) / (halfFov * camera.aspect * .86),
        Math.abs(relative.dot(vertical)) / (halfFov * .86),
      ));
    }
    const position = target.clone().addScaledVector(back, distance);
    if (settle(target, position).distanceToSquared(position) > .0025) continue;
    // Check both sides of the body and the top of tall headwear. The bottom
    // corners may sit inside the expanded floor used for camera collision.
    const visible = corners.every(corner => {
      const probe = corner.clone().lerp(target, .16);
      probe.y = Math.max(probe.y, guide.position.y + .27);
      return settle(probe, position).distanceToSquared(position) <= .0025;
    });
    if (visible) return { position, target };
  }
  return null;
}

function projectActor(actor: THREE.Object3D, camera: THREE.PerspectiveCamera): ActorProjection | null {
  if (!actor.visible) return null;
  // Each actor carries one loaded rig. Cache against that rig so a new costume
  // is measured independently, even though the guide root remains the same.
  const model = !(actor instanceof THREE.Mesh) && actor.children.length === 1 ? actor.children[0] : actor;
  if (!model.visible) return null;
  model.updateWorldMatrix(true, false);
  const worldToModel = model.matrixWorld.clone().invert();
  const bounds = modelBounds(model, worldToModel);
  if (!bounds) return null;

  const modelToView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, model.matrixWorld);
  const { min, max } = bounds;
  const points = Array.from({ length: 8 }, (_, corner) => new THREE.Vector3(
    corner & 1 ? max.x : min.x,
    corner & 2 ? max.y : min.y,
    corner & 4 ? max.z : min.z,
  ).applyMatrix4(modelToView));
  const projected = new THREE.Vector3();
  const result = { model, bounds, worldToModel, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const include = (viewPoint: THREE.Vector3) => {
    projected.copy(viewPoint).applyMatrix4(camera.projectionMatrix);
    result.minX = Math.min(result.minX, projected.x);
    result.minY = Math.min(result.minY, projected.y);
    result.maxX = Math.max(result.maxX, projected.x);
    result.maxY = Math.max(result.maxY, projected.y);
  };
  for (const point of points) if (-point.z >= camera.near && -point.z <= camera.far) include(point);

  // Clip box edges before perspective division so a near foreground rig does
  // not create inverted or infinite screen bounds.
  const clipped = new THREE.Vector3();
  const clipDepths = [camera.near, camera.far];
  for (const axis of [1, 2, 4]) {
    for (let corner = 0; corner < points.length; corner++) {
      if (corner & axis) continue;
      const a = points[corner], b = points[corner | axis];
      for (const depth of clipDepths) {
        if ((-a.z < depth) === (-b.z < depth)) continue;
        include(clipped.lerpVectors(a, b, (-depth - a.z) / (b.z - a.z)));
      }
    }
  }
  if (!Number.isFinite(result.minX) || !Number.isFinite(result.minY)) return null;
  return result;
}

/** True when the visible traveler can occlude the guide at the current camera. */
export function musicGuideBlockedByTraveler(camera: THREE.PerspectiveCamera, traveler: THREE.Object3D, guide: THREE.Object3D): boolean {
  camera.updateWorldMatrix(true, false);
  const front = projectActor(traveler, camera);
  const back = projectActor(guide, camera);
  if (!front || !back) return false;

  const minX = Math.max(-1, front.minX, back.minX), maxX = Math.min(1, front.maxX, back.maxX);
  const minY = Math.max(-1, front.minY, back.minY), maxY = Math.min(1, front.maxY, back.maxY);
  if (maxX - minX < .005 || maxY - minY < .005) return false;

  const eye = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const ray = new THREE.Ray();
  const localRay = new THREE.Ray();
  const hit = new THREE.Vector3();
  function entry(actor: ActorProjection) {
    localRay.copy(ray).applyMatrix4(actor.worldToModel);
    if (actor.bounds.containsPoint(localRay.origin)) return 0;
    if (!localRay.intersectBox(actor.bounds, hit)) return Infinity;
    return hit.applyMatrix4(actor.model.matrixWorld).distanceTo(ray.origin);
  }
  // Check depth on common view rays so a projected rectangle overlap alone
  // does not hide the traveler when they are alongside or behind the guide.
  const probes = [.5, .2, .8, .05, .95];
  for (const x of probes) {
    for (const y of probes) {
      ray.origin.set(THREE.MathUtils.lerp(minX, maxX, x), THREE.MathUtils.lerp(minY, maxY, y), -1).unproject(camera);
      ray.direction.subVectors(ray.origin, eye).normalize();
      const guideDepth = entry(back);
      if (Number.isFinite(guideDepth) && entry(front) + .025 < guideDepth) return true;
    }
  }
  return false;
}
