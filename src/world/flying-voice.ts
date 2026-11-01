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
export function createFlyingVoice(media: HTMLAudioElement | null, initial: SoundPreferences) {
  let active = false, due = false, blocked = false, disposed = false, ended = false;
  let status: FlyingVoiceState['status'] = media ? 'loading' : 'missing';
  let preferences = initial, pending = false, generation = 0;
  const allowed = () => active && due && !blocked && !disposed && !ended;
  function apply() {
    if (!media || disposed) return;
    media.volume = Math.max(0, Math.min(1, preferences.volume));
    media.muted = !preferences.enabled;
    if (!allowed()) { media.pause(); return; }
    if (status === 'error' || status === 'blocked' || pending || !media.paused) return;
    const attempt = generation;
    pending = true;
    void media.play().then(() => {
      // A browser may settle play() after exit, pause or a background switch.
      if (!allowed()) media.pause();
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
  if (media) {
    media.preload = 'auto';
    media.addEventListener('canplay', ready);
    media.addEventListener('error', failed);
    media.addEventListener('ended', finish);
  }
  return {
    enter() {
      if (disposed) return;
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
      if (!media || disposed) return;
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
      disposed = true; active = false; generation++;
      if (media) {
        media.pause(); media.removeEventListener('canplay', ready);
        media.removeEventListener('error', failed); media.removeEventListener('ended', finish);
        media.removeAttribute('src'); media.load();
      }
    },
  };
}
