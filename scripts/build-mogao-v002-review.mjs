import {copyFile,mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'outputs/mogao/v002');
await mkdir(resolve(out,'review'),{recursive:true});
const files={before:'mogao-v001-web-approach.png',after:'mogao-v002-web-approach.png',side:'mogao-v002-web-entrance-side.png',passage:'mogao-v002-web-passage.png',interior:'mogao-v002-web-interior.png',blender:'mogao-v002-blender-matched-approach.png'};
for(const [key,name] of Object.entries(files))await copyFile(resolve(root,'work/world',name),resolve(out,'review',`${key}.png`));
const old=JSON.parse(await readFile(resolve(root,'work/world/mogao-v001-verification.json'),'utf8')).states['web-approach'].camera;
const current=JSON.parse(await readFile(resolve(root,'work/world/mogao-v002-capture.json'),'utf8')).states.approach.camera;
await writeFile(resolve(out,'review/cameras.json'),JSON.stringify({before:old,after:current},null,2));
const shot=(key,label)=>`<figure><a href="review/${key}.png"><img src="review/${key}.png" alt="${label}" loading="lazy"></a><figcaption>${label}</figcaption></figure>`;
await writeFile(resolve(out,'review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>莫高窟 · 短岩石洞口</title><style>
*{box-sizing:border-box}body{margin:0;background:#eee6d7;color:#40382e;font:17px/1.7 system-ui,sans-serif}main{max-width:1320px;margin:auto;padding:36px 24px 72px}header{border-bottom:1px solid #b4a48a;padding-bottom:24px}small{letter-spacing:.15em;color:#846f50}h1,h2{font-family:serif;font-weight:500}h1{font-size:40px;margin:10px 0}h2{font-size:26px;margin:36px 0 12px}p{max-width:850px}nav{display:flex;flex-wrap:wrap;gap:12px}nav a{padding:10px 22px;background:#774630;color:#fff;text-decoration:none;border-radius:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}figure img{display:block;width:100%;height:auto;border:1px solid #b4a48a}figcaption{padding:8px 0;color:#685b49}a{color:#774630}@media(max-width:740px){.grid{grid-template-columns:1fr}h1{font-size:30px}main{padding:24px 16px}}
</style><main><header><small>莫高窟独立样片 · v002</small><h1>大块岩石，短洞口</h1><p>五块轮廓不同的砂岩围合入口，使用宽切面表现体积。通道由约10米缩至约3米，穿过后直接展开壁画厅。</p><nav><a href="/?view=approach#/">从台阶外试玩</a><a href="/?view=passage#/">走进短洞口</a><a href="/?view=interior#/">进入壁画厅</a></nav></header>
<h2>相同机位 · 改前与改后</h2><div class="grid">${shot('before','v001 · 木构入口与较深通道')}${shot('after','v002 · 大块岩石与短通道')}</div>
<h2>侧面与穿行</h2><div class="grid">${shot('side','网页实景 · 斜侧面查看岩石轮廓')}${shot('passage','网页实景 · 洞口内即可看到壁画厅')}</div>
<h2>已认可的室内</h2><p>平面仍为24×30米，壁画高18米、顶点20米；三面连续裁切壁画、无柱空间、深暖褐色沙土地面保持原样。只为缩短入口，将主室整体向前平移7米。</p>${shot('interior','网页实景 · 进入主室约3米后出现观看按钮')}
<h2>Blender源模型</h2><p>下图是保存的.blend工程实渲染，采用与网页入口图相同的相机位置与视角；Blender与网页的光照不同，造型对比以网页为准。</p>${shot('blender','Blender模型渲染 · 与网页改后入口同机位')}
<p>本页为独立样片验收。旧版4202保留；六段完整故事尚未制作，当前仍是两段技术预览。</p></main></html>`);
console.log(`入口对比页：${out}/review.html`);
