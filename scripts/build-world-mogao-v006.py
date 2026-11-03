"""A new continuous sandstone massif and reference-led nine-storey cliff facade.
All geometry is authored in Blender, with fixed profiles and no random noise.
Old Tripo files and all delivered source/GLB versions remain untouched.
"""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v006';O=R/'public/assets/world/mogao/v006';W=R/'work/world'
for p in (D,O,W):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
F=6.85546875;objects=[];buffers={};group='mountain'
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 rgb=[linear(int(color[i:i+2],16)/255) for i in (0,2,4)];bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.94;bs.inputs['Metallic'].default_value=0;m.diffuse_color=(*rgb,1);return m
M={k:material(k,v) for k,v in {'sand':'dfbd83','sandstone':'c5a16c','stone-light':'d7b78a','stone-bed':'b38b5b','plaster':'d6c3a3','plaster-side':'c6ae88','timber':'994b3f','timber-shadow':'703b31','timber-light':'ad6352','tile':'687675','tile-edge':'7f8a85','tile-dark':'4d605f','stone-step':'c9b38a','stone-tread':'d4bf99','door-dark':'392b27','door':'783c32','metal':'79654b'}.items()}
def mesh(name,verts,faces,mat,semantic=None):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,y,z-F) for x,y,z in verts],[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(M[mat]);o['semanticGroup']=semantic or group;objects.append(o);return o
# Batched editable construction pieces are grouped by storey and material.
def poly(verts,faces,mat):
 key=(group,mat);vs,fs=buffers.setdefault(key,([],[]));n=len(vs);vs.extend(verts);fs.extend(tuple(n+i for i in f) for f in faces)
def box(name,x,y,z,w,d,h,mat):
 vs=[(x+sx*w/2,y+sy*d/2,z+sz*h/2) for sz in (-1,1) for sy in (-1,1) for sx in (-1,1)]
 poly(vs,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],mat)
def tube(points,r,mat,n=8):
 vs=[];fs=[]
 for i,p in enumerate(points):
  tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized();u=tangent.cross(Vector((0,0,1)))
  if u.length<.01:u=tangent.cross(Vector((1,0,0)))
  u.normalize();v=tangent.cross(u).normalized()
  for j in range(n):vs.append(tuple(Vector(p)+r*(math.cos(j*math.tau/n)*u+math.sin(j*math.tau/n)*v)))
 for i in range(len(points)-1):
  for j in range(n):a=i*n+j;b=i*n+(j+1)%n;fs.append((a,b,b+n,a+n))
 fs.extend([tuple(range(n-1,-1,-1)),tuple(range((len(points)-1)*n,len(points)*n))]);poly(vs,fs,mat)
def flush():
 for (g,m),(vs,fs) in buffers.items():mesh(g+'-'+m,vs,fs,m,g)
 buffers.clear()
# Horizontal stations are explicitly composed: wide faces, two shallow bedding
# setbacks, a broad irregular crest. No pile of individual rock primitives.
xs=[-63,-53,-40,-28,-18,0,18,29,43,55,63]
crest=[62,63.5,62.8,63.2,64.2,65.0,62.8,58.0,54.8,52.8,50.8]
front=[-1,-10,-13,-8,-2,-3,-5,-12,-6,-2,3]
levels=[0,7,21,22.1,35,42,43.2,1] # last station is each authored crest
retreat=[0,.8,2.0,3.2,3.8,5.0,6.2,8.5]
vs=[];n=len(xs)
for row,h in enumerate(levels):
 for i,x in enumerate(xs):
  z=crest[i] if row==7 else h+(0 if row<2 else [0,1.2,.4,.7,-.3,-.2,.2,-1.4,-.8,.5,0][i])
  vs.append((x,front[i]+retreat[row]*[1.2,.8,1.1,.7,.9,1,1,.75,1.2,.8,.9][i],z))
fs=[]
for j in range(7):
 for i in range(n-1):a=j*n+i;fs.append((a,a+1,a+1+n,a+n))
