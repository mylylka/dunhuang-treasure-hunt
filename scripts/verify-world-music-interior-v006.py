"""Independent source and fresh GLB checks for v006 local review repairs.
Blender -b --python-exit-code 1 --python scripts/verify-world-music-interior-v006.py
"""
import bpy,hashlib,json,math
from pathlib import Path
from collections import Counter
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'art-source/world/models/music-interior/v006';F2=7.915375;ASPECT=1013/97
m=json.loads((DEST/'export-manifest.json').read_text())
WEST_FACE_X,PORTAL_BACK_Z,FIRST_CEILING=34.7625,-21.85,7.426
def src(p):return Vector((p.x+46,p.z,-p.y-9))
def visible():return [o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices) and not any(o.get(k) for k in ('excludeV4','excludeV5','excludeV004','excludeV005','excludeV006'))]
def facehash(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode());uv=o.data.uv_layers.active
    corners=[(src(o.matrix_world@o.data.vertices[vi].co), tuple(uv.data[lp].uv) if uv else ())
             for lp,vi in zip(f.loop_indices,f.vertices)]
    if o.name=='architecture--plaster':
        # A wall bevel may acquire a collinear vertex where the new material
        # seam meets its edge. Check the original contour and UV corners.
        def is_corner(i):
            a=corners[i-1][0];p=corners[i][0];b=corners[(i+1)%len(corners)][0]
            return (p-a).cross(b-a).length/max((b-a).length,1e-9)>1e-5
        corners=[corner for i,corner in enumerate(corners) if is_corner(i)]
    records=[','.join(f'{x:.6f}' for x in (*p,*t)) for p,t in corners]
    start=min(range(len(records)),key=records.__getitem__)
    for record in records[start:]+records[:start]:h.update(record.encode())
    return h.hexdigest()
def sig(path):
    bpy.ops.wm.open_mainfile(filepath=str(path));result={}
    for o in visible():
        if o.name.startswith('west-ground-'):continue
        if o.name.startswith('music-grille-return'):continue
        if o.name.startswith(('music-grille-open-door-','music-grille-fixed-west','music-grille-fixed-east')) and '-diamond' in o.name:continue
        keep=[]
        for f in o.data.polygons:
            ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices]
            if o.name=='architecture--plaster' and all(abs(p.x-WEST_FACE_X)<1e-4 for p in ps):continue
            if o.name=='porch--wood-light' and all(-17.731<p.z<-17.648 and 7.914<p.y<9.254 for p in ps) and max(p.x for p in ps)-min(p.x for p in ps)<.10:continue
            keep.append(facehash(o,f))
        result[o.name]=Counter(keep)
    return result
before=sig(ROOT/m['source']);after=sig(DEST/'music-pavilion.blend')
assert all(after.get(k)==v for k,v in before.items()),[k for k,v in before.items() if after.get(k)!=v]
assert len(m['balusterSupports'])==18
assert not any('diamond' in o.name and o.get('semanticGroup')=='music-interior-grille' for o in visible()),'Old entrance diamond bars remain'
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in m['protectedSourceHashes'].items())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/world/music-interior/v006/music-pavilion.glb'))
objects=visible();groups={};triangles=[];floral_errors=[]
for o in objects:
    for f in o.data.polygons:
        ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices];mat=o.data.materials[f.material_index].name
        triangles.append((o.name,ps,mat))
        groups.setdefault(o.get('semanticGroup',o.name.split('--')[0]),[]).append((ps,mat))
        if mat=='music-decor-floral':
            uv=[Vector(o.data.uv_layers.active.data[lp].uv) for lp in f.loop_indices];a,b=uv[1]-uv[0],uv[2]-uv[0];dp,dq=ps[1]-ps[0],ps[2]-ps[0];det=a.x*b.y-a.y*b.x;assert abs(det)>1e-10
            du=(dp*b.y-dq*a.y)/det;dv=(dq*a.x-dp*b.x)/det;orth=abs(du.normalized().dot(dv.normalized()));ratio=du.length/dv.length
            assert orth<.002 and abs(ratio-ASPECT)<.025,('Flower image distortion',orth,ratio);floral_errors.append([orth,abs(ratio-ASPECT)])
def make_tree(items):
    vs=[];fs=[]
    for ps in items:off=len(vs);vs+=ps;fs.append(tuple(range(off,off+len(ps))))
    return BVHTree.FromPolygons(vs,fs,all_triangles=False)
