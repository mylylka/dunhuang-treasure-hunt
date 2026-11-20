import type { AnimationClip } from 'three';

/** Adapt the supplied Tripo clips without changing the source GLB. The game
 * moves the player itself, so forward root motion must not move the mesh a
 * second time, away from its collision position. */
export function tripoTravelerClips(source: readonly AnimationClip[]): AnimationClip[] {
  const sourceByName = new Map(source.map(clip => [clip.name, clip]));
  const names = {
    Idle: 'standing_relax.001', Walk: 'walk.001', Run: 'run.001',
    LookAround: 'look_around.001', Greeting: 'look_around.001', HallLookUp: 'look_around.001',
  } as const;
  const idle = sourceByName.get(names.Idle);
  const hips = idle?.tracks.find(track => /(?:^|\.)?mixamorigHips\.position$/i.test(track.name));
  if (!hips || hips.values.length < 3) throw new Error('tripo-traveler-idle-hips-missing');
  const originX = hips.values[0], originZ = hips.values[2];
  return Object.entries(names).map(([name, original]) => {
    const clip = sourceByName.get(original);
    if (!clip) throw new Error(`tripo-traveler-animation-missing:${original}`);
    const adapted = clip.clone();
    adapted.name = name;
    if (name === 'Walk' || name === 'Run') {
      const root = adapted.tracks.find(track => /(?:^|\.)?mixamorigHips\.position$/i.test(track.name));
      if (!root || root.values.length < 3 || root.values.length % 3 !== 0) throw new Error(`tripo-traveler-root-missing:${name}`);
      const xOffset = originX - root.values[0];
      for (let i = 0; i < root.values.length; i += 3) {
        root.values[i] += xOffset;
        root.values[i + 2] = originZ;
      }
    }
    return adapted;
  });
}
