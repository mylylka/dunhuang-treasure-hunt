import { describe, expect, it, vi } from 'vitest';
import { createCompanionSpeech, type CompanionSpeechHost } from '../../src/world/companion-speech';
import { defaultSoundPreferences } from '../../src/services/sound-settings';

function fixture() {
  const voices = [{ name: 'English', lang: 'en-US' }, { name: 'Chinese HK', lang: 'zh-HK' },
    { name: 'Chinese CN', lang: 'zh-CN' }] as SpeechSynthesisVoice[];
  const lines: SpeechSynthesisUtterance[] = [];
  const synthesis = { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => voices) };
  const host: CompanionSpeechHost = {
    synthesis,
    createUtterance(text) {
      const line = { text, lang: '', volume: 1, voice: null, onstart: null, onend: null, onerror: null } as SpeechSynthesisUtterance;
      lines.push(line); return line;
    },
  };
  const ended = vi.fn(), speech = createCompanionSpeech(defaultSoundPreferences(), ended, host);
  const start = (line = lines.at(-1)!) => line.onstart?.call(line, {} as SpeechSynthesisEvent);
  const end = (line = lines.at(-1)!) => line.onend?.call(line, {} as SpeechSynthesisEvent);
  const error = (line = lines.at(-1)!) => line.onerror?.call(line, {} as SpeechSynthesisErrorEvent);
  return { synthesis, host, lines, ended, speech, start, end, error };
}

describe('companion test speech lifecycle', () => {
  it('falls back to subtitles without a browser speech API and does not fake completion', () => {
    const ended = vi.fn(), speech = createCompanionSpeech(defaultSoundPreferences(), ended, null);
    speech.speak(1, '我会陪你一起参观乐舞坊。');
    expect(speech.inspect()).toEqual({ status: 'subtitle', supported: false, id: 1 });
    speech.stop(); speech.dispose(); expect(ended).not.toHaveBeenCalled();
  });

  it('uses Chinese voice and shared volume, reporting speech only after real start/end events', () => {
    const { speech, synthesis, lines, start, end, ended } = fixture();
    speech.speak(1, '我会陪你一起参观乐舞坊。');
    expect(lines[0]).toMatchObject({ lang: 'zh-CN', volume: .4, voice: { lang: 'zh-CN' } });
    expect(synthesis.speak).toHaveBeenCalledWith(lines[0]);
    expect(speech.inspect().status).toBe('subtitle'); expect(ended).not.toHaveBeenCalled();
    start(); expect(speech.inspect().status).toBe('speaking');
    end(); end(); expect(ended).toHaveBeenCalledTimes(1);
    expect(speech.inspect()).toMatchObject({ status: 'idle', id: null });
    speech.dispose(); expect(synthesis.cancel).not.toHaveBeenCalled();
  });

  it('deduplicates repeated active snapshots and ignores old callbacks after replacing a line', () => {
    const { speech, synthesis, lines, ended, start, end } = fixture();
    speech.speak(1, '旧对白');
    const old = lines[0], callbacks = { start: old.onstart!, end: old.onend!, error: old.onerror! };
    speech.speak(1, '旧对白'); expect(synthesis.speak).toHaveBeenCalledTimes(1);
    speech.speak(2, '新对白'); expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    start(); callbacks.start.call(old, {} as SpeechSynthesisEvent);
    callbacks.end.call(old, {} as SpeechSynthesisEvent); callbacks.error.call(old, {} as SpeechSynthesisErrorEvent);
    expect(speech.inspect()).toMatchObject({ status: 'speaking', id: 2 }); expect(ended).not.toHaveBeenCalled();
    end(); expect(ended).toHaveBeenCalledTimes(1); speech.dispose();
  });

  it('cancels only an owned line on stop/dispose and prevents late completion or replay', () => {
    const { speech, synthesis, lines, ended } = fixture();
    speech.stop(); expect(synthesis.cancel).not.toHaveBeenCalled();
    speech.speak(1, '测试'); const line = lines[0], lateEnd = line.onend!;
    speech.stop(); lateEnd.call(line, {} as SpeechSynthesisEvent);
    expect(ended).not.toHaveBeenCalled(); expect(speech.inspect().status).toBe('idle');
    speech.setPreferences(defaultSoundPreferences()); expect(synthesis.speak).toHaveBeenCalledTimes(1);
    speech.speak(2, '第二句'); const second = lines[1], lateSecondEnd = second.onend!;
    speech.dispose(); lateSecondEnd.call(second, {} as SpeechSynthesisEvent);
    speech.speak(3, '已离开'); speech.dispose();
    expect(synthesis.speak).toHaveBeenCalledTimes(2); expect(synthesis.cancel).toHaveBeenCalledTimes(2);
    expect(ended).not.toHaveBeenCalled();
  });

  it('respects mute/zero volume, cancels a playing line and requires explicit retry after unmuting', () => {
    const { speech, synthesis, lines, start, ended } = fixture();
    speech.setPreferences({ version: 1, enabled: false, volume: .7 }); speech.speak(1, '静音');
    expect(speech.inspect().status).toBe('muted'); expect(synthesis.speak).not.toHaveBeenCalled();
    speech.setPreferences({ version: 1, enabled: true, volume: 0 }); speech.speak(1, '零音量');
    expect(synthesis.speak).not.toHaveBeenCalled();
    speech.setPreferences({ version: 1, enabled: true, volume: .7 });
    expect(speech.inspect().status).toBe('subtitle'); expect(synthesis.speak).not.toHaveBeenCalled();
    speech.speak(1, '主动重试'); start();
    const line = lines[0], lateEnd = line.onend!;
    speech.setPreferences({ version: 1, enabled: false, volume: .7 }); lateEnd.call(line, {} as SpeechSynthesisEvent);
    expect(synthesis.cancel).toHaveBeenCalledTimes(1); expect(speech.inspect().status).toBe('muted');
    expect(ended).not.toHaveBeenCalled();
    speech.setPreferences({ version: 1, enabled: true, volume: .6 });
    expect(synthesis.speak).toHaveBeenCalledTimes(1); speech.dispose();
  });

  it('keeps subtitles on browser failure, allows a deliberate retry, and updates current volume', () => {
    const { speech, synthesis, lines, error, start, ended } = fixture();
    synthesis.speak.mockImplementationOnce(() => { throw new Error('blocked'); });
    speech.speak(1, '测试'); expect(speech.inspect().status).toBe('error'); expect(ended).not.toHaveBeenCalled();
    speech.speak(1, '重试'); start();
    speech.setPreferences({ version: 1, enabled: true, volume: .6 }); expect(lines[1].volume).toBe(.6);
    error(); expect(speech.inspect()).toMatchObject({ status: 'error', id: 1 }); expect(ended).not.toHaveBeenCalled();
    speech.dispose(); expect(synthesis.cancel).not.toHaveBeenCalled();
  });

  it('retains the language fallback when voice enumeration is unavailable', () => {
    const { speech, synthesis, lines } = fixture();
    synthesis.getVoices.mockImplementationOnce(() => { throw new Error('not ready'); });
    speech.speak(1, '测试');
    expect(lines[0]).toMatchObject({ lang: 'zh-CN', voice: null, volume: .4 });
    expect(speech.inspect().status).toBe('subtitle'); speech.dispose();
  });
});
