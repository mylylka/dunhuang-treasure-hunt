import type { UpperSolid } from '../../world/mogao-upper-navigation';
import type { MusicInstrumentId } from './music-instruments-v001';

type Vec3 = readonly [number, number, number];
type Vec2 = readonly [number, number];
type HitVolume = { min: Vec3; max: Vec3 } | { from: Vec2; to: Vec2; radius: number; depth: Vec2 };
type InstrumentTarget = { id: MusicInstrumentId; aim: Vec3; volumes: readonly HitVolume[] };
type GroupId = 'strings' | 'winds' | 'percussion';
type Placement = { id: GroupId; position: Vec3; width: number; yaw: number; targets: readonly InstrumentTarget[] };
export type MusicInstrumentDisplayGroup = Placement & { scale: number };

const FLOOR = 7.915375;
const MODEL_WIDTH = .99951171875;

// Original glTF axes, before the placement transform. All three source fronts face +Z.
// The touch surface is the real mesh; these volumes distinguish instruments from furniture.
const placements: readonly Placement[] = [
  {
    id: 'strings', position: [35.50, FLOOR, -24.85], width: 5.10, yaw: Math.PI / 2,
    targets: [
      { id: 'pipa', aim: [-.434, .173, .02393], volumes: [{ min: [-.495, .103, -.085], max: [-.369, .429, .075] }] },
      { id: 'ruan', aim: [-.284, .173, .02005], volumes: [{ min: [-.362, .104, -.09], max: [-.201, .428, .075] }] },
      { id: 'zheng', aim: [.035, .212, .00859], volumes: [{ min: [-.196, .17, -.121], max: [.282, .246, .121] }] },
      { id: 'konghou', aim: [.332, .404, .04175], volumes: [{ min: [.296, .069, -.106], max: [.5, .484, .121] }] },
    ],
  },
  {
    id: 'winds', position: [41.31, FLOOR, -31.30], width: 3.525, yaw: 0,
    targets: [
      { id: 'xun', aim: [-.346, .396, -.00684], volumes: [{ min: [-.411, .328, -.108], max: [-.286, .456, .027] }] },
      { id: 'sheng', aim: [-.104, .507, -.06589], volumes: [
        { min: [-.171, .353, -.162], max: [-.043, .747, .037] },
        { min: [-.067, .396, -.158], max: [.017, .444, .05] },
      ] },
      { id: 'dizi', aim: [.01, .257, .12136], volumes: [{ min: [-.262, .24, .083], max: [.251, .274, .142] }] },
      { id: 'bili', aim: [.162, .525, -.07789], volumes: [
        { from: [.116, .343], to: [.195, .631], radius: .017, depth: [-.123, -.062] },
      ] },
      { id: 'conch', aim: [.402, .398, -.05692], volumes: [
        { min: [.252, .345, -.116], max: [.501, .459, .027] },
        { min: [.267, .305, -.116], max: [.487, .345, -.022] },
      ] },
    ],
  },
  {
    id: 'percussion', position: [37.059, FLOOR, -29.861], width: 4.50, yaw: Math.PI / 4,
    targets: [
      { id: 'paiban', aim: [-.416, .235, .03885], volumes: [{ min: [-.474, .154, -.06], max: [-.299, .314, .08] }] },
      { id: 'jiegu', aim: [-.085, .407, .07091], volumes: [{ min: [-.244, .294, -.116], max: [.198, .523, .116] }] },
      { id: 'cymbals', aim: [.319, .229, .00989], volumes: [
        { min: [.266, .179, -.042], max: [.384, .298, .031] },
        { min: [.345, .179, -.042], max: [.469, .298, .038] },
      ] },
    ],
  },
];

export const MUSIC_INSTRUMENT_DISPLAY_GROUPS: readonly MusicInstrumentDisplayGroup[] =
  placements.map(group => ({ ...group, scale: group.width / MODEL_WIDTH }));

// Posed vertex bounds after the 1.5× placement change. Overlapping strips follow
// the diagonal stand without blocking the empty corners of its bounding box.
export const MUSIC_INSTRUMENT_DISPLAY_SOLIDS: readonly UpperSolid[] = [
  { id: 'music-instruments-strings', min: [34.885, FLOOR, -27.400], max: [36.115, 10.366, -22.300] },
  { id: 'music-instruments-winds', min: [39.547, FLOOR, -32.071], max: [43.073, 10.543, -30.529] },
  { id: 'music-instruments-percussion-west', min: [35.187, FLOOR, -29.392], max: [36.590, 9.739, -27.956] },
  { id: 'music-instruments-percussion-center', min: [35.811, FLOOR, -30.943], max: [38.141, 10.263, -28.613] },
  { id: 'music-instruments-percussion-north', min: [37.381, FLOOR, -31.742], max: [38.940, 9.882, -30.183] },
];

export function isMusicInstrumentDisplayApproach(surfaceId?: string | null) {
  return surfaceId === 'music-stair' || surfaceId === 'music-floor-2' || surfaceId === 'music-gallery';
}

export function musicInstrumentAtPoint(group: MusicInstrumentDisplayGroup, { x, y, z }: { x: number; y: number; z: number }) {
  return group.targets.find(target => target.volumes.some(volume => {
    if ('min' in volume) {
      const { min, max } = volume;
      return x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2];
    }
    if (z < volume.depth[0] || z > volume.depth[1]) return false;
    const [ax, ay] = volume.from;
    const dx = volume.to[0] - ax, dy = volume.to[1] - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= volume.radius;
  }))?.id ?? null;
}
