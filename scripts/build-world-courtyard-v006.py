"""Incremental usable workshop and flush courtyard plinth, preserving v005.
blender -b --python scripts/build-world-courtyard-v006.py [-- --skip-render]
"""
import argparse, ast, hashlib, json, math, shutil, struct, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/courtyard/v006'
OUTPUT=ROOT/'public/assets/world/courtyard/v006'
WORK=ROOT/'work/world'
LAYOUT=ROOT/'src/content/world/courtyard-hall-v006.json'
SHRUBS=ROOT/'public/assets/world/workshop-shrubs/v001/workshop-shrubs.glb'
parser=argparse.ArgumentParser();parser.add_argument('--skip-render',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
for folder in (SOURCE,OUTPUT,WORK):folder.mkdir(parents=True,exist_ok=True)
for filename in ['hall-lotus-wide.jpg','hall-banner.jpg','hall-floral-border.jpg','display-board-art.jpg','entrance-lotus-wide.jpg']:
    if not (OUTPUT/filename).exists():shutil.copyfile(ROOT/'public/assets/world/courtyard/v005'/filename,OUTPUT/filename)
old_files=[ROOT/f'{base}/courtyard/v{version}/courtyard.{ext}' for version in ('004','005') for base,ext in [('art-source/world/models','blend'),('public/assets/world','glb')]]
old_files += [ROOT/'src/content/world/courtyard-hall-v005.json',ROOT/'src/content/world/courtyard-props.json',SHRUBS]
old_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in old_files}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/courtyard/v005/courtyard.blend'))
for filename,names in [('build-world-courtyard.py',{'point','box','mesh'}),('build-world-courtyard-v005.py',{'prism'})]:
    tree=ast.parse((ROOT/'scripts'/filename).read_text())
    exec(compile(ast.Module(body=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in names],type_ignores=[]),'<pure-geometry>','exec'))
M={'wood':bpy.data.materials['warm-carved-wood'],'cream':bpy.data.materials['linen'],'stone':bpy.data.materials['warm-limestone'],'ground':bpy.data.materials['paving-sand']}
CURRENT_BATCH=None;ROLE='solid';PLAYER=False;new_objects=[]
def assign(obj,name,material):
    obj.name=name;obj.data.materials.append(M[material] if isinstance(material,str) else material)
    obj['semanticGroup']=CURRENT_BATCH or name;obj['cameraRole']=ROLE;obj['playerRole']='solid' if PLAYER else 'none';new_objects.append(obj);return obj

def source_point(p):return Vector((p.x-12,p.z,2-p.y))
def actual_bounds(objects):
    pts=[source_point(o.matrix_world@v.co) for o in objects for v in o.data.vertices]
    return {'min':[round(min(p[i] for p in pts),6) for i in range(3)],'max':[round(max(p[i] for p in pts),6) for i in range(3)]}
def find_group(prefix):return [o for o in bpy.context.scene.objects if o.type=='MESH' and str(o.get('semanticGroup',o.name)).startswith(prefix)]
def rigid(objects,old,target,yaw):
    matrix=Matrix.Translation(Vector(point(target[0],0,target[1])))@Matrix.Rotation(yaw,4,'Z')@Matrix.Translation(-Vector(point(old[0],0,old[1])))
    for obj in objects:obj.matrix_world=matrix@obj.matrix_world

def set_source_vertex(obj,vertex,p):vertex.co=obj.matrix_world.inverted()@Vector(point(*p))
def components(obj):
    adjacency=[[] for _ in obj.data.vertices]
    for edge in obj.data.edges:
        a,b=edge.vertices;adjacency[a].append(b);adjacency[b].append(a)
    unseen=set(range(len(adjacency)));result=[]
    while unseen:
        seed=unseen.pop();found=[seed];todo=[seed]
        while todo:
            for other in adjacency[todo.pop()]:
                if other in unseen:unseen.remove(other);found.append(other);todo.append(other)
        result.append(found)
    return result

# Fix the visible 2 cm upward shelf without replacing it with coincident faces:
# stone and plaster now meet at y=.5; the wall body's bottom rises accordingly.
changed_walls=[]
for obj in bpy.context.scene.objects:
    group=str(obj.get('semanticGroup',obj.name))
    if obj.type=='MESH' and group in ('courtyard-side-wall','courtyard-side-wall-001','entrance-wing','entrance-wing-001'):
        for v in obj.data.vertices:
            p=source_point(obj.matrix_world@v.co);p.y=.5+p.y*(2.2/2.7);set_source_vertex(obj,v,p)
        obj.data.update();changed_walls.append(group)
