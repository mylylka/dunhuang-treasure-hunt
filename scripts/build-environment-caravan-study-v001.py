"""Optional distant caravan composition; independent of the running game.
Uses archived user GLB and inherited landscape fixed lighting.
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/environment-study/v001'
OUT=ROOT/'outputs/environment-study/v001'
parser=argparse.ArgumentParser();parser.add_argument('--draft',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'landscape.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
# Evaluate the exact already-built terrain rather than another height function.
ground=bpy.data.objects['Continuous dune field']
def height(x,y):
    ok,location,normal,index=ground.ray_cast(Vector((x,y,500)),Vector((0,0,-1)))
    if not ok:raise ValueError('Caravan outside study terrain')
    return location.z

before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'art-source/world/environment-study/v001/source-camel.glb'))
imported=set(scene.objects)-before
model=next(o for o in imported if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
armature=next(o for o in imported if o.type=='ARMATURE')
frames=[9,25,42,54,16,34,48]
xs=[-92,-86.8,-81.1,-74.9,-69.5,-63.0,-57.4]
heights=[2.60,2.42,2.69,2.55,2.37,2.64,2.48]
poses=[];camels=[]
for i,(x,frame,target_height) in enumerate(zip(xs,frames,heights)):
    y=25+22*math.sin(x*.012+1.8)+.13*x
    # Small lateral wandering keeps one connected trail without a ruler-straight row.
    y+=[.05,-.16,.10,.23,-.09,.16,-.05][i]
    scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get()
    evaluated=model.evaluated_get(deps);data=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
    data.transform(model.matrix_world)
    points=[v.co for v in data.vertices]
    lo=Vector(tuple(min(p[j] for p in points) for j in range(3)))
    hi=Vector(tuple(max(p[j] for p in points) for j in range(3)))
    center=Vector(((lo.x+hi.x)*.5,(lo.y+hi.y)*.5,lo.z))
    scale=target_height/(hi.z-lo.z)
    data.transform(Matrix.Scale(scale,4)@Matrix.Translation(-center))
    angle=math.atan2(.264*math.cos(x*.012+1.8)+.13,1)
    obj=bpy.data.objects.new(f'Distant caravan camel {i+1:02}',data);scene.collection.objects.link(obj)
    obj.location=(x,y,height(x,y)+.015);obj.rotation_euler.z=math.pi/2+angle
    obj['sourceAnimationFrame']=frame;obj['heightMetres']=target_height
    poses.append({'position':list(obj.location),'height':target_height,'bakedWalkFrame':frame,'headingEastRadians':angle})
    camels.append(obj)
for o in imported:o.hide_render=True;o.hide_viewport=True
scene.frame_set(0)

# Short, slack lead ropes are real curves. They are intentionally subtle at this distance.
rope=bpy.data.materials.new('Dark flax lead ropes');rope.diffuse_color=(.09,.055,.027,1);rope.use_nodes=True
rope_shader=next(n for n in rope.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
rope_shader.inputs['Base Color'].default_value=(.09,.055,.027,1)
rope_shader.inputs['Roughness'].default_value=1
for i in range(len(camels)-1):
    trailing=camels[i];leading=camels[i+1]
    start=trailing.location+Vector((1.0,.30,heights[i]*.72))
    end=leading.location+Vector((-.85,-.20,heights[i+1]*.52))
    curve=bpy.data.curves.new('Slack camel tether','CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=.018;curve.bevel_resolution=1
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
    for b,p in zip(spline.bezier_points,[start,(start+end)*.5+Vector((0,0,-.45)),end]):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    ob=bpy.data.objects.new(f'Caravan tether {i+1:02}',curve);scene.collection.objects.link(ob);curve.materials.append(rope)

camera=scene.camera
camera.location=(-115,-115,height(-115,-115)+1.8)
target=Vector((-48,65,27))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=39
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.cycles.samples=48
if args.draft:scene.render.resolution_percentage=60;scene.cycles.samples=16
distances=[(o.location-camera.location).length for o in camels]
report={'status':'Optional atmosphere composition, not an in-game screenshot','camelCount':7,
 'source':'art-source/world/environment-study/v001/source-camel.glb','animation':'preset:quadruped:walk',
 'sun':'Inherited northwest 315 degrees / elevation 30 degrees; unchanged',
 'cameraEyeAboveTerrain':1.8,'cameraPosition':list(camera.location),'cameraTarget':list(target),
 'camelDistanceRange':list((min(distances),max(distances))),'camelHeights':heights,'poses':poses,
 'render':'Static posed walk frames only; no runtime animation system added'}
(SOURCE/'caravan-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'caravan.blend'))
scene.render.filepath=str((ROOT/'work/world' if args.draft else OUT)/('caravan-distant-draft.png' if args.draft else 'caravan-distant.png'))
bpy.ops.render.render(write_still=True)
print('CARAVAN_RENDER',scene.render.filepath,flush=True)
