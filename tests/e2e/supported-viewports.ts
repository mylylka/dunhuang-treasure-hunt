import type { TestInfo } from '@playwright/test';

export const desktopNarrowViewport = { width: 360, height: 640 };
export const mobileLandscapeViewport = { width: 844, height: 390 };
export const compactMobileLandscapeViewport = { width: 640, height: 360 };
export const mobilePortraitViewport = { width: 390, height: 844 };

export function isMobileProject(testInfo: TestInfo): boolean {
  return Boolean(testInfo.project.use.isMobile);
}

// A narrow desktop remains playable. A real phone uses a second landscape
// size instead; portrait is exercised explicitly as a blocked interruption.
export function compactPlayableViewport(testInfo: TestInfo) {
  return isMobileProject(testInfo) ? compactMobileLandscapeViewport : desktopNarrowViewport;
}

export function supportedResizeViewports(testInfo: TestInfo) {
  return [compactPlayableViewport(testInfo), mobileLandscapeViewport];
}
