"""Region-led sand/gravel studies, kept separate from v001 and the game.
blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-materials-study-v002.py -- --draft
The 2 m micro tiles are reusable. The independent 64 m macro masks are world-space
study crops, NOT repeating tiles and NOT automatically installed in Three.js.
"""
import bpy,math,random,json,sys,argparse
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/environment-study/v002';TEX=OUT/'textures'
SOURCE=ROOT/'art-source/world/models/environment-study/v002'
for p in (OUT,TEX,SOURCE):p.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--draft',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
N=1024;MICRO=2.;MACRO=64.;SUN=Vector((-.6123724357,.6123724357,.5))

def linear(a):
 a=np.asarray(a,dtype=float);return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def value_noise(x,y,seed=0):
 ix=np.floor(x);iy=np.floor(y);fx=x-ix;fy=y-iy
 sx=fx*fx*(3-2*fx);sy=fy*fy*(3-2*fy)
 def h(a,b):
  v=np.sin(a*127.1+b*311.7+seed*19.19)*43758.5453123;return v-np.floor(v)
 return (h(ix,iy)*(1-sx)+h(ix+1,iy)*sx)*(1-sy)+(h(ix,iy+1)*(1-sx)+h(ix+1,iy+1)*sx)*sy
def fbm(x,y,seed):return .62*value_noise(x,y,seed)+.26*value_noise(x*2.07+11,y*2.07-7,seed+3)+.12*value_noise(x*4.31-8,y*4.31+17,seed+7)
def region(x,y,kind):
 # Incommensurate frequencies and domain warps: broad deposits are not circular
 # stamps, straight strips, or a tile repeated every four metres.
 qx=x+13*(fbm(x/24,y/27,2)-.5)+3*(fbm(x/7,y/13,29)-.5)
 qy=y+15*(fbm(x/29+4,y/23,7)-.5)+4*(fbm(x/9,y/8,31)-.5)
 low=fbm(qx/17+1.9,qy/20-.8,51)
 mid=fbm(qx/5.2-3,qy/9.1+2,67)
 if kind=='gobi':
  low=fbm(qx/20-.7,qy/15+.5,83)
  mid=fbm(qx/3.7+7,qy/5.3-1,89)
 deposit=np.exp(-((mid-.49)/.051)**4)
 if kind=='gravel':
  active=smooth(.40,.63,low)
  density=active*(.08+.80*deposit)+.05*smooth(.59,.73,mid)*active
  hard=smooth(.49,.72,low)*(.22+.34*smooth(.34,.66,mid))
 else:
  active=smooth(.29,.65,low)
  density=active*(.54+.43*smooth(.30,.69,mid))
  hard=smooth(.30,.67,low)*(.35+.65*smooth(.30,.68,mid))
 dust=(1-smooth(.37,.61,low))*.6+.22*(1-deposit)*active
 return np.clip(density,0,1),np.clip(hard,0,1),np.clip(dust,0,1)

def save_image(name,data,color=False):
 height,width=data.shape[:2]
 im=bpy.data.images.new(name,width=width,height=height,alpha=False,float_buffer=False)
 im.colorspace_settings.name='sRGB' if color else 'Non-Color'
 rgba=np.ones((height,width,4),dtype=np.float32)
 if data.ndim==2:data=np.repeat(data[:,:,None],3,axis=2)
 rgba[:,:,:3]=np.clip(data,0,1)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 return im

