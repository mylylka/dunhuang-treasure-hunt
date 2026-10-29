import { z } from 'zod';
import type { ContentCatalog } from '../types';

const gameType = z.enum(['spot-difference', 'hidden-object', 'shadow-match', 'puzzle', 'coloring']);
const id = z.string().regex(/^[a-z][a-z0-9-]*$/, '编号须为英文小写及连字符');
const assetSchema = z.object({
  id,
  path: z.string().regex(/^\/assets\/[a-zA-Z0-9/_\-.]+$/, '素材路径须位于 /assets/ 下').refine(p => !p.includes('..'), '素材路径不能包含 ..'),
  width: z.number().int().positive(), height: z.number().int().positive(),
  kind: z.enum(['background', 'panel', 'button', 'icon', 'cover', 'level', 'teaching']),
  placeholder: z.boolean(), version: z.string().min(1), sourceNote: z.string().min(1),
  slice: z.object({ top: z.number().int().nonnegative(), right: z.number().int().nonnegative(), bottom: z.number().int().nonnegative(), left: z.number().int().nonnegative() }).optional(),
}).refine(asset => !asset.slice || (asset.slice.left + asset.slice.right < asset.width && asset.slice.top + asset.slice.bottom < asset.height), '九宫格切片超出素材尺寸');
const themeSchema = z.object({
  id, title: z.string().min(1), subtitle: z.string().min(1), description: z.string().min(1),
  number: z.string(), coverAssetId: id, introLevelId: id.nullable(), allowedGameTypes: z.array(gameType).min(1),
});
const regionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) });
const metadata = {
  schemaVersion: z.literal(1), id, themeId: id,
  title: z.string().min(1), subtitle: z.string().min(1), objective: z.string().min(1),
  difficulty: z.string().min(1), estimatedMinutes: z.number().positive(),
  thumbnailAssetId: id,
  teachingNote: z.string().min(1), source: z.object({ title: z.string().min(1), url: z.string().url(), note: z.string() }),
};
export const spotDifferenceSchema = z.object({
  ...metadata, gameType: z.literal('spot-difference'), baseAssetId: id, editedAssetId: id,
  differences: z.array(z.object({ id, region: regionSchema, hint: z.string().min(1), detailHint: z.string().min(1), explanation: z.string().min(1).optional() })).min(1),
});
export const coloringSchema = z.object({
  ...metadata, gameType: z.literal('coloring'), referenceAssetId: id, lineAssetId: id, regionMapAssetId: id,
  artworkVersion: z.string().min(1),
  palette: z.array(z.object({ id, label: z.string().min(1), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).min(1),
  regions: z.array(z.object({ id: z.number().int().min(1).max(0xffffff), label: z.string().min(1), region: regionSchema,
    point: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }), pixelCount: z.number().int().positive() })).min(1),
});
export const puzzleSchema = z.object({
  ...metadata, gameType: z.literal('puzzle'), imageAssetId: id, mode: z.enum(['rotation', 'jigsaw']),
  rows: z.number().int().min(2).max(8), columns: z.number().int().min(2).max(8), seed: z.number().int().nonnegative(),
});
export const levelSchema = z.discriminatedUnion('gameType', [spotDifferenceSchema, coloringSchema, puzzleSchema]);
export const catalogSchema = z.object({ schemaVersion: z.literal(1), themes: z.array(themeSchema).min(1), assets: z.array(assetSchema).min(1), levels: z.array(levelSchema) });

export const SHELL_ASSET_IDS = ['bg-landscape', 'bg-portrait', 'panel', 'button-primary', 'button-secondary', 'icon-back', 'icon-hint', 'icon-restart', 'icon-locked', 'icon-completed'] as const;

/** The game-rule fixtures need not contain the application's skins. Real app catalogs must. */
export function assertShellAssets(catalog: ContentCatalog): void {
  const ids = new Set(catalog.assets.map(asset => asset.id));
  const missing = SHELL_ASSET_IDS.filter(id => !ids.has(id));
  if (missing.length) throw new Error(`公共界面缺少必需素材：${missing.join('、')}`);
  for (const id of ['panel', 'button-primary', 'button-secondary']) {
    if (!catalog.assets.find(asset => asset.id === id)?.slice) throw new Error(`公共素材 ${id}：需要登记九宫格 slice 参数`);
  }
}

