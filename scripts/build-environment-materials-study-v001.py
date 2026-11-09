"""Three independent ground-material studies with reusable periodic texture maps.
Blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-materials-study-v001.py
No game scene or original asset is modified. All distances are metres.
"""
import bpy, math, random, json, sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/environment-study/v001'
TEX=OUT/'textures'
SOURCE=ROOT/'art-source/world/models/environment-study/v001'
for p in (OUT,TEX,SOURCE):p.mkdir(parents=True,exist_ok=True)
SUN=Vector((-.6123724357,.6123724357,.5))
N=1024; TILE=4.0

def linear(a):
    a=np.asarray(a,dtype=np.float32)
    return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def rgb(h):return tuple(float(v) for v in linear([int(h[i:i+2],16)/255 for i in (0,2,4)]))

def save_image(name,data,color=False):
    im=bpy.data.images.new(name,width=N,height=N,alpha=False,float_buffer=False)
    im.colorspace_settings.name='sRGB' if color else 'Non-Color'
    rgba=np.ones((N,N,4),dtype=np.float32)
    if data.ndim==2:data=np.repeat(data[:,:,None],3,axis=2)
    # Byte image.save writes these pixel values directly. Encode sRGB here;
    # the image texture's sRGB tag performs the single decode during shading.
    rgba[:,:,:3]=np.clip(data,0,1)
    im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save()
    return im

def maps(kind):
    rng=np.random.default_rng({'sand':73,'gravel':174,'gobi':275}[kind])
    u,v=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
    broad=(np.sin(math.tau*(u*2+v)+.7)+.5*np.cos(math.tau*(u-v*3))+.35*np.sin(math.tau*(v*5-u)))/1.85
    grain=np.zeros((N,N))
    for frequency,weight in [(31,.35),(71,.25),(149,.18),(271,.12),(397,.10)]:
        grain+=weight*np.sin(math.tau*(u*frequency+v*(frequency//3))+frequency)*np.cos(math.tau*(v*(frequency-5)-u*7))
    warp=.4*np.sin(math.tau*u)+.60*np.sin(math.tau*(v*2-u))+.24*np.sin(math.tau*(u*3+v*5))
    ripple=.5+.5*np.sin(math.tau*(v*21+warp))
    ripple=ripple**3
    base=np.array({'sand':(.85,.72,.50),'gravel':(.835,.705,.49),'gobi':(.73,.67,.56)}[kind])
    color=np.clip(base[None,None,:]+broad[:,:,None]*.022+grain[:,:,None]*.017,0,1)
    # Height controls the normal only. Sunlight never enters the base-colour map.
    patch=.20+.80*(.5+.5*np.sin(math.tau*(u-v)+.5*np.cos(math.tau*v)))**2
    height=.00085*grain+(ripple*patch*.0045 if kind=='sand' else ripple*.0008)
    rough=.90+grain*.035
    pebble_count={'sand':0,'gravel':780,'gobi':3800}[kind]
    palettes=np.array([(.64,.57,.47),(.75,.67,.55),(.84,.76,.63),(.68,.65,.59),(.79,.70,.58),(.56,.53,.47)])
    for i in range(pebble_count):
        cx,cy=rng.uniform(0,N,2)
        radius=rng.uniform(2.8,10.5) if kind=='gravel' else rng.uniform(2.7,10.3)
        ratio=rng.uniform(.53,.90);angle=rng.uniform(0,math.tau)
        r=int(radius*1.6)+2
        xx=np.arange(math.floor(cx)-r,math.floor(cx)+r+1)
        yy=np.arange(math.floor(cy)-r,math.floor(cy)+r+1)
        dx,dy=np.meshgrid(xx-cx,yy-cy)
        a=(dx*math.cos(angle)+dy*math.sin(angle))/radius
        b=(-dx*math.sin(angle)+dy*math.cos(angle))/(radius*ratio)
        th=np.arctan2(b,a)
        contour=1+.10*np.sin(th*3+i)+.06*np.cos(th*5+i*.7)
        dist=np.sqrt(a*a+b*b)/contour
        alpha=np.clip((1-dist)*7,0,1)
        profile=np.clip(1-dist*dist,0,1)**.55
        iy,ix=np.meshgrid(yy%N,xx%N,indexing='ij')
        shade=palettes[int(rng.integers(len(palettes)))]
        mineral=(.008*np.sin(a*13+b*9+i)+.011*np.cos(b*17-a*3))[:,:,None]
        old=color[iy,ix]
        color[iy,ix]=old*(1-alpha[:,:,None])+(shade[None,None,:]+mineral)*alpha[:,:,None]
        height[iy,ix]=np.maximum(height[iy,ix],profile*radius/N*TILE*.18)
        rough[iy,ix]=rough[iy,ix]*(1-alpha)+(.83+.035*math.sin(i))*alpha
    step=TILE/N
    gx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))/(2*step)
    gy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))/(2*step)
    normal=np.stack((-gx,-gy,np.ones_like(gx)),axis=2)
    normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    images=[save_image(kind+'-basecolor',color,True),save_image(kind+'-normal',normal*.5+.5),save_image(kind+'-roughness',rough)]
    print('TEXTURES_COMPLETE',kind,flush=True)
    return images

