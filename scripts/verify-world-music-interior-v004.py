"""Independent read-only source and fresh-GLB acceptance for the approved v004.

Blender -b --python-exit-code 1 --python scripts/verify-world-music-interior-v004.py
Only writes v004 verification-report.json, never saves an opened .blend.
"""
import bpy, hashlib, json, math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'art-source/world/models/music-interior/v004'
MANIFEST=DEST/'export-manifest.json'
manifest=json.loads(MANIFEST.read_text())
def src(p):return Vector((p.x+46,p.z,-p.y-9))
def visible():return [o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)
    and not any(o.get(k) for k in ('excludeV4','excludeV5','excludeV004'))]
def facehash(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode());uv=o.data.uv_layers.active
    for lp,vi in zip(f.loop_indices,f.vertices):
        h.update(','.join(f'{x:.6f}' for x in src(o.matrix_world@o.data.vertices[vi].co)).encode())
        if uv:h.update(','.join(f'{x:.6f}' for x in uv.data[lp].uv).encode())
    return h.hexdigest()
def art_signatures(path):
    bpy.ops.wm.open_mainfile(filepath=str(path));result={}
    for o in visible():
        if o.name in manifest['protectedFaceCounts']:result[o.name]=Counter(facehash(o,f) for f in o.data.polygons)
    return result
before=art_signatures(ROOT/manifest['source']);after=art_signatures(DEST/'music-pavilion.blend')
assert before==after,'An original human/porch artwork/UV changed'
source_names=[o.name for o in visible()]
assert not any(n.startswith(('music-ground-door-cut','music-upper-door-cut','upper-partition','ground-partition','ground-door-','upper-door-','divider-')) for n in source_names),'An old doorway/wall decoration remains visible'
assert len([n for n in source_names if n.startswith('stair-nosing-')])==35
assert not any(o.get('semanticGroup')=='music-interior-landing' for o in visible()),'Duplicate old landing box remains'
protected_ok=all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in manifest['protectedSourceHashes'].items())
assert protected_ok,'An old source or GLB file was changed'

# Discard source memory and test only actual exported triangles/material UVs.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/world/music-interior/v004/music-pavilion.glb'))
objects=visible();vs=[];fs=[];triangles=[];material_counts=Counter();floral_checks=[];landing_triangles=[]
for o in objects:
    off=len(vs);vs.extend(src(o.matrix_world@v.co) for v in o.data.vertices)
    for f in o.data.polygons:
        fs.append(tuple(off+i for i in f.vertices));ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices]
        mat=o.data.materials[f.material_index].name.replace('.001','');material_counts[mat]+=1
        triangles.append((o.name,ps,mat))
        if mat.startswith('music-decor-'):
            assert o.data.uv_layers.active,'Missing exported metre UV: '+mat
            for lp in f.loop_indices:assert all(math.isfinite(x) for x in o.data.uv_layers.active.data[lp].uv)
        if mat=='music-decor-floral':
            uv=[Vector(o.data.uv_layers.active.data[lp].uv) for lp in f.loop_indices]
            dp,dq=ps[1]-ps[0],ps[2]-ps[0];a,b=uv[1]-uv[0],uv[2]-uv[0]
            det=a.x*b.y-a.y*b.x;assert abs(det)>1e-10,'Degenerate flower UV'
            du=(dp*b.y-dq*a.y)/det;dv=(dq*a.x-dp*b.x)/det
            angle=abs(du.normalized().dot(dv.normalized()));aspect=du.length/dv.length
            assert angle<.002 and abs(aspect-1013/97)<.025,('Flower image stretched/sheared',angle,aspect)
            floral_checks.append({'orthogonalityError':angle,'aspect':aspect})
        if all(abs(p.y-1.8)<.0001 for p in ps):landing_triangles.append((o.name,ps,mat))
tree=BVHTree.FromPolygons(vs,fs,all_triangles=False)
def ray(p,d,length):return tree.ray_cast(Vector(p),Vector(d),length)[0]
court_vs=[];court_fs=[]
for name,ps,mat in triangles:
    if name.startswith('courtyard-enclosure'):
        off=len(court_vs);court_vs.extend(ps);court_fs.append(tuple(range(off,off+len(ps))))
court_tree=BVHTree.FromPolygons(court_vs,court_fs,all_triangles=False)
def court_ray(p,d,length):return court_tree.ray_cast(Vector(p),Vector(d),length)[0]
checks=[]
def check(name,ok,detail=None):
    assert ok,(name,detail);checks.append(name)
for x in (37,38.5,39.5,41,42.2):
    for y in (2.2,4.5,6.95):check(f'ground-open-{x}-{y}',ray((x,y,-20.8),(0,0,-1),2.5) is None)
for x in (35,36.5,38,40,42,44.5):
    for y in (8.7,10.5,12.8):check(f'upper-full-open-{x}-{y}',ray((x,y,-21.2),(0,0,-1),2) is None)
for x in (36,40,45.5):
    for z in (-31.8,-28,-22.3):
        hit=ray((x,8.15,z),(0,-1,0),.5);check(f'new-upper-floor-{x}-{z}',hit is not None and abs(hit.y-7.915375)<.001,hit)
for x in (35.2,39.5,44.3):
    hit=ray((x,8.15,-21.88),(0,-1,0),.5);check(f'full-seam-{x}',hit is not None and abs(hit.y-7.915375)<.001,hit)
for i in range(35):
    x=55.69-(i+.5)*9.42/35;y=1.8+(i+1)*(7.915375-1.8)/36
    hit=ray((x,y+.15,-30.225),(0,-1,0),.3);check(f'tread-{i+1:02}',hit is not None and abs(hit.y-y)<.007,hit)
