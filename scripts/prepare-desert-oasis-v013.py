#!/usr/bin/env python3
"""Build the V013 game models, from the registered originals and the exact approved game meshes."""
import argparse
import io
import json
import re
import os
import runpy
import struct
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image
from asset_intake import AssetIntake, digest, read_json, write_json
from desert_oasis_tree_volume import branch_preserving_tree
from desert_oasis_meshopt import BLENDER_LIB, pack, parse

TOOLS = runpy.run_path(str(Path(__file__).with_name('prepare-desert-tree-impostors-v001.py')))
ROOT = TOOLS['ROOT']
ART = ROOT / 'art-source/world/desert-decoration'
REL = Path('assets/world/desert-decoration')
PUBLIC = ROOT / 'public'
OUT = PUBLIC / REL / 'v013'
INDEX = ROOT / 'src/content/world/desert-oasis-models-v013.json'
MANIFEST = ART / 'v013/manifest.json'
EXPOSURE = ROOT / 'work/design-candidates/desert-oasis-v012/tree-exposure.bin'
# Near meshes already used verbatim in the accepted three-camera study.
REUSE = {n: ('v002' if n == 't03' else 'v006' if n == 'r02' else 'v001') for n in (
    'shrub-2','s04b','g02','c03b','c04','w01b','t01','t02','t03','r04','c02','r02','r01')}
ORIGINALS = {
    **{f'大树{i}': (f'tree-{i}', f'大树{i}', None) for i in [3,4,6,8,9,10,11]},
    'C04B_卧枝灌木与散石': ('rock-and-spreading-shrub','C04B_卧枝灌木与散石',None),
    'S04_枯黄灌木': ('dry-shrub','S04_枯黄灌木',None),
    'R05_碎石小群': ('loose-rocks','R05_碎石小群',None),
    'W01_水边芦苇': ('shore-reed','W01_水边芦苇',None),
    'S02_红柳灌木': ('tamarisk','S02_红柳灌木',None),
    'T03_展冠胡杨树': ('broad-poplar','T03_展冠胡杨树',None),
    'T02_弯曲胡杨树': ('curved-poplar','T02_弯曲胡杨树',None),
    'valley-cushion-shrub': ('valley-cushion','C01B_斜楔岩与圆垫灌木',r'^C01B_(Olive_Leaf_|Shrub_)'),
    'valley-fractured-slab': ('valley-slab','C02B_斜交岩片与裂隙草',r'^C02B_Sandstone_'),
    'valley-sage-branches': ('valley-sage','C04B_卧枝灌木与散石',r'^C04B_(Sage_Leaf_|Shrub_)'),
}
MID_TREES = {f"大树{i}" for i in (3,4,6,8,10,11)}
SOLID_ROCKS = {'r01','r02','r04','R05_碎石小群','valley-fractured-slab'}
GEOMETRY_LOD = {'t02','t03','大树9','T02_弯曲胡杨树','T03_展冠胡杨树'}
read_glb = TOOLS['TOOLS']['read_glb']
def accessor(document,binary,index):
    desc=document['accessors'][index]
    if desc['componentType'] not in (5120,5122):return TOOLS['accessor'](document,binary,index)
    view=document['bufferViews'][desc['bufferView']]
    if desc['type']!='VEC3' or not desc.get('normalized'):raise ValueError('Unexpected signed attribute')
    size=1 if desc['componentType']==5120 else 2
    buf=np.ndarray((desc['count'],3),'i1' if size==1 else '<i2',buffer=binary,offset=view.get('byteOffset',0)+desc.get('byteOffset',0),strides=(view.get('byteStride',3*size),size))
    return np.maximum(-1,buf.astype(float)/(127 if size==1 else 32767))