def material(kind,images):
    m=bpy.data.materials.new(kind+'-exportable-pbr');m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
    for image,socket in zip(images,('Base Color','Normal','Roughness')):
        tex=n.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT';tex.interpolation='Linear'
        if socket=='Normal':
            normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.8
            l.new(tex.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs['Normal'])
        else:l.new(tex.outputs['Color'],p.inputs[socket])
    return m

def transition_material(allmaps):
    m=bpy.data.materials.new('sand-gravel-gobi-natural-transition');m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links
    n.clear();p=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs[0],out.inputs['Surface'])
    coord=n.new('ShaderNodeTexCoord');xyz=n.new('ShaderNodeSeparateXYZ');l.new(coord.outputs['Object'],xyz.inputs[0])
    noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=.45;noise.inputs['Detail'].default_value=2
    l.new(coord.outputs['Object'],noise.inputs['Vector'])
    distort=n.new('ShaderNodeMath');distort.operation='MULTIPLY_ADD';distort.inputs[1].default_value=3;distort.inputs[2].default_value=-1.5;l.new(noise.outputs['Fac'],distort.inputs[0])
    axis=n.new('ShaderNodeMath');axis.operation='ADD';l.new(xyz.outputs['X'],axis.inputs[0]);l.new(distort.outputs[0],axis.inputs[1])
    masks=[]
    for a,b in [(-4,-1),(2,5)]:
        r=n.new('ShaderNodeMapRange');r.interpolation_type='SMOOTHSTEP';r.clamp=True;r.inputs['From Min'].default_value=a;r.inputs['From Max'].default_value=b
        l.new(axis.outputs[0],r.inputs['Value']);masks.append(r.outputs[0])
    for index,socket in enumerate(('Base Color','Normal','Roughness')):
        textures=[]
        for kind in ('sand','gravel','gobi'):
            tex=n.new('ShaderNodeTexImage');tex.image=allmaps[kind][index];textures.append(tex.outputs['Color'])
        mix=n.new('ShaderNodeMixRGB');l.new(masks[0],mix.inputs[0]);l.new(textures[0],mix.inputs[1]);l.new(textures[1],mix.inputs[2])
        final=n.new('ShaderNodeMixRGB');l.new(masks[1],final.inputs[0]);l.new(mix.outputs[0],final.inputs[1]);l.new(textures[2],final.inputs[2])
        if socket=='Normal':
            normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.8;l.new(final.outputs[0],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs[socket])
        else:l.new(final.outputs[0],p.inputs[socket])
    return m

def height_at(x,y):
    return .65*math.exp(-((x+2.7)/5.4)**2-((y-3)/5.2)**2)+.055*math.sin(x*.48+y*.20)

def ground(mat):
    count=180;size=70;verts=[];faces=[]
    for j in range(count+1):
        y=(j/count-.5)*size
        for i in range(count+1):
            x=(i/count-.5)*size;verts.append((x,y,height_at(x,y)))
    for j in range(count):
        for i in range(count):
            a=j*(count+1)+i;faces.append((a,a+1,a+count+2,a+count+1))
    mesh=bpy.data.meshes.new('continuous-material-ground');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('ground',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:
            pos=mesh.vertices[mesh.loops[loop].vertex_index].co;uv.data[loop].uv=(pos.x/TILE,pos.y/TILE)
    return obj

def plain(name,h):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb(h),1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(h),1);p.inputs['Roughness'].default_value=.91
    return m

