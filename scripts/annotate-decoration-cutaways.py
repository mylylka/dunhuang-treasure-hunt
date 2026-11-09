"""Overlay measured dimension lines on orthographic GLB cutaway renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/world'
font_path='/System/Library/Fonts/STHeiti Medium.ttc'
title_font=ImageFont.truetype(font_path,32)
dim_font=ImageFont.truetype(font_path,28)
small_font=ImageFont.truetype(font_path,22)

def make(name,title,subtitle,center_y,width,xmin,xmax,ymin,ymax,hlabel,vlabel,center_x=0):
    image=Image.open(OUT/(name+'.png')).convert('RGBA');w,h=image.size
    d=ImageDraw.Draw(image,'RGBA');ppm=w/width
    X=lambda x:w/2+(x-center_x)*ppm
    Y=lambda y:h/2-(y-center_y)*ppm
    left,right=X(xmin),X(xmax);top,bottom=Y(ymax),Y(ymin)
    color=(67,43,31,255);line=5
    # Extension lines terminate exactly at the measured model axes/bounds.
    hy=max(84,top-54);vx=min(w-100,right+70)
    d.line((left,top,left,hy-12),fill=color,width=2);d.line((right,top,right,hy-12),fill=color,width=2)
    d.line((left,hy,right,hy),fill=color,width=line)
    d.polygon([(left,hy),(left+18,hy-8),(left+18,hy+8)],fill=color)
    d.polygon([(right,hy),(right-18,hy-8),(right-18,hy+8)],fill=color)
    d.line((right,top,vx+10,top),fill=color,width=2);d.line((right,bottom,vx+10,bottom),fill=color,width=2)
    d.line((vx,top,vx,bottom),fill=color,width=line)
    d.polygon([(vx,top),(vx-8,top+18),(vx+8,top+18)],fill=color)
    d.polygon([(vx,bottom),(vx-8,bottom-18),(vx+8,bottom-18)],fill=color)
    box=d.textbbox((0,0),hlabel,font=dim_font);tw=box[2]-box[0]
    d.rounded_rectangle((w/2-tw/2-12,hy-22,w/2+tw/2+12,hy+24),6,fill=(255,249,230,245))
    d.text((w/2,hy),hlabel,font=dim_font,anchor='mm',fill=color)
    box=d.textbbox((0,0),vlabel,font=dim_font);tw=box[2]-box[0]
    layer=Image.new('RGBA',(tw+24,52),(255,249,230,245));ld=ImageDraw.Draw(layer)
    ld.text(((tw+24)/2,25),vlabel,font=dim_font,anchor='mm',fill=color)
    layer=layer.rotate(90,expand=True);image.alpha_composite(layer,(round(vx-layer.width/2),round((top+bottom-layer.height)/2)))
    d=ImageDraw.Draw(image,'RGBA')
    d.rounded_rectangle((30,18,570,70),10,fill=(255,249,230,240));d.text((48,42),title,font=title_font,anchor='lm',fill=color)
    d.rounded_rectangle((30,h-59,w-30,h-17),8,fill=(255,249,230,235));d.text((45,h-38),subtitle,font=small_font,anchor='lm',fill=color)
    image.convert('RGB').save(OUT/(name+'-measured.png'))

make('decoration-courtyard-overhead','纹彩院 · 院落正交俯视','模型技术图：显示院落及屋顶；围墙按地形预览外扩，尺寸为围墙轴线。',13,44,-12,12,0,26,'院落宽 24.0 m（围墙轴线）','院落进深 26.0 m（围墙轴线）')
make('decoration-cutaway-courtyard','纹彩院 · 剖顶正交俯视','模型技术图：屋顶及藻井已隐藏；围墙按地形预览外扩，尺寸为围墙轴线。',13,44,-12,12,0,26,'院落宽 24.0 m（围墙轴线）','院落进深 26.0 m（围墙轴线）')
make('decoration-cutaway-hall','观赏厅 · 剖顶正交俯视','模型技术图：屋顶及藻井已隐藏；17米为柱墙轴线/台基范围，并非室内净尺寸。',17,29,-8.5,8.5,8.5,25.5,'大厅宽 17.0 m（柱墙轴线）','大厅进深 17.0 m（柱墙轴线）')
make('decoration-cutaway-cave','洞窟主室 · 剖顶正交俯视','模型技术图：山体及窟顶已隐藏，保留大佛；以洞窟内部模型边界测量。',19.5,41,-14,14,7,32,'主室宽 28.0 m（内壁之间）','主室进深 25.0 m（模型范围）')
make('decoration-music-overhead','乐舞坊 · 院落正交俯视','模型技术图：仅显示乐舞坊模型；尺寸为院墙轴线，未包含地形和湖泊。',4,60,-22,24,-12,19.65,'院落宽 46.0 m（围墙轴线）','院落进深 31.7 m（围墙轴线）',1)
make('decoration-music-cutaway','乐舞坊 · 屋顶隐藏俯视','模型技术图：屋顶及上部封墙已隐藏；合并的主体网格仍保留，非完全剖面。',4,60,-22,24,-12,19.65,'院落宽 46.0 m（围墙轴线）','院落进深 31.7 m（围墙轴线）',1)
make('decoration-cliff-overhead','九层楼崖体 · 正交俯视','模型技术图：仅含崖壁和九层楼，尺寸为崖壁主模型外包；未包含沙丘地形。',11,180,-64,63,-17,49,'崖壁宽 约127.0 m（主模型外包）','崖壁进深 约66.0 m（主模型外包）')
