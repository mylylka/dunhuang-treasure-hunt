import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import '../styles/lesson-image-viewer.css';

export interface LessonImageViewerProps {
  src: string;
  imageWidth: number;
  imageHeight: number;
  title: string;
  caption: string;
  onClose: () => void;
}

interface Position { x: number; y: number }
interface Size { width: number; height: number }
interface DragStart extends Position { pointerId: number; pan: Position }

function constrainPan(pan: Position, image: Size, viewport: Size, zoom: number): Position {
  const maxX = Math.max(0, (image.width * zoom - viewport.width) / 2);
  const maxY = Math.max(0, (image.height * zoom - viewport.height) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, pan.x)), y: Math.max(-maxY, Math.min(maxY, pan.y)) };
}

/** Observation only: zooming and moving never alter the source image or lesson state. */
export function LessonImageViewer({ src, imageWidth, imageHeight, title, caption, onClose }: LessonImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragStart | null>(null);
  const titleId = useId();
  const captionId = useId();
  const [viewport, setViewport] = useState<Size>({ width: 1, height: 1 });
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ratio = imageWidth / imageHeight;
  // Keep the complete image inside the stage's one-pixel inset border, including
  // WebKit layouts whose clientWidth/clientHeight round fractional CSS pixels up.
  const fitWidth = Math.min(Math.max(1, Math.floor(viewport.width) - 2), Math.max(1, Math.floor(viewport.height) - 2) * ratio);
  const fittedImage = { width: fitWidth, height: fitWidth / ratio };
  const requestUrl = attempt === 0 ? src : (() => {
    const url = new URL(src, document.baseURI);
    url.searchParams.set('viewer-retry', String(attempt));
    return url.href;
  })();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const next = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
      setViewport(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setPan(previous => {
      const next = constrainPan(previous, fittedImage, viewport, zoom);
      return previous.x === next.x && previous.y === next.y ? previous : next;
    });
  }, [fitWidth, fittedImage.height, viewport.width, viewport.height, zoom]);

  function selectZoom(value: 1 | 2 | 3) {
    dragRef.current = null;
    setDragging(false);
    setZoom(value);
    setPan({ x: 0, y: 0 });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || failed || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pan };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setPan(constrainPan({ x: start.pan.x + event.clientX - start.x, y: start.pan.y + event.clientY - start.y }, fittedImage, viewport, zoom));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <dialog ref={dialogRef} className="lesson-image-viewer" data-testid="lesson-image-viewer"
    aria-labelledby={titleId} aria-describedby={captionId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <section className="lesson-viewer-surface" data-testid="lesson-viewer-surface">
      <header className="lesson-viewer-heading">
        <h2 id={titleId}>{title}</h2>
        <button ref={closeRef} type="button" className="lesson-viewer-close" onClick={onClose} aria-label="关闭图像查看器">×</button>
      </header>
      <div className="lesson-viewer-stage" ref={stageRef} data-testid="lesson-viewer-stage"
        data-zoom={zoom} data-pan-x={pan.x} data-pan-y={pan.y} data-dragging={dragging}
        role="region" aria-label="图像观察区域，放大后可拖动或用方向键移动" tabIndex={0}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
        onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }}
        onKeyDown={event => {
          const shifts: Record<string, Position> = { ArrowLeft: { x: 48, y: 0 }, ArrowRight: { x: -48, y: 0 }, ArrowUp: { x: 0, y: 48 }, ArrowDown: { x: 0, y: -48 } };
          if (zoom === 1 || !shifts[event.key]) return;
          event.preventDefault();
          const shift = shifts[event.key];
          setPan(previous => constrainPan({ x: previous.x + shift.x, y: previous.y + shift.y }, fittedImage, viewport, zoom));
        }}>
        {failed ? <div className="lesson-viewer-message" role="alert"><p>图片暂时未能载入</p><button type="button"
          onClick={() => { setFailed(false); setLoading(true); setAttempt(value => value + 1); }}>重新载入图片</button></div> : <>
          <img key={requestUrl} src={requestUrl} alt={caption} draggable={false} className="lesson-viewer-image" data-testid="lesson-viewer-image"
            style={{ width: fittedImage.width, height: fittedImage.height, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />
          {loading && <p className="lesson-viewer-loading" role="status">图片载入中…</p>}
        </>}
      </div>
      <div className="lesson-viewer-controls" role="group" aria-label="图像缩放与复位">
        {([1, 2, 3] as const).map(value => <button type="button" key={value} aria-pressed={zoom === value}
          onClick={() => selectZoom(value)}>{value === 1 ? '全图' : `${value}×`}</button>)}
        <button type="button" onClick={() => selectZoom(1)}>复位</button>
      </div>
      <p className="lesson-viewer-caption" id={captionId} tabIndex={0}>{caption}</p>
    </section>
  </dialog>;
}