def pbr_maps(kind):
 rng=np.random.default_rng(20361 if kind=='gravel' else 24368)
 u,v=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
 grain=rng.normal(0,.36,(N,N))
 grain=(grain*4+np.roll(grain,1,0)+np.roll(grain,-1,0)+np.roll(grain,1,1)+np.roll(grain,-1,1))/8
 base=np.array((.84,.723,.537))
 clean=np.clip(base+grain[:,:,None]*.009,0,1)
 clean_h=grain*.00012
 stone_color=clean.copy();stone_h=clean_h.copy();ids=np.ones((N,N));alpha=np.zeros((N,N))
 # A dense reservoir of SMALL embedded pebbles. Most are later suppressed by
 # world-space density and per-stone random ID, instead of uniformly visible.
 for i in range(8300):
  cx,cy=rng.uniform(0,N,2);radius=rng.uniform(3.0,8.5);ratio=rng.uniform(.56,.91);angle=rng.uniform(0,math.tau)
  if kind=='gobi':
   radius=rng.uniform(2.2,5.8) if i%5 else rng.uniform(8,14)
   ratio=rng.uniform(.28,.67)
  else:radius*=1.65 if i%23==0 else 1
  r=int(radius*1.4)+2;xx=np.arange(math.floor(cx)-r,math.floor(cx)+r+1);yy=np.arange(math.floor(cy)-r,math.floor(cy)+r+1)
  dx,dy=np.meshgrid(xx-cx,yy-cy);a=(dx*math.cos(angle)+dy*math.sin(angle))/radius;b=(-dx*math.sin(angle)+dy*math.cos(angle))/(radius*ratio)
  th=np.arctan2(b,a)
  radius_metric=(abs(a)**3+abs(b)**3)**(1/3) if kind=='gobi' else np.sqrt(a*a+b*b)
  dist=radius_metric/(1+.07*np.sin(th*3+i)+.04*np.cos(th*5+i*.7))
  edge=smooth(1,.65,dist);profile=np.clip(1-dist**2,0,1)**.8
  iy,ix=np.meshgrid(yy%N,xx%N,indexing='ij')
  jitter=rng.uniform(-.085,.015)
  shade=np.array((.79,.688,.531) if kind=='gravel' else (.785,.68,.515))+jitter+np.array((rng.uniform(-.018,.018),0,rng.uniform(-.02,.025)))
  # A single winning exposed cap owns ALL channels at overlaps. Never retain
  # one pebble's height while using another pebble's ID/colour for visibility.
  incoming_h=profile*radius/N*MICRO*(.085 if kind=='gravel' else .055)
  winner=(edge>.01)&(incoming_h>stone_h[iy,ix])
  incoming_color=clean[iy,ix]*(1-edge[:,:,None])+shade[None,None,:]*edge[:,:,None]
  stone_color[iy,ix]=np.where(winner[:,:,None],incoming_color,stone_color[iy,ix])
  stone_h[iy,ix]=np.where(winner,incoming_h,stone_h[iy,ix])
  ids[iy,ix]=np.where(winner,rng.random(),ids[iy,ix]);alpha[iy,ix]=np.where(winner,edge,alpha[iy,ix])
 def normal(h):
  gx=(np.roll(h,-1,1)-np.roll(h,1,1))/(2*MICRO/N);gy=(np.roll(h,-1,0)-np.roll(h,1,0))/(2*MICRO/N)
  a=np.stack((-gx,-gy,np.ones_like(gx)),2);return a/np.linalg.norm(a,axis=2)[:,:,None]*.5+.5
 clean_rough=.93+grain*.022;stone_rough=clean_rough*(1-alpha)+(.88+grain*.025)*alpha
 images={
  'sand-color':save_image(kind+'-sand-micro-basecolor',clean,True),'sand-normal':save_image(kind+'-sand-micro-normal',normal(clean_h)),
  'sand-rough':save_image(kind+'-sand-micro-roughness',clean_rough),'grit-color':save_image(kind+'-embedded-grit-basecolor',stone_color,True),
  'grit-normal':save_image(kind+'-embedded-grit-normal',normal(stone_h)),'grit-rough':save_image(kind+'-embedded-grit-roughness',stone_rough),
  'grit-control':save_image(kind+'-embedded-grit-control',np.stack((alpha,ids,np.clip(stone_h/.003,0,1)),2))}
 stats={'microPebbleReservoirCoverage':float(np.mean(alpha>.5)),'microMaxHeightMetres':float(np.max(stone_h))}
 return images,stats

