import { afterEach, describe, expect, it, vi } from 'vitest';
import { listenForSoundGestures } from '../../src/app/useSound';

function eventHost() {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const host = {
    hidden: false,
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const entries = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
      entries.add(listener); listeners.set(type, entries);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.get(type)?.delete(listener);
    }),
    fire(type: string, detail: Record<string, unknown> = {}) {
      const event = { type, isTrusted: true, ...detail } as unknown as Event;
      for (const listener of listeners.get(type) ?? []) {
        if (typeof listener === 'function') listener.call(host, event);
        else listener.handleEvent(event);
      }
    },
  };
  return host;
}

function setup() {
  const document = eventHost(), window = eventHost();
  vi.stubGlobal('document', document); vi.stubGlobal('window', window);
  const player = { unlock: vi.fn(async () => {}), stop: vi.fn() };
  const remove = listenForSoundGestures(player);
  return { document, window, player, remove };
}

afterEach(() => vi.unstubAllGlobals());

describe('音效的浏览器主动手势与后台生命周期', () => {
  it('触屏按下不提前申请权限，真实抬起在画布处理前解锁，兼容touchend和click', () => {
    const h = setup();
    expect(h.player.unlock).not.toHaveBeenCalled();
    h.document.fire('pointerdown', { pointerType: 'touch' });
    expect(h.player.unlock).not.toHaveBeenCalled();
    h.document.fire('pointerup', { pointerType: 'touch' });
    expect(h.player.unlock).toHaveBeenCalledTimes(1);
    expect(h.document.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    h.document.fire('touchend'); h.document.fire('click');
    expect(h.player.unlock).toHaveBeenCalledTimes(3);
    h.remove();
  });
  it('鼠标按下和操作键仍可解锁，合成事件、滚动与窗口恢复不申请权限', () => {
    const h = setup();
    h.document.fire('pointerdown', { pointerType: 'mouse' });
    h.document.fire('keydown', { key: 'Enter' });
    h.document.fire('keydown', { key: ' ' });
    h.document.fire('keydown', { key: 'ArrowRight' });
    expect(h.player.unlock).toHaveBeenCalledTimes(4);
    h.document.fire('click', { isTrusted: false });
    h.document.fire('pointerup', { pointerType: 'touch', isTrusted: false });
    h.document.fire('keydown', { key: 'Escape' });
    h.document.fire('wheel'); h.window.fire('focus'); h.window.fire('pageshow');
    h.window.fire('orientationchange'); h.document.fire('visibilitychange');
    expect(h.player.unlock).toHaveBeenCalledTimes(4);
    h.remove();
  });
  it('失焦、后台和离页都取消反馈，恢复保持安静，卸载后不再监听手势', () => {
    const h = setup();
    h.window.fire('blur'); h.document.hidden = true; h.document.fire('visibilitychange'); h.window.fire('pagehide');
    expect(h.player.stop).toHaveBeenCalledTimes(3);
    h.document.hidden = false; h.document.fire('visibilitychange'); h.window.fire('focus');
    expect(h.player.unlock).not.toHaveBeenCalled();
    expect(h.player.stop).toHaveBeenCalledTimes(3);
    h.remove();
    h.document.fire('pointerup', { pointerType: 'touch' }); h.document.fire('touchend'); h.document.fire('click');
    h.window.fire('blur');
    expect(h.player.unlock).not.toHaveBeenCalled();
    expect(h.player.stop).toHaveBeenCalledTimes(4);
  });
});
