import { FirstGalleryOverlay, GalleryUnlockNotice, type GalleryRequest } from './FirstGalleryOverlay';
import { GalleryTasks } from './GalleryTasks';
import type { ContentCatalog } from '../types';
import type { GalleryInteraction } from '../content/world/first-gallery-v001';
import type { MusicGuideLineId } from '../content/world/music-guide-v001';
import { WorldMiniMap, type MapUnlockedGalleries } from './WorldMiniMap';
import { worldMinimapPosition } from '../world/world-minimap';
import { fromTerrainPoint } from '../world/terrain-rules-v001';
import { buddhaSubtitleAt } from '../content/world/buddha-narration';
import {deerStoryV009} from '../content/world/deer-introduction-v009';
import {inMogaoRoom as inMogaoRoomV8} from '../world/mogao-rules-v008';
import {noviceStory} from '../content/world/novice-story';
import { inMogaoRoom as inMogaoRoomV3 } from '../world/mogao-rules-v003';
import { inMogaoRoom as inMogaoRoomV2 } from '../world/mogao-rules-v002';
import { inMogaoRoom } from '../world/mogao-rules-v001';
import { WorldSubtitle } from './WorldSubtitle';
import { WorldCultureChoice } from './WorldCultureChoice';
import { inMusicCourtV4 } from '../world/music-pavilion-rules-v004';
import { inMusicCourtV2 } from '../world/music-pavilion-rules-v002';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { SoundPreferences } from '../services/sound-settings';
import { discoveryReducer, discoveryView, initialDiscoveryState } from '../world/events';
import { withVisitedDiscovery } from '../world/session';
import type { WorldCheckpoint, WorldRuntime, WorldSnapshot } from '../world/types';
import type { TravelerId } from '../content/world/assets';
import type { MogaoHallAStoryId } from '../world/mogao-hall-a-scene';
import { isFirstGalleryUnlocked, loadFirstGallery } from '../services/first-gallery';
import type { WorldRewardId } from '../content/world/mogao-rewards-v001';
import { claimMogaoGameNotice, hasMogaoGameAccess } from '../services/mogao-game-access';
import type { FlyingHistorySnapshot } from '../world/flying-history';
import { finishedMogaoHallA, loadMogaoHallAProgress } from '../services/mogao-hall-a-progress';
import { finishedMogaoExhibit, loadMogaoExhibitProgress } from '../services/mogao-exhibit-progress';
import { claimMusicGalleryUnlockNotice, completedMusicGalleryChallenges, finishedMusicGallery, loadMusicGalleryProgress } from '../services/music-gallery-progress';
import { WorldFlyingObservation } from './WorldFlyingObservation';
import { WorldStoryPlayer } from './WorldStoryPlayer';
import { loadCinematicSeen, saveCinematicSeen } from '../world/character-cinematics';
import { useMogaoExhibit } from './use-mogao-exhibit';
import { useMogaoHallNarration } from './use-mogao-hall-narration';
import { useMusicInstrument } from './use-music-instrument';
import { useMusicGuideVoice } from './use-music-guide-voice';
import type { MusicGalleryExploration } from './use-music-gallery-progress';
import '../styles/world.css';

const PORTRAIT_QUERY = '(orientation: portrait)';
const MogaoExhibitOverlay = lazy(() => import('./MogaoExhibitOverlay').then(module => ({ default: module.MogaoExhibitOverlay })));
const MogaoHallAStory = lazy(() => import('./MogaoHallAStory'));
const MogaoRewardOverlay = lazy(() => import('./MogaoRewardOverlay').then(module => ({ default: module.MogaoRewardOverlay })));
const MusicInstrumentOverlay = lazy(() => import('./MusicInstrumentOverlay').then(module => ({ default: module.MusicInstrumentOverlay })));
const MusicGuideDialogue = lazy(() => import('./MusicGuideOverlay').then(module => ({ default: module.MusicGuideDialogue })));
const MusicGuideWardrobe = lazy(() => import('./MusicGuideOverlay').then(module => ({ default: module.MusicGuideWardrobe })));
const WorldFlyingHistory = lazy(() => import('./WorldFlyingHistory').then(module => ({ default: module.WorldFlyingHistory })));

type RewardOverlay = { kind: 'award'; id: WorldRewardId } | { kind: 'guide' }
  | { kind: 'paper'; id: WorldRewardId; fromGuide: boolean };

interface Props {
  firstGallery?: boolean;
  connectedGalleries?: boolean;
  travelerId?: TravelerId;
  onChooseTraveler?(): void;
  suspended?: boolean;
  catalog?: ContentCatalog;
  onGalleryColoring?(checkpoint: WorldCheckpoint, artworkId?: string): boolean;
  onGalleryFallback?(): void;
  galleryReturningFromColoring?: boolean;
  galleryPortalPending?: boolean;
  onGalleryPortalPresented?(): void;
  onGalleryPortalEnter?(checkpoint: WorldCheckpoint): void;
  initial: WorldCheckpoint;
  saveWarning: string | null;
  reducedMotion: boolean;
  sound: SoundPreferences;
  gameWorldAvailable: boolean;
  onDirectGameWorld(event: MouseEvent<HTMLAnchorElement>): boolean;
  onCheckpoint(checkpoint: WorldCheckpoint): void;
  musicGallery?: MusicGalleryExploration;
  unlockedMapGalleries?: MapUnlockedGalleries;
  onEnterMusicGames?(checkpoint: WorldCheckpoint): void;
  onEnterMogaoGames?(checkpoint: WorldCheckpoint): void;
}

