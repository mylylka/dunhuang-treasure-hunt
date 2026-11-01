"""Real saved geometry and immutable prior versions, not renderer screenshots alone."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/music-pavilion/v004/music-pavilion.blend'))
checks=[]
for obj in bpy.data.objects:
 if not obj.name.startswith('v004-octagonal-openwork'):continue
 xs=[v.co.x for v in obj.data.vertices];width=max(xs)-min(xs);cols=max(2,round(width/.82));x=-width/2+width/cols*.5
 assert not obj.ray_cast(Vector((x,-1,-.4)),Vector((0,1,0)))[0],obj.name
 assert obj.ray_cast(Vector((x,-1,0)),Vector((0,1,0)))[0],obj.name
 assert abs(max(v.co.z for v in obj.data.vertices)-min(v.co.z for v in obj.data.vertices)-1.6)<.0001
 checks.append(obj.name)
assert len(checks)==44
protected=json.loads((ROOT/'art-source/world/music-pavilion/v002/protected-assets.json').read_text())
protected.update({'public/assets/world/music-pavilion/v003/music-pavilion.glb':'aa074058c06f47e1f1e8dcd8df1ef7ce4e7dd84c5c4464217c89b9c749a1309b','src/content/world/music-pavilion-layout-v003.json':'16a44d5ce876983dd290e2c49b68f39b7e1d1676e2a9a497fbdd0e2911aa79e5','public/assets/world/flying-voice/v001/flying-question-native.mp3':'2f1ed658e2f226e508d06041d482858dd61eb43f92a9a2a20b3eb7afecac0839'})
for path,sha in protected.items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==sha,path
layout=json.loads((ROOT/'src/content/world/music-pavilion-layout-v004.json').read_text());m=layout['mural']
assert abs(m['width']/m['height']-4/3)<1e-7
assert m['width']*m['height']>=2*7.6*5.7
assert m['center'][1]-m['height']/2-layout['platform']['height']<.16
# Roof closures must still join the enlarged elevations on every exposed side.
closures=[BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(f.vertices) for f in o.data.polygons]) for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('roof-wall-closure')]
def transformed(x,y,z):
 q=Vector(((x-18)*layout['buildingScale'],-3-z,y*layout['buildingScale']+layout['buildingLift']))
 split=layout['rightWing']['splitLocal']
 if q.x>split:q.x=split+(q.x-split)*layout['rightWing']['factor']
 return q
rays=0
for side in (-1,1):
 for z in (-21,-19,-17,-15,-12.2):
  t=abs(z+17)/6.1;y=max(8.65,8.6+2*(1-t)**1.7+.2*t**6+.3*(8/8.9)**10*t*t-.22)
  assert any(tree.ray_cast(transformed(18+side*30,y,z),Vector((-side,0,0)),90)[0] is not None for tree in closures)
  rays+=1
for z,direction in ((-40,Vector((0,-1,0))),(10,Vector((0,1,0)))):
 for x in (10.5,14,18,22,25.5):
  assert any(tree.ray_cast(transformed(x,8.55 if z>0 else 8.7,z),direction,90)[0] is not None for tree in closures)
  rays+=1
report={'passed':True,'roofClosureRays':rays,'actualOpenworkPanels':len(checks),'protectedAssetsUnchanged':len(protected),'muralBottomGap':m['center'][1]-m['height']/2-layout['platform']['height'],'muralAreaRatio':m['width']*m['height']/(7.6*5.7)}
(ROOT/'work/world/music-pavilion-v004-model-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
