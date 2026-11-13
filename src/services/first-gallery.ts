import { z } from 'zod';
import { colorsEqual, createColoringState, materialsEqual } from '../games/coloring/rules';
import type { ColoringLevel, ContentCatalog, RegionColors, RegionMaterials } from '../types';
import type { Route } from '../app/navigation';
import { loadArtworks } from './artworks';
import { FIRST_GALLERY_EASEL_LEVEL, readGalleryColoringEntry, type FirstGalleryColoringEntry } from './first-gallery-entry';
import type { StorageLike } from './progress';

export const FIRST_GALLERY_STORAGE_KEY = 'dunhuang:first-gallery:v1';
export const CAISSON_ONLY_GALLERY_STORAGE_KEY = 'dunhuang:first-gallery-caisson:v1';
export const isCaissonOnlyMode = () => typeof document !== 'undefined' && document.getElementById('root')?.dataset.caissonOnly === 'v001';
const activeStorageKey = () => isCaissonOnlyMode() ? CAISSON_ONLY_GALLERY_STORAGE_KEY : FIRST_GALLERY_STORAGE_KEY;
const CHANGE_EVENT = 'dunhuang:first-gallery-change';
const muralPart = z.enum(['lotus', 'bird', 'grapes']);
export type FirstGalleryMuralPart = z.infer<typeof muralPart>;
interface GalleryCompletion {
  muralParts: readonly FirstGalleryMuralPart[];
  caissonCompleted: boolean;
  coloringCompleted: boolean;
}
const introduction = z.enum(['mural', 'caisson', 'easel']);
export type FirstGalleryIntroduction = z.infer<typeof introduction>;
const regionId = z.string().regex(/^[1-9]\d*$/);
const artwork = z.object({
  artworkId: z.string().min(1),
  levelId: z.string().min(1),
  artworkVersion: z.string().min(1),
  colors: z.record(regionId, z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  materials: z.record(regionId, z.enum(['sparkle-gold-v001', 'sparkle-silver-v001'])),
  submittedAt: z.string().datetime(),
}).refine(item => Object.keys(item.colors).length > 0 &&
  Object.keys(item.materials).every(id => Object.hasOwn(item.colors, id)));
const schema = z.object({
  version: z.literal(1),
  muralParts: z.array(muralPart).max(3).refine(parts => new Set(parts).size === parts.length),
  caissonCompleted: z.boolean(),
  coloringCompleted: z.boolean(),
  ceremonySeen: z.boolean(),
  introductionsSeen: z.array(introduction).max(3).refine(ids => new Set(ids).size === ids.length).default([]),
  firstSuccessSeen: z.boolean().default(false),
  artworks: z.record(z.string(), artwork),
  displayedArtworkId: z.string().nullable(),
}).refine(state =>
  Object.entries(state.artworks).every(([id, item]) => id === item.artworkId) &&
  (state.displayedArtworkId === null || Object.hasOwn(state.artworks, state.displayedArtworkId)) &&
  (!state.coloringCompleted || state.displayedArtworkId !== null) &&
  (!state.ceremonySeen || isFirstGalleryUnlocked(state)) && (!state.firstSuccessSeen || state.coloringCompleted));

export type FirstGalleryArtwork = z.infer<typeof artwork>;
export type FirstGalleryState = z.infer<typeof schema>;
export type FirstGallerySave = { ok: true; data: FirstGalleryState } | { ok: false; message: string };

export function emptyFirstGallery(): FirstGalleryState {
  return {
    version: 1, muralParts: [], caissonCompleted: false, coloringCompleted: false, ceremonySeen: false,
    introductionsSeen: [], firstSuccessSeen: false, artworks: {}, displayedArtworkId: null,
  };
}

export function firstGalleryRecordWithoutProgress(raw: string): string {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== 'object') throw new Error('Unreadable first gallery record');
  const { version: _version, artworks: _artworks, ...reset } = emptyFirstGallery();
  const next = { ...saved, ...reset };
  schema.parse(next);
  return JSON.stringify(next);
}

export function isFirstGalleryUnlocked(state: GalleryCompletion): boolean {
  return state.muralParts.length === 3 && state.caissonCompleted && state.coloringCompleted;
}

