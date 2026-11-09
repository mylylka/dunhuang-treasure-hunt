"""Read-only v005 acceptance: old faces, true rails, flowers and flat seam.
Blender -b --python-exit-code 1 --python scripts/verify-world-music-interior-v005.py
"""
import bpy,hashlib,json,math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'art-source/world/models/music-interior/v005'
manifest=json.loads((DEST/'export-manifest.json').read_text());ASPECT=1013/97;F2=7.915375
def src(p):return Vector((p.x+46,p.z,-p.y-9))
def visible():return [o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)
    and not any(o.get(k) for k in ('excludeV4','excludeV5','excludeV004','excludeV005'))]
def facehash(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode());uv=o.data.uv_layers.active
    for lp,vi in zip(f.loop_indices,f.vertices):
        h.update(','.join(f'{x:.6f}' for x in src(o.matrix_world@o.data.vertices[vi].co)).encode())
        if uv:h.update(','.join(f'{x:.6f}' for x in uv.data[lp].uv).encode())
    return h.hexdigest()
def original_sigs(path,old=False):
    bpy.ops.wm.open_mainfile(filepath=str(path));result={}
    for o in visible():
        if o.name.startswith('rear-under-upper-'):continue
        keep=[]
        for f in o.data.polygons:
            ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices]
            if old and o.name=='porch--wood-light' and all(7.878<p.y<7.917 and -21.802<p.z<-17.898 for p in ps):continue
            keep.append(facehash(o,f))
        result[o.name]=Counter(keep)
    return result
before=original_sigs(ROOT/manifest['source'],True);after=original_sigs(DEST/'music-pavilion.blend')
assert all(after.get(k)==v for k,v in before.items()),[k for k,v in before.items() if after.get(k)!=v]
source_names=[o.name for o in visible()];assert not any(n.startswith('rear-under-upper-') for n in source_names)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in manifest['protectedSourceHashes'].items()),'Old source modified'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/world/music-interior/v005/music-pavilion.glb'))
objects=visible();vs=[];fs=[];rail_vs=[];rail_fs=[];flower_vs=[];flower_fs=[];flower_errors=[];material_counts=Counter()
for o in objects:
    points=[src(o.matrix_world@v.co) for v in o.data.vertices];off=len(vs);vs+=points;fs.extend(tuple(off+i for i in f.vertices) for f in o.data.polygons)
    if o.name.startswith('music-interior-guardrail'):
        off=len(rail_vs);rail_vs+=points;rail_fs.extend(tuple(off+i for i in f.vertices) for f in o.data.polygons)
    for f in o.data.polygons:
        mat=o.data.materials[f.material_index].name;material_counts[mat]+=1;ps=[points[i] for i in f.vertices]
        if mat.startswith('music-decor-'):
            assert o.data.uv_layers.active
            assert all(math.isfinite(v) for lp in f.loop_indices for v in o.data.uv_layers.active.data[lp].uv)
        if mat=='music-decor-floral':
            off=len(flower_vs);flower_vs+=ps;flower_fs.append(tuple(range(off,off+len(ps))))
            uv=[Vector(o.data.uv_layers.active.data[lp].uv) for lp in f.loop_indices]
            a,b=uv[1]-uv[0],uv[2]-uv[0];dp,dq=ps[1]-ps[0],ps[2]-ps[0];det=a.x*b.y-a.y*b.x;assert abs(det)>1e-10
            du=(dp*b.y-dq*a.y)/det;dv=(dq*a.x-dp*b.x)/det
            orth=abs(du.normalized().dot(dv.normalized()));ratio=du.length/dv.length
            assert orth<.002 and abs(ratio-ASPECT)<.025,('Flower distortion',orth,ratio)
            flower_errors.append([orth,abs(ratio-ASPECT)])
tree=BVHTree.FromPolygons(vs,fs,all_triangles=False);rail_tree=BVHTree.FromPolygons(rail_vs,rail_fs,all_triangles=False);flower_tree=BVHTree.FromPolygons(flower_vs,flower_fs,all_triangles=False)
def ray(p,d,l,t=tree):return t.ray_cast(Vector(p),Vector(d),l)[0]
checks=[]
def check(name,ok,detail=None):assert ok,(name,detail);checks.append(name)
for x in (35.7,38.5,40.8,43.4):
    for z in (-22.1,-21.95,-21.875,-21.8,-21.7,-20.5,-18.0):
        hit=ray((x,F2+.1,z),(0,-1,0),.25);check(f'flat-seam-{x}-{z}',hit is not None and abs(hit.y-F2)<.001,hit)
