import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { getMusicInstrument, type MusicInstrument, type MusicInstrumentId } from '../content/world/music-instruments-v001';
import { defaultSoundPreferences, type SoundPreferences } from '../services/sound-settings';

export type MusicInstrumentAudioStatus = 'loading' | 'playing' | 'paused' | 'muted' | 'error';

interface Playback {
  url: string;
  media?: HTMLAudioElement;
  release?(): void;
  pending?: symbol;
  timeout?: ReturnType<typeof setTimeout>;
  failed: boolean;
}

const STALL_TIMEOUT = 10_000;

/** The first play() runs synchronously inside the instrument click or tap. */
export function createMusicInstrumentAudio(
  onStatus: (status: MusicInstrumentAudioStatus) => void,
  onEnded: () => void,
  makeAudio: () => HTMLAudioElement = () => new Audio(),
) {
  let current: Playback | null = null;
  let preferences = defaultSoundPreferences();
  let blocked = false;
  let status: MusicInstrumentAudioStatus = 'loading';
  const audible = () => preferences.enabled && preferences.volume > 0;
  const allowed = (entry: Playback) => current === entry && audible() && !blocked;

  function report(next: MusicInstrumentAudioStatus) {
    if (status === next) return;
    status = next;
    onStatus(next);
  }

  function pause(entry: Playback) {
    entry.pending = undefined;
    clearTimeout(entry.timeout);
    entry.media?.pause();
  }

  function close() {
    const entry = current;
    current = null;
    if (!entry) return;
    pause(entry);
    entry.release?.();
  }

  function fail(entry: Playback) {
    if (current !== entry) return;
    entry.failed = true;
    pause(entry);
    entry.release?.();
    if (allowed(entry)) report('error');
  }

  function waiting(entry: Playback) {
    if (!allowed(entry)) return;
    report('loading');
    clearTimeout(entry.timeout);
    entry.timeout = setTimeout(() => fail(entry), STALL_TIMEOUT);
  }

  function attach(entry: Playback) {
    const audio = makeAudio();
    const onWait = () => waiting(entry);
    const onPlay = () => {
      if (!allowed(entry) || entry.media !== audio) return;
      clearTimeout(entry.timeout);
      report('playing');
    };
    const onError = () => fail(entry);
    const finish = () => {
      if (current !== entry || entry.media !== audio) return;
      close();
      onEnded();
    };
    audio.addEventListener('waiting', onWait);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', finish);
    entry.media = audio;
    entry.release = () => {
      audio.removeEventListener('waiting', onWait);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', finish);
      entry.media = undefined;
      entry.release = undefined;
      audio.removeAttribute('src');
      audio.load();
    };
    audio.preload = 'none';
    audio.src = entry.url;
    return audio;
  }

  function apply() {
    const entry = current;
    if (!entry) return;
    if (!audible() || blocked) {
      pause(entry);
      report(audible() ? 'paused' : 'muted');
      return;
    }
    if (entry.failed) { report('error'); return; }
    try {
      const audio = entry.media ?? attach(entry);
      audio.volume = preferences.volume;
      if (entry.pending || !audio.paused) return;
      const attempt = Symbol();
      entry.pending = attempt;
      waiting(entry);
      void audio.play().then(() => {
        if (entry.pending !== attempt) {
          if (entry.media !== audio || !allowed(entry)) audio.pause();
          return;
        }
        entry.pending = undefined;
        clearTimeout(entry.timeout);
        if (allowed(entry)) report('playing');
      }, () => {
        if (entry.pending === attempt) fail(entry);
      });
    } catch { fail(entry); }
  }

  return {
    open(url: string) {
      close();
      current = { url, failed: false };
      apply();
    },
    configure(sound: SoundPreferences, paused: boolean) {
      preferences = sound;
      blocked = paused;
      apply();
    },
    retry() {
      if (!current?.failed) return;
      current.failed = false;
      apply();
    },
    close,
  };
}

export function useMusicInstrument(sound: SoundPreferences, blocked: boolean) {
  const [instrument, setInstrument] = useState<MusicInstrument | null>(null);
  const [status, setStatus] = useState<MusicInstrumentAudioStatus>('loading');
  const active = useRef(false);
  const backgrounded = useRef(false);
  const conditions = useRef({ sound, blocked });
  conditions.current = { sound, blocked };
  const playbackRef = useRef<ReturnType<typeof createMusicInstrumentAudio> | null>(null);
  const clearSelection = useCallback(() => {
    active.current = false;
    setInstrument(null);
  }, []);
  playbackRef.current ??= createMusicInstrumentAudio(setStatus, clearSelection);
  const playback = playbackRef.current;

  const sync = useCallback(() => playback.configure(conditions.current.sound,
    conditions.current.blocked || backgrounded.current || document.hidden), [playback]);
  const closeInstrument = useCallback(() => {
    playback.close();
    clearSelection();
  }, [playback, clearSelection]);

  useLayoutEffect(sync, [sync, sound, blocked]);
  useEffect(() => {
    const blur = () => { backgrounded.current = true; sync(); };
    const focus = () => { backgrounded.current = false; sync(); };
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    window.addEventListener('pagehide', closeInstrument);
    window.addEventListener('pageshow', focus);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.removeEventListener('pagehide', closeInstrument);
      window.removeEventListener('pageshow', focus);
      document.removeEventListener('visibilitychange', sync);
      playback.close();
      active.current = false;
    };
  }, [closeInstrument, playback, sync]);

  const startInstrument = useCallback((id: MusicInstrumentId) => {
    const item = getMusicInstrument(id);
    if (!item || active.current || conditions.current.blocked || backgrounded.current || document.hidden) return false;
    active.current = true;
    setInstrument(item);
    sync();
    playback.open(worldAssetUrl(item.audioPath));
    return true;
  }, [playback, sync]);

  return { instrument, status, startInstrument, closeInstrument, retryInstrument: playback.retry };
}
