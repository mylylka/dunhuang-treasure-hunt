"""Build the approved two-storey side-gallery graybox; keep every original asset.

Blender -b -t 4 --python-exit-code 1 --python scripts/build-world-mogao-upper-v002.py [--render]
JSON is the navigation/collision/geometry source of truth, in Three.js Y-up metres.
Blender uses X right, Y cave depth, Z up. All upper assets are platform-relative;
the derived mountain retains the original ground-relative height convention.
"""
import bpy, bmesh, json, math, hashlib, struct, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
ALIGNED_EXHIBIT = '--aligned-exhibit' in sys.argv
VERSION = 'v003' if ALIGNED_EXHIBIT else 'v002'
SOURCE = ROOT / f'art-source/world/models/mogao-upper/{VERSION}'
OUT = ROOT / f'public/assets/world/mogao-upper/{VERSION}'
WORK = ROOT / ('work/world/mogao-exhibit-v001/finale-v001/architecture' if ALIGNED_EXHIBIT else 'work/world')
for folder in (SOURCE, OUT, WORK): folder.mkdir(parents=True, exist_ok=True)
LAYOUT = ROOT / f'src/content/world/mogao-upper-{VERSION}.json'
L = json.loads((ROOT / 'src/content/world/mogao-upper-v002.json').read_text())

if ALIGNED_EXHIBIT:
    # Interior opening, landing, and both side returns use one clear width.
    entry_front = -21.2
    entry = next(o for o in L['openings'] if o['id'] == 'stair-entry-opening')
    entry['max'][2] = entry_front
    for surface in L['surfaces']:
        if surface['id'] in ('stair-entry', 'landing-0'):
            surface['maxZ'] = entry_front
    solids = {s['id']: s for s in L['solids']}
    solids['slab-landing-0']['max'][2] = entry_front
    solids['entry-side-north']['min'][2] = entry_front
    for id in ('entry-side-north', 'entry-side-ceiling'):
        solids[id]['max'][2] = entry_front + .25
    solids['entry-side-north']['max'][0] = 22

    # The original hall-side wall gives both portals their architectural datum.
    # One projected slab meets the hall floor, with matching thin reveals inside
    # the existing wall thickness. No extra jambs on the chamber facade.
    L['viewGates'] = {}
    for letter in ('a', 'b'):
        wall = solids[f'{letter}-west-wall']
        lintel = solids[f'{letter}-west-lintel']
        floor_y = wall['min'][1]
        back_x, hall_x = wall['min'][0], wall['max'][0]
        min_z, max_z = lintel['min'][2], lintel['max'][2]
        head_y = lintel['min'][1]
        center_z = (min_z + max_z) / 2
        cut = next(o for o in L['openings'] if o['id'] == f'view-opening-{letter}')
        cut['max'][2] = max_z
        view_floor = solids[f'{letter}-view-floor']
        view_floor['min'][2], view_floor['max'][2] = min_z, max_z
        view_floor['max'][0] = hall_x
        view_floor.pop('walkSurface')
        L['solids'].remove(solids[f'{letter}-view-link-floor'])
        for edge, z0, z1 in [('south', min_z - .18, min_z), ('north', max_z, max_z + .18)]:
            reveal = solids[f'{letter}-view-{edge}-wall']
            reveal['min'] = [13.94, floor_y, z0]
            reveal['max'] = [back_x, head_y, z1]
        ceiling = solids[f'{letter}-view-ceiling']
        ceiling['min'] = [13.94, head_y, min_z - .18]
        ceiling['max'] = [back_x, head_y + .16, max_z + .18]
        for surface in L['surfaces']:
            if surface['id'] in (f'view-{letter}', f'view-link-{letter}'):
                surface['minZ'], surface['maxZ'] = min_z, max_z
                if surface['id'] == f'view-link-{letter}':
                    surface['minX'], surface['maxX'] = 14.0, hall_x
                else:
                    surface['maxX'] = 14.0
                surface['safePoint'] = [11.2 if surface['id'] == f'view-{letter}' else 14.4, floor_y, center_z]
        for point in L['route']:
            if point['surfaceId'] in (f'view-{letter}', f'view-link-{letter}') or (
                point['surfaceId'] == f'hall-{letter}' and point['position'][2] == -12.8
            ):
                point['position'][2] = center_z
        next(v for v in L['viewpoints'] if v['id'] == f'view-{letter}')['position'][2] = center_z
        L['viewGates'][letter] = {
            'min': [back_x, floor_y, min_z], 'max': [hall_x, round(head_y, 4), max_z],
        }
    L['version'] = VERSION
    L['assets'] = {name: path.replace('/v002/', '/v003/') for name, path in L['assets'].items()}
