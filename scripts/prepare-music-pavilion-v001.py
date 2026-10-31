"""Archive user art unchanged; extract only two short ribbon ends for gentle motion."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import hashlib, json, shutil
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/music-pavilion/v001'
OUT = ROOT / 'public/assets/world/music-pavilion/v001'
WORK = ROOT / 'work/world'
for directory in (SOURCE, OUT, WORK): directory.mkdir(parents=True, exist_ok=True)
names = ['二楼改为开放乐廊的最新外景图.png','玩家进入前庭壁画仍然为灰色的图.png',
         '玩家走到灰色飞天壁画前的图.png','飞天壁画唤醒后的效果图.png',
         '独立彩色飞天主壁画母图.png','飞天飘带补底图-v001.png']
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
manifest = {'version':'v001','source':'user supplied Downloads/3d视觉素材库','files':[]}
for name in names:
    original = Path('/Users/liujing/Downloads/3d视觉素材库') / name
    archived = SOURCE / name
    if archived.exists() and digest(archived) != digest(original): raise ValueError('Archive differs; use a new version')
    if not archived.exists(): shutil.copy2(original, archived)
    manifest['files'].append({'name':name,'sha256':digest(archived),'size':Image.open(archived).size})
original = Image.open(SOURCE / names[-2]).convert('RGB')
repair = Image.open(SOURCE / names[-1]).convert('RGB')
w,h = original.size
# Authored contours: only the outermost two short ends. Connections and the
# altered truncated tips of the supplied repair image remain under original art.
contours = [
    [(78,106),(115,134),(145,180),(167,222),(200,263),(244,290),(284,308),(285,354),
     (246,341),(207,322),(177,300),(149,274),(128,240),(108,203),(93,166),(84,132)],
    [(94,369),(111,382),(121,407),(140,428),(168,441),(194,447),(222,438),(249,422),
     (279,411),(279,451),(253,463),(225,477),(200,478),(170,470),(143,456),(120,433),(105,407)]
]
mask_arrays=[]
for polygon in contours:
    mask=Image.new('L',(w,h)); ImageDraw.Draw(mask).polygon(polygon,fill=255)
    # Soft extraction boundary avoids a one-pixel fringe; displacement fades to
    # zero well before the right-hand attachment edge.
    mask_arrays.append(np.asarray(mask.filter(ImageFilter.GaussianBlur(.55))).astype(float)/255)
packed=np.zeros((h,w,3),dtype=np.uint8)
packed[:,:,0]=(mask_arrays[0]*255).astype(np.uint8)
packed[:,:,1]=(mask_arrays[1]*255).astype(np.uint8)
crop=(60,85,294,491)
Image.fromarray(packed).crop(crop).save(OUT/'ribbon-masks-crop.png')
combined=np.maximum(*mask_arrays)
src=np.asarray(original).astype(float); fill=np.asarray(repair).astype(float)
base=np.round(src*(1-combined[:,:,None])+fill*combined[:,:,None]).astype(np.uint8)
Image.fromarray(base).crop(crop).save(OUT/'mural-underlay-crop.png')
original.save(OUT/'mural-original.png')
# Zero movement is rendered from the untouched mother image, then crossfades
# into the local extraction only while animated. Unaffected pixels stay exact.
changed=np.any(base != src.astype(np.uint8),axis=2)
assert not np.any(changed & (combined==0))
manifest['layering']={'contoursPx':contours,'motionMaxPixels':2.2,'staticRightOfPixel':285,
                     'changedUnderlayPixels':int(changed.sum()),'changesOutsideMask':0,
                     'method':'Original pixels only for moving ends; local supplied repair underlay; no full-image replacement',
                     'patchCropPx':crop,'originalAspect':w/h,'runtime':['mural-original.png','mural-underlay-crop.png','ribbon-masks-crop.png']}
(SOURCE/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
protected={}
for folder in ('public/assets/world','art-source/world/models'):
    for p in (ROOT/folder).rglob('*'):
        if p.suffix in ('.glb','.blend') and 'music-pavilion' not in p.parts: protected[str(p.relative_to(ROOT))]=digest(p)
protected['AGENTS.md']=digest(ROOT/'AGENTS.md')
baseline=SOURCE/'protected-assets.json'
if not baseline.exists(): baseline.write_text(json.dumps(protected,indent=2)+'\n')
for path,sha in json.loads(baseline.read_text()).items(): assert digest(ROOT/path)==sha,path
print(json.dumps({'archived':len(names),'protected':len(protected),'underlayPixels':int(changed.sum())}))
