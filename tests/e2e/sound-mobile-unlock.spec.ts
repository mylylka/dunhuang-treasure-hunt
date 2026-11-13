import { expect, test, type Locator, type Page } from '@playwright/test';
import { SOUND_SETTINGS_KEY } from '../../src/services/sound-settings';

interface AudioGesture { type: string; trusted: boolean; pointerType: string | null }
interface AudioCall {
  contextId: number;
  time: number;
  state: string;
  gesture: AudioGesture | null;
  activation: { isActive: boolean | null; hasBeenActive: boolean | null };
}
interface AudioResume extends AudioCall {
  outcome: 'pending' | 'resolved' | 'rejected';
  stateAfter: string | null;
  error: string | null;
}
interface AudioStart extends AudioCall {
  duration: number;
  sampleRate: number;
  samples: number;
  nonZeroSamples: number;
  peak: number;
  rms: number;
}
interface MobileSoundProbe {
  available: boolean;
  contexts: AudioContext[];
  created: AudioCall[];
  resumes: AudioResume[];
  starts: AudioStart[];
}
declare global { interface Window { __mobileSoundProbe: MobileSoundProbe } }

test.use({ viewport: { width: 852, height: 330 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
test.setTimeout(45_000);
const wavPattern = /\/assets\/shared\/audio\/warm-v001\/warm-[a-z]+\.wav(?:\?|$)/;
const resources = new WeakMap<Page, { responses: { url: string; status: number }[]; failures: string[] }>();

test.beforeEach(async ({ page }) => {
  const audioResources = { responses: [] as { url: string; status: number }[], failures: [] as string[] };
  resources.set(page, audioResources);
  page.on('response', response => {
    if (wavPattern.test(response.url())) audioResources.responses.push({ url: response.url(), status: response.status() });
  });
  page.on('requestfailed', request => {
    if (wavPattern.test(request.url())) audioResources.failures.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.addInitScript(() => {
    const browser = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const NativeAudioContext = browser.AudioContext ?? browser.webkitAudioContext;
    const probe: MobileSoundProbe = { available: Boolean(NativeAudioContext), contexts: [], created: [], resumes: [], starts: [] };
    window.__mobileSoundProbe = probe;
    if (!NativeAudioContext) return;
    const contextIds = new WeakMap<BaseAudioContext, number>();
    let gesture: AudioGesture | null = null;
    const observeGesture = (event: Event) => {
      const current = { type: event.type, trusted: event.isTrusted,
        pointerType: 'pointerType' in event ? String(event.pointerType) : null };
      gesture = current;
      // Keep the event through all capture listeners. Browsers may run a
      // microtask checkpoint between native event-listener callbacks.
      setTimeout(() => { if (gesture === current) gesture = null; }, 0);
    };
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
      document.addEventListener(type, observeGesture, { capture: true, passive: true });
    }
    const call = (context: BaseAudioContext): AudioCall => ({
      contextId: contextIds.get(context) ?? -1, time: performance.now(), state: String(context.state),
      gesture: gesture ? { ...gesture } : null,
      activation: { isActive: navigator.userActivation?.isActive ?? null,
        hasBeenActive: navigator.userActivation?.hasBeenActive ?? null },
    });

    // These wrappers call the native constructor and methods unchanged. They do
    // not resume, create a source, grant permission or synthesize a user event.
    const nativeResume = NativeAudioContext.prototype.resume;
    NativeAudioContext.prototype.resume = function () {
      const entry: AudioResume = { ...call(this), outcome: 'pending', stateAfter: null, error: null };
      probe.resumes.push(entry);
      const result = nativeResume.call(this);
      void result.then(() => { entry.outcome = 'resolved'; entry.stateAfter = String(this.state); }, (error: unknown) => {
        entry.outcome = 'rejected'; entry.stateAfter = String(this.state);
        entry.error = error instanceof Error ? error.name : String(error);
      });
      return result;
    };
    const nativeCreateSource = NativeAudioContext.prototype.createBufferSource;
    NativeAudioContext.prototype.createBufferSource = function () {
      const source = nativeCreateSource.call(this);
      const nativeStart = source.start;
      source.start = function (...args: Parameters<AudioBufferSourceNode['start']>) {
        nativeStart.apply(this, args);
        const buffer = this.buffer;
        let squared = 0, nonZeroSamples = 0, peak = 0;
        if (buffer) for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          for (const sample of buffer.getChannelData(channel)) {
            squared += sample * sample;
            peak = Math.max(peak, Math.abs(sample));
            if (sample !== 0) nonZeroSamples++;
          }
        }
        const samples = buffer ? buffer.length * buffer.numberOfChannels : 0;
        probe.starts.push({ ...call(this.context), duration: buffer?.duration ?? 0, sampleRate: buffer?.sampleRate ?? 0,
          samples, nonZeroSamples, peak, rms: samples ? Math.sqrt(squared / samples) : 0 });
      };
      return source;
    };
    const ObservedAudioContext = new Proxy(NativeAudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        probe.contexts.push(context); contextIds.set(context, probe.contexts.length);
        probe.created.push(call(context));
        return context;
      },
    });
    if (browser.AudioContext) browser.AudioContext = ObservedAudioContext;
    if (browser.webkitAudioContext) browser.webkitAudioContext = ObservedAudioContext;
  });
});

async function readProbe(page: Page) {
  return page.evaluate(() => {
    const probe = window.__mobileSoundProbe;
    return { available: probe.available, created: probe.created, resumes: probe.resumes, starts: probe.starts,
      states: probe.contexts.map((context, index) => ({ contextId: index + 1, state: String(context.state) })) };
  });
}

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const probe = await readProbe(page).catch(() => null);
  await testInfo.attach('native-touch-audio-observation', { contentType: 'application/json',
    body: JSON.stringify({ probe, resources: resources.get(page),
      scope: 'Native API and decoded waveform observation; this does not measure an iPhone speaker.' }, null, 2) });
});

