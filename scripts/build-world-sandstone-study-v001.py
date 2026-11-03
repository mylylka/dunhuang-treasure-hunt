"""One authored sandstone study. Shape first; UV + selected-to-active baking next.

Run Blender -b -t 4 --python-exit-code 1 --python this_file -- --stage shape|bake
Only the independently versioned sandstone-study paths are written.
"""
import bpy, bmesh, math, json, hashlib, shutil, argparse, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, noise

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT/'art-source/world/models/sandstone-study/v001'
REF = ROOT/'art-source/world/sandstone-study/v001'
OUT = ROOT/'public/assets/world/sandstone-study/v001'
WORK = ROOT/'work/world'
args = argparse.ArgumentParser(); args.add_argument('--stage', choices=['shape','bake'], default='shape')
args.add_argument('--skip-renders',action='store_true')
opt = args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
for folder in [SRC, REF, OUT, WORK]: folder.mkdir(parents=True, exist_ok=True)

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
protected_paths = [ROOT/'public/assets/world/mogao/v006/exterior.glb', ROOT/'public/assets/world/mogao/v003/interior.glb', ROOT/'public/assets/world/traveler-tripo/v002/traveler.glb']
protected = {str(p.relative_to(ROOT)):sha(p) for p in protected_paths}
refs=[]
for suffix in ['55-4','56-5','52-1']:
    p=Path('/Users/liujing/Downloads')/f'ChatGPT 图像 2026年11月1日 18_37_{suffix}.png'
    dest=REF/p.name
    if not dest.exists(): shutil.copy2(p,dest)
    refs.append({'original':str(p),'archive':dest.name,'sha256':sha(dest)})
(REF/'reference-manifest.json').write_text(json.dumps({'references':refs,'use':'Visual reference only; no image projection or repainting'},ensure_ascii=False,indent=2)+'\n')

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h): return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def simple_material(name, color):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*rgb(color),1);p.inputs['Roughness'].default_value=.93
    return m
def activate(o):
    bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
def mesh(name, vs, fs):
    data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return obj
def difference(obj, cutter):
    activate(obj);mod=obj.modifiers.new(cutter.name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);cutter.hide_render=True;cutter.hide_set(True);cutter['constructionOnly']=True
def hull(name, points):
    o=mesh(name,points,[]);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.convex_hull(bm,input=list(bm.verts));bm.to_mesh(o.data);bm.free();return o

