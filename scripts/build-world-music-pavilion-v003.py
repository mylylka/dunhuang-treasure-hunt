"""Authored music pavilion, following the approved open-gallery reference.
Blender: -b --python scripts/build-world-music-pavilion-v003.py
World coordinates are converted to the region entrance origin, never baked as a
new global map. No former models, terrain generators or character data are run.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-pavilion/v003'
OUT=ROOT/'public/assets/world/music-pavilion/v003'
WORK=ROOT/'work/world'
for directory in (SOURCE,OUT,WORK): directory.mkdir(parents=True,exist_ok=True)
layout_path=ROOT/'src/content/world/music-pavilion-layout-v003.json'
world_layout=json.loads(layout_path.read_text())
# Work in the original local architectural frame; runtime places the new region.
layout=json.loads(layout_path.read_text());dx,dz=layout['offset']
for item in layout['walls']:item['center'][0]-=dx;item['center'][2]-=dz
for p0 in layout['posts']:p0[0]-=dx;p0[1]-=dz
for item in layout['props']:item['x']-=dx;item['z']-=dz
layout['banners']=[x-dx for x in layout['banners']]
layout['mural']['center'][0]-=dx;layout['mural']['center'][2]-=dz

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
objects=[]
group='architecture'
def linear(c): return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def material(name,color):
    rgb=[linear(int(color[i:i+2],16)/255) for i in (0,2,4)]
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1);m.use_nodes=True
    node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*rgb,1);node.inputs['Roughness'].default_value=.88
    return m
M={k:material(k,v) for k,v in {
    'plaster':'dfbd91','stone':'c5ae8b','stone-light':'e3c9a3','stone-shadow':'bca17e',
    'wood':'945339','wood-light':'b97447','dark':'4e3428','tile':'607779','tile-edge':'849591',
    'ochre':'cea263','teal':'53867c','linen':'e8cf9c','cloth-orange':'bd7345','skin':'cda479',
    'hair':'443329','instrument':'be8c4e','string':'e8d9b5'}.items()}
def p(x,y,z): return (x-18,-3-z,y)
def add(obj,name,mat):
    obj.name=name;obj.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    obj['semanticGroup']=group;objects.append(obj);return obj
def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata([p(*v) for v in verts],[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return add(obj,name,mat)
def box(name,x,y,z,w,h,d,mat='plaster',bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p(x,y,z));obj=bpy.context.object
    obj.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('small-worn-edge','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=obj.modifiers.new('weighted-normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return add(obj,name,mat)
def tube(name,points,r,mat,radial=8):
    verts=[];faces=[]
    for i,point in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize();normal=tangent.cross(Vector((0,1,0)))
        if normal.length<.001: normal=tangent.cross(Vector((1,0,0)))
        normal.normalize();other=tangent.cross(normal).normalized()
        for j in range(radial):
            a=j*math.tau/radial;verts.append(tuple(Vector(point)+r*(math.cos(a)*normal+math.sin(a)*other)))
    for i in range(len(points)-1):
        for j in range(radial): a=i*radial+j;b=i*radial+(j+1)%radial;faces.append((a,b,b+radial,a+radial))
    faces.extend([tuple(range(radial-1,-1,-1)),tuple(range((len(points)-1)*radial,len(points)*radial))])
    return mesh(name,verts,faces,mat)
def lathe(name,x,y,z,profile,mat,n=12):
    verts=[(x+rr*math.cos(j*math.tau/n),y+yy,z+rr*math.sin(j*math.tau/n)) for rr,yy in profile for j in range(n)]
    faces=[]
    for k in range(len(profile)-1):
        for j in range(n): a=k*n+j;b=k*n+(j+1)%n;faces.append((a,a+n,b+n,b))
    faces.extend([tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))])
    return mesh(name,verts,faces,mat)
def ellipsoid(name,x,y,z,sx,sy,sz,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=p(x,y,z));obj=bpy.context.object
    obj.scale=(sx,sz,sy);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for face in obj.data.polygons:face.use_smooth=True
    return add(obj,name,mat)
def art(name,path):
    m=material(name,'ffffff');node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    image=bpy.data.images.load(str(path),check_existing=True);image.pack()
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    m.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color']);return m
border=art('painted-floral-border',ROOT/'public/assets/world/courtyard/v002/wall-floral-border.jpg')
def panel(name,x,y,z,w,h,mat,repeat=1):
    obj=mesh(name,[(x-w/2,y-h/2,z),(x+w/2,y-h/2,z),(x+w/2,y+h/2,z),(x-w/2,y+h/2,z)],[(0,1,2,3)],mat)
    uv=obj.data.uv_layers.new(name='UVMap')
    for i,co in enumerate(((0,0),(repeat,0),(repeat,1),(0,1))):uv.data[i].uv=co
    return obj
def roof(name,cx,cz,w,d,eave,rise):
    global group
    old=group;group=name
    def height(x,t):return eave+rise*max(0,1-t)**1.7+.20*t**6+.30*(abs(x)/(w/2))**10*t*t
    for side in (-1,1):
        nx=round(w/.55);nt=10;vs=[];faces=[]
        for i in range(nx+1):
            x=-w/2+w*i/nx
            for j in range(nt+1): t=j/nt;vs.append((cx+x,height(x,t),cz+side*d/2*t))
        for i in range(nx):
            for j in range(nt): a=i*(nt+1)+j;faces.append((a,a+1,a+nt+2,a+nt+1))
        # Both slopes face upward before Solidify; the rear slope previously
        # thickened upward and swallowed its tile ridges.
        if side<0:faces=[tuple(reversed(face)) for face in faces]
        obj=mesh(name+'-surface',vs,faces,'tile')
        mod=obj.modifiers.new('tile-thickness','SOLIDIFY');mod.thickness=.08
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
        for i in range(round(w/.29)+1):
            x=-w/2+w*i/round(w/.29)
            tube('rounded-tile-seam',[(cx+x,height(x,j/nt)+.035,cz+side*d/2*j/nt) for j in range(nt+1)],.045,'tile-edge',6)
            ellipsoid('tile-end',cx+x,height(x,1),cz+side*d/2,.075,.075,.035,'tile-edge')
        tube('upturned-eave',[(cx-w/2+w*i/30,height(-w/2+w*i/30,1)-.12,cz+side*d/2) for i in range(31)],.12,'wood-light',6)
        for i in range(round(w/.6)+1):
            x=-w/2+w*i/round(w/.6)
            tube('rafter',[(cx+x,height(x,t)-.22,cz+side*d/2*t) for t in (.4,.72,1.03)],.075,'wood-light',6)
    tube('golden-ridge',[(cx-w/2+w*i/24,eave+rise+.15+.42*abs(-1+i/12)**8,cz) for i in range(25)],.14,'ochre',8)
    for s in (-1,1):tube('ridge-tip',[(cx+s*w/2,eave+rise+.48,cz),(cx+s*(w/2+.10),eave+rise+.78,cz)],.12,'tile',6)
    group=old
def post(x,z,base,height):
    box('stone-column-foot',x,base+.14,z,.72,.28,.72,'stone',.04)
    lathe('tapered-timber-column',x,base+.28,z,[(.22,0),(.20,height-.32),(.19,height)],'wood',12)
    box('column-cap',x,base+height+.30,z,.65,.18,.62,'ochre')
    for sign in (-1,1):
        box('bracket-step',x+sign*.26,base+height+.40,z,.5,.17,.45,'teal')
        box('bracket-head',x+sign*.42,base+height+.53,z,.65,.16,.53,'wood-light')
def cloth(x,y,z,w,h,mat):
    vs=[];faces=[];nx=14;ny=7
    for j in range(ny+1):
        for i in range(nx+1):
            u=i/nx;v=j/ny
            vs.append((x+(u-.5)*w,y-h*v+.28*math.cos((u-.5)*math.pi)*v,z+.09*math.sin(u*math.pi*5)*v))
    for j in range(ny):
        for i in range(nx):a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    obj=mesh('hanging-woven-banner',vs,faces,mat)
    mod=obj.modifiers.new('cloth-thickness','SOLIDIFY');mod.thickness=.015
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
def vase(x,z,r,h):
    lathe('painted-ceramic-vessel',x,0,z,[(r*.5,0),(r*.8,.1*h),(r,.42*h),(r*.86,.7*h),(r*.48,.86*h),(r*.49,h),(r*.36,h),(r*.37,.85*h)],'cloth-orange',16)
    for yy,rr in ((.20,r*.88),(.65,r*.9),(.82,r*.52)):
        lathe('painted-band',x,yy*h,z,[(rr,0),(rr,.06*h)],'teal',16)
    for j in range(10):
        angle=j*math.tau/10
        tube('vessel-chevron',[(x+r*.99*math.cos(angle-.10),h*.40,z+r*.99*math.sin(angle-.10)),(x+r*math.cos(angle),h*.49,z+r*math.sin(angle)),(x+r*.99*math.cos(angle+.10),h*.40,z+r*.99*math.sin(angle+.10))],.012,'linen',4)
def pipa(x,y,z,scale=1):
    # Sculpted pear body, narrow neck, peg pairs and four visible strings.
    ellipsoid('pipa-body',x,y+.40*scale,z,.25*scale,.36*scale,.10*scale,'instrument')
    ellipsoid('pipa-shoulder',x,y+.69*scale,z,.16*scale,.22*scale,.075*scale,'instrument')
    tube('pipa-neck',[(x,y+.67*scale,z),(x+.12*scale,y+1.35*scale,z-.01)],.055*scale,'dark')
    for j in range(4):
        off=(j-1.5)*.025*scale
        tube('pipa-string',[(x+off,y+.25*scale,z+.105*scale),(x+.12*scale+off,y+1.30*scale,z+.05*scale)],.003*scale,'string',4)
    for sign in (-1,1):
        for yy in (1.12,1.25):tube('pipa-peg',[(x+.10*scale,y+yy*scale,z),(x+(.10+sign*.13)*scale,y+yy*scale,z)],.025*scale,'ochre',6)
def musician(x,z,kind):
    global group
    old=group;group='gallery-musicians'
    # Small, seated distant figures; neither copies nor edits the traveler.
    floor=4.56
    box('musician-stool',x,floor+.29,z,.65,.10,.5,'wood')
    for dx in (-.22,.22):box('stool-leg',x+dx,floor+.14,z,.07,.28,.35,'wood')
    lathe('seated-robe',x,floor+.20,z,[(.37,0),(.39,.20),(.26,.45),(.26,.80),(.17,1.0)],'linen',12)
    ellipsoid('robe-fold-left',x-.17,floor+.38,z+.16,.20,.23,.28,'teal')
    ellipsoid('robe-fold-right',x+.17,floor+.38,z+.16,.20,.23,.28,'teal')
    ellipsoid('musician-head',x,floor+1.38,z,.19,.245,.17,'skin')
    ellipsoid('musician-hair',x,floor+1.50,z-.035,.20,.17,.17,'hair')
    ellipsoid('musician-bun',x+.02,floor+1.70,z-.07,.10,.09,.10,'hair')
    ellipsoid('nose',x,floor+1.36,z+.168,.035,.045,.03,'skin')
    for dx in (-.065,.065):ellipsoid('eye',x+dx,floor+1.42,z+.158,.012,.012,.009,'hair')
    if kind=='pipa':
        pipa(x+.05,floor+.35,z+.25,.88)
        arms=[[(x-.22,floor+1.08,z),(x-.31,floor+.84,z+.25),(x+.10,floor+.77,z+.39)],[(x+.22,floor+1.08,z),(x+.33,floor+.98,z+.23),(x+.16,floor+1.22,z+.32)]]
    else:
        arms=[[(x-.22,floor+1.08,z),(x-.29,floor+1.01,z+.2),(x-.05,floor+1.30,z+.27)],[(x+.22,floor+1.08,z),(x+.35,floor+1.10,z+.18),(x+.25,floor+1.28,z+.27)]]
        tube('transverse-flute',[(x-.25,floor+1.32,z+.28),(x+.58,floor+1.24,z+.28)],.025,'instrument',8)
    for arm in arms:
        tube('wide-sleeve',arm[:2],.115,'linen',10);tube('forearm',arm[1:],.065,'skin',8)
        ellipsoid('hand',*arm[-1],.07,.075,.055,'skin')
    group=old

# The perimeter is one continuous U-shaped solid, with only the gate opening.
# Separate overlapping wall boxes would create coplanar black seams at corners.
for item in layout['walls']:
    if 'court-' not in item['id']:
        x,y,z=item['center'];w,h,d=item['size'];box(item['id'],x,y,z,w,h,d)
group='courtyard-enclosure'
court={w['id']:w for w in layout['walls'] if 'court-' in w['id']}
west=court['music-court-west'];east=court['music-court-east'];back=court['music-court-back']
left=court['music-court-front-west'];right=court['music-court-front-east']
xl=west['center'][0];xr=east['center'][0];zb=back['center'][2];zf=left['center'][2]
gl=left['center'][0]+left['size'][0]/2;gr=right['center'][0]-right['size'][0]/2
wall_height=west['size'][1]
def perimeter(name,bottom,top,overhang,mat):
    o=.25+overhang;i=.25-overhang
    outline=[(gl+overhang,zf+o),(xl-o,zf+o),(xl-o,zb-o),(xr+o,zb-o),(xr+o,zf+o),(gr-overhang,zf+o),
        (gr-overhang,zf-i),(xr-i,zf-i),(xr-i,zb+i),(xl+i,zb+i),(xl+i,zf-i),(gl+overhang,zf-i)]
    n=len(outline);vs=[(x,y,z) for y in (bottom,top) for x,z in outline]
    fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    obj=mesh(name,vs,fs,mat)
    return obj
perimeter('continuous-court-wall',0,wall_height,0,'plaster')
perimeter('continuous-limestone-cap',wall_height-.015,wall_height+.14,.06,'stone-light')
perimeter('continuous-teal-band',wall_height-.37,wall_height-.23,.007,'teal')
for yy in (.28,.57):perimeter('continuous-stone-course',yy-.011,yy+.011,.006,'stone-shadow')

group='porch'
box('porch-floor',13.6,.18,-13.9,6.9,.36,3.9,'stone-light')
for i in range(3):box('porch-step',13.6,.06*(i+1),-10.85-.42*i,6.9,.12*(i+1),.46,'stone-light',.025)
for x,z in layout['posts']:post(x,z,.36,3.15)
box('gallery-floor',13.6,4.4,-13.8,7.1,.32,4.3,'wood')
box('gallery-rear',13.6,6.4,-16,7.2,3.8,.3)
for x in (10.4,13.65,16.85):post(x,-11.8,4.55,3.1)
for x in (11.6,14.3):
    box('rear-window',x,6.4,-15.80,1.5,2.25,.12,'dark')
    for dx in (-.58,-.29,0,.29,.58):box('window-lattice',x+dx,6.4,-15.7,.035,2.1,.05,'ochre',0)
    for yy in (5.6,6,6.4,6.8,7.2):box('window-lattice',x,yy,-15.7,1.4,.035,.05,'ochre',0)
for x in (12.5,14.7):
    box('door-leaf',x,1.96,-15.58,2.0,3.15,.16,'wood')
    box('door-inset',x,2.3,-15.48,1.65,2.05,.06,'dark')
    for dx in (-.6,-.3,0,.3,.6):box('door-lattice',x+dx,2.3,-15.42,.04,1.95,.04,'wood-light',0)
    for yy in (1.55,1.9,2.25,2.6,2.95,3.3):box('door-lattice',x,yy,-15.42,1.6,.04,.04,'wood-light',0)
for yy in (4.95,5.48):box('open-gallery-railing',13.6,yy,-11.69,6.7,.10,.12,'wood-light')
for i in range(18):box('gallery-baluster',10.5+i*.365,5.18,-11.69,.055,.64,.08,'wood-light',.01)
for yy,xx,ww in ((3.87,13.6,7.2),(8.08,18,16.1)):
    box('painted-lintel',xx,yy,-11.66,ww,.30,.30,'teal')
    panel('floral-frieze',xx,yy,-11.49,ww,.25,border,ww/3)
# The curtain top now sits on a timber rod joined directly to the fascia.
for x,w,mat in ((11.8,1.45,'cloth-orange'),(15.2,1.30,'teal')):
    tube('curtain-hanging-rod',[(x-w/2-.08,3.72,-11.43),(x+w/2+.08,3.72,-11.43)],.045,'wood',8)
    for off in (-w*.35,w*.35):
        tube('curtain-connection',[(x+off,3.82,-11.61),(x+off,3.72,-11.43)],.025,'ochre',6)
    cloth(x,3.72,-11.43,w,.83,mat)
# A single outward-sloping eave in front of the gallery, rather than a gable
# that rises through its usable floor and the musicians' stools.
group='porch-roof'
vs=[];fs=[];nx=30;nt=6
for i in range(nx+1):
    x=9.55+8.1*i/nx
    for j in range(nt+1):
        t=j/nt;z=-12.1+1.25*t;y=4.40-.35*t+.13*t**6+.15*(abs(x-13.6)/4.05)**8*t*t
        vs.append((x,y,z))
for i in range(nx):
    for j in range(nt):
        a=i*(nt+1)+j;fs.append((a,a+nt+1,a+nt+2,a+1))
obj=mesh('front-only-eave-surface',vs,fs,'tile')
mod=obj.modifiers.new('tile-thickness','SOLIDIFY');mod.thickness=.08
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
for i in range(29):
    x=9.55+8.1*i/28;pts=[]
    for j in range(7):
        t=j/6;pts.append((x,4.435-.35*t+.13*t**6+.15*(abs(x-13.6)/4.05)**8*t*t,-12.1+1.25*t))
    tube('front-eave-tile-seam',pts,.045,'tile-edge',6)
    ellipsoid('front-eave-tile-end',*pts[-1],.07,.07,.04,'tile-edge')
tube('front-eave-edge',[(9.55+8.1*i/30,4.06+.15*(abs(-4.05+8.1*i/30)/4.05)**8,-10.85) for i in range(31)],.12,'wood-light',6)
group='porch'
# Readable horizontal floor boards behind the railing, never above the tiles.
for i in range(17):box('gallery-floorboard',10.25+i*.42,4.565,-13.85,.39,.025,3.9,'wood-light',.004)

# Close the attic with walls fitted to the actual curved roof underside.
# Overlap by a few centimetres to avoid cracks from bevels/export precision.
group='roof-wall-closure'
def underside(x,z):
    t=abs(z+17)/6.1
    return 8.6+2.0*max(0,1-t)**1.7+.20*t**6+.30*(abs(x-18)/8.9)**10*t*t-.025
def profile_wall(name,axis,center,start,end,thickness,base):
    n=28;verts=[]
    for i in range(n+1):
        along=start+(end-start)*i/n
        for side in (-1,1):
            x,z=(center+side*thickness/2,along) if axis=='x' else (along,center+side*thickness/2)
            verts.extend([(x,base,z),(x,underside(x,z),z)])
    faces=[]
    for i in range(n):
        a=i*4;b=a+4
        faces.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a+1,b+1,b+3,a+3),(a,a+2,b+2,b)])
    faces.extend([(0,1,3,2),(n*4,n*4+2,n*4+3,n*4+1)])
    return mesh(name,verts,faces,'plaster')
profile_wall('west-roof-fitted-gable','x',10,-22.245,-11.755,.49,8.55)
profile_wall('east-roof-fitted-gable','x',26,-22.245,-11.755,.49,8.55)
profile_wall('rear-roof-fitted-wall','z',-22,9.755,26.245,.49,8.55)
profile_wall('front-roof-fitted-wall','z',-11.8,9.75,26.25,.40,8.18)
box('continuous-eave-bearing-beam',18,8.35,-11.68,16.6,.30,.46,'wood',.01)
box('attic-timber-ceiling',18,8.51,-17,15.6,.12,9.6,'wood',.01)
roof('main-roof',18,-17,17.8,12.2,8.6,2.0)

group='mural-frame'
mx,my,mz=layout['mural']['center'];mw=layout['mural']['width'];mh=layout['mural']['height']
for dx in (-mw/2-.09,mw/2+.09):
    box('mural-vertical-frame',mx+dx,my,mz-.04,.17,mh+.35,.16,'wood-light')
    box('mineral-inlay',mx+dx,my,mz+.047,.055,mh+.27,.02,'teal',.005)
for dy in (-mh/2-.1,mh/2+.1):box('mural-horizontal-frame',mx,my+dy,mz-.04,mw+.35,.18,.16,'ochre')
for z in (-14,-17,-20):
    box('east-window-frame',26.28,6.5,z,.12,1.8,1.3,'wood')
    box('east-window-shadow',26.35,6.5,z,.08,1.48,1.02,'dark')
    for dz in (-.36,0,.36):box('east-window-lattice',26.40,6.5,z+dz,.05,1.4,.035,'ochre',0)

# Side elevations retain broad plaster planes, with a stone plinth and corner timbers.
for xx in (9.72,26.28):
    box('side-stone-plinth',xx,.46,-17,.12,.8,9.9,'stone')
    box('side-timber-sill',xx,4.38,-17,.16,.20,9.9,'wood-light')
    for zz in (-12.2,-21.8):box('side-corner-timber',xx,4.6,zz,.15,7.4,.24,'wood')

group='court-paving'
# Large, modestly irregular paving slabs; fixed courses and authored palette.
for row in range(10):
    for col in range(19):
        x=9.35+col*.93+(.18 if row%2 else 0);z=-2.8-row*.87
        if x>26.7:continue
        dx=.43;dz=.40
        points=[(-dx,-dz),(.18,-dz-.015),(dx,-.19),(dx-.02,dz),(-.24,dz+.015),(-dx,.18)]
        vs=[(x+a,.012,z+b) for a,b in points]+[(x+a,.06,z+b) for a,b in points]
        faces=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
        mesh('courtyard-slab',vs,faces,('stone','stone-light','stone-shadow')[(row*7+col*3)%7%3])

group='court-props'
for prop in layout['props']:
    if 'pot' in prop['id']:vase(prop['x'],prop['z'],prop['radius'],prop['height'])
box('instrument-rack',24.5,.65,-10.3,1.1,.1,.35,'wood')
for dx in (-.45,.45):tube('rack-side',[(24.5+dx,0,-10.3),(24.5+dx,1.7,-10.3)],.055,'wood',8)
pipa(24.5,.15,-10.05,1.15)
for x in layout['banners']:
    tube('banner-pole',[(x,0,-4.2),(x,3.5,-4.2)],.055,'wood',8)
    tube('banner-arm',[(x-.05,3.42,-4.2),(x+.65,3.42,-4.2)],.035,'wood',8)
    cloth(x+.31,3.38,-4.2,.55,1.65,'teal' if x==layout['banners'][0] else 'cloth-orange')
musician(12,-13.65,'pipa');musician(15.2,-13.65,'flute')

# Consistent outward normals, then batch by structural group and material.
for obj in objects:
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
batches={}
for obj in objects:batches.setdefault((obj['semanticGroup'],obj.data.materials[0].name),[]).append(obj)
export_objects=[]
for (name,mat),items in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in items:obj.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name+'--'+mat;export_objects.append(obj)
triangles=0
for obj in export_objects:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects:obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'music-pavilion.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
manifest={'version':'v003','origin':world_layout['origin'],'triangles':triangles,'meshBatches':len(export_objects),'materials':len({o.data.materials[0].name for o in export_objects}),
    'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest(),'bytes':(OUT/'music-pavilion.glb').stat().st_size,
    'layoutSha256':hashlib.sha256(layout_path.read_bytes()).hexdigest(),
    'source':'Open-gallery and forecourt references; original full-aspect mural is added at runtime','status':'awaiting visual approval'}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

# Separate inspection renders; no lights/cameras or backdrop in the GLB.
group='render-only'
artwork=art('mural-preview-only',ROOT/'public/assets/world/music-pavilion/v001/mural-original.png');panel('mural-preview-only',mx,my,mz,mw,mh,artwork)
box('render-ground',18,-.14,-10,80,.2,80,'stone-light',0)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('preview-world');world.use_nodes=True;scene.world=world
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.60,.72,.78,1)
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.45,-.5,-.6);bpy.context.object.data.energy=2.5;bpy.context.object.data.angle=.10
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='PERSP';camera.data.lens=44
for name,eye,target in [('front',(18,8,19),(18,4.3,-12)),('diagonal',(39,12,14),(18,4.2,-13)),('side',(-5,10,6),(16,4.2,-13)),('back',(34,14,-43),(18,5,-18)),('enclosure',(43,30,13),(18,2,-15))]:
    camera.location=p(*eye);camera.rotation_euler=(Vector(p(*target))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(WORK/f'music-pavilion-v003-blender-{name}.png');bpy.ops.render.render(write_still=True)
print(json.dumps(manifest))
