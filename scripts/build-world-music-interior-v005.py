"""Local v005 finish/guardrail fixes derived directly from the stable v004.

Blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v005.py
No previous build script is executed and no previous output is overwritten.
"""
import bpy,bmesh,hashlib,json,math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-interior/v004/music-pavilion.blend'
DEST=ROOT/'art-source/world/models/music-interior/v005'
OUT=ROOT/'public/assets/world/music-interior/v005'
LAYOUT=ROOT/'src/content/world/music-interior-v003.json'
SOLIDS=ROOT/'src/content/world/music-interior-solids-v003.json'
for p in (DEST,OUT):p.mkdir(parents=True,exist_ok=True)
protected_paths=[ROOT/f'{base}/music-interior/v{v:03}/music-pavilion.{ext}' for v in (1,2,3,4)
                 for base,ext in [('art-source/world/models','blend'),('public/assets/world','glb')]]
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected_paths}
layout=json.loads(LAYOUT.read_text());rails=layout['guardrails']
F1,F2,REAR,ASPECT=1.8,7.915375,-32.175,1013/97
assert len(rails)==2
expected=[([46.18,F2,-28.425],[46.27,F2+1.05,-21.85]),([44.7801,F2,-21.94],[46.27,F2+1.05,-21.85])]
for rail,(lo,hi) in zip(rails,expected):assert rail['min']==lo and all(abs(a-b)<1e-7 for a,b in zip(rail['max'],hi)),rail
oldsolids=json.loads((ROOT/'src/content/world/music-interior-solids-v002.json').read_text())
soliddata={**oldsolids,'version':'music-interior-solids-v003','derivedFrom':'music-interior-solids-v002',
           'geometryAsset':'music-interior/v005/music-pavilion.glb',
           'solids':oldsolids['solids']+[{'id':r['id'],'min':r['min'],'max':r['max']} for r in rails]}
SOLIDS.write_text(json.dumps(soliddata,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)
         and not any(o.get(k) for k in ('excludeV4','excludeV5','excludeV004'))]
new=[];removed=[];decor=[]
def src(p):return Vector((p.x+46,p.z,-p.y-9))
def bp(p):return Vector((p[0]-46,-p[2]-9,p[1]))
def bounds(ps):return ([min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)])
def digest(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode());uv=o.data.uv_layers.active
    for lp,vi in zip(f.loop_indices,f.vertices):
        h.update(','.join(f'{x:.6f}' for x in src(o.matrix_world@o.data.vertices[vi].co)).encode())
        if uv:h.update(','.join(f'{x:.6f}' for x in uv.data[lp].uv).encode())
    return h.hexdigest()
baseline={o.name:Counter(digest(o,f) for f in o.data.polygons) for o in objects}
def discard(o):
    objects.remove(o);o['excludeV005']=True;o.hide_set(True);o.hide_render=True
    removed.append({'name':o.name,'reason':'ground skirt continuation'});baseline.pop(o.name)
def parts(o):
    parent=list(range(len(o.data.vertices)))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for e in o.data.edges:a,b=map(find,e.vertices);parent[a]=b
    result={}
    for v in o.data.vertices:result.setdefault(find(v.index),[]).append(v)
    return list(result.values())
materials={k:bpy.data.materials['music-decor-'+k] for k in ('wainscot','cinnabar','ochre','wood','floral')}
def metric(o):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='MusicMetreUV')
    for f in o.data.polygons:
        ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices];n=(ps[1]-ps[0]).cross(ps[2]-ps[0]).normalized()
        for lp,p in zip(f.loop_indices,ps):uv.data[lp].uv=(p.x,p.z) if abs(n.y)>.5 else (p.x,p.y) if abs(n.z)>.5 else (p.z,p.y)
