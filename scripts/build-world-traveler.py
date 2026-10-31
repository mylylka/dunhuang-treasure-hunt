"""Build the reference-led traveler sample. Run with blender -b --python this-file.

Original reference stays untouched. Geometry, a deform skeleton and three in-place
cycles are exported as ordinary glTF PBR, without runtime procedural shaders.
"""
import bpy, math, json, hashlib, struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/traveler/v001'
REFERENCE_ARCHIVE = 'art-source/world/art-sample/v001'
REFERENCE_FILE = ROOT / REFERENCE_ARCHIVE / '小旅人三视图.png'
if not REFERENCE_FILE.is_file():
    raise FileNotFoundError(f'Archived art reference is missing: {REFERENCE_FILE}')
OUTPUT = ROOT / 'public/assets/world/shared/v001'
WORK = ROOT / 'work/world'
for folder in (SOURCE, OUTPUT, WORK): folder.mkdir(parents=True, exist_ok=True)
# Reset only Blender's in-memory scene so user startup scenes cannot alter names.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 30
parts = []

def linear(c): return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4
def material(name, color, roughness=.85):
    m=bpy.data.materials.new(name); m.use_nodes=True
    rgb=tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=roughness
    m.diffuse_color=(*rgb,1); return m
M={
 'coat':material('ochre-red-cloth','BB6036'), 'coat-light':material('sunlit-coat-fold','CD7748'),
 'coat-dark':material('coat-inner-shadow','8B442D'), 'trim':material('woven-sand-trim','E6BC86'),
 'scarf':material('blue-green-scarf','4F7371'), 'scarf-light':material('scarf-fold','668683'),
 'linen':material('ivory-linen','F1DFBD'), 'linen-shadow':material('linen-fold','DFCBA8'),
 'skin':material('warm-skin','EDB985'), 'cheek':material('cheeks','DE9A70'),
 'hair':material('chestnut-hair','56332A'), 'hair-light':material('hair-sunlit','704638'),
 'hair-dark':material('hair-shadow','422A25'), 'leather':material('worn-leather','8B5C36'),
 'boot':material('boot-leather','68452F'), 'strap':material('leather-strap','A97845'),
 'gold':material('aged-brass','C7A25D',.5), 'pack':material('sage-canvas-pack','8D8866'),
 'eye':material('eye-white','FFF2DA',.45), 'iris':material('brown-eye','734728',.42),
 'pupil':material('pupil','251A18',.35), 'glint':material('eye-glint','FFFFFF',.25),
}

def finish(o,name,mat,bone,smooth=True):
    o.name=name; o.data.materials.append(M[mat]);
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    if bone:
        g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    parts.append(o); return o
