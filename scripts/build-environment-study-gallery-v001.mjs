import {readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'outputs/environment-study/v001');
const materials=[
  {id:'sand',title:'01 · 纯沙',use:'大沙丘、沙坡主体',description:'浅沙金底色，低起伏风纹与细颗粒；远处优先保留连续的大明暗。'},
  {id:'gravel',title:'02 · 沙砾',use:'坡脚、路旁、沙地与岩区过渡',description:'沙底中疏密有变化的嵌入碎石，少量较大的石块使用真实几何。'},
  {id:'gobi',title:'03 · 戈壁',use:'第三馆外围、岩群间谷地',description:'紧实细砾层，偏暖的灰褐色；与沙地柔和过渡，避免铺成硬边色块。'},
];
for(const item of materials){
  await access(path.join(output,`${item.id}-material.png`));
  for(const map of ['basecolor','normal','roughness'])await access(path.join(output,`textures/${item.id}-${map}.png`));
}
const figure=(file,title,description)=>`<figure><a href="${file}" target="_blank" rel="noopener"><img src="${file}" alt="${title}" loading="lazy"></a><figcaption><strong>${title}</strong><p>${description}</p></figcaption></figure>`;
let caravan='';
try{
  await access(path.join(output,'caravan-distant.png'));
  caravan=`<section id="atmosphere"><h2>远方的驼队</h2>${figure('caravan-distant.png','山脊上的远方驼队 · 构图示意','采用素材库现有骆驼模型，人物眼高看远方队列。此图用于讨论距离、剪影和遮挡，尚未安置进当前游戏。')}<p class="note">远云可用透明图卡或分层天空背景；非常远的驼队也可用透明图卡。能绕行接近、需要投影的岩体与驼队，更适合简化3D模型。此次收到的两张附件是地貌参考，未收到独立云图。</p></section>`;
}catch{}
let overview='';
try{await access(path.join(output,'materials-overview.png'));overview=figure('materials-overview.png','同一低缓坡上的三种地面','只对照材质，实际世界中三者会通过分布遮罩柔和混合。');}catch{}
const doc=await readFile(path.join(root,'docs/world-environment-art-proposal-v001.md'),'utf8');
await writeFile(path.join(output,'方案说明.md'),doc);
const cards=materials.map(m=>`<article>${figure(`${m.id}-material.png`,m.title,m.description)}<div class="detail"><p class="use">${m.use}</p><p class="maps"><a href="textures/${m.id}-basecolor.png" target="_blank">底色</a><a href="textures/${m.id}-normal.png" target="_blank">法线</a><a href="textures/${m.id}-roughness.png" target="_blank">粗糙度</a></p></div></article>`).join('');
await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>敦煌 · 地貌与地面材质样片</title><style>
:root{font-family:system-ui,-apple-system,'PingFang SC',sans-serif;color:#362d24;background:#f4ecde;line-height:1.7}*{box-sizing:border-box}body{margin:0}header,main,footer{width:min(1440px,94%);margin:auto}header{padding:48px 0 24px}h1{font-size:clamp(28px,3vw,46px);line-height:1.2;letter-spacing:.02em;margin:10px 0 24px;font-weight:650}h2{font-size:25px;margin:0 0 22px}p{margin:.6em 0}.eyebrow{font-size:13px;letter-spacing:.18em;color:#8b4e33}.lead{max-width:800px;color:#665442}.tag{display:inline-block;background:#e9dac0;padding:7px 14px;border-radius:4px;font-size:13px}.sun{border-left:3px solid #a77435;padding:6px 18px;margin:24px 0;color:#665442}nav{display:flex;gap:24px;flex-wrap:wrap;margin-top:25px}a{color:#754329;text-underline-offset:4px}section{padding:35px 0;border-top:1px solid #d5c3a9;scroll-margin-top:20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:#fffaf1;border:1px solid #dfceb3;border-radius:6px;overflow:hidden}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:18px 20px}figcaption p{font-size:14px;color:#6f5e4e}.detail{padding:0 20px 18px}.use{font-size:13px;color:#705d45}.maps{display:flex;gap:18px;font-size:13px}.wide-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.wide-grid figure,section>figure{background:#fffaf1;border:1px solid #dfceb3}.note{font-size:14px;color:#715f4f;max-width:1000px;margin:20px 0}.explain{max-width:1000px}footer{padding:25px 0 50px;font-size:13px;color:#786755}.explain b{font-weight:650}@media(max-width:900px){.grid{grid-template-columns:1fr}.wide-grid{grid-template-columns:1fr}header{padding-top:25px}}
</style></head><body><header><div class="eyebrow">DUNHUANG · ENVIRONMENT STUDY 001</div><h1>地貌、斜阳与三种地面</h1><span class="tag">独立 Blender 样片 · 待讨论</span><p class="lead">先确认空间与材质方向。保留当前主行动线的缓坡，将丰富的沙丘、戈壁与岩群安排在行动线外。下面均为独立场景渲染，正式游戏尚未改动。</p><div class="sun">所有镜头共用西北太阳：方位315°，高度30°。阳光与地形产生明暗，底色贴图中没有画死太阳影子。</div><nav><a href="#materials">地面材质</a><a href="#landscape">地貌与投影</a>${caravan?'<a href="#atmosphere">远方驼队</a>':''}<a href="#lighting">影子为什么晚出现</a><a href="方案说明.md">完整接入方案</a></nav></header><main><section id="materials"><h2>近看三种地面</h2><div class="grid">${cards}</div><p class="note">单击图片查看完整尺寸。每类附1024×1024底色、法线和粗糙度样张；这是材质讨论版本，正式使用仍需按区域混合与距离缩减细节，不能把细砾铺满整幅远景。</p>${overview}</section><section id="landscape"><h2>连续沙丘与风蚀岩群</h2><div class="wide-grid">${figure('landscape-aerial.png','俯瞰 · 看体量、疏密和阴阳坡','连续沙丘与错落的宽厚岩群；空地和峡口保留呼吸感。')}${figure('landscape-ground.png','地面 · 看脊线、遮挡和投影','以人物眼高看几何体量。岩群仍为简化造型研究，未完成正式资产的精修与网页贴图烘焙。')}</div><p class="note">这两张只表达地貌与光照方向；地面微纹理仍是构图用程序材质，最终以本页三种材质样张讨论结果为准。Cycles离线渲染不代表网页运行性能。</p></section>${caravan}<section id="lighting"><h2>当前阴影机制与改造方向</h2><div class="explain"><p><b>太阳一直没变，阴影计算范围在跟着人物移动。</b>当前普通区域只计算附近约130×130米的光源投影范围，第三馆约190×190米。因此远处院落进入覆盖范围后，影子才出现。这是现有近景实时阴影的覆盖限制。</p><p>当前地形还没有自身投影，而环境补光较强：树和房子会往沙地投影，沙丘却没有完整的相互遮挡影子，背阴面也被托亮了。</p><p><b>固定环境可以提前计算阴影。</b>建议给地形、建筑、山岩和固定树木保存静态遮光数据，进入视野便一起呈现；人物继续用同一太阳方向的动态影子。底色与光照分开保存，物体改动后更新受影响区域。</p></div></section></main><footer>本次检查仅覆盖样片渲染、贴图与文件链接。未运行项目全量测试，未修改正式3D路线或2D玩法。</footer></body></html>`);
console.log(JSON.stringify({index:path.join(output,'index.html'),materials:3,landscapeViews:2,caravan:!!caravan}));
