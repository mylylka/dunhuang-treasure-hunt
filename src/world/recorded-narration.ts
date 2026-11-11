import { worldAssetUrl } from '../content/world/assets';
import { soundPlayer } from '../services/sound';
import type { SoundPreferences } from '../services/sound-settings';

type NarrationEnd = 'finished' | 'skipped';
interface RecordedClip { path: string; duration: number; text?: string }
type Playback = { context: AudioContext; source: AudioBufferSourceNode; gain: GainNode; startedAt: number };
type Narration<Owner, Id> = {
  owner: Owner;
  id: Id;
  finish: (reason: NarrationEnd) => void;
  request: AbortController;
  bytes?: ArrayBuffer;
  buffer?: AudioBuffer;
  playback?: Playback;
  offset: number;
  waiting: number;
  firstFrame: boolean;
  ended: boolean;
  failed: boolean;
  holdAfter: boolean;
  hold: { reason: NarrationEnd; remaining: number } | null;
};

export function createRecordedNarration<Owner, Id extends string>(initial: SoundPreferences, clips: Record<Id, RecordedClip>,
  holdSeconds: (reason: NarrationEnd) => number = () => 0) {
  type Line = Narration<Owner, Id>;
  let preferences = initial;
  let blocked = false;
  let active: Line | null = null;
  const soundEnabled = () => preferences.enabled && preferences.volume > 0;

  function currentTime(line: Line) {
    const playback = line.playback;
    const time = line.offset + (playback ? Math.max(0, playback.context.currentTime - playback.startedAt) : 0);
    return line.buffer ? Math.min(time, line.buffer.duration) : time;
  }

  function pause(line: Line) {
    const playback = line.playback;
    if (!playback) return;
    line.offset = currentTime(line);
    line.playback = undefined;
    playback.source.onended = null;
    playback.source.stop();
    playback.source.disconnect();
    playback.gain.disconnect();
  }

  function start(line: Line) {
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

  function complete(reason: NarrationEnd) {
    const callback = active?.finish;
    cancel();
    callback?.(reason);
  }

  function finish(reason: NarrationEnd) {
    if (!active) return;
    if (!active.holdAfter) { complete(reason); return; }
    active.request.abort();
    pause(active);
    active.hold = { reason, remaining: holdSeconds(reason) };
  }

  return {
    play(owner: Owner, id: Id, onFinish: (reason: NarrationEnd) => void, holdAfter = false) {
      cancel();
      const request = new AbortController();
      const line: Line = { owner, id, finish: onFinish, request, offset: 0, waiting: 0,
        firstFrame: true, ended: false, failed: false, holdAfter, hold: null };
      active = line;
      // Safari grants HTML audio playback per element. A scene can schedule each
      // clip here using the Web Audio context already authorized by player input.
      void fetch(worldAssetUrl(clips[id].path), { signal: request.signal }).then(response => {
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
      const step = active.firstFrame ? 0 : dt;
      active.firstFrame = false;
      if (active.playback && active.playback.context.state !== 'running') pause(active);
      start(active);
      if (active.ended) { finish('finished'); return; }
      if (active.playback?.context.state === 'running') return;
      const clip = clips[active.id];
      const readingTime = Math.max(clip.duration, (clip.text?.length ?? 0) / 7);
      const waitingForData = !active.failed && !active.buffer && soundEnabled() && soundPlayer.playbackContext()?.state === 'running';
      if (waitingForData && (active.waiting += step) < 6) return;
      active.offset += step;
      if (active.offset >= readingTime) finish('finished');
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
      const status: 'error' | 'ready' | 'loading' | 'blocked' = active.failed ? 'error' : active.buffer ? 'ready' : soundPlayer.playbackContext() ? 'loading' : 'blocked';
      return { owner: active.owner, id: active.id, status, active: !active.hold,
        ended: active.ended, playing: active.playback?.context.state === 'running',
        currentTime: currentTime(active), duration: active.buffer?.duration ?? clips[active.id].duration, holding: !!active.hold };
    },
  };
}
