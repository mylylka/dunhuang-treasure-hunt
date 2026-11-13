import { z } from 'zod';
import { fromTerrainPoint } from '../content/world/terrain-layout-v001';
import { PATTERN_STATIONS } from '../world/pattern-interactives';
import { isTerrainWalkable } from '../world/terrain-rules-v001';
import type { RegionColors, RegionMaterials } from '../types';
import type { WorldCheckpoint } from '../world/types';
import type { StorageLike } from './progress';

export const FIRST_GALLERY_WORLD_SESSION_KEY = 'dunhuang:first-gallery-world:v1';
export const CAISSON_ONLY_WORLD_SESSION_KEY = 'dunhuang:first-gallery-caisson-world:v1';
export const FIRST_GALLERY_MURAL_MARKER_KEY = 'dunhuang:first-gallery-mural-marker:v1';
export const FIRST_GALLERY_EASEL_LEVEL = 'coloring-feitian-lotus';
export const FIRST_GALLERY_ENTRY_KEY = 'dunhuang:first-gallery-easel:v1';
export const FIRST_GALLERY_ENTRY_CLAIM = 'dunhuangFirstGalleryEasel';
const checkpointSchema = z.object({
  version: z.literal(1),
  position: z.object({ x: z.number().finite(), z: z.number().finite() }),
  heading: z.number().finite(),
  cameraYaw: z.number().finite(),
  visitedEvents: z.array(z.enum(['caisson', 'story-demo', 'novice-story', 'flying'])),
  walkSurface: z.string().max(128).optional(),
});
const entrySchema = z.object({
  version: z.literal(1),
  token: z.string().regex(/^[a-f0-9]{32}$/),
  levelId: z.literal(FIRST_GALLERY_EASEL_LEVEL),
  artworkVersion: z.string().min(1),
  sourceArtworkId: z.string().min(1).optional(),
  draft: z.object({
    colors: z.record(z.string().regex(/^[1-9]\d*$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)),
    materials: z.record(z.string().regex(/^[1-9]\d*$/), z.enum(['sparkle-gold-v001', 'sparkle-silver-v001'])),
  }).optional(),
  checkpoint: checkpointSchema,
});
export type FirstGalleryColoringEntry = z.infer<typeof entrySchema>;

export function newGallerySubmissionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
}

function isEaselReturnPoint(checkpoint: WorldCheckpoint): boolean {
  const easel = PATTERN_STATIONS.find(station => station.id === 'coloring-station');
  if (!easel || !isTerrainWalkable(checkpoint.position)) return false;
  const point = fromTerrainPoint('courtyard', checkpoint.position);
  // The actual object interaction is decided in the world. This also keeps an
  // invalid or outdated saved return point from restoring outside the yard.
  return point.z < 1.3 && point.z >= -8 && point.x > -12 &&
    Math.hypot(point.x - easel.position.x, point.z - easel.position.z) <= 7;
}

export function startGalleryColoring(checkpoint: WorldCheckpoint, artworkVersion: string, storage?: StorageLike, sourceArtworkId?: string):
  { ok: true; entry: FirstGalleryColoringEntry } | { ok: false; message: string } {
  try {
    const entry = entrySchema.parse({
      version: 1, token: newGallerySubmissionId(), levelId: FIRST_GALLERY_EASEL_LEVEL, artworkVersion, checkpoint, sourceArtworkId,
    });
    if (!isEaselReturnPoint(entry.checkpoint)) {
      return { ok: false, message: '请走到院内画架前，再打开填色。' };
    }
    (storage ?? window.sessionStorage).setItem(FIRST_GALLERY_ENTRY_KEY, JSON.stringify(entry));
    return { ok: true, entry };
  } catch {
    return { ok: false, message: '暂时无法记录画架入口，请重试。' };
  }
}

/** The claim comes from the current history entry, never from a URL parameter. */
export function readGalleryColoringEntry(claim: unknown, storage?: StorageLike): FirstGalleryColoringEntry | null {
  if (typeof claim !== 'string' || !/^[a-f0-9]{32}$/.test(claim)) return null;
  try {
    const raw = (storage ?? window.sessionStorage).getItem(FIRST_GALLERY_ENTRY_KEY);
    if (!raw) return null;
    const entry = entrySchema.parse(JSON.parse(raw));
    return entry.token === claim && isEaselReturnPoint(entry.checkpoint) ? entry : null;
  } catch {
    return null;
  }
}

export function clearGalleryColoringEntry(token: string, storage?: StorageLike): void {
  try {
    const target = storage ?? window.sessionStorage;
    if (readGalleryColoringEntry(token, target)) target.setItem(FIRST_GALLERY_ENTRY_KEY, '');
  } catch { /* The consumed history entry is separately removed by the caller. */ }
}

export function saveGalleryColoringDraft(token: string, colors: RegionColors, materials: RegionMaterials, storage?: StorageLike): FirstGalleryColoringEntry | null {
  try {
    const target = storage ?? window.sessionStorage;
    const entry = readGalleryColoringEntry(token, target);
    if (!entry) return null;
    const next = entrySchema.parse({ ...entry, draft: { colors, materials } });
    target.setItem(FIRST_GALLERY_ENTRY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
