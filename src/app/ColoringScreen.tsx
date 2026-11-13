import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { getAssetUrl } from '../content';
import { colorsEqual, createColoringState, materialsEqual, type ColoringZoom } from '../games/coloring/rules';
import { COLORING_MATERIALS, getMaterialPreviewDataUrl } from '../games/coloring/materials';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import { getMobileLandscapeBlocked, subscribeMobileLandscape } from '../services/mobile-landscape';
import type { ColoringLevel, ColoringMaterialId, ContentCatalog, GameCommand, GameEvent, RegionColors, RegionMaterials } from '../types';
import { FloatingColorPalette } from './FloatingColorPalette';
import { DialogCloseButton } from './DialogCloseButton';
import { GroupedLevelTitle, LevelAdvanceControl } from './LevelAdvanceControl';
import '../styles/coloring.css';

export interface ColoringScreenProps {
  level: ColoringLevel;
  catalog: ContentCatalog;
  initialColors: RegionColors;
  initialMaterials?: RegionMaterials;
  reducedMotion: boolean;
  onChange: (colors: RegionColors, materials: RegionMaterials) => void;
  onComplete: (colors: RegionColors, materials: RegionMaterials) => void;
  onBack: () => void;
  backLabel?: string;
  saveNotice?: ReactNode;
}

const mobileStudioQuery = '(pointer: coarse) and (hover: none) and (orientation: landscape) and (max-height: 600px)';

function useMobileStudio() {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileStudioQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(mobileStudioQuery);
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update); update();
    return () => media.removeEventListener('change', update);
  }, []);
  return mobile;
}

function ReferenceDialog({ url, title, onClose, opener }: { url: string; title: string; onClose: () => void; opener: HTMLElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); window.requestAnimationFrame(() => { if (opener?.isConnected) opener.focus(); }); };
  }, [opener]);
  return <dialog ref={dialog} className="coloring-reference-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>参考配色</h2><DialogCloseButton label="关闭参考配色" onClick={onClose} /></header>
    <div className="coloring-reference-picture"><img src={url} alt={`${title}参考配色，AI教学示意`} draggable={false} /></div>
    <footer><p>参考配色不作为评分标准。</p><button type="button" className="button button-secondary button-small" onClick={onClose}><span className="button-label">继续填色</span></button></footer>
  </dialog>;
}

