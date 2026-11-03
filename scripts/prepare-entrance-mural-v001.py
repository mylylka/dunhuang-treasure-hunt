"""Archive the authorized wall edit and crop its auxiliary padding, without resampling."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/liujing/Downloads/敦煌/3d视觉素材库/复古对称莲花壁画装饰.png')
CANDIDATE = Path('/Users/liujing/.codex/generated_images/01a19a71-f619-7c11-89ed-033bcd94ce36/exec-5fb52e97-8831-4cb0-ac05-7e13ed2bb25f.png')
ARCHIVE = ROOT / 'art-source/world/courtyard-decoration/v001'
OUTPUT = ROOT / 'public/assets/world/courtyard/v005'
ARCHIVE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
shutil.copy2(SOURCE, ARCHIVE / SOURCE.name)
shutil.copy2(CANDIDATE, ARCHIVE / 'entrance-lotus-generated.png')
image = Image.open(CANDIDATE).convert('RGB')
assert image.size == (2172, 724)
# The generator's gray padding is not part of the art. Trim the padding and
# outer edges of the wide painted border; all main lotus/scroll forms remain.
crop = (0, 165, 2172, 562)
runtime = OUTPUT / 'entrance-lotus-wide.jpg'
image.crop(crop).save(runtime, quality=95, subsampling=0)
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
record = {
    'version': 'v001', 'generator': 'built-in image_gen, reference-image edit',
    'scope': 'Explicit user-authorized expansion for the two exterior entrance wing walls only',
    'original': SOURCE.name, 'originalSha256': sha(SOURCE),
    'candidate': 'entrance-lotus-generated.png', 'candidateSha256': sha(CANDIDATE),
    'prompt': 'entrance-mural-prompt.txt', 'nativePixels': list(image.size),
    'cropBox': list(crop), 'runtimePixels': [2172, 397],
    'runtime': str(runtime.relative_to(ROOT)), 'runtimeSha256': sha(runtime),
    'physicalWidth': 8.2, 'physicalHeight': 8.2 * 397 / 2172,
    'wallOpening': {'unobstructedWidth': 8.3, 'clearHeight': 1.54, 'centerY': 1.475},
    'processing': 'Crop generated neutral padding and outer painted border edges; main lotus and lateral foliage retained. Native pixels, no resize, stretch, sharpening or repaint. RGB JPEG95. No historical reconstruction claim.',
}
(ARCHIVE / 'source-manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(record, ensure_ascii=False))
