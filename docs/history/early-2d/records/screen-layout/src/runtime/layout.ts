import type { Point, Rectangle } from '../games/spot-difference/rules';

export interface GameLayout {
  width: number;
  height: number;
  stacked: boolean;
  reference: Rectangle;
  edited: Rectangle;
  referenceLabel: Point;
  editedLabel: Point;
}

/** Rectangles are canvas CSS pixels; both images retain the complete 3:2 composition. */
export function calculateLayout(containerWidth: number): GameLayout {
  const width = Math.max(1, Math.floor(Number.isFinite(containerWidth) ? containerWidth : 1));
  const padding = Math.min(8, width / 20);
  const gap = width < 760 ? 18 : 24;
  const labelHeight = 28;
  const stacked = width < 760;
  const imageWidth = stacked ? width - padding * 2 : (width - padding * 2 - gap) / 2;
  const imageHeight = imageWidth * 2 / 3;
  const reference = { x: padding, y: labelHeight, width: imageWidth, height: imageHeight };
  const edited = {
    x: stacked ? padding : padding + imageWidth + gap,
    y: stacked ? labelHeight * 2 + imageHeight + gap : labelHeight,
    width: imageWidth,
    height: imageHeight,
  };
  return {
    width,
    height: Math.ceil(edited.y + imageHeight + padding),
    stacked,
    reference,
    edited,
    referenceLabel: { x: reference.x, y: reference.y - labelHeight },
    editedLabel: { x: edited.x, y: edited.y - labelHeight },
  };
}
