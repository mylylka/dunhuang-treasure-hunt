import { useEffect, useRef, useState } from 'react';
import { getAssetUrl } from '../content';
import { renderColoringArtwork } from '../games/coloring/render';
import type { ColoringLevel, ContentCatalog, RegionColors } from '../types';
import '../styles/coloring-result.css';

export function ColoringResult({ level, catalog, colors }: { level: ColoringLevel; catalog: ContentCatalog; colors: RegionColors }) {
  const slot = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setReady(false); setError(null);
    renderColoringArtwork({ lineImageUrl: getAssetUrl(catalog, level.lineAssetId), regionMapImageUrl: getAssetUrl(catalog, level.regionMapAssetId), colors, signal: abort.signal })
      .then(canvas => {
        if (abort.signal.aborted || !slot.current) return;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('data-testid', 'coloring-result-canvas');
        canvas.setAttribute('aria-label', `${level.title}，你的填色作品`);
        slot.current.replaceChildren(canvas);
        artwork.current = canvas; setReady(true);
      }).catch(reason => {
        if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : '作品预览未能加载，请重试。');
      });
    return () => { abort.abort(); artwork.current = null; };
  }, [level, catalog, colors, attempt]);
  function exportPng() {
    artwork.current?.toBlob(blob => {
      if (!blob) { setError('作品导出失败，请重试。'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `敦煌寻宝记-${level.title}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, 'image/png');
  }
  return <div className="coloring-result-art">
    <div className="coloring-artwork-slot" ref={slot} data-testid="coloring-result-artwork" />
    {!ready && !error && <p role="status">正在展示你的作品…</p>}
    {error && <div className="notice notice-error" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>重试预览</button></div>}
    <button type="button" className="button button-secondary button-small" disabled={!ready} onClick={exportPng}><span className="button-label">导出PNG</span></button>
  </div>;
}
