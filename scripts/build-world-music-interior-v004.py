"""Approved spacious, openwork two-storey interior derived non-destructively.

Blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v004.py
Coordinates are music source metres, Y up. The exported model origin stays
[46,0,-9]. Old sources, artwork, human figures and preview files are untouched.
"""
import bpy, bmesh, hashlib, json, math
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'art-source/world/models/music-interior/v003/music-pavilion.blend'
DEST = ROOT/'art-source/world/models/music-interior/v004'
OUT = ROOT/'public/assets/world/music-interior/v004'
SOLIDS = ROOT/'src/content/world/music-interior-solids-v002.json'
LAYOUT = ROOT/'src/content/world/music-interior-v002.json'
for directory in (DEST, OUT): directory.mkdir(parents=True, exist_ok=True)
protected_paths = [ROOT/f'{base}/music-interior/v{version:03}/music-pavilion.{ext}'
                   for version in (1,2,3)
                   for base,ext in [('art-source/world/models','blend'),('public/assets/world','glb')]]
protected_hashes = {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected_paths}
layout = json.loads(LAYOUT.read_text())
surfaces = {s['id']:s for s in layout['surfaces']}
F1,F2,SLAB_BOTTOM,SLAB_TOP = 1.8,7.915375,7.426,7.89
REAR,EXPAND = -32.175,4.425
flight = surfaces['music-stair']
LOW,HIGH,Z0,Z1 = flight['maxX'],flight['minX'],flight['minZ'],flight['maxZ']
assert (LOW,HIGH,Z0,Z1)==(55.69,46.27,-32.025,-28.425)
RISE=(F2-F1)/36; GOING=(LOW-HIGH)/35
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)
         and not o.get('excludeV4') and not o.get('excludeV5')]
old_objects=list(objects);removed=[];modified=[];new_objects=[];decor=[]

def src(p):return Vector((p.x+46,p.z,-p.y-9))
def bp(p):return Vector((p[0]-46,-p[2]-9,p[1]))
def bounds(points):return ([min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)])
def parts(o):
    parent=list(range(len(o.data.vertices)))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for edge in o.data.edges:
        a,b=map(find,edge.vertices);parent[a]=b
    result={}
    for v in o.data.vertices:result.setdefault(find(v.index),[]).append(v)
    return list(result.values())
def delete_components(o,predicate):
    ids=set()
    for component in parts(o):
        lo,hi=bounds([src(o.matrix_world@v.co) for v in component])
        if predicate(lo,hi):
            ids.update(v.index for v in component);removed.append({'object':o.name,'min':lo,'max':hi})
    if ids:
        bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[bm.verts[i] for i in ids],context='VERTS')
        bm.to_mesh(o.data);bm.free();o.data.update()
    return len(ids)
def discard(o):
    if o in objects:objects.remove(o)
    o.hide_set(True);o.hide_render=True;o['excludeV004']=True
    removed.append({'object':o.name,'wholeObject':True})
def face_digest(o,f):
    h=hashlib.sha256();h.update(o.data.materials[f.material_index].name.encode())
    uv=o.data.uv_layers.active
    # Retain winding and all UV coordinates; no index/order dependency.
    for j,vi in zip(f.loop_indices,f.vertices):
        h.update(','.join(f'{x:.6f}' for x in src(o.matrix_world@o.data.vertices[vi].co)).encode())
        if uv:h.update(','.join(f'{x:.6f}' for x in uv.data[j].uv).encode())
    return h.hexdigest()
protected_faces={}
for o in objects:
    group=o.get('semanticGroup','architecture')
    if group in ('gallery-musicians','high-drapery','workshop-furnishings','porch-roof') or o.name=='porch--painted-floral-border':
        protected_faces[o.name]=Counter(face_digest(o,f) for f in o.data.polygons)

materials={k:bpy.data.materials['music-decor-'+k] for k in
           ('plaster','wainscot','cinnabar','wood','ceiling','soffit','stone','tread','riser','ochre','floral','nosing')}
def linear(v):
    c=int(v,16)/255;return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
landingmat=bpy.data.materials.new('music-decor-stone-landing');landingmat.use_nodes=True
rgba=tuple(linear(c) for c in ('D7','CE','B5'))+(1,)
landingmat.diffuse_color=rgba
bs=next(n for n in landingmat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bs.inputs['Base Color'].default_value=rgba;bs.inputs['Roughness'].default_value=.91
materials['stone-landing']=landingmat
def metric_uv(o):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='MusicMetreUV')
    for f in o.data.polygons:
        points=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices]
        if len(points)<3:continue
        n=(points[1]-points[0]).cross(points[2]-points[0]).normalized()
        coords=[(p.x,p.z) if abs(n.y)>.5 else (p.x,p.y) if abs(n.z)>.5 else (p.z,p.y) for p in points]
        if o.data.materials[f.material_index].name=='music-decor-stone-landing':coords=[(p.z,p.x) for p in points]
        for lp,co in zip(f.loop_indices,coords):uv.data[lp].uv=co
