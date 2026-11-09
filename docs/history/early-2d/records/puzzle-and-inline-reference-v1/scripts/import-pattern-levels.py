"""Archive two user A/B pairs and derive locally composited spot-difference levels.

Run manually with the existing Pillow installation. Normal builds do not need
Python. Original PNG bytes are immutable: a changed delivery needs a new version.
This script does not edit the global asset catalog or the level roadmap.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
from shutil import copy2

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
VERSION = "user-patterns-v001"
SPECS = [
    {
        "id": "patterns-lotus", "delivery": "莲瓣团花", "title": "莲瓣团花：寻找五处变化",
        "registration": [[0.9996581045509337, -0.00028155875322905135, 0.7543974822269067],
                         [0.00028155875322905135, 0.9996581045509337, 0.1867810681842754]],
        "objective": "比较莲瓣团花、卷叶和蓝色格带，寻找五处轮廓与配色变化。",
        "targets": [
            ("outer-flower-center", [125, 30, 207, 109], [165, 74], 8,
             "沿外侧边饰比较每朵花的轮廓。", "看左上角：其中一幅多了清晰的米白花形边线。"),
            ("upper-right-corner", [822, 278, 979, 424], [904, 352], 12,
             "比较内框四角花叶的配色。", "看内框右上角：两处深蓝、深褐色层变成橙红色。"),
            ("lower-left-corner", [283, 737, 532, 972], [389, 855], 12,
             "留意内框左下连成片的卷叶。", "看左下整组卷叶：蓝绿、深蓝改成了橙红、橙黄。"),
            ("right-border-flower", [1080, 763, 1149, 837], [1115, 800], 8,
             "比较右侧蓝色格带的中心装饰。", "看右侧约三分之二高度：复杂套环被简化，米白中心连成一块。"),
            ("right-lower-four-petals", [1078, 935, 1151, 1017], [1114, 976], 8,
             "沿右侧蓝色格带继续向下观察。", "看右侧靠下的小格：复杂花形变成红褐四瓣与米白花心。"),
        ],
    },
    {
        "id": "patterns-scrolls", "delivery": "忍冬卷草", "title": "忍冬卷草：寻找五处变化",
        "registration": [[0.9981141348902367, -0.0007254216220994904, 1.705178236561076],
                         [0.0007254216220994904, 0.9981141348902367, 0.21172518808841356]],
        "objective": "沿卷草构图比较人物、花心与放射花叶，寻找五处变化。",
        "targets": [
            ("upper-left-figure", [271, 273, 425, 425], [375, 381], 12,
             "比较四角人物的头部与手臂。", "看左上人物：头部的红褐色块和手臂姿态不同。"),
            ("central-flower", [570, 568, 681, 680], [625, 623], 10,
             "先观察正中央的黑色花形。", "其中一幅的黑花形里，多了一朵米白小花和红花心。"),
            ("lower-left-flower", [159, 904, 319, 1065], [232, 984], 12,
             "比较左下角放射状花叶。", "看左下：黑叶团变成了带红心的红色太阳状花。"),
            ("lower-right-leaves", [927, 911, 1094, 1084], [1013, 994], 12,
             "比较右下角放射状花叶的颜色。", "看右下：黑色叶团变成了金黄色花叶。"),
            ("upper-red-petal-tip", [588, 402, 667, 488], [625, 433], 8,
             "比较中央上侧红色花瓣的尖端。", "看中央上方、约三分之一高度：红瓣顶端的突出轮廓略有不同，可放大观察。"),
        ],
    },
]


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def archive(source: Path, destination: Path) -> str:
    """Never replace archived original bytes, even when rerunning the importer."""
    if destination.exists():
        if source.exists() and source.read_bytes() != destination.read_bytes():
            raise RuntimeError(f"归档原稿已存在且不同，请建立下一版本：{destination}")
    elif source.exists():
        copy2(source, destination)
    else:
        raise FileNotFoundError(source)
    return sha256(destination.read_bytes()).hexdigest()


def inverse_affine(matrix: list[list[float]]) -> tuple[float, ...]:
    """Pillow expects destination-to-source coefficients, unlike the saved B-to-A matrix."""
    a, b, tx = matrix[0]
    c, d, ty = matrix[1]
    determinant = a * d - b * c
    return (d / determinant, -b / determinant, (b * ty - d * tx) / determinant,
            -c / determinant, a / determinant, (c * tx - a * ty) / determinant)


def inward_mask(size: tuple[int, int], feather: int) -> Image.Image:
    """Smoothstep from zero at the rectangle edge to opaque fully inside it.

    Unlike blurring a full-frame mask, this cannot introduce pixels outside the
    approved hit rectangle. No artwork is painted, enlarged, or reconstructed.
    """
    width, height = size
    values = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            distance = min(x, y, width - 1 - x, height - 1 - y)
            value = min(1, distance / max(1, feather))
            values[y * width + x] = round(255 * value * value * (3 - 2 * value))
    return Image.frombytes("L", size, bytes(values))


def normalized_region(box: list[int], size: tuple[int, int]) -> dict[str, float]:
    x, y, right, bottom = box
    return {"x": x / size[0], "y": y / size[1],
            "width": (right - x) / size[0], "height": (bottom - y) / size[1]}


def main() -> None:
    (ROOT / 'work').mkdir(exist_ok=True)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delivery", type=Path, default=Path("/Users/liujing/Downloads/找不同素材"))
    delivery = parser.parse_args().delivery
    assets = []
    report = []
    for spec in SPECS:
        level_id = spec["id"]
        archive_dir = ROOT / "art-source/levels" / level_id / "v001"
        runtime_dir = ROOT / "public/assets/levels" / level_id
        archive_dir.mkdir(parents=True, exist_ok=True)
        runtime_dir.mkdir(parents=True, exist_ok=True)
        originals = []
        for side in ["A", "B"]:
            filename = f"{spec['delivery']}{side}.png"
            path = archive_dir / filename
            digest = archive(delivery / filename, path)
            originals.append({"filename": filename, "path": str(path.relative_to(ROOT)), "sha256": digest})
        with Image.open(archive_dir / originals[0]["filename"]) as source:
            reference = source.convert("RGB")
        with Image.open(archive_dir / originals[1]["filename"]) as source:
            raw_edit = source.convert("RGB")
        if reference.size != (1254, 1254) or raw_edit.size != reference.size:
            raise RuntimeError(f"{level_id}：原稿尺寸变化，须重新审查目标坐标与配准")
        aligned = raw_edit.transform(reference.size, Image.Transform.AFFINE,
                                     inverse_affine(spec["registration"]), Image.Resampling.BICUBIC)
        composite = reference.copy()
        union = Image.new("L", reference.size)
        target_records = []
        differences = []
        for target_id, box, center, feather, hint, detail_hint in spec["targets"]:
            mask = inward_mask((box[2] - box[0], box[3] - box[1]), feather)
            composite.paste(aligned.crop(box), box[:2], mask)
            union.paste(255, box)
            differences.append({"id": target_id, "region": normalized_region(box, reference.size),
                                "hint": hint, "detailHint": detail_hint})
            target_records.append({"id": target_id, "pixelBox": box, "semanticCenterPixels": center,
                                   "inwardFeatherPixels": feather})
        delta = ImageChops.difference(reference, composite)
        outside = Image.composite(Image.new("RGB", reference.size), delta, union)
        if outside.getbbox() is not None:
            raise RuntimeError(f"{level_id}：配置区域外出现变化")
        for record in target_records:
            crop = delta.crop(record["pixelBox"])
            red, green, blue = crop.split()
            maximum_delta = ImageChops.lighter(ImageChops.lighter(red, green), blue)
            changed = crop.width * crop.height - maximum_delta.histogram()[0]
            if changed == 0:
                raise RuntimeError(f"{level_id}/{record['id']}：目标在合成中消失")
            record["changedPixels"] = changed
        # The subtle scrolls target has an opaque interior, including the small
        # tip. Check the complete local region, rather than a single same-colour pixel.
        if level_id == "patterns-scrolls":
            tip_box = (615, 418, 637, 446)
            if ImageChops.difference(composite.crop(tip_box), aligned.crop(tip_box)).getbbox() is not None:
                raise RuntimeError("忍冬第五处尖端未完整保留")
        for side, image in [("a", reference), ("b", composite)]:
            asset_id = f"{level_id}-{side}"
            filename = f"{asset_id}-v001.png"
            image.save(runtime_dir / filename, optimize=True)
            assets.append({"id": asset_id, "path": f"/assets/levels/{level_id}/{filename}",
                           "width": image.width, "height": image.height, "kind": "level",
                           "placeholder": False, "version": VERSION,
                           "sourceNote": "开发者使用 AI 生成并交付的教学示意，非原壁画照片或历史原貌复原。"
                           + (" A 保持原尺寸与构图。" if side == "a" else " 以 A 为底，仅在五个确认区域合成配准后的 B，内向羽化；区域外像素与 A 完全一致。")})
        level = {"schemaVersion": 1, "id": level_id, "themeId": "patterns", "gameType": "spot-difference",
                 "title": spec["title"], "subtitle": "纹样与色彩 · AI 教学示意", "objective": spec["objective"],
                 "difficulty": "细察", "estimatedMinutes": 5, "thumbnailAssetId": f"{level_id}-a",
                 "baseAssetId": f"{level_id}-a", "editedAssetId": f"{level_id}-b",
                 "teachingNote": "本关由开发者使用 AI 生成，用于观察纹样的形状、组织与配色；不是原壁画照片或历史原貌复原。",
                 "source": {"title": "敦煌研究院文化资料（延伸阅读）", "url": "https://www.dha.ac.cn/",
                            "note": "本关为敦煌装饰纹样启发的 AI 教学示意，不声称准确对应某一洞窟、年代或历史配色。"},
                 "differences": differences}
        write_json(ROOT / "src/content/levels" / f"{level_id}.json", level)
        notes = {"version": VERSION, "receivedOn": "2026-10-28", "creator": "开发者", "originals": originals,
                 "sourceSize": list(reference.size), "runtimeSize": list(reference.size),
                 "cultureStatus": "AI 教学示意；用户未提供对应具体洞窟的原始图源，不添加洞窟归属或历史配色断言。",
                 "processing": "保留原稿字节与原尺寸。使用已审查的 B→A 相似变换配准，双三次重采样；以 A 为底，仅在五个确认矩形内合入 B。蒙版从矩形边缘零透明度向内以 smoothstep 增至不透明，羽化不越出区域；未裁切画幅、强拉比例、生成、修复或重画美术内容。",
                 "registrationBToA": spec["registration"], "targets": target_records,
                 "outsideRegionChangedPixels": 0,
                 "fifthTargetNote": "中央上侧红瓣尖端在两图中都存在，B突出轮廓略有不同；变化较细，建议放大观察。" if level_id == "patterns-scrolls" else None}
        write_json(archive_dir / "source-notes.json", notes)
        report.append({"id": level_id, "size": list(reference.size), "targets": target_records,
                       "outsideRegionChangedPixels": 0})
        print(f"{level_id}: {reference.width}×{reference.height}, 5处差异, 区域外0变化")
    write_json(ROOT / "work/new-spot-assets.json", assets)
    write_json(ROOT / "work/new-spot-validation.json", report)


if __name__ == "__main__":
    main()
