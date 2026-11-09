"""Transplant approved v002 rock shapes and distant camel poses onto the game's exact mesh.
Run node --import tsx scripts/export-environment-layout-v001.mjs first.
Blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-world-v001.py
"""
import bpy, math, json, hashlib, ast, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/world/environment-world/v001'
SOURCE=ROOT/'art-source/world/models/environment-world/v001'
WORK=ROOT/'work/world'
OUT.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
layout=json.loads((WORK/'environment-layout-v001.json').read_text())
assert hashlib.sha256((ROOT/'src/content/world/environment-layout-v001.ts').read_bytes()).hexdigest()==layout['layoutHash']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.5

def mesh(name,vertices,faces):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);return obj
xs,zs=layout['xs'],layout['zs'];nx=len(xs)
terrain_vertices=[(x,-z,layout['heights'][j*nx+i]) for j,z in enumerate(zs) for i,x in enumerate(xs)]
terrain_triangles=[]
for j in range(len(zs)-1):
    for i in range(nx-1):
        a=j*nx+i;b=a+nx;terrain_triangles.extend([(a,b,a+1),(a+1,b,b+1)])
ground=mesh('Exact runtime terrain triangulation',terrain_vertices,terrain_triangles)
ground_bvh=BVHTree.FromPolygons(terrain_vertices,terrain_triangles,all_triangles=True)
def height(x,y):
    p=ground_bvh.ray_cast(Vector((x,y,600)),Vector((0,0,-1)),1000)[0]
    if p is None:raise ValueError(('No actual ground triangle',x,y))
    return p.z
def standard(name,color):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.94
    return mat
ground.data.materials.append(standard('Ground context only not exported',(.58,.37,.17)))
for p in ground.data.polygons:p.use_smooth=True

# Source poses and rock upper geometry are loaded; the 960x1200 sample terrain is never imported.
source_file=ROOT/'art-source/world/models/environment-study/v002/caravan.blend'
with bpy.data.libraries.load(str(source_file),link=False) as (data_from,data_to):
    data_to.objects=[n for n in data_from.objects if n.startswith('Yardang mass') or n.startswith('Distant caravan camel')]
