import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { MUSIC_INSTRUMENT_GROUPS, type MusicInstrument } from '../content/world/music-instruments-v001';
import { DialogCloseButton } from './DialogCloseButton';
import type { MusicInstrumentAudioStatus } from './use-music-instrument';
import '../styles/music-instrument-overlay.css';

interface MusicInstrumentOverlayProps {
  instrument: MusicInstrument;
  status: MusicInstrumentAudioStatus;
  onClose(): void;
  onRetry(): void;
  reducedMotion?: boolean;
}

const audioStatusText: Record<MusicInstrumentAudioStatus, string> = {
  loading: '正在准备音色',
  playing: '正在试听',
  paused: '试听已暂停',
  muted: '音效已关闭',
  error: '音频暂未播放',
};

export function MusicInstrumentOverlay({ instrument, status, onClose, onRetry, reducedMotion }: MusicInstrumentOverlayProps) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [imageError, setImageError] = useState(false);

  useLayoutEffect(() => {
    const world = panel.current?.closest('.world-screen');
    const opener = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) close.current();
    };
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      requestAnimationFrame(() => {
        if (!world?.isConnected || world.querySelector('[role="dialog"]:not([hidden])')) return;
        const target = opener instanceof HTMLElement && opener !== document.body && opener.isConnected && !opener.closest('[inert]')
          ? opener : world.querySelector<HTMLElement>('.world-host:not([inert]) canvas');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);

  function handleTab(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    event.stopPropagation();
    const controls = [dismiss.current, retry.current].filter((control): control is HTMLButtonElement => control !== null);
    const current = controls.findIndex(control => control === document.activeElement);
    const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
      : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    (controls[next] ?? panel.current)?.focus({ preventScroll: true });
  }

  return <section ref={panel} className="music-instrument-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
    data-testid="music-instrument-overlay" data-instrument-id={instrument.id} data-audio-status={status}
    data-reduced-motion={reducedMotion || undefined} data-sound="none" onKeyDown={handleTab}
    onPointerDown={event => {
      event.stopPropagation();
      pointer.current = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }}
    onPointerMove={event => {
      event.stopPropagation();
      const start = pointer.current;
      if (start?.id === event.pointerId && Math.hypot(start.x - event.clientX, start.y - event.clientY) > 10) pointer.current = null;
    }}
    onPointerUp={event => event.stopPropagation()}
    onPointerCancel={event => { event.stopPropagation(); pointer.current = null; }}
    onWheel={event => event.stopPropagation()}
    onClick={event => {
      event.stopPropagation();
      const start = pointer.current;
      pointer.current = null;
      const keyboardClose = event.detail === 0 && event.target instanceof Node && dismiss.current?.contains(event.target);
      if (keyboardClose || (start && Math.hypot(start.x - event.clientX, start.y - event.clientY) <= 10)) onClose();
    }}>
    <div className="music-instrument-stage">
      <figure className="music-instrument-art">
        {imageError ? <p role="status">壁画图片暂未加载</p> : <img src={worldAssetUrl(instrument.imagePath)}
          alt={`壁画中的${instrument.name}`} decoding="async" fetchPriority="high" draggable={false} onError={() => setImageError(true)} />}
      </figure>
      <article className="music-instrument-caption">
        <header>
          <p className="music-instrument-group">{MUSIC_INSTRUMENT_GROUPS[instrument.group]}</p>
          <h2 id={titleId}>{instrument.name}</h2>
        </header>
        <div className="music-instrument-copy">
          <p className="music-instrument-tone">{instrument.tone}</p>
          {instrument.note && <p className="music-instrument-note">{instrument.note}</p>}
          <p className="music-instrument-source">音频来源 · {instrument.audioSource}</p>
        </div>
        <footer className="music-instrument-listening">
          <span role="status">
            <span className="music-instrument-wave" aria-hidden="true"><i /><i /><i /></span>{audioStatusText[status]}
          </span>
          {status === 'error' && <button ref={retry} type="button" onClick={event => {
            event.stopPropagation();
            pointer.current = null;
            panel.current?.focus({ preventScroll: true });
            onRetry();
          }}>重试音频</button>}
          <p>点任意处返回</p>
        </footer>
        <DialogCloseButton ref={dismiss} className="music-instrument-close" label="关闭乐器试听" />
      </article>
    </div>
  </section>;
}
