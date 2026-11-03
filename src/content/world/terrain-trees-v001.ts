/** User-supplied GLBs. Measurements are metres after uniform scaling to 25 m. */
export interface TerrainTreeBounds {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface TerrainTowerTree {
  id: string;
  assetPath: string;
  /** Positions use the original cliff coordinate system, before region yaw. */
  placement: { x: number; z: number; yaw: number; height: number };
  collisionRadii: { player: number; camera: number };
  lowBounds: TerrainTreeBounds;
  /** Conservative envelope of the complete original mesh, including roots. */
  crownBounds: TerrainTreeBounds;
  triangles: number;
}

export const TERRAIN_TOWER_TREES: readonly TerrainTowerTree[] = [
  {
    id: 'tower-tree-stylized',
    assetPath: 'tower-trees/v001/stylized-tree.glb',
    placement: { x: 96, z: -30, yaw: 0, height: 25 },
    collisionRadii: { player: 4.68, camera: 7.984 },
    lowBounds: { min: [-3.072, 0, -1.265], max: [2.107, 2.4, 4.330] },
    crownBounds: { min: [-6.821, 0, -6.211], max: [6.821, 25, 6.211] },
    triangles: 45490,
  },
  {
    id: 'tower-tree-broad',
    assetPath: 'tower-trees/v001/broad-tree.glb',
    placement: { x: 148, z: -15, yaw: 0, height: 25 },
    collisionRadii: { player: 5.46, camera: 10.950 },
    lowBounds: { min: [-3.866, 0, -3.219], max: [3.903, 2.4, 4.757] },
    crownBounds: { min: [-10.937, 0, -7.750], max: [10.937, 25, 7.750] },
    triangles: 58726,
  },
];
