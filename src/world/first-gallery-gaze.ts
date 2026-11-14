import * as THREE from 'three';

export type FirstGalleryGazeKind = 'object' | 'up';

const DEG = Math.PI / 180;
const BODY_LEAD = 22 * DEG;
const HEAD_YAW_LIMIT = 34 * DEG;
const DOWN_LIMIT = 24 * DEG;
const OBJECT_UP_LIMIT = 20 * DEG;
const CAISSON_UP_LIMIT = 30 * DEG;
const EPSILON = 1e-4;
const UP = new THREE.Vector3(0, 1, 0);
const angle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
const bearing = (vector: THREE.Vector3) => Math.atan2(-vector.x, -vector.z);
const elevation = (vector: THREE.Vector3) => Math.atan2(vector.y, Math.hypot(vector.x, vector.z));

function findRig(traveler: THREE.Group, bindPoseForwardZ: -1 | 1) {
  let skin: THREE.SkinnedMesh | undefined;
  traveler.traverse(node => {
    if (!skin && node instanceof THREE.SkinnedMesh
      && node.skeleton.bones.some(bone => /^(?:mixamorig:?)?Head$/.test(bone.name))) skin = node;
  });
  if (!skin) return undefined;
  const { bones, boneInverses } = skin.skeleton;
  const head = bones.find(bone => /^(?:mixamorig:?)?Head$/.test(bone.name));
  if (!head) return undefined;
  const neck = bones.find(bone => /^(?:mixamorig:?)?Neck$/.test(bone.name));
  // Joint axes differ from a model’s bind-pose axes. Derive the face vector in joint space.
  const face = new THREE.Vector3(0, 0, bindPoseForwardZ).transformDirection(boneInverses[bones.indexOf(head)]);
  return { head, neck, face };
}

function ease(current: number, target: number, dt: number, rate: number, maxSpeed: number) {
  const step = (target - current) * (1 - Math.exp(-rate * dt));
  const result = current + THREE.MathUtils.clamp(step, -maxSpeed * dt, maxSpeed * dt);
  return Math.abs(result - target) < EPSILON ? target : result;
}

/** Render-only gaze for the official traveler. Call beforeAnimation before
 * writing the base pose, then update after the AnimationMixer and before render. */
