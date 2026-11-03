"""Import the user's textured cliff, open its existing central doorway, retain the accepted chamber."""
import bpy,bmesh,json,math,hashlib
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v003';O=R/'public/assets/world/mogao/v003';W=R/'work/world'
D.mkdir(parents=True,exist_ok=True);O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/world/models/mogao/v002/mogao.blend'));bpy.context.preferences.filepaths.save_version=0
inside={'cave-interior','cave-floor','interior-painted-surfaces'};interior=[]
for o in bpy.context.scene.objects:
 keep=o.type=='MESH' and o.get('semanticGroup') in inside and not o.get('constructionOnly')
 if keep:interior.append(o)
 o.hide_render=not keep;o.hide_set(not keep)
# Only the short old entry passage is replaced by the imported colonnade.
for o in interior[:]:
 if o.name.startswith('passage-') or (o.name.startswith('continuous-worn-stone-floor') and max(v.co.y for v in o.data.vertices)<10.1):
  o.hide_render=True;o.hide_set(True);interior.remove(o)
# Continuous UVs extend the existing excerpt onto the entrance wall. The real door is left open.
material=bpy.data.materials.get('deer-art');full_pixels=12918;source_height=2150;wall_height=18
scale_u=source_height/wall_height/full_pixels
surfaces=[]
def panel(name,verts,uv):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(material);o['semanticGroup']='interior-painted-surfaces';layer=mesh.uv_layers.new(name='UVMap')
 for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
 surfaces.append(o);interior.append(o);return o
# Viewed from the chamber: start at its east corner, run right-to-left back to the west corner.
for name,start,end,bottom,top in [('entry-east',0,7,.012,18.012),('entry-over-door',7,17,9.025,18.012),('entry-west',17,24,.012,18.012)]:
 x1=12-start;x2=12-end;u0=(84+start)*scale_u;u1=(84+end)*scale_u
 panel('four-wall-deer-'+name,[(x1,3.035,bottom),(x2,3.035,bottom),(x2,3.035,top),(x1,3.035,top)],[(u0,(bottom-.012)/18),(u1,(bottom-.012)/18),(u1,1),(u0,1)])
# Source has metres-normalized bounds. Uniform 120x scale: 120m wide / 68m tall.
source=R/'art-source/world/mogao/v003/imported/石窟.fbx'
before=set(bpy.context.scene.objects);bpy.ops.import_scene.fbx(filepath=str(source));imported=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];cliff=imported[0]
S=120.;floor_z=.05712890625*S;transform=Matrix.Translation(Vector((0,3,-floor_z)))@Matrix.Scale(S,4)
cliff.data.transform(transform@cliff.matrix_world);cliff.matrix_world.identity();cliff.name='user-cliff-facade';cliff['semanticGroup']='user-cliff'
for m in cliff.data.materials:
 if m.use_nodes:
  bs=m.node_tree.nodes.get('Principled BSDF')
  if bs:bs.inputs['Roughness'].default_value=.96;bs.inputs['Metallic'].default_value=0
  for n in m.node_tree.nodes:
   if n.type=='TEX_IMAGE' and n.image:n.image.filepath=str(R/'art-source/world/mogao/v003/imported/石窟.fbm/石窟_basecolor.jpg');n.image.reload()
# Measure a walkable floor on the imported stairs before opening the chamber.
tree=BVHTree.FromObject(cliff,bpy.context.evaluated_depsgraph_get());samples=[]
for j in range(129):
 y=-29+j*.25;row=[]
 for i in range(49):
  x=-7+i*.25;hit=tree.ray_cast(Vector((x,y,.12*S-floor_z)),Vector((0,0,-1)))
  row.append(round(max(0,min(floor_z,(hit[0].z+floor_z) if hit[0] else (floor_z if y>1 else 0))),4))
 samples.append(row)
# Low rock aprons follow the actual supplied facade; they must not be walk-through.
# The central stair corridor is excluded, with its floor sampled above.
front_rocks=[]
for left,right in [(-60,-7),(3.5,60)]:
 x=left
 while x<right:
  end=min(x+1,right);hits=[]
  for sx in [x,(x+end)/2,end]:
   for h in [.3,1.0,2.0,3.0]:
    hit=tree.ray_cast(Vector((sx,-45,h-floor_z)),Vector((0,1,0)))
    if hit[0] and hit[0].y<3:hits.append(hit[0].y)
  if hits:front_rocks.append([round(x,3),round(end,3),round(min(hits),3),3.2])
  x=end
