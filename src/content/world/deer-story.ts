import config from './nine-colored-deer-v002.json';
import media from './story-media-v002.json';
import narration from './story-audio-v002.json';
import {worldAssetUrl} from './assets';

export type StoryRegion = readonly number[];
export interface StoryArtwork { id:string; url:string; width:number; height:number; alt:string; region:StoryRegion }
export interface StoryCue {start:number;end:number;text:string}
export interface StoryNarration {url:string;duration:number}
const images=media as Record<string,{file:string;width:number;height:number;sourceFile:string}>;
const tracks=narration.tracks as Record<string,{file:string;duration:number;cues:StoryCue[]}>;
const image=(id:string)=>({...images[id],url:worldAssetUrl(`story/v002/${images[id].file}`)});
const audio=(id:string,file:string):StoryNarration=>({duration:tracks[id].duration,url:worldAssetUrl(`story/v002/${file}`)});
export interface WorldStoryDefinition {
 id:string;title:string;coordinateSize:readonly number[];
 fullImage:{url:string;width:number;height:number};
 background:{url:string;width:number;height:number;scrollRect:readonly number[];composite?:boolean};
 introduction?:{id:string;text:string;narration:StoryNarration};
 segments:{id:string;title:string;text:string;narration:StoryNarration;images:StoryArtwork[]}[];
 ending:{id:string;text:string;narration:StoryNarration};
}
export const deerStory={
 id:config.id,title:config.title,coordinateSize:config.coordinateSize,
 background:{...image('background'),scrollRect:config.backgroundScrollRect},
 fullImage:image('full-scroll'),
 segments:config.segments.map(s=>({...s,text:s.text,narration:audio(s.id,s.audio),
  images:s.images.map(a=>({...image(a.id),id:a.id,alt:images[a.id].sourceFile.replace(/\.jpg$/,''),region:a.region}))})),
 ending:{...config.ending,narration:audio(config.ending.id,config.ending.audio)},
} satisfies WorldStoryDefinition;
