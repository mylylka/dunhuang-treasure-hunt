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

interface Props {
  initial: WorldCheckpoint;
  saveWarning: string | null;
  reducedMotion: boolean;
  sound: SoundPreferences;
  onCheckpoint(checkpoint: WorldCheckpoint): void;
  onEnterTheme(id: string, checkpoint: WorldCheckpoint): void;
}

export default function WorldScreen(props: Props) {
  const flyingVoicePreview=document.getElementById('root')?.dataset.flyingVoice==='v001';
  const musicVersion = document.getElementById('root')?.dataset.musicPavilion;
  const musicV4=musicVersion==='v004';
  const inCurrentMusicCourt=musicV4?inMusicCourtV4:inMusicCourtV2;
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
  const [portrait, setPortrait] = useState(() => window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [event, dispatch] = useReducer(discoveryReducer, initialDiscoveryState);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const locked = paused || portrait || !!error;
  const flags = useRef({ locked, event, paused }); flags.current = { locked, event, paused };
  const view = discoveryView(event);

  const startInteraction = useCallback(() => {
    if (flags.current.locked || flags.current.event.mode !== 'exploring') return;
    const nearby = runtime.current?.snapshot().nearby;
    if (nearby) dispatch({ type: 'start', id: nearby, nearby });
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
        flyingVoice: flyingVoicePreview, musicPavilion: musicPreview, musicVersion: musicV4?'v004':musicV3?'v003':musicV2?'v002':'v001', sound: callbacks.current.sound, initial: checkpoint.current, reducedMotion: callbacks.current.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        ...(cinematicPreview ? { cinematics: {
          seen: (() => { try { return loadCinematicSeen(window.sessionStorage); } catch { return { opening: false, hall: false }; } })(),
          onSeen: (seen: { opening: boolean; hall: boolean }) => { try { saveCinematicSeen(window.sessionStorage, seen); } catch { /* Browser storage access can itself be denied. */ } },
        } } : {}),
        onSnapshot: next => { if (!disposed) setSnapshot(next); },
        onInteract: startInteraction,
        onReady: () => { if (!disposed) setReady(true); },
        onError: message => { if (!disposed) { setError(message); setReady(false); } },
      });
      if (disposed) { instance.dispose(); return; }
      runtime.current = instance;
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
      if (musicPreview) Reflect.deleteProperty(window, '__musicPavilion');
      if (cinematicPreview) Reflect.deleteProperty(window, '__characterCinematics');
    };
  }, [attempt, startInteraction]);

  useLayoutEffect(() => {
    runtime.current?.setView(view);
    runtime.current?.setPaused(locked || view === 'story' || (event.mode === 'observing' && event.paused));
    runtime.current?.setJoystick(0, 0); setStick({ x: 0, y: 0 }); pointer.current = null;
  }, [locked, view, event, ready]);
  useLayoutEffect(() => {
    if (locked) {
      const cover = screen.current?.querySelector<HTMLElement>(error ? '[data-testid="world-error"]' : portrait ? '.world-rotate' : '.world-pause-cover');
      cover?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus({ preventScroll: true });
    } else if (wasLocked.current) {
      const restored = view === 'story'
        ? screen.current?.querySelector<HTMLElement>('[data-testid="world-story"]')
        : host.current?.querySelector('canvas');
      restored?.focus({ preventScroll: true });
    }
    wasLocked.current = locked;
  }, [locked, portrait, paused, error, view, ready]);
  useEffect(() => { runtime.current?.setSound?.(props.sound); }, [props.sound, ready]);
  useEffect(() => { runtime.current?.setReducedMotion(props.reducedMotion || systemReduced); }, [props.reducedMotion, systemReduced]);
  useEffect(() => {
    const ratio = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = pauseExploration;
    const visibility = () => { if (document.hidden) stop(); };
    const orientation = () => { setPortrait(ratio.matches); stop(); };
    const reduce = () => setSystemReduced(motion.matches);
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return;
      // Escape belongs to the topmost global pause, not the inert story beneath it.
      if (flags.current.paused) setPaused(false);
      else if (runtime.current?.snapshot().cinematic) runtime.current.skipCinematic();
      else if (flags.current.event.mode === 'observing') dispatch({ type: 'exit' });
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
    if (event.mode === 'observing' && (event.id !== 'flying' || runtime.current?.snapshot().flying?.complete)) checkpoint.current = withVisitedDiscovery(currentCheckpoint(), event.id);
    dispatch({ type: 'exit' }); persist(); host.current?.querySelector('canvas')?.focus();
  }
  function goToPatterns() {
    checkpoint.current = themeReturnCheckpoint(currentCheckpoint());
    // Unmount must also save the safe anchor, rather than the last observation position.
    leavingToTheme.current = true;
    runtime.current?.setPaused(true);
    callbacks.current.onEnterTheme('patterns', checkpoint.current);
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
  return <div ref={screen} className={`world-screen${view === 'story' ? ' is-story' : view === 'flying' ? ' is-flying' : ''}`} data-testid="world-screen" data-view={view}>
    <div className="world-host" ref={host} data-testid="world-host" data-ready={ready} aria-label="3D探索世界" inert={locked || view === 'story' ? true : undefined} />
    <output hidden data-testid="world-position" data-x={snapshot.checkpoint.position.x.toFixed(3)} data-z={snapshot.checkpoint.position.z.toFixed(3)} />
    <div className="world-hud" inert={view === 'story' || locked ? true : undefined}>
      <header className="world-topbar"><div className="world-heading"><p>{musicPreview ? '乐舞馆样片 · 待确认' : cinematicPreview ? '角色镜头样片 · 待确认' : '美术样片 · 待确认'}</p><h1>敦煌寻宝记</h1><span data-testid="world-location">{snapshot.location}</span></div>
        <nav aria-label="世界导航"><a href="#/themes" onClick={persist}>直接选主题</a><button type="button" aria-expanded={showMap} onClick={() => setShowMap(value => !value)}>路线</button><a href="#/settings" onClick={persist}>设置</a><button type="button" onClick={pauseExploration} data-testid="world-pause">暂停</button></nav>
      </header>
      {showMap && (musicV2 ? <WorldMusicRouteMap position={snapshot.checkpoint.position} version={musicV4?'v004':musicV3?'v003':'v002'}/> : <aside className="world-map" aria-label="探索路线图"><h2>{musicPreview?'纹彩院 · 乐舞馆':'沿路进入纹彩院'}</h2><svg viewBox="0 0 160 150" role="img" aria-label={musicPreview?'左侧纹彩院，右侧乐舞馆，由石板路连接':'左侧纹彩院，庭院右侧故事测试点；远方两处场景筹备中'}><path d="M36.5 89.6H16.2V16.8H74.2V89.6H53.9" fill="none" stroke="#ab7660" strokeWidth="2"/><polyline points={COURTYARD_ROAD.filter(({ center }) => center.z <= 18).map(({ center }) => `${80 + center.x * 2.9},${84 + center.z * 2.8}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="5" /><rect x="22" y="12" width="46" height="34" fill="#ab7660"/><text x="45" y="8" textAnchor="middle">纹彩院</text>{musicPreview?<><polyline points={MUSIC_ROAD.map(({center})=>`${80+center.x*2.9},${84+center.z*2.8}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="5"/><rect x="109" y="22" width="46" height="30" fill="#77958a"/><text x="132" y="18" textAnchor="middle">乐舞馆</text></>:<><circle cx="65" cy="65" r="5" fill="#4b7973"/><text x="80" y="65">故事测试点</text></>}<circle cx={80 + snapshot.checkpoint.position.x * 2.9} cy={84 + snapshot.checkpoint.position.z * 2.8} r="4" fill="#a13d2e" stroke="white" strokeWidth="2"/></svg><p>{musicPreview?'沿石板支路前往乐舞馆；洞窟后续开放。':'乐舞馆、洞窟在后续阶段开放'}</p></aside>)}
      {view === 'follow' && <>
        {snapshot.cinematic && <button type="button" className="world-cinematic-skip" data-testid="world-cinematic-skip" onClick={() => runtime.current?.skipCinematic()}>跳过 <kbd>Esc</kbd></button>}
        <div className="world-direction">{musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'飞天壁画':snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'乐声来处':'乐舞馆'):musicPreview?(snapshot.checkpoint.position.x>8?'飞天壁画':'乐舞馆'):'纹彩院'} <span aria-hidden="true">{musicV2?(snapshot.musicAudio?.playing&&snapshot.musicAudio.gain>.015?'♪':''):musicPreview?'↗':'↖'}</span><small>{musicV2?(inCurrentMusicCourt(snapshot.checkpoint.position)?'前庭右侧，走近后按 F 观察':'沿石板曲径前行'):musicPreview?(snapshot.checkpoint.position.x>8?'前庭右侧，走近后按 F 观察':snapshot.checkpoint.position.x< -2&&snapshot.checkpoint.position.z<3?'从院门返回岔路，沿石板支路前行':'沿石板支路，前往右侧馆舍'):'沿路前行，左转入院'}</small></div>
        {ready && snapshot.nearby && <button type="button" className="world-discovery world-primary" data-testid="world-interact" onClick={startInteraction}>{snapshot.nearby === 'caisson' ? '抬头看看' : snapshot.nearby === 'flying' ? snapshot.flying?.awakened && !musicV2 ? '再看飞天壁画' : '唤醒飞天壁画' : '试看九色鹿故事'}<kbd>F</kbd></button>}
        <div className="world-controls"><p className="world-keyboard-hint"><kbd>W A S D</kbd> 行走　<kbd>Shift</kbd> 跑步　<kbd>Q / E</kbd> 转镜头</p><div className="world-camera-controls"><button type="button" aria-label="镜头向左" onClick={() => runtime.current?.turnCamera(-.12)}>↶</button><button type="button" aria-label="镜头向右" onClick={() => runtime.current?.turnCamera(.12)}>↷</button></div></div>
        <div className="world-joystick" role="group" aria-label="拖动摇杆行走" data-sound="none"
          onPointerDown={e => { if (locked) return; pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); changeStick(e); }} onPointerMove={changeStick} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>
          <span style={{ transform: `translate(${stick.x * 30}px, ${stick.y * 30}px)` }} /><small>拖动行走</small>
        </div>
      </>}
      {view === 'flying' && <WorldFlyingObservation voice={snapshot.flyingVoice} onRetryVoice={() => runtime.current?.retryVoice?.()} state={snapshot.flying} paused={event.mode === 'observing' && event.paused} onPause={() => dispatch({type:event.mode === 'observing' && event.paused?'resume':'pause'})} onReplay={() => {runtime.current?.replayObservation();dispatch({type:'resume'});}} onClose={finishEvent} />}
      {view === 'caisson' && <section className="world-observation" data-testid="world-observation" aria-label="藻井观察"><p>纹彩院 · 藻井厅</p><h2>抬头，发现头顶的纹样</h2><p>观察藻井的层次、纹样与色彩。AI教学示意，非洞窟复原。</p><div><button type="button" className="world-primary" data-testid="world-enter-theme" onClick={goToPatterns}>了解藻井的秘密</button><button type="button" onClick={finishEvent}>继续漫游</button><button type="button" onClick={() => dispatch({ type: event.mode === 'observing' && event.paused ? 'resume' : 'pause' })}>{event.mode === 'observing' && event.paused ? '继续镜头' : '暂停镜头'}</button></div></section>}
    </div>
    {musicV2 && snapshot.musicAudio?.status==='error' && <aside className="world-audio-warning" role="status">乐声暂未加载。<button type="button" onClick={()=>runtime.current?.retrySound?.()}>重试乐声</button></aside>}
    {props.saveWarning && <div className="world-save-warning" role="status"><p>{props.saveWarning}</p><button type="button" onClick={persist}>重试保存</button></div>}
    {!ready && !error && <div className="world-cover" onKeyDown={trapCoverFocus} tabIndex={-1}><h2>正在准备探索世界…</h2><a href="#/themes">直接选择文化主题</a></div>}
    {error && <div className="world-cover" role="alertdialog" aria-modal="true" aria-labelledby="world-error-title" onKeyDown={trapCoverFocus} tabIndex={-1} data-testid="world-error"><h2 id="world-error-title">3D画面暂未打开</h2><p>{error}</p><div><button type="button" className="world-primary" onClick={() => { dispatch({ type: 'exit' }); setAttempt(value => value + 1); }} data-testid="world-retry">重新加载</button><a href="#/themes">直接选择文化主题</a></div></div>}
    {view === 'story' && !error && <WorldStoryPlayer blocked={locked} paused={locked || (event.mode === 'observing' && event.paused)} sound={props.sound} onClose={finishEvent} onPause={pause => dispatch({ type: pause ? 'pause' : 'resume' })} />}
    {portrait && !error && <div className="world-cover world-rotate" data-testid="world-rotate" role="dialog" aria-modal="true" aria-labelledby="world-rotate-title" onKeyDown={trapCoverFocus} tabIndex={-1}><span aria-hidden="true">▭ ↻</span><h2 id="world-rotate-title">横过手机，开始探索</h2><p>3D世界使用横屏，文化导览和小游戏仍可竖屏游玩。</p><a href="#/themes">直接选择文化主题</a></div>}
    {paused && !portrait && !error && ready && <div className="world-cover world-pause-cover" role="dialog" aria-modal="true" aria-labelledby="world-pause-title" onKeyDown={trapCoverFocus} tabIndex={-1}><h2 id="world-pause-title">探索已暂停</h2><p>WASD / 方向键行走，Shift跑步，Q / E转镜头。</p><div><button type="button" className="world-primary" data-testid="world-resume" onClick={() => setPaused(false)}>继续探索</button><button type="button" data-testid="world-reset" onClick={() => { dispatch({ type: 'exit' }); runtime.current?.resetToStart(); setPaused(false); persist(); }}>回到起点</button><a href="#/themes" onClick={persist}>直接选主题</a></div></div>}
  </div>;
}
