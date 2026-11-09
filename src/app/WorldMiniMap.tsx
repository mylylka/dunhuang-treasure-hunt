import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { WorldMapFog } from './WorldMapFog';
import '../styles/world-minimap.css';

export type MapUnlockedGalleries = 1 | 2 | 3;

const galleryMapStatus: Record<MapUnlockedGalleries, string> = {
  1: '纹彩院已开放，白雾覆盖乐舞坊和九层楼。',
  2: '纹彩院和乐舞坊已开放，白雾覆盖九层楼。',
  3: '三馆均已开放。',
};

interface Props {
  imageUrl: string;
  /** Normalized position within the complete, uncropped map image. */
  marker: { x: number; y: number } | null;
  unlockedGalleries?: MapUnlockedGalleries;
  reducedMotion?: boolean;
  available: boolean;
}

/** A non-modal overview: exploring continues while the map is open. */
export function WorldMiniMap({ imageUrl, marker, unlockedGalleries, reducedMotion, available }: Props) {
  const [open, setOpen] = useState(false);
  const [openedFrom, setOpenedFrom] = useState(unlockedGalleries);
  const lastShown = useRef(unlockedGalleries);
  const trigger = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!available && open) setOpen(false);
    const previous = lastShown.current;
    const relocked = unlockedGalleries !== undefined && previous !== undefined && unlockedGalleries < previous;
    if ((available && open) || relocked) {
      lastShown.current = unlockedGalleries;
    }
  }, [available, open, unlockedGalleries]);

  function toggleMap() {
    if (!open) setOpenedFrom(lastShown.current);
    setOpen(!open);
  }

  function closeMap() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMap();
    }
  }

  const showMarker = marker && Number.isFinite(marker.x) && Number.isFinite(marker.y)
    && marker.x >= 0 && marker.x <= 1 && marker.y >= 0 && marker.y <= 1;

  if (!available) return null;

  return <div className="world-mini-map" onKeyDown={onKeyDown}>
    <button ref={trigger} type="button" className="world-mini-map-trigger" aria-label="打开世界地图"
      aria-expanded={open} aria-controls="world-mini-map-panel" data-testid="world-mini-map-toggle"
      onClick={toggleMap}>
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" />
        <ellipse cx="16" cy="16" rx="5.8" ry="12" />
        <path d="M4.6 12h22.8M4.6 20h22.8M16 4v24" />
      </svg>
    </button>
    {open && <aside id="world-mini-map-panel" className="world-mini-map-panel" aria-label="世界地图"
      data-testid="world-mini-map-panel" data-unlocked-galleries={unlockedGalleries}>
      <div className="world-mini-map-header"><span>世界地图 <small>位置为示意</small></span><button type="button" className="world-mini-map-close"
        aria-label="关闭世界地图" data-testid="world-mini-map-close" onClick={closeMap}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button></div>
      <div className="world-mini-map-image">
        <img src={imageUrl} alt="敦煌世界高空示意图" draggable={false} />
        {unlockedGalleries !== undefined && <WorldMapFog lockedMusic={unlockedGalleries === 1}
          lockedMogao={unlockedGalleries < 3} reducedMotion={reducedMotion}
          initialLockedMusic={openedFrom === undefined ? undefined : openedFrom === 1}
          initialLockedMogao={openedFrom === undefined ? undefined : openedFrom < 3} />}
        {showMarker && <span className="world-mini-map-marker" data-testid="world-mini-map-marker"
          aria-label="角色当前位置" role="img" style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }} />}
      </div>
      {unlockedGalleries !== undefined && <p className="visually-hidden" role="status">{galleryMapStatus[unlockedGalleries]}</p>}
      {!showMarker && <p className="world-mini-map-outside">当前位置不在地图范围内</p>}
    </aside>}
  </div>;
}
