import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer as createViteServer } from 'vite';
import { createPreviewServer } from './serve-preview.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'public/assets/world/folio-downloads/v001');
const [gameCss, printCss] = await Promise.all([
  readFile(resolve(root, 'src/styles/mogao-exhibit.css'), 'utf8'),
  readFile(resolve(root, 'scripts/folio-print-v001.css'), 'utf8'),
]);

const vite = await createViteServer({ root, base: '/', server: { middlewareMode: true, ws: false } });
const assets = createPreviewServer(resolve(root, 'public'));
let browser;

try {
  assets.listen(0, '127.0.0.1');
  await once(assets, 'listening');
  const origin = `http://127.0.0.1:${assets.address().port}`;
  const [{ FolioPrintPage }, { WORLD_REWARDS }] = await Promise.all([
    vite.ssrLoadModule('/src/app/MogaoRewardOverlay.tsx'),
    vite.ssrLoadModule('/src/content/world/mogao-rewards-v001.ts'),
  ]);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

  for (const [id, reward] of Object.entries(WORLD_REWARDS)) {
    const markup = renderToStaticMarkup(createElement(FolioPrintPage, { id }));
    const printUrl = `${origin}/folio-print-${id}.html`;
    await page.route(printUrl, route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${gameCss}\n${printCss}</style></head><body>${markup}</body></html>`,
    }), { times: 1 });
    await page.goto(printUrl, { waitUntil: 'load' });
    const pictureCount = await page.evaluate(async title => {
      document.title = title;
      await document.fonts.ready;
      const images = [...document.images];
      await Promise.all(images.map(async image => {
        await image.decode().catch(() => { throw new Error(`Missing folio image: ${image.src}`); });
        if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Invalid folio image: ${image.src}`);
        // JPEG can be embedded directly in the PDF instead of storing decoded WebP pixels.
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let alpha = 3; alpha < data.length; alpha += 4) if (data[alpha] !== 255) return;
        image.src = canvas.toDataURL('image/jpeg', .93);
        await image.decode();
      }));
      return images.length;
    }, reward.title);
    if (!pictureCount) throw new Error(`The folio has no illustrations: ${id}`);
    const path = resolve(output, `${id}.pdf`);
    const pdf = await page.pdf({ path, preferCSSPageSize: true, printBackground: true, tagged: true });
    console.log(`${reward.title}  ${pictureCount} 图  ${Math.round(pdf.length / 1024)} KiB`);
  }
} finally {
  await browser?.close();
  await Promise.all([vite.close(), new Promise(resolve => assets.close(resolve))]);
}
