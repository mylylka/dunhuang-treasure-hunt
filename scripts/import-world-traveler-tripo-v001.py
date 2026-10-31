"""Archive and technically adapt the user's rigged Tripo FBX, without remodeling.

Run: blender -b --python scripts/import-world-traveler-tripo-v001.py
Original mesh/UV/JPEG bytes are preserved; derived clips remove root travel.
"""
import bpy, hashlib, json, math, shutil, struct, sys
from pathlib import Path
from mathutils import Vector, Quaternion
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('/Users/liujing/Downloads/chibi character 3d model')
ARCHIVE = ROOT / 'art-source/world/traveler-tripo/v001'
SOURCE = ROOT / 'art-source/world/models/traveler-tripo/v001'
OUTPUT = ROOT / 'public/assets/world/traveler-tripo/v001'
WORK = ROOT / 'work/world'
FBX_NAME = 'tripo_convert_922978cb-73db-49b2-970f-d8f672980b0b.fbx'
JPG_REL = 'tripo_convert_922978cb-73db-49b2-970f-d8f672980b0b.fbm/tripo_rgb_0a1c53b3-5801-4f53-8a4e-873134eace22.jpg'
TARGET_HEIGHT = 2.017
MAP = {'standing_relax': 'Idle', 'walk': 'Walk', 'run': 'Run', 'look_around': 'LookAround'}
LOOP_TAIL = {'Idle': 6, 'Walk': 0, 'Run': 4, 'LookAround': 8}
for path in (ARCHIVE, SOURCE, OUTPUT, WORK):
    path.mkdir(parents=True, exist_ok=True)

source_files = []
for relative in (FBX_NAME, JPG_REL):
    original = INPUT / relative; destination = ARCHIVE / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    sha = hashlib.sha256(original.read_bytes()).hexdigest()
    if destination.exists():
        assert hashlib.sha256(destination.read_bytes()).hexdigest() == sha, 'Refuse to replace differing archived source'
    else:
        shutil.copyfile(original, destination)
    source_files.append({'original': str(original), 'archive': str(destination.relative_to(ROOT)),
                         'bytes': original.stat().st_size, 'sha256': sha})
(ARCHIVE/'source-manifest.json').write_text(json.dumps({'source': 'user-provided FBX and paired JPEG',
    'copyPolicy': 'original bytes and names; .DS_Store excluded', 'files': source_files}, ensure_ascii=False, indent=2)+'\n')

protected_paths = [ROOT/p for p in (
    'art-source/world/models/traveler/v001/traveler.blend',
    'public/assets/world/shared/v001/traveler.glb',
    'public/assets/world/environment-sample/v002/tree-a.glb',
    'public/assets/world/environment-sample/v002/shrub-a.glb',
    'public/assets/world/environment-sample/v002/dunes.glb',
    'public/assets/world/environment-sample/v003/shrub-b.glb',
    'public/assets/world/environment-sample/v003/shrub-c.glb',
)]
protected = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected_paths}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'; scene.unit_settings.scale_length = 1
bpy.ops.import_scene.fbx(filepath=str(ARCHIVE/FBX_NAME), use_anim=True, use_image_search=True,
                         use_custom_normals=True, automatic_bone_orientation=False)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
body = next(o for o in scene.objects if o.type == 'MESH')
arm.name = 'traveler-rig'; body.name = 'traveler-skinned-mesh'
body.data.calc_loop_triangles()

def mesh_fingerprint(mesh):
    co=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',co)
    uv=np.empty(len(mesh.uv_layers[0].data)*2,dtype=np.float32);mesh.uv_layers[0].data.foreach_get('uv',uv)
    return {'vertexPositions':hashlib.sha256(co.tobytes()).hexdigest(), 'uvCoordinates':hashlib.sha256(uv.tobytes()).hexdigest()}

mesh_before = mesh_fingerprint(body.data)
rest_points = np.array([body.matrix_world@v.co for v in body.data.vertices])
rest_min=rest_points.min(axis=0);rest_max=rest_points.max(axis=0)
height_scale=TARGET_HEIGHT/float(rest_max[2]-rest_min[2])
root_bone=arm.pose.bones['mixamorig:Hips']
bone_to_world=arm.matrix_world.to_3x3()@root_bone.bone.matrix_local.to_3x3()
world_to_bone=bone_to_world.inverted()
bone_names=[b.name for b in arm.pose.bones]
original_actions=list(bpy.data.actions)
action_pairs=[]
for original in original_actions:
    stem=original.name.split('|',1)[-1].split('.',1)[0]
    assert stem in MAP, f'Unmapped source action {original.name}'
    original.name='source-'+stem;original.use_fake_user=True
    action_pairs.append((MAP[stem], original))

