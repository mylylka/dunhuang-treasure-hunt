/** Shared with runtime placement, player collision and camera collision. */
export const MUSIC_COURTYARD_TREE = {
  id: 'music-courtyard-tree',
  assetPath: 'music-courtyard-tree/v001/music-courtyard-tree.glb',
  placement: { x: 31.3, y: .035, z: -8.5, yaw: Math.PI, height: 34 },
  rootAnchor: { x: .009765625, z: -.013916015625 },
  sourceHeight: .95068359375,
  // Bounds are already rotated by placement.yaw, in the old music coordinates.
  // Use this asymmetric box instead of a broad circle near the entrance route.
  playerBounds: { min: [24.619, 0, -15.574], max: [37.981, 2.4, -1.426] },
  // Central connected mesh sections from 2.4–18m, sampled every 0.5m.
  // Camera uses this plus playerBounds, not the complete canopy as a solid box.
  trunkBounds: { min: [26.98, 2.4, -12.09], max: [34.83, 18, -2.93] },
  crownBounds: { min: [13.775, 0, -25.632], max: [49.524, 34, 7.637] },
} as const;

export interface MusicCourtyardRelocation {
  id: string;
  propIds: readonly string[];
  sourceMin: readonly [number, number, number];
  sourceMax: readonly [number, number, number];
  from: { x: number; z: number };
  to: { x: number; z: number };
  yaw: number;
}

export const MUSIC_COURTYARD_RELOCATIONS: readonly MusicCourtyardRelocation[] = [
  {
    id: 'left-banner-and-seating',
    propIds: ['music-table--1-0', 'music-bench--1-0', 'music-table--1-1', 'music-bench--1-1',
      'music-cloth-post-0', 'music-cloth-post-1', 'music-cloth-post-2'],
    sourceMin: [24.5, -.1, -26], sourceMax: [28.5, 8.5, -16],
    from: { x: 25, z: -21 }, to: { x: 29.9, z: 1.95 }, yaw: Math.PI / 2,
  },
  {
    id: 'flute-table-clear-tree-roots', propIds: ['music-flute-table'],
    sourceMin: [32.9, -.1, -8.8], sourceMax: [35.5, 1.8, -7.2],
    from: { x: 34.2, z: -8 }, to: { x: 28.8, z: -17.6 }, yaw: 0,
  },
  {
    id: 'front-pot-large', propIds: ['music-pot-0'],
    sourceMin: [30.4, -.1, -2.6], sourceMax: [31.6, 1.3, -1.4],
    from: { x: 31, z: -2 }, to: { x: 28.8, z: .55 }, yaw: 0,
  },
  {
    id: 'front-pot-small', propIds: ['music-pot-1'],
    sourceMin: [29.45, -.1, -2.85], sourceMax: [30.35, .8, -1.95],
    from: { x: 29.9, z: -2.4 }, to: { x: 28.8, z: -.5 }, yaw: 0,
  },
];

export function relocatedMusicPoint(point: { x: number; z: number }, relocation: MusicCourtyardRelocation) {
  const c = Math.cos(relocation.yaw), s = Math.sin(relocation.yaw);
  const x = point.x - relocation.from.x, z = point.z - relocation.from.z;
  return { x: relocation.to.x + c * x + s * z, z: relocation.to.z - s * x + c * z };
}

export function musicCourtyardRelocationForProp(id: string) {
  return MUSIC_COURTYARD_RELOCATIONS.find(item => item.propIds.includes(id));
}
