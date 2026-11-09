"""Make labeled copies from real game screenshots and cutaway model renders.

Numbered markers identify the relevant object; they are not pixel rulers.
Measurements come from the existing scene-derived dimensions record.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'work/world/decoration-dimensions-v001.json').read_text())
BASE = ROOT / 'outputs/world-decoration-reference/v001'
OUTPUT = BASE / 'annotated'
OUTPUT.mkdir(parents=True, exist_ok=True)
FONT = '/System/Library/Fonts/STHeiti Light.ttc'

h, m, c = DATA['hall'], DATA['music'], DATA['cave']
jobs = [
    ('c02', '绘彩馆 · 院外侧墙', [(.69, .40, f"围墙墙身高约 {h['courtyard_side_wall_body_height_m']:.1f} m（不含压顶）")]),
    ('c04', '绘彩馆 · 后侧墙体', [(.53, .30, f"院落后墙高约 {h['courtyard_back_wall_height_m']:.1f} m（以院落地面为基准）")]),
    ('c07', '绘彩馆 · 大厅入口', [(.25, .33, f"大厅柱墙轴线 {h['hall_axis_width_m']:.1f} × {h['hall_axis_depth_m']:.1f} m；非室内净空"), (.48, .54, f"大厅台基高约 {h['platform_height_m']:.2f} m（相对院内地面）")]),
    ('c15', '绘彩馆 · 藻井仰视', [(.07, .83, f"藻井外框整体宽约 {h['caisson_outer_width_m']:.1f} m（本图未完整显示外框）")]),
    ('c16', '绘彩馆 · 大厅上部', [(.50, .48, f"藻井底框距大厅台基约 {h['caisson_bottom_above_platform_m']:.2f} m；非全厅净高")]),
    ('m01', '乐舞坊 · 院门', [(.42, .36, f"院门开口设计宽度约 {m['gate_width_m']:.1f} m（布局值）")]),
    ('m03', '乐舞坊 · 院外围墙', [(.55, .36, f"围墙顶部高度约 {m['perimeter_top_m']:.2f} m（含上部花格，布局值）")]),
    ('m09', '乐舞坊 · 壁画前台基', [(.48, .32, f"台基高约 {m['platform_height_m']:.1f} m（相对前院地面）")]),
    ('m10', '乐舞坊 · 台阶与院内空间', [(.75, .53, f"整座台基约 {m['platform_width_m']:.1f} × {m['platform_depth_m']:.1f} m，高 {m['platform_height_m']:.1f} m")]),
    ('t09', '洞窟 · 壁画侧墙', [(.70, .20, f"洞窟主要侧墙约高 {c['side_wall_height_m']:.1f} m（从洞窟地面起；上部未完整入画）")]),
    ('t10', '洞窟 · 壁画带', [(.42, .25, f"故事壁画带约高 {c['mural_band_height_m']:.1f} m（配置尺寸）")]),
    ('t11', '洞窟 · 回望入口', [(.50, .28, f"洞窟入口模型尺寸约 {c['portal_width_m']:.2f} × {c['portal_height_m']:.2f} m（宽 × 高）")]),
]

cutaways = [
    ('cutaway-courtyard', 'courtyard', '绘彩馆院落 · 剖顶技术俯视', [(.23, .52, f"院落围墙轴线约 {h['courtyard_wall_axis_width_m']:.1f} × {h['courtyard_wall_axis_depth_m']:.1f} m；非院内净尺寸"), (.48, .38, f"大厅柱墙轴线 {h['hall_axis_width_m']:.1f} × {h['hall_axis_depth_m']:.1f} m")]),
    ('cutaway-hall', 'hall', '绘彩馆大厅 · 剖顶技术俯视', [(.50, .40, f"柱墙轴线 {h['hall_axis_width_m']:.1f} × {h['hall_axis_depth_m']:.1f} m；非室内净尺寸"), (.49, .77, f"台基高约 {h['platform_height_m']:.2f} m；藻井底框距台基约 {h['caisson_bottom_above_platform_m']:.2f} m")]),
    ('cutaway-cave', 'cave', '九层楼洞窟 · 剖顶技术俯视', [(.19, .40, f"主室模型布局约 {c['room_width_m']:.1f} × {c['room_depth_m']:.1f} m；非净空实测"), (.50, .93, f"入口模型约 {c['portal_width_m']:.2f} × {c['portal_height_m']:.2f} m（宽 × 高）")]),
]

def make(src, dest, title, entries, technical=False, allow_replace=False):
    image = Image.open(src).convert('RGB')
    w, height = image.size
    scale = w / 2560
    footer = round((250 + 60 * len(entries)) * scale)
    canvas = Image.new('RGB', (w, height + footer), '#f5efe3')
    canvas.paste(image, (0, 0))
    d = ImageDraw.Draw(canvas)
    ink, accent, muted = '#352d28', '#9f4833', '#70645b'
    ftitle = ImageFont.truetype(FONT, round(46 * scale))
    fbody = ImageFont.truetype(FONT, round(36 * scale))
    fsmall = ImageFont.truetype(FONT, round(25 * scale))
    fnum = ImageFont.truetype(FONT, round(28 * scale))
    radius = round(26 * scale)
    for number, (x, y, _) in enumerate(entries, 1):
        px, py = round(x * w), round(y * height)
        d.ellipse((px-radius, py-radius, px+radius, py+radius), fill=accent, outline='#fff8e8', width=max(2, round(4*scale)))
        d.text((px, py-2*scale), str(number), font=fnum, fill='white', anchor='mm')
    d.rectangle((0, height, w, height + round(7*scale)), fill=accent)
    x0, y0 = round(65*scale), height + round(30*scale)
    d.text((x0, y0), title, font=ftitle, fill=ink)
    for number, (_, _, text) in enumerate(entries, 1):
        yy = y0 + round((65 + (number-1)*60)*scale)
        d.text((x0, yy), f'{number}   {text}', font=fbody, fill=ink)
    note = '编号表示对应构件位置，非按图片像素测量。来源：场景模型配置及导出登记。'
    if technical:
        note = '剖顶技术视图：暂隐屋顶及部分遮挡物；画面按模型组装，光照与游戏不同。'
    d.text((x0, height+footer-round(52*scale)), note, font=fsmall, fill=muted)
    if dest.exists() and not allow_replace:
        raise FileExistsError(f'保留已有文件，未覆盖：{dest}')
    canvas.save(dest, 'PNG', optimize=True)

if __name__ == '__main__':
    for name, title, entries in jobs:
        make(BASE / 'original' / f'{name}.png', OUTPUT / f'{name}.png', title, entries)
    for output, source, title, entries in cutaways:
        make(ROOT / 'work/world' / f'decoration-cutaway-{source}.png', OUTPUT / f'{output}.png', title, entries, technical=True)
    print(f'完成 {len(jobs)} 张实景标注副本、{len(cutaways)} 张剖顶技术图；原图未改变。')