def evaluate_points():
    obj=body.evaluated_get(bpy.context.evaluated_depsgraph_get()); mesh=obj.to_mesh()
    p=np.empty((len(mesh.vertices),3),dtype=np.float32);mesh.vertices.foreach_get('co',p.ravel())
    matrix=np.array(obj.matrix_world);p=p@matrix[:3,:3].T+matrix[:3,3]
    obj.to_mesh_clear();return p

def apply_pose(values):
    for name,(location,rotation,scale) in values.items():
        p=arm.pose.bones[name];p.rotation_mode='QUATERNION'
        p.location=location;p.rotation_quaternion=rotation;p.scale=scale

def create_action(name, sampled):
    action=bpy.data.actions.new(name);action.use_fake_user=True
    slot=action.slots.new(id_type='OBJECT',name=arm.name)
    layer=action.layers.new(name);strip=layer.strips.new(type='KEYFRAME');bag=strip.channelbags.new(slot)
    frames=list(sampled)
    for bone in bone_names:
        for field,width,part in [('location',3,0),('rotation_quaternion',4,1),('scale',3,2)]:
            for axis in range(width):
                curve=bag.fcurves.new(data_path=f'pose.bones["{bone}"].{field}',index=axis)
                curve.keyframe_points.add(len(frames))
                coordinates=[value for f in frames for value in (f,sampled[f][bone][part][axis])]
                curve.keyframe_points.foreach_set('co',coordinates)
                for key in curve.keyframe_points:key.interpolation='LINEAR'
                curve.update()
    return action,slot

converted={};metrics=[]
for name,original in action_pairs:
    arm.animation_data.action=original
    if len(original.slots):arm.animation_data.action_slot=original.slots[0]
    start,end=map(int,original.frame_range);raw={};hips=[]
    for frame in range(start,end+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        raw[frame]={p.name:[p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()] for p in arm.pose.bones}
        hips.append(arm.matrix_world@root_bone.head)
    arm.animation_data.action=None
    delta=hips[-1]-hips[0]
    for frame,values in raw.items():
        phase=(frame-start)/(end-start)
        overall=Vector((hips[0].x+delta.x*phase,hips[0].y+delta.y*phase,0))
        values['mixamorig:Hips'][0]-=world_to_bone@overall
    first=raw[start];last=raw[end];tail=LOOP_TAIL[name]
    seam_corrections={}
    for bone in bone_names:
        q=last[bone][1].inverted()@first[bone][1]
        if q.w<0:q.negate()
        seam_corrections[bone]=(first[bone][0]-last[bone][0],q,first[bone][2]-last[bone][2])
    max_floor=0.;min_bounds=np.full(3,np.inf);max_bounds=np.full(3,-np.inf);max_radius=0.
    endpoint_points=[];frame_metrics=[]
    for frame,values in raw.items():
        if tail:
            t=max(0.,min(1.,(frame-(end-tail))/tail));weight=t*t*(3-2*t)
        else:weight=1. if frame==end else 0.
        for bone,(offset,turn,scale_offset) in seam_corrections.items():
            location,rotation,scale=values[bone]
            location+=offset*weight
            rotation=rotation@Quaternion((1,0,0,0)).slerp(turn,weight);rotation.normalize()
            scale+=scale_offset*weight
            values[bone]=[location,rotation,scale]
        scene.frame_set(frame);apply_pose(values);bpy.context.view_layer.update()
        points=evaluate_points();lift=max(0.,-float(points[:,2].min()))
        if lift:
            values['mixamorig:Hips'][0]+=world_to_bone@Vector((0,0,lift))
            apply_pose(values);bpy.context.view_layer.update();points=evaluate_points()
        max_floor=max(max_floor,lift*height_scale)
        # Final root rotation pi, followed by glTF's Y-up conversion.
        runtime_points=np.column_stack((-points[:,0],points[:,2],points[:,1]))*height_scale
        minimum=runtime_points.min(axis=0);maximum=runtime_points.max(axis=0)
        min_bounds=np.minimum(min_bounds,minimum);max_bounds=np.maximum(max_bounds,maximum)
        radius=float(np.linalg.norm(runtime_points[:,[0,2]],axis=1).max());max_radius=max(max_radius,radius)
        frame_metrics.append({'frame':frame,'minHeight':float(minimum[1]),'maxHeight':float(maximum[1]),'maxHorizontalRadius':radius,'floorLift':lift*height_scale})
        if frame in (start,end):endpoint_points.append(runtime_points)
    action,slot=create_action(name,raw);converted[name]=(action,slot)
    duration=(end-start)/scene.render.fps
    seam=np.linalg.norm(endpoint_points[1]-endpoint_points[0],axis=1)
    metric={'clip':name,'sourceAction':original.name,'frameStart':start,'frameEnd':end,'fps':scene.render.fps,
            'durationSeconds':duration,'originalHipsDeltaBlender':list(delta),
            'removedInitialHorizontalHipsOffsetBlender':[hips[0].x,hips[0].y],
            'rootMotionMethod':'Subtract initial horizontal Hips offset and linear start-to-end XY travel in source world coordinates, converted into the Hips local basis; retain residual side sway and vertical motion.',
            'loopCorrectionTailFrames':tail,'loopCorrectionMethod':'Smoothstep applies endpoint rotation/location differences over the existing final frames; source motion trajectory is retained. Walk only aligns its already matching endpoint.',
            'maxGroundPenetrationCorrectionMeters':max_floor,
            'groundCorrectionMethod':'Lift Hips only when actual evaluated skinned vertices penetrate Z=0; positive airborne height is preserved.',
            'naturalSpeedMetersPerSecondAtTargetHeight':float(math.hypot(delta.x,delta.y)*height_scale/duration),
            'animatedBoundsYUp':{'min':min_bounds.tolist(),'max':max_bounds.tolist()},
            'maxAnimatedHorizontalRadius':max_radius,
            'loopMeshSeamMeters':{'rms':float(np.sqrt(np.mean(seam**2))),'max':float(seam.max())},
            'sampledEveryFrame':True,'frameMetrics':frame_metrics}
    metrics.append(metric)
    print('CONVERTED_CLIP',json.dumps({k:v for k,v in metric.items() if k!='frameMetrics'}),flush=True)

arm.animation_data.action=None
for name,(action,slot) in converted.items():
    track=arm.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,1,action);strip.action_slot=slot
    strip.action_frame_start=action.frame_range[0];strip.action_frame_end=action.frame_range[1];track.mute=True
