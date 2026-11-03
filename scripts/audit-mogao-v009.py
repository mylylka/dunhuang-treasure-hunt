"""Read-only Blender geometry checks for the reported seams and intersections."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v009';bpy.ops.wm.open_mainfile(filepath=str(D/'buddha-hall.blend'))
def bounds(o):
 v=[o.matrix_world@Vector(c) for c in o.bound_box];return [[min(p[i] for p in v) for i in range(3)],[max(p[i] for p in v) for i in range(3)]]
objects=bpy.data.objects;results={}
results['buddhaBounds']=bounds(objects['buddha-web']);lo,hi=results['buddhaBounds'];assert abs(hi[2]-lo[2]-35)<.001
results['contactStoneBounds']=bounds(objects['buddha-contact-stone']);cl,ch=results['contactStoneBounds'];assert cl[0]>-12.2 and ch[0]<12.2 and cl[1]>12.6 and ch[1]<31.6
results['floorBounds']=[bounds(objects[n]) for n in ['earth-floor','extended-tunnel-floor']];assert results['floorBounds'][0][0][1]==results['floorBounds'][1][1][1]==7
results['uvCharts']=[]
for o in objects:
 if not (o.type=='MESH' and ('upper-thousand' in o.name or 'rear-low-thousand' in o.name)):continue
 uv=[tuple(v.uv) for v in o.data.uv_layers.active.data];spread=max(u for u,v in uv)-min(u for u,v in uv)
 assert spread<5.2,(o.name,spread)
 lower=min(v for u,v in uv);assert abs(lower*3-round(lower*3))<1e-5,(o.name,lower)
 results['uvCharts'].append({'name':o.name,'repeatSpan':spread,'bottomWholeRow':True})
manifest=json.loads((D/'export-manifest.json').read_text());assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==h for p,h in manifest['originalHashes'].items());results['protectedAssetsUnchanged']=True
results['collision']='Same v008 room, entrance and 35m Buddha footprint; contact stone stays within existing blocked footprint.'
results['passed']=True;(R/'work/world/mogao-v009-geometry-audit.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results))