templates={obj.name:obj for obj in data_to.objects}
source_specs=None
tree=ast.parse((ROOT/'scripts/build-environment-landscape-study-v001.py').read_text())
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ROCKS' for t in node.targets):source_specs=ast.literal_eval(node.value)
assert source_specs
rocks=[];rock_reports=[]
for cfg in layout['rocks']:
    original=templates[f'Yardang mass {cfg["template"]:02}'];old=original.data.vertices
    ox,oy,rx,ry,oh,seed=source_specs[cfg['template']-1]
    old_base=sum(old[20*80+k].co.z for k in range(80))/80-oh*15/48
    cx,cy=cfg['x'],-cfg['z'];base=height(cx,cy)
    cosine,sine=math.cos(cfg['yaw']),math.sin(cfg['yaw'])
    count=48
    def remap(p):
        xx=(p.x-ox)*cfg['radiusX']/rx;yy=(p.y-oy)*cfg['radiusZ']/ry
        return Vector((cx+xx*cosine-yy*sine,cy+xx*sine+yy*cosine,base+(p.z-old_base)*cfg['height']/oh))
    # Preserve every second upper ring of the approved sculpt; low-frequency silhouette stays intact.
    upper=[]
    for ring in [*range(20,53,2),53]:
        upper.append([remap(old[ring*80+round(k*80/count)%80].co) for k in range(count)])
    anchors=upper[0];center=sum(anchors,Vector())/count;feet=[]
    for k,a in enumerate(anchors):
        direction=Vector((a.x-center.x,a.y-center.y,0)).normalized()
        extension=max(2,cfg['height']*.14)
        for _ in range(8):
            foot=a+direction*extension;foot.z=height(foot.x,foot.y)-.6
            extension=.35*extension+.65*max(2,(a.z-foot.z)*.85)
        foot=a+direction*extension;foot.z=height(foot.x,foot.y)-.6;feet.append(foot)
    # A long contour edge can cross a grid diagonal below its two endpoint samples.
    # Bury only the relevant toe endpoints until the complete edge stays beneath sand.
    for _ in range(4):
        corrections=[0.0]*count
        for k in range(count):
            nxt=(k+1)%count
            gap=max((p.z-height(p.x,p.y) for p in (feet[k].lerp(feet[nxt],j/16) for j in range(17))))
            if gap>-.12:corrections[k]=max(corrections[k],gap+.16);corrections[nxt]=max(corrections[nxt],gap+.16)
        for foot,correction in zip(feet,corrections):foot.z-=correction
    verts=[];faces=[];lower_rings=12
    for ring in range(lower_rings):
        f=1-ring/lower_rings
        for k,(a,foot) in enumerate(zip(anchors,feet)):
            p=a.lerp(foot,.28*f+.72*f*f);p.z=a.z+(foot.z-a.z)*f
            verts.append(tuple(p))
    for ring in upper:verts.extend(tuple(v) for v in ring)
    ring_count=lower_rings+len(upper)
    for ring in range(ring_count-1):
        for k in range(count):faces.append((ring*count+k,ring*count+(k+1)%count,(ring+1)*count+(k+1)%count,(ring+1)*count+k))
    faces.append(tuple((ring_count-1)*count+k for k in range(count)))
    center=sum(feet,Vector())/count;center.z=min(-30,min(p.z for p in feet)-15);bottom=len(verts);verts.append(tuple(center))
    for k in range(count):faces.append((bottom,(k+1)%count,k))
    obj=mesh('yardang-'+cfg['id'],verts,faces)
    obj.data.materials.append(original.data.materials[0])
    b=[(min(v[i] for v in verts),max(v[i] for v in verts)) for i in range(3)]
    world_bounds={'min':[b[0][0],b[2][0],-b[1][1]],'max':[b[0][1],b[2][1],-b[1][0]]}
    outside=(world_bounds['min'][0]>=445 or world_bounds['max'][0]<=-90 or world_bounds['min'][2]>=200 or world_bounds['max'][2]<=-140)
    assert outside,(cfg['id'],world_bounds)
    rim=[];lower=[]
    for k in range(count):
        a,bp=Vector(verts[k]),Vector(verts[(k+1)%count])
        for j in range(17):
            p=a.lerp(bp,j/16);rim.append(p.z-height(p.x,p.y))
    for ring in range(1,lower_rings):
        for k in range(count):
            p=Vector(verts[ring*count+k]);hit,q,normal,index=obj.ray_cast(Vector((p.x,p.y,-200)),Vector((0,0,1)))
            if hit:lower.append(q.z-height(q.x,q.y))
    full=[]
    for foot in feet:
        for step in range(1,9):
            p=center.lerp(foot,step/8*.999);hit,q,normal,index=obj.ray_cast(Vector((p.x,p.y,-200)),Vector((0,0,1)))
            if hit:full.append(q.z-height(q.x,q.y))
    edge_uses={}
    for face in faces:
        for i,a in enumerate(face):
            edge=tuple(sorted((a,face[(i+1)%len(face)])));edge_uses[edge]=edge_uses.get(edge,0)+1
    assert all(n==2 for n in edge_uses.values())
    assert max(rim)<-.03 and max(lower)<-.03 and max(full)<-.03,(cfg['id'],max(rim),max(lower),max(full))
    rock_reports.append({'id':cfg['id'],'bounds':world_bounds,'closedSolid':True,'fullFoundationSamples':len(full),'maximumFoundationClearance':max(full),'maximumRimClearance':max(rim),'maximumLowLayerUndersideClearance':max(lower),'visibleHeight':cfg['height']})
    rocks.append(obj)

