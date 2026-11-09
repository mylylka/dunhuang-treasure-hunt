import {describe,it,expect} from 'vitest';
import {MOGAO_LAYOUT,inMogaoRoom,nearStoryWall,moveMogaoPlayer,mogaoSurfaceHeight,MOGAO_SESSION_KEY} from '../../src/world/mogao-rules-v008';
import {caveAdaptationTarget,caveSurfaceGain} from '../../src/world/cave-lighting-v008';
import {noviceStory} from '../../src/content/world/novice-story';
import {deerStory} from '../../src/content/world/deer-story';
import {initialStoryFrame,skipStory,finishNarration,tickStory} from '../../src/world/story-playback';
import {sanitizeCheckpoint,defaultWorldCheckpoint} from '../../src/world/session';
const walk=(start:{x:number;z:number},delta:{x:number;z:number},n:number)=>{let p=start;for(let i=0;i<n;i++)p=moveMogaoPlayer(p,delta);return p;};
describe('v008 compact giant Buddha hall',()=>{
 it('keeps 35m statue, 4.1m full-height art and independent session',()=>{expect(MOGAO_LAYOUT.buddha.height).toBe(35);expect(MOGAO_LAYOUT.mural.height).toBe(4.1);expect(MOGAO_SESSION_KEY.endsWith(':v8')).toBe(true);});
 it('allows the actual stair-tunnel-room connection and return',()=>{const p=walk({x:122,z:-37},{x:0,z:-.1},430);expect(p.z).toBeLessThan(-79);expect(inMogaoRoom(p)).toBe(true);expect(mogaoSurfaceHeight(p)).toBeCloseTo(6.87946875);const back=walk(p,{x:0,z:.1},440);expect(back.z).toBeGreaterThan(-38);});
 it('keeps both side viewing aisles reachable while stopping entry into Buddha',()=>{for(const x of [109,135]){const p=walk({x,z:-78},{x:0,z:-.08},150);expect(p.z).toBeLessThan(-89);const inward=walk(p,{x:x<122?.1:-.1,z:0},100);expect(Math.abs(inward.x-122)).toBeGreaterThan(12);}});
 it('maps front returns and side sections to the same story, with no central overlap',()=>{expect(nearStoryWall({x:112,z:-76})).toBe('story-demo');expect(nearStoryWall({x:109,z:-86})).toBe('story-demo');expect(nearStoryWall({x:132,z:-76})).toBe('novice-story');expect(nearStoryWall({x:135,z:-86})).toBe('novice-story');expect(nearStoryWall({x:122,z:-78})).toBe(null);expect(nearStoryWall({x:135,z:-95})).toBe(null);});
 it('is almost dark outside, increases gradually and remains bounded inside',()=>{expect(caveAdaptationTarget(122,-64)).toBe(0);expect(caveSurfaceGain(0)).toBe(.004);expect(caveAdaptationTarget(122,-75)).toBeGreaterThan(0);expect(caveAdaptationTarget(122,-75)).toBeLessThan(1);expect(caveSurfaceGain(1)).toBeLessThan(.5);expect(caveAdaptationTarget(100,-90)).toBe(0);});
 it('retains a novice visit without corrupting checkpoint parsing',()=>{const c={...defaultWorldCheckpoint(),visitedEvents:['novice-story']};expect(sanitizeCheckpoint(c).visitedEvents).toEqual(['novice-story']);});
});
describe('shared five-segment story with optional opening',()=>{
 it('retains five paragraphs and one opening track, with reliable supplied coordinates',()=>{expect(noviceStory.segments).toHaveLength(5);expect(noviceStory.introduction?.text).toContain('257窟南壁');expect(noviceStory.segments[1].text).toContain('少女发现后，伤心不已');for(const s of noviceStory.segments){expect(s.narration.duration).toBeGreaterThan(5);expect(s.images).toHaveLength(1);expect(s.images[0].region[2]).toBeGreaterThan(s.images[0].region[0]);}expect(noviceStory.segments[2].images[0].width).toBeLessThan(noviceStory.segments[2].images[0].height);});
 it('protects the visual opening before the introduction can skip to the first frame',()=>{
  const opening=initialStoryFrame(true);
  expect(opening.phase).toBe('opening');
  expect(skipStory(opening,5)).toBe(opening);
  const intro=tickStory(opening,1,5);
  expect(intro.phase).toBe('introduction');
  expect(tickStory(intro,20,5)).toBe(intro);
  expect(finishNarration(intro)).toMatchObject({index:0,phase:'overview'});
  expect(skipStory(intro,5)).toMatchObject({index:0,phase:'highlight'});
 });
 it('leaves the deer opening and five existing paragraphs unchanged',()=>{expect(initialStoryFrame().phase).toBe('overview');expect(deerStory.segments).toHaveLength(5);expect(deerStory.segments[0].text).toContain('有一人掉入恒河');});
});