def mesh_data(path, pattern=None, with_exposure=False):
    document, binary=read_glb(path)
    attrs={k:[] for k in ('position','normal','color','uv','shade')}
    faces=[];total=0;images={};image=None
    def walk(idx, parent):
        nonlocal total,image
        node=document['nodes'][idx];world=parent@TOOLS['local_transform'](node)
        if 'mesh' in node:
            for primitive in document['meshes'][node['mesh']]['primitives']:
                mat=document['materials'][primitive['material']]
                if pattern and not re.search(pattern,mat['name']):continue
                pbr=mat['pbrMetallicRoughness']; a=primitive['attributes']
                pos=accessor(document,binary,a['POSITION'])@world[:3,:3].T+world[:3,3]
                normals=accessor(document,binary,a['NORMAL'])@np.linalg.inv(world[:3,:3])
                normals/=np.maximum(1e-10,np.linalg.norm(normals,axis=1,keepdims=True))
                color=np.tile(pbr.get('baseColorFactor',[1]*4)[:3],(len(pos),1)).astype(float)
                if 'COLOR_0' in a:color*=accessor(document,binary,a['COLOR_0'])[:,:3]
                attrs['position'].append(pos);attrs['normal'].append(normals)
                if 'baseColorTexture' in pbr:
                    tex=pbr['baseColorTexture']['index'];uv=accessor(document,binary,a['TEXCOORD_0'])
                    attrs['uv'].append(uv);color*=TOOLS['sample_texture'](document,binary,tex,uv,images)
                    pic=document['images'][document['textures'][tex]['source']]
                    view=document['bufferViews'][pic['bufferView']]
                    start=view.get('byteOffset',0);image=binary[start:start+view['byteLength']]
                attrs['color'].append(color)
                faces.append(accessor(document,binary,primitive['indices']).astype('u4').reshape(-1)+total)
                if with_exposure:
                    assert total==0 and len(pos)==86235 and digest(EXPOSURE)=='26192288dc39f938feaa5999fb5a0d3b5f57f1b8fd96f3097e65fcba31173a33'
                    attrs['shade'].append(np.frombuffer(EXPOSURE.read_bytes(),'u1').reshape(len(pos),2))
                total+=len(pos)
        for child in node.get('children',[]):walk(child,world)
    for idx in document['scenes'][document.get('scene',0)]['nodes']:walk(idx,np.eye(4))
    if total==0:raise ValueError(f'Empty mesh {path} {pattern}')
    geom={k:np.concatenate(v) for k,v in attrs.items() if v}
    return geom,np.concatenate(faces),image

def extrema(pos):
    return np.array([pos.min(axis=0),pos.max(axis=0)])

def canopy_anchors(positions, faces):
    # Each low-poly tree has a few hundred disconnected leaf clusters. Preserve their
    # radial extremes so a collapsed cluster still fills the same crown silhouette.
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    points,first,inverse=np.unique(positions.round(6),axis=0,return_index=True,return_inverse=True)
    triangles=inverse[faces].reshape(-1,3)
    graph=coo_matrix((np.ones(triangles.size,'u1'),(triangles.ravel(),triangles[:,[1,2,0]].ravel())),shape=(len(points),len(points)))
    _,labels=connected_components(graph,directed=False)
    order=np.argsort(labels)
    groups=np.split(order, np.flatnonzero(np.diff(labels[order]))+1)
    directions=np.array([(1,0,0),(0,1,0),(0,0,1),(1,1,1),(1,-1,1),(1,1,-1),(1,-1,-1)],float).T
    lock=np.zeros(len(positions),'u1')
    for group in groups:
        if len(group)<4:continue
        dots=points[group]@directions
        extrema=np.concatenate([dots.argmin(axis=0),dots.argmax(axis=0)])
        lock[first[group[extrema]]]=1
    return lock

def simplify(geom,faces,target,tmp):
    if len(faces)<=target*3:return geom,faces
    values=[geom['normal'],geom['color']]
    if 'uv' in geom:values.append(geom['uv'])
    if 'shade' in geom:values.append(geom['shade']/255)
    channels=np.concatenate(values,axis=1).astype('<f4')
    packet=struct.pack('<III',len(geom['position']),len(faces),channels.shape[1])
    packet+=geom['position'].astype('<f4').tobytes()+channels.tobytes()+faces.astype('<u4').tobytes()
    if 'uv' in geom:packet+=canopy_anchors(geom['position'],faces).tobytes()
    (tmp/'mesh.dat').write_bytes(packet)
    subprocess.run(['node',str(ROOT/'scripts/simplify-desert-oasis-v013.mjs'),str(tmp/'mesh.dat'),str(tmp/'indices.dat'),str(target),str(.0025 if 'uv' in geom and target>1500 else .012 if 'uv' in geom else 1)],check=True)
    indices=np.fromfile(tmp/'indices.dat',dtype='<u4')
    if not len(indices):raise ValueError('Simplification lost all geometry.')
    unique,remap=np.unique(indices,return_inverse=True)
    small={k:v[unique].copy() for k,v in geom.items()}
    orig=extrema(geom['position']);bounds=extrema(small['position'])
    # Bind each LOD to the same physical footprint and crown height as the approved mesh.
    small['position']=(small['position']-bounds[0])*((orig[1]-orig[0])/(bounds[1]-bounds[0]))+orig[0]
    return small,remap

