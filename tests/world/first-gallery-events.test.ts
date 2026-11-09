import { describe, expect, it } from 'vitest';
import { createFirstGalleryEvents, galleryBlockedRegion, galleryNearby } from '../../src/world/first-gallery-events';
import { GALLERY_TARGETS } from '../../src/content/world/first-gallery-v001';
import { toTerrainPoint } from '../../src/world/terrain-rules-v001';
const state = { mural: false, caisson: false, easel: false, unlocked: false };
describe('first gallery exploration cues and access', () => {
  it('walking towards the easel does not consume the cue before stopping', () => {
    const events = createFirstGalleryEvents(), position = GALLERY_TARGETS.easel;
    for (let i = 0; i < 20; i++) { events.cancel(); events.update(position, true, .05, state); }
    expect(events.snapshot()).toMatchObject({ nearby: 'easel', cue: null, easelReady: false });
    for (let i = 0; i < 30; i++) events.update(position, false, .05, state);
    expect(events.snapshot().line?.target).toBe('easel');
    for (let i = 0; i < 100; i++) events.update(position, false, .05, state);
    expect(events.snapshot().line?.target).toBe('pigments');
    events.update(toTerrainPoint('courtyard', { x: -20, z: 0 }), true, .05, state);
    expect(events.consumeIntroduction()).toBeNull();
    events.update(position, false, .05, state);
    expect(events.snapshot()).toMatchObject({ line: null, easelReady: false });
    events.update(position, false, .8, state, true, true);
    expect(events.snapshot().line?.narration).toBe('easel-discover');
  });
  it('does not repeat completed or persisted introductions', () => {
    const seen = createFirstGalleryEvents(['easel']);
    seen.update(GALLERY_TARGETS.easel, false, 2, state);
    expect(seen.snapshot()).toMatchObject({ cue: null, easelReady: true });
    const completed = createFirstGalleryEvents();
    completed.update(GALLERY_TARGETS.easel, false, 2, { ...state, easel: true });
    expect(completed.snapshot()).toMatchObject({ cue: null, easelReady: true });
    expect(galleryNearby(toTerrainPoint('courtyard', { x: -12, z: -15 }))).toBe('caisson');
  });
  it('shows the caisson cue two floor tiles earlier along the entrance approach', () => {
    const at = (x: number, z: number) => galleryNearby(toTerrainPoint('courtyard', { x, z }));
    expect(at(-12, -8.6)).toBe('caisson');
    expect(at(-12, -8.4)).toBeNull();
    expect(at(-16, -12)).toBeNull();
  });
  it('offers the easel only after both lines and the one-second quiet gap', () => {
    const events = createFirstGalleryEvents(), position = GALLERY_TARGETS.easel;
    events.update(position, false, .8, state, true, true);
    expect(events.snapshot().line?.narration).toBe('easel-discover');
    expect(events.advanceCue()).toBe(true);
    expect(events.snapshot()).toMatchObject({ line: null, betweenLines: true, easelReady: false });
    expect(events.advanceCue()).toBe(false);
    events.update(position, false, .04, state, true, true, .95);
    expect(events.snapshot().line).toBeNull();
    events.update(position, false, .04, state, true, true, .06);
    expect(events.snapshot()).toMatchObject({ line: { narration: 'easel-pigments' }, easelReady: false });
    expect(events.consumeIntroduction()).toBeNull();
    expect(events.advanceCue()).toBe(true);
    expect(events.snapshot()).toMatchObject({ line: null, easelReady: true });
    expect(events.consumeIntroduction()).toBe('easel');
    expect(events.consumeIntroduction()).toBeNull();
  });
  it('blocks locked halls from side/rear as well as the entry', () => {
    for (const p of [{ x: 46, z: 5 }, { x: 30, z: -28 }, { x: 68, z: -38 }]) {
      expect(galleryBlockedRegion(toTerrainPoint('music', p), false)).toBe('music');
      expect(galleryBlockedRegion(toTerrainPoint('music', p), true)).toBeNull();
    }
    expect(galleryBlockedRegion(toTerrainPoint('cliff', { x: 122, z: -70 }), true)).toBe('stories');
    expect(galleryBlockedRegion(toTerrainPoint('courtyard', { x: -12, z: -15 }), false)).toBeNull();
  });
});
