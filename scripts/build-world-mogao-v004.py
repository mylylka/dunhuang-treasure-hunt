"""Selective sandstone material grading and Blender-authored sand drifts.
Only v004 is written; the supplied FBX/albedo and accepted v003 remain intact.
"""
import bpy,json,math,hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v004';O=R/'public/assets/world/mogao/v004'
D.mkdir(parents=True,exist_ok=True);O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/world/models/mogao/v003/mogao.blend'))
bpy.context.preferences.filepaths.save_version=0
cliff=bpy.data.objects['user-cliff-facade']
# Earlier version objects remain archived and hidden in this editable scene.
# Select the current visible ground by semantic role, not a reused Blender name.
grounds=[o for o in bpy.context.scene.objects if o.get('semanticGroup')=='region-ground' and not o.hide_render]
assert len(grounds)==1, f'Expected one active ground, got {[o.name for o in grounds]}'
ground=grounds[0]
L=json.loads((R/'src/content/world/mogao-layout-v003.json').read_text());floor=L['origin'][1]
ground_top=max((ground.matrix_world@Vector(c)).z for c in ground.bound_box)+floor
assert abs(ground_top)<.001, f'Ground must meet world sand at zero, got {ground_top}'
# Material colour adjustment in encoded sRGB. Dark texels are an exact identity.
# Keep the original UVs, original texture detail and real light/shadow geometry.
source=R/'art-source/world/mogao/v003/imported/石窟.fbm/石窟_basecolor.jpg'
im=bpy.data.images.load(str(source),check_existing=False);w,h=im.size
pixels=np.empty(w*h*4,dtype=np.float32);im.pixels.foreach_get(pixels);pixels=pixels.reshape(-1,4)
rgb=pixels[:,:3].copy();lum=rgb@np.array([.2126,.7152,.0722],dtype=np.float32)
t=np.clip((lum-.38)/.15,0,1);weight=t*t*(3-2*t)
# The pale reference is the existing desert #dfbd83. Cool the mustard cast,
# with a little more lift in blue than red, without changing dark crevices.
shift=np.array([.20,.22,.235],dtype=np.float32)
graded=np.minimum(.98,rgb+weight[:,None]*shift);graded[lum<=.38]=rgb[lum<=.38]
pixels[:,:3]=graded
out=bpy.data.images.new('cliff-sand-harmony-v004',width=w,height=h,alpha=True,float_buffer=False)
out.colorspace_settings.name='sRGB';out.pixels.foreach_set(pixels.ravel());out.filepath_raw=str(D/'cliff-basecolor-v004.png');out.file_format='PNG';out.save()
for m in cliff.data.materials:
 for n in m.node_tree.nodes:
  if n.type=='TEX_IMAGE':n.image=out
  if n.type=='BSDF_PRINCIPLED':n.inputs['Roughness'].default_value=.96;n.inputs['Metallic'].default_value=0
color_report={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'protectedLuminanceAtMost':.38,'protectedTexels':int(np.sum(lum<=.38)),'protectedMaximumDelta':float(np.max(abs(graded[lum<=.38]-rgb[lum<=.38]))),'sRGBLift':[.20,.22,.235],'transitionLuminance':[.38,.53]}
# Deliberately placed broad low drifts, following the actual imported rock foot.
front=L['frontRocks']
def foot(x):
 row=min(front,key=lambda r:abs((r[0]+r[1])/2-x));return row[2]