export default function WorldScreen(props: Props) {
  const connectedGalleries = !!props.connectedGalleries;
  const caissonOnly = document.getElementById('root')?.dataset.caissonOnly === 'v001';
  const { travelerId } = props;
  const terrain=document.getElementById('root')?.dataset.terrain==='v001';
  const upperPreview=connectedGalleries || document.getElementById('root')?.dataset.mogaoUpper==='v002';
  const exhibitPreview=connectedGalleries || document.getElementById('root')?.dataset.mogaoExhibit==='v001';
  const companionVersion=connectedGalleries ? 'v002' : document.getElementById('root')?.dataset.musicCompanion;
  const companionPreview=companionVersion==='v001'||companionVersion==='v002';
  const musicInteriorPreview=companionVersion==='v002';
  const musicInstrumentPreview = connectedGalleries || (musicInteriorPreview && document.getElementById('root')?.dataset.musicInstruments === 'v001');
  const musicGuidePreview = connectedGalleries || (musicInteriorPreview && document.getElementById('root')?.dataset.musicGuide === 'v001');
  const musicBalconyV2 = document.getElementById('root')?.dataset.musicBalcony === 'v002';
  const terrainCaisson=terrain&&document.getElementById('root')?.dataset.terrainCaisson==='v001';
  const initialLook=useRef<number|undefined>(terrainCaisson?Number(document.getElementById('root')?.dataset.terrainInitialLook??'NaN'):undefined);
  const flyingVoicePreview=document.getElementById('root')?.dataset.flyingVoice==='v001';
  const flyingHistoryPreview = connectedGalleries || (musicInteriorPreview && document.getElementById('root')?.dataset.flyingHistory === 'v001');
  const musicVersion = document.getElementById('root')?.dataset.musicPavilion;
  const mogaoVersion = document.getElementById('root')?.dataset.mogao;
  const globalLook=mogaoVersion==='v011'||mogaoVersion==='v012';
  const mogaoV10=globalLook||mogaoVersion==='v010';
  const modernCave=mogaoV10||mogaoVersion==='v008'||mogaoVersion==='v009';
  const caveKeys=mogaoV10||mogaoVersion==='v009';
  const mogao = mogaoVersion === 'v001' || mogaoVersion === 'v002' || mogaoVersion === 'v003' || mogaoVersion === 'v006' || mogaoVersion === 'v007' || modernCave;
  const oldInMogaoRoom=modernCave?inMogaoRoomV8:(mogaoVersion==='v003'||mogaoVersion==='v006'||mogaoVersion==='v007'||modernCave)?inMogaoRoomV3:mogaoVersion==='v002'?inMogaoRoomV2:inMogaoRoom;
  const inCurrentMogaoRoom=(p:{x:number;z:number})=>oldInMogaoRoom(terrain?fromTerrainPoint('cliff',p):p);
  const musicV6=musicVersion==='v006';
  const musicV5=musicVersion==='v005'||musicV6;
  const musicV4=musicVersion==='v004'||musicV5;
  const oldInMusicCourt=musicV4?inMusicCourtV4:inMusicCourtV2;
  const inCurrentMusicCourt=(p:{x:number;z:number})=>oldInMusicCourt(terrain?fromTerrainPoint('music',p):p);
  const musicV3=musicVersion==='v003';
  const musicV2=musicVersion==='v002'||musicV3||musicV4;
  const musicPreview = musicVersion==='v001'||musicV2;
  const cinematicPreview = document.getElementById('root')?.dataset.characterCinematics === 'v001' || musicPreview;
  const screen = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const wasLocked = useRef(false);
  const wasSuspended = useRef(false);
  const runtime = useRef<WorldRuntime | null>(null);
  const checkpoint = useRef(props.initial);
  const leavingToTheme = useRef(false);
  const callbacks = useRef(props); callbacks.current = props;
  const [snapshot, setSnapshot] = useState<WorldSnapshot>({ checkpoint: props.initial, nearby: null, location: '沙漠道路', moving: false });
  const currentGallery = connectedGalleries ? snapshot.currentGallery ?? null
    : props.firstGallery ? 'first' : musicInteriorPreview ? 'music' : exhibitPreview ? 'mogao' : null;
  const inFirstGallery = currentGallery === 'first';
  const inMusicGallery = currentGallery === 'music';
  const inMogaoGallery = currentGallery === 'mogao';
  const [galleryRequest, setGalleryRequest] = useState<GalleryRequest | null>(null);
  const [galleryOccupied, setGalleryOccupied] = useState(false);
  useEffect(() => {
    if (inFirstGallery) return;
    setGalleryRequest(null);
    setGalleryOccupied(false);
  }, [inFirstGallery]);
  const galleryCounter = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [event, dispatch] = useReducer(discoveryReducer, initialDiscoveryState);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const introTap = useRef<{ id: number; x: number; y: number } | null>(null);
  const view = discoveryView(event);
  const flyingHistoryActive = flyingHistoryPreview && view === 'flying';
  const exhibitGroundStory = inMogaoGallery && view === 'story';
  const portraitBlocked = portrait;
  const [storyReplay, setStoryReplay] = useState(0);
  const [storyBackdrop,setStoryBackdrop]=useState<string>();
  const [hallStory, setHallStory] = useState<{ id: MogaoHallAStoryId; backdrop?: string } | null>(null);
  const hadHallStory = useRef(false);
  const hallStoryPointer = useRef(false);
  const [rewardOverlay, setRewardOverlay] = useState<RewardOverlay | null>(null);
  const [musicUnlockNotice, setMusicUnlockNotice] = useState(false);
  const consideredMusicUnlockNotice = useRef(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [storedMogaoGameAccess, setStoredMogaoGameAccess] = useState(() => exhibitPreview && hasMogaoGameAccess());
  const [mogaoGameNotice, setMogaoGameNotice] = useState(false);
  const showedMogaoGameNotice = useRef(false);
  const [guideEarned, setGuideEarned] = useState<readonly WorldRewardId[]>([]);
  const previousRewardOverlay = useRef<RewardOverlay | null>(null);
  const guideButton = useRef<HTMLButtonElement>(null);
  const suspended = !!props.suspended;
  const locked = suspended || paused || portraitBlocked || !!error;
  const instrument = useMusicInstrument(props.sound, locked || view !== 'follow');
  const instrumentRef = useRef(instrument);
  instrumentRef.current = instrument;
  const musicGuide = musicGuidePreview && inMusicGallery ? snapshot.musicGuide : undefined;
  const [presentedGuideLine, setPresentedGuideLine] = useState<MusicGuideLineId | null>(null);
  const onGuideCaptionPresented = useCallback((line: MusicGuideLineId, presented: boolean) => {
    runtime.current?.setMusicGuideCaptionPresented?.(line, presented);
    setPresentedGuideLine(current => presented ? line : current === line ? null : current);
  }, []);
  const musicGallery = props.musicGallery;
  const exhibitRoom = exhibitPreview && snapshot.checkpoint.walkSurface === 'hall-b';
  const muralRoom = exhibitPreview && snapshot.checkpoint.walkSurface === 'hall-a';
  const arrival = snapshot.mogaoHallArrival;
  const exhibit = useMogaoExhibit(exhibitPreview, snapshot.checkpoint.walkSurface,
    ready && !locked && view === 'follow' && !hallStory && !rewardOverlay, !!arrival);
  const directFirstIntro = exhibit.intro?.first ? exhibit.intro.hall : null;
  const arrivalIntro = arrival?.phase === 'intro' ? arrival.hall : directFirstIntro;
  const revisitIntro = exhibit.intro?.first === false ? exhibit.intro.hall : null;
  const arrivalActive = !!arrival || !!directFirstIntro;
  const mogaoGameUnlocked = exhibitPreview && (exhibit.receivedBoth || storedMogaoGameAccess);
  const gameWorldAvailable = caissonOnly || props.gameWorldAvailable || !!musicGallery?.unlocked || mogaoGameUnlocked;
  const exhibitRef = useRef(exhibit);
  exhibitRef.current = exhibit;
  const portal = snapshot.gallery?.portal;
  const portalPlaying = portal === 'turning' || portal === 'revealing' || portal === 'question' || portal === 'walking';
  const exhibitOccupied = exhibit.occupied || hallStory !== null || rewardOverlay !== null || musicUnlockNotice || instrument.instrument !== null || wardrobeOpen;
  const flags = useRef({ locked, event, paused, galleryOccupied, exhibitOccupied, arrivalActive });
  flags.current = { locked, event, paused, galleryOccupied, exhibitOccupied, arrivalActive };
  const choosing=event.mode==='choosing';
  const introReady = useMogaoHallNarration(exhibitOccupied ? null : arrivalIntro ?? revisitIntro,
    locked || choosing || view !== 'follow' || !ready, props.sound);
  const dismissHallIntro = exhibit.dismissIntro;
  useEffect(() => {
    introTap.current = null;
    if (!revisitIntro || locked || !introReady) return;
    const timer = window.setTimeout(dismissHallIntro, 2_000);
    return () => window.clearTimeout(timer);
  }, [revisitIntro, locked, introReady, dismissHallIntro]);
  const voicedGuideLine = musicGuide?.subtitleOnly ? null : musicGuide?.line ?? null;
  const stopGuideVoice = useMusicGuideVoice(musicGuidePreview, voicedGuideLine,
    !ready || locked || choosing || exhibitOccupied || view !== 'follow' || !!musicGuide?.showcasing || voicedGuideLine !== presentedGuideLine,
    props.sound, line => runtime.current?.finishMusicGuideLine?.(line),
    (line, playing) => runtime.current?.setMusicGuideVoicePlaying?.(line, playing));
  const onFlyingCaptionPresented = useCallback((phase: FlyingHistorySnapshot['phase'], chapter: number | null, presented: boolean) => {
    runtime.current?.setFlyingHistoryCaptionPresented?.(phase, chapter, presented);
  }, []);

  const requestGallery = useCallback((id: GalleryInteraction, object?: 'lotus' | 'bird' | 'grapes') => {
    if (caissonOnly && id !== 'caisson') return;
    if (flags.current.locked || flags.current.galleryOccupied || flags.current.exhibitOccupied) return;
    setGalleryRequest({ id, object, serial: ++galleryCounter.current });
  }, [caissonOnly]);
  const startInteraction = useCallback(() => {
    if (flags.current.galleryOccupied || flags.current.exhibitOccupied || flags.current.arrivalActive) return;
    const gallery = runtime.current?.snapshot().gallery?.nearby;
    if (gallery) { requestGallery(gallery); return; }
    if (flags.current.locked || flags.current.event.mode !== 'exploring') return;
    const nearby = runtime.current?.snapshot().nearby;
    if (nearby) {
      if (nearby === 'novice-story' || (exhibitPreview && nearby === 'story-demo')) setStoryBackdrop(runtime.current?.captureFrame?.());
      if (nearby === 'flying') runtime.current?.controlFlyingHistory?.({ type: 'unlock' });
      dispatch({ type: 'start', id: nearby, nearby });
    }
  }, [exhibitPreview]);
  const currentCheckpoint = useCallback(() => {
    if (leavingToTheme.current) return checkpoint.current;
    const latest = runtime.current?.snapshot().checkpoint ?? checkpoint.current;
    return { ...latest, visitedEvents: [...new Set([...latest.visitedEvents,...checkpoint.current.visitedEvents])] };
  }, []);
  const persist = useCallback(() => {
    checkpoint.current = currentCheckpoint(); callbacks.current.onCheckpoint(checkpoint.current);
  }, [currentCheckpoint]);
  const directGameWorld = gameWorldAvailable && <a href="#/themes" onClick={event => {
    if (!props.onDirectGameWorld(event)) return;
    persist();
    leavingToTheme.current = true;
    runtime.current?.setPaused(true);
  }}>直接进入游戏世界</a>;
  const openMogaoGames = useCallback(() => {
    const status = flags.current;
    const activeRuntime = runtime.current;
    const enter = callbacks.current.onEnterMogaoGames;
    if (status.locked || status.exhibitOccupied || status.arrivalActive || status.event.mode !== 'exploring' ||
      !activeRuntime?.snapshot().mogaoGamePortalNearby || !enter) return;
    const at = currentCheckpoint();
    checkpoint.current = at;
    leavingToTheme.current = true;
    activeRuntime.setPaused(true);
    enter(at);
  }, [currentCheckpoint]);
  const openMusicGames = useCallback(() => {
    const status = flags.current;
    const activeRuntime = runtime.current;
    const enter = callbacks.current.onEnterMusicGames;
    if (leavingToTheme.current || status.locked || status.exhibitOccupied || status.event.mode !== 'exploring' ||
      !activeRuntime?.snapshot().musicGamePortalNearby || !callbacks.current.musicGallery?.unlocked || !enter) return;
    const at = currentCheckpoint();
    checkpoint.current = at;
    leavingToTheme.current = true;
    activeRuntime.setPaused(true);
    enter(at);
  }, [currentCheckpoint]);
  const pauseExploration = useCallback(() => {
    if (callbacks.current.suspended) return;
    // Stop input/RAF and publish the exact final pose in the same event as the pause UI.
    // A passive effect would leave one paint in which the overlay and world disagree.
    runtime.current?.setPaused(true);
    setPaused(true);
    persist();
  }, [persist]);

  useEffect(() => {
    let disposed = false;
    let instance: WorldRuntime | null = null;
    setReady(false); setError(null);
    void import('../world/runtime').then(({ createWorldRuntime }) => {
      if (disposed || !host.current) return;
      instance = createWorldRuntime(host.current, {
        firstGallery: callbacks.current.firstGallery, onGalleryInteract: requestGallery,
        connectedGalleries,
        travelerId,
        musicGalleryUnlocked: callbacks.current.musicGallery?.unlocked,
        musicBalconyV2, flyingHistory: flyingHistoryPreview,
        onMusicFlyingChapter: index => callbacks.current.musicGallery?.record({ type: 'chapter', index }),
        ...(callbacks.current.musicGallery ? { musicGamePortal: {
          unlocked: callbacks.current.musicGallery.unlocked,
          onEnter: openMusicGames,
        } } : {}),
        ...(musicGuidePreview ? { musicGuide: true, onMusicGuideWardrobe: () => {
          if (flags.current.locked || flags.current.exhibitOccupied || flags.current.event.mode !== 'exploring') return;
          stopGuideVoice();
          runtime.current?.setPaused(true);
          setWardrobeOpen(true);
        } } : {}),
        ...(musicInstrumentPreview ? { onMusicInstrument: (id: Parameters<typeof instrument.startInstrument>[0]) => {
          if (flags.current.locked || flags.current.exhibitOccupied || flags.current.event.mode !== 'exploring') return;
          if (musicGuidePreview) {
            stopGuideVoice();
            runtime.current?.cancelMusicGuideLine?.();
          }
          if (instrumentRef.current.startInstrument(id)) {
            runtime.current?.setPaused(true);
            callbacks.current.musicGallery?.record({ type: 'instrument', id });
          }
        } } : {}),
        ...(exhibitPreview ? { mogaoExhibit: {
          gateLocked: exhibitRef.current.gateLocked,
          hallAGateLocked: exhibitRef.current.hallAGateLocked,
          gamePortalUnlocked: exhibitRef.current.receivedBoth || hasMogaoGameAccess(),
          onGamePortal: openMogaoGames,
          canStartHallArrival: hall => !flags.current.locked && !flags.current.exhibitOccupied && !exhibitRef.current.hasOpenedArtwork(hall),
          onInteract: id => {
            if (flags.current.locked || flags.current.exhibitOccupied || flags.current.arrivalActive || flags.current.event.mode !== 'exploring') return;
            runtime.current?.setPaused(true);
            exhibitRef.current.select(id);
          },
          onStory: id => {
            if (flags.current.locked || flags.current.exhibitOccupied || flags.current.arrivalActive || flags.current.event.mode !== 'exploring') return;
            exhibitRef.current.openStory();
            const backdrop = runtime.current?.captureFrame?.();
            runtime.current?.setPaused(true);
            hallStoryPointer.current = false;
            setHallStory({ id, backdrop });
          },
          onGateOpened: () => exhibitRef.current.gateOpened(),
          onHallAGateOpened: () => exhibitRef.current.hallAGateOpened(),
        } } : {}),
        mogaoUpperVersion: upperPreview ? 'v002' : undefined,
        companionVersion: companionPreview ? companionVersion as 'v001'|'v002' : undefined,
        terrainVersion:terrain?'v001':undefined, environmentVersion:terrain&&document.getElementById('root')?.dataset.environment==='v001'?'v001':undefined, terrainCaissonVersion:terrainCaisson?'v001':undefined, initialLook:initialLook.current, mogao, mogaoFacadeVersion:document.getElementById('root')?.dataset.mogaoFacade==='v005'?'v005':undefined, mogaoSurfaceVersion:document.getElementById('root')?.dataset.mogaoSurface==='v004'?'v004':undefined, mogaoVersion:mogaoVersion==='v012'?'v012':globalLook?'v011':mogaoV10?'v010':mogaoVersion==='v009'?'v009':mogaoVersion==='v008'?'v008':mogaoVersion==='v007'?'v007':mogaoVersion==='v006'?'v006':mogaoVersion==='v003'?'v003':mogaoVersion==='v002'?'v002':'v001', flyingVoice: flyingVoicePreview, musicPavilion: musicPreview, musicVersion: musicV6?'v006':musicV5?'v005':musicV4?'v004':musicV3?'v003':musicV2?'v002':'v001', sound: callbacks.current.sound, initial: checkpoint.current, reducedMotion: callbacks.current.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        ...(cinematicPreview && !terrain ? { cinematics: {
          seen: (() => { try { return loadCinematicSeen(window.sessionStorage); } catch { return { opening: false, hall: false }; } })(),
          onSeen: (seen: { opening: boolean; hall: boolean }) => { try { saveCinematicSeen(window.sessionStorage, seen); } catch { /* Browser storage access can itself be denied. */ } },
        } } : {}),
        onSnapshot: next => { if (!disposed) setSnapshot(next); },
        onInteract: startInteraction,
        onReady: () => { if (!disposed) { initialLook.current=undefined; const root=document.getElementById('root'); if(root)delete root.dataset.terrainInitialLook; setReady(true); } },
        onError: message => { if (!disposed) { stopGuideVoice(); setWardrobeOpen(false); setError(message); setReady(false); } },
      });
      if (disposed) { instance.dispose(); return; }
      runtime.current = instance;
      if (terrain) Object.assign(window, { __terrain: { inspect: () => instance?.inspect(), overview:(enabled:boolean)=>instance?.setOverview?.(enabled) } });
      if (mogao) Object.assign(window, { __mogao: { inspect: () => instance?.inspect() } });
      if (musicPreview) Object.assign(window, { __musicPavilion: { inspect: () => instance?.inspect(), recordingAudio: () => instance?.recordingAudio?.()??null } });
      if (cinematicPreview) Object.assign(window, { __characterCinematics: { inspect: () => instance?.inspect(), skip: () => instance?.skipCinematic() } });
      instance.setPaused(flags.current.locked || flags.current.exhibitOccupied);

    }).catch(() => { if (!disposed) setError('3D画面暂时无法启动。请重新加载。'); });
    return () => {
      disposed = true;
      if (instance) {
        const latest = instance.snapshot().checkpoint;
        checkpoint.current = leavingToTheme.current ? checkpoint.current : { ...latest, visitedEvents: [...new Set([...latest.visitedEvents,...checkpoint.current.visitedEvents])] };
        callbacks.current.onCheckpoint(checkpoint.current);
        instance.dispose();
      }
      runtime.current = null;
      if (terrain) Reflect.deleteProperty(window, '__terrain');
      if (mogao) Reflect.deleteProperty(window, '__mogao');
      if (musicPreview) Reflect.deleteProperty(window, '__musicPavilion');
      if (cinematicPreview) Reflect.deleteProperty(window, '__characterCinematics');
    };
  }, [attempt, startInteraction, openMogaoGames, openMusicGames, connectedGalleries, travelerId, exhibitPreview, musicBalconyV2, musicGuidePreview, musicInstrumentPreview, flyingHistoryPreview, stopGuideVoice]);

  useLayoutEffect(() => {
    if (wasSuspended.current && !suspended) leavingToTheme.current = false;
    wasSuspended.current = suspended;
    runtime.current?.setView(view);
    runtime.current?.setMogaoExhibitGateLocked?.(exhibit.gateLocked);
    runtime.current?.setMogaoHallAGateLocked?.(exhibit.hallAGateLocked);
    runtime.current?.setPaused(locked || choosing || exhibitOccupied || !!directFirstIntro || view === 'story' || (event.mode === 'observing' && event.paused));
    runtime.current?.setJoystick(0, 0); setStick({ x: 0, y: 0 }); pointer.current = null;
  }, [suspended, locked, view, event, ready, exhibitOccupied, arrivalActive, directFirstIntro, exhibit.gateLocked, exhibit.hallAGateLocked]);
  useEffect(() => {
    if (!exhibitPreview) return;
    const refresh = () => setStoredMogaoGameAccess(hasMogaoGameAccess());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [exhibitPreview]);
  useEffect(() => {
    if (!ready || !mogaoGameUnlocked) return;
    runtime.current?.unlockMogaoGamePortal?.();
    if (!inMogaoGallery || locked || view !== 'follow' || exhibitOccupied || arrivalActive || showedMogaoGameNotice.current) return;
    showedMogaoGameNotice.current = true;
    if (claimMogaoGameNotice()) setMogaoGameNotice(true);
  }, [ready, locked, view, exhibitOccupied, arrivalActive, inMogaoGallery, mogaoGameUnlocked]);
  useEffect(() => {
    if (!mogaoGameNotice) return;
    const timeout = window.setTimeout(() => setMogaoGameNotice(false), 10000);
    return () => window.clearTimeout(timeout);
  }, [mogaoGameNotice]);
  const pendingAward = exhibit.pendingAward ?? (inMusicGallery && musicGallery?.pendingAward ? 'music-gallery' : null);
  const guideBusy = !!(musicGuide?.showcasing || musicGuide?.line || musicGuide?.invitation);
  useEffect(() => {
    if (!ready) return;
    if (connectedGalleries) {
      const prewarmCliffTower = !!musicGallery?.progress && completedMusicGalleryChallenges(musicGallery.progress) === 2;
      runtime.current?.setMusicGalleryAccess?.(!!musicGallery?.unlocked, prewarmCliffTower);
    }
    if (musicGallery?.unlocked) runtime.current?.unlockMusicGamePortal?.();
  }, [ready, connectedGalleries, musicGallery?.unlocked, musicGallery?.progress]);
  useEffect(() => {
    if (!ready || !inMusicGallery || locked || view !== 'follow' || exhibitOccupied || guideBusy || !musicGallery?.unlocked ||
      musicGallery.pendingAward || consideredMusicUnlockNotice.current) return;
    consideredMusicUnlockNotice.current = true;
    if (claimMusicGalleryUnlockNotice()) setMusicUnlockNotice(true);
  }, [ready, inMusicGallery, locked, view, exhibitOccupied, guideBusy, musicGallery?.unlocked, musicGallery?.pendingAward]);
  useEffect(() => {
    if (!pendingAward || !ready || locked || view !== 'follow' || exhibitOccupied || galleryOccupied || arrivalActive) return;
    if (pendingAward === 'music-gallery' && guideBusy) return;
    runtime.current?.setPaused(true);
    setRewardOverlay({ kind: 'award', id: pendingAward });
  }, [pendingAward, ready, locked, view, exhibitOccupied, galleryOccupied, arrivalActive, guideBusy]);
  useEffect(()=>{
    if(locked||flyingHistoryActive||event.mode!=='observing'||event.paused)return;
    if((event.id==='flying'&&snapshot.flying?.complete&&(!snapshot.flyingVoice||snapshot.flyingVoice.ended))||
       (event.id==='caisson'&&(snapshot.observationTime??0)>=3))dispatch({type:'complete'});
  },[locked,flyingHistoryActive,event,snapshot.flying?.complete,snapshot.flyingVoice?.ended,snapshot.observationTime]);
  useLayoutEffect(() => {
    if (locked) {
      const cover = screen.current?.querySelector<HTMLElement>(error ? '[data-testid="world-error"]' : portraitBlocked ? '.world-rotate' : '.world-pause-cover');
      cover?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus({ preventScroll: true });
    } else if (wasLocked.current || (hadHallStory.current && !hallStory) || (previousRewardOverlay.current && !rewardOverlay)) {
      const fromGuide = previousRewardOverlay.current?.kind === 'guide';
      const restored = rewardOverlay ? screen.current?.querySelector<HTMLElement>('[data-mogao-reward-dialog]')
        : fromGuide ? guideButton.current
        : choosing ? screen.current?.querySelector<HTMLElement>('.world-culture-choice') : view === 'story' || hallStory
        ? screen.current?.querySelector<HTMLElement>('[data-testid="world-story"]')
        : wardrobeOpen ? screen.current?.querySelector<HTMLElement>('.music-guide-wardrobe-close')
        : host.current?.querySelector('canvas');
      restored?.focus({ preventScroll: true });
    }
    wasLocked.current = locked;
    hadHallStory.current = hallStory !== null;
    previousRewardOverlay.current = rewardOverlay;
  }, [locked, portraitBlocked, paused, error, view, ready, choosing, hallStory, rewardOverlay, wardrobeOpen]);
  useEffect(() => { runtime.current?.setSound?.(props.sound); }, [props.sound, ready]);
  useEffect(() => { runtime.current?.setReducedMotion(props.reducedMotion || systemReduced); }, [props.reducedMotion, systemReduced]);
  useEffect(() => {
    const ratio = window.matchMedia(PORTRAIT_QUERY);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = pauseExploration;
    const visibility = () => { if (document.hidden) stop(); };
    const orientation = () => { setPortrait(ratio.matches); stop(); };
    const reduce = () => setSystemReduced(motion.matches);
    const key = (e: KeyboardEvent) => {
      if (callbacks.current.suspended) return;
      if (flags.current.exhibitOccupied && !flags.current.paused) return;
      if(caveKeys&&!e.repeat&&!flags.current.galleryOccupied&&!flags.current.locked&&flags.current.event.mode==='exploring'&&!(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable=true],[role=dialog]'))){
        if(e.code==='KeyR'){e.preventDefault();runtime.current?.tiltCamera?.(.22);return;}
        if(e.code==='KeyT'){e.preventDefault();runtime.current?.tiltCamera?.(-.22);return;}
        if(e.code==='KeyC'){e.preventDefault();runtime.current?.resetCameraLook?.();return;}
      }
      if (e.key !== 'Escape' || e.repeat) return;
      // Escape belongs to the topmost global pause, not the inert story beneath it.
      if (flags.current.paused) { setPaused(false); return; }
      if (!flags.current.locked && exhibitRef.current.intro?.first === false) { exhibitRef.current.dismissIntro(); return; }
      if (flyingHistoryPreview && discoveryView(flags.current.event) === 'flying') return;
      if (flags.current.galleryOccupied) {
        const gallery = runtime.current?.snapshot().gallery;
        if (!gallery?.mural?.active && gallery?.portal !== 'turning' && gallery?.portal !== 'revealing'
          && gallery?.portal !== 'question' && gallery?.portal !== 'walking') return;
      }
      if (runtime.current?.snapshot().cinematic) runtime.current.skipCinematic();
      else if (flags.current.event.mode !== 'exploring') dispatch({ type: 'exit' });
      else pauseExploration();
    };
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', key);
    ratio.addEventListener('change', orientation); motion.addEventListener('change', reduce);
    const timer = window.setInterval(() => { if (!callbacks.current.suspended) persist(); }, 2000);
    return () => {
      clearInterval(timer); window.removeEventListener('blur', stop); window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', key);
      ratio.removeEventListener('change', orientation); motion.removeEventListener('change', reduce);
    };
  }, [persist, pauseExploration, flyingHistoryPreview]);

  function finishEvent() {
    if (event.mode !== 'exploring' && (event.id !== 'flying' || runtime.current?.snapshot().flying?.complete)) checkpoint.current = withVisitedDiscovery(currentCheckpoint(), event.id);
    dispatch({ type: 'exit' }); setStoryBackdrop(undefined); persist(); host.current?.querySelector('canvas')?.focus();
  }
  function finishStoryPlayback() {
    if (exhibitGroundStory && event.mode === 'observing' && (event.id === 'story-demo' || event.id === 'novice-story')) {
      exhibit.completeStory(event.id);
    }
    dispatch({ type: 'complete' });
  }
  function openGuide() {
    if (locked || !ready || view !== 'follow' || galleryOccupied || exhibitOccupied || arrivalActive) return;
    const earned: WorldRewardId[] = [];
    if (isFirstGalleryUnlocked(loadFirstGallery().data)) earned.push('first-gallery');
    if (exhibitPreview ? exhibit.earnedA : finishedMogaoHallA(loadMogaoHallAProgress().data)) earned.push('hall-a');
    if (exhibitPreview ? exhibit.earnedB : finishedMogaoExhibit(loadMogaoExhibitProgress().data)) earned.push('hall-b');
    if (musicGallery?.unlocked || finishedMusicGallery(loadMusicGalleryProgress())) earned.push('music-gallery');
    runtime.current?.setPaused(true);
    setGuideEarned(earned);
    setRewardOverlay({ kind: 'guide' });
  }
  function closeRewardView() {
    setRewardOverlay(rewardOverlay?.kind === 'paper' && rewardOverlay.fromGuide ? { kind: 'guide' } : null);
  }
  function receiveReward(id: WorldRewardId, read: boolean) {
    if (rewardOverlay?.kind !== 'award' || rewardOverlay.id !== id) return;
    if (id === 'music-gallery') musicGallery?.record({ type: 'receive' });
    else if (id === 'hall-a' || id === 'hall-b') exhibit.receiveAward(id);
    setRewardOverlay(read ? { kind: 'paper', id, fromGuide: false } : null);
  }
  function closeHallStory() {
    setHallStory(null);
  }
  function closeArrivalIntro() {
    if (!arrivalIntro || locked || !introReady) return;
    exhibit.markIntroShown(arrivalIntro);
    dismissHallIntro();
    runtime.current?.finishHallArrival?.();
    persist();
  }
  function startIntroTap(event: PointerEvent<HTMLDivElement>) {
    introTap.current = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }
  function trackIntroTap(event: PointerEvent<HTMLDivElement>) {
    const start = introTap.current;
    if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) introTap.current = null;
  }
  function finishIntroTap(event: PointerEvent<HTMLDivElement>) {
    trackIntroTap(event);
    if (introTap.current?.id === event.pointerId) dismissHallIntro();
    introTap.current = null;
  }
  function closeMusicGuideWardrobe() {
    runtime.current?.respondMusicGuide?.('dismiss');
    setWardrobeOpen(false);
  }
  function changeStick(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId || locked || exhibitOccupied || arrivalActive || view !== 'follow') return;
    const box = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - box.left - box.width / 2) / (box.width * .35);
    let y = (e.clientY - box.top - box.height / 2) / (box.height * .35);
    const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
    setStick({ x, y }); runtime.current?.setJoystick(x, y);
  }
  function releaseStick() { pointer.current = null; setStick({ x: 0, y: 0 }); runtime.current?.setJoystick(0, 0); }
  function trapCoverFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    event.preventDefault(); event.stopPropagation();
    // Manage every step, not just wraparound: Safari may omit buttons from native Tab order.
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter(control => control.getClientRects().length > 0 && control.getAttribute('aria-disabled') !== 'true');
    if (!controls.length) { event.currentTarget.focus({ preventScroll: true }); return; }
    const current = controls.findIndex(control => control === document.activeElement);
    const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
      : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus({ preventScroll: true });
  }
  const galleryHeading = connectedGalleries ? inFirstGallery ? '第一馆 · 纹样与色彩' : inMusicGallery ? '第二馆 · 乐舞馆'
    : inMogaoGallery ? muralRoom ? '第三馆 · 绘世厅' : exhibitRoom ? '第三馆 · 佛法厅' : '第三馆 · 佛像里的千年敦煌' : '三馆漫游'
    : props.firstGallery ? '第一馆 · 纹样与色彩' : musicInteriorPreview ? '室内装修样片 · 第二馆' : companionPreview ? '并排导览原型 · 第二馆'
    : exhibitPreview ? muralRoom ? '第三馆 · 绘世厅' : exhibitRoom ? '第三馆 · 佛法厅' : '第三馆 · 佛像里的千年敦煌'
    : upperPreview ? '壁画洞窟灰模 · 待确认' : terrain ? '地形样片 · 待确认' : globalLook ? '石窟样片 · 待确认'
    : mogao ? '莫高窟样片 · 待确认' : musicPreview ? '乐舞馆样片 · 待确认' : cinematicPreview ? '角色镜头样片 · 待确认' : '美术样片 · 待确认';
  const showUpperLocation = upperPreview && (!connectedGalleries || inMogaoGallery);
  const hideHeading = connectedGalleries || !!props.firstGallery || musicGuidePreview || exhibitPreview;
  const thirdRouteOpen = musicUnlockNotice && (connectedGalleries || isFirstGalleryUnlocked(loadFirstGallery().data));
  const mapAvailable = view === 'follow' && !snapshot.overview && !snapshot.gallery?.mural?.active && !portalPlaying;
  return <div ref={screen} className={`world-screen${inMogaoGallery?' has-mogao-exhibit':''}${inMusicGallery?' has-music-interior':''}${globalLook||mogao&&inCurrentMogaoRoom(snapshot.checkpoint.position)?' has-cave-look':''}${choosing?' has-culture-choice':''}${view === 'story' || hallStory ? ' is-story' : view === 'flying' ? ' is-flying' : ''}${flyingHistoryActive?' is-flying-history':''}`} data-testid="world-screen" data-view={view} data-current-gallery={currentGallery ?? undefined} data-mural-tour={snapshot.gallery?.mural?.active || undefined} data-portal-tour={portalPlaying || undefined} data-mogao-arrival={arrival?.phase}
    onPointerDownCapture={revisitIntro && !locked ? startIntroTap : undefined}
    onPointerMoveCapture={revisitIntro && !locked ? trackIntroTap : undefined}
    onPointerUpCapture={revisitIntro && !locked ? finishIntroTap : undefined}
    onPointerCancelCapture={revisitIntro ? () => { introTap.current = null; } : undefined}>
    <div className="world-host" ref={host} data-testid="world-host" data-ready={ready} aria-label="3D探索世界" inert={locked || choosing || exhibitOccupied || arrivalActive || view === 'story' ? true : undefined} />
    <output hidden data-testid="world-position" data-x={snapshot.checkpoint.position.x.toFixed(3)} data-z={snapshot.checkpoint.position.z.toFixed(3)} data-walk-surface={snapshot.checkpoint.walkSurface} data-upper-height={snapshot.upper?.height.toFixed(3)} />
    <div className="world-hud" inert={view === 'story' || flyingHistoryActive || locked || choosing || exhibitOccupied ? true : undefined}>
      {terrain && ready && !caissonOnly && <WorldMiniMap
        imageUrl={`${import.meta.env.BASE_URL}assets/world/world-map/v001/world-map.png`}
        marker={mapAvailable ? worldMinimapPosition(snapshot.checkpoint.position) : null}
        unlockedGalleries={props.unlockedMapGalleries} available={mapAvailable}
        reducedMotion={props.reducedMotion || systemReduced} />}
      <header className={`world-topbar${hideHeading ? ' world-topbar-nav-only' : ''}`}><div className="world-heading" hidden={hideHeading}><p>{galleryHeading}</p><h1>敦煌寻宝记</h1>
        {showUpperLocation ? <span data-testid="world-location">{snapshot.upper ? `${snapshot.upper.label} · ${snapshot.upper.height >= 0 ? '+' : ''}${snapshot.upper.height.toFixed(2)} 米` : snapshot.location}<br/>
          <small>{exhibitPreview ? muralRoom ? '点击壁画或题名观看故事' : exhibitRoom ? '佛像里的千年敦煌' : '二层绘世厅 · 三层佛法厅' : '新增展厅故事待布置'}</small></span>
          : (connectedGalleries || !(globalLook || mogaoV10 && inCurrentMogaoRoom(snapshot.checkpoint.position))) && <span data-testid="world-location">{snapshot.location}</span>}
      </div>
        <nav aria-label="世界导航">
          {gameWorldAvailable && <a href="#/themes" inert={portalPlaying || arrivalActive} onClick={persist}>游戏世界</a>}
          <button type="button" className="world-compact-button" ref={guideButton} inert={portalPlaying || arrivalActive} onClick={openGuide} data-testid="mogao-reward-guide-button">图鉴</button>
          {(connectedGalleries || currentGallery) && <GalleryTasks gallery={currentGallery} disabled={portalPlaying || arrivalActive || galleryOccupied || exhibitOccupied}
            musicProgress={musicGallery?.progress} muralProgress={exhibit.muralProgress} exhibitProgress={exhibit.exhibitProgress} />}
          <a href="#/settings" inert={portalPlaying || arrivalActive} onClick={persist}>设置</a>
        </nav>
      </header>
      {view === 'follow' && !snapshot.overview && <>
        {companionPreview && !musicGuidePreview && ready && snapshot.companion && <aside className="world-companion-panel" aria-label="同行者原型">
          <strong>临时导览者</strong>
          <span>{snapshot.companion.mode==='dialogue'?'测试对话':snapshot.companion.mode==='following'?(snapshot.companion.chasing?'正在靠近':snapshot.companion.speed>4?'并排跑步':'并排行走'):snapshot.companion.mode==='waiting'?(musicInteriorPreview?'等待通路':'仅在一楼平地跟随'):'停步等候'} · {snapshot.companion.distance.toFixed(1)} 米</span>
          <small>{musicInteriorPreview ? snapshot.location : '走进地面圆环，测试对话'}</small>
        </aside>}
        {companionPreview && !musicGuidePreview && snapshot.companion?.dialogue && !locked && <aside className="world-companion-dialogue" aria-label="同行者测试对白">
          <p>{snapshot.companion.dialogue.text}</p>
          <small>{snapshot.companion.speech.status==='speaking'?'浏览器合成语音 · 临时测试':snapshot.companion.speech.status==='muted'?'已静音 · 字幕预览':'测试字幕 · 可播放浏览器语音'}</small>
          <div><button type="button" onClick={()=>runtime.current?.replayCompanionDialogue?.()} disabled={snapshot.companion.speech.status==='muted'}>播放测试语音</button><button type="button" onClick={()=>runtime.current?.finishCompanionDialogue?.()}>结束对话</button></div>
        </aside>}
        {musicGuide && !musicGuide.showcasing && ready && !locked && !exhibitOccupied && <Suspense fallback={null}>
          <MusicGuideDialogue line={musicGuide.line} invitation={musicGuide.invitation}
            nearby={musicGuide.nearby && musicGuide.atBirthplace && !snapshot.nearby && !snapshot.musicGamePortalNearby && !snapshot.stairAssist?.active}
            actionLabel={musicGuide.canDress ? '继续变装' : '与小导游交谈'}
            onCaptionPresented={onGuideCaptionPresented}
            onInteract={() => runtime.current?.interactMusicGuide?.()}
            onSkipIntro={() => { stopGuideVoice(); runtime.current?.finishMusicGuideLine?.('intro'); }}
            onRespond={choice => { stopGuideVoice(); runtime.current?.respondMusicGuide?.(choice); }} />
        </Suspense>}
        {(upperPreview||musicInteriorPreview) && ready && !arrivalActive && snapshot.stairAssist && (snapshot.stairAssist.up || snapshot.stairAssist.down || snapshot.stairAssist.active) && <nav className="world-stair-assist" aria-label="楼梯辅助">
          {snapshot.stairAssist.active ? <><span>前往{snapshot.stairAssist.active}</span><button type="button" onClick={()=>runtime.current?.setStairAssist?.(null)}>停止</button></> : <>
            <button type="button" disabled={!snapshot.stairAssist.up} onClick={()=>runtime.current?.setStairAssist?.('up')}>上楼</button>
            <button type="button" disabled={!snapshot.stairAssist.down} onClick={()=>runtime.current?.setStairAssist?.('down')}>下楼</button>
          </>}
          <small>{snapshot.stairAssist.active?'移动键或摇杆可随时接管':inMusicGallery?'到楼层平台停下':exhibitPreview?'沿楼梯自动行走':'自动转弯，到展厅停下'}</small>
        </nav>}
        {snapshot.hallArrival==='guidance'&&!locked&&!choosing&&<nav className="world-hall-guidance" aria-label={exhibitPreview?'一层壁画观赏方向':mogaoV10?'洞窟观赏方向':'大佛殿观赏方向'}>
          {!exhibitPreview && <button className="hall-up" onClick={()=>runtime.current?.chooseHallDirection?.('up')}><span aria-hidden="true">↑</span>抬头欣赏<small className="world-desktop-help">按住右键向上拖动</small><small className="world-touch-help">向上滑动观察</small></button>}
          <button className="hall-left" aria-label={exhibitPreview?'观看左侧壁画':undefined} onClick={()=>runtime.current?.chooseHallDirection?.('left')}><span aria-hidden="true">←</span>观看壁画</button>
          <button className="hall-right" aria-label={exhibitPreview?'观看右侧壁画':undefined} onClick={()=>runtime.current?.chooseHallDirection?.('right')}><span aria-hidden="true">→</span>观看壁画</button>
        </nav>}

        {snapshot.encounter && snapshot.encounterVoice?.active && !snapshot.encounterVoice.ended && snapshot.encounter.time>=(snapshot.encounter.id==='music'?.35:.1) && <WorldSubtitle text={snapshot.encounter.text} onSkip={()=>runtime.current?.skipEncounter?.()} testId="world-encounter"/>}
        {snapshot.buddhaVoice?.active&&!snapshot.buddhaVoice.ended&&<WorldSubtitle text={buddhaSubtitleAt(exhibitPreview, snapshot.buddhaVoice.currentTime)} onSkip={()=>runtime.current?.skipBuddhaVoice?.()} testId="buddha-subtitle"/>}
        {snapshot.cinematic && <button type="button" className="world-cinematic-skip" data-testid="world-cinematic-skip" onClick={() => runtime.current?.skipCinematic()}>跳过 <kbd>Esc</kbd></button>}
        {!(globalLook||mogaoV10&&inCurrentMogaoRoom(snapshot.checkpoint.position))&&<div className="world-direction">{mogao?(inCurrentMogaoRoom(snapshot.checkpoint.position)?(modernCave?(snapshot.nearby==='novice-story'?'沙弥守戒壁画':snapshot.nearby==='story-demo'?'九色鹿壁画':'大佛殿'):'九色鹿壁画'):'莫高窟'):musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'飞天壁画':snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'乐声来处':'乐舞馆'):musicPreview?(snapshot.checkpoint.position.x>8?'飞天壁画':'乐舞馆'):'纹彩院'} <span aria-hidden="true">{musicV2?(snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'♪':''):musicPreview?'↗':'↖'}</span><small>{mogao?(inCurrentMogaoRoom(snapshot.checkpoint.position)?((mogaoVersion==='v003'||mogaoVersion==='v006'||mogaoVersion==='v007'||modernCave)?(modernCave?(mogaoVersion==='v009'?'按 R 抬头仰望，沿两侧观赏壁画':'抬头仰望大佛，沿两侧观赏壁画'):'四面通高壁画，可抬头观赏'):'三面通高壁画，可抬头观赏'):'沿石板曲径，前往崖下窟口'):musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'前庭右侧，走近后点击壁画':'沿石板曲径前行'):musicPreview?(snapshot.checkpoint.position.x>8?'前庭右侧，走近后点击壁画':snapshot.checkpoint.position.x< -2&&snapshot.checkpoint.position.z<3?'从院门返回岔路，沿石板支路前行':'沿石板支路，前往右侧馆舍'):'沿路前行，左转入院'}</small></div>}
        {ready && !locked && !exhibitOccupied && mogaoGameNotice && <aside className="world-preview-resource-notice world-mogao-game-notice" role="status" data-testid="mogao-game-unlocked">
          游戏入口已开启。它就在一楼，自己去找找吧～
          <button type="button" onClick={() => setMogaoGameNotice(false)}>知道了</button>
        </aside>}
        {ready && !locked && !exhibitOccupied && snapshot.mogaoGamePortalNearby && <button type="button"
          className="world-discovery world-primary" data-testid="mogao-game-portal" onClick={openMogaoGames}>进入壁画小游戏</button>}
        {ready && !locked && !exhibitOccupied && snapshot.musicGamePortalNearby && <button type="button"
          className="world-discovery world-primary" data-testid="music-game-portal" onClick={openMusicGames}>进入游戏世界</button>}
        {ready && !snapshot.mogaoGamePortalNearby && !snapshot.musicGamePortalNearby && snapshot.nearby && !exhibitRoom && !muralRoom && <button type="button" className="world-discovery world-primary" data-testid="world-interact" onClick={startInteraction}>{snapshot.nearby === 'caisson' ? '抬头看看' : snapshot.nearby === 'flying' ? snapshot.flying?.awakened && !musicV2 ? '再看飞天壁画' : '唤醒飞天壁画' : snapshot.nearby==='novice-story'?'观看沙弥故事': mogao ? '观看九色鹿故事' : '试看九色鹿故事'}</button>}
        {!arrivalActive && <><div className="world-controls world-controls-pointer">
          <div className="world-keyboard-hint world-pointer-hint" aria-label="WASD或方向键行走，Shift跑步。按住左键或右键拖动观察，滚轮缩放，点击物品互动">
            <div className="world-movement-hint">
              <span className="world-movement-keys" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
              <span>行走<small>也可用方向键</small></span><span className="world-run-hint"><kbd>Shift</kbd> 跑步</span>
            </div>
            <div className="world-pointer-actions"><span>拖动画面观察 · 滚轮缩放</span>{!exhibitRoom && !muralRoom && <span>点击物品互动</span>}</div>
          </div>
          <div className="world-camera-reset-controls">
            <span className="world-touch-look-hint">右侧滑动 · 双指缩放</span>
            <button type="button" className="world-camera-reset" aria-label="镜头回正" aria-keyshortcuts={caveKeys?'C':undefined} data-testid="world-camera-reset" onClick={()=>runtime.current?.resetCameraLook?.()}>镜头回正</button>
          </div>
        </div>
        <div className="world-joystick" role="group" aria-label="拖动摇杆行走" data-sound="none"
          onPointerDown={e => { if (locked) return; pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); changeStick(e); }} onPointerMove={changeStick} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>
          <span style={{ transform: `translate(${stick.x * 30}px, ${stick.y * 30}px)` }} /><small>拖动行走</small>
        </div></>}
      </>}
      {view === 'flying' && !flyingHistoryActive && !choosing && <WorldFlyingObservation waitForColor={musicV5} onSkipVoice={()=>runtime.current?.skipVoice?.()} voice={snapshot.flyingVoice} onRetryVoice={() => runtime.current?.retryVoice?.()} state={snapshot.flying} paused={event.mode === 'observing' && event.paused} onPause={() => dispatch({type:event.mode === 'observing' && event.paused?'resume':'pause'})} onReplay={() => {runtime.current?.replayObservation();dispatch({type:'resume'});}} />}
    </div>
    {flyingHistoryActive && !error && snapshot.flyingHistory && <Suspense fallback={<div className="world-cover" inert={locked}>
      <p role="status">正在准备飞天讲解…</p><button type="button" onClick={finishEvent}>返回漫游</button>
    </div>}>
      <WorldFlyingHistory state={snapshot.flyingHistory} blocked={locked}
        onCaptionPresented={onFlyingCaptionPresented}
        onControl={action => runtime.current?.controlFlyingHistory?.(action)} onReturn={finishEvent} />
    </Suspense>}
    {exhibitPreview && <Suspense fallback={null}><MogaoExhibitOverlay intro={revisitIntro} arrivalIntro={arrivalIntro} introReady={introReady} panelId={exhibit.panelId} wallId={exhibit.wallId}
      blocked={locked || choosing || !!hallStory || !!rewardOverlay || view !== 'follow' || !ready} reducedMotion={props.reducedMotion || systemReduced}
      saveWarning={exhibit.saveWarning} onCloseExhibit={exhibit.closeExhibit} onCloseWall={exhibit.closeWall}
      onCloseArrivalIntro={closeArrivalIntro} onPauseArrival={pauseExploration} onRetrySave={exhibit.retrySave} /></Suspense>}
    {instrument.instrument && !locked && view === 'follow' && <Suspense fallback={<div className="world-cover">
      <p role="status">正在打开乐器介绍…</p><button type="button" onClick={instrument.closeInstrument}>关闭</button>
    </div>}><MusicInstrumentOverlay key={instrument.instrument.id} instrument={instrument.instrument} status={instrument.status}
      onClose={instrument.closeInstrument} onRetry={instrument.retryInstrument} reducedMotion={props.reducedMotion || systemReduced} /></Suspense>}
    {wardrobeOpen && !error && <Suspense fallback={locked ? null : <div className="world-cover">
      <p role="status">正在打开装扮…</p><button type="button" onClick={closeMusicGuideWardrobe}>关闭装扮</button>
    </div>}>
      <MusicGuideWardrobe worn={musicGuide?.outfit ?? 'plain'} blocked={locked || choosing} reducedMotion={props.reducedMotion || systemReduced}
        onClose={closeMusicGuideWardrobe} onApplied={id => {
          if (id !== 'plain') musicGallery?.record({ type: 'outfit' });
          setWardrobeOpen(false);
        }}
        onSelect={(id, progress, signal) => runtime.current?.selectMusicGuideOutfit?.(id, progress, signal) ?? Promise.resolve(false)} />
    </Suspense>}
    {ready && !locked && !exhibitOccupied && snapshot.previewEntry && <aside className="world-preview-resource-notice" role="status">
      {snapshot.previewEntry === 'failed' ? <>前方场景暂未就绪。<button onClick={() => runtime.current?.retryPreviewStreaming?.()}>重试</button></> : '正在准备前方场景…'}
    </aside>}
    {ready && !locked && !exhibitOccupied && !inFirstGallery && snapshot.galleryGate && <aside className="world-preview-resource-notice" role="status">{snapshot.galleryGate}</aside>}
    {inFirstGallery && props.catalog && <FirstGalleryOverlay runtime={runtime.current} snapshot={snapshot} catalog={props.catalog} ready={ready} blocked={locked} reducedMotion={props.reducedMotion || systemReduced} request={galleryRequest}
      onInteract={requestGallery} onOccupied={setGalleryOccupied}
      onColor={(at, artworkId) => {
        if (!callbacks.current.onGalleryColoring?.(at, artworkId)) return false;
        checkpoint.current = at;
        leavingToTheme.current = true;
        return true;
      }}
      portalPending={props.galleryPortalPending} onPortalPresented={props.onGalleryPortalPresented}
      onPortalEnter={() => {
        const enter = callbacks.current.onGalleryPortalEnter;
        if (!enter || flags.current.locked || runtime.current?.snapshot().gallery?.nearby !== 'scroll') return;
        const at = currentCheckpoint();
        checkpoint.current = at; leavingToTheme.current = true;
        enter(at);
      }} />}
    {musicV2 && snapshot.musicAudio?.status==='error' && <aside className="world-audio-warning" role="status">乐声暂未加载。<button type="button" onClick={()=>runtime.current?.retrySound?.()}>重试乐声</button></aside>}
    {(props.saveWarning || musicGallery?.saveFailed) && <div className="world-save-warning" role="status">
      <p>{props.saveWarning || '乐舞馆的探索记录暂未保存。'}</p>
      <button type="button" onClick={() => { if (props.saveWarning) persist(); if (musicGallery?.saveFailed) musicGallery.retry(); }}>重试保存</button>
    </div>}
    {!ready && !error && <div className="world-cover" onKeyDown={trapCoverFocus} tabIndex={-1}><h2>{props.galleryReturningFromColoring ? '作品已保存，正在返回院内画架…' : '正在准备探索世界…'}</h2>{inFirstGallery && <span>第一馆探索正在准备</span>}{directGameWorld}</div>}
    {error && <div className="world-cover" role="alertdialog" aria-modal="true" aria-labelledby="world-error-title" onKeyDown={trapCoverFocus} tabIndex={-1} data-testid="world-error"><h2 id="world-error-title">3D画面暂未打开</h2><p>{error}</p><div><button type="button" className="world-primary" onClick={() => { dispatch({ type: 'exit' }); setAttempt(value => value + 1); }} data-testid="world-retry">重新加载</button>{props.onChooseTraveler && <button type="button" onClick={props.onChooseTraveler}>重新选人</button>}{directGameWorld}{!gameWorldAvailable && props.onGalleryFallback && <button type="button" onClick={props.onGalleryFallback}>兼容游玩 · 纹样小游戏</button>}</div></div>}
    {view === 'story' && !error && <WorldStoryPlayer key={`${event.mode!=='exploring'?event.id:''}-${storyReplay}`} story={event.mode!=='exploring'&&event.id==='novice-story'?noviceStory:caveKeys?deerStoryV009:undefined} backdrop={storyBackdrop} reducedMotion={props.reducedMotion || systemReduced} omitEnding={exhibitGroundStory} exhibitNarration={exhibitGroundStory} blocked={locked||choosing} paused={locked || choosing || (event.mode === 'observing' && event.paused)} sound={props.sound} onComplete={finishStoryPlayback} onClose={finishEvent} />}
    {hallStory && !error && <div style={{ display: 'contents' }}
      onPointerDownCapture={() => { hallStoryPointer.current = true; }}
      onPointerCancelCapture={() => { hallStoryPointer.current = false; }}
      onClickCapture={event => {
        // A canvas touch can synthesize a click after the story has appeared.
        if (event.detail > 0 && !hallStoryPointer.current) {
          event.preventDefault();
          event.stopPropagation();
        }
        hallStoryPointer.current = false;
      }}>
      <Suspense fallback={<div className="world-cover" inert={locked}><p role="status">正在准备壁画故事…</p><button onClick={closeHallStory}>返回绘世厅</button></div>}>
        <MogaoHallAStory key={hallStory.id} {...hallStory} blocked={locked} reducedMotion={props.reducedMotion || systemReduced}
          sound={props.sound} onComplete={() => exhibit.completeStory(hallStory.id)} onClose={closeHallStory} />
      </Suspense>
    </div>}
    {rewardOverlay && !error && <Suspense fallback={<div className="world-cover" inert={locked}><p role="status">正在准备图鉴…</p><button onClick={() => rewardOverlay.kind === 'award' ? receiveReward(rewardOverlay.id, false) : closeRewardView()}>返回探索</button></div>}>
      <MogaoRewardOverlay award={rewardOverlay.kind === 'award' ? rewardOverlay.id : null} earned={guideEarned}
        view={rewardOverlay.kind === 'award' ? null : rewardOverlay.kind === 'guide' ? 'guide' : rewardOverlay.id}
        blocked={locked} reducedMotion={props.reducedMotion || systemReduced}
        onAcceptAward={id => receiveReward(id, true)} onDismissAward={id => receiveReward(id, false)}
        onOpenReward={id => setRewardOverlay({ kind: 'paper', id, fromGuide: true })} onCloseView={closeRewardView} />
    </Suspense>}
    {musicUnlockNotice && !error && <GalleryUnlockNotice title={thirdRouteOpen ? '第二馆通关！第三馆与游戏世界已开启。' : '第二馆通关！游戏世界已开启。'}
      testId="music-gallery-unlock-notice" blocked={locked} dismissOnTap onClose={() => setMusicUnlockNotice(false)}>
      <p>游戏世界入口就在院子里，自己去找找吧。</p>
      <p>{thirdRouteOpen ? '在三馆地图里，沿石板路可步行到九层楼。' : '完成第一馆探索后，就能在三馆地图里步行到九层楼。'}</p>
    </GalleryUnlockNotice>}
    {choosing && !error && <WorldCultureChoice blocked={locked} onReturn={finishEvent} onReplay={event.id==='story-demo'||event.id==='novice-story'?()=>{setStoryReplay(n=>n+1);dispatch({type:'replay'});}:undefined}/>}
    {portraitBlocked && !error && <div className="world-cover world-rotate" data-testid="world-rotate" role="dialog" aria-modal="true" aria-labelledby="world-rotate-title" onKeyDown={trapCoverFocus} tabIndex={-1}><span aria-hidden="true">▭ ↻</span><h2 id="world-rotate-title">横过手机，开始探索</h2><p>请将手机横过来，继续探索和观看故事。</p>{directGameWorld}</div>}
    {paused && !portraitBlocked && !error && ready && <div className="world-cover world-pause-cover" role="dialog" aria-modal="true" aria-labelledby="world-pause-title" onKeyDown={trapCoverFocus} tabIndex={-1}><h2 id="world-pause-title">探索已暂停</h2><p className="world-desktop-help">WASD / 方向键行走，Shift 跑步；按住左键或右键拖动观察，滚轮拉近拉远；点击物品互动，点击“镜头回正”恢复视角。</p><p className="world-touch-help">左下摇杆行走，右侧滑动观察；直接点击物品互动，点击“镜头回正”恢复视角。</p><div><button type="button" className="world-primary" data-testid="world-resume" onClick={() => setPaused(false)}>继续探索</button>{!galleryOccupied && (!connectedGalleries || currentGallery) && <button type="button" data-testid="world-reset" onClick={() => { dispatch({ type: 'exit' }); closeHallStory(); instrument.closeInstrument(); stopGuideVoice(); setWardrobeOpen(false); setRewardOverlay(null); runtime.current?.resetToStart(); setPaused(false); persist(); }}>回到起点</button>}{gameWorldAvailable && <a href="#/themes" onClick={persist}>游戏世界</a>}</div></div>}
  </div>;
}
