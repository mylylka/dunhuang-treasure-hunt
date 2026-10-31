"""Author two short skeletal gestures on the supplied Tripo rig; preserve mesh/UV/JPEG."""
import bpy, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/traveler-tripo/v002'
OUTPUT=ROOT/'public/assets/world/traveler-tripo/v002'
WORK=ROOT/'work/world'
for p in (SOURCE,OUTPUT,WORK):p.mkdir(parents=True,exist_ok=True)
protected={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
    for folder,pattern in [(ROOT/'public/assets/world','*.glb'),(ROOT/'art-source/world/models','*.blend')]
    for p in folder.rglob(pattern) if SOURCE not in p.parents and OUTPUT not in p.parents}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/traveler-tripo/v001/traveler.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;arm=bpy.data.objects['traveler-rig'];body=bpy.data.objects['traveler-skinned-mesh']
def fingerprint():
    co=np.empty(len(body.data.vertices)*3,dtype=np.float32);body.data.vertices.foreach_get('co',co)
    uv=np.empty(len(body.data.uv_layers[0].data)*2,dtype=np.float32);body.data.uv_layers[0].data.foreach_get('uv',uv)
    return {'vertexPositions':hashlib.sha256(co.tobytes()).hexdigest(),'uvCoordinates':hashlib.sha256(uv.tobytes()).hexdigest()}
before=fingerprint();scene.frame_set(1);bpy.context.view_layer.update()
base={p.name:(p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()) for p in arm.pose.bones}
arm.animation_data.action=None
for tr in arm.animation_data.nla_tracks:tr.mute=True

def restore():
    for p in arm.pose.bones:p.location,p.rotation_quaternion,p.scale=base[p.name]
    bpy.context.view_layer.update()
def aim(name,direction,weight):
    p=arm.pose.bones['mixamorig:'+name];m=p.matrix.copy();old=m.to_quaternion()
    desired=(p.tail-p.head).rotation_difference(Vector(direction).normalized())@old
    p.matrix=Matrix.LocRotScale(m.translation,old.slerp(desired,weight),m.to_scale());bpy.context.view_layer.update()
def rotate(name,axis,degrees):
    p=arm.pose.bones['mixamorig:'+name];m=p.matrix.copy()
    p.matrix=Matrix.LocRotScale(m.translation,Quaternion(Vector(axis),math.radians(degrees))@m.to_quaternion(),m.to_scale());bpy.context.view_layer.update()
def curve(t,keys):
    if t<=keys[0][0]:return keys[0][1]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:
            u=(t-a)/(b-a);u=u*u*(3-2*u);return x+(y-x)*u
    return keys[-1][1]

def create(name,duration,pose):
    samples={};metrics=[]
    for frame in range(1,round(duration*24)+2):
        restore();t=(frame-1)/24;pose(t)
        samples[frame]={p.name:(tuple(p.location),tuple(p.rotation_quaternion),tuple(p.scale)) for p in arm.pose.bones}
        metrics.append({'time':t,'hand':list(arm.matrix_world@arm.pose.bones['mixamorig:RightHand'].head),'head':list(arm.matrix_world@arm.pose.bones['mixamorig:Head'].tail)})
    action=bpy.data.actions.new(name);action.use_fake_user=True;slot=action.slots.new(id_type='OBJECT',name=arm.name)
    strip=action.layers.new(name).strips.new(type='KEYFRAME');bag=strip.channelbags.new(slot)
    for bone in base:
        for field,size,part in [('location',3,0),('rotation_quaternion',4,1),('scale',3,2)]:
            for axis in range(size):
                fc=bag.fcurves.new(data_path=f'pose.bones["{bone}"].{field}',index=axis);fc.keyframe_points.add(len(samples))
                fc.keyframe_points.foreach_set('co',[v for frame,values in samples.items() for v in (frame,values[bone][part][axis])])
                for key in fc.keyframe_points:key.interpolation='LINEAR'
                fc.update()
    tr=arm.animation_data.nla_tracks.new();tr.name=name;st=tr.strips.new(name,1,action);st.action_slot=slot;tr.mute=True
    return action,slot,metrics