# x, height, lateral radius, outward radius. No random offsets/noise or spikes.
front_shapes=[(-59,.28,6,3.5),(-51,1.4,9,5),(-42,.3,6,3.5),(-33,.7,7,4),(-24,.28,6,3.5),(-15,1.55,7,4.5),(-8,.25,5,3),(6,.25,5,3),(14,.85,7,4.5),(23,.3,6,3.5),(33,1.7,10,6),(43,.3,6,3.5),(52,1.05,8,4.5),(59,.28,6,3.5)]
# Put each crest just in front of the rock, so both its rounded crest and
# the sand climbing the foot remain visible from the low follow camera.
drifts=[(x,foot(x)-.35,height,rx,ry) for x,height,rx,ry in front_shapes]
drifts += [(-60,-13,1.1,6,10),(-60,-1,1.4,7,11),(-59,13,1.1,6,10),(-58,27,1.4,7,11),(59,0,1.15,7,11),(60,13,1.5,7,10),(58,27,.95,6,10)]
drifts += [(-49,34,1.1,11,6),(-32,34,1.4,12,7),(-15,34,.95,10,6),(3,34,1.4,12,7),(22,34,1.15,13,6),(40,34,1.4,11,7),(53,33,1,10,6)]
x0,y0,step=-72.,-45.,.75
xs=np.arange(x0,72+step/2,step);ys=np.arange(y0,48+step/2,step);X,Y=np.meshgrid(xs,ys);H=np.zeros_like(X)
for x,y,height,rx,ry in drifts:H+=height*np.exp(-2.2*(((X-x)/rx)**2+((Y-y)/ry)**2))
# Keep the full central staircase and road clear. The feather is outside the path.
gap=np.clip((abs(X+2)-4.8)/2.5,0,1);gap=gap*gap*(3-2*gap);H*=np.where(Y<3,gap,1)
road_distance=np.full(X.shape,1e5)
for a,b,c,d in L['road']:
 for t in np.linspace(0,1,65):
  s=1-t;wx=s**3*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t**3*d[0];wz=s**3*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t**3*d[1]
  road_distance=np.minimum(road_distance,np.hypot(X-(wx-L['origin'][0]),Y-(L['origin'][2]-wz)))
road_mask=np.clip((road_distance-2.3)/2.5,0,1);H*=road_mask*road_mask*(3-2*road_mask)
# Fade below the flat ground, rather than leaving a raised disc edge or coplanar rim.
H=np.maximum(-.065,H-.065)
vertices=[(float(x),float(y),float(z-floor)) for x,y,z in zip(X.ravel(),Y.ravel(),H.ravel())];faces=[];nx=len(xs)
for j in range(len(ys)-1):
 for i in range(nx-1):
  if np.max(H[j:j+2,i:i+2])<-.01:continue
  a=j*nx+i;faces.append((a,a+1,a+1+nx,a+nx))
mesh=bpy.data.meshes.new('sculpted-windblown-sand-foot');mesh.from_pydata(vertices,[],faces);mesh.update()
sand=bpy.data.objects.new('rock-foot-sand-drifts-v004',mesh);bpy.context.collection.objects.link(sand);sand['semanticGroup']='rock-foot-sand';sand.data.materials.append(bpy.data.materials['ground-sand'])
for p in mesh.polygons:p.use_smooth=True
# Height samples are the mesh vertices themselves; runtime only interpolates them.
height_data={'version':'v004','origin':L['origin'],'x0':x0,'y0':y0,'step':step,'heights':np.round(np.maximum(0,H),4).tolist(),'maximumHeight':float(H.max())}
(R/'src/content/world/mogao-surface-v004.json').write_text(json.dumps(height_data,separators=(',',':'))+'\n')
# Keep editable source geometry, not disposable export batches, in the source file.
visible=[o for o in bpy.context.scene.objects if not o.hide_render]+[sand]
for o in visible:o.hide_set(False);o.hide_render=False
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao.blend'))
# Combine the ground and drift surface into one material batch; cliff keeps one batch.
items=[]
for originals in [[cliff],[ground,sand]]:
 bpy.ops.object.select_all(action='DESELECT');copies=[]
 for src in originals:
  cp=bpy.data.objects.new('export-'+src.name,src.data.copy());bpy.context.collection.objects.link(cp);cp.matrix_world=src.matrix_world.copy();cp.select_set(True);copies.append(cp)
 bpy.context.view_layer.objects.active=copies[0]
 if len(copies)>1:bpy.ops.object.join()
 items.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT');tris=0
for o in items:o.select_set(True);o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
f=O/'exterior.glb';bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=95)
report={'color':color_report,'drifts':drifts,'sandTriangles':len(faces)*2,'maximumSandHeight':float(H.max()),'exteriorTriangles':tris,'batches':len(items),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'interior':'Unchanged v003/interior.glb; doorway, steps, player, room, road and lighting retained.'}
(D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('V004',json.dumps({k:v for k,v in report.items() if k!='drifts'}))
