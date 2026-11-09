import { afterEach, expect, it, vi } from 'vitest';
import { soundPlayer } from '../../src/services/sound';
import { createFirstGalleryNarration } from '../../src/world/first-gallery-narration';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('plays subsequent mural clips on the same gesture-authorized context', async () => {
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  const context = {
    state: 'running', currentTime: 0, destination: {},
    decodeAudioData: vi.fn(async () => ({ duration: 3 })),
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
    createBufferSource() {
      const source = { start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), onended: null };
      sources.push(source);
      return source;
    },
  };
  vi.spyOn(soundPlayer, 'playbackContext').mockReturnValue(context as unknown as AudioContext);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([0]))));
  const narration = createFirstGalleryNarration({ version: 1, enabled: true, volume: .4 });
  const finished = vi.fn();
  narration.play('mural', 'mural-wall', finished);
  // An expensive scene frame from before the line started must not consume it.
  narration.update(8);
  expect(finished).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(narration.inspect()?.playing).toBe(true));
  expect(sources[0].start).toHaveBeenCalledWith(0, 0);

  context.currentTime = 1;
  narration.setBlocked(true);
  expect(sources[0].stop).toHaveBeenCalledOnce();
  narration.setBlocked(false);
  expect(sources[1].start).toHaveBeenCalledWith(0, 1);
  sources[1].onended?.();
  narration.update(.1);
  expect(finished).toHaveBeenCalledWith('finished');

  narration.play('mural', 'mural-table', finished);
  await vi.waitFor(() => expect(narration.inspect()?.playing).toBe(true));
  expect(sources[2].start).toHaveBeenCalledWith(0, 0);
  expect(context.decodeAudioData).toHaveBeenCalledTimes(2);
  expect(narration.skip('mural')).toBe(true);
  expect(sources[2].stop).toHaveBeenCalledOnce();
  expect(finished).toHaveBeenLastCalledWith('skipped');
});