def greeting(t):
    lift=curve(t,[(0,0),(.18,0),(.46,1),(1.03,1),(1.38,0)])
    wave=curve(t,[(0,-.22),(.46,-.22),(.62,-.48),(.80,.04),(.98,-.30),(1.2,-.22)])
    aim('RightArm',(-.85,-.16,.16),lift)
    aim('RightForeArm',(wave,-.18,1),lift)
    aim('RightHand',(-.10,-.12,1),lift)
    for bone in arm.pose.bones:
        if 'RightHand' in bone.name and bone.name != 'mixamorig:RightHand':
            bone.rotation_quaternion=base[bone.name][1].slerp(Quaternion((1,0,0,0)),lift*(.4 if 'Thumb' in bone.name else .88))
    bpy.context.view_layer.update()
    rotate('Head',(0,1,0),-3*lift)

def hall(t):
    yaw=curve(t,[(0,0),(.38,-10),(.78,9),(1.12,0)])
    pitch=curve(t,[(0,0),(.85,0),(1.75,1),(2.2,1)])
    rotate('Spine2',(1,0,0),-3*pitch)
    rotate('Neck',(0,0,1),yaw*.35);rotate('Neck',(1,0,0),-8*pitch)
    rotate('Head',(0,0,1),yaw*.65);rotate('Head',(1,0,0),-17*pitch)

created={'Greeting':create('Greeting',1.5,greeting),'HallLookUp':create('HallLookUp',2.25,hall)}
assert fingerprint()==before
restore();bpy.ops.object.select_all(action='DESELECT')
for name in ('traveler-root','traveler-rig','traveler-skinned-mesh'):bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'traveler.glb'),export_format='GLB',use_selection=True,export_yup=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True,
    export_skins=True,export_materials='EXPORT',export_image_format='AUTO',export_extras=True)
blob=(OUTPUT/'traveler.glb').read_bytes();n=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+n]);binary=blob[n+28:]
old=json.loads((ROOT/'art-source/world/models/traveler-tripo/v001/export-manifest.json').read_text())
assert before==old['meshFingerprints']
for i,img in enumerate(g['images']):
    v=g['bufferViews'][img['bufferView']];start=v.get('byteOffset',0)
    assert hashlib.sha256(binary[start:start+v['byteLength']]).hexdigest()==old['textures'][i]['sha256']
assert sorted(a['name'] for a in g['animations'])==['Greeting','HallLookUp','Idle','LookAround','Run','Walk']
arm.animation_data.action=created['Greeting'][0];arm.animation_data.action_slot=created['Greeting'][1];scene.frame_set(15)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'traveler.blend'))
manifest={'version':'v002','status':'gesture and camera sample pending visual acceptance','parent':'traveler-tripo/v001',
 'protectedAssets':protected,'meshFingerprints':before,'textures':old['textures'],'sha256':hashlib.sha256(blob).hexdigest(),'bytes':len(blob),
 'method':'Authored skeletal poses sampled at 24 fps with smoothstep easing; no random motion, mesh/UV/texture edits, facial animation or cloth simulation.',
 'animations':{a['name']:{'start':min(g['accessors'][s['input']]['min'][0] for s in a['samplers']),
 'end':max(g['accessors'][s['input']]['max'][0] for s in a['samplers'])} for a in g['animations']}}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(WORK/'character-cinematics-v001-gesture-measurements.json').write_text(json.dumps({k:v[2] for k,v in created.items()},indent=2)+'\n')
# Actual Blender renders for review of the authored poses.
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('gesture-preview-world');scene.world.use_nodes=True
background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs[0].default_value=(.65,.69,.74,1);background.inputs[1].default_value=.5
bpy.ops.mesh.primitive_plane_add(size=16,location=(0,0,-.01));floor=bpy.context.object
mat=bpy.data.materials.new('preview-floor');mat.diffuse_color=(.48,.48,.48,1);floor.data.materials.append(mat)
bpy.ops.object.light_add(type='AREA',location=(-4,5,7));light=bpy.context.object;light.data.energy=2200;light.data.shape='DISK';light.data.size=5
light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.5
for label,clip,frame,pos in [('greeting-front','Greeting',16,(0,7,1.1)),('greeting-side','Greeting',16,(7,0,1.1)),('hall-diagonal','HallLookUp',43,(4,6,1.4))]:
    arm.animation_data.action=created[clip][0];arm.animation_data.action_slot=created[clip][1];scene.frame_set(frame);bpy.context.view_layer.update()
    camera.location=pos;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(WORK/f'character-cinematics-v001-blender-{label}.png');bpy.ops.render.render(write_still=True)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==sha for p,sha in protected.items())
print('GESTURES_READY',json.dumps(manifest),flush=True)
