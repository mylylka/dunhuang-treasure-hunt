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
    { label: GALLERY_LABELS.mural, complete: mural.completed === mural.total, progress: mural },
    { label: '三兔共耳', complete: progress.caissonCompleted },
    { label: '画架设色', complete: progress.coloringCompleted },
  ];
}

export function musicGalleryTasks(progress: MusicGalleryProgress): GalleryTaskGroup[] {
  const chapters = { completed: progress.chapters.length, total: MUSIC_GALLERY_CHAPTERS };
  return [
    { label: '飞天年代', complete: chapters.completed === chapters.total, progress: chapters },
    group('乐器试听', MUSIC_INSTRUMENTS.map(({ id, name }) => ({ label: name, complete: progress.instruments.includes(id) }))),
    { label: '服饰', complete: progress.dressed },
  ];
}

export function mogaoGalleryTasks(murals: MogaoHallAProgress, exhibit: MogaoExhibitProgress): GalleryTaskGroup[] {
  const viewed = new Set<string>(murals.completed);
  return [
    group('壁画故事', [
      { label: worldStoryPreview.title, complete: viewed.has('story-demo') },
      { label: noviceStory.title, complete: viewed.has('novice-story') },
      ...muralStories.stories.map(({ id, title }) => ({ label: title, complete: viewed.has(id) })),
    ]),
    group('佛法厅展品', MOGAO_EXHIBIT.items.map(({ id, title }) => ({ label: title, complete: exhibit.viewed.includes(id) }))),
  ];
}
