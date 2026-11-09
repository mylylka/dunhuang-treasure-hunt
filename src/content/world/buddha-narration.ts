import legacyNarration from './buddha-narration-v001.json';
import exhibitNarration from './buddha-narration-v002.json';

const exhibitCaption = {
  ...exhibitNarration,
  text: `${exhibitNarration.text}当前雕像为游戏中的仿制品，并非对原像的精准还原。`,
};

export function buddhaNarrationFor(isExhibit: boolean) {
  return isExhibit ? exhibitCaption : legacyNarration;
}
