import bpy,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];W=R/'work/world';F=6.85546875
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/world/models/mogao/v006/mogao.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1440;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('preview-world');s.world.use_nodes=True
bg=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.69,.79,.83,1);bg.inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.4;sun.data.angle=.08;sun.rotation_euler=(Vector((14,22,-35))).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam
for name,eye,target,lens in [('front',(0,-175,29),(0,0,32),40),('oblique',(98,-150,36),(0,1,32),42),('entry',(15,-43,13),(0,-1,16),28)]:
 cam.location=(eye[0],eye[1],eye[2]-F);t=Vector((target[0],target[1],target[2]-F));cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;s.render.filepath=str(W/f'mogao-v006-blender-{name}.png');bpy.ops.render.render(write_still=True)
