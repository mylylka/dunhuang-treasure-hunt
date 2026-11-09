import { useCallback, useRef, useState } from 'react';
import type { ContentCatalog, GameCommand, GameEvent, SpotDifferenceLevel } from '../types';
import { getAssetUrl } from '../content';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import { GroupedLevelTitle, LevelAdvanceControl } from './LevelAdvanceControl';
import '../styles/spot-difference.css';

interface Props {
  level: SpotDifferenceLevel;
  catalog: ContentCatalog;
  reducedMotion: boolean;
  onBack(): void;
  onEvent(event: GameEvent): void;
}

export function SpotDifferenceScreen({ level, catalog, reducedMotion, onBack, onEvent }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [message, setMessage] = useState('');
  const [zoom, setZoom] = useState(1);
  const [command, setCommand] = useState<GameCommand | null>(null);
  const [run, setRun] = useState(0);
  const sequence = useRef(0);
  const image = catalog.assets.find(asset => asset.id === level.baseAssetId)!;
  const disabled = !ready || !!error;
  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'ready') { setReady(true); setError(null); }
    if (event.type === 'progress') { setFound(event.foundIds.length); setMessage(''); }
    if (event.type === 'hint') setMessage(event.message);
    if (event.type === 'spot-view-change') setZoom(event.zoom);
    if (event.type === 'error') { setError(event.message); setReady(false); }
    onEvent(event);
  }, [onEvent]);
  const send = (type: 'hint' | 'restart') => {
    if (type === 'restart') { setMessage(''); setFound(0); }
    setCommand({ type, sequence: ++sequence.current });
  };
  const setScale = (value: 1 | 2 | 3) => setCommand({ type: 'set-zoom', zoom: value, sequence: ++sequence.current });
  const progress = <span className="spot-count" data-testid="game-progress"
    aria-label={`已找到 ${found} 处，共 ${level.differences.length} 处`}>
    <strong>{found}</strong><span aria-hidden="true"> / </span>{level.differences.length}<small>处变化</small>
  </span>;
  return <div className="page page-play spot-screen">
    <div className="spot-desktop-heading">
      <button type="button" className="text-link spot-back" onClick={onBack}>
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" />返回关卡
      </button>
      <h1>{level.title}</h1>
    </div>
    <section className="game-stage spot-stage" aria-label="找不同游戏区" aria-describedby="spot-instructions">
      <PhaserPlayer key={`${level.id}-${run}`} level={level}
        baseImageUrl={getAssetUrl(catalog, level.baseAssetId)} editedImageUrl={getAssetUrl(catalog, level.editedAssetId)}
        imageAspectRatio={image.width / image.height} reducedMotion={reducedMotion} onEvent={emit} command={command} />
      {!ready && !error && <p className="game-loading" role="status">正在准备观察画面…</p>}
      {message && !error && <div className="spot-message" role="status" aria-live="polite" data-testid="hint-status">
        <p>{message}</p><button type="button" aria-label="收起提示" onClick={() => setMessage('')}>×</button>
      </div>}
      {error && <div className="spot-error notice notice-error" role="alert"><p>{error}</p>
        <button type="button" onClick={() => {
          setReady(false); setError(null); setMessage(''); setFound(0); setZoom(1); setCommand(null); setRun(value => value + 1);
        }}>重新加载画面</button>
      </div>}
    </section>
    <aside className="spot-controls" aria-label="观察操作">
      <button type="button" className="spot-mobile-back spot-control" onClick={onBack} aria-label="返回找不同关卡">
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <div className="spot-mobile-heading"><h1 aria-label={level.title}><GroupedLevelTitle title={level.title} /></h1>{progress}</div>
      <div className="spot-zoom-controls" role="group" aria-label="同步缩放两图">
        <button type="button" disabled={disabled || zoom <= 1} aria-label="缩小两图"
          onClick={() => setScale(zoom > 2 ? 2 : 1)}>−</button>
        <output aria-label="当前倍率">{zoom.toFixed(1)}×</output>
        <button type="button" disabled={disabled || zoom >= 3} aria-label="放大两图"
          onClick={() => setScale(zoom < 2 ? 2 : 3)}>＋</button>
      </div>
      <button type="button" className="spot-control spot-mobile-zoom" disabled={disabled}
        aria-label={`同步缩放两图，当前${zoom.toFixed(1)}倍，点击切换倍率`}
        onClick={() => setScale(zoom < 2 ? 2 : zoom < 3 ? 3 : 1)}>{zoom.toFixed(1)}× 缩放</button>
      <button type="button" className="spot-control spot-reset" disabled={disabled || zoom <= 1}
        onClick={() => setScale(1)}>复位</button>
      <button type="button" className="spot-control" aria-label="给我提示" data-sound="none" disabled={disabled}
        onClick={() => send('hint')}><img src={getAssetUrl(catalog, 'icon-hint')} alt="" /><span>提示</span></button>
      <button type="button" className="spot-control" aria-label="重新开始" disabled={disabled}
        onClick={() => send('restart')}><img src={getAssetUrl(catalog, 'icon-restart')} alt="" /><span>重来</span></button>
      <LevelAdvanceControl className="spot-control" />
      <p id="spot-instructions" className="spot-instructions">点击找不同 · 双指缩放 · 拖动查看</p>
    </aside>
  </div>;
}
