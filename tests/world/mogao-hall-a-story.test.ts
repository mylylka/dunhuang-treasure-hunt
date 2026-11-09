import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getMogaoHallAStory } from '../../src/content/world/mogao-hall-a-story';
import { contain, initialStoryFrame, mappedRegion, skipStory, storyExpansion, storyTextCues, tickStory, tickStoryText } from '../../src/world/story-playback';

describe('Huishi Hall continuous mural stories', () => {
  it.each([['bandits', 7], ['burning-house', 2]] as const)('keeps %s on its supplied images with no audio', (id, count) => {
    const mobile = getMogaoHallAStory(id, true);
    const desktop = getMogaoHallAStory(id, false);
    expect(mobile.playback).toBe('text');
    expect(mobile.coordinateSize).toEqual([1, 1]);
    expect(mobile.segments).toHaveLength(count);
    for (const [story, tier] of [[mobile, 'mobile'], [desktop, 'desktop']] as const) {
      for (const part of [story.introduction, ...story.segments, story.ending]) {
        expect(part?.text).toBeTruthy();
        expect(part).not.toHaveProperty('narration');
        expect(part!.cues.map(cue => cue.text).join('').replace(/\s/gu, '')).toBe(part!.text.replace(/\s/gu, ''));
        for (const [index, cue] of part!.cues.entries()) {
          if (part !== story.ending) expect(cue.text.length).toBeLessThanOrEqual(30);
          expect(cue.start).toBe(index === 0 ? 0 : part!.cues[index - 1].end);
          expect(cue.end - cue.start).toBeGreaterThanOrEqual(3.49);
        }
      }
      expect(story.ending.cues).toEqual([{
        text: story.ending.text, start: 0, end: storyTextCues(story.ending.text).at(-1)!.end,
      }]);
      for (const art of [story.fullImage, ...story.segments.flatMap(segment => segment.images)]) {
        expect(art.url).toMatch(new RegExp(`-${tier}\\.webp$`));
        expect(existsSync(new URL(`../../public${art.url.replace(/^\.\//, '/')}`, import.meta.url))).toBe(true);
      }
    }
  });

  it('keeps each local image through its last cue and finishes only after reading the conclusion', () => {
    const story = getMogaoHallAStory('burning-house', true);
    let frame = initialStoryFrame(true);
    const count = story.segments.length;
    const tick = () => { frame = tickStory(frame, 3, count); };
    const read = (cues: typeof story.ending.cues) => {
      const duration = cues.at(-1)!.end;
      const reading = tickStoryText(frame, duration - .05, cues);
      expect(reading.phase).toBe(frame.phase);
      expect(tickStoryText(reading, 0, cues)).toBe(reading);
      frame = tickStoryText(reading, .051, cues);
    };
    expect(skipStory(frame, count)).toBe(frame);
    tick(); expect(frame.phase).toBe('introduction');
    read(story.introduction!.cues);
    for (let index = 0; index < count; index++) {
      expect(frame).toMatchObject({ phase: 'overview', index });
      tick(); expect(frame.phase).toBe('highlight');
      tick(); expect(frame.phase).toBe('advance');
      tick(); expect(frame.phase).toBe('narration');
      expect(storyExpansion(frame)).toBe(1);
      read(story.segments[index].cues);
      expect(frame.phase).toBe('return');
      expect(storyExpansion(frame)).toBe(1);
      tick();
    }
    tick(); expect(frame.phase).toBe('invitation');
    expect(skipStory(frame, count)).toMatchObject({ phase: 'finished', index: count });
    expect(storyExpansion(frame)).toBe(0);
    read(story.ending.cues);
    expect(frame.phase).toBe('finished');
    expect(tickStoryText(frame, 100, story.ending.cues)).toBe(frame);
  });

  it('places the gold frame on the supplied region and starts the push at the calibrated crop', () => {
    const story = getMogaoHallAStory('burning-house', true);
    const art = story.segments[0].images[0];
    const view = contain(story.fullImage.width, story.fullImage.height, { x: 7, y: 7, width: 374, height: 246 });
    const outlined = mappedRegion(view, story.background.scrollRect, story.coordinateSize, art.region);
    const focused = mappedRegion(view, story.background.scrollRect, story.coordinateSize, art.focus!);
    const origin = contain(art.width, art.height, focused);
    expect(outlined).not.toEqual(focused);
    expect(origin.width / origin.height).toBeCloseTo(art.width / art.height, 9);
    expect(origin.y).toBeGreaterThan(outlined.y);
    expect(origin.y + origin.height).toBeLessThan(outlined.y + outlined.height);
  });
});