F = L['origin'][1]
originals = [ROOT / p for p in (
    'public/assets/world/mogao/v010/interior.glb',
    'public/assets/world/mogao-strata/v001/mountain.glb',
    'public/assets/world/mogao/v009/buddha.glb',
    'public/assets/world/mogao-massing/v003/tower.glb')]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
protected = {str(p.relative_to(ROOT)): sha(p) for p in originals}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.unit_settings.system = 'METRIC'
upper, temporary, audit = [], [], {}

def xyz(p): return (p[0], -p[2], p[1])
def material(name, color, emission=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = (*color, 1)
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = .87
    if emission:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emission
    return m

mats = {
    'wall': material('graybox-warm-plaster', (.56, .46, .34)),
    'floor': material('graybox-warm-stone', (.47, .40, .32)),
    'step': material('graybox-wood-tread', (.47, .34, .23)),
    'rail': material('graybox-red-wood', (.29, .085, .045)),
    'panel': material('graybox-mural-placeholder', (.33, .38, .34)),
    'label': material('graybox-clear-label', (.9, .78, .55), .15),
    'edge': material('graybox-edge', (.73, .58, .35)),
}

def box(name, lo, hi, mat='wall', owned=True):
    # lo/hi are Three vectors; the conversion reverses the depth axis.
    p, q = xyz(lo), xyz(hi)
    center = [(a+b)/2 for a,b in zip(p,q)]
    size = [abs(a-b) for a,b in zip(p,q)]
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object; o.name = name; o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: o.data.materials.append(mats[mat] if isinstance(mat,str) else mat)
    o['semanticGroup'] = 'mogao-upper-graybox-v001'
    if owned: upper.append(o)
    return o

def beam(name, start, end, width=.075, material='rail'):
    a,b = Vector(xyz(start)),Vector(xyz(end)); direction = b-a
    bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.dimensions=(width,width,direction.length)
    o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mats[material]);upper.append(o);return o

def text(name, value, position, facing='north', size=.27):
    # Text lies in local XY, normal local Z. Face into the room.
    bpy.ops.object.text_add(location=xyz(position))
    o=bpy.context.object;o.name=name;o.data.body=value;o.data.size=size
    o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.extrude=.001
    if facing=='north': o.rotation_euler=(math.pi/2,0,math.pi)
    elif facing=='east': o.rotation_euler=(math.pi/2,0,math.pi/2)
    elif facing=='south':o.rotation_euler=(math.pi/2,0,0)
    o.data.materials.append(mats['label']);upper.append(o)
    bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def import_meshes(path):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']

def world_bounds(obj):
    pts=[obj.matrix_world@Vector(c) for c in obj.bound_box]
    return ([min(p[k] for p in pts) for k in range(3)],
            [max(p[k] for p in pts) for k in range(3)])

def overlaps(a,b):
    return all(a[0][k]<b[1][k]-1e-6 and a[1][k]>b[0][k]+1e-6 for k in range(3))

def cut_closed(objects, cutter):
    count=0; cb=world_bounds(cutter)
    for obj in objects:
        if not overlaps(world_bounds(obj),cb):continue
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('upper-v002-real-opening','BOOLEAN')
        mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
        bpy.ops.object.modifier_apply(modifier=mod.name);count+=1
    cutter.hide_render=True;cutter.hide_set(True);temporary.append(cutter)
    return count

