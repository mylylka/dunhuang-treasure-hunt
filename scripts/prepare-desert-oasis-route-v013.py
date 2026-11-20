#!/usr/bin/env python3
"""Bake the registered V013 meshes into a two-view albedo and directional-light atlas."""
import argparse
import ctypes
import io
import json
from pathlib import Path
import struct
import subprocess
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

from desert_oasis_meshopt import BLENDER_LIB, parse

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'src/content/world/desert-oasis-models-v013.json'
OUTPUT = ROOT / 'public/assets/world/desert-decoration/v013/route-ground-light-v013.webp'
TILE = 64
COLUMNS = 8
# The terrain sun has azimuth 250 degrees clockwise from north (-Z), elevation 30.
AZIMUTH, ELEVATION = np.deg2rad([250, 30])
SUN = np.array([np.sin(AZIMUTH)*np.cos(ELEVATION), np.sin(ELEVATION), -np.cos(AZIMUTH)*np.cos(ELEVATION)])


def attribute(doc, binary, index):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    dtype = np.dtype({5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[accessor['componentType']])
    width = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}[accessor['type']]
    stride = view.get('byteStride',dtype.itemsize*width)
    start = view.get('byteOffset',0)
    buffer = binary[start:start+view['byteLength']]
    packed = view.get('extensions',{}).get('EXT_meshopt_compression')
    if packed:
        decoder = ctypes.CDLL(str(BLENDER_LIB))
        operation = {'ATTRIBUTES':'decodeVertexBuffer','INDICES':'decodeIndexSequence','TRIANGLES':'decodeIndexBuffer'}[packed['mode']]
        decode = getattr(decoder,'meshopt_'+operation)
        count, stride = packed['count'], packed['byteStride']
        output = ctypes.create_string_buffer(count * stride)
        offset = packed.get('byteOffset',0)
        source = binary[offset:offset+packed['byteLength']]
        result = decode(output,ctypes.c_size_t(count),ctypes.c_size_t(stride),source,ctypes.c_size_t(len(source)))
        if result != 0 or packed.get('filter','NONE') != 'NONE':
            raise ValueError('Unable to decode model view')
        buffer = output.raw
    data = np.ndarray((accessor['count'],width),dtype,buffer=buffer,offset=accessor.get('byteOffset',0),strides=(stride,dtype.itemsize))
    if accessor.get('normalized'):
        return np.maximum(-1,data.astype(float)/np.iinfo(dtype).max)
    return data


def linear(srgb):
    return np.where(srgb <= .04045, srgb/12.92, ((srgb+.055)/1.055)**2.4)


def mesh_data(path, variant):
    doc,binary = parse(path)
    node = doc['nodes'][0]
    mesh = doc['meshes'][node['mesh']]['primitives'][0]
    attrs = mesh['attributes']
    scale = np.asarray(node.get('scale',[1,1,1]))
    points = attribute(doc,binary,attrs['POSITION']).astype(float) * scale
    normals = attribute(doc,binary,attrs['NORMAL']).astype(float) / scale
    normals /= np.maximum(1e-10,np.linalg.norm(normals,axis=1,keepdims=True))
    material = doc['materials'][mesh['material']]['pbrMetallicRoughness']
    color = np.tile(material.get('baseColorFactor',[1,1,1,1])[:3], (len(points),1)).astype(float)
    if 'COLOR_0' in attrs:
        color *= attribute(doc,binary,attrs['COLOR_0'])[:,:3]
    if 'baseColorTexture' in material:
        texture = doc['textures'][material['baseColorTexture']['index']]
        view = doc['bufferViews'][doc['images'][texture['source']]['bufferView']]
        offset = view.get('byteOffset',0)
        with Image.open(io.BytesIO(binary[offset:offset+view['byteLength']])) as image:
            rgb = np.asarray(image.convert('RGB'))/255
        uv = attribute(doc,binary,attrs['TEXCOORD_0'])
        h,w = rgb.shape[:2]
        color *= linear(rgb[np.clip((uv[:,1]*h).astype(int),0,h-1), np.clip((uv[:,0]*w).astype(int),0,w-1)])
    faces = attribute(doc,binary,mesh['indices']).reshape(-1,3)
    leaf = color[:,1] / np.maximum(.001,color[:,0]) > .85
    if variant == 'bare':
        faces = faces[~leaf[faces[:,0]]]
    if variant == 'gold':
        color[leaf] *= [1.59,.92,.36]
        color[leaf,0] = np.minimum(.85,color[leaf,0])
    return points, normals, color, faces


