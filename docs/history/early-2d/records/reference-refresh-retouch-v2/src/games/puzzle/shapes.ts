import type { PieceEdges } from './rules';
import type { Point } from '../../runtime/geometry';

export interface Cubic { from: Point; control1: Point; control2: Point; to: Point }
/** Clockwise edge, with a symmetric neck and rounded knob. Reversing it complements its neighbour. */
export function curvedEdge(start: Point, end: Point, outward: number, depth: number): Cubic[] {
  const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy) || 1;
  const point = (along: number, normal = 0): Point => ({ x: start.x + dx * along + dy / length * normal * depth * outward,
    y: start.y + dy * along - dx / length * normal * depth * outward });
  if (!outward) return [{ from: start, control1: point(1 / 3), control2: point(2 / 3), to: end }];
  return [
    { from: start, control1: point(.12), control2: point(.23), to: point(.34) },
    { from: point(.34), control1: point(.46), control2: point(.35, .7), to: point(.42, .84) },
    { from: point(.42, .84), control1: point(.44, 1), control2: point(.56, 1), to: point(.58, .84) },
    { from: point(.58, .84), control1: point(.65, .7), control2: point(.54), to: point(.66) },
    { from: point(.66), control1: point(.77), control2: point(.88), to: end },
  ];
}
export function pieceCurves(width: number, height: number, edges: PieceEdges): Cubic[] {
  const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const depth = Math.min(width, height) * .23;
  return [edges.top, edges.right, edges.bottom, edges.left].flatMap((edge, index) => curvedEdge(corners[index], corners[(index + 1) % 4], edge, depth));
}
export function tracePiece(context: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'bezierCurveTo' | 'closePath'>,
  width: number, height: number, edges: PieceEdges): void {
  context.beginPath(); context.moveTo(0, 0);
  for (const curve of pieceCurves(width, height, edges)) context.bezierCurveTo(curve.control1.x, curve.control1.y, curve.control2.x, curve.control2.y, curve.to.x, curve.to.y);
  context.closePath();
}