def mesh(name,vertices,faces,material,group,uv=True):
    data=bpy.data.meshes.new(name);data.from_pydata([bp(p) for p in vertices],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    mat=bpy.data.materials[material[7:]] if material.startswith('legacy:') else materials.get(material,bpy.data.materials.get(material))
    o['semanticGroup']=group;o.data.materials.append(mat)
    new_objects.append(o)
    if uv:metric_uv(o)
    return o
def box(name,lo,hi,material='wood',group='music-interior-grille'):
    x,y,z=lo;a,b,c=hi
    return mesh(name,[(x,y,z),(a,y,z),(a,b,z),(x,b,z),(x,y,c),(a,y,c),(a,b,c),(x,b,c)],
                [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,group)
def plane(name,points,key,uvs=None,group='music-decoration-wall'):
    o=mesh(name,points,[tuple(range(len(points)))],key,group,uv=uvs is None)
    o['decorationOnly']=True;o['maximumProjectionMetres']=.025
    if uvs:
        uv=o.data.uv_layers.new(name='FloralAspectUV')
        for lp,co in zip(o.data.polygons[0].loop_indices,uvs):uv.data[lp].uv=co
    decor.append({'id':name,'material':materials[key].name,'min':bounds(points)[0],'max':bounds(points)[1]})
    return o

# Remove the complete replaced systems, including the very thin old sill piece.
for o in list(objects):
    group=o.get('semanticGroup','architecture')
    if group.startswith('music-decoration') or group in ('music-interior-floor','music-interior-stair','music-interior-landing','main-roof'):
        discard(o)
    elif o.name.startswith(('music-ground-door-cut','music-upper-door-cut')):discard(o)
    elif o.name=='roof-wall-closure--plaster':discard(o)
    elif group=='porch':
        # Ground turned leaves and all inset/lattice pieces, not the front posts.
        delete_components(o,lambda a,b: a[0]>36.30 and b[0]<42.95 and a[1]>1.82 and b[1]<6.42 and a[2]>-21.72 and b[2]<-18.69)
        # Exactly the two upper-partition windows; front gallery rail is z~-17.7.
        delete_components(o,lambda a,b: a[0]>35.5 and b[0]<41.85 and a[1]>8.8 and b[1]<12.3 and a[2]>-21.88 and b[2]<-21.65)

# Rear wall translates as one solid; side walls extend only at their rear ends.
architecture=next(o for o in objects if o.name=='architecture--plaster')
delete_components(architecture,lambda a,b: 44.43<a[0]<44.45 and 44.98<b[0]<45.01 and a[2]>-21.67 and b[2]<-17.94)
inverse=architecture.matrix_world.inverted()
for component in parts(architecture):
    pts=[src(architecture.matrix_world@v.co) for v in component];a,b=bounds(pts)
    isrear=a[2]<-28.2 and b[2]<-27.7
    isside=(b[0]<34.8 or a[0]>59.4) and a[2]<-27.9 and b[2]>-18.1
    if isrear or isside:
        for v,p in zip(component,pts):
            if isrear:p.z-=EXPAND
            elif p.z<-27.7:p.z-=EXPAND
            v.co=inverse@bp(p)
        modified.append({'object':architecture.name,'kind':'rear-translate' if isrear else 'side-extend','oldMin':a,'oldMax':b})
architecture.data.update();metric_uv(architecture)

# The original flat ceiling and front carrying beam are distinct components.
ceiling=next(o for o in objects if o.name=='roof-wall-closure--wood')
inverse=ceiling.matrix_world.inverted()
for component in parts(ceiling):
    pts=[src(ceiling.matrix_world@v.co) for v in component];a,b=bounds(pts)
    if a[2]<-27.7:
        for v,p in zip(component,pts):
            if p.z<-27.5:p.z-=EXPAND
            v.co=inverse@bp(p)
ceiling.data.update();metric_uv(ceiling)

# Extend side plinths/sills and move rear corner timbers without touching the
# front flying-painting frame, existing side windows or original front art.
for o in objects:
    if o.get('semanticGroup')!='mural-frame':continue
    inverse=o.matrix_world.inverted()
    for component in parts(o):
        pts=[src(o.matrix_world@v.co) for v in component];a,b=bounds(pts)
        if not (b[0]<34.5 or a[0]>59.9):continue
        if a[2]<-27.4 and b[2]<-27.3:
            for v,p in zip(component,pts):p.z-=EXPAND;v.co=inverse@bp(p)
        elif a[2]<-27.8 and b[2]>-18.2:
            for v,p in zip(component,pts):
                if p.z<-27.3:p.z-=EXPAND
                v.co=inverse@bp(p)
    o.data.update()

# The original courtyard rear enclosure would otherwise cross the new hall.
# Translate its transverse components, then add two matching side bays per side
# rather than stretching the existing cut-out pattern into elongated holes.
for o in objects:
    if o.get('semanticGroup')!='courtyard-enclosure':continue
    inverse=o.matrix_world.inverted()
    for component in parts(o):
        pts=[src(o.matrix_world@v.co) for v in component];a,b=bounds(pts)
        if b[2]<-28.10:
            for v,p in zip(component,pts):p.z-=EXPAND;v.co=inverse@bp(p)
            modified.append({'object':o.name,'kind':'rear-courtyard-enclosure-translate','oldMin':a,'oldMax':b})
    o.data.update()
def enclosure_box(name,x,y,z,w,h,d,material):
    return box(name,[x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2],'legacy:'+material,'courtyard-enclosure')
def enclosure_openwork(name,x,zstart,width):
    # Same eight-sided apertures and two vertical courses as delivered v004.
    vertices=[];indices={};faces={};height=1.6;cols=max(2,round(width/.82));rows=2
    def vi(p):
        key=tuple(round(v,7) for v in p)
        if key not in indices:indices[key]=len(vertices);vertices.append(key)
        return indices[key]
    def face(points):
        ids=[]
        for p in points:
            i=vi(p)
            if i not in ids:ids.append(i)
        if len(ids)<3:return
        key=tuple(sorted(ids));faces[key]=None if key in faces else ids
    cw,ch=width/cols,height/rows
    for row in range(rows):
        for col in range(cols):
            u=cw*(col+.5);y=2.65+ch*(row+.5);w,h=cw/2,ch/2;rx,ry=w-.055,h-.055
            hole=[(-.46*rx,ry),(.46*rx,ry),(rx,.46*ry),(rx,-.46*ry),(.46*rx,-ry),(-.46*rx,-ry),(-rx,-.46*ry),(-rx,.46*ry)]
            outer=[(-w,h),(w,h),(w,h),(w,-h),(w,-h),(-w,-h),(-w,-h),(-w,h)]
            def p(q,v):return (x+v,y+q[1],zstart+u+q[0])
            for k in range(8):
                j=(k+1)%8;ring=[outer[k],outer[j],hole[j],hole[k]]
                face([p(q,-.12) for q in ring]);face([p(q,.12) for q in reversed(ring)])
                face([p(hole[k],-.12),p(hole[j],-.12),p(hole[j],.12),p(hole[k],.12)])
            corners=[(-w,h),(w,h),(w,-h),(-w,-h)]
            for k in range(4):
                a,b=corners[k],corners[(k+1)%4];face([p(a,-.12),p(b,-.12),p(b,.12),p(a,.12)])
    return mesh(name,vertices,[f for f in faces.values() if f],'legacy:stone-light','courtyard-enclosure')
for label,x in [('west',24),('east',70)]:
    start,end=-33.075,-28.65;mid=(start+end)/2;length=end-start;span=length/2
    for tag,y,h,thickness,material in [('base',1.25,2.5,.48,'plaster'),('foot',.22,.44,.58,'stone'),('sill',2.58,.16,.64,'stone-light'),('lintel',4.35,.22,.56,'plaster'),('teal-cap',4.51,.12,.67,'teal'),('stone-cap',4.64,.14,.76,'stone-light')]:
        enclosure_box('music-court-extension-'+label+'-'+tag,x,y,mid,thickness,h,length,material)
    for i in (1,2):enclosure_box('music-court-extension-'+label+'-pier',x,3.45,start+i*span,.60,1.6,.38,'plaster')
    for i in range(2):enclosure_openwork('music-court-extension-'+label+'-openwork',x,start+i*span+.19,span-.38)

# Each original foundation tier extends rearward. Replace only the upper tier
# with a shared-vertex top grid: landing and hall are one continuous skin.
for o in list(objects):
    if o.get('semanticGroup')!='terraced-foundation':continue
    hi=max(src(o.matrix_world@v.co).y for v in o.data.vertices)
    if abs(hi-F1)<.001:discard(o);continue
    inverse=o.matrix_world.inverted()
    for v in o.data.vertices:
        p=src(o.matrix_world@v.co)
        if p.z<-28:p.z-=EXPAND
        v.co=inverse@bp(p)
    o.data.update();metric_uv(o)
xs=[33.6,LOW,58.1,60.65];zs=[-32.745,Z0,Z1,-16.7]
verts=[(x,F1,z) for z in zs for x in xs]
faces=[];landing_faces=[]
for iz in range(3):
    for ix in range(3):
        a=iz*4+ix;faces.append((a,a+4,a+5,a+1))
        if ix==1 and iz==1:landing_faces.append(len(faces)-1)
perimeter=[0,1,2,3,7,11,15,14,13,12,8,4]
bottom=[]
for vi in perimeter:bottom.append(len(verts));x,y,z=verts[vi];verts.append((x,0,z))
faces.append(tuple(reversed(bottom)))
for i,vi in enumerate(perimeter):
    j=(i+1)%len(perimeter);faces.append((vi,perimeter[j],bottom[j],bottom[i]))
foundation=mesh('music-foundation-top-with-inlaid-landing',verts,faces,'stone','terraced-foundation')
foundation.data.materials.append(landingmat)
for fi in landing_faces:foundation.data.polygons[fi].material_index=1
metric_uv(foundation)

# Main upper slab, side seam, and full-width original-wall footprint finish.
regions=[([34.7625,SLAB_BOTTOM,REAR],[46.27,SLAB_TOP,-21.95]),
         ([44.7801,SLAB_BOTTOM,-21.95],[46.27,SLAB_TOP,-21.85])]
for i,(lo,hi) in enumerate(regions):box(f'music-new-floor-slab-{i}',lo,hi,'soffit','music-interior-floor')
finishes=[([34.7625,SLAB_TOP,REAR],[46.27,F2,-21.95]),
          ([44.7801,SLAB_TOP,-21.95],[46.27,F2,-21.85]),
          ([34.7625,SLAB_TOP,-21.95],[44.7801,F2,-21.80])]
for i,(lo,hi) in enumerate(finishes):box(f'music-new-floor-finish-{i}',lo,hi,'wood','music-interior-floor')

# Original 36 rises/35 treads, moved continuously rather than teleporting floors.
profile=[(LOW,F1)]
for i in range(35):
    x=LOW-i*GOING;y=F1+(i+1)*RISE;profile.extend([(x,y),(x-GOING,y)])
profile.extend([(HIGH,F2),(HIGH,F2-.32),(LOW,F1-.32)])
vs=[(x,y,z) for z in (Z0,Z1) for x,y in profile];n=len(profile)
fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
stair=mesh('music-rear-straight-stair',vs,fs,'tread','music-interior-stair')
for key in ('riser','soffit','stone'):stair.data.materials.append(materials[key])
for f in stair.data.polygons:
    ps=[src(stair.matrix_world@stair.data.vertices[i].co) for i in f.vertices]
    normal=(ps[1]-ps[0]).cross(ps[2]-ps[0]).normalized()
    key='tread' if normal.y>.8 else 'riser' if abs(normal.y)<.1 and abs(normal.x)>.5 else 'soffit' if normal.y<-.3 else 'stone'
    f.material_index=stair.data.materials.find(materials[key].name)

# Real openwork timber, with clipped diagonal members and subdivided tall bays.
# Panel coordinates u/y/v; v is thickness, not a transparent image plane.
grille_records=[]
def panel_point(axis,fixed,start,u,y,v):
    if axis=='x':return (start+u,y,fixed+v)
    if axis=='z':return (fixed+v,y,start+u)
    if axis=='door-left':return (fixed-v,y,start+u)
    return (fixed+v,y,start+u)
def member(name,a,b,width,depth,axis,fixed,start,material='wood'):
    # Rectangular member swept in panel plane; diagonal edges stay real solids.
    du,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(du,dy)
    if length<.015:return
    nu,ny=-dy/length*width/2,du/length*width/2
    pts=[(a[0]+nu,a[1]+ny),(b[0]+nu,b[1]+ny),(b[0]-nu,b[1]-ny),(a[0]-nu,a[1]-ny)]
    vv=[panel_point(axis,fixed,start,u,y,v) for v in (-depth/2,depth/2) for u,y in pts]
    mesh(name,vv,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,'music-interior-grille')
def panel(name,width,start,axis,fixed,bottom=1.83,top=7.15,bays=None,door=False):
    fw=.10;inner0=fw;inner1=width-fw
    for u in (fw/2,width-fw/2):member(name+'-stile',(u,bottom),(u,top),fw,.10,axis,fixed,start,'cinnabar')
    for y in (bottom+fw/2,top-fw/2):member(name+'-rail',(fw,y),(width-fw,y),fw,.10,axis,fixed,start,'cinnabar')
    verticals=bays if bays is not None else [width/2]
    for u in verticals:member(name+'-mullion',(u,bottom+fw),(u,top-fw),.055,.075,axis,fixed,start,'cinnabar')
    # A quiet structural division at hand height adds detail without an opaque base.
    for y in (2.68,5.57):member(name+'-middle-rail',(fw,y),(width-fw,y),.055,.075,axis,fixed,start,'cinnabar')
    # Diamond lattice: .48 metre spacing, thin .03m members, fully cut openings.
    lo,hi=bottom+fw+.022,top-fw-.022;left,right=inner0+.022,inner1-.022
    for sign in (-1,1):
        c0=lo-right if sign==1 else lo+left;c1=hi-left if sign==1 else hi+right
        count=math.ceil((c1-c0)/.48)
        for k in range(count+1):
            c=c0+k*.48;points=[]
            for u in (left,right):
                y=sign*u+c
                if lo-1e-7<=y<=hi+1e-7:points.append((u,y))
            for y in (lo,hi):
                u=(y-c)/sign
                if left-1e-7<=u<=right+1e-7:points.append((u,y))
            unique=[]
            for p in points:
                if not any(math.dist(p,q)<.0001 for q in unique):unique.append(p)
            if len(unique)==2:member(name+'-diamond',unique[0],unique[1],.030,.052,axis,fixed,start)
    grille_records.append({'id':name,'axis':axis,'start':start,'fixed':fixed,'width':width,'bottom':bottom,'top':top,'realOpenwork':True})

panel('music-grille-fixed-west',1.885,34.69,'x',-21.80)
panel('music-grille-fixed-east',1.885,42.665,'x',-21.80,bays=[1.035])
panel('music-grille-return',3.525,-21.75,'z',44.50,bays=[1.175,2.35])
# Move thickness outwards from each hinge so the central clear opening is 6.09m.
panel('music-grille-open-door-left',3.005,-21.80,'door-left',36.525,bays=[1.0017,2.0033],door=True)
panel('music-grille-open-door-right',3.005,-21.80,'door-right',42.715,bays=[1.0017,2.0033],door=True)
box('music-grille-unified-header',[34.69,7.16,-21.85],[44.55,7.30,-21.75],'cinnabar')
box('music-grille-return-header',[44.45,7.16,-21.85],[44.55,7.30,-18.225],'cinnabar')
box('music-grille-lamp-mount-stile',[43.65,1.83,-21.85],[43.75,7.30,-21.75],'cinnabar')
# Narrow gold-colour inset on the common lintel; never an inner second portal.
box('music-grille-header-inset',[34.72,7.205,-21.746],[44.52,7.235,-21.742],'ochre')

# Regenerate both roof slopes, seams, rafters and fitted gables with the approved
# deeper pitch. Front eave stays z=-16.9; rings retain their original radii.
SCALE=1.45;SPLIT=-1.305;WING=1.1743510267338242
def roofpoint(p):
    x=(p[0]-18)*SCALE
    if x>SPLIT:x=SPLIT+(x-SPLIT)*WING
    return (46+x,p[1]*SCALE+1.278,p[2]-6)
def roofmesh(name,vs,fs,material,group='main-roof'):
    return mesh(name,[roofpoint(p) for p in vs],fs,material,group)
def tube(name,points,r,material,radial=6):
    vs=[];fs=[]
    for i,point in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize();normal=tangent.cross(Vector((0,1,0)))
        if normal.length<.001:normal=tangent.cross(Vector((1,0,0)))
        normal.normalize();other=tangent.cross(normal).normalized()
        for j in range(radial):
            a=j*math.tau/radial;vs.append(tuple(Vector(point)+r*(math.cos(a)*normal+math.sin(a)*other)))
    for i in range(len(points)-1):
        for j in range(radial):a=i*radial+j;b=i*radial+(j+1)%radial;fs.append((a,b,b+radial,a+radial))
    fs.extend([tuple(range(radial-1,-1,-1)),tuple(range((len(points)-1)*radial,len(points)*radial))])
    return roofmesh(name,vs,fs,material)
def tileend(name,p):
    # Low-poly ellipsoid, dimensions retain the original decorative tile end.
    vs=[];fs=[];sx,sy,sz=.075,.075,.035
    for j in range(7):
        ph=math.pi*j/6
        for i in range(12):
            t=math.tau*i/12;vs.append((p[0]+sx*math.sin(ph)*math.cos(t),p[1]+sy*math.cos(ph),p[2]+sz*math.sin(ph)*math.sin(t)))
    for j in range(6):
        for i in range(12):a=j*12+i;b=j*12+(i+1)%12;fs.append((a,b,b+12,a+12))
    return roofmesh(name,vs,fs,'tile-edge')
CX,CZ,W,D,EAVE,ROOF_RISE=18,-19.2125,17.8,16.625,8.6,2.0
def roofheight(x,t):return EAVE+ROOF_RISE*max(0,1-t)**1.7+.20*t**6+.30*(abs(x)/(W/2))**10*t*t
for side in (-1,1):
    nx=round(W/.55);nt=14;vs=[];fs=[]
    for i in range(nx+1):
        x=-W/2+W*i/nx
        for j in range(nt+1):t=j/nt;vs.append((CX+x,roofheight(x,t),CZ+side*D/2*t))
    for i in range(nx):
        for j in range(nt):a=i*(nt+1)+j;fs.append((a,a+1,a+nt+2,a+nt+1))
    if side<0:fs=[tuple(reversed(f)) for f in fs]
    roof=roofmesh(f'music-expanded-roof-slope-{side}',vs,fs,'tile')
    # Real thin tile layer, evaluated during export.
    mod=roof.modifiers.new('tile-thickness','SOLIDIFY');mod.thickness=.08
    for i in range(round(W/.29)+1):
        x=-W/2+W*i/round(W/.29)
        tube('music-expanded-rounded-tile-seam',[(CX+x,roofheight(x,j/nt)+.035,CZ+side*D/2*j/nt) for j in range(nt+1)],.045,'tile-edge')
        tileend('music-expanded-tile-end',(CX+x,roofheight(x,1),CZ+side*D/2))
    tube('music-expanded-upturned-eave',[(CX-W/2+W*i/30,roofheight(-W/2+W*i/30,1)-.12,CZ+side*D/2) for i in range(31)],.12,'wood-light')
    for i in range(round(W/.6)+1):
        x=-W/2+W*i/round(W/.6)
        tube('music-expanded-rafter',[(CX+x,roofheight(x,t)-.22,CZ+side*D/2*t) for t in (.4,.72,1.03)],.075,'wood-light')
tube('music-expanded-golden-ridge',[(CX-W/2+W*i/24,EAVE+ROOF_RISE+.15+.42*abs(-1+i/12)**8,CZ) for i in range(25)],.14,'ochre',8)
for side in (-1,1):tube('music-expanded-ridge-tip',[(CX+side*W/2,EAVE+ROOF_RISE+.48,CZ),(CX+side*(W/2+.10),EAVE+ROOF_RISE+.78,CZ)],.12,'tile')
def underside(x,z):return roofheight(x-18,abs(z-CZ)/(D/2))-.025
def profilewall(name,axis,center,start,end,thickness,base):
    n=40;vs=[];fs=[]
    for i in range(n+1):
        along=start+(end-start)*i/n
        for side in (-1,1):
            x,z=(center+side*thickness/2,along) if axis=='x' else (along,center+side*thickness/2)
            vs.extend([(x,base,z),(x,underside(x,z),z)])
    for i in range(n):
        a=i*4;b=a+4;fs.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a+1,b+1,b+3,a+3),(a,a+2,b+2,b)])
    fs.extend([(0,1,3,2),(n*4,n*4+2,n*4+3,n*4+1)])
    return roofmesh(name,vs,fs,'plaster','roof-wall-closure')
