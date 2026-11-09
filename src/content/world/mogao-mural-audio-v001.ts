import { worldAssetUrl } from './assets';
import type { StoryCue, StoryNarration } from './deer-story';
import recording from './mogao-mural-audio-v001.json';
import narration from './mogao-narration-v001.json';

interface RecordedPassage {
  path: string;
  duration: number;
  text: string;
  cues: StoryCue[];
}

export interface MogaoMuralNarration extends StoryNarration {
  text: string;
  cues: StoryCue[];
}

const stories = new Map(Object.entries(recording).map(([id, passages]) => [
  id,
  new Map(Object.entries(passages).map(([part, track]: [string, RecordedPassage]): [string, MogaoMuralNarration] => [
    part, { url: worldAssetUrl(track.path), duration: track.duration, text: track.text, cues: track.cues },
  ])),
]));

const defeatText = recording.bandits.defeat.text;
const { path: defeatPath, duration: defeatDuration } = narration.banditsDefeat;
stories.get('bandits')?.set('defeat', {
  url: worldAssetUrl(defeatPath), duration: defeatDuration, text: defeatText,
  cues: [{ start: 0, end: defeatDuration, text: defeatText }],
});

export function getMogaoMuralNarration(story: string, part: string): MogaoMuralNarration | undefined {
  return stories.get(story)?.get(part);
}
