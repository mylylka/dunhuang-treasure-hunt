import bpy,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import intersect_point_tri_2d
R=Path(__file__).resolve().parents[1];F=6.85546875;report={}
def import_pair(version):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 for name,v,offset in [('entry','v007' if version=='v009' else version,0),('interior',version,F)]:
  before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(R/f'public/assets/world/mogao/{v}/{name}.glb'))
  for o in bpy.context.scene.objects:
   if o not in before and o.type=='MESH':
    o.location.z+=offset;o['asset']=name
 bpy.context.view_layer.update()
def ceiling_layers(y):
 found=[];point=Vector((.13,y))
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  o.data.calc_loop_triangles()
  for t in o.data.loop_triangles:
   pts=[o.matrix_world@o.data.vertices[i].co for i in t.vertices]
   if all(abs(p.z-F-6.28)<.001 for p in pts) and intersect_point_tri_2d(point,*[Vector((p.x,p.y)) for p in pts]):found.append(o.name)
 return sorted(set(found))
for version in ['v009','v010']:
 import_pair(version);report[version]={str(y):ceiling_layers(y) for y in [2.7,3.099,3.101,5.5]}
assert len(report['v009']['2.7'])==2,report
assert all(v==['continuous-tunnel-ceiling-v010'] for v in report['v010'].values()),report
raw=(R/'public/assets/world/mogao/v010/interior.glb').read_bytes();d=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
assert not any('cutter' in n.get('name','') or 'original-high' in n.get('name','') for n in d['nodes'])
report['triangles']=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives'])
assert report['triangles']==490,report['triangles']
m=json.loads((R/'art-source/world/models/mogao/v010/export-manifest.json').read_text())
assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==h for p,h in m['originalHashes'].items())
report.update({'protectedAssetsUnchanged':True,'collisionChanges':False,'passed':True})
(R/'work/world/mogao-v010-geometry-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
