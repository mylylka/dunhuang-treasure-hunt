import themes from './themes.json';
import assets from './assets.json';
import { assertShellAssets, parseCatalog } from '../services/content-schema';
import type { ContentCatalog } from '../types';
import { lessonBooks } from './lessons';
import { parseLessonBook } from '../services/lesson-schema';

const levelFiles = import.meta.glob('./levels/*.json', { eager: true, import: 'default' });

export function loadCatalog(): ContentCatalog {
  const catalog = parseCatalog({ schemaVersion: 1, themes, assets, levels: Object.values(levelFiles) });
  assertShellAssets(catalog);
  for (const book of lessonBooks) parseLessonBook(book, catalog);
  return catalog;
}

export function getAssetUrl(catalog: ContentCatalog, id: string): string {
  const asset = catalog.assets.find(item => item.id === id);
  if (!asset) throw new Error(`找不到素材：${id}`);
  // An absolute URL also works inside CSS custom properties, where relative URLs
  // would otherwise resolve against the compiled stylesheet's /assets/ directory.
  const url = new URL(`${import.meta.env.BASE_URL}${asset.path.replace(/^\//, '')}`, document.baseURI);
  url.searchParams.set('v', asset.version);
  return url.href;
}
