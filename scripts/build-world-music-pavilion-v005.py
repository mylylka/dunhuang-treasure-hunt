"""Derive flat courtyard paving from the delivered editable v004; architecture untouched."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-pavilion/v004/music-pavilion.blend'
DEST=ROOT/'art-source/world/models/music-pavilion/v005';OUT=ROOT/'public/assets/world/music-pavilion/v005'
for path in (DEST,OUT):path.mkdir(parents=True,exist_ok=True)
if (OUT/'music-pavilion.glb').exists():raise RuntimeError('Delivered source/export preserved; choose a new version.')
old_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
for o in bpy.context.scene.objects:
 if o.get('semanticGroup')=='court-paving':o['excludeV5']=True;o.hide_render=True;o.hide_set(True)
# One quiet rectangular coursed surface, 16 mm joints, 5 mm recess, no slab sidewalls.
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=1
 return m
mats=[material('court-limestone-'+str(i),c) for i,c in enumerate([(.51,.48,.39),(.54,.51,.43),(.52,.495,.415),(.56,.53,.45)])]
seam=material('court-fine-joints',(.36,.335,.27))
def mesh(name,vs,fs,materials):
 data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 for m in materials:data.materials.append(m)
 o['semanticGroup']='court-paving';return o
xl,xr,yf,yb=-21.6,23.6,-11.6,19.3
mesh('v005-joint-bed',[(xl,yf,.03),(xr,yf,.03),(xr,yb,.03),(xl,yb,.03)],[(0,1,2,3)],[seam])
vs=[];fs=[];ids=[]
row=0;y=yf
while y<yb:
 x=xl-(.6 if row%2 else 0);col=0
 while x<xr:
  a=max(x,xl)+.008;b=min(x+1.2,xr)-.008;c=y+.008;d=min(y+.8,yb)-.008
  if b>a and d>c:
   k=len(vs);vs.extend([(a,c,.035),(b,c,.035),(b,d,.035),(a,d,.035)]);fs.append((k,k+1,k+2,k+3));ids.append([0,1,0,2,1,3,2][(col+row*2)%7])
  x+=1.2;col+=1
 y+=.8;row+=1
floor=mesh('v005-flush-limestone-courses',vs,fs,mats)
for p,i in zip(floor.data.polygons,ids):p.material_index=i
bpy.ops.object.select_all(action='DESELECT')
originals=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.get('excludeV4') and not o.get('excludeV5')]
for o in originals:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in originals:
 data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
 copy=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(copy);copy.matrix_world=o.matrix_world.copy();copy['semanticGroup']=o.get('semanticGroup','architecture')
 key=(copy['semanticGroup'],tuple(m.name for m in data.materials));batches.setdefault(key,[]).append(copy)
 o.hide_render=True;o.hide_set(True);o.select_set(False)
exported=[]
for (g,materials),items in batches.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 if len(items)>1:bpy.ops.object.join()
 o=bpy.context.object;o.name=g+'--'+materials[0];exported.append(o)
bpy.ops.object.select_all(action='DESELECT');triangles=0
for o in exported:o.select_set(True);o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
manifest={'version':'v005','status':'awaiting visual approval','source':str(SOURCE.relative_to(ROOT)),'sourceUnchanged':hashlib.sha256(SOURCE.read_bytes()).hexdigest()==old_hash,'sourceSha256':old_hash,'triangles':triangles,'meshBatches':len(exported),'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest(),'floor':{'slabSize':[1.2,.8],'jointWidth':.016,'jointRecess':.005,'topHeight':.035,'tiles':len(fs),'sidewalls':False},'preserved':'all architecture, openwork, mural frame, stairs, props and exterior road'}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');assert manifest['sourceUnchanged'];print(json.dumps(manifest))
