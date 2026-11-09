import clips from './first-gallery-narration-v001.json';
import type { GalleryLine, GalleryTarget } from './first-gallery-v001';

export type FirstGalleryNarrationId = keyof typeof clips;
export type FirstGalleryNarrationEnd = 'finished' | 'skipped';
export const firstGalleryNarration = clips;

export function galleryNarrationHoldSeconds(reason: FirstGalleryNarrationEnd) {
  return reason === 'skipped' ? 1 : 2;
}

export function galleryNarratedLine(narration: FirstGalleryNarrationId, target: GalleryTarget): GalleryLine {
  const { text, duration } = firstGalleryNarration[narration];
  return { text, target, duration, narration };
}
