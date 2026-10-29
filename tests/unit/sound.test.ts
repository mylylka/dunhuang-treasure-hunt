import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSoundPlayer, soundUrl } from '../../src/services/sound';
import type { SoundCue } from '../../src/types';

const durations: Record<SoundCue, number> = { button: .165, rotate: .245, success: .445, error: .285, fill: .295, hint: .485, complete: 1.135 };
const buffer = (cue: SoundCue) => ({ duration: durations[cue] }) as AudioBuffer;
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

function harness(loader?: (context: AudioContext, cue: SoundCue) => Promise<AudioBuffer>) {
  let time = 0, hidden = false;
  const sources: { buffer: AudioBuffer | null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  const gains: { value: number; cancelScheduledValues: ReturnType<typeof vi.fn>; setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }), close: vi.fn(async () => { context.state = 'closed'; }),
    createBufferSource: vi.fn(() => {
      const source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
      sources.push(source); return source;
    }),
    createGain: vi.fn(() => {
      const gain = { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
      gains.push(gain); return { gain, connect: vi.fn(), disconnect: vi.fn() };
    }),
  };
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const loadBuffer = vi.fn(loader ?? (async (_context: AudioContext, cue: SoundCue) => buffer(cue)));
  const player = createSoundPlayer({ createContext, loadBuffer, now: () => time, isHidden: () => hidden });
  return { player, context, createContext, loadBuffer, sources, gains,
    advance: (milliseconds: number) => { time += milliseconds; context.currentTime = time / 1000; },
    hide: () => { hidden = true; } };
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('共用温润木石音效播放器', () => {
  it('构造与未解锁播放均不创建音频；显式手势才初始化', async () => {
    const h = harness(); h.player.play('button'); await settle();
    expect(h.createContext).not.toHaveBeenCalled();
    await h.player.unlock();
    expect(h.createContext).toHaveBeenCalledTimes(1);
    expect(h.context.resume).toHaveBeenCalledTimes(1);
    expect(h.loadBuffer).not.toHaveBeenCalled();
    h.player.play('button'); await settle();
    expect(h.sources).toHaveLength(1);
    expect(h.sources[0].buffer?.duration).toBe(.165);
    expect(h.gains[0].linearRampToValueAtTime).toHaveBeenCalledWith(.4, .003);
  });
  it('重复短音有限频，替换音在旧音淡出后才开始，资源只解码一次', async () => {
    const h = harness(); await h.player.unlock();
    h.player.play('button'); await settle();
    h.advance(30); h.player.play('button'); await settle();
    expect(h.sources).toHaveLength(1);
    h.advance(51); h.player.play('button'); await settle();
    expect(h.sources).toHaveLength(2); expect(h.loadBuffer).toHaveBeenCalledTimes(1);
    const stopAt = h.sources[0].stop.mock.calls[0][0];
    const startAt = h.sources[1].start.mock.calls[0][0];
    expect(stopAt).toBeCloseTo(.093); expect(startAt).toBe(stopAt);
  });
  it('完成音替换成功音，按钮不截断完成音，停止仍能立即取消', async () => {
    const h = harness(); await h.player.unlock();
    h.player.play('success'); await settle();
    h.player.play('complete'); await settle();
    h.player.play('button'); await settle();
    expect(h.sources.map(source => source.buffer?.duration)).toEqual([.445, 1.135]);
    h.player.stop();
    expect(h.sources[1].stop).toHaveBeenCalled();
  });
  it('停止后立刻播放仍等待旧音淡出，不跨停止动作叠音', async () => {
    const h = harness(); await h.player.unlock();
    h.player.play('button'); await settle();
    h.advance(90); h.player.stop(); h.player.play('fill'); await settle();
    expect(h.sources).toHaveLength(2);
    expect(h.sources[1].start.mock.calls[0][0]).toBe(h.sources[0].stop.mock.calls[0][0]);
  });
  it('异步加载中的高优先完成音不会被普通按钮取代', async () => {
    let resolve!: (value: AudioBuffer) => void;
    const h = harness(async () => new Promise<AudioBuffer>(done => { resolve = done; }));
    await h.player.unlock(); h.player.play('complete'); await settle(); h.player.play('button');
    resolve(buffer('complete')); await settle();
    expect(h.loadBuffer).toHaveBeenCalledTimes(1);
    expect(h.sources[0].buffer?.duration).toBe(1.135);
  });
  it.each(['stop', 'mute', 'hidden', 'expired'] as const)('加载后遇到%s不补发过期音效', async action => {
    let resolve!: (value: AudioBuffer) => void;
    const h = harness(async () => new Promise<AudioBuffer>(done => { resolve = done; }));
    await h.player.unlock(); h.player.play('fill'); await settle();
    if (action === 'stop') h.player.stop();
    if (action === 'mute') h.player.setPreferences({ enabled: false, volume: .4 });
    if (action === 'hidden') h.hide();
    if (action === 'expired') h.advance(651);
    resolve(buffer('fill')); await settle();
    expect(h.sources).toHaveLength(0);
  });
  it('较晚的动作取消先前缓慢解码，不能倒序发声', async () => {
    const resolvers = new Map<SoundCue, (value: AudioBuffer) => void>();
    const h = harness(async (_context, cue) => new Promise<AudioBuffer>(done => { resolvers.set(cue, done); }));
    await h.player.unlock(); h.player.play('button'); await settle();
    h.player.play('rotate'); await settle();
    resolvers.get('rotate')!(buffer('rotate')); await settle();
    resolvers.get('button')!(buffer('button')); await settle();
    expect(h.sources.map(source => source.buffer?.duration)).toEqual([.245]);
  });
  it('加载失败不抛错或永久缓存失败，下一次操作可重试', async () => {
    let calls = 0;
    const h = harness(async (_context, cue) => { if (++calls === 1) throw new Error('offline'); return buffer(cue); });
    await h.player.unlock(); h.player.play('error'); await settle();
    expect(h.sources).toHaveLength(0);
    h.advance(200); h.player.play('error'); await settle();
    expect(h.sources).toHaveLength(1);
  });
  it('关闭音效或音量为0时不创建上下文；卸载释放上下文', async () => {
    const h = harness(); h.player.setPreferences({ enabled: false, volume: .4 });
    await h.player.unlock(); expect(h.createContext).not.toHaveBeenCalled();
    h.player.setPreferences({ enabled: true, volume: 0 }); await h.player.unlock(); expect(h.createContext).not.toHaveBeenCalled();
    h.player.setPreferences({ enabled: true, volume: .2 }); await h.player.unlock(); h.player.play('fill'); await settle();
    h.player.setPreferences({ enabled: true, volume: .7 }); expect(h.gains[0].linearRampToValueAtTime).toHaveBeenLastCalledWith(.7, .012);
    h.player.dispose(); await settle();
    expect(h.context.close).toHaveBeenCalledTimes(1); h.player.play('complete'); await settle(); expect(h.sources).toHaveLength(1);
  });
  it('没有WebAudio或手势受限时仍可继续游戏', async () => {
    const absent = createSoundPlayer({ createContext: () => null, isHidden: () => false });
    await expect(absent.unlock()).resolves.toBeUndefined(); expect(() => absent.play('button')).not.toThrow();
    const h = harness(); h.context.resume.mockRejectedValueOnce(new Error('blocked'));
    await expect(h.player.unlock()).resolves.toBeUndefined(); h.player.play('button'); await settle(); expect(h.sources).toHaveLength(0);
  });
  it('上下文已关闭时不抛错，也不请求无用的音频', async () => {
    const h = harness(); await h.player.unlock(); h.context.state = 'closed';
    expect(() => h.player.play('complete')).not.toThrow(); await settle();
    expect(h.loadBuffer).not.toHaveBeenCalled(); expect(h.sources).toHaveLength(0);
  });
  it('部署在子路径时以页面基址定位音频', () => {
    vi.stubEnv('BASE_URL', './');
    vi.stubGlobal('document', { baseURI: 'https://example.test/games/dunhuang/index.html?review=audio' });
    expect(soundUrl('complete')).toBe('https://example.test/games/dunhuang/assets/shared/audio/warm-v001/warm-complete.wav');
  });
});