if len(changed_walls)!=4:raise RuntimeError('Expected four retained wall body pieces')
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and str(obj.get('semanticGroup',obj.name)).startswith(('courtyard-v005-side-plinth','courtyard-v005-wing-plinth')):bpy.data.objects.remove(obj,do_unlink=True)
plinth_sections=[]
for side in ('west','east'):
    mirror=(lambda x:x) if side=='west' else (lambda x:-24-x)
    for part,poly in [('side',[(-24.3,-24),(-23.7,-24),(-23.7,1.7),(-24.3,2.3)]),('wing',[(-24.3,2.3),(-23.7,1.7),(-15,1.7),(-15,2.3)])]:
        poly=[(mirror(x),z) for x,z in poly];name=f'courtyard-v005-{part}-plinth-{side}'
        prism(name,poly,0,.5,'stone');plinth_sections.append({'id':name,'polygon':poly,'minY':0,'maxY':.5})

# The table is one accepted semantic mesh. Identify its disconnected solids by
# measured source-space bounds so bowls, brushes and their existing UVs survive.
table=find_group('hall-v003-workbench')
if len(table)!=1:raise RuntimeError('Expected one merged accepted workbench')
table=table[0];bpy.context.view_layer.update();remove_vertices=[];leg_bounds=[];paper_count=0;brush_count=0;bowl_parts=0
bowl_old=[-20,-19.44,-18.88,-18.32]
bowl_new=[(-20.15,-2.95),(-19.65,-3.14),(-20.10,-2.40),(-18.10,-3.13)]
for ids in components(table):
    pts=[source_point(table.matrix_world@table.data.vertices[i].co) for i in ids]
    lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)));hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)));center=(lo+hi)/2;size=hi-lo
    if abs(center.y-.32)<1e-5 and size.x>2.7 and size.z<.16:
        remove_vertices.extend(ids);continue
    if abs(lo.y)<1e-6 and abs(hi.y-.9)<1e-6 and abs(size.x-.16)<1e-5:leg_bounds.append({'min':list(lo),'max':list(hi)})
    if .54<size.x<.56 and .57<size.z<.59 and abs(center.y-1.04)<1e-5:
        for i,p in zip(ids,pts):set_source_vertex(table,table.data.vertices[i],Vector((-18.85+(p.x-center.x)*(.96/.55),1.036+(p.y-center.y)*.15,-2.46+(p.z-center.z)*1.1)))
        paper_count+=1;continue
    if lo.y>=1.06 and hi.y<1.13 and .40<size.z<.48 and size.x<.04:
        j=round((center.x+18.12)/.09);targets=[(-18.38,-2.53),(-18.08,-2.52),(-17.90,-2.58)];tx,tz=targets[max(0,min(2,j))];angle=math.radians(-22);c,s=math.cos(angle),math.sin(angle)
        for i,p in zip(ids,pts):
            dx,dz=p.x-center.x,p.z-center.z;set_source_vertex(table,table.data.vertices[i],Vector((tx+c*dx+s*dz,p.y-(.025 if j==0 else .032),tz-s*dx+c*dz)))
        brush_count+=1;continue
    if lo.y>=1.039 and hi.y<=1.201 and abs(center.z+2.68)<.02 and size.x<.45:
        j=min(range(4),key=lambda k:abs(center.x-bowl_old[k]));tx,tz=bowl_new[j]
        for i,p in zip(ids,pts):set_source_vertex(table,table.data.vertices[i],p+Vector((tx-bowl_old[j],0,tz+2.68)))
        bowl_parts+=1
if len(leg_bounds)!=4 or paper_count!=1 or brush_count!=3 or not remove_vertices:raise RuntimeError(f'Workbench component identification failed: {len(leg_bounds)=} {paper_count=} {brush_count=} {len(remove_vertices)=}')
bm=bmesh.new();bm.from_mesh(table.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove_vertices],context='VERTS');bm.to_mesh(table.data);bm.free();table.data.update()
CURRENT_BATCH='hall-v003-workbench';PLAYER=True
# Side braces terminate exactly at leg inner faces; center brace terminates at
# their inner X faces. Every contact has positive area and no visible overlap.
for x in (-20.3,-17.7):box('workbench-cross-brace',x,.32,-2.8,.16,.13,.84,'wood')
box('workbench-center-brace',-19,.32,-2.8,2.44,.13,.15,'wood')
brace_objects=new_objects[-3:]
CURRENT_BATCH=None;PLAYER=False;ROLE='decoration'
art=bpy.data.materials['hall-v003-pattern-display-art'];w=.62;h=w*214/248;px,pz=-18.92,-2.46
paper_art=mesh('hall-v003-workshop-paper-art',[(px-w/2,1.041,pz+h/2),(px+w/2,1.041,pz+h/2),(px+w/2,1.041,pz-h/2),(px-w/2,1.041,pz-h/2)],[(0,1,2,3)],art)
uv=paper_art.data.uv_layers.new(name='UVMap')
for i,pair in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=pair
ROLE='solid'
table_yaw=math.radians(10);table_center=(-19,-3.45)
rigid([table,*brace_objects,paper_art],(-19,-2.8),table_center,table_yaw)
rigid(find_group('hall-v003-pattern-display'),(-1.3,-2.5),(-20.7,.35),math.radians(210))
rigid(find_group('hall-v003-pigment-rack'),(-.9,-4.55),(-23.05,-1.85),math.pi)

