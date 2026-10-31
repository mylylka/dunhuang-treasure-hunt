"""Extract the accepted central Blender dune between its existing valley floors.
No procedural ridge is generated or sculpted here. Original crest vertices stay
byte-for-byte equal in local space; only a closed underside is added.
"""
from pathlib import Path
import bpy, json, hashlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-pavilion/v002'
OUT=ROOT/'public/assets/world/music-pavilion/v002'
original=ROOT/'art-source/world/models/environment-sample/v002/dunes.blend'
layout_path=ROOT/'src/content/world/music-pavilion-layout-v002.json'
layout=json.loads(layout_path.read_text())
bpy.ops.wm.open_mainfile(filepath=str(original))
bpy.context.preferences.filepaths.save_version=0
old=bpy.data.objects['dune-landscape']
indices=[row*46+col for row in range(41) for col in range(15,31)]
mapping={index:i for i,index in enumerate(indices)}
verts=[tuple(old.data.vertices[i].co) for i in indices]
faces=[tuple(mapping[i] for i in p.vertices) for p in old.data.polygons if all(i in mapping for i in p.vertices)]
edges={}
for face in faces:
    for a,b in zip(face,face[1:]+face[:1]):edges[tuple(sorted((a,b)))]=edges.get(tuple(sorted((a,b))),0)+1
bottom={}
for a,b in list(edges):
    if edges[(a,b)]!=1:continue
    for i in (a,b):
        if i not in bottom:bottom[i]=len(verts);verts.append((verts[i][0],verts[i][1],-.8))
    faces.append((a,b,bottom[b],bottom[a]))
center=len(verts);verts.append((0,0,-.8))
for (a,b),count in edges.items():
    if count==1:faces.append((center,bottom[a],bottom[b]))
mesh=bpy.data.meshes.new('accepted-central-dune');mesh.from_pydata(verts,[],faces);mesh.update()
mesh.materials.append(old.data.materials[0].copy())
obj=bpy.data.objects.new('accepted-central-dune',mesh)
# Keep only the extracted object in the new source scene, without deleting any
# file or saving over the original scene.
scene=bpy.data.scenes.new('music-route-dune-v002');scene.collection.objects.link(obj);bpy.context.window.scene=scene
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for p in mesh.polygons:p.use_smooth=False
SOURCE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'route-dune.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'route-dune.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=False)
pos=layout['dune']['position'];scale=layout['dune']['scale']
def world(v):return [pos[0]+v[0]*scale[0],pos[1]+v[2]*scale[1],pos[2]-v[1]*scale[2]]
border=[world(verts[row*16]) for row in range(41)]+[world(verts[row*16+15]) for row in range(40,-1,-1)]
layout['dune']['footprint']=[[v[0],v[2]] for v in border]
layout['dune']['cameraBoxes']=[]
for row in range(40):
    points=[world(v) for v in verts[row*16:(row+2)*16]]
    lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
    if hi[1]>.2:layout['dune']['cameraBoxes'].append({'min':[lo[0],-.8,lo[2]],'max':hi})
layout_path.write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n')
mesh.calc_loop_triangles()
manifest={'source':str(original.relative_to(ROOT)),'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
    'method':'Original central bank columns 15..30 of 46, all 41 rows; existing vertex positions preserved; closed underside added',
    'triangles':len(mesh.loop_triangles),'sha256':hashlib.sha256((OUT/'route-dune.glb').read_bytes()).hexdigest(),
    'placement':layout['dune'],'originalSurfaceVertices':len(indices)}
(SOURCE/'route-dune-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'triangles':manifest['triangles'],'vertices':len(indices)}))
