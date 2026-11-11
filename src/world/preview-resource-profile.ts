import { fromTerrainPoint } from '../content/world/terrain-layout-v001';
import { terrainRegionAt } from './terrain-rules-v001';
import { upperFromWorld } from './mogao-upper-navigation';
import type { WorldPoint } from './types';

type PreviewMode = 'first-gallery' | 'music' | 'cliff' | 'terrain' | 'courtyard' | 'standalone';
export type PreviewResourceGroup = 'courtyard' | 'music' | 'cliff' | 'cliff-interior' | 'cliff-galleries' | 'scenery';

export interface WorldPreviewResourceProfile {
  mode: PreviewMode;
  starts: readonly string[];
  approaches: readonly string[];
  interactions: readonly string[];
  /** Earlier music and cave samples deliberately include a courtyard route. */
  courtyardRoute?: boolean;
}

const profiles = {
  'first-gallery': {
    mode: 'first-gallery', starts: ['traveler', 'courtyard or restored region'],
    approaches: ['unlocked music', 'unlocked cliff', 'current cave segment', 'scenery'],
    interactions: ['first-gallery activities', 'music hall activities', 'Mogao exhibit activities'],
  },
  'music-local': {
    mode: 'music', starts: ['traveler', 'music'], approaches: ['music court and interior'],
    interactions: ['music narration', 'flying mural'],
  },
  'music-interior-instruments': {
    mode: 'music', starts: ['traveler', 'music', 'guide plain outfit'], approaches: ['music court and interior', 'instrument groups on the upper stairs'],
    interactions: ['music narration', 'flying mural', 'current and next flying history chapter and selected narrator', 'guide lines', 'current costume mural', 'selected costume model', 'selected instrument mural and recording', 'earned music folio and visible thumbnails'],
  },
  'music-route': {
    mode: 'music', courtyardRoute: true, starts: ['traveler', 'courtyard or music'],
    approaches: ['courtyard', 'music'], interactions: ['music narration', 'flying mural'],
  },
  'cliff-upper': {
    mode: 'cliff', starts: ['traveler', 'upper hall and stairs', 'current cave segment'],
    approaches: ['cliff', 'cliff-interior'], interactions: ['cave story'],
  },
  'cliff-exhibit': {
    mode: 'cliff', starts: ['traveler', 'upper hall and stairs', 'current cave segment'],
    approaches: ['cliff', 'cliff-interior', 'A hall murals on the first ascent', 'B hall artwork on the second ascent', 'entrance signs at their door approaches'],
    interactions: ['cave story', 'current A hall story detail', 'B hall artwork viewer', 'scroll'],
  },
  'cliff-route': {
    mode: 'cliff', courtyardRoute: true, starts: ['traveler', 'current cave segment or courtyard'],
    approaches: ['cliff', 'cliff-interior', 'courtyard'], interactions: ['cave story'],
  },
  terrain: {
    mode: 'terrain', starts: ['traveler', 'terrain', 'restored region'],
    approaches: ['courtyard', 'music', 'cliff', 'cliff-interior', 'scenery'], interactions: ['area story and activities'],
  },
  courtyard: {
    mode: 'courtyard', starts: ['traveler', 'courtyard'], approaches: [], interactions: ['character scenes'],
  },
  'environment-study': {
    mode: 'standalone', starts: ['environment comparison and its reference'], approaches: [], interactions: [],
  },
  'traveler-study': {
    mode: 'standalone', starts: ['traveler comparison and its reference'], approaches: [], interactions: [],
  },
  'local-study': {
    mode: 'standalone', starts: ['study geometry and its own materials'], approaches: [], interactions: [],
  },
} as const satisfies Record<string, WorldPreviewResourceProfile>;

export const TERRAIN_RESOURCE_PROFILE: WorldPreviewResourceProfile = profiles.terrain;

export function worldPreviewResourceProfile(path: string, declaredEntry?: string): WorldPreviewResourceProfile | undefined {
  const entry = declaredEntry ?? path.split('/').at(-1);
  switch (entry) {
    case 'first-gallery-v001.html': return profiles['first-gallery'];
    case 'music-companion-v001.html': return profiles['music-local'];
    case 'music-companion-v002.html': return profiles['music-interior-instruments'];
    case 'mogao-upper-v001.html':
    case 'mogao-upper-v002.html': return profiles['cliff-upper'];
    case 'mogao-exhibit-v001.html': return profiles['cliff-exhibit'];
    case 'mogao-story-v002.html': return profiles['cliff-route'];
    case 'character-cinematics-v001.html': return profiles.courtyard;
    case 'flying-voice-v001.html': return profiles['music-route'];
    case 'environment-preview.html':
    case 'environment-preview-v002.html':
    case 'environment-preview-v003.html': return profiles['environment-study'];
    case 'traveler-preview-v001.html': return profiles['traveler-study'];
    case 'mogao-massing-v001.html':
    case 'mogao-massing-v002.html':
    case 'mogao-massing-v003.html':
    case 'mogao-sandstone-v001.html':
    case 'sandstone-study-v001.html':
    case 'water-study-v001.html': return profiles['local-study'];
  }
  if (/^music-pavilion-v00[1-6]\.html$/.test(entry ?? '')) return profiles['music-route'];
  if (/^mogao-v0(?:0[1-9]|1[0-3])\.html$/.test(entry ?? '')) return profiles['cliff-route'];
  if (/^terrain-v0(?:0[1-9]|1[0-3])\.html$/.test(entry ?? '')) return TERRAIN_RESOURCE_PROFILE;
  return undefined;
}

