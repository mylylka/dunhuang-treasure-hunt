"""Build the v001 courtyard art sample. Run: blender -b --python scripts/build-world-courtyard.py.
World placements follow the accepted graybox. Export origin: gate ground (-12, 0, 2).
No historical reconstruction is claimed; simplified forms follow the user's concept art.
"""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/courtyard/v001'
OUTPUT = ROOT / 'public/assets/world/courtyard/v001'
WORK = ROOT / 'work/world'
for folder in (SOURCE, OUTPUT, WORK): folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(257)

def linear(c): return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4

def mat(name, hexcolor, roughness=.85):
    c = tuple(linear(int(hexcolor[i:i+2],16)/255) for i in (0,2,4))
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Roughness'].default_value=roughness; return m
M = {
'plaster':mat('warm-sand-plaster','dfb17f'), 'plaster-light':mat('sunwashed-plaster','efd2a2'),
'stone':mat('warm-limestone','c7a786'), 'paving-a':mat('paving-cream','dcbf96'),
'paving-b':mat('paving-sand','cfae84'), 'paving-c':mat('paving-light','e5c9a1'),
'vermilion':mat('aged-vermilion','a84f31'), 'wood':mat('warm-carved-wood','7c492e'),
'wood-light':mat('sunlit-wood','b47743'), 'tile':mat('blue-grey-ceramic','526d73'),
 'tile-light':mat('tile-edge','718a8c'), 'teal':mat('mineral-teal','457f79'),
'gold':mat('ochre-decoration','dca654'), 'cream':mat('linen','f0d6a2'),
'orange':mat('terracotta','c97643'), 'leaf-a':mat('leaf-gold','baa756'),
'leaf-b':mat('leaf-light','d7bf61'), 'leaf-c':mat('leaf-olive','878d49'),
'leaf-d':mat('leaf-sage','a0ad69'), 'ink':mat('dark-window-interior','403a32'),
}
objs=[]
def point(x,y,z): return (x+12, 2-z, y)
def assign(o,name,material):
    o.name=name; o.data.materials.append(M[material] if isinstance(material,str) else material); objs.append(o); return o

def box(name,x,y,z,w,h,d,material='plaster',bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(x,y,z)); o=bpy.context.object
    o.dimensions=(w,d,h); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('soft-edge','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('weighted-normals','WEIGHTED_NORMAL')
    return assign(o,name,material)

def cylinder(name,x,y,z,r,h,material,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=h, location=point(x,y,z))
    return assign(bpy.context.object,name,material)

def sphere(name,x,y,z,sx,sy,sz,material,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=point(x,y,z));o=bpy.context.object
    o.scale=(sx,sz,sy);return assign(o,name,material)

def mesh(name,vertices,faces,material):
    m=bpy.data.meshes.new(name);m.from_pydata([point(*v) for v in vertices],[],faces);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);return assign(o,name,material)

def tube(name,points,r,material,radial=6):
    vertices=[]; faces=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize(); normal=tangent.cross(Vector((0,1,0)))
        if normal.length < .001: normal=tangent.cross(Vector((1,0,0)))
        normal.normalize(); other=tangent.cross(normal).normalized()
        for j in range(radial):
            a=j*math.tau/radial;v=Vector(p)+r*(math.cos(a)*normal+math.sin(a)*other);vertices.append(tuple(v))
    for i in range(len(points)-1):
        for j in range(radial): a=i*radial+j;b=i*radial+(j+1)%radial;faces.append((a,b,b+radial,a+radial))
    faces.extend([tuple(range(radial-1,-1,-1)),tuple(range((len(points)-1)*radial,len(points)*radial))])
    return mesh(name,vertices,faces,material)

