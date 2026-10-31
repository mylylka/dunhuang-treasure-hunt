"""v002 closed-volume vegetation study, separate from v001 and the game world.
Python places authored contour controls and explicit broad surface forms in Blender.
This is not a claim of manual UI sculpting. No random distributions or leaf cards.
Rebuild reviewed candidate: blender -b --python scripts/build-world-environment-vegetation-v002.py -- --label candidate-02 --export --review-copy
The output is awaiting user visual review. All v001 inputs are opened read-only.
"""
import bpy,bmesh,math,json,struct,hashlib,argparse,sys,shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/environment-sample/v002';OUTPUT=ROOT/'public/assets/world/environment-sample/v002';WORK=ROOT/'work/world'
parser=argparse.ArgumentParser();parser.add_argument('--label',default='candidate-02');parser.add_argument('--export',action='store_true');parser.add_argument('--skip-render',action='store_true');parser.add_argument('--review-copy',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
for p in (SOURCE,OUTPUT,WORK):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
OLD=ROOT/'art-source/world/models/environment-sample/v001/vegetation.blend';old_sha=hashlib.sha256(OLD.read_bytes()).hexdigest()

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(color):return tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))
def material(name,color,roughness=.97,vertex_color=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');c=rgb(color)
    m.diffuse_color=(*c,1);p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Specular IOR Level'].default_value=.14
    if vertex_color:
        node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='foliage-color';m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
    return m
FOLIAGE=material('olive-sage-cloud-foliage','859368',vertex_color=True)
GROUND=material('preview-sand','e6d6b6')

def object_mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free();data.update()
    for p in data.polygons:p.use_smooth=True
    return o

# Reuse only the approved-to-study curved woody structure, never alter v001.
with bpy.data.libraries.load(str(OLD),link=False) as (data_from,data_to):
    data_to.objects=['tree-a-trunk']
tree_trunk=data_to.objects[0];bpy.context.collection.objects.link(tree_trunk)
# The closed crown conceals the thin upper ends; gently fold these ends inward.
for v in tree_trunk.data.vertices:
    if v.co.z>3.55:v.co.z=3.55+(v.co.z-3.55)*.38
    if v.co.z>2.5:
        pull=min(.08,(v.co.z-2.5)*.045);v.co.x*=1-pull;v.co.y*=1-pull

# Latest user direction: branch-driven layered cloud boughs, each still legible.
# Each bough is one editable closed, asymmetrical contour mesh. Its shoulder
# bulges are sculpted by explicit angular handles, never random sphere placement.
CLOUD_OUTLINE=[(.02,-.91,0),(.38,-1.00,0),(.76,-.74,0),(.79,-.38,0),(1.00,-.05,0),(.93,.41,0),(.61,.62,0),(.35,.93,0),(-.05,.95,0),(-.39,.74,0),(-.74,.84,0),(-1.00,.46,0),(-.94,.03,0),(-.72,-.23,0),(-.76,-.61,0),(-.38,-.89,0)]
def periodic(controls,t):
    n=len(controls);u=(t%1)*n;i=int(u);f=u-i
    p0,p1,p2,p3=[Vector(controls[j%n]) for j in (i-1,i,i+1,i+2)]
    return .5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f)