def jpeg_texture(image,size):
    if image is None:return None
    with Image.open(io.BytesIO(image)) as src:
        picture=src.convert('RGB')
        picture.thumbnail((size,size),Image.Resampling.LANCZOS)
        output=io.BytesIO();picture.save(output,'JPEG',quality=82,optimize=True)
        return ('image/jpeg',output.getvalue())

def write_glb(path,geom,faces,texture,cutout=False):
    blob=bytearray();views=[];acc=[]
    def view(data,kind=None,stride=None):
        blob.extend(bytes((-len(blob))%4));spec={'buffer':0,'byteOffset':len(blob),'byteLength':len(data)}
        if kind:spec['target']=kind
        if stride:spec['byteStride']=stride
        views.append(spec);blob.extend(data);return len(views)-1
    def field(vals,dtype,component,kind,norm=False):
        vals=np.asarray(vals,dtype=dtype);n=1 if vals.ndim==1 else vals.shape[1]
        desc={'componentType':component,'count':len(vals),'type':'SCALAR' if n==1 else 'VEC'+str(n)}
        if kind=='POSITION':
            desc.update(min=vals.min(axis=0).tolist(),max=vals.max(axis=0).tolist())
        if norm:desc['normalized']=True
        stride=vals.itemsize*n
        if kind!='indices' and stride%4:
            padded=np.zeros((len(vals),stride+(-stride)%4),'u1');padded[:,:stride]=np.ascontiguousarray(vals).view('u1').reshape(len(vals),stride)
            desc['bufferView']=view(padded.tobytes(),34962,padded.shape[1])
        else:desc['bufferView']=view(vals.tobytes(),34963 if kind=='indices' else 34962)
        acc.append(desc);return len(acc)-1
    # Quantize in the original bounding box. The inverse-transpose of the node scale
    # restores the supplied world normals; min/max and ground pivots remain identical.
    low,high=extrema(geom['position']);scale=(high-low)*.5;center=(high+low)*.5
    scale=np.where(scale>0,scale,1.)
    normal=geom['normal']*scale;normal/=np.maximum(1e-12,np.linalg.norm(normal,axis=1,keepdims=True))
    columns={
        'POSITION':(np.clip(np.rint((geom['position']-center)/scale*32767),-32767,32767).astype('<i2'),5122),
        'NORMAL':(np.clip(np.rint(normal*127),-127,127).astype('i1'),5120),
    }
    if texture is None:columns['COLOR_0']=(np.clip(np.rint(geom['color']*255),0,255).astype('u1'),5121)
    if 'shade' in geom:columns['_TREEEXPOSURE']=(geom['shade'].astype('u1'),5121)
    if texture:columns['TEXCOORD_0']=(np.clip(np.rint(geom['uv']*65535),0,65535).astype('<u2'),5123)
    packed=np.concatenate([np.ascontiguousarray(v).view('u1').reshape(len(normal),-1) for v,_ in columns.values()],axis=1)
    _,take,remap=np.unique(packed.view(np.dtype((np.void,packed.shape[1]))).ravel(),return_index=True,return_inverse=True)
    at={name:field(values[take],values.dtype,component,name,True) for name,(values,component) in columns.items()}
    faces=remap[faces]
    it=field(faces,'<u2' if len(take)<=65535 else '<u4',5123 if len(take)<=65535 else 5125,'indices')
    mat={'name':path.stem,'doubleSided':not cutout,'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':.93}}
    doc={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'translation':center.tolist(),'scale':scale.tolist()}],
        'meshes':[{'primitives':[{'attributes':at,'indices':it,'material':0}]}],'materials':[mat],'accessors':acc,'bufferViews':views}
    doc['extensionsUsed']=['KHR_mesh_quantization'];doc['extensionsRequired']=['KHR_mesh_quantization']
    if texture:
        typ,data=texture;doc['images']=[{'bufferView':view(data),'mimeType':typ}];doc['textures']=[{'source':0}]
        mat['pbrMetallicRoughness']['baseColorTexture']={'index':0}
    if cutout:mat.update(alphaMode='MASK',alphaCutoff=.27)
    blob.extend(bytes((-len(blob))%4));doc['buffers']=[{'byteLength':len(blob)}]
    head=json.dumps(doc,separators=(',',':')).encode('utf8');head+=b' '*((-len(head))%4)
    path.write_bytes(struct.pack('<4sIIII',b'glTF',2,28+len(head)+len(blob),len(head),0x4E4F534A)+head+struct.pack('<II',len(blob),0x004E4942)+blob)

