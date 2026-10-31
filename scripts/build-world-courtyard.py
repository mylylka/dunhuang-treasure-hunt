"""Build the v002 courtyard art sample. Run: blender -b --python scripts/build-world-courtyard.py -- --version v002.
World placements follow the accepted graybox. Export origin: gate ground (-12, 0, 2).
No historical reconstruction is claimed; simplified forms follow the user's concept art.
"""
import bpy, math, random, json, hashlib, argparse, sys
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--version',default='v002')
parser.add_argument('--skip-render',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
VERSION=args.version
if VERSION=='v001' or not (len(VERSION)==4 and VERSION[0]=='v' and VERSION[1:].isdigit()):raise ValueError('v001 is preserved; use a new vNNN version starting at v002')
SOURCE = ROOT / 'art-source/world/models/courtyard' / VERSION
OUTPUT = ROOT / 'public/assets/world/courtyard' / VERSION
LAYOUT_PATH=ROOT/'src/content/world/courtyard-props.json'
LAYOUT=json.loads(LAYOUT_PATH.read_text())
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
'rock-ochre':mat('rock-ochre','b98a60',1),'rock-red':mat('rock-red','a7795d',1),'rock-sand':mat('rock-sand','ccb08a',1),
}
objs=[]
CURRENT_BATCH=None
CAMERA_GROUPS={}
ROCK_OBJECTS={}
ROCK_CHECKS=[]
ROCK_PLACEMENTS=[]
def point(x,y,z): return (x+12, 2-z, y)
def assign(o,name,material):
    o.name=name; o.data.materials.append(M[material] if isinstance(material,str) else material)
    simple_group = ('courtyard-paving' if name=='courtyard-paver' else 'road-grass' if name=='dry-grass' else 'window-decoration' if name.startswith(('window-','hall-window-')) else 'workshop-decoration' if name.startswith(('pigment-','brush','sample-board')) else None)
    o['semanticGroup']=CURRENT_BATCH or simple_group or o.name.replace('.','-')
    solid=name.startswith(('courtyard-side-wall','courtyard-rear-wall','courtyard-wall-','entrance-wing','entrance-stone-base','gate-pier','gate-lintel','hall-side-wall','hall-back-wall','column-','hall-vermilion-column','bracket-','hall-crossbeam','hall-long-beam','hall-ceiling','upper-floor','upper-post','caisson-frame','caisson-coffer','caisson-art-panel')) or (CURRENT_BATCH is not None and 'roof' in CURRENT_BATCH)
    o['cameraRole']='solid' if solid else 'decoration'
    objs.append(o); return o

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
    global CURRENT_BATCH
    previous_batch=CURRENT_BATCH;CURRENT_BATCH=name
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

    CURRENT_BATCH=previous_batch

def art_material(filename):
    m=mat('art-'+filename.removesuffix('.jpg'),'ffffff')
    im=bpy.data.images.load(str(OUTPUT/filename));im.pack()
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
    node=m.node_tree.nodes.get('Principled BSDF')
    m.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color'])
    node.inputs['Roughness'].default_value=.98
    return m
ART={k:art_material('wall-'+k+'.jpg') for k in ('floral-panel','lotus-panel','vine-panel','floral-border')}
def panel(name,x,y,z,w,h,art,face='z+'):
    right={'z+':(1,0,0),'z-':(-1,0,0),'x+':(0,0,-1),'x-':(0,0,1)}[face]
    verts=[(x+right[0]*u*w,y+v*h,z+right[2]*u*w) for u,v in ((-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5))]
    o=mesh(name,verts,[(0,1,2,3)],ART[art]);uv=o.data.uv_layers.new(name='UVMap')
    for i,co in enumerate(((0,0),(1,0),(1,1),(0,1))):uv.data[i].uv=co
    return o

