"""Bounded replacement of one soft Tripo rock and adjacent sandstone framing.
Authored profiles, planar masses and small chamfers. No noise/global remesh.
"""
import bpy,bmesh,json,math,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao/v005';O=R/'public/assets/world/mogao/v005';W=R/'work/world'
D.mkdir(parents=True,exist_ok=True);O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/world/models/mogao/v004/mogao.blend'));bpy.context.preferences.filepaths.save_version=0
cliff=bpy.data.objects['user-cliff-facade'];floor=6.85546875
source_bvh=BVHTree.FromObject(cliff,bpy.context.evaluated_depsgraph_get())
source_mesh=cliff.data.copy()
source_vertices=[tuple(v.co) for v in source_mesh.vertices]
# Convex, hand-authored outlines follow the original stones rather than a box.
regions=[
 ('large-rock',[(-38.1,3.5),(-35.4,2.2),(-31.4,1.45),(-27.7,2.2),(-25.4,3.7),(-25.45,7.9),(-26.2,10.1),(-29,10.65),(-35.7,10.4),(-38,9.6),(-38.6,6)],-10.5),
 ('horizontal-ledge',[(-35.6,18.45),(-28.1,18.3),(-21.25,18.45),(-21.1,20.7),(-22,21.35),(-29.1,21.2),(-34.5,21.3),(-35.5,20.9)],-15.3),
 ('right-jamb',[(-25.4,11),(-22.1,10.7),(-21.35,11.1),(-21.1,16.9),(-21.7,18.15),(-24.7,18.2),(-25.35,17.8)],-15.1),
 ('left-jamb',[(-35.5,12.8),(-32.1,12.65),(-31.5,13.1),(-31.55,18.15),(-34.6,18.2),(-35.3,17.8)],-15.1)
]
def halfplanes(region):
 name,poly,back=region;out=[(Vector((0,-1,0)),-back)]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  dx=b[0]-a[0];dz=b[1]-a[1]
  # Cross(edge, point-a) >= 0 is the inside of a CCW outline.
  out.append((Vector((-dz,0,dx)), -dz*a[0]+dx*(a[1]-floor)))
 return out
def in_region(v,margin=0):
 v=Vector(v)
 return any(all(n.dot(v)>=d-margin*n.length for n,d in halfplanes(r)) for r in regions)
# Isolate the identified timber railing component before any stone boolean.
# Its lower support is interpenetrating the old lintel, so position alone is
# insufficient to distinguish the two materials in the fused Tripo mesh.
adj={i:[] for i in range(len(source_mesh.vertices))}
for e in source_mesh.edges:
 a,b=e.vertices;adj[a].append(b);adj[b].append(a)
seed=min(range(len(source_vertices)),key=lambda i:(Vector(source_vertices[i])-Vector((-24.2285,-16.1309,15.293))).length)
wood=set();todo=[seed]
while todo:
 i=todo.pop()
 if i in wood:continue
 wood.add(i);todo.extend(j for j in adj[i] if j not in wood)
assert len(wood)==44, f'Timber selection changed unexpectedly: {len(wood)}'
def copy_faces(name,polys):
 ids=sorted({i for p in polys for i in p.vertices});mapping={v:i for i,v in enumerate(ids)}
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([source_vertices[i] for i in ids],[],[[mapping[i] for i in p.vertices] for p in polys]);mesh.update()
 for m in source_mesh.materials:mesh.materials.append(m)
 for layer in source_mesh.uv_layers:
  dest=mesh.uv_layers.new(name=layer.name);dest.active_render=layer.active_render
  for a,b in zip(mesh.polygons,polys):
   for il,jl in zip(a.loop_indices,b.loop_indices):dest.data[il].uv=layer.data[jl].uv
 normals=[]
 for a,b in zip(mesh.polygons,polys):
  a.material_index=b.material_index;a.use_smooth=b.use_smooth
  normals.extend([tuple(source_mesh.corner_normals[i].vector) for i in b.loop_indices])
 mesh.uv_layers.active_index=source_mesh.uv_layers.active_index;mesh.normals_split_custom_set(normals)
 return mesh
