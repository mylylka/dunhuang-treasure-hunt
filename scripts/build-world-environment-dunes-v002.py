"""Authored v002 dune landform, saved in Blender and exported to one closed GLB.

The v001 crest-envelope method is replaced by a directly designed cross-section
loft: three unequal curved banks, two broad valley floors and explicit slip faces.
Run: blender -b --python scripts/build-world-environment-dunes-v002.py
"""
import bpy, hashlib, json, math, struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'art-source/world/models/environment-sample/v002'
OUTPUT = ROOT/'public/assets/world/environment-sample/v002'
WORK = ROOT/'work/world'
for path in (SOURCE, OUTPUT, WORK): path.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

# Plan-space z runs from rear to front. Unlike v001, these crest lines run mostly
# through depth and bend into different crescents. Their visible -X slip faces
# oppose the actual local sun direction (+22,+35,+14), while long +X slopes face it.
Z_CONTROLS = [-17.5, -13, -7, 0, 7, 13, 17.5]
BANKS = {
    'left-crescent': {'x': [-44,-40,-33,-27,-30,-39,-45], 'h': [0,1.4,4.3,6.2,5.3,2.0,0]},
    'main-s-crest': {'x': [-5,-4,0,2,6,11,8], 'h': [0,3.0,7.9,9.2,7.6,3.0,0]},
    'right-shoulder': {'x': [29,32,37,36,31,29,35], 'h': [0,2.5,5.0,5.7,3.2,1.0,0]},
}
VALLEYS = {'left': [0,.10,.32,.55,.42,.10,0], 'right': [0,.15,.45,.72,.40,.10,0]}

def curve(z, values):
    xs = Z_CONTROLS
    slopes = [(values[i+1]-values[i])/(xs[i+1]-xs[i]) for i in range(len(xs)-1)]
    tangents = [slopes[0]]
    for a,b in zip(slopes, slopes[1:]): tangents.append(0 if a*b <= 0 else 2*a*b/(a+b))
    tangents.append(slopes[-1])
    i = next((i for i in range(len(xs)-1) if z <= xs[i+1]), len(xs)-2)
    width = xs[i+1]-xs[i]; t = min(1,max(0,(z-xs[i])/width))
    return ((2*t**3-3*t*t+1)*values[i] + (t**3-2*t*t+t)*width*tangents[i]
            + (-2*t**3+3*t*t)*values[i+1] + (t**3-t*t)*width*tangents[i+1])

def designed_section(z):
    (xa,ha),(xb,hb),(xc,hc) = [(curve(z,b['x']),curve(z,b['h'])) for b in BANKS.values()]
    va,vb = curve(z,VALLEYS['left']),curve(z,VALLEYS['right'])
    # Every profile point has a purpose: flat valley shoulders, a broad planar
    # slip face and a long convex windward shoulder. No per-vertex randomness.
    left_valley_start = xb-12.0
    right_valley_start = xc-11.5
    points = [
        (-50,0), (max(-49,xa-5.3),.04), (xa-1.0,ha*.83), (xa,ha),
        (xa+(left_valley_start-xa)*.38,ha*.69),
        (left_valley_start,va), (xb-6.2,va), (xb-1.2,hb*.84), (xb,hb),
        (xb+(right_valley_start-xb)*.38,hb*.72),
        (right_valley_start,vb), (xc-6.5,vb), (xc-1.1,hc*.82), (xc,hc),
        (xc+(50-xc)*.40,hc*.61), (50,0),
    ]
    if any(b[0] <= a[0] for a,b in zip(points, points[1:])):
        raise RuntimeError(f'Crossing authored sections at z={z}')
    # Both outer ends merge into ground, rather than becoming an exposed wall.
    end_weight = min(1,max(0,(17.5-abs(z))/2.5))
    return [(x,h*end_weight-.15) for x,h in points]

