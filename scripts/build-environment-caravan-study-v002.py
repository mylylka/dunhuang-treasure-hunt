"""v002 clear-sky distant caravan composition; independent of the running game.
Uses archived user GLB and inherited landscape fixed lighting.
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/environment-study/v002'
OUT=ROOT/'outputs/environment-study/v002'
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
# One immutable BVH of all environment meshes for image-space skyline checks.
environment_vertices=[];environment_triangles=[]
for obj in before:
    if obj.type!='MESH' or obj.hide_render:continue
    start=len(environment_vertices);obj.data.calc_loop_triangles()
    environment_vertices.extend(obj.matrix_world@v.co for v in obj.data.vertices)
    environment_triangles.extend(tuple(start+i for i in t.vertices) for t in obj.data.loop_triangles)
environment_bvh=BVHTree.FromPolygons(environment_vertices,environment_triangles,all_triangles=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'art-source/world/environment-study/v001/source-camel.glb'))
imported=set(scene.objects)-before
model=next(o for o in imported if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
armature=next(o for o in imported if o.type=='ARMATURE')
frames=[9,25,42,54,16,34,48]
xs=[-249,-243.8,-238.1,-231.9,-226.5,-220.0,-214.4]
heights=[2.60,2.42,2.69,2.55,2.40,2.64,2.48]
poses=[];camels=[];anchors=[]
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
    bpy.context.view_layer.update()
    # Foot contacts follow the real slope. Raised feet retain the authored walk pose.
    foot_candidates=[v.co.copy() for v in data.vertices if v.co.z<target_height*.18]
    foot_gaps=[(obj.matrix_world@v).z-height((obj.matrix_world@v).x,(obj.matrix_world@v).y) for v in foot_candidates]
    obj.location.z+=.012-min(foot_gaps);bpy.context.view_layer.update()
    per_foot={}
    for v in foot_candidates:
        key=('left' if v.x<0 else 'right')+('-front' if v.y<0 else '-rear')
        p=obj.matrix_world@v;gap=p.z-height(p.x,p.y)
        per_foot[key]=min(per_foot.get(key,1e6),gap)
    assert min(per_foot.values())>=.005 and min(per_foot.values())<.02
    neck=(armature.matrix_world@armature.pose.bones['tripo::Head_1'].head-center)*scale
    rear=Vector((0,max(v.co.y for v in data.vertices)*.72,target_height*.52))
    anchors.append((neck,rear))
    poses.append({'position':list(obj.location),'height':target_height,'bakedWalkFrame':frame,'headingEastRadians':angle,'footGapsMetres':per_foot})
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
    start=trailing.matrix_world@anchors[i][0]
    end=leading.matrix_world@anchors[i+1][1]
    curve=bpy.data.curves.new('Slack camel tether','CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=.018;curve.bevel_resolution=1
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
    for b,p in zip(spline.bezier_points,[start,(start+end)*.5+Vector((0,0,-.45)),end]):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    ob=bpy.data.objects.new(f'Caravan tether {i+1:02}',curve);scene.collection.objects.link(ob);curve.materials.append(rope)

camera=scene.camera
camera.location=(-310,-135,height(-310,-135)+1.8)
target=Vector((-230,-15,34))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=39
bpy.context.view_layer.update()
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

def sky_check():
    bpy.context.view_layer.update();results=[]
    for obj in camels:
        world=[obj.matrix_world@v.co for v in obj.data.vertices]
        # Scan the real projected top silhouette, retaining extremal points in 24 narrow bins.
        projected=[(world_to_camera_view(scene,camera,p),p) for p in world]
        minx=min(q.x for q,p in projected);maxx=max(q.x for q,p in projected)
        bins={}
        for q,p in projected:
            col=min(23,int((q.x-minx)/(maxx-minx)*24))
            if col not in bins or q.y>bins[col][0].y:bins[col]=(q,p)
        checks=[]
        for q,p in bins.values():
            # Include back and head/ear outline; limbs legitimately touch/overlap the dune.
            if p.z<obj.location.z+obj['heightMetres']*.55:continue
            direction=(p-camera.location).normalized();distance=(p-camera.location).length
            front_hit=environment_bvh.ray_cast(camera.location,direction,distance-.015)[0]
            background_hit=environment_bvh.ray_cast(p+direction*.12,direction,5000)[0]
            inside_frame=0<=q.x<=1 and 0<=q.y<=1 and q.z>0
            checks.append({'projectedUv':[q.x,q.y],'cameraDepth':q.z,'insideFrame':inside_frame,'worldPoint':list(p),'clearForeground':front_hit is None,'skyBehind':background_hit is None,'frontHit':list(front_hit) if front_hit else None,'backHit':list(background_hit) if background_hit else None})
        results.append({'camel':obj.name,'silhouetteSamples':len(checks),'allSky':all(c['skyBehind'] and c['clearForeground'] and c['insideFrame'] for c in checks),'samples':checks})
    return results

view_specs=[('caravan-distant',(-310,-135),(-230,-15,34)),('caravan-route',(-320,-129),(-230,-15,34))]
report['skylineVerification']={};report['views']={}
for name,eye_xy,look_target in view_specs:
    camera.location=(*eye_xy,height(*eye_xy)+1.8);camera.rotation_euler=(Vector(look_target)-camera.location).to_track_quat('-Z','Y').to_euler()
    ranges=[(o.location-camera.location).length for o in camels]
    report['views'][name]={'position':list(camera.location),'target':list(look_target),'eyeHeightAboveActualTerrain':1.8,'camelDistanceRange':[min(ranges),max(ranges)]}
    report['skylineVerification'][name]=sky_check()
    (ROOT/'work/world'/('caravan-v002-'+name+'-sky-check.json')).write_text(json.dumps(report['skylineVerification'][name],indent=2)+'\n')
    assert all(r['allSky'] and r['silhouetteSamples']>8 for r in report['skylineVerification'][name]),(name,[(r['camel'],r['silhouetteSamples'],r['allSky']) for r in report['skylineVerification'][name]])
camera.location=(-310,-135,height(-310,-135)+1.8);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
(SOURCE/'caravan-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'caravan.blend'))
for name,eye_xy,look_target in view_specs:
    camera.location=(*eye_xy,height(*eye_xy)+1.8);camera.rotation_euler=(Vector(look_target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((ROOT/'work/world' if args.draft else OUT)/(name+('-v002-draft' if args.draft else '')+'.png'))
    bpy.ops.render.render(write_still=True)
    print('CARAVAN_RENDER',scene.render.filepath,flush=True)
