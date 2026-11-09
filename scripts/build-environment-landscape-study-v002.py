"""Repair all rock foundations against the actual v001 triangle terrain.
Independent v002 only; fixed sun, terrain and previous versions are preserved.
"""
import bpy, json, math, sys, argparse
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/models/environment-study/v002'
OUT=ROOT/'outputs/environment-study/v002'
SOURCE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--draft',action='store_true');parser.add_argument('--stage',choices=['all','build','render'],default='all')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])

def ground_height(ground,x,y):
    hit,point,normal,index=ground.ray_cast(Vector((x,y,500)),Vector((0,0,-1)))
    if not hit:raise ValueError(f'Outside the actual terrain: {x}, {y}')
    return point.z

def perimeter_samples(obj,count=80,per_edge=8):
    vertices=obj.data.vertices
    for k in range(count):
        a=vertices[k].co;b=vertices[(k+1)%count].co
        for sub in range(per_edge):yield a.lerp(b,sub/per_edge)

def full_foundation_check(obj,ground,count=80,radial_steps=12,per_edge=4):
    ring=list(perimeter_samples(obj,count,per_edge))
    center=sum((v for v in ring),Vector())/len(ring)
    clearances=[];worst=None
    for edge in ring:
        for j in range(1,radial_steps+1):
            p=center.lerp(edge,j/radial_steps*.999)
            hit,bottom,normal,index=obj.ray_cast(Vector((p.x,p.y,-150)),Vector((0,0,1)))
            if not hit:continue
            clearance=bottom.z-ground_height(ground,p.x,p.y)
            clearances.append(clearance)
            if worst is None or clearance>worst['clearance']:worst={'clearance':clearance,'point':list(bottom)}
    return {'samples':len(clearances),'maximumClearance':max(clearances),'minimumClearance':min(clearances),'worst':worst}

def debris_check(obj,ground):
    vs=[v.co for v in obj.data.vertices]
    bounds=[(min(v[i] for v in vs),max(v[i] for v in vs)) for i in range(3)]
    samples=[]
    for xi in range(21):
        for yi in range(21):
            x=bounds[0][0]+(bounds[0][1]-bounds[0][0])*(xi+.5)/21
            y=bounds[1][0]+(bounds[1][1]-bounds[1][0])*(yi+.5)/21
            hit,bottom,normal,index=obj.ray_cast(Vector((x,y,-150)),Vector((0,0,1)))
            if hit:samples.append(bottom.z-ground_height(ground,x,y))
    return {'samples':len(samples),'maximumClearance':max(samples),'minimumClearance':min(samples)}

