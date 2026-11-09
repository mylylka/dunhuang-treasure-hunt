import type { ContentCatalog, GameType, SpotDifferenceLevel } from '../types';

/** Editorial plans are separate from validated, playable level content. */
export interface LevelRoadmapEntry {
  id: string;
  themeId: string;
  gameType: GameType;
  title: string;
  plannedDifferenceCount: number;
  learningFocus: string;
  motif: 'caisson' | 'lotus' | 'scroll' | 'beads' | 'rabbits' | 'colors';
}

export const levelRoadmap: readonly LevelRoadmapEntry[] = [
  { id: 'patterns-intro', themeId: 'patterns', gameType: 'spot-difference', title: '藻井寻踪', plannedDifferenceCount: 5, learningFocus: '中心与外圈', motif: 'caisson' },
  { id: 'patterns-lotus', themeId: 'patterns', gameType: 'spot-difference', title: '莲瓣与团花', plannedDifferenceCount: 4, learningFocus: '花瓣层次', motif: 'lotus' },
  { id: 'patterns-scrolls', themeId: 'patterns', gameType: 'spot-difference', title: '忍冬与卷草', plannedDifferenceCount: 4, learningFocus: '叶形曲线', motif: 'scroll' },
  { id: 'patterns-geometry', themeId: 'patterns', gameType: 'spot-difference', title: '联珠与几何', plannedDifferenceCount: 5, learningFocus: '重复单元', motif: 'beads' },
  { id: 'patterns-rabbits', themeId: 'patterns', gameType: 'spot-difference', title: '三兔与旋转', plannedDifferenceCount: 5, learningFocus: '共用轮廓与方向', motif: 'rabbits' },
  { id: 'patterns-colors', themeId: 'patterns', gameType: 'spot-difference', title: '色彩与层次', plannedDifferenceCount: 6, learningFocus: '冷暖与明暗', motif: 'colors' },
];

export type LevelChoice =
  | { id: string; title: string; status: 'available'; level: SpotDifferenceLevel; roadmap?: LevelRoadmapEntry }
  | { id: string; title: string; status: 'planned'; roadmap: LevelRoadmapEntry };

/** Availability comes only from the actual catalog, never from a roadmap slot. */
export function getLevelChoices(catalog: Pick<ContentCatalog, 'levels'>, themeId: string, gameType: GameType): LevelChoice[] {
  const levels = catalog.levels.filter(level => level.themeId === themeId && level.gameType === gameType);
  const actualById = new Map(levels.map(level => [level.id, level]));
  const plans = levelRoadmap.filter(entry => entry.themeId === themeId && entry.gameType === gameType);
  const plannedIds = new Set(plans.map(entry => entry.id));
  return [
    ...plans.map((roadmap): LevelChoice => {
      const level = actualById.get(roadmap.id);
      return level
        ? { id: level.id, title: roadmap.title, status: 'available', level, roadmap }
        : { id: roadmap.id, title: roadmap.title, status: 'planned', roadmap };
    }),
    ...levels.filter(level => !plannedIds.has(level.id)).map((level): LevelChoice => ({
      id: level.id, title: level.title, status: 'available', level,
    })),
  ];
}
