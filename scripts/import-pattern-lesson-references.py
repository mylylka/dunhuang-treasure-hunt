"""Archive approved teaching references and produce lossless runtime PNGs.

No upscaling, recolouring, watermark removal or content reconstruction is used.
Existing archived originals are immutable: a changed source requires a new version.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from PIL import Image

from asset_intake import AssetIntake, read_json, write_json

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "art-source/references/patterns/v001"
RUNTIME = ROOT / "public/assets/lessons/patterns"

REFERENCES = [
    {"id": "lesson-329-ceiling", "file": "reference-review-329.png", "original": "BC9551B953CCEDCA3CD64D3FA9F_9170A011_D3075.png", "imageUrl": "https://www.dha.ac.cn/__local/7/82/E0/BC9551B953CCEDCA3CD64D3FA9F_9170A011_D3075.png", "pageUrl": "https://www.dha.ac.cn/info/1425/3577.htm", "publisher": "敦煌研究院", "cave": 329, "period": "初唐", "location": "主室窟顶藻井及四披", "verification": "官方页面图片与说明已核验"},
    {"id": "lesson-329-center", "file": "digital-329-ceiling.jpg", "original": "0329-0001-0009-preview.jpg", "imageUrl": "https://cdn.e-dunhuang.com/SOURCES/10.0001/0001/0001/0329/0001/0009/01/1/index.tiles/preview.jpg", "pageUrl": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0329", "publisher": "敦煌研究院·数字敦煌", "cave": 329, "period": "初唐", "location": "主室藻井井心", "verification": "官方公开预览；保留水印，未获取需登录的高清瓦片"},
    {"id": "lesson-329-interior", "file": "reference-review-329-interior.png", "original": "BE397C918FCC27E02ED294CD7A8_66ECC9EC_1C8BF5.png", "imageUrl": "https://www.dha.ac.cn/__local/1/47/8E/BE397C918FCC27E02ED294CD7A8_66ECC9EC_1C8BF5.png", "pageUrl": "https://www.dha.ac.cn/info/1425/3577.htm", "publisher": "敦煌研究院", "cave": 329, "period": "初唐", "location": "西壁佛龛龛顶及窟顶藻井", "verification": "官方页面图片与图注已核验"},
    {"id": "lesson-257-ceiling", "file": "digital-257-0017.jpg", "original": "0257-0001-0013-0017-preview.jpg", "imageUrl": "https://cdn.e-dunhuang.com/SOURCES/10.0001/0001/0001/0257/0001/0013/0017/01/1/index.tiles/preview.jpg", "pageUrl": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0257", "publisher": "敦煌研究院·数字敦煌", "cave": 257, "period": "北魏", "location": "主室后部平棋残存图案，北向公开预览", "verification": "官方平棋页面及公开预览；保留原有黑色缺图区域和水印"},
    {"id": "lesson-401-ceiling", "file": "reference-review-401.png", "original": "4EB1B7CEE2F2D679E4D60DD8FD9_9ADEBA06_1B8B64.png", "imageUrl": "https://www.dha.ac.cn/__local/9/E6/AC/4EB1B7CEE2F2D679E4D60DD8FD9_9ADEBA06_1B8B64.png", "pageUrl": "https://www.dha.ac.cn/info/1425/3601.htm", "publisher": "敦煌研究院", "cave": 401, "period": "隋", "location": "莲花飞天藻井及禽鸟联珠纹边带", "verification": "官方页面图片与说明已核验"},
    {"id": "lesson-407-rabbits", "file": "1129308686_16744413016341n.png", "original": "1129308686_16744413016341n.png", "imageUrl": "https://www.xinhuanet.com/2023-01/23/1129308686_16744413016341n.png", "pageUrl": "https://www.xinhuanet.com/2023-01/23/c_1129308686.htm", "publisher": "新华社；敦煌研究院供图", "cave": 407, "period": "隋", "location": "三兔莲花飞天藻井井心局部", "verification": "新华社原文图注与文末供图署名核验；敦煌研究院第407窟说明交叉核验"},
    {"id": "lesson-201-ceiling", "file": "reference-review-201.png", "original": "E4ECDF33EEA0286B62901B47C0C_ED5C5B1A_51D37.png", "imageUrl": "https://www.dha.ac.cn/__local/3/EB/CA/E4ECDF33EEA0286B62901B47C0C_ED5C5B1A_51D37.png", "pageUrl": "https://www.dha.ac.cn/info/1425/3581.htm", "publisher": "敦煌研究院", "cave": 201, "period": "中唐", "location": "石榴茶花纹藻井", "verification": "官方页面图片与说明已核验；原图仅450×304，不用于细节辨认测验"},
    {"id": "lesson-254-ceiling", "file": "digital-254-ceiling.jpg", "original": "0254-0001-0013-0031-preview.jpg", "imageUrl": "https://cdn.e-dunhuang.com/SOURCES/10.0001/0001/0001/0254/0001/0013/0031/01/1/index.tiles/preview.jpg", "pageUrl": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0254", "publisher": "敦煌研究院·数字敦煌", "cave": 254, "period": "北魏", "location": "主室后部平棋顶", "verification": "官方页面与公开预览核验；中央黑区是塔柱占位，保留原水印"},
    {"id": "lesson-254-niche", "file": "reference-review-254-niche.png", "original": "71DE933BB20B8C928521953E115_8B7361C4_930A7.png", "imageUrl": "https://www.dha.ac.cn/__local/F/90/C5/71DE933BB20B8C928521953E115_8B7361C4_930A7.png", "pageUrl": "https://www.dha.ac.cn/info/1425/3685.htm", "publisher": "敦煌研究院", "cave": 254, "period": "北魏", "location": "主室南壁前部阙形龛", "verification": "官方页面图片及数字敦煌南壁龛楣忍冬说明核验"},
    {"id": "lesson-user-254-ceiling", "userFile": "/Users/liujing/Downloads/莫高窟第254号窟平顶.png", "original": "莫高窟第254号窟平顶.png", "pageUrl": "https://www.e-dunhuang.com/cave/10.0001/0001.0001.0254", "publisher": "婧婧提供；原图片出版来源待补", "cave": 254, "period": "北魏", "location": "平棋局部（用户标注）", "verification": "平棋结构、莲花及忍冬类型与官方第254窟说明及预览对照相符；该文件的原始出版出处尚待补齐，不标为数字敦煌下载图"},
    {"id": "lesson-user-honeysuckle", "userFile": "/Users/liujing/Downloads/忍冬纹.jpg", "original": "忍冬纹.jpg", "publisher": "婧婧提供；图中带知乎署名水印，原出版来源待核", "cave": None, "period": "待核（图片自带北周文字，不作为已考证结论）", "location": "忍冬纹样黑白整理图；非指定洞窟实物照片", "verification": "仅作补充观察；保留文字及水印；窟号、年代与原出版出处均待核，不用于年代或洞窟归属题"},
    {"id": "lesson-user-rabbits", "userFile": "/Users/liujing/Downloads/三兔共耳.jpg", "original": "三兔共耳.jpg", "pageUrl": "https://www.dha.ac.cn/info/1425/3569.htm", "publisher": "婧婧提供；拼版原出处待补", "cave": 407, "period": "隋", "location": "三兔共耳总图与圈选局部拼版", "verification": "图像内容与官方第407窟说明交叉核验；原拼版出处待补；正式数耳互动使用1024像素敦煌研究院供图"},
]


def main() -> None:
    intake = AssetIntake(ROOT)
    with intake.transaction():
        import_references(intake)


def encode_png(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        mode = 'RGBA' if 'A' in image.getbands() else 'RGB'
        image.convert(mode).save(destination, 'PNG', optimize=True)


def import_references(intake: AssetIntake) -> None:
    assets_path = ROOT / "src/content/assets.json"
    notes_path = ARCHIVE / 'source-notes.json'
    previous_assets = read_json(assets_path)
    assets = list(previous_assets)
    previous_notes = read_json(notes_path, {})
    notes = {row['id']: row for row in previous_notes.get('references', [])}
    for ref in REFERENCES:
        old = notes.get(ref['id'], {})
        archived = ARCHIVE / ref["original"]
        local = Path(ref["userFile"]) if "userFile" in ref else ROOT / "work" / ref["file"]
        original = intake.original(old.get('originalPath', str(archived.relative_to(ROOT))),
                                   expected=old.get('sha256'), local=local, url=ref.get('imageUrl'))
        runtime = RUNTIME / f"{ref['id']}-v001.png"
        runtime_path = f'/assets/lessons/patterns/{runtime.name}'
        if old and old['runtimePath'] != runtime_path:
            raise ValueError(f'Unexpected registered runtime path: {runtime_path}')
        result = intake.derive(original, runtime, 'PNG', {'mode': 'RGB or RGBA', 'optimize': True}, encode_png,
                               prior=old.get('derivation'), legacy_size=(old['width'], old['height']) if old else None)
        width, height = result.size
        source_note = f"真实教学参考图。{ref['publisher']}。{ref['verification']}。原件与来源登记见 art-source/references/patterns/v001/source-notes.json。仅转PNG，不放大、不调色、不抹水印。".replace("婧婧", "开发者")
        item = {"id": ref["id"], "path": runtime_path, "width": width, "height": height, "kind": "teaching", "placeholder": False, "version": "reference-v001", "sourceNote": source_note}
        found = next((asset for asset in assets if asset["id"] == ref["id"]), None)
        if found is None:
            assets.append(item)
        elif found.get("version", "") > item["version"]:
            # Rebuilding an old archive must not downgrade an actively used newer source.
            pass
        elif (found != item and (not old or any(found.get(key) != item[key]
                                               for key in ('path', 'width', 'height')))):
            raise RuntimeError(f"Asset already registered differently: {ref['id']}")
        if old:
            entry = {**old, 'originalPath': original.reference}
        else:
            entry = {key: value for key, value in ref.items() if key not in ("file", "userFile")}
            entry.update({"originalPath": original.reference, "originalFilename": ref["original"], "width": width, "height": height, "sha256": original.sha256, "runtimePath": item["path"], "retrievedOn": date.today().isoformat(), "processing": "完整保留画面、比例、文字和原有水印；仅格式转换为PNG，不上采样、补画、调色或去水印。", "rights": "版权归原权利人；可访问不等于开放许可，未标称开放授权。", "derivation": result.provenance()})
        notes[ref['id']] = entry
        print(f"{ref['id']}: {width}×{height}")
    write_json(notes_path, {"version": 1, "purpose": "《敦煌寻宝记》本地教学原型参考图；正式实物与用户补充整理图分别标注", **previous_notes, "references": list(notes.values())}, existing=previous_notes)
    write_json(assets_path, assets, existing=previous_assets)


if __name__ == "__main__":
    main()
