"""Remove the annotated first-floor porch pillar from a new editable/exported copy.

blender -b --python-exit-code 1 --python scripts/build-world-music-interior-v002.py
The v001 source and GLB are read-only inputs and remain available unchanged.
"""
import bpy, bmesh, hashlib, json
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/music-interior/v001/music-pavilion.blend'
OLD_GLB=ROOT/'public/assets/world/music-interior/v001/music-pavilion.glb'
DEST=ROOT/'art-source/world/models/music-interior/v002'
OUT=ROOT/'public/assets/world/music-interior/v002'
for p in (DEST,OUT): p.mkdir(parents=True,exist_ok=True)
old_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (SOURCE,OLD_GLB)}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version=0

def parts(obj):
    parents=list(range(len(obj.data.vertices)))
    def find(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]];i=parents[i]
        return i
    for edge in obj.data.edges:
        a,b=map(find,edge.vertices);parents[a]=b
    out={}
    for vertex in obj.data.vertices: out.setdefault(find(vertex.index),[]).append(vertex)
    return out.values()

def component_bounds(obj, vertices):
    points=[obj.matrix_world@v.co for v in vertices]
    points=[(p.x+46,p.z,-p.y-9) for p in points]
    return ([min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)])

# Each component has exact independently authored bounds. These broad guards
# include the middle first-floor pillar only and reject all adjacent beams.
expected={'porch--stone':1,'porch--wood':1,'porch--ochre':1,'porch--teal':2,'porch--wood-light':2}
removed=Counter(); records=[]
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or obj.name not in expected or obj.get('semanticGroup')!='porch': continue
    selected=[]
    for vertices in parts(obj):
        lo,hi=component_bounds(obj,vertices)
        if lo[0]>=38.3 and hi[0]<=41.1 and lo[2]>=-18.65 and hi[2]<=-16.9 and lo[1]>=1.5 and hi[1]<=7.5:
            selected.extend(v.index for v in vertices);removed[obj.name]+=1
            records.append({'mesh':obj.name,'min':[round(x,6) for x in lo],'max':[round(x,6) for x in hi]})
    if selected:
        bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[bm.verts[i] for i in selected],context='VERTS');bm.to_mesh(obj.data);bm.free();obj.data.update()
assert dict(removed)==expected,(dict(removed),expected)
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.get('excludeV4') and not o.get('excludeV5')]
bpy.ops.object.select_all(action='DESELECT')
for obj in objects: obj.hide_set(False);obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'music-pavilion.blend'))
graph=bpy.context.evaluated_depsgraph_get();batches={}
for obj in objects:
    data=bpy.data.meshes.new_from_object(obj.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
    copy=bpy.data.objects.new('export-'+obj.name,data);bpy.context.collection.objects.link(copy)
    copy.matrix_world=obj.matrix_world.copy();group=obj.get('semanticGroup','architecture');copy['semanticGroup']=group
    batches.setdefault((group,tuple(m.name for m in data.materials)),[]).append(copy);obj.select_set(False)
exported=[]
for (group,materials),items in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in items: obj.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1: bpy.ops.object.join()
    obj=bpy.context.object;obj.name=group+'--'+materials[0];exported.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in exported:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'music-pavilion.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True)
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in old_hashes.items()),'Source modified'
manifest={'version':'music-interior-v002','source':str(SOURCE.relative_to(ROOT)),'runtimeAsset':'music-interior/v002/music-pavilion.glb','runtimeOrigin':[46,0,-9], 'removedFirstFloorColumnCenter':[39.6925,-17.8], 'removedComponents':records,'protectedSourceHashes':old_hashes,'newGlbSha256':hashlib.sha256((OUT/'music-pavilion.glb').read_bytes()).hexdigest()}
(DEST/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('COLUMN_REMOVAL_COMPLETE',len(records),manifest['newGlbSha256'])