def geometry():
    # Counterclockwise irregular footprint: a long ledge on the right, a taller
    # broad shoulder on the left. Heights and retreats are deliberately authored.
    perimeter=[(-3.66,-.95),(-3.22,-1.85),(-2.05,-2.18),(-.65,-2.12),(.6,-2.2),(1.64,-1.96),(2.8,-1.70),(3.75,-.8),(3.92,.18),(3.25,1.30),(1.65,1.83),(.15,1.98),(-1.5,1.64),(-2.8,1.35),(-3.6,.45)]
    top=[3.80,4.10,4.27,4.08,3.80,3.10,2.92,2.63,2.84,3.10,3.65,4.35,4.48,4.32,4.05]
    bed=[1.76,1.92,1.65,1.40,1.69,1.47,1.13,1.22,1.18,1.38,1.55,1.75,1.85,1.81,1.76]
    # Each ring describes a different rock function, not equal subdivisions.
    profiles=[(.92,.91,0,0,-.10), (1,1,0,0,.28), (.99,1.02,0,0,'shelf'),
              (.92,.88,-.08,.15,'notch'), (.98,.98,-.17,.10,'lip'),
              (.93,.86,-.31,.24,'shoulder'), (.83,.76,-.45,.28,'top')]
    vs=[];N=len(perimeter)
    for row,(sx,sy,dx,dy,h) in enumerate(profiles):
        for i,(x,y) in enumerate(perimeter):
            if h=='shelf':z=bed[i]-.18
            elif h=='notch':z=bed[i]+.045
            elif h=='lip':z=bed[i]+.25
            elif h=='shoulder':z=top[i]-.28
            elif h=='top':z=top[i]
            else:z=h
            # Deepest undercut is front-right and dies out around the back.
            ly=y*sy+dy
            if row==3 and i in [1,2,3,4,5,6,7]:ly+=[-.12,-.18,.16,.31,.36,.12,-.06][i-1]
            if i>=8 or i==0:
                # The front bed pinches out; the rear is a continuous rock face.
                if row in (2,3,4):
                    blend=.75 if i in (0,8,14) else 1
                    ly=ly*(1-blend)+(y*.975+.04)*blend
            # Broken shoulder rather than a uniformly chamfered crown.
            lx=x*sx+dx
            if row==5 and i==2:ly+=.18
            if row==6 and i==5:lx-=.25;ly+=.12
            vs.append((lx,ly,z))
    fs=[tuple(range(N-1,-1,-1))]
    for r in range(len(profiles)-1):
        for i in range(N):a=r*N+i;b=r*N+(i+1)%N;fs.append((a,b,b+N,a+N))
    # A broad pitched crown with deliberately placed internal intersections.
    t=6*N;vs.extend([(-1.70,.05,4.18),(.25,.15,3.93),(2.12,.40,3.10)])
    c0,c1,c2=len(vs)-3,len(vs)-2,len(vs)-1
    fs.extend([(t+0,t+1,t+2,c0,t+13,t+14),(t+2,t+3,t+4,c1,c0),
               (t+4,t+5,t+6,c2,c1),(t+6,t+7,t+8,t+9,c2),
               (t+9,t+10,t+11,c1,c2),(t+11,t+12,t+13,c0,c1)])
    rock=mesh('sandstone-low',vs,fs)
    rock['purpose']='Authored thick rock, variable ledge, two directed fractures; no random silhouette'
    # Long diagonal joint opens at the crown and ends at the foot, but does not
    # cut through the back of the rock. Side walls make an actual deep shadow.
    outline=[(1.12,.05),(1.48,.75),(1.64,1.51),(1.25,2.15),(1.42,2.73),(1.98,3.75),
             (2.12,3.75),(1.56,2.73),(1.42,2.13),(1.78,1.48),(1.60,.72),(1.22,.05)]
    def fracture(name, outline, back):
        vv=[(x,y,z) for y in [-3.6,back] for x,z in outline];n=len(outline)
        ff=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        difference(rock,mesh(name,vv,ff))
    fracture('directed-front-joint',outline,-.85)
    fracture('short-shoulder-joint',[(-2.82,4.5),(-2.41,3.8),(-2.36,3.42),(-2.12,3.19),(-2.30,3.44),(-2.33,3.83),(-2.68,4.5)],-.6)
    # A small number of fixed wedge cuts, shaped at meaningful ledge corners.
    chips=[
        [(-2.65,-2.35,1.38),(-2.22,-2.3,1.3),(-2.1,-2.3,1.72),(-2.55,-1.7,1.7),(-2.45,-1.8,1.42)],
        [(-.55,-2.5,1.45),(-.16,-2.5,1.4),(-.1,-2.5,1.84),(-.43,-1.65,1.58),(-.32,-1.83,1.84)],
        [(.15,-2.0,3.64),(.60,-2.0,3.98),(.80,-1.36,3.86),(.24,-1.43,3.62),(.3,-2.4,4.2)],
        [(2.35,-1.82,2.62),(2.88,-1.78,2.8),(2.78,-1.12,2.88),(2.36,-1.1,2.67),(2.65,-2.1,3.2)],
        [(-3.88,-1.25,2.7),(-3.70,-.62,3.0),(-3.22,-1.01,2.76),(-3.28,-1.50,2.56),(-4.1,-1.2,3.2)],
    ]
    for i,points in enumerate(chips):difference(rock,hull(f'authored-chip-{i+1}',points))
    activate(rock)
    bevel=rock.modifiers.new('Narrow weathered edge transitions','BEVEL');bevel.width=.07;bevel.segments=2;bevel.affect='EDGES';bevel.limit_method='ANGLE';bevel.angle_limit=.20
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Triangulate once, before both the high and low mesh diverge and before bake.
    tri=rock.modifiers.new('Stable bake topology','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
    # A shallow weathered rind breaks mathematically straight edges. It is
    # bounded to centimetres; the authored metre-scale shape does not change.
    subdiv=rock.modifiers.new('Sample the weathered rind','SUBSURF');subdiv.subdivision_type='SIMPLE';subdiv.levels=2;bpy.ops.object.modifier_apply(modifier=subdiv.name)
    for v in rock.data.vertices:
        point=v.co.copy();f=noise.noise_vector(Vector((point.x*2.3+12,point.y*2.3-7,point.z*4.2+5)),noise_basis='PERLIN_ORIGINAL')
        v.co+=Vector((f.x*.055,f.y*.055,f.z*.032))
    # Retain the authored construction as an editable reference, then repair
    # intersecting narrow bevel strips at 3cm resolution ON THIS STUDY ONLY.
    cage=rock.copy();cage.data=rock.data.copy();cage.name='authored-volume-reference';bpy.context.collection.objects.link(cage);cage.hide_render=True;cage.hide_set(True)
    rock.data.remesh_voxel_size=.03;rock.data.use_remesh_preserve_volume=True
    bpy.ops.object.voxel_remesh()
    relax=rock.modifiers.new('Relax voxel edges below the weathering scale','SMOOTH');relax.factor=.28;relax.iterations=2;bpy.ops.object.modifier_apply(modifier=relax.name)
    # Capture the repaired sculpt, before reducing the run-time mesh.
    sculpt=rock.copy();sculpt.data=rock.data.copy();sculpt.name='sandstone-sculpt-source';bpy.context.collection.objects.link(sculpt);sculpt.hide_render=True;sculpt.hide_set(True)
    dec=rock.modifiers.new('Silhouette-preserving low mesh','DECIMATE');dec.ratio=.10;bpy.ops.object.modifier_apply(modifier=dec.name)
    # Directional seams, followed by actual angle-based unfolding. Bevel faces
    # retain area and are not projected into zero-width texture strips.
    bm=bmesh.new();bm.from_mesh(rock.data);bm.normal_update()
    def chart(f):
        axis=max(range(3),key=lambda a:abs(f.normal[a]));return (axis,1 if f.normal[axis]>0 else -1)
    for edge in bm.edges:
        if len(edge.link_faces)==2:edge.seam=chart(edge.link_faces[0])!=chart(edge.link_faces[1])
    bm.to_mesh(rock.data);bm.free()
    activate(rock);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method='ANGLE_BASED',margin=.006);bpy.ops.uv.average_islands_scale();bpy.ops.uv.pack_islands(rotate=True,margin=.006,margin_method='FRACTION')
    bpy.ops.object.mode_set(mode='OBJECT');rock.data.uv_layers.active.name='UVMap'
    for p in rock.data.polygons:p.use_smooth=True
    # Use the actual eroded surface normals, not area-weighted overrides that
    # create false creases at the borders of broad, slightly warped faces.
    return rock