def uv(name,loc,scale,mat,bone,segments=16,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bone)
def cube(name,loc,scale,mat,bone,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('soft-edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat,bone,False)
def tube(name,points,radius,mat,bone,resolution=2):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=3;c.bevel_depth=radius;c.bevel_resolution=resolution
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o=bpy.context.object
    return finish(o,name,mat,bone)
def rings_mesh(name,rings,mat,bone,segments=24,closed=True):
    # rings: (x,y,z, radiusX,radiusY)
    verts=[]
    for x,y,z,rx,ry in rings:
        for i in range(segments):
            a=i*math.tau/segments;verts.append((x+rx*math.sin(a),y+ry*math.cos(a),z))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(segments):
            n=(i+1)%segments;faces.append((j*segments+i,j*segments+n,(j+1)*segments+n,(j+1)*segments+i))
    if closed:faces.extend([tuple(reversed(range(segments))),tuple((len(rings)-1)*segments+i for i in range(segments))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return finish(o,name,mat,bone)
def limb(name,start,end,r1,r2,mat,bone):
    a,b=Vector(start),Vector(end);d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return finish(o,name,mat,bone)

# Head: soft rounded face, shaped chestnut silhouette and separate visible bangs.
uv('face',(0,.015,1.605),(.255,.222,.267),'skin','head',24,16)
uv('ear-left',(-.247,.007,1.595),(.049,.043,.078),'skin','head')
uv('ear-right',(.247,.007,1.595),(.049,.043,.078),'skin','head')
uv('neck',(0,0,1.375),(.095,.088,.105),'skin','chest')
# Scalp with a high front hairline and a low back edge.
verts=[];faces=[];seg=32
for row in range(9):
    u=row/8
    for i in range(seg):
        a=i*math.tau/seg;maxphi=1.40+.59*(1-math.cos(a))*.5
        p=u*maxphi
        verts.append((.278*math.sin(p)*math.sin(a),.015+.245*math.sin(p)*math.cos(a),1.65+.248*math.cos(p)))
for j in range(8):
    for i in range(seg):faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
mesh=bpy.data.meshes.new('scalp');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('scalp',mesh);scene.collection.objects.link(o);finish(o,'scalp','hair','head')

def hairlock(name,points,width,mat='hair'):
    # Tapered, gently faceted strand with rounded cross section.
    control=[Vector(p) for p in points]
    points=[tuple((1-t)**3*control[0]+3*(1-t)**2*t*control[1]+3*(1-t)*t*t*control[2]+t**3*control[3]) for t in [i/10 for i in range(11)]]
    vertices=[];N=8
    for k,p in enumerate(points):
        v=Vector(p);t=k/(len(points)-1);rad=width*(.45+math.sin(math.pi*t)*.55)*(1-t**4)
        if k==len(points)-1:rad=.002
        tangent=Vector(points[min(k+1,len(points)-1)])-Vector(points[max(0,k-1)])
        tangent.normalize();side=tangent.cross(Vector((0,1,0)))
        if side.length<.01:side=tangent.cross(Vector((1,0,0)))
        side.normalize();other=tangent.cross(side).normalized()
        for i in range(N):vertices.append(tuple(v+side*(math.cos(i*math.tau/N)*rad)+other*(math.sin(i*math.tau/N)*rad*.38)))
    fs=[]
    for k in range(len(points)-1):
        for i in range(N):fs.append((k*N+i,k*N+(i+1)%N,(k+1)*N+(i+1)%N,(k+1)*N+i))
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],fs);me.update();ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);finish(ob,name,mat,'head',True)
for i in range(15):
    a=i*math.tau/15
    y=.015+math.cos(a)*.16;x=math.sin(a)*.17
    front=math.cos(a)>.3
    hairlock(f'hair-layer-{i}',[(x*.35,y*.35,1.887),(x,y,1.86),(x*1.48,y*1.35,1.73),(x*1.6,y*1.45,1.56 if not front else 1.70)],.075,'hair-light' if i%3==0 else 'hair')
for i,(x,z) in enumerate([(-.18,1.62),(-.10,1.70),(.015,1.65),(.115,1.68),(.21,1.60)]):
    hairlock(f'forehead-lock-{i}',[(x-.05,.13,1.855),(x-.025,.225,1.81),(x,.252,1.74),(x-.025,.23,z)],.07,'hair-light' if i in (1,3) else 'hair')
for i in range(9):
    a=math.pi*.48+i*math.pi*1.04/8
    x=.23*math.sin(a);y=.015+.205*math.cos(a)
    hairlock(f'lower-hair-layer-{i}',[(x*.80,y*.8,1.80),(x,y,1.74),(x*1.15,y*1.14,1.64),(x*1.16,y*1.15,1.51)],.062,'hair-light' if i%4==0 else 'hair')
hairlock('crown-tuft',[(.015,-.015,1.87),(.015,-.01,1.93),(-.035,.005,1.986),(-.075,.02,2.015)],.04,'hair-light')
for side in (-1,1):
    x=.101*side
    uv(f'eye-white-{side}',(x,.218,1.635),(.066,.022,.074),'eye','head')
    uv(f'iris-{side}',(x,.238,1.634),(.039,.013,.052),'iris','head')
    uv(f'pupil-{side}',(x,.249,1.638),(.020,.008,.035),'pupil','head')
    uv(f'eye-light-{side}',(x-.011,.255,1.660),(.011,.005,.014),'glint','head',12,8)
    tube(f'brow-{side}',[(x-.058,.221,1.724),(x-.021,.242,1.739),(x+.027,.238,1.736),(x+.05,.218,1.725)],.009,'hair','head')
    tube(f'upper-lid-{side}',[(x-.057,.233,1.657),(x-.036,.242,1.694),(x,.246,1.707),(x+.038,.24,1.690)],.006,'hair','head')
    uv(f'cheek-{side}',(side*.164,.183,1.575),(.034,.009,.017),'cheek','head')
uv('nose',(0,.238,1.586),(.026,.028,.028),'skin','head')
tube('small-smile',[(-.042,.219,1.534),(-.02,.228,1.527),(0,.232,1.526),(.023,.228,1.529),(.044,.217,1.537)],.0045,'coat-dark','head')

# Inner linen wrap and an open broad traveling coat, with geometric woven hems.
rings_mesh('inner-tunic',[(0,0,.77,.205,.14),(0,0,1.19,.245,.145),(0,0,1.37,.16,.11)],'linen','chest')
def coat_panel(name,start,end):
    vs=[];n=24
    for row,(z,rx,ry) in enumerate([(1.365,.20,.125),(1.18,.29,.185),(.86,.37,.235),(.775,.39,.25)]):
        for i in range(n+1):
            a=start+(end-start)*i/n;zz=z-.045*math.sin(a)**2
            vs.append((rx*math.sin(a),ry*math.cos(a),zz))
    fs=[]
    for row in range(3):
        for i in range(n):fs.append((row*(n+1)+i,row*(n+1)+i+1,(row+1)*(n+1)+i+1,(row+1)*(n+1)+i))
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);finish(ob,name,'coat','chest')
    sol=ob.modifiers.new('cloth-thickness','SOLIDIFY');sol.thickness=.012
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=sol.name)
    # Straight and zigzag embroidered bands follow the garment contour.
    for z in (.795,.885):
        pts=[]
        for i in range(49):
            a=start+(end-start)*i/48;pts.append((.395*math.sin(a),.255*math.cos(a),z-.045*math.sin(a)**2))
        tube(name+'-hem-'+str(z),pts,.008,'trim','chest',1)
    pts=[]
    for i in range(49):
        a=start+(end-start)*i/48;pts.append((.395*math.sin(a),.255*math.cos(a),(.806 if i%2 else .872)-.045*math.sin(a)**2))
    tube(name+'-woven-chevron',pts,.007,'trim','chest',1)
