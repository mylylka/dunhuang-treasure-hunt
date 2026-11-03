"""Versioned import and technical texture/coordinate preparation; originals untouched."""
from pathlib import Path
from PIL import Image
import json,shutil,hashlib
R=Path(__file__).resolve().parents[1];A=R/'art-source/world/mogao/v008';N=R/'art-source/world/novice-story/v001';O=R/'public/assets/world/mogao/v008';S=R/'public/assets/world/novice-story/v001'
for p in (A,N,O,S):p.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
entries=[]
def archive(path,folder):
 p=Path(path);dst=folder/p.name
 if dst.exists():assert sha(dst)==sha(p)
 else:shutil.copy2(p,dst)
 entries.append({'source':str(p),'archive':str(dst.relative_to(R)),'sha256':sha(p)})
 return dst
b=Path('/Users/liujing/Downloads/3d视觉素材库')
archive('/Users/liujing/Downloads/3D模型/古代佛像3d模型.glb',A)
for name in ['九层楼内大佛从下往上看的视角.png','九色鹿壁画和上面千佛的连接.png','千佛洞素材红色1.png']:archive(b/name,A)
names=['沙弥守戒自杀品.png','1沙弥剃度.png','2沙弥与少女.png','3少女向父哭诉.jpeg','4少女之父向国王交罚金.jpeg','5火化和供养.jpeg']
for n in names:archive(b/'沙弥壁画素材'/n,N)
im=Image.open(N/names[0]).convert('RGB');crop=(0,168,2172,526);full=im.crop(crop);full.save(O/'novice-scroll.jpg',quality=94);full.save(S/'full-scroll.webp',quality=92)
# Four intact figures per row; seams lie in plaster/row gaps, never faces/hands.
im=Image.open(A/'千佛洞素材红色1.png').convert('RGB');tiles=[im.crop((116,y,652,y+222)) for y in [225,650,1094]]
atlas=Image.new('RGB',(536,666))
for i,t in enumerate(tiles):atlas.paste(t,(0,i*222))
# Four-pixel edge equalization confined to empty inter-figure plaster.
pix=atlas.load();w,h=atlas.size
for y in range(h):
 for k in range(4):
  t=(4-k)/4; a=pix[k,y];b_=pix[w-1-k,y];mean=tuple((a[j]+b_[j])//2 for j in range(3))
  pix[k,y]=tuple(round(a[j]*(1-t)+mean[j]*t) for j in range(3));pix[w-1-k,y]=tuple(round(b_[j]*(1-t)+mean[j]*t) for j in range(3))
for x in range(w):
 for k in range(3):
  t=(3-k)/3;a=pix[x,k];b_=pix[x,h-1-k];mean=tuple((a[j]+b_[j])//2 for j in range(3));pix[x,k]=tuple(round(a[j]*(1-t)+mean[j]*t) for j in range(3));pix[x,h-1-k]=tuple(round(b_[j]*(1-t)+mean[j]*t) for j in range(3))
atlas.save(O/'thousand-buddhas.jpg',quality=95)
# Exact original image -> separate runtime formats; no AI re-drawing or saturation boost.
shutil.copy2(R/'public/assets/world/story/v002/full-scroll.webp',O/'deer-scroll.webp')
plan=(R/'docs/mogao-v008-plan.md').read_text();texts=[]
for key in ['第一段','第二段','第三段','第四段','第五段']:
 texts.append(plan.split(key+'：',1)[1].split('\n\n',1)[0])
regions=[[0,158,698,493],[642,159,1010,451],[947,166,1164,432],[1127,158,1461,478],[1405,158,1985,495]]
ids=['ordination','novice-and-girl','confession','fine','cremation'];segments=[]
for i,(id,n) in enumerate(zip(ids,names[1:])):
 image=Image.open(N/n).convert('RGB')
 # Keep supplied composition. Remove only scan caption/white paper beneath final scene.
 trim=None
 if i==4:
  # Retain full image for now; source caption is not silently erased.
  pass
 image.thumbnail((2200,1700));image.save(S/f'{id}.webp',quality=93)
 region=regions[i];mapped=[region[0]*2172/2048,region[1]*724/682-168,region[2]*2172/2048,region[3]*724/682-168]
 segments.append({'id':id,'title':n[1:].rsplit('.',1)[0],'text':texts[i],'audio':id+'.mp3','images':[{'id':id,'file':id+'.webp','width':image.width,'height':image.height,'alt':n[1:].rsplit('.',1)[0],'region':mapped,'originalRegion':region}]})
config={'id':'novice-precepts','title':'沙弥守戒','coordinateSize':[2172,358],'sourceCoordinateSize':[2048,682],'sourceSize':[2172,724],'crop':crop,'backgroundScrollRect':[80,395,1760,1760*358/2172], 'fullImage':{'file':'full-scroll.webp','width':2172,'height':358},'introduction':{'id':'introduction','text':plan.split('导语：',1)[1].split('\n\n',1)[0],'audio':'introduction.mp3'},'segments':segments,'ending':{'id':'ending','text':'敦煌的壁画里，还藏着许多这样的故事。想继续看看吗？','audio':'ending.mp3'}}
(R/'src/content/world/novice-story-v001.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
(A/'import-manifest.json').write_text(json.dumps({'sources':entries,'thousandBuddhas':{'rows':[225,650,1094],'cropX':[116,652],'rowHeight':222,'seam':'4px vertical and 3px outer horizontal plaster-edge equalization; intact figures, no mirroring'},'noviceWallCrop':crop},ensure_ascii=False,indent=2)+'\n')
L=json.loads((R/'src/content/world/mogao-layout-v007.json').read_text());L['version']='v008';L['room']={'width':28,'depth':25,'front':7,'height':38.5,'peakHeight':39.5};L['buddha']={'width':23.542399315,'depth':17.7349316535,'height':35,'centerY':22.13253417325,'front':13.2650683465,'back':31};L['mural']={'bottom':.7,'height':4.1,'doorLength':10.2,'deerLength':4.1*12918/2150,'noviceLength':4.1*2172/358};L['views'].update({'interior':[122,-78,0],'buddha':[122,-79.8,0],'deer':[109,-79,1.5708],'novice':[135,-79,-1.5708],'door-wall':[122,-79,3.14159],'deer-side':[109,-87,1.5708],'novice-side':[135,-87,-1.5708],'passage':[122,-71,0]})
(R/'src/content/world/mogao-layout-v008.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
p=R/'docs/mogao-v008-plan.md';t=p.read_text();t=t.replace('目前为制作规格和布局核算，尚未实装。','用户已明确“别的没什么问题了，开始做吧”，现执行独立v008制作。');t+='\n## 已确认的洞内光照补充\n\n洞外看入几乎全黑，只隐约可见轮廓。进门过程中随视点深度与时间平滑适应，进入后仍保持低照度、低饱和的石窟观感。外景日光不直接照亮全部壁画，佛像、壁画不做自发光展板；抬头可辨识高处藻井，但远处亮度低于眼前壁画。独立照明分区只用于隔离室内外，沿真实入口方向提供有限柔和反射光，不新增无来源彩灯。\n';p.write_text(t)
print('Prepared v008 assets and five-segment configuration.')