tree=make_tree([ps for name,ps,mat in triangles]);railtree=make_tree([ps for name,ps,mat in triangles if name.startswith('porch--wood-light')]);supporttree=make_tree([ps for name,ps,mat in triangles if not name.startswith('porch--wood-light')]);flowertree=make_tree([ps for name,ps,mat in triangles if mat=='music-decor-floral'])
grilletree=make_tree([ps for name,ps,mat in triangles if name.startswith('music-interior-grille')]);returntree=make_tree([ps for name,ps,mat in triangles if name.startswith('music-entrance-wall')])
def ray(p,d,l,t=tree):return t.ray_cast(Vector(p),Vector(d),l)[0]
checks=[]
def check(name,ok,detail=None):assert ok,(name,detail);checks.append(name)
for x in (37,38.5,39.5,41,42.2):
    for y in (2.2,4.5,6.95):check(f'portal-open-{x}-{y}',ray((x,y,-20.8),(0,0,-1),2.5) is None)
for z in (-21.8,-20,-18.1):check(f'solid-return-{z}',ray((44.2,3,z),(1,0,0),1,returntree) is not None)
for x in (44.88,44.95,44.98):check(f'return-joins-original-mural-wall-{x}',ray((x,3,-18.5),(0,0,1),.7) is not None)
# Column support needs both a real rail bottom and a separate bearing floor top.
leg_errors=[]
for i in range(18):
    x=35.125+.52925*i;z=-17.69;a=ray((x,8.2,z),(0,-1,0),.4,railtree);b=ray((x,F2+.08,z),(0,-1,0),.2,supporttree)
    check(f'original-baluster-grounded-{i}',a is not None and abs(a.y-F2)<.001,a)
    check(f'original-baluster-supported-{i}',b is not None and abs(b.y-F2)<.001,b)
    leg_errors.append(max(abs(a.y-F2),abs(b.y-F2)))
# At these heights a vertical screen has the same solid/air mask, whereas the
# removed diagonal lattice necessarily changes mask with height.
masks=[]
for label,fixed,start,length,direction in [('fixed-west',-21.4,34.84,1.58,'z'),('left-door',36.2,-21.6,2.6,'x')]:
    mask=[]
    for i in range(23):
        u=start+length*i/22;states=[]
        for y in (3.2,4.2,5.2):
            p=(u,y,fixed) if direction=='z' else (fixed,y,u);d=(0,0,-1) if direction=='z' else (1,0,0)
            states.append(ray(p,d,.7,grilletree) is not None)
        check(f'vertical-bar-mask-{label}-{i}',len(set(states))==1,states);mask.append(states[0])
    check(f'actual-air-gaps-{label}',.1<sum(mask)/len(mask)<.8,mask);masks.append({'label':label,'solidRatio':sum(mask)/len(mask)})
for label,center,sign in [('left',36.525,1),('right',42.715,-1)]:
    near=ray((center-.1,4.2,-21.37),(1,0,0),.2,grilletree)
    far=ray((center+.1,4.2,-21.37),(-1,0,0),.2,grilletree)
    check(f'{label}-door-vertical-bar-depth',near is not None and far is not None and abs(far.x-near.x-.026)<.001)
    # At 76 degrees to the panel normal the earlier .052m bars overlapped in
    # projection. A ray centered between the narrower bars now stays open.
    direction=Vector((sign,0,4)).normalized()
    for label2,z,expect in [('gap',-21.2875,False),('bar',-21.37,True)]:
        hit=ray((center-sign*.1,4.2,z-.4),direction,.9,grilletree)
        check(f'{label}-door-oblique-{label2}',(hit is not None)==expect,hit)
fixed_near=ray((34.9585,4.2,-21.4),(0,0,-1),.7,grilletree)
fixed_far=ray((34.9585,4.2,-22.1),(0,0,1),.7,grilletree)
check('fixed-screen-bar-depth-held',fixed_near is not None and fixed_far is not None and abs(fixed_near.z-fixed_far.z-.052)<.001)
for name,ps,mat in triangles:
    if not name.startswith('music-entrance-wall'):continue
    c=sum(ps,Vector())/len(ps)
    if abs(c.x-44.44125)<1e-4:check('return-exterior-original-plaster',mat=='plaster',mat)
    if abs(c.x-44.992991573)<1e-4:check('return-interior-plaster',mat=='music-decor-plaster',mat)
