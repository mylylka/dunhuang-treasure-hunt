"""Label the current game's overhead image and the six captured outdoor stations."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
base = ROOT / 'outputs/world-decoration-reference/v001'
source = base / 'original/g03.png'
dest = base / 'annotated/g03-map.png'
if dest.exists():
    raise FileExistsError(f'保留已有文件，未覆盖：{dest}')
report = json.loads((ROOT / 'work/world/decoration-ground-capture-report.json').read_text())
ids = ['o01', 'o05', 'o09', 'o13', 'o17', 'o21']
# Terrain heights sampled with terrainSurfaceHeight from terrain-rules-v001.ts.
heights = [12.171512469952017, 17.001955262599612, 19.543292770083795,
           11.91679533017144, 2.7216965541450087, 9.428254738129658]

im = Image.open(source).convert('RGB')
if im.size != (2560, 1440):
    raise ValueError('截图分辨率与摄影机投影记录不一致。')
canvas = Image.new('RGB', (2560, 1740), '#f7f0e3')
canvas.paste(im, (0, 0))
d = ImageDraw.Draw(canvas)
font = '/System/Library/Fonts/STHeiti Light.ttc'
head, body, small, num = [ImageFont.truetype(font, n) for n in (46, 34, 27, 29)]
ink, accent = '#352d28', '#913e2e'

def projected(pos, height):
    # Perspective camera at (244,400,30.1), looking at (244,12,30), FOV 45°.
    # Screen right is +X and screen up is approximately -Z.
    length = math.hypot(388, .1)
    fy, fz = -388/length, -.1/length
    upy, upz = -fz, fy
    dy, dz = height-400, pos['z']-30.1
    depth = dy*fy + dz*fz
    f = 1440/(2*math.tan(math.radians(45)/2))
    return round(1280+(pos['x']-244)*f/depth), round(720-f*(dy*upy+dz*upz)/depth)

# The leader ends are approximate screenshot locations of visible buildings.
def label(text, box, point):
    x, y = box
    width = round(d.textlength(text, font=body) + 45)
    d.line((x+width//2, y+48, point[0], point[1]), fill=accent, width=4)
    d.ellipse((point[0]-7,point[1]-7,point[0]+7,point[1]+7),fill=accent)
    d.rounded_rectangle((x,y,x+width,y+58),radius=10,fill='#fff8e9',outline=accent,width=3)
    d.text((x+22,y+8),text,font=body,fill=ink)

label('绘彩馆', (340, 420), (650, 560))
label('乐舞坊', (810, 400), (1025, 600))
label('月牙泉', (1350, 405), (1230, 650))
label('九层楼', (1940, 950), (1690, 1005))

badge_offsets = [(-45,-75), (-10,-112), (55,-83), (25,78), (0,-70), (25,-80)]
for n, (id, height, delta) in enumerate(zip(ids, heights, badge_offsets), 1):
    shot = next(s for s in report['shots'] if s['id'] == id)
    x,y = projected(shot['position'], height)
    bx,by=x+delta[0],y+delta[1]
    d.line((x,y,bx,by), fill=accent, width=3)
    d.ellipse((x-6,y-6,x+6,y+6),fill=accent,outline='#fff8e9',width=2)
    d.ellipse((bx-23,by-23,bx+23,by+23),fill=accent,outline='#fff8e9',width=3)
    d.text((bx,by-2),str(n),font=num,fill='white',anchor='mm')

d.line((2390,170,2390,75),fill=ink,width=6)
d.polygon([(2390,55),(2378,83),(2402,83)],fill=ink)
d.text((2390,190),'北  −Z',font=body,fill=ink,anchor='mm')
d.rectangle((0,1440,2560,1447),fill=accent)
d.text((62,1468),'世界布局与户外拍摄站位',font=head,fill=ink)
d.text((65,1530),'① 门外小路 O01–O04     ② 上坡中段 O05–O08     ③ 坡顶 O09–O12',font=body,fill=ink)
d.text((65,1585),'④ 下坡中段 O13–O16     ⑤ 湖边谷地 O17–O20     ⑥ 崖前道路 O21–O24',font=body,fill=ink)
d.text((65,1660),'方位为游戏世界坐标（北＝−Z）；站位按地形高度与摄影参数近似投影，仅供定位，不作为测绘比例尺。',font=small,fill='#70645b')
canvas.save(dest,'PNG',optimize=True)
print(dest)
