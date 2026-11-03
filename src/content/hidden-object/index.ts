import data from './pool.json';
import type { HiddenObjectPool, HiddenObjectSprite } from '../../games/hidden-object/types';

export const hiddenObjectPool = data as HiddenObjectPool;

export function hiddenObjectSpriteUrl(sprite: HiddenObjectSprite): string {
  const base = import.meta.env.BASE_URL;
  return new URL(`${base}${sprite.path.replace(/^\//, '')}`, document.baseURI).href;
}