profilewall('music-expanded-west-gable','x',10,-26.67,-11.755,.49,8.55)
profilewall('music-expanded-east-gable','x',26,-26.67,-11.755,.49,8.55)
profilewall('music-expanded-rear-roof-wall','z',-26.425,9.755,26.245,.49,8.55)
profilewall('music-expanded-front-roof-wall','z',-11.8,9.75,26.25,.40,8.18)

# Flush wall finishes, original flower image aspect, no new painted artwork.
ASPECT=1013/97
def strip(name,axis,fixed,start,end,bottom,top,key,normal):
    if end-start<.02:return
    if axis=='x':ps=[(start,bottom,fixed),(end,bottom,fixed),(end,top,fixed),(start,top,fixed)];reverse=normal<0
    else:ps=[(fixed,bottom,start),(fixed,bottom,end),(fixed,top,end),(fixed,top,start)];reverse=normal>0
    uvs=[(0,0),((end-start)/((top-bottom)*ASPECT),0),((end-start)/((top-bottom)*ASPECT),1),(0,1)] if key=='floral' else None
    if reverse:ps.reverse();uvs=uvs[::-1] if uvs else None
    plane(name,ps,key,uvs,'music-decoration-trim' if key!='wainscot' else 'music-decoration-wall')
def wallset(label,axis,fixed,start,end,base,normal,crown=None,lowfloral=False):
    strip(label+'-wainscot',axis,fixed,start,end,base+.015,base+.75,'wainscot',normal)
    strip(label+'-red-line',axis,fixed,start,end,base+.75,base+.785,'cinnabar',normal)
    strip(label+'-ochre-line',axis,fixed,start,end,base+.785,base+.805,'ochre',normal)
    if lowfloral:strip(label+'-low-floral',axis,fixed,start,end,base+.83,base+.95,'floral',normal)
    if crown:
        strip(label+'-floral',axis,fixed,start,end,crown,crown+.22,'floral',normal)
        strip(label+'-upper-red',axis,fixed,start,end,crown+.23,crown+.30,'cinnabar',normal)