wood_polys=[p for p in source_mesh.polygons if p.vertices[0] in wood]
wood_mesh=copy_faces('protected-original-timber',wood_polys)
protected=bpy.data.objects.new('protected-timber-retained-v005',wood_mesh);bpy.context.collection.objects.link(protected);protected['semanticGroup']='user-cliff';retained=[protected]
cliff.data=copy_faces('source-rock-with-protected-timber-isolated',[p for p in source_mesh.polygons if p.vertices[0] not in wood])
# Clip only the exterior polygons inside each edit volume. This surface method
# does not assume the fused source is a watertight, consistently wound solid;
# unlike a boolean, it cannot manufacture a new cap in front of the cave frame.
# Each clip intersection interpolates the original UVs and corner normals.
def split_polygon(poly,n,d):
 inside=[];outside=[]
 for i,a in enumerate(poly):
  b=poly[(i+1)%len(poly)];da=n.dot(a[0])-d;db=n.dot(b[0])-d
  (inside if da>=0 else outside).append(a)
  if (da<0 and db>0) or (da>0 and db<0):
   t=da/(da-db);v=(a[0].lerp(b[0],t),[u.lerp(v,t) for u,v in zip(a[1],b[1])],a[2].lerp(b[2],t).normalized(),None)
   inside.append(v);outside.append(v)
 return inside,outside
def subtract(poly,region):
 planes=halfplanes(region)
 if any(all(n.dot(v[0])<=d for v in poly) for n,d in planes):return [poly]
 pending=poly;result=[]
 for n,d in planes:
  if len(pending)<3:break
  pending,outside=split_polygon(pending,n,d)
  if len(outside)>=3:result.append(outside)
 return result
vertices=list(source_vertices);faces=[];attrs=[];unchanged=0;clipped=0
for p in source_mesh.polygons:
 if p.vertices[0] in wood:continue
 poly=[(source_mesh.vertices[l.vertex_index].co.copy(),[u.data[l.index].uv.copy() for u in source_mesh.uv_layers],source_mesh.corner_normals[l.index].vector.copy(),l.vertex_index) for l in [source_mesh.loops[i] for i in p.loop_indices]]
 fragments=[poly]
 for region in regions:fragments=[f for fragment in fragments for f in subtract(fragment,region)]
 if len(fragments)==1 and len(fragments[0])==len(poly) and all(a[3]==b[3] for a,b in zip(poly,fragments[0])):unchanged+=1
 else:clipped+=1
 for fragment in fragments:
  ids=[]
  for pos,uv,n,idx in fragment:
   if idx is None:idx=len(vertices);vertices.append(tuple(pos))
   ids.append(idx)
  if len(set(ids))>=3:faces.append(ids);attrs.append((p,fragment))
mesh=bpy.data.meshes.new('locally-clipped-original-skin');mesh.from_pydata(vertices,[],faces);mesh.update()
for m in source_mesh.materials:mesh.materials.append(m)
for layer_index,layer in enumerate(source_mesh.uv_layers):
 dest=mesh.uv_layers.new(name=layer.name);dest.active_render=layer.active_render
 for p,(_,fragment) in zip(mesh.polygons,attrs):
  for li,v in zip(p.loop_indices,fragment):dest.data[li].uv=v[1][layer_index]
normals=[]
for p,(old,fragment) in zip(mesh.polygons,attrs):
 p.material_index=old.material_index;p.use_smooth=old.use_smooth;normals.extend(tuple(v[2]) for v in fragment)