coat_panel('open-traveling-robe',.30,math.tau-.30)
cube('waist-sash',(0,.155,.92),(.40,.035,.085),'scarf','hips',.01)
cube('waist-belt',(0,.177,.928),(.40,.024,.038),'leather','hips',.008)
tube('linen-wrap-left',[(-.13,.15,1.31),(.08,.163,1.02)],.008,'linen-shadow','chest')
tube('linen-wrap-right',[(.13,.15,1.30),(-.08,.163,1.02)],.006,'linen-shadow','chest')

for side in (-1,1):
    suffix='left' if side<0 else 'right';thigh='thigh-'+suffix;shin='shin-'+suffix;arm='arm-'+suffix;fore='forearm-'+suffix
    x=.115*side
    uv('loose-trouser-thigh-'+suffix,(x,0,.65),(.151,.15,.24),'linen',thigh,16,10)
    uv('loose-trouser-calf-'+suffix,(x,.005,.40),(.13,.137,.17),'linen',shin,16,10)
    limb('boot-shaft-'+suffix,(x,0,.13),(x,0,.31),.069,.078,'boot',shin)
    uv('soft-boot-'+suffix,(x,.058,.085),(.085,.155,.077),'boot',shin)
    cube('boot-sole-'+suffix,(x,.058,.030),(.17,.29,.038),'hair-dark',shin,.025)
    limb('boot-cuff-'+suffix,(x,0,.275),(x,0,.32),.088,.09,'strap',shin)
    for j in range(3):
        tube('boot-wrap-'+suffix+str(j),[(x-.064,.045,.10+j*.052),(x+.067,.05,.145+j*.052)],.012,'strap',shin,1)
    shoulder=(.245*side,0,1.29);elbow=(.355*side,.015,1.08);wrist=(.41*side,.04,.895)
    limb('coat-sleeve-'+suffix,shoulder,elbow,.135,.185,'coat',arm)
    # sleeve cuff is wide and visibly darker inside.
    uv('sleeve-inner-'+suffix,elbow,(.15,.13,.10),'coat-dark',arm)
    limb('ivory-under-sleeve-'+suffix,elbow,wrist,.077,.058,'linen',fore)
    uv('hand-'+suffix,(.42*side,.045,.86),(.054,.038,.075),'skin',fore)
    uv('thumb-'+suffix,(.38*side,.07,.872),(.023,.023,.045),'skin',fore)
    for i in range(3):
        uv('finger-'+suffix+str(i),(.395*side+i*.017*side,.05,.803),(.012,.022,.032),'skin',fore,12,8)
    # Two cream sleeve bands; on the visible front half of the broad sleeve.
    for bandz in (1.092,1.145):
        tube('sleeve-trim-'+suffix+str(bandz),[(side*.24,.13,bandz),(side*.33,.158,bandz-.018),(side*.45,.12,bandz-.03)],.009,'trim',arm,1)

