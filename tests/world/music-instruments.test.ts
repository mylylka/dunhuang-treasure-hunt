import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusicInstrumentAudio } from '../../src/app/use-music-instrument';
import { getMusicInstrument, MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import { defaultSoundPreferences } from '../../src/services/sound-settings';

class TestAudio extends EventTarget {
  src = '';
  preload = '';
  volume = 1;
  paused = true;
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn((key: string) => { if (key === 'src') this.src = ''; });
  load = vi.fn();
}

function fixture() {
  const media: TestAudio[] = [];
  const ended = vi.fn();
  const status = vi.fn();
  const makeAudio = vi.fn(() => {
    const audio = new TestAudio();
    media.push(audio);
    return audio as unknown as HTMLAudioElement;
  });
  return { player: createMusicInstrumentAudio(status, ended, makeAudio), ended, status, makeAudio, media };
}

const sound = defaultSoundPreferences();
const pipa = '/assets/world/music-instrument-display/v001/audio/pipa.wav';
const zheng = '/assets/world/music-instrument-display/v001/audio/zheng.wav';
afterEach(() => vi.useRealTimers());

describe('second-floor instrument content', () => {
  it('uses the supplied left-to-right order and real audio file types', () => {
    expect(MUSIC_INSTRUMENTS.map(item => item.id)).toEqual([
      'pipa', 'ruan', 'zheng', 'konghou', 'xun', 'sheng', 'dizi', 'bili', 'conch', 'paiban', 'jiegu', 'cymbals',
    ]);
    expect(MUSIC_INSTRUMENTS.filter(item => item.audioPath.endsWith('.mp3')).map(item => item.id)).toEqual(['conch', 'paiban', 'jiegu', 'cymbals']);
    expect(getMusicInstrument('conch')?.sourceImage).toBe('海螺壁画.jpeg');
    expect(getMusicInstrument('bili')?.note).toContain('高音管代听');
    expect(getMusicInstrument('konghou')?.note).toContain('现代复原');
  });
});

describe('instrument audio lifecycle', () => {
  it('starts the one selected track in the same call and releases it on natural end', async () => {
    const { player, media, ended, status, makeAudio } = fixture();
    player.open(pipa);
    expect(makeAudio).toHaveBeenCalledOnce();
    expect(media[0].src).toBe(pipa);
    expect(media[0].play).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(status).toHaveBeenLastCalledWith('playing');
    media[0].dispatchEvent(new Event('ended'));
    expect(ended).toHaveBeenCalledOnce();
    expect(media[0].paused).toBe(true);
    expect(media[0].src).toBe('');
    media[0].dispatchEvent(new Event('ended'));
    expect(ended).toHaveBeenCalledOnce();
  });

  it('makes no audio request when disabled or silent and honors volume and pause on resume', async () => {
    const { player, media, makeAudio, status, ended } = fixture();
    player.configure({ ...sound, enabled: false }, false);
    player.open(pipa);
    player.configure({ ...sound, volume: 0 }, false);
    expect(makeAudio).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith('muted');
    expect(ended).not.toHaveBeenCalled();
    player.configure({ ...sound, volume: .25 }, false);
    await Promise.resolve();
    expect(media[0].volume).toBe(.25);
    expect(status).toHaveBeenLastCalledWith('playing');
    player.configure(sound, true);
    expect(media[0].paused).toBe(true);
    expect(status).toHaveBeenLastCalledWith('paused');
    player.configure(sound, false);
    await Promise.resolve();
    expect(media[0].play).toHaveBeenCalledTimes(2);
    expect(media[0].volume).toBe(sound.volume);
    expect(status).toHaveBeenLastCalledWith('playing');
    player.close();
    expect(media[0].src).toBe('');
    expect(ended).not.toHaveBeenCalled();
  });

  it('ignores stale events after closing and retries only the currently selected item', async () => {
    const { player, media, ended, status } = fixture();
    player.open(pipa);
    player.close();
    player.open(zheng);
    media[0].dispatchEvent(new Event('ended'));
    media[0].dispatchEvent(new Event('error'));
    expect(ended).not.toHaveBeenCalled();
    media[1].dispatchEvent(new Event('error'));
    expect(status).toHaveBeenLastCalledWith('error');
    expect(media[1].src).toBe('');
    player.retry();
    expect(media[2].src).toBe(zheng);
    await Promise.resolve();
    expect(status).toHaveBeenLastCalledWith('playing');
    player.close();
  });

  it('keeps the wall image open for retry if the media stalls', async () => {
    vi.useFakeTimers();
    const { player, media, ended, status } = fixture();
    player.open(pipa);
    await Promise.resolve();
    media[0].dispatchEvent(new Event('waiting'));
    expect(status).toHaveBeenLastCalledWith('loading');
    vi.advanceTimersByTime(10_000);
    expect(status).toHaveBeenLastCalledWith('error');
    expect(media[0].src).toBe('');
    expect(ended).not.toHaveBeenCalled();
    player.close();
  });
});