# Do not cut the front stairs, columns, railings or other visible doorways.
# First release the central rear closure, then clear volume for the accepted chamber.
def cut(name,loc,size):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);c=bpy.context.object;c.name=name;c.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 c.data.materials.append(cliff.data.materials[0]);bpy.context.view_layer.objects.active=cliff;mod=cliff.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.ops.object.modifier_apply(modifier=mod.name);c.hide_render=True;c.hide_set(True);c['constructionOnly']=True
cut('central-door-connection',(0,3.0,4.55),(8,2.0,9.12))
cut('accepted-chamber-clearance',(0,18.3,10.15),(24.7,30.6,20.4))
# Lightly textured threshold bridges only the join behind the existing imported floor.
floor_mat=bpy.data.materials.get('worn-cave-floor')
def box(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
bridge=box('entry-threshold-bridge',(0,2.75,-.06),(8,.7,.12),bpy.data.materials.get('plaster-warm'));bridge['semanticGroup']='cave-interior';interior.append(bridge)
# The imported source already has recessed secondary openings with shaded interior surfaces.
# Backing remains intact; player collision blocks every entrance except the main stairs.
ground=box('regional-sand-base',(15,-42,-floor_z-.10),(220,180,.2),bpy.data.materials.get('ground-sand'));ground['semanticGroup']='region-ground'
L=json.loads((R/'src/content/world/mogao-layout-v002.json').read_text());L['version']='v003';L['origin']=[122,floor_z,-68];L['cliff']={'width':119.9414,'depth':34.67,'height':68.0273};L['stairs']={'front':-29,'back':-9,'width':9,'rise':floor_z,'steps':0};L['portal']={'width':8,'height':9,'depth':12};L['walkSurface']={'x0':-7,'y0':-29,'step':.25,'heights':samples};L['mural']['width']=108;L['mural']['cropPixels']=[0,0,12900,2150];L['mural']['entryOpeningPixels']=[(84+7)*2150/18,1076.79,(84+17)*2150/18,2150]
L['frontRocks']=front_rocks
L['road'][-1]=[[105,-20],[112,-28],[119,-34],[119,-39]]
L['views'].update({'steps':[119,-37,0],'entrance':[122,-61,0],'entrance-side':[134,-49,.5],'passage':[122,-69,0],'approach':[115,-28,-.12],'distant':[83,11,-.6],'overview':[122,43,0]})
(R/'src/content/world/mogao-layout-v003.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
visible=interior+[cliff,ground]
for o in bpy.context.scene.objects:o.hide_render=o not in visible;o.hide_set(o not in visible)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao.blend'))
exports={}
for label,objects in [('exterior',[cliff,ground]),('interior',interior)]:
 graph=bpy.context.evaluated_depsgraph_get();batches={}
 for o in objects:
  data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph);cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy();
  for idx,m in enumerate(data.materials):
   if m is None:data.materials[idx]=cliff.data.materials[0] if o==cliff else bpy.data.materials.get('plaster-warm')
  batches.setdefault(tuple(m.name for m in data.materials),[]).append(cp)
 selected=[]
 for names,items in batches.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0]
  if len(items)>1:bpy.ops.object.join()
  selected.append(bpy.context.object)
 bpy.ops.object.select_all(action='DESELECT');tris=0
 for o in selected:o.select_set(True);o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 f=O/(label+'.glb');bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
 exports[label]={'triangles':tris,'batches':len(selected),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
 for o in selected:o.hide_render=True;o.hide_set(True)
manifest={'source':str(source.relative_to(R)),'uniformScale':S,'floorWorldHeight':floor_z,'exports':exports,'mapping':{'sourceSize':[12918,2150],'shownEndX':12900,'wallsMetres':[30,24,30,24],'heightMetres':18,'readingDirection':'left → far wall → right → entry wall (east to west)','doorOpening':'entry wall lower middle remains physically open; full mother image is available in story player'},'geometryChanges':'Preserve source front, stairs, pillars and other openings. Open only central rear closure and carve hidden accepted chamber volume.'}
(D/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print('EXPORTS',json.dumps(exports))
# Two inspection renders use the exact exported-source geometry.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1279;scene.render.resolution_y=925;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('desert-inspection');scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.new('ShaderNodeBackground');bg.inputs[0].default_value=(.7,.78,.86,1);bg.inputs[1].default_value=.65
out=scene.world.node_tree.nodes.new('ShaderNodeOutputWorld');out.is_active_output=True;scene.world.node_tree.links.new(bg.outputs[0],out.inputs[0])
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.55,-.4,-.65);sun.data.energy=2.8
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
for name,eye,target,lens in [('exterior',(-40,-108,13),(0,-1,20),31),('entry-wall',(0,20,3.2),(0,3,10),20)]:
 if name=='entry-wall':
  bpy.ops.object.light_add(type='AREA',location=(0,17,9));fill=bpy.context.object;fill.data.energy=9000;fill.data.shape='DISK';fill.data.size=18;fill.rotation_euler=(Vector((0,3,9))-fill.location).to_track_quat('-Z','Y').to_euler()
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;scene.render.filepath=str(W/f'mogao-v003-blender-{name}.png');bpy.ops.render.render(write_still=True)
