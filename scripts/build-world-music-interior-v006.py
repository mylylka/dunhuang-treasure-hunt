"""v006 local entrance, original balcony support and cornice repair.
Blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v006.py
Directly reads v005; never executes/overwrites any previous version's build.
"""
import bpy,bmesh,hashlib,json,math
from pathlib import Path
from collections import Counter
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-interior/v005/music-pavilion.blend'
DEST=ROOT/'art-source/world/models/music-interior/v006';OUT=ROOT/'public/assets/world/music-interior/v006'
LAYOUT=ROOT/'src/content/world/music-interior-v004.json';SOLIDS=ROOT/'src/content/world/music-interior-solids-v004.json'
FIXED_SIDE_STYLE='vertical'
F1,F2,ASPECT=1.8,7.915375,1013/97
WEST_FACE_X,PORTAL_BACK_Z,FIRST_CEILING=34.7625,-21.85,7.426
for p in (DEST,OUT):p.mkdir(parents=True,exist_ok=True)
paths=[ROOT/f'{base}/music-interior/v{v:03}/music-pavilion.{ext}' for v in (1,2,3,4,5) for base,ext in [('art-source/world/models','blend'),('public/assets/world','glb')]]
paths += [ROOT/'public/assets/world/traveler-tripo/v002/traveler.glb',ROOT/'art-source/world/models/traveler-tripo/v002/traveler.blend',ROOT/'public/assets/world/courtyard/v002/wall-floral-border.jpg']
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices) and not any(o.get(k) for k in ('excludeV4','excludeV5','excludeV004','excludeV005'))]
new=[];removed=[];modified=[];decor=[]
def src(p):return Vector((p.x+46,p.z,-p.y-9))
def bp(p):return Vector((p[0]-46,-p[2]-9,p[1]))
def bounds(ps):return ([min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)])
def facehash(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode());uv=o.data.uv_layers.active
    corners=[(src(o.matrix_world@o.data.vertices[vi].co), tuple(uv.data[lp].uv) if uv else ())
             for lp,vi in zip(f.loop_indices,f.vertices)]
    if o.name=='architecture--plaster':
        # The local material cut adds collinear vertices to neighbouring bevel
        # edges. Compare the actual contour and original UV corners.
        def is_corner(i):
            a=corners[i-1][0];p=corners[i][0];b=corners[(i+1)%len(corners)][0]
            return (p-a).cross(b-a).length/max((b-a).length,1e-9)>1e-5
        corners=[corner for i,corner in enumerate(corners) if is_corner(i)]
    records=[','.join(f'{x:.6f}' for x in (*p,*t)) for p,t in corners]
    start=min(range(len(records)),key=records.__getitem__)
    for record in records[start:]+records[:start]:h.update(record.encode())
    return h.hexdigest()
def west_wall_face(o,face):
    return o.name=='architecture--plaster' and all(
        abs(src(o.matrix_world@o.data.vertices[i].co).x-WEST_FACE_X)<1e-4 for i in face.vertices)
def protected_faces(o):
    return Counter(facehash(o,f) for f in o.data.polygons if not west_wall_face(o,f))
baseline={o.name:protected_faces(o) for o in objects}
def discard(o,reason):
    objects.remove(o);o['excludeV006']=True;o.hide_set(True);o.hide_render=True;baseline.pop(o.name)
    removed.append({'name':o.name,'reason':reason})
def parts(o):
    p=list(range(len(o.data.vertices)))
    def find(i):
        while p[i]!=i:p[i]=p[p[i]];i=p[i]
        return i
    for e in o.data.edges:a,b=map(find,e.vertices);p[a]=b
    result={}
    for v in o.data.vertices:result.setdefault(find(v.index),[]).append(v)
    return list(result.values())
materials={k:bpy.data.materials['music-decor-'+k] for k in ('plaster','wainscot','cinnabar','wood','ochre','floral')}
def metric(o):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='MusicMetreUV')
    for f in o.data.polygons:
        ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices];n=(ps[1]-ps[0]).cross(ps[2]-ps[0]).normalized()
        for lp,p in zip(f.loop_indices,ps):uv.data[lp].uv=(p.x,p.z) if abs(n.y)>.5 else (p.x,p.y) if abs(n.z)>.5 else (p.z,p.y)
