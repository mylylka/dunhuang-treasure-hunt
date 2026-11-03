"""Archive the user-authorized imagegen expansion, preserve native aspect, encode runtime JPEG."""
from pathlib import Path
import argparse, hashlib, json, shutil
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT/'art-source/world/hall-decoration/v002'
OUTPUT = ROOT/'public/assets/world/courtyard/v004'
parser=argparse.ArgumentParser();parser.add_argument('--candidate',type=Path,required=True);args=parser.parse_args()
ARCHIVE.mkdir(parents=True,exist_ok=True);OUTPUT.mkdir(parents=True,exist_ok=True)
archived=ARCHIVE/'hall-lotus-wide-generated.png'
if args.candidate.resolve()!=archived.resolve():shutil.copy2(args.candidate,archived)
im=Image.open(archived).convert('RGB');runtime=OUTPUT/'hall-lotus-wide.jpg';im.save(runtime,quality=95,subsampling=0)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
manifest={'version':'v002','scope':'User-authorized wide mural edit, no other generated art','generator':'built-in image_gen image edit','prompt':'wide-mural-prompt.txt','input':'../v001/对称古韵莲花壁画.png','candidatePath':str(args.candidate),'archive':archived.name,'archiveSha256':sha(archived),'runtime':str(runtime.relative_to(ROOT)),'runtimeSha256':sha(runtime),'pixels':list(im.size),'aspect':im.width/im.height,'physicalWidth':12.5,'physicalHeight':12.5*im.height/im.width,'processing':'Full canvas, original aspect, native resolution; RGB JPEG quality95 subsampling0; no crop, stretch, sharpening or added pixels. AI generated lateral floral extension and revised painted border; not a historical reconstruction.'}
(ARCHIVE/'wide-mural-source.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False))
