import legacyNarration from './buddha-narration-v001.json';
import exhibitNarration from './buddha-narration-v002.json';

const exhibitDisclaimer = '当前雕像为游戏中的仿制品，并非对原像的精准还原。';
const sentences = exhibitNarration.text.match(/[^。]+。/g) ?? [];
// The supplied SRT is one cue. These breaks follow the pauses in the corrected recording.
const exhibitBreaks = [8.74, 19.13, 22.05];
const exhibitCaption = {
  ...exhibitNarration,
  text: exhibitNarration.text + exhibitDisclaimer,
};

export function buddhaNarrationFor(isExhibit: boolean) {
  return isExhibit ? exhibitCaption : legacyNarration;
}

export function buddhaSubtitleAt(isExhibit: boolean, time: number) {
  if (!isExhibit) return legacyNarration.text;
  const index = exhibitBreaks.findIndex(end => time < end);
  return index < 0 ? sentences.at(-1) + exhibitDisclaimer : sentences[index];
}
