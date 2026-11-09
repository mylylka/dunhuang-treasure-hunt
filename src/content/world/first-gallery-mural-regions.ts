export const FIRST_GALLERY_MURAL_SIZE = [2168, 725] as const;

export interface FirstGalleryMuralRegion {
  id: string;
  /** Pixel coordinates in the registered complete mural, origin at top left. */
  anchor: readonly [x: number, y: number];
  /** Encloses the two masks' nonzero pixels. Right and bottom are exclusive. */
  crop: readonly [left: number, top: number, right: number, bottom: number];
  restoreMask: string;
  traceMask: string;
}

function region(id: string, anchor: FirstGalleryMuralRegion['anchor'], crop: FirstGalleryMuralRegion['crop']): FirstGalleryMuralRegion {
  return {
    id, anchor, crop,
    restoreMask: `first-gallery/v001/mural-restore-${id}.png`,
    traceMask: `first-gallery/v001/mural-trace-${id}.png`,
  };
}

export const FIRST_GALLERY_MURAL_REGIONS = {
  lotus: [region('lotus-center', [1083, 362], [655, 14, 1513, 700])],
  bird: [
    region('bird-left', [597, 173], [175, 5, 811, 358]),
    region('bird-right', [1568, 172], [1357, 5, 1993, 358]),
  ],
  grapes: [
    region('grapes-left', [443, 505], [209, 297, 765, 671]),
    region('grapes-right', [1724, 505], [1403, 297, 1959, 671]),
  ],
} as const;
