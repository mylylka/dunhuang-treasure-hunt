import config from './mogao-hall-a-v001.json';
import { worldAssetUrl } from './assets';
import type { TextStoryDefinition } from './deer-story';
import type { MogaoHallAStoryId } from './mogao-hall-a-layout-v001';
import { storyTextCues } from '../../world/story-playback';

export type { MogaoHallAStoryId } from './mogao-hall-a-layout-v001';
type ImageTier = 'mobile' | 'desktop';

function buildStory(id: MogaoHallAStoryId, tier: ImageTier): TextStoryDefinition {
  const story = config.stories.find(item => item.id === id)!;
  const { width, height } = story.full;
  const endingDuration = storyTextCues(story.ending).at(-1)?.end ?? 0;
  return {
    id,
    title: story.title,
    source: story.source,
    playback: 'text',
    coordinateSize: [1, 1],
    fullImage: { width, height, url: worldAssetUrl(story.full[tier]) },
    background: { url: '', width, height, scrollRect: [0, 0, 1920, 1920 * height / width], composite: true },
    introduction: { id: 'overview', text: story.overview, cues: storyTextCues(story.overview) },
    segments: story.segments.map(({ id: segmentId, title, text, region, focus, image }) => ({
      id: segmentId,
      title,
      text,
      cues: storyTextCues(text),
      images: [{ id: segmentId, alt: title, width: image.width, height: image.height, url: worldAssetUrl(image[tier]), region, focus }],
    })),
    ending: { id: 'ending', text: story.ending, cues: [{ start: 0, end: endingDuration, text: story.ending }] },
  };
}

const stories = {
  bandits: { mobile: buildStory('bandits', 'mobile'), desktop: buildStory('bandits', 'desktop') },
  'burning-house': { mobile: buildStory('burning-house', 'mobile'), desktop: buildStory('burning-house', 'desktop') },
};

export function getMogaoHallAStory(id: MogaoHallAStoryId, mobile: boolean): TextStoryDefinition {
  return stories[id][mobile ? 'mobile' : 'desktop'];
}
