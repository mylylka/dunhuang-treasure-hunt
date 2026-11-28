import muralStories from '../content/world/mogao-hall-a-v001.json';
import { GALLERY_LABELS } from '../content/world/first-gallery-v001';
import { MOGAO_EXHIBIT } from '../content/world/mogao-exhibit-v001';
import { MUSIC_INSTRUMENTS } from '../content/world/music-instruments-v001';
import { noviceStory } from '../content/world/novice-story';
import { worldStoryPreview } from '../content/world/stories';
import type { FirstGalleryState } from './first-gallery';
import type { MogaoExhibitProgress } from './mogao-exhibit-progress';
import type { MogaoHallAProgress } from './mogao-hall-a-progress';
import { MUSIC_GALLERY_CHAPTERS, type MusicGalleryProgress } from './music-gallery-progress';

export type GalleryTaskArea = 'first' | 'music' | 'mogao';

const firstLabels = { mural: GALLERY_LABELS.mural, caisson: '三兔共耳', easel: '画架设色' };
const musicLabels = { chapters: '飞天年代', instruments: '乐器试听', outfit: '服饰' };
const mogaoLabels = { murals: '壁画故事', exhibits: '佛法厅展品' };
const taskLabels = { first: firstLabels, music: musicLabels, mogao: mogaoLabels };

export type GalleryTaskId = keyof typeof firstLabels | keyof typeof musicLabels | keyof typeof mogaoLabels;

export function galleryTaskResetOptions(gallery: GalleryTaskArea): { id: GalleryTaskId; label: string }[] {
  return Object.entries(taskLabels[gallery]).map(([id, label]) => ({ id: id as GalleryTaskId, label }));
}

export interface GalleryTask {
  label: string;
  complete: boolean;
}

export interface GalleryTaskGroup extends GalleryTask {
  progress?: { completed: number; total: number };
  items?: readonly GalleryTask[];
}

function group(label: string, items: GalleryTask[]): GalleryTaskGroup {
  const completed = items.filter(item => item.complete).length;
  return { label, complete: completed === items.length, progress: { completed, total: items.length }, items };
}

export function firstGalleryTasks(progress: FirstGalleryState): GalleryTaskGroup[] {
  const mural = { completed: progress.muralParts.length, total: 3 };
  return [
    { label: firstLabels.mural, complete: mural.completed === mural.total, progress: mural },
    { label: firstLabels.caisson, complete: progress.caissonCompleted },
    { label: firstLabels.easel, complete: progress.coloringCompleted },
  ];
}

export function musicGalleryTasks(progress: MusicGalleryProgress): GalleryTaskGroup[] {
  const chapters = { completed: progress.chapters.length, total: MUSIC_GALLERY_CHAPTERS };
  return [
    { label: musicLabels.chapters, complete: chapters.completed === chapters.total, progress: chapters },
    group(musicLabels.instruments, MUSIC_INSTRUMENTS.map(({ id, name }) => ({ label: name, complete: progress.instruments.includes(id) }))),
    { label: musicLabels.outfit, complete: progress.dressed },
  ];
}

export function mogaoGalleryTasks(murals: MogaoHallAProgress, exhibit: MogaoExhibitProgress): GalleryTaskGroup[] {
  const viewed = new Set<string>(murals.completed);
  return [
    group(mogaoLabels.murals, [
      { label: worldStoryPreview.title, complete: viewed.has('story-demo') },
      { label: noviceStory.title, complete: viewed.has('novice-story') },
      ...muralStories.stories.map(({ id, title }) => ({ label: title, complete: viewed.has(id) })),
    ]),
    group(mogaoLabels.exhibits, MOGAO_EXHIBIT.items.map(({ id, title }) => ({ label: title, complete: exhibit.viewed.includes(id) }))),
  ];
}
