import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { MUSIC_GUIDE_LINES, MUSIC_GUIDE_OUTFITS, type MusicGuideLineId, type MusicGuideOutfitId } from '../content/world/music-guide-v001';
import { DialogCloseButton } from './DialogCloseButton';
import '../styles/music-guide-overlay.css';

function MusicGuideIntro({ onAdvance }: { onAdvance(): void }) {
  const panel = useRef<HTMLDialogElement>(null);
  const textId = useId();
  useLayoutEffect(() => {
    const dialog = panel.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={panel} className="music-guide-dialogue music-guide-intro" aria-label="乐舞坊介绍" aria-describedby={textId}
    data-testid="music-guide-dialogue" data-line="intro" onClick={onAdvance}
    onCancel={event => { event.preventDefault(); onAdvance(); }}
    onKeyDown={event => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onAdvance();
    }}>
    <p id={textId}>{MUSIC_GUIDE_LINES.intro.text}</p>
  </dialog>;
}

export function MusicGuideDialogue({ line, invitation, nearby, actionLabel, onCaptionPresented, onSkipIntro, onRespond, onInteract }: {
  line: MusicGuideLineId | null;
  invitation: boolean;
  nearby: boolean;
  actionLabel: string;
  onCaptionPresented(line: MusicGuideLineId, presented: boolean): void;
  onSkipIntro(): void;
  onRespond(choice: 'dress' | 'plain' | 'dismiss'): void;
  onInteract(): void;
}) {
  useLayoutEffect(() => {
    if (!line || invitation) return;
    // The dialogue is lazy-loaded. Let its first frame paint before enabling audio.
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => onCaptionPresented(line, true));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      onCaptionPresented(line, false);
    };
  }, [line, invitation, onCaptionPresented]);
  if (!line && !invitation) return nearby && <button type="button" className="music-guide-talk" data-testid="music-guide-interact"
    onClick={onInteract}>{actionLabel}</button>;
  if (line === 'intro') return <MusicGuideIntro onAdvance={onSkipIntro} />;
  return <aside className="music-guide-dialogue" aria-label="小导游" data-testid="music-guide-dialogue" data-line={line ?? undefined}>
    {invitation ? <div className="music-guide-invitation" data-testid="music-guide-invitation">
      <button type="button" onClick={() => onRespond('dress')}>帮你装扮</button>
      <button type="button" onClick={() => onRespond('plain')}>穿常服同行</button>
      <button type="button" onClick={() => onRespond('dismiss')}>先自己逛逛</button>
    </div> : line && <p role="status">{MUSIC_GUIDE_LINES[line].text}</p>}
  </aside>;
}

interface MusicGuideWardrobeProps {
  worn: MusicGuideOutfitId;
  blocked: boolean;
  reducedMotion: boolean;
  onClose(): void;
  onApplied(id: MusicGuideOutfitId): void;
  onSelect(id: MusicGuideOutfitId, onProgress: (progress: number | null) => void, signal: AbortSignal): Promise<boolean>;
}

