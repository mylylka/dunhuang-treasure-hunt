"""Derive the approved music interior decoration, preserving v002 structural mesh.

blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v003.py
Music source coordinates are metres, Y up. Model placement remains [46,0,-9].
The source and every original vertex/polygon are read-only in geometry; only
selected inward faces receive new materials and UVs. Added flush decoration is
no more than 0.025 m from the existing surface, inside collision clearance.
"""
import bpy, hashlib, json, math
from pathlib import Path
from collections import Counter
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-interior/v002/music-pavilion.blend'
OLD_GLB=ROOT/'public/assets/world/music-interior/v002/music-pavilion.glb'
DEST=ROOT/'art-source/world/models/music-interior/v003'
OUT=ROOT/'public/assets/world/music-interior/v003'
for p in (DEST,OUT):p.mkdir(parents=True,exist_ok=True)
protected={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (SOURCE,OLD_GLB)}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices) and not o.get('excludeV4') and not o.get('excludeV5')]

def src(p):return Vector((p.x+46,p.z,-p.y-9))
def bp(p):return Vector((p[0]-46,-p[2]-9,p[1]))
def signature(obs):
 h=hashlib.sha256()
 for o in sorted(obs,key=lambda x:x.name):
  h.update(o.name.encode())
  for v in o.data.vertices:h.update(','.join(f'{x:.7f}' for x in o.matrix_world@v.co).encode())
  for f in o.data.polygons:h.update(str(tuple(f.vertices)).encode())
 return h.hexdigest()
original_geometry=signature(objects)

def linear(x):
 c=int(x,16)/255
 return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
palette={'plaster':'E7D8B7','wainscot':'8BAE9E','cinnabar':'96503C','wood':'A97A54','ceiling':'79624C','soffit':'B7A58A','stone':'CBC3AC','tread':'CBC3AC','riser':'B5AA92','ochre':'B8A16E','floral':'FFFFFF','nosing':'B0A58D'}
materials={}
for key,color in palette.items():
 m=bpy.data.materials.new('music-decor-'+key);m.use_nodes=True
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) or m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
 output=next((n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL'),None) or m.node_tree.nodes.new('ShaderNodeOutputMaterial')
 m.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface']);rgba=tuple(linear(color[i:i+2]) for i in (0,2,4))+(1,)
 bs.inputs['Base Color'].default_value=rgba;bs.inputs['Roughness'].default_value=.91;bs.inputs['Metallic'].default_value=0;m.diffuse_color=rgba
 materials[key]=m
face_counts=Counter();uv_records=[]

def face_material(o,f,key,pts,n):
 m=materials[key]
 if m.name not in o.data.materials:o.data.materials.append(m)
 f.material_index=o.data.materials.find(m.name)
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='MusicMetreUV')
 # One UV unit equals one source metre, continuous across a split wall.
 if abs(n.y)>.5:coords=[(p.x,p.z) for p in pts]
 elif abs(n.z)>.5:coords=[(p.x,p.y) for p in pts]
 else:coords=[(p.z,p.y) for p in pts]
 for loop,co in zip(f.loop_indices,coords):uv.data[loop].uv=co
 face_counts[key]+=1

for o in objects:
 group=o.get('semanticGroup','architecture')
 for f in o.data.polygons:
  pts=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices]
  c=sum(pts,Vector())/len(pts);n=(pts[1]-pts[0]).cross(pts[2]-pts[0]).normalized();key=None
  if group in ('architecture','porch'):
   # Only inward major walls and two faces/returns of the real partitions.
   wall=(abs(c.z+27.75)<.002 or abs(c.x-34.7625)<.002 or abs(c.x-59.4242977528)<.002 or abs(c.z+18.225)<.002)
   partition=(34.68<c.x<44.56 and -21.98<c.z<-21.62 and 1.78<c.y<13.32) or (44.43<c.x<45.0 and -21.66<c.z<-17.94 and 1.78<c.y<7.45)
   old_material=o.data.materials[f.material_index].name
   if old_material=='plaster' and wall and 1.78<c.y<13.54:key='plaster'
   if old_material=='plaster' and partition:key='plaster'
   # Preserve every original upper-front window and exterior face.
   if group=='porch' and o.name=='porch--wood-light' and 7.878<c.y<7.917 and -21.81<c.z<-17.89 and n.y>.8:key='wood'
   # The turned ground leaves receive the same warm timber finish on their own components.
   if group=='porch' and o.name in ('porch--wood','porch--ochre') and c.y<7.4 and 35.8<c.x<43.1 and -21.7<c.z<-18.4:key='cinnabar'
  if group=='terraced-foundation' and n.y>.9 and abs(c.y-1.8)<.002:key='stone'
  if group=='music-interior-floor':
   key='wood' if n.y>.8 else 'soffit' if n.y<-.5 else 'cinnabar'
  if group=='music-interior-stair':
   key='tread' if n.y>.8 else 'riser' if abs(n.y)<.1 and abs(n.x)>.5 else 'soffit' if n.y<-.3 else 'stone'
  if group=='music-interior-landing':key='stone' if n.y>.8 else 'riser'
  if group=='roof-wall-closure' and o.name.endswith('--wood'):
   if n.y<-.8 and c.y>13.1 and -27.9<c.z<-17.9:key='ceiling'
   elif c.y>13.1 and -18.1<c.z<-17.4:key='cinnabar'
  if key:face_material(o,f,key,pts,n)
 for uv in o.data.uv_layers:
  for v in uv.data:assert math.isfinite(v.uv.x) and math.isfinite(v.uv.y)

