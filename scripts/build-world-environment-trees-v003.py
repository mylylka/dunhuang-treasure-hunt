"""Independent B/C tree variants in the accepted layered cloud style.

blender -b --python scripts/build-world-environment-trees-v003.py
Authored new branch graphs and bough layouts; no A-tree transform or old builder run.
Only v003 outputs are written. The editable source keeps every cloud bough separate.
"""
import bpy, bmesh, math, json, struct, hashlib, importlib.util, sys, argparse
from pathlib import Path
from mathutils import Vector

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/models/environment-sample/v003'
OUTPUT = ROOT / 'public/assets/world/environment-sample/v003'
WORK = ROOT / 'work/world'
parser = argparse.ArgumentParser()
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
for folder in (SOURCE, OUTPUT, WORK): folder.mkdir(parents=True, exist_ok=True)
helper_path = ROOT / 'scripts/environment-cloud-forms.py'
helper_sha = hashlib.sha256(helper_path.read_bytes()).hexdigest()
spec = importlib.util.spec_from_file_location('environment_cloud_forms', helper_path)
forms = importlib.util.module_from_spec(spec)
spec.loader.exec_module(forms)
bpy.ops.wm.read_factory_settings(use_empty=True)
forms.FOLIAGE = forms.material('olive-sage-cloud-foliage', '859368', vertex_color=True)
WOOD = forms.material('warm-matte-bark', '795137', .96)
WOOD_LIGHT = forms.material('sunward-bark', '956b46', .96)
GROUND = forms.material('preview-sand', 'e6d6b6')

# Sizes, not transforms of an existing tree: each layout follows its own wood graph.
B_BOUGHS = [
    ('left-low', (-1.12,-.12,1.75), (.72,.64,.52), -.18,.97,0),
    ('front-left', (-.58,-.79,1.85), (.72,.65,.50), -.34,.98,1),
    ('front-right', (.55,-.76,1.89), (.75,.66,.54), .17,.98,2),
    ('right-low', (1.13,.05,1.90), (.70,.68,.53), -.19,.97,1),
    ('back-left', (-.75,.62,2.05), (.80,.66,.60), .38,.99,2),
    ('back-right', (.68,.65,2.12), (.80,.72,.60), -.14,.99,0),
    ('upper-left', (-.48,.00,2.58), (.73,.68,.53), .27,1.025,1),
    ('upper-right', (.67,.10,2.51), (.75,.70,.58), -.23,1.02,2),
    ('upper-front', (.05,-.46,2.35), (.78,.60,.53), .16,1.015,0),
]
C_BOUGHS = [
    ('left-return', (-.75,-.15,2.50), (.80,.75,.60), -.24,.97,0),
    ('left-back', (-.30,.72,2.85), (.82,.75,.63), .32,.985,1),
    ('front-middle', (.55,-.85,2.80), (.90,.75,.65), -.21,.99,2),
    ('right-front', (1.60,-.75,2.65), (.98,.82,.70), .18,.97,0),
    ('right-low', (2.00,.15,2.85), (.90,.85,.68), -.26,.98,1),
    ('right-back', (1.65,.82,3.05), (1.05,.82,.70), .21,.99,2),
    ('back-middle', (.55,1.00,3.14), (.95,.70,.67), .12,.99,0),
    ('left-middle', (-.25,-.03,3.10), (.85,.80,.60), -.17,1.005,1),
    ('middle', (.85,.05,3.45), (1.05,.90,.75), .23,1.02,2),
    ('upper-right', (1.80,.10,3.55), (.83,.80,.60), -.10,1.015,0),
    ('upper-back', (.95,.55,3.68), (.85,.80,.62), .27,1.03,1),
]

