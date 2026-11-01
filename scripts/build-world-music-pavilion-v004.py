"""Independent v004, authored proportions and repeated masonry; no random geometry.
Preserves v003 source; new .blend retains editable parts, GLB is material-batched.
"""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'work/world'
SOURCE=ROOT/'art-source/world/models/music-pavilion/v003/music-pavilion.blend'
DEST=ROOT/'art-source/world/models/music-pavilion/v004';OUT=ROOT/'public/assets/world/music-pavilion/v004'
for path in (DEST,OUT):path.mkdir(parents=True,exist_ok=True)
old_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
layout=json.loads((ROOT/'src/content/world/music-pavilion-layout-v004.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
scale=layout['buildingScale'];lift=layout['buildingLift']
for ob in list(bpy.data.objects):
 if ob.type!='MESH':continue
 if ob.get('semanticGroup') in ('courtyard-enclosure','court-paving','court-props'):
  ob.hide_render=True;ob.hide_set(True);ob['excludeV4']=True;continue
 # Transform actual source vertices in world space; musicians keep human scale.
 inv=ob.matrix_world.inverted()
 for v in ob.data.vertices:
  p=ob.matrix_world@v.co
  if ob.get('semanticGroup')=='gallery-musicians':
   cx=-6 if p.x < -4.4 else -2.8
   p.x+=cx*(scale-1);p.z+=4.56*(scale-1)+lift
  else:
   old=p.copy();p.x*=scale;p.z=p.z*scale+lift
   split=layout['rightWing']['splitLocal']
   if p.x>split:p.x=split+(p.x-split)*layout['rightWing']['factor']
   if ob.get('semanticGroup')=='mural-frame' and old.y<8.95:
    p.x=layout['mural']['center'][0]-46+(old.x-3.5)*layout['mural']['width']/7.6
    p.z=layout['mural']['center'][1]+(old.z-4.65)*layout['mural']['height']/5.7
   if ob.get('semanticGroup')=='porch' and old.z<=.361:p.z-=.04
  v.co=inv@p
 ob.data.update()
mats={m.name:m for m in bpy.data.materials};group='courtyard-enclosure'
def box(name,loc,size,mat='plaster',bevel=.025):
    sx,sy,sz=[float(v)/2 for v in size]
    verts=[(-sx,-sy,-sz),(sx,-sy,-sz),(sx,sy,-sz),(-sx,sy,-sz),(-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    data=bpy.data.meshes.new('v004-'+name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new('v004-'+name,data);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(mats[mat]);o['semanticGroup']=group
    if bevel:
        b=o.modifiers.new('soft-edges','BEVEL');b.width=bevel;b.segments=1
        o.modifiers.new('weighted','WEIGHTED_NORMAL')
    return o

def bar(name,a,b,width,depth,mat='stone-light'):
    a=Vector(a);b=Vector(b);o=box(name,(a+b)/2,(width,depth,(b-a).length),mat,.012);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

# A patterned wall module has actual empty apertures. Each side is assembled
# from masonry rails, piers and repeated octagons, never an opaque decal.
def perforated_panel(name,width,height,cols,rows):
    verts=[];indices={};faces={}
    def vi(p):
        key=tuple(round(v,7) for v in p)
        if key not in indices:indices[key]=len(verts);verts.append(key)
        return indices[key]
    def face(points):
        ids=[]
        for point in points:
            i=vi(point)
            if i not in ids:ids.append(i)
        if len(ids)<3:return
        key=tuple(sorted(ids))
        if key in faces:faces[key]=None
        else:faces[key]=ids
    cw=width/cols;ch=height/rows
    for row in range(rows):
        for col in range(cols):
            x=-width/2+cw*(col+.5);z=-height/2+ch*(row+.5);w=cw/2;h=ch/2
            rx=w-.055;rz=h-.055
            hole=[(-.46*rx,rz),(.46*rx,rz),(rx,.46*rz),(rx,-.46*rz),(.46*rx,-rz),(-.46*rx,-rz),(-rx,-.46*rz),(-rx,.46*rz)]
            outer=[(-w,h),(w,h),(w,h),(w,-h),(w,-h),(-w,-h),(-w,-h),(-w,h)]
            def pt(p,y):return(x+p[0],y,z+p[1])
            for k in range(8):
                j=(k+1)%8
                ring=[outer[k],outer[j],hole[j],hole[k]]
                face([pt(v,-.12) for v in ring]);face([pt(v,.12) for v in reversed(ring)])
                face([pt(hole[k],-.12),pt(hole[j],-.12),pt(hole[j],.12),pt(hole[k],.12)])
            corners=[(-w,h),(w,h),(w,-h),(-w,-h)]
            for k in range(4):
                a=corners[k];b=corners[(k+1)%4]
                face([pt(a,-.12),pt(b,-.12),pt(b,.12),pt(a,.12)])
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],[f for f in faces.values() if f]);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(mats['stone-light']);obj['semanticGroup']=group
    mod=obj.modifiers.new('rounded-cut-edges','BEVEL');mod.width=.012;mod.segments=1
    obj.modifiers.new('weighted','WEIGHTED_NORMAL')
    return obj


def mesh(name,vs,fs,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mats[mat]);o['semanticGroup']=group;return o

def wall_segment(a,b,bays):
 start=Vector((*a,0));delta=Vector((b[0]-a[0],b[1]-a[1],0));length=delta.length;direction=delta.normalized();theta=math.atan2(direction.y,direction.x)
 def piece(name,x,z,w,h,depth,mat):
  p=start+direction*x;p.z=z;o=box(name,p,(w,depth,h),mat);o.rotation_euler.z=theta;return o
 # Same 1.60 m openwork panel as the approved study; lower masonry only.
 piece('solid-base',length/2,1.25,length,2.5,.48,'plaster')
 piece('stone-foot',length/2,.22,length,.44,.58,'stone')
 piece('window-sill',length/2,2.58,length,.16,.64,'stone-light')
 piece('window-lintel',length/2,4.35,length,.22,.56,'plaster')
 piece('cap-teal',length/2,4.51,length,.12,.67,'teal')
 piece('cap-stone',length/2,4.64,length,.14,.76,'stone-light')
 span=length/bays
 for i in range(bays+1):piece('pier',i*span,3.45,.38,1.6,.60,'plaster')
 for i in range(bays):
  available=span-.38;o=perforated_panel('v004-octagonal-openwork',available,1.60,max(2,round(available/.82)),2)
  o.location=start+direction*((i+.5)*span);o.location.z=3.45;o.rotation_euler.z=theta

xl,xr=-22,24;yf,yb=-12,19.65;gate=layout['gate']['center'][0]-46;gl,gr=gate-3.2,gate+3.2
wall_segment((xl,yf),(gl,yf),4);wall_segment((gr,yf),(xr,yf),8)
wall_segment((xl,yf),(xl,yb),10);wall_segment((xr,yf),(xr,yb),10);wall_segment((xl,yb),(xr,yb),12)
for x,y in [(x,y) for x in (xl,xr) for y in (yf,yb)]+[(gl,yf),(gr,yf)]:
 box('corner-pier',(x,y,2.35),(.76,.76,4.7),'plaster')
 box('corner-foot',(x,y,.28),(.88,.88,.56),'stone')
 box('corner-cap',(x,y,4.76),(.98,.98,.18),'stone-light')
# Whole-building tiered base: ten broad, shallow risers around the front/sides.
group='terraced-foundation'
for i in range(10):
 extension=(9-i)*.38;front=7.7-extension;back=19.32;h=(i+1)*.18
 box('continuous-terrace-'+str(i),(1.125,(front+back)/2,h/2),(27.05+2*extension,back-front,h),'stone-light' if i%3 else 'stone',.018)
# Portal floor was lifted to 1.80 m; close tiny front joins beneath it.
# Paving uses irregular slabs and retains the established palette.
group='court-paving'
for row in range(28):
 for col in range(46):
  x=-20.9+col*.97+(.14 if row%2 else 0);y=-10.9+row*1.08
  if x>23.25 or (-16.05<x<18.3 and y>4):continue
  dx=.455;dy=.51
  pts=[(-dx,-dy),(.20,-dy),(dx,-.25),(dx-.02,dy),(-.26,dy),(-dx,.20)]
  vs=[(x+a,y+b,z) for z in (.01,.065) for a,b in pts]
  fs=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(k,(k+1)%6,(k+1)%6+6,k+6) for k in range(6)]
  mesh('irregular-court-slab',vs,fs,['stone-light','stone','stone-light','stone-shadow'][(row+col*3)%4])

def lathe(name,x,y,z,profile,mat,n=20):
 vs=[(x+r*math.cos(j*math.tau/n),y+r*math.sin(j*math.tau/n),z+h) for r,h in profile for j in range(n)]
 fs=[]
 for k in range(len(profile)-1):
  for j in range(n):a=k*n+j;b=k*n+(j+1)%n;fs.append((a,b,b+n,a+n))
 fs+=[tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))]
 return mesh(name,vs,fs,mat)

