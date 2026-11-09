import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { registerSpeechSkip } from '../services/speech-skip';
import type { FlyingHistoryAction, FlyingHistorySnapshot } from '../world/flying-history';
import '../styles/world-flying-history.css';

interface Props {
  state: FlyingHistorySnapshot;
  blocked: boolean;
  onCaptionPresented(phase: FlyingHistorySnapshot['phase'], chapter: number | null, presented: boolean): void;
  onControl(action: FlyingHistoryAction): void;
  onReturn(): void;
}

interface Press {
  pointer: number;
  x: number;
  y: number;
  passage: string;
  control: Element | null;
}

const controls = 'button, a, input, select, textarea, [contenteditable=true]';

export function WorldFlyingHistory({ state, blocked, onCaptionPresented, onControl, onReturn }: Props) {
  const panel = useRef<HTMLElement>(null);
  const menu = useRef<HTMLElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const returnToMenuButton = useRef(true);
  const wasMenuOpen = useRef(false);
  const press = useRef<Press | null>(null);
  const { phase, chapter, speaker, subtitle, paused, menuOpen, titles } = state;
  const canSkip = state.canSkip && !blocked && !paused && !menuOpen;
  const canChoose = chapter !== null || phase === 'complete';
  const canPause = phase !== 'invite' && phase !== 'complete' && phase !== 'image-error';
  const passage = `${phase}:${chapter}:${speaker}`;

  useLayoutEffect(() => {
    if (caption.current) caption.current.scrollTop = 0;
  }, [subtitle]);

  useLayoutEffect(() => {
    if (blocked || (phase !== 'opening' && phase !== 'chapter')) return;
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => onCaptionPresented(phase, chapter, true));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      onCaptionPresented(phase, chapter, false);
    };
  }, [phase, chapter, blocked, onCaptionPresented]);

  useLayoutEffect(() => {
    press.current = null;
    if (blocked) return;
    if (menuOpen) {
      const current = menu.current?.querySelector<HTMLElement>('[aria-current="step"]')
        ?? menu.current?.querySelector<HTMLElement>('ol button');
      current?.focus({ preventScroll: true });
      current?.scrollIntoView({ block: 'nearest' });
    } else if (wasMenuOpen.current && returnToMenuButton.current && menuButton.current) {
      menuButton.current.focus({ preventScroll: true });
    } else {
      panel.current?.focus({ preventScroll: true });
    }
    wasMenuOpen.current = menuOpen;
    returnToMenuButton.current = true;
  }, [blocked, menuOpen]);

  const keyboardSkip = useRef<() => boolean>(() => false);
  const keyboardEscape = useRef<(event: globalThis.KeyboardEvent) => void>(() => {});
  keyboardSkip.current = () => {
    if (blocked || !panel.current) return false;
    if (canSkip) onControl({ type: 'skip' });
    return true;
  };
  useEffect(() => registerSpeechSkip(() => keyboardSkip.current()), []);
  keyboardEscape.current = event => {
    if (blocked || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (menuOpen) onControl({ type: 'toggle-menu' });
    else onReturn();
  };
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => keyboardEscape.current(event);
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, []);

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (blocked || event.key !== 'Tab') return;
    const scope = menuOpen ? menu.current : panel.current;
    const focusable = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? []);
    if (!focusable.length) return;
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next = current === -1 ? event.shiftKey ? focusable.length - 1 : 0
      : (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
    event.preventDefault();
    focusable[next]?.focus();
  }

  function rememberPress(event: PointerEvent<HTMLElement>) {
    press.current = null;
    if (blocked || !event.isPrimary || event.button !== 0) return;
    const control = event.target instanceof Element ? event.target.closest(controls) : null;
    if (!control && !canSkip) return;
    if (!control) panel.current?.focus({ preventScroll: true });
    press.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, passage, control };
  }

  function cancelDrag(event: PointerEvent<HTMLElement>) {
    const start = press.current;
    if (start?.pointer === event.pointerId && Math.hypot(start.x - event.clientX, start.y - event.clientY) > 10) press.current = null;
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    const start = press.current;
    press.current = null;
    if (!event.detail) return;
    const control = event.target instanceof Element ? event.target.closest(controls) : null;
    if (blocked || !start || start.control !== control || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 10) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!control && canSkip && start.passage === passage) onControl({ type: 'skip' });
  }

  function select(index: number) {
    returnToMenuButton.current = false;
    onControl({ type: 'select', chapter: index });
  }

  function focusStage() { panel.current?.focus({ preventScroll: true }); }

  return <section className="flying-history" role="dialog" aria-modal="true" aria-label="敦煌飞天历史讲解" tabIndex={-1}
    ref={panel} inert={blocked} data-testid="flying-history" data-phase={phase} data-chapter={chapter ?? undefined}
    data-paused={paused} data-can-skip={canSkip} onKeyDown={handleKey} onPointerDownCapture={rememberPress}
    onPointerMoveCapture={cancelDrag} onPointerCancelCapture={() => { press.current = null; }} onClickCapture={handleClick}>
    <nav className="flying-history__toolbar" aria-label="飞天讲解控制">
      {canChoose && <button type="button" ref={menuButton} aria-expanded={menuOpen} aria-controls="flying-history-chapters"
        data-testid="flying-history-menu-button" onClick={() => onControl({ type: 'toggle-menu' })}>
        年代 {(chapter ?? titles.length - 1) + 1}/{titles.length}
      </button>}
      {canPause && <button type="button" aria-pressed={paused} disabled={menuOpen} data-testid="flying-history-pause"
        onClick={() => { onControl({ type: 'toggle-pause' }); if (paused) focusStage(); }}>{paused ? '继续' : '暂停'}</button>}
      <button type="button" onClick={onReturn} data-testid="flying-history-return">返回</button>
    </nav>
    {menuOpen && <nav className="flying-history__chapters" id="flying-history-chapters" ref={menu}
      aria-label="选择年代" data-testid="flying-history-menu">
      <header>
        <h2>敦煌飞天年代</h2>
        <button type="button" onClick={() => onControl({ type: 'toggle-menu' })} aria-label="关闭年代菜单">关闭</button>
      </header>
      <ol>
        {titles.map((title, index) => <li key={title}>
          <button type="button" aria-current={chapter === index ? 'step' : undefined} onClick={() => select(index)}>
            <span className="flying-history__ordinal" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{title}
          </button>
        </li>)}
      </ol>
    </nav>}
    <footer className="flying-history__footer">
      {subtitle && <div className="flying-history__subtitle" aria-live={blocked || menuOpen ? 'off' : 'polite'}
        aria-atomic="true" aria-label="讲解字幕" role="region" tabIndex={0} ref={caption}
        data-testid="flying-history-subtitle" data-speaker={speaker}>
        <p><span className="flying-history__speaker">{speaker === 'flying' ? '飞天' : '小导游'}</span>{subtitle}</p>
      </div>}
      {phase === 'invite' && <div className="flying-history__actions" aria-label="飞天的邀请">
        <button type="button" className="world-primary" data-testid="flying-history-start"
          onClick={() => { onControl({ type: 'start' }); focusStage(); }}>看看变化</button>
        <button type="button" onClick={onReturn}>返回漫游</button>
      </div>}
      {phase === 'complete' && <div className="flying-history__actions" aria-label="飞天讲解已完成">
        <button type="button" aria-expanded={menuOpen} aria-controls="flying-history-chapters"
          onClick={() => onControl({ type: 'toggle-menu' })}>选年代</button>
        <button type="button" onClick={onReturn}>返回漫游</button>
      </div>}
      {phase === 'loading' && <p className="flying-history__notice" role="status">正在展开这段壁画…</p>}
      {phase === 'image-error' && <div className="flying-history__actions" role="group" aria-label="图片加载选项">
        <p role="status">这段壁画暂未加载。</p>
        <button type="button" className="world-primary" onClick={() => { onControl({ type: 'retry' }); focusStage(); }}>重试图片</button>
        <button type="button" onClick={() => { onControl({ type: 'skip-broken' }); focusStage(); }}>跳过本段</button>
      </div>}
    </footer>
  </section>;
}
