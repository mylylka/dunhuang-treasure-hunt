"""Repair only the entrance ceiling, keeping previous sources and every collider intact."""
import bpy,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v010';O=R/'public/assets/world/mogao/v010'
for p in (D,O):p.mkdir(parents=True,exist_ok=True)
old=[R/'public/assets/world/mogao/v007/entry.glb',*[R/f'public/assets/world/mogao/v009/{n}.glb' for n in ['interior','buddha','mountain']],R/'art-source/world/models/mogao/v009/buddha-hall.blend']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();protected={str(p.relative_to(R)):sha(p) for p in old}
bpy.ops.wm.open_mainfile(filepath=str(old[-1]));bpy.context.preferences.filepaths.save_version=0
# Export exactly the previously shipped nodes, not hidden construction cutters
# that share the source file's semantic tag.
raw=(R/'public/assets/world/mogao/v009/interior.glb').read_bytes()
doc=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
names={n['name'] for n in doc['nodes'] if 'mesh' in n}
interior=[bpy.data.objects[n] for n in names]
old_roof=bpy.data.objects['extended-tunnel-ceiling'];interior.remove(old_roof)
old_roof.hide_render=True;old_roof.hide_set(True);old_roof['constructionOnly']=True
# One continuous slab replaces both old ceiling pieces; no seam at y=3.1.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,2.2,6.4));roof=bpy.context.object;roof.name='continuous-tunnel-ceiling-v010';roof.dimensions=(6.6,9.6,.24)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);roof.data.materials.append(bpy.data.materials['cave-plaster']);roof['semanticGroup']='mogao-v010-interior';interior.append(roof)
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(old[0]));entry=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
head=next(o for o in entry if o.name.startswith('passage-head-v007'));entry.remove(head);head.hide_render=True;head.hide_set(True);head['constructionOnly']=True
screen=next(o for o in entry if o.name.startswith('tower-interior-screen-v007'))
F=6.85546875
bottom=min((screen.matrix_world@v.co).z for v in screen.data.vertices)
assert abs(bottom-(F+6.28))<.001,bottom
# The screen's underside used to coincide with the visible old ceiling at 6.28m.
# Its lower edge now terminates above the slab. Do not move the roof or doorway.
inv=screen.matrix_world.inverted()
for v in screen.data.vertices:
 p=screen.matrix_world@v.co
 if abs(p.z-bottom)<.001:p.z=F+6.52;v.co=inv@p
screen.data.update()
def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(O/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_apply=True)
export('interior',interior);export('entry',entry)
# Align the reference entry to the interior's local floor only AFTER GLB export.
for o in entry:o.location.z-=F;o.hide_render=False
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'entrance-repair.blend'))
assert all(sha(R/f)==s for f,s in protected.items())
report={'originalsUnchanged':True,'originalHashes':protected,'cause':'old screen underside and passage ceiling both at F+6.28; new/old ceiling also had a joint at y=3.1','ceiling':{'bottom':6.28,'top':6.52,'fromY':-2.6,'toY':7,'pieces':1},'screenBottom':6.52,'collisionChanges':False,'UVAndTextures':'retained; repaired roof plain plaster','exports':{n:{'bytes':(O/(n+'.glb')).stat().st_size,'sha256':sha(O/(n+'.glb'))} for n in ['entry','interior']}}
(D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