def subtract_box_faces(obj, lo, hi):
    """Clip existing painted wall polygons, preserving UV interpolation.

    Closed-plane boolean is unreliable for a single artwork plane; exact convex
    polygon clipping keeps every fragment outside the box and drops its inside.
    Actual shell and both artwork layers therefore have matching physical holes.
    """
    mesh=obj.data;mesh.calc_loop_triangles()
    active=mesh.uv_layers.active
    verts=[];faces=[];uvs=[];mi=[];removed=0
    def split(poly,axis,val,positive):
        inside=[];outside=[]
        for i,p in enumerate(poly):
            q=poly[(i+1)%len(poly)]
            dp=(p[0][axis]-val)*(1 if positive else -1)
            dq=(q[0][axis]-val)*(1 if positive else -1)
            inp=dp>=-1e-7;inq=dq>=-1e-7
            (inside if inp else outside).append(p)
            if inp!=inq:
                t=dp/(dp-dq)
                it=(p[0].lerp(q[0],t),p[1].lerp(q[1],t))
                inside.append(it);outside.append(it)
        return inside,outside
    for poly in mesh.polygons:
        work=[(obj.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co,
               Vector(active.data[li].uv) if active else Vector((0,0))) for li in poly.loop_indices]
        keep=[]
        for axis,value,positive in [(k,lo[k],True) for k in range(3)]+[(k,hi[k],False) for k in range(3)]:
            if not work:break
            work,outside=split(work,axis,value,positive)
            if len(outside)>=3:keep.append(outside)
        if len(work)>=3:removed+=1
        for piece in keep:
            offset=len(verts);verts.extend([p[0] for p in piece]);uvs.extend([p[1] for p in piece])
            faces.append(tuple(range(offset,offset+len(piece))));mi.append(poly.material_index)
    if removed==0:return 0
    oldmaterials=list(mesh.materials)
    new=bpy.data.meshes.new(obj.name+'-with-upper-openings');new.from_pydata(verts,[],faces);new.update()
    for mat in oldmaterials:new.materials.append(mat)
    uv=new.uv_layers.new(name='UVMap')
    for loop in new.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
    for poly,matindex in zip(new.polygons,mi):poly.material_index=matindex
    obj.data=new;obj.matrix_world.identity()
    return removed

interior=import_meshes(originals[0])
mountain=import_meshes(originals[1])
rock=next(o for o in mountain if 'mountain' in o.name)
audit['interiorCuts']=[]
for opening in L['openings']:
    lo,hi=opening['min'],opening['max']
    blo=(lo[0],-hi[2],lo[1]);bhi=(hi[0],-lo[2],hi[1])
    changed=[]
    for o in interior:
        if overlaps(world_bounds(o),(blo,bhi)):
            n=subtract_box_faces(o,blo,bhi)
            if n:changed.append({'object':o.name,'cutFaces':n})
    audit['interiorCuts'].append({'opening':opening['id'],'changed':changed})
    assert changed, 'No actual wall opening: '+opening['id']

# Carve only concealed side volumes, preserving exterior silhouette and originals.
# The hall, staircase and connector cavities all overlap to avoid rock seams.
cavities=[]
for room in L['rooms']:
    lo,hi=room['min'],room['max']
    cavities.append((room['id'],[lo[0]-.4,lo[1]-.35,lo[2]-.35],[hi[0]+.35,hi[1]+.35,hi[2]+.35]))
cavities.append(('stair-shaft',L['stair']['shaftMin'].copy(),L['stair']['shaftMax'].copy()))
if ALIGNED_EXHIBIT:
    shaft_min, shaft_max = L['stair']['shaftMin'], L['stair']['shaftMax']
    cavities.append(('lower-landing', [shaft_min[0], shaft_min[1], -24.28],
                     [shaft_max[0], 3.45, entry_front + .25]))
for opening in L['openings']:
    lo,hi=opening['min'],opening['max']
    cavities.append((opening['id'],[lo[0]-.1,lo[1]-.05,lo[2]-.3],[hi[0]+.7,hi[1]+.35,hi[2]+.3]))
audit['rockCuts']=[]
for name,lo,hi in cavities:
    lo[1]+=F;hi[1]+=F
    cutter=box('construction-cutter-'+name,lo,hi,mat=None,owned=False)
    audit['rockCuts'].append({'cavity':name,'objects':cut_closed([rock],cutter)})
    print('CARVED',name,flush=True)

