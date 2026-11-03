import { WorldTerrainRouteMap } from './WorldTerrainRouteMap';
import { fromTerrainPoint, toTerrainPoint, TERRAIN_REGIONS } from '../world/terrain-rules-v001';
import buddhaNarration from '../content/world/buddha-narration-v001.json';
import {deerStoryV009} from '../content/world/deer-introduction-v009';
import {inMogaoRoom as inMogaoRoomV8} from '../world/mogao-rules-v008';
import {noviceStory} from '../content/world/novice-story';
import { inMogaoRoom as inMogaoRoomV3 } from '../world/mogao-rules-v003';
import { inMogaoRoom as inMogaoRoomV2 } from '../world/mogao-rules-v002';
import { WorldMogaoRouteMap } from './WorldMogaoRouteMap';
import { inMogaoRoom } from '../world/mogao-rules-v001';
import { WorldSubtitle } from './WorldSubtitle';
import { WorldCultureChoice } from './WorldCultureChoice';
import { inMusicCourtV4 } from '../world/music-pavilion-rules-v004';
import { WorldMusicRouteMap } from './WorldMusicRouteMap';
import { inMusicCourtV2 } from '../world/music-pavilion-rules-v002';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from 'react';
import type { SoundPreferences } from '../services/sound-settings';
import { discoveryReducer, discoveryView, initialDiscoveryState } from '../world/events';
import { themeReturnCheckpoint, withVisitedDiscovery } from '../world/session';
import type { WorldCheckpoint, WorldRuntime, WorldSnapshot } from '../world/types';
import { WorldFlyingObservation } from './WorldFlyingObservation';
import { MUSIC_ROAD } from '../world/music-pavilion-rules';
import { WorldStoryPlayer } from './WorldStoryPlayer';
import { COURTYARD_ROAD } from '../world/road';
import { loadCinematicSeen, saveCinematicSeen } from '../world/character-cinematics';
import '../styles/world.css';

const PORTRAIT_QUERY = '(orientation: portrait)';

interface Props {
  initial: WorldCheckpoint;
  saveWarning: string | null;
  reducedMotion: boolean;
  sound: SoundPreferences;
  onCheckpoint(checkpoint: WorldCheckpoint): void;
  onEnterTheme(id: string, checkpoint: WorldCheckpoint): void;
}

