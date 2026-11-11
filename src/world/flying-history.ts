import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';
import art from '../content/world/flying-history-art-v001.json';
import audio from '../content/world/flying-history-audio-v001.json';
import chapterText from '../content/world/flying-history-text-v001.json';
import type { SoundPreferences } from '../services/sound-settings';

type Phase = 'awakening' | 'opening' | 'invite' | 'loading' | 'transition' | 'chapter' | 'hold' | 'complete' | 'image-error';
type Speaker = 'flying' | 'guide';

export interface FlyingHistoryLabel {
  cave: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Clip {
  path: string;
  duration: number;
  cues: { start: number; end: number; text: string }[];
}

export interface FlyingHistorySnapshot {
  phase: Phase;
  chapter: number | null;
  speaker: Speaker;
  subtitle: string;
  paused: boolean;
  menuOpen: boolean;
  detailOpen: boolean;
  canSkip: boolean;
  titles: readonly string[];
  audioTime: number;
  audioPlaying: boolean;
  audioPath: string | null;
  highlightedCaves: readonly string[];
}

export type FlyingHistoryAction = { type: 'start' | 'skip' | 'toggle-pause' | 'toggle-menu' | 'retry' | 'skip-broken' | 'unlock' }
  | { type: 'select'; chapter: number }
  | { type: 'set-detail'; open: boolean };

interface Display {
  show(texture: THREE.Texture | null, labels?: readonly FlyingHistoryLabel[]): void;
  reveal(amount: number): void;
  highlight(caves: readonly string[]): void;
}

interface Pending<T> {
  state: 'pending' | 'ready' | 'failed';
  value: T | null;
}

function pending<T>(task: Promise<T>, signal: AbortSignal, release?: (value: T) => void): Pending<T> {
  const result: Pending<T> = { state: 'pending', value: null };
  void task.then(value => {
    if (signal.aborted) { release?.(value); return; }
    result.value = value;
    result.state = 'ready';
  }, () => { result.state = 'failed'; });
  return result;
}

async function request(path: string, signal: AbortSignal) {
  const response = await fetch(worldAssetUrl(path), { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) });
  if (!response.ok) throw new Error('flying-history-asset-unavailable');
  return response;
}

function releaseTexture(texture: THREE.Texture) {
  texture.dispose();
  (texture.image as ImageBitmap).close();
}

async function loadTexture(path: string, signal: AbortSignal) {
  const blob = await (await request(path, signal)).blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });
  const texture = new THREE.Texture(bitmap);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const titles = art.map(chapter => chapter.title);