# Every registered solid is visible structure; new rails are absent by design.
# A shallow faceted cave roof rises above the retained six-metre minimum.
def roof_patch(name, points, thickness):
    vertices=[xyz(p) for p in points]+[xyz([p[0],p[1]+thickness,p[2]]) for p in points]
    mesh=bpy.data.meshes.new(name+'-mesh')
    mesh.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mats['wall']);obj['semanticGroup']='mogao-upper-graybox-v002';upper.append(obj)
    return obj

def cave_roof(solid):
    lo,hi=solid['min'],solid['max'];x0,y0,z0=lo;x1,_,z1=hi
    rise,inset,thickness=solid['vaultRise'],solid['vaultInset'],solid['roofThickness']
    ix0,ix1,iz0,iz1=x0+inset,x1-inset,z0+inset,z1-inset
    # Each strip follows the physical sloping soffit; no whole-room roof AABB.
    for side in ('west','east'):
        n=max(1,math.ceil((iz1-iz0)/1.0))
        for j in range(n):
            a=iz0+(iz1-iz0)*j/n;b=iz0+(iz1-iz0)*(j+1)/n
            points=([[x0,y0,a],[ix0,y0+rise,a],[ix0,y0+rise,b],[x0,y0,b]] if side=='west'
                    else [[ix1,y0+rise,a],[x1,y0,a],[x1,y0,b],[ix1,y0+rise,b]])
            roof_patch(solid['id']+'-'+side+'-'+str(j),points,thickness)
    for side in ('south','north'):
        n=max(1,math.ceil((x1-x0)/1.0))
        for j in range(n):
            a=x0+(x1-x0)*j/n;b=x0+(x1-x0)*(j+1)/n
            # The end strips include triangular corner regions and meet the side slopes.
            ia=max(ix0,min(ix1,a));ib=max(ix0,min(ix1,b))
            points=([[a,y0,z0],[b,y0,z0],[ib,y0+rise,iz0],[ia,y0+rise,iz0]] if side=='south'
                    else [[ia,y0+rise,iz1],[ib,y0+rise,iz1],[b,y0,z1],[a,y0,z1]])
            roof_patch(solid['id']+'-'+side+'-'+str(j),points,thickness)
    box(solid['id']+'-crown',[ix0,y0+rise,iz0],[ix1,y0+rise+thickness,iz1],'wall')

for solid in L['solids']:
    if solid.get('existingGeometry'):continue
    if solid.get('rail'):raise AssertionError('v002 must not contain new rail solids')
    if solid.get('vaultRise'):cave_roof(solid);continue
    lo,hi=solid['min'],solid['max'];id=solid['id']
    box(id,lo,hi,'floor' if 'floor' in id or 'slab' in id else 'wall')

for surf in L['surfaces']:
    id=surf['id']
    if id=='stair-entry':
        box('stair-entry-floor',[surf['minX'],surf['y']-.26,surf['minZ']],[surf['maxX'],surf['y'],surf['maxZ']],'floor')
    if surf['kind']!='ramp':continue
    # Build top-following individual tread boxes, no solid wedge to fill the
    # usable space under the next switchback flight.
    a,b=surf['y'],surf['endY'];rise=abs(b-a);count=math.ceil(rise/L['stair']['maxRiser'])
    z0,z1=surf['minZ'],surf['maxZ'];step=(z1-z0)/count
    for j in range(count):
        za=z0+step*j;zb=za+step
        ya=a+(b-a)*j/count;yb=a+(b-a)*(j+1)/count;top=max(ya,yb)
        box(id+'-tread-'+str(j),[surf['minX'],top-.34,za],[surf['maxX'],top,zb],'step')
    audit.setdefault('stairFlights',[]).append({'id':id,'rise':rise,'steps':count,'riser':rise/count,'tread':step,'width':surf['maxX']-surf['minX']})

