"""Targeted real-mesh capsule/headroom audit for the upper stair flights."""
import bpy,json,math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
L=json.loads((ROOT/'src/content/world/mogao-upper-v001.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
groups={}
def import_meshes(name):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/world/mogao-upper/v001/{name}.glb'))
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
    if surf['id'] not in ['flight-5','flight-6','landing-6','flight-7']:continue
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
floor=12.91;z=-29.8+(floor-10.9775)/2.8675*5.6
origin=p(20.3,floor+1.65,z)
example=[]
for group,(tree,owners) in groups.items():
    loc,n,idx,d=tree.ray_cast(origin,Vector((0,-1,0)),8)
    if loc is not None:example.append({'group':group,'object':owners[idx],'distance':d,'localHit':[loc.x,loc.z,-loc.y]})
report={'surfaces':results,'reportedHeight':floor,'reportedCenter':[20.3,floor,z],
        'forwardCameraRockRay':example,'scope':'Real GLB meshes, full usable width and five body heights. Side handrail contact at extreme edges is reported, not silently ignored.'}
out=ROOT/'work/world/mogao-upper-v001-stair-clearance.json';out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
