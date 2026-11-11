import { afterEach, describe, expect, it, vi } from 'vitest';
import audio from '../../src/content/world/flying-history-audio-v001.json';
import chapterText from '../../src/content/world/flying-history-text-v001.json';
import { createFlyingHistory } from '../../src/world/flying-history';

const silent = { version: 1, enabled: false, volume: 0 } as const;

function fixture(failFirst = false, waitForCaption = false) {
  const display = { show: vi.fn(), reveal: vi.fn(), highlight: vi.fn() };
  const close = vi.fn();
  const requests: string[] = [];
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requests.push(url);
    if (failFirst && requests.length === 1) return new Response(null, { status: 503 });
    return new Response(new Blob(['art']));
  }));
  const chapterShown = vi.fn();
  const history = createFlyingHistory(display, silent, chapterShown, waitForCaption);
  const tick = (seconds = .1) => history.update(seconds, true, true, true);
  const waitFor = async (phase: string) => {
    await vi.waitFor(() => {
      tick();
      expect(history.snapshot()?.phase).toBe(phase);
    });
  };
  function start(following = false) {
    history.enter(following);
    tick();
    expect(history.snapshot()).toMatchObject({ phase: 'opening', speaker: 'flying' });
    history.control({ type: 'skip' });
    expect(history.snapshot()?.phase).toBe('invite');
    expect(requests).toHaveLength(0);
    history.control({ type: 'start' });
  }
  return { history, display, close, requests, tick, waitFor, start, chapterShown };
}

afterEach(() => vi.unstubAllGlobals());

describe('flying mural history', () => {
  it('waits for the current caption before advancing either narration clock', async () => {
    const { history, tick, waitFor } = fixture(false, true);
    history.enter(false);
    tick();
    tick(3);
    expect(history.snapshot()).toMatchObject({ phase: 'opening', audioTime: 0, subtitle: audio.opening.cues[0].text });
    history.setCaptionPresented('opening', null, true);
    tick(1);
    expect(history.snapshot()?.audioTime).toBe(1);
    history.control({ type: 'skip' });
    history.control({ type: 'start' });
    await waitFor('chapter');
    tick(3);
    expect(history.snapshot()?.audioTime).toBe(0);
    history.setCaptionPresented('opening', null, true);
    tick(1);
    expect(history.snapshot()?.audioTime).toBe(0);
    history.setCaptionPresented('chapter', 0, true);
    tick(1);
    expect(history.snapshot()?.audioTime).toBe(1);
    history.setCaptionPresented('chapter', 0, false);
    tick(1);
    expect(history.snapshot()?.audioTime).toBe(1);
    history.dispose();
  });

  it('shows the three opening paragraphs in full at their narration boundaries', () => {
    const { history, tick } = fixture();
    history.enter(false);
    tick();
    const [greeting, flight, changes] = audio.opening.cues;
    expect(audio.opening.cues).toHaveLength(3);
    expect(history.snapshot()?.subtitle).toBe(greeting.text);
    tick(2.5);
    expect(history.snapshot()?.subtitle).toBe(greeting.text);
    tick(.2);
    expect(history.snapshot()?.subtitle).toBe(flight.text);
    tick(11);
    expect(history.snapshot()?.subtitle).toBe(flight.text);
    tick(.3);
    expect(history.snapshot()?.subtitle).toBe(changes.text);
    tick(8);
    expect(history.snapshot()?.subtitle).toBe(changes.text);
    tick(.3);
    expect(history.snapshot()).toMatchObject({ phase: 'invite', subtitle: '' });
  });

  it('keeps only the next chapter ready and ignores skip during a transition or menu', async () => {
    const { history, display, close, requests, tick, waitFor, start, chapterShown } = fixture();
    start(true);
    await waitFor('transition');
    history.control({ type: 'skip' });
    expect(history.snapshot()).toMatchObject({ phase: 'transition', chapter: 0 });
    expect(chapterShown).not.toHaveBeenCalled();
    expect(requests.map(url => url.split('/').at(-1))).toEqual(['chapter-01.webp', 'chapter-02.webp']);
    tick();
    tick(.5);
    expect(history.snapshot()).toMatchObject({ phase: 'chapter', speaker: 'guide', audioPath: audio.guide[0].path });

    history.control({ type: 'toggle-menu' });
    const offset = history.snapshot()!.audioTime;
    history.control({ type: 'skip' });
    tick(10);
    expect(history.snapshot()).toMatchObject({ chapter: 0, menuOpen: true, audioTime: offset });
    history.control({ type: 'select', chapter: 8 });
    await waitFor('chapter');
    expect(history.snapshot()).toMatchObject({ chapter: 8, menuOpen: false, audioPath: audio.guide[8].path });
    history.control({ type: 'skip' });
    expect(history.snapshot()?.phase).toBe('complete');
    expect(chapterShown.mock.calls).toEqual([[0], [8]]);
    history.leave();
    expect(history.snapshot()).toBeUndefined();
    expect(display.show).toHaveBeenLastCalledWith(null);
    expect(close).toHaveBeenCalledTimes(3);
  });

  it('offers image retry and keeps the solo narrator after recovery', async () => {
    const { history, requests, waitFor, start, chapterShown } = fixture(true);
    start();
    await waitFor('image-error');
    expect(chapterShown).not.toHaveBeenCalled();
    history.control({ type: 'retry' });
    await waitFor('chapter');
    expect(history.snapshot()).toMatchObject({ chapter: 0, speaker: 'flying', audioPath: audio.flying[0].path });
    expect(chapterShown.mock.calls).toEqual([[0]]);
    expect(requests.map(url => url.split('/').at(-1))).toEqual(['chapter-01.webp', 'chapter-01.webp', 'chapter-02.webp']);
    history.dispose();
  });

  it('holds the current narration when looking at a mural detail', async () => {
    const { history, start, tick, waitFor } = fixture();
    start();
    await waitFor('chapter');
    tick(1);
    history.control({ type: 'set-detail', open: true });
    history.control({ type: 'skip' });
    tick(5);
    expect(history.snapshot()).toMatchObject({ chapter: 0, detailOpen: true, canSkip: false, audioTime: 1 });
    history.control({ type: 'set-detail', open: false });
    tick(1);
    expect(history.snapshot()).toMatchObject({ chapter: 0, detailOpen: false, audioTime: 2 });
    history.dispose();
  });

  it('advances on the caption clock when audio is unavailable, with a full second to view the wall', async () => {
    const { history, tick, waitFor, start } = fixture();
    start();
    await waitFor('chapter');
    expect(history.snapshot()?.subtitle).toBe(chapterText[0]);
    history.setSound({ version: 1, enabled: true, volume: .4 });
    tick(5);
    expect(history.snapshot()?.subtitle).toBe(chapterText[0]);
    tick(audio.flying[0].duration);
    expect(history.snapshot()).toMatchObject({ chapter: 0, phase: 'hold', audioPlaying: false, subtitle: chapterText[0] });
    tick(.95);
    expect(history.snapshot()?.phase).toBe('hold');
    tick(.06);
    await waitFor('chapter');
    expect(history.snapshot()).toMatchObject({ chapter: 1, speaker: 'flying', audioPath: audio.flying[1].path });
    history.dispose();
  });
});
