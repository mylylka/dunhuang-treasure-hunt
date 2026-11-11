import {
  useEffect, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { worldAssetUrl } from '../content/world/assets';
import {
  exhibitIdForPanel, getMogaoExhibit, MOGAO_EXHIBIT, MOGAO_EXHIBIT_ENTRANCE_LINES, MOGAO_EXHIBIT_INSTRUCTIONS,
  MOGAO_HALL_A_ENTRANCE_LINES, MOGAO_HALL_A_INSTRUCTIONS,
  type MogaoExhibit, type MogaoExhibitId, type MogaoExhibitPanelId, type MogaoExhibitWallId,
} from '../content/world/mogao-exhibit-v001';
import type { WorldRewardId } from '../content/world/mogao-rewards-v001';
import type { MogaoExhibitHall } from '../world/types';
import { DialogCloseButton } from './DialogCloseButton';
import '../styles/mogao-exhibit.css';

export interface MogaoExhibitOverlayProps {
  intro: MogaoExhibitHall | null;
  arrivalIntro: MogaoExhibitHall | null;
  introReady: boolean;
  panelId: MogaoExhibitPanelId | null;
  wallId: MogaoExhibitWallId | null;
  blocked: boolean;
  reducedMotion: boolean;
  saveWarning?: string | null;
  onCloseExhibit(): void;
  onCloseWall(): void;
  onCloseArrivalIntro(): void;
  onPauseArrival(): void;
  onRetrySave?(): void;
}

const MAX_ZOOM = 4;
type Offset = { x: number; y: number };
type Size = { width: number; height: number };
const CENTER = { x: 0, y: 0 };
const FITTED_VIEW = { zoom: 1, pan: CENTER };
type ArtView = typeof FITTED_VIEW;
const KEY_PAN: Readonly<Record<string, Offset>> = {
  ArrowLeft: { x: 38, y: 0 }, ArrowRight: { x: -38, y: 0 },
  ArrowUp: { x: 0, y: 38 }, ArrowDown: { x: 0, y: -38 },
};

function containPan(pan: Offset, image: Size, stage: Size, zoom: number): Offset {
  const x = Math.max(0, (image.width * zoom - stage.width) / 2);
  const y = Math.max(0, (image.height * zoom - stage.height) / 2);
  return { x: Math.min(x, Math.max(-x, pan.x)), y: Math.min(y, Math.max(-y, pan.y)) };
}

function midpoint(a: Offset, b: Offset): Offset {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function fingerSpan(a: Offset, b: Offset) {
  return Math.max(12, Math.hypot(a.x - b.x, a.y - b.y));
}

function resizeArt(current: ArtView, factor: number, from: Offset, to: Offset, fitted: Size, stage: Size): ArtView {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, current.zoom * factor));
  if (zoom === 1) return FITTED_VIEW;
  const scale = zoom / current.zoom;
  // Keep the same image point under the midpoint as the fingers move.
  const pan = containPan({
    x: to.x + (current.pan.x - from.x) * scale,
    y: to.y + (current.pan.y - from.y) * scale,
  }, fitted, stage, zoom);
  return { zoom, pan };
}

function trapFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  event.stopPropagation();
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')]
    .filter(control => control.getClientRects().length > 0 && !control.closest('[inert], [hidden]'));
  const current = controls.findIndex(control => control === document.activeElement);
  const step = event.shiftKey ? -1 : 1;
  const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (current + step + controls.length) % controls.length;
  (controls[next] ?? event.currentTarget).focus({ preventScroll: true });
}

