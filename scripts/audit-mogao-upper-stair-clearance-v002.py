"""Targeted real-mesh capsule/headroom audit for the upper stair flights."""
import bpy,json,math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
L=json.loads((ROOT/'src/content/world/mogao-upper-v002.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
groups={}
def import_meshes(name):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/world/mogao-upper/v002/{name}.glb'))
    obs=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
    if name=='mountain':
        for o in obs:o.location.z-=L['origin'][1]
    bpy.context.view_layer.update()
    vs=[];fs=[];owners=[]
    for o in obs:
        off=len(vs);vs.extend(o.matrix_world@v.co for v in o.data.vertices)
        for poly in o.data.polygons:fs.append(tuple(off+i for i in poly.vertices));owners.append(o.name)
    return BVHTree.FromPolygons(vs,fs),owners
for name in ['mountain','interior','upper']:groups[name]=import_meshes(name)
def p(x,y,z):return Vector((x,-z,y))
results=[]
for surf in L['surfaces']:
    if not surf['id'].startswith(('flight-', 'landing-')):continue
    rays=[];inside=[];heads=[]
    for ix in range(9):
      x=surf['minX']+.70+(surf['maxX']-surf['minX']-1.40)*ix/8
      for iz in range(31):
        z=surf['minZ']+.7+(surf['maxZ']-surf['minZ']-1.4)*iz/30
        y=surf['y']
        if surf['kind']=='ramp':y+=(surf['endY']-surf['y'])*(z-surf['minZ'])/(surf['maxZ']-surf['minZ'])
        origin=p(x,y+.25,z)
        for group,(tree,owners) in groups.items():
            loc,normal,idx,distance=tree.ray_cast(origin,Vector((0,0,1)),20)
            if loc is not None:heads.append({'at':[x,y,z],'group':group,'object':owners[idx],'clearance':distance+.25})
            for h in [.25,.5,.8,1.2,1.7]:
                eye=p(x,y+h,z)
                for a in range(8):
                    theta=a*math.pi/4;loc,n,idx,dist=tree.ray_cast(eye,Vector((math.cos(theta),math.sin(theta),0)),.69)
                    if loc is not None:rays.append({'at':[x,y,z],'bodyHeight':h,'group':group,'object':owners[idx],'distance':dist})
        tree,owners=groups['mountain']
        for h in [.8,1.7]:
            eye=p(x,y+h,z);loc,n,idx,d=tree.find_nearest(eye)
            if loc is not None and (eye-loc).dot(n)<-.015:inside.append({'at':[x,y+h,z],'nearest':owners[idx],'depth':d})
    results.append({'surface':surf['id'],'sampleCount':279,'bodyHitCount':len(rays),'bodyHitExamples':rays[:30],
                    'bodyHitObjects':dict(Counter(r['object'] for r in rays)),
                    'nonTreadOrRailContacts':[r for r in rays if not any(t in r['object'] for t in ['tread','rail'])][:30],
                    'rockInsideCount':len(inside),'rockInsideExamples':inside[:30],
                    'minimumHeadroom':min((h['clearance'] for h in heads),default=None),
                    'headroomFailures':[h for h in heads if h['clearance']<1.85][:30]})
report={'surfaces':results,
        'scope':'Targeted v002 real GLB mesh audit over all four flights and five landings; full usable width, five body heights, exact excavated rock.',
        'railsInUpperMesh':sum('rail' in name for name in groups['upper'][1])}
out=ROOT/'work/world/mogao-upper-v002-stair-clearance.json';out.write_text(json.dumps(report,indent=2)+'\n')
summary=[]
for item in results:
    summary.append({key:item[key] for key in ['surface','sampleCount','bodyHitCount','rockInsideCount','minimumHeadroom']})
print(json.dumps(summary,indent=2))
assert report['railsInUpperMesh']==0, 'New rail geometry is forbidden'
assert all(item['rockInsideCount']==0 for item in results), 'Rock enters the walkable body area'
assert all(not item['headroomFailures'] for item in results), 'Less than 1.85m real headroom'
assert all(not item['nonTreadOrRailContacts'] for item in results), 'Unexpected structure touches the body capsule'
print('UPPER_V002_CLEARANCE_PASSED',flush=True)
