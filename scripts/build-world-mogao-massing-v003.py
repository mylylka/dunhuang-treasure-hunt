"""Independent composition study: continuous base + six authored sandstone masses.
No old assets or map files are written. Metres; Blender Z up. Surface baking is
deliberately deferred until the complete silhouette receives visual approval.
"""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/world/models/mogao-massing/v003'
OUT=ROOT/'public/assets/world/mogao-massing/v003'
WORK=ROOT/'work/world'
for p in (SRC,OUT,WORK): p.mkdir(parents=True,exist_ok=True)
F=6.85546875
protected_files=['public/assets/world/mogao-massing/v002/mountain.glb','art-source/world/models/mogao-massing/v002/mogao-massing.blend','public/assets/world/mogao-massing/v001/mountain.glb','public/assets/world/mogao-massing/v001/tower.glb','art-source/world/models/mogao-massing/v001/mogao-massing.blend','public/assets/world/mogao/v006/exterior.glb','art-source/world/models/mogao/v006/mogao.blend','public/assets/world/mogao/v003/interior.glb','public/assets/world/traveler-tripo/v002/traveler.glb','public/assets/world/sandstone-study/v001/sandstone.glb','art-source/world/models/sandstone-study/v001/sandstone.blend']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
protected={f:sha(ROOT/f) for f in protected_files}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(name,h):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,)
 p.inputs['Roughness'].default_value=.94;m.diffuse_color=p.inputs['Base Color'].default_value;return m
stone=mat('composition-sandstone','b58a55');sand=mat('sand-foot','dfbd83');stepmat=mat('stone-steps','c9b38a');dark=mat('passage-shadow','3c2f27')
def mesh(name,verts,faces,material=None):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
 if material:o.data.materials.append(material)
 return o
def activate(o):
 bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
def box(name,loc,size,material=None):
 x,y,z=loc;w,d,h=size
 vs=[(x+a*w/2,y+b*d/2,z+c*h/2) for c in (-1,1) for b in (-1,1) for a in (-1,1)]
 return mesh(name,vs,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],material)
def boolean(o,c,operation='DIFFERENCE'):
 activate(o);mod=o.modifiers.new(c.name,'BOOLEAN');mod.operation=operation;mod.solver='EXACT';mod.object=c
 bpy.ops.object.modifier_apply(modifier=mod.name);c.hide_render=True;c.hide_set(True);c['constructionOnly']=True
