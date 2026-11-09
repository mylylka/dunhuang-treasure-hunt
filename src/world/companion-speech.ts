import type { SoundPreferences } from '../services/sound-settings';

export interface CompanionSpeechState {
  status: 'idle' | 'speaking' | 'subtitle' | 'muted' | 'error';
  supported: boolean;
  id: number | null;
}

/** Small injectable browser boundary; the prototype never downloads narration. */
export interface CompanionSpeechHost {
  synthesis: Pick<SpeechSynthesis, 'speak' | 'cancel' | 'getVoices'>;
  createUtterance(text: string): SpeechSynthesisUtterance;
}

function browserSpeechHost(): CompanionSpeechHost | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) ||
    !('SpeechSynthesisUtterance' in window)) return null;
  try {
    return {
      synthesis: window.speechSynthesis,
      createUtterance: text => new window.SpeechSynthesisUtterance(text),
    };
  } catch { return null; }
}

/** Region-owned test speech. A controller owns subtitle timing and explicit retry. */
export function createCompanionSpeech(initial: SoundPreferences, onEnd: () => void,
  host: CompanionSpeechHost | null = browserSpeechHost()) {
  let preferences = { ...initial };
  let status: CompanionSpeechState['status'] = 'idle';
  let id: number | null = null;
  let utterance: SpeechSynthesisUtterance | null = null;
  let generation = 0, disposed = false;
  const volume = () => Number.isFinite(preferences.volume) ? Math.max(0, Math.min(1, preferences.volume)) : 0;
  const audible = () => preferences.enabled && volume() > 0;
  function detach(line: SpeechSynthesisUtterance) {
    line.onstart = null; line.onend = null; line.onerror = null;
  }
  function releaseOwnLine() {
    generation++;
    const previous = utterance;
    utterance = null;
    if (!previous) return;
    detach(previous);
    // cancel() is browser-global, so never call it merely because the region
    // paused or disposed when it had no utterance of its own.
    try { host?.synthesis.cancel(); } catch { /* Subtitles remain available. */ }
  }
  function stop() {
    releaseOwnLine(); id = null; status = 'idle';
  }
  return {
    speak(nextId: number, text: string) {
      if (disposed || !Number.isFinite(nextId) || !text.trim()) return;
      // Runtime snapshots may repeat; one line must not create an endless queue.
      if (utterance && id === nextId && utterance.text === text) return;
      releaseOwnLine(); id = nextId;
      if (!audible()) { status = 'muted'; return; }
      if (!host) { status = 'subtitle'; return; }
      let line: SpeechSynthesisUtterance;
      try {
        line = host.createUtterance(text);
        line.lang = 'zh-CN'; line.volume = volume();
        // Voices may still be loading. lang lets the browser choose its default
        // voice then; a subsequent explicit attempt can use the updated list.
        try {
          const voices = host.synthesis.getVoices();
          const voice = voices.find(item => /^zh[-_]CN$/i.test(item.lang)) ??
            voices.find(item => /^zh(?:[-_]|$)/i.test(item.lang));
          if (voice) line.voice = voice;
        } catch { /* Keep the language fallback when voice enumeration fails. */ }
      } catch { status = 'error'; return; }
      const attempt = generation;
      utterance = line;
      const current = () => !disposed && generation === attempt && utterance === line;
      line.onstart = () => { if (current()) status = 'speaking'; };
      line.onend = () => {
        if (!current()) return;
        utterance = null; detach(line); id = null; status = 'idle'; onEnd();
      };
      line.onerror = () => {
        if (!current()) return;
        utterance = null; detach(line); status = 'error';
      };
      // Queued speech is not evidence that a voice has actually started.
      status = 'subtitle';
      try { host.synthesis.speak(line); }
      catch {
        if (current()) { utterance = null; detach(line); status = 'error'; }
      }
    },
    stop,
    setPreferences(next: SoundPreferences) {
      if (disposed) return;
      preferences = { ...next };
      if (!audible()) {
        releaseOwnLine(); status = id === null ? 'idle' : 'muted';
      } else if (utterance) utterance.volume = volume();
      else if (id !== null && status === 'muted') status = 'subtitle';
      // Unmuting never restarts a paused or expired line.
    },
    inspect(): CompanionSpeechState { return { status, supported: !!host, id }; },
    dispose() {
      if (disposed) return;
      stop(); disposed = true;
    },
  };
}