def ellipsoid(name,loc,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mats[mat]);o['semanticGroup']=group
 for p in o.data.polygons:p.use_smooth=True
 return o

def pipa(x,y,z,s=1,tilt=0):
 created=set(bpy.data.objects)
 ellipsoid('pear-shaped-pipa',(x,y,z+.35*s),(.21*s,.08*s,.32*s),'instrument')
 ellipsoid('pipa-shoulder',(x,y,z+.60*s),(.12*s,.065*s,.18*s),'instrument')
 bar('pipa-neck',(x,y,z+.57*s),(x+.08*s,y,z+1.15*s),.07*s,.08*s,'dark')
 for j in range(4):bar('pipa-string',(x+(j-1.5)*.018*s,y-.085*s,z+.20*s),(x+.08*s+(j-1.5)*.018*s,y-.05*s,z+1.11*s),.004*s,.004*s,'string')
 for h in (.96,1.07):bar('pipa-pegs',(x-.06*s,y,z+h*s),(x+.19*s,y,z+h*s),.035*s,.035*s,'wood-light')
 if tilt:
  bpy.context.view_layer.update();pivot=Vector((x,y,z));rotation=Matrix.Rotation(tilt,4,'X')
  for o in set(bpy.data.objects)-created:o.matrix_world=Matrix.Translation(pivot)@rotation@Matrix.Translation(-pivot)@o.matrix_world

