import { MUSIC_COMPANION_SESSION_OPTIONS_V2, MUSIC_GUIDE_SESSION_OPTIONS } from '../world/music-companion-session-v002';
import { MUSIC_COMPANION_SESSION_OPTIONS } from '../world/music-companion-session';
import { TERRAIN_CAISSON_ONLY_SESSION_OPTIONS, TERRAIN_FIRST_GALLERY_SESSION_OPTIONS, TERRAIN_SESSION_OPTIONS } from '../world/terrain-rules-v001';
import { UPPER_SESSION_OPTIONS } from '../world/mogao-upper-session';
import { MOGAO_EXHIBIT_SESSION_OPTIONS } from '../world/mogao-exhibit-session';
import { CONNECTED_GALLERY_SESSION_OPTIONS } from '../world/connected-gallery-session';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V13} from '../world/mogao-rules-v013';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V12} from '../world/mogao-rules-v012';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V11} from '../world/mogao-rules-v011';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V10} from '../world/mogao-rules-v010';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V9} from '../world/mogao-rules-v009';
import {MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V8} from '../world/mogao-rules-v008';
import { MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V7 } from '../world/mogao-rules-v007';
import { MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V6 } from '../world/mogao-rules-v006';
import { MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V3 } from '../world/mogao-rules-v003';
import { MOGAO_SESSION_OPTIONS as MOGAO_SESSION_OPTIONS_V2 } from '../world/mogao-rules-v002';
import { MOGAO_SESSION_OPTIONS } from '../world/mogao-rules-v001';
import { MUSIC_SESSION_OPTIONS_V4 } from '../world/music-pavilion-rules-v004';
import { FLYING_VOICE_SESSION_KEY } from '../content/world/flying-dialogue';
import { MUSIC_SESSION_OPTIONS_V2 } from '../world/music-pavilion-rules-v002';
import { MUSIC_SESSION_OPTIONS_V3 } from '../world/music-pavilion-rules-v003';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { loadWorldSession, saveWorldSession } from '../world/session';
import { MUSIC_PLAYER_COLLIDERS, MUSIC_SESSION_KEY } from '../world/music-pavilion-rules';
import type { WorldCheckpoint } from '../world/types';
import { WorldBoundary } from './WorldBoundary';
import { getAssetUrl } from '../content';
import { getLevelChoices } from '../content/level-roadmap';
import { getNextOpenLevel } from '../services/level-sequence';
import { LevelAdvanceControl, LevelNavigationProvider } from './LevelAdvanceControl';
import { ThemeCards } from './ThemeCards';
import { GameSelectScreen } from './GameSelectScreen';
import { LevelSelectScreen } from './LevelSelectScreen';
import { gameNames, gamesPath, goTo, levelsPath, playPath, readRoute, routeKey as getRouteKey, type Route } from './navigation';
import { ColoringScreen } from './ColoringScreen';
import { PuzzleScreen } from './PuzzleScreen';
import { GalleryPuzzleScreen } from './GalleryPuzzleScreen';
import { GalleryPuzzleResult } from './GalleryPuzzleResult';
import { HiddenObjectScreen } from './HiddenObjectScreen';
import { ShadowMatchScreen } from './ShadowMatchScreen';
import { MobileLandscapeGuard } from './MobileLandscapeGuard';
import { ColoringResult } from './ColoringResult';
import { SoundSettings } from './SoundSettings';
import { GalleryResetSettings } from './GalleryResetSettings';
import { TravelerSelection } from './TravelerSelection';
import { readTravelerSelection, saveTravelerSelection, travelerProfiles } from '../services/traveler-selection';
import type { TravelerId } from '../content/world/assets';
import { useSound } from './useSound';
import { artworkColors, artworkMaterials, hasOlderArtwork, loadArtworks, saveArtworks, withArtwork, type ArtworksData } from '../services/artworks';
import { canOpenFirstGalleryRoute, getFirstGalleryAccess, importGalleryArtworks, isFirstGalleryUnlocked, loadFirstGallery, markGalleryCeremonySeen, submitGalleryArtwork, subscribeFirstGallery } from '../services/first-gallery';
import { CAISSON_ONLY_WORLD_SESSION_KEY, clearGalleryColoringEntry, FIRST_GALLERY_EASEL_LEVEL, FIRST_GALLERY_ENTRY_CLAIM, FIRST_GALLERY_WORLD_SESSION_KEY, newGallerySubmissionId, readGalleryColoringEntry, saveGalleryColoringDraft, startGalleryColoring, type FirstGalleryColoringEntry } from '../services/first-gallery-entry';
import { SpotDifferenceScreen } from './SpotDifferenceScreen';
import { loadProgress, saveProgress, withCompletedLevel } from '../services/progress';
import { unlockedGameThemes } from '../services/game-world-access';
import { clearGallerySessionProgress, galleryForProgressResetKey, resetGalleryProgress } from '../services/gallery-progress-reset';
import type { GalleryTaskArea } from '../services/gallery-tasks';
import { useMusicGalleryProgress } from './use-music-gallery-progress';
import type { ContentCatalog, GameEvent, Level, LevelMetadata, ProgressData, RegionColors, RegionMaterials, ThemeDefinition } from '../types';

const WorldScreen = lazy(async () => {
  const galleryStyles = document.getElementById('root')?.dataset.firstGallery === 'v001'
    ? import('../world/first-gallery-world-styles') : Promise.resolve();
  const [screen] = await Promise.all([import('./WorldScreen'), import('../styles/world-preview.css'), galleryStyles]);
  return screen;
});

function hasPlaceholder(catalog: ContentCatalog, ids: string[]) {
  return catalog.assets.some((asset) => ids.includes(asset.id) && asset.placeholder);
}

function Asset({ catalog, id, className = '', alt = '', eager = false }: { catalog: ContentCatalog; id: string; className?: string; alt?: string; eager?: boolean }) {
  const description = alt && hasPlaceholder(catalog, [id]) ? `${alt}（待替换的几何占位图）` : alt;
  return <img src={getAssetUrl(catalog, id)} alt={description} className={className} loading={eager ? 'eager' : 'lazy'} draggable={false} />;
}

