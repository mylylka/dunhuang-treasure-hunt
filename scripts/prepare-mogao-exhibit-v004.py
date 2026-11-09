"""Create the wall-theme marker from the project's existing lotus artwork."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/assets/shared/hidden-object/v002/plants-001.png"
PUBLIC = ROOT / "public/assets/world/mogao-exhibit/v004"
ARCHIVE = ROOT / "art-source/world/mogao-exhibit/v004"

PUBLIC.mkdir(parents=True, exist_ok=True)
ARCHIVE.mkdir(parents=True, exist_ok=True)
with Image.open(SOURCE) as original:
    image = original.convert("RGBA")
image.thumbnail((320, 320), Image.Resampling.LANCZOS)
image.save(PUBLIC / "wall-lotus.webp", lossless=True, method=6)
manifest = {
    "source": str(SOURCE.relative_to(ROOT)),
    "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "runtime": "mogao-exhibit/v004/wall-lotus.webp",
    "method": "等比缩放并无损编码，沿用原金边莲花",
}
(ARCHIVE / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