def surface_material():
    m=bpy.data.materials.new('high-sandstone-minerals');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
    output=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeBsdfPrincipled');l.new(p.outputs['BSDF'],output.inputs['Surface']);p.inputs['Roughness'].default_value=.94
    co=n.new('ShaderNodeTexCoord')
    mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1.4,1.4,4.5);l.new(co.outputs['Object'],mapping.inputs[0])
    broad=n.new('ShaderNodeTexNoise');broad.inputs['Scale'].default_value=.85;broad.inputs['Detail'].default_value=3.5;broad.inputs['Roughness'].default_value=.72;l.new(mapping.outputs[0],broad.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB');ramp.name='Mineral palette';ramp.color_ramp.elements[0].position=.12;ramp.color_ramp.elements[0].color=(*rgb('a77e4f'),1);ramp.color_ramp.elements[1].position=.86;ramp.color_ramp.elements[1].color=(*rgb('bf9760'),1)
    mid=ramp.color_ramp.elements.new(.48);mid.color=(*rgb('b58a55'),1);l.new(broad.outputs['Fac'],ramp.inputs[0])
    grain=n.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=25;grain.inputs['Detail'].default_value=4;grain.inputs['Roughness'].default_value=.8;l.new(co.outputs['Object'],grain.inputs['Vector'])
    grit=n.new('ShaderNodeValToRGB');grit.color_ramp.elements[0].position=.3;grit.color_ramp.elements[0].color=(.52,.52,.52,1);grit.color_ramp.elements[1].position=.7;grit.color_ramp.elements[1].color=(1,1,1,1);l.new(grain.outputs['Fac'],grit.inputs[0])
    mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.32;l.new(ramp.outputs['Color'],mix.inputs[1]);l.new(grit.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],p.inputs['Base Color'])
    rough=n.new('ShaderNodeMapRange');rough.inputs['From Min'].default_value=0;rough.inputs['From Max'].default_value=1;rough.inputs['To Min'].default_value=.81;rough.inputs['To Max'].default_value=.98;l.new(grain.outputs['Fac'],rough.inputs['Value']);l.new(rough.outputs[0],p.inputs['Roughness'])
    # Grain smaller than high-mesh vertices is transferred through the normal bake.
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.012;l.new(grain.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
    return m,mix.outputs[0],rough.outputs[0]

def studio(rock):
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True
    s.render.resolution_x=1440;s.render.resolution_y=1000;s.render.resolution_percentage=100
    if s.world is None:s.world=bpy.data.worlds.new('study-world')
    s.world.use_nodes=True;bg=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.63,.71,.77,1);bg.inputs[1].default_value=.55
    s.view_settings.view_transform='AgX'
    ground=mesh('studio-floor',[(-200,-200,-.10),(200,-200,-.10),(200,200,-.10),(-200,200,-.10)],[(0,1,2,3)]);ground.data.materials.append(simple_material('studio-floor-mat','d1c5b0'))
    bpy.ops.object.light_add(type='AREA',location=(-5,-6,9));key=bpy.context.object;key.name='studio-key';key.data.energy=1600;key.data.shape='DISK';key.data.size=5;key.rotation_euler=(Vector((0,0,1.5))-key.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=52
    for name,pos,target in [('front',(0,-14,6.3),(0,0,1.9)),('oblique',(9,-12,7.1),(0,0,1.8)),('side',(13,-1,5.6),(0,0,1.8))]:
        cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(WORK/f'sandstone-study-v001-blender-{name}.png');bpy.ops.render.render(write_still=True)
    return ground,key,cam

def bake(low, high, kind, name, emission_socket=None):
    image=bpy.data.images.new(name,width=2048,height=2048,alpha=False,float_buffer=False)
    image.colorspace_settings.name='sRGB' if kind=='COLOR' else 'Non-Color'
    node=low.data.materials[0].node_tree.nodes.new('ShaderNodeTexImage');node.image=image;low.data.materials[0].node_tree.nodes.active=node
    material=high.data.materials[0];nodes=material.node_tree.nodes;links=material.node_tree.links;output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');original=output.inputs['Surface'].links[0].from_socket
    if emission_socket:
        emit=nodes.new('ShaderNodeEmission');links.new(emission_socket,emit.inputs['Color']);links.new(emit.outputs[0],output.inputs['Surface'])
    activate(low);high.select_set(True);high.hide_render=False
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.render.bake.use_selected_to_active=True;s.render.bake.use_cage=True;s.render.bake.cage_extrusion=.025;s.render.bake.max_ray_distance=.07;s.render.bake.margin=12
    if s.world is None:s.world=bpy.data.worlds.new('bake-world')
    if kind=='AO':s.world.color=(1,1,1)
    print('BAKE_START',name,flush=True)
    bpy.ops.object.bake(type='EMIT' if emission_socket else kind)
    if emission_socket:links.new(original,output.inputs['Surface'])
    image.filepath_raw=str(OUT/f'{name}.png');image.file_format='PNG';image.save();print('BAKE_DONE',name,flush=True)
    return image

if opt.stage=='shape':
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    low=geometry();low.data.materials.clear();low.data.materials.append(simple_material('shape-check','b48b58'))
    for p in low.data.polygons:p.material_index=0
    low.data.calc_loop_triangles();print('LOW_TRIANGLES',len(low.data.loop_triangles),flush=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'shape.blend'))
    if not opt.skip_renders:studio(low)
