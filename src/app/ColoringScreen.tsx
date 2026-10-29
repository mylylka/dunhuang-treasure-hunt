import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { getAssetUrl } from '../content';
import { colorsEqual, createColoringState, type ColoringZoom } from '../games/coloring/rules';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import type { ColoringLevel, ContentCatalog, GameCommand, GameEvent, RegionColors } from '../types';
import '../styles/coloring.css';

export interface ColoringScreenProps {
  level: ColoringLevel;
  catalog: ContentCatalog;
  initialColors: RegionColors;
  reducedMotion: boolean;
  onChange: (colors: RegionColors) => void;
  onComplete: () => void;
  onBack: () => void;
  saveNotice?: ReactNode;
}

function ReferenceDialog({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className="coloring-reference-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>参考配色</h2><button type="button" onClick={onClose} aria-label="关闭参考配色">×</button></header>
    <div className="coloring-reference-picture"><img src={url} alt={`${title}参考配色，AI教学示意`} draggable={false} /></div>
    <footer><p>参考配色不作为评分标准。</p><button type="button" className="button button-secondary button-small" onClick={onClose}><span className="button-label">继续填色</span></button></footer>
  </dialog>;
}

export function ColoringScreen({ level, catalog, initialColors, reducedMotion, onChange, onComplete, onBack, saveNotice }: ColoringScreenProps) {
  const [command, setCommand] = useState<GameCommand | null>(null);
  const sequence = useRef(0);
  const [selected, setSelected] = useState<string | null>(level.palette[0]?.color ?? '#b34d35');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [zoom, setZoom] = useState<ColoringZoom>(1);
  const [paintedCount, setPaintedCount] = useState(Object.keys(createColoringState(initialColors).colors).length);
  const [canUndo, setCanUndo] = useState(false);
  const [playerRun, setPlayerRun] = useState(0);
  const colorsRef = useRef(createColoringState(initialColors).colors);
  const callbacks = useRef({ onChange, onComplete });
  callbacks.current = { onChange, onComplete };
  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'ready') { setReady(true); setError(null); }
    if (event.type === 'error') { setError(event.message); setReady(false); }
    if (event.type === 'hint') setMessage(event.message);
    if (event.type === 'coloring-change') {
      setPaintedCount(event.paintedCount); setCanUndo(event.canUndo); setZoom(event.zoom);
      if (!colorsEqual(colorsRef.current, event.colors)) {
        colorsRef.current = event.colors;
        callbacks.current.onChange(event.colors);
      }
    }
    if (event.type === 'completed') callbacks.current.onComplete();
  }, []);
  const send = (value: Omit<Extract<GameCommand, { type: 'select-color' }>, 'sequence'>
    | Omit<Extract<GameCommand, { type: 'set-zoom' }>, 'sequence'>
    | { type: 'undo' | 'restart' | 'finish' }) => setCommand({ ...value, sequence: ++sequence.current });
  function select(color: string | null) { setSelected(color); setMessage(''); send({ type: 'select-color', color }); }
  const line = catalog.assets.find(asset => asset.id === level.lineAssetId)!;
  return <div className="page page-play coloring-screen">
    <header className="coloring-heading">
      <button type="button" className="coloring-back" onClick={onBack} aria-label="返回填色关卡"><img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
      <h1>{level.title}</h1>
    </header>
    <section className="game-stage coloring-stage" aria-label="填色画布">
      <div className="coloring-workspace">
        <div className="coloring-canvas-zone">
          <div className="coloring-stage-tools"><span>选色后点区域，放大可拖动</span><div role="group" aria-label="画布缩放">{([1, 2, 3] as const).map(value =>
            <button key={value} type="button" disabled={!ready} aria-pressed={zoom === value} onClick={() => send({ type: 'set-zoom', zoom: value })}>{value}×</button>)}</div></div>
          <PhaserPlayer key={`${level.id}-${playerRun}`} level={level} lineImageUrl={getAssetUrl(catalog, level.lineAssetId)}
            regionMapImageUrl={getAssetUrl(catalog, level.regionMapAssetId)} initialColors={colorsRef.current}
            imageAspectRatio={line.width / line.height} reducedMotion={reducedMotion} onEvent={emit} command={command} />
          {!ready && !error && <p className="coloring-loading" role="status">正在准备填色区域…</p>}
        </div>
        <aside className="coloring-reference-aside" aria-label="同屏参考配色">
          <button type="button" className="coloring-inline-reference" aria-label="参考配色" data-testid="coloring-inline-reference"
            onClick={() => setReferenceOpen(true)}>
            <span className="coloring-reference-label">参考配色<span aria-hidden="true">↗</span></span>
            <span className="coloring-reference-art"><img src={getAssetUrl(catalog, level.referenceAssetId)} alt={`${level.title}参考配色`} draggable={false} /></span>
          </button>
        </aside>
      </div>
    </section>
    <div className="coloring-palette" data-testid="coloring-palette" role="group" aria-label="选择填色颜色">
      <div className="coloring-swatches">{level.palette.map(item => <button key={item.id} type="button"
        className="coloring-swatch" style={{ backgroundColor: item.color }} aria-label={`选择${item.label}`}
        aria-pressed={selected?.toLowerCase() === item.color.toLowerCase()} disabled={!ready}
        onClick={() => select(item.color)} data-color={item.color} />)}</div>
      <label className="coloring-free-color"><span>自由选色</span><input type="color" aria-label="自由选色"
        value={selected ?? '#ffffff'} disabled={!ready} onChange={event => select(event.target.value)} /></label>
      <button type="button" className="coloring-eraser" aria-pressed={selected === null} disabled={!ready} onClick={() => select(null)}>擦除</button>
    </div>
    {error ? <div className="notice notice-error coloring-error" role="alert"><p>{error}</p>
      <button type="button" className="button button-secondary button-small" onClick={() => { setError(null); setReady(false); setCommand(null); setPlayerRun(value => value + 1); }}><span className="button-label">重新加载</span></button></div>
      : <div className="coloring-status" data-testid="coloring-status" role="status"><span>已着色 {paintedCount} 个区域</span><span>{message}</span></div>}
    {saveNotice}
    <div className="coloring-actions">
      <button type="button" className="button button-secondary button-small" disabled={!ready || !canUndo} onClick={() => send({ type: 'undo' })}><span className="button-label">撤销</span></button>
      <button type="button" className="button button-secondary button-small" disabled={!ready || !paintedCount} onClick={() => send({ type: 'restart' })}><span className="button-label">清空重涂</span></button>
      <button type="button" data-sound="none" className="button button-primary button-small" disabled={!ready || !paintedCount} onClick={() => send({ type: 'finish' })}><span className="button-label">完成作品</span></button>
    </div>
    {referenceOpen && <ReferenceDialog url={getAssetUrl(catalog, level.referenceAssetId)} title={level.title} onClose={() => setReferenceOpen(false)} />}
  </div>;
}
