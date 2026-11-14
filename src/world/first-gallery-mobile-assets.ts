import { TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, TERRAIN_TRAVELER_MODEL } from '../content/world/assets';

/** Only the connected three-gallery phone entry uses these lossless meshopt derivatives. */
export function firstGalleryModelPaths(phoneConnected: boolean) {
  return phoneConnected ? {
    courtyard: 'courtyard/v007/courtyard-meshopt-mobile.glb',
    traveler: 'traveler-tripo/v002/traveler-meshopt-mobile.glb',
  } : {
    courtyard: TERRAIN_FIRST_GALLERY_COURTYARD_MODEL,
    traveler: TERRAIN_TRAVELER_MODEL,
  };
}
