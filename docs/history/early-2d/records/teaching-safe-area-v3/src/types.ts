export type GameType = 'spot-difference' | 'hidden-object' | 'shadow-match' | 'puzzle' | 'coloring';
export interface AssetDefinition {
  id: string;
  path: string;
  width: number;
  height: number;
  kind: 'background' | 'panel' | 'button' | 'icon' | 'cover' | 'level' | 'teaching';
  placeholder: boolean;
  version: string;
  sourceNote: string;
  slice?: { top: number; right: number; bottom: number; left: number };
}
export interface ThemeDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  number: string;
  coverAssetId: string;
  introLevelId: string | null;
  allowedGameTypes: GameType[];
}
export interface NormalizedRegion { x: number; y: number; width: number; height: number }
export interface DifferenceDefinition {
  id: string;
  region: NormalizedRegion;
  hint: string;
  detailHint: string;
  explanation?: string;
}
export interface SpotDifferenceLevel {
  schemaVersion: 1;
  id: string;
  themeId: string;
  gameType: 'spot-difference';
  title: string;
  subtitle: string;
  objective: string;
  difficulty: string;
  estimatedMinutes: number;
  thumbnailAssetId: string;
  baseAssetId: string;
  editedAssetId: string;
  teachingNote: string;
  source: { title: string; url: string; note: string };
  differences: DifferenceDefinition[];
}
export interface ContentCatalog {
  schemaVersion: 1;
  themes: ThemeDefinition[];
  assets: AssetDefinition[];
  levels: SpotDifferenceLevel[];
}
export interface ProgressData {
  version: 1;
  completed: Record<string, string>;
  settings: { reducedMotion: boolean };
}
export type GameCommand = { type: 'hint' | 'restart'; sequence: number };
export type GameEvent =
  | { type: 'ready'; total: number }
  | { type: 'progress'; foundIds: string[]; total: number }
  | { type: 'hint'; message: string }
  | { type: 'completed'; levelId: string }
  | { type: 'error'; message: string };
