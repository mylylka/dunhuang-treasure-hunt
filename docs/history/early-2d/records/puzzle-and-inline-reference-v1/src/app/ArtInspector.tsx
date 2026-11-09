import { useEffect, useId, useRef, useState } from 'react';
import '../styles/art-inspector.css';

export interface ArtInspectorProps {
  referenceUrl: string;
  editedUrl: string;
  imageAspectRatio?: number;
  onClose: () => void;
}

const views = [
  { id: 'full', label: '全图', position: '50% 50%' },
  { id: 'upper-left', label: '左上 2×', position: '0% 0%' },
  { id: 'upper-right', label: '右上 2×', position: '100% 0%' },
  { id: 'center', label: '中央 2×', position: '50% 50%' },
  { id: 'upper-detail', label: '上侧 4×', position: '50% 29%' },
  { id: 'lower-left', label: '左下 2×', position: '0% 100%' },
  { id: 'lower-right', label: '右下 2×', position: '100% 100%' },
] as const;

/** A read-only view: selecting a picture or area never sends commands to the game. */
export function ArtInspector({ referenceUrl, editedUrl, imageAspectRatio = 1.5, onClose }: ArtInspectorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const noteId = useId();
  const [side, setSide] = useState<'reference' | 'edited'>('reference');
  const [viewId, setViewId] = useState<(typeof views)[number]['id']>('full');
  const [size, setSize] = useState({ width: 1, height: 1 });
  const view = views.find(item => item.id === viewId)!;
  const imageLabel = side === 'reference' ? '参照图 A' : '变化图 B';

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const resize = () => {
      const bounds = slot.getBoundingClientRect();
      const width = Math.max(1, Math.min(bounds.width, bounds.height * imageAspectRatio));
      const height = width / imageAspectRatio;
      setSize(previous => Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5
        ? previous : { width, height });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(slot);
    resize();
    return () => observer.disconnect();
  }, [imageAspectRatio]);

  return <dialog ref={dialogRef} className="art-inspector-dialog" data-testid="art-inspector"
    aria-labelledby={headingId} aria-describedby={noteId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="art-inspector-heading">
      <div><h2 id={headingId}>放大观察</h2><p id={noteId}>放大查看后，返回原图标出差异。</p></div>
      <button className="art-inspector-close" type="button" onClick={onClose} aria-label="关闭放大观察">×</button>
    </header>
    <div className="art-inspector-controls">
      <div className="art-inspector-sides" role="group" aria-label="切换观察图片">
        <button type="button" aria-pressed={side === 'reference'} onClick={() => setSide('reference')}>参照图 A</button>
        <button type="button" aria-pressed={side === 'edited'} onClick={() => setSide('edited')}>变化图 B</button>
      </div>
      <div className="art-inspector-views" role="group" aria-label="选择全图或放大区域">
        {views.map(item => <button key={item.id} type="button" aria-pressed={viewId === item.id}
          onClick={() => setViewId(item.id)}>{item.label}</button>)}
      </div>
    </div>
    <div className="art-inspector-slot" ref={slotRef}>
      <div className="art-inspector-picture" data-testid="art-inspector-image" data-side={side} data-view={viewId}
        role="img" aria-label={`${imageLabel}，${view.label}`}
        style={{ width: size.width, height: size.height,
          backgroundImage: `url(${JSON.stringify(side === 'reference' ? referenceUrl : editedUrl)})`,
          backgroundSize: viewId === 'full' ? '100% 100%' : viewId === 'upper-detail' ? '400% 400%' : '200% 200%', backgroundPosition: view.position }} />
    </div>
    <footer className="art-inspector-footer">
      <span aria-live="polite">{imageLabel} · {view.label}</span>
      <button className="art-inspector-return" type="button" onClick={onClose}>返回游戏</button>
    </footer>
  </dialog>;
}
