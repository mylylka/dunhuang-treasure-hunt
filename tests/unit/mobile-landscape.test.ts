import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMobileLandscapeBlocked, isPhonePortrait, subscribeMobileLandscape, type MobileOrientation } from '../../src/services/mobile-landscape';

const phone: MobileOrientation = { screenWidth: 390, screenHeight: 844, maxTouchPoints: 5, coarsePointer: true, noHover: true, portrait: true };
afterEach(() => vi.unstubAllGlobals());

describe('2D手机横屏支持策略', () => {
  it('手机竖屏阻挡，横屏及手机旋转后的屏幕尺寸不阻挡', () => {
    expect(isPhonePortrait(phone)).toBe(true);
    expect(isPhonePortrait({ ...phone, portrait: false })).toBe(false);
    expect(isPhonePortrait({ ...phone, screenWidth: 844, screenHeight: 390 })).toBe(true);
  });
  it('电脑窄窗口、触屏电脑及大屏平板不被误认作手机', () => {
    expect(isPhonePortrait({ ...phone, maxTouchPoints: 0 })).toBe(false);
    expect(isPhonePortrait({ ...phone, coarsePointer: false, noHover: false })).toBe(false);
    expect(isPhonePortrait({ ...phone, screenWidth: 1920, screenHeight: 1080 })).toBe(false);
    expect(isPhonePortrait({ ...phone, screenWidth: 820, screenHeight: 1180 })).toBe(false);
    expect(isPhonePortrait({ ...phone, screenWidth: 0 })).toBe(false);
  });
  it('兼容WebKit触摸事件能力，仍排除触屏电脑和带鼠标的窄窗口', () => {
    expect(isPhonePortrait({ ...phone, maxTouchPoints: 0, touchEvents: true })).toBe(true);
    expect(isPhonePortrait({ ...phone, maxTouchPoints: 0, touchEvents: true, screenWidth: 1440, screenHeight: 900 })).toBe(false);
    expect(isPhonePortrait({ ...phone, maxTouchPoints: 0, touchEvents: true, noHover: false })).toBe(false);
  });
  it('iPhone 内嵌浏览器能力信息不完整时仍阻挡竖屏，横屏恢复', () => {
    const wechat: MobileOrientation = { ...phone, phoneUserAgent: true, maxTouchPoints: 0, touchEvents: false,
      coarsePointer: false, noHover: false, viewportWidth: 393, viewportHeight: 852 };
    expect(isPhonePortrait(wechat)).toBe(true);
    expect(isPhonePortrait({ ...wechat, portrait: false })).toBe(false);
    // Some hosts report physical pixels for screen; the explicit phone UA plus CSS viewport remains decisive.
    expect(isPhonePortrait({ ...wechat, screenWidth: 1206, screenHeight: 2622 })).toBe(true);
    expect(isPhonePortrait({ ...wechat, phoneUserAgent: false, screenWidth: 1512, screenHeight: 982 })).toBe(false);
    expect(isPhonePortrait({ ...wechat, phoneUserAgent: false, screenWidth: 1920, screenHeight: 1080, maxTouchPoints: 10,
      touchEvents: true, coarsePointer: true, noHover: true })).toBe(false);
  });
  it('小屏触控设备只报告一种指针能力时仍可识别，不把电脑窄窗口当手机', () => {
    expect(isPhonePortrait({ ...phone, coarsePointer: false, noHover: true })).toBe(true);
    expect(isPhonePortrait({ ...phone, coarsePointer: true, noHover: false })).toBe(true);
    expect(isPhonePortrait({ ...phone, coarsePointer: false, noHover: false })).toBe(false);
    expect(isPhonePortrait({ ...phone, screenWidth: 1440, screenHeight: 900, viewportWidth: 393, viewportHeight: 852 })).toBe(false);
  });
  it('实时读取 iPhone UA 并处理失真的指针媒体信息', () => {
    vi.stubGlobal('window', { screen: { width: 393, height: 852 }, innerWidth: 393, innerHeight: 852,
      navigator: { maxTouchPoints: 0, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit MicroMessenger' },
      matchMedia: () => ({ matches: false }) });
    expect(getMobileLandscapeBlocked()).toBe(true);
    window.innerWidth = 852; window.innerHeight = 393;
    expect(getMobileLandscapeBlocked()).toBe(false);
  });
  it('方向订阅同步通知所有使用者，去掉最后一位时清理监听', () => {
    let portrait = false;
    const media = new Map<string, EventTarget>();
    const host = new EventTarget();
    const visualViewport = new EventTarget();
    vi.stubGlobal('window', Object.assign(host, { screen: { width: 390, height: 844 }, innerWidth: 844, innerHeight: 390, visualViewport,
      navigator: { maxTouchPoints: 5 }, matchMedia: (query: string) => {
        if (!media.has(query)) {
          const target = new EventTarget();
          Object.defineProperty(target, 'matches', { get: () => query.includes('orientation') ? portrait : true });
          media.set(query, target);
        }
        return media.get(query);
      } }));
    const seen: boolean[] = [], other = vi.fn();
    const unsubscribe = subscribeMobileLandscape(() => seen.push(getMobileLandscapeBlocked()));
    const unsubscribeOther = subscribeMobileLandscape(other);
    portrait = true; window.innerWidth = 390; window.innerHeight = 844;
    media.get('(orientation: portrait)')!.dispatchEvent(new Event('change'));
    expect(seen).toEqual([true]); expect(other).toHaveBeenCalledTimes(1);
    host.dispatchEvent(new Event('resize'));
    expect(other).toHaveBeenCalledTimes(1);
    unsubscribe(); portrait = false; window.innerWidth = 844; window.innerHeight = 390; host.dispatchEvent(new Event('resize'));
    expect(seen).toEqual([true]); expect(other).toHaveBeenCalledTimes(2);
    unsubscribeOther(); portrait = true; window.innerWidth = 390; window.innerHeight = 844; host.dispatchEvent(new Event('resize'));
    expect(other).toHaveBeenCalledTimes(2);
    const again = vi.fn(); const stop = subscribeMobileLandscape(again);
    // An orientation media event is not required: actual viewport resize is authoritative.
    window.innerWidth = 844; window.innerHeight = 390; visualViewport.dispatchEvent(new Event('resize'));
    expect(again).toHaveBeenCalledTimes(1); stop();
  });
});