def build():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/world/models/environment-study/v001/landscape.blend'))
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene;ground=bpy.data.objects['Continuous dune field']
    rock_reports=[];worst_rock=None
    for obj in sorted([o for o in scene.objects if o.name.startswith('Yardang mass')],key=lambda o:o.name):
        before=full_foundation_check(obj,ground)
        before_rim=max(({'clearance':p.z-ground_height(ground,p.x,p.y),'point':list(p)} for p in perimeter_samples(obj,80,16)),key=lambda item:item['clearance'])
        before['rimMaximumClearance']=before_rim['clearance'];before['worstRim']=before_rim
        if worst_rock is None or before_rim['clearance']>worst_rock[1]['rimMaximumClearance']:worst_rock=(obj.name,before)
        count=80;old=obj.data;verts=[];faces=[];start=0
        anchor_ring=15;transition_rings=20
        anchors=[old.vertices[anchor_ring*count+k].co.copy() for k in range(count)]
        center=sum(anchors,Vector())/count
        feet=[]
        # Rebuild the lowest ~30% as continuous weathered flanks. The flare gets
        # wider on the low side of the dune; no vertical wall is bolted under it.
        for k,anchor in enumerate(anchors):
            direction=Vector((anchor.x-center.x,anchor.y-center.y,0)).normalized()
            old_foot=old.vertices[k].co
            original_flare=max(0,(Vector((old_foot.x-anchor.x,old_foot.y-anchor.y,0))).dot(direction))
            extension=max(2,original_flare)
            for iteration in range(8):
                foot=anchor+direction*extension
                foot.z=ground_height(ground,foot.x,foot.y)-1.0
                desired=max(original_flare,(anchor.z-foot.z)*.75,2)
                extension=extension*.35+desired*.65
            foot=anchor+direction*extension;foot.z=ground_height(ground,foot.x,foot.y)-1.0
            feet.append(foot)
        for ring in range(transition_rings):
            f=1-ring/transition_rings
            for k,(anchor,foot) in enumerate(zip(anchors,feet)):
                horizontal=.28*f+.72*f*f
                p=anchor.lerp(foot,horizontal)
                p.z=anchor.z+(foot.z-anchor.z)*f
                # Low-amplitude connected facets avoid a perfectly lathed cone.
                drift=math.sin(k*.47+ring*.6)*.10*math.sin(f*math.pi)
                direction=Vector((foot.x-anchor.x,foot.y-anchor.y,0)).normalized()
                p+=direction*drift
                verts.append(tuple(p))
        verts.extend(tuple(v.co) for v in old.vertices[anchor_ring*count:])
        ring_count=transition_rings+(49-anchor_ring)
        for ring in range(ring_count-1):
            for k in range(count):faces.append((ring*count+k,ring*count+(k+1)%count,(ring+1)*count+(k+1)%count,(ring+1)*count+k))
        faces.append(tuple((ring_count-1)*count+k for k in range(count)))
        buried_center=sum(feet,Vector())/count;buried_center.z=min(-20,min(p.z for p in feet)-10)
        bottom=len(verts);verts.append(tuple(buried_center))
        for k in range(count):faces.append((bottom,(k+1)%count,k))
        data=bpy.data.meshes.new(obj.name+' complete buried foundation');data.from_pydata(verts,[],faces);data.update()
        for mat in old.materials:data.materials.append(mat)
        obj.data=data
        after=full_foundation_check(obj,ground)
        edge_uses={}
        for face in faces:
            for i,a in enumerate(face):
                b=face[(i+1)%len(face)];key=tuple(sorted((a,b)))
                edge_uses[key]=edge_uses.get(key,0)+1
        after['closedSolid']=all(count==2 for count in edge_uses.values())
        assert after['closedSolid'],obj.name
        # Audit all lower-body ring projections too: an overhanging lower ledge
        # must not be left floating beyond an otherwise buried first ring.
        low_clearances=[];center_xy=sum((v.co for v in data.vertices[:80]),Vector())/80
        for ring in range(1,17):
            for k in range(count):
                a=data.vertices[ring*count+k].co;b=data.vertices[ring*count+(k+1)%count].co
                for fraction in (0,.5):
                    p=center_xy.lerp(a.lerp(b,fraction),.999)
                    hit,bottom_hit,normal,index=obj.ray_cast(Vector((p.x,p.y,-150)),Vector((0,0,1)))
                    if hit:low_clearances.append(bottom_hit.z-ground_height(ground,p.x,p.y))
        after['lowLayerProjectionSamples']=len(low_clearances)
        after['lowLayerProjectionMaxClearance']=max(low_clearances)
        # Dense bottom-ring edge sampling catches interpolation over triangle boundaries.
        edge_max=-1e9
        for k in range(count):
            a=data.vertices[start+k].co;b=data.vertices[start+(k+1)%count].co
            for i in range(17):
                p=a.lerp(b,i/16);edge_max=max(edge_max,p.z-ground_height(ground,p.x,p.y))
        assert after['maximumClearance']<-.05 and edge_max<-.05 and max(low_clearances)<-.05,(obj.name,after,edge_max)
        rock_reports.append({'name':obj.name,'before':before,'after':after,'buriedRimMaximumClearance':edge_max})
    debris_reports=[]
    for obj in sorted([o for o in scene.objects if o.name.startswith('Weathered debris')],key=lambda o:o.name):
        obj.data=obj.data.copy();obj.data.transform(obj.matrix_world);obj.matrix_world=Matrix.Identity(4);obj.data.update()
        before=debris_check(obj,ground)
        shift=-before['maximumClearance']-.10
        for v in obj.data.vertices:v.co.z+=shift
        obj.data.update();after=debris_check(obj,ground)
        assert after['maximumClearance']<-.04,(obj.name,after)
        debris_reports.append({'name':obj.name,'verticalShift':shift,'before':before,'after':after})
    # Keep quiet areas quiet: remove the regular wave normal, retain subtle sand grain.
    sand=bpy.data.materials['Warm dune sand'];shader=next(n for n in sand.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for link in list(shader.inputs['Normal'].links):sand.node_tree.links.remove(link)
    grain=next(n for n in sand.node_tree.nodes if n.type=='BUMP' and abs(n.inputs['Distance'].default_value-.035)<.001)
    grain.inputs['Strength'].default_value=.09;sand.node_tree.links.new(grain.outputs['Normal'],shader.inputs['Normal'])
    worst_name,worst_before=worst_rock
    name='Yardang mass 01';rock=bpy.data.objects[name]
    p=min((v.co.copy() for v in rock.data.vertices[:80]),key=lambda v:v.y)
    eye=Vector((p.x-25,p.y-35,0));eye.z=ground_height(ground,eye.x,eye.y)+2.3
    target=p.copy();target.z=ground_height(ground,target.x,target.y)+3.6
    report={'status':'Independent v002 rock-ground repair; not in game',
      'sun':'Unchanged northwest 315 degrees / altitude 30 degrees',
      'terrain':'Exact original v001 triangle geometry retained; all contact queries raycast that mesh',
      'cause':'v001 bottom rings and debris were placed from a single center height, leaving lower-slope edges above the mesh.',
      'repair':'Lowest approximately 30% rebuilt as twenty continuous flared rings ending beneath the actual terrain around the full perimeter. Wider toe on low slopes; closed solid volume; original upper rock geometry retained. Debris buried by full-footprint underside sampling.',
      'rocks':rock_reports,'debris':debris_reports,
      'summary':{'rockCount':len(rock_reports),'debrisCount':len(debris_reports),
        'beforeRockMaximumClearance':max(r['before']['maximumClearance'] for r in rock_reports),
        'beforeRimMaximumClearance':max(r['before']['rimMaximumClearance'] for r in rock_reports),
        'afterRockMaximumClearance':max(r['after']['maximumClearance'] for r in rock_reports),
        'afterRimMaximumClearance':max(r['buriedRimMaximumClearance'] for r in rock_reports),
        'afterLowLayerProjectionMaximumClearance':max(r['after']['lowLayerProjectionMaxClearance'] for r in rock_reports),
        'afterDebrisMaximumClearance':max(r['after']['maximumClearance'] for r in debris_reports)},
      'worstOriginalRim':{'rock':worst_name,'point':worst_before['worstRim']},
      'closeContactView':{'rock':name,'toePoint':list(p),'eye':list(eye),'target':list(target)}}
    (SOURCE/'landscape-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'landscape.blend'))
    print('CONTACT_CHECK',json.dumps(report['summary']),flush=True)

def render():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'landscape.blend'))
    scene=bpy.context.scene;camera=scene.camera
    report=json.loads((SOURCE/'landscape-manifest.json').read_text());close=report['closeContactView']
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=60 if args.draft else 100
    scene.cycles.samples=16 if args.draft else 48;scene.render.threads_mode='FIXED';scene.render.threads=4
    for name,eye,target,lens in [('landscape-aerial',(-235,-260,170),(35,130,16),41),('rock-contact',close['eye'],close['target'],43)]:
        camera.location=eye;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=lens
        scene.render.filepath=str((ROOT/'work/world' if args.draft else OUT)/(name+('-v002-draft' if args.draft else '')+'.png'))
        bpy.ops.render.render(write_still=True);print('RENDER',scene.render.filepath,flush=True)

if args.stage in ('all','build'):build()
if args.stage in ('all','render'):render()