export function parseCatalog(input: unknown): ContentCatalog {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(issue => `${issue.path.join('.') || '内容目录'}：${issue.message}`).join('\n'));
  }
  const catalog = parsed.data;
  const issues: string[] = [];
  const checkUnique = (items: { id: string }[], label: string) => {
    const ids = new Set<string>();
    for (const item of items) { if (ids.has(item.id)) issues.push(`${label} ${item.id}：编号重复`); ids.add(item.id); }
  };
  checkUnique(catalog.themes, '主题'); checkUnique(catalog.assets, '素材'); checkUnique(catalog.levels, '关卡');
  const assets = new Map(catalog.assets.map(asset => [asset.id, asset]));
  const themes = new Map(catalog.themes.map(theme => [theme.id, theme]));
  for (const theme of catalog.themes) {
    if (!assets.has(theme.coverAssetId)) issues.push(`主题 ${theme.id}：封面 ${theme.coverAssetId} 不存在`);
    const levels = catalog.levels.filter(level => level.themeId === theme.id);
    if (theme.introLevelId && !levels.some(level => level.id === theme.introLevelId)) issues.push(`主题 ${theme.id}：入门关 ${theme.introLevelId} 不存在或不属于本主题`);
  }
  for (const level of catalog.levels) {
    const theme = themes.get(level.themeId);
    if (!theme) issues.push(`关卡 ${level.id}：主题 ${level.themeId} 不存在`);
    else if (!theme.allowedGameTypes.includes(level.gameType)) issues.push(`关卡 ${level.id}：本主题不允许 ${level.gameType}`);
    const imageIds = level.gameType === 'spot-difference' ? [level.baseAssetId, level.editedAssetId]
      : level.gameType === 'coloring' ? [level.referenceAssetId, level.lineAssetId, level.regionMapAssetId] : [level.imageAssetId];
    for (const assetId of [...imageIds, level.thumbnailAssetId]) {
      if (!assets.has(assetId)) issues.push(`关卡 ${level.id}：素材 ${assetId} 不存在`);
    }
    if (level.gameType === 'puzzle') {
      const image = assets.get(level.imageAssetId);
      if (level.rows * level.columns > 48) issues.push(`关卡 ${level.id}：当前拼图最多支持48片`);
      if (level.mode === 'rotation' && image && Math.abs((image.width / level.columns) / (image.height / level.rows) - 1) > .001) issues.push(`关卡 ${level.id}：原位旋转图块须为正方形`);
      continue;
    }
    if (level.gameType === 'coloring') {
      const line = assets.get(level.lineAssetId), mask = assets.get(level.regionMapAssetId);
      if (line && mask && (line.width !== mask.width || line.height !== mask.height)) issues.push(`关卡 ${level.id}：线稿与区域图尺寸不一致`);
      checkUnique(level.palette, `关卡 ${level.id} 的色板`);
      const regionIds = new Set<number>();
      for (const item of level.regions) {
        if (regionIds.has(item.id)) issues.push(`关卡 ${level.id}：填色区域编号重复 ${item.id}`);
        regionIds.add(item.id);
        const { x, y, width, height } = item.region;
        if (x + width > 1.000001 || y + height > 1.000001) issues.push(`关卡 ${level.id} / ${item.id}：填色区域越界`);
        if (item.point.x < x || item.point.x > x + width || item.point.y < y || item.point.y > y + height) issues.push(`关卡 ${level.id} / ${item.id}：区域取样点越界`);
      }
      continue;
    }
    const a = assets.get(level.baseAssetId), b = assets.get(level.editedAssetId);
    if (a && b && (a.width !== b.width || a.height !== b.height)) issues.push(`关卡 ${level.id}：A/B 尺寸不一致`);
    checkUnique(level.differences, `关卡 ${level.id} 的差异`);
    for (const difference of level.differences) {
      const { x, y, width, height } = difference.region;
      if (x + width > 1.000001 || y + height > 1.000001) issues.push(`关卡 ${level.id} / ${difference.id}：差异区域越界`);
    }
    for (let i = 0; i < level.differences.length; i++) {
      for (let j = i + 1; j < level.differences.length; j++) {
        const a = level.differences[i], b = level.differences[j];
        if (a.region.x < b.region.x + b.region.width && a.region.x + a.region.width > b.region.x && a.region.y < b.region.y + b.region.height && a.region.y + a.region.height > b.region.y) {
          issues.push(`关卡 ${level.id}：${a.id} 与 ${b.id} 区域重叠`);
        }
      }
    }
  }
  if (issues.length) throw new Error(issues.join('\n'));
  return catalog;
}
