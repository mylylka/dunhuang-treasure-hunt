import { memo, useEffect, useId, useRef, useState } from 'react';
import { loadFirstGallery, subscribeFirstGallery } from '../services/first-gallery';
import { firstGalleryTasks, mogaoGalleryTasks, musicGalleryTasks, type GalleryTask, type GalleryTaskArea, type GalleryTaskGroup } from '../services/gallery-tasks';
import { loadMogaoExhibitProgress, type MogaoExhibitProgress } from '../services/mogao-exhibit-progress';
import { loadMogaoHallAProgress, type MogaoHallAProgress } from '../services/mogao-hall-a-progress';
import { loadMusicGalleryProgress, type MusicGalleryProgress } from '../services/music-gallery-progress';
import '../styles/gallery-tasks.css';

export type { GalleryTaskArea } from '../services/gallery-tasks';

interface ProgressProps {
  musicProgress?: MusicGalleryProgress | null;
  muralProgress?: MogaoHallAProgress;
  exhibitProgress?: MogaoExhibitProgress;
}

const galleryNames: Record<GalleryTaskArea, string> = {
  first: '第一馆 · 纹彩院',
  music: '第二馆 · 乐舞坊',
  mogao: '第三馆 · 九层楼',
};

function completedCount(tasks: readonly { complete: boolean }[]) {
  return tasks.filter(task => task.complete).length;
}

function TaskSteps({ items }: { items: readonly GalleryTask[] }) {
  return <ul className="world-task-steps">
    {items.map(item => <li key={item.label} data-complete={item.complete}>
      <span className="world-task-mark" aria-hidden="true">{item.complete ? '✓' : '○'}</span>
      <span>{item.label}<span className="visually-hidden">，{item.complete ? '已完成' : '未完成'}</span></span>
    </li>)}
  </ul>;
}

function TaskGroups({ groups, discloseItems = false }: { groups: GalleryTaskGroup[]; discloseItems?: boolean }) {
  return <>
    <p className="world-task-total">挑战进度 <strong>{completedCount(groups)} / {groups.length}</strong></p>
    <ul className="world-task-groups">
      {groups.map(({ label, complete, progress, items }) => {
        const heading = <><span>{label}</span>
          <small>{progress ? `${progress.completed} / ${progress.total}` : complete ? '已完成' : '未完成'}</small></>;
        return <li className="world-task-group" key={label}>
          {items && discloseItems ? <details className="world-task-disclosure">
            <summary className="world-task-group-heading" data-complete={complete}>{heading}</summary>
            <TaskSteps items={items} />
          </details> : <>
            <div className="world-task-group-heading" data-complete={complete}>{heading}</div>
            {items && <TaskSteps items={items} />}
          </>}
        </li>;
      })}
    </ul>
  </>;
}

function FirstGalleryTaskGroups() {
  const [progress, setProgress] = useState(() => loadFirstGallery().data);
  useEffect(() => subscribeFirstGallery(() => setProgress(loadFirstGallery().data)), []);
  const caissonOnly = document.getElementById('root')?.dataset.caissonOnly === 'v001';
  const tasks = firstGalleryTasks(progress);
  return <TaskGroups groups={caissonOnly ? tasks.filter(task => task.label === '三兔共耳') : tasks} />;
}

function CurrentGalleryTasks({ gallery, musicProgress, muralProgress, exhibitProgress }: ProgressProps & { gallery: GalleryTaskArea | null }) {
  if (gallery === 'first') return <FirstGalleryTaskGroups />;
  if (gallery === 'music') return <TaskGroups groups={musicGalleryTasks(musicProgress ?? loadMusicGalleryProgress())} discloseItems />;
  if (gallery === 'mogao') return <TaskGroups groups={mogaoGalleryTasks(
    muralProgress ?? loadMogaoHallAProgress().data, exhibitProgress ?? loadMogaoExhibitProgress().data,
  )} discloseItems />;
  return <p className="world-task-outside">走进展馆后，这里会显示该馆的任务进度。</p>;
}

export const GalleryTasks = memo(function GalleryTasks({ gallery, disabled, ...progress }: ProgressProps & {
  gallery: GalleryTaskArea | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const visible = open && !disabled;

  function close() {
    setOpen(false);
    toggle.current?.focus({ preventScroll: true });
  }

  return <div className="world-task-dropdown">
    <button type="button" className="world-compact-button" ref={toggle} disabled={disabled}
      aria-controls={panelId} aria-expanded={visible} onClick={() => setOpen(value => !value)}
      data-testid="world-task-toggle">任务</button>
    <section className="world-task-panel" id={panelId} aria-labelledby={`${panelId}-heading`}
      hidden={!visible} data-testid="world-task-panel" data-gallery={gallery ?? 'outside'}>
      {visible && <>
        <div className="world-task-header">
          <h2 id={`${panelId}-heading`}>{gallery ? galleryNames[gallery] : '展馆任务'}</h2>
          <button type="button" className="world-task-close" aria-label="关闭任务" onClick={close}>×</button>
        </div>
        <div className="world-task-body" tabIndex={0} key={gallery ?? 'outside'}>
          <CurrentGalleryTasks gallery={gallery} {...progress} />
        </div>
      </>}
    </section>
  </div>;
});