def mesosurface(kind):
 x,y=np.meshgrid(np.linspace(-MACRO/2,MACRO/2,N),np.linspace(-MACRO/2,MACRO/2,N))
 wx=x+.65*(fbm(x/2.8,y/3.1,133)-.5)
 wy=y+.8*(fbm(x/3.1+7,y/2.7,141)-.5)
 if kind=='gobi':
  # Very shallow, irregular compacted plates and worn faces; no mud cracks.
  islands=fbm(wx/1.05,wy/.74,151)
  plate=smooth(.31,.66,islands)
  worn=smooth(.32,.68,fbm(wx/.38+4,wy/.64-7,173))
  relief=.0038*plate+.0008*worn
  colour=np.array((.755,.642,.467))[None,None,:]+(plate[:,:,None]-.5)*np.array((.055,.045,.033))+worn[:,:,None]*.015
  rough=.76+.16*(1-plate)+.03*worn
 else:
  # Low, broken sediment marks. No repeated sine-wave ripple bands.
  plate=smooth(.25,.74,fbm(wx/1.45+2,wy/.65-1,181))
  worn=fbm(wx/.35,wy/.42,191)
  relief=.0008*plate+.00018*worn
  colour=np.array((.81,.687,.50))[None,None,:]+(plate[:,:,None]-.5)*.028
  rough=.89+.055*(1-plate)
 step=MACRO/(N-1);gy,gx=np.gradient(relief,step);normal=np.stack((-gx,-gy,np.ones_like(gx)),2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 images={'color':save_image(kind+'-meso-basecolor',colour,True),'height':save_image(kind+'-meso-height',relief/.006),
  'normal':save_image(kind+'-meso-normal',normal*.5+.5),'rough':save_image(kind+'-meso-roughness',rough)}
 return images,{'scaleMetres':[.3,2.0],'maxHeightMetres':float(relief.max()),'method':'Nonperiodic world-space domain-warped compacted patches and worn microfaces; not a repeating micro tile.'}

def make_macro(kind):
 x,y=np.meshgrid(np.linspace(-MACRO/2,MACRO/2,N),np.linspace(-MACRO/2,MACRO/2,N))
 d,h,s=region(x,y,kind);im=save_image(kind+'-macro-control',np.stack((d,h,s),2))
 # A colour-only visualization of the nonrepeating regional layout. It is not
 # the material's albedo; shaded previews are rendered separately in Blender.
 preview=np.zeros((N,N,3));preview[:]=(.85,.74,.56)
 preview=preview*(1-h[:,:,None]*.6)+np.array((.69,.59,.43))*h[:,:,None]*.6
 preview=preview*(1-d[:,:,None]*.24)+np.array((.65,.58,.47))*d[:,:,None]*.24
 save_image(kind+'-macro-regions-preview',preview,True)
 return im,{'densityMean':float(d.mean()),'quietAreaFractionDensityBelow0_10':float(np.mean(d<.1)),
 'densityQuantiles':np.quantile(d,[0,.25,.5,.75,.95,1]).tolist()}

def shader(kind,images,macro,meso):
 m=bpy.data.materials.new(kind+'-multi-scale-region-material');m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;n.clear();p=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs[0],out.inputs[0])
 coord=n.new('ShaderNodeTexCoord');uv=n.new('ShaderNodeUVMap');uv.uv_map='micro-uv'
 macro_coord=n.new('ShaderNodeUVMap');macro_coord.uv_map='world-64m-uv'
 def texture(im,vector):
  t=n.new('ShaderNodeTexImage');t.image=im;t.interpolation='Linear';t.extension='EXTEND' if im==macro or im in meso.values() else 'REPEAT';l.new(vector,t.inputs['Vector']);return t.outputs['Color']
 macro_color=texture(macro,macro_coord.outputs['UV']);split=n.new('ShaderNodeSeparateColor');l.new(macro_color,split.inputs[0])
 controls=n.new('ShaderNodeSeparateColor');l.new(texture(images['grit-control'],uv.outputs['UV']),controls.inputs[0])
 diff=n.new('ShaderNodeMath');diff.operation='SUBTRACT';l.new(split.outputs['Red'],diff.inputs[0]);l.new(controls.outputs['Green'],diff.inputs[1])
 selection=n.new('ShaderNodeMapRange');selection.interpolation_type='SMOOTHSTEP';selection.clamp=True;selection.inputs['From Min'].default_value=-.025;selection.inputs['From Max'].default_value=.025;l.new(diff.outputs[0],selection.inputs['Value'])
 for channel,target in [('color','Base Color'),('normal','Normal'),('rough','Roughness')]:
  mix=n.new('ShaderNodeMixRGB');l.new(selection.outputs[0],mix.inputs[0]);l.new(texture(images['sand-'+channel],uv.outputs['UV']),mix.inputs[1]);l.new(texture(images['grit-'+channel],uv.outputs['UV']),mix.inputs[2])
  if channel=='color':
   soil=n.new('ShaderNodeMixRGB');l.new(split.outputs['Green'],soil.inputs[0]);l.new(mix.outputs[0],soil.inputs[1]);l.new(texture(meso['color'],macro_coord.outputs[0]),soil.inputs[2])
   dust=n.new('ShaderNodeMixRGB');dust.blend_type='SCREEN';l.new(split.outputs['Blue'],dust.inputs[0]);l.new(soil.outputs[0],dust.inputs[1]);dust.inputs[2].default_value=(.035,.025,.012,1);l.new(dust.outputs[0],p.inputs[target])
  elif channel=='normal':
   normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.8;l.new(mix.outputs[0],normal.inputs['Color'])
   bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.006;bump.inputs['Strength'].default_value=.85
   l.new(normal.outputs[0],bump.inputs['Normal']);l.new(texture(meso['height'],macro_coord.outputs[0]),bump.inputs['Height']);l.new(bump.outputs[0],p.inputs[target])
  else:
   rough=n.new('ShaderNodeMixRGB');l.new(split.outputs['Green'],rough.inputs[0]);l.new(mix.outputs[0],rough.inputs[1]);l.new(texture(meso['rough'],macro_coord.outputs[0]),rough.inputs[2]);l.new(rough.outputs[0],p.inputs[target])
 return m

