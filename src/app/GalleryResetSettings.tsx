import { useId, useRef, useState } from 'react';
import { galleryTaskResetOptions, type GalleryTaskArea, type GalleryTaskId } from '../services/gallery-tasks';
import '../styles/gallery-reset-settings.css';

const galleryNames: Record<GalleryTaskArea, string> = {
  first: '第一馆 · 纹彩院',
  music: '第二馆 · 乐舞坊',
  mogao: '第三馆 · 九层楼',
};

const routeNotes: Partial<Record<GalleryTaskArea, string>> = {
  first: '若该馆已通关，通往乐舞坊和九层楼的路线将重新锁定，随通关进度开放。',
  music: '若该馆已通关，通往九层楼的路线将重新锁定，再次通关乐舞坊后开放。',
};

type GalleryResetSettingsProps = {
  onReset(gallery: GalleryTaskArea, task?: GalleryTaskId): { ok: true } | { ok: false; message: string };
  compact?: boolean;
};

export function GalleryResetSettings({ onReset, compact = false }: GalleryResetSettingsProps) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<GalleryTaskArea | ''>('');
  const [taskId, setTaskId] = useState<GalleryTaskId | ''>('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const tasks = selected ? galleryTaskResetOptions(selected) : [];
  const task = tasks.find(option => option.id === taskId);
  const progressName = selected
    ? task ? `${galleryNames[selected]}的「${task.label}」任务进度` : `${galleryNames[selected]}的进度`
    : '展馆进度';

  function confirm() {
    if (!selected) return;
    const result = onReset(selected, task?.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    dialog.current?.close();
    select.current?.focus({ preventScroll: true });
    setSuccess(`已清除${progressName}。`);
    setSelected('');
    setTaskId('');
  }

  return <section className="setting-row gallery-reset-settings" aria-labelledby={`${id}-heading`}>
    <div>
      <h2 id={`${id}-heading`}>一键清除</h2>
      <p>选择展馆后，可以清除整馆进度或单项任务。</p>
    </div>
    <div className="gallery-reset-controls">
      <label htmlFor={`${id}-gallery`} className="visually-hidden">选择要清除进度的展馆</label>
      <select ref={select} id={`${id}-gallery`} value={selected} onChange={event => {
        setSelected(event.currentTarget.value as GalleryTaskArea | '');
        setTaskId('');
        setSuccess('');
      }}>
        <option value="" disabled>请选择展馆</option>
        {Object.entries(galleryNames).filter(([area]) => !compact || area === 'first')
          .map(([area, name]) => <option key={area} value={area}>{name}</option>)}
      </select>
      <label htmlFor={`${id}-scope`} className="visually-hidden">选择清除范围</label>
      <select id={`${id}-scope`} value={taskId} disabled={!selected} onChange={event => {
        setTaskId(event.currentTarget.value as GalleryTaskId | '');
        setSuccess('');
      }}>
        <option value="">整馆进度</option>
        {tasks.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <button type="button" className="gallery-reset-action" disabled={!selected} onClick={event => {
        event.currentTarget.focus({ preventScroll: true });
        setSuccess('');
        setError('');
        dialog.current?.showModal();
        cancel.current?.focus({ preventScroll: true });
      }}>{task ? '清除所选任务进度' : '清除所选馆进度'}</button>
    </div>
    <p className="gallery-reset-status" role="status">{success}</p>
    <dialog ref={dialog} className="gallery-reset-dialog" aria-labelledby={`${id}-confirm-title`}
      aria-describedby={`${id}-confirm-description`}>
      <h2 id={`${id}-confirm-title`}>清除{progressName}？</h2>
      <div id={`${id}-confirm-description`} className="gallery-reset-description">
        {task ? <>
          <p>将清除这项任务的进度和相关解锁。清除后无法恢复。</p>
          <p>其他任务的进度、已保存作品和小游戏成绩会保留。</p>
        </> : <>
          <p>将清除该馆的首次游览记录、任务进度、解锁及图鉴奖励。清除后无法恢复。</p>
          <p>其他展馆的记录和已保存作品会保留。</p>
        </>}
        {!compact && selected && routeNotes[selected] && <p>{routeNotes[selected]}</p>}
      </div>
      <p className="gallery-reset-error" role="alert">{error}</p>
      <div className="gallery-reset-dialog-actions">
        <button ref={cancel} type="button" onClick={() => dialog.current?.close()}>取消</button>
        <button type="button" className="gallery-reset-confirm" onClick={confirm}>确认清除</button>
      </div>
    </dialog>
  </section>;
}
