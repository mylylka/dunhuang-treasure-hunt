import type { HiddenObjectRecipe } from './games/hidden-object/types';
import type { ShadowMatchSnapshot } from './games/shadow-match/types';

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
  additionalRegions?: NormalizedRegion[];
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
  mode: 'rotation' | 'jigsaw' | 'gallery-order';
  /** Number of left-to-right mural slices for gallery-order mode. */
  sliceCount?: number;
  rows: number;
  columns: number;
  seed: number;
}
export interface HiddenObjectLevel extends LevelMetadata, HiddenObjectRecipe {
  gameType: 'hidden-object';
  chapter?: { id: string; title: string; order: number; level: number; backgroundAssetId: string };
}
export interface ShadowMatchLevel extends LevelMetadata {
  gameType: 'shadow-match';
  referenceAssetId: string;
  options: { id: string; assetId: string }[];
  correctOptionId: string;
  hints: { text: string; region: NormalizedRegion }[];
}
export interface HiddenObjectSnapshot {
  status: 'ready' | 'running' | 'paused' | 'won' | 'timeout';
  remainingMs: number;
  foundCount: number;
  totalTargets: number;
  tasks: { id: string; label: string; required: number; found: number; previewSpriteId: string }[];
  selectedTaskId: string;
  zoom: 1 | 2 | 3;
  scrollTop: number;
  scrollMax: number;
}
export type Level = SpotDifferenceLevel | ColoringLevel | PuzzleLevel | HiddenObjectLevel | ShadowMatchLevel;
export type RegionColors = Record<string, string>;
export type ColoringMaterialId = 'sparkle-gold-v001' | 'sparkle-silver-v001';
export type RegionMaterials = Record<string, ColoringMaterialId>;
export type SoundCue = 'button' | 'rotate' | 'success' | 'error' | 'fill' | 'hint' | 'complete' | 'gallery-unlock' | 'guide-stardust';
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
  | { type: 'hidden-start' | 'hidden-pause' | 'hidden-resume' | 'hidden-new-round'; sequence: number }
  | { type: 'hidden-select-task'; taskId: string; sequence: number }
  | { type: 'shadow-select'; optionId: string; sequence: number }
  | { type: 'hidden-scroll'; offset: number; sequence: number }
  | { type: 'select-color'; color: string | null; material?: ColoringMaterialId; sequence: number }
  | { type: 'set-zoom'; zoom: 1 | 2 | 3; sequence: number }
  | { type: 'puzzle-scroll'; offset: number; sequence: number }
  | { type: 'set-motion'; reducedMotion: boolean; sequence: number };
export type GameEvent =
  | { type: 'feedback'; cue: SoundCue }
  | { type: 'ready'; total: number }
  | { type: 'progress'; foundIds: string[]; total: number }
  | { type: 'hint'; message: string }
  | { type: 'coloring-change'; colors: RegionColors; materials?: RegionMaterials; paintedCount: number; canUndo: boolean; zoom: number }
  | { type: 'spot-view-change'; zoom: number; center: { x: number; y: number } }
  | { type: 'puzzle-change'; placedCount: number; total: number }
  | { type: 'hidden-object-change'; snapshot: HiddenObjectSnapshot }
  | { type: 'shadow-match-change'; snapshot: ShadowMatchSnapshot }
  | { type: 'completed'; levelId: string }
  | { type: 'error'; message: string };
