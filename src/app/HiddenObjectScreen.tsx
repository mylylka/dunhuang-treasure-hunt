import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getAssetUrl } from '../content';
import { hiddenObjectPool, hiddenObjectSpriteUrl } from '../content/hidden-object';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import type { ContentCatalog, GameCommand, GameEvent, HiddenObjectLevel, HiddenObjectSnapshot } from '../types';
import '../styles/hidden-object.css';

export interface HiddenObjectScreenProps {
  level: HiddenObjectLevel;
  catalog: ContentCatalog;
  reducedMotion: boolean;
  onEvent: (event: GameEvent) => void;
  onBack: () => void;
}

type HiddenCommand =
  | { type: 'hidden-start' | 'hidden-pause' | 'hidden-resume' | 'hidden-new-round' | 'hint' | 'restart' }
  | { type: 'hidden-select-task'; taskId: string }
  | { type: 'hidden-scroll'; offset: number }
  | { type: 'set-zoom'; zoom: 1 | 2 | 3 };

const spritesById = new Map(hiddenObjectPool.sprites.map(sprite => [sprite.id, sprite]));

function clockLabel(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function HiddenObjectScreen({ level, catalog, reducedMotion, onEvent, onBack }: HiddenObjectScreenProps) {
  const [command, setCommand] = useState<GameCommand | null>(null);
  const [snapshot, setSnapshot] = useState<HiddenObjectSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [run, setRun] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(1);
  const sequence = useRef(0);
  const eventRef = useRef(onEvent);
  const snapshotRef = useRef(snapshot);
  const overlayAction = useRef<HTMLButtonElement>(null);
  const scrollbar = useRef<HTMLDivElement>(null);
  const overlayHeading = useId();
  eventRef.current = onEvent;
  snapshotRef.current = snapshot;

  const send = useCallback((value: HiddenCommand) => {
    setCommand({ ...value, sequence: ++sequence.current });
  }, []);

  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'hidden-object-change') {
      snapshotRef.current = event.snapshot;
      setSnapshot(event.snapshot);
      if (event.snapshot.status === 'timeout') setMessage('');
      return;
    }
    if (event.type === 'ready') { setReady(true); setError(null); }
    if (event.type === 'error') { setReady(false); setError(event.message); }
    if (event.type === 'hint') setMessage(event.message);
    eventRef.current(event);
  }, []);

  useEffect(() => {
    const pause = () => {
      if (snapshotRef.current?.status === 'running') send({ type: 'hidden-pause' });
    };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [send]);

  const status = snapshot?.status ?? 'ready';
  const remainingMs = snapshot?.remainingMs ?? level.timeLimitSeconds * 1000;
  const taskCount = snapshot?.totalTargets ?? 0;
  const running = ready && !error && status === 'running';
  const selectable = ready && !error && (status === 'ready' || status === 'running');
  const blocked = !running;
  const scrollTop = snapshot?.scrollTop ?? 0;
  const scrollMax = snapshot?.scrollMax ?? 0;

  useLayoutEffect(() => {
    const element = scrollbar.current;
    if (!element) return;
    const measure = () => setScrollbarHeight(Math.max(1, element.clientHeight));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = scrollbar.current;
    if (!element) return;
    // The DOM rounds content heights; map its real range to the canvas's fractional range.
    const nativeMaximum = Math.max(0, element.scrollHeight - element.clientHeight);
    const nativeOffset = scrollMax > 0 ? scrollTop / scrollMax * nativeMaximum : 0;
    const atBoundary = scrollTop === 0 || scrollTop === scrollMax;
    if (Math.abs(element.scrollTop - nativeOffset) > (atBoundary ? .01 : .5)) element.scrollTop = nativeOffset;
  }, [scrollTop, scrollMax, scrollbarHeight, running]);

  useEffect(() => {
    if (ready && !error && (status === 'ready' || status === 'paused')) {
      overlayAction.current?.focus({ preventScroll: true });
    }
  }, [ready, error, status]);

  const newRound = () => {
    setReady(false);
    setError(null);
    setMessage('');
    setSnapshot(null);
    snapshotRef.current = null;
    send({ type: 'hidden-new-round' });
  };
  const retry = () => { setMessage(''); send({ type: 'restart' }); };
  const reload = () => {
    setReady(false);
    setError(null);
    setMessage('');
    setSnapshot(null);
    snapshotRef.current = null;
    setCommand(null);
    setRun(value => value + 1);
  };

  return <div className="page page-play hidden-object-screen" data-hidden-status={error ? 'error' : ready ? status : 'loading'}>
    <header className="hidden-object-heading">
      <button type="button" className="hidden-object-back" aria-label="返回找物关卡" onClick={onBack}>
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1>{level.title}</h1>
      <div className={`hidden-object-clock${remainingMs <= 10_000 ? ' is-urgent' : ''}`}
        role="timer" aria-live="off" aria-label={`剩余 ${Math.ceil(remainingMs / 1000)} 秒`} data-testid="hidden-object-timer">
        <span>剩余时间</span><strong>{clockLabel(remainingMs)}</strong>
      </div>
    </header>

    <div className="hidden-object-workspace">
      <aside className="hidden-object-task-panel" aria-label="本局寻找目标">
        <div className="hidden-object-task-heading">
          <span>寻找目标</span>
          <span className="hidden-object-progress" data-testid="hidden-object-progress">已找到 <strong>{snapshot?.foundCount ?? 0}</strong> / {taskCount}</span>
        </div>
        <div className="hidden-object-task-list" role="group" aria-label="选择提示目标">
          {snapshot?.tasks.map(task => {
            const sprite = spritesById.get(task.previewSpriteId);
            const complete = task.found >= task.required;
            return <button type="button" key={task.id}
              className={`hidden-object-task${complete ? ' is-complete' : ''}`}
              data-testid="hidden-object-task" data-task-id={task.id}
              aria-pressed={snapshot.selectedTaskId === task.id}
              aria-label={`${task.label}，已找到 ${task.found} 件，共 ${task.required} 件${complete ? '，已找齐' : ''}`}
              disabled={!selectable || complete}
              onClick={() => { setMessage(''); send({ type: 'hidden-select-task', taskId: task.id }); }}>
              <span className="hidden-object-task-art">{sprite && <img src={hiddenObjectSpriteUrl(sprite)} alt="" draggable={false} />}</span>
              <span className="hidden-object-task-copy"><strong>{task.label}</strong><span>{complete ? '已找齐' : '已找到'} <b>{task.found} / {task.required}</b></span></span>
              {complete && <span className="hidden-object-task-check" aria-hidden="true">✓</span>}
            </button>;
          })}
          {!snapshot && <p className="hidden-object-target-loading">正在抽取本局目标…</p>}
        </div>
      </aside>

      <section className={`game-stage hidden-object-stage${blocked ? ' is-blocked' : ''}`} aria-label="找物游戏区">
        <div className="hidden-object-tools">
          <span>滚轮或上下拖动浏览</span>
          <div role="group" aria-label="盘面缩放">{([1, 2, 3] as const).map(zoom =>
            <button type="button" key={zoom} disabled={!running}
              aria-pressed={(snapshot?.zoom ?? 1) === zoom}
              onClick={() => send({ type: 'set-zoom', zoom })}>{zoom}×</button>)}</div>
        </div>
        <div className="hidden-object-canvas-shell">
          <div className="hidden-object-canvas-host" aria-hidden={blocked}>
            <PhaserPlayer key={`${level.id}-${run}`} level={level} hiddenObjectPool={hiddenObjectPool}
              reducedMotion={reducedMotion} onEvent={emit} command={command} />
          </div>
          <div ref={scrollbar} className="hidden-object-scrollbar" data-testid="hidden-object-scrollbar"
            role="region" aria-label="上下滚动寻找物件" aria-disabled={!running || !scrollMax}
            tabIndex={running ? 0 : -1}
            onScroll={event => {
              if (!running || !snapshot || snapshot.scrollMax <= 0) return;
              const element = event.currentTarget;
              const nativeMaximum = Math.max(0, element.scrollHeight - element.clientHeight);
              const fraction = nativeMaximum > 0 ? Math.max(0, Math.min(1, element.scrollTop / nativeMaximum)) : 0;
              const offset = fraction * snapshot.scrollMax;
              if (Math.abs(offset - snapshot.scrollTop) > (fraction === 0 || fraction === 1 ? .01 : .75)) {
                send({ type: 'hidden-scroll', offset });
              }
            }}>
            <div style={{ width: 1, height: scrollbarHeight + Math.max(0, scrollMax) }} />
          </div>
          {error ? <div className="hidden-object-overlay hidden-object-error" role="alert">
            <h2>画面暂未准备好</h2><p>{error}</p>
            <button type="button" className="button button-secondary button-small" onClick={reload}><span className="button-label">重新加载</span></button>
          </div> : !ready ? <div className="hidden-object-overlay hidden-object-loading" role="status"><p>正在布置寻宝物件…</p></div>
            : status === 'ready' ? <div className="hidden-object-overlay hidden-object-ready" data-testid="hidden-object-ready" role="dialog" aria-labelledby={overlayHeading}>
              <h2 id={overlayHeading} className="visually-hidden">本局寻找</h2>
              <p className="hidden-object-ready-meta"><span>{level.timeLimitSeconds}秒</span><span aria-hidden="true">·</span><span>共{taskCount}件</span></p>
              <div className="hidden-object-ready-targets" role="list" aria-label="本局目标图片与数量">
                {snapshot?.tasks.map(task => {
                  const sprite = spritesById.get(task.previewSpriteId);
                  return <figure key={task.id} className="hidden-object-ready-target" role="listitem"
                    data-testid="hidden-object-ready-target" data-task-id={task.id}>
                    <div className="hidden-object-ready-art">
                      {sprite && <img src={hiddenObjectSpriteUrl(sprite)} alt={`${task.label}目标图`} draggable={false} />}
                    </div>
                    <figcaption><span>{task.label}</span><strong aria-label={`${task.required}件`}>×{task.required}</strong></figcaption>
                  </figure>;
                })}
              </div>
              <div className="hidden-object-ready-footer">
                <button ref={overlayAction} type="button" className="button button-primary" onClick={() => { setMessage(''); send({ type: 'hidden-start' }); }}><span className="button-label">开始寻找</span></button>
              </div>
            </div> : status === 'paused' ? <div className="hidden-object-overlay" role="dialog" aria-labelledby={overlayHeading}>
              <h2 id={overlayHeading}>已暂停</h2><p>时间停在 {clockLabel(remainingMs)}</p>
              <div className="hidden-object-overlay-actions">
                <button ref={overlayAction} type="button" className="button button-primary" onClick={() => send({ type: 'hidden-resume' })}><span className="button-label">继续寻找</span></button>
                <button type="button" className="button button-secondary" onClick={retry}><span className="button-label">重试本局</span></button>
              </div>
            </div> : status === 'timeout' ? <div className="hidden-object-overlay hidden-object-timeout" role="status">
              <h2>时间到了</h2><p>本次找到 {snapshot?.foundCount ?? 0} / {taskCount} 件</p>
              <span>可以重试本局，或换一局重新寻找</span>
            </div> : status === 'won' ? <div className="hidden-object-overlay" role="status"><h2>目标已找齐</h2></div> : null}
        </div>
      </section>
    </div>

    <div className="hidden-object-status" role="status" data-testid="hidden-object-hint-status">{message}</div>
    <footer className="hidden-object-actions">
      {status === 'timeout' ? <button type="button" className="button button-secondary button-small" disabled={!ready || Boolean(error)} onClick={retry}><span className="button-label">重试本局</span></button>
        : <button type="button" className="button button-secondary button-small" disabled={!running} onClick={() => send({ type: 'hidden-pause' })}><span className="button-label">暂停</span></button>}
      <button type="button" data-sound="none" className="button button-secondary button-small" disabled={!running || !snapshot?.tasks.some(task => task.found < task.required)}
        onClick={() => send({ type: 'hint' })}><img src={getAssetUrl(catalog, 'icon-hint')} alt="" /><span className="button-label">提示</span></button>
      <button type="button" className="button button-secondary button-small" disabled={!ready || Boolean(error) || status === 'won'} onClick={newRound}><span className="button-label">新一局</span></button>
    </footer>
  </div>;
}
