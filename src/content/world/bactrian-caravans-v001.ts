/** Scenic Bactrian caravans, world metres (X/Z ground, Y up).
 * These routes are outside the playable bounds and never modify dune geometry.
 * Existing environment-world/v001 single-hump camels remain independent.
 */
export const BACTRIAN_SPRITE = {
  asset: 'bactrian-caravan/v001/bactrian-camel.png',
  imageWidth: 1536,
  imageHeight: 1024,
  // Original image pixels, alpha > .5, exclusive maximum edges; no raster resampling.
  alphaBounds: {left: 28, top: 18, right: 1517, bottom: 999},
  alphaTest: .5,
} as const;

export const BACTRIAN_CARAVANS = [
  {
    id: 'north-high-ridge',
    points: [{x: 100, z: -201}, {x: 111, z: -201.3}, {x: 124, z: -200.2}, {x: 138, z: -197.3}],
    // Deliberately unequal intervals; each t is normalized arc distance.
    spacing: [0, .18, .365, .57, .78, 1],
    heights: [2.74, 2.56, 2.83, 2.65, 2.77, 2.91],
    tones: [0xffffff, 0xf5e8d5, 0xf6f0df, 0xe9dec9, 0xf8ecda, 0xffffff],
  },
  {
    id: 'north-low-ridge',
    points: [{x: 210, z: -198.5}, {x: 221, z: -196.8}, {x: 233, z: -193.6}, {x: 246, z: -190.7}],
    spacing: [0, .19, .39, .57, .79, 1],
    heights: [2.65, 2.81, 2.52, 2.74, 2.61, 2.87],
    tones: [0xf5eadb, 0xffffff, 0xeee1ca, 0xf9edda, 0xeee6d3, 0xffffff],
  },
  {
    id: 'south-curving-ridge',
    points: [{x: 266, z: 241.3}, {x: 281, z: 240.0}, {x: 296, z: 237.3}, {x: 312, z: 236.8}],
    spacing: [0, .15, .32, .48, .65, .83, 1],
    heights: [2.79, 2.62, 2.89, 2.67, 2.54, 2.83, 2.72],
    tones: [0xffffff, 0xefe3ce, 0xf8eddc, 0xffffff, 0xebe1ce, 0xf7ead7, 0xf3e8d6],
  },
] as const;