new_objects=[];decor=[]
def plane(name,points,key,uvs=None,group='music-decoration-wall'):
 data=bpy.data.meshes.new(name);data.from_pydata([bp(p) for p in points],[],[tuple(range(len(points)))]);data.update()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o['semanticGroup']=group;o['decorationOnly']=True;o['maximumProjectionMetres']=.025;o.data.materials.append(materials[key]);new_objects.append(o)
 u=data.uv_layers.new(name='MusicMetreUV')
 if uvs is None:
  ps=[Vector(p) for p in points];n=(ps[1]-ps[0]).cross(ps[2]-ps[0]).normalized()
  if abs(n.y)>.8:uvs=[(p[0],p[2]) for p in points]
  elif abs(n.z)>.5:uvs=[(p[0],p[1]) for p in points]
  else:uvs=[(p[2],p[1]) for p in points]
 for lp,co in zip(data.polygons[0].loop_indices,uvs):u.data[lp].uv=co
 decor.append({'id':name,'material':materials[key].name,'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]})
 return o

# Original image is kept outside this GLB and loaded once by runtime.
FLORAL_ASPECT=1013/97

def strip(name,axis,fixed,start,end,bottom,top,key,normal):
 if end-start<.04:return
 if axis=='x':points=[(start,bottom,fixed),(end,bottom,fixed),(end,top,fixed),(start,top,fixed)];reverse=normal<0
 else:points=[(fixed,bottom,start),(fixed,bottom,end),(fixed,top,end),(fixed,top,start)];reverse=normal>0
 width=end-start;height=top-bottom
 uvs=[(0,0),(width/(height*FLORAL_ASPECT),0),(width/(height*FLORAL_ASPECT),1),(0,1)] if key=='floral' else None
 if reverse:
  points.reverse()
  if uvs:uvs.reverse()
 plane(name,points,key,uvs,group='music-decoration-trim' if key!='wainscot' else 'music-decoration-wall')

def wallset(label,axis,fixed,start,end,base,normal,crown=None):
 strip(label+'-wainscot',axis,fixed,start,end,base+.015,base+.75,'wainscot',normal)
 strip(label+'-red-line',axis,fixed-.001*normal if axis=='z' else fixed+.001*normal,start,end,base+.75,base+.785,'cinnabar',normal)
 strip(label+'-ochre-line',axis,fixed-.002*normal if axis=='z' else fixed+.002*normal,start,end,base+.785,base+.805,'ochre',normal)
 # Selected focal walls repeat the original floral language at walking eye level.
 # The upper band stops at 8.865 m, below the retained rear windows (8.92675).
 if label in ('rear-ground','rear-upper') or label.startswith('ground-partition-'):
  strip(label+'-low-floral',axis,fixed,start,end,base+.83,base+.95,'floral',normal)
 if crown:
  strip(label+'-floral',axis,fixed,start,end,crown,crown+.22,'floral',normal)
  strip(label+'-upper-red',axis,fixed,start,end,crown+.23,crown+.30,'cinnabar',normal)

# Exterior mural front is never covered; these faces all point inward.
wallset('rear-ground','x',-27.736,34.78,59.41,1.8,1,None)
wallset('rear-upper','x',-27.735,34.78,46.25,7.915375,1,None)
strip('rear-cornice-floral','x',-27.734,34.78,59.41,12.86,13.08,'floral',1)
strip('rear-cornice-red','x',-27.733,34.78,59.41,13.09,13.17,'cinnabar',1)
wallset('west-ground','z',34.7775,-27.73,-18.24,1.8,1,6.82)
wallset('west-upper','z',34.7775,-27.73,-18.24,7.915375,1,12.86)
wallset('east-ground','z',59.4093,-27.73,-18.24,1.8,-1,12.86)
wallset('mural-rear','x',-18.240,45.01,59.405,1.8,-1,12.86)
# The ground passage is a real void: trim only the two jamb pieces at low level.
for face,fixed,normal in [('front',-21.610,1),('rear',-21.990,-1)]:
 for side,a,b in [('west',34.78,37.69),('east',41.31,44.42)]:wallset('ground-partition-'+face+'-'+side,'x',fixed,a,b,1.8,normal,None)
 strip('ground-partition-'+face+'-floral','x',fixed,34.78,44.42,6.82,7.04,'floral',normal)
 for side,a,b in [('left',37.60,37.69),('right',41.31,41.40)]:strip('ground-door-'+face+'-'+side,'x',fixed,a,b,1.815,5.49,'cinnabar',normal)
 strip('ground-door-'+face+'-head','x',fixed,37.60,41.40,5.41,5.50,'cinnabar',normal)
# Side partition has two visible faces.
wallset('divider-west','z',44.427,-21.61,-18.24,1.8,-1,6.82)
wallset('divider-east','z',45.007,-21.61,-18.24,1.8,1,6.82)
# Upper front wall: low skirt is below the retained windows, upper band above them.
for face,fixed,normal in [('gallery',-21.833,1),('hall',-22.165,-1)]:
 for side,a,b in [('west',34.78,41.88),('east',44.62,44.77)]:wallset('upper-partition-'+face+'-'+side,'x',fixed,a,b,7.915375,normal,None)
 strip('upper-partition-'+face+'-floral','x',fixed,34.78,44.77,12.65,12.87,'floral',normal)
 for side,a,b in [('left',41.80,41.89),('right',44.61,44.70)]:strip('upper-door-'+face+'-'+side,'x',fixed,a,b,7.930,11.49,'cinnabar',normal)
 strip('upper-door-'+face+'-head','x',fixed,41.80,44.70,11.41,11.50,'cinnabar',normal)
# Flat ceiling strips remain inside the pre-existing ceiling collision padding.
for i,z in enumerate((-26.5,-23.1,-19.7)):
 plane(f'ceiling-painted-crossbeam-{i}',[(34.79,13.514,z-.09),(59.40,13.514,z-.09),(59.40,13.514,z+.09),(34.79,13.514,z+.09)],'cinnabar',group='music-decoration-trim')
# Plain, low-contrast nosing lines: no repeating pictures on every tread.
risers=36;treads=35;low=55.69;high=46.27;rise=(7.915375-1.8)/risers;going=(low-high)/treads
for i in range(treads):
 x=low-(i+1)*going;y=1.8+(i+1)*rise+.004
 plane(f'stair-nosing-{i+1:02}',[(x,y,-23.015),(x+.026,y,-23.015),(x+.026,y,-26.585),(x,y,-26.585)],'nosing',group='music-decoration-floor')

assert signature(objects)==original_geometry,'A structural vertex/polygon was changed'
all_objects=objects+new_objects
# Verify actual geometry rays from known doors and underpass points.
def bvh(obs):
 vs=[];fs=[]
 for o in obs:
  offset=len(vs);vs.extend(src(o.matrix_world@v.co) for v in o.data.vertices);fs.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
 return BVHTree.FromPolygons(vs,fs,all_triangles=False)
spatial=bvh(all_objects)
def ray(p,d,length):return spatial.ray_cast(Vector(p),Vector(d),length)[0]
assert ray([39.5,3,-20.8],[0,0,-1],1.8) is None,'Ground doorway obstructed'
assert ray([43.25,9.5,-21.2],[0,0,-1],1.6) is None,'Upper doorway obstructed'
for x in (39.1,39.5,40.0):assert ray([x,3,-16.5],[0,0,-1],2.0) is None,'Removed middle pillar returned'
for x,z in ((46.7,-24.8),(47.5,-24.8),(48.5,-24.8),(49,-24.8)):
 assert ray([x,1.81,z],[0,1,0],1.85) is None,'Underpass body clearance changed'
# Walking surfaces are unchanged, with only a 4mm visual edge line at nosings.
for i in range(treads):
 x=low-(i+.5)*going;expected=1.8+(i+1)*rise
 hit=ray([x,expected+.1,-24.8],[0,-1,0],.3)
 assert hit is not None and abs(hit.y-expected)<.007,(i,hit,expected)

bpy.ops.object.select_all(action='DESELECT')
for o in all_objects:o.hide_set(False);o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
# Keep original semantic groups and batches; added material slots split in glTF.
graph=bpy.context.evaluated_depsgraph_get();batches={}
for o in all_objects:
 data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
 cp=bpy.data.objects.new('export-'+o.name,data);bpy.context.collection.objects.link(cp);cp.matrix_world=o.matrix_world.copy();group=o.get('semanticGroup','architecture');cp['semanticGroup']=group
 cp['decorationOnly']=bool(o.get('decorationOnly',False));batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(cp);o.select_set(False)
exported=[]
for (group,mats),items in batches.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 if len(items)>1:bpy.ops.object.join()
 o=bpy.context.object;o.name=group+'--'+mats[0];exported.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in exported:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in protected.items()),'A protected file changed'
manifest={'version':'music-interior-v003','source':str(SOURCE.relative_to(ROOT)),'runtimeAsset':'music-interior/v003/music-pavilion.glb','runtimeOrigin':[46,0,-9],'protectedSourceHashes':protected,'originalStructuralGeometrySha256':original_geometry,'originalStructuralGeometryUnchanged':True,'removedColumnPreserved':True,'doorAndUnderpassRaysPassed':True,'all35TreadHeightRaysPassed':True,'newMaterialFaceCounts':dict(face_counts),'paletteSrgb':palette,'metreUV':'1 UV unit = 1 metre; horizontal x/z, vertical horizontal source axis/y','floralUV':{'source':'public/assets/world/courtyard/v002/wall-floral-border.jpg','widthHeightRatio':FLORAL_ASPECT,'bandHeight':.22,'wrapS':'Repeat','wrapT':'Clamp','note':'Runtime loads this existing image once, not embedded in new GLB'},'addedDecoration':decor,'maximumProjectionMetres':.025,'meshBatches':len(exported),'bytes':(OUT/'music-pavilion.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('DECORATION_V003_EXPORTED',manifest['bytes'],dict(face_counts),'new planes',len(new_objects))

# Independent delivery audit: clear the editable scene, import only the GLB and
# repeat physical opening/height checks rather than trusting source predicates.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'music-pavilion.glb'))
fresh=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)]
spatial=bvh(fresh)
assert ray([39.5,3,-20.8],[0,0,-1],1.8) is None
assert ray([43.25,9.5,-21.2],[0,0,-1],1.6) is None
assert ray([39.6925,3,-16.5],[0,0,-1],2) is None
for x in (34.98,44.3325):assert ray([x,3,-16.5],[0,0,-1],2) is not None,'A neighboring pillar vanished'
assert ray([39.6925,9.5,-16.5],[0,0,-1],2) is not None,'The upper pillar vanished'
for x,z in ((46.7,-24.8),(47.5,-24.8),(48.5,-24.8),(49,-24.8)):assert ray([x,1.81,z],[0,1,0],1.85) is None
for i in range(treads):
 x=low-(i+.5)*going;expected=1.8+(i+1)*rise;hit=ray([x,expected+.1,-24.8],[0,-1,0],.3)
 assert hit is not None and abs(hit.y-expected)<.007
floral_uvs=0;nosing_up=0
for o in fresh:
 for f in o.data.polygons:
  mat=o.data.materials[f.material_index].name
  if mat.startswith('music-decor-'):
   assert o.data.uv_layers.active is not None,'Missing delivered metric UV'
   for i in f.loop_indices:assert all(math.isfinite(v) for v in o.data.uv_layers.active.data[i].uv)
  if mat=='music-decor-floral':floral_uvs+=1
  if mat=='music-decor-nosing':
   pts=[src(o.matrix_world@o.data.vertices[i].co) for i in f.vertices];n=(pts[1]-pts[0]).cross(pts[2]-pts[0]).normalized()
   assert n.y>.99,'Nosing is back-face culled from the player';nosing_up+=1
assert floral_uvs>=10 and nosing_up==70,(floral_uvs,nosing_up)
manifest['freshGlbImportRaysPassed']=True;manifest['floralTrianglesWithUV']=floral_uvs;manifest['upwardNosingTriangles']=nosing_up
(DEST/'export-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('FRESH_GLB_DECORATION_AUDIT_PASSED',floral_uvs,nosing_up)
