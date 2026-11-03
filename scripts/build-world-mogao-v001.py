"""Authored stratified cliff and one monumental cave. No random height/peak generator.
New v001 work only; old region models are never opened or rewritten.
"""
import bpy,bmesh,math,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; WORK=ROOT/'work/world'
DEST=ROOT/'art-source/world/models/mogao/v001'; OUT=ROOT/'public/assets/world/mogao/v001'
for p in (DEST,OUT,WORK):p.mkdir(parents=True,exist_ok=True)
L=json.loads((ROOT/'src/content/world/mogao-layout-v001.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
mats={};group='cliff'
def mat(name,color,texture=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.96
 if texture:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(texture),check_existing=True);m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
 mats[name]=m;return m
for n,c in [('sandstone',(.52,.27,.11)),('sandstone-light',(.61,.34,.16)),('sandstone-pale',(.68,.41,.22)),('sandstone-shadow',(.44,.26,.13)),('plaster',(.34,.17,.085)),('plaster-warm',(.45,.25,.13)),('floor',(.46,.39,.28)),('floor-light',(.52,.45,.33)),('floor-seam',(.31,.25,.18)),('stone',(.67,.52,.33)),('stone-pale',(.77,.64,.44)),('wood',(.36,.13,.06)),('vermilion',(.54,.19,.08)),('gold',(.65,.39,.13)),('teal',(.10,.25,.23)),('roof',(.18,.28,.27)),('roof-light',(.27,.37,.34)),('dark',(.08,.055,.035))]:mat(n,c)
mat('ground-sand',(.7379,.5089,.2270))
mat('lotus-art',(1,1,1),ROOT/'public/assets/world/courtyard/v002/wall-lotus-panel.jpg')
mat('vine-art',(1,1,1),ROOT/'public/assets/world/courtyard/v002/wall-vine-panel.jpg')
mat('border-art',(1,1,1),ROOT/'public/assets/world/courtyard/v002/wall-floral-border.jpg')
mat('deer-art',(1,1,1),ROOT/'public/assets/world/mogao/v001/three-wall-scroll.jpg')
# UV sampling only: original concept pixels, bounded to its central standing figure.
mat('pillar-concept',(1,1,1),ROOT/'art-source/world/mogao/v001/进入洞窟.png')
def mesh(name,vs,fs,material,uv=None):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o['semanticGroup']=group;d.materials.append(mats[material])
 if uv:
  layer=d.uv_layers.new(name='UVMap')
  for loop in d.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
 else:
  bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
 return o
def box(name,loc,size,material='stone',bevel=.04):
 x,y,z=[v/2 for v in size];vs=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
 o=mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material);o.location=loc
 if bevel:
  b=o.modifiers.new('worn-large-edges','BEVEL');b.width=bevel;b.segments=2;o.modifiers.new('weighted-normals','WEIGHTED_NORMAL')
 return o
def cut(obj,name,loc,size):
 cutter=box(name,loc,size,'dark',0);bpy.context.view_layer.objects.active=obj
 mod=obj.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
 bpy.ops.object.modifier_apply(modifier=mod.name)
 cutter.hide_render=True;cutter.hide_set(True);cutter['constructionOnly']=True
 return obj
def bar(name,a,b,width,depth,material='wood'):
 a=Vector(a);b=Vector(b);o=box(name,(a+b)/2,(width,depth,(b-a).length),material,.025);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def panel(name,center,right,up,w,h,material,uv=None):
 c=Vector(center);r=Vector(right)*w/2;u=Vector(up)*h/2
 return mesh(name,[c-r-u,c+r-u,c+r+u,c-r+u],[(0,1,2,3)],material,uv or [(0,0),(1,0),(1,1),(0,1)])
def cylinder(name,loc,radius,depth,material,vertices=12):
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius*1.08,radius2=radius,depth=depth,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(mats[material]);o['semanticGroup']=group
 b=o.modifiers.new('edge','BEVEL');b.width=.025;b.segments=1;o.modifiers.new('normals','WEIGHTED_NORMAL');return o
# A continuous set of authored strata. Shared x stations establish broad rock faces.
xs=[-80,-67,-53,-40,-27,-15,-7,7,18,31,46,59,70,80]
front=[7.4,1.8,5.8,-1.7,3.8,1.7,0,0,3.1,-2.1,4.8,-.4,3.3,7.2]
crest=[32,35,34,37,38,37,40,40,39,41,40,44,42,41]
levels=[-2.4,5.6,12.2,20,28,37.6];setback=[0,.65,.1,1.8,3.4,5.5]
# Hand-drawn sedimentary contours: shared boundaries and broad weathered buttresses.
strata_waves=[0,.55,-.2,.6,-.3,.1,0,0,.35,-.4,.2,.7,-.1,0]
face_recession=[0,1.0,.2,-.2,.6,.2,0,0,.3,1.2,-.3,.6,.2,0]
# Door openings have actual depth; upper entrances stay inaccessible.
niches=[(-64,2,2.8,4.7),(-45,3,3.2,5.2),(-27,1.5,3.4,5.3),(24,2.2,3.3,5.2),(46,1.2,2.6,4.5),(65,3,3.5,5.4),(-55,14,3.4,5),(-32,14.6,3.3,5.2),(-13,15.2,3,5.1),(18,15,3.2,5.1),(40,16,3.4,5.3),(62,24,3.2,4.8)]
for band in range(5):
 vs=[]
 for i,x in enumerate(xs):
  lo=levels[band]+(strata_waves[i]*(1+band*.3) if band else 0);hi=crest[i]-2.4 if band==4 else levels[band+1]+strata_waves[i]*(1+(band+1)*.3)
  vs.extend([(x,front[i]+setback[band]+face_recession[i]*band,lo),(x,front[i]+setback[band+1]+face_recession[i]*(band+1),hi),(x,48,lo),(x,48,hi)])
 fs=[]
 for i in range(len(xs)-1):
  a=i*4;b=a+4;fs.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a+1,b+1,b+3,a+3),(a,a+2,b+2,b)])
 fs.extend([(0,1,3,2),tuple((len(xs)-1)*4+k for k in (0,2,3,1))])
 o=mesh(f'continuous-rock-stratum-{band}',vs,fs,['sandstone','sandstone-light','sandstone','sandstone-pale','sandstone-light'][band])
 if band<2:cut(o,'main-entry-void',(0,3,4.55),(8,18,9.3))
 if band<4:cut(o,'principal-chamber-void',(0,25,10),(24.15,30.2,20.1))
 for k,(x,z,w,h) in enumerate(niches):
  if z<levels[band+1]+3 and z+h>levels[band]:cut(o,f'recess-{k}',(x,2,z+h/2),(w,14,h))
 bevel=o.modifiers.new('weathered-stratum-edges','BEVEL');bevel.width=.13;bevel.segments=1;o.modifiers.new('rock-face-normals','WEIGHTED_NORMAL')
