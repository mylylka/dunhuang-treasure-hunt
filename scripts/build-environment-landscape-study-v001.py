"""Independent fixed-sun terrain art study. Never imports/changes the game.
blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-landscape-study-v001.py -- --stage build|render
"""
import bpy, math, random, json, sys, argparse
from pathlib import Path
from mathutils import Vector, noise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'outputs/environment-study/v001'
SOURCE = ROOT/'art-source/world/models/environment-study/v001'
OUT.mkdir(parents=True, exist_ok=True); SOURCE.mkdir(parents=True, exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--stage',choices=['build','render','all'],default='all')
parser.add_argument('--draft',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
SUN = Vector((-.6123724357,.6123724357,.5))

def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(lin(int(h[i:i+2],16)/255) for i in (0,2,4))
def mesh(name, verts, faces, material):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material);return obj
def material(name,colors,scale,bump_distance):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
    p.inputs['Roughness'].default_value=.93
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=3
    coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Object'],tex.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(*rgb(colors[0]),1)
    ramp.color_ramp.elements[1].position=.85;ramp.color_ramp.elements[1].color=(*rgb(colors[1]),1)
    l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
    detail=n.new('ShaderNodeTexNoise');detail.inputs['Scale'].default_value=6;detail.inputs['Detail'].default_value=2
    l.new(coord.outputs['Object'],detail.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.26;bump.inputs['Distance'].default_value=bump_distance
    l.new(detail.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
    return m,coord,p

ROCKS=[
    (40,72,23,14,34,8), (80,111,31,20,49,19), (125,182,37,24,62,21),
    (14,170,23,16,28,36), (179,251,49,31,42,44), (58,269,34,21,40,59),
    (141,49,18,12,21,63), (188,119,23,17,29,72), (-36,252,29,19,25,83),
    (230,315,55,28,55,94), (102,355,44,28,34,105), (-11,367,39,25,31,116),
    (214,32,20,17,22,127), (237,200,30,22,36,139),
    (68,173,9,7,35,142), (164,224,10,8,39,153), (3,116,11,8,18,161)
]

def terrain(x,y):
    # Broad continuous asymmetric shoulders with an articulated lee side.
    v=1.5+1.2*math.sin(y*.013+x*.006)
    for row,amp,phase in [(-70,21,.3),(25,34,1.8),(125,39,2.9),(245,47,.9),(395,52,2.0),(590,65,3.4)]:
        crest=row+22*math.sin(x*.012+phase)+.13*x
        d=y-crest
        width=64 if d<0 else 23
        shoulder=amp*math.exp(-abs(d/width)**1.65)
        # Sand gives way to a broad rocky basin on the right.
        fade=1-.82/(1+math.exp(-(x-2)/30))
        v=max(v,shoulder*fade+1.5)
    for rx,ry,wx,wy,h,seed in ROCKS:
        q=((x-rx)/(wx*1.8))**2+((y-ry)/(wy*1.9))**2
        v+=h*.095*math.exp(-q*1.5)
    return v

def rock(name,x,y,rx,ry,h,seed,mat):
    rng=random.Random(seed);count=80;ring_count=49
    base=terrain(x,y)-1.2;angle=rng.uniform(-.5,.5)
    verts=[];faces=[]
    phase=rng.random()*6.28
    shelves=sorted((rng.uniform(.18,.88),rng.uniform(.01,.035),rng.uniform(.025,.065)) for _ in range(4))
    for j in range(ring_count):
        t=j/(ring_count-1)
        # Wide eroded foot, restrained ledges, tall shear faces, broad flat crown.
        profile=(1.20-.36*min(1,t/.28)) if t<.28 else .84-.12*(t-.28)/.72
        profile+=.007*math.sin(t*(31+seed%12)+phase)
        for level,depth,width in shelves:profile-=depth*math.exp(-((t-level)/width)**2)
        for k in range(count):
            a=math.tau*k/count
            contour=1+.14*math.sin(a*3+phase)+.055*math.cos(a*7-phase)+.025*math.sin(a*13+seed)
            cleft=.16*math.exp(-((math.atan2(math.sin(a-.7),math.cos(a-.7)))/.12)**2)*math.sin(t*math.pi)
            cleft+=.09*math.exp(-((math.atan2(math.sin(a-3.7),math.cos(a-3.7)))/.18)**2)*math.sin(t*math.pi)
            contour+=.011*math.sin(a*24+phase)*math.sin(t*6.1+phase)
            contour-=cleft
            xx=math.copysign(abs(math.cos(a))**.65,math.cos(a))*rx*contour*profile
            yy=math.copysign(abs(math.sin(a))**.65,math.sin(a))*ry*contour*profile
            xx+=h*.065*t*math.sin(phase); yy+=h*.04*t*math.cos(phase)
            z=base+h*t+.23*math.sin(a*4+phase)+.16*math.sin(a*9+t*2)
            if j==ring_count-1:z+=1.8*math.sin(a*2+phase)
            verts.append((x+xx*math.cos(angle)-yy*math.sin(angle),y+xx*math.sin(angle)+yy*math.cos(angle),z))
    for j in range(ring_count-1):
        for k in range(count):faces.append((j*count+k,j*count+(k+1)%count,(j+1)*count+(k+1)%count,(j+1)*count+k))
    faces.append(tuple(reversed(range(count))));faces.append(tuple((ring_count-1)*count+k for k in range(count)))
    obj=mesh(name,verts,faces,mat)
    # Small planar rock faces retain geometry, not a reference-photo projection.
    for p in obj.data.polygons:p.use_smooth=False
    return obj

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    sand,coord,p=material('Warm dune sand',('d5a65e','e3b771'),.042,.035)
    n=sand.node_tree.nodes;l=sand.node_tree.links
    wave=n.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction='Y'
    wave.inputs['Scale'].default_value=2.5;wave.inputs['Distortion'].default_value=16;wave.inputs['Detail Scale'].default_value=.12
    l.new(coord.outputs['Object'],wave.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.022
    l.new(wave.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
    rockmat,rc,rp=material('Wind-eroded warm sediment',('84664a','bca17e'),.095,.12)
    n=rockmat.node_tree.nodes;l=rockmat.node_tree.links
    separate=n.new('ShaderNodeSeparateXYZ');l.new(rc.outputs['Object'],separate.inputs[0])
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=1;tex.inputs['Detail'].default_value=3
    stretch=n.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY';stretch.inputs[1].default_value=(.7,.7,7)
    l.new(rc.outputs['Object'],stretch.inputs[0]);l.new(stretch.outputs[0],tex.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.42;bump.inputs['Distance'].default_value=.13
    l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],rp.inputs['Normal'])
    nx,ny=321,401;xs=[-480+i*3 for i in range(nx)];ys=[-300+j*3 for j in range(ny)]
    verts=[(x,y,terrain(x,y)) for y in ys for x in xs]
    faces=[(j*nx+i,j*nx+i+1,(j+1)*nx+i+1,(j+1)*nx+i) for j in range(ny-1) for i in range(nx-1)]
    ground=mesh('Continuous dune field',verts,faces,sand)
    for p in ground.data.polygons:p.use_smooth=True
    bpy.ops.mesh.primitive_plane_add(size=15000,location=(0,0,-.1));bpy.context.object.name='Distant basin continuity';bpy.context.object.data.materials.append(sand)
    for i,(x,y,rx,ry,h,seed) in enumerate(ROCKS):rock(f'Yardang mass {i+1:02}',x,y,rx,ry,h,seed,rockmat)
    # Angular fallen fragments at the toes of selected outcrops; not an obstacle field.
    rng=random.Random(331)
    for i in range(95):
        parent=ROCKS[rng.randrange(len(ROCKS))];x,y,rx,ry,h,seed=parent
        a=rng.random()*math.tau;r=rng.uniform(1.35,2.1)
        px=x+math.cos(a)*rx*r;py=y+math.sin(a)*ry*r
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px,py,terrain(px,py)+.35))
        obj=bpy.context.object;obj.name=f'Weathered debris {i:03}'
        s=rng.uniform(.45,2.4);obj.scale=(s*rng.uniform(1,1.7),s*rng.uniform(.7,1.3),s*rng.uniform(.4,.85))
        obj.rotation_euler=(rng.random()*.6,rng.random()*.6,rng.random()*6.28);obj.data.materials.append(rockmat)
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48
    scene.cycles.use_denoising=True;scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.5
    world=bpy.data.worlds.new('Pale blue sky fill');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(*rgb('c5dcec'),1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
    wn=world.node_tree.nodes;wl=world.node_tree.links
    camera_sky=wn.new('ShaderNodeBackground');camera_sky.inputs['Color'].default_value=(*rgb('b7d1e3'),1);camera_sky.inputs['Strength'].default_value=.8
    ray=wn.new('ShaderNodeLightPath');mix=wn.new('ShaderNodeMixShader')
    wl.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);wl.new(wn['Background'].outputs[0],mix.inputs[1]);wl.new(camera_sky.outputs[0],mix.inputs[2]);wl.new(mix.outputs[0],wn['World Output'].inputs['Surface'])
    bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='FIXED northwest sun altitude 30 deg'
    sun.rotation_euler=(-SUN).to_track_quat('-Z','Y').to_euler();sun.data.energy=3.2;sun.data.angle=math.radians(1.3);sun.data.color=(1,.88,.7)
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Study camera';scene.camera=cam
    cam.data.lens=41;cam.data.clip_end=3000
    cam.location=(-235,-260,170);cam.rotation_euler=(Vector((35,130,16))-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'landscape.blend'))
    report={'status':'Independent discussion sample, not installed in game','units':'metres','terrainSize':[960,1200],
      'duneHeightRange':[21,65],'rockHeights':[r[4] for r in ROCKS],
      'fixedSun':{'azimuthFromNorthClockwise':315,'elevation':30,'blenderSourceDirection':list(SUN),'energy':3.2,'skyStrength':.3},
      'geometry':{'terrainVertices':len(verts),'rockMasses':len(ROCKS),'fallenFragments':95},
      'construction':'Continuous asymmetric dunes; layered polygonal wind-eroded masses, physical cast shadows. No reference-image projection.',
      'render':'Blender Cycles; 1600x1000; 48 samples; denoising; not proof of runtime performance'}
    (SOURCE/'landscape-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print('LANDSCAPE_BUILD_COMPLETE',flush=True)

def render():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'landscape.blend'))
    scene=bpy.context.scene;cam=scene.camera
    if args.draft:scene.render.resolution_percentage=50;scene.cycles.samples=16
    for name,location,target,lens in [
        ('landscape-aerial',(-235,-260,170),(35,130,16),41),
        ('landscape-ground',(-87,-106,terrain(-87,-106)+1.8),(64,143,21),42)]:
        cam.location=location;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
        scene.render.filepath=str((ROOT/'work/world' if args.draft else OUT)/(name+('-draft' if args.draft else '')+'.png'))
        bpy.ops.render.render(write_still=True);print('LANDSCAPE_RENDER',scene.render.filepath,flush=True)

if args.stage in ('build','all'):build()
if args.stage in ('render','all'):render()
