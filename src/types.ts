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
export interface LevelMetadata {
  schemaVersion: 1;
  id: string;
  themeId: string;
  title: string;
  subtitle: string;
  objective: string;
  difficulty: string;
  estimatedMinutes: number;
  thumbnailAssetId: string;
  teachingNote: string;
  source: { title: string; url: string; note: string };
}
export interface SpotDifferenceLevel extends LevelMetadata {
  gameType: 'spot-difference';
  baseAssetId: string;
  editedAssetId: string;
  differences: DifferenceDefinition[];
}
export interface ColoringRegion {
  id: number;
  label: string;
  region: NormalizedRegion;
  point: { x: number; y: number };
  pixelCount: number;
}
export interface ColoringLevel extends LevelMetadata {
  gameType: 'coloring';
  referenceAssetId: string;
  lineAssetId: string;
  regionMapAssetId: string;
  artworkVersion: string;
  palette: { id: string; label: string; color: string }[];
  regions: ColoringRegion[];
}
export interface PuzzleLevel extends LevelMetadata {
  gameType: 'puzzle';
  imageAssetId: string;
  mode: 'rotation' | 'jigsaw';
  rows: number;
  columns: number;
  seed: number;
}
export type Level = SpotDifferenceLevel | ColoringLevel | PuzzleLevel;
export type RegionColors = Record<string, string>;
export type SoundCue = 'button' | 'rotate' | 'success' | 'error' | 'fill' | 'hint' | 'complete';
export interface ContentCatalog {
  schemaVersion: 1;
  themes: ThemeDefinition[];
  assets: AssetDefinition[];
  levels: Level[];
}
export interface ProgressData {
  version: 1;
  completed: Record<string, string>;
  settings: { reducedMotion: boolean };
}
export type GameCommand =
  | { type: 'hint' | 'restart' | 'undo' | 'finish'; sequence: number }
  | { type: 'select-color'; color: string | null; sequence: number }
  | { type: 'set-zoom'; zoom: 1 | 2 | 3; sequence: number }
  | { type: 'puzzle-scroll'; offset: number; sequence: number }
  | { type: 'set-motion'; reducedMotion: boolean; sequence: number };
export type GameEvent =
  | { type: 'feedback'; cue: SoundCue }
  | { type: 'ready'; total: number }
  | { type: 'progress'; foundIds: string[]; total: number }
  | { type: 'hint'; message: string }
  | { type: 'coloring-change'; colors: RegionColors; paintedCount: number; canUndo: boolean; zoom: 1 | 2 | 3 }
  | { type: 'puzzle-change'; placedCount: number; total: number }
  | { type: 'completed'; levelId: string }
  | { type: 'error'; message: string };