class BranchGraph:
    def __init__(self): self.vertices=[]; self.edges=[]; self.radii=[]; self.supports=[]
    def node(self, parent, point, radius):
        i=len(self.vertices); self.vertices.append(point); self.radii.append(radius)
        if parent is not None: self.edges.append((parent,i))
        return i
    def path(self,parent,points):
        ids=[]
        for point,radius in points:
            parent=self.node(parent,point,radius); ids.append(parent)
        return ids
    def crown_branch(self,parent,points,target,name):
        ids=self.path(parent,points+[(target,.018)])
        self.supports.append({'bough':name,'node':ids[-1],'endpoint':list(target)})
        return ids
    def build(self,name):
        data=bpy.data.meshes.new(name+'-branch-graph'); data.from_pydata(self.vertices,self.edges,[]); data.update()
        graph=bpy.data.objects.new(name+'-editable-branch-graph',data.copy()); bpy.context.collection.objects.link(graph)
        graph.hide_render=True; graph.hide_viewport=True; graph['role']='editable-radius-graph'
        graph['radii']=self.radii
        wood=bpy.data.objects.new(name+'-trunk',data); bpy.context.collection.objects.link(wood)
        bpy.ops.object.select_all(action='DESELECT'); wood.select_set(True); bpy.context.view_layer.objects.active=wood
        skin=wood.modifiers.new('continuous-tapered-forks','SKIN')
        for i,r in enumerate(self.radii): wood.data.skin_vertices[0].data[i].radius=(r,r*.88)
        wood.data.skin_vertices[0].data[0].use_root=True
        bpy.ops.object.modifier_apply(modifier=skin.name)
        sub=wood.modifiers.new('rounded-fork-transitions','SUBSURF'); sub.levels=1; sub.render_levels=1
        bpy.ops.object.modifier_apply(modifier=sub.name)
        dec=wood.modifiers.new('branch-silhouette-reduction','DECIMATE'); dec.ratio=.32
        bpy.ops.object.modifier_apply(modifier=dec.name)
        # The trunk itself flares to the ground; no disconnected-looking root tips.
        for vertex in wood.data.vertices:
            vertex.co.z=0 if vertex.co.z<.20 else vertex.co.z
            if vertex.co.z<.34:
                flare=1+.28*(1-vertex.co.z/.34)**2
                vertex.co.x*=flare; vertex.co.y*=flare
        wood.data.materials.append(WOOD); wood.data.materials.append(WOOD_LIGHT)
        for poly in wood.data.polygons:
            poly.use_smooth=True; poly.material_index=1 if poly.normal.x<-.4 and poly.center.z<2.3 else 0
        wood['construction']='new-explicit-connected-tapered-branch-graph'; wood['role']='solid-wood'
        return wood,graph

def tree_b_graph():
    g=BranchGraph()
    t=g.path(None,[((0,0,.06),.245),((.06,.015,.31),.205),((-.06,.025,.61),.172),((-.10,.02,.89),.143),((.02,.06,1.18),.112),((.13,.08,1.52),.087),((.17,.07,1.94),.055),((.12,.04,2.38),.025)])
    left=g.path(t[2],[((-.39,.02,.91),.125),((-.72,-.01,1.22),.09),((-.98,-.06,1.52),.052)])
    right=g.path(t[3],[((.37,.04,1.12),.108),((.72,.02,1.43),.071),((.99,.04,1.68),.042)])
    targets={x[0]:x[1] for x in B_BOUGHS}
    g.crown_branch(left[-1],[],targets['left-low'],'left-low')
    g.crown_branch(left[0],[((-.45,-.36,1.28),.063),((-.55,-.65,1.57),.034)],targets['front-left'],'front-left')
    g.crown_branch(right[0],[((.44,-.29,1.38),.060),((.52,-.62,1.66),.035)],targets['front-right'],'front-right')
    g.crown_branch(right[-1],[],targets['right-low'],'right-low')
    g.crown_branch(left[1],[((-.73,.32,1.58),.058)],targets['back-left'],'back-left')
    g.crown_branch(right[1],[((.69,.32,1.80),.052)],targets['back-right'],'back-right')
    g.crown_branch(t[5],[((-.17,.04,1.91),.064),((-.36,.02,2.29),.037)],targets['upper-left'],'upper-left')
    g.crown_branch(t[6],[((.40,.08,2.22),.046)],targets['upper-right'],'upper-right')
    g.crown_branch(t[5],[((.07,-.24,1.92),.050)],targets['upper-front'],'upper-front')
    return g

