"""Technical texture conversion only. All original pixels and the complete scroll survive.
The Blender planes split the scroll via contiguous UVs; no generative retouching.
"""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'art-source/world/nine-colored-deer/v001/九色鹿全图.jpg'
target=ROOT/'public/assets/world/mogao/v001/three-wall-scroll.jpg'
target.parent.mkdir(parents=True,exist_ok=True)
with Image.open(source) as raw:
 image=ImageOps.exif_transpose(raw).convert('RGB')
 original=image.size
 image.thumbnail((6144,6144),Image.Resampling.LANCZOS)
 image.save(target,quality=93,subsampling=0,optimize=True)
 dimensions=image.size
manifest={
 'source':str(source.relative_to(ROOT)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'originalSize':original,'runtime':str(target.relative_to(ROOT)),'runtimeSize':dimensions,
 'runtimeSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
 'processing':'EXIF orientation; full-image Lanczos downscale; JPEG quality 93, no chroma subsampling. No crop, repaint or altered content.',
 'threeWallUV':{'left':[0,(30/18*2150)/12918],'front':[(30/18*2150)/12918,(54/18*2150)/12918],'right':[(54/18*2150)/12918,(84/18*2150)/12918]},
 'wallWidthsMetres':[30,24,30],'heightMetres':18,'displayedSourcePixels':[0,0,84/18*2150,2150],
 'fullOriginalPreserved':'Unchanged full scroll remains available in the story player. User authorized a continuous partial excerpt on the three cave walls.',
 'readingDirection':'enter the chamber: left wall front-to-back; front wall left-to-right; right wall back-to-front',
}
(ROOT/'art-source/world/mogao/v001/scroll-mapping.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False))