root=bpy.data.objects.new('traveler-root',None);scene.collection.objects.link(root)
root.rotation_euler.z=math.pi;root.scale=(height_scale,)*3;arm.parent=root
root['assetRole']='user-provided-rigged-traveler';root['frontAxis']='-Z in glTF; +Y in Blender'
root['nominalStandingHeightMeters']=TARGET_HEIGHT
root['animationPolicy']='real source skeletal clips; horizontal travel removed; source mesh and UV unchanged'
for image in bpy.data.images:
    if image.source=='FILE':
        image.filepath=str(ARCHIVE/JPG_REL);image.pack()
assert mesh_fingerprint(body.data)==mesh_before
for pose in arm.pose.bones:
    pose.location=(0,0,0);pose.rotation_quaternion=(1,0,0,0);pose.scale=(1,1,1)
scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for obj in (root,arm,body):obj.select_set(True)
bpy.context.view_layer.objects.active=arm
glb=OUTPUT/'traveler.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True,
    export_nla_strips_merged_animation_name='Animation',export_skins=True,export_materials='EXPORT',
    export_image_format='AUTO',export_extras=True)
blob=glb.read_bytes();json_length=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+json_length])
bin_length=struct.unpack_from('<I',blob,20+json_length)[0];binary=blob[28+json_length:28+json_length+bin_length]
clips=[a['name'] for a in gltf.get('animations',[])]
assert sorted(clips)==['Idle','LookAround','Run','Walk'],f'Unexpected clips {clips}'
clip_timing={a['name']:{'start':min(gltf['accessors'][s['input']]['min'][0] for s in a['samplers']),
                       'end':max(gltf['accessors'][s['input']]['max'][0] for s in a['samplers'])} for a in gltf['animations']}
