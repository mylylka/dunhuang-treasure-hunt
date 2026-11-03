"""Render the saved source model using measured, real gameplay camera poses."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'work/world'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/mogao/v001/mogao.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1279;scene.render.resolution_y=925;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('inspection-sky');world.use_nodes=True;scene.world=world;world.node_tree.nodes.clear();bg=world.node_tree.nodes.new('ShaderNodeBackground');wo=world.node_tree.nodes.new('ShaderNodeOutputWorld');world.node_tree.links.new(bg.outputs[0],wo.inputs[0]);bg.inputs[0].default_value=(.70,.78,.86,1);bg.inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.55,-.4,-.65);sun.data.energy=2.8;sun.data.angle=.1
bpy.ops.object.light_add(type='AREA',location=(0,-2,7));light=bpy.context.object;light.data.energy=5000;light.data.shape='DISK';light.data.size=9;light.rotation_euler=(Vector((0,25,6))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(0,20,17));light=bpy.context.object;light.data.energy=2200;light.data.size=14
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(49/2)))
states=json.loads((WORK/'mogao-v001-capture.json').read_text())['states']
def local(p):return Vector((p[0]-122,-68-p[2],p[1]-2.4))
for view in ['distant','interior']:
 pose=states[view]['camera'];cam.location=local(pose['position']);cam.rotation_euler=(local(pose['target'])-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(WORK/f'mogao-v001-blender-matched-{view}.png');bpy.ops.render.render(write_still=True)
(WORK/'mogao-v001-matched-cameras.json').write_text(json.dumps({v:states[v]['camera'] for v in ['distant','interior']},indent=2)+'\n')