# Weathered shelves follow actual strata at selected spans; chamfered rock edges
# taper into the parent mass, rather than floating rectangular decorative bricks.
for band,spans in [(1,[(0,3),(4,6),(8,11),(11,13)]),(2,[(1,4),(8,10)]),(3,[(0,2),(3,5),(9,13)]),(4,[(1,4),(8,12)])]:
 for segment,(start,end) in enumerate(spans):
  vs=[]
  for i in range(start,end+1):
   x=xs[i]; y=front[i]+setback[band]+face_recession[i]*band;z=levels[band]+strata_waves[i]*(1+band*.3)
   depth=.25 if i in (start,end) else .85
   vs.extend([(x,y+.15,z-.55),(x,y-depth,z-.18),(x,y-depth*.8,z+.20),(x,y+.25,z+.48)])
  fs=[]
  for j in range(end-start):
   for k in range(4):fs.append((j*4+k,(j+1)*4+k,(j+1)*4+(k+1)%4,j*4+(k+1)%4))
  fs.extend([(3,2,1,0),tuple((end-start)*4+k for k in range(4))])
  mesh(f'weathered-layer-shelf-{band}-{segment}',vs,fs,'sandstone-pale')
# Walkways: continuous structural shelves + rhythmic low wooden railing.
group='cliff-walkways'
for i,(a,b,z,y) in enumerate([(-72,-18,11.2,-.6),(11,70,12.7,-.8),(-53,25,23,2.0)]):
 box(f'gallery-stone-shelf-{i}',((a+b)/2,y,z-.25),(b-a,2.8,.5),'stone',.10)
 for zz in (.35,1.1):bar('gallery-horizontal-rail',(a,y-1.15,z+zz),(b,y-1.15,z+zz),.13,.13)
 for j in range(round((b-a)/2.5)+1):
  xx=a+(b-a)*j/round((b-a)/2.5);box('gallery-post',(xx,y-1.15,z+.62),(.17,.17,1.25),'wood',.02)
