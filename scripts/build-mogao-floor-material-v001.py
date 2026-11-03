"""Blender-authored, baked PBR sand/earth surface; no displacement or web geometry.
Palette anchor #6f5746 is the median subdued dark umber sampled from the user's scroll.
"""
import bpy,math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/world/mogao/v001';SOURCE=ROOT/'art-source/world/models/mogao/v001'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
bpy.ops.mesh.primitive_plane_add(size=4);plane=bpy.context.object;plane.name='four-metre-sand-earth-material-swatch'
mat=bpy.data.materials.new('authored-sand-gravel-umber');mat.use_nodes=True;plane.data.materials.append(mat)
n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear()
def node(kind,name):
 o=n.new(kind);o.label=name;return o
def mathnode(op,a,b=None):
 o=node('ShaderNodeMath',op);o.operation=op
 if isinstance(a,(float,int)):o.inputs[0].default_value=a
 else:l.new(a,o.inputs[0])
 if b is not None:
  if isinstance(b,(float,int)):o.inputs[1].default_value=b
  else:l.new(b,o.inputs[1])
 return o.outputs[0]
def linear(c):return c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4
def color(code):return tuple(linear(int(code[i:i+2],16)/255) for i in (0,2,4))+(1,)
def ramp(source,stops):
 o=node('ShaderNodeValToRGB','bounded-surface-palette')
 for i,(p,c) in enumerate(stops):
  e=o.color_ramp.elements[i] if i<2 else o.color_ramp.elements.new(p);e.position=p;e.color=color(c)
 l.new(source,o.inputs[0]);return o.outputs[0]
uv=node('ShaderNodeTexCoord','UV');sep=node('ShaderNodeSeparateXYZ','tile-coordinates');l.new(uv.outputs['UV'],sep.inputs[0])
u=mathnode('MULTIPLY',sep.outputs['X'],2*math.pi);v=mathnode('MULTIPLY',sep.outputs['Y'],2*math.pi)
vec=node('ShaderNodeCombineXYZ','periodic-torus');l.new(mathnode('COSINE',u),vec.inputs[0]);l.new(mathnode('SINE',u),vec.inputs[1]);l.new(mathnode('COSINE',v),vec.inputs[2]);w=mathnode('SINE',v)
def noise(scale,detail):
 o=node('ShaderNodeTexNoise','sand-grain');o.noise_dimensions='4D';o.inputs['Scale'].default_value=scale;o.inputs['Detail'].default_value=detail;l.new(vec.outputs[0],o.inputs['Vector']);l.new(w,o.inputs['W']);return o.outputs['Fac']
earth=ramp(noise(2.2,3),[(.16,'49392f'),(.52,'6f5746'),(.86,'987958')])
grain=ramp(noise(58,2),[(.10,'77746f'),(.44,'b6aa97'),(.80,'fff2d6')])
mix=node('ShaderNodeMixRGB','fine-mineral-grain');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.34;l.new(earth,mix.inputs[1]);l.new(grain,mix.inputs[2])
pebbles=node('ShaderNodeTexVoronoi','small-embedded-gravel');pebbles.voronoi_dimensions='4D';pebbles.inputs['Scale'].default_value=8.0;l.new(vec.outputs[0],pebbles.inputs['Vector']);l.new(w,pebbles.inputs['W'])
mask=node('ShaderNodeValToRGB','rounded-gravel-mask');mask.color_ramp.elements[0].position=.21;mask.color_ramp.elements[0].color=(1,1,1,1);mask.color_ramp.elements[1].position=.39;mask.color_ramp.elements[1].color=(0,0,0,1);l.new(pebbles.outputs['Distance'],mask.inputs[0])
chips=ramp(noise(20,1),[(.14,'5e5044'),(.55,'917a60'),(.85,'bb9c70')])
surface=node('ShaderNodeMixRGB','sand-with-embedded-stones');l.new(mask.outputs[0],surface.inputs[0]);l.new(mix.outputs[0],surface.inputs[1]);l.new(chips,surface.inputs[2])
bump=node('ShaderNodeBump','millimetre-grain-relief');bump.inputs['Strength'].default_value=.5;bump.inputs['Distance'].default_value=.015
height=mathnode('ADD',mathnode('MULTIPLY',mask.outputs[0],.65),mathnode('MULTIPLY',noise(58,2),.24));l.new(height,bump.inputs['Height'])
bs=node('ShaderNodeBsdfPrincipled','matte-earth');bs.inputs['Roughness'].default_value=.96;l.new(surface.outputs[0],bs.inputs['Base Color']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
em=node('ShaderNodeEmission','albedo-only-bake');l.new(surface.outputs[0],em.inputs[0]);output=node('ShaderNodeOutputMaterial','output')
for label,kind in [('floor-albedo','EMIT'),('floor-normal','NORMAL')]:
 image=bpy.data.images.new(label,2048,2048,alpha=False);image.colorspace_settings.name='sRGB' if kind=='EMIT' else 'Non-Color'
 target=node('ShaderNodeTexImage',label);target.image=image;n.active=target
 for link in list(output.inputs[0].links):l.remove(link)
 l.new(em.outputs[0] if kind=='EMIT' else bs.outputs[0],output.inputs[0])
 scene.render.bake.use_clear=True;scene.render.bake.margin=8
 bpy.ops.object.bake(type=kind)
 image.filepath_raw=str(OUT/(label+'.png'));image.file_format='PNG';image.save()
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'floor-material.blend'))
(SOURCE/'floor-material.json').write_text(json.dumps({'type':'baked Blender PBR surface','scaleMetres':4,'paletteAnchor':'#6f5746','source':'九色鹿全图.jpg, subdued dark umber samples, median RGB 111/87/70','textures':['floor-albedo.png','floor-normal.png'],'geometry':'flat continuous cave floor; no extra per-pebble meshes','authoring':'periodic 4D noise for fine sand; bounded Voronoi masks for small embedded stones; albedo and tangent normals baked in Blender; no painted light or AI content edits'},ensure_ascii=False,indent=2)+'\n')