def tree(prop):
    global CURRENT_BATCH
    x,z=prop['x'],prop['z'];cfg=prop['visual'];height=cfg['height'];width=cfg['crownWidth'];seed=cfg['seed']
    rng=random.Random(seed);trunk_radius=prop['radius'];branch_height=max(2.5,height*.46)
    previous=CURRENT_BATCH;CURRENT_BATCH=prop['id']+'-trunk'
    tube('trunk',[(x,0,z),(x+.02,branch_height*.55,z-.02),(x+.035,branch_height,z+.025)],trunk_radius-.05,'wood',7)
    crown_bottom=max(2.25,height*.53);crown_depth=height-crown_bottom
    for j in range(7):
        a=j*2.39996+seed*.1;rr=width*.31*(.7+rng.random()*.3)
        end=(x+math.cos(a)*rr,crown_bottom+crown_depth*(.25+rng.random()*.4),z+math.sin(a)*rr)
        CURRENT_BATCH=prop['id']+'-trunk'
        tube('branch',[(x+.025,branch_height,z+.025),end],.045+trunk_radius*.08,'wood',6)
        CURRENT_BATCH=prop['id']+'-canopy'
        for k in range(6):
            aa=a+k*2.4;rad=width*.10*rng.random()
            pos=(end[0]+math.cos(aa)*rad,end[1]+rng.uniform(-.05,.27)*crown_depth,end[2]+math.sin(aa)*rad)
            sx=width*rng.uniform(.12,.17);sy=crown_depth*rng.uniform(.18,.26);sz=sx*rng.uniform(.7,1.1)
            sphere('leaf-cluster',*pos,sx,sy,sz,rng.choice(['leaf-a','leaf-b','leaf-c','leaf-d']),1)
    CURRENT_BATCH=previous

def rock(prop):
    global CURRENT_BATCH
    previous=CURRENT_BATCH;CURRENT_BATCH=prop['id']
    x,y,z=prop['x'],prop['y'],prop['z'];cfg=prop['visual'];h=prop['height'];rx=cfg['radiusX'];rz=cfg['radiusZ'];rng=random.Random(cfg['seed'])
    vertices=[];n=7
    for ring in range(3):
        for i in range(n):
            a=i*math.tau/n+.11*(ring%2);rr=(.88 if ring==0 else 1 if ring==1 else .47)*rng.uniform(.84,1)
            yy=(-.035 if ring==0 else h*rng.uniform(.38,.68) if ring==1 else h*rng.uniform(.86,1))
            vertices.append((x+math.cos(a)*rx*rr,y+yy,z+math.sin(a)*rz*rr))
    vertices.append((x+rx*.05,y+h,z-rz*.04));faces=[]
    for ring in range(2):
        for i in range(n):a=ring*n+i;b=ring*n+(i+1)%n;faces.extend([(a,b,b+n),(a,b+n,a+n)])
    for i in range(n):faces.append((2*n+i,2*n+(i+1)%n,3*n))
    # The x/z ring winds clockwise when viewed from above in Y-up space.
    # Reverse its side/top triangles so all normals face out; close the underside.
    faces=[tuple(reversed(face)) for face in faces]
    faces.append(tuple(range(n)))
    o=mesh(prop['id'],vertices,faces,cfg['color'])
    ROCK_OBJECTS[prop['id']]=o
    center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
    inward=sum(1 for face in o.data.polygons if face.normal.dot(face.center-center)<-.00001)
    o.data.calc_loop_triangles()
    triangle_keys=[tuple(sorted(tuple(round(a,6) for a in o.data.vertices[i].co) for i in tri.vertices)) for tri in o.data.loop_triangles]
    duplicate=len(triangle_keys)-len(set(triangle_keys))
    if inward or duplicate:raise ValueError(f'Invalid rock geometry: {prop["id"]}: inward={inward}, duplicates={duplicate}')
    ROCK_CHECKS.append({'id':prop['id'],'inwardFaces':inward,'duplicateTriangles':duplicate,'triangles':len(triangle_keys)})
    for key in ('rock-ochre','rock-red','rock-sand'):o.data.materials.append(M[key])
    for poly in o.data.polygons:poly.material_index=0 if rng.random()<.72 else rng.randrange(1,4);poly.use_smooth=False
    CURRENT_BATCH=previous