# Two sober and measurable blank story walls, never an invented exhibit.
for room in L['rooms']:
    id=room['id'];h=room['floorY'];letter=id[-1].upper()
    box(id+'-mural-panel',[17,h+.7,-12.008],[27,h+4.8,-12.002],'panel')
    for y in [h+.7,h+4.8]:beam(id+'-panel-dimension',[16.5,y,-12.12],[16.9,y,-12.12],.025,'edge')
    beam(id+'-height-dimension',[16.7,h+.7,-12.12],[16.7,h+4.8,-12.12],.025,'edge')
    text(id+'-placeholder-label','WALL MURAL PLACEHOLDER  /  10.0 x 4.1 m',[22,h+2.8,-12.012],size=.34)
    text(id+'-hall-label',f'CAVE {letter}  /  +{h:.2f} m  /  MIN CLEAR HEIGHT 6.0 m',[22,h+5.35,-12.13],size=.24)
    text(id+'-bottom-label','BOTTOM +0.70 m',[22,h+.4,-12.13],size=.22)
    text(id+'-exit-label','BUDDHA VIEW',[14.91,h+2.7,-17.8],'east',.27)

# Portal reveals frame the cuts; no extra plane covers any opening.
for opening in L['openings']:
    if ALIGNED_EXHIBIT: continue
    lo,hi=opening['min'],opening['max'];y0,y1=lo[1]+.06,hi[1]
    for z in [lo[2],hi[2]]:box(opening['id']+'-jamb',[13.78,y0,z-.07],[14.05,y1,z+.07],'edge')
    box(opening['id']+'-lintel',[13.78,y1,lo[2]-.07],[14.05,y1+.12,hi[2]+.07],'edge')

def export(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    target=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_apply=True,
                              export_animations=False,export_extras=True,export_yup=True)
    raw=target.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length])
    tris=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    return {'bytes':len(raw),'triangles':tris,'sha256':sha(target)}

exports={name:export(name,objects) for name,objects in [('interior',interior),('mountain',mountain),('upper',upper)]}
# Save original Buddha only as a render reference; runtime still loads the original file.
buddha=import_meshes(originals[2])
bpy.context.view_layer.update()

if ALIGNED_EXHIBIT:
    # Keep the original protective volume on the ground and everywhere outside
    # the two balconies. Narrow its near corner only where there is a measured
    # gap between the balcony and the actual sculpture at the same elevation.
    near_z = -14.85
    floors = [L['viewGates'][letter]['min'][1] for letter in ('a', 'b')]
    walk_bands = [(y - .1, y + 2.05) for y in floors]
    camera_bands = [(y - .85, y + 5) for y in floors]
    measured = {band: 0.0 for band in walk_bands + camera_bands}
    for obj in buddha:
        vertices = [obj.matrix_world @ v.co for v in obj.data.vertices]
        for poly in obj.data.polygons:
            points = [vertices[i] for i in poly.vertices]
            if min(p.y for p in points) > -near_z:
                continue
            lo, hi = min(p.z for p in points), max(p.z for p in points)
            max_x = max(p.x for p in points)
            for band in measured:
                if lo <= band[1] and hi >= band[0]:
                    measured[band] = max(measured[band], max_x)

    def sculpture_profile(original, bands):
        x0, y0, z0 = original['min']
        x1, y1, z1 = original['max']
        bottom = y0
        for i, band in enumerate(bands):
            lo, hi = band
            face_x = min(x1, round(measured[band] + .22, 5))
            for part, lower, upper in [
                ('below', [x0, bottom, z0], [x1, lo, z1]),
                ('behind', [x0, lo, z0], [x1, hi, near_z]),
                ('inner', [x0, lo, near_z], [face_x, hi, z1]),
            ]:
                yield {**original, 'id': f"{original['id']}-{i + 1}-{part}", 'min': lower, 'max': upper}
            bottom = hi
        yield {**original, 'id': f"{original['id']}-crown", 'min': [x0, bottom, z0]}

    original = next(s for s in L['solids'] if s['id'] == 'existing-buddha')
    L['solids'].remove(original)
    L['solids'].extend(sculpture_profile(original, walk_bands))
    audit['measuredBuddhaEdge'] = [{'height': band, 'maxX': round(measured[band], 4)} for band in measured]

