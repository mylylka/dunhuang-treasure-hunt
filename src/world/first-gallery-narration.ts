import { worldAssetUrl } from '../content/world/assets';
import { firstGalleryNarration, galleryNarrationHoldSeconds, type FirstGalleryNarrationEnd, type FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import { soundPlayer } from '../services/sound';
import type { SoundPreferences } from '../services/sound-settings';

type Owner = 'cue' | 'mural' | 'caisson';
type Playback = { context: AudioContext; source: AudioBufferSourceNode; gain: GainNode; startedAt: number };
type Narration = {
  owner: Owner;
  id: FirstGalleryNarrationId;
  finish: (reason: FirstGalleryNarrationEnd) => void;
  request: AbortController;
  bytes?: ArrayBuffer;
  buffer?: AudioBuffer;
  playback?: Playback;
  offset: number;
  elapsed: number;
  firstFrame: boolean;
  ended: boolean;
  failed: boolean;
  holdAfter: boolean;
  hold: { reason: FirstGalleryNarrationEnd; remaining: number } | null;
};

export function createFirstGalleryNarration(initial: SoundPreferences) {
  let preferences = initial;
  let blocked = false;
  let active: Narration | null = null;
  const soundEnabled = () => preferences.enabled && preferences.volume > 0;

  function currentTime(line: Narration) {
    const playback = line.playback;
    const time = line.offset + (playback ? Math.max(0, playback.context.currentTime - playback.startedAt) : 0);
    return line.buffer ? Math.min(time, line.buffer.duration) : time;
  }

  function pause(line: Narration) {
    const playback = line.playback;
    if (!playback) return;
    line.offset = currentTime(line);
    line.playback = undefined;
    playback.source.onended = null;
    playback.source.stop();
    playback.source.disconnect();
    playback.gain.disconnect();
  }

  function start(line: Narration) {
    if (line !== active || line.ended || line.failed || line.hold || blocked || !soundEnabled() || line.playback) return;
    const context = soundPlayer.playbackContext();
    if (context?.state !== 'running') return;
    if (line.bytes) {
      const bytes = line.bytes;
      line.bytes = undefined;
      void context.decodeAudioData(bytes).then(buffer => {
        if (line !== active || line.request.signal.aborted) return;
        line.buffer = buffer;
        start(line);
      }).catch(() => { line.failed = true; });
      return;
    }
    const buffer = line.buffer;
    if (!buffer) return;
    if (line.offset >= buffer.duration) { line.ended = true; return; }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = preferences.volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      if (line.playback?.source !== source) return;
      line.offset = buffer.duration;
      line.playback = undefined;
      line.ended = true;
      source.disconnect();
      gain.disconnect();
    };
    try {
      source.start(0, line.offset);
      line.playback = { context, source, gain, startedAt: context.currentTime };
    } catch {
      source.onended = null;
      source.disconnect();
      gain.disconnect();
      line.failed = true;
    }
  }

  function cancel(owner?: Owner) {
    if (!active || (owner && active.owner !== owner)) return;
    active.request.abort();
    pause(active);
    active = null;
  }

  function complete(reason: FirstGalleryNarrationEnd) {
    const callback = active?.finish;
    cancel();
    callback?.(reason);
  }

  function finish(reason: FirstGalleryNarrationEnd) {
    if (!active) return;
    if (!active.holdAfter) { complete(reason); return; }
    active.request.abort();
    pause(active);
    active.hold = { reason, remaining: galleryNarrationHoldSeconds(reason) };
  }

  return {
    play(owner: Owner, id: FirstGalleryNarrationId, onFinish: (reason: FirstGalleryNarrationEnd) => void, holdAfter = false) {
      cancel();
      const request = new AbortController();
      const line: Narration = { owner, id, finish: onFinish, request, offset: 0, elapsed: 0,
        firstFrame: true, ended: false, failed: false, holdAfter, hold: null };
      active = line;
      // Safari grants HTML audio playback per element. A scene can schedule each
      // clip here using the Web Audio context already authorized by player input.
      void fetch(worldAssetUrl(firstGalleryNarration[id].path), { signal: request.signal }).then(response => {
        if (!response.ok) throw new Error('Narration unavailable');
        return response.arrayBuffer();
      }).then(bytes => {
        if (line !== active || request.signal.aborted) return;
        line.bytes = bytes;
        start(line);
      }).catch(() => { if (!request.signal.aborted) line.failed = true; });
    },
    update(dt: number) {
      if (!active || blocked) return;
      if (active.hold) {
        active.hold.remaining -= dt;
        if (active.hold.remaining <= 0) complete(active.hold.reason);
        return;
      }
      // The first frame's delta includes the time before this line existed.
      if (active.firstFrame) active.firstFrame = false;
      else active.elapsed += dt;
      start(active);
      if (active.ended) { finish('finished'); return; }
      if (active.playback?.context.state === 'running') return;
      const clip = firstGalleryNarration[active.id];
      const readingTime = Math.max(clip.duration, clip.text.length / 7);
      const waitingForData = !active.failed && soundEnabled() && soundPlayer.playbackContext()?.state === 'running';
      if (active.elapsed >= (waitingForData ? Math.max(6, readingTime) : readingTime)) finish('finished');
    },
    skip(owner?: Owner) {
      if (!active || blocked || (owner && active.owner !== owner)) return false;
      if (!active.hold) finish('skipped');
      return true;
    },
    cancel,
    setBlocked(value: boolean) {
      blocked = value;
      if (!active) return;
      if (blocked) pause(active);
      else start(active);
    },
    setPreferences(value: SoundPreferences) {
      preferences = value;
      if (!active) return;
      if (!soundEnabled()) pause(active);
      else if (active.playback) active.playback.gain.gain.value = preferences.volume;
      else start(active);
    },
    inspect() {
      if (!active) return null;
      const status = active.failed ? 'error' : active.buffer ? 'ready' : soundPlayer.playbackContext() ? 'loading' : 'blocked';
      return { owner: active.owner, id: active.id, status, active: !active.hold,
        ended: active.ended, playing: active.playback?.context.state === 'running',
        currentTime: currentTime(active), duration: active.buffer?.duration ?? 0, holding: !!active.hold };
    },
  };
}