export function createFlyingHistory(display: Display, sound: SoundPreferences, onChapterShown?: (index: number) => void,
  waitForCaption = false) {
  let active = false;
  let phase: Phase = 'awakening', chapter: number | null = null;
  let speaker: Speaker = 'flying';
  let paused = false, menuOpen = false, detailOpen = false, blocked = false;
  let phaseTime = 0;
  let preferences = sound;
  let shown: THREE.Texture | null = null;
  let opening: { controller: AbortController; track: Pending<AudioBuffer> } | null = null;
  let context: AudioContext | null = null;
  let voice: {
    clip: Clip; track: Pending<AudioBuffer>; offset: number; wait: number; fallback: boolean;
    node: AudioBufferSourceNode | null; gain: GainNode | null; startedAt: number;
  } | null = null;
  let subtitle = '';
  let captionPresented = false;
  let highlights: string[] = [];

  function unlock() {
    if (!preferences.enabled || !preferences.volume) return;
    try {
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context) context ??= new Context();
      if (context?.state === 'suspended') void context.resume().catch(() => {});
    } catch { /* Captions are still available. */ }
  }

  function audioRequest(clip: Clip, signal: AbortSignal) {
    const decoder = context;
    if (!decoder) return { state: 'failed', value: null } as const satisfies Pending<AudioBuffer>;
    return pending((async () => {
      const bytes = await (await request(clip.path, signal)).arrayBuffer();
      if (signal.aborted) throw signal.reason;
      return decoder.decodeAudioData(bytes);
    })(), signal);
  }

  function prepare(index: number) {
    const controller = new AbortController();
    const clip: Clip = audio[speaker][index];
    return { index, controller, clip,
      board: pending(loadTexture(art[index].path, controller.signal), controller.signal, releaseTexture),
      track: audioRequest(clip, controller.signal),
    };
  }
  let current: ReturnType<typeof prepare> | null = null;
  let next: ReturnType<typeof prepare> | null = null;

  function cancel(prepared: ReturnType<typeof prepare> | null) {
    prepared?.controller.abort();
    if (prepared?.board.value) releaseTexture(prepared.board.value);
  }

  const halted = () => paused || menuOpen || detailOpen || blocked;
  function offset() {
    return voice && voice.node && context
      ? Math.max(voice.offset, context.currentTime - voice.startedAt) : voice?.offset ?? 0;
  }

  function pauseVoice() {
    if (!voice?.node) return;
    voice.offset = offset();
    voice.node.stop();
    voice.node.disconnect();
    voice.gain?.disconnect();
    voice.node = null;
    voice.gain = null;
  }

  function clearVoice() {
    pauseVoice();
    voice = null;
    captionPresented = false;
    subtitle = '';
    highlights = [];
    display.highlight(highlights);
  }

  function speak(clip: Clip, track: Pending<AudioBuffer>) {
    clearVoice();
    voice = { clip, track, offset: 0, wait: 0, fallback: false, node: null, gain: null, startedAt: 0 };
    subtitle = clip.cues[0]?.text ?? '';
  }

  function tickVoice(dt: number) {
    if (!voice) return true;
    if (waitForCaption && !captionPresented) return false;
    const audible = preferences.enabled && preferences.volume > 0;
    if (!audible || voice.node && context?.state !== 'running') pauseVoice();
    if (audible && !voice.fallback && !voice.node) {
      const buffer = voice.track.value;
      if (buffer && context?.state === 'running' && voice.offset < buffer.duration) {
        const node = context.createBufferSource();
        const gain = context.createGain();
        try {
          node.buffer = buffer;
          gain.gain.value = preferences.volume;
          node.connect(gain).connect(context.destination);
          node.start(0, voice.offset);
          voice.startedAt = context.currentTime - voice.offset;
          voice.node = node;
          voice.gain = gain;
        } catch {
          node.disconnect();
          gain.disconnect();
          voice.fallback = true;
        }
      } else {
        voice.wait += dt;
        voice.fallback = voice.track.state === 'failed' || voice.wait >= 4 || !!buffer && voice.offset >= buffer.duration;
      }
    }
    if ((!audible || voice.fallback) && !voice.node) voice.offset += dt;
    const time = offset();
    const end = voice.node?.buffer?.duration ?? voice.clip.duration;
    const cue = voice.clip.cues.find(line => line.start <= time && time < line.end);
    subtitle = cue?.text ?? (time < (voice.clip.cues[0]?.start ?? 0) ? voice.clip.cues[0]?.text ?? '' : '');
    if (phase === 'chapter' && cue && time - cue.start <= 2.2 && chapter !== null) {
      highlights = art[chapter].labels.map(label => label.cave)
        .filter(cave => new RegExp(`(?:^|[^0-9])${cave}\\s*窟`).test(cue.text));
    } else highlights = [];
    display.highlight(highlights);
    return time >= end;
  }

  function setPhase(value: Phase) {
    phase = value;
    phaseTime = 0;
  }

  function showInvitation() {
    clearVoice();
    opening?.controller.abort();
    opening = null;
    setPhase('invite');
  }

  function loadChapter(index: number) {
    clearVoice();
    cancel(current);
    if (next?.index === index) current = next;
    else {
      cancel(next);
      current = prepare(index);
    }
    next = null;
    chapter = index;
    setPhase('loading');
  }

  function advance() {
    clearVoice();
    const index = (chapter ?? -1) + 1;
    if (index >= art.length) setPhase('complete');
    else loadChapter(index);
  }

  function leave() {
    active = false;
    detailOpen = false;
    opening?.controller.abort();
    opening = null;
    clearVoice();
    cancel(current);
    cancel(next);
    current = next = null;
    display.show(null);
    if (shown) releaseTexture(shown);
    shown = null;
  }

  return {
    enter(following: boolean) {
      leave();
      active = true;
      speaker = following ? 'guide' : 'flying';
      chapter = null;
      paused = menuOpen = false;
      setPhase('awakening');
      unlock();
      const controller = new AbortController();
      opening = { controller, track: audioRequest(audio.opening, controller.signal) };
    },
    leave,
    get closeup() { return !!shown; },
    get holdsVideo() { return active && halted(); },
    get speaking() { return !!voice?.node && context?.state === 'running'; },
    setCaptionPresented(forPhase: Phase, forChapter: number | null, presented: boolean) {
      if (!voice || forPhase !== phase || forChapter !== chapter) return;
      captionPresented = presented;
      if (!presented) pauseVoice();
    },
    setBlocked(value: boolean) { blocked = value; if (value) pauseVoice(); },
    setSound(value: SoundPreferences) {
      preferences = value;
      if (!value.enabled || !value.volume) pauseVoice();
      else if (voice?.gain) voice.gain.gain.value = value.volume;
    },
    control(action: FlyingHistoryAction) {
      if (action.type === 'unlock') { unlock(); return; }
      if (!active) return;
      if (action.type === 'set-detail') {
        if (action.open && (blocked || menuOpen || !shown || (phase !== 'chapter' && phase !== 'hold' && phase !== 'complete'))) return;
        detailOpen = action.open;
        if (detailOpen) pauseVoice(); else unlock();
        return;
      }
      if (blocked || detailOpen) return;
      if (action.type === 'toggle-pause') {
        paused = !paused;
        if (paused) pauseVoice(); else unlock();
      } else if (action.type === 'toggle-menu' && chapter !== null) {
        menuOpen = !menuOpen;
        if (menuOpen) pauseVoice(); else unlock();
      } else if (action.type === 'start' && phase === 'invite') {
        unlock();
        loadChapter(0);
      } else if (action.type === 'select' && chapter !== null &&
        Number.isInteger(action.chapter) && action.chapter >= 0 && action.chapter < art.length) {
        unlock();
        menuOpen = paused = false;
        loadChapter(action.chapter);
      } else if (action.type === 'retry' && phase === 'image-error' && chapter !== null) {
        loadChapter(chapter);
      } else if (action.type === 'skip-broken' && phase === 'image-error' && !halted()) {
        advance();
      } else if (action.type === 'skip' && !halted()) {
        if (phase === 'opening') showInvitation();
        else if (phase === 'chapter') advance();
      }
    },
    update(dt: number, reduced: boolean, colored: boolean, cameraSettled: boolean) {
      if (!active || halted()) return;
      phaseTime += dt;
      if (phase === 'awakening' && colored && opening) {
        setPhase('opening');
        speak(audio.opening, opening.track);
      } else if (phase === 'opening' && tickVoice(dt)) {
        showInvitation();
      } else if (phase === 'loading' && current) {
        if (current.board.state === 'failed') setPhase('image-error');
        else if (current.board.value) {
          const previous = shown;
          shown = current.board.value;
          current.board.value = null;
          display.show(shown, art[current.index].labels);
          display.reveal(reduced ? 1 : 0);
          if (previous) releaseTexture(previous);
          if (current.index + 1 < art.length) next = prepare(current.index + 1);
          setPhase('transition');
        }
      } else if (phase === 'transition' && current) {
        const amount = reduced ? 1 : THREE.MathUtils.smoothstep(phaseTime, 0, .36);
        display.reveal(amount);
        if (amount === 1 && (cameraSettled || reduced || phaseTime >= 1.15)) {
          setPhase('chapter');
          speak(current.clip, current.track);
          onChapterShown?.(current.index);
        }
      } else if (phase === 'chapter' && tickVoice(dt)) {
        clearVoice();
        setPhase('hold');
      } else if (phase === 'hold' && phaseTime >= 1) advance();
    },
    snapshot(): FlyingHistorySnapshot | undefined {
      if (!active) return undefined;
      const text = chapter !== null && (phase === 'chapter' || phase === 'hold') ? chapterText[chapter] : subtitle;
      return { phase, chapter, speaker: chapter === null ? 'flying' : speaker, subtitle: text, paused, menuOpen, detailOpen,
        canSkip: !halted() && (phase === 'opening' || phase === 'chapter'), titles,
        audioTime: offset(), audioPlaying: !!voice?.node && context?.state === 'running',
        audioPath: voice?.clip.path ?? null, highlightedCaves: highlights };
    },
    dispose() {
      leave();
      if (context) void context.close().catch(() => {});
      context = null;
    },
  };
}