export default function WorldScreen(props: Props) {
  const terrain=document.getElementById('root')?.dataset.terrain==='v001';
  const terrainCaisson=terrain&&document.getElementById('root')?.dataset.terrainCaisson==='v001';
  const initialLook=useRef<number|undefined>(terrainCaisson?Number(document.getElementById('root')?.dataset.terrainInitialLook??'NaN'):undefined);
  const flyingVoicePreview=document.getElementById('root')?.dataset.flyingVoice==='v001';
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
  const runtime = useRef<WorldRuntime | null>(null);
  const checkpoint = useRef(props.initial);
  const leavingToTheme = useRef(false);
  const callbacks = useRef(props); callbacks.current = props;
  const [snapshot, setSnapshot] = useState<WorldSnapshot>({ checkpoint: props.initial, nearby: null, location: '沙漠道路', moving: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [event, dispatch] = useReducer(discoveryReducer, initialDiscoveryState);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const view = discoveryView(event);
  const portraitBlocked = portrait;
  const [storyReplay, setStoryReplay] = useState(0);
  const [storyBackdrop,setStoryBackdrop]=useState<string>();
  const locked = paused || portraitBlocked || !!error;
  const flags = useRef({ locked, event, paused }); flags.current = { locked, event, paused };
  const choosing=event.mode==='choosing';

  const startInteraction = useCallback(() => {
    if (flags.current.locked || flags.current.event.mode !== 'exploring') return;
    const nearby = runtime.current?.snapshot().nearby;
    if(nearby){if(nearby==='novice-story')setStoryBackdrop(runtime.current?.captureFrame?.());dispatch({ type:'start',id:nearby,nearby });}
  }, []);
  const currentCheckpoint = useCallback(() => {
    if (leavingToTheme.current) return checkpoint.current;
    const latest = runtime.current?.snapshot().checkpoint ?? checkpoint.current;
    return { ...latest, visitedEvents: [...new Set([...latest.visitedEvents,...checkpoint.current.visitedEvents])] };
  }, []);
  const persist = useCallback(() => {
    checkpoint.current = currentCheckpoint(); callbacks.current.onCheckpoint(checkpoint.current);
  }, [currentCheckpoint]);
  const pauseExploration = useCallback(() => {
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
        terrainVersion:terrain?'v001':undefined, terrainCaissonVersion:terrainCaisson?'v001':undefined, initialLook:initialLook.current, mogao, mogaoFacadeVersion:document.getElementById('root')?.dataset.mogaoFacade==='v005'?'v005':undefined, mogaoSurfaceVersion:document.getElementById('root')?.dataset.mogaoSurface==='v004'?'v004':undefined, mogaoVersion:mogaoVersion==='v012'?'v012':globalLook?'v011':mogaoV10?'v010':mogaoVersion==='v009'?'v009':mogaoVersion==='v008'?'v008':mogaoVersion==='v007'?'v007':mogaoVersion==='v006'?'v006':mogaoVersion==='v003'?'v003':mogaoVersion==='v002'?'v002':'v001', flyingVoice: flyingVoicePreview, musicPavilion: musicPreview, musicVersion: musicV6?'v006':musicV5?'v005':musicV4?'v004':musicV3?'v003':musicV2?'v002':'v001', sound: callbacks.current.sound, initial: checkpoint.current, reducedMotion: callbacks.current.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        ...(cinematicPreview && !terrain ? { cinematics: {
          seen: (() => { try { return loadCinematicSeen(window.sessionStorage); } catch { return { opening: false, hall: false }; } })(),
          onSeen: (seen: { opening: boolean; hall: boolean }) => { try { saveCinematicSeen(window.sessionStorage, seen); } catch { /* Browser storage access can itself be denied. */ } },
        } } : {}),
        onSnapshot: next => { if (!disposed) setSnapshot(next); },
        onInteract: startInteraction,
        onReady: () => { if (!disposed) { initialLook.current=undefined; const root=document.getElementById('root'); if(root)delete root.dataset.terrainInitialLook; setReady(true); } },
        onError: message => { if (!disposed) { setError(message); setReady(false); } },
      });
      if (disposed) { instance.dispose(); return; }
      runtime.current = instance;
      if (terrain) Object.assign(window, { __terrain: { inspect: () => instance?.inspect(), overview:(enabled:boolean)=>instance?.setOverview?.(enabled) } });
      if (mogao) Object.assign(window, { __mogao: { inspect: () => instance?.inspect() } });
      if (musicPreview) Object.assign(window, { __musicPavilion: { inspect: () => instance?.inspect(), recordingAudio: () => instance?.recordingAudio?.()??null } });
      if (cinematicPreview) Object.assign(window, { __characterCinematics: { inspect: () => instance?.inspect(), skip: () => instance?.skipCinematic() } });
      instance.setPaused(flags.current.locked);

    }).catch(() => { if (!disposed) setError('3D画面暂时无法启动。可以重试，或直接进入文化主题。'); });
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
  }, [attempt, startInteraction]);

  useLayoutEffect(() => {
    runtime.current?.setView(view);
    runtime.current?.setPaused(locked || choosing || view === 'story' || (event.mode === 'observing' && event.paused));
    runtime.current?.setJoystick(0, 0); setStick({ x: 0, y: 0 }); pointer.current = null;
  }, [locked, view, event, ready]);
  useEffect(()=>{
    if(locked||event.mode!=='observing'||event.paused)return;
    if((event.id==='flying'&&snapshot.flying?.complete&&(!snapshot.flyingVoice||snapshot.flyingVoice.ended))||
       (event.id==='caisson'&&(snapshot.observationTime??0)>=3))dispatch({type:'complete'});
  },[locked,event,snapshot.flying?.complete,snapshot.flyingVoice?.ended,snapshot.observationTime]);
  useLayoutEffect(() => {
    if (locked) {
      const cover = screen.current?.querySelector<HTMLElement>(error ? '[data-testid="world-error"]' : portraitBlocked ? '.world-rotate' : '.world-pause-cover');
      cover?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus({ preventScroll: true });
    } else if (wasLocked.current) {
      const restored = choosing ? screen.current?.querySelector<HTMLElement>('.world-culture-choice') : view === 'story'
        ? screen.current?.querySelector<HTMLElement>('[data-testid="world-story"]')
        : host.current?.querySelector('canvas');
      restored?.focus({ preventScroll: true });
    }
    wasLocked.current = locked;
  }, [locked, portraitBlocked, paused, error, view, ready, choosing]);
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
      if(caveKeys&&!e.repeat&&!flags.current.locked&&flags.current.event.mode==='exploring'&&!(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable=true],[role=dialog]'))){
        if(e.code==='KeyR'){e.preventDefault();runtime.current?.tiltCamera?.(.22);return;}
        if(e.code==='KeyT'){e.preventDefault();runtime.current?.tiltCamera?.(-.22);return;}
        if(e.code==='KeyC'){e.preventDefault();runtime.current?.resetCameraLook?.();return;}
      }
      if (e.key !== 'Escape' || e.repeat) return;
      // Escape belongs to the topmost global pause, not the inert story beneath it.
      if (flags.current.paused) setPaused(false);
      else if (runtime.current?.snapshot().cinematic) runtime.current.skipCinematic();
      else if (flags.current.event.mode !== 'exploring') dispatch({ type: 'exit' });
      else pauseExploration();
    };
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', key);
    ratio.addEventListener('change', orientation); motion.addEventListener('change', reduce);
    const timer = window.setInterval(persist, 2000);
    return () => {
      clearInterval(timer); window.removeEventListener('blur', stop); window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', key);
      ratio.removeEventListener('change', orientation); motion.removeEventListener('change', reduce);
    };
  }, [persist, pauseExploration]);

  function finishEvent() {
    if (event.mode !== 'exploring' && (event.id !== 'flying' || runtime.current?.snapshot().flying?.complete)) checkpoint.current = withVisitedDiscovery(currentCheckpoint(), event.id);
    dispatch({ type: 'exit' }); setStoryBackdrop(undefined); persist(); host.current?.querySelector('canvas')?.focus();
  }
  function goToCulture() {
    if(event.mode==='exploring')return;
    const id=event.id, latest=withVisitedDiscovery(currentCheckpoint(),id);
    checkpoint.current=id==='caisson'?themeReturnCheckpoint(latest):latest;
    if(terrain&&id==='caisson')checkpoint.current={...checkpoint.current,position:toTerrainPoint('courtyard',checkpoint.current.position),heading:TERRAIN_REGIONS.courtyard.yaw,cameraYaw:TERRAIN_REGIONS.courtyard.yaw};
    leavingToTheme.current = true; runtime.current?.setPaused(true);
    callbacks.current.onEnterTheme(id==='caisson'?'patterns':id==='flying'?'music':'stories',checkpoint.current);
  }
  function changeStick(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId || locked || view !== 'follow') return;
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
  return <div ref={screen} className={`world-screen${globalLook||mogao&&inCurrentMogaoRoom(snapshot.checkpoint.position)?' has-cave-look':''}${choosing?' has-culture-choice':''}${view === 'story' ? ' is-story' : view === 'flying' ? ' is-flying' : ''}`} data-testid="world-screen" data-view={view}>
    <div className="world-host" ref={host} data-testid="world-host" data-ready={ready} aria-label="3D探索世界" inert={locked || choosing || view === 'story' ? true : undefined} />
    <output hidden data-testid="world-position" data-x={snapshot.checkpoint.position.x.toFixed(3)} data-z={snapshot.checkpoint.position.z.toFixed(3)} />
    <div className="world-hud" inert={view === 'story' || locked || choosing ? true : undefined}>
      <header className="world-topbar"><div className="world-heading"><p>{terrain?'地形样片 · 待确认':globalLook ? '石窟样片 · 待确认' : mogao ? '莫高窟样片 · 待确认' : musicPreview ? '乐舞馆样片 · 待确认' : cinematicPreview ? '角色镜头样片 · 待确认' : '美术样片 · 待确认'}</p><h1>敦煌寻宝记</h1>{!(globalLook||mogaoV10&&inCurrentMogaoRoom(snapshot.checkpoint.position))&&<span data-testid="world-location">{snapshot.location}</span>}</div>
        <nav aria-label="世界导航">{terrain&&<button type="button" data-testid="terrain-overview" aria-pressed={!!snapshot.overview} onClick={()=>runtime.current?.setOverview?.(!snapshot.overview)}>{snapshot.overview?'返回地面':'高空总览'}</button>}<a href="#/themes" onClick={persist}>直接选主题</a><button type="button" aria-expanded={showMap} onClick={() => setShowMap(value => !value)}>路线</button><a href="#/settings" onClick={persist}>设置</a><button type="button" onClick={pauseExploration} data-testid="world-pause">暂停</button></nav>
      </header>
      {showMap && (terrain ? <WorldTerrainRouteMap position={snapshot.checkpoint.position}/> : mogao ? <WorldMogaoRouteMap fictional={globalLook} version={(mogaoVersion==='v003'||mogaoVersion==='v006'||mogaoVersion==='v007'||modernCave)?'v003':mogaoVersion==='v002'?'v002':'v001'} position={snapshot.checkpoint.position}/> : musicV2 ? <WorldMusicRouteMap position={snapshot.checkpoint.position} version={musicV4?'v004':musicV3?'v003':'v002'}/> : <aside className="world-map" aria-label="探索路线图"><h2>{musicPreview?'纹彩院 · 乐舞馆':'沿路进入纹彩院'}</h2><svg viewBox="0 0 160 150" role="img" aria-label={musicPreview?'左侧纹彩院，右侧乐舞馆，由石板路连接':'左侧纹彩院，庭院右侧故事测试点；远方两处场景筹备中'}><path d="M36.5 89.6H16.2V16.8H74.2V89.6H53.9" fill="none" stroke="#ab7660" strokeWidth="2"/><polyline points={COURTYARD_ROAD.filter(({ center }) => center.z <= 18).map(({ center }) => `${80 + center.x * 2.9},${84 + center.z * 2.8}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="5" /><rect x="22" y="12" width="46" height="34" fill="#ab7660"/><text x="45" y="8" textAnchor="middle">纹彩院</text>{musicPreview?<><polyline points={MUSIC_ROAD.map(({center})=>`${80+center.x*2.9},${84+center.z*2.8}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="5"/><rect x="109" y="22" width="46" height="30" fill="#77958a"/><text x="132" y="18" textAnchor="middle">乐舞馆</text></>:<><circle cx="65" cy="65" r="5" fill="#4b7973"/><text x="80" y="65">故事测试点</text></>}<circle cx={80 + snapshot.checkpoint.position.x * 2.9} cy={84 + snapshot.checkpoint.position.z * 2.8} r="4" fill="#a13d2e" stroke="white" strokeWidth="2"/></svg><p>{musicPreview?'沿石板支路前往乐舞馆；洞窟后续开放。':'乐舞馆、洞窟在后续阶段开放'}</p></aside>)}
      {view === 'follow' && !snapshot.overview && <>
        {snapshot.hallArrival==='guidance'&&!locked&&!choosing&&<nav className="world-hall-guidance" aria-label={mogaoV10?"洞窟观赏方向":"大佛殿观赏方向"}>
          <button className="hall-up" onClick={()=>runtime.current?.chooseHallDirection?.('up')}><span aria-hidden="true">↑</span>抬头欣赏<small>R 抬头 · C 平视</small></button>
          <button className="hall-left" onClick={()=>runtime.current?.chooseHallDirection?.('left')}><span aria-hidden="true">←</span>观看壁画</button>
          <button className="hall-right" onClick={()=>runtime.current?.chooseHallDirection?.('right')}><span aria-hidden="true">→</span>观看壁画</button>
        </nav>}

        {snapshot.encounter && snapshot.encounterVoice?.active && !snapshot.encounterVoice.ended && snapshot.encounter.time>=(snapshot.encounter.id==='music'?.35:.1) && <WorldSubtitle text={snapshot.encounter.text} onSkip={()=>runtime.current?.skipEncounter?.()} testId="world-encounter"/>}
        {snapshot.buddhaVoice?.active&&!snapshot.buddhaVoice.ended&&<WorldSubtitle text={buddhaNarration.text} onSkip={()=>runtime.current?.skipBuddhaVoice?.()} testId="buddha-subtitle"/>}
        {snapshot.buddhaVoice?.active&&!snapshot.buddhaVoice.ended&&['blocked','error'].includes(snapshot.buddhaVoice.status)&&<aside className="world-audio-warning" role="status">讲解暂未播放。<button onClick={()=>runtime.current?.retryBuddhaVoice?.()}>播放讲解</button></aside>}
        {snapshot.cinematic && <button type="button" className="world-cinematic-skip" data-testid="world-cinematic-skip" onClick={() => runtime.current?.skipCinematic()}>跳过 <kbd>Esc</kbd></button>}
        {!(globalLook||mogaoV10&&inCurrentMogaoRoom(snapshot.checkpoint.position))&&<div className="world-direction">{mogao?(inCurrentMogaoRoom(snapshot.checkpoint.position)?(modernCave?(snapshot.nearby==='novice-story'?'沙弥守戒壁画':snapshot.nearby==='story-demo'?'九色鹿壁画':'大佛殿'):'九色鹿壁画'):'莫高窟'):musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'飞天壁画':snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'乐声来处':'乐舞馆'):musicPreview?(snapshot.checkpoint.position.x>8?'飞天壁画':'乐舞馆'):'纹彩院'} <span aria-hidden="true">{musicV2?(snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'♪':''):musicPreview?'↗':'↖'}</span><small>{mogao?(inCurrentMogaoRoom(snapshot.checkpoint.position)?((mogaoVersion==='v003'||mogaoVersion==='v006'||mogaoVersion==='v007'||modernCave)?(modernCave?(mogaoVersion==='v009'?'按 R 抬头仰望，沿两侧观赏壁画':'抬头仰望大佛，沿两侧观赏壁画'):'四面通高壁画，可抬头观赏'):'三面通高壁画，可抬头观赏'):'沿石板曲径，前往崖下窟口'):musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'前庭右侧，走近后按 F 观察':'沿石板曲径前行'):musicPreview?(snapshot.checkpoint.position.x>8?'前庭右侧，走近后按 F 观察':snapshot.checkpoint.position.x< -2&&snapshot.checkpoint.position.z<3?'从院门返回岔路，沿石板支路前行':'沿石板支路，前往右侧馆舍'):'沿路前行，左转入院'}</small></div>}
        {ready && snapshot.nearby && <button type="button" className="world-discovery world-primary" data-testid="world-interact" onClick={startInteraction}>{snapshot.nearby === 'caisson' ? '抬头看看' : snapshot.nearby === 'flying' ? snapshot.flying?.awakened && !musicV2 ? '再看飞天壁画' : '唤醒飞天壁画' : snapshot.nearby==='novice-story'?'观看沙弥故事': mogao ? '观看九色鹿故事' : '试看九色鹿故事'}<kbd>F</kbd></button>}
        <div className="world-controls"><p className="world-keyboard-hint"><kbd>W A S D</kbd> 行走　<kbd>Shift</kbd> 跑步　{mogaoV10?<><kbd>Q</kbd> 左转　<kbd>E</kbd> 右转{(globalLook||inCurrentMogaoRoom(snapshot.checkpoint.position))&&<>　<kbd>R</kbd> 抬头　<kbd>T</kbd> 低头</>}</>:<><kbd>Q / E</kbd> 转镜头</>}</p><div className="world-camera-controls">{(globalLook||mogao&&inCurrentMogaoRoom(snapshot.checkpoint.position))&&<>
          <button type="button" className="world-camera-tilt" aria-label="向上看" onClick={()=>runtime.current?.tiltCamera?.(.22)} disabled={(snapshot.caveLook??0)>=1.25}>抬头 ↑{caveKeys&&' R'}</button>
          <button type="button" className="world-camera-tilt" aria-label="向下看" onClick={()=>runtime.current?.tiltCamera?.(-.22)} disabled={(snapshot.caveLook??0)<=(globalLook?-.55:0)}>低头 ↓{caveKeys&&' T'}</button>
          <button type="button" className="world-camera-tilt" aria-label="恢复平视" onClick={()=>runtime.current?.resetCameraLook?.()}>平视{caveKeys&&' C'}</button>
        </>}<button type="button" aria-label="镜头向左" onClick={() => runtime.current?.turnCamera(mogaoV10?.12:-.12)}>{mogaoV10?'← 左 Q':'↶'}</button><button type="button" aria-label="镜头向右" onClick={() => runtime.current?.turnCamera(mogaoV10?-.12:.12)}>{mogaoV10?'右 E →':'↷'}</button></div></div>
        <div className="world-joystick" role="group" aria-label="拖动摇杆行走" data-sound="none"
          onPointerDown={e => { if (locked) return; pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); changeStick(e); }} onPointerMove={changeStick} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>
          <span style={{ transform: `translate(${stick.x * 30}px, ${stick.y * 30}px)` }} /><small>拖动行走</small>
        </div>
      </>}
      {view === 'flying' && !choosing && <WorldFlyingObservation waitForColor={musicV5} onSkipVoice={()=>runtime.current?.skipVoice?.()} voice={snapshot.flyingVoice} onRetryVoice={() => runtime.current?.retryVoice?.()} state={snapshot.flying} paused={event.mode === 'observing' && event.paused} onPause={() => dispatch({type:event.mode === 'observing' && event.paused?'resume':'pause'})} onReplay={() => {runtime.current?.replayObservation();dispatch({type:'resume'});}} />}
    </div>
    {musicV2 && snapshot.musicAudio?.status==='error' && <aside className="world-audio-warning" role="status">乐声暂未加载。<button type="button" onClick={()=>runtime.current?.retrySound?.()}>重试乐声</button></aside>}
    {props.saveWarning && <div className="world-save-warning" role="status"><p>{props.saveWarning}</p><button type="button" onClick={persist}>重试保存</button></div>}
    {!ready && !error && <div className="world-cover" onKeyDown={trapCoverFocus} tabIndex={-1}><h2>正在准备探索世界…</h2><a href="#/themes">直接选择文化主题</a></div>}
    {error && <div className="world-cover" role="alertdialog" aria-modal="true" aria-labelledby="world-error-title" onKeyDown={trapCoverFocus} tabIndex={-1} data-testid="world-error"><h2 id="world-error-title">3D画面暂未打开</h2><p>{error}</p><div><button type="button" className="world-primary" onClick={() => { dispatch({ type: 'exit' }); setAttempt(value => value + 1); }} data-testid="world-retry">重新加载</button><a href="#/themes">直接选择文化主题</a></div></div>}
    {view === 'story' && !error && <WorldStoryPlayer key={`${event.mode!=='exploring'?event.id:''}-${storyReplay}`} story={event.mode!=='exploring'&&event.id==='novice-story'?noviceStory:caveKeys?deerStoryV009:undefined} backdrop={storyBackdrop} reducedMotion={props.reducedMotion || systemReduced} blocked={locked||choosing} paused={locked || choosing || (event.mode === 'observing' && event.paused)} sound={props.sound} onComplete={()=>dispatch({type:'complete'})} onClose={finishEvent} onPause={pause => dispatch({ type: pause ? 'pause' : 'resume' })} onExplore={goToCulture} />}
    {choosing && !error && <WorldCultureChoice blocked={locked} onReturn={finishEvent} onGuide={goToCulture} onReplay={event.id==='story-demo'||event.id==='novice-story'?()=>{setStoryReplay(n=>n+1);dispatch({type:'replay'});}:undefined}/>}
    {portraitBlocked && !error && <div className="world-cover world-rotate" data-testid="world-rotate" role="dialog" aria-modal="true" aria-labelledby="world-rotate-title" onKeyDown={trapCoverFocus} tabIndex={-1}><span aria-hidden="true">▭ ↻</span><h2 id="world-rotate-title">横过手机，开始探索</h2><p>请将手机横过来，继续探索和观看故事。</p><a href="#/themes">直接选择文化主题</a></div>}
    {paused && !portraitBlocked && !error && ready && <div className="world-cover world-pause-cover" role="dialog" aria-modal="true" aria-labelledby="world-pause-title" onKeyDown={trapCoverFocus} tabIndex={-1}><h2 id="world-pause-title">探索已暂停</h2><p>{globalLook?'WASD / 方向键行走，Shift 跑步。Q 左转，E 右转；R 抬头，T 低头，C 平视。':mogaoV10?'WASD / 方向键行走，Shift 跑步。Q 左转，E 右转；洞内 R 抬头，T 低头，C 平视。':'WASD / 方向键行走，Shift跑步，Q / E转镜头。'}</p><div><button type="button" className="world-primary" data-testid="world-resume" onClick={() => setPaused(false)}>继续探索</button><button type="button" data-testid="world-reset" onClick={() => { dispatch({ type: 'exit' }); runtime.current?.resetToStart(); setPaused(false); persist(); }}>回到起点</button><a href="#/themes" onClick={persist}>直接选主题</a></div></div>}
  </div>;
}
