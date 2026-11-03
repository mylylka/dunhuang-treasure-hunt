import { MUSIC_LAYOUT_V4 } from './music-pavilion-rules-v004';
import { MIN_AUDIBLE_MUSIC_GAIN, musicSpatialGain, type MusicSpatialAudio } from './music-arrival-audio';
import {fromTerrainPoint,toTerrainPoint} from '../content/world/terrain-layout-v001';
import type { WorldPoint } from './types';

/** The same source/range used by the audible music, in its original local
 * frame. Moving or rotating the courtyard therefore also moves this encounter. */
export const terrainMusicSpatial:MusicSpatialAudio={
  source:MUSIC_LAYOUT_V4.audio.source,outerRadius:110,innerRadius:14,falloffExponent:4,
  gainMultiplier(point){
    // The new ninety-metre road leaves the real gate before climbing. A soft
    // mask keeps the old courtyard quiet while the first uphill notes emerge.
    const courtyard=fromTerrainPoint('courtyard',toTerrainPoint('music',point));
    const t=Math.max(0,Math.min(1,(courtyard.z-9)/4));
    return t*t*(3-2*t);
  },
};
/** Diagnostic range only. Encounter timing must use AudioContext evidence. */
export function terrainCanHearMusic(point:WorldPoint){return musicSpatialGain(point,terrainMusicSpatial)*.4>=MIN_AUDIBLE_MUSIC_GAIN;}
