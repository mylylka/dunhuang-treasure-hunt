import type { GameType } from '../types';

export type Route = { page: 'home' | 'help' | 'settings' | 'missing' }
  | { page: 'theme' | 'play' | 'result'; id: string }
  | { page: 'games'; themeId: string }
  | { page: 'levels'; themeId: string; gameType: GameType };

const gameTypes: GameType[] = ['spot-difference', 'puzzle', 'coloring', 'hidden-object', 'shadow-match'];
export const gameNames: Record<GameType, string> = {
  'spot-difference': '找不同', puzzle: '拼图', coloring: '填色',
  'hidden-object': '线索找物', 'shadow-match': '影子配对',
};

export function readRoute(hash = window.location.hash): Route {
  let parts: string[];
  try { parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return { page: 'missing' }; }
  if (!parts.length) return { page: 'home' };
  if (parts.length === 1 && (parts[0] === 'help' || parts[0] === 'settings')) return { page: parts[0] };
  if (parts.length === 2 && ['theme', 'play', 'result'].includes(parts[0])) {
    return { page: parts[0] as 'theme' | 'play' | 'result', id: parts[1] };
  }
  if (parts[0] === 'theme' && parts[2] === 'games') {
    if (parts.length === 3) return { page: 'games', themeId: parts[1] };
    if (parts.length === 4 && gameTypes.includes(parts[3] as GameType)) {
      return { page: 'levels', themeId: parts[1], gameType: parts[3] as GameType };
    }
  }
  return { page: 'missing' };
}

export const themePath = (id: string) => `/theme/${encodeURIComponent(id)}`;
export const gamesPath = (id: string) => `${themePath(id)}/games`;
export const levelsPath = (themeId: string, type: GameType) => `${gamesPath(themeId)}/${type}`;
export const playPath = (id: string) => `/play/${encodeURIComponent(id)}`;
export function goTo(path: string) { window.location.hash = path; }
export function routeKey(route: Route) {
  if (route.page === 'levels') return `levels:${route.themeId}:${route.gameType}`;
  if (route.page === 'games') return `games:${route.themeId}`;
  return 'id' in route ? `${route.page}:${route.id}` : route.page;
}
