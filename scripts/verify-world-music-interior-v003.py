"""Read-only verification that approved decoration preserves original artwork UVs.
Run with Blender in background; this opens v002/v003 sources without saving.
"""
import bpy,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def sig(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));d={}
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or not len(o.data.vertices) or o.get('excludeV4') or o.get('excludeV5'):continue
  group=o.get('semanticGroup','architecture');all_faces=group not in ('architecture','porch','music-interior-floor','music-interior-stair','music-interior-landing','roof-wall-closure','terraced-foundation') or o.name in ('porch--dark','porch--painted-floral-border','porch--teal')
  h=hashlib.sha256();n=0
  for f in o.data.polygons:
   points=[o.matrix_world@o.data.vertices[i].co for i in f.vertices];cy=sum(p.z for p in points)/len(points)
   if not(all_faces or o.name=='porch--wood-light' and cy>8.1):continue
   mat=o.data.materials[f.material_index].name;h.update(mat.encode())
   for p in points:h.update(','.join(f'{x:.6f}' for x in p).encode())
   uv=o.data.uv_layers.active
   if uv:
    for lp in f.loop_indices:h.update(','.join(f'{x:.6f}' for x in uv.data[lp].uv).encode())
   n+=1
  if n:d[o.name]=(n,h.hexdigest())
 return d
before=sig(root/'art-source/world/models/music-interior/v002/music-pavilion.blend');after=sig(root/'art-source/world/models/music-interior/v003/music-pavilion.blend')
assert all(after.get(k)==v for k,v in before.items()),[k for k in before if after.get(k)!=before[k]]
print('PROTECTED_MATERIALS_AND_UV_UNCHANGED',len(before),'objects',sum(n for n,h in before.values()),'faces')