# Traditional broad curved roof; full profile, rafters, ridge and tile runs.
def roof(name,cx,cy,z,w,d):
 nx=30;ny=12;vs=[];fs=[]
 for j in range(ny+1):
  v=j/ny*2-1
  for i in range(nx+1):
   u=i/nx*2-1;vs.append((cx+u*w/2,cy+v*d/2,z+1.5*(1-abs(v))+.55*abs(u)**6+.20*abs(v)**5))
 for j in range(ny):
  for i in range(nx):a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1))
 o=mesh(name,vs,fs,'roof');mod=o.modifiers.new('thick-eave','SOLIDIFY');mod.thickness=.20
 for i in range(25):
  x=cx-w/2+i*w/24
  for j in range(ny):
   a=j/ny*2-1;b=(j+1)/ny*2-1
   bar('roof-tile-seam',(x,cy+a*d/2,z+1.5*(1-abs(a))+.55*abs((x-cx)/(w/2))**6+.20*abs(a)**5+.08),(x,cy+b*d/2,z+1.5*(1-abs(b))+.55*abs((x-cx)/(w/2))**6+.20*abs(b)**5+.08),.10,.09,'roof-light')
 for y in (cy-d/2,cy+d/2):
  for i in range(12):
   a=-1+i/6;b=-1+(i+1)/6
   bar('swept-eave',(cx+a*w/2,y,z+.55*abs(a)**6+.15),(cx+b*w/2,y,z+.55*abs(b)**6+.15),.22,.25,'vermilion')
 bar('roof-ridge',(cx-w/2+.3,cy,z+1.6),(cx+w/2-.3,cy,z+1.6),.24,.28,'stone-pale')
group='main-portal'
for x in (-4.55,4.55):
 box('gate-stone-foot',(x,-1.2,.4),(1.25,1.4,.8),'stone-pale',.08)
 cylinder('painted-gate-column',(x,-1.2,4.6),.42,8.4,'vermilion',16)
 box('gate-capital',(x,-1.2,8.9),(1.15,1.5,.45),'gold',.06)
 for z in (1.0,7.9):box('gate-column-band',(x,-1.2,z),(.94,1.05,.18),'gold',.02)
box('portal-lintel',(0,-1.1,9.12),(10.4,1.4,.68),'vermilion',.06)
panel('painted-lintel',(0,-1.82,9.14),(1,0,0),(0,0,1),9.5,.86,'border-art')
for x in [-4,-2,0,2,4]:
 for z,w in [(9.6,.9),(9.9,1.35)]:box('bracket-set',(x,-1.2,z),(w,2.3,.22),'gold',.04)
roof('principal-cave-eaves',0,-.8,10.25,12.2,6)
# Two secondary eaves establish hierarchy along the upper cliff.
for x,y,z in [(-32,1.2,20.0),(40,2,21.6)]:
 roof('secondary-cave-eaves',x,y,z,6.1,3.3)
 for xx in (x-2.1,x+2.1):box('secondary-portico-column',(xx,y, z-2.5),(.30,.35,5),'vermilion',.025)
# Broad platform and shallow risers. Local z=0 is the cave floor at world y=2.4.
group='entry-terrace'
box('entry-platform',(0,-3.5,-1.2),(20,7,2.4),'stone',.06)
for i in range(12):
 top=-2.4+(i+1)*.2;front=-13+i*.5
 box(f'step-{i}',(0,(front-7)/2,(top-2.4)/2),(12,-7-front,top+2.4),'stone-pale',.025)
for x in (-9.3,9.3):
 for y in (-6.2,-3.5,-.8):box('platform-parapet-post',(x,y,.7),(.42,.42,1.4),'stone-pale',.045)
 bar('platform-handrail',(x,-6.4,1.15),(x,-.8,1.15),.17,.17,'wood')