# Rear skirt follows the entire stair grade and the two landings, replacing all
# horizontal bands that would otherwise cut across the same rear-wall area.
def slopeband(name,start,end,y0,y1,h0,h1,key):
    z=REAR+.014;ps=[(start,y0+h0,z),(end,y1+h0,z),(end,y1+h1,z),(start,y0+h1,z)]
    length=math.hypot(end-start,y1-y0);height=h1-h0
    # Orthogonal texture axes avoid shearing/compressing the original flower
    # image on the sloped parallelogram. The cut ends meet horizontal skirts.
    tx,ty=(end-start)/length,(y1-y0)/length
    physical_height=height*tx
    uv=[(((p[0]-start)*tx+(p[1]-y0-h0)*ty)/(physical_height*ASPECT),
         (-(p[0]-start)*ty+(p[1]-y0-h0)*tx)/physical_height) for p in ps] if key=='floral' else None
    plane(name,ps,key,uv,'music-decoration-wall' if key=='wainscot' else 'music-decoration-trim')
for label,a,b,ya,yb in [('upper',34.78,HIGH,F2,F2),('stair',HIGH,LOW,F2,F1),('lower',LOW,59.41,F1,F1)]:
    slopeband('rear-'+label+'-wainscot',a,b,ya,yb,.015,.75,'wainscot')
    slopeband('rear-'+label+'-red-line',a,b,ya,yb,.75,.785,'cinnabar')
    slopeband('rear-'+label+'-ochre-line',a,b,ya,yb,.785,.805,'ochre')
    slopeband('rear-'+label+'-low-floral',a,b,ya,yb,.83,.95,'floral')