export function getFirstGalleryAccess(state: FirstGalleryState, destination: string): boolean {
  return (destination === 'patterns' || destination === 'music') && isFirstGalleryUnlocked(state);
}

/** All 2D entry points use the same rule, including manually entered hashes. */
export function canOpenFirstGalleryRoute(state: FirstGalleryState, route: Route,
  catalog: Pick<ContentCatalog, 'levels'>, easel: FirstGalleryColoringEntry | null, compatibility: boolean): boolean {
  if (route.page === 'home') return true;
  if (easel) {
    return route.page === 'play' && route.id === FIRST_GALLERY_EASEL_LEVEL &&
      catalog.levels.some(level => level.id === route.id && level.gameType === 'coloring' && level.artworkVersion === easel.artworkVersion);
  }
  if (route.page === 'help' || route.page === 'settings' || route.page === 'missing') return true;
  if (!compatibility && !getFirstGalleryAccess(state, 'patterns')) return false;
  if (route.page === 'themes') return true;
  if (route.page === 'games' || route.page === 'levels') return route.themeId === 'patterns';
  return 'id' in route && catalog.levels.some(level => level.id === route.id && level.themeId === 'patterns');
}

export function loadFirstGallery(storage?: StorageLike): { data: FirstGalleryState; warning: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(activeStorageKey());
    return { data: raw === null ? emptyFirstGallery() : schema.parse(JSON.parse(raw)), warning: null };
  } catch {
    return { data: emptyFirstGallery(), warning: '第一馆记录暂时无法读取。原记录已保留。' };
  }
}

export function subscribeFirstGallery(onChange: (local: boolean) => void): () => void {
  const storageKey = activeStorageKey();
  const receiveStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange(false);
  };
  const receiveLocal = () => onChange(true);
  window.addEventListener(CHANGE_EVENT, receiveLocal);
  window.addEventListener('storage', receiveStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, receiveLocal);
    window.removeEventListener('storage', receiveStorage);
  };
}

function updateFirstGallery(update: (previous: FirstGalleryState, storage: StorageLike) => FirstGalleryState,
  storage?: StorageLike): FirstGallerySave {
  try {
    const target = storage ?? window.localStorage;
    const storageKey = activeStorageKey();
    // Re-read immediately before each synchronous write so updates from a
    // different tab and edits to unrelated gallery fields are preserved.
    const raw = target.getItem(storageKey);
    let damaged = false;
    let previous = emptyFirstGallery();
    if (raw !== null) {
      try { previous = schema.parse(JSON.parse(raw)); }
      catch { damaged = true; }
    }
    const updated = update(previous, target);
    if (updated === previous) return { ok: true, data: previous };
    const data = schema.parse(updated);
    if (raw !== target.getItem(storageKey)) throw new Error('Concurrent gallery edit');
    if (damaged && raw !== null) {
      let suffix = Date.now();
      while (target.getItem(`${storageKey}:unreadable:${suffix}`) !== null) suffix++;
      target.setItem(`${storageKey}:unreadable:${suffix}`, raw);
    }
    const serialized = JSON.stringify(data);
    target.setItem(storageKey, serialized);
    if (target.getItem(storageKey) !== serialized) throw new Error('Concurrent gallery write');
    if (!storage) window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true, data };
  } catch {
    return { ok: false, message: '第一馆记录尚未保存，请重试。' };
  }
}

export function completeGalleryMuralPart(part: FirstGalleryMuralPart, storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => previous.muralParts.includes(part) ? previous : {
    ...previous, muralParts: [...previous.muralParts, part],
  }, storage);
}

export function completeGalleryCaisson(storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => previous.caissonCompleted ? previous : { ...previous, caissonCompleted: true }, storage);
}

export function markGalleryCeremonySeen(storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => {
    if (!isFirstGalleryUnlocked(previous)) throw new Error('Gallery is locked');
    return previous.ceremonySeen ? previous : { ...previous, ceremonySeen: true };
  }, storage);
}

export function markGalleryIntroductionSeen(id: FirstGalleryIntroduction, storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => previous.introductionsSeen.includes(id) ? previous : {
    ...previous, introductionsSeen: [...previous.introductionsSeen, id],
  }, storage);
}

