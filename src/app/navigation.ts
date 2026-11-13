import type { GameType } from '../types';

export type Route = { page: 'home' | 'themes' | 'help' | 'settings' | 'missing' } | { page: 'theme'; id: string }
  | { page: 'play' | 'result'; id: string }
  | { page: 'games'; themeId: string }
  | { page: 'play-latest'; themeId: string; gameType: GameType }
  | { page: 'levels'; themeId: string; gameType: GameType; focusLevelId?: string };

const gameTypes: GameType[] = ['spot-difference', 'puzzle', 'coloring', 'hidden-object', 'shadow-match'];
export const gameNames: Record<GameType, string> = {
  'spot-difference': '找不同', puzzle: '拼图', coloring: '填色',
  'hidden-object': '计时找物', 'shadow-match': '影子配对',
};

export function readRoute(hash = window.location.hash): Route {
  const queryStart = hash.indexOf('?');
  const path = queryStart < 0 ? hash : hash.slice(0, queryStart);
  let parts: string[];
  try { parts = path.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return { page: 'missing' }; }
  if (!parts.length) return { page: 'home' };
  if (parts.length === 1 && (parts[0] === 'help' || parts[0] === 'settings' || parts[0] === 'themes')) return { page: parts[0] };
  if (parts.length === 2) {
    const [page, id] = parts;
    if (page === 'theme') return { page: 'theme', id };
    if (page === 'play' || page === 'result') return { page, id };
  }
  if (parts[0] === 'play-latest' && parts.length === 3 && gameTypes.includes(parts[2] as GameType)) {
    return { page: 'play-latest', themeId: parts[1], gameType: parts[2] as GameType };
  }
  if (parts[0] === 'theme' && parts[2] === 'games') {
    if (parts.length === 3) return { page: 'games', themeId: parts[1] };
    if (parts.length === 4 && gameTypes.includes(parts[3] as GameType)) {
      const focusLevelId = queryStart < 0 ? null : new URLSearchParams(hash.slice(queryStart + 1)).get('level');
      return {
        page: 'levels', themeId: parts[1], gameType: parts[3] as GameType,
        ...(focusLevelId ? { focusLevelId } : {}),
      };
    }
  }
  return { page: 'missing' };
}

export const themePath = (id: string) => `/theme/${encodeURIComponent(id)}`;
export const gamesPath = (id: string) => `${themePath(id)}/games`;
export const levelsPath = (themeId: string, type: GameType, focusLevelId?: string) =>
  `${gamesPath(themeId)}/${type}${focusLevelId ? `?level=${encodeURIComponent(focusLevelId)}` : ''}`;
export const playPath = (id: string) => `/play/${encodeURIComponent(id)}`;
export function goTo(path: string) { window.location.hash = path; }
export function routeKey(route: Route) {
  if (route.page === 'levels') return `levels:${levelsPath(route.themeId, route.gameType, route.focusLevelId)}`;
  if (route.page === 'play-latest') return `play-latest:${route.themeId}:${route.gameType}`;
  if (route.page === 'games') return `games:${route.themeId}`;
  return 'id' in route ? `${route.page}:${route.id}` : route.page;
}