function PlaceholderLabel({ catalog, assetIds, children = '待替换 · 几何占位图' }: { catalog: ContentCatalog; assetIds: string[]; children?: ReactNode }) {
  if (!hasPlaceholder(catalog, assetIds)) return null;
  return <span className="placeholder-label">{children}</span>;
}

function SourceNote({ level }: { level: LevelMetadata }) {
  return <section className="result-reference" aria-labelledby="result-reference-title" tabIndex={0}>
    <h2 id="result-reference-title">文化参考</h2>
    <p className="result-reference-link"><a href={level.source.url} target="_blank" rel="noreferrer">{level.source.title}</a></p>
    {level.source.note && <p>{level.source.note}</p>}
    {level.teachingNote && <p className="result-art-note">{level.teachingNote}</p>}
  </section>;
}

export default function App({ catalog }: { catalog: ContentCatalog }) {
  const sound = useSound();
  const [firstGallery] = useState(() => document.getElementById('root')?.dataset.firstGallery === 'v001');
  const [caissonOnly] = useState(() => document.getElementById('root')?.dataset.caissonOnly === 'v001');
  const [connectedGalleries] = useState(() => document.getElementById('root')?.dataset.connectedGalleries === 'v001');
  const travelerSelectionEnabled = connectedGalleries || caissonOnly;
  const [travelerId, setTravelerId] = useState(() => travelerSelectionEnabled ? readTravelerSelection() : null);
  const [choosingTraveler, setChoosingTraveler] = useState(caissonOnly);
  const [musicGalleryEnabled] = useState(() => connectedGalleries || document.getElementById('root')?.dataset.musicGallery === 'v001');
  const galleryResetAvailable = !caissonOnly && (firstGallery || musicGalleryEnabled || document.getElementById('root')?.dataset.mogaoExhibit === 'v001');
  const musicGallery = useMusicGalleryProgress(musicGalleryEnabled);
  const musicGamesLocked = musicGalleryEnabled && !musicGallery.unlocked;
  const [gallery, setGallery] = useState(() => firstGallery ? loadFirstGallery() : null);
  const lastGallery = useRef(gallery);
  const [galleryPortalPending, setGalleryPortalPending] = useState(false);
  const [galleryReturningFromColoring, setGalleryReturningFromColoring] = useState(false);
  const [keepGalleryWorld, setKeepGalleryWorld] = useState(false);
  const [gallerySaveError, setGallerySaveError] = useState<string | null>(null);
  const [galleryCompatibility, setGalleryCompatibility] = useState(false);
  const galleryRetry = useRef<(() => void) | null>(null);
  const artworkRetry = useRef<(() => void) | null>(null);
  const ordinaryRequest = useRef<string | null>(null);
  const easelEntry = useRef<FirstGalleryColoringEntry | null>(
    firstGallery && !caissonOnly ? readGalleryColoringEntry(window.history.state?.[FIRST_GALLERY_ENTRY_CLAIM]) : null,
  );
  const [initialLoad] = useState(() => loadProgress());
  const [initialArtworks] = useState(() => loadArtworks());
  const [artworks, setArtworks] = useState<ArtworksData>(initialArtworks.data);
  const artworksRef = useRef(artworks);
  const [artworkSaveError, setArtworkSaveError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData>(initialLoad.data);
  const progressRef = useRef(progress);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [loadWarning, setLoadWarning] = useState([initialLoad.warning, initialArtworks.warning].filter(Boolean).join(' ') || null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(readRoute);
  const [activeTheme, setActiveTheme] = useState(0);
  const completedThisRun = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [worldSessionOptions] = useState(() => connectedGalleries ? CONNECTED_GALLERY_SESSION_OPTIONS : firstGallery ? { ...(caissonOnly ? TERRAIN_CAISSON_ONLY_SESSION_OPTIONS : TERRAIN_FIRST_GALLERY_SESSION_OPTIONS), key: caissonOnly ? CAISSON_ONLY_WORLD_SESSION_KEY : FIRST_GALLERY_WORLD_SESSION_KEY } : document.getElementById('root')?.dataset.musicCompanion === 'v002' ? (document.getElementById('root')?.dataset.musicGuide === 'v001' ? MUSIC_GUIDE_SESSION_OPTIONS : MUSIC_COMPANION_SESSION_OPTIONS_V2) : document.getElementById('root')?.dataset.musicCompanion === 'v001' ? MUSIC_COMPANION_SESSION_OPTIONS : document.getElementById('root')?.dataset.mogaoExhibit === 'v001' ? MOGAO_EXHIBIT_SESSION_OPTIONS : document.getElementById('root')?.dataset.mogaoUpper === 'v002' ? UPPER_SESSION_OPTIONS : document.getElementById('root')?.dataset.terrain === 'v001' ? TERRAIN_SESSION_OPTIONS : document.getElementById('root')?.dataset.flowRevision === 'v013' ? MOGAO_SESSION_OPTIONS_V13 : document.getElementById('root')?.dataset.mogao === 'v012' ? MOGAO_SESSION_OPTIONS_V12 : document.getElementById('root')?.dataset.mogao === 'v011' ? MOGAO_SESSION_OPTIONS_V11 : document.getElementById('root')?.dataset.mogao === 'v010' ? MOGAO_SESSION_OPTIONS_V10 : document.getElementById('root')?.dataset.mogao === 'v009' ? MOGAO_SESSION_OPTIONS_V9 : document.getElementById('root')?.dataset.mogao === 'v008' ? MOGAO_SESSION_OPTIONS_V8 : document.getElementById('root')?.dataset.mogao === 'v007' ? MOGAO_SESSION_OPTIONS_V7 : document.getElementById('root')?.dataset.mogao === 'v006' ? MOGAO_SESSION_OPTIONS_V6 : document.getElementById('root')?.dataset.mogao === 'v003' ? MOGAO_SESSION_OPTIONS_V3 : document.getElementById('root')?.dataset.mogao === 'v002' ? MOGAO_SESSION_OPTIONS_V2 : document.getElementById('root')?.dataset.mogao === 'v001' ? MOGAO_SESSION_OPTIONS : document.getElementById('root')?.dataset.musicPavilion === 'v006' ? { ...MUSIC_SESSION_OPTIONS_V4, key: 'dunhuang:music-pavilion-preview:v6' } : document.getElementById('root')?.dataset.musicPavilion === 'v005' ? { ...MUSIC_SESSION_OPTIONS_V4, key: 'dunhuang:music-pavilion-preview:v5' } : document.getElementById('root')?.dataset.musicPavilion === 'v004' ? MUSIC_SESSION_OPTIONS_V4 : document.getElementById('root')?.dataset.flyingVoice === 'v001' ? { ...MUSIC_SESSION_OPTIONS_V3, key: FLYING_VOICE_SESSION_KEY } : document.getElementById('root')?.dataset.musicPavilion === 'v003' ? MUSIC_SESSION_OPTIONS_V3 : document.getElementById('root')?.dataset.musicPavilion === 'v002' ? MUSIC_SESSION_OPTIONS_V2 : document.getElementById('root')?.dataset.musicPavilion === 'v001'
    ? { key: MUSIC_SESSION_KEY, colliders: MUSIC_PLAYER_COLLIDERS } : {});
  const [initialWorld] = useState(() => loadWorldSession(undefined, worldSessionOptions));
  const worldCheckpoint = useRef(initialWorld.data);
  const [worldWarning, setWorldWarning] = useState(initialWorld.warning);
  const [worldRevision, setWorldRevision] = useState(0);
  const currentWorldRevision = useRef(0);
  const enteredFromWorld = useRef(false);
  const receivedMogaoFoliosThisVisit = useRef(false);
  const persistWorld = useCallback((next: WorldCheckpoint) => {
    worldCheckpoint.current = next;
    const saved = saveWorldSession(next, undefined, worldSessionOptions);
    setWorldWarning(saved.ok ? null : saved.message);
  }, [worldSessionOptions]);

  const reloadMusicGallery = musicGallery.reload;
  const applyGalleryReset = useCallback((area: GalleryTaskArea) => {
    // Discard writes from the old runtime when its effect cleans up.
    setWorldRevision(++currentWorldRevision.current);
    setKeepGalleryWorld(false);
    const resumed = loadWorldSession(undefined, worldSessionOptions);
    worldCheckpoint.current = resumed.data;
    setWorldWarning(resumed.warning);
    if (easelEntry.current) {
      const refreshed = readGalleryColoringEntry(easelEntry.current.token);
      if (refreshed) easelEntry.current = refreshed;
    }
    if (area === 'first' && firstGallery) {
      const next = loadFirstGallery();
      lastGallery.current = next;
      setGallery(next);
      setGalleryPortalPending(false);
      setGalleryReturningFromColoring(false);
      setGalleryCompatibility(false);
    }
    if (area === 'music') reloadMusicGallery();
    if (area === 'mogao') receivedMogaoFoliosThisVisit.current = false;
  }, [firstGallery, reloadMusicGallery, worldSessionOptions]);

  useEffect(() => {
    if (!galleryResetAvailable) return;
    function syncGalleryReset(event: StorageEvent) {
      const area = galleryForProgressResetKey(event.key);
      if (!area || !event.newValue) return;
      const cleared = clearGallerySessionProgress(area, undefined, worldSessionOptions.key);
      applyGalleryReset(area);
      if (!cleared.ok) setWorldWarning(cleared.message);
    }
    window.addEventListener('storage', syncGalleryReset);
    return () => window.removeEventListener('storage', syncGalleryReset);
  }, [applyGalleryReset, galleryResetAvailable, worldSessionOptions]);

  function handleGalleryReset(area: GalleryTaskArea) {
    const result = resetGalleryProgress(area, undefined, worldSessionOptions.key);
    if (result.ok) applyGalleryReset(area);
    return result;
  }

  const persist = useCallback((next: ProgressData) => {
    progressRef.current = next;
    setProgress(next);
    const result = saveProgress(next);
    setSaveError(result.ok ? null : result.message);
    return result.ok;
  }, []);

  const returnToGalleryEasel = useCallback((entry: FirstGalleryColoringEntry, submitted: boolean) => {
    persistWorld(entry.checkpoint);
    clearGalleryColoringEntry(entry.token);
    easelEntry.current = null;
    galleryRetry.current = null;
    setGallerySaveError(null);
    setGalleryCompatibility(false);
    setKeepGalleryWorld(false);
    setGalleryReturningFromColoring(submitted && !keepGalleryWorld);
    try { window.history.replaceState(null, '', '#/'); }
    catch { goTo('/'); }
    setRoute({ page: 'home' });
  }, [keepGalleryWorld, persistWorld]);

  const leaveGalleryEasel = useCallback(() => {
    if (easelEntry.current) returnToGalleryEasel(easelEntry.current, false);
  }, [returnToGalleryEasel]);

  useEffect(() => {
    const handleHash = () => {
      const next = readRoute();
      const current = easelEntry.current;
      if (current && (next.page !== 'play' || next.id !== FIRST_GALLERY_EASEL_LEVEL ||
        window.history.state?.[FIRST_GALLERY_ENTRY_CLAIM] !== current.token)) {
        leaveGalleryEasel();
        return;
      }
      if (next.page === 'home') setGalleryCompatibility(false);
      setRoute(next);
    };
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, [leaveGalleryEasel]);

  useEffect(() => {
    if (!firstGallery) return;
    const refresh = (local: boolean) => {
      const previous = lastGallery.current;
      const next = loadFirstGallery();
      if (local && previous && !previous.warning && !next.warning &&
        !isFirstGalleryUnlocked(previous.data) && isFirstGalleryUnlocked(next.data) && !next.data.ceremonySeen) {
        setGalleryPortalPending(true);
      } else if (next.data.ceremonySeen || !isFirstGalleryUnlocked(next.data)) {
        setGalleryPortalPending(false);
      }
      lastGallery.current = next;
      setGallery(next);
    };
    const unsubscribe = subscribeFirstGallery(refresh);
    if (!caissonOnly) importGalleryArtworks(catalog);
    refresh(false);
    return unsubscribe;
  }, [firstGallery, caissonOnly, catalog]);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;
    root.dataset.inputModality = 'pointer';
    const pointer = () => { root.dataset.inputModality = 'pointer'; };
    const keyboard = (event: KeyboardEvent) => {
      if (['Tab', 'Enter', ' ', 'Escape', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key) || event.key.startsWith('Arrow')) {
        root.dataset.inputModality = 'keyboard';
      }
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('touchstart', pointer, { capture: true, passive: true });
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('touchstart', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      delete root.dataset.inputModality;
    };
  }, []);

  useEffect(() => {
    if (route.page !== 'play-latest') return;
    const theme = catalog.themes.find(item => item.id === route.themeId);
    const choices = theme?.allowedGameTypes.includes(route.gameType)
      ? getLevelChoices(catalog, route.themeId, route.gameType) : [];
    const latest = choices.filter(choice => choice.status === 'available').at(-1);
    const path = latest ? playPath(latest.id) : levelsPath(route.themeId, route.gameType);
    window.history.replaceState(window.history.state, '', `#${path}`);
    setRoute(readRoute());
  }, [catalog, route]);

  const routeKey = getRouteKey(route);
  useEffect(() => {
    if (route.page === 'themes') enteredFromWorld.current = false;
    if (route.page !== 'home') setGalleryReturningFromColoring(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
    completedThisRun.current = false;
    artworkRetry.current = null;
    if (route.page === 'play') {
      ordinaryRequest.current = null;
      galleryRetry.current = null;
      setGallerySaveError(null);
    }
  }, [routeKey]);

  const persistArtworks = useCallback((next: ArtworksData) => {
    artworksRef.current = next;
    setArtworks(next);
    const result = saveArtworks(next);
    setArtworkSaveError(result.ok ? null : result.message);
    return result.ok;
  }, []);

  const onGameEvent = useCallback((event: GameEvent) => {
    if (event.type === 'completed' && !completedThisRun.current) {
      const level = catalogRef.current.levels.find((item) => item.id === event.levelId);
      if (!level) return;
      completedThisRun.current = true;
      persist(withCompletedLevel(progressRef.current, level.id));
      goTo(`/result/${encodeURIComponent(level.id)}`);
    }
  }, [persist]);

  function replay(levelId: string) {
    completedThisRun.current = false;
    goTo(playPath(levelId));
  }

  function skinSlice(id: string) {
    const slice = catalog.assets.find(asset => asset.id === id)!.slice!;
    return `${slice.top} ${slice.right} ${slice.bottom} ${slice.left}`;
  }
  const previewHome = route.page === 'home' && (firstGallery || !!document.documentElement.dataset.previewResourceEntry);
  const assetStyle = {
    '--background-landscape': previewHome ? 'none' : `url("${getAssetUrl(catalog, 'bg-landscape')}")`,
    '--background-portrait': previewHome ? 'none' : `url("${getAssetUrl(catalog, 'bg-portrait')}")`,
    '--panel-slice': skinSlice('panel'),
    '--primary-button-slice': skinSlice('button-primary'),
    '--secondary-button-slice': skinSlice('button-secondary'),
    '--panel-image': `url("${getAssetUrl(catalog, 'panel')}")`,
    '--primary-button-image': `url("${getAssetUrl(catalog, 'button-primary')}")`,
    '--secondary-button-image': `url("${getAssetUrl(catalog, 'button-secondary')}")`,
  } as CSSProperties;

  function renderSaveNotice(compact = false) {
    if (!saveError) return null;
    return <div className={`notice notice-error ${compact ? 'notice-compact' : ''}`} role="alert" data-testid="save-error">
      <div><strong>记录暂未保存</strong><p>{saveError} 当前页面仍保留本次记录，关闭后可能丢失。</p></div>
      <button type="button" className="button button-secondary button-small" data-testid="retry-save" onClick={() => persist(progressRef.current)}>重试保存</button>
    </div>;
  }

  const unlocked = caissonOnly ? catalog.themes.map(theme => theme.id) : unlockedGameThemes();
  if (musicGallery.unlocked && !unlocked.includes('music')) unlocked.push('music');
  if (galleryCompatibility && !unlocked.includes('patterns')) unlocked.push('patterns');
  if (receivedMogaoFoliosThisVisit.current && !unlocked.includes('stories')) unlocked.push('stories');
  const availableThemes = catalog.themes.filter(theme => unlocked.includes(theme.id));
  const gameWorldAvailable = availableThemes.length > 0 && !easelEntry.current;
  const isInsideGameWorld = route.page === 'themes' || route.page === 'games' || route.page === 'levels'
    || route.page === 'play-latest' || route.page === 'play' || route.page === 'result';
  const showGameWorldLink = gameWorldAvailable && !isInsideGameWorld;
  const openGameWorld = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    event.preventDefault();
    try { window.history.pushState(null, '', '#/themes'); }
    catch { goTo('/themes'); }
    // The game menu is already loaded. Commit it from the click rather than
    // waiting for the hash event while the 3D world is still preparing.
    setRoute({ page: 'themes' });
    return true;
  }, []);

  function enterGalleryCompatibility() {
    setGalleryCompatibility(true);
    goTo(gamesPath('patterns'));
  }

  function enterGalleryEasel(checkpoint: WorldCheckpoint, artworkId?: string): boolean {
    if (!firstGallery) return false;
    const level = catalog.levels.find(item => item.id === FIRST_GALLERY_EASEL_LEVEL);
    if (level?.gameType !== 'coloring') {
      setWorldWarning('画架线稿暂未加载，请重试。');
      return false;
    }
    if (artworkId) {
      const source = loadFirstGallery().data.artworks[artworkId];
      if (!source || source.levelId !== level.id || source.artworkVersion !== level.artworkVersion) {
        setWorldWarning('这幅作品暂时无法在当前画架上重新配色。');
        return false;
      }
    }
    const result = startGalleryColoring(checkpoint, level.artworkVersion, undefined, artworkId);
    if (!result.ok) {
      setWorldWarning(result.message);
      return false;
    }
    try {
      window.history.pushState({ [FIRST_GALLERY_ENTRY_CLAIM]: result.entry.token }, '', `#${playPath(level.id)}`);
    } catch {
      clearGalleryColoringEntry(result.entry.token);
      setWorldWarning('画架暂时无法打开，请重试。');
      return false;
    }
    persistWorld(checkpoint);
    easelEntry.current = result.entry;
    setKeepGalleryWorld(true);
    setRoute({ page: 'play', id: level.id });
    return true;
  }

  function renderArtworkNotice() {
    return artworkSaveError && <div className="notice notice-error notice-compact" role="alert" data-testid="artwork-save-error"><p>{artworkSaveError}</p><button type="button" className="button button-secondary button-small" data-testid="retry-artwork-save" onClick={() => artworkRetry.current ? artworkRetry.current() : persistArtworks(artworksRef.current)}><span className="button-label">重试保存作品</span></button></div>;
  }

  function renderGallerySaveNotice() {
    return gallerySaveError && <div className="notice notice-error notice-compact" role="alert" data-testid="gallery-save-error">
      <p>{gallerySaveError}</p>
      <button type="button" className="button button-secondary button-small" onClick={() => galleryRetry.current?.()}>重试收藏作品</button>
    </div>;
  }

  function renderLevel(level: Level, theme: ThemeDefinition) {
    if (level.gameType === 'shadow-match') return <ShadowMatchScreen key={level.id} level={level} catalog={catalog}
      reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent}
      onBack={() => goTo(levelsPath(theme.id, 'shadow-match'))} />;
    if (level.gameType === 'hidden-object') return <HiddenObjectScreen key={level.id} level={level} catalog={catalog}
      reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent}
      onBack={() => goTo(levelsPath(theme.id, 'hidden-object'))} />;
    if (level.gameType === 'puzzle') {
      const fromMogao = theme.id === 'stories' && enteredFromWorld.current;
      if (level.mode === 'gallery-order') return <GalleryPuzzleScreen key={level.id} level={level} catalog={catalog}
        onEvent={onGameEvent} backLabel={fromMogao ? '返回第三馆一楼' : undefined}
        onBack={() => goTo(fromMogao ? '/' : levelsPath(theme.id, 'puzzle'))} />;
      return <PuzzleScreen key={level.id} level={level} catalog={catalog}
        reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent}
        backLabel={fromMogao ? '返回第三馆一楼' : undefined}
        onBack={() => goTo(fromMogao ? '/' : levelsPath(theme.id, 'puzzle'))} />;
    }
    if (level.gameType === 'coloring') {
      const entry = easelEntry.current;
      const savedSource = entry?.sourceArtworkId ? gallery?.data.artworks[entry.sourceArtworkId] : undefined;
      const source = entry?.draft ?? (savedSource?.levelId === level.id && savedSource.artworkVersion === level.artworkVersion ? savedSource : undefined);
      const save = (colors: RegionColors, materials: RegionMaterials) => {
        artworkRetry.current = null;
        persistArtworks(withArtwork(artworksRef.current, level, colors, false, undefined, materials));
        if (entry) easelEntry.current = saveGalleryColoringDraft(entry.token, colors, materials) ?? easelEntry.current;
        // Undoing a failed submission opens a new edit. Do not let its retry
        // button publish the previous version of what is now on the canvas.
        if (galleryRetry.current) {
          galleryRetry.current = null;
          setGallerySaveError(null);
        }
      };
      const complete = (colors: RegionColors, materials: RegionMaterials) => {
        if (completedThisRun.current) return;
        if (caissonOnly && !entry) {
          const submit = () => {
            if (!persistArtworks(withArtwork(artworksRef.current, level, colors, true, new Date().toISOString(), materials))) {
              artworkRetry.current = submit;
              return;
            }
            artworkRetry.current = null;
            onGameEvent({ type: 'completed', levelId: level.id });
          };
          submit();
          return;
        }
        const requestId = entry?.token ?? (ordinaryRequest.current ??= newGallerySubmissionId());
        const submittedAt = new Date().toISOString();
        let legacySaved = !!entry;
        const capture = () => {
          if (!legacySaved) {
            legacySaved = persistArtworks(withArtwork(artworksRef.current, level, colors, true, submittedAt, materials));
            if (!legacySaved) {
              setGallerySaveError('作品尚未保存，请重试。');
              galleryRetry.current = capture;
              return;
            }
          }
          const result = submitGalleryArtwork({ requestId, level, colors, materials, submittedAt, easelClaim: entry?.token });
          setGallerySaveError(result.ok ? null : result.message);
          if (!result.ok) {
            galleryRetry.current = capture;
            return;
          }
          galleryRetry.current = null;
          if (entry) {
            completedThisRun.current = true;
            returnToGalleryEasel(entry, true);
          } else onGameEvent({ type: 'completed', levelId: level.id });
        };
        capture();
      };
      return <ColoringScreen key={entry?.token ?? level.id} level={level} catalog={catalog} initialColors={source?.colors ?? artworkColors(artworks, level)}
        initialMaterials={source?.materials ?? artworkMaterials(artworks, level)} reducedMotion={progress.settings.reducedMotion} onChange={save}
        galleryEntry={!!entry} backLabel={entry ? '返回院内画架' : undefined} onBack={entry ? leaveGalleryEasel : () => goTo(levelsPath(theme.id, 'coloring'))}
        onComplete={complete}
        saveNotice={<>{hasOlderArtwork(artworks, level) && <p className="notice" role="status">线稿版本已更新，旧作品已保留。本页使用新线稿。</p>}
          {gallerySaveError ? renderGallerySaveNotice() : renderArtworkNotice()}</>} />;
    }
    return <SpotDifferenceScreen key={level.id} level={level} catalog={catalog}
      reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent}
      onBack={() => goTo(levelsPath(theme.id, 'spot-difference', level.id))} />;
  }

  function renderResult(level: Level, theme: ThemeDefinition) {
    const isColoring = level.gameType === 'coloring';
    const isPuzzle = level.gameType === 'puzzle';
    const nextLevel = getNextOpenLevel(catalog, level);
    const resultActions = (replayLabel: string) => <div className="result-actions">
      {theme.id === 'stories' && enteredFromWorld.current
        ? <a className="button button-primary" href="#/"><span className="button-label">返回第三馆一楼</span></a>
        : <LevelAdvanceControl completed className="button button-primary" />}
      <button type="button" className="button button-secondary" onClick={() => replay(level.id)}><span className="button-label">{replayLabel}</span></button>
      {nextLevel && <a className="button button-secondary" href={`#${levelsPath(theme.id, level.gameType)}`}><span className="button-label">返回关卡</span></a>}
    </div>;
    if (isPuzzle && !progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>先完成拼图，再查看全图</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>前往拼图</a></div>;
    if (!progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>{isColoring ? '先完成活动，再回看作品' : '先完成活动，再回看发现'}</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>{isColoring ? '前往填色' : '前往观察'}</a></div>;
    if (level.gameType === 'puzzle' && level.mode === 'gallery-order') {
      const fromMogao = theme.id === 'stories' && enteredFromWorld.current;
      return <GalleryPuzzleResult level={level} catalog={catalog} nextLevel={nextLevel}
        backHref={fromMogao ? '#/' : `#${levelsPath(theme.id, 'puzzle')}`}
        backLabel={fromMogao ? '返回第三馆一楼' : '返回关卡'} onReplay={() => replay(level.id)} saveNotice={renderSaveNotice()} />;
    }
    if (level.gameType === 'hidden-object') return <div className="page page-result hidden-object-result-screen">
      <Breadcrumb catalog={catalog} items={[{ label: '找物关卡', href: `#${levelsPath(theme.id, 'hidden-object')}` }]} />
      <header className="result-heading"><h1>寻宝完成</h1></header>{renderSaveNotice()}
      <section className="result-review"><div className="result-image"><Asset catalog={catalog} id={level.thumbnailAssetId} alt="乐舞主题教学示意" eager /></div>
        <div className="result-summary"><SourceNote level={level} /></div></section>
      {resultActions('再找一局')}
    </div>;
    if (level.gameType === 'shadow-match') return <div className="page page-result shadow-result-screen">
      <Breadcrumb catalog={catalog} items={[{ label: '影子配对关卡', href: `#${levelsPath(theme.id, 'shadow-match')}` }]} />
      <header className="result-heading"><h1>配对完成</h1></header>{renderSaveNotice()}
      <section className="result-review"><div className="result-image shadow-result-images">
        <figure><Asset catalog={catalog} id={level.referenceAssetId} alt="彩色飞天完整图" eager /><figcaption>彩色飞天</figcaption></figure>
        <figure><Asset catalog={catalog} id={level.options.find(option => option.id === level.correctOptionId)!.assetId} alt="与飞天轮廓完全对应的影子" eager /><figcaption>对应影子</figcaption></figure>
      </div><div className="result-summary"><SourceNote level={level} /></div></section>
      {resultActions('再配一次')}
    </div>;
    if (level.gameType === 'coloring' && !Object.keys(artworkColors(artworks, level)).length) return <div className="page narrow-page empty-state"><h1>{hasOlderArtwork(artworks, level) ? '线稿已更新，旧作品已保留' : '当前作品还未着色'}</h1>{renderArtworkNotice()}<a className="button button-primary" href={`#${playPath(level.id)}`}>继续填色</a></div>;
    return <div className={`page page-result${isColoring ? ' is-coloring-result' : isPuzzle ? ' is-puzzle-result' : ''}`} data-testid={isColoring ? 'coloring-result-page' : undefined}>
      <Breadcrumb catalog={catalog} items={[{ label: `${gameNames[level.gameType]}关卡`, href: `#${levelsPath(theme.id, level.gameType, level.gameType === 'spot-difference' ? level.id : undefined)}` }]} />
      <header className="result-heading"><h1>{isColoring ? '作品完成' : isPuzzle ? '拼图完成' : '观察完成'}</h1></header>
      {renderSaveNotice()}
      {isColoring && renderArtworkNotice()}
      {isColoring && <p className="notice notice-compact coloring-gallery-note">可以到 3D 世界的画架，从作品库选择这幅画来展示。</p>}
      <section className={`result-review${isColoring ? ' coloring-result-review' : ''}`}>
        <div className={`result-image${isColoring ? ' coloring-result-image' : ''}`}>
          {isColoring ? <ColoringResult level={level} catalog={catalog} colors={artworkColors(artworks, level)} materials={artworkMaterials(artworks, level)} />
            : isPuzzle ? <Asset catalog={catalog} id={level.imageAssetId} alt="拼合完成的完整图像" eager />
              : <><Asset catalog={catalog} id={level.baseAssetId} alt="本次观察参考图" eager /><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId]} /></>}
        </div>
        {!isColoring && <div className="result-summary">
          {level.gameType === 'spot-difference' && <strong className="result-count">{level.differences.length}<span>处发现</span></strong>}
          <SourceNote level={level} />
        </div>}
      </section>
      {resultActions(isColoring ? '继续创作' : isPuzzle ? '再拼一次' : '再观察一次')}
    </div>;
  }

  function renderHelp() {
    return <div className="page narrow-page page-help"><Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '游玩指南' }]} /><div className="text-page-heading"><h1>游玩指南</h1></div><div className="text-scroll" tabIndex={0} aria-label="游玩指南正文"><div className="guide-list"><article><span>01</span><div><h2>每次只做一件事</h2><p>解锁后可进入游戏世界，选择主题、玩法和关卡。一关只有一种玩法。</p></div></article><article><span>02</span><div><h2>卡住了，就用提示</h2><p>提示和重试都不限次数，也不会扣分。找不同可以点击任一幅图；已经找到的位置会在两幅图上标出。</p></div></article><article><span>03</span><div><h2>完成之后，再看一眼</h2><p>活动结束会给出简短解释和文化参考。完成表示参与过这次观察，不等于已经学会所有相关知识。</p></div></article><article><span>04</span><div><h2>记住探索的边界</h2><p>完成记录保存在当前设备、当前浏览器里。换浏览器、清除网站数据或使用无痕模式，可能无法保留记录。填色作品会自动保存，找不同不保存中途进度。</p></div></article></div><section className="development-note"><h2>图像说明</h2><p>AI教学示意图用于学习与游戏，不是原壁画照片或历史原貌复原。文化参考见完成后的发现回顾。</p></section></div><div className="text-page-actions"><a className="button button-secondary" href="#/">回到探索首页</a></div></div>;
  }

  function renderSettings() {
    return <div className="page narrow-page page-settings">
      <Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '体验设置' }]} />
      <div className="text-page-heading"><h1>设置</h1></div>
      <div className="text-scroll">
        <SoundSettings sound={sound} />
        <div className="setting-row">
          <div><h2>减少动效</h2><p>减少页面过渡与按钮动效，让画面更安静。</p></div>
          <label className="toggle">
            <input type="checkbox" checked={progress.settings.reducedMotion} onChange={event => persist({
              ...progressRef.current, settings: { ...progressRef.current.settings, reducedMotion: event.target.checked },
            })} />
            <span className="toggle-track" aria-hidden="true" /><span className="visually-hidden">减少动效</span>
          </label>
        </div>
        {travelerSelectionEnabled && <div className="setting-row">
          <div><h2>漫游角色</h2>{travelerId && <p>{travelerProfiles[travelerId].name}</p>}</div>
          <button type="button" className="button button-secondary" onClick={() => {
            setChoosingTraveler(true);
            goTo('/');
          }}>更换角色</button>
        </div>}
        {galleryResetAvailable && <GalleryResetSettings onReset={handleGalleryReset} />}
        {renderSaveNotice()}
      </div>
    </div>;
  }

  const galleryWorldSuspended = keepGalleryWorld && route.page === 'play' &&
    route.id === FIRST_GALLERY_EASEL_LEVEL && !!easelEntry.current;
  const confirmTraveler = (id: TravelerId) => {
    saveTravelerSelection(id);
    setTravelerId(id);
    setChoosingTraveler(false);
  };
  const unlockedMapGalleries = !connectedGalleries ? undefined :
    gallery && isFirstGalleryUnlocked(gallery.data) ? (musicGallery.unlocked ? 3 : 2) : 1;
  const renderWorld = (suspended: boolean) => <WorldBoundary gameWorldAvailable={gameWorldAvailable} onDirectGameWorld={openGameWorld} onFallback={firstGallery ? enterGalleryCompatibility : undefined}><Suspense fallback={<div className="page empty-state"><h1>正在准备探索世界…</h1>{gameWorldAvailable && <a className={previewHome ? 'button button-plain' : 'button button-secondary'} href="#/themes" onClick={openGameWorld}>直接进入游戏世界</a>}</div>}><WorldScreen
    key={worldRevision} initial={worldCheckpoint.current} saveWarning={worldWarning} reducedMotion={progress.settings.reducedMotion} sound={sound.preferences}
    gameWorldAvailable={gameWorldAvailable}
    onDirectGameWorld={openGameWorld}
    musicGallery={musicGalleryEnabled ? musicGallery : undefined}
    unlockedMapGalleries={unlockedMapGalleries}
    onEnterMusicGames={!musicGalleryEnabled ? undefined : at => {
      if (musicGamesLocked) return;
      persistWorld(at); enteredFromWorld.current = true; goTo(gamesPath('music'));
    }}
    onEnterMogaoGames={at => {
      receivedMogaoFoliosThisVisit.current = true;
      persistWorld(at); enteredFromWorld.current = true; goTo(gamesPath('stories'));
    }}
    firstGallery={firstGallery} connectedGalleries={connectedGalleries} suspended={suspended} catalog={catalog} onGalleryColoring={enterGalleryEasel} onGalleryFallback={firstGallery ? enterGalleryCompatibility : undefined}
    travelerId={travelerId ?? undefined} onChooseTraveler={travelerSelectionEnabled ? () => setChoosingTraveler(true) : undefined}
    galleryReturningFromColoring={galleryReturningFromColoring} galleryPortalPending={galleryPortalPending}
    onGalleryPortalPresented={() => {
      setGalleryPortalPending(false);
      const result = markGalleryCeremonySeen();
      if (!result.ok) setWorldWarning(result.message);
    }}
    onGalleryPortalEnter={at => {
      if (!getFirstGalleryAccess(loadFirstGallery().data, 'patterns')) return;
      persistWorld(at);
      enteredFromWorld.current = true;
      goTo(gamesPath('patterns'));
    }}
    onCheckpoint={next => { if (worldRevision === currentWorldRevision.current) persistWorld(next); }} /></Suspense></WorldBoundary>;
  let page: ReactNode;
  const routeTheme = route.page === 'games' || route.page === 'levels' || route.page === 'play-latest' ? route.themeId :
    route.page === 'play' || route.page === 'result' ? catalog.levels.find(level => level.id === route.id)?.themeId : undefined;
  const easelAllowed = !!gallery && !!easelEntry.current && canOpenFirstGalleryRoute(gallery.data, route, catalog, easelEntry.current, galleryCompatibility);
  const routeAllowed = easelEntry.current ? easelAllowed : routeTheme !== 'patterns' || unlocked.includes('patterns');
  const galleryWorldVisible = firstGallery && route.page === 'home' && routeAllowed;
  const travelerSelectionVisible = galleryWorldVisible && travelerSelectionEnabled && (choosingTraveler || !travelerId);
  const galleryWorldMounted = (galleryWorldVisible && !travelerSelectionVisible) || galleryWorldSuspended;
  if (!routeAllowed) page = <div className="page narrow-page empty-state"><h1>这个入口尚未开放</h1>
    <p>{gallery && getFirstGalleryAccess(gallery.data, 'patterns') ? '其他场馆的小游戏暂未开放。' : '完成壁画、藻井和画架三个事件，即可解锁纹样小游戏。'}</p>
    <a className="button button-primary" href="#/">返回第一馆</a></div>;
  else if (routeTheme === 'music' && !unlocked.includes('music')) page = <div className="page narrow-page empty-state" data-testid="music-gallery-locked">
    <h1>乐舞小游戏尚未解锁</h1>
    <p>看完九个飞天年代、打开十二件乐器试听，并为小导游换上任意一套历史服饰，即可解锁。</p>
    <a className="button button-primary" href="#/">返回乐舞馆</a>
  </div>;
  else if (routeTheme === 'stories' && !unlocked.includes('stories')) page = <div className="page narrow-page empty-state" data-testid="mogao-game-locked">
    <h1>壁画小游戏尚未解锁</h1>
    <p>领取绘世厅与佛法厅的两份图鉴，即可在第三馆一楼找到游戏入口。</p>
    <a className="button button-primary" href="#/">返回探索</a>
  </div>;
  else if (route.page === 'home' && !firstGallery) page = renderWorld(false);
  else if (route.page === 'themes') page = <ThemeCards catalog={{ ...catalog, themes: availableThemes }} selectedIndex={activeTheme} onSelectIndex={setActiveTheme}
    hrefForTheme={theme => `#${gamesPath(theme.id)}`} />;
  else if (route.page === 'help') page = renderHelp();
  else if (route.page === 'settings') page = renderSettings();
  else if (route.page === 'games' || route.page === 'levels') {
    const theme = catalog.themes.find(item => item.id === route.themeId);
    if (theme) {
      if (route.page === 'games') page = <GameSelectScreen catalog={catalog} theme={theme}
        onBack={() => goTo(enteredFromWorld.current ? '/' : '/themes')}
        hrefForGame={type => `#${levelsPath(theme.id, type)}`} />;
      else if (theme.allowedGameTypes.includes(route.gameType)) page = <LevelSelectScreen catalog={catalog} theme={theme}
        gameType={route.gameType} focusLevelId={route.focusLevelId} progress={progress} onBack={() => goTo(gamesPath(theme.id))}
        hrefForLevel={id => `#${playPath(id)}`} />;
    }
  } else if (route.page === 'play' || route.page === 'result') {
    const level = catalog.levels.find(item => item.id === route.id);
    const theme = catalog.themes.find(item => item.id === level?.themeId);
    if (level && theme) {
      page = <LevelNavigationProvider catalog={catalog} level={level} restricted={!!easelEntry.current}>{route.page === 'result' ? renderResult(level, theme) : renderLevel(level, theme)}</LevelNavigationProvider>;
    }
  }
  if (!page && !galleryWorldVisible) page = <div className="page narrow-page empty-state"><h1>页面不存在</h1><a className="button button-primary" href="#/">返回首页</a></div>;

  return <div ref={shellRef} className="app-shell" data-screen={route.page} data-traveler-selection={travelerSelectionVisible || undefined} data-reduced-motion={progress.settings.reducedMotion ? 'true' : 'false'} style={assetStyle} onClickCapture={sound.onInterfaceClick}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
    <header className="site-header"><a className="brand" href="#/" aria-label="敦煌寻宝记，返回首页"><span className="brand-mark" aria-hidden="true">敦</span><strong>敦煌寻宝记</strong></a><nav className="header-nav" aria-label="主导航"><a href="#/" data-testid="world-return" aria-label="漫游世界" aria-current={route.page === 'home' ? 'page' : undefined}>漫游世界</a>{showGameWorldLink && <a href="#/themes" aria-current={route.page === 'themes' ? 'page' : undefined}>游戏世界</a>}<a href="#/help" aria-current={route.page === 'help' ? 'page' : undefined}>指南</a><a href="#/settings" aria-current={route.page === 'settings' ? 'page' : undefined}>设置</a></nav></header>
    {loadWarning && <div className="global-notice notice" role="status"><p>{loadWarning}</p><button className="text-link" onClick={() => setLoadWarning(null)} type="button">知道了</button></div>}
    {saveError && route.page !== 'result' && route.page !== 'settings' && <div className="global-notice">{renderSaveNotice(true)}</div>}
    {gallery?.warning && route.page !== 'home' && <div className="global-notice notice" role="status"><p>{gallery.warning}</p></div>}
    {gallerySaveError && route.page === 'result' && <div className="global-notice">{renderGallerySaveNotice()}</div>}
    <main id="main-content" ref={mainRef} tabIndex={-1} key={galleryWorldMounted ? 'gallery-world' : routeKey}>
      {galleryWorldMounted && <div className="gallery-world-slot" hidden={galleryWorldSuspended} inert={galleryWorldSuspended}>{renderWorld(galleryWorldSuspended)}</div>}
      {travelerSelectionVisible && <TravelerSelection current={travelerId} onConfirm={confirmTraveler}
        onDirectGameWorld={gameWorldAvailable ? openGameWorld : undefined} />}
      {['themes', 'games', 'levels', 'play-latest', 'play', 'result'].includes(route.page)
        ? <MobileLandscapeGuard active>{page}</MobileLandscapeGuard> : page}
    </main>

  </div>;
}

function Breadcrumb({ catalog, items }: { catalog: ContentCatalog; items: { label: string; href?: string }[] }) {
  const parent = [...items].reverse().find(item => item.href);
  return <nav className="breadcrumb" aria-label="当前位置">{parent && <a className="breadcrumb-back" href={parent.href} aria-label={`返回${parent.label}`}><Asset catalog={catalog} id="icon-back" /><span>{parent.label}</span></a>}</nav>;
}


