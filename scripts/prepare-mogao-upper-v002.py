"""Derive the approved four-flight cave-gallery graybox from the preserved v001."""
from pathlib import Path
import copy
import json
import math

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'src/content/world/mogao-upper-v001.json'
OUT = ROOT / 'src/content/world/mogao-upper-v002.json'
old = json.loads(OLD.read_text())
layout = copy.deepcopy(old)
layout['version'] = 'mogao-upper-v002'
layout['assets'] = {key: value.replace('/v001/', '/v002/') for key, value in old['assets'].items()}

levels = [.024, (.024 + 8.11) / 2, 8.11, (8.11 + 19.58) / 2, 19.58]
runs = [math.ceil(((levels[i + 1] - levels[i]) / math.tan(math.radians(35))) * 1e6) / 1e6 for i in (0, 2)]
front = -24.2
backs = [round(front - run, 6) for run in runs]
landing_back = [round(back - 2.4, 6) for back in backs]

surfaces = copy.deepcopy(old['surfaces'][:3])
def landing(index, y, z0, z1, neighbors):
    return dict(id=f'landing-{index}', kind='floor', label=f'转角平台 {index}',
                minX=15.7, maxX=21.7, minZ=z0, maxZ=z1, y=y, neighbors=neighbors)
def flight(index, x0, x1, z0, low, high, outward, neighbors):
    return dict(id=f'flight-{index}', kind='ramp', label=f'第 {index} 梯段',
                minX=x0, maxX=x1, minZ=z0, maxZ=front,
                y=high if outward else low, endY=low if outward else high,
                axis='z', neighbors=neighbors)

surfaces.extend([
    landing(0, levels[0], front, -21.8, ['stair-entry', 'flight-1']),
    flight(1, 15.7, 18.5, backs[0], levels[0], levels[1], True, ['landing-0', 'landing-1']),
    landing(1, levels[1], landing_back[0], backs[0], ['flight-1', 'flight-2']),
    flight(2, 18.9, 21.7, backs[0], levels[1], levels[2], False, ['landing-1', 'landing-2']),
    landing(2, levels[2], front, -21.8, ['flight-2', 'flight-3', 'hall-a']),
    flight(3, 15.7, 18.5, backs[1], levels[2], levels[3], True, ['landing-2', 'landing-3']),
    landing(3, levels[3], landing_back[1], backs[1], ['flight-3', 'flight-4']),
    flight(4, 18.9, 21.7, backs[1], levels[3], levels[4], False, ['landing-3', 'landing-4']),
    landing(4, levels[4], front, -21.8, ['flight-4', 'hall-b']),
])
for original in old['surfaces']:
    if original['id'] not in ['hall-a', 'hall-b', 'view-link-a', 'view-a', 'view-link-b', 'view-b']:
        continue
    item = copy.deepcopy(original)
    if item['id'] == 'hall-a':
        item['neighbors'] = ['landing-2', 'view-link-a']; item['label'] = '壁画洞窟 A'
    if item['id'] == 'hall-b':
        item['neighbors'] = ['landing-4', 'view-link-b']; item['label'] = '壁画洞窟 B'
    surfaces.append(item)
layout['surfaces'] = surfaces

solids = []
for surface in surfaces:
    if surface['id'].startswith('landing-'):
        solids.append(dict(id='slab-' + surface['id'],
                           min=[surface['minX'], surface['y'] - .26, surface['minZ']],
                           max=[surface['maxX'], surface['y'], surface['maxZ']],
                           navigation=True, walkSurface=surface['id']))
for original in old['solids']:
    if original['id'].startswith('slab-landing-') or original.get('rail'):
        continue
    item = copy.deepcopy(original)
    if item['id'].startswith(('a-', 'b-')):
        floor = levels[2] if item['id'].startswith('a-') else levels[4]
        if item['id'].endswith('-ceiling') and '-view-' not in item['id']:
            item['id'] = item['id'].replace('-ceiling', '-vault-ceiling')
            item['min'][1] = round(floor + 6, 6)
            item['max'][1] = round(floor + 6.95, 6)
            item['vaultRise'] = .65
            item['vaultInset'] = .85
            item['roofThickness'] = .3
        elif '-view-' not in item['id'] and item['max'][1] > floor + 5:
            item['max'][1] = round(floor + 6.95, 6)
    if item['id'] in ['stair-east-shell', 'stair-west-shell']:
        item['min'][2] = round(landing_back[1] - .3, 6)
    if item['id'] == 'stair-back-shell':
        item['min'][2] = round(landing_back[1] - .3, 6)
        item['max'][2] = landing_back[1]
    if item['id'] == 'stair-top-ceiling':
        item['min'][2] = round(landing_back[1] - .3, 6)
    solids.append(item)
