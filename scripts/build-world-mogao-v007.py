"""Playable adapter for approved sandstone assets. Never rewrites upstream models.
Blender Z-up metres. Only foundation/short tunnel are exported anew; collider and
sand walk data are measured offline from the accepted meshes, not JS terrain.
"""
import bpy,bmesh,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/world/models/mogao/v007';OUT=ROOT/'public/assets/world/mogao/v007'
for p in (SRC,OUT):p.mkdir(parents=True,exist_ok=True)
files=['public/assets/world/mogao-sandstone/v001/mountain.glb','art-source/world/models/mogao-sandstone/v001/mogao-sandstone.blend','public/assets/world/mogao-massing/v003/tower.glb','public/assets/world/mogao-massing/v003/foundation.glb','art-source/world/models/mogao-massing/v003/mogao-massing.blend','public/assets/world/mogao/v006/exterior.glb','public/assets/world/mogao/v003/interior.glb','public/assets/world/traveler-tripo/v002/traveler.glb']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
protected={f:sha(ROOT/f) for f in files}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/mogao-massing/v003/mogao-massing.blend'))
F=6.85546875
base=[bpy.data.objects[n] for n in ['raised-plinth','central-ceremonial-stairs']]
for o in bpy.data.objects:o.hide_render=True;o.hide_set(True)
# Display-only black terminator stays in the original file and is not exported.
stone=bpy.data.materials['stone-steps'];lining=bpy.data.materials['passage-shadow']
def box(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);base.append(o);return o
box('passage-floor-v007',(0,-3.9,F-.035),(6.08,14.2,.09),stone)
# The retained room doorway is wider/higher. A short inner arch frames the
# narrow tower entrance and meets its front wall, without resizing the room.
for sign in [-1,1]:box('passage-return-v007-'+str(sign),(sign*3.14,.25,F+3.25),(.22,5.7,6.5),lining)
box('passage-head-v007',(0,.25,F+6.39),(6.5,5.7,.22),lining)
# Opaque exterior backing between tower tiers and the existing painted room.
# It sits outside the accepted front wall, above the passage, never across it.
plaster=bpy.data.objects['tower-storey-01-plaster'].data.materials[0]
box('tower-interior-screen-v007',(0,2.70,F+12.3),(24,.2,12.04),plaster)
for o in base:o.hide_render=False;o.hide_set(False);o['semanticGroup']='mogao-entry-v007'
# Original tower, sand foot and mass stay visible as an assembly reference in blend.
for o in bpy.data.objects:
 if (o.get('semanticGroup')=='tower' or o.name.startswith('sand-foot-') or o.name=='mountain-continuous-union') and not o.get('constructionOnly'):o.hide_render=False;o.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'entry-assembly.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in base:o.select_set(True)
bpy.context.view_layer.objects.active=base[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'entry.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
# Exact triangle planes for the small inherited wind-deposit meshes.
sand=[]
for o in bpy.data.objects:
 if not o.name.startswith('sand-foot-'):continue
 o.data.calc_loop_triangles()
 for t in o.data.loop_triangles:sand.append([[round(v,6) for v in (o.matrix_world@o.data.vertices[i].co)] for i in t.vertices])
# A narrow-band conservative frontal proxy; room and entry are handled explicitly.
m=bpy.data.objects['mountain-continuous-union'];bands=[]
for a,b in [(-65,-12.5),(12.5,65)]:
 x=a
 while x<b:
  x2=min(x+1,b);hits=[]
  for sx in [x+.01,(x+x2)/2,x2-.01]:
   for z in [.1,1,2.5,4,7,10]:
    ok,p,n,i=m.ray_cast(Vector((sx,-60,z)),Vector((0,1,0)))
    if ok:hits.append(p.y)
  if hits:bands.append([round(x,3),round(x2,3),round(min(hits)-.05,4)])
  x=x2
geom={'source':'mogao-massing/v003, accepted shape; no geometry regenerated at runtime','sandTriangles':sand,'frontBands':bands,'platform':F,'stairs':{'front':-29,'back':-10,'width':10.4,'rise':F,'steps':30},'passage':{'halfWidth':3.04,'front':-2.4,'back':3.1,'height':6.28},'columns':[-10.8106,-6.6346,-3.143,3.143,6.6346,10.8106],'columnY':-7.6676,'columnRadius':.29}
(ROOT/'src/content/world/mogao-geometry-v007.json').write_text(json.dumps(geom,separators=(',',':'))+'\n')
assert all(sha(ROOT/f)==h for f,h in protected.items())
manifest={'status':'playable integration candidate','upstream':protected,'entry':{'sha256':sha(OUT/'entry.glb'),'bytes':(OUT/'entry.glb').stat().st_size},'changes':['static dark back panel excluded from new export','short passage floor, returns and head connect retained chamber','accepted tower and mountain referenced unchanged'],'sourceBlend':'entry-assembly.blend','coordinateSystem':'Blender Z up; runtime exterior origin [122,0,-68]; interior floor +6.85546875','collisionBands':len(bands),'sandTriangles':len(sand),'protectedAssetsUnchanged':True}
(SRC/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V007',json.dumps({k:v for k,v in manifest.items() if k!='upstream'},ensure_ascii=False))