ROWS = 40
SAMPLES_PER_BAND = 3
COLUMNS = 15*SAMPLES_PER_BAND+1
vertices=[]; faces=[]
for row in range(ROWS+1):
    z = -17.5+35*row/ROWS
    controls = designed_section(z)
    for col in range(COLUMNS):
        band=min(14,col//SAMPLES_PER_BAND); t=(col-band*SAMPLES_PER_BAND)/SAMPLES_PER_BAND
        x0,h0=controls[band];x1,h1=controls[band+1]
        # Keep the intentionally sculpted faces planar across their widths.
        vertices.append((x0+(x1-x0)*t,-z,h0+(h1-h0)*t))
for row in range(ROWS):
    for col in range(COLUMNS-1):
        a=row*COLUMNS+col;b=a+COLUMNS
        if (row+col)%2:faces.extend([(a,b,a+1),(a+1,b,b+1)])
        else:faces.extend([(a,b,b+1),(a,b+1,a+1)])
boundary=([i for i in range(COLUMNS)]
          +[row*COLUMNS+COLUMNS-1 for row in range(1,ROWS+1)]
          +[ROWS*COLUMNS+i for i in range(COLUMNS-2,-1,-1)]
          +[row*COLUMNS for row in range(ROWS-1,0,-1)])
bottom=[]
for i in boundary:
    x,y,_=vertices[i];bottom.append(len(vertices));vertices.append((x,y,-.35))
center=len(vertices);vertices.append((0,0,-.35))
for i,top in enumerate(boundary):
    j=(i+1)%len(boundary)
    faces.extend([(top,bottom[i],bottom[j]),(top,bottom[j],boundary[j]),(center,bottom[j],bottom[i])])

mesh=bpy.data.meshes.new('dune-landscape-mesh')
mesh.from_pydata(vertices,[],faces);mesh.update()
model=bpy.data.objects.new('dune-landscape',mesh);scene.collection.objects.link(model)
bpy.context.view_layer.objects.active=model;model.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for p in mesh.polygons:p.use_smooth=False

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
material=bpy.data.materials.new('matte-sand');material.use_nodes=True;material.use_backface_culling=True
shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
# Constant albedo: all light/dark separation in this candidate is real geometry.
shader.inputs['Base Color'].default_value=tuple(linear(v) for v in (.92,.708,.452))+(1,)
shader.inputs['Roughness'].default_value=1
shader.inputs['Specular IOR Level'].default_value=.10
mesh.materials.append(material)
model['assetRole']='independent-dune-study'
model['placementOrigin']='ground rectangle center'
model['frontAxis']='+Z in glTF; opens toward fixed preview cameras'
model['shapeVersion']='v002-authored-cross-sections'

mesh.calc_loop_triangles()
edge_counts={}
for p in mesh.polygons:
    for e in p.edge_keys:edge_counts[e]=edge_counts.get(e,0)+1
assert all(n==2 for n in edge_counts.values()),'Dune mesh must be closed'
assert len(mesh.loop_triangles)<8000,'Triangle budget exceeded'
bpy.context.view_layer.update()
sun_local=Vector((22,-14,35)).normalized()
face_samples=[]
for name,x,z in [('main-lee',-1.5,0),('main-lit',12,0),('left-valley',-7,0),('right-lee',32,0),('right-lit',42,0)]:
    hit,location,normal,index=model.ray_cast(Vector((x,-z,30)),Vector((0,0,-1)))
    if not hit:raise RuntimeError(f'No surface at {name}')
    face_samples.append({'name':name,'localPoint':[x,round(location.z,4),z],
                         'normalYup':[round(normal.x,4),round(normal.z,4),round(-normal.y,4)],
                         'sunDot':round(max(0,normal.dot(sun_local)),4)})

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'dunes.blend'))
glb=OUTPUT/'dunes.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,
                         export_apply=True,export_animations=False,export_extras=True)
raw=glb.read_bytes();n=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+n])
manifest={'asset':'independent-dunes','version':'v002','status':'awaiting user visual review',
          'generator':'scripts/build-world-environment-dunes-v002.py','source':'art-source/world/models/environment-sample/v002/dunes.blend',
          'runtime':'public/assets/world/environment-sample/v002/dunes.glb','references':['W01','W02'],
          'referenceArchive':'art-source/world/art-sample/v001/','origin':'ground rectangle center','units':'metres','upAxis':'Y',
          'bounds':{'min':[-50,-.35,-17.5],'max':[50,max(v[2] for v in vertices),17.5]},
          'triangles':len(mesh.loop_triangles),'vertices':len(mesh.vertices),'meshCount':len(gltf['meshes']),
          'materialCount':len(gltf['materials']),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
          'shape':'directly authored cross-section loft; unequal crescent and S crest, broad independent low valley floors; no noise/envelope summation',
          'lightingIntent':'Camera-visible -X slip faces oppose actual local sun (+22,+35,+14); long +X slopes receive sunlight',
          'albedo':'constant PBR sand; no baked shading or face-color shadow trick',
          'crestControls':BANKS,'valleyControls':VALLEYS,'zControls':Z_CONTROLS,'actualFaceSamples':face_samples,
          'remainingVisualGaps':['The fixed low camera mainly shows one dominant dune and hides part of the valley floors','Large triangular facets remain visible at close range','The connected forms and their endings remain more simplified and regular than the continuous natural rhythm of W01/W02'],
          'limits':['Independent candidate only; no production map update','Blender preview matches sun direction and energy; final brightness judgement uses unchanged browser hemi/ACES','No collision or walkable terrain supplied']}
(SOURCE/'dunes-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

# Candidate views: one sun, fixed direction from the existing webpage, no fog,
# no extra fill lights or baked shadow. The web renderer remains the authority.
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1280;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0
scene.world=bpy.data.worlds.new('preview-world');scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.78,.78,.70,1);bg.inputs['Strength'].default_value=.45
bpy.ops.object.light_add(type='SUN',location=(22,-14,35));sun=bpy.context.object
sun.data.energy=2.4;sun.data.color=tuple(linear(v) for v in (1,242/255,214/255));sun.data.angle=math.radians(4)
sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=600,location=(0,0,0));floor=bpy.context.object
floor.name='preview-ground';floor.data.materials.append(material)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24
camera.data.lens=24/(2*math.tan(math.radians(49)/2))
def in_local(world):
    x,y,z=world
    return (z-12,-(55-x),y)
def walking_pose(px,pz,yaw):
    return in_local((px+math.sin(yaw)*9.2,4.5,pz+math.cos(yaw)*9.2)),in_local((px,1.8,pz))
dunes_cam,dunes_target=walking_pose(20,-4,-math.pi/2-.35)
oblique_cam,oblique_target=walking_pose(24,25,-math.pi/2+.4)
views=[('overall',(68,-80,66),(0,0,2.5),'ORTHO',84),
       ('low',dunes_cam,dunes_target,'PERSP',None),
       ('oblique',oblique_cam,oblique_target,'PERSP',None),
       ('side',(110,-18,19),(0,0,3),'ORTHO',48)]
for name,pos,target,projection,size in views:
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type=projection
    if size:camera.data.ortho_scale=size
    scene.render.filepath=str(WORK/f'environment-sample-v002-dunes-{name}.png');bpy.ops.render.render(write_still=True)
print(json.dumps(manifest,ensure_ascii=False))