def crossed_model(path,geom,faces,tmp,tree):
    """Two orthographic views of the actual mesh with alpha coverage; one draw per instanced stand."""
    pos=geom['position'];low,high=extrema(pos);center=(low+high)/2
    tile=144 if tree else 96;samples=2;r=tile*samples;pad=2
    dims=high-low
    panels=[];verts=[];uv=[];indices=[]
    # Mild form shading on folded leaves, with most illumination still provided by the game sun.
    n=geom['normal']
    shade=.80+.16*np.maximum(n@np.array([-.75,.56,.34]),0)+.04*np.maximum(n[:,1],0)
    color=geom['color']*shade[:,None]
    for panel,(ax,depth) in enumerate([(0,2),(2,0)]):
        pixels=np.column_stack((pad+(pos[:,ax]-low[ax])/dims[ax]*(r-1-2*pad),
            pad+(high[1]-pos[:,1])/dims[1]*(r-1-2*pad),pos[:,depth],color)).astype('<f4')
        (tmp/'raster.data').write_bytes(struct.pack('<III',r,len(pos),len(faces))+pixels.tobytes()+faces.astype('<u4').tobytes())
        subprocess.run([str(tmp/'raster'),str(tmp/'raster.data'),str(tmp/'raster.rgba')],check=True)
        panel_image=Image.frombytes('RGBA',(r,r),(tmp/'raster.rgba').read_bytes()).resize((tile,tile),Image.Resampling.LANCZOS)
        panels.append(panel_image)
        pts=[]
        for is_right,is_high in ((False,False),(True,False),(True,True),(False,True)):
            pt=center.copy();pt[ax]=(high if is_right else low)[ax];pt[1]=(high if is_high else low)[1];pts.append(pt)
        verts.extend(pts)
        left=(panel*tile+.5)/(tile*2);right=((panel+1)*tile-.5)/(tile*2)
        uv.extend([(left,1),(right,1),(right,0),(left,0)])
        indices.extend(np.array([0,1,2,0,2,3,2,1,0,3,2,0])+panel*4)
    atlas=Image.new('RGBA',(2*tile,tile))
    for i,img in enumerate(panels):atlas.paste(img,(i*tile,0))
    data=io.BytesIO();atlas.save(data,'PNG',optimize=True)
    write_glb(path,{'position':np.asarray(verts),'normal':np.tile([0.,1.,0.],(8,1)),'uv':np.array(uv)},indices,('image/png',data.getvalue()),cutout=True)

def stats(path):
    doc,_=parse(path);prims=[p for m in doc['meshes'] for p in m['primitives']]
    if len(prims)!=1:raise ValueError(f'Expected a single instancing draw in {path}')
    tri=doc['accessors'][prims[0]['indices']]['count']//3
    return {'url':str(path.relative_to(PUBLIC)),'sha256':digest(path),'bytes':path.stat().st_size,'triangles':tri}

def verify():
    manifest=read_json(MANIFEST);catalog=read_json(INDEX)
    if set(catalog)!=set(REUSE)|set(ORIGINALS):raise ValueError('Incomplete V013 runtime catalog.')
    intake=AssetIntake(ROOT)
    for key,entry in manifest['models'].items():
        m=catalog[key]
        for variant in (('near','mid','far') if key in MID_TREES else ('near','far')):
            data=entry[variant];asset=PUBLIC/data['url']
            if stats(asset)!=data:raise ValueError(f'Checksum or layout mismatch: {asset}')
            doc,_binary=parse(asset)
            coords=doc['meshes'][0]['primitives'][0]['attributes']['POSITION']
            data_pos=doc['accessors'][coords];actual=np.array([data_pos['min'],data_pos['max']])
            if data_pos.get('normalized'):
                assert data_pos['componentType']==5122
                actual=actual/32767*np.asarray(doc['nodes'][0]['scale'])+doc['nodes'][0]['translation']
            if not np.allclose(np.ptp(actual,axis=0),[m['width'],m['height'],m['depth']],rtol=.00003):
                raise ValueError(f'Footprint changed in {asset}')
            if key=='大树9':
                doc,binary=parse(asset);prim=doc['meshes'][0]['primitives'][0]
                a=doc['accessors'][prim['attributes']['_TREEEXPOSURE']]
                if not (a['normalized'] and a['count']==doc['accessors'][prim['attributes']['POSITION']]['count']):raise ValueError('Lost vertex exposure coordinates')
        if 'original' in entry and intake.existing(entry['original']) is None:raise ValueError('Unregistered original '+key)
    print('Verified 30 models, all detail levels, source hashes, dimensions and courtyard crown channels.')

