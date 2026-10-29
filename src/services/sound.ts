import type { SoundCue } from '../types';
import { defaultSoundPreferences } from './sound-settings';

const cues: SoundCue[] = ['button', 'rotate', 'success', 'error', 'fill', 'hint', 'complete'];
const intervals: Record<SoundCue, number> = { button: 80, rotate: 70, success: 75, error: 180, fill: 75, hint: 160, complete: 1000 };
const priorities: Record<SoundCue, number> = { button: 0, rotate: 1, success: 2, error: 1, fill: 1, hint: 2, complete: 3 };
const fadeSeconds = .012;
const maxRequestAge = 650;

export function soundUrl(cue: SoundCue): string {
  return new URL(`${import.meta.env.BASE_URL}assets/shared/audio/warm-v001/warm-${cue}.wav`, document.baseURI).href;
}

export interface SoundPlayer {
  unlock(): Promise<void>;
  play(cue: SoundCue): void;
  setPreferences(preferences: { enabled: boolean; volume: number }): void;
  stop(): void;
  dispose(): void;
}

export interface SoundDependencies {
  createContext?: () => AudioContext | null;
  loadBuffer?: (context: AudioContext, cue: SoundCue) => Promise<AudioBuffer>;
  isHidden?: () => boolean;
  now?: () => number;
}

interface Voice { cue: SoundCue; source: AudioBufferSourceNode; gain: GainNode; endsAt: number; startsAt: number }

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
  let resumePromise: Promise<void> | null = null;
  const buffers = new Map<SoundCue, Promise<AudioBuffer>>();
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
    reserved = null;
    for (const voice of voices) stopVoice(voice);
    active = null;
  }

  function unlock(): Promise<void> {
    if (disposed || !preferences.enabled || preferences.volume === 0 || isHidden()) return Promise.resolve();
    try {
      // Creation and resume happen synchronously in the player's pointer/key handler.
      context ??= createContext();
      if (!context || context.state === 'closed') return Promise.resolve();
      unlocked = true;
      if (context.state === 'running') return Promise.resolve();
      if (!resumePromise) {
        resumePromise = context.resume().catch(() => { unlocked = false; }).finally(() => { resumePromise = null; });
      }
      return resumePromise;
    } catch {
      unlocked = false;
      return Promise.resolve();
    }
  }

  function play(cue: SoundCue) {
    if (!cues.includes(cue) || disposed || !unlocked || !context || context.state === 'closed' || !preferences.enabled || preferences.volume === 0 || isHidden()) return;
    const requestedAt = now();
    if (requestedAt - (recent.get(cue) ?? -Infinity) < intervals[cue]) return;
    if (reserved && reserved.until > requestedAt && priorities[reserved.cue] > priorities[cue]) return;
    if (active && active.endsAt > context.currentTime && priorities[active.cue] > priorities[cue]) return;
    recent.set(cue, requestedAt);
    const token = ++generation;
    const audioContext = context;
    reserved = { cue, until: requestedAt + maxRequestAge };
    if (!buffers.has(cue)) {
      const promise = Promise.resolve().then(() => loadBuffer(audioContext, cue));
      buffers.set(cue, promise);
      void promise.catch(() => { if (buffers.get(cue) === promise) buffers.delete(cue); });
    }
    void (async () => {
      try {
        if (resumePromise) await resumePromise;
        const buffer = await buffers.get(cue)!;
        if (token !== generation || disposed || !unlocked || !preferences.enabled || preferences.volume === 0 || isHidden()
          || audioContext.state !== 'running' || now() - requestedAt > maxRequestAge) {
          if (token === generation) reserved = null;
          return;
        }
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
      } catch {
        if (token === generation) reserved = null;
        // Audio is optional feedback. Failed downloads, decoding or platform policy never stop play.
      }
    })();
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
    stop(); disposed = true; unlocked = false; buffers.clear();
    if (context) { void context.close().catch(() => {}); context = null; }
  }

  return { unlock, play, setPreferences, stop, dispose };
}

// Construction has no browser/audio side effects; the first explicit gesture calls unlock().
export const soundPlayer = createSoundPlayer();