export function createFirstGalleryGaze(traveler: THREE.Group, bindPoseForwardZ: -1 | 1 = -1) {
  let rig: ReturnType<typeof findRig>;
  let target: THREE.Vector3 | null = null;
  let kind: FirstGalleryGazeKind = 'object';
  let bodyTurn = 0, headYaw = 0, headPitch = 0;
  let originalHeading: number | undefined;
  let applied = false;
  const originalHead = new THREE.Quaternion(), originalNeck = new THREE.Quaternion();
  const direction = new THREE.Vector3(), origin = new THREE.Vector3();
  const currentFace = new THREE.Vector3(), right = new THREE.Vector3();
  const world = new THREE.Quaternion(), parent = new THREE.Quaternion();
  const rotation = new THREE.Quaternion(), local = new THREE.Quaternion();

  function beforeAnimation() {
    if (applied && rig) {
      rig.head.quaternion.copy(originalHead);
      rig.neck?.quaternion.copy(originalNeck);
      applied = false;
    }
    if (originalHeading !== undefined) {
      traveler.rotation.y = originalHeading;
      originalHeading = undefined;
    }
  }

  function turnBone(bone: THREE.Bone, fraction: number) {
    if (!bone.parent) return;
    bone.parent.getWorldQuaternion(parent);
    world.setFromAxisAngle(right, headPitch * fraction)
      .multiply(rotation.setFromAxisAngle(UP, headYaw * fraction));
    local.copy(parent).invert().multiply(world).multiply(parent);
    bone.quaternion.premultiply(local).normalize();
  }

  function update(delta: number, baseHeading: number, reduced = false) {
    if (reduced) {
      beforeAnimation();
      target = null;
      bodyTurn = headYaw = headPitch = 0;
      return;
    }
    if (!target && !bodyTurn && !headYaw && !headPitch) return;
    const dt = Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, .1) : 0;
    const heading = Number.isFinite(baseHeading) ? baseHeading : traveler.rotation.y;
    rig ??= findRig(traveler, bindPoseForwardZ);
    traveler.getWorldPosition(origin);
    if (target) direction.copy(target).sub(origin);
    const horizontal = target ? Math.hypot(direction.x, direction.z) : 0;
    // Directly overhead, a small foot-position or animated head shift must
    // not flip the character's heading by 180 degrees.
    const hasBearing = horizontal > Math.max(.18, Math.abs(direction.y) * .07);
    const toTarget = hasBearing ? angle(bearing(direction) - heading) : 0;
    const desiredBody = Math.sign(toTarget) * Math.max(0, Math.abs(toTarget) - BODY_LEAD);
    const bodyGoal = bodyTurn + angle(desiredBody - bodyTurn);
    bodyTurn = angle(ease(bodyTurn, bodyGoal, dt, target ? 8 : 15, (target ? 150 : 360) * DEG));
    if (bodyTurn) {
      originalHeading = traveler.rotation.y;
      traveler.rotation.y = heading + bodyTurn;
    }
    if (!rig) return;

    let desiredYaw = 0, desiredPitch = 0;
    rig.head.getWorldQuaternion(world);
    currentFace.copy(rig.face).applyQuaternion(world);
    if (target) {
      rig.head.getWorldPosition(origin);
      direction.copy(target).sub(origin);
      if (direction.lengthSq() > .01) {
        const bodyYaw = heading + bodyTurn;
        const faceYaw = bearing(currentFace);
        const aimedYaw = hasBearing
          ? bodyYaw + THREE.MathUtils.clamp(angle(bearing(direction) - bodyYaw), -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT)
          : bodyYaw;
        const upLimit = kind === 'up' ? CAISSON_UP_LIMIT : OBJECT_UP_LIMIT;
        const aimedPitch = THREE.MathUtils.clamp(elevation(direction), -DOWN_LIMIT, upLimit);
        desiredYaw = THREE.MathUtils.clamp(angle(aimedYaw - faceYaw), -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT);
        desiredPitch = THREE.MathUtils.clamp(aimedPitch - elevation(currentFace), -DOWN_LIMIT, upLimit);
      }
    }
    headYaw = ease(headYaw, desiredYaw, dt, target ? 13 : 18, 180 * DEG);
    headPitch = ease(headPitch, desiredPitch, dt, target ? 13 : 18, 150 * DEG);
    if (!headYaw && !headPitch) return;

    originalHead.copy(rig.head.quaternion);
    if (rig.neck) originalNeck.copy(rig.neck.quaternion);
    right.set(1, 0, 0).applyAxisAngle(UP, bearing(currentFace) + headYaw);
    if (rig.neck) turnBone(rig.neck, .3);
    turnBone(rig.head, rig.neck ? .7 : 1);
    applied = true;
  }

  return {
    start(next: THREE.Vector3, nextKind: FirstGalleryGazeKind = 'object') {
      if (![next.x, next.y, next.z].every(Number.isFinite)) return;
      target = next.clone();
      kind = nextKind;
    },
    cancel() { target = null; },
    beforeAnimation,
    update,
    inspect() {
      const forward = rig
        ? rig.face.clone().applyQuaternion(rig.head.getWorldQuaternion(new THREE.Quaternion())).toArray()
        : null;
      return { target: target?.toArray() ?? null, kind, bodyTurn, headYaw, headPitch, forward };
    },
    dispose() {
      beforeAnimation();
      target = null;
      bodyTurn = headYaw = headPitch = 0;
      rig = undefined;
    },
  };
}