for x in (39.1,39.6925,40):check(f'old-middle-column-absent-{x}',ray((x,3,-16.5),(0,0,-1),2) is None)
for x in (34.98,44.3325):check(f'neighbor-lower-column-retained-{x}',ray((x,3,-16.5),(0,0,-1),2) is not None)
check('upper-column-retained',ray((39.6925,9.5,-16.5),(0,0,-1),2) is not None)
for x in (36,40,50,58):
    check(f'expanded-ceiling-{x}',ray((x,13.4,-31.9),(0,1,0),.3) is not None)
    check(f'expanded-back-wall-{x}',ray((x,10,-31.5),(0,0,-1),1.5) is not None)
for x in (36,40,58):
    for y in (3.0,4.0):check(f'old-courtyard-wall-absent-{x}-{y}',ray((x,y,-27.8),(0,0,-1),1.8) is None)
for x in (30,47,65):
    hit=court_ray((x,1.2,-32.6),(0,0,-1),1.0)
    check(f'courtyard-wall-moved-{x}',hit is not None and abs(hit.z+32.835)<.03,hit)
for x in (24,70):check(f'side-court-extension-{x}',court_ray((x-.8,1.2,-30.7),(1,0,0),1.6) is not None)
# Preserve headroom under the upper stair half. The previous opening is shifted.
for x in (46.7,47.5,48.5,49):check(f'under-stair-{x}',ray((x,1.81,-30.225),(0,1,0),1.85) is None)

# Measure true air cells versus bars. A whole opaque panel cannot pass this.
air,total=0,0
for i in range(13):
    x=34.86+i*(1.55/12)
    for j in range(21):
        y=2.03+j*(4.90/20);total+=1
        if ray((x,y,-21.4),(0,0,-1),.8) is None:air+=1
check('fixed-grille-real-apertures',.55<air/total<.95,air/total)
check('fixed-grille-solid-stile',ray((34.74,4,-21.4),(0,0,-1),.8) is not None)
check('lamp-has-real-mount',ray((43.70,4.90,-22.05),(0,0,1),.5) is not None)
# Wood strips on the open leaves extend to the approved visual full height.
grille_ps=[p for name,ps,mat in triangles if 'music-interior-grille' in name for p in ps]
check('grille-top-below-slab',abs(max(p.y for p in grille_ps)-7.30)<.001)
check('grille-leaf-high-frame',ray((36.3,7.10,-20.2),(1,0,0),.5) is not None)

def inside2d(point,ps):
    # Convex exported triangle; samples avoid shared edges.
    px,pz=point;signs=[]
    for i,a in enumerate(ps):
        b=ps[(i+1)%len(ps)];signs.append((b.x-a.x)*(pz-a.z)-(b.z-a.z)*(px-a.x))
    return all(v>1e-6 for v in signs) or all(v<-1e-6 for v in signs)
landing_samples=[]
for x,z in ((55.91,-31.7),(56.47,-31.1),(57.13,-30.7),(57.67,-29.5),(56.29,-28.8)):
    owners=[name for name,ps,mat in landing_triangles if inside2d((x,z),ps)]
    check(f'single-landing-skin-{x}-{z}',len(owners)==1,owners);landing_samples.append({'x':x,'z':z,'owners':owners})
check('original-flower-proportion',len(floral_checks)>10)
roof_ps=[p for name,ps,mat in triangles if name.startswith('main-roof') and mat=='tile' for p in ps]
roof_bounds={'min':[min(p[i] for p in roof_ps) for i in range(3)],'max':[max(p[i] for p in roof_ps) for i in range(3)]}
check('roof-covers-new-rear',roof_bounds['min'][2]<-33.5,roof_bounds)
check('front-eave-held',abs(roof_bounds['max'][2]+16.89)<.04,roof_bounds)
check('highest-roof-held',abs(roof_bounds['max'][1]-17.82665)<.01,roof_bounds)
solids=json.loads((ROOT/'src/content/world/music-interior-solids-v002.json').read_text())['solids']
ids=[s['id'] for s in solids];check('unique-solid-ids',len(ids)==len(set(ids)))
check('removed-wall-collision-absent',not any(i.startswith(('music-porch-back-','music-porch-door-lintel','music-gallery-rear-','music-gallery-door-lintel','music-porch-divider')) for i in ids))
check('old-middle-column-collision-absent','music-column-lower-1' not in ids and 'music-column-lower-foot-1' not in ids)
report={'passed':True,'assetSha256':hashlib.sha256((ROOT/'public/assets/world/music-interior/v004/music-pavilion.glb').read_bytes()).hexdigest(),
        'checks':checks,'checkCount':len(checks),'protectedFiles':len(manifest['protectedSourceHashes']),
        'originalProtectedFaces':sum(sum(v.values()) for v in before.values()),'originalProtectedObjects':len(before),
        'fixedGrilleAirRatio':air/total,'floralTriangleCount':len(floral_checks),
        'maximumFloralOrthogonalityError':max(v['orthogonalityError'] for v in floral_checks),
        'maximumFloralAspectError':max(abs(v['aspect']-1013/97) for v in floral_checks),
        'landingSingleSkinSamples':landing_samples,'deliveredRoofBounds':roof_bounds,'materialTriangleCounts':dict(material_counts)}
(DEST/'verification-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('V004_FRESH_GLB_AUDIT_PASSED',len(checks),'checks','grille air',round(air/total,3),'flower UV triangles',len(floral_checks),'protected faces',report['originalProtectedFaces'])