def mesh(name,ps,faces,key,group,uvs=None):
    data=bpy.data.meshes.new(name);data.from_pydata([bp(p) for p in ps],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(materials[key]);o['semanticGroup']=group;new.append(o)
    if uvs:
        uv=o.data.uv_layers.new(name='FloralAspectUV')
        for lp,co in zip(o.data.polygons[0].loop_indices,uvs):uv.data[lp].uv=co
    else:metric(o)
    return o
def box(name,lo,hi,key='cinnabar',group='music-interior-guardrail'):
    x,y,z=lo;a,b,c=hi
    return mesh(name,[(x,y,z),(a,y,z),(a,b,z),(x,b,z),(x,y,c),(a,y,c),(a,b,c),(x,b,c)],
                [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],key,group)
def plane(name,ps,key,uv=None):
    o=mesh(name,ps,[tuple(range(len(ps)))],key,'music-decoration-trim' if key!='wainscot' else 'music-decoration-wall',uv)
    o['decorationOnly']=True;o['maximumProjectionMetres']=.025
    decor.append({'id':name,'min':bounds(ps)[0],'max':bounds(ps)[1],'material':materials[key].name});return o

# Extend all four low strips to the actual stair soffit instead of ending at the
# upper-landing X. The hidden end is clipped in geometry, so a horizontal flower
# strip never crosses or duplicates the sloped flower strip near the stair foot.
for o in list(objects):
    if o.name.startswith('rear-under-upper-'):discard(o)
def soffit(x):return F1+(F2-F1)*(55.69-x)/9.42-.32-.006
def clip_under_stair(ps):
    result=[]
    # Apply y <= sloped soffit only to the zone x>=46.27. At x<46.27
    # the same mathematical half-plane is far above all these ground bands.
    for i,a in enumerate(ps):
        b=ps[(i+1)%len(ps)];da=a[1]-soffit(a[0]);db=b[1]-soffit(b[0])
        if da<=0:result.append(a)
        if (da<=0)!=(db<=0):
            t=da/(da-db);result.append(tuple(a[k]+t*(b[k]-a[k]) for k in range(3)))
    return result
for tag,h0,h1,key in [('wainscot',.015,.75,'wainscot'),('red-line',.75,.785,'cinnabar'),('ochre-line',.785,.805,'ochre'),('low-floral',.83,.95,'floral')]:
    ps=clip_under_stair([(34.78,F1+h0,REAR+.013),(55.69,F1+h0,REAR+.013),(55.69,F1+h1,REAR+.013),(34.78,F1+h1,REAR+.013)])
    uv=[((p[0]-34.78)/((h1-h0)*ASPECT),(p[1]-F1-h0)/(h1-h0)) for p in ps] if key=='floral' else None
    plane('rear-ground-continuous-'+tag,ps,key,uv)

# Existing rear/grade skirt is already correct. Add the missing same-height
# flower cap on the full west wall, extending to the inside rear-wall corner.
z0,z1=REAR+.014,-18.24;bottom,top=F2+.83,F2+.95;x=34.7775
ps=[(x,bottom,z0),(x,bottom,z1),(x,top,z1),(x,top,z0)];ps.reverse()
uv=[(0,0),((z1-z0)/(.12*ASPECT),0),((z1-z0)/(.12*ASPECT),1),(0,1)];uv.reverse()
plane('west-upper-low-floral',ps,'floral',uv)
def flat_flower(name,axis,fixed,start,end,normal):
    bottom,top=F1+.83,F1+.95
    if axis=='x':ps=[(start,bottom,fixed),(end,bottom,fixed),(end,top,fixed),(start,top,fixed)];reverse=normal<0
    else:ps=[(fixed,bottom,start),(fixed,bottom,end),(fixed,top,end),(fixed,top,start)];reverse=normal>0
    uv=[(0,0),((end-start)/(.12*ASPECT),0),((end-start)/(.12*ASPECT),1),(0,1)]
    if reverse:ps.reverse();uv.reverse()
    plane(name,ps,'floral',uv)
flat_flower('west-ground-low-floral','z',34.7775,REAR+.013,-18.24,1)
flat_flower('east-ground-low-floral','z',59.4093,REAR+.013,-18.24,-1)
flat_flower('mural-rear-low-floral','x',-18.24,45.01,59.4093,-1)

# Remove only the original 17 raised/bevelled gallery finish boards. The old
# bearing slab and seated musicians remain intact. New finish is exactly F2,
# shared with the back-hall finish and the full-width former-wall threshold.
porch=next(o for o in objects if o.name=='porch--wood-light');selected=set();board_records=[]
for component in parts(porch):
    a,b=bounds([src(porch.matrix_world@v.co) for v in component])
    if 7.878<a[1]<7.881 and 7.914<b[1]<7.917 and a[2]>-21.802 and b[2]<-17.898:
        selected.update(v.index for v in component);board_records.append({'min':a,'max':b})
assert len(board_records)==17,('Original gallery board count',len(board_records))
deleted=Counter(digest(porch,f) for f in porch.data.polygons if any(i in selected for i in f.vertices))
baseline[porch.name]-=deleted
bm=bmesh.new();bm.from_mesh(porch.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in selected],context='VERTS');bm.to_mesh(porch.data);bm.free();porch.data.update()
box('music-gallery-flat-finish',[34.4725,7.89,-21.8],[44.7801404494,F2,-17.65],'wood','music-interior-floor')

# Two real, low timber lattice guardrails on the measured Z-shaped open edge.
# All pieces stay within shared guardrail bounds; the 3.6m stair mouth is open.
def ppanel(axis,fixed,u,y,v):return (u,y,fixed+v) if axis=='x' else (fixed+v,y,u)
def member(name,a,b,width,depth,axis,fixed,key='wood'):
    du,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(du,dy)
    if length<.01:return
    nu,ny=-dy/length*width/2,du/length*width/2
    points=[(a[0]+nu,a[1]+ny),(b[0]+nu,b[1]+ny),(b[0]-nu,b[1]-ny),(a[0]-nu,a[1]-ny)]
    ps=[ppanel(axis,fixed,u,y,v) for v in (-depth/2,depth/2) for u,y in points]
    return mesh(name,ps,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],key,'music-interior-guardrail')
