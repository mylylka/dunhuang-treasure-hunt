import {describe,it,expect} from 'vitest';
import {createHallArrival} from '../../src/world/hall-arrival';
import {deerStoryV009} from '../../src/content/world/deer-introduction-v009';
import {deerStory} from '../../src/content/world/deer-story';
import {finishNarration,initialStoryFrame,skipStory} from '../../src/world/story-playback';

describe('hall arrival',()=>{
 it('stops for two active seconds, then permits a direction choice',()=>{
  const a=createHallArrival();a.update(true,.1);expect(a.phase).toBe('waiting');
  a.update(true,1.9);a.dismiss();expect(a.phase).toBe('waiting');
  a.update(true,.101);expect(a.phase).toBe('guidance');a.dismiss();expect(a.phase).toBe('done');
  a.update(true,90);expect(a.phase).toBe('done');
 });
 it('freezes with paused game time and rearms only after leaving',()=>{
  const a=createHallArrival();a.update(true,0);a.update(true,1);
  for(let i=0;i<100;i++)a.update(true,0);expect(a.phase).toBe('waiting');
  a.update(true,1);expect(a.phase).toBe('guidance');a.dismiss();a.update(false,0);a.update(true,0);expect(a.phase).toBe('waiting');
 });
});
describe('deer full-scroll introduction',()=>{
 it('adds one replaceable recording without changing the five original episodes',()=>{
  expect(deerStoryV009.segments).toEqual(deerStory.segments);expect(deerStoryV009.introduction?.text).toBe('此画名为《九色鹿王本生》，现于257窟西壁中段，这组壁画曾由上海美术制片厂制作成动画片，可谓家喻户晓。画面采用横卷连环画的表现形式，按两头开始、中间结束的特殊顺序布局绘制。');
  expect(deerStoryV009.introduction?.narration.duration).toBeGreaterThan(15);
 });
 it('both natural ending and Space begin the first episode, never skip it',()=>{
  for(const f of [finishNarration(initialStoryFrame(true)),skipStory(initialStoryFrame(true),5)]){expect(f.phase).toBe('overview');expect(f.index).toBe(0);}
 });
});