async function touch(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: .999 });
  const rect = (await control.boundingBox())!;
  await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function expectRealTap(call: AudioCall) {
  expect(call.gesture?.trusted).toBe(true);
  expect(['pointerup', 'touchend', 'click']).toContain(call.gesture?.type);
  if (call.gesture?.type === 'pointerup') expect(call.gesture.pointerType).toBe('touch');
  if (call.activation.isActive !== null) expect(call.activation.isActive).toBe(true);
  if (call.activation.hasBeenActive !== null) expect(call.activation.hasBeenActive).toBe(true);
}

function expectNonSilentBuffer(start: AudioStart) {
  expect(start.state).toBe('running');
  expect(start.duration).toBeCloseTo(.165, 3);
  expect(start.sampleRate).toBeGreaterThan(0);
  expect(start.samples).toBeGreaterThan(0);
  expect(start.nonZeroSamples).toBeGreaterThan(0);
  expect(start.peak).toBeGreaterThan(0);
  expect(start.rms).toBeGreaterThan(0);
}

test('默认40%真实触屏首次试听启动原生音频，真实挂起后下一次tap恢复且WAV非静音', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/settings');
  await expect(page.getByTestId('sound-enabled')).toBeChecked();
  await expect(page.getByTestId('sound-volume')).toHaveValue('40');
  await page.waitForTimeout(250);
  const before = await readProbe(page);
  expect(before.available).toBe(true);
  expect(before.created).toEqual([]); expect(before.starts).toEqual([]);

  await touch(page, page.getByTestId('sound-test'));
  await expect.poll(async () => (await readProbe(page)).starts.length).toBeGreaterThan(0);
  const first = await readProbe(page);
  expect(first.created).toHaveLength(1);
  expectRealTap(first.created[0]);
  for (const resume of first.resumes) expectRealTap(resume);
  expect(first.states[0].state).toBe('running');
  expectNonSilentBuffer(first.starts[0]);
  // A context created directly in a permitted gesture may already be running;
  // zero resume() calls on the initial tap are valid native browser behaviour.
  const wav = resources.get(page)!;
  expect(wav.responses.some(response => /warm-button\.wav(?:\?|$)/.test(response.url))).toBe(true);
  expect(wav.responses.every(response => response.status >= 200 && response.status < 400)).toBe(true);
  expect(wav.failures).toEqual([]);

  await page.waitForTimeout(200); // Beyond the real button cue and its 80ms rate limit.
  await page.evaluate(async () => { await window.__mobileSoundProbe.contexts[0].suspend(); });
  const suspended = await readProbe(page);
  expect(suspended.states[0].state).toBe('suspended');
  await touch(page, page.getByTestId('sound-test'));
  await expect.poll(async () => (await readProbe(page)).starts.length).toBeGreaterThan(first.starts.length);
  const resumed = await readProbe(page);
  expect(resumed.created).toHaveLength(1);
  expect(resumed.states[0].state).toBe('running');
  expect(resumed.resumes.length).toBeGreaterThan(suspended.resumes.length);
  const freshResumes = resumed.resumes.slice(suspended.resumes.length);
  for (const resume of freshResumes) expectRealTap(resume);
  // Earlier attempts are allowed to remain pending; a fresh accepted attempt
  // must resolve and produce real feedback rather than wait behind them.
  expect(freshResumes.some(resume => resume.outcome === 'resolved' && resume.stateAfter === 'running' && resume.error === null)).toBe(true);
  for (const start of resumed.starts.slice(first.starts.length)) expectNonSilentBuffer(start);
  expect(wav.responses.every(response => response.status < 400)).toBe(true);
  expect(wav.failures).toEqual([]); expect(errors).toEqual([]);
});

for (const preferences of [{ version: 1, enabled: false, volume: .4 }, { version: 1, enabled: true, volume: 0 }]) {
  test(`合法${preferences.enabled ? '零音量' : '关闭音效'}偏好不被真实tap绕过或改写`, async ({ page }) => {
    await page.addInitScript(({ key, preferences }) => localStorage.setItem(key, JSON.stringify(preferences)),
      { key: SOUND_SETTINGS_KEY, preferences });
    await page.goto('/#/settings');
    await expect(page.getByTestId('sound-enabled')).toBeChecked({ checked: preferences.enabled });
    await expect(page.getByTestId('sound-volume')).toHaveValue(String(preferences.volume * 100));
    await expect(page.getByTestId('sound-test')).toBeDisabled();
    // A real, enabled navigation control still reaches the common gesture and
    // interface sound handlers; the saved preference must suppress both paths.
    await touch(page, page.getByRole('link', { name: '主题', exact: true }));
    await expect(page).toHaveURL(/\/#\/themes$/);
    await page.waitForTimeout(250);
    const quiet = await readProbe(page);
    expect(quiet.available).toBe(true);
    expect(quiet.created).toEqual([]); expect(quiet.resumes).toEqual([]); expect(quiet.starts).toEqual([]);
    expect(resources.get(page)!.responses).toEqual([]);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SOUND_SETTINGS_KEY)).toEqual(preferences);
  });
}