else:
    bpy.ops.wm.open_mainfile(filepath=str(SRC/'shape.blend'));bpy.context.preferences.filepaths.save_version=0
    low=bpy.data.objects['sandstone-low'];sculpt=bpy.data.objects['sandstone-sculpt-source'];high=sculpt.copy();high.data=sculpt.data.copy();bpy.context.collection.objects.link(high);high.name='sandstone-high';high.hide_render=False;high.hide_set(False)
    activate(high)
    subdiv=high.modifiers.new('High surface sampling, silhouette retained','SUBSURF');subdiv.subdivision_type='SIMPLE';subdiv.levels=1;bpy.ops.object.modifier_apply(modifier=subdiv.name)
    for p in high.data.polygons:p.use_smooth=True
    # Fine weathering only, well below the authored metre-scale ledge depth.
    texture=bpy.data.textures.new('Fine sandstone surface relief',type='CLOUDS');texture.noise_scale=.075;texture.noise_depth=2
    disp=high.modifiers.new('Shallow granular weathering','DISPLACE');disp.texture=texture;disp.strength=.012;disp.mid_level=.5;disp.texture_coords='GLOBAL';bpy.ops.object.modifier_apply(modifier=disp.name)
    mat,color_socket,rough_socket=surface_material();high.data.materials.clear();high.data.materials.append(mat)
    low.data.materials.clear();low.data.materials.append(simple_material('bake-target','b58a55'))
    color=bake(low,high,'COLOR','sandstone-basecolor',color_socket)
    normal=bake(low,high,'NORMAL','sandstone-normal')
    ao=bake(low,high,'AO','sandstone-ao')
    rough=bake(low,high,'ROUGHNESS','sandstone-roughness',rough_socket)
    packed=bpy.data.images.new('sandstone-orm',width=2048,height=2048,alpha=False);packed.colorspace_settings.name='Non-Color'
    ap=np.array(ao.pixels[:],dtype=np.float32).reshape(-1,4);rp=np.array(rough.pixels[:],dtype=np.float32).reshape(-1,4)
    pixels=np.zeros_like(ap);pixels[:,0]=ap[:,0];pixels[:,1]=rp[:,0];pixels[:,3]=1;packed.pixels.foreach_set(pixels.ravel());packed.filepath_raw=str(OUT/'sandstone-orm.png');packed.file_format='PNG';packed.save()
    final=bpy.data.materials.new('sandstone-baked-pbr');final.use_nodes=True;n=final.node_tree.nodes;l=final.node_tree.links;n.clear()
    output=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeBsdfPrincipled');l.new(p.outputs[0],output.inputs['Surface'])
    c=n.new('ShaderNodeTexImage');c.image=color;l.new(c.outputs['Color'],p.inputs['Base Color'])
    nm=n.new('ShaderNodeTexImage');nm.image=normal;normal_node=n.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.8;l.new(nm.outputs['Color'],normal_node.inputs['Color']);l.new(normal_node.outputs['Normal'],p.inputs['Normal'])
    orm=n.new('ShaderNodeTexImage');orm.image=packed;sep=n.new('ShaderNodeSeparateColor');l.new(orm.outputs[0],sep.inputs[0]);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
    settings=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');settings.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');settings.nodes.new('NodeGroupInput')
    sn=n.new('ShaderNodeGroup');sn.node_tree=settings;l.new(sep.outputs['Red'],sn.inputs['Occlusion'])
    low.data.materials.clear();low.data.materials.append(final);high.hide_render=True;high.hide_set(True)
    low.data.calc_loop_triangles();high.data.calc_loop_triangles()
    bounds=[low.matrix_world@Vector(v) for v in low.bound_box];size=[max(v[i] for v in bounds)-min(v[i] for v in bounds) for i in range(3)]
    low['sizeMeters']=size;low['source']='Blender authored profile and directed cuts; selected-to-active high mesh bake'
    activate(low);bpy.ops.export_scene.gltf(filepath=str(OUT/'sandstone.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_tangents=True)
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'sandstone.blend'))
    report={'status':'Awaiting visual acceptance','sizeMetersBlenderXYZ':size,'lowTriangles':len(low.data.loop_triangles),'highTriangles':len(high.data.loop_triangles),'uvLayers':[u.name for u in low.data.uv_layers],
            'bake':{'method':'Cycles selected-to-active','resolution':2048,'marginPixels':12,'cageExtrusion':.025,'maxRayDistance':.07,'maps':['basecolor','normal','ao','roughness','orm']},
            'glb':{'bytes':(OUT/'sandstone.glb').stat().st_size,'sha256':sha(OUT/'sandstone.glb')},'protectedAssets':protected,'materials':1}
    (SRC/'export-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if not opt.skip_renders:studio(low)
assert protected=={str(p.relative_to(ROOT)):sha(p) for p in protected_paths}, 'Existing assets changed'
print('STUDY_COMPLETE',opt.stage,flush=True)
