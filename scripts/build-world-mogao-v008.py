"""Independent compact Buddha hall, continuous L murals, authored vaulted clearance.
No source model or prior GLB is overwritten. Blender owns all structural geometry.
"""
import bpy,bmesh,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v008';O=R/'public/assets/world/mogao/v008';W=R/'work/world';D.mkdir(parents=True,exist_ok=True)
L=json.loads((R/'src/content/world/mogao-layout-v008.json').read_text());F=L['origin'][1]
protected={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [R/'public/assets/world/mogao-sandstone/v001/mountain.glb',R/'public/assets/world/mogao-massing/v003/tower.glb',R/'public/assets/world/mogao/v007/entry.glb',R/'public/assets/world/mogao/v003/interior.glb']}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
bpy.context.scene.unit_settings.system='METRIC'
materials={};interior=[]
def mat(name,color=(1,1,1),texture=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.95
 if texture:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(texture),check_existing=True);m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
 materials[name]=m;return m
mat('cave-plaster',(.28,.16,.10));mat('deer',texture=O/'deer-scroll.webp');mat('novice',texture=O/'novice-scroll.jpg');mat('thousand',texture=O/'thousand-buddhas.jpg');mat('border',texture=R/'public/assets/world/courtyard/v002/wall-floral-border.jpg');mat('caisson',texture=R/'public/assets/world/courtyard/v001/caisson.png');mat('floor',texture=R/'public/assets/world/mogao/v001/floor-albedo.png');mat('dark-stone',(.18,.11,.07));mat('aged-gold',(.33,.23,.11))
fl=materials['floor'];t=fl.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(R/'public/assets/world/mogao/v001/floor-normal.png'));t.image.colorspace_settings.name='Non-Color';n=fl.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.5;fl.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);fl.node_tree.links.new(n.outputs['Normal'],fl.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
def mesh(name,verts,faces,material,uv=None,owned=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(materials[material] if isinstance(material,str) else material);o['semanticGroup']='mogao-v008-interior'
 if uv:
  layer=me.uv_layers.new(name='UVMap')
  for l in me.loops:layer.data[l.index].uv=uv[l.vertex_index]
 if owned:interior.append(o)
 return o
def box(name,loc,size,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[material]);o['semanticGroup']='mogao-v008-interior';interior.append(o);return o
def vertical(name,a,b,bottom,top,material,uv=None):
 return mesh(name,[(a[0],a[1],bottom),(b[0],b[1],bottom),(b[0],b[1],top),(a[0],a[1],top)],[(0,1,2,3)],material,uv or [(0,0),(1,0),(1,1),(0,1)])
def perimeter(x,y):
 if y<=7.06:return 25+14-x
 if y>=31.96:return 78+x+14
 return 32-y if x>0 else 53+y-7
def tiled(name,a,b,lo,hi,offset=0):
 u=perimeter(*a)/ (106/22);v=perimeter(*b)/(106/22)
 return vertical(name,a,b,lo,hi,'thousand',[(u,lo/5.986),(v,lo/5.986),(v,hi/5.986),(u,hi/5.986)])
# Wall and roof profile stays below the measured exterior rock surface.
ys=[7,10,18,25,32];edges=[20.45,24.2,24.2,24.2,24.2];centers=[20.45,24.2,34.2,39.2,31.7]
def vault_height(x,y):return 39.2-max(0,max(abs(x),abs(y-24))-2)*1.25
for sign in [-1,1]:
 for i in range(4):
  a,b=ys[i:i+2];ha,hb=edges[i:i+2]
  vs=[(sign*14,a,0),(sign*14,b,0),(sign*14,b,hb),(sign*14,a,ha)]
  # Faces point into the room.
  order=(0,1,2,3) if sign<0 else (3,2,1,0)
  shell=mesh(f'side-shell-{sign}-{i}',vs,[order],'cave-plaster');solid=shell.modifiers.new('wall-thickness','SOLIDIFY');solid.thickness=.28;solid.offset=-1
  # Same-size repeating Buddha rows on all upper wall stations.
  me=mesh(f'upper-thousand-{sign}-{i}',[(x-sign*.022,y,z) for x,y,z in [(sign*14,a,4.8),(sign*14,b,4.8),(sign*14,b,hb-.03),(sign*14,a,ha-.03)]],[order],'thousand',[(perimeter(sign*14,a)/(106/22),4.8/5.986),(perimeter(sign*14,b)/(106/22),4.8/5.986),(perimeter(sign*14,b)/(106/22),(hb-.03)/5.986),(perimeter(sign*14,a)/(106/22),(ha-.03)/5.986)])
# Complete source artwork across each ninety-degree corner; one UV interval split.
for id,sign,total in [('deer',-1,L['mural']['deerLength']),('novice',1,L['mural']['noviceLength'])]:
 side=total-10.2;bottom=.7;top=4.8
 if id=='deer':
  vertical('deer-door-head',(-3.8,7.025),(-13.975,7.025),bottom,top,id,[(0,0),(10.2/total,0),(10.2/total,1),(0,1)])
  vertical('deer-side-tail',(-13.975,7.025),(-13.975,7.025+side),bottom,top,id,[(10.2/total,0),(1,0),(1,1),(10.2/total,1)])
  a=(-13.97,7.025+side);b=(-13.97,32)
 else:
  vertical('novice-side-head',(13.975,7.025+side),(13.975,7.025),bottom,top,id,[(0,0),(side/total,0),(side/total,1),(0,1)])
  vertical('novice-door-tail',(13.975,7.025),(3.8,7.025),bottom,top,id,[(side/total,0),(1,0),(1,1),(side/total,1)])
  a=(13.97,32);b=(13.97,7.025+side)
 tiled(id+'-rear-low-thousand',a,b,.7,4.8)
 # Narrow earth lip and a continuous floral base band.
 vertical(id+'-base-side',(sign*13.974,7),(sign*13.974,32),.08,.68,'border',[(0,0),(25/3.8,0),(25/3.8,1),(0,1)])
for a,b in [((14,7),(3.04,7)),((-3.04,7),(-14,7))]:
 vertical('entry-wall',a,b,0,20.45,'cave-plaster');tiled('entry-upper',(a[0],7.02),(b[0],7.02),4.8,20.45)
 vertical('entry-base',(a[0],7.028),(b[0],7.028),.08,.68,'border',[(0,0),(10.96/3.8,0),(10.96/3.8,1),(0,1)])
# Short undecorated door reveals; no artwork clipped across the opening.
for sign in [-1,1]:tiled('door-reveal-fill',(sign*3.8,7.03),(sign*3.04,7.03),.7,4.8)
tiled('over-door',(3.04,7.025),(-3.04,7.025),6.28,20.45)
vertical('entry-head',(3.04,7),(-3.04,7),6.28,20.45,'cave-plaster')
# Square truncated-pyramid vault clipped by the compact rectangular chamber.
# Four broad sloping planes; only the small 4x4m summit is level.
back=mesh('back-wall',[(-14,32,0),(14,32,0),(14,32,24.2),(8,32,31.7),(-8,32,31.7),(-14,32,24.2)],[(0,1,2,3,4,5)],'thousand',[(perimeter(x,32)/(106/22),z/5.986) for x,z in [(-14,0),(14,0),(14,24.2),(8,31.7),(-8,31.7),(-14,24.2)]])
roof_shapes=[
 ('front',[(-14,7),(14,7),(14,10),(2,22),(-2,22),(-14,10)]),
 ('right',[(14,10),(14,32),(8,32),(2,26),(2,22)]),
 ('rear',[(8,32),(-8,32),(-2,26),(2,26)]),
 ('left',[(-14,32),(-14,10),(-2,22),(-2,26),(-8,32)]),
 ('cap',[(-2,22),(2,22),(2,26),(-2,26)]),
]
roofvs=[];roof_faces=[]
for name,outline in roof_shapes:
 verts=[(x,y,vault_height(x,y)) for x,y in outline];indices=list(range(len(roofvs),len(roofvs)+len(verts)));roofvs+=verts;roof_faces.append(tuple(reversed(indices)))
 if name=='cap':uv=[(0,0),(1,0),(1,1),(0,1)]
 else:
  uv=[((x if name=='front' else -x if name=='rear' else y if name=='right' else -y)/4.8,z*1.280624847/5.986) for x,y,z in verts]
 roof=mesh('pyramid-vault-'+name,verts,[tuple(reversed(range(len(verts))))],'caisson' if name=='cap' else 'thousand',uv)
 # Geometry is truly sloped; solid wall behind the painted surface blocks daylight.
 mod=roof.modifiers.new('rock-roof-thickness','SOLIDIFY');mod.thickness=.18;mod.offset=-1
# A restrained frame at the tiny top flat panel; no flat ceiling beneath it.
for sign in [-1,1]:
 box('summit-frame-side',(sign*2.04,24,39.17),(.10,4.18,.12),'aged-gold')
 box('summit-frame-end',(0,24+sign*2.04,39.17),(4.18,.10,.12),'aged-gold')
mesh('earth-floor',[(-14,7,.018),(14,7,.018),(14,32,.018),(-14,32,.018)],[(0,1,2,3)],'floor',[(0,0),(7,0),(7,6.25),(0,6.25)])
# Extend the existing low entrance tunnel from y=3.1 to the new interior front=7.
for sign in [-1,1]:box('extended-tunnel-side',(sign*3.17,5.0,3.14),(.25,4.2,6.28),'cave-plaster')
box('extended-tunnel-ceiling',(0,5.0,6.4),(6.6,4.2,.24),'cave-plaster')
mesh('extended-tunnel-floor',[(-3.05,2.9,.018),(3.05,2.9,.018),(3.05,7.1,.018),(-3.05,7.1,.018)],[(0,1,2,3)],'floor',[(0,0),(1.525,0),(1.525,1.05),(0,1.05)])
# Buddha retains original UV/materials; separate high source in the same blend.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(R/'art-source/world/mogao/v008/古代佛像3d模型.glb'));source=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'][0]
pts=[source.matrix_world@Vector(c) for c in source.bound_box];lo=Vector([min(v[a] for v in pts) for a in range(3)]);hi=Vector([max(v[a] for v in pts) for a in range(3)]);scale=35/(hi.z-lo.z);center=(lo+hi)/2
source.data.transform(source.matrix_world);source.matrix_world.identity()
for v in source.data.vertices:v.co=Vector(((v.co.x-center.x)*scale,(v.co.y-center.y)*scale+L['buddha']['centerY'],(v.co.z-lo.z)*scale))
source.name='buddha-original-high';source.hide_render=True;source.hide_set(True)
buddha=source.copy();buddha.data=source.data.copy();bpy.context.collection.objects.link(buddha);buddha.name='buddha-web';buddha.hide_render=False;buddha.hide_set(False);bpy.context.view_layer.objects.active=buddha
mod=buddha.modifiers.new('web-silhouette-budget','DECIMATE');mod.ratio=.24;bpy.ops.object.modifier_apply(modifier=mod.name)
for m in buddha.data.materials:
 if m.use_nodes:
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.91;bs.inputs['Metallic'].default_value=0
for o in [buddha]:o['semanticGroup']='mogao-v008-buddha'
# Exterior derivative: only hidden inner clearance changes; measured roof remains intact.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(R/'public/assets/world/mogao-sandstone/v001/mountain.glb'));exterior=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];mountain=next(o for o in exterior if 'mountain' in o.name)
# Closed void follows sloped ceiling profile; cutter is a construction-only object.
# Weld a closed vault-shaped cutter, down to the existing floor.
vs=[(x,y,F+z+.35) for x,y,z in roofvs];fs=[tuple(reversed(f)) for f in roof_faces]
per=[(-14,7),(14,7),(14,10),(14,32),(8,32),(-8,32),(-14,32),(-14,10)]
base=len(vs);vs += [(x,y,F-.12) for x,y in per]
fs.append(tuple(reversed(range(base,base+len(per)))))
for i,(x,y) in enumerate(per):
 j=(i+1)%len(per);xx,yy=per[j];a=len(vs);vs.extend([(x,y,F+vault_height(x,y)+.35),(xx,yy,F+vault_height(xx,yy)+.35)]);fs.append((base+i,base+j,a+1,a))
cutter=mesh('vault-clearance-cutter',vs,fs,'cave-plaster',owned=False);bm=bmesh.new();bm.from_mesh(cutter.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(cutter.data);bm.free()
bpy.context.view_layer.objects.active=mountain;mod=mountain.modifiers.new('v008-hidden-vault-void','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);cutter.hide_render=True;cutter.hide_set(True)
for o in exterior:o.hide_render=True;o.hide_set(True)
clearances=[vault_height(v.co.x,v.co.y)-v.co.z for v in buddha.data.vertices];assert min(clearances)>.5, min(clearances)
exports={}
def export(label,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(O/(label+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
 raw=(O/(label+'.glb')).read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length])
 tris=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
 exports[label]={'triangles':tris,'bytes':(O/(label+'.glb')).stat().st_size}
export('interior',interior);export('buddha',[buddha]);export('mountain',exterior)
for o in exterior:o.hide_render=True;o.hide_set(True)
for o in interior+[buddha]:o.hide_render=False;o.hide_set(False)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'buddha-hall.blend'))
assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==h for p,h in protected.items())
(D/'export-manifest.json').write_text(json.dumps({'exports':exports,'originalHashes':protected,'originalsUnchanged':True,'buddhaHeight':35,'minimumBuddhaVaultClearance':min(clearances),'buddhaUV':'original UV and textures retained; decimated separate copy','roofProfile':{'type':'four sloping planes of a square truncated pyramid','summit':39.2,'summitSize':4,'centerY':24,'sideAt14m':24.2},'wallHeight':4.1,'entryFront':7},indent=2)+'\n')
# Inspection images, low illumination consistent with the intended real-time mood.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=1279;scene.render.resolution_y=925;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('cave-dark-world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.095,.075,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
bpy.ops.object.light_add(type='AREA',location=(0,7.5,5));lamp=bpy.context.object;lamp.data.energy=2200;lamp.data.shape='DISK';lamp.data.size=10;lamp.rotation_euler=(Vector((0,22,17))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=25
for name,eye,target in [('entry',(0,8.5,2),(0,22,21)),('buddha-up',(0,11.5,2.2),(0,22,27)),('door-wall',(0,12.5,2.2),(0,7,5)),('deer',(-8,9.3,2.2),(-14,17,3.5)),('novice',(8,9.3,2.2),(14,17,3.5))]:
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(W/f'mogao-v008-blender-{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(D/'buddha-hall.blend'))
print('V008',json.dumps(exports))