# Camera bounds follow actual geometry, independently of the larger character
# walkable-surface edge protection. In particular there is no whole-flight staircase AABB: that
# would wrongly fill the space above/below a flight and trap the camera.
camera_solids=[]
def camera_box(name, points, pad=0):
    ps=[Vector((p.x,p.z,-p.y)) for p in points]
    lo=[min(p[k] for p in ps)-pad for k in range(3)]
    hi=[max(p[k] for p in ps)+pad for k in range(3)]
    for k in range(3):
        if hi[k]-lo[k]<.04:
            middle=(hi[k]+lo[k])/2;lo[k]=middle-.02;hi[k]=middle+.02
    camera_solids.append({'id':name,'min':[round(v,5) for v in lo],
                          'max':[round(v,5) for v in hi]})
for obj in upper:
    if 'label' in obj.name or 'dimension' in obj.name:continue
    camera_box('geometry-'+obj.name,[obj.matrix_world@Vector(c) for c in obj.bound_box])

def camera_face(name, points):
    # Axis-aligned clipped wall pieces retain the real holes. Sloped ceiling
    # faces are subdivided so their proxy never fills the cavern under them.
    spans=[max(p[k] for p in points)-min(p[k] for p in points) for k in range(3)]
    if min(spans)<1e-5:
        camera_box(name,points);return
    def triangle(a,b,c,index):
        sides=[(a,b,c),(b,c,a),(c,a,b)]
        p,q,r=max(sides,key=lambda s:(s[0]-s[1]).length_squared)
        if (p-q).length>2:
            middle=(p+q)/2
            triangle(p,middle,r,index+'a');triangle(middle,q,r,index+'b')
        else:camera_box(name+'-'+index,[a,b,c])
    for i in range(1,len(points)-1):triangle(points[0],points[i],points[i+1],str(i))

roof_objects=[obj for obj in interior if 'pyramid-vault' in obj.name]
roof_vertices=[];roof_faces=[]
for obj in roof_objects:
    offset=len(roof_vertices)
    roof_vertices.extend(obj.matrix_world@v.co for v in obj.data.vertices)
    roof_faces.extend(tuple(offset+i for i in poly.vertices) for poly in obj.data.polygons)
if roof_faces:
    roof_bvh=BVHTree.FromPolygons(roof_vertices,roof_faces)
    # One-metre cells sampled against the real vault give smaller and tighter
    # proxies than thousands of recursive triangles, without a room-sized box.
    for x in range(math.floor(min(p.x for p in roof_vertices)),math.ceil(max(p.x for p in roof_vertices))):
        for depth in range(math.floor(min(p.y for p in roof_vertices)),math.ceil(max(p.y for p in roof_vertices))):
            hits=[]
            for u,v in [(0,0),(0,1),(1,0),(1,1),(.5,.5)]:
                p,*_=roof_bvh.ray_cast(Vector((x+u,depth+v,-1)),Vector((0,0,1)),45)
                if p is not None:hits.append(p.z)
            if hits:
                camera_box(f'main-vault-cell-{x}-{depth}',
                           [Vector((x,depth,min(hits)-.02)),Vector((x+1,depth+1,max(hits)+.22))])
for obj in interior:
    if obj in roof_objects:continue
    if 'buddha-contact-stone' in obj.name:
        camera_box('main-'+obj.name,[obj.matrix_world@Vector(c) for c in obj.bound_box]);continue
    for poly in obj.data.polygons:
        camera_face('main-'+obj.name+'-'+str(poly.index),
                    [obj.matrix_world@obj.data.vertices[i].co for i in poly.vertices])
# The excavated stair shaft also has exposed rock above/between gallery roofs.
# These are real cut faces, but they are not meshes in the new plaster shell.
# Preserve each adjoining cavity as an opening when deriving their camera proxy;
# a single solid shaft box would block every flight and doorway.
local_cavities=[(name,[lo[0],lo[1]-F,lo[2]],[hi[0],hi[1]-F,hi[2]])
                for name,lo,hi in cavities]
