/** Technical WebP derivatives; stable content IDs and archived PNG paths stay intact. */
const categoryCounts: Readonly<Record<string, number>> = {
  instruments: 51,
  clothing: 138,
  animals: 108,
  patterns: 39,
  plants: 33,
  ritual: 151,
};

const backgrounds: Readonly<Record<string, string>> = {
  '/assets/shared/hidden-object-backgrounds/v001/chapter-1-silk.png':
    '/assets/shared/hidden-object-backgrounds/v002/chapter-1-silk.webp',
  '/assets/shared/hidden-object-backgrounds/v001/chapter-2-celadon.png':
    '/assets/shared/hidden-object-backgrounds/v002/chapter-2-celadon.webp',
  '/assets/shared/hidden-object-backgrounds/v001/chapter-3-plaster.png':
    '/assets/shared/hidden-object-backgrounds/v002/chapter-3-plaster.webp',
};

/** Convert registered canonical paths before applying Vite BASE_URL; other assets pass through. */
export function getHiddenObjectRuntimeImagePath(path: string): string {
  if (Object.hasOwn(backgrounds, path)) return backgrounds[path];
  const match = /^\/assets\/shared\/hidden-object\/v002\/([a-z]+)-(\d{3})\.png$/.exec(path);
  if (!match) return path;
  const [, category, number] = match;
  if (!Object.hasOwn(categoryCounts, category)) return path;
  const count = categoryCounts[category];
  if (Number(number) < 1 || Number(number) > count) return path;
  return `/assets/shared/hidden-object/v003/${category}-${number}.webp`;
}