def raster(work, xy, depth, colors, faces, size):
    vertices = np.column_stack((xy,depth,colors)).astype('<f4')
    model = struct.pack('<III',size,len(depth),faces.size) + vertices.tobytes() + faces.astype('<u4').tobytes()
    (work/'mesh.bin').write_bytes(model)
    subprocess.run([str(work/'raster'),str(work/'mesh.bin'),str(work/'pixels')],check=True)
    return Image.frombytes('RGBA',(size,size),(work/'pixels').read_bytes())


def visibility(points, faces, toward, work):
    # A small orthographic depth map from the light resolves gaps between actual
    # leaf clusters. Multi-tap visibility softens fine branches at distant scale.
    size = 192
    reference = [0,0,1] if toward[1] > .99 else [0,1,0]
    right = np.cross(reference,toward)
    right /= np.linalg.norm(right)
    plane = points @ np.column_stack((right,np.cross(toward,right)))
    xy = 3 + (size-7)*(plane-plane.min(axis=0))/np.maximum(1e-8,np.ptp(plane,axis=0))
    z = points @ toward
    depth = (z-z.min())/max(1e-8,np.ptp(z))
    pixels = np.asarray(raster(work,xy,z,np.repeat(depth[:,None],3,axis=1),faces,size))
    front = np.where(pixels[:,:,3],linear(pixels[:,:,0]/255),-1)
    # Depth bias accounts for 8-bit input, raster-center offset and leaf thickness.
    result = np.zeros(len(points))
    for dx,dy in ((0,0),(1,0),(-1,0),(0,1),(0,-1),(2,2),(-2,2),(2,-2),(-2,-2)):
        blocker = front[(xy[:,1]+dy).astype(int),(xy[:,0]+dx).astype(int)]
        result += np.clip(1-(blocker-depth-.016)/.035,0,1)
    return result/9


def light_field(points, normals, faces, work):
    sky = visibility(points,faces,np.array([0.,1.,0.]),work)
    # Match the terrain's 0.95 sky fill and 2.4 sun. Store the response relative
    # to an upward-facing route card that the runtime already illuminates.
    ambient = .95 * (.68+.32*normals[:,1]) * (.59+.41*sky)
    values = []
    for angle in np.arange(4)*np.pi/2:
        c,s = np.cos(angle),np.sin(angle)
        direction = np.array([c*SUN[0]-s*SUN[2],SUN[1],s*SUN[0]+c*SUN[2]])
        exposed = visibility(points,faces,direction,work)
        direct = np.maximum(normals@direction,0) * (.10+.90*exposed)
        values.append((ambient + 2.4*direct)/(.95 + 2.4*SUN[1]))
    a,b,c,d = values
    return np.column_stack(((a+b+c+d)/4/1.6, .5+(a-c)/4, .5+(b-d)/4))


def project(path, variant, work):
    points,normals,albedo,faces = mesh_data(path,variant)
    lighting = light_field(points,normals,faces,work)
    size = TILE*3
    low,high = points.min(axis=0),points.max(axis=0)
    span = np.maximum(1e-10,high-low)
    for axis,depth in ((0,2),(2,0)):
        xy = np.column_stack((1+(size-3)*(points[:,axis]-low[axis])/span[axis],
                              1+(size-3)*(high[1]-points[:,1])/span[1]))
        yield [raster(work,xy,points[:,depth],data,faces,size).resize((TILE,TILE),Image.Resampling.LANCZOS)
               for data in (albedo,lighting)]


def build():
    catalog = json.loads(CATALOG.read_text())
    variants = [key for key in catalog if key != '大树9'] + ['t02:gold','t02:bare','t03:gold','t03:bare']
    rows = (len(variants)*2+COLUMNS-1)//COLUMNS
    atlas = Image.new('RGBA',(COLUMNS*TILE,2*rows*TILE))
    with TemporaryDirectory() as folder:
        work = Path(folder)
        subprocess.run(['c++','-O2','-std=c++17',str(ROOT/'scripts/desert-tree-impostor-raster.cpp'),'-o',str(work/'raster')],check=True)
        for i,variant in enumerate(variants):
            key,_,tone = variant.partition(':')
            # The near mesh retains the approved leaf sprays, material and albedo.
            path = ROOT/'public'/catalog[key]['url']
            for view,panels in enumerate(project(path,tone,work)):
                position = i*2+view
                for layer,panel in enumerate(panels):
                    atlas.paste(panel,((position%COLUMNS)*TILE,(position//COLUMNS+layer*rows)*TILE))
    stream = io.BytesIO()
    atlas.save(stream,'WEBP',quality=78,method=6)
    return stream.getvalue()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true')
    args = parser.parse_args()
    packed = build()
    if args.verify:
        if not OUTPUT.exists() or OUTPUT.read_bytes()!=packed:
            raise SystemExit('Route atlas differs from its source models')
    else:
        OUTPUT.write_bytes(packed)
    print(f'{OUTPUT.name} · {len(packed):,} bytes')