def roof(name,cx,cz,w,d,eave,rise):
    # Two curved tile planes, with slightly raised corners and visible end caps.
    def height(x,t): return eave+rise*max(0,1-t)**1.7+.24*t**7+.28*(abs(x)/(w/2))**10*t**2
    for side in (-1,1):
        verts=[]; faces=[]; nx=max(8,round(w/.65)); nt=10
        for i in range(nx+1):
            x=-w/2+w*i/nx
            for j in range(nt+1):
                t=j/nt;verts.append((cx+x,height(x,t),cz+side*d*.5*t))
        for i in range(nx):
            for j in range(nt):a=i*(nt+1)+j;faces.append((a,a+1,a+nt+2,a+nt+1))
        o=mesh(name+'-tile-surface',verts,faces,'tile')
        mod=o.modifiers.new('tile-thickness','SOLIDIFY');mod.thickness=.09
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        for i in range(round(w/.32)+1):
            x=-w/2+w*i/round(w/.32)
            tube(name+'-tile-rib',[(cx+x,height(x,j/nt)+.06,cz+side*d*.5*j/nt) for j in range(nt+1)],.055,'tile-light',5)
        tube(name+'-eave-trim',[(cx-w/2+w*i/24,height(-w/2+w*i/24,1)-.10,cz+side*d*.5) for i in range(25)],.13,'wood-light',6)
        for i in range(round(w/.60)+1):
            x=-w/2+w*i/round(w/.60)
            tube(name+'-rafter',[(cx+x,height(x,t)-.20,cz+side*d*.5*t) for t in (.35,.65,1.04)],.075,'wood-light',5)
    tube(name+'-ridge',[(cx-w/2-.2+w*i/20,eave+rise+.16+.4*(abs(-1+i/10)**9),cz) for i in range(21)],.16,'gold',6)
    # Slender end ornaments echo upturned ends without invented sculptural iconography.
    for s in (-1,1):
        tube(name+'-ridge-finial',[(cx+s*(w/2-.1),eave+rise+.2,cz),(cx+s*(w/2+.12),eave+rise+.62,cz),(cx+s*(w/2+.12),eave+rise+.78,cz)],.13,'gold',5)

def wall_face_motif(cx,y,z,r=.62):
    # Simplified decorative rosette, not a copy claimed as a documented ancient pattern.
    cylinder_o=None
    for i in range(8):
        a=i*math.tau/8
        dx,dy=math.sin(a)*r*.47,math.cos(a)*r*.47
        o=sphere('decorative-petal',cx+dx,y+dy,z,r*.23,r*.43,.018,'orange')
        o.rotation_euler[1]=-a
    o=sphere('decorative-centre',cx,y,z-.012,r*.21,r*.21,.03,'gold',2)

def branch(name,a,b,r): return tube(name,[a,b],r,'wood',7)
def tree(x,z,size=1):
    branch('tree-trunk',(x,0,z),(x+.18*size,2.8*size,z+.08*size),.14*size)
    for j in range(7):
        a=j*2.4; radius=(.7+random.random()*.8)*size
        end=(x+math.cos(a)*radius,(2.3+random.random()*1.5)*size,z+math.sin(a)*radius)
        branch('tree-branch',(x+.1*size,1.5*size,z),end,.065*size)
        for k in range(5):
            pos=(end[0]+random.uniform(-.5,.5)*size,end[1]+random.uniform(-.18,.45)*size,end[2]+random.uniform(-.5,.5)*size)
            sphere('tree-leaf-cluster',*pos,.49*size,.40*size,.46*size,random.choice(['leaf-a','leaf-b','leaf-c','leaf-d']),1)

def grass(x,z,size=1):
    for i in range(6):
        a=i*2.4; h=random.uniform(.22,.52)*size; dx=math.cos(a)*.22*size;dz=math.sin(a)*.22*size
        mesh('dry-grass',[(x-.025,0,z),(x+.025,0,z),(x+dx,h,z+dz)],[(0,1,2)],'gold')

