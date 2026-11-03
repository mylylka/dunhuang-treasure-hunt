"""Archive approved originals and make uncropped, proportional runtime copies."""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib,io,json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/Users/liujing/Downloads/3d视觉素材库')
ARCHIVE=ROOT/'art-source/world/nine-colored-deer/v002'
OUT=ROOT/'public/assets/world/story/v002'
SPECS=[('full-scroll','九色鹿全图.jpg',4096),('background','高度虚化洞窟背景完整长卷浮现.png',1920),('rescue-and-promise','鹿王救人+溺水者立誓.jpg',2000),('queen-and-betrayal','王后要皮+溺水人告密.jpg',2000),('king-hunts','国王捕鹿.jpg',1800),('deer-sleeps','鹿王酣睡.jpg',1800),('appeal-to-the-king','鹿王陈情.jpg',2000),('broken-oath','溺水者生疮.jpg',2000)]
def keep(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists() and path.read_bytes()!=data:raise RuntimeError(f'Existing file differs: {path}; use a new version.')
 if not path.exists():path.write_bytes(data)
records={}
for id,name,size in SPECS:
 raw=(SOURCE/name).read_bytes();keep(ARCHIVE/name,raw)
 image=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB');original=image.size
 image.thumbnail((size,size),Image.Resampling.LANCZOS);stream=io.BytesIO();image.save(stream,'WEBP',quality=93,method=6)
 keep(OUT/f'{id}.webp',stream.getvalue())
 records[id]={'file':f'{id}.webp','width':image.width,'height':image.height,'sourceFile':name,'sourceSize':original,'sourceSha256':hashlib.sha256(raw).hexdigest(),'runtimeSha256':hashlib.sha256(stream.getvalue()).hexdigest()}
keep(ARCHIVE/'当前故事局部大幅放大.png',(SOURCE/'当前故事局部大幅放大.png').read_bytes())
manifest={'processing':'EXIF, RGB, proportional downsize, WebP93; no crop, upscaling or content edits','filenameAlias':'User described 王后要皮+溺水人告密(1).jpg; actual supplied file without (1) visually checked against full scroll.','images':records}
keep(ARCHIVE/'source-manifest.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())
keep(ROOT/'src/content/world/story-media-v002.json',(json.dumps(records,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps(records,ensure_ascii=False))