export function ColoringScreen({ level, catalog, initialColors, initialMaterials, reducedMotion, onChange, onComplete, onBack, backLabel = '返回填色关卡', saveNotice }: ColoringScreenProps) {
  const [command, setCommand] = useState<GameCommand | null>(null);
  const sequence = useRef(0);
  const [initialState] = useState(() => createColoringState(initialColors, undefined, initialMaterials));
  const [selected, setSelected] = useState<string | null>(level.palette[0]?.color ?? '#b34d35');
  const [selectedMaterial, setSelectedMaterial] = useState<ColoringMaterialId | null>(null);
  const [lastSolidColor, setLastSolidColor] = useState(level.palette[0]?.color ?? '#b34d35');
  const selectionRef = useRef<{ color: string | null; material?: ColoringMaterialId }>({ color: selected });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const finishStatus = useRef<'idle' | 'requested' | 'finished'>('idle');
  const saveFrame = useRef<number | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const dialogOpener = useRef<HTMLElement | null>(null);
  const paletteOpener = useRef<HTMLButtonElement | null>(null);
  const referenceRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const mobileStudio = useMobileStudio();
  const [zoom, setZoom] = useState<ColoringZoom>(1);
  const [paintedCount, setPaintedCount] = useState(Object.keys(initialState.colors).length);
  const [canUndo, setCanUndo] = useState(false);
  const [playerRun, setPlayerRun] = useState(0);
  const colorsRef = useRef(initialState.colors);
  const materialsRef = useRef(initialState.materials);
  const callbacks = useRef({ onChange, onComplete });
  callbacks.current = { onChange, onComplete };
  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'ready') {
      setReady(true); setError(null);
      setCommand({ type: 'select-color', ...selectionRef.current, sequence: ++sequence.current });
    }
    if (event.type === 'error') {
      finishStatus.current = 'idle';
      setSaving(false); setError(event.message); setReady(false);
    }
    if (event.type === 'hint') setMessage(event.message);
    if (event.type === 'coloring-change') {
      setPaintedCount(event.paintedCount); setCanUndo(event.canUndo); setZoom(event.zoom);
      const materials = event.materials ?? {};
      if (!colorsEqual(colorsRef.current, event.colors) || !materialsEqual(materialsRef.current, materials)) {
        if (finishStatus.current === 'finished' && saveFrame.current === null) finishStatus.current = 'idle';
        colorsRef.current = event.colors;
        materialsRef.current = materials;
        callbacks.current.onChange(event.colors, materials);
      }
    }
    if (event.type === 'completed') {
      finishStatus.current = 'finished';
      const colors = colorsRef.current, materials = materialsRef.current;
      // Let the saving status reach the screen before synchronous storage and navigation.
      saveFrame.current = requestAnimationFrame(() => {
        saveFrame.current = requestAnimationFrame(() => {
          saveFrame.current = null;
          callbacks.current.onComplete(colors, materials);
          setSaving(false);
        });
      });
    }
  }, []);
  useEffect(() => {
    const unsubscribe = subscribeMobileLandscape(() => {
      if (!getMobileLandscapeBlocked() || finishStatus.current !== 'requested') return;
      finishStatus.current = 'idle';
      setSaving(false);
    });
    return () => {
      unsubscribe();
      if (saveFrame.current !== null) cancelAnimationFrame(saveFrame.current);
    };
  }, []);
  const send = (value: Omit<Extract<GameCommand, { type: 'select-color' }>, 'sequence'>
    | Omit<Extract<GameCommand, { type: 'set-zoom' }>, 'sequence'>
    | { type: 'undo' | 'restart' | 'finish' }) => setCommand({ ...value, sequence: ++sequence.current });
  function finish() {
    if (!ready || !paintedCount || finishStatus.current !== 'idle' || getMobileLandscapeBlocked()) return;
    finishStatus.current = 'requested';
    setSaving(true);
    send({ type: 'finish' });
  }
  function select(color: string | null, material?: ColoringMaterialId) {
    selectionRef.current = { color, ...(material ? { material } : {}) };
    setSelected(color); setSelectedMaterial(material ?? null); setMessage('');
    if (color && !material) setLastSolidColor(color);
    send({ type: 'select-color', color, ...(material ? { material } : {}) });
  }
  const zoomControls = <div className="coloring-zoom-controls" role="group" aria-label="画布缩放">{([1, 2, 3] as const).map(value =>
    <button key={value} type="button" disabled={!ready} aria-pressed={Math.abs(zoom - value) < .005}
      onClick={() => send({ type: 'set-zoom', zoom: value })}>{value}×</button>)}</div>;
  const swatch = (item: ColoringLevel['palette'][number]) =>
    <button key={item.id} type="button" className="coloring-swatch" aria-label={`选择${item.label}`}
      aria-pressed={selectedMaterial === null && selected?.toLowerCase() === item.color.toLowerCase()} disabled={!ready}
      onClick={() => select(item.color)} data-color={item.color}>
      <span aria-hidden="true" style={{ backgroundColor: item.color }} />
    </button>;
  const materialSwatch = (item: typeof COLORING_MATERIALS[number]) =>
    <button key={item.id} type="button" className="coloring-swatch coloring-material-swatch" aria-label={`选择${item.label}`}
      title={item.label} aria-pressed={selectedMaterial === item.id} disabled={!ready} data-material={item.id}
      onClick={() => select(item.color, item.id)}>
      <span aria-hidden="true" style={{ backgroundImage: `url(${getMaterialPreviewDataUrl(item.id)})`, backgroundColor: item.color }} />
    </button>;
  const swatches = (items: ColoringLevel['palette']) => <div className="coloring-swatches">
    {items.map(swatch)}{COLORING_MATERIALS.map(materialSwatch)}
  </div>;
  const freeColor = () => <label className="coloring-free-color coloring-free-color-rainbow" title="自由选色">
    <span className="visually-hidden">自由选色</span>
    <input type="color" aria-label="自由选色" value={lastSolidColor} disabled={!ready}
      onChange={event => select(event.target.value)} /></label>;
  const commonColors = [['青绿', '翠绿', '深绿'], ['赭红'], ['白色', '白'], ['墨黑']]
    .map(labels => level.palette.find(item => labels.includes(item.label)))
    .filter((item): item is ColoringLevel['palette'][number] => Boolean(item));
  const shortTitle = level.title.split(/[：:]/)[0];
  const line = catalog.assets.find(asset => asset.id === level.lineAssetId)!;
  return <div className="page page-play coloring-screen" data-mobile-studio={mobileStudio}>
    <header className="coloring-heading">
      <button type="button" className="coloring-back" onClick={onBack} aria-label={backLabel}><img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
      <h1>{level.title}</h1>
    </header>
    <div className="coloring-studio" inert={referenceOpen}
      aria-hidden={referenceOpen ? true : undefined}>
    <section className="game-stage coloring-stage" aria-label="填色画布">
      <div className="coloring-workspace">
        <div className="coloring-canvas-zone">
          {!mobileStudio && <div className="coloring-stage-tools"><span>选色后点区域，放大可拖动</span>{zoomControls}</div>}
          <PhaserPlayer key={`${level.id}-${playerRun}`} level={level} lineImageUrl={getAssetUrl(catalog, level.lineAssetId)}
            regionMapImageUrl={getAssetUrl(catalog, level.regionMapAssetId)} initialColors={colorsRef.current} initialMaterials={materialsRef.current}
            imageAspectRatio={line.width / line.height} reducedMotion={reducedMotion} onEvent={emit} command={command} />
          {!ready && !error && <p className="coloring-loading" role="status">正在准备填色区域…</p>}
        </div>
        <aside ref={referenceRef} className="coloring-reference-aside" aria-label="同屏参考配色">
          <button type="button" className="coloring-inline-reference" aria-label="参考配色" data-testid="coloring-inline-reference"
            onClick={event => { dialogOpener.current = event.currentTarget; event.currentTarget.focus(); setReferenceOpen(true); }}>
            <span className="coloring-reference-label">参考配色</span>
            <span className="coloring-reference-art"><img src={getAssetUrl(catalog, level.referenceAssetId)} alt={`${level.title}参考配色`} draggable={false} /></span>
          </button>
          {mobileStudio && <>
            {zoomControls}
            <div className="coloring-common-palette" data-testid="coloring-palette" role="group" aria-label="常用填色颜色">
              {swatches(commonColors)}
              <div className="coloring-common-tools">
                <button type="button" disabled={!ready} aria-expanded={paletteOpen}
                  onClick={event => { paletteOpener.current = event.currentTarget; event.currentTarget.focus(); setPaletteOpen(value => !value); }}>完整色盘</button>
                <button type="button" className="coloring-eraser" aria-pressed={selected === null} disabled={!ready} onClick={() => select(null)}>擦除</button>
              </div>
            </div>
          </>}
        </aside>
      </div>
    </section>
    {!mobileStudio && <div className="coloring-palette" data-testid="coloring-palette" role="group" aria-label="选择填色颜色">
      {swatches(level.palette)}
      {freeColor()}
      <button type="button" className="coloring-eraser" aria-pressed={selected === null} disabled={!ready} onClick={() => select(null)}>擦除</button>
    </div>}
    {error ? <div className="notice notice-error coloring-error" role="alert"><p>{error}</p>
      <button type="button" className="button button-secondary button-small" onClick={() => { setError(null); setReady(false); setCommand(null); setPlayerRun(value => value + 1); }}><span className="button-label">重新加载</span></button></div>
      : <div className="coloring-status" data-testid="coloring-status" role="status"><span>已着色 {paintedCount} 个区域</span><span>{saving ? '正在保存作品…' : message}</span></div>}
    <div className="coloring-save-notice">{saveNotice}</div>
    <div ref={actionsRef} className="coloring-actions">
      {mobileStudio && <>
        <button type="button" className="coloring-back" onClick={onBack} aria-label={backLabel}><img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
        <h1 className="coloring-rail-title" aria-label={shortTitle}><GroupedLevelTitle title={level.title} /></h1>
        <span className="coloring-rail-count" aria-hidden="true">{paintedCount}<small>处着色</small></span>
        <span className="coloring-rail-space" />
      </>}
      <button type="button" className="button button-secondary button-small coloring-undo" disabled={!ready || !canUndo || saving} onClick={() => send({ type: 'undo' })}><span className="button-label">撤销</span></button>
      <button type="button" className="button button-secondary button-small coloring-clear" aria-label="清空重涂" disabled={!ready || !paintedCount || saving} onClick={() => send({ type: 'restart' })}><span className="button-label">清空</span></button>
      <button type="button" data-sound="none" className="button button-primary button-small" disabled={!ready || !paintedCount || saving || finishStatus.current !== 'idle'} onClick={finish}><span className="button-label">{saving ? '正在保存…' : '完成作品'}</span></button>
      <LevelAdvanceControl className="button button-secondary button-small coloring-level-advance" />
    </div>
    </div>
    {referenceOpen && <ReferenceDialog url={getAssetUrl(catalog, level.referenceAssetId)} title={level.title} opener={dialogOpener.current} onClose={() => setReferenceOpen(false)} />}
    {paletteOpen && <FloatingColorPalette referenceRef={referenceRef} actionsRef={actionsRef} opener={paletteOpener.current}
      allowCanvasOverlap={true} onClose={() => setPaletteOpen(false)}>
      <div className="coloring-full-palette" role="group" aria-label="全部填色颜色">
        {level.palette.map(swatch)}{COLORING_MATERIALS.map(materialSwatch)}{freeColor()}
      </div>
    </FloatingColorPalette>}

  </div>;
}