def table(x,y,w,d,h,bench=False):
 box('bench-top' if bench else 'worktable-top',(x,y,h-.06),(w,d,.12),'wood-light',.035)
 for dx in (-w/2+.12,w/2-.12):
  for dy in (-d/2+.14,d/2-.14):box('furniture-leg',(x+dx,y+dy,(h-.12)/2),(.11,.11,h-.12),'wood')
 if not bench:
  box('table-stretcher',(x,y,.24),(.09,d-.15,.09),'wood')
  for k in (-1,1):box('carved-apron',(x+k*(w/2-.06),y,h-.22),(.08,d-.2,.24),'wood')

group='workshop-furnishings'
for f in layout['furnishings']:
 x,y=f['local'];w,d,h=f['size'];kind=f['kind']
 if kind in ('table','bench','flute-table'):
  table(x,y,w,d,h,kind=='bench')
  if kind=='flute-table':
   for j,length in enumerate((.62,.79,.93)):bar('bamboo-flute',(x-.7,y-.32+j*.24,h+.04),(x-.7+length,y-.32+j*.24,h+.04),.042,.042,'instrument')
   box('folded-musician-cloth',(x+.65,y+.1,h+.045),(.55,.6,.09),'teal',.04)
  elif kind=='table':
   if x<0:pipa(x,y-.32,h+.04,.75,math.pi/2)
   else:
    box('cloth-cushion',(x,y,h+.06),(.85,1.25,.12),'cloth-orange',.08)
    for j in range(3):bar('instrument-slats',(x-.25+j*.23,y-.4,h+.14),(x-.25+j*.23,y+.5,h+.14),.045,.045,'instrument')
 elif kind=='pipa-rack':
  for xx in (x-w/2+.15,x+w/2-.15):box('rack-upright',(xx,y,.9),(.12,.13,1.8),'wood');box('rack-foot',(xx,y,.08),(.32,.7,.16),'wood')
  for z in (.18,1.47):box('rack-rail',(x,y,z),(w,.12,.12),'wood-light')
  for xx in (x-.55,x+.55):pipa(xx,y-.16,.24,1)
 elif kind=='gong':
  for xx in (x-.9,x+.9):box('gong-upright',(xx,y,1.1),(.14,.16,2.2),'wood');box('gong-foot',(xx,y,.1),(.42,.8,.2),'wood')
  box('gong-beam',(x,y,2.25),(2.1,.18,.18),'wood-light')
  ellipsoid('bronze-gong',(x,y,1.38),(.67,.08,.67),'ochre');ellipsoid('gong-boss',(x,y-.09,1.38),(.15,.045,.15),'instrument')
  for dx in (-.25,.25):bar('gong-cord',(x+dx,y,1.96),(x+dx,y,2.18),.018,.018,'linen')
 elif kind=='drum':
  r=w/2
  lathe('barrel-drum',x,y,.18,[(r*.83,0),(r,.18*h),(r,.60*h),(r*.83,h-.22)],'cloth-orange')
  lathe('drum-skin',x,y,h-.035,[(r*.84,0),(r*.84,.035)],'linen')
  for z in (.25,h-.12):lathe('drum-hoop',x,y,z,[(r*.92,0),(r*.92,.05)],'dark')
  for dx in (-r*.6,r*.6):box('drum-support',(x+dx,y,.12),(.13,d*.9,.24),'wood')
  bar('drumstick',(x-r*.6,y,h+.05),(x+r*.4,y+.18,h+.05),.025,.025,'wood-light')
 elif kind=='pot':
  r=w/2
  lathe('ceramic-vessel',x,y,0,[(r*.5,0),(r*.8,.1*h),(r,.42*h),(r*.86,.7*h),(r*.48,.86*h),(r*.49,h),(r*.36,h),(r*.37,.85*h)],'cloth-orange')
  for zz,rr in ((.2,.88),(.65,.9),(.82,.52)):lathe('ceramic-teal-band',x,y,zz*h,[(r*rr,0),(r*rr,.05*h)],'teal')
 elif kind=='cloth-post':
  box('high-drapery-post',(x,y,h/2),(.22,.22,h),'wood');box('high-drapery-foot',(x,y,.2),(.55,.55,.4),'stone')