def edge_finish(o,width):
 activate(o);b=o.modifiers.new('Narrow weathered edge transition','BEVEL');b.width=width;b.segments=2;b.limit_method='ANGLE';b.angle_limit=.28;b.use_clamp_overlap=True
 bpy.ops.object.modifier_apply(modifier=b.name)
 for p in o.data.polygons:p.use_smooth=True
 bm=bmesh.new();bm.from_mesh(o.data)
 for e in bm.edges:
  if len(e.link_faces)==2:e.smooth=e.calc_face_angle()<math.radians(32)
 bm.to_mesh(o.data);bm.free()
 n=o.modifiers.new('Broad plane normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=40
 bpy.ops.object.modifier_apply(modifier=n.name)

# Independent footprints and crown profiles, in metres. The fixed short beds
# turn into the sides and terminate; no global horizontal bands or random peaks.
definitions=[
 {'id':'left-high-shoulder','label':'左后高崖肩','foot':[(-52,8),(-45,3),(-31,2),(-20,8),(-17,19),(-22,34),(-35,43),(-48,39),(-55,25)],'top':[52,56,57.8,56.4,54,54.8,56.2,55,52.2],'bottom':20,'bed':[32,34,35,34,32,33,34,34,32],'lean':(1,1.4),'lip':.8},
 {'id':'left-front-buttress','label':'左前宽断面','foot':[(-58,-3),(-53,-14),(-42,-17),(-31,-14),(-20,-6),(-18,9),(-29,19),(-43,21),(-55,13)],'top':[29,36,42.5,43.2,38.5,40,42,39,33],'bottom':-1.4,'bed':[13,16,17.3,15.8,13,17,20,18,15],'lean':(2.8,2.2),'lip':1.15},
 {'id':'left-low-flank','label':'左侧落地岩台','foot':[(-64,8),(-62,-2),(-55,-7),(-47,-3),(-45,9),(-48,23),(-57,29),(-63,21)],'top':[17,21,24.5,28,28.4,25,23,19],'bottom':-1.5,'bed':[8,9,11,13,14,12,11,9],'lean':(1.2,1.5),'lip':.75},
 {'id':'central-backbone','label':'中央连续台地','foot':[(-26,11),(-17,3),(-3,2),(12,5),(24,14),(26,29),(13,45),(-4,47),(-20,39),(-28,24)],'top':[50.2,49.5,48.2,47,46.2,45.8,47.6,49,50,51],'bottom':19,'bed':[33,32,32,31,31,32,33,35,35,34],'lean':(-1.8,2.8),'lip':.55},
 {'id':'right-swept-face','label':'右侧斜展岩体','foot':[(9,3),(16,-7),(29,-11),(39,-4),(45,7),(42,25),(29,39),(14,34),(6,20)],'top':[35,39,42.8,38.5,31.5,34,39.2,42,38],'bottom':-1.2,'bed':[13,18,21,20,17,20,23,22,17],'lean':(-2.8,3),'lip':1.1},
 {'id':'right-long-tail','label':'右端低矮延伸','foot':[(34,9),(41,2),(53,1),(62,8),(63,18),(57,33),(46,40),(35,29)],'top':[28,29.5,26.5,18.5,16,20,25,30],'bottom':-1.4,'bed':[14,13,11,7.5,8,11,13,15],'lean':(-3.2,1.3),'lip':.65},
]
import importlib.util
spec=importlib.util.spec_from_file_location('massing_profiles',ROOT/'scripts/mogao-massing-profiles-v002.py')
profiles=importlib.util.module_from_spec(spec);spec.loader.exec_module(profiles)
def volume(name,foot,top,bottom,bed,lean,lip):
 return profiles.profile_volume(name,foot,top,bottom,bed,lean,lip,mesh,stone,boolean)

corefoot=[(-63,12),(-57,-4),(-43,-10),(-24,-4),(-12,1),(5,2),(22,-2),(42,1),(58,8),(62,22),(54,40),(33,47),(7,49),(-20,47),(-48,38)]
coretop=[20,26,30,32,34,33,30,25,18,17,20,23,27,29,25]
corebed=[v*.45 for v in coretop]
core=volume('continuous-core',corefoot,coretop,-1.8,corebed,(0,1),.65)
core['semanticGroup']='continuous-core'
sources=[core]
for d in definitions:
 o=volume(d['id'],d['foot'],d['top'],d['bottom'],d['bed'],d['lean'],d['lip']);o['semanticGroup']='major-rock';o['label']=d['label'];sources.append(o)

# Keep every authored volume editable. The exported result is their actual
# union, so the side/back views have a solid body rather than a façade shell.
mass=core.copy();mass.data=core.data.copy();bpy.context.collection.objects.link(mass);mass.name='mountain-continuous-union';mass['semanticGroup']='mountain'
for o in sources[1:]:boolean(mass,o,'UNION')
core.hide_render=True;core.hide_set(True)

# Preserve the previously accepted tower design, with a new, uniform metric
# scale applied about its platform plane. The source file is read only.
oldblend=ROOT/'art-source/world/models/mogao/v006/mogao.blend'
with bpy.data.libraries.load(str(oldblend),link=False) as (data_from,data_to):
 data_to.objects=[name for name in data_from.objects if name.startswith('tower-')]
tower=[]
for o in data_to.objects:
 if o and o.type=='MESH' and not o.get('constructionOnly'):
  bpy.context.collection.objects.link(o);o.hide_set(False);o.hide_render=False;tower.append(o)
oldtop=max((o.matrix_world@v.co).z for o in tower for v in o.data.vertices)
S=45/oldtop
for o in tower:
 for v in o.data.vertices:
  co=o.matrix_world@v.co;v.co=(co.x*S,co.y*S,co.z*S+F)
 o.matrix_world.identity();o['semanticGroup']='tower';o['heightFromPlatform']=45

eaves=[17.6,26.3,34.2,41.4,47.8,53.5,58.3,62.3,65.8]
widths=[38,34.8,33.5,32.2,30.8,29.5,28.2,26.7,25]
# Each recess ends behind the existing plaster returns, overlapping the rock.
for i,(h,w) in enumerate(zip(eaves,widths)):
 lo=F if i==0 else eaves[i-1]+.65;hi=h+.85
 boolean(mass,box('tower-recess-'+str(i+1),(0,-4,((lo+hi)/2-F)*S+F),((w-4.8)*S,21.6,(hi-lo)*S)))
boolean(mass,box('chamber-clearance',(0,18.15,F+10.25),(24.8,31.1,20.55)))
boolean(mass,box('entry-clearance',(0,-4,F+3.25),(6.08,18,6.5)))

# Replace the paired long dark cuts with two different local features.
# The left groove follows the actual face; its depth fades to zero. The right
# cut removes a broad rim corner, rather than drawing another zigzag line.
def shallow_groove():
 points=[]
 for x,z,width,depth in [(-40,39,.16,.25),(-41.5,36.5,.20,.36),(-40.8,34.5,.025,.025)]:
  hit,p,normal,index=mass.ray_cast(Vector((x,-80,z)),Vector((0,1,0)))
  assert hit, f'Missing front face at {x}, {z}'
  points.extend([(x-width,p.y-.65,z),(x+width,p.y-.65,z),(x,p.y+depth,z)])
 faces=[(0,2,1),(6,7,8)]
 for row in range(2):
  for j in range(3):
   a=row*3+j;b=row*3+(j+1)%3;faces.append((a,b,b+3,a+3))
 boolean(mass,mesh('short-shallow-front-joint',points,faces))
def rim_chip():
 hit,p,normal,index=mass.ray_cast(Vector((33.2,-80,40)),Vector((0,1,0)))
 assert hit, 'Missing right rim face'
 points=[(31.8,p.y-1.5,42.5),(35.6,p.y-1.5,40.4),(35.8,p.y-1.5,38.8),(32.7,p.y-1.5,39.1),(33.8,p.y+1.2,41.1)]
 o=mesh('right-rim-weathered-chip',points,[]);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.convex_hull(bm,input=list(bm.verts));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();boolean(mass,o)
shallow_groove();rim_chip()
# Boolean cutters carry no finish material. Assign their exposed cut faces to
# the same sandstone rather than leaving empty material slots in the GLB.
mass.data.materials.clear();mass.data.materials.append(stone)
for polygon in mass.data.polygons:polygon.material_index=0
edge_finish(mass,.38)

# New plinth/stairs meet the unchanged floor elevation; they are not a scaled
# copy of the old 6.855m rise. The central opening stays unblocked.
plinth=box('raised-plinth',(0,-1.1,F/2),(25,18.2,F),stepmat)
boolean(plinth,box('plinth-entry',(0,-.5,F+.7),(6.08,17,1.45)))
plinth.data.materials.clear();plinth.data.materials.append(stepmat)
for polygon in plinth.data.polygons:polygon.material_index=0
parts=[mass,*tower,plinth]
stairs=[]
for i in range(30):
 y0=-29+19*i/30;h=F*(i+1)/30
 stairs.append(box('stair-'+str(i),(0,(y0-10)/2,h/2),(10.4,-10-y0,h),stepmat))
activate(stairs[0])
for o in stairs:o.select_set(True)
bpy.ops.object.join();stairs[0].name='central-ceremonial-stairs';parts.append(stairs[0])
parts.append(box('dark-passage-back',(0,2.8,F+3),(6,.15,6),dark))

# Wind deposits wrap the lowest silhouette. Their outer edge is below the
# desert plane; the central stair approach remains clear.
for side,anchors in [(-1,[(-65,10,1),(-59,-5,1.6),(-52,-14,1.8),(-41,-17,2.0),(-29,-13,1.4),(-18,-5,1.3),(-13,-1,1.1)]),(1,[(13,1,1.1),(20,-8,1.6),(30,-11,1.5),(40,-3,1.8),(51,1,1.3),(61,8,1),(65,18,.6)])]:
 vs=[];fs=[]
 for x,y,h in anchors:
  for j in range(9):
   t=j/8;vs.append((x,y-9*t,h*(1-t)**2-.06))
 for i in range(len(anchors)-1):
  for j in range(8):a=i*9+j;fs.append((a,a+1,a+10,a+9))
 o=mesh('sand-foot-'+str(side),vs,fs,sand)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o)

