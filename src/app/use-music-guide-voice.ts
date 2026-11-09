import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { MUSIC_GUIDE_LINES, type MusicGuideLineId } from '../content/world/music-guide-v001';
import type { SoundPreferences } from '../services/sound-settings';
import { listenForSoundGestures } from './useSound';

interface VoiceLine {
  id: MusicGuideLineId;
  request: AbortController;
  buffer?: AudioBuffer;
  loading?: boolean;
  failed?: boolean;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  startedAt: number;
  offset: number;
}

export function useMusicGuideVoice(enabled: boolean, line: MusicGuideLineId | null, blocked: boolean,
  sound: SoundPreferences, onEnded: (line: MusicGuideLineId) => void,
  onPlaying: (line: MusicGuideLineId, playing: boolean) => void) {
  const context = useRef<AudioContext | null>(null);
  const current = useRef<VoiceLine | null>(null);
  const state = useRef({ blocked, sound, onEnded, onPlaying });
  state.current = { blocked, sound, onEnded, onPlaying };

  const pause = useCallback(() => {
    const clip = current.current;
    const audio = context.current;
    if (!clip?.source || !audio) return;
    clip.offset += Math.max(0, audio.currentTime - clip.startedAt);
    clip.source.onended = null;
    clip.source.stop();
    clip.source.disconnect();
    clip.gain?.disconnect();
    clip.source = undefined;
    clip.gain = undefined;
    state.current.onPlaying(clip.id, false);
  }, []);

  const stop = useCallback(() => {
    pause();
    current.current?.request.abort();
    current.current = null;
  }, [pause]);

  const apply = useCallback(function applyVoice() {
    const clip = current.current;
    const audio = context.current;
    const { blocked, sound } = state.current;
    if (blocked || document.hidden || !sound.enabled || sound.volume <= 0) {
      pause();
      return;
    }
    if (!clip || !audio || audio.state !== 'running' || clip.failed) return;
    if (clip.gain) clip.gain.gain.value = sound.volume;
    if (clip.source || clip.loading) return;
    if (!clip.buffer) {
      clip.loading = true;
      void fetch(worldAssetUrl(MUSIC_GUIDE_LINES[clip.id].audioPath), { signal: clip.request.signal }).then(response => {
        if (!response.ok) throw new Error('music-guide-audio-unavailable');
        return response.arrayBuffer();
      }).then(bytes => audio.decodeAudioData(bytes)).then(buffer => {
        if (current.current !== clip || clip.request.signal.aborted) return;
        clip.buffer = buffer;
        clip.loading = false;
        applyVoice();
      }).catch(() => { clip.failed = true; });
      return;
    }
    if (clip.offset >= clip.buffer.duration) {
      stop();
      state.current.onEnded(clip.id);
      return;
    }
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = clip.buffer;
    gain.gain.value = sound.volume;
    source.connect(gain);
    gain.connect(audio.destination);
    clip.source = source;
    clip.gain = gain;
    clip.startedAt = audio.currentTime;
    source.onended = () => {
      if (current.current !== clip || clip.source !== source) return;
      source.disconnect();
      gain.disconnect();
      clip.source = undefined;
      clip.gain = undefined;
      stop();
      state.current.onEnded(clip.id);
    };
    try {
      source.start(0, clip.offset);
      state.current.onPlaying(clip.id, true);
    }
    catch {
      source.onended = null;
      source.disconnect();
      gain.disconnect();
      clip.source = undefined;
      clip.gain = undefined;
      clip.failed = true;
    }
  }, [pause, stop]);

  useLayoutEffect(() => {
    if (enabled && line) {
      current.current = { id: line, request: new AbortController(), offset: 0, startedAt: 0 };
      apply();
    }
    return stop;
  }, [enabled, line, apply, stop]);
  useLayoutEffect(apply, [apply, blocked, sound]);

  useEffect(() => {
    if (!enabled) return;
    function syncAudioState() {
      if (context.current?.state === 'running') apply();
      else pause();
    }
    async function unlock() {
      if (!state.current.sound.enabled || state.current.sound.volume <= 0 || !window.AudioContext) return;
      try {
        const audio = context.current ??= new AudioContext();
        audio.addEventListener('statechange', syncAudioState);
        if (audio.state !== 'running') await audio.resume();
        if (context.current === audio) apply();
      } catch { /* Runtime still times the readable subtitle. */ }
    }
    const releaseGestures = listenForSoundGestures({ unlock, stop: pause });
    const worldKeys = (event: KeyboardEvent) => {
      if (event.isTrusted && (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code) || event.key === 'Escape')) void unlock();
    };
    document.addEventListener('keydown', worldKeys, true);
    return () => {
      releaseGestures();
      document.removeEventListener('keydown', worldKeys, true);
      stop();
      const audio = context.current;
      context.current = null;
      audio?.removeEventListener('statechange', syncAudioState);
      void audio?.close().catch(() => {});
    };
  }, [apply, enabled, pause, stop]);

  return stop;
}
