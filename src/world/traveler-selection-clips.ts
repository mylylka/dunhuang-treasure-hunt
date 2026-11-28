import {
  AnimationClip, AnimationMixer, type Bone, MathUtils, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3,
} from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { TravelerId } from '../content/world/assets';

interface SelectionClips {
  rest: AnimationClip;
  respond: AnimationClip;
  show: AnimationClip;
}

const restDuration = 3.8;
const responseDuration = 1.96;
const showDuration = 4.4;
const worldUp = new Vector3(0, 1, 0);

function unitBetween(from: Bone, to: Bone): Vector3 {
  return to.getWorldPosition(new Vector3()).sub(from.getWorldPosition(new Vector3())).normalize();
}

function setWorldRotation(bone: Bone, rotation: Quaternion) {
  const parentRotation = bone.parent!.getWorldQuaternion(new Quaternion());
  bone.quaternion.copy(parentRotation.invert().multiply(rotation));
}

function turnBone(bone: Bone, axis: Vector3, radians: number) {
  const rotation = new Quaternion().setFromAxisAngle(axis, radians);
  setWorldRotation(bone, rotation.multiply(bone.getWorldQuaternion(new Quaternion())));
}

/** Build a frame from an aim and a perpendicular direction, using the mesh's
 * own rest pose to resolve the bone rolls on either side of the joint. */
function frame(aim: Vector3, side: Vector3): Quaternion {
  const x = side.clone().addScaledVector(aim, -side.dot(aim)).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, aim, x.clone().cross(aim)));
}

function easeBetween(start: number, end: number, t: number): number {
  return MathUtils.smoothstep(t, start, end);
}

