"""Read-only topology, UV coverage, and baked colour projection audit in Blender."""
import bpy,bmesh,json
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1]
o=bpy.data.objects['sandstone-low'];o.data.calc_loop_triangles();uv=o.data.uv_layers.active.data
N=2048;coverage=np.zeros((N,N),dtype=np.uint16);uv_area=0
for tri in o.data.loop_triangles:
    pts=np.array([uv[i].uv[:] for i in tri.loops])*N
    x0,y0=np.maximum(0,np.floor(pts.min(axis=0)).astype(int));x1,y1=np.minimum(N-1,np.ceil(pts.max(axis=0)).astype(int))
    a,b,c=pts;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);uv_area+=abs(den)/(2*N*N)
    if abs(den)<1e-9 or x1<x0 or y1<y0:continue
    xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
    u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
    v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
    coverage[y0:y1+1,x0:x1+1]+=((u>=0)&(v>=0)&(u+v<=1)).astype(np.uint16)
bm=bmesh.new();bm.from_mesh(o.data)
report={'triangles':len(o.data.loop_triangles),'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'uvArea':float(uv_area),'uvPixelCoverage':float(np.mean(coverage>0)),'uvOverlappingPixelsFraction':float(np.mean(coverage>1))}
path=R/'public/assets/world/sandstone-study/v001/sandstone-basecolor.png'
if 'sandstone-high' in bpy.data.objects and path.exists():
    im=bpy.data.images.load(str(path),check_existing=False);pixels=np.array(im.pixels[:],dtype=np.float32).reshape(N,N,4)
    inside=coverage>0
    # Ignore the 1px chart border; report true surface projection misses.
    for axis in [0,1]:inside&=np.roll(coverage>0,1,axis)&np.roll(coverage>0,-1,axis)
    report['blackInteriorTexelFraction']=float(np.mean(np.max(pixels[:,:,:3],axis=2)[inside]<.02))
(R/'work/world/sandstone-study-v001-uv-measurements.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
assert report['boundaryEdges']==0 and report['nonManifoldEdges']==0
assert report['uvPixelCoverage']>.35,'Atlas coverage is too low'
assert report.get('blackInteriorTexelFraction',0)<.003,'Baked colour has projection misses'
