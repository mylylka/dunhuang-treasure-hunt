import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { deerStoryV009 } from '../../src/content/world/deer-introduction-v009';
import { getMogaoHallAStory } from '../../src/content/world/mogao-hall-a-story';
import { getMogaoMuralNarration, mogaoMuralSubtitleAt } from '../../src/content/world/mogao-mural-audio-v001';
import { buddhaNarrationFor, buddhaSubtitleAt } from '../../src/content/world/buddha-narration';
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

  it('turns only the Bandits restored-sight passage at the second paragraph in the recording', () => {
    const restored = getMogaoMuralNarration('bandits', 'restored-sight')!;
    const [first, second] = restored.text.split('\n');
    expect(mogaoMuralSubtitleAt(restored, 0)).toBe(first);
    expect(mogaoMuralSubtitleAt(restored, 27.74)).toBe(first);
    expect(mogaoMuralSubtitleAt(restored, 27.75)).toBe(second);
    expect(mogaoMuralSubtitleAt(restored, restored.duration)).toBe(second);
    const ending = getMogaoMuralNarration('bandits', 'ending')!;
    expect(mogaoMuralSubtitleAt(ending, 0)).toBe(ending.text);
  });

  it('shows the corrected Buddha captions one sentence at a time and retains the disclaimer', () => {
    const captions = [0, 8.74, 19.13, 22.05].map(time => buddhaSubtitleAt(true, time));
    expect(captions.join('')).toBe(buddhaNarrationFor(true).text);
    expect(captions[1]).toContain('通高35.5米');
    expect(captions[2]).toBe('其右手上扬，施无畏印。');
    expect(captions[3]).toContain('左手平伸，施与愿印。');
    expect(buddhaSubtitleAt(false, 0)).toBe(buddhaNarrationFor(false).text);
  });
});
