import { describe, expect, it } from 'vitest';
import { firstGalleryModelPaths } from '../../src/world/first-gallery-mobile-assets';

describe('connected gallery mobile models', () => {
  it('keeps the approved desktop model paths', () => {
    expect(firstGalleryModelPaths(false)).toEqual({
      courtyard: 'courtyard/v007/courtyard.glb',
      traveler: 'traveler-tripo/v002/traveler.glb',
    });
  });

  it('uses the lossless derivatives only when explicitly selected', () => {
    expect(firstGalleryModelPaths(true)).toEqual({
      courtyard: 'courtyard/v007/courtyard-meshopt-mobile.glb',
      traveler: 'traveler-tripo/v002/traveler-meshopt-mobile.glb',
    });
  });
});