const DIALOG_LABELS = {
  detail: null, 'wall-theme': '关闭墙面主题', scroll: '合上手卷', 'hall-a-scroll': '合上观壁笺', 'music-scroll': '合上见闻卷', 'first-scroll': '合上观艺卷',
  guide: '关闭图鉴', award: null, 'arrival-intro': null,
} as const;
const DIALOG_IDS = {
  detail: 'mogao-exhibit-detail', 'wall-theme': 'mogao-exhibit-wall-theme', scroll: 'mogao-exhibit-scroll',
  'hall-a-scroll': 'mogao-hall-a-scroll', 'music-scroll': 'music-gallery-scroll', 'first-scroll': 'first-gallery-scroll',
  guide: 'mogao-reward-guide', award: 'mogao-reward-award', 'arrival-intro': 'mogao-arrival-intro',
} as const;

export function MogaoExhibitDialog({ children, kind, blocked, onClose, titleId, exhibitId, imageVariant, wallId, rewardId }: {
  children: ReactNode | ((closeButton: ReactNode) => ReactNode);
  kind: keyof typeof DIALOG_LABELS;
  blocked: boolean;
  onClose(): void;
  titleId: string;
  exhibitId?: MogaoExhibitId;
  imageVariant?: 'full' | 'detail';
  wallId?: MogaoExhibitWallId;
  rewardId?: WorldRewardId;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  const detailPointers = useRef(new Map<number, Offset>());
  const detailTap = useRef(false);
  closeCallback.current = onClose;

  useLayoutEffect(() => {
    const world = panel.current?.closest('.world-screen');
    const opener = document.activeElement;
    return () => {
      requestAnimationFrame(() => {
        if (!world?.isConnected || world.querySelector('.mogao-exhibit-modal:not([hidden]), .world-cover')) return;
        const preferred = kind === 'guide' ? world.querySelector<HTMLElement>('[data-testid="mogao-reward-guide-button"]') : opener;
        const target = preferred instanceof HTMLElement && preferred !== document.body && preferred.isConnected && !preferred.closest('[inert], [hidden]')
          ? preferred : world.querySelector<HTMLElement>('.world-host:not([inert]) canvas');
        target?.focus({ preventScroll: true });
      });
    };
  }, [kind]);

  useLayoutEffect(() => {
    detailPointers.current.clear();
    detailTap.current = false;
    if (blocked) return;
    if (kind === 'arrival-intro') {
      (panel.current?.querySelector<HTMLButtonElement>('.mogao-arrival-start:not(:disabled)') ?? panel.current)
        ?.focus({ preventScroll: true });
      return;
    }
    (close.current ?? panel.current)?.focus({ preventScroll: true });
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCallback.current();
    };
    window.addEventListener('keydown', dismiss, true);
    return () => window.removeEventListener('keydown', dismiss, true);
  }, [blocked, kind]);

  function startDetailTap(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const interactive = event.target instanceof Element && event.target.closest('a[href], button');
    detailTap.current = detailPointers.current.size === 0 && !interactive;
    detailPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function moveDetailTap(event: ReactPointerEvent<HTMLElement>) {
    const start = detailPointers.current.get(event.pointerId);
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) detailTap.current = false;
  }

  function cancelDetailTap(event: ReactPointerEvent<HTMLElement>) {
    if (detailPointers.current.delete(event.pointerId)) detailTap.current = false;
  }

  function finishDetailTap(event: ReactPointerEvent<HTMLElement>) {
    moveDetailTap(event);
    const dismiss = detailTap.current && detailPointers.current.has(event.pointerId);
    cancelDetailTap(event);
    if (dismiss) onClose();
  }

  const closeLabel = DIALOG_LABELS[kind];
  const closeButton = closeLabel && <DialogCloseButton ref={close} className="mogao-exhibit-close" label={closeLabel} onClick={onClose} />;

  return <section
    ref={panel} className={`mogao-exhibit-modal mogao-exhibit-modal-${kind}`} role="dialog" aria-modal="true"
    aria-labelledby={titleId} hidden={blocked} tabIndex={-1} onKeyDown={trapFocus}
    aria-description={kind === 'detail' ? '轻点画面或按 Escape 关闭展品' : undefined}
    onPointerDownCapture={kind === 'detail' ? startDetailTap : undefined}
    onPointerMoveCapture={kind === 'detail' ? moveDetailTap : undefined}
    onPointerUpCapture={kind === 'detail' ? finishDetailTap : undefined}
    onPointerCancelCapture={kind === 'detail' ? cancelDetailTap : undefined}
    onLostPointerCapture={kind === 'detail' ? cancelDetailTap : undefined}
    onPointerLeave={kind === 'detail' ? cancelDetailTap : undefined}
    data-testid={DIALOG_IDS[kind]} data-exhibit-id={exhibitId} data-exhibit-image={imageVariant} data-wall-id={wallId} data-reward-id={rewardId}
    data-mogao-reward-dialog={rewardId || kind === 'guide' ? true : undefined}
  >
    {typeof children === 'function' ? children(closeButton) : <>{closeButton}{children}</>}
  </section>;
}