def terrain_height(x,y):return .11*math.sin(x*.075+y*.029)+.07*math.sin(y*.11-x*.024)
def ground(material):
 size=100;count=128;verts=[];faces=[]
 for j in range(count+1):
  y=(j/count-.5)*size
  for i in range(count+1):
   x=(i/count-.5)*size;verts.append((x,y,terrain_height(x,y)))
 for j in range(count):
  for i in range(count):
   a=j*(count+1)+i;faces.append((a,a+1,a+count+2,a+count+1))
 mesh=bpy.data.meshes.new('quiet-gently-rolling-ground');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('study-ground',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(material)
 micro=mesh.uv_layers.new(name='micro-uv');macro=mesh.uv_layers.new(name='world-64m-uv')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   v=mesh.vertices[mesh.loops[li].vertex_index].co;micro.data[li].uv=(v.x/MICRO,v.y/MICRO);macro.data[li].uv=(v.x/MACRO+.5,v.y/MACRO+.5)
 mesh.uv_layers.active=micro;return obj

def stones(kind):
 collection=bpy.data.collections.new(kind+'-sparse-settled-stones');bpy.context.scene.collection.children.link(collection)
 rng=random.Random(735)
 material=bpy.data.materials.new(kind+'-dusty-pebble');material.diffuse_color=(*linear((.72,.63,.49)),1);material.use_nodes=True
 p=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=material.diffuse_color;p.inputs['Roughness'].default_value=.94
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2);master=bpy.context.object;mesh=master.data;master.hide_render=True;master.hide_set(True);mesh.materials.append(material)
 accepted=0
 for i in range(850):
  x=rng.uniform(-27,27);y=rng.uniform(-27,27);d=float(region(x,y,kind)[0])
  if rng.random()>d*.42:continue
  # Most of this 4–13 cm stone is underground. The exposed cap is only mm/cm.
  size=rng.uniform(.035,.11);zscale=size*rng.uniform(.18,.26)
  o=bpy.data.objects.new(kind+'-settled-stone-'+str(accepted),mesh);collection.objects.link(o)
  o.location=(x,y,terrain_height(x,y)-zscale*.46);o.scale=(size,size*rng.uniform(.6,.9),zscale);o.rotation_euler[2]=rng.uniform(0,math.tau)
  accepted+=1
 return collection,accepted