def tree_c_graph():
    g=BranchGraph()
    t=g.path(None,[((0,0,.07),.238),((.03,.015,.38),.203),((.16,.02,.80),.174),((.29,.04,1.17),.150),((.47,.07,1.56),.127),((.67,.11,1.94),.103),((.80,.16,2.36),.078),((.94,.21,2.81),.055),((1.01,.24,3.30),.030)])
    left=g.path(t[4],[((.12,.02,1.89),.093),((-.27,-.02,2.17),.068),((-.59,-.10,2.38),.038)])
    right=g.path(t[5],[((1.02,.10,2.10),.094),((1.43,.13,2.34),.065),((1.76,.15,2.64),.037)])
    targets={x[0]:x[1] for x in C_BOUGHS}
    g.crown_branch(left[-1],[],targets['left-return'],'left-return')
    g.crown_branch(left[1],[((-.30,.35,2.49),.048)],targets['left-back'],'left-back')
    g.crown_branch(t[5],[((.60,-.31,2.20),.062),((.55,-.63,2.53),.034)],targets['front-middle'],'front-middle')
    g.crown_branch(right[0],[((1.26,-.33,2.32),.059),((1.46,-.58,2.50),.033)],targets['right-front'],'right-front')
    g.crown_branch(right[-1],[],targets['right-low'],'right-low')
    g.crown_branch(right[1],[((1.55,.46,2.71),.052)],targets['right-back'],'right-back')
    g.crown_branch(t[6],[((.65,.55,2.67),.052),((.59,.81,2.94),.030)],targets['back-middle'],'back-middle')
    g.crown_branch(left[1],[((-.28,-.01,2.56),.052),((-.26,-.02,2.87),.030)],targets['left-middle'],'left-middle')
    g.crown_branch(t[8],[],targets['middle'],'middle')
    g.crown_branch(t[7],[((1.35,.16,3.08),.047),((1.62,.12,3.35),.028)],targets['upper-right'],'upper-right')
    g.crown_branch(t[8],[((.98,.41,3.52),.027)],targets['upper-back'],'upper-back')
    return g

def bounds(objects):
    points=[v.co for o in objects for v in o.data.vertices]
    return {'min':[min(v.x for v in points),min(v.z for v in points),-max(v.y for v in points)],'max':[max(v.x for v in points),max(v.z for v in points),-min(v.y for v in points)]}
def triangle_count(objects):
    count=0
    for o in objects: o.data.calc_loop_triangles(); count+=len(o.data.loop_triangles)
    return count
def clipped_wood_radius(wood):
    mesh=wood.data; mesh.calc_loop_triangles(); points=[v.co for v in mesh.vertices if v.co.z<=2.1]
    for tri in mesh.loop_triangles:
        for i in range(3):
            a=mesh.vertices[tri.vertices[i]].co; b=mesh.vertices[tri.vertices[(i+1)%3]].co
            if (a.z<2.1<b.z) or (b.z<2.1<a.z): points.append(a+(b-a)*((2.1-a.z)/(b.z-a.z)))
    return max(math.hypot(v.x,v.y) for v in points)

assets=[]; all_visible=[]
for key,design,maker,width,height in [('b',B_BOUGHS,tree_b_graph,3.9,3.3),('c',C_BOUGHS,tree_c_graph,4.8,4.3)]:
    graph=maker(); wood,guide=graph.build('tree-'+key)
    clouds=[forms.sculpt_cloud('tree-'+key+'-canopy-'+name,center,size,yaw,shade,variation) for name,center,size,yaw,shade,variation in design]
    group=[wood]+clouds
    points=[v.co for o in group for v in o.data.vertices]; lo=min(v.z for v in points)
    sx=width/(max(v.x for v in points)-min(v.x for v in points)); sz=height/(max(v.z for v in points)-lo)
    forms.normalize(group,width,height)
    for vertex in guide.data.vertices: vertex.co.x*=sx; vertex.co.y*=sx; vertex.co.z=(vertex.co.z-lo)*sz
    for support in graph.supports:
        x,y,z=support['endpoint']; support['endpoint']=[x*sx,(z-lo)*sz,-y*sx]
    collection=bpy.data.collections.new('Tree '+key.upper()+' editable'); bpy.context.scene.collection.children.link(collection)
    for o in group+[guide]:
        for c in list(o.users_collection): c.objects.unlink(o)
        collection.objects.link(o)
    for o in clouds:
        bm=bmesh.new(); bm.from_mesh(o.data); assert all(e.is_manifold for e in bm.edges); bm.free()
    assets.append({'key':key,'objects':group,'wood':wood,'clouds':clouds,'guide':guide,'height':height,'supports':graph.supports})
    all_visible.extend(group)