function WallTheme({ wall, blocked, onClose }: {
  wall: (typeof MOGAO_EXHIBIT.walls)[number];
  blocked: boolean;
  onClose(): void;
}) {
  const titleId = useId();
  return <MogaoExhibitDialog kind="wall-theme" blocked={blocked} onClose={onClose} titleId={titleId} wallId={wall.id}>
    <article className="mogao-wall-theme">
      <p className="mogao-wall-theme-kicker">{wall.subtitle}</p>
      <h2 id={titleId}>{wall.title}</h2>
      <p className="mogao-wall-theme-years">{wall.years}</p>
      <p>{wall.intro}</p>
    </article>
  </MogaoExhibitDialog>;
}

function ExhibitDetail({ item, imageVariant, blocked, onClose }: {
  item: MogaoExhibit;
  imageVariant: 'full' | 'detail';
  blocked: boolean;
  onClose(): void;
}) {
  const titleId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Size>({ width: 1, height: 1 });
  const [view, setView] = useState(FITTED_VIEW);
  const { zoom, pan } = view;
  const [dragging, setDragging] = useState(false);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const image = imageVariant === 'detail' ? item.detailImage : item.image;
  const title = imageVariant === 'detail' ? `${item.title} · 手部特写` : item.title;
  const ratio = image ? image.width / image.height : 1;
  const fittedWidth = Math.min(Math.max(1, stage.width), Math.max(1, stage.height) * ratio);
  const fittedHeight = fittedWidth / ratio;

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node || blocked) return;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = node;
      setStage(value => value.width === width && value.height === height ? value : { width, height });
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(node);
    return () => observer.disconnect();
  }, [blocked]);

  useLayoutEffect(() => {
    setView(current => {
      const next = containPan(current.pan, { width: fittedWidth, height: fittedHeight }, stage, current.zoom);
      return next.x === current.pan.x && next.y === current.pan.y ? current : { ...current, pan: next };
    });
  }, [stage, fittedWidth, fittedHeight]);

  useEffect(() => {
    const art = stageRef.current;
    if (!art || blocked || imageState !== 'ready') return;
    const fitted = { width: fittedWidth, height: fittedHeight };
    const pointers = new Map<number, { point: Offset; touch: boolean }>();
    const position = (event: MouseEvent) => {
      const bounds = art.getBoundingClientRect();
      return { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 };
    };
    const clear = () => {
      const ids = [...pointers.keys()];
      pointers.clear();
      for (const id of ids) if (art.hasPointerCapture(id)) art.releasePointerCapture(id);
      setDragging(false);
    };
    const start = (event: PointerEvent) => {
      const touch = event.pointerType === 'touch';
      if (event.button !== 0 || pointers.size >= 2 || (pointers.size && (!touch || [...pointers.values()].some(p => !p.touch)))) return;
      event.preventDefault();
      art.focus({ preventScroll: true });
      pointers.set(event.pointerId, { point: position(event), touch });
      art.setPointerCapture(event.pointerId);
      setDragging(true);
    };
    const stop = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      setDragging(pointers.size > 0);
    };
    const move = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const previous = pointer.point;
      const next = position(event);
      pointer.point = next;
      const other = pointers.size === 2 ? [...pointers.values()].find(value => value !== pointer)?.point : undefined;
      const from = other ? midpoint(previous, other) : previous;
      const to = other ? midpoint(next, other) : next;
      const factor = other ? fingerSpan(next, other) / fingerSpan(previous, other) : 1;
      setView(current => resizeArt(current, factor, from, to, fitted, stage));
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.height : 1;
      const pixels = Math.max(-300, Math.min(300, event.deltaY * unit));
      if (!Number.isFinite(pixels) || !pixels) return;
      const at = position(event);
      setView(current => resizeArt(current, Math.exp(-pixels * .003), at, at, fitted, stage));
    };
    const onVisibility = () => { if (document.hidden) clear(); };
    art.addEventListener('pointerdown', start);
    art.addEventListener('pointermove', move);
    art.addEventListener('pointerup', stop);
    art.addEventListener('pointercancel', stop);
    art.addEventListener('lostpointercapture', stop);
    art.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      art.removeEventListener('pointerdown', start);
      art.removeEventListener('pointermove', move);
      art.removeEventListener('pointerup', stop);
      art.removeEventListener('pointercancel', stop);
      art.removeEventListener('lostpointercapture', stop);
      art.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pagehide', clear);
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
  }, [blocked, imageState, stage, fittedWidth, fittedHeight]);

  function adjustWithKey(event: KeyboardEvent<HTMLDivElement>) {
    if (imageState !== 'ready') return;
    const { key } = event;
    const offset = KEY_PAN[key];
    const factor = key === '+' || key === '=' ? 1.25 : key === '-' || key === '_' ? 1 / 1.25 : 1;
    if (factor === 1 && key !== '0' && (!offset || zoom === 1)) return;
    event.preventDefault();
    event.stopPropagation();
    setView(current => key === '0' ? FITTED_VIEW
      : resizeArt(current, factor, CENTER, offset ?? CENTER, { width: fittedWidth, height: fittedHeight }, stage));
  }

  return <MogaoExhibitDialog kind="detail" blocked={blocked} onClose={onClose} titleId={titleId} exhibitId={item.id} imageVariant={imageVariant}>
    <div className="mogao-exhibit-detail">
      <div className="mogao-exhibit-art" ref={stageRef} role="region"
        aria-label="展品大图。双指、滚轮或加减键缩放，放大后可拖动或用方向键移动，按零恢复整图"
        tabIndex={imageState === 'ready' ? 0 : -1} data-testid="mogao-exhibit-art" data-zoom={Number(zoom.toFixed(3))}
        data-zoomed={zoom > 1 || undefined} data-dragging={dragging && zoom > 1 || undefined} onKeyDown={adjustWithKey}>
        {image && imageState !== 'failed' ? <>
          <img src={worldAssetUrl(image.path)} alt={title} draggable={false}
            onLoad={() => setImageState('ready')} onError={() => setImageState('failed')}
            style={{ width: fittedWidth, height: fittedHeight, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          {imageState === 'loading' && <p className="mogao-exhibit-art-message" role="status">正在载入展品图像…</p>}
        </> : <div className="mogao-exhibit-art-message is-placeholder" data-testid="mogao-exhibit-placeholder">
          <span>{item.id} · {item.cave}</span>
          <strong>{title}</strong>
          <small>{image ? '图像暂未载入，可继续阅读展签' : '展品图待补，可查看出处'}</small>
        </div>}
      </div>
      <footer className="mogao-exhibit-caption">
        <div className="mogao-exhibit-caption-copy" tabIndex={0} aria-label="展品讲解">
          <h2 id={titleId}>{title}</h2>
          <p className="mogao-exhibit-meta">{item.period} · {item.cave} · {item.type}{item.referenceOnly && ' · 参考图'}</p>
          <p>{item.voice}</p>
        </div>
        <div className="mogao-exhibit-actions">
          <a href={item.page} target="_blank" rel="noreferrer">查看出处</a>
        </div>
      </footer>
    </div>
  </MogaoExhibitDialog>;
}

function HallIntroCopy({ hall, titleId }: { hall: MogaoExhibitHall; titleId?: string }) {
  const muralHall = hall === 'hall-a';
  const lines = muralHall ? MOGAO_HALL_A_ENTRANCE_LINES : MOGAO_EXHIBIT_ENTRANCE_LINES;
  const instructions = muralHall ? MOGAO_HALL_A_INSTRUCTIONS : MOGAO_EXHIBIT_INSTRUCTIONS;
  return <div className="mogao-exhibit-intro-copy">
    <div className="mogao-exhibit-intro-text">
      <h2 id={titleId}>{muralHall ? '千年壁画' : '佛教在敦煌'}</h2>
      <p>{lines.join('\n')}</p>
    </div>
    <div className="mogao-exhibit-intro-guidance">
      <ul role="list" aria-label="浏览提示">
        {instructions.map(columns => <li key={columns[0]}>
          <span className="mogao-exhibit-intro-mark" aria-hidden="true">•</span>
          <span className="mogao-exhibit-intro-instruction">
            {columns.map(column => <span className="mogao-exhibit-intro-column" key={column}>{column}</span>)}
          </span>
        </li>)}
      </ul>
    </div>
  </div>;
}

export function MogaoExhibitOverlay(props: MogaoExhibitOverlayProps) {
  const { blocked, panelId, wallId, reducedMotion, arrivalIntro, introReady } = props;
  const arrivalTitleId = useId();
  const arrivalWaitId = useId();
  const exhibit = panelId ? getMogaoExhibit(exhibitIdForPanel(panelId)) : undefined;
  const wall = wallId ? MOGAO_EXHIBIT.walls.find(item => item.id === wallId) : undefined;
  const modal = !!exhibit || !!wall || !!arrivalIntro;
  const activeModal = modal && !blocked;
  const revisitIntro = !modal && !blocked ? props.intro : null;

  return <div className="mogao-exhibit-overlay" data-modal={activeModal || undefined} data-intro={revisitIntro ?? undefined} data-reduced-motion={reducedMotion || undefined}>
    {revisitIntro && <aside className="mogao-exhibit-intro mogao-exhibit-intro-repeat" role="status"
      data-testid={revisitIntro === 'hall-a' ? 'mogao-hall-a-intro' : 'mogao-exhibit-intro'}>
      <HallIntroCopy hall={revisitIntro} />
    </aside>}
    {arrivalIntro && <MogaoExhibitDialog kind="arrival-intro" blocked={blocked} titleId={arrivalTitleId} onClose={props.onCloseArrivalIntro}>
      <article className="mogao-exhibit-intro mogao-arrival-intro" data-hall={arrivalIntro}>
        <HallIntroCopy hall={arrivalIntro} titleId={arrivalTitleId} />
        <footer>
          <button type="button" className="mogao-arrival-start" disabled={!introReady}
            aria-describedby={introReady ? undefined : arrivalWaitId} onClick={props.onCloseArrivalIntro}>开始浏览</button>
          <button type="button" onClick={props.onPauseArrival}>暂停</button>
          {!introReady && <span id={arrivalWaitId}>介绍播完后可开始浏览</span>}
        </footer>
      </article>
    </MogaoExhibitDialog>}
    {props.saveWarning && !blocked && !modal && <aside className="mogao-exhibit-save-warning" role="status">
      <p>{props.saveWarning}</p>{props.onRetrySave && <button type="button" onClick={props.onRetrySave}>重试保存</button>}
    </aside>}
    {exhibit && <ExhibitDetail key={panelId} item={exhibit} imageVariant={panelId === 'C03-detail' ? 'detail' : 'full'}
      blocked={blocked} onClose={props.onCloseExhibit} />}
    {wall && <WallTheme key={wall.id} wall={wall} blocked={blocked} onClose={props.onCloseWall} />}
  </div>;
}
