"""Inspect saved Blender geometry, not a separate analytic stand-in."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/music-pavilion/v003/music-pavilion.blend'))
scene=bpy.context.scene;graph=bpy.context.evaluated_depsgraph_get()
closures=[]
for obj in scene.objects:
    if obj.type=='MESH' and obj.name.startswith('roof-wall-closure'):
        closures.append((obj.name,BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])))
def cast(origin,direction):
    # Test the saved closure itself, so an outside rafter cannot conceal a gap.
    hits=[]
    for name,tree in closures:
        location,normal,index,distance=tree.ray_cast(origin,direction,35)
        if location is not None:hits.append((distance,name))
    return min(hits)[1] if hits else None
def p(x,y,z):return Vector((x-18,-3-z,y))
checks=[]
for side in (-1,1):
    for z in (-21,-19,-17,-15,-12.2):
        t=abs(z+17)/6.1;y=max(8.65,8.6+2*(1-t)**1.7+.2*t**6+.3*(8/8.9)**10*t*t-.22)
        origin=p(18+side*30,y,z);direction=Vector((-side,0,0))
        name=cast(origin,direction)
        assert name,(side,z,y)
        checks.append({'side':side,'z':z,'height':y,'hit':name})
for z,direction in ((-40,Vector((0,-1,0))),(10,Vector((0,1,0)))):
    for x in (10.5,14,18,22,25.5):
        name=cast(p(x,8.55 if z>0 else 8.7,z),direction)
        assert name,(x,z)
        checks.append({'frontBack':z,'x':x,'hit':name})
result={'passed':True,'actualSavedMeshRays':len(checks),'checks':checks}
(ROOT/'work/world/music-pavilion-v003-model-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':True,'actualSavedMeshRays':len(checks)}))