# One shared atlas stores procedural source colour/normal as ordinary exportable PBR.
bpy.ops.object.select_all(action='DESELECT')
for obj in rocks:obj.select_set(True)
bpy.context.view_layer.objects.active=rocks[0];bpy.ops.object.join();rock_mesh=rocks[0]
rock_mesh.name='environment-yardang-clusters-v001'
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.1,island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
rockmat=rock_mesh.data.materials[0];rockmat.use_nodes=True
rock_images={}
scene.cycles.bake_type='DIFFUSE';scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True;scene.render.bake.margin=8
for kind in ['base-color','normal']:
    image=bpy.data.images.new('environment-rock-'+kind,1024,1024,alpha=False)
    if kind=='normal':image.colorspace_settings.name='Non-Color'
    node=rockmat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;rockmat.node_tree.nodes.active=node
    bpy.ops.object.bake(type='DIFFUSE' if kind=='base-color' else 'NORMAL')
    image.filepath_raw=str(OUT/f'rock-{kind}.png');image.file_format='PNG';image.save();rock_images[kind]=image
mat=standard('Environment sandstone baked PBR',(.55,.4,.25));nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes['Principled BSDF']
for kind,image in rock_images.items():
    node=nodes.new('ShaderNodeTexImage');node.image=image
    if kind=='base-color':links.new(node.outputs['Color'],shader.inputs['Base Color'])
    else:
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;links.new(node.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
rock_mesh.data.materials.clear();rock_mesh.data.materials.append(mat)

# Seven far-view poses are simplified from the user's animated model, no new camel artwork.
camels=[];camel_reports=[]
for i,(point,target_height) in enumerate(zip(layout['caravan']['points'],layout['caravan']['heights'])):
    original=templates[f'Distant caravan camel {i+1:02}'];data=original.data.copy()
    obj=bpy.data.objects.new(f'caravan-camel-{i+1:02}',data);scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Far silhouette detail budget','DECIMATE');modifier.ratio=.22;bpy.ops.object.modifier_apply(modifier=modifier.name)
    x,z=point['x'],point['z'];heading=math.atan2(-.0704*math.cos((x-205)*.032),1)
    obj.rotation_euler.z=math.pi/2+heading;obj.location=(x,-z,height(x,-z))
    bpy.context.view_layer.update()
    feet=[v.co for v in obj.data.vertices if v.co.z<target_height*.18]
    gaps=[(obj.matrix_world@p).z-height((obj.matrix_world@p).x,(obj.matrix_world@p).y) for p in feet]
    obj.location.z+=.012-min(gaps);bpy.context.view_layer.update()
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    assert min(-p.y for p in points)>=200
    obj.data.calc_loop_triangles()
    camel_reports.append({'id':obj.name,'position':[obj.location.x,obj.location.z,-obj.location.y],'height':target_height,'triangles':len(obj.data.loop_triangles),'bakedWalkFrame':layout['caravan']['frames'][i]})
    camels.append(obj)
assert sum(r['triangles'] for r in camel_reports)<=60000
camel_mat=camels[0].data.materials[0]
camel_shader=next(n for n in camel_mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
# At 200m these microstructure maps cannot contribute visible detail; retain source albedo.
for socket in ['Normal','Roughness','Metallic']:
    for link in list(camel_shader.inputs[socket].links):camel_mat.node_tree.links.remove(link)
camel_shader.inputs['Roughness'].default_value=.9;camel_shader.inputs['Metallic'].default_value=0
for node in camel_mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
        image=node.image
        if max(image.size)>1024:
            scale=1024/max(image.size);image.scale(round(image.size[0]*scale),round(image.size[1]*scale))
        image.pack()

# A slack lead rope attaches to local neck and rear points after heading rotation.
rope_mat=standard('Dark flax tether',(.08,.045,.02));ropes=[]
for i in range(6):
    trailing,leading=camels[i],camels[i+1]
    ht=layout['caravan']['heights'][i];hl=layout['caravan']['heights'][i+1]
    start=trailing.matrix_world@Vector((0,-.85,ht*.7));end=leading.matrix_world@Vector((0,.72,hl*.6))
    curve=bpy.data.curves.new('caravan-lead-rope','CURVE');curve.dimensions='3D';curve.resolution_u=6;curve.bevel_depth=.014;curve.bevel_resolution=0
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
    for p,v in zip(spline.bezier_points,[start,(start+end)/2+Vector((0,0,-.35)),end]):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(f'caravan-tether-{i+1}',curve);scene.collection.objects.link(obj);curve.materials.append(rope_mat);ropes.append(obj)

# Actual skyline validation at three accepted route positions, 1.8m player eyes.
environment_vertices=list(terrain_vertices);environment_triangles=list(terrain_triangles)
offset=len(environment_vertices);rock_mesh.data.calc_loop_triangles()
environment_vertices.extend(tuple(rock_mesh.matrix_world@v.co) for v in rock_mesh.data.vertices)
environment_triangles.extend(tuple(offset+i for i in t.vertices) for t in rock_mesh.data.loop_triangles)
environment_bvh=BVHTree.FromPolygons(environment_vertices,environment_triangles,all_triangles=True)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.lens=34;camera.data.clip_end=4000
scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
target=Vector((205,-237,height(205,-237)+1.4));sky_reports=[]
for view in layout['caravan']['viewpoints']:
    camera.location=(view['x'],-view['z'],view['y']);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
    reports=[]
    for obj in camels:
        world=[obj.matrix_world@v.co for v in obj.data.vertices];projected=[(world_to_camera_view(scene,camera,p),p) for p in world]
        minx=min(q.x for q,p in projected);maxx=max(q.x for q,p in projected);bins={}
        for q,p in projected:
            col=min(23,int((q.x-minx)/(maxx-minx)*24))
            if col not in bins or q.y>bins[col][0].y:bins[col]=(q,p)
        checks=[]
        for q,p in bins.values():
            if p.z<obj.location.z+1.45:continue
            direction=(p-camera.location).normalized();distance=(p-camera.location).length
            front=environment_bvh.ray_cast(camera.location,direction,distance-.02)[0]
            back=environment_bvh.ray_cast(p+direction*.12,direction,4000)[0]
            checks.append(front is None and back is None and 0<=q.x<=1 and 0<=q.y<=1 and q.z>0)
        reports.append({'id':obj.name,'samples':len(checks),'clearSky':all(checks),'distance':(obj.location-camera.location).length})
    sky_reports.append({'view':view['id'],'camels':reports})
assert all(c['clearSky'] and c['samples']>5 for view in sky_reports for c in view['camels']),sky_reports

world=bpy.data.worlds.new('Fixed pale blue fill');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.7,.85,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='Fixed northwest 315 altitude30';sun.rotation_euler=(-Vector((-.6123724357,.6123724357,.5))).to_track_quat('-Z','Y').to_euler();sun.data.energy=3.2;sun.data.angle=math.radians(1.3);sun.data.color=(1,.88,.7)

def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    image_options={'export_image_format':'JPEG','export_jpeg_quality':88} if name=='caravan.glb' else {}
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_apply=True,export_extras=True,**image_options)
export('rocks.glb',[rock_mesh]);export('caravan.glb',camels+ropes)
rock_mesh.data.calc_loop_triangles()
report={'status':'Approved v002 shapes integrated outside accepted gameplay bounds','layoutHash':layout['layoutHash'],'protectedHeightSamples':layout['protectedSamples'],
 'coordinates':'GLB actual world coordinates, Y up; Blender X,-Z,Y conversion','groundContact':'Raycast against exact Float32 runtime triangle mesh',
 'rocks':rock_reports,'rockTriangles':len(rock_mesh.data.loop_triangles),'camels':camel_reports,'skylineViews':sky_reports,
 'textures':'1024px baked rock base colour/normal; camel1024px JPEG88 albedo, distant roughness=.9, metallic=0, omitted invisible micro-normal map','sun':{'azimuth':315,'altitude':30},
 'sourceBlend':'art-source/world/models/environment-study/v002/caravan.blend',
 'assets':{name:{'bytes':(OUT/name).stat().st_size,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in ['rocks.glb','caravan.glb']}}
(SOURCE/'export-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'environment-world.blend'))
if '--no-preview' not in sys.argv:
    scene.render.filepath=str(WORK/'environment-world-v001-caravan.png');bpy.ops.render.render(write_still=True)
print(json.dumps({'rockTriangles':report['rockTriangles'],'camelTriangles':sum(r['triangles'] for r in camel_reports),'assets':report['assets'],'skylineViews':[{ 'view':v['view'],'allClear':all(c['clearSky'] for c in v['camels'])} for v in sky_reports]}))
