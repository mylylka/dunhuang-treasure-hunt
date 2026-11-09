import { useId, useRef, useState } from 'react';
import type { GalleryTaskArea } from '../services/gallery-tasks';
import '../styles/gallery-reset-settings.css';

const galleryNames: Record<GalleryTaskArea, string> = {
  first: '第一馆 · 纹彩院',
  music: '第二馆 · 乐舞坊',
  mogao: '第三馆 · 九层楼',
};

const routeNotes: Partial<Record<GalleryTaskArea, string>> = {
  first: '三馆漫游中，通往乐舞坊和九层楼的路线将重新锁定，随通关进度开放。',
  music: '三馆漫游中，通往九层楼的路线将重新锁定，再次通关乐舞坊后开放。',
};

type GalleryResetSettingsProps = {
  onReset(gallery: GalleryTaskArea): { ok: true } | { ok: false; message: string };
};

export function GalleryResetSettings({ onReset }: GalleryResetSettingsProps) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<GalleryTaskArea | ''>('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function confirm() {
    if (!selected) return;
    const result = onReset(selected);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    dialog.current?.close();
    select.current?.focus({ preventScroll: true });
    setSuccess(`已清除${galleryNames[selected]}的漫游进度。`);
    setSelected('');
  }

  return <section className="setting-row gallery-reset-settings" aria-labelledby={`${id}-heading`}>
    <div>
      <h2 id={`${id}-heading`}>一键清除</h2>
      <p>重新体验所选馆的首次讲解与任务。</p>
    </div>
    <div className="gallery-reset-controls">
      <label htmlFor={`${id}-gallery`} className="visually-hidden">选择要清除进度的展馆</label>
      <select ref={select} id={`${id}-gallery`} value={selected} onChange={event => {
        setSelected(event.currentTarget.value as GalleryTaskArea | '');
        setSuccess('');
      }}>
        <option value="" disabled>请选择展馆</option>
        {Object.entries(galleryNames).map(([area, name]) => <option key={area} value={area}>{name}</option>)}
      </select>
      <button type="button" className="gallery-reset-action" disabled={!selected} onClick={event => {
        event.currentTarget.focus({ preventScroll: true });
        setSuccess('');
        setError('');
        dialog.current?.showModal();
        cancel.current?.focus({ preventScroll: true });
      }}>清除所选馆进度</button>
    </div>
    <p className="gallery-reset-status" role="status">{success}</p>
    <dialog ref={dialog} className="gallery-reset-dialog" aria-labelledby={`${id}-confirm-title`}
      aria-describedby={`${id}-confirm-description`}>
      <h2 id={`${id}-confirm-title`}>{selected ? `清除${galleryNames[selected]}的进度？` : '清除展馆进度？'}</h2>
      <div id={`${id}-confirm-description`} className="gallery-reset-description">
        <p>将清除该馆的首次游览记录、任务进度、解锁及图鉴奖励。清除后无法恢复。</p>
        <p>其他展馆的记录和已保存作品会保留。</p>
        {selected && routeNotes[selected] && <p>{routeNotes[selected]}</p>}
      </div>
      <p className="gallery-reset-error" role="alert">{error}</p>
      <div className="gallery-reset-dialog-actions">
        <button ref={cancel} type="button" onClick={() => dialog.current?.close()}>取消</button>
        <button type="button" className="gallery-reset-confirm" onClick={confirm}>确认清除</button>
      </div>
    </dialog>
  </section>;
}
