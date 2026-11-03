import config from './novice-story-v001.json';
import audio from './novice-audio-v001.json';
import {worldAssetUrl} from './assets';
import type {WorldStoryDefinition} from './deer-story';
const url=(f:string)=>worldAssetUrl(`novice-story/v001/${f}`);
const tracks=audio.tracks as Record<string,{file:string;duration:number}>;
const narration=(id:string)=>({url:url(tracks[id].file),duration:tracks[id].duration});
export const noviceStory:WorldStoryDefinition={
 id:config.id,title:config.title,coordinateSize:config.coordinateSize,
 fullImage:{...config.fullImage,url:url(config.fullImage.file)},
 background:{url:'',width:1920,height:1080,scrollRect:config.backgroundScrollRect,composite:true},
 introduction:{...config.introduction,narration:narration(config.introduction.id)},
 segments:config.segments.map(s=>({...s,narration:narration(s.id),images:s.images.map(i=>({...i,url:url(i.file)}))})),
 ending:{...config.ending,narration:narration(config.ending.id)},
};