# Below the second floor the ground rear wall retains its own horizontal skirt.
wallset('rear-under-upper','x',REAR+.013,34.78,HIGH-.02,F1,1,None,True)
strip('rear-cornice-floral','x',REAR+.016,34.78,59.41,12.86,13.08,'floral',1)
strip('rear-cornice-red','x',REAR+.017,34.78,59.41,13.09,13.17,'cinnabar',1)
wallset('west-ground','z',34.7775,REAR+.02,-18.24,F1,1,6.82)
wallset('west-upper','z',34.7775,REAR+.02,-18.24,F2,1,12.86)
wallset('east-ground','z',59.4093,REAR+.02,-18.24,F1,-1,12.86)
wallset('mural-rear','x',-18.240,45.01,59.405,F1,-1,12.86)
for i,z in enumerate((-30.6,-27.0,-23.4,-19.8)):
    # Down-facing paint on the existing ceiling, not a low new collision beam.
    plane(f'ceiling-painted-crossbeam-{i}',[(34.79,13.514,z-.09),(59.40,13.514,z-.09),(59.40,13.514,z+.09),(34.79,13.514,z+.09)],'cinnabar',group='music-decoration-trim')
for i in range(35):
    x=LOW-(i+1)*GOING;y=F1+(i+1)*RISE+.004
    plane(f'stair-nosing-{i+1:02}',[(x,y,Z1-.015),(x+.026,y,Z1-.015),(x+.026,y,Z0+.015),(x,y,Z0+.015)],'nosing',group='music-decoration-floor')
