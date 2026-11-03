"""Approved v003 silhouette -> restrained surface sculpt, UVs and Cycles bake.
Independent version. No random crest generation, full-mountain remesh, or map edits.
Blender -b -t 4 --python-exit-code 1 --python ... -- --stage shape|bake|render
"""
import bpy,bmesh,math,json,hashlib,argparse,sys,shutil
import numpy as np
from pathlib import Path
from mathutils import Vector,noise
R=Path(__file__).resolve().parents[1];D=R/'art-source/world/models/mogao-sandstone/v001';O=R/'public/assets/world/mogao-sandstone/v001';W=R/'work/world'
for p in (D,O,W):p.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--stage',choices=['shape','bake','refine','render'],default='shape')
opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
old=R/'art-source/world/models/mogao-massing/v003/mogao-massing.blend'
protected_files=[str(old.relative_to(R)),'public/assets/world/mogao-massing/v003/mountain.glb','public/assets/world/mogao-massing/v003/tower.glb','public/assets/world/mogao-massing/v003/foundation.glb','public/assets/world/traveler-tripo/v002/traveler.glb','public/assets/world/mogao/v003/interior.glb','public/assets/world/sandstone-study/v001/sandstone.glb','art-source/world/models/sandstone-study/v001/sandstone.blend']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
protected={p:sha(R/p) for p in protected_files}
ZONES=['near','upper','rear'];RES=[4096,2048,1024];CONTROL_RES=[2048,1024,1024]
def activate(o):
 bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def simple_mat(name):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();p=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs[0],out.inputs['Surface']);p.inputs['Base Color'].default_value=(*rgb('b58a55'),1);p.inputs['Roughness'].default_value=.94;return m
def clone(o,name):
 n=o.copy();n.data=o.data.copy();n.name=name;bpy.context.scene.collection.objects.link(n);n.hide_set(False);n.hide_render=False;return n