export function markGalleryColoringFeedbackSeen(storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => {
    if (!previous.coloringCompleted) throw new Error('No easel submission');
    return previous.firstSuccessSeen ? previous : { ...previous, firstSuccessSeen: true };
  }, storage);
}

export function selectGalleryArtwork(artworkId: string, storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery(previous => {
    if (!Object.hasOwn(previous.artworks, artworkId)) throw new Error('Unknown artwork');
    return previous.displayedArtworkId === artworkId ? previous : { ...previous, displayedArtworkId: artworkId };
  }, storage);
}

interface ArtworkSubmission {
  requestId: string;
  level: ColoringLevel;
  colors: RegionColors;
  materials: RegionMaterials;
  submittedAt?: string;
  easelClaim?: string;
}

export function submitGalleryArtwork(submission: ArtworkSubmission, storage?: StorageLike, session?: StorageLike): FirstGallerySave {
  const { requestId, level, colors, materials, submittedAt = new Date().toISOString(), easelClaim } = submission;
  if (!/^[a-f0-9]{32}$/.test(requestId)) return { ok: false, message: '作品提交编号无效，请重新打开关卡。' };
  if (easelClaim !== undefined) {
    const entry = readGalleryColoringEntry(easelClaim, session);
    if (!entry || entry.token !== requestId || level.id !== FIRST_GALLERY_EASEL_LEVEL || entry.artworkVersion !== level.artworkVersion) {
      return { ok: false, message: '画架入口已失效。请返回庭院，再从画架打开填色。' };
    }
  }
  return updateFirstGallery(previous => {
    const existing = previous.artworks[requestId];
    if (existing) {
      if (existing.levelId !== level.id || existing.artworkVersion !== level.artworkVersion) throw new Error('Artwork request collision');
      return previous;
    }
    const painted = createColoringState(colors, new Set(level.regions.map(region => region.id)), materials);
    if (!Object.keys(painted.colors).length) throw new Error('Blank artwork');
    // Another tab may have imported the ordinary result while its collection
    // write was waiting for retry. That exact submitted snapshot is sufficient.
    const imported = previous.artworks[`legacy:${level.id}:${level.artworkVersion}:${submittedAt}`];
    if (easelClaim === undefined && imported &&
      colorsEqual(imported.colors, painted.colors) && materialsEqual(imported.materials, painted.materials)) return previous;
    const item: FirstGalleryArtwork = {
      artworkId: requestId, levelId: level.id, artworkVersion: level.artworkVersion,
      colors: painted.colors, materials: painted.materials, submittedAt,
    };
    return {
      ...previous, artworks: { ...previous.artworks, [requestId]: item },
      ...(easelClaim !== undefined ? { coloringCompleted: true, displayedArtworkId: requestId } : {}),
    };
  }, storage);
}

/** Copy compatible published snapshots. Old drafts and history remain untouched. */
export function importGalleryArtworks(catalog: Pick<ContentCatalog, 'levels'>, storage?: StorageLike): FirstGallerySave {
  return updateFirstGallery((previous, target) => {
    const old = loadArtworks(target).data;
    const artworks = { ...previous.artworks };
    let changed = false;
    for (const level of catalog.levels) {
      if (level.gameType !== 'coloring') continue;
      const snapshot = old.artworks[level.id]?.[level.artworkVersion];
      // Later autosaves keep submittedAt but no longer contain that submission's pixels.
      if (!snapshot?.submittedAt || snapshot.updatedAt !== snapshot.submittedAt) continue;
      if (Object.values(artworks).some(item => item.levelId === level.id &&
        item.artworkVersion === level.artworkVersion && item.submittedAt === snapshot.submittedAt)) continue;
      const painted = createColoringState(snapshot.colors, new Set(level.regions.map(region => region.id)), snapshot.materials);
      if (!Object.keys(painted.colors).length) continue;
      const artworkId = `legacy:${level.id}:${level.artworkVersion}:${snapshot.submittedAt}`;
      artworks[artworkId] = { artworkId, levelId: level.id, artworkVersion: level.artworkVersion,
        colors: painted.colors, materials: painted.materials, submittedAt: snapshot.submittedAt };
      changed = true;
    }
    return changed ? { ...previous, artworks } : previous;
  }, storage);
}
