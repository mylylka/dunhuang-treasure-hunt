import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { assertShellAssets, parseCatalog } from '../src/services/content-schema';
import { lessonBooks } from '../src/content/lessons';
import { parseLessonBook } from '../src/services/lesson-schema';

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
  const catalog = parseCatalog({ schemaVersion: 1, themes, assets, levels });
  assertShellAssets(catalog);
  for (const book of lessonBooks) parseLessonBook(book, catalog);
  const errors: string[] = [];
  for (const asset of catalog.assets) {
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
      }
      if (!dimensions) errors.push(`${asset.id}：目前校验支持带 viewBox 的 SVG 或 PNG，请补充对应格式的尺寸校验`);
      else if (dimensions[0] !== asset.width || dimensions[1] !== asset.height) errors.push(`${asset.id}：登记 ${asset.width}×${asset.height}，实际 ${dimensions[0]}×${dimensions[1]}`);
    } catch {
      errors.push(`${asset.id}：找不到 ${relative(projectRoot, path)}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`内容校验通过：${catalog.themes.length} 个主题、${catalog.levels.length} 个正式关卡、${catalog.assets.length} 个素材。`);
  console.log(`其中 ${catalog.assets.filter(asset => asset.placeholder).length} 个为明确标注的待替换占位素材。`);
  console.log(`教学校验通过：${lessonBooks.length} 个主题导览、${lessonBooks.reduce((total, book) => total + book.units.length, 0)} 个章节。`);
}

main().catch(error => { console.error(`内容校验失败：\n${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
