import type { ContentCatalog, Level } from '../types';
import { getLevelChoices } from '../content/level-roadmap';

/** The visible catalog order, with planned slots removed. No progress is changed. */
export function getNextOpenLevel(catalog: Pick<ContentCatalog, 'levels'>, current: Level): Level | null {
  const sequence = getLevelChoices(catalog, current.themeId, current.gameType)
    .flatMap(choice => choice.status === 'available' ? [choice.level] : []);
  const index = sequence.findIndex(level => level.id === current.id);
  return index >= 0 ? sequence[index + 1] ?? null : null;
}

export function getPreviousOpenLevel(catalog: Pick<ContentCatalog, 'levels'>, current: Level): Level | null {
  const sequence = getLevelChoices(catalog, current.themeId, current.gameType)
    .flatMap(choice => choice.status === 'available' ? [choice.level] : []);
  const index = sequence.findIndex(level => level.id === current.id);
  return index > 0 ? sequence[index - 1] : null;
}

/** Keep four-character names in complete two-character words on narrow rails. */
export function compactTitleWords(title: string): string[] {
  const short = title.split(/[：:]/)[0];
  if (short === '九色鹿王本生') return ['九色鹿', '王本生'];
  const characters = Array.from(short);
  return characters.length === 4 ? [characters.slice(0, 2).join(''), characters.slice(2).join('')] : [short];
}