layout['solids'] = solids

for room in layout['rooms']:
    room['label'] = '壁画洞窟 ' + room['id'][-1].upper()
    room['clearHeight'] = 6
    room['roofRise'] = .65
    room['roofInset'] = .85
    room['max'][1] = round(room['floorY'] + 6.65, 6)
    room['presentation'] = 'cave-integrated blank mural; shallow faceted cave roof; no invented artwork'

route = []
def node(surface, x, y, z): route.append(dict(surfaceId=surface, position=[x, round(y, 6), round(z, 6)]))
node('ground', 12.85, levels[0], -23)
node('stair-entry', 14.65, levels[0], -23)
node('landing-0', 17.1, levels[0], -23)
def climb(first, lower, mid, upper, back, end_landing):
    node(f'flight-{first}', 17.1, lower, front)
    node(f'flight-{first}', 17.1, mid, back)
    node(f'landing-{first}', 17.1, mid, back - 1.2)
    node(f'landing-{first}', 20.3, mid, back - 1.2)
    node(f'flight-{first+1}', 20.3, mid, back)
    node(f'flight-{first+1}', 20.3, upper, front)
    node(f'landing-{end_landing}', 20.3, upper, -23)
def visit_hall(letter, y, return_to_stairs):
    node(f'hall-{letter}', 18.7, y, -18.8)
    node(f'hall-{letter}', 17, y, -15)
    node(f'hall-{letter}', 17, y, -12.8)
    node(f'view-link-{letter}', 14.4, y, -12.8)
    node(f'view-{letter}', 13.5, y, -12.2)
    node(f'view-{letter}', 11.2, y, -12.2)
    if return_to_stairs:
        node(f'view-{letter}', 13.5, y, -12.2)
        node(f'view-link-{letter}', 14.4, y, -12.8)
        node(f'hall-{letter}', 17, y, -12.8)
        node(f'hall-{letter}', 17, y, -15)
        node(f'hall-{letter}', 18.7, y, -18.8)
climb(1, *levels[:3], backs[0], 2)
visit_hall('a', levels[2], True)
node('landing-2', 17.1, levels[2], -23)
climb(3, *levels[2:], backs[1], 4)
visit_hall('b', levels[4], False)
layout['route'] = route
layout['stair'] = dict(width=2.8, flightRuns=runs, levels=levels, maxRiser=.17, clearHeight=2.92,
                       targetSlopeDegrees=35, flightsPerInterval=2,
                       shaftMin=[15.35, -.35, round(landing_back[1] - .35, 6)],
                       shaftMax=[22.05, 22.75, -21.45])
layout['notes'] = [
    'Approved v002: two flights and one switchback per gallery interval; continuous physical walking.',
    'Two six-metre minimum-height cave galleries; a shallow 0.65m faceted roof rises above that minimum.',
    'All new rails are absent. Circular-footprint walkable-surface support prevents edge falls.',
    'Original Buddha, tower facade, ground room, gallery levels and viewing openings are unchanged.',
]
# Geometry-derived camera data is rebuilt by the v002 Blender script.
layout['cameraSolids'] = copy.deepcopy(old['cameraSolids'])
OUT.write_text(json.dumps(layout, ensure_ascii=False, indent=2) + '\n')

def distance(points):
    return sum(math.hypot(b['position'][0] - a['position'][0], b['position'][2] - a['position'][2])
               for a, b in zip(points, points[1:]))
first_a = next(i for i, point in enumerate(route) if point['surfaceId'] == 'hall-a')
last_a = len(route) - 1 - next(i for i, point in enumerate(reversed(route)) if point['surfaceId'] == 'hall-a')
first_b = next(i for i, point in enumerate(route) if point['surfaceId'] == 'hall-b')
lengths = [distance(route[:first_a + 1]), distance(route[last_a:first_b + 1])]
summary = dict(version=layout['version'], runs=runs, flightBacks=backs, landingBacks=landing_back,
               levels=levels, surfaceCount=len(surfaces), solidCount=len(solids),
               routeLengths=lengths, nominalAssistSeconds=[round(length / 4.2, 3) for length in lengths])
(ROOT / 'work/world/mogao-upper-v002-layout-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
