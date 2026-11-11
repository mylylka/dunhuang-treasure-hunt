import { firstGalleryNarration, galleryNarrationHoldSeconds, type FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import type { SoundPreferences } from '../services/sound-settings';
import { createRecordedNarration } from './recorded-narration';

export function createFirstGalleryNarration(initial: SoundPreferences) {
  return createRecordedNarration<'cue' | 'mural' | 'caisson', FirstGalleryNarrationId>(
    initial, firstGalleryNarration, galleryNarrationHoldSeconds);
}