assert all(abs(timing['start'])<1e-7 for timing in clip_timing.values()),'Loop clips must begin at zero'
texture_records=[]
for image in gltf['images']:
    view=gltf['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
    sha=hashlib.sha256(binary[start:start+view['byteLength']]).hexdigest()
    assert sha==source_files[1]['sha256'],'Original JPEG bytes must survive GLB export'
    texture_records.append({'mimeType':image['mimeType'],'bytes':view['byteLength'],'sha256':sha,'resolution':[4096,4096]})

# Native project opens on the adapted Idle; unmodified imported source actions
# also remain as source-* actions for technical comparison and editability.
arm.animation_data.action=converted['Idle'][0];arm.animation_data.action_slot=converted['Idle'][1]
scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'traveler.blend'))
metric_summaries=[{k:v for k,v in m.items() if k!='frameMetrics'} for m in metrics]
manifest={'asset':'traveler-tripo','version':'v001','status':'technical conversion awaiting real-web review',
    'generator':'scripts/import-world-traveler-tripo-v001.py','source':'art-source/world/models/traveler-tripo/v001/traveler.blend',
    'runtime':'public/assets/world/traveler-tripo/v001/traveler.glb','sourceFiles':source_files,
    'axisConversion':'Source faces Blender -Y; one parent rotation pi about Z makes Blender +Y / glTF -Z. GLB Y-up metres; ground origin.',
    'sourceRestBoundsBlenderZUp':{'min':rest_min.tolist(),'max':rest_max.tolist()},'nominalHeightMeters':TARGET_HEIGHT,'uniformScale':height_scale,
    'meshPolicy':'No remodeling, decimation, UV edits or texture resizing. Original vertex/UV hashes checked unchanged before export.',
    'meshFingerprints':mesh_before,'vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),
    'bones':len(arm.data.bones),'weightedVertices':sum(bool(v.groups) for v in body.data.vertices),
    'meshes':len(gltf['meshes']),'materials':len(gltf['materials']),'skins':len(gltf.get('skins',[])),
    'materialsPolicy':'Imported standard Principled material retained: metallic 0, roughness 0.9, source sRGB base-color JPEG. No artistic recoloring.',
    'textures':texture_records,'animations':metric_summaries,'exportedClipTimingSeconds':clip_timing,
    'runtimePacing':{'formula':'timeScale = movementSpeed / naturalSpeedMetersPerSecondAtTargetHeight',
                     'suggestedPreviewWalkSpeed':1.8,'suggestedPreviewRunSpeed':4.4,
                     'walkTimeScaleAt1_8':1.8/next(m['naturalSpeedMetersPerSecondAtTargetHeight'] for m in metrics if m['clip']=='Walk'),
                     'runTimeScaleAt4_4':4.4/next(m['naturalSpeedMetersPerSecondAtTargetHeight'] for m in metrics if m['clip']=='Run')},
    'bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'protectedSourceHashes':protected,
    'limitations':['Four real skeletal clips retained; short tail corrections only address loop seams and do not add new performances.',
                   'Original 4096 JPEG and 52689 triangles intentionally retained; this version is not mobile-optimized.',
                   'Source mesh includes open boundaries and disconnected accessories; renderability does not require watertight topology.',
                   'Web camera, actual character clearance and gait pacing still require runtime verification.']}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(WORK/'traveler-tripo-v001-animation-measurements.json').write_text(json.dumps(metrics,indent=2)+'\n')
print('GLB_READY',json.dumps({'bytes':len(blob),'sha256':manifest['sha256'],'clips':clips,'runtimePacing':manifest['runtimePacing']}),flush=True)

# Actual imported geometry/material and adapted source clips, neutral preview.
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('preview-world');scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background');background.inputs['Color'].default_value=(.65,.69,.74,1);background.inputs['Strength'].default_value=.5
bpy.ops.mesh.primitive_plane_add(size=16,location=(0,0,-.01));floor=bpy.context.object;floor.name='preview-ground'
material=bpy.data.materials.new('preview-ground-material');material.diffuse_color=(.48,.48,.48,1);floor.data.materials.append(material)
bpy.ops.object.light_add(type='AREA',location=(-4,5,7));light=bpy.context.object;light.data.energy=2200;light.data.shape='DISK';light.data.size=5
light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(3,-4,6));sun=bpy.context.object;sun.data.energy=1.3;sun.data.angle=.15
sun.rotation_euler=(Vector((0,0,1))-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5
views=[('front','Idle',1,(0,7,1.05)),('back','Idle',1,(0,-7,1.05)),('side','Idle',1,(7,0,1.05)),
       ('walk-mid','Walk',15,(4,6,1.2)),('run-mid','Run',8,(4,6,1.2))]
for label,clip,frame,position in views:
    arm.animation_data.action=converted[clip][0];arm.animation_data.action_slot=converted[clip][1]
    scene.frame_set(frame);bpy.context.view_layer.update()
    camera.location=position;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(WORK/f'traveler-tripo-v001-{label}.png');bpy.ops.render.render(write_still=True)
assert all(hashlib.sha256(p.read_bytes()).hexdigest()==protected[str(p.relative_to(ROOT))] for p in protected_paths)
assert all(hashlib.sha256(Path(row['original']).read_bytes()).hexdigest()==row['sha256'] for row in source_files)
print('PROTECTED_AND_ORIGINAL_HASHES_UNCHANGED',flush=True)