def shrub(prop):
    global CURRENT_BATCH
    previous=CURRENT_BATCH;CURRENT_BATCH=prop['id']
    x,y,z=prop['x'],prop['y'],prop['z'];r=prop['radius'];h=prop['height'];rng=random.Random(prop['visual']['seed'])
    if 'onRock' in prop['visual']:
        rock_object=ROCK_OBJECTS[prop['visual']['onRock']]
        bpy.context.view_layer.update()
        # Rock mesh coordinates use the common gate-local space; cast from well above.
        hit,location,normal,face_index=rock_object.ray_cast(Vector(point(x,50,z)),Vector((0,0,-1)))
        if not hit:raise ValueError(f'No rock surface below shrub {prop["id"]}')
        y=round(location.z+.02,6);prop['y']=y
        ROCK_PLACEMENTS.append({'id':prop['id'],'rock':prop['visual']['onRock'],'surfaceHeight':location.z,'rootHeight':y,'clearance':.02,'faceIndex':face_index})
    for j in range(7):
        a=j*2.4;rr=r*rng.uniform(.15,.55);top=(x+math.cos(a)*rr,y+h*rng.uniform(.55,.85),z+math.sin(a)*rr)
        tube('shrub-stem',[(x,y,z),top],.012,'wood',4)
        for k in range(3):
            xx=top[0]+rng.uniform(-.12,.12)*r;zz=top[2]+rng.uniform(-.12,.12)*r
            sphere('shrub-leaf',xx,top[1]+(k-1)*h*.11,zz,r*.30,h*.23,r*.26,prop['visual']['color'] if k<2 else rng.choice(['leaf-a','leaf-b','leaf-c','leaf-d']),1)
    CURRENT_BATCH=previous

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
    box('courtyard-wall-band',x,2.42,-11,.66,.17,26,'teal')
    for i,z in enumerate((-2.5,-7.5,-12.5,-17.5,-22.0)):
        for sign in (-1,1):
            panel('courtyard-side-art',x+sign*.335,1.45,z,1.65,1.65,'floral-panel' if i%2==0 else 'vine-panel','x+' if sign==1 else 'x-')
box('courtyard-rear-wall',-12,2.25,-24,20,4.5,.6)
for x in (-18.5,-5.5):
    box('entrance-wing',x,1.35,2,7,2.7,.6)
    box('entrance-stone-base',x,.24,2.01,7,.48,.64,'stone')
    box('entrance-wing-coping',x,2.74,2,7.2,.2,.9,'cream',.03)
    for index,offset in enumerate((-2.1,0,2.1)):
        panel('entrance-outer-art',x+offset,1.47,2.34,1.4,1.4,['floral-panel','lotus-panel','vine-panel'][index])
        panel('entrance-inner-art',x+offset,1.47,1.66,1.4,1.4,['vine-panel','floral-panel','lotus-panel'][index],'z-')
    for yy in (.66,2.29):box('wall-painted-border',x,yy,2.34,6.5,.09,.04,'gold')
for x in (-15,-9):
    box('gate-pier',x,2.05,2,.9,3.1,1.2,'vermilion',.04)
    box('gate-pier-base',x,.25,2,.9,.5,1.2,'stone',.03)
    panel('gate-foot-original-border',x,.25,2.64,.9,.9*97/1013,'floral-border')
    box('gate-pier-cap',x,3.7,2,1.3,.18,1.5,'gold',.03)
    box('gate-inset',x,2.05,2.61,.41,2.3,.025,'teal')
