import { describe, expect, it } from 'vitest';
import { musicUpperFloorPatternLayout } from '../../src/world/music-upper-floor-material-v001';

describe('music upper hall floor ornament', () => {
  it('keeps a half-metre band inside the measured hall', () => {
    const p = musicUpperFloorPatternLayout(11.5075, 10.325);
    expect(p.inset).toBe(.3);
    expect(p.band).toBe(.5);
    expect(p.width - 2 * (p.inset + p.band)).toBeGreaterThan(0);
    expect(p.depth - 2 * (p.inset + p.band)).toBeGreaterThan(0);
    expect(() => musicUpperFloorPatternLayout(0, 10)).toThrow();
  });

  it('scales down the ornament for the shallower terrace without changing the hall default', () => {
    const p = musicUpperFloorPatternLayout(10.3076, 4.2, { inset: .15, band: .24, leftInsetExtra: .35 });
    expect(p.band).toBe(.24);
    expect(p.inset).toBe(.15);
    expect(p.leftInsetExtra).toBe(.35);
    expect(p.depth - 2 * (p.inset + p.band)).toBeGreaterThan(0);
    expect(p.outerRadius).toBeLessThan(.27);
    expect(musicUpperFloorPatternLayout(11.5075, 10.325).band).toBe(.5);
    expect(musicUpperFloorPatternLayout(11.5075, 10.325).leftInsetExtra).toBe(0);
    expect(() => musicUpperFloorPatternLayout(3, 3, { inset: 1, band: 1 })).toThrow();
  });
});
