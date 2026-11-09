export interface Point { x: number; y: number }
export interface Rectangle extends Point { width: number; height: number }
export interface Viewport { width: number; height: number }

export function fitImageRect(width: number, height: number, aspectRatio: number, padding = 0): Rectangle {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const imageWidth = Math.max(Number.EPSILON, Math.min(Math.max(1, width - padding * 2), Math.max(1, height - padding * 2) * ratio));
  const imageHeight = imageWidth / ratio;
  return { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, width: imageWidth, height: imageHeight };
}
