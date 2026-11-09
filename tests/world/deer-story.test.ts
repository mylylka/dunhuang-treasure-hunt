import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {deerStory} from '../../src/content/world/deer-story';
import {initialStoryFrame,tickStory,skipStory,finishNarration,storyImageTargets,mappedRegion,contain,storyExpansion,type StoryFrame} from '../../src/world/story-playback';
import {discoveryReducer} from '../../src/world/events';
const advance=(frame:StoryFrame)=>tickStory(frame,10,5);
describe('five configured deer episodes',()=>{
 it('preserves six exact source regions and the specified two-image third episode',()=>{
  expect(deerStory.segments).toHaveLength(5);
  expect(deerStory.segments.map(s=>s.images.map(i=>i.region))).toEqual([[[1,0,476,340]],[[1513,0,2048,340]],[[1215,0,1578,340],[406,4,614,111]],[[539,0,936,340]],[[1021,0,1255,340]]]);
  expect(deerStory.ending.text).toBe('敦煌的壁画里，还藏着许多这样的故事。想继续看看吗？');
 });
 it('all runtime media exist; subtitle text and measured audio cues agree with the story config',()=>{
  for(const s of [...deerStory.segments,deerStory.ending]){
   expect(s.text).toBe(s.cues.join(''));
   expect(existsSync(new URL('../../public'+s.narration.url.replace(/^\.\//,'/'),import.meta.url))).toBe(true);
   expect(s.narration.duration).toBeGreaterThan(0);
   expect(s.narration).not.toHaveProperty('cues');
  }
  for(const i of [deerStory.background,deerStory.fullImage,...deerStory.segments.flatMap(s=>s.images)]){
   const bytes=readFileSync(new URL('../../public'+i.url.replace(/^\.\//,'/'),import.meta.url));expect(bytes.toString('ascii',8,12)).toBe('WEBP');
  }
 });
 it('each episode returns to the full scroll; invitation is spoken before finishing',()=>{
  let s=initialStoryFrame();for(let i=0;i<5;i++){
   expect(s.index).toBe(i);expect(s.phase).toBe('overview');s=advance(s);expect(s.phase).toBe('highlight');s=advance(s);expect(s.phase).toBe('advance');s=advance(s);expect(s.phase).toBe('narration');
   expect(advance(s)).toBe(s);s=finishNarration(s);expect(s.phase).toBe('return');s=advance(s);
  }
  expect(s.index).toBe(5);s=advance(s);expect(s.phase).toBe('invitation');expect(advance(s)).toBe(s);expect(finishNarration(s).phase).toBe('finished');
 });
 it('drops taps during transitions and immediately clears one active detail on a valid skip',()=>{
  for(const phase of ['opening','overview','highlight','advance','return','finished'] as const){
   const frame={...initialStoryFrame(),phase,time:.4};
   expect(skipStory(frame,5)).toBe(frame);
  }
  const spoken={...initialStoryFrame(),phase:'narration' as const,audioTime:3};
  const next=skipStory(spoken,5);
  expect(next).toEqual({phase:'highlight',index:1,time:0,audioTime:0});
  expect(storyExpansion(next)).toBe(0);
  expect(skipStory(next,5)).toBe(next);
  const last=skipStory({...spoken,index:4},5);
  expect(last).toMatchObject({phase:'overview',index:5});
  const ending=advance(last);
  expect(ending).toMatchObject({phase:'invitation',index:5});
  const finished=skipStory(ending,5);
  expect(finished).toEqual(finishNarration(ending));
  expect(skipStory(finished,5)).toBe(finished);
 });
 it('finishes at the full scroll when the exhibit omits the invitation',()=>{
  const last={...initialStoryFrame(),phase:'narration' as const,index:4};
  const overview=tickStory(finishNarration(last),1,5,false,false);
  expect(overview).toMatchObject({phase:'overview',index:5});
  expect(tickStory(overview,1,5,false,false)).toMatchObject({phase:'finished',index:5});
  expect(tickStory(skipStory(last,5),1,5,false,false)).toMatchObject({phase:'finished',index:5});
 });
 it('one full paragraph is configured for each of the five audio files, without per-sentence playback timing',()=>{
  expect(deerStory.segments.map(s=>s.text)).toEqual(deerStory.segments.map(s=>s.cues.join('')));
  expect(deerStory.segments.every(s=>s.text.length>20)).toBe(true);
 });
 it('replay starts the same discovery again; it cannot manufacture an event during exploration',()=>{
  expect(discoveryReducer({mode:'choosing',id:'story-demo'},{type:'replay'})).toEqual({mode:'observing',id:'story-demo',paused:false});
  expect(discoveryReducer({mode:'exploring'},{type:'replay'})).toEqual({mode:'exploring'});
 });
 it.each([{x:26,y:76,width:1227,height:739},{x:14,y:111,width:362,height:587},{x:18,y:54,width:808,height:258}])('fits every native ratio within the usable stage %j',box=>{
  for(const s of deerStory.segments){const rects=storyImageTargets(s.images,box);rects.forEach((r,i)=>{
   expect(r.width/r.height).toBeCloseTo(s.images[i].width/s.images[i].height,8);expect(r.x).toBeGreaterThanOrEqual(box.x-.001);expect(r.y).toBeGreaterThanOrEqual(box.y-.001);expect(r.x+r.width).toBeLessThanOrEqual(box.x+box.width+.001);expect(r.y+r.height).toBeLessThanOrEqual(box.y+box.height+.001);
  });if(rects.length===2)expect(rects[0].x+rects[0].width).toBeLessThan(rects[1].x);}
 });
 it('source highlights map inside the actual scroll embedded in the background',()=>{
  const b=contain(1920,1080,{x:0,y:0,width:390,height:844}),r=mappedRegion(b,deerStory.background.scrollRect,deerStory.coordinateSize,[0,0,2048,340]);
  expect(r.x).toBeCloseTo(b.x+55*b.width/1920);expect(r.y).toBeCloseTo(b.y+275*b.width/1920);expect(r.width).toBeCloseTo(1810*b.width/1920);expect(r.height).toBeCloseTo(300*b.width/1920);
 });
});
