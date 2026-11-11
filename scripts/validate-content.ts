import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { assertShellAssets, parseCatalog } from '../src/services/content-schema';
import { lessonBooks } from '../src/content/lessons';
import { parseLessonBook } from '../src/services/lesson-schema';
import { readPng } from './read-png';
import hiddenObjectPool from '../src/content/hidden-object/pool.json';
import { getHiddenObjectRuntimeImagePath } from '../src/content/hidden-object/runtime-images';
import { readWebPSize } from './read-webp-size';

const projectRoot = process.cwd();
const contentRoot = resolve(projectRoot, 'src/content');
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as unknown;

async function main() {
  const levelNames = (await readdir(resolve(contentRoot, 'levels'))).filter(name => name.endsWith('.json')).sort();
  const [themes, assets, levels] = await Promise.all([
    readJson(resolve(contentRoot, 'themes.json')),
    readJson(resolve(contentRoot, 'assets.json')),
    Promise.all(levelNames.map(name => readJson(resolve(contentRoot, 'levels', name)))),
  ]);
  const catalog = parseCatalog({ schemaVersion: 1, themes, assets, levels }, hiddenObjectPool,
    { hiddenObjectValidation: 'deep' });
  assertShellAssets(catalog);
  for (const book of lessonBooks) parseLessonBook(book, catalog);
  const errors: string[] = [];
  async function checkDerivedImage(path: string, width: number, height: number, label: string) {
    const runtime = getHiddenObjectRuntimeImagePath(path);
    if (runtime === path) return;
    try {
      const size = readWebPSize(await readFile(resolve(projectRoot, 'public', runtime.slice(1))));
      if (size[0] !== width || size[1] !== height) errors.push(`${label}：技术派生尺寸不一致`);
    } catch { errors.push(`${label}：无法读取技术派生 ${runtime}`); }
  }
  const poolIds = new Set<string>();
  for (const sprite of hiddenObjectPool.sprites) {
    await checkDerivedImage(sprite.path, sprite.width, sprite.height, `找物素材 ${sprite.id}`);
    if (poolIds.has(sprite.id)) errors.push(`找物素材 ${sprite.id}：编号重复`);
    poolIds.add(sprite.id);
    if (!/^\/assets\/shared\/hidden-object\/v\d{3}\/[a-z0-9-]+\.png$/.test(sprite.path)) errors.push(`找物素材 ${sprite.id}：运行路径无效`);
    try {
      const data = await readFile(resolve(projectRoot, 'public', sprite.path.slice(1)));
      if (data.subarray(1, 4).toString() !== 'PNG' || data.readUInt32BE(16) !== sprite.width || data.readUInt32BE(20) !== sprite.height) errors.push(`找物素材 ${sprite.id}：尺寸与登记不一致`);
      if (sprite.hitPoint.x < 0 || sprite.hitPoint.x > 1 || sprite.hitPoint.y < 0 || sprite.hitPoint.y > 1) errors.push(`找物素材 ${sprite.id}：安全点击点越界`);
    } catch { errors.push(`找物素材 ${sprite.id}：无法读取 ${sprite.path}`); }
  }
  for (const asset of catalog.assets) {
    await checkDerivedImage(asset.path, asset.width, asset.height, asset.id);
    const path = resolve(projectRoot, 'public', asset.path.slice(1));
    try {
      await access(path);
      const data = await readFile(path);
      let dimensions: [number, number] | null = null;
      if (asset.path.endsWith('.svg')) {
        const svg = data.toString('utf8');
        const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/);
        if (viewBox) dimensions = [Number(viewBox[1]), Number(viewBox[2])];
      } else if (asset.path.endsWith('.png') && data.length >= 24 && data.subarray(1, 4).toString() === 'PNG') {
        dimensions = [data.readUInt32BE(16), data.readUInt32BE(20)];
      } else if (asset.path.endsWith('.webp')) {
        dimensions = readWebPSize(data);
      }
      if (!dimensions) errors.push(`${asset.id}：无法读取 SVG、PNG 或 WebP 图像尺寸`);
      else if (dimensions[0] !== asset.width || dimensions[1] !== asset.height) errors.push(`${asset.id}：登记 ${asset.width}×${asset.height}，实际 ${dimensions[0]}×${dimensions[1]}`);
    } catch {
      errors.push(`${asset.id}：找不到 ${relative(projectRoot, path)}`);
    }
  }
  for (const level of catalog.levels) {
    if (level.gameType === 'shadow-match') {
      const images = await Promise.all([level.referenceAssetId, ...level.options.map(option => option.assetId)].map(async id => {
        const asset = catalog.assets.find(item => item.id === id)!;
        return readPng(await readFile(resolve(projectRoot, 'public', asset.path.slice(1))));
      }));
      if (images.some(image => image.channels !== 4)) { errors.push(`${level.id}：影子与参照须为透明RGBA图片，不得使用带白底标注图`); continue; }
      const masks = images.map(image => {
        const mask = new Uint8Array(image.width * image.height);
        for (let i = 0; i < mask.length; i++) mask[i] = image.pixels[i * 4 + 3] >= 128 ? 1 : 0;
        return mask;
      });
      if (!masks[0].some(Boolean) || masks[0].every(Boolean)) errors.push(`${level.id}：参照图须具有可辨识的透明轮廓`);
      const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, i) => value === b[i]);
      const matches = level.options.filter((_, index) => equal(masks[0], masks[index + 1]));
      if (matches.length !== 1 || matches[0].id !== level.correctOptionId) errors.push(`${level.id}：必须且仅有配置答案的轮廓与参照完全一致`);
      for (let i = 1; i < images.length; i++) {
        const image = images[i];
        if (image.pixels.some((value, index) => index % 4 !== 3 && image.pixels[Math.floor(index / 4) * 4 + 3] > 0 && value !== 0)) errors.push(`${level.id}：选项 ${level.options[i - 1].id} 不是纯黑透明剪影`);
        if (!masks[i].some(Boolean)) errors.push(`${level.id}：选项 ${level.options[i - 1].id} 为空白`);
        for (let j = i + 1; j < images.length; j++) if (equal(masks[i], masks[j])) errors.push(`${level.id}：影子选项轮廓重复`);
      }
      continue;
    }
    if (level.gameType !== 'coloring') continue;
    const asset = catalog.assets.find(item => item.id === level.regionMapAssetId)!;
    const map = readPng(await readFile(resolve(projectRoot, 'public', asset.path.slice(1))));
    const regions = new Map(level.regions.map(region => [region.id, region]));
    const counts = new Map<number, number>();
    const at = (x: number, y: number) => {
      const offset = (y * map.width + x) * map.channels;
      if (map.channels === 4 && map.pixels[offset + 3] !== 255) throw new Error(`${level.id}：区域图须为不透明的精确ID像素`);
      return map.pixels[offset] + map.pixels[offset + 1] * 256 + map.pixels[offset + 2] * 65536;
    };
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const regionId = at(x, y);
      if (!regionId) continue;
      counts.set(regionId, (counts.get(regionId) ?? 0) + 1);
      const region = regions.get(regionId)?.region;
      if (!region) continue;
      if (x / map.width + 1e-6 < region.x || y / map.height + 1e-6 < region.y || x / map.width > region.x + region.width + 1e-6 || y / map.height > region.y + region.height + 1e-6) {
        throw new Error(`${level.id}：区域 ${regionId} 的实际像素超出配置边界`);
      }
    }
    const unknownIds = [...counts.keys()].filter(id => !regions.has(id));
    if (unknownIds.length) errors.push(`${level.id}：区域图存在未登记编号 ${unknownIds.slice(0, 10).join(',')}`);
    for (const region of level.regions) {
      if (counts.get(region.id) !== region.pixelCount) errors.push(`${level.id} / ${region.id}：区域像素数量不一致`);
      const x = Math.min(map.width - 1, Math.floor(region.point.x * map.width));
      const y = Math.min(map.height - 1, Math.floor(region.point.y * map.height));
      if (at(x, y) !== region.id) errors.push(`${level.id} / ${region.id}：安全取样点不在本区域`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`内容校验通过：${catalog.themes.length} 个主题、${catalog.levels.length} 个正式关卡、${catalog.assets.length} 个素材。`);
  console.log(`其中 ${catalog.assets.filter(asset => asset.placeholder).length} 个为明确标注的待替换占位素材。`);
  console.log(`教学校验通过：${lessonBooks.length} 个主题导览、${lessonBooks.reduce((total, book) => total + book.units.length, 0)} 个章节。`);
  console.log(`找物素材池校验通过：${hiddenObjectPool.sprites.length} 张独立贴纸，按局加载。`);
}

main().catch(error => { console.error(`内容校验失败：\n${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
