import { describe, expect, it } from 'vitest';
import { gamesPath, levelsPath, playPath, readRoute, routeKey, themePath } from '../../src/app/navigation';

describe('主题、教学、玩法、关卡和游玩路由分层', () => {
  it.each([
    ['#/', { page: 'home' }],
    ['#/theme/patterns', { page: 'theme', id: 'patterns' }],
    ['#/theme/patterns/games', { page: 'games', themeId: 'patterns' }],
    ['#/theme/patterns/games/spot-difference', { page: 'levels', themeId: 'patterns', gameType: 'spot-difference' }],
    ['#/play/patterns-intro', { page: 'play', id: 'patterns-intro' }],
    ['#/result/patterns-intro', { page: 'result', id: 'patterns-intro' }],
    ['#/theme/patterns/games/unknown', { page: 'missing' }],
    ['#/theme/%zz', { page: 'missing' }],
    ['#/play/id/extra', { page: 'missing' }],
  ])('%s 对应正确层级', (path, route) => expect(readRoute(path)).toEqual(route));
  it('切换玩法有独立页面身份，返回链接明确指向父级', () => {
    expect(themePath('patterns')).toBe('/theme/patterns');
    expect(gamesPath('patterns')).toBe('/theme/patterns/games');
    expect(levelsPath('patterns', 'puzzle')).toBe('/theme/patterns/games/puzzle');
    expect(playPath('patterns-intro')).toBe('/play/patterns-intro');
    expect(routeKey(readRoute('#/theme/patterns/games/puzzle'))).not.toBe(routeKey(readRoute('#/theme/patterns/games/coloring')));
  });
});
