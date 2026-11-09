import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { getAssetUrl } from '../content';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import { GroupedLevelTitle, LevelAdvanceControl } from './LevelAdvanceControl';
import { DialogCloseButton } from './DialogCloseButton';
import type { ContentCatalog, GameCommand, GameEvent, ShadowMatchLevel } from '../types';
import type { ShadowCardLayout, ShadowMatchLayout, ShadowMatchSnapshot } from '../games/shadow-match/types';
import '../styles/shadow-match.css';

export interface ShadowMatchScreenProps {
  level: ShadowMatchLevel;
  catalog: ContentCatalog;
  reducedMotion: boolean;
  onEvent: (event: GameEvent) => void;
  onBack: () => void;
}

const optionLabel = (index: number) => String.fromCharCode(65 + index);
const cardStyle = (card: ShadowCardLayout): CSSProperties => ({ left: card.x, top: card.y, width: card.width, height: card.height });

interface ShadowComparisonProps {
  referenceUrl: string;
  optionUrl: string;
  label: string;
  imageAspectRatio: number;
  candidates: { id: string; label: string }[];
  selectedOptionId: string;
  onChooseOption: (optionId: string) => void;
  onClose: () => void;
}

/** A separate, read-only comparison: both pictures share the same fitted size and transform. */
function ShadowComparison({ referenceUrl, optionUrl, label, imageAspectRatio, candidates, selectedOptionId, onChooseOption, onClose }: ShadowComparisonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const windows = useRef<(HTMLDivElement | null)[]>([]);
  const headingId = useId();
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const gesture = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  panRef.current = pan;
  const limitPan = useCallback((position: { x: number; y: number }) => ({
    x: Math.max(-size.width * (zoom - 1) / 2, Math.min(size.width * (zoom - 1) / 2, position.x)),
    y: Math.max(-size.height * (zoom - 1) / 2, Math.min(size.height * (zoom - 1) / 2, position.y)),
  }), [size.width, size.height, zoom]);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    const slots = windows.current.filter((element): element is HTMLDivElement => Boolean(element));
    const measure = () => {
      // A portrait guard hides the entered surface without unmounting this observer.
      // Ignore its temporary zero size so the inspection's zoom and pan remain intact.
      if (slots.length !== 2 || slots.some(element => element.clientWidth < 2 || element.clientHeight < 2)) return;
      // Leave one CSS pixel on every edge after integer layout rounding in WebKit.
      const availableWidth = Math.max(1, Math.min(...slots.map(element =>
        Math.min(element.clientWidth, Math.floor(element.getBoundingClientRect().width)))) - 2);
      const availableHeight = Math.max(1, Math.min(...slots.map(element =>
        Math.min(element.clientHeight, Math.floor(element.getBoundingClientRect().height)))) - 2);
      const width = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight * imageAspectRatio)));
      const height = width / imageAspectRatio;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const observer = new ResizeObserver(measure);
    slots.forEach(element => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, [imageAspectRatio]);

  useEffect(() => {
    gesture.current = null;
    setPan(previous => {
      const next = limitPan(previous);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    });
  }, [limitPan]);

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || event.button !== 0) return;
    event.preventDefault();
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    setPan(limitPan({ x: current.panX + event.clientX - current.x, y: current.panY + event.clientY - current.y }));
  }
  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <dialog ref={dialog} className="shadow-match-inspector" data-testid="shadow-match-inspector"
    aria-labelledby={headingId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="shadow-match-inspector-pair">
      {[{ url: referenceUrl, title: '彩色参照' }, { url: optionUrl, title: `影子 ${label}` }].map((image, index) => <figure key={index}>
        <figcaption>{image.title}</figcaption>
        <div ref={element => { windows.current[index] = element; }} className={`shadow-match-inspector-window${zoom > 1 ? ' is-zoomed' : ''}`}
          onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}
          onLostPointerCapture={() => { gesture.current = null; }}>
          <div className="shadow-match-inspector-picture" style={{ width: size.width, height: size.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <img src={image.url} alt={`${image.title}完整原图`} draggable={false} />
          </div>
        </div>
      </figure>)}
    </div>
    <aside className="shadow-match-inspector-rail" aria-label="对照操作">
      <header className="shadow-match-inspector-heading">
        <h2 id={headingId} className="visually-hidden">放大对照 · 影子 {label}</h2>
        <span aria-hidden="true">影子 {label}</span>
        <DialogCloseButton label="关闭放大对照" className="shadow-match-inspector-close" onClick={onClose} />
      </header>
      <label className="shadow-match-comparison-choice"><span className="visually-hidden">选择对照影子</span>
        <select aria-label="选择对照影子" value={selectedOptionId} onChange={event => onChooseOption(event.target.value)}>
          {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>影子 {candidate.label}</option>)}
        </select>
      </label>
      <div className="shadow-match-inspector-tools" role="group" aria-label="对照图片缩放">
        {([1, 2, 3] as const).map(value => <button key={value} type="button" aria-pressed={zoom === value}
          onClick={() => { setZoom(value); if (value === 1) setPan({ x: 0, y: 0 }); }}>{value}×</button>)}
        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>复位</button>
      </div>
      <footer className="shadow-match-inspector-footer">
        <button type="button" className="button button-secondary button-small" onClick={onClose}><span className="button-label">返回配对</span></button>
      </footer>
    </aside>
  </dialog>;
}