box('gate-lintel',-12,3.91,2,7,.38,1.4,'wood')
box('gate-painted-fascia',-12,4.05,2.73,6.8,.36,.06,'teal')
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
        CURRENT_BATCH=f'hall-column-{abs(x)}-{abs(z)}'
        box('column-stone-foot',x,.43,z,.65,.30,.65,'stone',.025)
        panel('column-foot-original-border',x,.43,z+.35,.65,.65*97/1013,'floral-border')
        cylinder('hall-vermilion-column',x,2.78,z,.285,4.4,'vermilion',12)
        box('column-neck',x,4.91,z,.62,.2,.62,'gold')
        for hh,ww in ((5.0,.9),(5.12,1.2)):
            box('bracket-x',x,hh,z,ww,.16,.34,'wood-light',.025)
            box('bracket-z',x,hh-.04,z,.34,.15,ww,'wood-light',.025)
CURRENT_BATCH=None
for z in (-14,-20):
    box('hall-crossbeam',-12,5.15,z,17.5,.48,.65,'vermilion')
    box('crossbeam-teal-inlay',-12,5.13,z+.335,16.3,.25,.02,'teal')
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
panel('hall-central-floral-art',-12,2.7,-23.16,4,4,'floral-panel')
for x,art in ((-15.6,'lotus-panel'),(-8.4,'vine-panel')):panel('hall-side-art',x,2.7,-23.16,1.4,1.4,art)
for yy in (.64,4.76):box('hall-mural-border',-12,yy,-23.13,4.14,.10,.06,'gold')
for xx in (-14.06,-9.94):box('hall-mural-border',xx,2.7,-23.13,.10,4.22,.06,'gold')
for x,face in ((-20.16,'x+'),(-3.84,'x-')):
    for z,art in ((-16.5,'vine-panel'),(-21.0,'lotus-panel')):panel('hall-sidewall-art',x,2.9,z,3.5,3.5,art,face)
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
for x in (-18.6,-15.3,-12,-8.7,-5.4):panel('upper-beam-original-border',x,7.85,-13.84,3.3,3.3*97/1013,'floral-border')
for z in (-14,-20):
    for x in (-18.6,-15.3,-12,-8.7,-5.4):panel('hall-beam-original-border',x,5.13,z+.36,3.3,3.3*97/1013,'floral-border')
for x in (-13.65,-10.35):panel('gate-original-border',x,4.05,2.78,3.3,3.3*97/1013,'floral-border')
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
# Shared source of truth: props are modeled from the same dimensions used by movement.
for prop in LAYOUT['props']:
    kind=prop['kind']
    if kind=='tree':tree(prop)
    elif kind=='rock':rock(prop)
    elif kind=='shrub':shrub(prop)
    elif kind=='pot':
        CURRENT_BATCH=prop['id']
        vase(prop['id'],prop['x'],prop['y'],prop['z'],prop['radius']-.04,prop['height'],prop['visual']['color'])
        CURRENT_BATCH=None
for i in range(35):grass(random.choice([-1,1])*random.uniform(2.8,5.2),random.uniform(13,27),random.uniform(.7,1.4))

# Capture per-structure world bounds before batching. There is deliberately no whole-courtyard box.
bpy.context.view_layer.update()
def world_bounds(objects):
    points=[o.matrix_world @ Vector(corner) for o in objects for corner in o.bound_box]
    converted=[(p.x-12,p.z,2-p.y) for p in points]
    return {'min':[round(min(p[i] for p in converted),5) for i in range(3)],'max':[round(max(p[i] for p in converted),5) for i in range(3)]}
structure_groups={}
for o in list(bpy.context.scene.objects):
    if o.type=='MESH' and o.get('cameraRole')=='solid':structure_groups.setdefault(o['semanticGroup'],[]).append(o)
LAYOUT['cameraBoxes']=[dict(id=key,**world_bounds(group)) for key,group in structure_groups.items()]
for prop in LAYOUT['props']:
    if prop['kind']=='tree':
        canopy=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('semanticGroup')==prop['id']+'-canopy']
        prop['canopy']=world_bounds(canopy)
