/** Adopt only the approved lower-right patches from archived imagegen edits.
 * Original pixels outside each patch remain byte-for-byte equal after decoding.
 * Rebuilds use only art-source plus the already installed local Chrome runtime.
 */
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = ['puzzle-lotus-ceiling', 'puzzle-three-rabbits', 'puzzle-twin-dragons'];
const digest = data => createHash('sha256').update(data).digest('hex');
const browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined });
const page = await browser.newPage();
const assets = JSON.parse(await readFile(resolve(root, 'src/content/assets.json'), 'utf8'));
try {
  for (const id of ids) {
    const archive = resolve(root, `art-source/levels/${id}/v002`);
    const original = await readFile(resolve(root, `public/assets/levels/${id}/${id}-image-v001.png`));
    const request = JSON.parse(await readFile(resolve(archive, 'retouch-request.json'), 'utf8'));
    const candidate = await readFile(resolve(archive, request.candidateFilename ?? 'retouch-candidate.png'));
    const result = await page.evaluate(async ({ original, candidate, patches, crop }) => {
      const decode = async data => { const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode(); return img; };
      const source = await decode(original), edit = await decode(candidate);
      const canvas = document.createElement('canvas'); canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, 0, 0);
      const before = context.getImageData(0, 0, canvas.width, canvas.height);
      const target = new ImageData(new Uint8ClampedArray(before.data), canvas.width, canvas.height);
      const editedCanvas = document.createElement('canvas'); editedCanvas.width = canvas.width; editedCanvas.height = canvas.height;
      const editedContext = editedCanvas.getContext('2d', { willReadFrequently: true });
      editedContext.imageSmoothingEnabled = true; editedContext.imageSmoothingQuality = 'high';
      editedContext.drawImage(source, 0, 0);
      if (crop) editedContext.drawImage(edit, crop.x, crop.y, crop.width, crop.height);
      else editedContext.drawImage(edit, 0, 0, canvas.width, canvas.height);
      const edited = editedContext.getImageData(0, 0, canvas.width, canvas.height);
      for (const patch of patches) for (let y = patch.y; y < patch.y + patch.height; y++) for (let x = patch.x; x < patch.x + patch.width; x++) {
        const distance = Math.min(x - patch.x, y - patch.y, patch.x + patch.width - 1 - x, patch.y + patch.height - 1 - y);
        const weight = Math.min(1, distance / patch.feather);
        const index = (y * canvas.width + x) * 4;
        for (let c = 0; c < 3; c++) target.data[index + c] = Math.round(before.data[index + c] * (1 - weight) + edited.data[index + c] * weight);
      }
      let changedInside = 0, changedOutside = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        if (![0, 1, 2, 3].some(c => before.data[index + c] !== target.data[index + c])) continue;
        if (patches.some(patch => x >= patch.x && x < patch.x + patch.width && y >= patch.y && y < patch.y + patch.height)) changedInside++;
        else changedOutside++;
      }
      context.putImageData(target, 0, 0);
      return { image: canvas.toDataURL('image/png').split(',')[1], width: canvas.width, height: canvas.height,
        candidateWidth: edit.naturalWidth, candidateHeight: edit.naturalHeight, changedInside, changedOutside };
    }, { original: original.toString('base64'), candidate: candidate.toString('base64'), patches: request.patches ?? [request.patch], crop: request.crop });
    if (result.changedOutside !== 0 || result.changedInside === 0) throw new Error(`Invalid patch bounds: ${id}`);
    const bytes = Buffer.from(result.image, 'base64');
    const name = `${id}-image-v002.png`;
    const relative = `/assets/levels/${id}/${name}`;
    await writeFile(resolve(root, `public${relative}`), bytes);
    const { image, ...validation } = result;
    const record = { ...request, version: 2, levelId: id, originalRuntimeSha256: digest(original), candidateSha256: digest(candidate),
      runtimePath: relative, runtimeSha256: digest(bytes), ...validation,
      processing: '内置imagegen编辑右下角420×180局部，按原坐标采用标识及账号的两个独立小范围，以各范围登记的内缘羽化衔接；范围之外0像素变化。原稿、v001运行图、全图候选与局部候选均保留。',
      contentBoundary: '仅供游戏显示的局部去平台水印版本；补绘像素不作为历史纹样细节的考据。' };
    await writeFile(resolve(archive, 'source-notes.json'), `${JSON.stringify(record, null, 2)}\n`);
    const asset = assets.find(item => item.id === `${id}-image`);
    if (!asset) throw new Error(`Missing puzzle asset ${id}`);
    Object.assign(asset, { path: relative, width: result.width, height: result.height, version: 'user-puzzle-v002',
      sourceNote: `开发者交付拼图图像，用户授权局部去除右下平台水印。仅采用登记范围，其他像素保持不变。原稿及处理记录见art-source/levels/${id}/v002/source-notes.json。` });
    console.log(`${id}: ${result.width}×${result.height}; changed inside ${result.changedInside}, outside ${result.changedOutside}`);
  }
  await writeFile(resolve(root, 'src/content/assets.json'), `${JSON.stringify(assets, null, 2)}\n`);
} finally { await browser.close(); }