def diamond_bay(name,a,b,axis,fixed):
    left,right=a+.075,b-.075;lo,hi=F2+.20,F2+.92
    for sign in (-1,1):
        c0=lo-right if sign==1 else lo+left;c1=hi-left if sign==1 else hi+right
        for i in range(math.ceil((c1-c0)/.42)+1):
            c=c0+i*.42;points=[]
            for u in (left,right):
                y=sign*u+c
                if lo<=y<=hi:points.append((u,y))
            for y in (lo,hi):
                u=(y-c)/sign
                if left<=u<=right:points.append((u,y))
            uniq=[]
            for p in points:
                if not any(math.dist(p,q)<1e-6 for q in uniq):uniq.append(p)
            if len(uniq)==2:member(name+'-diamond',uniq[0],uniq[1],.028,.046,axis,fixed)
def rail_run(name,axis,fixed,start,end,skip_last_post=False):
    # Posts are .09m deep. Rails are recessed, preventing coplanar face overlap.
    count=math.ceil((end-start)/.85);centres=[start+(end-start)*i/count for i in range(count+1)]
    for u in centres[:-1] if skip_last_post else centres:
        if axis=='x':box(name+'-post',[u-.045,F2,fixed-.045],[u+.045,F2+1.015,fixed+.045])
        else:box(name+'-post',[fixed-.045,F2,u-.045],[fixed+.045,F2+1.015,u+.045])
    for a,b in zip(centres,centres[1:]):diamond_bay(name,a,b,axis,fixed)
    return centres
east=rail_run('music-upper-guardrail-east','z',46.225,-28.380,-21.895)
front=rail_run('music-upper-guardrail-front','x',-21.895,44.8251,46.225,True)
# The L corner is shared, never duplicate a cap or rail top face there.
for y0,y1 in [(F2+.97,F2+1.05),(F2+.115,F2+.18)]:
    box('music-upper-guardrail-east-rail',[46.1875,y0,-28.425],[46.2625,y1,-21.94])
    box('music-upper-guardrail-front-rail',[44.7801,y0,-21.94],[46.27,y1,-21.85])

for o in new:
    if o.get('semanticGroup') in ('music-interior-guardrail','music-interior-floor'):
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();o.data.update()
for o in objects:assert Counter(digest(o,f) for f in o.data.polygons)==baseline[o.name],('Unrelated original face changed',o.name)
objects+=new
def bvh(obs):
    vs=[];fs=[];graph=bpy.context.evaluated_depsgraph_get()
    for o in obs:
        ev=o.evaluated_get(graph);data=ev.to_mesh();off=len(vs);vs.extend(src(o.matrix_world@v.co) for v in data.vertices);fs.extend(tuple(off+i for i in f.vertices) for f in data.polygons);ev.to_mesh_clear()
    return BVHTree.FromPolygons(vs,fs,all_triangles=False)
tree=bvh(objects)
def ray(p,d,length):return tree.ray_cast(Vector(p),Vector(d),length)[0]
for x in (35.7,38.5,40.8,43.4):
    for z in (-22.1,-21.95,-21.875,-21.8,-21.7):
        hit=ray((x,F2+.10,z),(0,-1,0),.25);assert hit is not None and abs(hit.y-F2)<.001,('Level gallery seam',x,z,hit)
for z in (-31.7,-30.225,-28.7):assert ray((46.0,F2+.55,z),(1,0,0),.60) is None,('Stair mouth blocked',z)
assert ray((45.9,F2+.99,-25),(1,0,0),.6) is not None,'East top handrail missing'
assert ray((45.2,F2+.99,-22.3),(0,0,1),.6) is not None,'Front top handrail missing'
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in objects:
    data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
    cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy();group=o.get('semanticGroup','architecture');cp['semanticGroup']=group;cp['decorationOnly']=bool(o.get('decorationOnly',False));batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(cp);o.select_set(False)
exported=[]
for (group,mats),items in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    o=bpy.context.object;o.name=group+'--'+mats[0];exported.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in exported:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
manifest={'version':'music-interior-v005','source':str(SOURCE.relative_to(ROOT)),'layout':str(LAYOUT.relative_to(ROOT)),
          'runtimeAsset':'music-interior/v005/music-pavilion.glb','runtimeOrigin':[46,0,-9],
          'protectedSourceHashes':hashes,'allUnrelatedSourceFacesUnchanged':True,
          'protectedOriginalFaces':sum(sum(v.values()) for v in baseline.values()),
          'removedGalleryBoards':board_records,'galleryLevelY':F2,'galleryFinishBottomY':7.89,
          'guardrails':rails,'guardrailHeightMetres':1.05,'stairMouthRetained':True,
          'groundBands':'Horizontal to actual sloped soffit; no exposed abrupt end and no duplicate flower band at foot',
          'westUpperLowFloralY':[F2+.83,F2+.95],'groundLowFloralY':[F1+.83,F1+.95],'floralAspect':ASPECT,'floralUVPreserved':True,
          'removedDecoration':removed,'newDecoration':decor,'sourceRaysPassed':True,'meshBatches':len(exported),
          'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V005_EXPORTED',manifest['bytes'],manifest['sha256'],'guardrails',len(rails),'boards',len(board_records))
