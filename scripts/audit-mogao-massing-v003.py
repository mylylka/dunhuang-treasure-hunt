import bpy,bmesh,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/world/models/mogao-massing/v003/mogao-massing.blend'))
mass=bpy.data.objects['mountain-continuous-union'];bm=bmesh.new();bm.from_mesh(mass.data)
boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges)
mass.data.calc_loop_triangles()
report={'boundaryEdges':boundary,'nonManifoldEdges':nonmanifold,'triangles':len(mass.data.loop_triangles),'constructionProfiles':[o.name for o in bpy.data.objects if o.get('authoredProfiles')],'runtimeMaterials':[m.name for m in mass.data.materials]}
bm.free();assert boundary==0 and nonmanifold==0,report
assert len(report['constructionProfiles'])==6,report
(R/'work/world/mogao-massing-v003-geometry-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
