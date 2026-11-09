import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { deerStoryV009 } from '../../src/content/world/deer-introduction-v009';
import { getMogaoHallAStory } from '../../src/content/world/mogao-hall-a-story';
import { getMogaoMuralNarration } from '../../src/content/world/mogao-mural-audio-v001';
import { noviceStory } from '../../src/content/world/novice-story';

describe('exhibition mural narration', () => {
  it('covers the exact 25 exhibit passages with contiguous captions and archived runtime audio', () => {
    const sources = [
      { story: deerStoryV009, includeEnding: false },
      { story: noviceStory, includeEnding: false },
      { story: getMogaoHallAStory('bandits', false), includeEnding: true },
      { story: getMogaoHallAStory('burning-house', true), includeEnding: true },
    ];
    const paths = new Set<string>();
    for (const { story, includeEnding } of sources) {
      const parts = [story.introduction!, ...story.segments, ...(includeEnding ? [story.ending] : [])];
      for (const part of parts) {
        const recording = getMogaoMuralNarration(story.id, part.id);
        expect(recording, `${story.id} / ${part.id}`).toBeDefined();
        if (!recording) continue;
        if (story.id === 'bandits' && part.id === 'defeat') {
          expect(recording.url).toBe('/assets/world/mogao-narration/v001/bandits-defeat.mp3');
          expect(getMogaoMuralNarration(story.id, part.id)).toBe(recording);
        } else {
          expect(recording.url).toContain('/assets/world/mogao-mural-audio/v001/');
        }
        expect(existsSync(`public${recording.url}`)).toBe(true);
        expect(recording.cues[0].start).toBe(0);
        expect(recording.cues.at(-1)?.end).toBe(recording.duration);
        expect(recording.cues.every((cue, i) => cue.start === (recording.cues[i - 1]?.end ?? 0)
          && cue.start < cue.end && !cue.text.includes('分段'))).toBe(true);
        if (part.id === 'ending') expect(recording.cues).toHaveLength(1);
        paths.add(recording.url);
      }
      if (!includeEnding) expect(getMogaoMuralNarration(story.id, story.ending.id)).toBeUndefined();
    }
    expect(paths.size).toBe(25);
  });

  it('matches the supplied reading without changing the legacy deer manuscript', () => {
    const [first, , , , last] = deerStoryV009.segments;
    expect(first.text).toContain('因之');
    expect(last.text).toContain('生疮而死');
    expect(getMogaoMuralNarration(deerStoryV009.id, first.id)?.text).toContain('溺水人许诺');
    expect(getMogaoMuralNarration(deerStoryV009.id, last.id)?.text).toContain('生疮死');
  });
});
