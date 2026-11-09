"""Dimensioned elevation schematic from the approved upper-gallery layout."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.font_manager import FontProperties

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / 'src/content/world/mogao-upper-v001.json').read_text())
audit = json.loads((ROOT / 'work/world/mogao-upper-v001-geometry-audit.json').read_text())
font = FontProperties(fname='/System/Library/Fonts/STHeiti Light.ttc')
fig, ax = plt.subplots(figsize=(13.8, 9.2), dpi=150)
fig.patch.set_facecolor('#f6efdf'); ax.set_facecolor('#f6efdf')
ax.set_xlim(-4, 58); ax.set_ylim(-3, 40)
def label(x, y, s, size=11, color='#493b2d', **kw):
    ax.text(x, y, s, fontproperties=font, fontsize=size, color=color, **kw)
label(-3, 38.2, '九层楼楼上灰模 · 标高与观佛关系', 21, weight='bold')
label(-3, 36.3, '水平距离展开示意；具体形体与透视见同场景剖切渲染。标高以原入口平台为 0。', 10)
ax.add_patch(Rectangle((2, 0), 12, 35, facecolor='#dfd2b7', edgecolor='#998263', linewidth=1.5))
label(8, 33.6, '同一尊原大佛', 12, ha='center')
label(8, 31.9, '保留原位置、原尺寸', 10, ha='center')
label(8, 14.7, '整体包络约 35 m\n（含背光）', 11, ha='center', va='center')
head, chest = 29.44453125, 20.44453125
for y, name in [(head, '头部参考点'), (chest, '胸部参考点')]:
    ax.plot([8], [y], 'o', color='#945139', markersize=5)
    label(8.5, y+.4, name, 9)
ax.plot([-3, 55], [0, 0], color='#7d6a4b', linewidth=2)
for room, color in zip(layout['rooms'], ['#467e80', '#b5663e']):
    h=room['floorY']; letter=room['id'][-1].upper()
    ax.add_patch(Rectangle((24, h), 16, 6, fill=False, edgecolor=color, linewidth=2))
    ax.add_patch(Rectangle((27, h+.7), 10, 4.1, facecolor=color, alpha=.15, edgecolor=color))
    ax.plot([20, 24], [h, h], color=color, linewidth=3)
    label(26, h+6.5, f'展厅 {letter}  +{h:.2f} m', 12, color)
    label(32, h+3.1, '原尺度壁画\n高 4.1 m · 底边 +0.7 m', 10, ha='center', va='center')
    ax.annotate('', (41, h+6), (41, h), arrowprops={'arrowstyle':'<->', 'color':color})
    label(41.6, h+3, '净高\n6.0 m', 10, color, va='center')
    eye=h+1.65
    ax.plot([21, 21], [h, eye-.18], color=color, linewidth=2)
    ax.plot([21], [eye], 'o', color=color, markersize=5)
    ax.plot([21, 8], [eye, head], '--', color=color, linewidth=1)
    ax.plot([21, 8], [eye, chest], ':', color=color, linewidth=1)
    view=next(v for v in audit['views'] if v['id']=='view-'+letter.lower())
    angle=view['fixedBuddhaPoints']['head']['elevationDegrees']
    label(17, eye+.55, f'仰看头部约 {angle:.1f}°', 9, color, ha='center')
    ax.plot([-2, 20], [h, h], ':', color='#b8a88d', linewidth=.7)
    label(-2.2, h+.4, f'+{h:.2f}', 9)
ground=audit['views'][0]
ax.plot([20,20], [.024,1.49], color='#756454', linewidth=2)
ax.plot([20],[1.674],'o',color='#756454',markersize=5)
ax.plot([20,8], [1.674,head], '--',color='#756454',linewidth=1)
label(17.5, 2.7, f"原一层仰看头部约 {ground['fixedBuddhaPoints']['head']['elevationDegrees']:.1f}°", 9, ha='center')
flights=[s for s in layout['surfaces'] if s['kind']=='ramp']
for i, s in enumerate(flights):
    a,b=sorted([s['y'],s['endY']]); start,end=(47,54) if i%2==0 else (54,47)
    ax.plot([start,end],[a,b], color='#875140',linewidth=2)
    ax.plot([47,54],[b,b],color='#875140',linewidth=1)
ax.plot([40,47],[8.11,8.11],color='#875140',linewidth=1.5)
ax.plot([40,47],[19.58,19.58],color='#875140',linewidth=1.5)
label(50.5, 23.7, '连续折返楼梯', 11, ha='center')
label(50.5, 21.5, '8 段 · 净宽 2.8 m', 10, ha='center')
label(-3, -1.65, '三处观赏点到头、胸的真实结构射线均畅通；上层俯看足部会被自身平台遮挡，保留真实视野差异。', 10)
ax.axis('off');fig.tight_layout(pad=.3)
out=ROOT/'work/world/mogao-upper-v001-section.png';fig.savefig(out,facecolor=fig.get_facecolor())
fig.savefig(out.with_suffix('.svg'),facecolor=fig.get_facecolor())
print(out)
