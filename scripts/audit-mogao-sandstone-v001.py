"""Read-only topology, UV coverage, and baked colour projection audit in Blender."""
import bpy,bmesh,json
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1]
o=bpy.data.objects['mountain-sandstone-low'];o.data.calc_loop_triangles();uv=o.data.uv_layers.active.data
bm=bmesh.new();bm.from_mesh(o.data)
report={'triangles':len(o.data.loop_triangles),'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'atlases':{}}
assert report['boundaryEdges']==0 and report['nonManifoldEdges']==0
for zone,(name,N) in enumerate(zip(['near','upper','rear'],[4096,2048,1024])):
    coverage=np.zeros((N,N),dtype=np.uint16);uv_area=0
    for tri in o.data.loop_triangles:
        if tri.material_index!=zone:continue
        pts=np.array([uv[i].uv[:] for i in tri.loops])*N
        x0,y0=np.maximum(0,np.floor(pts.min(axis=0)).astype(int));x1,y1=np.minimum(N-1,np.ceil(pts.max(axis=0)).astype(int))
        a,b,c=pts;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);uv_area+=abs(den)/(2*N*N)
        if abs(den)<1e-9 or x1<x0 or y1<y0:continue
        xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
        coverage[y0:y1+1,x0:x1+1]+=((u>=0)&(v>=0)&(u+v<=1)).astype(np.uint16)
    atlas={'resolution':N,'uvArea':float(uv_area),'uvPixelCoverage':float(np.mean(coverage>0)),'uvOverlappingPixelsFraction':float(np.mean(coverage>1))}
    path=R/f'public/assets/world/mogao-sandstone/v001/{name}-basecolor.png'
    if 'mountain-sandstone-high' in bpy.data.objects and path.exists():
        im=bpy.data.images.load(str(path),check_existing=False);pixels=np.array(im.pixels[:],dtype=np.float32).reshape(N,N,4)
        inside=coverage>0
        for axis in [0,1]:inside&=np.roll(coverage>0,1,axis)&np.roll(coverage>0,-1,axis)
        atlas['blackInteriorTexelFraction']=float(np.mean(np.max(pixels[:,:,:3],axis=2)[inside]<.02))
        atlas['colorChannelRange']=np.quantile(pixels[:,:,:3][inside],[.01,.5,.99],axis=0).tolist()
        normal=bpy.data.images.load(str(R/f'public/assets/world/mogao-sandstone/v001/{name}-normal.png'),check_existing=False);normal.colorspace_settings.name='Non-Color'
        normal_pixels=np.array(normal.pixels[:],dtype=np.float32).reshape(N,N,4)[inside]
        atlas['normalHemisphereErrorFraction']=float(np.mean(normal_pixels[:,2]<.45))
        atlas['normalDetailDeviation']=float(np.std(normal_pixels[:,:2]))
        assert atlas['normalHemisphereErrorFraction']<.001,'Shallow grit normal points into the rock'
        assert atlas['normalDetailDeviation']>.001,'Normal bake is unexpectedly flat'
    report['atlases'][name]=atlas;print(name,json.dumps(atlas),flush=True)
    assert atlas['uvPixelCoverage']>.3,'Atlas coverage too low'
    assert atlas['uvOverlappingPixelsFraction']<.003,'UV islands overlap'
    assert atlas.get('blackInteriorTexelFraction',0)<.003,'Baked colour projection misses'
(R/'work/world/mogao-sandstone-v001-uv-measurements.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
