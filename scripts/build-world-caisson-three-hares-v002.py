"""Build the independent recessed caisson in Blender XY/+Z, export glTF Y-up.

Only original reference pixels are used: small UV windows for painted timbers,
and the complete supplied three-hares image on an independently named panel.
Run Blender -b --python this-file [-- --skip-render].
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/caisson-three-hares/v002'
REFERENCES = ROOT / 'art-source/world/caisson-three-hares/v001'
OUTPUT = ROOT / 'public/assets/world/caisson-three-hares/v002'
WORK = ROOT / 'work/world'
CONFIG = json.loads((ROOT / 'src/content/world/caisson-three-hares-v002.json').read_text())
parser = argparse.ArgumentParser()
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for folder in [SOURCE, OUTPUT, WORK]: folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
model = bpy.data.collections.new('Three hares recessed caisson — metres')
scene.collection.children.link(model)
objects = []
camera_boxes = []
slat_end_checks = []
frame_topology = []

def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, color, image=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    shader = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    out = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'], out.inputs['Surface'])
    rgb = tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))
    shader.inputs['Base Color'].default_value = (*rgb,1)
    shader.inputs['Roughness'].default_value = .86
    if image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        tex.interpolation='Linear';tex.extension='EXTEND'
        mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    mat.diffuse_color=(*rgb,1);mat.use_backface_culling=False
    return mat

concept = bpy.data.images.load(str(REFERENCES/'绘彩馆立体藻井.png'));concept.pack()
center_image = bpy.data.images.load(str(OUTPUT/'three-hares-center.jpg'));center_image.pack()
M = {
    'wood':material('caisson-warm-vermilion','9f3d24'),
    'red':material('caisson-cinnabar-slats','b54627'),
    'red-light':material('caisson-light-cinnabar','c15b35'),
    'green':material('caisson-malachite-slats','397b62'),
    'green-light':material('caisson-light-malachite','4e8c70'),
    'back':material('caisson-recess-wood','653623'),
    'gold':material('caisson-warm-ochre-moulding','bd8b44'),
    'blue':material('caisson-mineral-blue','3d6d80'),
    'cream':material('caisson-ivory-inlay','dfc58b'),
    'paint':material('caisson-reference-painted-beams','ffffff',concept),
    'center':material(CONFIG['centerPanel']['materialId'],'ffffff',center_image),
}

UV_RECTS = {
    'green-beam':(268,177,988,229),
    'blue-beam':(378,322,876,365),
    'corner':(192,180,248,232),
    'border':(446,432,801,458),
}

def image_uv(rect):
    x0,y0,x1,y1=rect;w,h=concept.size
    return [(x0/w,1-y1/h),(x1/w,1-y1/h),(x1/w,1-y0/h),(x0/w,1-y0/h)]

def obj_mesh(name, vertices, faces, mats, face_uv=None, group=None, collider=False):
    mesh=bpy.data.meshes.new(name+'-geometry');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);model.objects.link(obj);objects.append(obj)
    obj['semanticGroup']=group or name;obj['assetId']='three-hares-caisson-v002';obj['cameraRole']='solid' if collider else 'decoration'
    for mat in mats:mesh.materials.append(mat)
    if face_uv:
        uv=mesh.uv_layers.new(name='Original-reference-UV')
        for index,coords in face_uv.items():
            poly=mesh.polygons[index];poly.material_index=1 if len(mats)>1 else 0
            for loop,coord in zip(poly.loop_indices,coords):uv.data[loop].uv=coord
    if collider:
        pts=[(p[0],p[2],-p[1]) for p in vertices]
        camera_boxes.append({'id':name,'min':[round(min(p[i] for p in pts),6) for i in range(3)],'max':[round(max(p[i] for p in pts),6) for i in range(3)]})
    return obj

def prism(name, bottom, top, mat, painted=None, group=None, collider=False):
    n=len(bottom)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return obj_mesh(name,bottom+top,faces,[M[mat]]+([M['paint']] if painted else []),{0:image_uv(UV_RECTS[painted])} if painted else None,group,collider)

def polygon(width,cut=0):
    h=width/2
    if not cut:return [(-h,-h),(h,-h),(h,h),(-h,h)]
    return [(-h+cut,-h),(h-cut,-h),(h,-h+cut),(h,h-cut),(h-cut,h),(-h+cut,h),(-h,h-cut),(-h,-h+cut)]

def scale_poly(poly,factor):return [(x*factor,y*factor) for x,y in poly]

def ring(name,width,cut,beam_width,z,thickness,mat,painted=None,collider=False):
    outer=polygon(width,cut);inner=scale_poly(outer,(width-2*beam_width)/width)
    for i in range(len(outer)):
        j=(i+1)%len(outer);quad=[outer[i],outer[j],inner[j],inner[i]]
        prism(f'{name}-beam-{i:02}',[(x,y,z) for x,y in quad],[(x,y,z+thickness) for x,y in quad],mat,painted,name,collider)

def painted_frame(name,width,cut,bw,z,thickness,art):
    """One closed ring with genuine gold bevels, not intersecting trim rings.

    Its six profile loops share vertices. Every visible surface occurs once,
    including at mitred corners. The broad lower face retains the original UV.
    """
    outer=polygon(width,cut);n=len(outer)
    edge=.035;rise=.025
    profile=[(0,z+rise),(edge,z),(bw-edge,z),(bw,z+rise),(0,z+thickness),(bw,z+thickness)]
    vertices=[(x,y,height) for inset,height in profile for x,y in scale_poly(outer,(width-2*inset)/width)]
    faces=[];painted={};gold=[]
    for i in range(n):
        j=(i+1)%n
        def idx(loop,corner):return loop*n+corner
        # Outer side, top, inner side, outer bevel, decorated soffit, inner bevel.
        for loop_a,loop_b,down in [(0,4,False),(4,5,False),(3,5,True),(0,1,True),(1,2,True),(2,3,True)]:
            face=(idx(loop_a,i),idx(loop_a,j),idx(loop_b,j),idx(loop_b,i))
            faces.append(tuple(reversed(face)) if down else face)
        painted[len(faces)-2]=image_uv(UV_RECTS[art])
        gold.extend([len(faces)-3,len(faces)-1])
        # Unchanged conservative per-beam camera boxes; never fill the center.
        inner=scale_poly(outer,(width-2*bw)/width)
        pts=[(x,height,-y) for x,y in [outer[i],outer[j],inner[j],inner[i]] for height in [z,z+thickness]]
        camera_boxes.append({'id':f'{name}-beam-{i:02}','min':[round(min(p[k] for p in pts),6) for k in range(3)],'max':[round(max(p[k] for p in pts),6) for k in range(3)]})
    obj=obj_mesh(name,vertices,faces,[M['wood'],M['paint'],M['gold']],painted,name)
    obj['cameraRole']='solid'
    for f in gold:obj.data.polygons[f].material_index=2
    edges={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):
            key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
    assert all(count==2 for count in edges.values()),f'{name}: non-manifold profile'
    frame_topology.append({'id':name,'closedManifold':True,'duplicateFaces':len(faces)-len({tuple(sorted(f)) for f in faces}),'separateOverlaidTrimMeshes':0})

def polygon_clearance(poly,point):
    """Positive inside a convex CCW polygon; negative outside."""
    return min(((b[0]-a[0])*(point.y-a[1])-(b[1]-a[1])*(point.x-a[0]))/math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(poly,poly[1:]+poly[:1]))

def bury_slat_ends(a,b,width,depth,frames):
    # Keep the approved landing heights. Extending an almost vertical timber
    # along its slope could pierce the beam soffit at square/octagon corners.
    # Instead give each horizontal bearing a few extra centimetres and then
    # re-evaluate the actual four end corners using the final timber direction.
    origins=[a.copy(),b.copy()];centers=[a.copy(),b.copy()];extensions=[0,0]
    bearings=[Vector((a.x,a.y,0)).normalized(),-Vector((b.x,b.y,0)).normalized()]
    polygons=[(polygon(f['width'],f['cut']),polygon(f['width']-2*f['beamWidth'],f['cut']*(f['width']-2*f['beamWidth'])/f['width'])) for f in frames]
    for step in range(81):
        direction=(centers[1]-centers[0]).normalized()
        across=Vector((0,0,1)).cross(direction).normalized();normal=direction.cross(across).normalized()
        checks=[]
        for center,frame,(outer,inner) in zip(centers,frames,polygons):
            corners=[center+across*(x*width/2)+normal*(y*depth/2) for x in [-1,1] for y in [-1,1]]
            checks.append(min(min(polygon_clearance(outer,p),-polygon_clearance(inner,p),p.z-frame['bottom'],frame['bottom']+frame['thickness']-p.z) for p in corners))
        if min(checks)>=.005:
            slat_end_checks.extend({'extension':round(e,4),'minimumBurial':round(c,6)} for e,c in zip(extensions,checks))
            return centers
        for i,clearance in enumerate(checks):
            if clearance<.005:
                extensions[i]+=.005;centers[i]=origins[i]+bearings[i]*extensions[i]
    raise ValueError(f'Slat ends cannot be buried: {origins}')

def ray_boundary(poly,angle):
    dx,dy=math.cos(angle),math.sin(angle)
    for a,b in zip(poly,poly[1:]+poly[:1]):
        ex,ey=b[0]-a[0],b[1]-a[1];den=dx*ey-dy*ex
        if abs(den)<1e-10:continue
        t=(a[0]*ey-a[1]*ex)/den;s=(a[0]*dy-a[1]*dx)/den
        if t>0 and -.000001<=s<=1.000001:return Vector((t*dx,t*dy,0))
    raise ValueError('No polygon ray hit')

def timber(name,a,b,width,depth,mat,painted=None,group=None,collider=False):
    a,b=Vector(a),Vector(b);direction=(b-a).normalized()
    across=Vector((0,0,1)).cross(direction).normalized();normal=direction.cross(across).normalized()
    bottom=[a-across*width/2-normal*depth/2,b-across*width/2-normal*depth/2,b+across*width/2-normal*depth/2,a+across*width/2-normal*depth/2]
    top=[p+normal*depth for p in bottom]
    return prism(name,[tuple(p) for p in bottom],[tuple(p) for p in top],mat,painted,group,collider)

# Five genuine open rings. No closed horizontal mesh spans their centers.
for index,level in enumerate(CONFIG['levels']):
    name=f'three-hares-caisson-frame-{index+1}'
    width,cut,bw,z,t=[level[k] for k in ['width','cut','beamWidth','bottom','thickness']]
    art='green-beam' if index%2==0 else 'blue-beam'
    painted_frame(name,width,cut,bw,z,t,art)
    points=polygon(width-bw,cut*(width-bw)/width)
    for corner,(x,y) in enumerate(points if index else []):
        size=min(.43,bw*.8);low=z if index==0 else z-.015
        q=[(x-size/2,y-size/2),(x+size/2,y-size/2),(x+size/2,y+size/2),(x-size/2,y+size/2)]
        prism(f'{name}-joint-{corner:02}',[(a,b,low) for a,b in q],[(a,b,low+.09) for a,b in q],'blue','corner',name+'-joints')

# Continuous sloping annuli support real, alternating red and green narrow
# timbers. They join only adjacent rings; none radiate across the center panel.
for index,(outer,inner) in enumerate(zip(CONFIG['levels'],CONFIG['levels'][1:])):
    outer_poly=polygon(outer['width']-2*outer['beamWidth']+.05,outer['cut']*(outer['width']-2*outer['beamWidth']+.05)/outer['width'])
    inner_poly=polygon(inner['width']-.06,inner['cut']*(inner['width']-.06)/inner['width'])
    count=[144,112,96,80][index]
    # Eight panels have exact straight/corner boundaries and independent
    # collision bounds; a single encompassing box would incorrectly close it.
    samples=32
    op=[ray_boundary(outer_poly,k*math.tau/samples) for k in range(samples)]
    ip=[ray_boundary(inner_poly,k*math.tau/samples) for k in range(samples)]
    for k in range(samples):
        j=(k+1)%samples
        bottom=[(*op[k][:2],outer['bottom']+.16),(*op[j][:2],outer['bottom']+.16),(*ip[j][:2],inner['bottom']+.16),(*ip[k][:2],inner['bottom']+.16)]
        top=[(x,y,z+.07) for x,y,z in bottom]
        prism(f'three-hares-caisson-slope-{index+1}-{k:02}',bottom,top,'back',group=f'three-hares-caisson-slope-{index+1}',collider=True)
    for k in range(count):
        angle=(k+.5)*math.tau/count
        a=ray_boundary(outer_poly,angle);b=ray_boundary(inner_poly,angle)
        a.z=outer['bottom']+.10;b.z=inner['bottom']+.10
        color=('red','green','red-light','green-light')[k%4]
        # count divisible by 16 keeps colors and dimensions four-way symmetric.
        slat_width=.13 if index<2 else .105;slat_depth=.065
        buried_a,buried_b=bury_slat_ends(a,b,slat_width,slat_depth,[outer,inner])
        timber(f'three-hares-caisson-slat-{index+1}-{k:03}',buried_a,buried_b,slat_width,slat_depth,color,group=f'three-hares-caisson-slats-{index+1}-{color}')
    # Four substantial corner braces are lower than the fine slats and visibly
    # connect the square and octagonal frames at successive heights.
    for corner in range(4):
        angle=math.pi/4+corner*math.pi/2
        a=ray_boundary(polygon(outer['width']-outer['beamWidth'],outer['cut']*(outer['width']-outer['beamWidth'])/outer['width']),angle)
        b=ray_boundary(polygon(inner['width']-inner['beamWidth'],inner['cut']*(inner['width']-inner['beamWidth'])/inner['width']),angle)
        a.z=outer['bottom']+.14;b.z=inner['bottom']+.14
        timber(f'three-hares-caisson-corner-brace-{index+1}-{corner}',a,b,.32 if index<2 else .26,.22,'wood','blue-beam',collider=True)

# A small closed square backing, with its own completely independent artwork
# mesh on the downward face. The 767:766 original is fitted without stretching.
panel=CONFIG['centerPanel'];half=panel['width']/2;face=panel['faceHeight']
quad=[(-half,-half),(half,-half),(half,half),(-half,half)]
prism('three-hares-caisson-center-backing',[(x,y,face+.003) for x,y in quad],[(x,y,face+panel['thickness']) for x,y in quad],'wood',collider=True)
aspect=center_image.size[0]/center_image.size[1]
pw=panel['width'] if aspect>=1 else panel['width']*aspect
ph=panel['width']/aspect if aspect>=1 else panel['width']
verts=[(-pw/2,-ph/2,face),(pw/2,-ph/2,face),(pw/2,ph/2,face),(-pw/2,ph/2,face)]
obj_mesh(panel['nodeId'],verts,[(3,2,1,0)],[M['center']],{0:[(1,1),(0,1),(0,0),(1,0)]})

# Join only decorative pieces with the same role/material within each slat
# level, keeping every substantial frame, brace and the replaceable panel named.
for index in range(4):
    for color in ['red','green','red-light','green-light']:
        name=f'three-hares-caisson-slats-{index+1}-{color}'
        parts=[o for o in objects if o.get('semanticGroup')==name]
        if not parts:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
        joined=bpy.context.object;joined.name=name
        objects=[o for o in model.objects]

bpy.context.view_layer.update()
points=[o.matrix_world@v.co for o in model.objects for v in o.data.vertices]
bounds={'min':[round(min(p[i] for p in points),6) for i in range(3)],'max':[round(max(p[i] for p in points),6) for i in range(3)]}
assert abs(bounds['max'][0]-bounds['min'][0]-15.2)<1e-5
assert bounds['min'][2]>=-1e-6 and bounds['max'][2]<=2.43001
# Geometry, rather than a texture, must have four-way symmetry.
structural_points=[o.matrix_world@v.co for o in model.objects if o.name!=panel['nodeId'] for v in o.data.vertices]
cloud={tuple(round(c,5) for c in p) for p in structural_points}
missing=sum((round(-p[1],5),round(p[0],5),round(p[2],5)) not in cloud for p in structural_points)
assert missing==0,f'Non-symmetric geometry: {missing} vertices'
depsgraph=bpy.context.evaluated_depsgraph_get()
hits=[]
for x in [-2,0,2]:
    for y in [-2,0,2]:
        ok,pos,normal,face_id,obj,matrix=scene.ray_cast(depsgraph,Vector((x,y,-5)),Vector((0,0,1)))
        assert ok and obj.name==panel['nodeId'],f'Center hidden at {x},{y}: {obj.name if obj else None}'
        hits.append({'x':x,'y':y,'firstHit':obj.name,'height':round(pos.z,5)})

# Save the pure standalone model before creating any preview lights/cameras.
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(model.objects))
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.shading.type='MATERIAL'
            space.region_3d.view_location=Vector((0,0,1.15));space.region_3d.view_distance=21
            space.region_3d.view_rotation=(Vector((0,0,1.15))-Vector((7,-9,-14))).to_track_quat('-Z','Y')
            space.region_3d.view_perspective='PERSP'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'three-hares-caisson.blend'))
# The editable .blend keeps the individual structural pieces. For the web,
# combine equal semantic batches without changing any vertices or UVs.
groups={}
for obj in list(model.objects):groups.setdefault(obj.get('semanticGroup',obj.name),[]).append(obj)
for name,parts in groups.items():
    if len(parts)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();bpy.context.object.name=name
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:obj.select_set(True)
model_path=OUTPUT/'three-hares-caisson.glb'
bpy.ops.export_scene.gltf(filepath=str(model_path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_image_format='AUTO')
raw=model_path.read_bytes();triangles=sum(len(p.vertices)-2 for o in model.objects for p in o.data.polygons)
geometry={'version':'v002','coordinateSystem':'local Y-up, origin at lowest outside frame','cameraBoxes':camera_boxes,'bounds':{'min':[bounds['min'][0],bounds['min'][2],-bounds['max'][1]],'max':[bounds['max'][0],bounds['max'][2],-bounds['min'][1]]},'levels':CONFIG['levels'],'centerImageAspect':aspect}
for path in [OUTPUT/'geometry.json',ROOT/'src/content/world/caisson-geometry-v002.json']:path.write_text(json.dumps(geometry,indent=2)+'\n')
manifest={'version':'v002','units':'metres','blenderAxes':'XY plane, +Z depth','gltfAxes':'Y up','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':triangles,'meshes':len(model.objects),'boundsBlender':bounds,'geometrySymmetryMissing':missing,'centerVisibility':hits,'imageUVPixels':UV_RECTS,'centerImage':{'file':'three-hares-center.jpg','sha256':hashlib.sha256((OUTPUT/'three-hares-center.jpg').read_bytes()).hexdigest(),'width':pw,'height':ph,'untouchedOriginal':True},'layout':CONFIG,'generation':'Real open frames, diagonal struts, sloping solid side panels and individual narrow timbers. Original image UVs only, no AI redraw or procedural flower patterns.'}
(SOURCE/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(WORK/'caisson-v002-geometry-report.json').write_text(json.dumps({'passed':True,'symmetryMissing':missing,'centerVisibility':hits,'bounds':bounds,'triangles':triangles,'frames':frame_topology,'buriedSlatEnds':len(slat_end_checks),'minimumSlatEndBurial':min(c['minimumBurial'] for c in slat_end_checks),'maximumEndExtension':max(c['extension'] for c in slat_end_checks)},indent=2)+'\n')
print('CAISSON_EXPORT',json.dumps({'bytes':len(raw),'triangles':triangles,'meshes':len(model.objects),'bounds':bounds}),flush=True)
if args.skip_render:sys.exit(0)

scene.render.engine='CYCLES';scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.world=bpy.data.worlds.new('Neutral studio world');scene.world.use_nodes=True
background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value=(.35,.36,.4,1);background.inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.7
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
for name,position,power,size in [('warm-window',(-7,-5,-5),2100,8),('soft-fill',(6,4,-4),1600,9),('center-fill',(0,0,-3),1000,8)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    light=bpy.data.objects.new(name,data);scene.collection.objects.link(light);light.location=position
    light.rotation_euler=(Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Caisson underside preview');camera=bpy.data.objects.new('Caisson underside preview',camera_data);scene.collection.objects.link(camera);scene.camera=camera
def render(name,position,target,lens=30,orthographic=None):
    camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO' if orthographic else 'PERSP';camera_data.lens=lens
    if orthographic:camera_data.ortho_scale=orthographic
    scene.render.filepath=str(WORK/name);bpy.ops.render.render(write_still=True)
render('caisson-v002-underneath.png',(0,0,-13),(0,0,1.2),orthographic=16.5)
render('caisson-v002-oblique.png',(10,-13,-11),(0,0,1.15),lens=42)
print('CAISSON_PREVIEWS_COMPLETE',flush=True)