# User's entire three-bush model keeps all original relative cluster positions.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(SHRUBS));bpy.context.view_layer.update()
shrubs=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];mat=Matrix.Translation(Vector(point(-22.65,0,.55)));matrices={o:mat@o.matrix_world.copy() for o in shrubs}
for i,o in enumerate(shrubs):
    o.parent=None;o.matrix_world=matrices[o];o.name=f'hall-v003-workshop-shrubs-{i}';o['semanticGroup']='hall-v003-workshop-shrubs';o['cameraRole']='solid';o['playerRole']='solid'
bpy.context.view_layer.update()

# Join only each semantic assembly. Every distinct furniture piece stays
# independently movable/collidable, and its rotated footprint remains exact.
for name,objects in [('hall-v003-workbench',[table,*brace_objects]),('hall-v003-workshop-shrubs',shrubs)]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;o['semanticGroup']=name
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.context.view_layer.update()
layout=json.loads((ROOT/'src/content/world/courtyard-hall-v005.json').read_text());layout['version']='v006';layout['status']='measured-export'
ids={'hall-v003-workbench','hall-v003-pattern-display','hall-v003-pigment-rack','hall-v003-workshop-shrubs'}
changed_ids=ids|{p['id'] for p in plinth_sections}
for key in ['cameraBoxes','collisionBoxes','playerSolids']:layout[key]=[b for b in layout[key] if b['id'] not in changed_ids]
measured={}
for group in changed_ids:
    objects=find_group(group);objects=[o for o in objects if o.get('cameraRole')=='solid'];b=actual_bounds(objects);measured[group]=b;layout['cameraBoxes'].append(dict(id=group,**b))
    if group in ids:
        layout['collisionBoxes'].append(dict(id=group,**b));layout['playerSolids'].append({'id':group,'minX':b['min'][0],'maxX':b['max'][0],'minZ':b['min'][2],'maxZ':b['max'][2],'height':b['max'][1]})
# Explicit padding survives polygon precedence in movement.ts. AABB expansion
# alone would not pad a polygon; do not double-shrink the usable workstation.
def rectangle_polygon(cx,cz,hx,hz,yaw):
    c,s=math.cos(yaw),math.sin(yaw);return [[cx+c*x+s*z,cz-s*x+c*z] for x,z in [(-hx,-hz),(hx,-hz),(hx,hz),(-hx,hz)]]
polygons={'hall-v003-workbench':rectangle_polygon(-19,-3.45,1.65,.7,table_yaw),
          'hall-v003-pattern-display':rectangle_polygon(-20.7,.35,.2,.525,math.radians(210)),
          'hall-v003-pigment-rack':rectangle_polygon(-23.05,-1.85,.257106,.72457,0)}
for b in layout['playerSolids']:
    if b['id'] in polygons:b['polygon']=polygons[b['id']];b['padding']=.21
layout['workbench']['target']={'x':-19,'z':-3.45};layout['workbench']['yaw']=table_yaw;layout['workbench']['bounds']=measured['hall-v003-workbench']
layout['display'].update({'x':-20.7,'z':.35,'facing':'toward-workstation','facingYaw':math.radians(120),'bounds':measured['hall-v003-pattern-display']})
layout['pigmentRack'].update({'x':-23.05,'z':-1.85,'facing':'+x','facingYaw':math.pi/2,'bounds':measured['hall-v003-pigment-rack']})
layout['workshopShrubs']={'id':'hall-v003-workshop-shrubs','x':-22.65,'z':.55,'height':.85,'bounds':measured['hall-v003-workshop-shrubs'],'sourceAsset':'workshop-shrubs/v001/workshop-shrubs.glb','sourceSha256':hashlib.sha256(SHRUBS.read_bytes()).hexdigest()}
layout['perimeterRepair']['sections']=[s for s in layout['perimeterRepair']['sections'] if 'plinth' not in s['id']]+plinth_sections
layout['perimeterRepair'].update({'wallBodyBottom':.5,'plinthHalfWidth':.30,'noInteriorTopShelf':True})
point_dict=lambda x,z:{'x':x,'z':z}
layout['workshop']={'stand':point_dict(-18.9,-1.3),'paintPoint':point_dict(-18.9,-1.3),'takeColorPoint':point_dict(-21.8,-1.85),'referencePoint':point_dict(-19.4,-.3),
                   'accessPath':[point_dict(x,z) for x,z in [(-15.8,.1),(-17,-.3),(-18.2,-.6),(-18.9,-1.3)]],
                   'takeColorPath':[point_dict(x,z) for x,z in [(-18.9,-1.3),(-20.3,-1.3),(-21.8,-1.3),(-21.8,-1.85)]],
                   'referencePath':[point_dict(x,z) for x,z in [(-18.9,-1.3),(-19.4,-.3)]],
                   'tableLegContact':{'oldMinY':min(b['min'][1] for b in leg_bounds),'newMinY':measured['hall-v003-workbench']['min'][1],'pavingTop':.003},
                   'braceConnections':{'crossSpan':.84,'centerSpan':2.44,'legSpanX':2.6,'legSpanZ':1.0,'legThickness':.16,'contact':'shared boundary faces'},
                   'paper':{'id':'hall-v003-workshop-paper-art','width':.96,'depth':.638,'image':'display-board-art.jpg','patternWidth':.62,'patternHeight':.62*214/248},
                   'validation':'pending-production-rule-verification'}
