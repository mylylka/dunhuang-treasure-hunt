import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.'), out = resolve('outputs/environment-preview/v002');
const prefix = 'environment-sample-v002';
const views = ['road', 'road-tree', 'tree-front', 'tree-side', 'tree-diagonal', 'tree-near', 'tree-far', 'shrub-near', 'shrub-road', 'dunes', 'dunes-oblique', 'dunes-model', 'dunes-side', 'dunes-diagonal'];
const modelShots = ['tree-front', 'tree-side', 'tree-oblique', 'shrub-front', 'shrub-side', 'shrub-oblique', 'dunes-overall', 'dunes-low', 'dunes-side'];
for (const shot of [...modelShots, ...views.flatMap(view => [`web-${view}`, `before-${view}`])]) {
  await copyFile(resolve(root, `work/world/${prefix}-${shot}.png`), resolve(out, `${prefix}-${shot}.png`));
}
const report = JSON.parse(await readFile(resolve(root, `work/world/${prefix}-verification.json`), 'utf8'));
const review = JSON.parse(await readFile(resolve(root, `work/world/${prefix}-visual-review.json`), 'utf8'));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const figure = (shot, caption) => `<figure><a href="${prefix}-${shot}.png" target="_blank"><img loading="lazy" src="${prefix}-${shot}.png" alt="${escape(caption)}"></a><figcaption>${escape(caption)}</figcaption></figure>`;
const compare = (view, label) => `<div class="comparison">${figure(`before-${view}`, `${label} · 修改前 v001`)}${figure(`web-${view}`, `${label} · 修改后 v002`)}</div><a class="live" href="./?view=${view}&version=new">在网页中切换前后版本 →</a>`;
const note = key => `<p class="note">${escape(review[key])}</p>`;
const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>云冠与沙丘 · 第二版独立样片</title><style>
:root{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#393a2d;background:#f4f0e5}*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:44px 28px 80px}header{border-bottom:1px solid #c8bea7;padding-bottom:26px;margin-bottom:35px}h1{font-family:serif;font-size:36px;font-weight:500;margin:12px 0}p{line-height:1.85;max-width:960px}a{color:#5d603c;text-underline-offset:4px}nav{display:flex;gap:22px;flex-wrap:wrap}.tag{font-size:12px;letter-spacing:.12em;color:#8b5e3f}section{margin:60px 0}h2{font-size:25px;font-weight:500}h3{font-size:18px;font-weight:500;margin-top:30px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;background:#ddd8ca}figcaption{font-size:13px;margin:10px 0 22px;color:#746d57}.comparison,.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.three{grid-template-columns:repeat(3,minmax(0,1fr))}.note{padding:16px 22px;border-left:3px solid #8c9868;background:#e9eadb}.live{display:inline-block;font-size:14px;margin:0 0 22px}details{border-top:1px solid #cdc5b4;padding:22px 0}summary{cursor:pointer;font-size:18px}footer{border-top:1px solid #c8bea7;padding-top:22px;font-size:13px;color:#786f5f}@media(max-width:750px){main{padding:25px 16px}.comparison,.grid,.three{grid-template-columns:1fr}h1{font-size:28px}}
</style></head><body><main><header><span class="tag">DUNHUANG · ENVIRONMENT STUDY 02 · 待验收</span><h1>饱满云冠、低矮灌木、连续沙丘</h1><p>本轮只修整三项独立样片。对照左侧为上一版独立样片，右侧为本次版本；保持同一机位、同一摆放、同一光照与曝光。以下均为实际 Blender 渲染或网页截图，未修图。</p><nav><a href="./">进入可操作预览 →</a><a href="#tree">A型树</a><a href="#shrub">灌木</a><a href="#dunes">沙丘</a><a href="#other-views">其他角度</a></nav></header>
<section id="tree"><h2>A型树 · 饱满、横展的云冠</h2>${compare('road-tree', '道路旁实际网页')}<h3>侧面厚度对照</h3>${compare('tree-side', '相同侧面机位')}<h3>Blender 完整模型</h3><div class="grid three">${figure('tree-front', 'Blender · 正面')}${figure('tree-side', 'Blender · 侧面')}${figure('tree-oblique', 'Blender · 斜侧面')}</div>${note('tree')}</section>
<section id="shrub"><h2>灌木 · 贴地横展、饱满的叶簇</h2>${compare('shrub-road', '道路旁实际网页')}<div class="grid three">${figure('shrub-front', 'Blender · 正面')}${figure('shrub-side', 'Blender · 侧面')}${figure('shrub-oblique', 'Blender · 斜侧面')}</div>${note('shrub')}</section>
<section id="dunes"><h2>沙丘 · 阳面、背光坡与谷地</h2>${compare('dunes', '第三人称镜头')}${compare('dunes-oblique', '第三人称斜向镜头')}<h3>Blender 完整模型</h3><div class="grid three">${figure('dunes-overall', 'Blender · 整体')}${figure('dunes-low', 'Blender · 低机位')}${figure('dunes-side', 'Blender · 侧面')}</div>${note('dunes')}</section>
<section id="other-views"><h2>其他同机位对照</h2>${[['tree-front', '树正面'], ['tree-diagonal', '树斜侧面'], ['tree-near', '树近景'], ['tree-far', '树远景'], ['shrub-near', '灌木近景'], ['dunes-model', '沙丘全貌'], ['dunes-side', '沙丘侧面'], ['dunes-diagonal', '沙丘斜侧面'], ['road', '道路第三人称']].map(([view, label]) => `<details><summary>${label}</summary>${compare(view, label)}</details>`).join('')}</section>
<footer><p>${report.views.length} 个网页视图、${report.comparisons.length} 组同机位同光照对照，${report.protectedFilesUnchanged} 个受保护文件哈希未变化。技术检查与美术验收分开；本版仍待用户确认。原正式地图和上一版样片保留。</p></footer></main></body></html>`;
await writeFile(resolve(out, 'review.html'), page);
console.log('Review gallery: http://localhost:4189/review.html');