def setup():
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 images={};microstats={};mesos={};mesostats={};macros={};stats={}
 for kind in ('gravel','gobi'):
  images[kind],microstats[kind]=pbr_maps(kind)
  mesos[kind],mesostats[kind]=mesosurface(kind)
  macros[kind],stats[kind]=make_macro(kind)
 mats={k:shader(k,images[k],macros[k],mesos[k]) for k in macros}
 obj=ground(mats['gravel']);collections={}
 for kind in ('gravel','gobi'):
  collections[kind],count=stones(kind);stats[kind]['independentStoneCountOver54mSquare']=count
  stats[kind]['estimatedOverallVisibleFineGritArea']=stats[kind]['densityMean']*microstats[kind]['microPebbleReservoirCoverage']
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2
 scene.render.threads_mode='FIXED';scene.render.threads=4
 scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=50 if args.draft else 100;scene.render.image_settings.file_format='PNG'
 scene.world=bpy.data.worlds.new('fixed-cool-sky-fill');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.59,.75,1,1);bg.inputs[1].default_value=.28
 bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.name='fixed-northwest-sun-30deg';sun.rotation_euler=(-SUN).to_track_quat('-Z','Y').to_euler();sun.data.energy=3;sun.data.angle=math.radians(1);sun.data.color=(1,.90,.75)
 bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
 scene['status']='Independent v002 material study; not installed in game';scene['fixedSunAzimuth']=315;scene['fixedSunElevation']=30
 manifest={'version':'v002','status':'Blender technical discussion sample','sun':{'azimuth':315,'elevation':30},'microTileMetres':MICRO,'macroStudyCropMetres':MACRO,'textureResolution':N,
 'micro':microstats,'mesosurface':mesostats,'regions':stats,
 'method':'Separate periodic micro PBR image layers, nonrepeating 0.3–2m meso compacted-surface maps and world-coordinate domain-warped regional masks. Gravel uses shallow rounded grit with sparse deposition lanes; gobi uses independent flattened angular flakes, independent region fields and shallow hardpan/worn patches. Per-stone random IDs gate visibility by regional density. Real sparse settled stones use the same probability field.',
 'v001Audit':'v001 used uniform per-tile pebble sampling and uniform independent geometry, with no world-scale density mask. More pixels could not resolve that distribution error.',
 'macroChannels':{'R':'fine-pebble appearance probability','G':'compacted substrate variation','B':'dust/deposition blend'},
 'microControlChannels':{'R':'stone coverage','G':'per-stone random selection ID','B':'micro height diagnostic'},
 'mesoMapping':{'worldSquareMinXY':[-32,-32],'worldSquareSizeMetres':64,'heightMapMetresPerUnit':.006,'repeat':False},
 'viewWidthsMetres':{'near':6.2,'mid':13,'wide':35},
 'textureFiles':sorted(p.name for p in TEX.glob('*.png')),
 'basecolorContainsDirectionalSunlight':False,'packedTextures':True,
 'limitations':['Micro PBR maps are reusable, but macro maps are a nonrepeating 64m study crop, not a globally tiling material.','Blender layer selection shader needs an equivalent Three.js shader or per-terrain-chunk baking before runtime use; this is not yet a ready-to-load single GLB material.','Fine gravel is primarily image-based normal relief; only sparse larger caps are geometry.','No scene, pathway, playable slope or game assets were modified.'],
 'rebuild':'blender -b -t 4 --python-exit-code 1 --python scripts/build-environment-materials-study-v002.py'}
 (OUT/'materials-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 return obj,mats,collections

def render(obj,mats,collections):
 scene=bpy.context.scene;camera=scene.camera
 # Identical viewpoints for both materials; close view resolves tiny particles,
 # wide view must read quiet sand, consolidated soil and deposition domains.
 views={'near':((1.8,-4.1,2.9),(0,0,.02),6.2),'mid':((5,-9,7),(0,0,0),13.),'wide':((13,-22,17),(0,0,0),35.)}
 for kind in ('gravel','gobi'):
  obj.data.materials[0]=mats[kind]
  for k,c in collections.items():c.hide_render=k!=kind
  pos,target,width=views['near'];camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=width
  bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(kind+'-materials.blend')))
  for view,(pos,target,width) in views.items():
   camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=width
   scene.cycles.samples=16 if args.draft else 48
   output=ROOT/'work/world'/('material-v002-'+kind+'-'+view+'-draft.png') if args.draft else OUT/(kind+'-'+view+'.png')
   scene.render.filepath=str(output);bpy.ops.render.render(write_still=True);print('RENDER_COMPLETE',kind,view,str(output),flush=True)
obj,mats,collections=setup();render(obj,mats,collections)
