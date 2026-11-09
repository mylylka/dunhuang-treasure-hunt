"""Import independently published clean photos; never erase a source watermark."""
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

from PIL import Image

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
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    assets_path = ROOT / "src/content/assets.json"
    assets = json.loads(assets_path.read_text())
    for asset in assets:
        if "sourceNote" in asset:
            asset["sourceNote"] = asset["sourceNote"].replace("婧婧", "开发者")
    notes = []
    for ref in REFERENCES:
        archived = ARCHIVE / ref["original"]
        work_file = ROOT / "work" / ref["workFile"]
        if archived.exists():
            data = archived.read_bytes()
            if work_file.exists() and work_file.read_bytes() != data:
                raise RuntimeError(f"Changed archived original; use a new version: {archived}")
        elif work_file.exists():
            data = work_file.read_bytes()
            archived.write_bytes(data)
        else:
            data = urllib.request.urlopen(ref["imageUrl"], timeout=40).read()
            archived.write_bytes(data)
        with Image.open(archived) as source:
            source.load()
            original_width, original_height = source.size
            exports = []
            for export in ref["exports"]:
                crop = export.get("crop")
                image = source.crop(tuple(crop)) if crop else source.copy()
                runtime = RUNTIME / f"{export['id']}-v002.png"
                image.convert("RGB").save(runtime, optimize=True)
                width, height = image.size
                processing = f"仅技术裁切井心，原像素矩形{crop}，未放大或重采样。" if crop else "完整保留下载图像；仅转PNG，不放大或重采样。"
                processing += "原下载图本身无叠加水印，未擦除、遮挡或裁掉水印，未调色、补画或AI修复。"
                source_note = f"真实教学参考图。{ref['publisher']}。{ref['verification']} {processing} 原件与来源登记见art-source/references/patterns/v002/source-notes.json。"
                item = {"id": export["id"], "path": f"/assets/lessons/patterns/{runtime.name}", "width": width, "height": height, "kind": "teaching", "placeholder": False, "version": "reference-v002", "sourceNote": source_note}
                index = next((i for i, a in enumerate(assets) if a["id"] == export["id"]), None)
                if index is None:
                    assets.append(item)
                elif assets[index].get("version", "") <= item["version"]:
                    assets[index] = item
                exports.append({**item, "cropBox": crop, "processing": processing})
                print(f"{export['id']}: {width}×{height}")
        entry = {k: v for k, v in ref.items() if k not in ("workFile", "exports")}
        entry.update({"originalPath": str(archived.relative_to(ROOT)), "originalFilename": ref["original"], "width": original_width, "height": original_height, "sha256": hashlib.sha256(data).hexdigest(), "retrievedOn": "2026-10-28", "exports": exports, "rights": "保留原摄影、供图与发布署名；未声称开放授权。"})
        notes.append(entry)
    (ARCHIVE / "source-notes.json").write_text(json.dumps({"version": 2, "purpose": "使用独立公开发布的无叠加水印实物照片替换；v001原件和运行图保留", "references": notes, "remainingGaps": ["第257窟残存平棋同一细节的高质量无水印实物原图尚未找到；目前教学改用已核验的第254窟忍冬与第407窟菱格实例，不混写窟号。", "用户忍冬整理图的原出版出处、具体窟号、年代及干净原图待补，保留原文件与知乎署名水印。", "用户第254窟平棋图原图片出版出处、三兔补充拼版原出处仍待补。"]}, ensure_ascii=False, indent=2) + "\n")
    assets_path.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
