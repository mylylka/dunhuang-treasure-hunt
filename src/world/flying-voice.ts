import { registerSpeechSkip } from '../services/speech-skip';
import type { SoundPreferences } from '../services/sound-settings';

export interface FlyingVoiceState {
  status: 'missing' | 'loading' | 'ready' | 'error' | 'blocked';
  active: boolean;
  playing: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
}

/** A single region-owned narration track, independent of the short UI sound pool. */
export function createFlyingVoice(source: HTMLAudioElement | (() => HTMLAudioElement) | null, initial: SoundPreferences,
  { keyboardSkip = true }: { keyboardSkip?: boolean } = {}) {
  let media = typeof source === 'function' ? null : source;
  let active = false, due = false, blocked = false, disposed = false, ended = false;
  let status: FlyingVoiceState['status'] = source ? 'loading' : 'missing';
  let preferences = initial, pending = false, generation = 0;
  function skip() {
    if (!active || !due || blocked || disposed || ended) return false;
    generation++; ended = true; media?.pause(); return true;
  }
  const unregisterSkip = keyboardSkip ? registerSpeechSkip(skip) : undefined;
  const allowed = () => active && due && !blocked && !disposed && !ended;
  function apply() {
    const audio = media;
    if (!audio || disposed) return;
    audio.volume = Math.max(0, Math.min(1, preferences.volume));
    audio.muted = !preferences.enabled;
    if (!allowed()) { audio.pause(); return; }
    if (status === 'error' || status === 'blocked' || pending || !audio.paused) return;
    const attempt = generation;
    pending = true;
    void audio.play().then(() => {
      // A browser may settle play() after exit, pause or a background switch.
      if (!allowed()) audio.pause();
    }).catch(error => {
      if (disposed || attempt !== generation || !allowed()) return;
      status = error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'error';
    }).finally(() => {
      pending = false;
      // Replay can arrive while the preceding play() request is still pending.
      if (!disposed && attempt !== generation && allowed()) apply();
    });
  }
  function ready() { if (!disposed && status !== 'blocked') status = 'ready'; }
  function failed() { if (!disposed) { status = 'error'; media?.pause(); } }
  function finish() { ended = true; }
  function attach(audio: HTMLAudioElement) {
    audio.preload = 'auto';
    audio.addEventListener('canplay', ready);
    audio.addEventListener('error', failed);
    audio.addEventListener('ended', finish);
  }
  function ensureMedia() {
    if (media || typeof source !== 'function') return;
    try { media = source(); attach(media); }
    catch { status = 'error'; }
  }
  if (media) attach(media);
  return {
    skip,
    enter() {
      if (disposed) return;
      ensureMedia();
      generation++; active = true; due = false; ended = false;
      if (media) { media.pause(); media.currentTime = 0; }
    },
    update(shouldSpeak: boolean) { due = shouldSpeak; apply(); },
    setBlocked(value: boolean) {
      // pause() can reject a pending play() later; it is not a loading failure.
      if (value && !blocked) generation++;
      blocked = value; apply();
    },
    setPreferences(value: SoundPreferences) { preferences = value; apply(); },
    retry() {
      if (disposed) return;
      ensureMedia();
      if (!media) return;
      generation++; ended = false;
      if (status === 'error') { status = 'loading'; media.load(); }
      else if (status === 'blocked') status = 'ready';
      media.currentTime = 0;
      apply();
    },
    exit() {
      generation++; active = false; due = false; ended = false;
      if (media) { media.pause(); media.currentTime = 0; }
    },
    inspect(): FlyingVoiceState {
      return { status, active, ended,
        playing: !!media && allowed() && !media.paused && media.readyState >= 2 && !media.muted && media.volume > 0 && status === 'ready',
        currentTime: media?.currentTime ?? 0,
        duration: media && Number.isFinite(media.duration) ? media.duration : 0 };
    },
    dispose() {
      if (disposed) return;
      disposed = true; active = false; generation++; unregisterSkip?.();
      if (media) {
        media.pause(); media.removeEventListener('canplay', ready);
        media.removeEventListener('error', failed); media.removeEventListener('ended', finish);
        media.removeAttribute('src'); media.load();
      }
    },
  };
}
