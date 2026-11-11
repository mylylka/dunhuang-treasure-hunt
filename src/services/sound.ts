import type { SoundCue } from '../types';
import { defaultSoundPreferences } from './sound-settings';

const intervals: Record<SoundCue, number> = { button: 80, rotate: 70, success: 75, error: 180, fill: 75, hint: 160, complete: 1000 };
const priorities: Record<SoundCue, number> = { button: 0, rotate: 1, success: 2, error: 1, fill: 1, hint: 2, complete: 3 };
const fadeSeconds = .012;
const maxRequestAge = 650;

export function soundUrl(cue: SoundCue): string {
  return new URL(`${import.meta.env.BASE_URL}assets/shared/audio/warm-v001/warm-${cue}.wav`, document.baseURI).href;
}

export interface SoundPlayer {
  unlock(): Promise<void>;
  prepare(cue: SoundCue): Promise<void>;
  play(cue: SoundCue): void;
  playPrepared(cue: SoundCue): boolean;
  stopCue(cue: SoundCue): void;
  setPreferences(preferences: { enabled: boolean; volume: number }): void;
  stop(): void;
  dispose(): void;
  playbackContext(): AudioContext | null;
}

export interface SoundDependencies {
  createContext?: () => AudioContext | null;
  loadBuffer?: (context: AudioContext, cue: SoundCue) => Promise<AudioBuffer>;
  isHidden?: () => boolean;
  now?: () => number;
}

interface Voice { cue: SoundCue; source: AudioBufferSourceNode; gain: GainNode; endsAt: number; startsAt: number }
interface PendingSound { cue: SoundCue; token: number; requestedAt: number; context: AudioContext; buffer?: AudioBuffer }

