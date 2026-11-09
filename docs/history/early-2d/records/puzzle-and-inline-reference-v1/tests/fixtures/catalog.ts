import type { ContentCatalog, SpotDifferenceLevel } from '../../src/types';

export function makeLevel(id = 'test-intro'): SpotDifferenceLevel {
  return {
    schemaVersion: 1, id, themeId: 'test-theme', gameType: 'spot-difference',
    title: '独立测试关', subtitle: '不进入正式目录', objective: '验证内容驱动', difficulty: '测试', estimatedMinutes: 1,
    thumbnailAssetId: 'test-a', baseAssetId: 'test-a', editedAssetId: 'test-b', teachingNote: '测试内容，不是文化资料',
    source: { title: '测试', url: 'https://example.com', note: '测试专用' },
    differences: [
      { id: 'test-one', region: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, hint: '观察左上', detailHint: '看左上大形', explanation: '形状改变' },
      { id: 'test-two', region: { x: 0.65, y: 0.65, width: 0.2, height: 0.2 }, hint: '观察右下', detailHint: '看右下大形', explanation: '方向改变' },
    ],
  };
}

export function makeCatalog(): ContentCatalog & { levels: SpotDifferenceLevel[] } {
  return {
    schemaVersion: 1,
    themes: [{ id: 'test-theme', title: '测试主题', subtitle: '隔离配置', description: '测试主题', number: '00', coverAssetId: 'test-a', introLevelId: 'test-intro', allowedGameTypes: ['spot-difference'] }],
    assets: ['test-a', 'test-b'].map(id => ({ id, path: `/assets/${id}.svg`, width: 1200, height: 800, kind: 'level' as const, placeholder: true, version: 'test-v1', sourceNote: '仅自动化测试' })),
    levels: [makeLevel()],
  };
}
