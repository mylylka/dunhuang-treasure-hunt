"""Front and oblique source-model comparisons under one fixed studio light."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];W=R/'work/world';floor=6.85546875
for version in (['v005'] if '--after-only' in sys.argv else ['v004','v005']):
 bpy.ops.wm.open_mainfile(filepath=str(R/f'art-source/world/models/mogao/{version}/mogao.blend'))
 cliff=bpy.data.objects['user-cliff-facade']
 for o in bpy.context.scene.objects:o.hide_render=o!=cliff and o.get('semanticGroup') not in ['local-sandstone-v005','user-cliff']
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100
 s.world=bpy.data.worlds.new('study-world');s.world.color=(.32,.32,.32);s.view_settings.view_transform='AgX'
 bpy.ops.object.light_add(type='AREA',location=(-45,-65,55));light=bpy.context.object;light.data.energy=40000;light.data.shape='DISK';light.data.size=40;light.rotation_euler=(Vector((-24,-10,10))-light.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=34;s.camera=cam
 for name,eye,target in [('front',(-29,-110,12-floor),(-29,0,12-floor)),('oblique',(-65,-90,22-floor),(-29,-15,11-floor))]:
  cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
  s.render.filepath=str(W/f'mogao-v005-blender-{name}-{version}.png');bpy.ops.render.render(write_still=True)