def bump(x,y,cx,cy,rx,ry):return math.exp(-((x-cx)/rx)**2-((y-cy)/ry)**2)
def sculpt_cloud(name,center,scale,turn,shade,variant=0):
    segments=40;ring_count=16;verts=[(0,0,-.86)];faces=[]
    # Broad unequal shoulder/front/back and descending rim bulges. Their spacing
    # makes each cloud non-spherical, and avoids a uniform petalled outline.
    handles=[(.18,.22,.16,.53,.50),(1.65,.48,.12,.67,.58),(3.13,.10,.20,.58,.63),(4.42,-.26,.13,.53,.52),(5.45,.42,.10,.55,.60)]
    for i in range(1,ring_count):
        phi=-math.pi/2+i*math.pi/ring_count;r=math.cos(phi);sn=math.sin(phi)
        for j in range(segments):
            theta=math.tau*j/segments;edge=periodic(CLOUD_OUTLINE,j/segments)
            x=edge.x*r;y=edge.y*r
            # A common tangent at the equator prevents the former umbrella seam.
            z=sn*(.88+.15*bump(x,y,-.36,.20,.66,.72)+.09*bump(x,y,.48,-.1,.50,.65))+.07*x*r-.045*y*r
            for angle,lat,amount,aw,pw in handles:
                angle+=variant*.14;d=(theta-angle+math.pi)%math.tau-math.pi
                f=amount*math.exp(-(d/aw)**2-((phi-lat)/pw)**2)
                x*=1+f;y*=1+f;z+=f*(.30 if phi>0 else -.28)
            verts.append((x,y,z))
    top_index=len(verts);verts.append((0,0,1.03))
    for j in range(segments):faces.append((0,1+(j+1)%segments,1+j))
    for i in range(ring_count-2):
        a=1+i*segments;b=a+segments
        for j in range(segments):k=(j+1)%segments;faces.append((a+j,a+k,b+k,b+j))
    start=1+(ring_count-2)*segments
    for j in range(segments):faces.append((start+j,start+(j+1)%segments,top_index))
    ca=math.cos(turn);sa=math.sin(turn)
    positions=[]
    for x,y,z in verts:
        x*=scale[0];y*=scale[1];z*=scale[2]
        positions.append((center[0]+x*ca-y*sa,center[1]+x*sa+y*ca,center[2]+z))
    o=object_mesh(name,positions,faces,FOLIAGE)
    attr=o.data.color_attributes.new(name='foliage-color',type='FLOAT_COLOR',domain='POINT')
    low=Vector(rgb('66774b'));high=Vector(rgb('8e9c70'))
    for i,(x,y,z) in enumerate(verts):
        t=max(0,min(1,(z+.9)/1.95));c=low.lerp(high,t*.73)*shade
        attr.data[i].color=(*c,1)
    o['construction']='authored-contour-cloud-with-directed-surface-bulges';o['role']='closed-foliage-bough'
    o['branch_support_center']=list(center);return o

# Name, center, half widths/height, yaw, tonal tier, contour variation.
# Lower-front boughs deliberately wrap the branch framework from about 2m up;
# upper/back boughs remain visible as overlapping silhouettes and shadow seams.
TREE_BOUGHS=[
('left-low',(-1.42,-.22,2.76),(.96,.79,.59),-.12,.96,0),
('left-back',(-1.27,.72,3.03),(.97,.82,.66),.40,.98,1),
('front-left',(-.70,-.96,2.91),(1.00,.73,.63),-.30,.97,2),
('front-center',(.33,-1.08,3.15),(.99,.78,.62),.26,1.00,0),
('right-low',(1.40,-.60,2.97),(.95,.80,.63),-.30,.97,1),
('right-back',(1.34,.71,3.23),(.92,.87,.65),.20,.98,2),
('back-center',(.15,1.12,3.35),(1.07,.79,.67),-.12,.99,0),
('left-middle',(-1.12,.05,3.51),(1.02,.92,.68),.12,1.01,1),
('right-middle',(.99,-.04,3.61),(1.03,.96,.72),-.18,1.02,2),
('upper-left',(-.47,.31,4.03),(.94,.90,.68),.35,1.035,0),
('upper-front',(-.03,-.60,3.74),(.88,.78,.60),-.20,1.02,1),
('upper-back',(.61,.68,3.84),(.91,.83,.66),.19,1.025,2),
]
SHRUB_BOUGHS=[
('left-low',(-.42,-.08,.22),(.43,.36,.21),-.2,.98,0),
('front-middle',(-.02,-.27,.23),(.46,.34,.23),.1,.98,1),
('right-low',(.43,-.02,.26),(.40,.37,.25),-.3,.99,2),
('back-left',(-.24,.28,.33),(.43,.34,.28),.25,1.01,1),
('back-right',(.29,.28,.34),(.40,.34,.25),-.25,1.0,0),
('upper-middle',(-.06,.03,.42),(.43,.37,.28),.13,1.025,2),
]
tree_clouds=[sculpt_cloud('tree-a-canopy-'+n,c,s,a,t,v) for n,c,s,a,t,v in TREE_BOUGHS]
shrub_clouds=[sculpt_cloud('shrub-a-canopy-'+n,c,s,a,t,v) for n,c,s,a,t,v in SHRUB_BOUGHS]
# Keep the chosen physical size and a grounded origin without adding an exposed shrub stem.
def normalize(objects,width,height,ground=True):
    coords=[v.co for o in objects for v in o.data.vertices]
    min_z=min(v.z for v in coords) if ground else 0;max_z=max(v.z for v in coords)
    sx=width/(max(v.x for v in coords)-min(v.x for v in coords));sz=height/(max_z-min_z)
    for o in objects:
        for v in o.data.vertices:v.co.x*=sx;v.co.y*=sx;v.co.z=(v.co.z-min_z)*sz
        o.data.update()
normalize([tree_trunk]+tree_clouds,5.15,4.8)
normalize(shrub_clouds,1.65,.68)