def subtract_rectangle(rect, hole):
    x0,y0,x1,y1=rect;hx0,hy0,hx1,hy1=hole
    a,b=max(x0,hx0),min(x1,hx1);c,d=max(y0,hy0),min(y1,hy1)
    if a>=b or c>=d:return [rect]
    return [r for r in [(x0,y0,a,y1),(b,y0,x1,y1),(a,y0,b,c),(a,d,b,y1)]
            if r[2]-r[0]>1e-5 and r[3]-r[1]>1e-5]
shaft=next(c for c in local_cavities if c[0]=='stair-shaft')
for axis in range(3):
    uv=[k for k in range(3) if k!=axis]
    for side in [1,2]:
        coord=shaft[side][axis]
        pieces=[(shaft[1][uv[0]],shaft[1][uv[1]],shaft[2][uv[0]],shaft[2][uv[1]])]
        for name,lo,hi in local_cavities:
            if name=='stair-shaft' or not lo[axis]<coord<hi[axis]:continue
            pieces=[r for piece in pieces for r in subtract_rectangle(piece,
                     (lo[uv[0]],lo[uv[1]],hi[uv[0]],hi[uv[1]]))]
        for i,(u0,v0,u1,v1) in enumerate(pieces):
            lo=[0,0,0];hi=[0,0,0];lo[axis]=coord-.025;hi[axis]=coord+.025
            lo[uv[0]]=u0;hi[uv[0]]=u1;lo[uv[1]]=v0;hi[uv[1]]=v1
            camera_box(f'shaft-cut-rock-{axis}-{side}-{i}',[Vector(xyz(lo)),Vector(xyz(hi))])
# The original Buddha is unchanged; use its complete physical envelope to keep
# the orbit camera out of the statue and halo at every viewing level.
camera_box('original-buddha-envelope',
           [obj.matrix_world@Vector(c) for obj in buddha for c in obj.bound_box])
if ALIGNED_EXHIBIT:
    camera_solids.extend(sculpture_profile(camera_solids.pop(), camera_bands))
    # The lower corner has a separate cut from the shaft above it.
    camera_box('geometry-stair-lower-east-return',
               [Vector(xyz([21.7, -.26, -24.2])), Vector(xyz([22, 3.45, entry_front]))])
audit['cameraProxyCount']=len(camera_solids)
audit['cameraProxyPolicy']='Actual upper object bounds; clipped main-room faces; sampled sloped ceiling; original Buddha envelope; shaft cut-rock boundaries with all adjoining cavities subtracted. No whole staircase-flight AABB.'
for obj in mountain:obj.hide_render=True;obj.hide_set(True)
for obj in upper+interior+buddha:obj.hide_render=False;obj.hide_set(False)
for obj in temporary:obj.hide_render=True;obj.hide_set(True)

def bvh(objects):
    vs=[];fs=[]
    for o in objects:
        off=len(vs);vs.extend([o.matrix_world@v.co for v in o.data.vertices])
        fs.extend([tuple(off+i for i in p.vertices) for p in o.data.polygons])
    return BVHTree.FromPolygons(vs,fs)

# Record actual ray obstructions to fixed points of the same original Buddha.
structural=bvh(interior+upper)
targets={'head':[0,29.44453125,-23.8],'chest':[0,20.44453125,-19.8],'feet':[0,.44453125,-16]}
viewaudit=[]
for view in L['viewpoints']:
    eye=view['position'].copy();eye[1]+=view['eyeHeight'];bp=Vector(xyz(eye));lines={}
    for part,target in targets.items():
        d=Vector(xyz(target))-bp;hit,normal,index,dist=structural.ray_cast(bp,d.normalized(),d.length-.15)
        horizontal=math.hypot(target[0]-eye[0],target[2]-eye[2])
        lines[part]={'elevationDegrees':math.degrees(math.atan2(target[1]-eye[1],horizontal)),
                     'structureObstructed':hit is not None,'firstStructureDistance':dist if hit else None}
    viewaudit.append({'id':view['id'],'eye':eye,'fixedBuddhaPoints':lines})
    assert not lines['head']['structureObstructed'], 'Head view blocked: '+view['id']
    assert not lines['chest']['structureObstructed'], 'Chest view blocked: '+view['id']