# Match accepted v002 daylight, color management and camera angles.
plane=forms.object_mesh('preview-ground',[(-12,-12,-.012),(12,-12,-.012),(12,12,-.012),(-12,12,-.012)],[(0,1,2,3)],GROUND)
world=bpy.data.worlds.new('preview-daylight'); world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.71,.77,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene=bpy.context.scene; scene.world=world; scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1.0
bpy.ops.object.light_add(type='AREA',location=(-4,-5,9)); key=bpy.context.object; key.name='preview-key'; key.data.energy=1000; key.data.size=5; key.rotation_euler=(Vector((0,0,2))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,7)); sun=bpy.context.object; sun.name='preview-sun'; sun.data.energy=1.5; sun.rotation_euler=(.4,-.5,-.45); sun.data.angle=.12
bpy.ops.object.camera_add(location=(7,-10,6)); camera=bpy.context.object; camera.name='preview-camera'; scene.camera=camera; camera.data.type='ORTHO'
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.render.resolution_x=1100; scene.render.resolution_y=1100; scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='AgX'
for o in assets[1]['objects']: o.hide_set(True); o.hide_render=True
source_center=Vector((0,0,assets[0]['height']*.48))
camera.location=source_center+Vector((7,-10,2.8)); camera.rotation_euler=(source_center-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.ortho_scale=5.3
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'trees.blend'))

metrics=[]
for asset in assets:
    asset_id='tree-'+asset['key']; group=asset['objects']; copies=[]
    for original in asset['clouds']:
        copy=original.copy(); copy.data=original.data.copy(); bpy.context.collection.objects.link(copy); copy.hide_set(False); copies.append(copy)
    bpy.ops.object.select_all(action='DESELECT')
    for o in copies: o.select_set(True)
    bpy.context.view_layer.objects.active=copies[0]; bpy.ops.object.join(); canopy=bpy.context.object; canopy.name=asset_id+'-canopy'
    assert triangle_count([canopy])==triangle_count(asset['clouds'])
    bpy.ops.object.select_all(action='DESELECT'); canopy.select_set(True); asset['wood'].hide_set(False); asset['wood'].select_set(True); bpy.context.view_layer.objects.active=asset['wood']
    path=OUTPUT/(asset_id+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True)
    raw=path.read_bytes(); size=struct.unpack_from('<I',raw,12)[0]; gltf=json.loads(raw[20:20+size]); primitives=[p for m in gltf['meshes'] for p in m['primitives']]
    triangles=sum(gltf['accessors'][p['indices']]['count']//3 for p in primitives)
    assert triangles==triangle_count(group); assert len(primitives)<=4
    record={'asset':asset_id,'status':'awaiting visual review','design':'low compact tree with early three-way forks' if asset['key']=='b' else 'curved leaning trunk with a larger right-hand crown and a small return bough','cloudBoughs':len(asset['clouds']),'boundsYUp':bounds(group),'triangles':triangles,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'meshes':len(gltf['meshes']),'primitives':len(primitives),'materials':len(gltf['materials']),'woodRadiusBelow2_1m':clipped_wood_radius(asset['wood']),'closedCloudBoughs':True,'branchSupportsYUp':asset['supports'],'allNormalsPresent':all('NORMAL' in p['attributes'] for p in primitives)}
    metrics.append(record)
    canopy.hide_render=True; canopy.hide_set(True)

assert hashlib.sha256(helper_path.read_bytes()).hexdigest()==helper_sha
manifest={'version':'v003','status':'awaiting visual review','unit':'metres','exportUpAxis':'Y','origin':'ground at trunk base; minimum Y=0','sourceEditable':{'independentBranchGraphs':2,'individualCloudBoughs':20,'woodMeshes':2},'method':'New explicitly authored connected branch graphs; accepted shared cloud mesh shape reused in independent bough arrangements. Source keeps editable branch graph, wood mesh and separate boughs; export merges only copies of boughs without changing geometry or normals.','helper':str(helper_path.relative_to(ROOT)),'helperSha256':helper_sha,'reference':'docs/environment-sample-v002-acceptance.md','assets':metrics,'limitations':['Static stylized cloud foliage; no individual leaves or animation.','These new variants require their own visual review.']}
(SOURCE/'trees-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(WORK/'environment-sample-v003-trees-check.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('TREES_V003',json.dumps(manifest,ensure_ascii=False),flush=True)
if not args.skip_render:
    for asset in assets:
        for o in all_visible: o.hide_render=o not in asset['objects']; o.hide_set(False)
        bbox=bounds(asset['objects']); cx=(bbox['min'][0]+bbox['max'][0])/2; center=Vector((cx,0,asset['height']*.48))
        for view,delta in [('front',(0,-10,1.0)),('side',(10,0,1.0)),('oblique',(7,-10,2.8))]:
            camera.location=center+Vector(delta); camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.ortho_scale=5.3 if asset['key']=='b' else 6.3
            scene.render.filepath=str(WORK/f'environment-sample-v003-tree-{asset["key"]}-{view}.png'); bpy.ops.render.render(write_still=True)
