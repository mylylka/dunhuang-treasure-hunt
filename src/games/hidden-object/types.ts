export interface HiddenObjectBoard {
  width: number;
  height: number;
  columns: number;
  rows: number;
  /** Spatial-index resolution, not one item per cell. Insets use logical pixels. */
  inset: number;
  /** Retained for old recipes; continuous scatter does not snap to cell centers. */
  jitter: number;
  minScale?: number;
  maxScale?: number;
  maxRotationDegrees?: number;
}

export interface HiddenObjectRecipe {
  poolId: string;
  board: HiddenObjectBoard;
  categoryQuotas: { categoryId: string; count: number }[];
  tasks: { groupIds: string[]; groupCount: number; minCount: number; maxCount: number; totalCount?: number };
  timeLimitSeconds: number;
}

export interface HiddenObjectSprite {
  id: string;
  categoryId: string;
  path: string;
  width: number;
  height: number;
  groupIds: string[];
  /** A point on the visible foreground, normalized to the sprite image. */
  hitPoint: { x: number; y: number };
}

export interface HiddenObjectPool {
  id: string;
  groups: { id: string; label: string }[];
  sprites: HiddenObjectSprite[];
}

export interface HiddenObjectItem {
  /** Unique placed instance; multiple answers may share one spriteId. */
  id: string;
  spriteId: string;
  categoryId: string;
  groupId?: string;
  /** Top-left coordinates and uncropped dimensions in logical board pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Radians, rotating around the unrotated rectangle's center. */
  rotation: number;
}

export interface HiddenObjectTask {
  id: string;
  label: string;
  required: number;
  found: number;
  /** Exact answer identity as well as the task-card image; group membership alone never counts. */
  previewSpriteId: string;
}

export interface HiddenObjectRound {
  poolId: string;
  seed: number;
  board: HiddenObjectBoard;
  items: HiddenObjectItem[];
  tasks: HiddenObjectTask[];
}

export type HiddenObjectStatus = 'ready' | 'running' | 'paused' | 'won' | 'timeout';

export interface HiddenObjectSession {
  round: HiddenObjectRound;
  status: HiddenObjectStatus;
  durationMs: number;
  remainingMs: number;
  foundIds: string[];
  tasks: HiddenObjectTask[];
}
