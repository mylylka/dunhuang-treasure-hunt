import { describe, expect, it } from 'vitest';
import { acceptsDrop, calculatePuzzleLayout, cellAt, createPieceEdges, createPuzzleState, isPuzzleComplete, placePiece, placedCount, rotatePiece, selectPiece } from '../../src/games/puzzle/rules';
import { curvedEdge, pieceCurves } from '../../src/games/puzzle/shapes';
const rotation = { mode: 'rotation' as const, rows: 3, columns: 3, seed: 123 };
const jigsaw = { mode: 'jigsaw' as const, rows: 3, columns: 4, seed: 567 };

describe('旋转和碎片模式判定隔离', () => {
  it('初始9块均确实打乱，按90度恢复后才完成，规则不修改原状态', () => {
    const initial = createPuzzleState(rotation); let state = initial;
    expect(placedCount(initial, 'rotation')).toBe(0);
    for (let id = 0; id < 9; id++) for (let n = 0; n < (4 - initial.turns[id]) % 4; n++) state = rotatePiece(state, id);
    expect(isPuzzleComplete(state, 'rotation')).toBe(true);
    expect(initial.turns.every(turn => turn !== 0)).toBe(true);
    expect(rotatePiece(state, -1)).toBe(state);
  });
  it('12/20片编号完整独立，错位和重复放置不计数', () => {
    for (const level of [jigsaw, { ...jigsaw, rows: 4, columns: 5 }]) {
      let state = createPuzzleState(level); const total = level.rows * level.columns;
      expect(new Set(state.order).size).toBe(total);
      const selected = selectPiece(state, 0); expect(placePiece(selected, 0, 1)).toBe(selected);
      for (let id = 0; id < total; id++) state = placePiece(state, id, id);
      expect(placePiece(state, 0, 0)).toBe(state);
      expect(placedCount(state, 'jigsaw')).toBe(total);
      expect(isPuzzleComplete(state, 'jigsaw')).toBe(true);
      expect(selectPiece(state, 0)).toBe(state);
    }
  });
  it('同一种子复现打乱顺序和切边，不同种子有不同顺序', () => {
    expect(createPuzzleState(jigsaw)).toEqual(createPuzzleState(jigsaw));
    expect(createPuzzleState(jigsaw).order).not.toEqual(createPuzzleState({ ...jigsaw, seed: 568 }).order);
    expect(createPieceEdges(3, 4, 567)).toEqual(createPieceEdges(3, 4, 567));
  });
});

describe('互补曲线与完整图像几何', () => {
  it.each([[3, 4], [4, 5]])('%d×%d内边相反互补，外框平直', (rows, columns) => {
    const edges = createPieceEdges(rows, columns, 67);
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const edge = edges[row * columns + column];
      if (row === 0) expect(edge.top).toBe(0); else expect(edge.top).toBe(-edges[(row - 1) * columns + column].bottom);
      if (column === 0) expect(edge.left).toBe(0); else expect(edge.left).toBe(-edges[row * columns + column - 1].right);
      if (row === rows - 1) expect(edge.bottom).toBe(0);
      if (column === columns - 1) expect(edge.right).toBe(0);
    }
  });
  it('曲边反向后是邻片同一条真实曲线，不只画矩形轮廓', () => {
    const forward = curvedEdge({ x: 0, y: 0 }, { x: 100, y: 0 }, 1, 23);
    const backward = curvedEdge({ x: 100, y: 0 }, { x: 0, y: 0 }, -1, 23).reverse();
    expect(forward).toHaveLength(5);
    for (let i = 0; i < forward.length; i++) {
      for (const axis of ['x', 'y'] as const) {
        expect(forward[i].from[axis]).toBeCloseTo(backward[i].to[axis], 8);
        expect(forward[i].control1[axis]).toBeCloseTo(backward[i].control2[axis], 8);
        expect(forward[i].control2[axis]).toBeCloseTo(backward[i].control1[axis], 8);
      }
    }
    expect(forward.some(curve => curve.control1.y < 0)).toBe(true);
    expect(pieceCurves(100, 80, { top: 1, right: -1, bottom: 0, left: 1 })).toHaveLength(16);
  });
  it.each([[1280, 600], [360, 400], [760, 190]])('%d×%d板与碎片分页都在视口内，resize不改状态', (width, height) => {
    const state = createPuzzleState({ ...jigsaw, rows: 4, columns: 5 }); const before = JSON.stringify(state);
    const level = { ...jigsaw, rows: 4, columns: 5 };
    const layout = calculatePuzzleLayout(width, height, 1, level, state, 99);
    expect(layout.board.width / layout.board.height).toBeCloseTo(1);
    for (const rectangle of [layout.board, layout.tray!]) {
      expect(rectangle.x).toBeGreaterThanOrEqual(0); expect(rectangle.y).toBeGreaterThanOrEqual(0);
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(width + .001);
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(height + .001);
    }
    expect(layout.trayPage).toBe(layout.trayPages - 1);
    expect(layout.pieces.filter(piece => piece.displayRect)).toHaveLength(20 - layout.trayPage * layout.pageSize);
    expect(JSON.stringify(state)).toBe(before);
    expect(cellAt({ x: -1, y: -1 }, layout.board, 4, 5)).toBeNull();
    const target = layout.pieces[0].targetRect;
    expect(acceptsDrop({ x: target.x + target.width / 2, y: target.y + target.height / 2 }, target)).toBe(true);
    expect(acceptsDrop({ x: target.x - 20, y: target.y - 20 }, target)).toBe(false);
  });
  it('放回后的图块从碎片分页移除，不丢未放置的其他片', () => {
    const state = placePiece(createPuzzleState(jigsaw), 0, 0);
    const layout = calculatePuzzleLayout(360, 400, 1, jigsaw, state);
    expect(layout.pieces[0].placed).toBe(true);
    const visibleUnplaced = layout.pieces.filter(piece => !piece.placed && piece.displayRect);
    expect(visibleUnplaced.every(piece => piece.id !== 0)).toBe(true);
    expect(new Set(layout.pieces.map(piece => piece.id)).size).toBe(12);
  });
});
