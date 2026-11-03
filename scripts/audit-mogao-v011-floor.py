"""Inspect shipped porch/step surfaces without modifying assets."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import intersect_point_tri_2d
R=Path(__file__).resolve().parents[1];F=6.85546875
bpy.ops.wm.read_factory_settings(use_empty=True)
for path in ['mogao/v010/entry.glb','mogao-massing/v003/tower.glb']:
 bpy.ops.import_scene.gltf(filepath=str(R/'public/assets/world'/path))
bpy.context.view_layer.update()
report={}
for x,y in [(-8,-3),(-8,-2.7),(-8,-4),(-8,-5),(-8,-8),(0,-10),(0,-10.1),(0,-12),(0,-20)]:
 layers=[];p=Vector((x,y))
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  o.data.calc_loop_triangles()
  for tri in o.data.loop_triangles:
   pts=[o.matrix_world@o.data.vertices[i].co for i in tri.vertices]
   if max(v.z for v in pts)-min(v.z for v in pts)<.00001 and -.01<pts[0].z<F+.2 and intersect_point_tri_2d(p,*[Vector((v.x,v.y)) for v in pts]):
    row=[o.name,round(pts[0].z,6),round(tri.normal.z,3)]
    if row not in layers:layers.append(row)
 report[str((x,y))]=layers
(R/'work/world/mogao-v011-floor-before.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