# Blue-green wrapped scarf: layered folds and two separate fringed ends.
for i,(z,rx,ry) in enumerate([(1.365,.231,.17),(1.415,.205,.149),(1.455,.18,.14)]):
    pts=[(rx*math.sin(j*math.tau/32),ry*math.cos(j*math.tau/32),z+.012*math.cos(j*math.tau/16)) for j in range(33)]
    tube('scarf-wrap-'+str(i),pts,.045,'scarf-light' if i==1 else 'scarf','chest')
def ribbon(name,points,width,bone):
    vs=[]
    for i,p in enumerate(points):
        w=width*(1-.13*i/(len(points)-1));vs.extend([(p[0]-w/2,p[1],p[2]),(p[0]+w/2,p[1],p[2])])
    fs=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)]
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);finish(ob,name,'scarf',bone)
    so=ob.modifiers.new('woven-thickness','SOLIDIFY');so.thickness=.009;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=so.name)
    p=points[-1]
    for i in range(5):cube(name+'-fringe-'+str(i),(p[0]-width*.34+i*width*.17,p[1],p[2]-.022),(width*.11,.012,.045),'scarf',bone,.002)
ribbon('front-scarf-tail',[(.13,.17,1.39),(.145,.205,1.23),(.15,.225,1.08),(.15,.22,.99)],.115,'chest')
ribbon('back-scarf-tail',[(.18,-.11,1.41),(.34,-.13,1.34),(.46,-.18,1.22),(.57,-.22,1.15)],.15,'chest')

# Canvas pack sits behind the coat; straps and metal buckles remain separate solids.
cube('backpack-body',(0,-.245,1.18),(.39,.185,.43),'pack','chest',.055)
cube('backpack-leather-base',(0,-.27,1.01),(.39,.20,.10),'leather','chest',.025)
cube('backpack-flap',(0,-.355,1.32),(.41,.045,.17),'strap','chest',.035)
cube('backpack-pocket',(0,-.354,1.10),(.28,.055,.115),'leather','chest',.022)
for side in (-1,1):
    x=.125*side
    tube('shoulder-strap-'+str(side),[(x,-.31,1.35),(x,-.14,1.43),(x,.13,1.34),(x*1.5,.19,1.13)],.021,'strap','chest')
    cube('pack-vertical-strap-'+str(side),(x,-.39,1.20),(.037,.024,.34),'leather','chest',.007)
    for z in (1.18,1.235):cube('pack-buckle-h-'+str(side)+str(z),(x,-.412,z),(.065,.013,.012),'gold','chest',.003)
    for dx in (-.028,.028):cube('pack-buckle-v-'+str(side)+str(dx),(x+dx,-.412,1.208),(.012,.013,.064),'gold','chest',.003)
tube('pack-handle',[(-.065,-.25,1.40),(-.06,-.25,1.435),(.06,-.25,1.435),(.065,-.25,1.40)],.014,'leather','chest')

