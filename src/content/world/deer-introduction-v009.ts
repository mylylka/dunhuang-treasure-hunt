import {deerStory,type WorldStoryDefinition} from './deer-story';
import intro from './deer-introduction-v001.json';
import {worldAssetUrl} from './assets';
/** Independent revision: existing story assets and older previews remain intact. */
export const deerStoryV009:WorldStoryDefinition={...deerStory,source:'莫高窟第257窟西壁中段 · 北魏',introduction:{id:intro.id,text:intro.text,narration:{url:worldAssetUrl(`story/v003/${intro.file}`),duration:intro.duration}}};
