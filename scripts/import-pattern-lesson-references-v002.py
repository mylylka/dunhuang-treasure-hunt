"""Import independently published clean photos; never erase a source watermark."""
from __future__ import annotations

from datetime import date
from pathlib import Path

from PIL import Image

from asset_intake import AssetIntake, image_size, read_json, write_json

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "art-source/references/patterns/v002"
RUNTIME = ROOT / "public/assets/lessons/patterns"

REFERENCES = [
    {
        "original": "1664329985689334.png", "workFile": "329-cnacs.png",
        "imageUrl": "https://cmsfiles.zhongkefu.com.cn/gongyimeishu/upload/gyms/ariticle/ueditor/20220928/1664329985689334.png",
        "pageUrl": "https://www.cnacs.net.cn/18/202209/4028.html",
        "publisher": "中国工艺美术学会刊载；吴健摄影，敦煌研究院供图",
        "cave": 329, "period": "初唐", "location": "窟顶飞天莲花藻井及周边",
        "verification": "原文图注明确窟号、摄影与供图机构；与第329窟官方介绍及原数字敦煌井心逐一比对中心莲花、四角团花与四身飞天；下载原文件本身无叠加水印。",
        "exports": [
            {"id": "lesson-329-ceiling"},
            {"id": "lesson-329-center", "crop": [310, 320, 730, 735]},
        ],
    },
    {
        "original": "2832894e51f9427bb5ab288fe0028db4.png", "workFile": "407-sohu-agency.png",
        "imageUrl": "https://p3.itc.cn/images01/20200930/2832894e51f9427bb5ab288fe0028db4.png",
        "pageUrl": "https://www.sohu.com/a/421884090_120116137",
        "publisher": "莫高窟参观预约网发布；《敦煌研究》编辑部，摄影敦煌研究院文物数字化研究所",
        "cave": 407, "period": "隋", "location": "三兔莲花飞天藻井与菱格莲花边带",
        "verification": "原文图注与摄影署名明确；敦煌研究院第407窟页面交叉证实井心四周多层菱格莲花纹；照片构图与同窟三兔、八飞天、莲瓣及垂幔边带对应。下载原文件本身无叠加水印。",
        "knowledgeUrl": "https://www.dha.ac.cn/info/1425/3569.htm",
        "exports": [{"id": "lesson-407-borders"}],
    },
]


def main() -> None:
    intake = AssetIntake(ROOT)
    with intake.transaction():
        import_references(intake)


def encode_png(source: Path, destination: Path, crop: list[int] | None) -> None:
    with Image.open(source) as image:
        if crop:
            image = image.crop(tuple(crop))
        image.convert('RGB').save(destination, 'PNG', optimize=True)


def import_references(intake: AssetIntake) -> None:
    assets_path = ROOT / "src/content/assets.json"
    notes_path = ARCHIVE / 'source-notes.json'
    previous_assets = read_json(assets_path)
    assets = list(previous_assets)
    previous_notes = read_json(notes_path, {})
    notes = {row['originalFilename']: row for row in previous_notes.get('references', [])}
    for ref in REFERENCES:
        old = notes.get(ref['original'], {})
        archived = ARCHIVE / ref["original"]
        work_file = ROOT / "work" / ref["workFile"]
        original = intake.original(old.get('originalPath', str(archived.relative_to(ROOT))),
                                   expected=old.get('sha256'), local=work_file, url=ref['imageUrl'])
        original_width, original_height = (old['width'], old['height']) if old else image_size(original.path)
        exports = {row['id']: row for row in old.get('exports', [])}
        for export in ref["exports"]:
            prior = exports.get(export['id'], {})
            crop = export.get("crop")
            runtime = RUNTIME / f"{export['id']}-v002.png"
            runtime_path = f'/assets/lessons/patterns/{runtime.name}'
            if prior and (prior['path'] != runtime_path or prior['cropBox'] != crop):
                raise ValueError(f'Existing export definition differs; use a new version: {runtime}')
            result = intake.derive(original, runtime, 'PNG', {'mode': 'RGB', 'optimize': True, 'crop': crop},
                                   lambda source, destination: encode_png(source, destination, crop),
                                   prior=prior.get('derivation'),
                                   legacy_size=(prior['width'], prior['height']) if prior else None)
            width, height = result.size
            processing = f"仅技术裁切井心，原像素矩形{crop}，未放大或重采样。" if crop else "完整保留下载图像；仅转PNG，不放大或重采样。"
            processing += "原下载图本身无叠加水印，未擦除、遮挡或裁掉水印，未调色、补画或AI修复。"
            source_note = f"真实教学参考图。{ref['publisher']}。{ref['verification']} {processing} 原件与来源登记见art-source/references/patterns/v002/source-notes.json。"
            item = {"id": export["id"], "path": runtime_path, "width": width, "height": height, "kind": "teaching", "placeholder": False, "version": "reference-v002", "sourceNote": source_note}
            index = next((i for i, a in enumerate(assets) if a["id"] == export["id"]), None)
            if index is None:
                assets.append(item)
            elif assets[index].get("version", "") < item["version"]:
                assets[index] = item
            elif assets[index].get('version') == item['version'] and any(
                    assets[index].get(key) != item[key] for key in ('path', 'width', 'height')):
                raise RuntimeError(f"Asset already registered differently: {export['id']}")
            if not prior:
                exports[export['id']] = {**item, "cropBox": crop, "processing": processing, "derivation": result.provenance()}
            print(f"{export['id']}: {width}×{height}")
        entry = old or {k: v for k, v in ref.items() if k not in ("workFile", "exports")}
        notes[ref['original']] = {"retrievedOn": date.today().isoformat(), "rights": "保留原摄影、供图与发布署名；未声称开放授权。", **entry, "originalPath": original.reference, "originalFilename": ref["original"], "width": original_width, "height": original_height, "sha256": original.sha256, "exports": list(exports.values())}
    write_json(notes_path, {"version": 2, "purpose": "使用独立公开发布的无叠加水印实物照片替换；v001原件和运行图保留", "remainingGaps": ["第257窟残存平棋同一细节的高质量无水印实物原图尚未找到；目前教学改用已核验的第254窟忍冬与第407窟菱格实例，不混写窟号。", "用户忍冬整理图的原出版出处、具体窟号、年代及干净原图待补，保留原文件与知乎署名水印。", "用户第254窟平棋图原图片出版出处、三兔补充拼版原出处待补。"], **previous_notes, "references": list(notes.values())}, existing=previous_notes)
    write_json(assets_path, assets, existing=previous_assets)


if __name__ == "__main__":
    main()