interface ResourcePosition {
  profile: WorldPreviewResourceProfile;
  position: WorldPoint;
  terrain: boolean;
  upper: boolean;
  exhibit?: boolean;
  surfaceId?: string | null;
}

/** Initial and next positions use the same required-content classifier. */
export function previewRegionAt({ profile, position, terrain, upper, exhibit, surfaceId }: ResourcePosition): PreviewResourceGroup | null {
  if (profile.mode === 'music' && !profile.courtyardRoute) return 'music';
  if (profile.mode === 'courtyard') return 'courtyard';
  if (upper && profile.mode === 'cliff' && surfaceId) {
    if (surfaceId === 'ground' || surfaceId === 'entry-tunnel' || surfaceId === 'view-a' || surfaceId === 'view-link-a' ||
        (exhibit && (surfaceId === 'view-b' || surfaceId === 'view-link-b'))) return 'cliff-interior';
    return null;
  }
  const region = terrain ? terrainRegionAt(position) : null;
  const cliff = terrain ? fromTerrainPoint('cliff', position) : position;
  if ((profile.mode === 'cliff' || profile.mode === 'terrain') && cliff.x >= 95 && cliff.x <= 152 && cliff.z < -72) {
    return 'cliff-interior';
  }
  if (profile.mode === 'terrain') return region;
  if (profile.courtyardRoute && !terrain && position.x >= -42 && position.x <= 9 && position.z >= -34 && position.z <= 23) {
    return 'courtyard';
  }
  if (profile.mode === 'music') return 'music';
  if (profile.mode === 'cliff') return 'cliff';
  return null;
}

export function previewApproachRegions(context: ResourcePosition, buddhaGateOpen = true, hallAGateOpen?: boolean): readonly PreviewResourceGroup[] {
  const { profile, terrain, position, upper, surfaceId } = context;
  const required = previewRegionAt(context);
  if (profile.mode === 'cliff' && upper && surfaceId) {
    const local = upperFromWorld(position);
    if (surfaceId === 'ground' || surfaceId === 'entry-tunnel') {
      return local.z >= -12 ? ['cliff-interior', 'cliff'] : ['cliff-interior'];
    }
    if (surfaceId === 'hall-a' || surfaceId === 'hall-b') {
      const nearView = local.x <= 19 && local.z >= -17;
      if (surfaceId === 'hall-a') return (hallAGateOpen ?? nearView) ? ['cliff-interior'] : [];
      return nearView || buddhaGateOpen ? ['cliff-interior'] : [];
    }
    if (surfaceId === 'flight-1' || surfaceId === 'landing-0' || surfaceId === 'stair-entry' || surfaceId.startsWith('view-')) return ['cliff-interior'];
    return [];
  }
  if (profile.mode === 'terrain') {
    if (!terrain) return [];
    const courtyard = fromTerrainPoint('courtyard', position);
    const music = fromTerrainPoint('music', position);
    const cliff = fromTerrainPoint('cliff', position);
    if (required === 'cliff-interior' || (cliff.x >= 105 && cliff.x <= 139 && cliff.z < -56)) {
      return ['cliff', 'cliff-interior'];
    }
    if (required === 'cliff' || (cliff.x >= 55 && cliff.x <= 185 && cliff.z <= 40 && cliff.z >= -148)) return ['cliff'];
    if (required === 'music' || (music.x >= -20 && music.x <= 104 && music.z >= -72 && music.z <= 49)) return ['music'];
    if (required === 'courtyard' || (courtyard.x >= -64 && courtyard.x <= 42 && courtyard.z >= -61 && courtyard.z <= 47)) return ['courtyard'];
    return ['scenery'];
  }
  if (profile.mode === 'cliff') {
    const cliff = terrain ? fromTerrainPoint('cliff', position) : position;
    if (cliff.x >= 105 && cliff.x <= 139 && cliff.z < -56) return ['cliff', 'cliff-interior'];
  }
  if (profile.mode === 'music' && profile.courtyardRoute && position.x >= 1 && position.x <= 9) return ['courtyard', 'music'];
  return required ? [required] : [];
}