audit['views']=viewaudit
if ALIGNED_EXHIBIT:
    L['cameraSolids'] = camera_solids
    # Keep individual authored/generated records readable without a 20,000-line diff.
    records = []
    for key, value in L.items():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            rows = ',\n'.join('    ' + json.dumps(row, ensure_ascii=False, separators=(',', ': ')) for row in value)
            records.append(f'  "{key}": [\n{rows}\n  ]')
        else:
            records.append(f'  "{key}": {json.dumps(value, ensure_ascii=False)}')
    LAYOUT.write_text('{\n' + ',\n'.join(records) + '\n}\n')
else:
    # Read again before adding a derived field, preserving any parallel layout edit.
    latest_layout = json.loads(LAYOUT.read_text())
    latest_layout['cameraSolids'] = camera_solids
    LAYOUT.write_text(json.dumps(latest_layout, ensure_ascii=False, indent=2) + '\n')
audit['stairViewPolicy']='The side stair is enclosed by the rock/shaft and does not promise an uninterrupted Buddha view. Its landings lead to the genuine viewing openings at +8.11 m and +19.58 m.'
audit['sourceAssetsUnchanged']=all(sha(ROOT/p)==h for p,h in protected.items())
assert audit['sourceAssetsUnchanged']
audit['sourceHashes']=protected;audit['exports']=exports
audit['scope']='Four-flight continuous cave-gallery graybox. Same original Buddha and +8.11/+19.58m levels. No new rails. Wall-integrated blank mural placeholders; no invented story art.'
audit['caveGalleryMinimumHeight']=6.0
audit['caveRoofRise']=.65
audit['routeSummary'] = L['route'] if ALIGNED_EXHIBIT else json.loads((WORK/'mogao-upper-v002-layout-summary.json').read_text())
if ALIGNED_EXHIBIT:
    audit['scope'] = 'Existing cave exhibition with aligned viewing portals, a widened lower entry, and balcony-specific Buddha clearance.'
audit['coordinateContract']='upper/interior platform-relative; mountain ground-relative; all glTF Y-up.'
(SOURCE/'export-manifest.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
(WORK/f'mogao-upper-{VERSION}-geometry-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')

# Local Blender source keeps the complete scene but the mountain is hidden for inspection.
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'mogao-upper-graybox.blend'))
if '--render' in sys.argv:
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('graybox-world');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.17,.13,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    for p,t,energy,size in [((0,7,13),(0,24,20),4200,12),((18,17,13),(20,17,8),1000,8),((18,17,24),(20,17,19),1000,8)]:
        bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size
        o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.lens=23
    for view in L['viewpoints']:
        p=view['position'].copy();p[1]+=view['eyeHeight'];camera.location=xyz(p)
        target=view['target'].copy();target[1]=18 if view['id']=='ground' else 23
        camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(WORK/f"mogao-upper-v002-{view['id']}.png")
        bpy.ops.render.render(write_still=True)
    # Gallery interior, preserves wall/floor scale and leaves the 4.1m blank mural measurable.
    camera.location=(25,20,10.0);camera.rotation_euler=(Vector((20,12,11))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(WORK/'mogao-upper-v002-hall-a.png');bpy.ops.render.render(write_still=True)
    # Cutaway of the same scene: remove only camera-facing walls/ceilings from
    # this inspection render, never from GLB exports or navigation geometry.
    for obj in interior:obj.hide_render='earth-floor' not in obj.name
    for obj in upper:
        obj.hide_render=any(part in obj.name for part in
            ('east-wall','north-wall','ceiling','stair-east-shell','stair-back-shell',
             'label','dimension','mural-panel','west-wall','south-east-wall','south-lintel'))
    bpy.ops.object.light_add(type='AREA',location=(16,-22,36));light=bpy.context.object
    light.data.energy=10500;light.data.size=28
    light.rotation_euler=(Vector((10,20,14))-light.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=59
    camera.location=(62,-53,46);camera.rotation_euler=(Vector((6,21,16))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=1600;scene.render.resolution_y=1200
    scene.render.filepath=str(WORK/'mogao-upper-v002-cutaway.png');bpy.ops.render.render(write_still=True)
print('MOGAO_UPPER',json.dumps(exports),flush=True)
