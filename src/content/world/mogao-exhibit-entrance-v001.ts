import upper from './mogao-upper-v002.json';

const stairRoof = upper.solids.find(solid => solid.id === 'stair-top-ceiling')!;
const topLanding = upper.surfaces.find(surface => surface.id === 'landing-4')!;
const entrances = [
  { id: 'hall-a', title: '绘世厅', lintelId: 'a-south-lintel', near: ['flight-2', 'landing-2', 'hall-a'] },
  { id: 'hall-b', title: '佛法厅', lintelId: 'b-south-lintel', near: ['flight-4', 'landing-4', 'hall-b'] },
] as const;

export const MOGAO_ENTRANCE_JAMB = { width: .25, height: 1.37, path: 'mogao-exhibit/v006/entrance-jamb.webp' };
export const MOGAO_ENTRANCE_PATTERN = { width: 1.52, height: .88, path: 'mogao-exhibit/v007/entrance-scrollwork.webp' };

export const MOGAO_EXHIBIT_ENTRANCES = entrances.map(({ id, title, lintelId, near }) => {
  const lintel = upper.solids.find(solid => solid.id === lintelId)!;
  const room = upper.rooms.find(room => room.id === id)!;
  const x = (lintel.min[0] + lintel.max[0]) / 2, wallZ = lintel.min[2] - .009;
  const jambY = room.floorY + 2.04;
  // The upper stair canopy hides B's vertical lintel from the landing.
  const underRoof = id === 'hall-b';
  const margin = .02;
  const pattern = underRoof ? {
    center: [x, stairRoof.min[1] - .004, (topLanding.minZ + stairRoof.max[2]) / 2] as const,
    width: stairRoof.max[0] - stairRoof.min[0] - 2 * margin,
    height: stairRoof.max[2] - topLanding.minZ - 2 * margin,
  } : {
    center: [x, (lintel.min[1] + lintel.max[1]) / 2, lintel.min[2] - .004] as const,
    width: lintel.max[0] - lintel.min[0] - 2 * margin,
    height: lintel.max[1] - lintel.min[1] - 2 * margin,
  };
  return {
    id, title, near: near as readonly string[], underRoof, pattern,
    center: [x, underRoof ? stairRoof.min[1] - .009 : lintel.min[1] + .41, underRoof ? lintel.min[2] - .62 : wallZ] as const,
    width: 5.52, height: .70,
    path: `mogao-exhibit/v006/entrance-${id}.webp`,
    jambs: [[lintel.min[0] - .17, jambY, wallZ], [lintel.max[0] + .17, jambY, wallZ]] as const,
  };
});
