import type { PuzzleLevel } from '../../types';
import type { Point, Rectangle } from '../../runtime/geometry';

export interface PuzzleState { turns: number[]; placedIds: number[]; selectedId: number | null; order: number[] }
export interface PieceEdges { top: number; right: number; bottom: number; left: number }
export interface PieceLayout {
  id: number; placed: boolean; turns: number; displayRect: Rectangle | null; targetRect: Rectangle;
  visible: boolean; fullyVisible: boolean;
}
export interface PuzzleLayout {
  width: number; height: number; mode: PuzzleLevel['mode']; board: Rectangle; tray: Rectangle | null;
  trayScrollbar: Rectangle | null; trayScroll: number; trayMaxScroll: number; trayContentHeight: number;
  trayRowHeight: number; trayColumns: number; pieces: PieceLayout[];
  selectedPieceId: number | null; highlightedId: number | null;
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}
export function createPuzzleState(level: Pick<PuzzleLevel, 'rows' | 'columns' | 'seed' | 'mode'>): PuzzleState {
  const total = level.rows * level.columns;
  const random = seededRandom(level.seed);
  const order = Array.from({ length: total }, (_, id) => id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { order, turns: order.map(() => level.mode === 'rotation' ? 1 + Math.floor(random() * 3) : 0), placedIds: [], selectedId: null };
}
export function rotatePiece(state: PuzzleState, id: number): PuzzleState {
  if (!Number.isInteger(id) || id < 0 || id >= state.turns.length) return state;
  return { ...state, turns: state.turns.map((turn, index) => index === id ? (turn + 1) % 4 : turn) };
}
export function selectPiece(state: PuzzleState, id: number): PuzzleState {
  if (!Number.isInteger(id) || id < 0 || id >= state.turns.length || state.placedIds.includes(id)) return state;
  return { ...state, selectedId: id };
}
export function placePiece(state: PuzzleState, id: number, targetId: number): PuzzleState {
  if (id !== targetId || !Number.isInteger(id) || id < 0 || id >= state.turns.length || state.placedIds.includes(id)) return state;
  return { ...state, placedIds: [...state.placedIds, id], selectedId: null };
}
export function placedCount(state: PuzzleState, mode: PuzzleLevel['mode']): number {
  return mode === 'rotation' ? state.turns.filter(turn => turn === 0).length : state.placedIds.length;
}
export function isPuzzleComplete(state: PuzzleState, mode: PuzzleLevel['mode']): boolean {
  return state.turns.length > 0 && placedCount(state, mode) === state.turns.length;
}
export function contains(point: Point, rectangle: Rectangle): boolean {
  return point.x >= rectangle.x && point.y >= rectangle.y && point.x < rectangle.x + rectangle.width && point.y < rectangle.y + rectangle.height;
}
export function cellAt(point: Point, board: Rectangle, rows: number, columns: number): number | null {
  if (!contains(point, board)) return null;
  return Math.floor((point.y - board.y) / board.height * rows) * columns + Math.floor((point.x - board.x) / board.width * columns);
}
export function acceptsDrop(point: Point, target: Rectangle): boolean {
  const center = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  return contains(point, target) && Math.hypot(point.x - center.x, point.y - center.y) <= Math.max(18, Math.min(target.width, target.height) * .62);
}
export function createPieceEdges(rows: number, columns: number, seed: number): PieceEdges[] {
  const random = seededRandom(seed ^ 0xa5b35791);
  const vertical = Array.from({ length: rows }, () => Array.from({ length: Math.max(0, columns - 1) }, () => random() < .5 ? -1 : 1));
  const horizontal = Array.from({ length: Math.max(0, rows - 1) }, () => Array.from({ length: columns }, () => random() < .5 ? -1 : 1));
  return Array.from({ length: rows * columns }, (_, id) => {
    const row = Math.floor(id / columns), column = id % columns;
    return { top: row ? -horizontal[row - 1][column] : 0, right: column < columns - 1 ? vertical[row][column] : 0,
      bottom: row < rows - 1 ? horizontal[row][column] : 0, left: column ? -vertical[row][column - 1] : 0 };
  });
}
function fit(area: Rectangle, ratio: number): Rectangle {
  const width = Math.min(area.width, area.height * ratio), height = width / ratio;
  return { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height };
}
export function rectangleIntersection(first: Rectangle, second: Rectangle): Rectangle | null {
  const x = Math.max(first.x, second.x), y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
export function fullyWithin(rectangle: Rectangle, bounds: Rectangle): boolean {
  return rectangle.x >= bounds.x - .001 && rectangle.y >= bounds.y - .001
    && rectangle.x + rectangle.width <= bounds.x + bounds.width + .001
    && rectangle.y + rectangle.height <= bounds.y + bounds.height + .001;
}
export function calculatePuzzleLayout(width: number, height: number, ratio: number, level: Pick<PuzzleLevel, 'rows' | 'columns' | 'mode'>,
  state: PuzzleState, requestedScroll = 0, highlightedId: number | null = null): PuzzleLayout {
  width = Math.max(1, Math.floor(Number.isFinite(width) ? width : 1)); height = Math.max(1, Math.floor(Number.isFinite(height) ? height : 1));
  ratio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const padding = Math.min(8, width / 30, height / 30), gap = Math.min(20, width / 25, height / 20);
  const wide = width >= 640 || width > height * 1.35;
  let area: Rectangle = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
  let tray: Rectangle | null = null;
  if (level.mode === 'jigsaw') {
    if (wide) {
      const boardWidth = Math.max(1, (width - padding * 2 - gap) * .62);
      area = { x: padding, y: padding, width: boardWidth, height: height - padding * 2 };
      tray = { x: padding + boardWidth + gap, y: padding, width: width - padding * 2 - gap - boardWidth, height: height - padding * 2 };
    } else {
      const boardHeight = (height - padding * 2 - gap) * .69;
      area = { x: padding, y: padding, width: width - padding * 2, height: boardHeight };
      tray = { x: padding, y: padding + boardHeight + gap, width: width - padding * 2, height: height - padding * 2 - gap - boardHeight };
    }
  }
  // Reserve a real scrollbar beside the viewport without covering or shrinking individual pieces.
  let trayScrollbar: Rectangle | null = null;
  if (tray) {
    const scrollbarWidth = Math.min(20, tray.width * .12);
    trayScrollbar = { x: tray.x + tray.width - scrollbarWidth, y: tray.y, width: scrollbarWidth, height: tray.height };
    tray = { ...tray, width: Math.max(1, tray.width - scrollbarWidth - 4) };
  }
  const board = fit(area, ratio);
  const trayColumns = wide ? (tray && tray.width > 245 ? 3 : 2) : 3;
  const trayRows = wide ? Math.max(2, Math.min(4, Math.floor((tray?.height ?? 0) / 95))) : 2;
  const trayRowHeight = tray ? tray.height / trayRows : 0;
  const unplaced = state.order.filter(id => !state.placedIds.includes(id));
  const trayContentHeight = tray ? Math.ceil(unplaced.length / trayColumns) * trayRowHeight : 0;
  const trayMaxScroll = tray ? Math.max(0, trayContentHeight - tray.height) : 0;
  const trayScroll = Math.max(0, Math.min(trayMaxScroll, Number.isFinite(requestedScroll) ? requestedScroll : 0));
  const cellWidth = board.width / level.columns, cellHeight = board.height / level.rows;
  const pieces = state.turns.map((turns, id): PieceLayout => {
    const targetRect = { x: board.x + id % level.columns * cellWidth, y: board.y + Math.floor(id / level.columns) * cellHeight, width: cellWidth, height: cellHeight };
    const placed = level.mode === 'rotation' ? turns === 0 : state.placedIds.includes(id);
    let displayRect: Rectangle | null = level.mode === 'rotation' || placed ? targetRect : null;
    let visible = displayRect !== null, fullyVisible = visible;
    const index = unplaced.indexOf(id);
    if (tray && index >= 0) {
      const slot = { x: tray.x + index % trayColumns * tray.width / trayColumns,
        y: tray.y + Math.floor(index / trayColumns) * trayRowHeight - trayScroll,
        width: tray.width / trayColumns, height: trayRowHeight };
      const inset = Math.min(7, slot.width / 12, slot.height / 10);
      const inner = { x: slot.x + inset, y: slot.y + inset,
        width: Math.max(1, slot.width - inset * 2), height: Math.max(1, slot.height - inset * 2) };
      // Match native cell proportions; additional knob margins are fitted by the scene.
      displayRect = fit(inner, cellWidth / cellHeight);
      visible = rectangleIntersection(displayRect, tray) !== null;
      fullyVisible = fullyWithin(displayRect, tray);
      if (!visible) displayRect = null;
    }
    return { id, placed, turns, targetRect, displayRect, visible, fullyVisible };
  });
  return { width, height, mode: level.mode, board, tray, trayScrollbar, trayScroll, trayMaxScroll, trayContentHeight,
    trayRowHeight, trayColumns, pieces, selectedPieceId: state.selectedId, highlightedId };
}

/** Scroll only as far as needed to reveal a complete row containing the requested piece. */
export function scrollToPuzzlePiece(layout: PuzzleLayout, state: PuzzleState, id: number): number {
  if (!layout.tray || state.placedIds.includes(id)) return layout.trayScroll;
  const index = state.order.filter(pieceId => !state.placedIds.includes(pieceId)).indexOf(id);
  if (index < 0) return layout.trayScroll;
  const top = Math.floor(index / layout.trayColumns) * layout.trayRowHeight;
  const bottom = top + layout.trayRowHeight;
  const offset = top < layout.trayScroll ? top
    : bottom > layout.trayScroll + layout.tray.height ? bottom - layout.tray.height : layout.trayScroll;
  return Math.max(0, Math.min(layout.trayMaxScroll, offset));
}
