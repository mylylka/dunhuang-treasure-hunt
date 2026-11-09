import upperLayout from './mogao-upper-v002.json';

export type MogaoHallAStoryId = 'bandits' | 'burning-house';
export type MogaoHallAWallId = 'A' | 'B' | 'C' | 'D';
export type MogaoHallARect = Readonly<{ x: number; y: number; w: number; h: number }>;

const room = upperLayout.rooms.find(room => room.id === 'hall-a')!;
const [minX, , minZ] = room.min;
const [maxX, , maxZ] = room.max;
const width = maxX - minX;
const depth = maxZ - minZ;
const banditsCuts = [0, 1002, 2372, 4203] as const;
const banditsScale = depth / (banditsCuts[2] - banditsCuts[1]);
const banditsHeight = 602 * banditsScale;
const banditsY = .45;
const houseWidth = 7.02;
const houseHeight = houseWidth * 1311 / 2560;

export const MOGAO_HALL_A_LAYOUT = {
  floorY: room.floorY,
  height: room.clearHeight,
  walls: {
    D: { x: minX, z: minZ, yaw: 0, width },
    A: { x: maxX, z: minZ, yaw: -Math.PI / 2, width: depth },
    B: { x: maxX, z: maxZ, yaw: Math.PI, width },
    C: { x: minX, z: maxZ, yaw: Math.PI / 2, width: depth },
  },
  openings: {
    D: { x: .90, y: 0, w: 6, h: 3.20 },
    C: { x: 0, y: 0, w: 2, h: 3.10 },
  },
  artwork: [
    ...(['D', 'A', 'B'] as const).map((wall, index) => {
      const left = banditsCuts[index], right = banditsCuts[index + 1];
      const w = (right - left) * banditsScale;
      return {
        wall, id: 'bandits' as const,
        rect: { x: wall === 'D' ? width - w : 0, y: banditsY, w, h: banditsHeight },
        crop: [left / banditsCuts[3], right / banditsCuts[3]] as const,
        lamps: [3, 4, 5][index],
      };
    }),
    {
      wall: 'C', id: 'burning-house',
      rect: { x: 2.46, y: banditsY + (banditsHeight - houseHeight) / 2, w: houseWidth, h: houseHeight },
      crop: [0, 1], lamps: 3,
    },
  ] as const,
  titles: [
    { id: 'bandits', wall: 'D', rect: { x: 3.20, y: 4.20, w: 3.48, h: .88 } },
    { id: 'burning-house', wall: 'C', rect: { x: .10, y: 3.46, w: 1.80, h: .94 } },
  ] as const,
  plaque: { x: .35, y: 4.005, w: 2.45, h: 1.30 },
} as const;

export function isMogaoHallAApproach(surfaceId?: string | null) {
  return surfaceId === 'flight-1' || surfaceId === 'landing-1' || surfaceId === 'flight-2' || surfaceId === 'landing-2'
    || surfaceId === 'hall-a' || surfaceId === 'view-link-a' || surfaceId === 'view-a';
}