def vase(name,x,y,z,r=.4,h=.9,material='orange'):
    profile=[(r*.45,0),(r*.8,h*.1),(r,h*.42),(r*.93,h*.65),(r*.61,h*.83),(r*.62,h*.94),(r*.73,h*.97),(r*.73,h),(r*.56,h),(r*.5,h*.82)]
    vs=[];faces=[];n=16
    for rr,yy in profile:
        for i in range(n):a=i*math.tau/n;vs.append((x+rr*math.cos(a),y+yy,z+rr*math.sin(a)))
    for j in range(len(profile)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    o=mesh(name,vs,faces,material)
    for yy,rr in ((.22,.91),(.7,.84)):
        tube(name+'-band',[(x+r*rr*math.cos(i*math.tau/32),y+h*yy,z+r*rr*math.sin(i*math.tau/32)) for i in range(33)],.035,'cream',5)
    return o

# Accepted courtyard perimeter and gate. Exact wall footprints follow movement.ts.
for x in (-22,-2):
    box('courtyard-side-wall',x,1.35,-11,.6,2.7,26)
    box('courtyard-wall-plinth',x,.25,-11,.64,.5,26,'stone')
    box('courtyard-wall-coping',x,2.72,-11,.80,.17,26.1,'cream',.03)
    box('courtyard-wall-band',x,2.42,-11,.63,.17,26,'teal')
box('courtyard-rear-wall',-12,2.25,-24,20,4.5,.6)
for x in (-18.5,-5.5):
    box('entrance-wing',x,1.35,2,7,2.7,.6)
    box('entrance-stone-base',x,.24,2.01,7,.48,.64,'stone')
    box('entrance-wing-coping',x,2.74,2,7.2,.2,.9,'cream',.03)
    box('painted-wall-panel',x,1.48,2.31,6.35,1.52,.025,'teal')
    for offset in (-2.1,0,2.1):wall_face_motif(x+offset,1.47,2.34,.62)
    for yy in (.66,2.29):box('wall-painted-border',x,yy,2.34,6.5,.09,.04,'gold')
for x in (-15,-9):
    box('gate-pier',x,1.8,2,.9,3.6,1.2,'vermilion',.04)
    box('gate-pier-base',x,.25,2,.9,.5,1.2,'stone',.03)
    box('gate-pier-cap',x,3.7,2,1.3,.18,1.5,'gold',.03)
    box('gate-inset',x,2.05,2.61,.41,2.3,.025,'teal')
box('gate-lintel',-12,3.91,2,7,.38,1.4,'wood')
box('gate-painted-fascia',-12,4.05,2.73,6.8,.36,.06,'teal')
for x in (-14,-13,-12,-11,-10):wall_face_motif(x,4.05,2.77,.18)
roof('entrance-roof',-12,2,7.8,3.5,4.3,.82)

# Courtyard paving: irregular color and subtle grout; height remains zero.
box('courtyard-ground',-12,-.035,-10.8,19.7,.07,25.5,'paving-b')
for row in range(21):
    z=1.05-row*1.15
    for col in range(16):
        x=-21.4+col*1.22+(row%2)*.18
        if -20.5<x<-3.5 and z < -12.4:continue
        box('courtyard-paver',x,-.003,z,1.185,.012,1.105,random.choice(['paving-a','paving-b','paving-c']))
# Continuous steps as accepted by the ramp proxy.
box('hall-front-step',-12,.07,-13.1,17,.14,1.4,'stone',.018)
box('hall-platform',-12,.14,-18.5,17,.28,10,'paving-a',.018)
for x in (-20.5,-3.5):box('hall-side-wall',x,2.7,-18.5,.6,5.4,11,'plaster-light')
box('hall-back-wall',-12,2.7,-23.5,17,5.4,.6,'plaster-light')
for x in (-18,-6):
    for z in (-14,-20):
        box('column-stone-foot',x,.43,z,.65,.30,.65,'stone',.025)
        cylinder('hall-vermilion-column',x,2.78,z,.285,4.4,'vermilion',12)
        box('column-neck',x,4.91,z,.62,.2,.62,'gold')
        for hh,ww in ((5.0,.9),(5.12,1.2)):
            box('bracket-x',x,hh,z,ww,.16,.34,'wood-light',.025)
            box('bracket-z',x,hh-.04,z,.34,.15,ww,'wood-light',.025)
for z in (-14,-20):
    box('hall-crossbeam',-12,5.15,z,17.5,.48,.65,'vermilion')
    box('crossbeam-teal-inlay',-12,5.13,z+.335,16.3,.25,.02,'teal')
    for x in range(-19,-4,2):wall_face_motif(x,5.12,z+.36,.18)
for x in (-19.8,-4.2):box('hall-long-beam',x,5.18,-18.5,.45,.44,11,'vermilion')
box('hall-ceiling',-12,5.47,-18.5,17.5,.18,11,'wood-light')
# Independent caisson source preserved whole, down-facing with inset framing.
texpath=OUTPUT/'caisson.png'
if not texpath.exists():texpath=ROOT/'art-source/world/art-sample/v001/藻井独立正视图.jpeg'
if not texpath.exists():texpath=Path.home()/'Downloads/3d视觉素材库/藻井独立正视图.jpeg'
im=bpy.data.images.load(str(texpath));
if max(im.size)>1024:im.scale(1024,1024)
im.pack()
caisson=mat('caisson-original-art','ffffff')
p=caisson.node_tree.nodes.get('Principled BSDF'); tex=caisson.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
caisson.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
# Mild emission preserves painted legibility in the naturally shaded hall.
caisson.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.22
co=mesh('caisson-art-panel',[(-15.35,4.78,-21.35),(-8.65,4.78,-21.35),(-8.65,4.78,-14.65),(-15.35,4.78,-14.65)],[(0,1,2,3)],caisson)
uv=co.data.uv_layers.new(name='UVMap')
for idx,v in enumerate([(0,1),(1,1),(1,0),(0,0)]):uv.data[idx].uv=v
for side,yy in ((6.9,4.76),(7.25,4.86)):
    for z in (-18-side/2,-18+side/2):box('caisson-frame',-12,yy,z,side,.13,.18,'gold')
    for x in (-12-side/2,-12+side/2):box('caisson-frame',x,yy,-18,.18,.13,side,'teal')
for z in (-21.5,-14.5):box('caisson-coffer-side',-12,5.03,z,7,.4,.12,'wood-light')
for x in (-15.5,-8.5):box('caisson-coffer-side',x,5.03,-18,.12,.4,7,'wood-light')
# A painted decorative rear wall echoes the concept's floral composition.
box('hall-mural-field',-12,2.7,-23.18,8.2,3.3,.025,'teal')
for yy in (1.0,4.4):box('hall-mural-border',-12,yy,-23.13,8.5,.12,.06,'gold')
for xx in (-16.2,-7.8):box('hall-mural-border',xx,2.7,-23.13,.12,3.5,.06,'gold')
wall_face_motif(-12,2.7,-23.12,1.55)
for xx in (-15,-9):
    for yy in (1.55,3.85):wall_face_motif(xx,yy,-23.12,.40)
for x in (-18,-6):
    box('hall-window-recess',x,2.65,-23.18,1.75,2.5,.05,'ink')
    for xx in (-.88,.88):box('hall-window-frame',x+xx,2.65,-23.1,.12,2.65,.14,'wood-light')
    for yy in (1.4,3.9):box('hall-window-frame',x,yy,-23.1,1.85,.12,.14,'wood-light')
    for i in range(1,6):box('hall-window-lattice',x-.88+i*1.76/6,2.65,-23.06,.045,2.5,.06,'wood-light')
    for i in range(1,8):box('hall-window-lattice',x,1.4+i*2.5/8,-23.04,1.75,.045,.06,'wood-light')

# Upper storey: inaccessible solid block with detailed lattice windows.
box('upper-floor',-12,6.66,-18.7,16,2.2,9.0,'plaster-light')
for x in (-19.6,-16,-12,-8,-4.4):
    box('upper-post',x,6.71,-14.12,.26,2.45,.30,'vermilion')
for x in (-17.8,-14,-10,-6.2):
    box('window-recess',x,6.77,-14.18,2.35,1.5,.06,'ink')
    for xx in (-1.18,1.18):box('window-frame',x+xx,6.77,-14.10,.13,1.68,.15,'wood-light')
    for yy in (6.00,7.53):box('window-frame',x,yy,-14.10,2.5,.12,.15,'wood-light')
    for i in range(1,8):box('window-lattice-vertical',x-1.175+i*2.35/8,6.77,-14.06,.045,1.48,.06,'wood-light')
    for i in range(1,5):box('window-lattice-horizontal',x,6+i*1.53/5,-14.04,2.35,.045,.06,'wood-light')
box('upper-painted-beam',-12,7.85,-14.05,16.5,.35,.35,'teal')
for x in range(-19,-4,2):wall_face_motif(x,7.85,-13.85,.16)
# Lower eaves lie above the caisson ceiling, with no slabs hiding the artwork.
roof('hall-lower-roof',-12,-18.5,18.2,12.0,5.65,.92)
roof('hall-upper-roof',-12,-18.7,18.5,11.3,8.08,1.7)
# Workshop, within the previously collidable tabletop footprint.
box('workbench-top',-18,.94,-7.5,3.3,.18,1.4,'wood-light',.035)
for x in (-19.3,-16.7):
    for z in (-8,-7):box('workbench-leg',x,.45,z,.16,.9,.16,'wood')
box('workbench-stretcher',-18,.32,-7.5,2.8,.13,.15,'wood')
for i in range(4):vase('pigment-bowl',-19.0+i*.56,1.04,-7.38,.19,.16,['teal','orange','gold','cream'][i])
box('sample-board',-17.2,1.04,-7.65,.55,.04,.58,'cream')
for i in range(3):tube('brush', [(-17.12+i*.09,1.08,-7.70),(-17.12+i*.09,1.09,-7.27)],.016,'wood',5)
# Small pots at wall edges are decorative and do not introduce a false collision barrier.
for x,z,r,h in [(-21.55,-3,.26,.7),(-21.55,-10,.25,.65),(-2.45,-10.8,.25,.6),(-20.95,-22.8,.25,.65)]:
    vase('courtyard-pot',x,0,z,r,h,'teal')
# Trees use the approved established positions; trunks are deliberately narrow decorative detail.
for x,z,s in [(-18,-2,.9),(-6,-2,.85),(-6,-11,.8),(5,13,.75),(-6,12,.7),(7,3,.8),(-27,-10,.95)]:tree(x,z,s)
for i in range(35):
    x=random.choice([-1,1])*random.uniform(2.8,5.2);z=random.uniform(13,27)
    grass(x,z,random.uniform(.7,1.4))
for i in range(20):grass(random.uniform(-28,-23.2),random.uniform(-20,3),random.uniform(.7,1.3))

# Join material batches to bound draw calls. Keep artwork a stable standalone node.
for material in list(M.values()):
    group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==material]
    if not group:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
    merged=bpy.context.object;merged.name='courtyard-'+material.name
    # Every exported component uses the same explicit gate origin.
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
# Render rig is not included in GLB.
bpy.ops.object.light_add(type='AREA',location=point(-7,24,9));key=bpy.context.object;key.name='preview-key';key.data.energy=2800;key.data.shape='DISK';key.data.size=12
key.rotation_euler=(Vector(point(-12,0,-11))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,12));sun=bpy.context.object;sun.name='preview-sun';sun.data.energy=2.5;sun.rotation_euler=(.4,-.6,-.5)
bpy.ops.object.camera_add(location=point(8,14,21));cam=bpy.context.object;cam.name='preview-camera';cam.rotation_euler=(Vector(point(-11,3.2,-9))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42
scene=bpy.context.scene;scene.camera=cam;scene.world=bpy.data.worlds.new('preview-world');scene.world.color=(.38,.48,.58)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WORK/'courtyard-model-v001.png')
# Serialize the editable source and portable standard-PBR model.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'courtyard.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'courtyard.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=90)
# Triangle and byte counts are measured from the actual exported JSON accessors.
import struct
raw=(OUTPUT/'courtyard.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
manifest={'version':'v001','status':'art sample pending user approval','worldOrigin':[-12,0,2],'upAxis':'Y','units':'metres','model':'courtyard.glb','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':tris,'meshCount':len(g['meshes']),'materials':len(g['materials']),'referenceArchive':'art-source/world/art-sample/v001/','caissonSource':'藻井独立正视图.jpeg','embeddedImageDimensions':[1024,1024],'caissonHeight':4.78,'caissonProcessing':'Full original composition, downsampled to 1024, embedded JPEG quality 90; no repaint or watermark removal.','collision':'Accepted movement.ts proxies, unchanged. Gate clear width, walls and hall columns preserve accepted footprints.','references':['最新纹彩院庭院图.png','半开放藻井观赏厅内部图.png','环境小品和树木资产设定板.png','最新沙漠世界高空总览图.png'],'limitations':['Simplified 3D interpretation pending art review, not a historical reconstruction.','Small pots, grasses and narrow tree trunks remain decorative without new collision proxies.']}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('COURTYARD_EXPORT',json.dumps(manifest,ensure_ascii=False))
bpy.ops.render.render(write_still=True)
cam.location=point(-12,1.3,-10)
cam.rotation_euler=(Vector(point(-12,4.75,-17.3))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.lens=30
scene.render.filepath=str(WORK/'courtyard-caisson-v001.png')
bpy.ops.render.render(write_still=True)
