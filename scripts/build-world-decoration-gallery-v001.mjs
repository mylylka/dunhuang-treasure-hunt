import {mkdir,copyFile,readFile,readdir,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
const root='outputs/world-decoration-reference/v001';
await mkdir(`${root}/annotated`,{recursive:true});
const copies={
 'm15':'decoration-interaction-m15-before.png','m16':'decoration-interaction-m16-awakening.png','m17':'decoration-interaction-m17-dialogue.png','m18':'decoration-interaction-m18-choice.png',
 't18':'decoration-interaction-t18-arrival.png','t19':'decoration-interaction-t19-buddha.png','t20':'decoration-interaction-t20-deer.png','t21':'decoration-interaction-t21-story-choice.png'
};
for(const [id,name] of Object.entries(copies)){try{await copyFile(`work/world/${name}`,`${root}/original/${id}.png`,constants.COPYFILE_EXCL)}catch(e){if(e.code!=='EEXIST')throw e}}
const technical={
 'c17-courtyard-overhead':'decoration-courtyard-overhead-measured.png','c18-courtyard-plan':'decoration-cutaway-courtyard-measured.png','c19-hall-plan':'decoration-cutaway-hall-measured.png',
 'm11-music-overhead':'decoration-music-overhead-measured.png','m12-music-cutaway':'decoration-music-cutaway-measured.png',
 't13-cliff-overhead':'decoration-cliff-overhead-measured.png','t14-cave-plan':'decoration-cutaway-cave-measured.png'
};
for(const [id,name] of Object.entries(technical)){try{await copyFile(`work/world/${name}`,`${root}/annotated/${id}.png`,constants.COPYFILE_EXCL)}catch(e){if(e.code!=='EEXIST')throw e}}
await copyFile('work/world/decoration-dimensions-v001.md',`${root}/尺寸说明.md`);
const report=JSON.parse(await readFile('work/world/decoration-ground-capture-report.json','utf8'));
const titles=Object.fromEntries(report.shots.map(s=>[s.id,s.title]));
Object.assign(titles,{g01:'世界高空总览',g02:'世界反向高空 · 摄影辅助视角',g03:'世界垂直俯视 · 摄影辅助视角',o25:'上坡实际跑动',o26:'下坡实际跑动',c07:'庭院面向大厅',c08:'庭院看左侧',c09:'庭院回看入口',c10:'庭院看右侧',c11:'大厅正面莲花壁画',c12:'大厅左侧开放柱廊',c13:'大厅右侧木构',c14:'大厅回看入口',c15:'大厅仰视藻井',c16:'大厅仰视梁柱',c17:'院落含屋顶俯视 · 摄影辅助视角',c20:'绘画工作坊',m09:'乐舞坊壁画与台基',m10:'乐舞坊回看入口','m09-up':'乐舞坊抬头看建筑',m15:'互动：飞天唤醒前',m16:'互动：飞天唤醒',m17:'互动：飞天讲解',m18:'互动：讲解结束',t08:'洞窟面向大佛',t09:'洞窟一侧壁画',t10:'洞窟另一侧壁画',t11:'洞窟回看入口',t12:'洞窟仰视顶部',t15:'洞口过渡',t16:'大佛与人物比例','t16-up':'洞内抬头看大佛','t07-game':'游戏内抬头看九层楼',t17:'洞内壁画与墙面',t18:'互动：入厅提示',t19:'互动：大佛讲解',t20:'互动：九色鹿故事示例',t21:'互动：故事结束选择'});
const techTitles={'g03-map':'世界布局与户外站位参考','c17-courtyard-overhead':'绘彩馆院落含屋顶俯视 · 模型技术图','c18-courtyard-plan':'绘彩馆院落剖顶俯视 · 模型技术图','c19-hall-plan':'绘彩馆大厅剖顶俯视 · 模型技术图','m11-music-overhead':'乐舞坊院落俯视 · 模型技术图','m12-music-cutaway':'乐舞坊去顶俯视 · 模型技术图','t07-elevation':'九层楼正立面与各檐高度 · 模型技术图','t13-cliff-overhead':'九层楼崖体俯视 · 模型技术图','t14-cave-plan':'洞窟剖顶俯视 · 模型技术图'};
const originals=(await readdir(`${root}/original`)).filter(f=>f.endsWith('.png')).sort();
const annotations=(await readdir(`${root}/annotated`)).filter(f=>f.endsWith('.png')&&!f.startsWith('cutaway-')).sort();
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const card=(folder,file,caption)=>`<figure><a href="${folder}/${encodeURIComponent(file)}" target="_blank"><img loading="lazy" src="${folder}/${encodeURIComponent(file)}" alt="${esc(caption)}"></a><figcaption>${esc(file.replace('.png','').toUpperCase())} · ${esc(caption)}</figcaption></figure>`;
const categories=[['世界总览','world',f=>f.startsWith('g')],['户外漫游','outdoor',f=>f.startsWith('o')],['绘彩馆','courtyard',f=>f.startsWith('c')],['乐舞坊','music',f=>f.startsWith('m')],['九层楼与洞窟','tower',f=>f.startsWith('t')]];
const sections=categories.map(([name,key,match])=>`<section id="${key}"><h2>${name}</h2><div class="grid">${originals.filter(match).map(f=>card('original',f,titles[f.slice(0,-4)]??'游戏实景')).join('')}</div></section>`).join('');
const marked=annotations.map(f=>card('annotated',f,techTitles[f.slice(0,-4)]??`${titles[f.slice(0,-4)]??'场景'} · 尺寸标注`)).join('');
await writeFile(`${root}/index.html`,`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>敦煌寻宝记 · 世界装修参考图册</title><style>body{margin:0;background:#eee3cf;color:#3c3028;font:16px/1.6 system-ui,-apple-system,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}h1{color:#843f2a;margin-bottom:.2em}h2{margin-top:2em;border-bottom:2px solid #c9a675;padding-bottom:.4em}.lead{max-width:80ch}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:18px}figure{margin:0;background:#fffaf0;border:1px solid #d5c1a0;border-radius:8px;overflow:hidden}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#302a25}figcaption{padding:10px 12px}nav{display:flex;gap:14px;flex-wrap:wrap}a{color:#8a472f}small{color:#6f6254}</style></head><body><header><h1>敦煌寻宝记 · 世界装修参考图册</h1><p class="lead">当前游戏 terrain-v009 实景截图，单击图片查看原尺寸。尺寸图分别标明游戏实景或模型技术视图；剖顶图临时隐藏遮挡结构。九层楼檐口高度以平台为起点，不能当成室内净层高。</p><p><a href="尺寸说明.md">查看尺寸及来源说明</a> · ${originals.length} 张实景原图 · ${annotations.length} 张尺寸/技术图</p><nav><a href="#measurements">尺寸与俯视</a>${categories.map(([name,key])=>`<a href="#${key}">${name}</a>`).join('')}</nav></header><main><section id="measurements"><h2>尺寸标注与俯视技术图</h2><div class="grid">${marked}</div></section>${sections}</main></body></html>`);
const indexFile=`${root}/index.html`;
const indexHtml=await readFile(indexFile,'utf8');
await writeFile(indexFile,indexHtml.replace('</header>','<p class="lead"><small>摄影辅助视角使用当前场景的自由相机；模型技术图来自运行模型，灯光与部分独立陈设可能不同。乐舞坊主体为合并网格，去顶技术图并非完整剖面。绘彩馆藻井目前可自由仰视，旧的独立观察触发尚未接回。</small></p></header>'));
console.log(JSON.stringify({originals:originals.length,annotations:annotations.length,index:indexFile}));
