import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const out='outputs/music-pavilion/v006';await mkdir(out,{recursive:true});
const pictures=[
 ['road-subtitle','乐声先响起 2 秒，再停步张望与说话'],
 ['mural-left-button','壁画左侧台阶下：赞叹结束，原地出现唤醒按钮'],
 ['mural-right-button','壁画右侧台阶下：同样可以唤醒'],
 ['transition-no-caption','灰转彩时只有画面与流烟，不出现提示文字框'],
 ['flying-subtitle','字幕框只放台词和普通字体的跳过提示'],
 ['flying-choice','对白结束或空格跳过后：虚化当前画面，中央两项选择'],
 ['caisson-choice','藻井观察完成：相同选择方式'],
 ['story-choice','现有故事预览结束：相同选择方式'],
 ['mobile-subtitle','手机横屏：字幕后的括号文字也可触摸跳过'],
 ['mobile-choice','手机横屏：中央选择窗'],
];
for(const [id] of pictures)await copyFile(`work/world/music-pavilion-v006-${id}.png`,`${out}/${id}.png`);
await writeFile(`${out}/review.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>乐舞馆 v006 · 字幕与文化选择</title><style>body{margin:0;background:#eee5d5;color:#513b2a;font-family:system-ui;padding:30px;max-width:1300px;margin:auto}h1{font-size:28px}p{line-height:1.7}a{color:#9b4a34;margin-right:20px;display:inline-block;line-height:2.2}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:24px}figure{margin:0;background:#faf6ed;padding:12px}img{width:100%;height:auto}figcaption{padding:12px 4px}nav{margin:22px 0}</style>
<h1>乐舞馆 v006 · 字幕与文化选择</h1>
<p>语音播放时，底部只显示台词和“（摁空格跳过）”。文化对白播完或跳过后，当前画面虚化，中央显示“返回漫游 / 进入文化导览”。路上的自言自语和壁画前的赞叹结束后直接恢复探索。以下均为实际网页截图。</p>
<nav><a href="./?view=music-road#/">从乐声出现前试玩</a><a href="./?view=mural-left#/">壁画左侧台阶下</a><a href="./?view=mural-right#/">壁画右侧台阶下</a><a href="./?view=caisson#/">藻井观察</a><a href="./?view=story#/">现有故事预览</a></nav>
<section>${pictures.map(([id,label])=>`<figure><img loading="lazy" src="${id}.png" alt="${label}"><figcaption>${label}</figcaption></figure>`).join('')}</section>
<p>配音仍为本机试听。纹样文化导览可进入；乐舞与故事导览内容尚未开放，选择窗已连接到各自主题入口。九色鹿仍是现有两段字幕预览，正式旁白待配；藻井当前无对白，观察镜头后直接出现选择。v005 旧预览保留。</p></html>`);
console.log(`${out}/review.html`);