LAYOUT_PATH.write_text(json.dumps(LAYOUT,ensure_ascii=False,indent=2)+'\n')
(WORK/f'courtyard-rock-check-{VERSION}.json').write_text(json.dumps({'rocks':ROCK_CHECKS,'shrubSurfacePlacements':ROCK_PLACEMENTS},ensure_ascii=False,indent=2)+'\n')
# Each canopy, trunk, roof, column, wall, floor and art panel remains independently addressable.
semantic_groups={}
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':semantic_groups.setdefault(o.get('semanticGroup',o.name),[]).append(o)
for key,group in semantic_groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
    merged=bpy.context.object;merged.name=key.replace('.','-')
    merged['cameraRole']='canopy' if '-canopy' in key else ('solid' if key in structure_groups else 'decoration')
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
# Render rig is not included in GLB.
bpy.ops.object.light_add(type='AREA',location=point(-7,24,9));key=bpy.context.object;key.name='preview-key';key.data.energy=2800;key.data.shape='DISK';key.data.size=12
key.rotation_euler=(Vector(point(-12,0,-11))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,12));sun=bpy.context.object;sun.name='preview-sun';sun.data.energy=2.5;sun.rotation_euler=(.4,-.6,-.5)
bpy.ops.object.camera_add(location=point(8,14,21));cam=bpy.context.object;cam.name='preview-camera';cam.rotation_euler=(Vector(point(-11,3.2,-9))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42
scene=bpy.context.scene;scene.camera=cam;scene.world=bpy.data.worlds.new('preview-world');scene.world.color=(.38,.48,.58)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WORK/f'courtyard-model-{VERSION}.png')
# Serialize the editable source and portable standard-PBR model.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'courtyard.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'courtyard.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True,export_image_format='JPEG',export_jpeg_quality=90)
# Triangle and byte counts are measured from the actual exported JSON accessors.
import struct
raw=(OUTPUT/'courtyard.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
manifest={'version':VERSION,'status':'art sample pending user approval','worldOrigin':[-12,0,2],'upAxis':'Y','units':'metres','model':'courtyard.glb','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':tris,'meshCount':len(g['meshes']),'materials':len(g['materials']),'referenceArchive':'art-source/world/art-sample/v001/','caissonSource':'藻井独立正视图.jpeg','embeddedImageDimensions':[1024,1024],'caissonHeight':4.78,'caissonProcessing':'Full original composition, downsampled to 1024, embedded JPEG quality 90; no repaint or watermark removal.','collision':'Accepted architecture footprint plus shared courtyard-props.json circular prop colliders and per-structure cameraBoxes.','sharedLayout':'src/content/world/courtyard-props.json','wallArtSourceManifest':'art-source/world/wall-decoration/v001/source-manifest.json','cameraBoxCount':len(LAYOUT['cameraBoxes']),'rockNormals':'Outward wound closed mesh, zero duplicate triangles.','rockShrubs':'Raycast against actual rock triangle surface plus 0.02 metres.','references':['最新纹彩院庭院图.png','半开放藻井观赏厅内部图.png','环境小品和树木资产设定板.png','最新沙漠世界高空总览图.png'],'limitations':['Simplified 3D interpretation pending art review, not a historical reconstruction.','Small shrubs and grasses remain passable; tree trunks, ceramic pots and rocks have shared full-radius collision data.']}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('COURTYARD_EXPORT',json.dumps(manifest,ensure_ascii=False))
if args.skip_render:sys.exit(0)
bpy.ops.render.render(write_still=True)
cam.location=point(-12,1.3,-10)
cam.rotation_euler=(Vector(point(-12,4.75,-17.3))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.lens=30
scene.render.filepath=str(WORK/f'courtyard-caisson-{VERSION}.png')
bpy.ops.render.render(write_still=True)
