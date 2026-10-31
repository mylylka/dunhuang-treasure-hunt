"""Archive the approved sample references without altering source bytes."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/3d视觉素材库'
archive = root / 'art-source/world/art-sample/v001'
archive.mkdir(parents=True, exist_ok=True)
names = [
    '最新沙漠世界高空总览图.png', '原始小旅人出生点第三人称开场图.png',
    '最新纹彩院庭院图.png', '半开放藻井观赏厅内部图.png',
    '藻井独立正视图.jpeg', '小旅人三视图.png', '环境小品和树木资产设定板.png',
]
records = []
for name in names:
    origin, target = source / name, archive / name
    digest = hashlib.sha256(origin.read_bytes()).hexdigest()
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise RuntimeError(f'Refusing to replace archived source: {target}')
    if not target.exists():
        shutil.copy2(origin, target)
    with Image.open(target) as img:
        records.append({'filename': name, 'sha256': digest, 'pixels': list(img.size), 'bytes': target.stat().st_size})
runtime = root / 'public/assets/world/courtyard/v001/caisson.png'
runtime.parent.mkdir(parents=True, exist_ok=True)
with Image.open(archive / '藻井独立正视图.jpeg') as img:
    ImageOps.exif_transpose(img).convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS).save(runtime, optimize=True)
(archive / 'source-manifest.json').write_text(json.dumps({
    'date': '2026-10-31', 'stage': 'art-sample-v001-awaiting-confirmation',
    'sourceLibrary': str(source), 'sourceIdentity': 'User supplied AI concept references; not archaeological reconstruction',
    'sources': records,
    'derivative': {'path': str(runtime.relative_to(root)), 'processing': 'EXIF orientation, RGB conversion, complete-image resize to 1024 square; no content edits or watermark removal', 'sha256': hashlib.sha256(runtime.read_bytes()).hexdigest()},
}, ensure_ascii=False, indent=2) + '\n')
print(f'Archived {len(records)} references; caisson texture: {runtime.stat().st_size} bytes')