# Single deform skeleton. Every piece carries explicit bone weights; no vertex data
# is fetched from the reference picture and no runtime cloth solver is required.
armdata=bpy.data.armatures.new('traveler-skeleton');rig=bpy.data.objects.new('traveler-rig',armdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={
 'root':((0,0,0),(0,0,.2),None), 'hips':((0,0,.80),(0,0,1.04),'root'),
 'chest':((0,0,1.04),(0,0,1.39),'hips'), 'head':((0,0,1.39),(0,0,1.87),'chest')}
for s in (-1,1):
    suffix='left' if s<0 else 'right'
    bones['thigh-'+suffix]=((s*.115,0,.80),(s*.115,0,.48),'hips')
    bones['shin-'+suffix]=((s*.115,0,.48),(s*.115,0,.12),'thigh-'+suffix)
    bones['arm-'+suffix]=((s*.245,0,1.29),(s*.355,.015,1.08),'chest')
    bones['forearm-'+suffix]=((s*.355,.015,1.08),(s*.41,.04,.895),'arm-'+suffix)
for name,(head,tail,parent) in bones.items():
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='traveler-skinned-mesh';body.data.name='traveler-mesh'
mod=body.modifiers.new('traveler-deform','ARMATURE');mod.object=rig;body.parent=rig
for p in rig.pose.bones:p.rotation_mode='XYZ'

rig.animation_data_create()
for clip,frames in [('Idle',90),('Walk',32),('Run',22)]:
    action=bpy.data.actions.new(clip);rig.animation_data.action=action
    for f in range(frames+1):
        t=f/frames;phase=t*math.tau;g=math.sin(phase)
        for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
        if clip=='Idle':
            rig.pose.bones['chest'].rotation_euler.x=.012*math.sin(phase)
            rig.pose.bones['head'].rotation_euler.z=.018*math.sin(phase)
        else:
            running=clip=='Run';amplitude=.67 if running else .37
            # Hip rise follows the stance leg so no animated sole enters the ground.
            rig.pose.bones['hips'].location.y=.008+(.022 if running else .006)*(1-math.cos(phase*2))
            rig.pose.bones['chest'].rotation_euler.x=-.09 if running else -.018
            rig.pose.bones['chest'].rotation_euler.z=.025*g
            for s in (-1,1):
                suffix='left' if s<0 else 'right';wave=g*s
                rig.pose.bones['thigh-'+suffix].rotation_euler.x=wave*amplitude
                rig.pose.bones['shin-'+suffix].rotation_euler.x=-max(0,wave)*(.65 if running else .30)
                rig.pose.bones['arm-'+suffix].rotation_euler.x=-wave*(.58 if running else .33)
                rig.pose.bones['forearm-'+suffix].rotation_euler.x=.55 if running else .12
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_euler',frame=f+1,group=p.name)
            if p.name=='hips':p.keyframe_insert('location',frame=f+1,group=p.name)
    action.use_fake_user=True
    track=rig.animation_data.nla_tracks.new();track.name=clip
    strip=track.strips.new(clip,1,action);strip.action_frame_start=1;strip.action_frame_end=frames+1
    track.mute=True
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
scene.frame_set(1)

# Export only the production mesh and rig; preview stage is not part of the GLB.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
glb=OUTPUT/'traveler.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_nla_strips_merged_animation_name='Animation',export_skins=True,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'traveler.blend'))
blob=glb.read_bytes();length,typ=struct.unpack_from('<II',blob,12);gltf=json.loads(blob[20:20+length])
clips=[a['name'] for a in gltf.get('animations',[])]
if sorted(clips)!=['Idle','Run','Walk']:raise RuntimeError(f'Unexpected animation clips: {clips}')
triangles=sum(len(p.vertices)-2 for p in body.data.polygons)
manifest={'asset':'traveler','version':'v001','reference':'小旅人三视图.png','referenceArchive':REFERENCE_ARCHIVE,'referenceSha256':hashlib.sha256(REFERENCE_FILE.read_bytes()).hexdigest(),'status':'art sample awaiting user confirmation','generator':'scripts/build-world-traveler.py','coordinateSystem':'Blender Z-up, +Y facing; glTF Y-up, -Z facing; feet origin','heightMeters':2.017,'skin':'one explicit-weight deform skeleton; overlapping clothing components; no cloth simulation','animations':clips,'triangles':triangles,'bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'materials':'standard PBR, solid colors and geometric woven trim; no texture baking or AI modification','knownLimitations':['Stylized first sculpt; silhouette and face require user art approval','Scarf ends and backpack are attached to chest; no cloth physics']}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

# Consistent front / back preview for art review.
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=780;scene.render.resolution_y=900;scene.render.resolution_percentage=100
if scene.world is None: scene.world=bpy.data.worlds.new('preview-world')
scene.world.color=(.32,.32,.32)
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.005));floor=bpy.context.object;floor.name='preview-floor';floor.data.materials.append(material('preview-sand','E9D6B4'))
for name,loc,power,size in [('key',(3,4,6),650,4),('fill',(-3,1,3),300,5),('rim',(0,-3,4),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.6,5.8,2.5));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=2.5;scene.camera=camera
for suffix,loc in [('front',(2.6,5.8,2.4)),('back',(-2.6,-5.8,2.4))]:
    camera.location=loc;camera.rotation_euler=(Vector((0,0,1.03))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(WORK/f'traveler-{suffix}-v001.png');bpy.ops.render.render(write_still=True)
print(json.dumps(manifest,ensure_ascii=False))