def prepare(source_dir):
    catalog_entries=read_json(ART/'v001/manifest.json')['catalogEntries']
    origins={row['sourceFile']:row['sourceSha256'] for row in catalog_entries if 'sourceSha256' in row}
    intake=AssetIntake(ROOT)
    with intake.transaction(), TemporaryDirectory(prefix='oasis-geometry-') as stage:
        tmp=Path(stage);entries={};catalog={}
        products=tmp/'models';products.mkdir()
        subprocess.run(['c++','-O2','-std=c++17',str(ROOT/'scripts/desert-tree-impostor-raster.cpp'),'-o',str(tmp/'raster')],check=True)
        for key in [*REUSE,*ORIGINALS]:
            entry={};tree=key.startswith(('大树','T0')) or key in ('t01','t02','t03')
            if key in REUSE:
                slug=key;near=PUBLIC/REL/REUSE[key]/(slug+'.glb')
                geom,faces,image=mesh_data(near)
            else:
                slug,stem,pattern=ORIGINALS[key];name=stem+'.glb';sha=origins[name]
                ref='vault:sha256:'+sha
                original=intake.original(ref,expected=sha,local=source_dir/name if source_dir else None,validate=read_glb)
                entry.update(original=ref,sourceFile=name)
                if pattern:entry['originalMaterialFilter']=pattern
                if key=='大树9':entry['exposureSourceSha256']=digest(EXPOSURE)
                geom,faces,image=mesh_data(original.path,pattern,with_exposure=key=='大树9')
                target=(14500 if key=='大树9' else 5400) if key.startswith('大树') else 13500 if key.startswith('T0') else len(faces)//3
                hgeom,hfaces=simplify(geom,faces,target,tmp)
                near=products/(slug+'.glb')
                write_glb(near,hgeom,hfaces,jpeg_texture(image,768 if key=='大树9' else 384))
            if key in SOLID_ROCKS and len(faces)//3<=150:
                far=near
            else:
                far=products/(slug+'-far.glb')
                if key in SOLID_ROCKS or key in GEOMETRY_LOD:
                    if key in ('t02','t03','T03_展冠胡杨树','T02_弯曲胡杨树'):
                        # Previously approved distance poplars sample complete leaves across all branch tips.
                        kind='t02' if key.startswith(('t02','T02')) else 't03'
                        g,f,_=mesh_data(PUBLIC/REL/'v002'/(kind+'-lod.glb'))
                        old=extrema(g['position']);new=extrema(geom['position'])
                        g['position']=(g['position']-old[0])*(new[1]-new[0])/(old[1]-old[0])+new[0]
                    else:g,f=simplify(geom,faces,1250 if key=='大树9' else 54,tmp)
                    write_glb(far,g,f,jpeg_texture(image,192))
                else:crossed_model(far,geom,faces,tmp,tree)
            models={'near':near,'far':far}
            if key in MID_TREES:
                mid=products/(slug+'-mid.glb')
                branch_preserving_tree(mid,geom,faces,write_glb)
                models['mid']=mid
            for asset in set(models.values()):
                if asset.parent==products:
                    pack(asset,BLENDER_LIB)
                    os.replace(asset,OUT/asset.name)
            for variant,asset in models.items():
                installed=OUT/asset.name if asset.parent==products else asset
                entry[variant]=stats(installed)
            near_info=entry['near'];far_info=entry['far']
            entries[key]=entry
            w,h,d=np.ptp(geom['position'],axis=0)
            catalog[key]={'url':near_info['url'],'lodUrl':far_info['url'],'width':round(float(w),7),
                'height':round(float(h),7),'depth':round(float(d),7),'triangles':near_info['triangles'],'lodTriangles':far_info['triangles']}
            if 'mid' in entry:catalog[key].update(midUrl=entry['mid']['url'],midTriangles=entry['mid']['triangles'])
            print(key,near_info['triangles'],far_info['triangles'],flush=True)
        write_json(MANIFEST,{'version':13,'approvedLayout':'desert-oasis-v013',
            'exposureImage':'V012 sun-access and sky-access, normalized unsigned RG per original crown vertex',
            'models':entries},existing=read_json(MANIFEST))
        write_json(INDEX,catalog,existing=read_json(INDEX))
    verify()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source-dir',type=Path);parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    if args.verify:verify()
    else:prepare(args.source_dir)