mesh.uv_layers.active_index=source_mesh.uv_layers.active_index;mesh.normals_split_custom_set(normals);cliff.data=mesh
# Ray samples provide exact contact positions and source albedo at the seam.
# The interior is a new authored surface; the source triangles were clipped out.
source_mesh.calc_loop_triangles();triangles=list(source_mesh.loop_triangles)
bvh=BVHTree.FromPolygons(source_vertices,[t.vertices[:] for t in triangles],all_triangles=True)
uvlayer=next(u for u in source_mesh.uv_layers if u.active_render)
tex=next(n.image for n in source_mesh.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
w,h=tex.size;pixels=np.array(tex.pixels[:],dtype=np.float32).reshape(h,w,4)
# Byte-image pixels are raw sRGB; vertex colors require linear-light values.
pixels[:,:,:3]=np.where(pixels[:,:,:3]<=.04045,pixels[:,:,:3]/12.92,((pixels[:,:,:3]+.055)/1.055)**2.4)
base=Vector((.53,.38,.19))
def sample(x,z):
 loc,normal,idx,_=bvh.ray_cast(Vector((x,-45,z-floor)),Vector((0,1,0)))
 if loc is None:return -17,base.copy()
 t=triangles[idx];uvs=[uvlayer.data[i].uv for i in t.loops]
 uv=barycentric_transform(loc,*[Vector(source_vertices[i]) for i in t.vertices],*[Vector((u.x,u.y,0)) for u in uvs])
 c=Vector(pixels[int((uv.y%1)*(h-1)),int((uv.x%1)*(w-1)),:3])
 return loc.y,c
mat=bpy.data.materials.new('sandstone-local-vertex-albedo-v005');mat.use_nodes=True;mat.node_tree.nodes.clear()
bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');attr=mat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='stone-color'
mat.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color']);mat.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
bs.inputs['Roughness'].default_value=.96;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.25
pieces=[];profiles=[]
def clip2(poly,a,b):
 out=[]
 def d(v):return (b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0])
 for p,q in zip(poly,poly[1:]+poly[:1]):
  dp,dq=d(p),d(q)
  if dp>=-1e-8:out.append(p)
  if dp*dq<0:
   t=dp/(dp-dq);out.append((p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])))
 return out

def bed_height(x):
 profile=[(-38.6,3.8),(-35.8,4.32),(-32.2,4.18),(-30,4.57),(-28.4,4.46),(-25.25,4.95)]
 for a,b in zip(profile,profile[1:]):
  if x<=b[0]:return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])
 return profile[-1][1]