# Export main stone independently so the viewer can isolate its silhouette.
def export(name,items):
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 path=OUT/name;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
 return {'bytes':path.stat().st_size,'sha256':sha(path)}
for o in parts:
 o['previewStage']='composition-only';o.data.calc_loop_triangles()
source_collection=bpy.data.collections.new('01 Authored masses — editable');scene.collection.children.link(source_collection)
for o in sources:
 for c in list(o.users_collection):c.objects.unlink(o)
 source_collection.objects.link(o);o.hide_render=True;o.hide_set(True)
source_collection.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'mogao-massing.blend'))
mountain_export=export('mountain.glb',[mass,*[p for p in parts if p.name.startswith('sand-foot')]])
tower_export=export('tower.glb',tower)
foundation_export=export('foundation.glb',[p for p in parts if p not in tower and p!=mass and not p.name.startswith('sand-foot')])
coords=[mass.matrix_world@v.co for v in mass.data.vertices]
bounds={'min':[min(v[a] for v in coords) for a in range(3)],'max':[max(v[a] for v in coords) for a in range(3)]}
top=max(v.co.z for o in tower for v in o.data.vertices)
assert abs(top-F-45)<.0001
assert 55<bounds['max'][2]<60
assert all(sha(ROOT/f)==h for f,h in protected.items())
report={'status':'composition preview; visual acceptance pending','majorRockGroups':6,'continuousUnion':True,'definitions':definitions,'independentProfiles':profiles.PROFILES,'boundsBlenderXYZ':bounds,'tower':{'source':str(oldblend.relative_to(ROOT)),'uniformScale':S,'platform':F,'top':top,'heightFromPlatform':top-F,'storeys':9,'targetPerson':1.8,'ratio':25},'meshTriangles':{'mountain':len(mass.data.loop_triangles),'tower':sum(len(o.data.loop_triangles) for o in tower)},'exports':{'mountain':mountain_export,'tower':tower_export,'foundation':foundation_export},'protectedAssets':protected,'mapIntegration':False,'textures':'Base matte material only; whole mountain UV and bake deferred to visual acceptance'}
(SRC/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(WORK/'mogao-massing-v003-protected.json').write_text(json.dumps(protected,indent=2)+'\n')
print('REPORT',json.dumps({k:v for k,v in report.items() if k not in ['definitions','protectedAssets']},ensure_ascii=False),flush=True)

if '--skip-renders' not in sys.argv:
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
 scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
 scene.world=bpy.data.worlds.new('preview-world');scene.world.use_nodes=True
 bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.69,.79,.83,1);bg.inputs[1].default_value=.7
 ground=box('render-ground',(0,0,-.15),(1500,1500,.2),sand)
 bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.4;sun.data.angle=.08;sun.rotation_euler=Vector((14,22,-35)).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=43
 for name,eye,target in [('front',(0,-170,45),(0,8,24)),('oblique',(105,-155,68),(0,8,25)),('side',(135,-35,50),(0,12,23))]:
  cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(WORK/f'mogao-massing-v003-blender-{name}.png');bpy.ops.render.render(write_still=True)