# Flat, inset-looking transverse platform ending: no raised trip threshold.
for x in (LOW+.025,58.075):
    plane('landing-flat-transverse-inlay',[(x,F1+.002,Z1-.025),(x+.018,F1+.002,Z1-.025),(x+.018,F1+.002,Z0+.025),(x,F1+.002,Z0+.025)],'ochre',group='music-decoration-floor')

# Match inward major faces to their original v003 finish; do not repaint any
# exterior face or any original image-bearing material.
for o in (architecture,):
    for f in o.data.polygons:
        ps=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices];c=sum(ps,Vector())/len(ps)
        old=o.data.materials[f.material_index].name
        inward=abs(c.z-REAR)<.002 or abs(c.x-34.7625)<.002 or abs(c.x-59.4242977528)<.002
        if inward and old in ('plaster','music-decor-plaster'):
            if materials['plaster'].name not in o.data.materials:o.data.materials.append(materials['plaster'])
            f.material_index=o.data.materials.find(materials['plaster'].name)

objects=[o for o in objects if len(o.data.vertices)]+new_objects
# Reflected side/door panel frames must still have outward solid normals.
for o in new_objects:
    if o.get('semanticGroup') in ('music-interior-grille','music-interior-floor','music-interior-stair','terraced-foundation','roof-wall-closure','courtyard-enclosure'):
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();o.data.update()
for name,want in protected_faces.items():
    o=next(o for o in objects if o.name==name)
    assert Counter(face_digest(o,f) for f in o.data.polygons)==want,'Protected art/human/porch geometry or UV changed: '+name

