import { deerStoryV009 } from './deer-introduction-v009';
import type { WorldStoryDefinition } from './deer-story';
import hallA from './mogao-hall-a-v001.json';
import { MOGAO_HALL_A_ENTRANCE } from './mogao-exhibit-v001';
import { getMogaoMuralNarration } from './mogao-mural-audio-v001';
import { noviceStory } from './novice-story';

export interface MogaoPaperStory {
  id: string;
  title: string;
  source: string;
  overview?: string;
  full: { path: string; width: number; height: number };
  segments: {
    id: string;
    title: string;
    text: string;
    images: { id: string; path: string; alt: string }[];
  }[];
  ending?: string;
}

function firstFloorStory(id: string, title: string, source: string, story: WorldStoryDefinition): MogaoPaperStory {
  const thumbnail = (imageId: string) => `mogao-exhibit/v008/paper/${id}-${imageId}.webp`;
  const { width, height } = story.fullImage;
  return {
    id, title, source,
    overview: story.introduction && (getMogaoMuralNarration(story.id, story.introduction.id)?.text ?? story.introduction.text),
    full: { path: thumbnail('full'), width, height },
    segments: story.segments.map(segment => ({
      id: segment.id, title: segment.title, text: getMogaoMuralNarration(story.id, segment.id)?.text ?? segment.text,
      images: segment.images.map(image => ({ id: image.id, path: thumbnail(image.id), alt: image.alt })),
    })),
  };
}

const paperImage = (mobile: string) => mobile.replace(/-mobile\.webp$/, '-paper.webp');

export const MOGAO_WALL_PAPER_FLOORS: readonly {
  label: string;
  introduction?: string;
  stories: MogaoPaperStory[];
}[] = [
  {
    label: '一楼 · 主室',
    stories: [
      firstFloorStory('deer', '九色鹿王本生', '莫高窟第257窟西壁中段 · 北魏', deerStoryV009),
      firstFloorStory('novice', noviceStory.title, '莫高窟第257窟南壁 · 北魏', noviceStory),
    ],
  },
  {
    label: '二楼 · 绘世厅',
    introduction: MOGAO_HALL_A_ENTRANCE,
    stories: hallA.stories.map(({ id, title, source, overview, full, segments, ending }) => ({
      id, title, source,
      overview: getMogaoMuralNarration(id, 'overview')?.text ?? overview,
      ending: getMogaoMuralNarration(id, 'ending')?.text ?? ending,
      full: { path: paperImage(full.mobile), width: full.width, height: full.height },
      segments: segments.map(segment => ({
        id: segment.id, title: segment.title, text: getMogaoMuralNarration(id, segment.id)?.text ?? segment.text,
        images: [{ id: segment.id, path: paperImage(segment.image.mobile), alt: segment.title }],
      })),
    })),
  },
];