def mesh(name,ps,faces,key,group,uvs=None):
    data=bpy.data.meshes.new(name);data.from_pydata([bp(p) for p in ps],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(bpy.data.materials[key[7:]] if key.startswith('legacy:') else materials[key]);o['semanticGroup']=group;new.append(o)
    if uvs:
        uv=o.data.uv_layers.new(name='FloralAspectUV')
        for lp,co in zip(o.data.polygons[0].loop_indices,uvs):uv.data[lp].uv=co
    else:metric(o)
    return o
def box(name,lo,hi,key='cinnabar',group='music-entrance-review'):
    x,y,z=lo;a,b,c=hi
    return mesh(name,[(x,y,z),(a,y,z),(a,b,z),(x,b,z),(x,y,c),(a,y,c),(a,b,c),(x,b,c)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],key,group)
def strip(name,axis,fixed,start,end,bottom,top,key,normal,phase_start=None):
    if axis=='x':ps=[(start,bottom,fixed),(end,bottom,fixed),(end,top,fixed),(start,top,fixed)];reverse=normal<0
    else:ps=[(fixed,bottom,start),(fixed,bottom,end),(fixed,top,end),(fixed,top,start)];reverse=normal>0
    base=start if phase_start is None else phase_start
    uv=[((start-base)/((top-bottom)*ASPECT),0),((end-base)/((top-bottom)*ASPECT),0),((end-base)/((top-bottom)*ASPECT),1),((start-base)/((top-bottom)*ASPECT),1)] if key=='floral' else None
    if reverse:ps.reverse();uv=uv[::-1] if uv else None
    o=mesh(name,ps,[tuple(range(4))],key,'music-decoration-wall' if key=='wainscot' else 'music-decoration-trim',uv);o['decorationOnly']=True;o['maximumProjectionMetres']=.025
    decor.append({'id':name,'min':bounds(ps)[0],'max':bounds(ps)[1],'material':key});return o

# Split the actual west wall face into indoor, upper and lower porch regions.
# Only the ground porch region receives the original exterior plaster.
west_wall=next(o for o in objects if o.name=='architecture--plaster')
bm=bmesh.new();bm.from_mesh(west_wall.data)
matrix=west_wall.matrix_world
def is_west_panel(face):
    return all(abs(src(matrix@vertex.co).x-WEST_FACE_X)<1e-4 for vertex in face.verts)
panel,=[face for face in bm.faces if is_west_panel(face)]
old_area=panel.calc_area()
def cut_panel(face,point,normal):
    return bmesh.ops.bisect_plane(
        bm,geom=[face,*face.edges,*face.verts],dist=1e-6,
        plane_co=matrix.inverted()@bp(point),
        plane_no=matrix.to_3x3().transposed()@Vector(normal))
cut_panel(panel,(WEST_FACE_X,F1,PORTAL_BACK_Z),(0,1,0))
front,=[face for face in bm.faces if is_west_panel(face) and all(
    src(matrix@v.co).z>=PORTAL_BACK_Z-1e-5 for v in face.verts)]
cut_panel(front,(WEST_FACE_X,FIRST_CEILING,PORTAL_BACK_Z),(0,0,1))
panels=[face for face in bm.faces if is_west_panel(face)]
assert len(panels)==3 and abs(sum(f.calc_area() for f in panels)-old_area)<1e-4
porch_panel,=[face for face in panels if all(
    (p:=src(matrix@v.co)).z>=PORTAL_BACK_Z-1e-5 and p.y<=FIRST_CEILING+1e-5 for v in face.verts)]
porch_panel.material_index=west_wall.data.materials.find('plaster')
bm.to_mesh(west_wall.data);bm.free();west_wall.data.update()
modified.append({'object':west_wall.name,'reason':'west ground porch uses original exterior plaster',
                 'x':WEST_FACE_X,'startZ':PORTAL_BACK_Z,'topY':FIRST_CEILING})

# Keep the original west ground decoration and flower phase up to the inside
# of the grille. Its exterior continuation is cut at the real door plane.
for o in list(objects):
    if not o.name.startswith('west-ground-'):continue
    lo,hi=bounds([src(o.matrix_world@v.co) for v in o.data.vertices])
    assert len(o.data.polygons)==1 and hi[2]>PORTAL_BACK_Z
    key=o.data.materials[0].name.removeprefix('music-decor-')
    strip('west-interior-'+o.name.removeprefix('west-ground-'),'z',lo[0],lo[2],PORTAL_BACK_Z,
          lo[1],hi[1],key,1)
    discard(o,'west ground decor ends behind the entrance screen')

# Only the return becomes masonry. The two front fixed screens and opened leaves
# share fine vertical bars, retaining the exact clear portal and open-leaf bounds.
for o in list(objects):
    if o.name.startswith('music-grille-return'):discard(o,'replace side return with continuous architectural wall')
    elif o.name.startswith(('music-grille-open-door-','music-grille-fixed-west','music-grille-fixed-east')) and '-diamond' in o.name:discard(o,'diamond lattice replaced by vertical timber bars')
def vertical_screen(name,width,start,axis,fixed,depth=.052):
    count=max(2,round((width-.2)/.18));pitch=(width-.2)/(count+1)
    for i in range(1,count+1):
        u=.1+i*pitch;half=.018
        if axis=='x':lo=[start+u-half,1.93,fixed-depth/2];hi=[start+u+half,7.05,fixed+depth/2]
        else:lo=[fixed-depth/2,1.93,start+u-half];hi=[fixed+depth/2,7.05,start+u+half]
        box(name+'-vertical-bar',lo,hi,'wood','music-interior-grille')
vertical_screen('music-grille-fixed-west',1.885,34.69,'x',-21.8)
vertical_screen('music-grille-fixed-east',1.885,42.665,'x',-21.8)
vertical_screen('music-grille-open-door-left',3.005,-21.8,'z',36.525,depth=.026)
vertical_screen('music-grille-open-door-right',3.005,-21.8,'z',42.715,depth=.026)

# Original-width return wall closes the former thin-screen corner gap. The porch
# side is original exterior plaster; only the hall-facing east/rear faces receive
# interior plaster and decoration. Its front embeds into the real mural wall.
RETURN_LO=[44.44125,F1,-21.975];RETURN_HI=[44.992991573,7.426,-17.95]
wall=box('music-entrance-solid-return',RETURN_LO,RETURN_HI,'legacy:plaster','music-entrance-wall')
wall.data.materials.append(materials['plaster'])
for f in wall.data.polygons:
    ps=[src(wall.matrix_world@wall.data.vertices[i].co) for i in f.vertices];c=sum(ps,Vector())/len(ps)
    if abs(c.x-RETURN_HI[0])<.001 or abs(c.z-RETURN_LO[2])<.001:f.material_index=1
for label,axis,fixed,a,b,normal in [('hall','z',RETURN_HI[0]+.014,-21.975,-18.24,1),('rear','x',-21.989,44.44125,44.992991573,-1)]:
    for tag,h0,h1,key in [('wainscot',.015,.75,'wainscot'),('red-line',.75,.785,'cinnabar'),('ochre-line',.785,.805,'ochre'),('low-floral',.83,.95,'floral')]:strip('return-inside-'+label+'-'+tag,axis,fixed,a,b,F1+h0,F1+h1,key,normal)
    strip('return-inside-'+label+'-top-floral',axis,fixed,a,b,6.82,7.04,'floral',normal)
    strip('return-inside-'+label+'-top-red',axis,fixed,a,b,7.05,7.12,'cinnabar',normal)

# The original front gallery railing's 18 balusters floated .409625m above the
# actual wood finish. Extend only their lower bevel rings to F2; top, rails,
# columns and seated figures keep their previous coordinates and materials.
porch=next(o for o in objects if o.name=='porch--wood-light');inv=porch.matrix_world.inverted();leg_records=[];modified_leg_ids=set()
for comp in parts(porch):
    ps=[src(porch.matrix_world@v.co) for v in comp];a,b=bounds(ps)
    if 8.324<a[1]<8.326 and 9.252<b[1]<9.254 and a[2]>-17.731 and b[2]<-17.648 and b[0]-a[0]<.10:
        ids={v.index for v in comp};modified_leg_ids.update(ids);oldfaces=Counter(facehash(porch,f) for f in porch.data.polygons if any(i in ids for i in f.vertices));baseline[porch.name]-=oldfaces
        for v,p in zip(comp,ps):
            if p.y<8.34:p.y+=F2-8.325;v.co=inv@bp(p)
        leg_records.append({'centerX':(a[0]+b[0])/2,'centerZ':(a[2]+b[2])/2,'oldBottomY':a[1],'newBottomY':F2,'topY':b[1]})
        modified.append({'object':porch.name,'reason':'baluster bottom reaches true gallery finish','oldMin':a,'oldMax':b})
porch.data.update();assert len(leg_records)==18,('Original supported balusters',len(leg_records))
# Add changed baluster faces back to the allowed expected signature.
for f in porch.data.polygons:
    if any(i in modified_leg_ids for i in f.vertices):baseline[porch.name][facehash(porch,f)]+=1

# Complete the few end lengths left from the older thick divider and the side
# wall/front-beam junction. Existing flowers and their phase are preserved.
strip('west-upper-front-cornice-completion','z',34.7775,-18.24,-18.01,12.86,13.08,'floral',1,-32.155)
strip('west-upper-front-cornice-red','z',34.7775,-18.24,-18.01,13.09,13.16,'cinnabar',1)
strip('mural-rear-left-cornice-completion','x',-18.24,44.88,45.01,12.86,13.08,'floral',-1,45.01)
strip('mural-rear-left-cornice-red','x',-18.24,44.88,45.01,13.09,13.16,'cinnabar',-1)
# The lower hall's true ceiling is the upper-floor slab, not the remote main
# roof. Its rear-wall crown must therefore be visible below y=7.426, ending at
# the slab edge so no decorative ribbon crosses the stair/void wall.
strip('rear-under-upper-visible-top-floral','x',-32.159,34.78,46.27,6.82,7.04,'floral',1)
strip('rear-under-upper-visible-top-red','x',-32.158,34.78,46.27,7.05,7.12,'cinnabar',1)

for o in new:
    if o.get('semanticGroup') in ('music-interior-grille','music-entrance-wall'):
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();o.data.update()
for o in objects:assert protected_faces(o)==baseline[o.name],('Unrelated original face changed',o.name)
objects+=new
oldsolids=json.loads((ROOT/'src/content/world/music-interior-solids-v003.json').read_text())
for s in oldsolids['solids']:
    if s['id']=='music-grille-return':s['min']=RETURN_LO;s['max']=RETURN_HI
oldsolids['solids'].append({'id':'music-original-gallery-front-railing','min':[34.7625,F2,-17.75],'max':[44.4775,9.2965,-17.63]})
soliddata={**oldsolids,'version':'music-interior-solids-v004','derivedFrom':'music-interior-solids-v003','geometryAsset':'music-interior/v006/music-pavilion.glb'}
SOLIDS.write_text(json.dumps(soliddata,ensure_ascii=False,indent=2)+'\n')
def bvh(obs):
    vs=[];fs=[];graph=bpy.context.evaluated_depsgraph_get()
    for o in obs:
        ev=o.evaluated_get(graph);data=ev.to_mesh();off=len(vs);vs.extend(src(o.matrix_world@v.co) for v in data.vertices);fs.extend(tuple(off+i for i in f.vertices) for f in data.polygons);ev.to_mesh_clear()
    return BVHTree.FromPolygons(vs,fs,all_triangles=False)
tree=bvh(objects)
def ray(p,d,l,t=tree):return t.ray_cast(Vector(p),Vector(d),l)[0]
for x in (37,39.5,42.2):
    for y in (2.2,4.5,6.95):assert ray((x,y,-20.8),(0,0,-1),2.5) is None,('Clear portal',x,y)
for z in (-21.8,-20,-18.1):assert ray((44.2,3,z),(1,0,0),1) is not None,('Solid return',z)
legtree=bvh([porch]);supporttree=bvh([o for o in objects if o is not porch])
for leg in leg_records:
    p=(leg['centerX'],8.20,leg['centerZ']);a=ray(p,(0,-1,0),.4,legtree);b=ray((p[0],F2+.08,p[2]),(0,-1,0),.2,supporttree)
    assert a and b and abs(a.y-F2)<.001 and abs(b.y-F2)<.001,('Rail support',leg,a,b)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in objects:
    data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph);cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy();group=o.get('semanticGroup','architecture');cp['semanticGroup']=group;cp['decorationOnly']=bool(o.get('decorationOnly',False));batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(cp);o.select_set(False)
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
manifest={'version':'music-interior-v006','source':str(SOURCE.relative_to(ROOT)),'layout':str(LAYOUT.relative_to(ROOT)),
          'runtimeAsset':'music-interior/v006/music-pavilion.glb','runtimeOrigin':[46,0,-9],'fixedSideStyle':FIXED_SIDE_STYLE,
          'verticalBarDepthMetres':{'fixedScreens':.052,'openDoorLeaves':.026},
          'protectedSourceHashes':hashes,'allUnrelatedFacesUnchanged':True,'removed':removed,'modified':modified,
          'returnWall':{'min':RETURN_LO,'max':RETURN_HI,'exteriorMaterial':'plaster','interiorMaterial':'music-decor-plaster'},
          'westGroundPorch':{'x':WEST_FACE_X,'decorationEndsAtZ':PORTAL_BACK_Z,
                            'topY':FIRST_CEILING,'exteriorMaterial':'plaster'},
          'balusterSupports':leg_records,'clearPortalX':[36.575,42.665],'clearPortalTopY':7.16,
          'floralAspect':ASPECT,'newDecoration':decor,'sourceRaysPassed':True,'meshBatches':len(exported),
          'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V006_EXPORTED',manifest['bytes'],manifest['sha256'],'supported balusters',len(leg_records))