# Real interior shell, no background card. Entry transitions into the broad chamber.
group='cave-interior'
box('chamber-west-wall',(-12.3,25,9),(.6,30,18),'plaster',.045)
box('chamber-east-wall',(12.3,25,9),(.6,30,18),'plaster',.045)
box('chamber-rear-wall',(0,40.3,9),(24.6,.6,18),'plaster-warm',.045)
for x in (-8.5,8.5):box('chamber-entrance-side',(x,9.7,9),(7,.6,18),'plaster-warm',.045)
box('chamber-entry-upper',(0,9.7,13.5),(10,.6,9),'plaster',.045)
for x in (-4.25,4.25):box('passage-side',(x,5,4.5),(.5,10,9),'plaster-warm',.04)
box('passage-ceiling',(0,5,9.15),(8.5,10,.3),'plaster',.03)
# The approved compact plan returns to 24 x 30 m; 18 m murals / 20 m vault.
mesh('high-vault-west',[(-12,10,18),(-5,14,20),(-5,36,20),(-12,40,18)],[(3,2,1,0)],'plaster-warm')
mesh('high-vault-east',[(12,10,18),(12,40,18),(5,36,20),(5,14,20)],[(3,2,1,0)],'plaster-warm')
mesh('high-vault-front',[(-12,10,18),(12,10,18),(5,14,20),(-5,14,20)],[(3,2,1,0)],'plaster-warm')
mesh('high-vault-back',[(-12,40,18),(-5,36,20),(5,36,20),(12,40,18)],[(3,2,1,0)],'plaster-warm')
box('vault-flat-top',(0,25,20.15),(10,22,.3),'plaster',.02)
for x in (-2.5,2.5):
 for y in (16.5,21.5,26.5,31.5,35):panel('ceiling-lotus-coffer',(x,y,19.97),(1,0,0),(0,-1,0),3.6,3.6,'lotus-art')
for x in (-5,0,5):box('ceiling-cross-strip',(x,25,19.87),(.17,22,.22),'teal',.01)
for y in (14,19,24,29,34,36):box('ceiling-perimeter-strip',(0,y,19.87),(10,.17,.22),'gold',.01)
# Continuous worn rock-earth floor. Deliberately placed broad color patches are
# interpolated vertex colors, not raised blocks or randomly displaced terrain.
group='cave-floor'
floor=mat('worn-cave-floor',(.95,.95,.95),OUT/'floor-albedo.png')
node=floor.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='stoneWear'
tex=next(n for n in floor.node_tree.nodes if n.type=='TEX_IMAGE')
mix=floor.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
floor.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);floor.node_tree.links.new(node.outputs['Color'],mix.inputs[2]);floor.node_tree.links.new(mix.outputs[0],floor.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
normaltex=floor.node_tree.nodes.new('ShaderNodeTexImage');normaltex.image=bpy.data.images.load(str(OUT/'floor-normal.png'));normaltex.image.colorspace_settings.name='Non-Color'
normal=floor.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;floor.node_tree.links.new(normaltex.outputs['Color'],normal.inputs['Color']);floor.node_tree.links.new(normal.outputs['Normal'],floor.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
for width,front,depth in [(8,0,10),(24,10,30)]:
 nx=12;nz=16;vs=[];fs=[]
 for j in range(nz+1):
  for i in range(nx+1):vs.append((-width/2+i*width/nx,front+j*depth/nz,.024))
 for j in range(nz):
  for i in range(nx):a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1))
 o=mesh('continuous-worn-stone-floor',vs,fs,'worn-cave-floor',[(x/4,y/4) for x,y,z in vs])
 colors=o.data.color_attributes.new(name='stoneWear',type='FLOAT_COLOR',domain='CORNER')
 for loop in o.data.loops:
  x,y,_=vs[loop.vertex_index]
  # Large, quiet walking wear down the middle and four asymmetrical mineral stains.
  wear=.055*math.exp(-(x/5)**2)+.026*math.exp(-((x+8)/5)**2-((y-20)/9)**2)-.025*math.exp(-((x-8)/7)**2-((y-37)/9)**2)
  colors.data[loop.index].color=(.90+wear,.90+wear,.90+wear,1)