def surface(region,xs,zs,depth,feather):
 name,outline,back=region;verts=[];faces=[];colors=[];mapping={}
 for j in range(len(zs)-1):
  for i in range(len(xs)-1):
   # A single slanted bed line crosses the large stone, not a uniform brick grid.
   def zval(x,z):return z+(bed_height(x)-4.3 if name=='large-rock' and 3.7<z<5.3 else 0)
   poly=[(xs[i],zval(xs[i],zs[j])),(xs[i+1],zval(xs[i+1],zs[j])),(xs[i+1],zval(xs[i+1],zs[j+1])),(xs[i],zval(xs[i],zs[j+1]))]
   for a,b in zip(outline,outline[1:]+outline[:1]):
    poly=clip2(poly,a,b)
    if len(poly)<3:break
   if len(poly)<3:continue
   ids=[]
   for x,z in poly:
    key=(round(x,7),round(z,7))
    if key not in mapping:
     y,c=sample(x,z)
     dist=min(((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]))/math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(outline,outline[1:]+outline[:1]))
     t=max(0,min(1,dist/feather));target=depth(x,z)
     # Trim into the existing mass only: a local plane must never inflate a
     # recessed part of the old rock into a rectangular projecting facade.
     recession=max(0,target-y);target=max(y,target)
     color_weight=t*max(0,min(1,recession/.32))
     mapping[key]=len(verts);verts.append((x,y*(1-t)+target*t-.008*(1-t),z-floor));colors.append(tuple(c.lerp(base,color_weight)))
    if not ids or ids[-1]!=mapping[key]:ids.append(mapping[key])
   if len(set(ids))>=3:faces.append(ids)
 mesh=bpy.data.meshes.new(name+'-authored-surface');mesh.from_pydata(verts,[],faces);mesh.update()
 layer=mesh.color_attributes.new(name='stone-color',type='FLOAT_COLOR',domain='POINT')
 for a,c in zip(layer.data,colors):a.color=(*c,1)
 # Planar quads remain broad coherent surfaces; no triangulation noise added.
 for p in mesh.polygons:p.use_smooth=False
 o=bpy.data.objects.new('sandstone-'+name+'-v005',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o['semanticGroup']='local-sandstone-v005';pieces.append(o);profiles.append({'name':name,'outlineXZ':outline,'seamWidth':feather,'vertices':len(verts)})

def mass(x,z):
 # One thick mass, cut along five unequal planes. The existing horizontal
 # rock shelf above supplies the stratum; no carved stripe across this boulder.
 face=max(-20.75-.29*(x+32)+.05*(z-6.6),-20.75+.25*(x+32)-.14*(z-6.6),-21.0-.15*(x+32)-.25*(z-5))
 return max(face,-20.7-.8*(x+35.9)+.08*(z-6),-20.7+.85*(x+27.9)-.15*(z-5),-20.7+1.2*(z-8.8)+.12*(x+32))
surface(regions[0],[-38.6,-38.15,-37.65,-36.4,-35.8,-34.5,-32.2,-30,-28.4,-27.2,-26.3,-25.8,-25.25],[.4,.9,1.5,2.3,3.8,5.2,6.3,7.6,8.5,9.1,9.8,10.3,10.65],mass,.65)
surface(regions[1],[-35.6,-35.3,-34.8,-33.4,-30,-27,-24.3,-22,-21.5,-21.1],[18.3,18.55,18.8,19.3,20.7,21.05,21.35],lambda x,z:max(-16.75+.02*(x+28)+.02*(z-20),-16.75+1.4*(z-20.9),-16.75-1.4*(z-18.7)),.3)
surface(regions[2],[-25.4,-25.1,-24.7,-23,-21.9,-21.45,-21.1],[10.7,11.1,11.5,13,15,17.4,17.85,18.2],lambda x,z:max(-16.4+.025*(z-14),-16.4-1.0*(x+24.7),-16.4+.8*(x+21.9)),.3)
surface(regions[3],[-35.5,-35.15,-34.8,-33.4,-32,-31.75,-31.5],[12.65,12.95,13.3,15,17.4,17.8,18.2],lambda x,z:max(-16.6-.018*(z-15),-16.6-1.0*(x+34.8),-16.6+.85*(x+32)),.3)
# Source geometry outside the bounded skins remains geometrically identical.
source_used={i for p in source_mesh.polygons for i in p.vertices}
old_set={tuple(round(c,5) for c in v) for i,v in enumerate(source_vertices) if i in source_used and not in_region(v,.002)}
new_used={i for p in cliff.data.polygons for i in p.vertices}
new_set={tuple(round(c,5) for c in v.co) for i,v in enumerate(cliff.data.vertices) if i in new_used}
new_set.update(tuple(round(c,5) for c in v.co) for v in protected.data.vertices)
missing=old_set-new_set
assert not missing, f'Unexpected change outside local skin: {len(missing)} vertices'
cliff['localStudy']='v005: only bounded west sandstone skins; source timber/openings untouched'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao.blend'))
grounds=[o for o in bpy.context.scene.objects if o.get('semanticGroup') in ['region-ground','rock-foot-sand'] and not o.hide_render];assert len(grounds)==2
items=[]
for originals in [[cliff]+retained,pieces,grounds]:
 bpy.ops.object.select_all(action='DESELECT');copies=[]
 for src in originals:
  cp=bpy.data.objects.new('export-'+src.name,src.data.copy());bpy.context.collection.objects.link(cp);cp.matrix_world=src.matrix_world.copy();cp.select_set(True);copies.append(cp)
 bpy.context.view_layer.objects.active=copies[0]
 if len(copies)>1:bpy.ops.object.join()
 items.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT');tris=0;counts={}
for o in items:o.select_set(True);o.data.calc_loop_triangles();counts[o.name]=len(o.data.loop_triangles);tris+=len(o.data.loop_triangles)
f=O/'exterior.glb';bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=95)
report={'source':'v004/mogao.blend','method':'Bounded polygon skin removal and four connected hand-authored surfaces: broad sandstone planes, a horizontal ledge, fixed ray-sampled seams. No global remesh/noise/decimation.','regions':regions,'profiles':profiles,'sourceFacesUnchanged':unchanged,'sourceFacesClippedOrRemoved':clipped,'protectedTimberVertices':len(wood),'preservedOutsideVertices':len(old_set),'missingOutsideVertices':len(missing),'uv':'Retained original faces preserve both UV layers; intersections interpolate UVs. Four new local surfaces use a shared matte vertex-color material, original albedo sampled at the seam and plain sandstone on new planes.','texture':'Original v004 color master unchanged','exteriorTriangles':tris,'triangleBatches':counts,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'protected':'Original main entrance, steps, recessed timber, railings, interior, collision and sand retained'}
(D/'export-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['profiles','regions']}))