def pebbles():
    mats=[plain('pebble-'+str(i),h) for i,h in enumerate(['a18f73','b2a184','8c806e','baa88b','938572'])]
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
    master=bpy.context.object;master.name='pebble-source-hidden';master.hide_render=True
    source=master.data;items=[];rng=random.Random(413)
    for i in range(650):
        x=rng.uniform(-14,14);y=rng.uniform(-13,16)
        size=rng.uniform(.04,.16);flat=rng.uniform(.16,.30)
        obj=bpy.data.objects.new('embedded-pebble-'+str(i),source.copy());bpy.context.collection.objects.link(obj)
        obj.data.materials.append(mats[i%len(mats)])
        obj.location=(x,y,height_at(x,y)+size*flat*.15)
        obj.scale=(size,size*rng.uniform(.58,.9),size*flat)
        obj.rotation_euler=(rng.uniform(-.1,.1),rng.uniform(-.1,.1),rng.uniform(0,math.tau))
        items.append(obj)
    return items

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
allmaps={k:maps(k) for k in ('sand','gravel','gobi')}
mats={k:material(k,ims) for k,ims in allmaps.items()}
surface=ground(mats['sand']);stones=pebbles()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40
scene.cycles.use_denoising=True;scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('fixed-cool-sky-fill');scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.59,.75,1,1);bg.inputs['Strength'].default_value=.28
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='fixed-northwest-sun-30deg';sun.rotation_euler=(-SUN).to_track_quat('-Z','Y').to_euler()
sun.data.energy=3;sun.data.angle=math.radians(1.0);sun.data.color=(1,.90,.75)
bpy.ops.object.camera_add(location=(6,-8,5.2));camera=bpy.context.object;camera.rotation_euler=(Vector((0,1,.15))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=10.3;scene.camera=camera
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
scene['status']='Independent Blender material discussion sample; not installed in the game'
scene['sunAzimuthDegrees']=315;scene['sunElevationDegrees']=30;scene['tileWidthMetres']=TILE
for kind in ('sand','gravel','gobi'):
    surface.data.materials[0]=mats[kind]
    for i,obj in enumerate(stones):obj.hide_render=kind=='sand' or (kind=='gravel' and i>=110)
    if kind=='sand':
        for image in bpy.data.images:
            if image.name!='Render Result' and image.filepath_raw:image.pack()
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'materials.blend'))
    scene.render.filepath=str(OUT/(kind+'-material.png'));bpy.ops.render.render(write_still=True)
    print('RENDER_COMPLETE',kind,flush=True)
surface.data.materials[0]=transition_material(allmaps)
for i,obj in enumerate(stones):obj.hide_render=obj.location.x<-2 or (obj.location.x<4 and i>=180)
camera.location=(8,-13,8);camera.rotation_euler=(Vector((0,1,.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=19
scene.render.filepath=str(OUT/'materials-overview.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'materials-comparison.blend'))
print('RENDER_COMPLETE transition',flush=True)
manifest={
 'status':'Independent Blender material discussion sample, not game screenshots',
 'sun':{'azimuthDegrees':315,'elevationDegrees':30,'sourceBlender':list(SUN),'energy':3,'worldFill':.28},
 'materials':['sand','gravel','gobi'],'textureSize':[N,N],'tileWidthMetres':TILE,
 'maps':['basecolor-sRGB','normal-OpenGL-tangent-space','roughness-noncolor'],
 'method':'Deterministic periodic height and colour fields with toroidal embedded pebble patches; actual PBR image nodes rendered on continuous Blender ground and additional sparse low-poly stone geometry.',
 'limitations':['Discussion-stage technical materials; not hand-painted final art.', 'A 4 metre tile repeats; final world integration needs macro colour variation and blend masks.', 'Larger visible pebbles in the render are extra geometry, not part of the flat maps.', 'Base colour contains mineral colour only; no sunlight or cast shadows baked into it.'],
 'periodicity':'All sinusoidal fields and pebble patches wrap at tile boundaries; texture endpoints sample the periodic domain without duplicating border pixels.',
 'renderer':'Blender Cycles 40 samples, denoised, AgX Medium High Contrast',
 'source':'art-source/world/models/environment-study/v001/materials.blend',
 'overview':'materials-overview.png',
 'texturesPackedInBlend':True,
 'baseColorDesignSRGB':{'sand':[.85,.72,.50],'gravel':[.835,.705,.49],'gobi':[.73,.67,.56]},
 'rebuild':'blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-materials-study-v001.py'
}
(OUT/'materials-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
