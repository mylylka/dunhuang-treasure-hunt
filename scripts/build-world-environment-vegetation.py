"""Independent vegetation study. Does not load, edit, or overwrite the game world.
blender -b --python scripts/build-world-environment-vegetation.py
All forms follow authored silhouettes and branching paths; no sphere primitives are used.
"""
import bpy, math, json, struct, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/environment-sample/v001'
OUTPUT=ROOT/'public/assets/world/environment-sample/v001'
WORK=ROOT/'work/world'
for p in (SOURCE,OUTPUT,WORK):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,color,roughness=.96):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))
    m.diffuse_color=(*rgb,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=roughness
    p.inputs['Specular IOR Level'].default_value=.20
    return m
WOOD=material('warm-matte-bark','795137');WOOD_LIGHT=material('sunward-bark','956b46')
LEAVES=[material('foliage-olive','7f8750'),material('foliage-sage','a2aa68'),material('foliage-gold-green','c0b65c'),material('foliage-sunlit-tips','d4c773')]
GROUND=material('preview-sand','e6d6b6')

def object_mesh(name,verts,faces,mats,indices=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    for mat in mats:data.materials.append(mat)
    if indices:
        for poly,i in zip(data.polygons,indices):poly.material_index=i
    return obj

# Branch graph: connected woody body with changing radius and bends at several heights.
vertices=[];edges=[];radii=[]
def node(parent,point,radius):
    i=len(vertices);vertices.append(point);radii.append(radius)
    if parent is not None:edges.append((parent,i))
    return i
def path(parent,points):
    out=[]
    for xyz,r in points:parent=node(parent,xyz,r);out.append(parent)
    return out
trunk=path(None,[((0,0,.09),.225),((.06,.01,.42),.19),((-.07,.02,.87),.16),((-.15,.03,1.31),.14),((-.08,.04,1.76),.11),((.12,.06,2.16),.086),((.20,.12,2.65),.060),((.08,.14,3.16),.038),((.15,.16,3.67),.016)])
for target,r in [((.34,.05,.035),.055),((-.30,.15,.03),.048),((.08,-.30,.03),.05),((-.14,-.22,.03),.045)]:node(trunk[0],target,r)
left=path(trunk[3],[((-.45,.06,1.67),.095),((-.8,.10,2.06),.073),((-1.15,.11,2.43),.043),((-1.48,.13,2.76),.018)])
left_up=path(left[1],[((-.85,-.23,2.63),.043),((-.91,-.35,3.08),.018)])
left_low=path(left[0],[((-.85,-.03,2.05),.052),((-1.19,-.12,2.37),.03),((-1.39,-.12,2.65),.013)])
right=path(trunk[2],[((.28,-.03,1.31),.105),((.67,-.03,1.81),.078),((1.05,-.02,2.23),.054),((1.24,.02,2.72),.032),((1.39,.05,3.06),.014)])
right_up=path(right[1],[((.75,.20,2.46),.049),((.87,.30,3.01),.031),((.93,.30,3.36),.015)])
upper_left=path(trunk[5],[((-.20,-.20,2.72),.059),((-.45,-.30,3.26),.037),((-.58,-.30,3.70),.016)])
upper=path(trunk[7],[((.40,.20,3.57),.028),((.51,.20,3.97),.014)])
back=path(trunk[4],[((.14,.44,2.13),.065),((.20,.80,2.55),.038),((.25,1.06,2.96),.016)])
front=path(trunk[4],[((-.10,-.42,2.09),.063),((-.15,-.75,2.54),.037),((-.32,-1.03,2.98),.016)])
upper_back=path(trunk[6],[((-.35,.55,3.08),.035),((-.65,.75,3.52),.014)])
# Additional forks carry individual canopy tiers, rather than converging at one umbrella joint.
left_back=path(left[1],[((-1.04,.45,2.48),.038),((-1.28,.67,2.88),.015)])
right_front=path(right[2],[((1.21,-.43,2.58),.032),((1.30,-.70,2.94),.014)])
right_back=path(right_up[0],[((1.10,.70,2.85),.032),((1.18,.75,3.35),.014)])
front_left=path(front[0],[((-.69,-.56,2.40),.035),((-.95,-.77,2.80),.014)])
front_right=path(front[1],[((.29,-.98,2.85),.028),((.48,-1.10,3.18),.012)])
upper_front=path(upper_left[1],[((-.12,-.65,3.60),.024),((-.06,-.73,3.94),.012)])
trunk_data=bpy.data.meshes.new('tree-a-branch-graph');trunk_data.from_pydata(vertices,edges,[]);trunk_data.update()
tree_trunk=bpy.data.objects.new('tree-a-trunk',trunk_data);bpy.context.collection.objects.link(tree_trunk);bpy.context.view_layer.objects.active=tree_trunk;tree_trunk.select_set(True)
skin=tree_trunk.modifiers.new('continuous-tapered-forks','SKIN')
for i,r in enumerate(radii):tree_trunk.data.skin_vertices[0].data[i].radius=(r,r*.86)
tree_trunk.data.skin_vertices[0].data[0].use_root=True
bpy.ops.object.modifier_apply(modifier=skin.name)
sub=tree_trunk.modifiers.new('rounded-fork-transitions','SUBSURF');sub.subdivision_type='CATMULL_CLARK';sub.levels=1;sub.render_levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
reduce=tree_trunk.modifiers.new('preserve-silhouette-reduction','DECIMATE');reduce.ratio=.28
bpy.ops.object.modifier_apply(modifier=reduce.name)
# A shared floor cuts the buttress roots without a detached pedestal.
for v in tree_trunk.data.vertices:v.co.z=max(0,v.co.z)
tree_trunk.data.materials.append(WOOD);tree_trunk.data.materials.append(WOOD_LIGHT)
for p in tree_trunk.data.polygons:p.material_index=1 if p.normal.x<-.4 and p.center.z<2.3 else 0;p.use_smooth=True

# Fine tapered twigs and rounded, shallow-folded leaves. A leaf is actual geometry,
# not a ball or an alpha card; placement follows each authored shoot.
LEAF_OUTLINE=[(0,-.50),(.17,-.36),(.31,-.18),(.40,.02),(.39,.18),(.28,.28),(.24,.44),(.12,.53),(0,.55),(-.12,.53),(-.24,.44),(-.28,.28),(-.39,.18),(-.40,.02),(-.31,-.18),(-.17,-.36)]
class PlantDetail:
    def __init__(self):self.lv=[];self.lf=[];self.lm=[];self.tv=[];self.tf=[];self.leaf_count=0
    def twig(self,points,radii):
        points=[Vector(p) for p in points];n=5;base=len(self.tv)
        for i,p in enumerate(points):
            direction=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
            u=direction.cross(Vector((0,0,1)))
            if u.length<.01:u=direction.cross(Vector((0,1,0)))
            u.normalize();v=direction.cross(u).normalized()
            for j in range(n):a=math.tau*j/n;self.tv.append(tuple(p+radii[i]*(math.cos(a)*u+math.sin(a)*v)))
        for i in range(len(points)-1):
            for j in range(n):a=base+i*n+j;b=base+i*n+(j+1)%n;self.tf.append((a,b,b+n,a+n))
        self.tf.extend([tuple(base+i for i in range(n-1,-1,-1)),tuple(base+(len(points)-1)*n+i for i in range(n))])
    def leaf(self,attach,direction,normal,size,shade):
        attach=Vector(attach);long=Vector(direction).normalized();normal=Vector(normal).normalized()
        wide=long.cross(normal)
        if wide.length<.01:wide=long.cross(Vector((1,0,0)))
        wide.normalize();normal=wide.cross(long).normalized()
        center=attach+long*size*.50;start=len(self.lv)
        self.lv.append(tuple(center+normal*size*.075))
        for x,y in LEAF_OUTLINE:
            self.lv.append(tuple(center+wide*x*size*(.74+.22*math.sin(self.leaf_count*2.39996)**2)+long*y*size+normal*size*(.012+.07*y*y)))
        for i in range(16):self.lf.append((start,start+1+i,start+1+(i+1)%16));self.lm.append(shade)
        self.leaf_count+=1
    def shoot(self,root,axis,length,spread,shade,leaf_size,seed,twigs=3):
        root=Vector(root);axis=Vector(axis).normalized();side=axis.cross(Vector((0,0,1)))
        if side.length<.05:side=Vector((1,0,0))
        side.normalize();face=Vector((math.sin(seed*.7)*.65,-1,.7)).normalized()
        branch_shapes=[(root,root+axis*length*.55,root+axis*length)]
        if twigs>=2:branch_shapes.append((root+axis*length*.23,root+axis*length*.43+side*spread*.56,root+axis*length*.69+side*spread))
        if twigs>=3:branch_shapes.append((root+axis*length*.44,root+axis*length*.60-side*spread*.5,root+axis*length*.84-side*spread*.90))
        for j,curve in enumerate(branch_shapes):
            self.twig(curve,[.016 if leaf_size>.2 else .008,.010 if leaf_size>.2 else .005,.0035])
            for k,t in enumerate((.38,.60,.82)):
                attach=(1-t)**2*curve[0]+2*t*(1-t)*curve[1]+t*t*curve[2]
                tangent=((curve[1]-curve[0])*(1-t)+(curve[2]-curve[1])*t).normalized()
                for sign in (-1,1):
                    reach=(side*sign*.72+tangent*.46+Vector((0,0,.2))).normalized()
                    tilt=face+side*sign*(.25+.22*math.sin(seed+k))
                    self.leaf(attach,reach,tilt,leaf_size*(.90+.10*math.sin(seed+k+j)),shade if k<2 else min(3,shade+1))
            tipdirection=(curve[2]-curve[1]).normalized()
            self.leaf(curve[-1],tipdirection,face,leaf_size*.85,min(3,shade+1))
    def bough(self,root,center,radius,shade,leaf_size,seed,spokes=10,pairs=8):
        # Authored silhouette directions distribute leafy shoots across front, back,
        # lateral lobes and the upper dome, not a planar fan or random spherical mass.
        directions=[(-.80,-.45,.25),(-.30,-.80,.65),(.45,-.65,.60),(.85,-.15,.25),(.65,.55,.50),(.05,.75,.60),(-.65,.55,.45),(-.80,.10,-.25),(.40,-.30,-.35),(.05,.05,1)]
        root=Vector(root);center=Vector(center)
        for j,xyz in enumerate(directions[:spokes]):
            end=center+Vector(tuple(xyz[i]*radius[i] for i in range(3)))
            tangent=(end-root).normalized();side=tangent.cross(Vector((0,0,1)))
            if side.length<.05:side=Vector((1,0,0))
            side.normalize();across=tangent.cross(side).normalized()
            # The lower stem stays inside the volume occupied by the first leaves.
            bend=root.lerp(center,.60).lerp(end,.23)+side*(.035*math.sin(j+seed))
            self.twig([root,bend,end],[.012 if leaf_size>.2 else .007,.007 if leaf_size>.2 else .004,.0025])
            for k in range(pairs):
                t=.20+.77*k/max(1,pairs-1)
                attach=(1-t)**2*root+2*t*(1-t)*bend+t*t*end
                local_tangent=((bend-root)*(1-t)+(end-bend)*t).normalized()
                angle=k*2.39996+j*.78+seed*.53
                radial=side*math.cos(angle)+across*math.sin(angle)
                for sign in (-1,1):
                    outward=(radial*sign*.77+local_tangent*.33+Vector((0,0,.20))).normalized()
                    normal=(radial*sign*.38+Vector((0,0,.88))+side*.12*math.sin(k+seed)).normalized()
                    size=leaf_size*(.76+.22*math.sin(math.pi*t)+.06*math.cos(seed+j+k))
                    color=shade if k<pairs-2 else min(3,shade+1)
                    self.leaf(attach+radial*sign*leaf_size*.025,outward,normal,size,color)
    def build(self,prefix):
        foliage=object_mesh(prefix+'-foliage',self.lv,self.lf,LEAVES,self.lm)
        for p in foliage.data.polygons:p.use_smooth=True
        twigs=object_mesh(prefix+'-twigs',self.tv,self.tf,[WOOD])
        for p in twigs.data.polygons:p.use_smooth=True
        return foliage,twigs

# Five deliberately joined crown regions. Three broad upper regions overlap;
# the front and back shoulders add volume in side view while leaving the lower fork window open.
tree_detail=PlantDetail()
regions=[
(vertices[left[1]],(-1.03,.02,2.95),(.90,.73,.72),1,.34,11),
(vertices[trunk[6]],(-.09,-.02,3.76),(.94,.91,.74),2,.34,23),
(vertices[right_up[0]],(1.07,.13,3.25),(.91,.76,.77),1,.34,37),
(vertices[front[0]],(-.16,-.75,2.99),(.83,.48,.53),1,.33,49),
(vertices[back[0]],(.14,.81,3.22),(.80,.49,.59),0,.33,61),
]
for root,center,radius,shade,size,seed in regions:tree_detail.bough(root,center,radius,shade,size,seed)
tree_foliage,tree_twigs=tree_detail.build('tree-a')
tree_objects=[tree_trunk,tree_twigs,tree_foliage]

# A low, laterally spreading shrub. All roots lie within the basal foliage,
# and no open woody fork rises above the leaf layer.
shrub_detail=PlantDetail()
shrub_detail.bough((0,0,.025),(0,.01,.27),(.57,.44,.22),1,.19,80,spokes=10,pairs=5)
shrub_detail.bough((-.15,.05,.02),(-.38,.08,.21),(.26,.29,.17),0,.17,93,spokes=5,pairs=5)
shrub_detail.bough((.15,-.04,.02),(.36,-.09,.23),(.28,.28,.18),2,.18,107,spokes=5,pairs=5)
shrub_foliage,shrub_stems=shrub_detail.build('shrub-a');shrub_stems.name='shrub-a-stems'
shrub_objects=[shrub_stems,shrub_foliage]

# Final silhouette dimensions are part of the sample contract, not object-scale hacks.
def normalize(objects,width,height):
    coords=[v.co for o in objects for v in o.data.vertices]
    min_z=min(v.z for v in coords);max_z=max(v.z for v in coords)
    extent_x=max(v.x for v in coords)-min(v.x for v in coords)
    scale_x=width/extent_x;scale_z=height/(max_z-min_z)
    for o in objects:
        for v in o.data.vertices:v.co.x*=scale_x;v.co.y*=scale_x;v.co.z=(v.co.z-min_z)*scale_z
normalize(tree_objects,4.05,4.8);normalize(shrub_objects,1.50,.64)
for o in tree_objects+shrub_objects:
    o['assetStage']='independent-environment-sample-v001';o['role']='foliage' if 'foliage' in o.name else 'wood';o.data.update()

# Match the preview's warm daylight. Render helpers are excluded from every export.
plane=object_mesh('preview-ground',[(-12,-12,-.012),(12,-12,-.012),(12,12,-.012),(-12,12,-.012)],[(0,1,2,3)],[GROUND])
world=bpy.data.worlds.new('preview-daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.71,.77,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene=bpy.context.scene;scene.world=world
bpy.ops.object.light_add(type='AREA',location=(-4,-5,9));key=bpy.context.object;key.name='preview-key';key.data.energy=1000;key.data.size=5
key.rotation_euler=(Vector((0,0,2))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,7));sun=bpy.context.object;sun.name='preview-sun';sun.data.energy=1.5;sun.rotation_euler=(.4,-.5,-.45);sun.data.angle=.12
bpy.ops.object.camera_add(location=(7,-10,6));camera=bpy.context.object;camera.name='preview-camera';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=6.2;camera.rotation_euler=(Vector((0,0,2.3))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'

# Source contains both isolated assets, in separate collections, at ground origin.
for label,objects in [('Tree A',tree_objects),('Shrub A',shrub_objects)]:
    collection=bpy.data.collections.new(label);scene.collection.children.link(collection)
    for o in objects:
        for c in list(o.users_collection):c.objects.unlink(o)
        collection.objects.link(o)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'vegetation.blend'))
metrics=[]
for asset,objects in [('tree-a',tree_objects),('shrub-a',shrub_objects)]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    path=OUTPUT/(asset+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_extras=True)
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);triangles=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
    coords=[v.co for o in objects for v in o.data.vertices]
    metrics.append({'asset':asset,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':triangles,'meshes':len(g['meshes']),'primitives':sum(len(m['primitives']) for m in g['meshes']),'materials':len(g['materials']),'boundsYUp':{'min':[min(v.x for v in coords),min(v.z for v in coords),-max(v.y for v in coords)],'max':[max(v.x for v in coords),max(v.z for v in coords),-min(v.y for v in coords)]},'leafCount':tree_detail.leaf_count if asset=='tree-a' else shrub_detail.leaf_count})
manifest={'stage':'Independent sample, pending visual acceptance','unit':'metre','upAxis':'Y','origin':'ground at stem foot','assets':metrics,'references':['环境小品和树木资产设定板.png','原始小旅人出生点第三人称开场图.png'],'modeling':'Authored curved tapered branch graph with continuous Skin/Subdivision junctions; real 16-triangle rounded leaf silhouettes placed on composed shoots. No icospheres or sphere canopy masses.','limitations':['Leaf motion is not part of this static visual sample.','Source concept uses painterly shading; this sample uses portable matte PBR materials.', 'Visual self-review: foliage still reads as individual thin leaf surfaces at close range; the side silhouette is narrower and twig rhythm more regular than the concept art. This is a reviewable sample, not final-map art approval.']}
(SOURCE/'vegetation-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('VEGETATION_EXPORT',json.dumps(manifest,ensure_ascii=False))
for asset,objects,height,ortho in [('tree',tree_objects,4.8,6.2),('shrub',shrub_objects,.64,1.9)]:
    for o in tree_objects+shrub_objects:o.hide_render=o not in objects
    center=Vector((0,0,height*.48))
    for view,delta in [('front',(0,-10,1.0)),('side',(10,0,1.0)),('oblique',(7,-10,2.8))]:
        camera.location=center+Vector(delta)*(1 if asset=='tree' else .35)
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=ortho
        scene.render.filepath=str(WORK/f'environment-sample-v001-{asset}-{view}.png')
        bpy.ops.render.render(write_still=True)
