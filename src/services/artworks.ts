import { z } from 'zod';
import type { ColoringLevel, RegionColors } from '../types';
import type { StorageLike } from './progress';

export const ARTWORKS_KEY = 'dunhuang:artworks:v1';
const snapshotSchema = z.object({ colors: z.record(z.string().regex(/^[1-9]\d*$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)), updatedAt: z.string().datetime(), submittedAt: z.string().datetime().optional() });
const artworksSchema = z.object({ version: z.literal(1), artworks: z.record(z.string(), z.record(z.string(), snapshotSchema)) });
export type ArtworksData = z.infer<typeof artworksSchema>;
export function emptyArtworks(): ArtworksData { return { version: 1, artworks: {} }; }

export function loadArtworks(storage?: StorageLike): { data: ArtworksData; warning: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(ARTWORKS_KEY);
    if (!raw) return { data: emptyArtworks(), warning: null };
    const parsed = artworksSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { data: parsed.data, warning: null };
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
  const colors = data.artworks[level.id]?.[level.artworkVersion]?.colors ?? {};
  const ids = new Set(level.regions.map(region => String(region.id)));
  return Object.fromEntries(Object.entries(colors).filter(([id, color]) => ids.has(id) && color.toLowerCase() !== '#ffffff').map(([id, color]) => [id, color.toLowerCase()]));
}

export function hasOlderArtwork(data: ArtworksData, level: ColoringLevel): boolean {
  return !data.artworks[level.id]?.[level.artworkVersion] && Object.keys(data.artworks[level.id] ?? {}).length > 0;
}

export function withArtwork(data: ArtworksData, level: ColoringLevel, colors: RegionColors, submitted = false, now = new Date().toISOString()): ArtworksData {
  const existing = data.artworks[level.id] ?? {};
  const allowed = new Set(level.regions.map(region => String(region.id)));
  const cleaned = Object.fromEntries(Object.entries(colors).filter(([id, color]) => allowed.has(id) && /^#[0-9a-fA-F]{6}$/.test(color) && color.toLowerCase() !== '#ffffff').map(([id, color]) => [id, color.toLowerCase()]));
  const previous = existing[level.artworkVersion];
  return { version: 1, artworks: { ...data.artworks, [level.id]: { ...existing, [level.artworkVersion]: {
    colors: cleaned, updatedAt: now, ...(submitted ? { submittedAt: now } : previous?.submittedAt ? { submittedAt: previous.submittedAt } : {}),
  } } } };
}