function CostumePrototype({ item }: { item: typeof MUSIC_GUIDE_OUTFITS[number] }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status">壁画图暂未加载</p> : <img data-testid="music-guide-prototype"
    src={worldAssetUrl(item.imagePath)} alt={`${item.title}的壁画原型`} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

export function MusicGuideWardrobe({ worn, blocked, reducedMotion, onClose, onApplied, onSelect }: MusicGuideWardrobeProps) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const request = useRef<AbortController | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const [index, setIndex] = useState(() => Math.max(0, MUSIC_GUIDE_OUTFITS.findIndex(item => item.id === worn)));
  const [dressing, setDressing] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);
  const [failed, setFailed] = useState(false);
  const item = MUSIC_GUIDE_OUTFITS[index];
  const last = MUSIC_GUIDE_OUTFITS.length - 1;

  function move(delta: number) {
    if (dressing) return;
    setIndex(previous => Math.max(0, Math.min(last, previous + delta)));
    setFailed(false);
  }

  function cancel() {
    request.current?.abort();
    close.current();
  }

  useEffect(() => () => request.current?.abort(), []);
  useLayoutEffect(() => {
    const world = panel.current?.closest('.world-screen');
    const opener = document.activeElement;
    return () => {
      requestAnimationFrame(() => {
        if (!world?.isConnected || world.querySelector('[role="dialog"]:not([hidden])')) return;
        const target = opener instanceof HTMLElement && opener !== document.body && opener.isConnected && !opener.closest('[inert]')
          ? opener : world.querySelector<HTMLElement>('.world-host:not([inert]) canvas');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  useLayoutEffect(() => {
    swipe.current = null;
    if (blocked) return;
    closeButton.current?.focus({ preventScroll: true });
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) cancel();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [blocked]);
  useLayoutEffect(() => {
    if (dressing && !blocked) closeButton.current?.focus({ preventScroll: true });
  }, [blocked, dressing]);

  async function select(id: MusicGuideOutfitId) {
    if (blocked || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    setProgress(0);
    setDressing(true);
    let applied = false;
    try {
      applied = await onSelect(id, value => {
        if (!controller.signal.aborted) setProgress(value);
      }, controller.signal);
    } catch { /* The current garment stays in place until a selection succeeds. */ }
    if (controller.signal.aborted) return;
    request.current = null;
    if (applied) onApplied(id);
    else {
      setDressing(false);
      setFailed(true);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) move(event.key === 'ArrowLeft' ? -1 : 1);
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    event.stopPropagation();
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
    const active = controls.findIndex(control => control === document.activeElement);
    const next = active < 0 ? (event.shiftKey ? controls.length - 1 : 0)
      : (active + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    (controls[next] ?? panel.current)?.focus({ preventScroll: true });
  }

  return <section ref={panel} className="music-guide-wardrobe" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
    hidden={blocked} data-testid="music-guide-wardrobe" data-outfit-id={item.id} data-reduced-motion={reducedMotion || undefined} onKeyDown={keyDown}
    onPointerDown={event => {
      event.stopPropagation();
      swipe.current = event.isPrimary && event.pointerType === 'touch' && !(event.target instanceof Element && event.target.closest('button, a'))
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }}
    onPointerUp={event => {
      event.stopPropagation();
      const start = swipe.current;
      swipe.current = null;
      if (start?.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
    }}
    onPointerCancel={() => { swipe.current = null; }} onWheel={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <div className="music-guide-wardrobe-stage">
      <figure className="music-guide-wardrobe-art">
        <div className="music-guide-wardrobe-image"><CostumePrototype key={item.id} item={item} /></div>
        <figcaption>
          <span>壁画原型</span>
          <nav className="music-guide-wardrobe-pages" aria-label="浏览历代服饰">
            <button type="button" aria-label="上一套" disabled={!index || dressing} onClick={() => move(-1)}>‹</button>
            <span aria-live="polite">{index + 1} / {MUSIC_GUIDE_OUTFITS.length}</span>
            <button type="button" aria-label="下一套" disabled={index === last || dressing} onClick={() => move(1)}>›</button>
          </nav>
        </figcaption>
      </figure>
      <article className="music-guide-wardrobe-details">
        <header>
          <p className="music-guide-wardrobe-period">{item.period} <span aria-hidden="true">·</span> {item.cave}</p>
          <h2 id={titleId}>{item.title}</h2>
        </header>
        <div className="music-guide-wardrobe-description">
          <p>{item.description}</p>
          {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">查看出处</a>}
        </div>
        {failed && <p className="music-guide-wardrobe-error" role="status">这套衣裳暂未加载，点原按钮可以重试。</p>}
        <footer className="music-guide-wardrobe-actions">
          {dressing ? <div className="music-guide-dressing" data-testid="music-guide-dressing">
            <p role="status">等我打扮一下</p>
            <progress aria-label="装扮加载进度" max={1} value={progress ?? undefined} />
          </div> : <>
            <button type="button" className="music-guide-wear" onClick={() => { void select(item.id); }}>选这个</button>
            <button type="button" onClick={() => { void select('plain'); }}>恢复常服</button>
          </>}
        </footer>
      </article>
      <DialogCloseButton ref={closeButton} className="music-guide-wardrobe-close" label="关闭装扮" onClick={cancel} />
    </div>
  </section>;
}