# Height-aware collision dataset: old open-door/jamb/upper-wall proxies replaced
# by the exact new assembly. Fine lattice cells are too small for a person.
oldsolids=json.loads((ROOT/'src/content/world/music-interior-solids-v001.json').read_text())
solids=[]
skip=('music-open-door-','music-new-floor-','music-stair-tread-','music-lower-landing','music-porch-back-','music-porch-door-lintel','music-gallery-rear-','music-gallery-door-lintel','music-porch-divider')
for item in oldsolids['solids']:
    item=json.loads(json.dumps(item));name=item['id']
    if name.startswith(skip):continue
    if name in ('music-column-lower-1','music-column-lower-foot-1'):continue
    if name=='music-back':item['min'][2]-=EXPAND;item['max'][2]-=EXPAND
    elif name in ('music-west','music-east','music-attic-ceiling') or name.startswith('music-foundation-'):item['min'][2]-=EXPAND
    solids.append(item)
def solid(name,lo,hi,walk=None,navigation=True):
    d={'id':name,'min':list(lo),'max':list(hi)}
    if walk:d['walkSurface']=walk
    if not navigation:d['navigation']=False
    solids.append(d)
for i,(lo,hi) in enumerate(regions):solid(f'music-new-floor-slab-{i}',lo,[hi[0],F2,hi[2]],'music-floor-2')
for i in range(35):
    hx,lx=LOW-i*GOING,LOW-(i+1)*GOING;top=F1+(i+1)*RISE
    bottom=F1+(F2-F1)*(LOW-hx)/(LOW-HIGH)-.32
    solid(f'music-stair-tread-{i+1:02}',[lx,bottom,Z0],[hx,top,Z1],'music-stair')
solid('music-lower-landing',[LOW,1.63,Z0],[58.1,F1,Z1],'music-floor-1')
solid('music-grille-fixed-west',[34.69,F1,-21.85],[36.575,7.30,-21.75])
solid('music-grille-fixed-east',[42.665,F1,-21.85],[44.55,7.30,-21.75])
solid('music-grille-return',[44.45,F1,-21.85],[44.55,7.30,-18.225])
solid('music-open-door-0',[36.475,1.83,-21.80],[36.575,7.15,-18.795])
solid('music-open-door-1',[42.665,1.83,-21.80],[42.765,7.15,-18.795])
solid('music-grille-unified-header',[34.69,7.16,-21.85],[44.55,7.30,-21.75])
solid('music-court-back',[23.75,0,-33.325],[70.25,4.71,-32.825])
solid('music-court-west',[23.75,0,-33.075],[24.25,4.71,3])
solid('music-court-east',[69.75,0,-33.075],[70.25,4.71,3])
soliddata={'version':'music-interior-solids-v002','coordinateFrame':'music source, metres, Y up',
           'replacedLegacyIds':oldsolids['replacedLegacyIds']+['music-court-back','music-court-west','music-court-east'],'solids':solids,
           'derivedFrom':'music-interior-solids-v001','geometryAsset':'music-interior/v004/music-pavilion.glb'}