# Cloth tops have loops over continuous supported beams; no floating curtains.
group='high-drapery'
bar('continuous-high-crossbeam',(-21,7.5,8.2),(-21,16.5,8.2),.23,.23,'wood-light')
for cy,height,material in ((9.75,5.4,'teal'),(14.15,6.3,'cloth-orange')):
 nx=18;ny=14;vs=[];fs=[]
 for j in range(ny+1):
  v=j/ny
  for i in range(nx+1):
   u=i/nx;vs.append((-21+.16*math.sin(u*math.pi*6)*(.25+.75*v),cy+(u-.5)*3.6,8.12-height*v+.26*math.sin(u*math.pi)*v))
 for j in range(ny):
  for i in range(nx):a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1))
 o=mesh('long-woven-drape',vs,fs,material);mod=o.modifiers.new('cloth-thickness','SOLIDIFY');mod.thickness=.018
 for yy in (-1.4,-.7,0,.7,1.4):bar('cloth-hanging-loop',(-21,cy+yy,8.05),(-21,cy+yy,8.28),.035,.035,'linen')

# Save editable working source before material batching and inspection staging.
bpy.ops.object.select_all(action='DESELECT')
originals=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.get('excludeV4')]
for o in originals:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
# Join evaluated mesh copies, retaining authored UVs and smooth normals.
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
manifest={'version':'v004','status':'awaiting visual approval','triangles':triangles,'meshBatches':len(exported),'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest(),'previousSourceUnchanged':hashlib.sha256(SOURCE.read_bytes()).hexdigest()==old_hash,'muralAreaRatio':layout['mural']['width']*layout['mural']['height']/(7.6*5.7),'wallTop':4.71,'openworkHeight':1.60,'platformHeight':1.8,'floorHeight':(4.56-.36)*scale,'humanNominalHeight':2.017}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');assert manifest['previousSourceUnchanged']
# Inspection only: exact original artwork, no export into model (runtime animates it).
group='render-only';m=bpy.data.materials.new('mural-inspection');m.use_nodes=True
bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ROOT/'public/assets/world/music-pavilion/v002/mural-original.png'));m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.9;mats[m.name]=m
mx,my,mz=layout['mural']['center'];x=mx-46;y=-9-mz;w=layout['mural']['width'];h=layout['mural']['height']
o=mesh('inspection-mural',[(x-w/2,y,my-h/2),(x+w/2,y,my-h/2),(x+w/2,y,my+h/2),(x-w/2,y,my+h/2)],[(0,1,2,3)],m.name);uv=o.data.uv_layers.new()
for loop in o.data.loops:
 co=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((co.x-x+w/2)/w,(co.z-my+h/2)/h)
box('render-ground',(0,5,-.16),(130,130,.3),'stone-light',0)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('inspection-world');world.use_nodes=True;scene.world=world;bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.69,.77,.83,1);bg.inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.6,-.45,-.6);bpy.context.object.data.energy=2.8;bpy.context.object.data.angle=.10
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
for name,eye,target,ortho in [('courtyard',(48,-55,47),(0,6,3.1),57),('wall',(0,-23,7),(8,-12,3.1),13),('side-space',(35,-9,28),(13,10,3),34)]:
 cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=ortho;scene.render.filepath=str(WORK/f'music-pavilion-v004-blender-{name}.png');bpy.ops.render.render(write_still=True)
print(json.dumps(manifest))