LAYOUT.write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n')
scene=bpy.context.scene;bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'courtyard.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'courtyard.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True,export_image_format='JPEG',export_jpeg_quality=92)
raw=(OUTPUT/'courtyard.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length])
manifest={'version':'v006','status':'measured export; awaiting visual acceptance','worldOrigin':[-12,0,2],'units':'metres','upAxis':'Y','model':'courtyard.glb','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
          'triangles':sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives']),'meshCount':len(gltf['meshes']),'materials':len(gltf['materials']),
          'workshop':layout['workshop'],'display':layout['display'],'pigmentRack':layout['pigmentRack'],'workshopShrubs':layout['workshopShrubs'],'wallBodyBottom':.5,'plinthHalfWidth':.30,
          'oldSourceHashes':old_hashes,'geometryLayout':str(LAYOUT.relative_to(ROOT)),'cameraBoxCount':len(layout['cameraBoxes']),'playerSolidCount':len(layout['playerSolids']),
          'unchanged':'All approved hall geometry, caisson, wall art, curtains and unrelated props remain unchanged.'}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for p in old_files:
    if hashlib.sha256(p.read_bytes()).hexdigest()!=old_hashes[str(p.relative_to(ROOT))]:raise RuntimeError('Prior source asset changed')
print('COURTYARD_V006_EXPORT',json.dumps({k:manifest[k] for k in ['bytes','triangles','meshCount','cameraBoxCount','playerSolidCount']}),flush=True)
if args.skip_render:sys.exit(0)
# Preview-only expansion. Never save these placed transforms back to the asset.
for obj in scene.objects:
    if obj.type!='MESH':continue
    name=str(obj.get('semanticGroup',obj.name));b=actual_bounds([obj]);center=(b['min'][0]+b['max'][0])/2;side=-1 if center<-12 else 1;sx,offset=1,0
    if name.startswith(('courtyard-side-wall','courtyard-side-art','courtyard-wall-')):offset=side*2
    elif name=='courtyard-ground':sx=23.7/19.7
    elif name.startswith('entrance-wing-coping'):sx=9.2/7.2;offset=(side*2.9)*(1-sx)
    elif name.startswith(('entrance-wing','entrance-stone-base')):sx=9/7;offset=(side*3)*(1-sx)
    elif name.startswith('wall-painted-border'):sx=8.5/6.5;offset=(side*3.25)*(1-sx)
    elif name.startswith(('entrance-inner-art','entrance-outer-art')):offset=(center-(-15 if side<0 else -9))*2/7
    elif name in ['pot-west-front','pot-west-workshop']:offset=-2
    elif name=='pot-east-hall':offset=2
    if sx!=1 or offset:obj.scale.x*=sx;obj.location.x=obj.location.x*sx+offset
    if name.startswith(('tree-','shrub-','road-grass','caisson-')):obj.hide_render=True
box('preview-only-ground',-12,-.12,-10,120,.12,120,'ground')
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=820;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
cam=scene.camera
for name,eye,target,lens in [('workshop',(-15.3,3.6,.8),(-21.0,.72,-1.6),29),('operator',(-17.7,2.0,.3),(-21.0,.80,-2.0),29),('table-contact',(-17.1,.55,-.75),(-19.3,.35,-3.35),33)]:
    cam.location=point(*eye);cam.rotation_euler=(Vector(point(*target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;scene.render.filepath=str(WORK/f'courtyard-v006-{name}.png');bpy.ops.render.render(write_still=True);print('COURTYARD_V006_RENDER',name,flush=True)
