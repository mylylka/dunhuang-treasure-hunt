import type { ShadowMatchLevel } from '../../types';
import type { ShadowCardLayout, ShadowImageLayout, ShadowMatchLayout, ShadowMatchSnapshot } from './types';

type Definition = Pick<ShadowMatchLevel, 'referenceAssetId' | 'options' | 'correctOptionId' | 'hints'>;

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`影子配对：${message}`);
}
const nonempty = (value: string) => typeof value === 'string' && value.trim().length > 0;
const positive = (value: number) => Number.isFinite(value) && value > 0;

export function validateShadowMatchDefinition(level: Definition): void {
  requireCondition(nonempty(level.referenceAssetId), '缺少彩色参照图。');
  requireCondition(level.options.length === 4, '每题必须有四个影子选项。');
  const ids = level.options.map(option => option.id), assets = level.options.map(option => option.assetId);
  requireCondition(ids.every(nonempty) && new Set(ids).size === 4, '选项编号不能为空或重复。');
  requireCondition(assets.every(nonempty) && new Set(assets).size === 4, '影子图片不能为空或重复。');
  requireCondition(ids.includes(level.correctOptionId), '正确选项必须指向本题唯一的选项编号。');
  requireCondition(level.hints.length > 0, '至少需要一条轮廓观察提示。');
  for (const hint of level.hints) {
    const { x, y, width, height } = hint.region;
    requireCondition(nonempty(hint.text), '提示文字不能为空。');
    requireCondition(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && positive(width) && positive(height)
      && x + width <= 1 + 1e-9 && y + height <= 1 + 1e-9, '提示区域必须位于原图归一化范围内。');
  }
}

export function createShadowMatchState(level: Definition, random: () => number = Math.random): ShadowMatchSnapshot {
  validateShadowMatchDefinition(level);
  const optionIds = level.options.map(option => option.id);
  for (let index = optionIds.length - 1; index > 0; index--) {
    const value = random();
    requireCondition(Number.isFinite(value) && value >= 0 && value < 1, '随机值必须位于0至1之间。');
    const other = Math.floor(value * (index + 1));
    [optionIds[index], optionIds[other]] = [optionIds[other], optionIds[index]];
  }
  return { optionIds, selectedOptionId: null, wrongOptionIds: [], completed: false, hintIndex: null, message: '' };
}

export function selectShadowOption(level: Definition, state: ShadowMatchSnapshot, optionId: string): ShadowMatchSnapshot {
  if (state.completed || !state.optionIds.includes(optionId) || !level.options.some(option => option.id === optionId)) return state;
  const completed = optionId === level.correctOptionId;
  return {
    ...state, selectedOptionId: optionId, completed, hintIndex: null,
    wrongOptionIds: completed || state.wrongOptionIds.includes(optionId) ? [...state.wrongOptionIds] : [...state.wrongOptionIds, optionId],
    message: completed ? '轮廓完全对应，配对完成。' : '这幅剪影还不对应，再比较姿态和飘带的轮廓。',
  };
}

export function nextShadowHint(level: Definition, state: ShadowMatchSnapshot): ShadowMatchSnapshot {
  if (state.completed || level.hints.length === 0) return state;
  const hintIndex = ((state.hintIndex ?? -1) + 1) % level.hints.length;
  return { ...state, hintIndex, message: level.hints[hintIndex].text };
}

export function restartShadowMatchState(level: Definition, state: ShadowMatchSnapshot, random: () => number = Math.random): ShadowMatchSnapshot {
  const next = createShadowMatchState(level, random);
  // A retry visibly changes the order even when the random shuffle repeats by chance.
  if (next.optionIds.every((id, index) => id === state.optionIds[index])) next.optionIds.push(next.optionIds.shift()!);
  return next;
}

function card(x: number, y: number, width: number, height: number): ShadowCardLayout {
  const inset = Math.min(2, width * .02, height * .025);
  const labelSpace = Math.min(14, height * .2);
  // One compact label is separate from the full image; comparison controls live in the rail.
  return { x, y, width, height, image: {
    x: x + inset, y: y + inset,
    width: width - inset * 2, height: height - inset * 2 - labelSpace,
  } };
}

export function calculateShadowLayout(width: number, height: number): ShadowMatchLayout {
  requireCondition(positive(width) && positive(height), '画布宽高必须为有限正数。');
  const inset = Math.min(6, width * .02, height * .02);
  const gap = Math.min(8, width * .016, height * .024);
  const usableWidth = width - inset * 2, usableHeight = height - inset * 2;
  let reference: ShadowCardLayout, options: ShadowCardLayout[];
  if (width >= height * 1.1) {
    const optionHeight = (usableHeight - gap) / 2;
    const labelSpace = Math.min(14, optionHeight * .2);
    const idealReferenceWidth = usableHeight - labelSpace;
    const idealOptionWidth = optionHeight - labelSpace;
    const fit = Math.min(1, (usableWidth - gap * 2) / (idealReferenceWidth + idealOptionWidth * 2));
    const referenceWidth = idealReferenceWidth * fit, optionWidth = idealOptionWidth * fit;
    const groupWidth = referenceWidth + optionWidth * 2 + gap * 2;
    const referenceStart = (width - groupWidth) / 2;
    const start = referenceStart + referenceWidth + gap;
    reference = card(referenceStart, inset, referenceWidth, usableHeight);
    options = Array.from({ length: 4 }, (_, index) => card(start + index % 2 * (optionWidth + gap),
      inset + Math.floor(index / 2) * (optionHeight + gap), optionWidth, optionHeight));
  } else {
    const referenceHeight = (usableHeight - gap) * .38;
    const optionWidth = (usableWidth - gap) / 2;
    const optionHeight = (usableHeight - referenceHeight - gap * 2) / 2;
    const start = inset + referenceHeight + gap;
    reference = card(inset, inset, usableWidth, referenceHeight);
    options = Array.from({ length: 4 }, (_, index) => card(inset + index % 2 * (optionWidth + gap),
      start + Math.floor(index / 2) * (optionHeight + gap), optionWidth, optionHeight));
  }
  return { width, height, reference, options };
}

export function fitShadowImage(area: ShadowImageLayout, sourceWidth: number, sourceHeight: number): ShadowImageLayout {
  requireCondition(positive(area.width) && positive(area.height) && positive(sourceWidth) && positive(sourceHeight), '图片或绘制区域尺寸无效。');
  const scale = Math.min(area.width / sourceWidth, area.height / sourceHeight);
  const width = sourceWidth * scale, height = sourceHeight * scale;
  return { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height };
}
