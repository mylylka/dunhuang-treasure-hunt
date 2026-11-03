import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];F=6.85546875
bpy.ops.wm.read_factory_settings(use_empty=True)
after='--after' in sys.argv
for path in (['mogao/v011/entry.glb','mogao-massing/v003/tower.glb','mogao/v011/mountain.glb'] if after else ['mogao/v010/entry.glb','mogao-massing/v003/tower.glb','mogao/v009/mountain.glb']):
 bpy.ops.import_scene.gltf(filepath=str(R/'public/assets/world'/path))
bpy.context.view_layer.update();meshes=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 b=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons])
 meshes.append((o.name,b))
report={}
for x in [-10,-8,-6,0,8]:
 for y in [-10.1,-7,-4,-3,-2.5,-2.3]:
  layers=[]
  for name,b in meshes:
   p,n,i,d=b.ray_cast(Vector((x,y,F+.19)),Vector((0,0,-1)),.4)
   if p:layers.append([name,round(p.z,5)])
  report[str((x,y))]=layers
(R/('work/world/mogao-v011-porch-after.json' if after else 'work/world/mogao-v011-porch-before.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if after:
 for x in [-10,-8,-6]:
  for y in [-3,-2.5]:
   hits=report[str((x,y))];assert any(n=='raised-plinth' and abs(h-F)<.0001 for n,h in hits)
   assert not any(n=='mountain-sandstone-low' and abs(h-F)<.01 for n,h in hits),hits
