import { MUSIC_LAYOUT_V4 } from './music-pavilion-rules-v004';
import { MIN_AUDIBLE_MUSIC_GAIN, musicSpatialGain, type MusicSpatialAudio } from './music-arrival-audio';
import {fromTerrainPoint,toTerrainPoint} from '../content/world/terrain-layout-v001';
import type { WorldPoint } from './types';

/** The same source/range used by the audible music, in its original local
 * frame. Moving or rotating the courtyard therefore also moves this encounter. */
export const terrainMusicSpatial:MusicSpatialAudio={
  source:MUSIC_LAYOUT_V4.audio.source,outerRadius:155,innerRadius:14,falloffExponent:4,
  gainMultiplier(point){
    // The relocated oasis is farther from the accepted courtyard ridge. Keep
    // its first uphill notes barely audible, with a quiet courtyard departure.
    const courtyard=fromTerrainPoint('courtyard',toTerrainPoint('music',point));
    const t=Math.max(0,Math.min(1,(courtyard.z-9)/4));
    // Release the departure mask after leaving the courtyard's east shoulder.
    // Applying its entrance plane to the whole world would mute the northward
    // relocated pavilion even while standing directly beside the musicians.
    const away=Math.max(0,Math.min(1,(courtyard.x-12)/18));
    return Math.max(t*t*(3-2*t),away*away*(3-2*away));
  },
};
/** Diagnostic range only. Encounter timing must use AudioContext evidence. */
export function terrainCanHearMusic(point:WorldPoint){return musicSpatialGain(point,terrainMusicSpatial)*.4>=MIN_AUDIBLE_MUSIC_GAIN;}
