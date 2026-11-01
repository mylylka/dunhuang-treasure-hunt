"""Verify floor topology and byte-for-byte geometry equivalence of other exported meshes."""
from pathlib import Path
import json,struct,hashlib
ROOT=Path(__file__).resolve().parents[1]
def glb(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def attr(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dim={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];step=struct.calcsize(fmt)*dim;start=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+fmt*dim,b,start+k*v.get('byteStride',step)) for k in range(a['count'])]
a,ab=glb(ROOT/'public/assets/world/music-pavilion/v004/music-pavilion.glb');b,bb=glb(ROOT/'public/assets/world/music-pavilion/v005/music-pavilion.glb')
def fixed(g,data):
 out={}
 floor_ids={n['mesh'] for n in g['nodes'] if n.get('extras',{}).get('semanticGroup')=='court-paving' and 'mesh' in n}
 for i,m in enumerate(g['meshes']):
  if i in floor_ids:continue
  out[m['name']]=[{'position':attr(g,data,p['attributes']['POSITION']),'normal':attr(g,data,p['attributes']['NORMAL']),'indices':attr(g,data,p['indices'])} for p in m['primitives']]
 return out
assert fixed(a,ab)==fixed(b,bb),'Protected geometry changed'
floor_ids={n['mesh'] for n in b['nodes'] if n.get('extras',{}).get('semanticGroup')=='court-paving' and 'mesh' in n}
floors=[b['meshes'][i] for i in floor_ids];assert len(floors)==2
heights=[]
for m in floors:
 for p in m['primitives']:
  vs=attr(b,bb,p['attributes']['POSITION']);heights+= [v[1] for v in vs]
  assert max(v[1] for v in vs)-min(v[1] for v in vs)<.00001,'Floor has raised faces'
assert set(round(h,3) for h in heights)=={.03,.035}
manifest=json.loads((ROOT/'art-source/world/models/music-pavilion/v005/export-manifest.json').read_text())
assert hashlib.sha256((ROOT/manifest['source']).read_bytes()).hexdigest()==manifest['sourceSha256']
report={'passed':True,'protectedMeshCount':len(fixed(a,ab)),'samePositionsNormalsIndices':True,'floorHeights':sorted(set(round(h,3) for h in heights)),'oldSourceUnchanged':True}
(ROOT/'work/world/music-pavilion-v005-model-check.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