export function ShadowMatchScreen({ level, catalog, reducedMotion, onEvent, onBack }: ShadowMatchScreenProps) {
  const [snapshot, setSnapshot] = useState<ShadowMatchSnapshot | null>(null);
  const [layout, setLayout] = useState<ShadowMatchLayout | null>(null);
  const [command, setCommand] = useState<GameCommand | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [comparisonOptionId, setComparisonOptionId] = useState<string | null>(null);
  const comparisonOpener = useRef<HTMLButtonElement | null>(null);
  const restoreComparisonFocus = useRef(false);
  const sequence = useRef(0);
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const shadowImages = useMemo(() => Object.fromEntries([level.referenceAssetId, ...level.options.map(option => option.assetId)]
    .map(assetId => [assetId, getAssetUrl(catalog, assetId)])), [level, catalog]);
  const reference = catalog.assets.find(asset => asset.id === level.referenceAssetId)!;
  useEffect(() => {
    if (comparisonOptionId !== null || !restoreComparisonFocus.current) return;
    const opener = comparisonOpener.current;
    // Run after the child dialog has closed and unmounted, including native focus restoration.
    const frame = requestAnimationFrame(() => {
      restoreComparisonFocus.current = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [comparisonOptionId]);
  const openComparison = (optionId: string, opener: HTMLButtonElement) => {
    comparisonOpener.current = opener;
    restoreComparisonFocus.current = false;
    // Safari mouse clicks do not focus buttons automatically.
    opener.focus({ preventScroll: true });
    setComparisonOptionId(optionId);
  };
  const closeComparison = () => {
    restoreComparisonFocus.current = true;
    setComparisonOptionId(null);
  };
  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'shadow-match-change') { setSnapshot(event.snapshot); return; }
    if (event.type === 'ready') { setReady(true); setError(null); }
    if (event.type === 'error') { setReady(false); setError(event.message); }
    eventRef.current(event);
  }, []);
  const send = (value: { type: 'hint' | 'restart' } | { type: 'shadow-select'; optionId: string }) => {
    setCommand({ ...value, sequence: ++sequence.current });
  };
  const playable = ready && !error && Boolean(snapshot) && !snapshot?.completed;
  const firstComparisonId = snapshot?.selectedOptionId ?? snapshot?.optionIds[0];
  const comparison = level.options.find(option => option.id === comparisonOptionId);
  const comparisonIndex = snapshot?.optionIds.indexOf(comparisonOptionId ?? '') ?? -1;
  const reload = () => {
    setReady(false); setError(null); setSnapshot(null); setLayout(null); setCommand(null); setComparisonOptionId(null); setRun(value => value + 1);
  };

  return <div className="page page-play shadow-match-screen" data-testid="shadow-match-screen"
    data-shadow-status={error ? 'error' : !ready ? 'loading' : snapshot?.completed ? 'completed' : 'playing'}>
    <header className="shadow-match-heading">
      <button type="button" className="shadow-match-back" aria-label="返回影子配对关卡" onClick={onBack}>
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1 aria-label={level.title}><GroupedLevelTitle title={level.title} /></h1>
    </header>
    <div className="shadow-match-studio">
    <section className="game-stage shadow-match-stage" aria-label="飞天影子配对游戏区">
      <div className="shadow-match-canvas-shell">
        <PhaserPlayer key={`${level.id}-${run}`} level={level} shadowImages={shadowImages} onShadowLayout={setLayout}
          reducedMotion={reducedMotion} onEvent={emit} command={command} />
        {ready && !error && layout && snapshot && <div className="shadow-match-controls" role="group" aria-label="参照与四个影子选项">
          <button type="button" className="shadow-match-reference" style={cardStyle(layout.reference)}
            disabled={!firstComparisonId} aria-label="放大参照对照"
            onClick={event => { if (firstComparisonId) openComparison(firstComparisonId, event.currentTarget); }}>
            <span className="shadow-match-card-label">参照</span>
          </button>
          {layout.options.map((card, index) => {
            const optionId = snapshot.optionIds[index];
            const label = optionLabel(index);
            const wrong = snapshot.wrongOptionIds.includes(optionId);
            const selected = snapshot.selectedOptionId === optionId;
            return <div key={optionId} className="shadow-match-option-card" style={cardStyle(card)}>
              <button type="button" data-sound="none" className={`shadow-match-option${wrong ? ' is-wrong' : ''}${selected ? ' is-selected' : ''}`}
                data-testid="shadow-match-option" data-option-label={label} aria-label={`选择影子 ${label}${wrong ? '，已尝试，可重新选择' : ''}`}
                aria-pressed={selected} disabled={!playable} onClick={() => send({ type: 'shadow-select', optionId })}>
                <span className="shadow-match-card-label" aria-hidden="true">{label}</span>
              </button>
            </div>;
          })}
        </div>}
        {error ? <div className="shadow-match-load shadow-match-error" role="alert">
          <h2>画面暂未准备好</h2><p>{error}</p>
          <button type="button" className="button button-secondary button-small" onClick={reload}><span className="button-label">重新加载</span></button>
        </div> : !ready && <div className="shadow-match-load" role="status">正在准备飞天与影子…</div>}
      </div>
    </section>
    <div className="shadow-match-status" data-testid="shadow-match-status" role="status">{snapshot?.message ?? ''}</div>
    <footer className="shadow-match-actions">
      <div className="shadow-match-rail-heading">
        <button type="button" className="shadow-match-back" aria-label="返回影子配对关卡" onClick={onBack}>
          <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
        </button>
        <h1 aria-label={level.title}><GroupedLevelTitle title={level.title} /></h1>
      </div>
      <button type="button" className="button button-secondary button-small" disabled={!firstComparisonId || !playable}
        data-testid="shadow-match-compare" onClick={event => { if (firstComparisonId) openComparison(firstComparisonId, event.currentTarget); }}>
        <span className="button-label">放大对照</span>
      </button>
      <button type="button" data-sound="none" className="button button-secondary button-small" disabled={!playable} onClick={() => send({ type: 'hint' })}>
        <img src={getAssetUrl(catalog, 'icon-hint')} alt="" /><span className="button-label">配对提示</span>
      </button>
      <button type="button" className="button button-secondary button-small" disabled={!ready || Boolean(error)} onClick={() => send({ type: 'restart' })}>
        <img src={getAssetUrl(catalog, 'icon-restart')} alt="" /><span className="button-label">重新配对</span>
      </button>
      <LevelAdvanceControl />
    </footer>
    </div>
    {comparison && comparisonIndex >= 0 && <ShadowComparison referenceUrl={shadowImages[level.referenceAssetId]}
      optionUrl={shadowImages[comparison.assetId]} label={optionLabel(comparisonIndex)} imageAspectRatio={reference.width / reference.height}
      candidates={snapshot!.optionIds.map((id, index) => ({ id, label: optionLabel(index) }))}
      selectedOptionId={comparisonOptionId!} onChooseOption={setComparisonOptionId} onClose={closeComparison} />}
  </div>;
}