for z in (-31.7,-30.225,-28.7):check(f'open-stair-mouth-{z}',ray((46,F2+.55,z),(1,0,0),.6) is None)
for z in (-28.3,-26,-24,-22):check(f'east-handrail-{z}',ray((45.9,F2+.99,z),(1,0,0),.6,rail_tree) is not None)
for x in (44.9,45.2,45.8,46.2):check(f'front-handrail-{x}',ray((x,F2+.99,-22.3),(0,0,1),.6,rail_tree) is not None)
rails=json.loads((ROOT/'src/content/world/music-interior-v003.json').read_text())['guardrails']
def in_box(p,rail):return all(rail['min'][i]-1e-5<=p[i]<=rail['max'][i]+1e-5 for i in range(3))
check('rail-geometry-inside-shared-bounds',all(any(in_box(p,r) for r in rails) for p in rail_vs))
check('rail-height-1.05m',abs(max(p.y for p in rail_vs)-F2-1.05)<1e-5)
check('rail-ground-contact',abs(min(p.y for p in rail_vs)-F2)<1e-5)
check('no-stair-flight-railing',not any(p.z<-28.425-1e-5 for p in rail_vs))
air,total=0,0
for i in range(19):
    z=-28.1+i*5.9/18
    for j in range(9):
        total+=1
        if ray((45.95,F2+.25+j*.07,z),(1,0,0),.45,rail_tree) is None:air+=1
check('rail-real-openwork',.45<air/total<.95,air/total)
for x in (46.4,47.5,49,51.5,53.3):
    check(f'ground-rear-continued-flower-{x}',ray((x,2.69,-31.8),(0,0,-1),.5,flower_tree) is not None)
check('ground-rear-flower-hidden-under-low-stair',ray((54.3,2.69,-31.8),(0,0,-1),.5,flower_tree) is None)
for z in (-31.5,-28,-25,-22,-19):
    check(f'west-upper-flower-{z}',ray((35.0,F2+.89,z),(-1,0,0),.4,flower_tree) is not None)
    check(f'west-ground-flower-{z}',ray((35.0,2.69,z),(-1,0,0),.4,flower_tree) is not None)
    check(f'east-ground-flower-{z}',ray((59.1,2.69,z),(1,0,0),.5,flower_tree) is not None)
for x in (45.2,48,52,56,59.1):check(f'mural-back-ground-flower-{x}',ray((x,2.69,-18.5),(0,0,1),.4,flower_tree) is not None)
for x in (37,39.5,42.2):
    for y in (2.2,4.5,6.95):check(f'ground-door-{x}-{y}',ray((x,y,-20.8),(0,0,-1),2.5) is None)
for i in range(35):
    x=55.69-(i+.5)*9.42/35;y=1.8+(i+1)*(F2-1.8)/36;hit=ray((x,y+.15,-30.225),(0,-1,0),.3)
    check(f'tread-{i+1:02}',hit is not None and abs(hit.y-y)<.007,hit)
soliddata=json.loads((ROOT/'src/content/world/music-interior-solids-v003.json').read_text());byid={s['id']:s for s in soliddata['solids']}
for r in rails:check('shared-rail-solid-'+r['id'],byid[r['id']]['min']==r['min'] and byid[r['id']]['max']==r['max'])
check('all-floral-UV-aspect-and-orthogonal',len(flower_errors)>=26)
report={'passed':True,'checkCount':len(checks),'checks':checks,'sha256':hashlib.sha256((ROOT/'public/assets/world/music-interior/v005/music-pavilion.glb').read_bytes()).hexdigest(),
        'protectedOldFileCount':len(manifest['protectedSourceHashes']),'protectedOriginalFaceCount':sum(sum(v.values()) for v in before.values()),
        'railGeometryBounds':{'min':[min(p[i] for p in rail_vs) for i in range(3)],'max':[max(p[i] for p in rail_vs) for i in range(3)]},
        'railOpenworkAirRatio':air/total,'flowerTriangles':len(flower_errors),'flowerMaxOrthogonalityError':max(e[0] for e in flower_errors),
        'flowerMaxAspectError':max(e[1] for e in flower_errors),'galleryLevelY':F2,'removedRaisedBoardCount':len(manifest['removedGalleryBoards']),
        'materialTriangleCounts':dict(material_counts)}
(DEST/'verification-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('V005_FRESH_GLB_AUDIT_PASSED',len(checks),'checks','flower triangles',len(flower_errors),'old faces',report['protectedOriginalFaceCount'])
