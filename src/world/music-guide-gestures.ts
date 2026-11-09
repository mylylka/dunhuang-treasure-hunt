import * as THREE from 'three';
import type { MusicGuideOutfitId } from '../content/world/music-guide-v001';

// Wide sleeves need more clearance and smaller accents, especially while drawing inward.
const outfitMotion: Record<MusicGuideOutfitId, { clearance: number; accent: number; sleeveRoll: number }> = {
  plain: { clearance: 0, accent: 1, sleeveRoll: 1.58 },
  'northern-wei': { clearance: 0, accent: 1, sleeveRoll: 1.58 },
  'western-wei': { clearance: .12, accent: .68, sleeveRoll: .29 },
  'late-tang': { clearance: .10, accent: .82, sleeveRoll: .43 },
  'five-dynasties': { clearance: .20, accent: .50, sleeveRoll: .17 },
  yuan: { clearance: .07, accent: .76, sleeveRoll: .52 },
};

const beats = [
  { end: 2.55, blend: .78 }, // Both hands gently open.
  { end: 5.35, blend: .85 }, // One hand gives a small accent.
  { end: 8.05, blend: .85 }, // Hands draw nearer without crossing.
  { end: 10.45, blend: .92 }, // Return to the relaxed base.
];

export function createMusicGuideGestures(model: THREE.Object3D, outfit: MusicGuideOutfitId) {
  const bones: THREE.Bone[] = [];
  model.traverse(object => {
    if (object instanceof THREE.Bone) bones.push(object);
  });
  const motion = outfitMotion[outfit];

  function arm(name: 'Left' | 'Right', side: -1 | 1) {
    const find = (suffix: string) => bones.find(bone => bone.name.endsWith(suffix));
    const upper = find(`${name}Arm`), forearm = find(`${name}ForeArm`), hand = find(`${name}Hand`);
    if (!upper || !forearm || !hand || forearm.parent !== upper || hand.parent !== forearm) return null;
    // Targets are directions in the normalized model space (+Y up, -Z forward).
    const pose = (shoulder: [number, number], wrist: [number, number],
      palm: [number, number], fingers: number) => ({
      upper: new THREE.Vector3(side * (shoulder[0] + motion.clearance), -1, -shoulder[1]).normalize(),
      forearm: new THREE.Vector3(side * wrist[0], wrist[1], -1).normalize(),
      palm: new THREE.Vector3(-side * palm[0], palm[1], -.16).normalize(),
      fingers,
    });
    const base = pose([.23, .12], [.10 + motion.clearance * .32, -.20 - motion.clearance * .15], [.90, .55], .34);
    const poses = [
      pose([.35, .15], [.39, -.04], [.18, 1], .76),
      pose([.29, .25], [.18, .20], [.31, 1], .64),
      pose([.21, .19], [.04, -.10], [.46, .88], .55),
      base,
    ];
    for (const target of poses.slice(0, 3)) {
      target.upper.lerp(base.upper, 1 - motion.accent).normalize();
      target.forearm.lerp(base.forearm, 1 - motion.accent).normalize();
      target.palm.lerp(base.palm, (1 - motion.accent) * .60).normalize();
    }
    const index = find(`${name}HandIndex1`);
    const middle = find(`${name}HandMiddle1`);
    const pinky = find(`${name}HandPinky1`);
    const landmarks = index && middle && pinky ? { index, middle, pinky } : null;
    const fingers = ['Index', 'Middle', 'Ring', 'Pinky'].flatMap(finger => [2, 3].flatMap(segment => {
      const parent = find(`${name}Hand${finger}${segment - 1}`);
      const bone = find(`${name}Hand${finger}${segment}`);
      const child = find(`${name}Hand${finger}${segment + 1}`);
      if (!parent || !bone || !child || bone.parent !== parent || child.parent !== bone) return [];
      // Cache the local-space direction that gently relaxes each curled finger joint.
      const joint = bone.getWorldPosition(new THREE.Vector3());
      const incoming = joint.clone().sub(parent.getWorldPosition(new THREE.Vector3())).normalize();
      const outgoing = child.getWorldPosition(new THREE.Vector3()).sub(joint).normalize();
      const parentRotation = parent.getWorldQuaternion(new THREE.Quaternion());
      const delta = new THREE.Quaternion().setFromUnitVectors(outgoing, incoming);
      return [{ bone, relax: parentRotation.clone().invert().multiply(delta).multiply(parentRotation) }];
    }));
    const saved = [upper, forearm, hand, ...fingers.map(finger => finger.bone)]
      .map(bone => ({ bone, pose: new THREE.Quaternion() }));
    return { upper, forearm, hand, side, poses, base, landmarks, fingers, saved };
  }

  const left = arm('Left', -1), right = arm('Right', 1);
  if (!left || !right) return null;
  const arms = [left, right];
  type Arm = (typeof arms)[number];
  const cycleDuration = beats[beats.length - 1].end;
  const modelRotation = new THREE.Quaternion(), parentRotation = new THREE.Quaternion();
  const rotation = new THREE.Quaternion(), correction = new THREE.Quaternion();
  const origin = new THREE.Vector3(), direction = new THREE.Vector3(), target = new THREE.Vector3();
  const armAxis = new THREE.Vector3(), previousAim = new THREE.Vector3();
  const knuckles = new THREE.Vector3(), thumbSide = new THREE.Vector3(), palmNormal = new THREE.Vector3();
  const desiredPalm = new THREE.Vector3();
  let elapsed = 0, strength = 0, applied = false;

  function applyWorldRotation(bone: THREE.Bone) {
    bone.parent!.getWorldQuaternion(parentRotation);
    bone.quaternion.premultiply(correction.copy(parentRotation).invert().multiply(rotation).multiply(parentRotation));
  }

  function aimInWorld(bone: THREE.Bone, child: THREE.Bone, targetDirection: THREE.Vector3, weight: number) {
    bone.getWorldPosition(origin);
    child.getWorldPosition(direction).sub(origin).normalize();
    if (direction.lengthSq() < .5) return;
    rotation.setFromUnitVectors(direction, targetDirection);
    correction.identity();
    rotation.copy(correction.slerp(rotation, weight));
    applyWorldRotation(bone);
  }

  function aim(bone: THREE.Bone, child: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3, blend: number) {
    target.copy(from).lerp(to, blend).normalize().applyQuaternion(modelRotation);
    aimInWorld(bone, child, target, strength);
  }

  function readForearmAxis(arm: Arm) {
    arm.forearm.getWorldPosition(origin);
    arm.hand.getWorldPosition(armAxis).sub(origin).normalize();
  }

  function palmCorrection(arm: Arm, { index, middle, pinky }: NonNullable<Arm['landmarks']>) {
    arm.hand.getWorldPosition(origin);
    middle.getWorldPosition(knuckles).sub(origin);
    pinky.getWorldPosition(origin);
    index.getWorldPosition(thumbSide).sub(origin);
    // The mirrored knuckle winding gives the opposite sign on the right hand.
    palmNormal.crossVectors(knuckles, thumbSide).multiplyScalar(-arm.side);
    palmNormal.addScaledVector(armAxis, -palmNormal.dot(armAxis)).normalize();
    target.copy(desiredPalm).addScaledVector(armAxis, -desiredPalm.dot(armAxis)).normalize();
    return Math.atan2(knuckles.crossVectors(palmNormal, target).dot(armAxis), palmNormal.dot(target));
  }

  function orientPalm(arm: Arm, from: THREE.Vector3, to: THREE.Vector3, blend: number) {
    const { landmarks } = arm;
    const twistWeight = strength * THREE.MathUtils.smoothstep(strength, .08, .80);
    if (!landmarks || !twistWeight) return;
    desiredPalm.copy(from).lerp(to, blend).normalize().applyQuaternion(modelRotation);

    readForearmAxis(arm);
    // Align the wrist before turning the palm, keeping the hand in line with the forearm.
    aimInWorld(arm.hand, landmarks.middle, armAxis, .94 * twistWeight);
    previousAim.copy(armAxis);
    const upperTwist = THREE.MathUtils.clamp(palmCorrection(arm, landmarks) * .26, -.45, .45) * twistWeight;
    arm.upper.getWorldPosition(origin);
    arm.forearm.getWorldPosition(armAxis).sub(origin).normalize();
    rotation.setFromAxisAngle(armAxis, upperTwist);
    applyWorldRotation(arm.upper);
    aimInWorld(arm.forearm, arm.hand, previousAim, 1);
    readForearmAxis(arm);
    const requestedRoll = palmCorrection(arm, landmarks) * twistWeight;
    const forearmTwist = THREE.MathUtils.clamp(requestedRoll, -motion.sleeveRoll, motion.sleeveRoll);
    rotation.setFromAxisAngle(armAxis, forearmTwist);
    applyWorldRotation(arm.forearm);
    // The historical sleeves share the forearm skin weights. Rotate the hand along its
    // aligned axis for the remaining supination so a hanging sleeve doesn't turn inside out.
    const handTwist = requestedRoll - forearmTwist;
    if (handTwist) {
      rotation.setFromAxisAngle(armAxis, handTwist);
      applyWorldRotation(arm.hand);
    }
  }

  function restore() {
    if (!applied) return;
    for (const { saved } of arms) for (const { bone, pose } of saved) bone.quaternion.copy(pose);
    applied = false;
  }

  function reset() {
    restore();
    elapsed = 0;
    strength = 0;
  }

  return {
    restore,
    reset,
    update(weight: number, seconds: number) {
      strength = THREE.MathUtils.clamp(weight, strength - seconds * 4.6, strength + seconds * 3.2);
      if (!strength) { elapsed = 0; return; }
      if (weight) elapsed += seconds;
      const time = elapsed % cycleDuration;
      const activeSide = Math.floor(elapsed / cycleDuration) % 2 ? -1 : 1;
      const beat = beats.findIndex(({ end }) => time < end);
      const sinceBeat = time - (beats[beat - 1]?.end ?? 0);
      const blend = THREE.MathUtils.smoothstep(sinceBeat, 0, beats[beat].blend);
      model.getWorldQuaternion(modelRotation);
      for (const arm of arms) {
        for (const { bone, pose } of arm.saved) pose.copy(bone.quaternion);
        const poseAt = (index: number) => index < 0 || (index === 1 && arm.side !== activeSide)
          ? arm.base : arm.poses[index];
        const from = poseAt(beat - 1), to = poseAt(beat);
        aim(arm.upper, arm.forearm, from.upper, to.upper, blend);
        aim(arm.forearm, arm.hand, from.forearm, to.forearm, blend);
        orientPalm(arm, from.palm, to.palm, blend);
        const open = THREE.MathUtils.lerp(from.fingers, to.fingers, blend) * strength;
        if (open) for (const { bone, relax } of arm.fingers) {
          bone.quaternion.premultiply(rotation.identity().slerp(relax, open));
        }
      }
      applied = true;
    },
  };
}