SOLIDS.write_text(json.dumps(soliddata,ensure_ascii=False,indent=2)+'\n')

def bvh(obs):
    vs=[];fs=[];graph=bpy.context.evaluated_depsgraph_get()
    for o in obs:
        evaluated=o.evaluated_get(graph);data=evaluated.to_mesh();off=len(vs)
        vs.extend(src(o.matrix_world@v.co) for v in data.vertices)
        fs.extend(tuple(off+i for i in f.vertices) for f in data.polygons);evaluated.to_mesh_clear()
    return BVHTree.FromPolygons(vs,fs,all_triangles=False)
spatial=bvh(objects)
def ray(p,d,length):return spatial.ray_cast(Vector(p),Vector(d),length)[0]
for x in (37.0,38.5,39.5,41,42.2):
    for y in (2.2,4.5,6.95):assert ray((x,y,-20.8),(0,0,-1),2.5) is None,('ground clear opening',x,y)
for x in (35,36.5,38,40,42,44.5):
    for y in (8.7,10.5,12.8):assert ray((x,y,-21.2),(0,0,-1),2) is None,('upper open front',x,y)
for i in range(35):
    x=LOW-(i+.5)*GOING;y=F1+(i+1)*RISE;hit=ray((x,y+.1,(Z0+Z1)/2),(0,-1,0),.3)
    assert hit and abs(hit.y-y)<.007,('tread',i,hit,y)
for x in (36,40,45.5):
    for z in (-31.8,-28,-22.3):
        hit=ray((x,F2+.2,z),(0,-1,0),.4);assert hit and abs(hit.y-F2)<.001,('upper floor',x,z,hit)
for x in (35.2,39.5,44.3):
    hit=ray((x,F2+.2,-21.88),(0,-1,0),.4);assert hit and abs(hit.y-F2)<.001,('seam',x,hit)
for x in (39.1,39.6925,40):assert ray((x,3,-16.5),(0,0,-1),2) is None,'Removed lower middle column returned'
for x in (34.98,44.3325):assert ray((x,3,-16.5),(0,0,-1),2) is not None,'Adjacent original lower column vanished'
assert ray((39.6925,9.5,-16.5),(0,0,-1),2) is not None,'Upper middle column vanished'
for x in (36,40,50,58):
    hit=ray((x,13.4,-31.9),(0,1,0),4.5);assert hit is not None,('extended top cover',x)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in protected_hashes.items())

# Save only the editable scene; export copies are never saved into the source.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in objects:
    data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
    cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy()
    group=o.get('semanticGroup','architecture');cp['semanticGroup']=group;cp['decorationOnly']=bool(o.get('decorationOnly',False))
    batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(cp);o.select_set(False)
exported=[]
for (group,mats),items in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    o=bpy.context.object;o.name=group+'--'+mats[0];exported.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in exported:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
manifest={'version':'music-interior-v004','source':str(SOURCE.relative_to(ROOT)),'runtimeAsset':'music-interior/v004/music-pavilion.glb',
          'runtimeOrigin':[46,0,-9],'layout':str(LAYOUT.relative_to(ROOT)),'solids':str(SOLIDS.relative_to(ROOT)),
          'protectedSourceHashes':protected_hashes,'protectedFaceCounts':{k:sum(v.values()) for k,v in protected_faces.items()},
          'protectedArtHumansAndFrontPorchUnchanged':True,'removedColumnPreserved':True,
          'roomDepthMetres':10.325,'rearInnerZ':REAR,'rearOuterZ':-32.675,'stairZ':[Z0,Z1],
          'grilles':grille_records,'clearGroundDoorX':[36.575,42.665],'grilleTop':7.30,
          'slabUndersideY':SLAB_BOTTOM,'ceilingUndersideY':13.5305,'risers':36,'treads':35,
          'landingTopSingleSkin':True,'landingX':[LOW,58.1],'floralAspect':ASPECT,'floralTextureSource':'courtyard/v002/wall-floral-border.jpg',
          'metreUV':'1UV unit=1m; landing UV axes swapped; floral U=physical length/(height*1013/97)',
          'roof':{'frontNominalEaveZ':-16.9,'rearNominalEaveZ':-33.525,'ridgeZ':-25.2125,'seamsRegenerated':True},
          'removedComponents':removed,'modifiedComponents':modified,'addedDecoration':decor,
          'meshBatches':len(exported),'sourceRayChecksPassed':True,
          'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V004_EXPORTED',manifest['bytes'],manifest['sha256'],'batches',len(exported),'solids',len(solids))
