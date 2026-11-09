import type { Point, Rectangle } from './geometry';

export interface GameLayout {
  width: number;
  height: number;
  stacked: boolean;
  reference: Rectangle;
  edited: Rectangle;
  referenceLabel: Point;
  editedLabel: Point;
}

/** Rectangles are CSS pixels, fitted into the complete available width and height. */
export function calculateLayout(containerWidth: number, containerHeight?: number, imageAspectRatio = 1.5): GameLayout {
  const ratio = Number.isFinite(imageAspectRatio) && imageAspectRatio > 0 ? imageAspectRatio : 1.5;
  const width = Math.max(1, Math.floor(Number.isFinite(containerWidth) ? containerWidth : 1));
  // Content-height fallback keeps standalone callers working; the runtime always supplies both axes.
  const fallbackPadding = Math.min(8, width / 20);
  const fallbackStacked = width < 760;
  const fallbackGap = fallbackStacked ? 18 : 24;
  const fallbackImageWidth = fallbackStacked
    ? width - fallbackPadding * 2 : (width - fallbackPadding * 2 - fallbackGap) / 2;
  const fallbackHeight = fallbackStacked
    ? 2 * (fallbackImageWidth / ratio + 24) + fallbackGap + fallbackPadding * 2
    : fallbackImageWidth / ratio + 24 + fallbackPadding * 2;
  const height = Math.max(1, Math.floor(containerHeight === undefined
    ? Math.ceil(fallbackHeight) : Number.isFinite(containerHeight) ? containerHeight : 1));
  const padding = Math.min(8, width / 20, height / 20);
  const fit = (stacked: boolean) => {
    const gap = Math.min(stacked ? 18 : 24, (stacked ? height : width) / 12);
    const labelHeight = Math.min(24, height / (stacked ? 6 : 3));
    const availableWidth = stacked ? width - padding * 2 : (width - padding * 2 - gap) / 2;
    const availableHeight = stacked
      ? (height - padding * 2 - gap - labelHeight * 2) / 2
      : height - padding * 2 - labelHeight;
    return { gap, labelHeight, imageWidth: Math.max(Number.EPSILON, Math.min(availableWidth, availableHeight * ratio)) };
  };
  const vertical = fit(true);
  const horizontal = fit(false);
  // The HUD can leave a portrait phone with a near-square slot. Compare the actual
  // fitted images rather than assuming that slot orientation equals device orientation.
  const stacked = containerHeight === undefined ? fallbackStacked : vertical.imageWidth >= horizontal.imageWidth;
  const { gap, labelHeight, imageWidth } = stacked ? vertical : horizontal;
  const imageHeight = imageWidth / ratio;
  const groupWidth = stacked ? imageWidth : imageWidth * 2 + gap;
  const groupHeight = stacked ? (imageHeight + labelHeight) * 2 + gap : imageHeight + labelHeight;
  const startX = (width - groupWidth) / 2;
  const startY = (height - groupHeight) / 2;
  const reference = { x: startX, y: startY + labelHeight, width: imageWidth, height: imageHeight };
  const edited = {
    x: stacked ? startX : startX + imageWidth + gap,
    y: stacked ? startY + labelHeight * 2 + imageHeight + gap : startY + labelHeight,
    width: imageWidth,
    height: imageHeight,
  };
  return {
    width,
    height,
    stacked,
    reference,
    edited,
    referenceLabel: { x: reference.x, y: reference.y - labelHeight },
    editedLabel: { x: edited.x, y: edited.y - labelHeight },
  };
}