/** The game has a single sound channel. Scenes send feedback; they never own audio contexts. */
export function createSoundPlayer(dependencies: SoundDependencies = {}): SoundPlayer {
  const createContext = dependencies.createContext ?? (() => {
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Constructor ? new Constructor() : null;
  });
  const loadBuffer = dependencies.loadBuffer ?? (async (context: AudioContext, cue: SoundCue) => {
    const response = await fetch(soundUrl(cue));
    if (!response.ok) throw new Error('Sound unavailable');
    return context.decodeAudioData(await response.arrayBuffer());
  });
  const isHidden = dependencies.isHidden ?? (() => typeof document !== 'undefined' && document.hidden);
  const now = dependencies.now ?? (() => performance.now());
  const defaults = defaultSoundPreferences();
  let preferences = { enabled: defaults.enabled, volume: defaults.volume };
  let context: AudioContext | null = null;
  let unlocked = false;
  let disposed = false;
  let generation = 0;
  let active: Voice | null = null;
  let reserved: { cue: SoundCue; until: number } | null = null;
  let silencedAt = 0;
  let resumeAttempt = 0;
  let pending: PendingSound | null = null;
  const buffers = new Map<SoundCue, Promise<AudioBuffer>>();
  const prepared = new Map<SoundCue, AudioBuffer>();
  const recent = new Map<SoundCue, number>();
  const voices = new Set<Voice>();

  function stopVoice(voice: Voice): number {
    if (!context) return 0;
    const at = context.currentTime;
    const end = voice.startsAt > at ? at : at + fadeSeconds;
    try {
      voice.gain.gain.cancelScheduledValues(at);
      voice.gain.gain.setValueAtTime(voice.startsAt > at ? 0 : voice.gain.gain.value, at);
      voice.gain.gain.linearRampToValueAtTime(0, end);
      voice.source.stop(end);
      silencedAt = Math.max(silencedAt, end);
    } catch { /* A source may already have ended between the feedback and stop. */ }
    return end;
  }

  function stop() {
    generation++;
    pending = null;
    reserved = null;
    for (const voice of voices) stopVoice(voice);
    active = null;
  }

  function playPending() {
    const request = pending;
    if (!request) return false;
    const { cue, token, requestedAt, context: audioContext, buffer } = request;
    if (token !== generation || disposed || !unlocked || !preferences.enabled || preferences.volume === 0 || isHidden()
      || now() - requestedAt > maxRequestAge) {
      pending = null;
      if (token === generation) reserved = null;
      return false;
    }
    if (!buffer || audioContext.state !== 'running') return false;
    pending = null;
    try {
      // The old sound fades out before the new one starts: rapid input cannot stack voices.
      const startsAt = Math.max(silencedAt, active ? stopVoice(active) : audioContext.currentTime);
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0, audioContext.currentTime);
      gain.gain.setValueAtTime(0, startsAt);
      gain.gain.linearRampToValueAtTime(preferences.volume, startsAt + .003);
      const voice = { cue, source, gain, startsAt, endsAt: startsAt + buffer.duration };
      voices.add(voice);
      source.onended = () => {
        source.disconnect(); gain.disconnect(); voices.delete(voice);
        if (active === voice) active = null;
      };
      active = voice;
      reserved = null;
      source.start(startsAt);
      return true;
    } catch {
      reserved = null;
      // Optional feedback must never stop play if the platform refuses audio.
      return false;
    }
  }

  function unlock(): Promise<void> {
    if (disposed || !preferences.enabled || preferences.volume === 0 || isHidden()) return Promise.resolve();
    try {
      // Creation and resume happen synchronously in the player's accepted gesture handler.
      context ??= createContext();
      if (!context || context.state === 'closed') return Promise.resolve();
      unlocked = true;
      if (context.state === 'running') { playPending(); return Promise.resolve(); }
      const audioContext = context;
      const attempt = ++resumeAttempt;
      // A disallowed or interrupted resume can stay pending. Each new gesture must
      // make its own synchronous attempt rather than wait behind that old promise.
      return audioContext.resume().then(() => {
        if (disposed || context !== audioContext) return;
        if (audioContext.state === 'running') { unlocked = true; playPending(); }
      }).catch(() => {
        if (disposed || context !== audioContext) return;
        if (attempt === resumeAttempt && audioContext.state !== 'running') unlocked = false;
        playPending();
      });
    } catch {
      unlocked = false;
      return Promise.resolve();
    }
  }

  function bufferFor(audioContext: AudioContext, cue: SoundCue) {
    let promise = buffers.get(cue);
    if (!promise) {
      promise = Promise.resolve().then(() => loadBuffer(audioContext, cue));
      buffers.set(cue, promise);
      const loading = promise;
      void promise.then(buffer => {
        if (buffers.get(cue) === loading) prepared.set(cue, buffer);
      }, () => {
        if (buffers.get(cue) === loading) buffers.delete(cue);
      });
    }
    return promise;
  }

  async function prepare(cue: SoundCue) {
    if (disposed || !unlocked || !context || context.state === 'closed' || !preferences.enabled || !preferences.volume || isHidden()) return;
    try { await bufferFor(context, cue); } catch { /* The scene can still play without its cue. */ }
  }

  function queue(cue: SoundCue, preparedOnly: boolean) {
    if (!Object.hasOwn(intervals, cue) || disposed || !unlocked || !context || context.state === 'closed' || !preferences.enabled || preferences.volume === 0 || isHidden()) return false;
    const buffer = prepared.get(cue);
    if (preparedOnly && (!buffer || context.state !== 'running')) return false;
    const requestedAt = now();
    if (requestedAt - (recent.get(cue) ?? -Infinity) < intervals[cue]) return false;
    if (reserved && reserved.until > requestedAt && priorities[reserved.cue] > priorities[cue]) return false;
    if (active && active.endsAt > context.currentTime && priorities[active.cue] > priorities[cue]) return false;
    recent.set(cue, requestedAt);
    const token = ++generation;
    const audioContext = context;
    const request: PendingSound = { cue, token, requestedAt, context: audioContext, buffer };
    pending = request;
    reserved = { cue, until: requestedAt + maxRequestAge };
    if (preparedOnly) return playPending();
    void (async () => {
      try {
        const buffer = await bufferFor(audioContext, cue);
        if (pending !== request) return;
        request.buffer = buffer;
        playPending();
      } catch {
        if (pending === request) { pending = null; reserved = null; }
        // Audio is optional feedback. Failed downloads, decoding or platform policy never stop play.
      }
    })();
    return false;
  }

  function stopCue(cue: SoundCue) {
    if (pending?.cue === cue) { pending = null; reserved = null; }
    for (const voice of voices) if (voice.cue === cue) stopVoice(voice);
    if (active?.cue === cue) active = null;
  }

  function setPreferences(next: { enabled: boolean; volume: number }) {
    preferences = { enabled: next.enabled, volume: Number.isFinite(next.volume) ? Math.max(0, Math.min(1, next.volume)) : .4 };
    if (!preferences.enabled || preferences.volume === 0) { stop(); return; }
    if (active && context) {
      try {
        const at = Math.max(context.currentTime, active.startsAt);
        active.gain.gain.cancelScheduledValues(at);
        active.gain.gain.setValueAtTime(active.gain.gain.value, at);
        active.gain.gain.linearRampToValueAtTime(preferences.volume, at + fadeSeconds);
      } catch { /* Ignore a source that ended while adjusting volume. */ }
    }
  }

  function dispose() {
    stop(); disposed = true; unlocked = false; buffers.clear(); prepared.clear();
    if (context) { void context.close().catch(() => {}); context = null; }
  }

  return { unlock, prepare, play: cue => { queue(cue, false); }, playPrepared: cue => queue(cue, true),
    stopCue, setPreferences, stop, dispose,
    // Long narration uses its own gain and source on the gesture-authorized context.
    playbackContext: () => unlocked && context?.state !== 'closed' ? context : null };
}

// Construction has no browser/audio side effects; the first explicit gesture calls unlock().
export const soundPlayer = createSoundPlayer();
