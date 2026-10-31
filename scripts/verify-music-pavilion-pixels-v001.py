"""Compare actual browser frames using the recorded 3D camera projection."""
from pathlib import Path
from PIL import Image
import json, numpy as np

ROOT=Path(__file__).resolve().parents[1]
prefix=ROOT/'work/world/music-pavilion-v001'
report=json.loads(Path(str(prefix)+'-verification.json').read_text())
assert report['passed']
state=next(s['state'] for s in report['screens'] if s['name']=='ribbon-frame-a')
eye=np.array(state['camera']['position']);target=np.array(state['camera']['target'])
forward=(target-eye)/np.linalg.norm(target-eye);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
def project(point):
    delta=np.array(point)-eye;distance=np.dot(delta,forward);factor=925/(2*np.tan(np.radians(49/2)))
    return [1279/2+factor*np.dot(delta,right)/distance,925/2-factor*np.dot(delta,up)/distance]
uv=[[0,0],[1,0],[1,1],[0,1]]
points=[project([21.5+(u-.5)*7.6,4.65+(.5-v)*5.7,-11.745]) for u,v in uv]
a=[];b=[]
for (x,y),(u,v) in zip(points,uv):
    a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);b.extend([u,v])
homography=np.r_[np.linalg.solve(a,b),1].reshape(3,3)
frame_a=np.array(Image.open(str(prefix)+'-ribbon-frame-a.png').convert('RGB')).astype(int)
frame_b=np.array(Image.open(str(prefix)+'-ribbon-frame-b.png').convert('RGB')).astype(int)
y,x=np.indices(frame_a.shape[:2]);projected=homography@np.stack([x.ravel(),y.ravel(),np.ones(x.size)])
u=(projected[0]/projected[2]).reshape(x.shape);v=(projected[1]/projected[2]).reshape(x.shape)
inside=(u>.005)&(u<.995)&(v>.005)&(v<.995);static=inside&(u>.21);moving=inside&(u<.21)
difference=np.max(np.abs(frame_a-frame_b),axis=2)
result={'staticPixels':int(static.sum()),'staticChangedPixels':int(((difference>0)&static).sum()),
        'movingChangedPixels':int(((difference>0)&moving).sum()),'movingMaxChannelDelta':int(difference[moving].max()),
        'method':'Two actual post-reveal browser screenshots; project screen pixels to the original mural UV. Right 79 percent includes the figure, hands and instrument.'}
Path(str(prefix)+'-ribbon-pixel-check.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['staticChangedPixels']==0,result
assert result['movingChangedPixels']>0,result
print(json.dumps(result))
