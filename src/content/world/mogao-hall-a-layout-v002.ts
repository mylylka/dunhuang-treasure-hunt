import { MOGAO_HALL_A_LAYOUT as previous } from './mogao-hall-a-layout-v001';

const bandits = previous.artwork.find(panel => panel.wall === 'D')!.rect;
const fireHouse = previous.artwork.find(panel => panel.wall === 'C')!.rect;

export const MOGAO_HALL_A_LAYOUT = {
  ...previous,
  titles: [
    { id: 'bandits', wall: 'D', rect: { x: bandits.x, y: bandits.y + bandits.h + .065, w: 3.48, h: .88 },
      path: 'mogao-hall-a/v001/title-bandits.webp' },
    { id: 'burning-house', wall: 'C', rect: { x: fireHouse.x, y: fireHouse.y + fireHouse.h + .075, w: 1.80, h: .80 },
      path: 'mogao-hall-a/v002/title-burning-house.webp' },
  ],
} as const;
