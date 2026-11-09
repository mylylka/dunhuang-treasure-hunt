import { z } from 'zod';
import type { ColoringLevel, ColoringMaterialId, RegionColors, RegionMaterials } from '../types';
import type { StorageLike } from './progress';
import { createColoringState, isColoringMaterial } from '../games/coloring/rules';

export const LEGACY_ARTWORKS_KEY = 'dunhuang:artworks:v1';
export const ARTWORKS_KEY = 'dunhuang:artworks:v2';
const regionId = z.string().regex(/^[1-9]\d*$/);
const legacySnapshotSchema = z.object({ colors: z.record(regionId, z.string().regex(/^#[0-9a-fA-F]{6}$/)), updatedAt: z.string().datetime(), submittedAt: z.string().datetime().optional() });
const legacyArtworksSchema = z.object({ version: z.literal(1), artworks: z.record(z.string(), z.record(z.string(), legacySnapshotSchema)) });
const snapshotSchema = legacySnapshotSchema.extend({
  materials: z.record(regionId, z.custom<ColoringMaterialId>(isColoringMaterial, '未知填色材质')).default({}),
}).refine(snapshot => Object.keys(snapshot.materials).every(id => Object.hasOwn(snapshot.colors, id)),
  '材质区域缺少底色');
const artworksSchema = z.object({ version: z.literal(2), artworks: z.record(z.string(), z.record(z.string(), snapshotSchema)) });
export type ArtworksData = z.infer<typeof artworksSchema>;
export function emptyArtworks(): ArtworksData { return { version: 2, artworks: {} }; }

export function loadArtworks(storage?: StorageLike): { data: ArtworksData; warning: string | null } {
  let unreadable = false;
  try {
    const source = storage ?? window.localStorage;
    const read = <T>(key: string, schema: z.ZodType<T>): T | undefined => {
      try {
        const raw = source.getItem(key);
        if (raw === null) return undefined;
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      } catch { /* One unreadable store must not hide readable entries from the other. */ }
      unreadable = true;
      return undefined;
    };
    const legacy = read(LEGACY_ARTWORKS_KEY, legacyArtworksSchema)?.artworks ?? {};
    const current = read(ARTWORKS_KEY, artworksSchema)?.artworks ?? {};
    const ids = new Set([...Object.keys(legacy), ...Object.keys(current)]);
    const artworks = Object.fromEntries([...ids].map(id => [id, {
      ...Object.fromEntries(Object.entries(legacy[id] ?? {}).map(([version, snapshot]) => [version, { ...snapshot, materials: {} }])),
      // A valid empty new snapshot deliberately shadows the old painting.
      ...current[id],
    }]));
    return { data: { version: 2, artworks }, warning: unreadable ? '部分填色作品暂时无法读取。原记录保留；你仍可创作新作品。' : null };
  } catch { /* Keep the original record untouched. */ }
  return { data: emptyArtworks(), warning: '填色作品暂时无法读取。原记录保留；你仍可创作新作品。' };
}

export function saveArtworks(data: ArtworksData, storage?: StorageLike): { ok: true } | { ok: false; message: string } {
  try {
    const parsed = artworksSchema.parse(data);
    const target = storage ?? window.localStorage;
    const original = target.getItem(ARTWORKS_KEY);
    if (original !== null) {
      let valid = false;
      try { valid = artworksSchema.safeParse(JSON.parse(original)).success; } catch { /* Back up unreadable data before replacement. */ }
      if (!valid) {
        let suffix = Date.now();
        while (target.getItem(`${ARTWORKS_KEY}:unreadable:${suffix}`) !== null) suffix++;
        target.setItem(`${ARTWORKS_KEY}:unreadable:${suffix}`, original);
      }
    }
    target.setItem(ARTWORKS_KEY, JSON.stringify(parsed));
    return { ok: true };
  } catch {
    return { ok: false, message: '作品尚未保存，关闭页面后可能丢失。请重试保存。' };
  }
}

export function artworkColors(data: ArtworksData, level: ColoringLevel): RegionColors {
  const snapshot = data.artworks[level.id]?.[level.artworkVersion];
  return createColoringState(snapshot?.colors, new Set(level.regions.map(region => region.id)), snapshot?.materials).colors;
}

export function artworkMaterials(data: ArtworksData, level: ColoringLevel): RegionMaterials {
  const snapshot = data.artworks[level.id]?.[level.artworkVersion];
  return createColoringState(snapshot?.colors, new Set(level.regions.map(region => region.id)), snapshot?.materials).materials;
}

export function hasOlderArtwork(data: ArtworksData, level: ColoringLevel): boolean {
  return !data.artworks[level.id]?.[level.artworkVersion] && Object.keys(data.artworks[level.id] ?? {}).length > 0;
}

export function withArtwork(data: ArtworksData, level: ColoringLevel, colors: RegionColors, submitted = false,
  now = new Date().toISOString(), materials: RegionMaterials = {}): ArtworksData {
  const existing = data.artworks[level.id] ?? {};
  const cleaned = createColoringState(colors, new Set(level.regions.map(region => region.id)), materials);
  const previous = existing[level.artworkVersion];
  return { version: 2, artworks: { ...data.artworks, [level.id]: { ...existing, [level.artworkVersion]: {
    colors: cleaned.colors, materials: cleaned.materials, updatedAt: now,
    ...(submitted ? { submittedAt: now } : previous?.submittedAt ? { submittedAt: previous.submittedAt } : {}),
  } } } };
}
