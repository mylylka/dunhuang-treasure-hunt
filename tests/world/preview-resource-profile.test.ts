import { describe, expect, it } from 'vitest';
import { TERRAIN_ANCHORS, TERRAIN_ROUTES, TERRAIN_SPAWN, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import { connectedGalleryApproachGroups, connectedGalleryEntryGroups, firstGalleryApproachVenue, firstGalleryEntryVenue, firstGalleryStreamRegion } from '../../src/world/first-gallery-streaming';
import { upperToWorld } from '../../src/world/mogao-upper-navigation';
import { previewApproachRegions, previewRegionAt, worldPreviewResourceProfile } from '../../src/world/preview-resource-profile';

describe('preview resource scopes', () => {
  it('identifies a renamed standalone build without changing the regular entry', () => {
    expect(worldPreviewResourceProfile('/index.html')).toBeUndefined();
    expect(worldPreviewResourceProfile('/index.html', 'terrain-v013.html')?.mode).toBe('terrain');
    expect(worldPreviewResourceProfile('/traveler-preview-v001.html')?.mode).toBe('standalone');
  });

  it('keeps a direct B hall launch independent of the cave exterior and other galleries', () => {
    const profile = worldPreviewResourceProfile('/mogao-exhibit-v001.html')!;
    const position = upperToWorld({ x: 22, y: 19.58, z: -16 });
    const context = { profile, position, terrain: true, upper: true, surfaceId: 'hall-b' };
    expect(previewRegionAt(context)).toBeNull();
    expect(previewApproachRegions(context, false)).toEqual([]);
    expect(previewApproachRegions(context, true)).toEqual(['cliff-interior']);
    expect(previewRegionAt({ ...context, surfaceId: 'view-link-b' })).toBeNull();
    expect(previewRegionAt({ ...context, exhibit: true, surfaceId: 'view-link-b' })).toBe('cliff-interior');
    expect(previewRegionAt({ ...context, exhibit: true, surfaceId: 'view-b' })).toBe('cliff-interior');
    expect(previewApproachRegions({ ...context, surfaceId: 'view-link-b' })).toEqual(['cliff-interior']);
  });

  it('prepares the same lower cave resources while descending or starting on the ground floor', () => {
    const profile = worldPreviewResourceProfile('/mogao-upper-v002.html')!;
    const position = upperToWorld({ x: 16.5, y: 0.024, z: -23 });
    const context = { profile, position, terrain: true, upper: true, surfaceId: 'ground' };
    expect(previewRegionAt(context)).toBe('cliff-interior');
    expect(previewApproachRegions({ ...context, surfaceId: 'flight-1' })).toEqual(['cliff-interior']);
  });

  it('keeps the companion preview in music and restores the full map by region', () => {
    const position = toTerrainPoint('cliff', { x: 122, z: -86 });
    const context = { position, terrain: true, upper: false };
    const music = worldPreviewResourceProfile('/music-companion-v002.html')!;
    expect(previewRegionAt({ ...context, profile: music })).toBe('music');
    const terrain = worldPreviewResourceProfile('/terrain-v013.html')!;
    expect(previewRegionAt({ ...context, profile: terrain })).toBe('cliff-interior');
    expect(previewRegionAt({ ...context, profile: terrain,
      position: toTerrainPoint('courtyard', { x: -12, z: 1 }),
    })).toBe('courtyard');
  });

  it('chooses a restored first-gallery region and loads the courtyard when returning', () => {
    const music = toTerrainPoint('music', { x: 45, z: 0 });
    const cliff = toTerrainPoint('cliff', { x: 84, z: -50 });
    const approach = toTerrainPoint('courtyard', { x: -12, z: 40 });
    const entrance = toTerrainPoint('courtyard', { x: -12, z: 6.8 });
    expect(firstGalleryStreamRegion(music)).toBe('music');
    expect(firstGalleryStreamRegion(cliff)).toBe('cliff');
    expect(firstGalleryStreamRegion(entrance)).toBeNull();
    expect(firstGalleryApproachVenue(approach, false, true)).toBe('courtyard');
    expect(firstGalleryEntryVenue(approach)).toBeNull();
    expect(firstGalleryEntryVenue(entrance)).toBe('courtyard');
  });

  it('requires approach as well as the first-gallery unlock before loading the music venue', () => {
    const entrance = toTerrainPoint('courtyard', { x: -12, z: 6.8 });
    const approach = toTerrainPoint('music', { x: 17, z: 0 });
    expect(firstGalleryApproachVenue(entrance, true, true)).not.toBe('music');
    expect(firstGalleryApproachVenue(approach, true, false)).not.toBe('music');
    expect(firstGalleryApproachVenue(approach, true, true)).toBe('music');
  });

  it('loads only the combined map venue needed at a saved position', () => {
    expect(connectedGalleryEntryGroups(TERRAIN_SPAWN)).toEqual(['courtyard']);
    expect(connectedGalleryEntryGroups(TERRAIN_ANCHORS.musicSafe, 'music-floor-2')).toEqual(['music']);
    expect(connectedGalleryEntryGroups(TERRAIN_ANCHORS.cliffStairFoot)).toEqual(['cliff']);
    const room = upperToWorld({ x: 22, y: 19.58, z: -16 });
    expect(connectedGalleryEntryGroups(room, 'hall-b')).toEqual(['cliff-galleries']);
    expect(connectedGalleryEntryGroups(room, 'view-b')).toEqual(['cliff-interior', 'cliff-galleries']);
    expect(connectedGalleryEntryGroups(room, 'ground')).toEqual(['cliff-interior', 'cliff-galleries']);
  });

  it('prefetches music exhibits from the uphill bend before 月牙谷地', () => {
    const route = TERRAIN_ROUTES[0].points;
    const bend = route.find(point => point.x >= 120)!;
    const valley = route.find(point => point.x >= 160)!;
    const access = { courtyardReady: true, musicUnlocked: true, cliffUnlocked: false };
    expect(connectedGalleryApproachGroups(TERRAIN_SPAWN, null, access)).toEqual([]);
    expect(connectedGalleryApproachGroups(bend, null, { ...access, musicUnlocked: false })).toEqual([]);
    expect(connectedGalleryApproachGroups(bend, null, access)).toEqual(['music']);
    expect(connectedGalleryApproachGroups(valley, null, access)).toEqual(['music']);
    expect(connectedGalleryEntryGroups(valley)).toEqual([]);
  });

  it('prefetches eligible combined venues on approach, then prepares the local cave assets', () => {
    const access = { courtyardReady: true, musicUnlocked: false, cliffUnlocked: false };
    const musicApproach = toTerrainPoint('music', { x: 17, z: 0 });
    expect(connectedGalleryApproachGroups(musicApproach, null, access)).toEqual([]);
    expect(connectedGalleryApproachGroups(musicApproach, null, { ...access, musicUnlocked: true })).toEqual(['music']);
    expect(connectedGalleryApproachGroups(TERRAIN_ANCHORS.cliffStairFoot, null, access)).toEqual([]);
    const cliffAccess = { ...access, musicUnlocked: true, cliffUnlocked: true };
    expect(connectedGalleryApproachGroups(TERRAIN_ANCHORS.cliffStairFoot, null, cliffAccess)).toEqual(['cliff']);
    expect(connectedGalleryApproachGroups(TERRAIN_ANCHORS.cliffDoor, null, cliffAccess)).toEqual(['cliff', 'cliff-interior', 'cliff-galleries']);
    const hall = upperToWorld({ x: 22, y: 19.58, z: -16 });
    expect(connectedGalleryApproachGroups(hall, 'hall-b', cliffAccess)).toEqual(['cliff-galleries']);
    expect(connectedGalleryApproachGroups(hall, 'hall-b', { ...cliffAccess, buddhaGateOpen: true })).toEqual(['cliff-galleries', 'cliff-interior']);
  });
});
