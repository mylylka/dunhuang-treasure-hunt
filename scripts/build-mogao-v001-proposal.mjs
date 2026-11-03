import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

// Proposal assets follow docs/mogao-v001-plan.md; preserve originals byte for byte.
const source='/Users/liujing/Downloads/3d视觉素材库',out=resolve('outputs/mogao/v001-proposal');
await mkdir(`${out}/references`,{recursive:true});
const files=await readdir(source),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const refs=[
 ['c01','莫高窟远景.png','C01 · 连续山崖、窟口与栈道'],
 ['c02','接近主要洞窟入口.png','C02 · 厚实窟口、宽台阶与木构窟檐'],
 ['c03','进入洞窟.png','C03 · 高顶、中央柱体与绕行空间'],
 ['c04','靠近西壁九色鹿壁画.png','C04 · 连续长卷、仰望尺度与侧向入光'],
 ['w01','最新沙漠世界高空总览图.png','W01 · 三目的地的远近关系'],
 ['performance',files.find(n=>n.startsWith('洞窟古寺中的敦煌壁画')),'长卷悬浮参考 · 这是演出图，不是另一套洞窟结构'],
];
const manifest=[];
for(const [id,name,title] of refs){
 if(!name)throw Error(`Missing reference: ${id}`);
 const bytes=await readFile(`${source}/${name}`),target=`${out}/references/${id}.png`;
 let old;try{old=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(old&&sha(old)!==sha(bytes))throw Error(`Refusing to replace an existing different source: ${target}`);
 if(!old)await writeFile(target,bytes);
 manifest.push({id,title,source:`${source}/${name}`,file:`references/${id}.png`,sha256:sha(bytes),identity:'用户提供的概念图；非新制作模型截图',processing:'原字节复制，无裁切、调色或内容改绘'});
}
await writeFile(`${out}/reference-manifest.json`,JSON.stringify(manifest,null,2));

const outside=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 410" role="img" aria-label="主崖壁宽160米、高约40米，窟口净高9米，人物约1.8米的尺度示意">
<defs><pattern id="layers" width="45" height="29" patternUnits="userSpaceOnUse"><path d="M0 26H45" stroke="#a3714977" fill="none"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#846448"/></marker></defs>
<rect width="760" height="410" fill="#f9f2e4"/><text x="28" y="36" font-size="20" fill="#503f30">崖壁立面 · 量尺示意</text>
<path d="M60 286V150L150 142L200 126L260 132L325 118L398 126L464 118L550 130L600 110L700 118V286Z" fill="#cfa36f"/>
<path d="M60 286V150L150 142L200 126L260 132L325 118L398 126L464 118L550 130L600 110L700 118V286Z" fill="url(#layers)"/>
<path d="M70 218H310M414 200H690M212 153H525" stroke="#a4714c" stroke-width="6" fill="none"/>
${[[100,230],[190,230],[270,224],[490,217],[555,216],[643,222],[232,169],[308,161],[440,158],[514,154],[585,159]].map(([x,y],i)=>`<rect x="${x}" y="${y-25-i%3*3}" width="${12+i%3*4}" height="${25+i%3*3}" rx="3" fill="#75543b"/>`).join('')}
<path d="M70 226H310M414 209H690M212 164H525" stroke="#956d48" stroke-width="3" fill="none"/>
<rect x="356" y="240.4" width="32" height="36" fill="#463c31"/>
<path d="M342 238Q372 248 402 238L397 231H347Z" fill="#71817b"/><path d="M350 240V276M394 240V276" stroke="#9a5239" stroke-width="5"/>
<path d="M348 278H396M345 282H399M342 286H402" stroke="#e5c69b" stroke-width="4" fill="none"/>
<path d="M28 288H725" stroke="#947658"/>
<circle cx="420" cy="281" r="1.5" fill="#9a4835"/><path d="M420 282V287M417 284H423M420 286L418 288M420 286L422 288" stroke="#9a4835" stroke-width="1.5"/>
<path d="M60 326H700" stroke="#846448" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="380" y="350" text-anchor="middle" font-size="17" fill="#503f30">连续崖面约 160m</text>
<path d="M725 126V286" stroke="#846448" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="716" y="196" text-anchor="end" font-size="17" fill="#503f30">约40m</text>
<path d="M420 289L463 314H640" stroke="#9a4835" fill="none"/><text x="466" y="307" font-size="15" fill="#9a4835">小旅人约1.8m · 窟口净高9m</text>
<text x="28" y="386" font-size="14" fill="#82705a">尺寸示意，非最终造型。窟口和横向层理的疏密需在Blender中设计。</text></svg>`;
const inside=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 410" role="img" aria-label="主室24米宽、14米净高，中央塔柱两侧留约8米绕行，人物约1.8米">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#846448"/></marker><pattern id="rock" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 16L16 0" stroke="#b8946b" stroke-width="1"/></pattern></defs>
<rect width="760" height="410" fill="#f9f2e4"/><text x="28" y="36" font-size="20" fill="#503f30">主室横剖面 · 人物比例保持</text>
<path d="M130 326V60H610V326H562V98H178V326Z" fill="#d6b68c"/><path d="M130 326V60H610V326H562V98H178V326Z" fill="url(#rock)"/>
<rect x="178" y="98" width="384" height="224" fill="#e8ceb0"/>
<path d="M178 109H562M178 126H562" stroke="#927358" stroke-width="5"/>
<rect x="182" y="157" width="376" height="66" fill="#a85f47" opacity=".7"/><path d="M182 151H558M182 230H558" stroke="#9e8e64" stroke-width="8"/>
<rect x="326" y="98" width="88" height="214" fill="#ba936a"/>
<path d="M319 112H421M319 122H421M322 276H418" stroke="#8c6750" stroke-width="8"/>
<rect x="310" y="306" width="120" height="16" fill="#b28d65"/><path d="M178 322H562" stroke="#8c7056" stroke-width="3"/>
<circle cx="251" cy="297" r="4.2" fill="#9a4835"/><path d="M251 302V312M245 305H257M251 310L246 321M251 310L256 321" stroke="#9a4835" stroke-width="4" stroke-linecap="round"/>
<path d="M180 352H560" stroke="#846448" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="370" y="379" text-anchor="middle" font-size="17" fill="#503f30">主室净宽24m · 纵深30m</text>
<path d="M641 98V322" stroke="#846448" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="655" y="202" font-size="17" fill="#503f30">净高</text><text x="655" y="225" font-size="21" fill="#9a4835">14m</text>
<text x="208" y="286" font-size="14" fill="#6e4f3e">约1.8m</text><text x="216" y="246" font-size="14" fill="#6e4f3e">绕行约8m</text><text x="448" y="246" font-size="14" fill="#6e4f3e">绕行约8m</text>
<text x="370" y="84" text-anchor="middle" font-size="14" fill="#503f30">顶面局部最高约16m</text></svg>`;
await writeFile(`${out}/exterior-scale.svg`,outside);await writeFile(`${out}/interior-scale.svg`,inside);
await writeFile(`${out}/index.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>莫高窟 v001 · 制作方案</title><style>
*{box-sizing:border-box}body{margin:0;background:#eee5d5;color:#493d31;font-family:system-ui,sans-serif;line-height:1.7}main{max-width:1420px;margin:auto;padding:40px 28px 70px}header{border-bottom:1px solid #b69c7d;padding-bottom:28px;margin-bottom:30px}.eyebrow{letter-spacing:.12em;font-size:13px;color:#947457}h1{font-family:serif;font-size:44px;margin:4px 0 12px;color:#8e4935}h2{font-size:25px;margin-top:36px}p{max-width:1000px}figure{margin:0;background:#f8f1e5;border:1px solid #d7c5ab;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:14px 18px}small{color:#85735c}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.callout{padding:20px 24px;border-left:4px solid #9d6546;background:#f8f1e5}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.steps article{padding:22px;background:#f8f1e5;border:1px solid #d7c5ab}.steps b{display:block;color:#984c37;font-size:19px;margin-bottom:8px}table{border-collapse:collapse;width:100%;background:#f8f1e5}th,td{text-align:left;border-bottom:1px solid #d7c5ab;padding:14px 18px}th{color:#884c39}.tag{padding:4px 9px;border:1px solid #b89574;border-radius:4px;font-size:12px}footer{margin-top:40px;font-size:14px;color:#85735c}@media(max-width:800px){.grid,.steps{grid-template-columns:1fr}h1{font-size:32px}main{padding:25px 18px}td,th{padding:9px;font-size:14px}}@media print{figure,.steps article{break-inside:avoid}}
</style><main><header><span class="eyebrow">敦煌寻宝记 · 第三文化场景</span><h1>莫高窟：从整段山崖，走入高大洞窟</h1><span class="tag">制作方案 · 待确认</span><p>以你确认的C01—C04为主要参考，保留当前小旅人的真实尺寸。通过厚重崖体、宽台阶、高窟口、14米净高与连续壁画建立气势。</p><small>本页是用户原概念图与尺度示意；尚未制作新模型，也不是游戏渲染截图。</small></header>
<h2>外部：横向延展、上下错落</h2><div class="grid">${refs.slice(0,2).map(([id,,title])=>`<figure><img src="references/${id}.png" alt="${title}"><figcaption>${title}<br><small>用户原概念图 · 保留原比例</small></figcaption></figure>`).join('')}</div>
<p>主崖壁约160米宽、40米高，主窟口真实凹入岩体。上层窟口与栈道营造层次，地面主入口具有明确的主次。全区仅一处可进入主窟，远处洞口做精简体量。</p>
<h2>内部：高顶、纵深、绕柱、仰望</h2><div class="grid">${refs.slice(2,4).map(([id,,title])=>`<figure><img src="references/${id}.png" alt="${title}"><figcaption>${title}<br><small>用户原概念图 · 保留原比例</small></figcaption></figure>`).join('')}</div>
<p>主室24×30米，净高14米、顶面最高约16米；中央塔柱两侧各有约8米绕行空间。西壁连续长卷约26×4.33米，保持原图比例。墙裙、壁画、上部边饰、顶面共同形成层次。</p>
<h2>先确认尺度，再制作模型</h2><div class="grid"><figure><img src="exterior-scale.svg" alt="崖壁尺度示意"><figcaption>外部尺度草案 · 最终轮廓与窟口节奏另行建模设计</figcaption></figure><figure><img src="interior-scale.svg" alt="主室剖面尺度示意"><figcaption>内部剖面草案 · 不是最终墙面装饰或柱体样式</figcaption></figure></div>
<table><thead><tr><th>空间</th><th>建议尺寸</th><th>验收画面</th></tr></thead><tbody><tr><td>主窟口</td><td>净宽8m × 净高9m</td><td>小旅人站在窟口下，能读出岩体厚度</td></tr><tr><td>登阶平台</td><td>总高2.4m / 12级 / 台阶宽12m</td><td>从台阶下连续登高进入主窟</td></tr><tr><td>主室</td><td>24m宽 × 30m深 × 14m净高</td><td>正常第三人称能看到柱后纵深，抬头有完整顶面</td></tr><tr><td>西壁长卷</td><td>26m × 约4.33m / 下缘2.2m</td><td>有足够退观距离，不被柱体长期遮住</td></tr></tbody></table>
<p><small>数值为游戏空间设计，非文物测绘尺寸。最终尺寸和机位需要一起验收。</small></p>
<h2>制作顺序</h2><div class="steps"><article><b>01 · 外部接近</b>从乐舞馆沿现有风格石板路向远方走，约65—75秒正常步行到窟前平台。逐渐读到崖顶、完整崖面和主入口。</article><article><b>02 · 可走的主窟</b>Blender制作外壳与内部，保留源工程、导出分区GLB。走通台阶、入窟、绕柱、壁画前退观与出窟。</article><article><b>03 · 演出与导览</b>空间美术确认后完善六段九色鹿故事，沿用纯字幕、空格跳过及中央两项选择；现有两段预览不算正式故事完成。</article></div>
<h2>素材质量关口</h2><div class="callout">高清九色鹿长卷和局部图已经具备。柱身、上部墙面及顶面装饰尚需核对可用正视素材；若概念图局部提取达不到近看质量，给出明确素材规格。整张透视图不会贴成假3D背景，也不会用空白高墙代替精致内装。</div>
<h2>世界关系与演出参考</h2><div class="grid">${refs.slice(4).map(([id,,title])=>`<figure><img loading="lazy" src="references/${id}.png" alt="${title}"><figcaption>${title}</figcaption></figure>`).join('')}</div>
<footer>独立v001制作，现有场景和原素材保持。验收固定机位：远望崖壁／台阶下仰望／进门看高顶／侧面绕柱／西壁长卷。请先确认本页空间方向与尺度，再进入新区域建模和运行接入。</footer></main></html>`);
console.log(out);