export function createTravelerSelectionClips(gltf: GLTF, id: TravelerId): SelectionClips {
  const classic = id === 'classic';
  const root = gltf.scene;
  const standingClip = gltf.animations.find(clip => clip.name === (classic ? 'Idle' : 'standing_relax.001'));
  if (!standingClip) throw new Error('Selection character has no standing clip');
  const base = standingClip;
  const bone = (name: string) => {
    const joint = root.getObjectByName(`mixamorig${name}`);
    if (!(joint as Bone | undefined)?.isBone) throw new Error(`Selection character is missing bone ${name}`);
    return joint as Bone;
  };

  const chest = bone('Spine2');
  const neck = bone('Neck');
  const head = bone('Head');
  const clavicle = bone('RightShoulder');
  const upperArm = bone('RightArm');
  const forearm = bone('RightForeArm');
  const hand = bone('RightHand');
  const middle = bone('RightHandMiddle1');
  const index = bone('RightHandIndex1');
  const pinky = bone('RightHandPinky1');
  const digits = ['Index', 'Middle', 'Ring', 'Pinky'].flatMap(finger =>
    [1, 2, 3].map(index => bone(`RightHand${finger}${index}`)));
  const edited = [chest, neck, head, clavicle, upperArm, forearm, hand, ...digits];
  const original = edited.map(bone => bone.quaternion.clone());
  // glTF model forward is -Z for the original traveler and +Z for the student.
  const forward = new Vector3(0, 0, classic ? -1 : 1).applyQuaternion(root.getWorldQuaternion(new Quaternion()));
  const right = forward.clone().cross(worldUp).normalize();

  const mixer = new AnimationMixer(root);
  mixer.clipAction(base).play();
  mixer.update(0);
  const standing = edited.map(bone => bone.quaternion.clone());

  function bendArm(reach: number, extension: number, wag: number) {
    if (reach === 0) return;
    const armPosition = upperArm.getWorldPosition(new Vector3());
    const elbowPosition = forearm.getWorldPosition(new Vector3());
    const wristPosition = hand.getWorldPosition(new Vector3());
    const upperLength = elbowPosition.distanceTo(armPosition);
    const foreLength = wristPosition.distanceTo(elbowPosition);
    const armLength = upperLength + foreLength;

    const target = new Vector3();
    if (classic) {
      target.addScaledVector(right, MathUtils.lerp(.03, .47, extension))
        .addScaledVector(worldUp, MathUtils.lerp(-.26, -.28, extension))
        .addScaledVector(forward, MathUtils.lerp(.73, .76, extension));
    } else {
      target.addScaledVector(right, .27 + wag * .07)
        .addScaledVector(worldUp, .13 + wag * .042)
        .addScaledVector(forward, .50);
    }
    const restOffset = wristPosition.sub(armPosition);
    const restDirection = restOffset.clone().normalize();
    const aimedDirection = target.clone().normalize();
    const swing = new Quaternion().setFromUnitVectors(restDirection, aimedDirection);
    const arc = new Quaternion().slerp(swing, reach);
    const direction = restDirection.clone().applyQuaternion(arc);
    const distance = MathUtils.clamp(
      MathUtils.lerp(restOffset.length(), target.length() * armLength, reach),
      Math.abs(upperLength - foreLength) + armLength * .02, armLength * .994,
    );
    const elbowAxis = classic
      ? right.clone().multiplyScalar(.65).addScaledVector(worldUp, -.75).addScaledVector(forward, .09)
      : right.clone().multiplyScalar(.12).addScaledVector(worldUp, -.88).addScaledVector(forward, .40);
    const oldUpper = unitBetween(upperArm, forearm);
    const oldFore = unitBetween(forearm, hand);
    const oldNormal = oldUpper.clone().cross(oldFore).normalize();
    const restElbow = oldUpper.clone().addScaledVector(restDirection, -oldUpper.dot(restDirection))
      .normalize().applyQuaternion(arc);
    elbowAxis.addScaledVector(direction, -elbowAxis.dot(direction)).normalize();
    const elbowRotation = Math.atan2(direction.dot(restElbow.clone().cross(elbowAxis)), restElbow.dot(elbowAxis));
    elbowAxis.copy(restElbow).applyAxisAngle(direction, elbowRotation * reach);

    const offset = (upperLength ** 2 - foreLength ** 2 + distance ** 2) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, upperLength ** 2 - offset ** 2));
    const upper = direction.clone().multiplyScalar(offset).addScaledVector(elbowAxis, bend).normalize();
    const fore = direction.clone().multiplyScalar(distance).addScaledVector(upper, -upperLength).normalize();
    const normal = upper.clone().cross(fore).normalize();

    const lean = new Quaternion().setFromUnitVectors(oldUpper, upper);
    const rollWithElbow = frame(upper, normal).multiply(frame(oldUpper, oldNormal).invert());
    const upperRotation = lean.slerp(rollWithElbow, classic ? .88 : .27);
    setWorldRotation(upperArm, upperRotation.multiply(upperArm.getWorldQuaternion(new Quaternion())));
    const foreRotation = new Quaternion().setFromUnitVectors(unitBetween(forearm, hand), fore);
    setWorldRotation(forearm, foreRotation.multiply(forearm.getWorldQuaternion(new Quaternion())));

    const fingers = classic
      ? forward.clone().addScaledVector(right, .38).addScaledVector(worldUp, .10).normalize()
      : worldUp.clone().addScaledVector(right, .17 + .46 * wag).addScaledVector(forward, .06).normalize();
    const palm = classic ? worldUp : forward;
    const thumb = fingers.clone().cross(palm).normalize();
    const oldFingers = unitBetween(hand, middle);
    const oldThumb = index.getWorldPosition(new Vector3()).sub(pinky.getWorldPosition(new Vector3())).normalize();
    // Share the palm turn with the forearm so the wrist does not take the entire twist.
    const foreThumb = oldThumb.clone().addScaledVector(fore, -oldThumb.dot(fore)).normalize();
    const palmThumb = thumb.clone().addScaledVector(fore, -thumb.dot(fore)).normalize();
    const roll = Math.atan2(fore.dot(foreThumb.clone().cross(palmThumb)), foreThumb.dot(palmThumb));
    turnBone(forearm, fore, MathUtils.clamp(roll, -.85, .85) * reach * .55);
    const currentThumb = index.getWorldPosition(new Vector3()).sub(pinky.getWorldPosition(new Vector3())).normalize();
    const wristRotation = frame(fingers, thumb).multiply(frame(unitBetween(hand, middle), currentThumb).invert());
    // Rotate the upper arm and forearm before opening the hand.
    const handRotation = hand.getWorldQuaternion(new Quaternion());
    const palmRotation = wristRotation.multiply(handRotation.clone());
    setWorldRotation(hand, handRotation.slerp(palmRotation, reach * (classic ? .73 : .83)));
    digits.forEach((finger, index) => finger.quaternion.slerp(original[index + 7], reach * .85));
  }

  function bake(name: string, duration: number, pose: (time: number) => void) {
    const steps = Math.ceil(duration * 30);
    const times = Array.from({ length: steps + 1 }, (_, frame) => frame * duration / steps);
    const samples = edited.map(() => [] as number[]);
    for (const time of times) {
      edited.forEach((joint, index) => joint.quaternion.copy(standing[index]));
      pose(time);
      edited.forEach((joint, index) => samples[index].push(...joint.quaternion.toArray()));
    }

    const editedNames = new Set(edited.map(joint => `${joint.name}.quaternion`));
    const tracks = base.tracks.filter(track => !editedNames.has(track.name)).map(track => {
      // Keep the source's lower body and hips in frame zero. No root translation or foot drift.
      const held = track.clone();
      held.times = new Float32Array([0]);
      held.values = track.values.slice(0, track.getValueSize());
      return held;
    });
    edited.forEach((joint, index) => tracks.push(new QuaternionKeyframeTrack(`${joint.name}.quaternion`, times, samples[index])));
    return new AnimationClip(name, duration, tracks).optimize();
  }

  function posture(interest: number, breath: number) {
    turnBone(chest, worldUp, interest * (classic ? -.042 : .058));
    turnBone(neck, right, .065 * interest + .021 * breath);
    turnBone(head, worldUp, interest * (classic ? -.075 : .09) + .025 * breath);
  }

  try {
    const rest = bake('rest', restDuration, time => posture(0, Math.sin(time / restDuration * 2 * Math.PI)));
    const respond = bake('respond', responseDuration, time => {
      const attention = easeBetween(0, .36, time);
      const lift = easeBetween(.14, classic ? .75 : .58, time) * (1 - easeBetween(1.36, responseDuration, time));
      const unfold = easeBetween(.56, .91, time);
      const wave = (easeBetween(.55, .71, time) - easeBetween(1.22, 1.35, time))
        * Math.sin((time - .67) * 2 * Math.PI / .40);
      posture(attention, 0);
      turnBone(clavicle, forward, -.068 * lift);
      bendArm(lift, unfold, wave);
    });
    const show = bake('show', showDuration, time => posture(1, Math.sin(time / showDuration * 2 * Math.PI)));
    return { rest, respond, show };
  } finally {
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    edited.forEach((joint, index) => joint.quaternion.copy(original[index]));
    root.updateMatrixWorld(true);
  }
}
