import { fromTerrainPoint } from '../content/world/terrain-layout-v001';
import { upperFromWorld } from './mogao-upper-navigation';
import type { WorldPoint } from './types';

export type FirstGalleryStreamRegion = 'music' | 'cliff';
export type FirstGalleryVenue = 'courtyard' | FirstGalleryStreamRegion;
export type ConnectedGalleryResource = FirstGalleryVenue | 'cliff-galleries' | 'cliff-interior';

// Building and approach footprints in the same local coordinates as the
// existing navigation and progression gates. The outer bands prefetch while
// the paths themselves remain continuously walkable.
const regions = {
  courtyard: { minX: -42, maxX: 18, minZ: -41, maxZ: 24, prefetch: 45 },
  music: { minX: 22, maxX: 82, minZ: -44, maxZ: 16, prefetch: 55 },
  cliff: { minX: 82, maxX: 162, minZ: -139, maxZ: 34, prefetch: 90 },
} as const;

// Begin the larger music exhibits on the uphill bend, about 43 m of road
// before the location label switches to 月牙谷地 on the descent.
const CONNECTED_MUSIC_PREFETCH = 85;

function distanceToRegion(region: FirstGalleryVenue, position: WorldPoint) {
  const local = fromTerrainPoint(region, position);
  const bounds = regions[region];
  return Math.hypot(Math.max(0, bounds.minX - local.x, local.x - bounds.maxX),
    Math.max(0, bounds.minZ - local.z, local.z - bounds.maxZ));
}

export function firstGalleryStreamRegion(position: WorldPoint, prefetch = false, includeMusic = true, includeCliff = true): FirstGalleryStreamRegion | null {
  const musicDistance = includeMusic ? distanceToRegion('music', position) : Infinity;
  const cliffDistance = includeCliff ? distanceToRegion('cliff', position) : Infinity;
  if (musicDistance <= cliffDistance && musicDistance <= (prefetch ? regions.music.prefetch : 0)) return 'music';
  if (cliffDistance <= (prefetch ? regions.cliff.prefetch : 0)) return 'cliff';
  return null;
}

export function firstGalleryApproachVenue(position: WorldPoint, courtyardReady: boolean, musicUnlocked: boolean, cliffUnlocked = true): FirstGalleryVenue | null {
  if (!courtyardReady && distanceToRegion('courtyard', position) <= regions.courtyard.prefetch) return 'courtyard';
  return firstGalleryStreamRegion(position, true, musicUnlocked, cliffUnlocked);
}

export function firstGalleryEntryVenue(position: WorldPoint): FirstGalleryVenue | null {
  return distanceToRegion('courtyard', position) === 0 ? 'courtyard' : firstGalleryStreamRegion(position);
}

/** The same resources are required on a fresh crossing and an in-room restore. */
export function connectedGalleryEntryGroups(position: WorldPoint, surfaceId?: string | null): readonly ConnectedGalleryResource[] {
  if (surfaceId?.startsWith('music-')) return ['music'];
  if (surfaceId) {
    return surfaceId === 'ground' || surfaceId === 'entry-tunnel' || surfaceId.startsWith('view-')
      ? ['cliff-interior', 'cliff-galleries'] : ['cliff-galleries'];
  }
  const venue = firstGalleryEntryVenue(position);
  return venue ? [venue] : [];
}

export function connectedGalleryApproachGroups(position: WorldPoint, surfaceId: string | null | undefined, access: {
  courtyardReady: boolean; musicUnlocked: boolean; cliffUnlocked: boolean; buddhaGateOpen?: boolean; hallAGateOpen?: boolean;
}): readonly ConnectedGalleryResource[] {
  if (surfaceId?.startsWith('music-')) return access.musicUnlocked ? ['music'] : [];
  if (surfaceId && access.cliffUnlocked) {
    const entry = connectedGalleryEntryGroups(position, surfaceId);
    const { x, z } = upperFromWorld(position);
    if (surfaceId === 'ground' || surfaceId === 'entry-tunnel') return z >= -12 ? [...entry, 'cliff'] : entry;
    if (entry.includes('cliff-interior')) return entry;
    const nearViewingDoor = x <= 19 && z >= -17;
    const seeBuddha = surfaceId === 'flight-1' || surfaceId === 'landing-0' || surfaceId === 'stair-entry'
      || (surfaceId === 'hall-a' && (access.hallAGateOpen || nearViewingDoor))
      || (surfaceId === 'hall-b' && (access.buddhaGateOpen || nearViewingDoor));
    return seeBuddha ? [...entry, 'cliff-interior'] : entry;
  }
  const venue = firstGalleryApproachVenue(position, access.courtyardReady, access.musicUnlocked, access.cliffUnlocked);
  if (!venue && access.musicUnlocked && distanceToRegion('music', position) <= CONNECTED_MUSIC_PREFETCH) return ['music'];
  if (venue !== 'cliff') return venue ? [venue] : [];
  const { x, z } = fromTerrainPoint('cliff', position);
  return x >= 105 && x <= 139 && z < -49 ? ['cliff', 'cliff-interior', 'cliff-galleries'] : ['cliff'];
}