# User-approved immersive three-wall arrangement. The complete original scroll
# runs continuously across left / front / right at its exact original ratio.
group='interior-painted-surfaces'
height=18;bottom=.012
# A continuous 10033.33px-wide excerpt; the story player retains the full scroll.
u_end=(84/18*2150)/12918
for name,c,r,w,u0,u1 in [
 ('left',(-11.965,25,bottom+height/2),(0,1,0),30,0,30/84*u_end),
 ('front',(0,39.965,bottom+height/2),(1,0,0),24,30/84*u_end,54/84*u_end),
 ('right',(11.965,25,bottom+height/2),(0,-1,0),30,54/84*u_end,u_end),
]:
 panel(f'three-wall-deer-{name}',c,r,(0,0,1),w,height,'deer-art',[(u0,0),(u1,0),(u1,1),(u0,1)])
# Only the thin architectural crown remains; there are no frames or blank bands
# inserted through the tall story paintings.
for x in (-11.93,11.93):box('wall-crown',(x,25,18.10),(.18,30,.20),'teal',.015)
box('rear-wall-crown',(0,39.93,18.10),(24,.18,.20),'teal',.015)
for x in (-3.96,3.96):
 for y in (2.5,7.5):panel('entry-painted-wall',(x,y,4.9),(0,1 if x<0 else -1,0),(0,0,1),3.2,3.2,'lotus-art')
# Floor grounding and broad approach apron are Blender-authored surfaces too.
group='region-ground'
box('regional-sand-base',(15,-42,-2.55),(220,180,.20),'ground-sand',0)
# Archive editable .blend before batching; hidden Boolean tools remain editable.
originals=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.get('constructionOnly')]
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'mogao.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in originals:
 data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
 cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy();cp['semanticGroup']=o.get('semanticGroup','architecture')
 batches.setdefault((cp['semanticGroup'],tuple(m.name for m in data.materials)),[]).append(cp);o.hide_render=True;o.hide_set(True)
exported=[]
for (g,names),items in batches.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 if len(items)>1:bpy.ops.object.join()
 o=bpy.context.object;o.name=g+'--'+names[0];exported.append(o)
# Split by meaningful region: exterior and enterable interior, material batches within each.
inside={'cave-interior','cave-floor','central-pillar','interior-painted-surfaces'};exports={}
for label,predicate in [('exterior',lambda o:o['semanticGroup'] not in inside),('interior',lambda o:o['semanticGroup'] in inside)]:
 bpy.ops.object.select_all(action='DESELECT');tris=0;count=0
 for o in exported:
  if predicate(o):o.select_set(True);o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles);count+=1
 file=OUT/(label+'.glb');bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
 exports[label]={'triangles':tris,'batches':count,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
manifest={'status':'independent v001 awaiting visual approval','exports':exports,'dimensions':L,'textures':{'deer':'6144px texture; contiguous 10033.33px excerpt of source mapped to 30/24/30m walls at 18m height; full original retained in story player; see scroll-mapping.json','centralPillar':'removed by explicit user request; the prior draft is archived under work/world','ornament':'existing user supplied courtyard decorative artwork; stylized reuse, not an exact restoration'}}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
if '--render' not in sys.argv:
 print(json.dumps(exports));sys.exit(0)
# Blender verification cameras, never exported as gameplay geometry.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=950;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('desert');world.use_nodes=True;scene.world=world;world.node_tree.nodes.get('Background').inputs[0].default_value=(.70,.78,.86,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.55,-.4,-.65);sun.data.energy=2.8;sun.data.angle=.1
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=29
# Inspection fill at the entrance approximates diffuse sky, without hiding shape.
bpy.ops.object.light_add(type='AREA',location=(0,-2,7));fill=bpy.context.object;fill.data.energy=5000;fill.data.shape='DISK';fill.data.size=9;fill.rotation_euler=(Vector((0,25,6))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(0,20,13));bounce=bpy.context.object;bounce.data.energy=1500;bounce.data.size=14
for name,eye,target,lens in [('exterior',(-35,-72,10),(1,0,17),31),('entrance',(0,-19,4.8),(0,1,7),27),('interior',(0,12,3.2),(0,32,9.0),24),('west-wall',(3,15,3.2),(-15,31,10.1),21),('three-walls',(0,11,3.2),(0,32,9),15)]:
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;scene.render.filepath=str(WORK/f'mogao-v001-blender-{name}.png');bpy.ops.render.render(write_still=True)
print(json.dumps(exports))