# Same daylight setup as the previous independent Blender sample.
plane=object_mesh('preview-ground',[(-12,-12,-.012),(12,-12,-.012),(12,12,-.012),(-12,12,-.012)],[(0,1,2,3)],GROUND)
world=bpy.data.worlds.new('preview-daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.71,.77,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene=bpy.context.scene;scene.world=world
bpy.ops.object.light_add(type='AREA',location=(-4,-5,9));key=bpy.context.object;key.name='preview-key';key.data.energy=1000;key.data.size=5;key.rotation_euler=(Vector((0,0,2))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,7));sun=bpy.context.object;sun.name='preview-sun';sun.data.energy=1.5;sun.rotation_euler=(.4,-.5,-.45);sun.data.angle=.12
bpy.ops.object.camera_add(location=(7,-10,6));camera=bpy.context.object;camera.name='preview-camera';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=6.8;camera.rotation_euler=(Vector((0,0,2.3))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
objects=[tree_trunk]+tree_clouds+shrub_clouds
for label,group in [('Tree A v002',[tree_trunk]+tree_clouds),('Shrub A v002',shrub_clouds)]:
    collection=bpy.data.collections.new(label);scene.collection.children.link(collection)
    for o in group:
        for c in list(o.users_collection):c.objects.unlink(o)
        collection.objects.link(o)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'vegetation.blend'))
metrics=[]
for asset,group in [('tree-a',[tree_trunk]+tree_clouds),('shrub-a',shrub_clouds)]:
    coords=[v.co for o in group for v in o.data.vertices]
    clouds=[o for o in group if 'canopy' in o.name]
    topology={'cloudBoughs':len(clouds),'boundaryEdges':0,'nonManifoldEdges':0,'vertices':0,'faces':0}
    for o in clouds:
        bm=bmesh.new();bm.from_mesh(o.data)
        topology['boundaryEdges']+=sum(e.is_boundary for e in bm.edges);topology['nonManifoldEdges']+=sum(not e.is_manifold for e in bm.edges);topology['vertices']+=len(bm.verts);topology['faces']+=len(bm.faces);bm.free()
    tri=0
    for o in group:o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
    entry={'asset':asset,'triangles':tri,'crownTopology':topology,'boundsYUp':{'min':[min(v.x for v in coords),min(v.z for v in coords),-max(v.y for v in coords)],'max':[max(v.x for v in coords),max(v.z for v in coords),-min(v.y for v in coords)]}}
    if args.export:
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0];path=OUTPUT/(asset+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True)
        raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);entry.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),meshes=len(g['meshes']),primitives=sum(len(m['primitives']) for m in g['meshes']),materials=len(g['materials']))
    metrics.append(entry)
manifest={'version':'v002','status':'awaiting user visual review','reviewedCandidate':args.label,'geometryPolicy':'Keep the reviewed candidate-02 geometry and normals unchanged; decimation deferred until user review.','method':'Python-authored, branch-driven layered closed cloud boughs with explicitly shaped non-spherical contours and directed surface bulges. Twelve independently editable tree boughs and six grounded shrub boughs retain overlap boundaries. No random placement or leaf cards. Existing v001 woody mesh loaded read-only and upper ends folded inside the foliage.','sourceV001Sha256':old_sha,'assets':metrics,'limitations':['Layered cloud boughs match the reviewed direction, but close views remain smooth and abstracted; the reference leaf-cluster detail is not achieved and final art approval remains with the user.','No leaf animation in this static sample.']}
(SOURCE/'vegetation-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(WORK/f'environment-sample-v002-vegetation-{args.label}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('VEGETATION_V002',json.dumps(manifest,ensure_ascii=False))
assert hashlib.sha256(OLD.read_bytes()).hexdigest()==old_sha
if not args.skip_render:
    for asset,group,height,ortho in [('tree',[tree_trunk]+tree_clouds,4.8,6.8),('shrub',shrub_clouds,.68,2.1)]:
        for o in objects:o.hide_render=o not in group
        center=Vector((0,0,height*.48))
        for view,delta in [('front',(0,-10,1.0)),('side',(10,0,1.0)),('oblique',(7,-10,2.8))]:
            camera.location=center+Vector(delta)*(1 if asset=='tree' else .35);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=ortho
            scene.render.filepath=str(WORK/f'environment-sample-v002-{asset}-{view}-{args.label}.png');bpy.ops.render.render(write_still=True)

# Gallery aliases reproduce the reviewed renders while retaining numbered evidence.
if args.review_copy and not args.skip_render:
    for asset in ('tree','shrub'):
        for view in ('front','side','oblique'):
            source=WORK/f'environment-sample-v002-{asset}-{view}-{args.label}.png'
            destination=WORK/f'environment-sample-v002-{asset}-{view}.png'
            shutil.copyfile(source,destination)
