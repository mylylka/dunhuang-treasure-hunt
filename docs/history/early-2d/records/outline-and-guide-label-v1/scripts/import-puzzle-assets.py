"""Archive the three delivered puzzle JPGs and create lossless runtime PNGs.

Requires the existing Pillow installation, not a game dependency. Originals are
immutable; no crop, watermark removal, colour correction or artwork generation
is performed. Missing delivery files fall back to the formal source archives.
The asset manifest is emitted for review; this script never edits assets.json.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageChops, ImageOps


ROOT = Path(__file__).resolve().parents[1]
VERSION = "user-puzzle-v001"
SOURCE_REFERENCE = {
    "title": "常书鸿代序：敦煌图案的装饰部位与用途",
    "url": "https://www.tup.tsinghua.edu.cn/booksCenter/bookpreface?id=00894801",
    "note": "可从中心、边带和重复排列观察装饰图案。本关图像由开发者提供，具体洞窟、年代与原作者尚未据交付资料确认。",
}
SPECS = [
    {
        "id": "puzzle-lotus-ceiling", "filename": "保持莲花平棋.JPG",
        "title": "莲花平棋", "mode": "rotation", "rows": 3, "columns": 3,
        "seed": 254329, "difficulty": "入门", "minutes": 4,
        "objective": "点击图块使其顺时针旋转90°，将九块图像恢复为参考图的朝向。",
        "source": SOURCE_REFERENCE,
    },
    {
        "id": "puzzle-three-rabbits", "filename": "三兔飞天藻井.JPG",
        "title": "三兔飞天", "mode": "jigsaw", "rows": 3, "columns": 4,
        "seed": 407012, "difficulty": "进阶", "minutes": 6,
        "objective": "观察三兔、环绕人物与边带，把十二片不规则图块放回正确位置。",
        "source": {
            "title": "敦煌研究院：莫高窟第407窟三兔共耳构图参考",
            "url": "https://www.dha.ac.cn/info/1425/3569.htm",
            "note": "第407窟资料可用于延伸观察三兔共耳与围绕中心的组织方式；本关图像由开发者提供，不能据此链接认定交付图的洞窟、年代或作者。",
        },
    },
    {
        "id": "puzzle-twin-dragons", "filename": "双龙藻井.JPG",
        "title": "双龙藻井", "mode": "jigsaw", "rows": 4, "columns": 5,
        "seed": 202920, "difficulty": "挑战", "minutes": 9,
        "objective": "比较双龙、中心花形与层层边饰，把二十片不规则图块放回原图。",
        "source": SOURCE_REFERENCE,
    },
]


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def preserve_original(delivery: Path, target: Path) -> bytes:
    """Keep archived original bytes; a changed delivery requires another version."""
    if target.exists():
        data = target.read_bytes()
        if delivery.exists() and delivery.read_bytes() != data:
            raise RuntimeError(f"原稿与已有归档不同，请建立新版本，不覆盖：{target}")
        return data
    if not delivery.exists():
        raise FileNotFoundError(f"交付文件和正式归档都不存在：{delivery}")
    copy2(delivery, target)
    return target.read_bytes()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delivery", type=Path, default=Path.home() / "Downloads/小红书藻井")
    delivery = parser.parse_args().delivery
    work = ROOT / "work"
    work.mkdir(exist_ok=True)
    assets, report = [], []
    for spec in SPECS:
        level_id = spec["id"]
        archive = ROOT / "art-source/levels" / level_id / "v001"
        runtime = ROOT / "public/assets/levels" / level_id
        archive.mkdir(parents=True, exist_ok=True)
        runtime.mkdir(parents=True, exist_ok=True)
        original_path = archive / spec["filename"]
        original_bytes = preserve_original(delivery / spec["filename"], original_path)
        with Image.open(BytesIO(original_bytes)) as original:
            original_dimensions = original.size
            original_mode = original.mode
            orientation = original.getexif().get(274, 1)
            decoded = ImageOps.exif_transpose(original).convert("RGB")
        width, height = decoded.size
        target = runtime / f"{level_id}-image-v001.png"
        decoded.save(target, format="PNG", optimize=True)
        with Image.open(target) as saved:
            difference_box = ImageChops.difference(decoded, saved.convert("RGB")).getbbox()
        if difference_box is not None:
            raise RuntimeError(f"{level_id}：运行PNG与校正方向后的原图像素不同")
        asset_id = f"{level_id}-image"
        runtime_path = "/" + target.relative_to(ROOT / "public").as_posix()
        assets.append({
            "id": asset_id, "path": runtime_path, "width": width, "height": height,
            "kind": "level", "placeholder": False, "version": VERSION,
            "sourceNote": f"开发者交付的拼图参考JPG，完整保留构图和原有小红书水印；仅按EXIF方向转换RGB PNG。出处及处理见art-source/levels/{level_id}/v001/source-notes.json。",
        })
        count = spec["rows"] * spec["columns"]
        level = {
            "schemaVersion": 1, "id": level_id, "themeId": "patterns", "gameType": "puzzle",
            "title": spec["title"],
            "subtitle": f"纹样与色彩 · {'旋转拼图' if spec['mode'] == 'rotation' else str(count) + '片不规则拼图'}",
            "objective": spec["objective"], "difficulty": spec["difficulty"],
            "estimatedMinutes": spec["minutes"], "thumbnailAssetId": asset_id,
            "imageAssetId": asset_id, "mode": spec["mode"],
            "rows": spec["rows"], "columns": spec["columns"], "seed": spec["seed"],
            "teachingNote": "图像由开发者提供，保留原有来源水印。程序仅进行图块旋转或拼片处理，不代表文物修复或历史原貌复原。",
            "source": spec["source"],
        }
        # This importer reconstructs the original v001 delivery, not subsequent
        # editorial choices or retouched runtime versions already in the project.
        level_path = ROOT / "src/content/levels" / f"{level_id}.json"
        if not level_path.exists():
            write_json(level_path, level)
        original_sha = sha256(original_bytes).hexdigest()
        runtime_sha = sha256(target.read_bytes()).hexdigest()
        record = {
            "version": 1, "levelId": level_id,
            "originalFilename": spec["filename"],
            "originalArchive": original_path.relative_to(ROOT).as_posix(),
            "originalSha256": original_sha, "originalDimensions": list(original_dimensions),
            "originalMode": original_mode, "exifOrientation": orientation,
            "runtimePath": runtime_path, "runtimeDimensions": [width, height],
            "runtimeSha256": runtime_sha, "decodedRgbSha256": sha256(decoded.tobytes()).hexdigest(),
            "runtimePixelsEqualExifOrientedOriginal": difference_box is None,
            "watermark": {
                "present": True, "platform": "小红书",
                "description": "三张原图右下角均有平台标识和账号字样，原样保留；不是开发者署名。",
                "reviewRegionNormalized": {"x": 0.72, "y": 0.89, "width": 0.28, "height": 0.11},
                "removedOrCropped": False,
            },
            "provenance": "开发者本机交付的JPG；原贴链接、摄影或临摹作者、具体洞窟和年代未随本批材料提供。文件名用于资源映射，不作为学术认定。",
            "processing": "原JPG字节完整归档；按EXIF方向读取并转RGB PNG，不裁切、不缩放、不调色、不去水印，不使用AI或绘图工具重画。拼片由运行时代码裁切蒙版生成，不另存内容性改图。",
            "puzzle": {"mode": spec["mode"], "rows": spec["rows"], "columns": spec["columns"], "pieceCount": count, "seed": spec["seed"]},
            "relatedCultureReference": spec["source"],
        }
        write_json(archive / "source-notes.json", record)
        report.append({
            "id": level_id, "dimensions": [width, height], "mode": spec["mode"],
            "pieceCount": count, "watermarkPreserved": True,
            "originalSha256": original_sha, "runtimeSha256": runtime_sha,
            "runtimePixelsEqualOriginal": True,
        })
    write_json(work / "new-puzzle-assets.json", assets)
    write_json(work / "puzzle-assets-validation.json", report)
    for item in report:
        print(f"{item['id']}: {item['dimensions'][0]}×{item['dimensions'][1]}, {item['mode']}, {item['pieceCount']} pieces, unchanged RGB pixels")


if __name__ == "__main__":
    main()
