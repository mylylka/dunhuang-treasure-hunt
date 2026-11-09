"""Render photography-only cutaways from the running GLBs; never saves source models."""
import bpy, sys, json
from pathlib import Path
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/world'
MODE=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def load(path):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/path))
    return [o for o in bpy.context.scene.objects if o not in before]

if MODE=='courtyard':
    objects=load('public/assets/world/courtyard/v006/courtyard.glb')
    cut_hidden=[]
    for o in objects:
        if o.type!='MESH': continue
        name=str(o.get('semanticGroup',o.name)); lower=name.lower()
        # Match the terrain preview's 2m-per-side courtyard expansion in the GLB root.
        p=[o.matrix_world@Vector(c) for c in o.bound_box]
        center=(min(v.x for v in p)+max(v.x for v in p))/2
        side=-1 if center<0 else 1
        sx,offset=1,0
        if name.startswith(('courtyard-side-wall','courtyard-side-art','courtyard-wall-')):offset=side*2
        elif name=='courtyard-rear-wall':sx=1.2
        elif name=='courtyard-ground':sx=23.7/19.7
        elif name.startswith('entrance-wing-coping'):sx=9.2/7.2;offset=side*2.9*(1-sx)
        elif name.startswith(('entrance-wing','entrance-stone-base')):sx=9/7;offset=side*3*(1-sx)
        elif name.startswith('wall-painted-border'):sx=8.5/6.5;offset=side*3.25*(1-sx)
        elif name.startswith(('entrance-inner-art','entrance-outer-art')):offset=(center-side*3)*2/7
        if sx!=1 or offset:o.matrix_world=Matrix.Translation((offset,0,0))@Matrix.Diagonal((sx,1,1,1))@o.matrix_world
        # The terrain scene hides the older caisson. The new one is omitted for the cutaway.
        if name.startswith(('caisson-','tree-','shrub-','road-grass')):o.hide_render=True
        if (name.startswith(('hall-v003-upper-','hall-v003-lower-eave-'))
            or name=='hall-v003-high-roof-lining' or name=='entrance-roof'):cut_hidden.append(o)
    # The running terrain adds two paving strips after loading the base GLB.
    paving=next(o for o in objects if o.type=='MESH' and str(o.get('semanticGroup',o.name))=='courtyard-paving')
    mats=list(paving.data.materials)
    for side,(left,right) in enumerate([(-11.75,-10.07),(9.77,11.75)]):
        width=(right-left-.04)/2
        for row in range(21):
            for col in range(2):
                cx=left+width/2+col*(width+.04);cy=.95+row*1.15
                bpy.ops.mesh.primitive_cube_add(size=1,location=(cx,cy,-.003))
                tile=bpy.context.object;tile.name=f'photo-preview-paving-{side}-{row}-{col}'
                tile.dimensions=(width,1.105,.012)
                if mats:tile.data.materials.append(mats[(row*2+col+side)%len(mats)])
    views=[('decoration-courtyard-overhead',0,13,44),('decoration-cutaway-courtyard',0,13,44),('decoration-cutaway-hall',0,17,29)]
elif MODE=='cave':
    objects=load('public/assets/world/mogao/v010/interior.glb')
    for o in objects:
        if o.type=='MESH' and (o.name.startswith(('pyramid-vault','summit-frame','continuous-tunnel-ceiling'))):o.hide_render=True
    load('public/assets/world/mogao/v009/buddha.glb')
    views=[('decoration-cutaway-cave',0,19.5,41)]
elif MODE=='music':
    objects=load('public/assets/world/music-pavilion/v005/music-pavilion.glb')
    views=[('decoration-music-overhead',1,4,60),('decoration-music-cutaway',1,4,60)]
elif MODE=='cliff':
    load('public/assets/world/mogao/v011/mountain.glb')
    load('public/assets/world/mogao-massing/v003/tower.glb')
    views=[('decoration-cliff-overhead',0,11,180)]
elif MODE=='tower':
    load('public/assets/world/mogao-massing/v003/tower.glb')
    views=[('decoration-tower-elevation',0,29.4,80)]
else:raise ValueError(MODE)

scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='FLAT'
scene.display.shading.color_type='TEXTURE'
scene.display.shading.show_shadows=False
scene.display.shading.show_cavity=False
scene.display.shading.background_type='WORLD'
scene.world=bpy.data.worlds.new('cutaway-background')
scene.world.color=(0.50,0.45,0.36)
scene.render.resolution_x=2048;scene.render.resolution_y=1536;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.rotation_euler=(0,0,0)
for name,x,y,width in views:
    if MODE=='courtyard':
        for o in cut_hidden:o.hide_render=name!='decoration-courtyard-overhead'
    if MODE=='music':
        for o in objects:
            if o.type=='MESH' and str(o.get('semanticGroup','')) in ('main-roof','porch-roof','roof-wall-closure'):
                o.hide_render=name.endswith('cutaway')
    if MODE=='tower':
        cam.location=(0,-120,29.4);cam.rotation_euler=(Vector((0,0,29.4))-cam.location).to_track_quat('-Z','Y').to_euler()
    else:cam.location=(x,y,100)
    cam.data.ortho_scale=width
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('CUTAWAY_RENDER',scene.render.filepath,flush=True)
