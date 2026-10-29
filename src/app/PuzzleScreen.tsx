import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getAssetUrl } from '../content';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import type { ContentCatalog, GameCommand, GameEvent, PuzzleLevel } from '../types';
import type { PuzzleLayout } from '../games/puzzle/rules';
import '../styles/puzzle.css';

export interface PuzzleScreenProps { level: PuzzleLevel; catalog: ContentCatalog; onEvent: (event: GameEvent) => void; reducedMotion: boolean; onBack: () => void }
function PuzzleReference({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  useEffect(() => {
    const opener = document.activeElement; dialog.current?.showModal();
    return () => { dialog.current?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="puzzle-reference-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={heading}>{title} · 原图</h2><button type="button" aria-label="关闭拼图参考" onClick={onClose}>×</button></header>
    <div className="puzzle-reference-picture"><img src={url} alt={`${title}完整参考图`} draggable={false} /></div>
    <footer><button type="button" className="button button-secondary button-small" onClick={onClose}><span className="button-label">返回拼图</span></button></footer>
  </dialog>;
}
export function PuzzleScreen({ level, catalog, onEvent, reducedMotion, onBack }: PuzzleScreenProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState<GameCommand | null>(null);
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);
  const [layout, setLayout] = useState<PuzzleLayout | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [run, setRun] = useState(0);
  const sequence = useRef(0), eventRef = useRef(onEvent); eventRef.current = onEvent;
  const scrollbar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scrollbar.current;
    if (element && layout) {
      // Native scroll ranges use integer layout metrics, while the canvas keeps fractional pixels.
      const nativeMaximum = Math.max(0, element.scrollHeight - element.clientHeight);
      const nativeOffset = layout.trayMaxScroll > 0 ? layout.trayScroll / layout.trayMaxScroll * nativeMaximum : 0;
      const atBoundary = layout.trayScroll === 0 || layout.trayScroll === layout.trayMaxScroll;
      if (Math.abs(element.scrollTop - nativeOffset) > (atBoundary ? .01 : .5)) element.scrollTop = nativeOffset;
    }
  }, [layout]);
  const image = catalog.assets.find(asset => asset.id === level.imageAssetId)!;
  const emit = useCallback((event: GameEvent) => {
    if (event.type === 'ready') { setReady(true); setError(null); }
    if (event.type === 'error') { setError(event.message); setReady(false); }
    if (event.type === 'hint') setMessage(event.message);
    if (event.type === 'puzzle-change') setCount(event.placedCount);
    eventRef.current(event);
  }, []);
  const send = (type: 'hint' | 'restart') => {
    if (type === 'restart') setMessage('');
    setCommand({ type, sequence: ++sequence.current });
  };
  return <div className="page page-play puzzle-screen" data-puzzle-mode={level.mode}>
    <header className="puzzle-heading">
      <button type="button" className="puzzle-back" aria-label="返回拼图关卡" onClick={onBack}><img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
      <h1>{level.title}</h1>
      <button type="button" className="text-link" onClick={() => setReferenceOpen(true)}>查看原图</button>
      <div className="puzzle-progress" data-testid="puzzle-progress" aria-label={`已归位 ${count} 块，共 ${level.rows * level.columns} 块`}><strong>{count}</strong><span>/ {level.rows * level.columns}</span></div>
    </header>
    <section className="game-stage puzzle-stage" aria-label={level.mode === 'rotation' ? '旋转拼图游戏区' : '不规则碎片拼图游戏区'}>
      <div className="puzzle-instruction">{level.mode === 'rotation' ? '点击图块，顺时针旋转90°' : '拖动碎片或选片后点位置；滑动碎片区空白可上下找片'}</div>
      <div className="puzzle-canvas-shell">
        <PhaserPlayer key={`${level.id}-${run}`} level={level} imageUrl={getAssetUrl(catalog, level.imageAssetId)}
          imageAspectRatio={image.width / image.height} reducedMotion={reducedMotion} onEvent={emit} command={command}
          onPuzzleLayout={setLayout} />
        {level.mode === 'jigsaw' && layout?.trayScrollbar && <div ref={scrollbar}
          className="puzzle-tray-scrollbar" data-testid="puzzle-tray-scrollbar" role="region" tabIndex={0}
          aria-label="上下滚动寻找碎片" aria-disabled={layout.trayMaxScroll <= 0}
          style={{ left: layout.trayScrollbar.x, top: layout.trayScrollbar.y, width: layout.trayScrollbar.width, height: layout.trayScrollbar.height }}
          onScroll={event => {
            const element = event.currentTarget;
            const nativeMaximum = Math.max(0, element.scrollHeight - element.clientHeight);
            const fraction = nativeMaximum > 0 ? Math.max(0, Math.min(1, element.scrollTop / nativeMaximum)) : 0;
            const offset = fraction * layout.trayMaxScroll;
            if (Math.abs(offset - layout.trayScroll) > (fraction === 0 || fraction === 1 ? .01 : .75)) {
              setCommand({ type: 'puzzle-scroll', offset, sequence: ++sequence.current });
            }
          }}>
          <div style={{ height: Math.max(layout.trayScrollbar.height, layout.trayContentHeight), width: 1 }} />
        </div>}
      </div>
      {!ready && !error && <p className="puzzle-loading" role="status">正在准备拼图…</p>}
    </section>
    {error ? <div className="notice notice-error puzzle-error" role="alert"><p>{error}</p><button type="button" className="button button-secondary button-small" onClick={() => {
      setError(null); setReady(false); setMessage(''); setCount(0); setCommand(null); setLayout(null); setRun(value => value + 1);
    }}><span className="button-label">重新加载拼图</span></button></div> : <div className="puzzle-status" role="status" data-testid="puzzle-hint-status">{message}</div>}
    <div className="puzzle-actions">
      <button type="button" data-sound="none" className="button button-secondary button-small" disabled={!ready} onClick={() => send('hint')}><img src={getAssetUrl(catalog, 'icon-hint')} alt="" /><span className="button-label">拼图提示</span></button>
      <button type="button" className="button button-secondary button-small" disabled={!ready} onClick={() => send('restart')}><img src={getAssetUrl(catalog, 'icon-restart')} alt="" /><span className="button-label">重新拼图</span></button>
    </div>
    {referenceOpen && <PuzzleReference url={getAssetUrl(catalog, level.imageAssetId)} title={level.title} onClose={() => setReferenceOpen(false)} />}
  </div>;
}
