import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getAssetUrl } from '../content';
import { createGalleryOrder, isGalleryOrderComplete, moveGalleryItem } from '../games/puzzle/gallery-order';
import { getMobileLandscapeBlocked, subscribeMobileLandscape } from '../services/mobile-landscape';
import type { ContentCatalog, GameEvent, PuzzleLevel } from '../types';
import { DialogCloseButton } from './DialogCloseButton';
import { LevelAdvanceControl } from './LevelAdvanceControl';
import '../styles/gallery-puzzle.css';

interface Props { level: PuzzleLevel; catalog: ContentCatalog; onEvent: (event: GameEvent) => void; onBack: () => void; backLabel?: string }
interface Gesture { pointerId: number; pieceId: number; startX: number; lastX: number; startY: number; lastY: number; startScroll: number; kind: string; mode: 'pending' | 'scroll' | 'drag'; timer?: number }
const randomSeed = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0];

function Reference({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  useEffect(() => {
    const opener = document.activeElement; dialog.current?.showModal();
    return () => { dialog.current?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="gallery-reference" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={heading}>{title} · 原图</h2><DialogCloseButton label="关闭拼图参考" onClick={onClose} /></header>
    <div><img src={url} alt={`${title}完整参考图`} /></div>
    <footer><button type="button" className="button button-secondary button-small" onClick={onClose}><span className="button-label">返回排序</span></button></footer>
  </dialog>;
}

export function GalleryPuzzleScreen({ level, catalog, onEvent, onBack, backLabel = '返回拼图关卡' }: Props) {
  const count = level.sliceCount ?? level.columns;
  const url = getAssetUrl(catalog, level.imageAssetId);
  const image = catalog.assets.find(asset => asset.id === level.imageAssetId)!;
  const [order, setOrder] = useState(() => createGalleryOrder(count, randomSeed()));
  const orderRef = useRef(order); orderRef.current = order;
  const [selected, setSelected] = useState(order[0]);
  const [ready, setReady] = useState(false), [error, setError] = useState(false), [reload, setReload] = useState(0);
  const [reference, setReference] = useState(false), [message, setMessage] = useState('');
  const [dragging, setDragging] = useState<number | null>(null), [slot, setSlot] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: number; x: number; y: number } | null>(null);
  const slotRef = useRef<number | null>(null), gesture = useRef<Gesture | null>(null), frame = useRef<number | null>(null);
  const tray = useRef<HTMLDivElement>(null), completed = useRef(false), event = useRef(onEvent); event.current = onEvent;
  const previousPositions = useRef<Map<string, number> | null>(null);
  const landing = useRef<number | null>(null);
  const capturePositions = () => {
    previousPositions.current = new Map(Array.from(tray.current?.querySelectorAll<HTMLElement>('[data-testid="gallery-piece"]') ?? [])
      .map(node => [node.dataset.pieceId!, node.offsetLeft]));
  };
  const cancel = useCallback(() => {
    const pointerId = gesture.current?.pointerId;
    if (gesture.current?.timer !== undefined) window.clearTimeout(gesture.current.timer);
    gesture.current = null;
    if (pointerId !== undefined && tray.current?.hasPointerCapture(pointerId)) tray.current.releasePointerCapture(pointerId);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null; slotRef.current = null; setDragging(null); setSlot(null); setDragPreview(null);
  }, []);
  useEffect(() => {
    let alive = true; setReady(false); setError(false);
    const source = new Image();
    source.onload = () => { if (alive) { setReady(true); event.current({ type: 'ready', total: count }); } };
    source.onerror = () => { if (alive) setError(true); };
    source.src = url;
    return () => { alive = false; source.onload = null; source.onerror = null; };
  }, [url, reload, count]);
  useEffect(() => {
    const block = () => { if (getMobileLandscapeBlocked()) cancel(); };
    const unsubscribe = subscribeMobileLandscape(block);
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', cancel);
    return () => { unsubscribe(); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', cancel); cancel(); };
  }, [cancel]);
  const commit = (id: number, insertion: number) => {
    if (!ready || getMobileLandscapeBlocked()) return;
    capturePositions();
    if (gesture.current?.mode === 'drag') landing.current = id;
    const next = moveGalleryItem(orderRef.current, id, insertion);
    orderRef.current = next; setOrder(next); setSelected(id); setMessage('');
    if (isGalleryOrderComplete(next) && !completed.current) {
      completed.current = true; event.current({ type: 'completed', levelId: level.id });
    }
  };
  const move = (delta: number) => {
    const index = orderRef.current.indexOf(selected);
    if (index < 0) return;
    commit(selected, Math.max(0, Math.min(count - 1, index + delta)));
  };
  const locate = (clientX: number, movingId: number) => {
    const box = tray.current;
    if (!box) return;
    const localX = clientX - box.getBoundingClientRect().left - box.clientLeft + box.scrollLeft;
    const nodes = Array.from(box.querySelectorAll<HTMLElement>('[data-testid="gallery-piece"]'))
      .filter(node => Number(node.dataset.pieceId) !== movingId);
    // offsetLeft is the final layout position even while FLIP transforms animate.
    const index = nodes.findIndex(node => localX < node.offsetLeft + node.offsetWidth / 2);
    const value = index < 0 ? nodes.length : index;
    slotRef.current = value; setSlot(value);
  };
  const autoScroll = () => {
    const g = gesture.current, box = tray.current;
    if (!g || g.mode !== 'drag' || !box) { frame.current = null; return; }
    const rect = box.getBoundingClientRect(), edge = Math.min(50, rect.width / 5);
    const velocity = g.lastX < rect.left + edge ? -Math.max(3, (rect.left + edge - g.lastX) * .25)
      : g.lastX > rect.right - edge ? Math.max(3, (g.lastX - rect.right + edge) * .25) : 0;
    if (velocity) { box.scrollLeft += velocity; locate(g.lastX, g.pieceId); }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const activate = (g: Gesture) => {
    if (gesture.current !== g || !ready || getMobileLandscapeBlocked()) return;
    capturePositions();
    g.mode = 'drag'; setSelected(g.pieceId); setDragging(g.pieceId); setDragPreview({ id: g.pieceId, x: g.lastX, y: g.lastY });
    if (frame.current === null) frame.current = requestAnimationFrame(autoScroll);
  };
  const down = (e: ReactPointerEvent<HTMLButtonElement>, id: number) => {
    if (!ready || reference || getMobileLandscapeBlocked() || gesture.current || e.button !== 0) return;
    const g: Gesture = { pointerId: e.pointerId, pieceId: id, startX: e.clientX, lastX: e.clientX, startY: e.clientY, lastY: e.clientY, startScroll: tray.current?.scrollLeft ?? 0, kind: e.pointerType, mode: 'pending' };
    gesture.current = g; tray.current?.setPointerCapture(e.pointerId);
    if (e.pointerType !== 'mouse') g.timer = window.setTimeout(() => activate(g), 300);
  };
  const pointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current; if (!g || g.pointerId !== e.pointerId || getMobileLandscapeBlocked()) return;
    g.lastX = e.clientX; g.lastY = e.clientY;
    const distance = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
    if (g.mode === 'pending' && distance > 8) {
      if (g.timer !== undefined) window.clearTimeout(g.timer);
      if (g.kind === 'mouse') activate(g); else g.mode = 'scroll';
    }
    if (g.mode === 'scroll' && tray.current) tray.current.scrollLeft = g.startScroll - (e.clientX - g.startX);
    else if (g.mode === 'drag') { setDragPreview({ id: g.pieceId, x: e.clientX, y: e.clientY }); locate(e.clientX, g.pieceId); }
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current; if (!g || g.pointerId !== e.pointerId) return;
    const insertion = slotRef.current;
    if (!getMobileLandscapeBlocked()) {
      if (g.mode === 'drag' && insertion !== null) commit(g.pieceId, insertion);
      else if (g.mode === 'pending') { setSelected(g.pieceId); setMessage(''); }
    }
    cancel();
  };
  const restart = () => { cancel(); const next = createGalleryOrder(count, randomSeed()); completed.current = false; orderRef.current = next; setOrder(next); setSelected(next[0]); setMessage(''); if (tray.current) tray.current.scrollLeft = 0; };
  const sliceStyle = (id: number): CSSProperties => ({ backgroundImage: `url("${url}")`, backgroundSize: `${count * 100}% 100%`, backgroundPosition: `${count > 1 ? id / (count - 1) * 100 : 0}% center`, aspectRatio: `${image.width / count} / ${image.height}` });
  const previewWidth = 88 * image.width / count / image.height;
  const otherPieces = order.filter(id => id !== dragging);
  useLayoutEffect(() => {
    const previous = previousPositions.current;
    previousPositions.current = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!tray.current?.closest('[data-reduced-motion="true"]');
    if (previous && !reduce) {
      for (const node of Array.from(tray.current?.querySelectorAll<HTMLElement>('[data-testid="gallery-piece"]') ?? [])) {
        const old = previous.get(node.dataset.pieceId!);
        const delta = old === undefined ? 0 : old - node.offsetLeft;
        if (delta) node.animate([{ transform: `translateX(${delta}px)` }, { transform: 'translateX(0)' }], { duration: 230, easing: 'cubic-bezier(.2,.8,.2,1)' });
        if (Number(node.dataset.pieceId) === landing.current) node.animate([{ transform: 'scale(.92)', opacity: .75 }, { transform: 'scale(1)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
      }
    }
    landing.current = null;
    const active = gesture.current;
    if (active?.mode === 'drag') locate(active.lastX, active.pieceId);
  }, [order, dragging]);
  return <div className="page page-play gallery-screen" data-puzzle-mode="gallery-order" data-gallery-order={order.join(',')}>
    <aside className="gallery-controls" aria-label="排序操作">
      <button type="button" className="gallery-back" aria-label={backLabel} onClick={onBack}><img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
      <h1>{level.title}</h1>
      <button type="button" className="gallery-action" data-testid="gallery-reference" disabled={!ready} onClick={() => { cancel(); setReference(true); }}>原图</button>
      <button type="button" className="gallery-action" data-testid="gallery-hint" disabled={!ready} onClick={() => setMessage(`选中画面应排在第 ${selected + 1} 位`)}>提示</button>
      <button type="button" className="gallery-action" data-testid="gallery-restart" disabled={!ready} onClick={restart}>重来</button>
      <LevelAdvanceControl />
    </aside>
    <section className="gallery-workspace" aria-label="壁画画面排序">
      <div className="gallery-preview-area"><div key={selected} className="gallery-preview" data-testid="gallery-preview" data-piece-id={selected} style={sliceStyle(selected)} role="img" aria-label={`选中的壁画画面，当前第 ${order.indexOf(selected) + 1} 幅`} /></div>
      <div className="gallery-sort-controls"><button type="button" data-testid="gallery-move-left" disabled={!ready || order.indexOf(selected) <= 0} onClick={() => move(-1)}>向前移</button><span role="status">{message || `第 ${order.indexOf(selected) + 1} / ${count} 幅`}</span><button type="button" data-testid="gallery-move-right" disabled={!ready || order.indexOf(selected) >= count - 1} onClick={() => move(1)}>向后移</button></div>
      <div ref={tray} className="gallery-tray" data-testid="gallery-tray" role="group" aria-label="拖动排列壁画画面"
        onPointerMove={pointerMove} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={() => { if (gesture.current) cancel(); }}>
        {order.filter(id => id !== dragging).map((id) => {
          const index = order.indexOf(id);
          const insertion = dragging === null ? -1 : otherPieces.indexOf(id);
          return <button key={id} type="button" className={`gallery-piece${id === selected ? ' is-selected' : ''}${dragging !== null && slot === insertion ? ' insert-before' : ''}`}
            data-testid="gallery-piece" data-piece-id={id} aria-label={`画面 ${index + 1}，共 ${count} 幅`} aria-pressed={id === selected} disabled={!ready}
            style={{ aspectRatio: `${image.width / count} / ${image.height}` }}
            onPointerDown={e => down(e, id)}
            onClick={e => { if (e.detail === 0 && !getMobileLandscapeBlocked()) setSelected(id); }}
            onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setSelected(id); const current = orderRef.current.indexOf(id); commit(id, Math.max(0, Math.min(count - 1, current + (e.key === 'ArrowLeft' ? -1 : 1)))); } }}>
            <span className="gallery-piece-art" aria-hidden="true" style={sliceStyle(id)} />
          </button>;
        })}
        {dragging !== null && slot === otherPieces.length && <span className="gallery-end-indicator" aria-hidden="true" />}
      </div>
      {!ready && !error && <p className="gallery-notice" role="status">正在准备壁画…</p>}
      {error && <div className="gallery-notice" role="alert">壁画加载失败。 <button type="button" onClick={() => setReload(value => value + 1)}>重新加载</button></div>}
    </section>
    {dragPreview && <div className="gallery-drag-preview" data-testid="gallery-drag-preview" aria-hidden="true" style={{ ...sliceStyle(dragPreview.id), left: Math.max(4, Math.min(window.innerWidth - previewWidth - 8, dragPreview.x + 14)), top: Math.max(4, Math.min(window.innerHeight - 92, dragPreview.y - 104)) }} />}
    {reference && <Reference url={url} title={level.title} onClose={() => setReference(false)} />}
  </div>;
}
