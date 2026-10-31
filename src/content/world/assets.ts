/** Separate from the 2D image catalogue: world resources can also be GLB/audio. */
export function worldAssetUrl(path: string): string {
  if (!/^[a-z0-9][a-z0-9./-]*$/i.test(path) || path.includes('..') || path.split('/').some(part => !part || part === '.')) {
    throw new Error('World asset paths must be relative to assets/world.');
  }
  return `${import.meta.env.BASE_URL}assets/world/${path}`;
}

export interface WorldStoryImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** Approved first art sample; later regions keep their own versioned assets. */
export const WORLD_ART_SAMPLE = {
  courtyard: 'courtyard/v002/courtyard.glb',
  traveler: 'shared/v001/traveler.glb',
} as const;
