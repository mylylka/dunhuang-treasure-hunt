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

from PIL import Image, ImageChops, ImageFilter

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
            ("upper-red-petal-tip", [440, 328, 814, 500], [516, 353], 8,
             "比较中央一圈红色花瓣的轮廓。", "参照图 A 的红瓣外缘带小尖角，变化图 B 是圆润的弧形；上、下、左、右任一红瓣均可点击。"),
        ],
        "petalAdditionalBoxes": [[336, 440, 490, 812], [760, 440, 920, 812], [440, 752, 814, 910]],
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


def red_petal_components(image: Image.Image) -> tuple[Image.Image, list[list[int]]]:
    """Find the eight large red petals in the delivered pixels, without painting art.

    Small neighbouring red flourishes are deliberately excluded. The returned
    support is used only to select existing B pixels for the local composite.
    """
    left, top, right, bottom = 320, 320, 930, 930
    width, height = right - left, bottom - top
    pixels = image.load()
    candidates = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x + left, y + top]
            radius2 = (x + left - 625) ** 2 + (y + top - 624) ** 2
            candidates[y * width + x] = int(200 ** 2 <= radius2 <= 310 ** 2
                                             and r > 80 and r > g * 1.25 and r > b * 1.3)
    components = []
    for start in range(len(candidates)):
        if not candidates[start]:
            continue
        candidates[start] = 0
        stack, component = [start], []
        while stack:
            index = stack.pop()
            component.append(index)
            x, y = index % width, index // width
            for nx, ny in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]:
                neighbour = ny * width + nx
                if 0 <= nx < width and 0 <= ny < height and candidates[neighbour]:
                    candidates[neighbour] = 0
                    stack.append(neighbour)
        if len(component) > 4000:
            components.append(component)
    if len(components) != 8:
        raise RuntimeError(f"忍冬红瓣识别应为8瓣，实际{len(components)}；须重新复核原图")
    support = Image.new("L", image.size)
    output = support.load()
    tips = []
    for component in components:
        points = [(index % width + left, index // width + top) for index in component]
        for point in points:
            output[point] = 255
        tips.append(list(max(points, key=lambda p: (p[0] - 625) ** 2 + (p[1] - 624) ** 2)))
    return support, tips


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
        ring_mask, petal_samples = None, []
        if level_id == "patterns-scrolls":
            a_petals, petal_samples = red_petal_components(reference)
            b_petals, _ = red_petal_components(aligned)
            # Include the original A tips so they are completely replaced by
            # B's rounded edge and its existing surrounding background.
            ring_mask = ImageChops.lighter(a_petals, b_petals).filter(ImageFilter.MaxFilter(19)).filter(ImageFilter.GaussianBlur(2))
            # The cream/black radial strokes belong to the same petals. Keep
            # their whole band opaque; fading across individual strokes would
            # produce doubled edges after the small source registration drift.
            band = Image.new("L", reference.size)
            band_pixels = band.load()
            for y in range(320, 930):
                for x in range(320, 930):
                    radius = ((x - 625) ** 2 + (y - 624) ** 2) ** .5
                    value = min(1, max(0, (radius - 174) / 12), max(0, (250 - radius) / 12))
                    band_pixels[x, y] = round(255 * value * value * (3 - 2 * value))
            ring_mask = ImageChops.lighter(ring_mask, band)
        for target_id, box, center, feather, hint, detail_hint in spec["targets"]:
            additional = spec.get("petalAdditionalBoxes", []) if target_id == "upper-red-petal-tip" else []
            local_mask = Image.new("L", reference.size)
            for area in [box, *additional]:
                rectangle_mask = Image.new("L", reference.size)
                rectangle_mask.paste(inward_mask((area[2] - area[0], area[3] - area[1]), feather), area[:2])
                local_mask = ImageChops.lighter(local_mask, rectangle_mask)
                union.paste(255, area)
            if additional:
                local_mask = ImageChops.darker(local_mask, ring_mask)
                ring_mask = local_mask
            composite.paste(aligned, (0, 0), local_mask)
            difference = {"id": target_id, "region": normalized_region(box, reference.size),
                          "hint": hint, "detailHint": detail_hint}
            record = {"id": target_id, "pixelBox": box, "semanticCenterPixels": center,
                      "inwardFeatherPixels": feather}
            if additional:
                difference["additionalRegions"] = [normalized_region(area, reference.size) for area in additional]
                record["additionalPixelBoxes"] = additional
            differences.append(difference)
            target_records.append(record)
        delta = ImageChops.difference(reference, composite)
        outside = Image.composite(Image.new("RGB", reference.size), delta, union)
        if outside.getbbox() is not None:
            raise RuntimeError(f"{level_id}：配置区域外出现变化")
        for record in target_records:
            target_mask = Image.new("L", reference.size)
            for area in [record["pixelBox"], *record.get("additionalPixelBoxes", [])]:
                target_mask.paste(255, area)
            crop = Image.composite(delta, Image.new("RGB", reference.size), target_mask)
            red, green, blue = crop.split()
            maximum_delta = ImageChops.lighter(ImageChops.lighter(red, green), blue)
            changed = crop.width * crop.height - maximum_delta.histogram()[0]
            if changed == 0:
                raise RuntimeError(f"{level_id}/{record['id']}：目标在合成中消失")
            record["changedPixels"] = changed
        if level_id == "patterns-scrolls":
            for x, y in petal_samples:
                sample = (x - 2, y - 2, x + 3, y + 3)
                if ImageChops.difference(composite.crop(sample), aligned.crop(sample)).getbbox() is not None:
                    raise RuntimeError(f"忍冬红瓣原尖角({x},{y})未完整采用B的圆润轮廓")
            previous = Image.open(runtime_dir / "patterns-scrolls-b-v001.png").convert("RGB")
            fifth_mask = Image.new("L", reference.size)
            for area in [target_records[-1]["pixelBox"], *spec["petalAdditionalBoxes"]]:
                fifth_mask.paste(255, area)
            untouched = Image.composite(Image.new("RGB", reference.size), ImageChops.difference(previous, composite), fifth_mask)
            if untouched.getbbox() is not None:
                raise RuntimeError("忍冬红瓣以外的原有四处差异发生了变化")
        for side, image in [("a", reference), ("b", composite)]:
            asset_id = f"{level_id}-{side}"
            corrected = level_id == "patterns-scrolls" and side == "b"
            filename = f"{asset_id}-{'v002' if corrected else 'v001'}.png"
            image.save(runtime_dir / filename, optimize=True)
            assets.append({"id": asset_id, "path": f"/assets/levels/{level_id}/{filename}",
                           "width": image.width, "height": image.height, "kind": "level",
                           "placeholder": False, "version": "user-patterns-v002" if corrected else VERSION,
                           "sourceNote": "开发者使用 AI 生成并交付的教学示意，非原壁画照片或历史原貌复原。"
                           + (" A 保持原尺寸与构图。" if side == "a" else
                              " 以 A 为底，原四处差异保持；第五处采用原B的整圈圆润红瓣，8个原尖角均已替换。仅合成登记区域，区域外与A完全一致。" if corrected else
                              " 以 A 为底，仅在五个确认区域合成配准后的 B，内向羽化；区域外像素与 A 完全一致。")})
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
                 "fifthTargetNote": "原A整圈红瓣带尖角，原B为圆润弧形。第五处主区域及三个关联区域共同对应这一圈，只计一次。" if level_id == "patterns-scrolls" else None}
        notes_dir = archive_dir
        if level_id == "patterns-scrolls":
            notes_dir = archive_dir.parent / "v002"
            notes_dir.mkdir(exist_ok=True)
            ring_mask.save(notes_dir / "red-petal-ring-mask.png", optimize=True)
            notes.update({"version": "user-patterns-v002", "correctedOn": "2026-10-29",
                          "processing": "从v001归档原A/B重新配准。保留前四处局部合成；第五处识别原A/B的8个大红瓣连通分量（中心距200～310像素内、RGB红色阈值、分量>4000像素），合并支撑蒙版，外扩9像素并以2像素高斯过渡；同心环带174～250像素、内外各12像素过渡，保证花瓣内黑白放射纹采用同一原B而不重影。限制在四个登记区域内。仅复制原B像素，未生成或重画内容；A和v001运行图保留。",
                          "petalMask": "art-source/levels/patterns-scrolls/v002/red-petal-ring-mask.png",
                          "originalTipSamples": petal_samples, "tipSamplePatchSize": [5, 5],
                          "checks": {"allEightTipPatchesMatchAlignedB": True, "outsideFifthTargetMatchesPreviousRuntime": True,
                                     "firstFourDifferencesUnchanged": True, "outsideRegionChangedPixels": 0}})
        write_json(notes_dir / "source-notes.json", notes)
        report.append({"id": level_id, "size": list(reference.size), "targets": target_records,
                       "outsideRegionChangedPixels": 0})
        print(f"{level_id}: {reference.width}×{reference.height}, 5处差异, 区域外0变化")
    write_json(ROOT / "work/new-spot-assets.json", assets)
    write_json(ROOT / "work/new-spot-validation.json", report)


if __name__ == "__main__":
    main()
