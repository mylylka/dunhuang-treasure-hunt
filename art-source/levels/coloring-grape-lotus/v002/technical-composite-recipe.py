from pathlib import Path
import json, importlib.util
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parent
original=np.array(Image.open('public/assets/levels/coloring-grape-lotus/coloring-grape-lotus-line-v001.png').convert('RGB'))
generated=np.array(Image.open('/Users/liujing/.codex/generated_images/01a1805f-011b-77e1-b0bf-997d74222e35/exec-f14dc407-889c-49e3-9ce6-970db55e7d21.png').convert('RGB'))
h,w=original.shape[:2]
yy,xx=np.indices((h,w),np.float32)
result=original.copy();scope=np.zeros((h,w),np.float32)
spec=importlib.util.spec_from_file_location('color_import','scripts/import-coloring-assets.py');imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)


def layer(name,mask,inner,frame,normal_axis):
    matrix=np.array(json.loads((ROOT/f'lotus-register-{name}-matrix.json').read_text()),np.float32)
    inverse=cv2.invertAffineTransform(matrix)
    gx=xx.copy();gy=yy.copy()
    if name=='top':
        rawx=(xx-matrix[0,1]*24-matrix[0,2])/matrix[0,0]
        source_frame=matrix[1,0]*rawx+matrix[1,1]*24+matrix[1,2]
        gy=source_frame+(yy-frame)/(inner-frame)*(inner-source_frame)
    elif name=='bottom':
        rawx=(xx-matrix[0,1]*1198-matrix[0,2])/matrix[0,0]
        source_frame=matrix[1,0]*rawx+matrix[1,1]*1198+matrix[1,2]
        gy=inner+(yy-inner)/(frame-inner)*(source_frame-inner)
    elif name=='left':
        rawy=(yy-matrix[1,0]*23-matrix[1,2])/matrix[1,1]
        source_frame=matrix[0,0]*23+matrix[0,1]*rawy+matrix[0,2]
        gx=source_frame+(xx-frame)/(inner-frame)*(inner-source_frame)
    else:
        rawy=(yy-matrix[1,0]*1231-matrix[1,2])/matrix[1,1]
        source_frame=matrix[0,0]*1231+matrix[0,1]*rawy+matrix[0,2]
        gx=inner+(xx-inner)/(frame-inner)*(source_frame-inner)
    mx=inverse[0,0]*gx+inverse[0,1]*gy+inverse[0,2]
    my=inverse[1,0]*gx+inverse[1,1]*gy+inverse[1,2]
    warped=cv2.remap(generated,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(255,255,255))
    # Two-pixel inward feather only at the old-stroke joining edge.
    if normal_axis==0:
        factor=np.clip((inner-xx)/2,0,1) if name=='left' else np.clip((xx-inner)/2,0,1)
    else:
        factor=np.clip((inner-yy)/2,0,1) if name=='top' else np.clip((yy-inner)/2,0,1)
    alpha=mask.astype(np.float32)*factor
    use=alpha>0
    result[use]=np.rint(result[use]*(1-alpha[use,None])+warped[use]*alpha[use,None]).astype(np.uint8)
    scope[use]=1


top=((xx>=180)&(xx<=480)|(xx>=730)&(xx<=1035))&(yy>=21)&(yy<=72)
bottom=((xx>=165)&(xx<=485)|(xx>=725)&(xx<=1045))&(yy>=1128)&(yy<=1192)
left=((yy>=170)&(yy<=490)|(yy>=720)&(yy<=1045))&(xx>=19)&(xx<=72)
right=((yy>=165)&(yy<=495)|(yy>=720)&(yy<=1050))&(xx>=1122)&(xx<=1192)
layer('top',top,72,24,1)
layer('bottom',bottom,1128,1188,1)
layer('left',left,72,22,0)
layer('right',right,1122,1188,0)

# The newly supplied AI frame is copied from that image, never redrawn.
frame_matrix=np.array([[(1188-22)/(1231-23),0,22-23*(1188-22)/(1231-23)],[0,(1188-24)/(1198-24),24-24*(1188-24)/(1198-24)]],np.float32)
frame_image=cv2.warpAffine(generated,frame_matrix,(w,h),flags=cv2.INTER_LINEAR,borderValue=(255,255,255))
frame_mask=(((np.abs(xx-22)<=3)|(np.abs(xx-1188)<=3))&(yy>=21)&(yy<=1191))|(((np.abs(yy-24)<=3)|(np.abs(yy-1188)<=3))&(xx>=19)&(xx<=1191))
result[frame_mask]=frame_image[frame_mask];scope[frame_mask]=1
Image.fromarray(result).save(ROOT/'grape-lotus-repaired-composite-prototype.png')
Image.fromarray((scope*255).astype(np.uint8)).save(ROOT/'grape-lotus-repair-scope-prototype.png')
ids,regions,details,_=imp.segment(cv2.cvtColor(result,cv2.COLOR_RGB2GRAY))
palette=[{'color':c} for _,c in imp.LEVELS[-1]['colors']]
imp.preview(Image.fromarray(result),ids,palette).save(ROOT/'grape-lotus-repaired-composite-preview.png')
print('regions',len(regions),'outside-scope changed',np.any(np.any(result!=original,axis=2)&(scope==0)))
print('new large regions',[(r['id'],r['pixelCount'],d['samplePixel']) for r,d in zip(regions,details) if r['pixelCount']>10000])
(ROOT/'grape-lotus-repair-prototype-report.json').write_text(json.dumps({'regions':len(regions),'scopePixels':int(scope.sum()),'frameTransform':frame_matrix.tolist(),'regionsDetail':details},indent=2))