# A closed back and broad roof keep the massif substantial from oblique views.
back=len(vs);vs.extend([(x,40,crest[i]-2) for i,x in enumerate(xs)]);bottom=len(vs);vs.extend([(x,40,-.4) for x in xs])
for i in range(n-1):fs.extend([(7*n+i,7*n+i+1,back+i+1,back+i),(back+i,back+i+1,bottom+i+1,bottom+i),(i,bottom+i,bottom+i+1,i+1)])
fs.extend([tuple([j*n for j in range(8)]+[back,bottom]),tuple([j*n+n-1 for j in range(8)]+[back+n-1,bottom+n-1])])
mountain=mesh('continuous-authored-sandstone-massif',vs,fs,'sandstone','mountain')
# Only shallow beds change tone; facets get their primary contrast from geometry.
mountain.data.materials.append(M['stone-bed']);mountain.data.materials.append(M['stone-light'])
for p in mountain.data.polygons:
 z=p.center.z+F
 if 21<z<23 or 42<z<44:p.material_index=1
 elif z>48:p.material_index=2

def cut(name,loc,size,mat='sandstone'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(loc[0],loc[1],loc[2]-F));c=bpy.context.object;c.name=name;c.dimensions=size;c.data.materials.append(M[mat]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.context.view_layer.objects.active=mountain;mod=mountain.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.ops.object.modifier_apply(modifier=mod.name)
 c.hide_render=True;c.hide_set(True);c['constructionOnly']=True
# The accepted chamber remains exactly at its former world position.
cut('room-clearance',(0,18.15,F+10.25),(24.8,31.1,20.55))
cut('main-passage-clearance',(0,-5.5,F+4.6),(8.8,18.2,9.3))
# Nine distinct storeys: broad lower eave, progressively closer upper eaves.
eaves=[17.6,26.3,34.2,41.4,47.8,53.5,58.3,62.3,65.8]
widths=[38,34.8,33.5,32.2,30.8,29.5,28.2,26.7,25.0]
# Remove only the volume occupied by the plaster-backed cliff frontage.
for i,h in enumerate(eaves):
 bottom=F if i==0 else eaves[i-1]+.65;top=h+2.5;w=widths[i]-3.8
 cut('tower-recess-'+str(i+1),(0,0,(bottom+top)/2),(w,22,top-bottom))
# Few small secondary openings: real shallow cavities with dark inner backs.
for i,(x,z,w,h) in enumerate([(-40,15,2.8,4.2),(-28,34,2.4,3.8),(33,23,3.1,4.5),(48,39,2.5,3.5)]):
 cut('secondary-recess-'+str(i),(x,-5,z+h/2),(w,40,h),'door-dark');group='secondary-caves';box('shadow-backing',x,14.95,z+h/2,w-.08,.10,h-.08,'door-dark')
# Wind-deposited sand shares the flat desert material and goes below ground at
# the outer margin. It cannot cover the central steps or alter the main road.
group='sand-foot'
def foot_y(x):
 for i in range(len(xs)-1):
  if x<=xs[i+1]:
   t=max(0,min(1,(x-xs[i])/(xs[i+1]-xs[i])));return front[i]*(1-t)+front[i+1]*t-.3
 return front[-1]-.3
for side in (-1,1):
 vv=[];ff=[];nx=32;nt=8
 for i in range(nx+1):
  x=side*(10+54*i/nx);near=foot_y(x)
  crest_h=1.1+(.55 if 25<abs(x)<45 else .1)
  for j in range(nt+1):
   t=j/nt;y=near-10*t;z=crest_h*(1-t)**2-.045;vv.append((x,y,z))
 for i in range(nx):
  for j in range(nt):a=i*(nt+1)+j;ff.append((a,a+1,a+nt+2,a+nt+1))
 o=mesh('windblown-foot-'+str(side),vv,ff,'sand','sand-foot')
 for p in o.data.polygons:p.use_smooth=True
# Flat background extends under the region with no edge visible from the route.
group='region-ground';box('regional-ground',0,-15,-.13,230,210,.24,'sand')
# The high stone plinth and central ceremonial stair connect to the old room.
group='stone-plinth';box('raised-plinth',0,-1,F/2,34,24,F,'stone-step')
steps=30;stair_front=-29;stair_back=-13
for i in range(steps):
 y0=stair_front+(stair_back-stair_front)*i/steps;y1=stair_back;h=F*(i+1)/steps
 box('central-stair',0,(y0+y1)/2,h/2,13,y1-y0,h,'stone-step')
 # One thin brighter tread at each nosing, built into the step rather than floating.
 box('stair-tread',0,y0+.07,h-.025,13,.14,.05,'stone-tread')
# Open passage floor; upper surfaces meet the existing cave floor at y=3.
box('passage-floor',0,-5,F-.055,8.8,16.2,.11,'stone-tread')
# Discreet stair parapets follow the incline, outside the navigable width.
for sign in (-1,1):
 tube([(sign*6.8,-29,.65),(sign*6.8,-13,F+.65)],.24,'stone-light',6)
 box('stair-side-landing',sign*6.8,-12.8,F+.48,.55,.8,.96,'stone-light')

def roof(name,w,yfront,yback,eave,rise,top=False,ridge=True):
 global group
 old=group;group=name
 nx=48;ny=7
 def high(x,t):return eave+rise*t**1.65+(.90 if top else .72)*(abs(x)/(w/2))**10*(1-t*.65)+(1.2*(1-abs(x)/(w/2))**3*t**1.3 if top else 0)
 vv=[(-w/2+w*i/nx,yfront+(yback-yfront)*j/ny,high(-w/2+w*i/nx,j/ny)) for i in range(nx+1) for j in range(ny+1)]
 ff=[];n=len(vv);vv += [(x,y,z-.18) for x,y,z in vv]
 for i in range(nx):
  for j in range(ny):
   a=i*(ny+1)+j;f=(a,a+ny+1,a+ny+2,a+1);ff.append(f);ff.append(tuple(n+k for k in reversed(f)))
 boundary=[i*(ny+1) for i in range(nx+1)]+[nx*(ny+1)+j for j in range(1,ny+1)]+[i*(ny+1)+ny for i in range(nx-1,-1,-1)]+list(range(ny-1,0,-1))
 for a,b in zip(boundary,boundary[1:]+boundary[:1]):ff.append((a,b,b+n,a+n))
 poly(vv,ff,'tile')
 # Rounded tile channels, assembled into one material batch per storey.
 count=round(w/.48)
 for i in range(count+1):
  x=-w/2+w*i/count;tube([(x,yfront+(yback-yfront)*j/ny,high(x,j/ny)+.055) for j in range(ny+1)],.065,'tile-edge',5)
 # Thick red fascia and roof underside follow the upturned eave continuously.
 pts=[(-w/2+w*i/32,yfront,high(-w/2+w*i/32,0)-.18) for i in range(33)]
 tube(pts,.20,'timber',6);tube([(x,y+.10,z-.24) for x,y,z in pts],.16,'timber-shadow',6)
 for i in range(round(w/.9)+1):
  x=-w/2+w*i/round(w/.9)
  tube([(x,yfront-.10,high(x,0)-.48),(x,yfront+(yback-yfront)*.75,high(x,.75)-.30)],.105,'timber-shadow',6)
 # Side edge courses make the attached roofs readable from either side.
 for sign in (-1,1):tube([(sign*w/2,yfront+(yback-yfront)*j/ny,high(sign*w/2,j/ny)+.08) for j in range(ny+1)],.14,'tile-dark',6)
 if top and ridge:
  tube([(-w/2+w*i/24,yback,eave+rise+.22+.55*abs(-1+i/12)**8+1.2*(1-abs(-1+i/12))**3) for i in range(25)],.21,'timber-shadow',8)
 group=old

def window(x,y,z,w,h):
 box('window-recess',x,y+.08,z,w,.16,h,'door-dark')
 for sign in (-1,1):box('window-jamb',x+sign*w/2,y-.04,z,.15,.22,h+.2,'timber')
 for sign in (-1,1):box('window-head-sill',x,y-.04,z+sign*h/2,w+.2,.22,.16,'timber')
 for j in range(1,6):box('window-lattice',x-w/2+w*j/6,y-.08,z,.065,.12,h,'timber-light')
 for j in range(1,4):box('window-lattice',x,y-.08,z-h/2+h*j/4,w,.12,.065,'timber-light')

for i,(eave,w) in enumerate(zip(eaves,widths)):
 group=f'tower-storey-{i+1:02d}'
 level=F if i==0 else eaves[i-1]+1.0
 yfront=-11.8+i*1.25;wall_y=-3.0+i*.64;half=(w-4.3)/2;post_y=yfront+.7
 # Walls are closed and overlap the mountain recess at their outer returns.
 if i==0:
  for sign in (-1,1):box('ground-floor-wall',sign*(4.4+half)/2,wall_y,(level+eave)/2,half-4.4,1.0,eave-level,'plaster')
  box('main-door-lintel',0,wall_y,(F+9.3+eave)/2,8.8,1.0,eave-(F+9.3),'plaster')
  for sign in (-1,1):box('passage-wall',sign*4.5,-.1,F+4.5,.2,6.2,9,'plaster-side')
  box('passage-ceiling',0,-.1,F+9.25,9,6.2,.3,'plaster-side')
 else:
  box('storey-backing',0,wall_y,(level+eave)/2,half*2,1.0,eave-level,'plaster')
  window(0,wall_y-.55,(level+eave)/2,3.6 if i<5 else 2.6,(eave-level)*.64)
 # Buttresses bind the timber frontage into the cliff, with stepped shoulders.
 for sign in (-1,1):
  box('plaster-side-return',sign*(half-.35),(wall_y+10)/2,(level+eave+.9)/2,.85,10-wall_y,eave+.9-level,'plaster-side')
  box('slender-front-return',sign*(half-.35),(post_y+wall_y)/2,(level+eave)/2,.85,wall_y-post_y,eave-level,'plaster')
 if i>0:box('gallery-floor',0,(post_y+wall_y)/2,level-.15,half*2,wall_y-post_y+.8,.30,'plaster-side')
 box('front-crossbeam',0,post_y,eave-.63,half*2+.35,.55,.55,'timber')
 positions=[-half+.6,-half*.57,-4.55 if i==0 else -half*.19,4.55 if i==0 else half*.19,half*.57,half-.6]
 for x in positions:
  tube([(x,post_y,level+.2),(x,post_y,eave-.85)],.25 if i<3 else .20,'timber',10)
  box('column-base',x,post_y,level+.14,.7,.7,.28,'stone-light')
  for k in range(3):box('dougong-step',x,post_y-.05-k*.13,eave-.80+k*.18,1.0+k*.30,.60+k*.22,.18,'timber-light' if k==1 else 'timber')
  if i<6:
   for sign in (-1,1):tube([(x,post_y, eave-2.1),(x+sign*1.15,post_y,eave-.8)],.115,'timber-shadow',6)
 if i>0:
  for z in [level+.24,level+1.3]:box('balustrade-rail',0,post_y-.2,z,half*2,.22,.18,'timber')
  count=round(half*2/.72)
  for j in range(count+1):box('balustrade-upright',-half+half*2*j/count,post_y-.2,level+.76,.12,.16,1.1,'timber-light')
  for sign in (-1,1):
   tube([(sign*half,post_y,level+1.3),(sign*half,wall_y,level+1.3)],.10,'timber',6)
 # The principal ground doorway stays fully open; neighbouring bays have lattice doors.
 if i==0:
  for x in (-11.7,11.7):window(x,wall_y-.55,F+3.7,4.5,6.6)
  for sign in (-1,1):box('main-door-frame',sign*4.55,wall_y-.6,F+4.6,.28,.35,9.2,'timber')
  box('main-door-frame',0,wall_y-.6,F+9.3,9.4,.35,.32,'timber')
 roof('tower-roof-'+str(i+1),w,yfront-2,wall_y+.45,eave,2.0 if i==0 else 1.45 if i<5 else 1.05 if i<8 else 2.2,top=i==8)
# The top crest has a compact raised centre and a narrow traditional finial.
group='tower-crown';top_y=-3+8*.64+.45;top_z=65.8+2.2+1.2
roof('tower-crown-rear',25,top_y+4.0,top_y,65.8,2.2,top=True,ridge=False)
tube([(0,top_y,top_z+.15),(0,top_y,top_z+2.8)],.13,'metal',8)
for r,z in [(.65,top_z+.3),(.46,top_z+.7),(.32,top_z+1.25),(.22,top_z+1.8)]:
 # Six-sided collars read clearly without fine mesh decoration.
 tube([(0,top_y,z-.10),(0,top_y,z+.10)],r,'metal',8)
flush()
# Store the nine eave positions explicitly for geometry/visual verification.
L=json.loads((R/'src/content/world/mogao-layout-v003.json').read_text());L['version']='v006';L['cliff']={'width':126,'depth':51,'height':65.0};L['tower']={'eaves':eaves,'widths':widths,'height':72.0,'storeys':9,'reference':'莫高窟高楼.jpeg'};L['stairs']={'front':-29,'back':-13,'width':13,'rise':F,'steps':steps};L.pop('walkSurface',None);L.pop('frontRocks',None)
L['sandFoot']={'xMin':10,'xMax':64,'columns':32,'outwardLength':10,'rows':8,'leftProfiles':[[10+54*i/32,foot_y(-(10+54*i/32)),1.1+(.55 if 25<10+54*i/32<45 else .1)] for i in range(33)],'rightProfiles':[[10+54*i/32,foot_y(10+54*i/32),1.1+(.55 if 25<10+54*i/32<45 else .1)] for i in range(33)]}
L['frontBands']=[[xs[i],xs[i+1],min(front[i],front[i+1])-.1] for i in range(len(xs)-1) if xs[i+1]<=-18 or xs[i]>=18]
L['views'].update({'overview':[122,43,0],'distant':[94,32,-.24],'approach':[122,-16,0],'steps':[122,-37,0],'entrance':[122,-61,0],'oblique':[158,16,.46]})
(R/'src/content/world/mogao-layout-v006.json').write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
# Keep the accepted room in the editable source file solely for alignment.
exterior=list(objects);before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(R/'public/assets/world/mogao/v003/interior.glb'))
for o in bpy.context.scene.objects:
 if o not in before:o['semanticGroup']='accepted-interior-reference';o.hide_set(True);o.hide_render=True
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao.blend'))
# Export by shared material, retaining small web draw-call count.
batches={}
for src in exterior:
 cp=bpy.data.objects.new('export-'+src.name,src.data.copy());bpy.context.collection.objects.link(cp);cp.matrix_world=src.matrix_world.copy();batches.setdefault(tuple(m.name for m in cp.data.materials),[]).append(cp)
selected=[]
for items in batches.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 if len(items)>1:bpy.ops.object.join()
 selected.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT');tris=0
for o in selected:o.select_set(True);o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
f=O/'exterior.glb';bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
report={'reference':'../../mogao/v006/莫高窟高楼.jpeg','towerStoreys':9,'eaveWorldHeights':eaves,'eaveWidths':widths,'triangles':tris,'batches':len(selected),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'source':'New authored Blender geometry; no Tripo exterior data','interior':'Unchanged v003/interior.glb, preserved room and story','style':'Broad continuous sandstone facets, red cliff-attached timber, compressed upper storeys, grey-green curved tile roofs.'}
(D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('EXPORT',json.dumps(report))