check('west-upper-front-top-flower',ray((35,12.95,-18.1),(-1,0,0),.4,flowertree) is not None)
def hit_material(p,d,l):
    hit,_,index,_=tree.ray_cast(Vector(p),Vector(d),l)
    return hit,triangles[index][2] if index is not None else None
for z in (-21.65,-20.8,-19.3,-18.2):
    for y in (2,2.69,4.8,6.9):
        hit,material=hit_material((35.1,y,z),(-1,0,0),.5)
        check(f'west-exterior-porch-original-plaster-{z}-{y}',
              hit is not None and abs(hit.x-WEST_FACE_X)<.001 and material=='plaster',material)
for z in (-31,-25,-22,-21.9):
    for y,expected in ((2,'music-decor-wainscot'),(2.69,'music-decor-floral'),
                       (4.8,'music-decor-plaster'),(6.9,'music-decor-floral')):
        hit,material=hit_material((35.1,y,z),(-1,0,0),.5)
        check(f'west-interior-finish-continues-{z}-{y}',hit is not None and material==expected,material)
for z in (-25,-20.8,-18.2):
    _,material=hit_material((35.1,10,z),(-1,0,0),.5)
    check(f'west-upper-material-preserved-{z}',material=='music-decor-plaster',material)
west_ground_decor=[p for _,ps,mat in triangles
    if mat.startswith('music-decor-') and all(abs(p.x-34.7775)<1e-4 and p.y<FIRST_CEILING for p in ps) for p in ps]
check('west-ground-finish-stops-at-door-back',bool(west_ground_decor) and abs(
    max(p.z for p in west_ground_decor)-PORTAL_BACK_Z)<1e-4)
check('mural-left-top-flower',ray((44.95,12.95,-18.5),(0,0,1),.4,flowertree) is not None)
check('return-interior-top-flower',ray((45.2,6.9,-20),(-1,0,0),.4,flowertree) is not None)
for x in (35.2,38,41,44,46.1):check(f'visible-low-ceiling-rear-crown-{x}',ray((x,6.9,-31.8),(0,0,-1),.5,flowertree) is not None)
check('low-crown-stops-before-stair-void',ray((47,6.9,-31.8),(0,0,-1),.5,flowertree) is None)
for x in (35.7,38.5,40.8,43.4):
    for z in (-22.1,-21.875,-21.7):
        hit=ray((x,F2+.1,z),(0,-1,0),.25);check(f'flat-gallery-{x}-{z}',hit is not None and abs(hit.y-F2)<.001,hit)
for z in (-31.7,-30.225,-28.7):check(f'open-stair-mouth-{z}',ray((46,F2+.55,z),(1,0,0),.6) is None)
for i in range(35):
    x=55.69-(i+.5)*9.42/35;y=1.8+(i+1)*(F2-1.8)/36;hit=ray((x,y+.15,-30.225),(0,-1,0),.3);check(f'tread-{i+1:02}',hit is not None and abs(hit.y-y)<.007)
for x in (39.1,39.6925,40):check(f'removed-column-stays-absent-{x}',ray((x,3,-16.5),(0,0,-1),2) is None)
solids=json.loads((ROOT/'src/content/world/music-interior-solids-v004.json').read_text())['solids'];ids=[s['id'] for s in solids]
check('unique-solid-ids',len(ids)==len(set(ids)))
check('original-gallery-railing-collision-present','music-original-gallery-front-railing' in ids)
report={'passed':True,'checks':checks,'checkCount':len(checks),'sha256':hashlib.sha256((ROOT/'public/assets/world/music-interior/v006/music-pavilion.glb').read_bytes()).hexdigest(),
        'oldFileCountProtected':len(m['protectedSourceHashes']),'unrelatedOriginalFacesProtected':sum(sum(v.values()) for v in before.values()),
        'groundedOriginalBalusters':18,'maximumBalusterSupportHeightError':max(leg_errors),'verticalScreenMasks':masks,
        'floralTriangleCount':len(floral_errors),'maximumFloralAspectError':max(e[1] for e in floral_errors),'maximumFloralOrthogonalityError':max(e[0] for e in floral_errors)}
(DEST/'verification-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
evidence=ROOT/'work/world/music-interior-review-v004';evidence.mkdir(parents=True,exist_ok=True)
(evidence/'model-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('V006_FRESH_GLB_AUDIT_PASSED',len(checks),'checks','balusters',18,'old faces',report['unrelatedOriginalFacesProtected'])
