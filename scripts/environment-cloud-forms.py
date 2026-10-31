"""Shared authored cloud form helpers. Importing creates no scene or output.
Derived from accepted v002 definitions; builders supply FOLIAGE explicitly.
"""

import bpy, bmesh, math

from mathutils import Vector

FOLIAGE = None

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def rgb(color):return tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))

def material(name,color,roughness=.97,vertex_color=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');c=rgb(color)
    m.diffuse_color=(*c,1);p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Specular IOR Level'].default_value=.14
    if vertex_color:
        node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='foliage-color';m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
    return m

def object_mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free();data.update()
    for p in data.polygons:p.use_smooth=True
    return o

CLOUD_OUTLINE=[(.02,-.91,0),(.38,-1.00,0),(.76,-.74,0),(.79,-.38,0),(1.00,-.05,0),(.93,.41,0),(.61,.62,0),(.35,.93,0),(-.05,.95,0),(-.39,.74,0),(-.74,.84,0),(-1.00,.46,0),(-.94,.03,0),(-.72,-.23,0),(-.76,-.61,0),(-.38,-.89,0)]

def periodic(controls,t):
    n=len(controls);u=(t%1)*n;i=int(u);f=u-i
    p0,p1,p2,p3=[Vector(controls[j%n]) for j in (i-1,i,i+1,i+2)]
    return .5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f)

def bump(x,y,cx,cy,rx,ry):return math.exp(-((x-cx)/rx)**2-((y-cy)/ry)**2)

def sculpt_cloud(name,center,scale,turn,shade,variant=0):
    segments=40;ring_count=16;verts=[(0,0,-.86)];faces=[]
    # Broad unequal shoulder/front/back and descending rim bulges. Their spacing
    # makes each cloud non-spherical, and avoids a uniform petalled outline.
    handles=[(.18,.22,.16,.53,.50),(1.65,.48,.12,.67,.58),(3.13,.10,.20,.58,.63),(4.42,-.26,.13,.53,.52),(5.45,.42,.10,.55,.60)]
    for i in range(1,ring_count):
        phi=-math.pi/2+i*math.pi/ring_count;r=math.cos(phi);sn=math.sin(phi)
        for j in range(segments):
            theta=math.tau*j/segments;edge=periodic(CLOUD_OUTLINE,j/segments)
            x=edge.x*r;y=edge.y*r
            # A common tangent at the equator prevents the former umbrella seam.
            z=sn*(.88+.15*bump(x,y,-.36,.20,.66,.72)+.09*bump(x,y,.48,-.1,.50,.65))+.07*x*r-.045*y*r
            for angle,lat,amount,aw,pw in handles:
                angle+=variant*.14;d=(theta-angle+math.pi)%math.tau-math.pi
                f=amount*math.exp(-(d/aw)**2-((phi-lat)/pw)**2)
                x*=1+f;y*=1+f;z+=f*(.30 if phi>0 else -.28)
            verts.append((x,y,z))
    top_index=len(verts);verts.append((0,0,1.03))
    for j in range(segments):faces.append((0,1+(j+1)%segments,1+j))
    for i in range(ring_count-2):
        a=1+i*segments;b=a+segments
        for j in range(segments):k=(j+1)%segments;faces.append((a+j,a+k,b+k,b+j))
    start=1+(ring_count-2)*segments
    for j in range(segments):faces.append((start+j,start+(j+1)%segments,top_index))
    ca=math.cos(turn);sa=math.sin(turn)
    positions=[]
    for x,y,z in verts:
        x*=scale[0];y*=scale[1];z*=scale[2]
        positions.append((center[0]+x*ca-y*sa,center[1]+x*sa+y*ca,center[2]+z))
    o=object_mesh(name,positions,faces,FOLIAGE)
    attr=o.data.color_attributes.new(name='foliage-color',type='FLOAT_COLOR',domain='POINT')
    low=Vector(rgb('66774b'));high=Vector(rgb('8e9c70'))
    for i,(x,y,z) in enumerate(verts):
        t=max(0,min(1,(z+.9)/1.95));c=low.lerp(high,t*.73)*shade
        attr.data[i].color=(*c,1)
    o['construction']='authored-contour-cloud-with-directed-surface-bulges';o['role']='closed-foliage-bough'
    o['branch_support_center']=list(center);return o

def normalize(objects,width,height,ground=True):
    coords=[v.co for o in objects for v in o.data.vertices]
    min_z=min(v.z for v in coords) if ground else 0;max_z=max(v.z for v in coords)
    sx=width/(max(v.x for v in coords)-min(v.x for v in coords));sz=height/(max_z-min_z)
    for o in objects:
        for v in o.data.vertices:v.co.x*=sx;v.co.y*=sx;v.co.z=(v.co.z-min_z)*sz
        o.data.update()
