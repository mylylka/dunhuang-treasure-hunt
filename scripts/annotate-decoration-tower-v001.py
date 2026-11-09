"""Annotate a true orthographic model render using measured eave elevations."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
dims = json.loads((ROOT / 'work/world/decoration-dimensions-v001.json').read_text())['tower']
source = ROOT / 'work/world/decoration-tower-elevation.png'
target = ROOT / 'outputs/world-decoration-reference/v001/annotated/t07-elevation.png'
if target.exists():
    raise FileExistsError(f'保留已有文件，未覆盖：{target}')

im = Image.open(source).convert('RGB')
assert im.size == (2048, 1536), 'Orthographic render projection must match the verified camera.'
canvas = Image.new('RGB', (2048, 1750), '#f5efe3')
canvas.paste(im, (0, 0))
draw = ImageDraw.Draw(canvas)
fontfile = '/System/Library/Fonts/STHeiti Light.ttc'
title = ImageFont.truetype(fontfile, 44)
body = ImageFont.truetype(fontfile, 28)
small = ImageFont.truetype(fontfile, 24)
accent, ink, muted = '#8c2f1c', '#302823', '#594e48'

# Orthographic render: Y pixel = 768 − (asset Y − 29.4) × 25.6.
def ypos(asset_y):
    return round(768 - (asset_y - 29.4) * 25.6)

base_y = ypos(dims['source_platform_asset_y_m'])
peak_y = ypos(dims['asset_top_y_m'])
draw.text((55, 35), '九层楼 · 正立面模型测量图', font=title, fill=ink)
draw.text((58, 96), '统一以平台顶部为零点；楼体总高 45.0 m', font=body, fill=ink)
draw.line((495, peak_y, 495, base_y), fill=accent, width=4)
draw.line((475, peak_y, 515, peak_y), fill=accent, width=4)
draw.line((475, base_y, 515, base_y), fill=accent, width=4)
draw.text((270, (peak_y + base_y)//2 - 18), '总高 45.0 m', font=body, fill=accent)
draw.text((330, peak_y-17), '+45.0 m', font=small, fill=accent)
draw.text((350, base_y-17), '平台 0 m', font=small, fill=accent)

for eave in dims['eaves']:
    py = ypos(eave['asset_eave_y_m'])
    index = eave['storey']
    elevation = eave['height_above_platform_m']
    gap = eave['height_from_previous_reference_m']
    draw.line((1375, py, 1430, py), fill=accent, width=3)
    label = f"第{index}檐 +{elevation:.1f} m  ·  高差 {gap:.1f} m"
    draw.text((1440, py-17), label, font=small, fill=ink)

draw.rectangle((0, 1536, 2048, 1542), fill=accent)
draw.text((55, 1570), '图中“高差”：第1檐相对平台，其余为相邻檐口之间的高差。', font=body, fill=ink)
draw.text((55, 1620), f"第9檐至楼尖约 {dims['last_eave_to_peak_m']:.1f} m；外观分层高度不等于室内净高。", font=body, fill=ink)
draw.text((55, 1682), '正交技术视图 · 檐口标高由模型导出登记推算 · 单位：米', font=small, fill=muted)
canvas.save(target, 'PNG', optimize=True)
print(target)
