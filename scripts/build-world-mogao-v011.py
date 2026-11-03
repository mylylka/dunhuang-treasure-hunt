"""Local porch seam repair and a watertight stair profile. Preserve shipped versions."""
import bpy,json,hashlib,bmesh
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v011';O=R/'public/assets/world/mogao/v011';F=6.85546875
for p in (D,O):p.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=[R/'public/assets/world/mogao/v010/entry.glb',R/'public/assets/world/mogao/v009/mountain.glb',R/'public/assets/world/mogao/v010/interior.glb',R/'public/assets/world/mogao-massing/v003/tower.glb']
protected={str(p.relative_to(R)):sha(p) for p in old}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
def load(p):
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(p));bpy.context.view_layer.update()
 return [o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
entry=load(old[0]);mountain=load(old[1]);rock=next(o for o in mountain if o.name=='mountain-sandstone-low')
# The broad rock recess floor coincides with the porch. Lower only its existing
# horizontal floor vertices under the plinth. UV, textures and outer silhouette stay.
changed=[];inv=rock.matrix_world.inverted()
for v in rock.data.vertices:
 p=rock.matrix_world@v.co
 if abs(p.z-F)<.009 and -12.7<p.x<12.7 and -10.4<p.y<3.3:
  changed.append([v.index,list(p)]);p.z=F-.12;v.co=inv@p
rock.data.update();assert changed,'Expected the coincident recess floor vertices'
# Rebuild the same 30 visible treads as one closed extruded profile. Stacked
# boxes left 30 coplanar sides; internal faces must not be part of an export.
old_stairs=next(o for o in entry if o.name=='central-ceremonial-stairs');entry.remove(old_stairs);old_stairs.hide_render=True;old_stairs.hide_set(True);old_stairs['constructionOnly']=True
profile=[(-29,0)]
for i in range(30):
 front=-29+19*i/30;back=min(-10.2,-29+19*(i+1)/30);height=F*(i+1)/30
 profile.extend([(front,height),(back,height)])
profile.append((-10.2,0));n=len(profile)
vertices=[(x,y,z) for x in [-5.2,5.2] for y,z in profile]
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
for i in range(n):j=(i+1)%n;faces.append((i,j,n+j,n+i))
mesh=bpy.data.meshes.new('stair-profile-v011');mesh.from_pydata(vertices,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
stairs=bpy.data.objects.new('central-ceremonial-stairs-v011',mesh);bpy.context.collection.objects.link(stairs);stairs.data.materials.append(old_stairs.data.materials[0]);entry.append(stairs)
# Finish the passage floor at the plinth cut, instead of projecting over the
# last steps. Its material stays the existing plain stone.
passage=next(o for o in entry if o.name=='passage-floor-v007');inv=passage.matrix_world.inverted()
for v in passage.data.vertices:
 p=passage.matrix_world@v.co
 if p.y< -9:p.y=-9
 if p.z>F:p.z=F
 v.co=inv@p
passage.data.update()
for o in entry:o['semanticGroup']='mogao-entry-v011'
def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(O/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_apply=True)
export('entry',entry);export('mountain',mountain)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'porch-and-stairs.blend'))
assert all(sha(R/p)==h for p,h in protected.items())
report={'originalsUnchanged':True,'originalHashes':protected,'recessFloorVerticesLowered':len(changed),'recessFloorBefore':F,'recessFloorAfter':F-.12,'changes':['one closed 30-tread stair profile; no stacked coplanar sides','stair rear ends at plinth front, y=-10.2','passage floor begins at plinth cut y=-9; same floor height'],'UVAndTextures':'existing rock UV and all baked textures retained; plain stair material retained','stairs':{'front':-29,'back':-10.2,'width':10.4,'rise':F,'steps':30},'playerCollidersChanged':False,'mainEntranceChanged':False,'exports':{n:{'bytes':(O/(n+'.glb')).stat().st_size,'sha256':sha(O/(n+'.glb'))} for n in ['entry','mountain']}}
(D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
