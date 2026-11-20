"""Lossless GLB packing for the V013 derivatives with Blender's local meshoptimizer library."""
import ctypes as ct
import hashlib
import json
import struct
from pathlib import Path
import numpy as np

EXT='EXT_meshopt_compression'

def parse(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+n]),raw[28+n:]

def encode(document,binary,library):
    native=ct.CDLL(str(library))
    size,pointer=ct.c_size_t,ct.c_void_p
    def function(name,types,res):
        f=getattr(native,'meshopt_'+name);f.argtypes=types;f.restype=res;return f
    function('encodeVertexVersion',[ct.c_int],None)(0)
    attr_bound=function('encodeVertexBufferBound',[size,size],size)
    index_bound=function('encodeIndexSequenceBound',[size,size],size)
    encode_attr=function('encodeVertexBuffer',[pointer,size,pointer,size,size],size)
    encode_ix=function('encodeIndexSequence',[pointer,size,pointer,size],size)
    decode_attr=function('decodeVertexBuffer',[pointer,size,size,pointer,size],ct.c_int)
    decode_ix=function('decodeIndexSequence',[pointer,size,size,pointer,size],ct.c_int)
    fields={a['bufferView']:a for a in document['accessors']}
    raw_views=[binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for v in document['bufferViews']]
    # Relabel vertices in first-use order, applying one and the same permutation to every attribute,
    # including the courtyard tree's two baked exposure channels. No source triangle is reordered.
    prim=document['meshes'][0]['primitives'][0]
    ix=document['accessors'][prim['indices']];iv=ix['bufferView'];dtype='<u2' if ix['componentType']==5123 else '<u4'
    indices=np.frombuffer(raw_views[iv],dtype=dtype)
    _,first=np.unique(indices,return_index=True);perm=indices[np.sort(first)]
    inv=np.empty(len(perm),dtype=dtype);inv[perm]=np.arange(len(perm))
    raw_views[iv]=inv[indices].tobytes()
    for ai in prim['attributes'].values():
        acc=document['accessors'][ai];v=acc['bufferView']
        assert acc['count']==len(perm)
        raw_views[v]=np.frombuffer(raw_views[v],'u1').reshape(len(perm),-1)[perm].tobytes()
    encoded=bytearray();virtual=0
    checksum=[]
    for i,view in enumerate(document['bufferViews']):
        raw=raw_views[i];encoded.extend(bytes((-len(encoded))%4));offset=len(encoded)
        if i not in fields:
            encoded.extend(raw);view['byteOffset']=offset;continue
        a=fields[i];count=a['count'];stride=len(raw)//count
        if i==iv:
            data=np.frombuffer(raw,dtype=dtype).astype('<u4');bound=index_bound(count,len(perm));dst=ct.create_string_buffer(bound)
            n=encode_ix(dst,bound,data.ctypes.data,count);mode='INDICES';decode=decode_ix
        else:
            bound=attr_bound(count,stride);dst=ct.create_string_buffer(bound)
            n=encode_attr(dst,bound,raw,count,stride);mode='ATTRIBUTES';decode=decode_attr
        if not n:raise ValueError('Empty encoded stream.')
        packed=dst.raw[:n];comparison=ct.create_string_buffer(len(raw))
        if decode(comparison,count,stride,packed,n)!=0 or comparison.raw!=raw:raise ValueError('Lossless decoder mismatch.')
        extension={'buffer':0,'byteOffset':offset,'byteLength':n,'byteStride':stride,'count':count,'mode':mode}
        view['buffer']=1;view['byteOffset']=virtual;view['extensions']={EXT:extension}
        virtual+=len(raw);virtual+=(-virtual)%4;encoded.extend(packed)
        checksum.append({'view':i,'sha256':hashlib.sha256(raw).hexdigest()})
    encoded.extend(bytes((-len(encoded))%4))
    document['buffers']=[{'byteLength':len(encoded)},{'byteLength':virtual,'extensions':{EXT:{'fallback':True}}}]
    document.setdefault('extensionsUsed',[]).append(EXT);document.setdefault('extensionsRequired',[]).append(EXT)
    head=json.dumps(document,separators=(',',':')).encode();head+=b' '*((-len(head))%4)
    result=struct.pack('<4sIIII',b'glTF',2,28+len(head)+len(encoded),len(head),0x4e4f534a)+head+struct.pack('<II',len(encoded),0x004e4942)+encoded
    return result,checksum

def pack(path,library):
    if path.stat().st_size<32768:return []
    doc,binary=parse(path)
    if EXT in doc.get('extensionsUsed',[]):return []
    encoded,checks=encode(doc,binary,library)
    if len(encoded)>=path.stat().st_size:return []
    path.write_bytes(encoded)
    return checks

BLENDER_LIB=Path('/Applications/Blender.app/Contents/Resources/lib/libmeshoptimizer.dylib')