def hide(o):o.hide_set(True);o.hide_render=True
def topology(o):
 bm=bmesh.new();bm.from_mesh(o.data);o.data.calc_loop_triangles()
 result={'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),'boundary':sum(e.is_boundary for e in bm.edges),'nonManifold':sum(not e.is_manifold for e in bm.edges)};bm.free();return result

def shape():
 bpy.ops.wm.open_mainfile(filepath=str(old));bpy.context.preferences.filepaths.save_version=0
 original=bpy.data.objects['mountain-continuous-union'];low=clone(original,'mountain-sandstone-low');hide(original)
 print('SOURCE_TOPOLOGY',topology(low),flush=True)
 low['semanticGroup']='mountain';low['previewStage']='baked-material-candidate'
 # Material boundaries are texture allocation regions, not visible strips.
 low.data.materials.clear()
 for name in ZONES:low.data.materials.append(simple_mat('bake-'+name))
 for p in low.data.polygons:
  c=p.center;n=p.normal
  p.material_index=0 if c.z<22 and c.y<12 and n.y<.6 else 1 if c.y<24 and n.y<.6 else 2
 # Unwrap three isolated chart sets, then copy their face-corner UVs back.
 # This avoids UV selection state carried by the saved Blender workspace.
 uv=low.data.uv_layers.new(name='UVMap')
 for zone in range(3):
  source=[p for p in low.data.polygons if p.material_index==zone]
  used=sorted({i for p in source for i in p.vertices});mapping={i:j for j,i in enumerate(used)}
  data=bpy.data.meshes.new('uv-chart-'+ZONES[zone]);data.from_pydata([low.data.vertices[i].co for i in used],[],[[mapping[i] for i in p.vertices] for p in source]);data.update()
  helper=bpy.data.objects.new('construction-uv-'+ZONES[zone],data);bpy.context.scene.collection.objects.link(helper);helper['constructionOnly']=True
  bm=bmesh.new();bm.from_mesh(data);bm.normal_update()
  def chart(f):
   a=max(range(3),key=lambda a:abs(f.normal[a]));return(a,1 if f.normal[a]>0 else -1)
  for e in bm.edges:
   if len(e.link_faces)==2:e.seam=chart(e.link_faces[0])!=chart(e.link_faces[1])
  # Directional charts preserve the large planar faces without inflating
  # long, thin bevel ribbons during angle-based unfolding.
  uvbm=bm.loops.layers.uv.verify()
  for f in bm.faces:
   axis,sign=chart(f);axes=[a for a in range(3) if a!=axis];offset=(axis*2+(sign>0))*1000
   for loop in f.loops:loop[uvbm].uv=(loop.vert.co[axes[0]]+offset,loop.vert.co[axes[1]])
  bm.to_mesh(data);bm.free();activate(helper)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.average_islands_scale();bpy.ops.uv.pack_islands(rotate=True,margin=.004,margin_method='FRACTION');bpy.ops.object.mode_set(mode='OBJECT')
  for dst,src in zip(source,data.polygons):
   for dl,sl in zip(dst.loop_indices,src.loop_indices):uv.data[dl].uv=data.uv_layers.active.data[sl].uv
  hide(helper)
 activate(low);low.data.uv_layers.active=uv
 low.data.calc_loop_triangles();layer=low.data.uv_layers.active.data
 for zone in range(3):
  area=sum(abs((layer[t.loops[1]].uv-layer[t.loops[0]].uv).cross(layer[t.loops[2]].uv-layer[t.loops[0]].uv))*.5 for t in low.data.loop_triangles if t.material_index==zone)
  print('ATLAS_AREA',ZONES[zone],area,flush=True)
  if area<.3:
   bpy.ops.wm.save_as_mainfile(filepath=str(D/'uv-diagnostic.blend'));raise AssertionError('Insufficient UV allocation before surface sampling')
 # Conforming adaptive edge bisection keeps every source triangle and UV chart
 # connected. Split shared edges once, then propagate corners within each face.
 low.data.calc_loop_triangles();uvdata=low.data.uv_layers.active.data
 verts=[v.co.copy() for v in low.data.vertices]
 faces=[(list(t.vertices),[uvdata[i].uv.copy() for i in t.loops],t.material_index,[low.data.corner_normals[i].vector.copy() for i in t.loops]) for t in low.data.loop_triangles]
 sharp={tuple(sorted(e.vertices)) for e in low.data.edges if e.use_edge_sharp}
 for iteration in range(8):
  mids={}
  for ids,uvs,mat,normals in faces:
   for i in range(3):
    a,b=ids[i],ids[(i+1)%3];key=tuple(sorted((a,b)))
    if key not in mids and (verts[a]-verts[b]).length>1.7:
     mids[key]=len(verts);verts.append((verts[a]+verts[b])*.5)
  if not mids:break
  refined=[]
  for ids,uvs,mat,normals in faces:
   splits=[mids.get(tuple(sorted((ids[i],ids[(i+1)%3])))) for i in range(3)]
   count=sum(m is not None for m in splits)
   if count==0:refined.append((ids,uvs,mat,normals));continue
   def add(indices):
    refined.append(([x[0] for x in indices],[x[1] for x in indices],mat,[x[2] for x in indices]))
   corners=list(zip(ids,uvs,normals));middle=[(m,(uvs[i]+uvs[(i+1)%3])*.5,(normals[i]+normals[(i+1)%3]).normalized()) if m is not None else None for i,m in enumerate(splits)]
   if count==1:
    i=next(i for i,m in enumerate(splits) if m is not None);a,b,c=[corners[(i+j)%3] for j in range(3)];m=middle[i]
    add([a,m,c]);add([m,b,c])
   elif count==2:
    i=(next(i for i,m in enumerate(splits) if m is None)+1)%3
    a,b,c=[corners[(i+j)%3] for j in range(3)];m,n=middle[i],middle[(i+1)%3]
    add([a,m,c]);add([m,n,c]);add([m,b,n])
   else:
    a,b,c=corners;m,n,q=middle
    add([a,m,q]);add([m,b,n]);add([q,n,c]);add([m,n,q])
  newsharp=set()
  for a,b in sharp:
   m=mids.get((a,b))
   if m is None:newsharp.add((a,b))
   else:newsharp.update([tuple(sorted((a,m))),tuple(sorted((m,b)))])
  sharp=newsharp;faces=refined
  print('SURFACE_SAMPLING',iteration,len(faces),flush=True)
 mesh=bpy.data.meshes.new('sandstone-sampled-surface');mesh.from_pydata(verts,[],[f[0] for f in faces]);mesh.update()
 for m in low.data.materials:mesh.materials.append(m)
 uv=mesh.uv_layers.new(name='UVMap')
 for poly,(_,corners,mat,_) in zip(mesh.polygons,faces):
  poly.material_index=mat
  for loop,co in zip(poly.loop_indices,corners):uv.data[loop].uv=co
 for e in mesh.edges:e.use_edge_sharp=tuple(sorted(e.vertices)) in sharp
 low.data=mesh
 # Fixed, local surface depressions. No movement around the entry/recess or
 # the highest skyline; the displacement is capped below half a metre.
 patches=[(-43,-10,27,10,8,7,.24),(-31,-7,35,7,7,4,.22),(29,3,32,8,7,6,.24),(-42,9,49,7,8,4,.18),(49,11,22,5,7,4,.20)]
 chips=[(-46,-12,17,2.3,3,1.5,.36),(-28,-8,16,2.0,3,1.3,.34),(34,-4,21,2.4,3,1.5,.38),(49,5,13,2.5,3,1.3,.32)]
 # Short tapering bedding scars, with deliberately different length/slope.
 beds=[(-47,-32,-11,11.7,.10,.16),(-52,-43,-7,22.5,-.08,.12),(22,34,-3,17.3,-.09,.15),(39,50,8,10.4,.06,.13)]
 moves=[];normals=[v.normal.copy() for v in low.data.vertices]
 for v,normal in zip(low.data.vertices,normals):
  p=v.co.copy();depth=0
  if abs(p.x)>15 and p.y<23 and p.z>1 and p.z<54:
   for x,y,z,rx,ry,rz,d in patches+chips:
    q=((p.x-x)/rx)**2+((p.y-y)/ry)**2+((p.z-z)/rz)**2
    if q<1:depth+=d*(1-q)**2
   for xa,xb,y,z,slope,d in beds:
    t=(p.x-xa)/(xb-xa)
    if 0<t<1:
     dz=p.z-(z+slope*(p.x-(xa+xb)/2));depth+=d*math.sin(t*math.pi)**2*math.exp(-(dz/.23)**2-((p.y-y)/5)**2)
  depth=min(depth,.48);v.co-=normal*depth;moves.append(depth)
 low.data.update()
 for p in low.data.polygons:p.use_smooth=True
 # Carry the approved broad-face corner normals through subdivision; otherwise
 # the boolean mesh's long triangulation diagonals become false dark creases.
 low.data.normals_split_custom_set([n for f in faces for n in f[3]])
 report={'low':topology(low),'maxLocalSculptDepth':max(moves),'atlasResolutions':dict(zip(ZONES,RES)),'controlMapResolutions':dict(zip(ZONES,CONTROL_RES)),'protectedAssets':protected}
 print('LOW_TOPOLOGY',report['low'],flush=True)
 assert report['low']['boundary']==0 and report['low']['nonManifold']==0
 (D/'shape-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
 bpy.ops.wm.save_as_mainfile(filepath=str(D/'shape.blend'));print('SHAPE_COMPLETE',json.dumps(report['low']),flush=True)

def surface_material():
 m=bpy.data.materials.new('high-sandstone-minerals');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
 out=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeBsdfPrincipled');l.new(p.outputs[0],out.inputs['Surface'])
 co=n.new('ShaderNodeTexCoord');xyz=n.new('ShaderNodeSeparateXYZ');l.new(co.outputs['Object'],xyz.inputs[0])
 def field(name,scale,stretch,detail=3):
  v=n.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=stretch;l.new(co.outputs['Object'],v.inputs[0])
  t=n.new('ShaderNodeTexNoise');t.name=name;t.inputs['Scale'].default_value=scale;t.inputs['Detail'].default_value=detail;t.inputs['Roughness'].default_value=.7;l.new(v.outputs[0],t.inputs['Vector']);return t
 broad=field('Warm mineral variation',.12,(1,1,1.9));flakes=field('Broken horizontal mineral grain',.85,(.72,.72,3.2));grain=field('Fine sandstone grit',22,(1,1,1),3)
 mix=n.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[0].default_value=.42;l.new(broad.outputs['Fac'],mix.inputs[1]);l.new(flakes.outputs['Fac'],mix.inputs[2])
 ramp=n.new('ShaderNodeValToRGB');ramp.name='Approved sandstone palette';ramp.color_ramp.elements[0].position=.14;ramp.color_ramp.elements[0].color=(*rgb('9e774b'),1);ramp.color_ramp.elements[1].position=.87;ramp.color_ramp.elements[1].color=(*rgb('c7a271'),1)
 e=ramp.color_ramp.elements.new(.48);e.color=(*rgb('b58a55'),1);l.new(mix.outputs[0],ramp.inputs[0])
 grit=n.new('ShaderNodeMapRange');grit.inputs['To Min'].default_value=.76;grit.inputs['To Max'].default_value=1.06;l.new(grain.outputs['Fac'],grit.inputs['Value'])
 color=n.new('ShaderNodeMixRGB');color.blend_type='MULTIPLY';color.inputs[0].default_value=.35;l.new(ramp.outputs[0],color.inputs[1]);l.new(grit.outputs[0],color.inputs[2])
 # Sand dust gathers only at the foot; this is material colour, not sun/shadow.
 dust=n.new('ShaderNodeMapRange');dust.clamp=True;dust.inputs['From Min'].default_value=.15;dust.inputs['From Max'].default_value=2.8;dust.inputs['To Min'].default_value=.45;dust.inputs['To Max'].default_value=0;l.new(xyz.outputs['Z'],dust.inputs['Value'])
 final=n.new('ShaderNodeMixRGB');l.new(dust.outputs[0],final.inputs[0]);l.new(color.outputs[0],final.inputs[1]);final.inputs[2].default_value=(*rgb('d1b27e'),1);l.new(final.outputs[0],p.inputs['Base Color'])
 rough=n.new('ShaderNodeMapRange');rough.inputs['To Min'].default_value=.82;rough.inputs['To Max'].default_value=.98;l.new(grain.outputs['Fac'],rough.inputs['Value']);l.new(rough.outputs[0],p.inputs['Roughness'])
 relief=field('Small broken surface relief',1.6,(1,1,2.0),2.5)
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.5;bump.inputs['Distance'].default_value=.045;l.new(relief.outputs['Fac'],bump.inputs['Height'])
 fine=n.new('ShaderNodeBump');fine.inputs['Strength'].default_value=.3;fine.inputs['Distance'].default_value=.01;l.new(grain.outputs['Fac'],fine.inputs['Height']);l.new(bump.outputs['Normal'],fine.inputs['Normal']);l.new(fine.outputs['Normal'],p.inputs['Normal'])
 ao=n.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=1.8;ao.only_local=True;ao.samples=16
 return m,final.outputs[0],rough.outputs[0],ao.outputs['AO']

def bake_maps(low,high,kind,resolutions,socket=None):
 imgs=[]
 for i,mat in enumerate(low.data.materials):
  im=bpy.data.images.new(f'{ZONES[i]}-{kind}',width=resolutions[i],height=resolutions[i],alpha=False,float_buffer=False);im.colorspace_settings.name='sRGB' if kind=='basecolor' else 'Non-Color'
  # Explicit neutral defaults make atlas padding deterministic.
  im.generated_color=(.5,.5,1,1) if kind=='normal' else (0,0,0,1)
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.nodes.active=node;imgs.append(im)
 mat=high.data.materials[0];n=mat.node_tree.nodes;l=mat.node_tree.links;output=next(n for n in n if n.type=='OUTPUT_MATERIAL');original=output.inputs['Surface'].links[0].from_socket
 if socket:
  emit=n.new('ShaderNodeEmission');l.new(socket,emit.inputs[0]);l.new(emit.outputs[0],output.inputs[0])
 activate(low);high.select_set(True);high.hide_render=False
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.render.bake.use_selected_to_active=True;s.render.bake.use_cage=True;s.render.bake.cage_extrusion=.14;s.render.bake.max_ray_distance=.30;s.render.bake.margin=16
 print('BAKE_START',kind,flush=True);bpy.ops.object.bake(type='NORMAL' if kind=='normal' else 'EMIT');print('BAKE_END',kind,flush=True)
 if socket:l.new(original,output.inputs[0])
 for im in imgs:im.filepath_raw=str(O/f'{im.name}.png');im.file_format='PNG';im.save()
 return imgs

def bake_normal_detail(low):
 # Fine grit is a material-scale relief. Bake it directly in the final low
 # mesh tangent frame, avoiding cross-face ray hits on narrow stone bevels.
 original=list(low.data.materials);source,_,_,_=surface_material();images=[]
 for i,name in enumerate(ZONES):
  mat=source.copy();mat.name='normal-bake-source-'+name
  im=bpy.data.images.new(name+'-normal-detail',width=RES[i],height=RES[i],alpha=False);im.colorspace_settings.name='Non-Color';im.generated_color=(.5,.5,1,1)
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.nodes.active=node;low.data.materials[i]=mat;images.append(im)
 activate(low);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.render.bake.use_selected_to_active=False;s.render.bake.use_cage=False;s.render.bake.normal_space='TANGENT';s.render.bake.margin=16
 print('BAKE_START direct-tangent-normal',flush=True);bpy.ops.object.bake(type='NORMAL');print('BAKE_END direct-tangent-normal',flush=True)
 for i,im in enumerate(images):
  im.filepath_raw=str(O/f'{ZONES[i]}-normal.png');im.file_format='PNG';im.save();low.data.materials[i]=original[i]
 return images

def bake():
 bpy.ops.wm.open_mainfile(filepath=str(D/'shape.blend'));bpy.context.preferences.filepaths.save_version=0
 low=bpy.data.objects['mountain-sandstone-low'];high=clone(low,'mountain-sandstone-high')
 activate(high);sub=high.modifiers.new('High surface sampling','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;sub.use_custom_normals=True;bpy.ops.object.modifier_apply(modifier=sub.name)
 high.data.update();normals=[v.normal.copy() for v in high.data.vertices]
 for v,normal in zip(high.data.vertices,normals):
  # Six centimetres of shallow relief, with the portal surround protected.
  p=v.co.copy();mask=0 if abs(p.x)<14 and p.y<8 else 1
  a=noise.noise(Vector((p.x*.75+8,p.y*.75-12,p.z*1.4)),noise_basis='PERLIN_ORIGINAL')
  v.co+=normal*(a*.06*mask)
 high.data.update();mat,col,rough,ao=surface_material();high.data.materials.clear();high.data.materials.append(mat)
 for p in high.data.polygons:p.material_index=0;p.use_smooth=True
 # Keep architectural objects out of baking: their lighting must stay real-time.
 hidden=[]
 for o in bpy.context.scene.objects:
  if o not in [low,high] and not o.hide_render:hidden.append(o);o.hide_render=True
 colors=bake_maps(low,high,'basecolor',RES,col);normals=bake_normal_detail(low)
 aos=bake_maps(low,high,'ao',CONTROL_RES,ao);roughs=bake_maps(low,high,'roughness',CONTROL_RES,rough)
 for o in hidden:o.hide_render=False
 finals=[]
 for i,name in enumerate(ZONES):
  packed=bpy.data.images.new(f'{name}-orm',width=CONTROL_RES[i],height=CONTROL_RES[i],alpha=False);packed.colorspace_settings.name='Non-Color'
  ap=np.array(aos[i].pixels[:],dtype=np.float32).reshape(-1,4);rp=np.array(roughs[i].pixels[:],dtype=np.float32).reshape(-1,4);pixels=np.zeros_like(ap);pixels[:,0]=ap[:,0];pixels[:,1]=rp[:,0];pixels[:,3]=1;packed.pixels.foreach_set(pixels.ravel());packed.filepath_raw=str(O/f'{name}-orm.png');packed.file_format='PNG';packed.save()
  m=simple_mat(f'sandstone-baked-{name}');n=m.node_tree.nodes;l=m.node_tree.links;p=next(v for v in n if v.type=='BSDF_PRINCIPLED')
  c=n.new('ShaderNodeTexImage');c.image=colors[i];l.new(c.outputs[0],p.inputs['Base Color'])
  nm=n.new('ShaderNodeTexImage');nm.image=normals[i];nn=n.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.8;l.new(nm.outputs[0],nn.inputs['Color']);l.new(nn.outputs[0],p.inputs['Normal'])
  orm=n.new('ShaderNodeTexImage');orm.image=packed;sep=n.new('ShaderNodeSeparateColor');l.new(orm.outputs[0],sep.inputs[0]);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
  group=bpy.data.node_groups.get('glTF Material Output')
  if not group:
   group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');group.nodes.new('NodeGroupInput')
  sn=n.new('ShaderNodeGroup');sn.node_tree=group;l.new(sep.outputs['Red'],sn.inputs['Occlusion']);finals.append(m)
 for i,m in enumerate(finals):low.data.materials[i]=m
 hide(high);activate(low)
 # Only actual runtime mountain and sand-foot meshes, never construction aids.
 for o in bpy.context.scene.objects:
  if o.name.startswith('sand-foot-'):o.hide_set(False);o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(O/'mountain.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_tangents=True)
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao-sandstone.blend'))
 previous=json.loads((R/'art-source/world/models/mogao-massing/v003/export-manifest.json').read_text())
 report={'status':'Baked sandstone candidate; awaiting visual acceptance','source':'mogao-massing/v003 approved composition','low':topology(low),'high':topology(high),'tower':previous['tower'],'bake':{'engine':'Cycles','colorAoRoughnessMethod':'selected-to-active high-to-low','normalMethod':'direct material-relief bake in final low-mesh tangent frame','colorNormalResolution':dict(zip(ZONES,RES)),'ormResolution':dict(zip(ZONES,CONTROL_RES)),'maps':['basecolor','normal','ao','roughness','orm'],'cageExtrusion':.14,'rayDistance':.30,'margin':16},'glb':{'bytes':(O/'mountain.glb').stat().st_size,'sha256':sha(O/'mountain.glb')},'protectedAssets':protected,'mapIntegration':False}
 (D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('BAKED',json.dumps(report['glb']),flush=True)

def refine():
 bpy.ops.wm.open_mainfile(filepath=str(D/'mogao-sandstone.blend'));bpy.context.preferences.filepaths.save_version=0
 low=bpy.data.objects['mountain-sandstone-low'];images=bake_normal_detail(low)
 for i,mat in enumerate(low.data.materials):
  normal=next(n for n in mat.node_tree.nodes if n.type=='NORMAL_MAP');texture=normal.inputs['Color'].links[0].from_node;texture.image=images[i]
 activate(low)
 for o in bpy.context.scene.objects:
  if o.name.startswith('sand-foot-'):o.hide_set(False);o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(O/'mountain.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_tangents=True)
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'mogao-sandstone.blend'))
 report=json.loads((D/'export-manifest.json').read_text());report['bake'].update({'engine':'Cycles','colorAoRoughnessMethod':'selected-to-active high-to-low','normalMethod':'direct material-relief bake in final low-mesh tangent frame'});report['glb']={'bytes':(O/'mountain.glb').stat().st_size,'sha256':sha(O/'mountain.glb')}
 (D/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

def render():
 bpy.ops.wm.open_mainfile(filepath=str(D/'mogao-sandstone.blend'));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1440;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
 s.world=bpy.data.worlds.new('preview-world');s.world.use_nodes=True;b=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND');b.inputs[0].default_value=(.69,.79,.83,1);b.inputs[1].default_value=.7
 bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.1));ground=bpy.context.object;ground.name='render-ground';m=simple_mat('render-sand');next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*rgb('dfbd83'),1);ground.data.materials.append(m)
 bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.4;sun.data.angle=.08;sun.rotation_euler=Vector((14,22,-35)).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=43
 for name,eye,target in [('front',(0,-170,45),(0,8,24)),('oblique',(105,-155,68),(0,8,25)),('near',(-34,-31,13),(-36,-7,16))]:
  cam.location=eye;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(W/f'mogao-sandstone-v001-blender-{name}.png');bpy.ops.render.render(write_still=True)

if opt.stage=='shape':shape()
elif opt.stage=='bake':bake()
elif opt.stage=='refine':refine()
else:render()
assert all(sha(R/p)==h for p,h in protected.items()),'Protected asset changed'
print('STAGE_COMPLETE',opt.stage,flush=True)
