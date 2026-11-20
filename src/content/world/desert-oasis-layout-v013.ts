import {groundRoadClearance} from './environment-ground-v001';
import {placeValleyPlantsAndStones} from './desert-oasis-valley-v013';

export type OasisTone = 'natural' | 'olive' | 'fresh' | 'dry' | 'gold' | 'bare';

export type OasisRouteArea = 'entrance' | 'lake' | 'cliff';

export interface OasisPlacement {
  readonly area: OasisRouteArea;
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly yaw: number;
  readonly tone: OasisTone;
  /** Distance in metres between the mesh base and the terrain above it. */
  readonly burial: number;
  /** Absolute mesh base when anchored to a built surface such as the courtyard paving. */
  readonly baseY?: number;
}

export type OasisPlacementRow = [
  id: string, x: number, z: number, height: number, yaw: number, tone?: OasisTone, burial?: number,
];
export type AddPlacement = (...row: OasisPlacementRow) => void;

// World units are metres. Local +z leaves the gate; local +x is left on exit.
function placeFirstGallery(add: AddPlacement) {
  const yaw = 24 * Math.PI / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const gravel = 'R05_碎石小群';
  const twigs = 'S04_枯黄灌木';
  const wall: AddPlacement = (id, x, z, height, angle, tone) => {
    const dx = x + 12;
    const dz = z - 2;
    add(id, 110 + cos * dx + sin * dz, 12 - sin * dx + cos * dz, height, angle + yaw, tone);
  };
  const place = (callback: AddPlacement, points: OasisPlacementRow[]) => {
    for (const point of points) callback(...point);
  };

  wall('大树4', 3.15, 2.4, 6.85, -.50);
  // Front wing at left in the entrance view. The highest dome is near the corner,
  // and the smaller crowns descend toward the end of the mural.
  place(wall, [
    ['shrub-1', -22.5, 3.29, .87, -.21], ['shrub-2', -23.50, 3.15, .92, .85, 'olive'],
    ['shrub-2', -21.45, 3.38, .66, -1.20], ['s04b', -23.73, 3.63, .60, .35],
    ['g02', -22.51, 3.82, .55, -.09], [twigs, -21.68, 3.98, .63, 1.08],
    ['shrub-1', -20.38, 3.58, .56, .35], ['g02', -19.78, 3.64, .42, 1.16],
    [gravel, -20.44, 4.07, .17, -.13], ['s04b', -19.03, 3.16, .49, -.88],
    [gravel, -18.49, 3.41, .13, .73],
    ['shrub-2', -16.92, 3.18, .55, 1.4], ['s04b', -16.52, 3.50, .44, -.39],
    ['g02', -17.38, 3.42, .45, .70],
  ]);
  // Clusters expand inward from the tree end of the other front wing.
  place(wall, [
    ['shrub-2', -7.84, 3.21, .61, 1.16], ['s04b', -7.54, 3.67, .40, -1.5],
    ['g02', -7.21, 3.53, .47, -.78], [gravel, -6.52, 3.69, .14, -.72],
    ['shrub-1', -5.16, 3.35, .75, -.12], ['shrub-2', -5.94, 3.03, .74, .37, 'olive'],
    [twigs, -5.13, 3.76, .58, -.76], ['s04b', -4.17, 3.47, .54, .42],
    ['g02', -4.55, 3.85, .45, -.4], [gravel, -4.04, 3.96, .16, -.72],
    ['shrub-1', -1.38, 3.34, .82, -.07], ['shrub-2', -.44, 3.14, .96, -.47, 'olive'],
    ['shrub-2', -2.36, 3.45, .66, .87], ['g02', -2.88, 3.69, .46, .21],
    [twigs, -.24, 3.92, .66, -.52], ['s04b', .41, 3.65, .59, .25],
    [gravel, .74, 4.12, .19, -.11], ['g02', 1.25, 3.79, .54, 1.62],
    ['shrub-1', 1.82, 3.16, .73, .37], ['shrub-2', 2.55, 3.19, .85, -.55],
    ['s04b', 3.04, 3.76, .52, .79], ['g02', 3.63, 3.15, .41, .37],
    [gravel, 3.86, 2.76, .14, 1.14],
  ]);
  // Wrap just this side wall. Ribbons are separate pockets with different depth.
  place(wall, [
    ['shrub-2', 1.47, .37, .86, -.42], ['s04b', 1.70, .95, .54, 1.18],
    ['shrub-1', 1.32, -1.36, .83, 1.50], ['shrub-2', 1.54, -1.95, .63, 2.55],
    ['g02', 1.93, -1.21, .55, -.86], [gravel, 2.12, -2.17, .17, .84],
    [twigs, 1.46, -2.91, .53, .26], ['s04b', 1.55, -3.45, .46, .78],
    ['shrub-2', 1.19, -5.62, .72, -.52], ['shrub-1', 1.31, -6.47, .58, 1.45],
    ['g02', 1.75, -6.10, .49, .17], ['s04b', 1.52, -7.25, .47, -1.05],
    [gravel, 1.69, -7.85, .14, -.61],
    ['shrub-2', 1.27, -11.80, .48, -1.42], ['s04b', 1.31, -12.45, .39, .45],
    [gravel, 1.52, -12.78, .12, 1.22],
  ]);

  // Inside the road bend. A shallow sheltered patch beside the first pavers.
  place(add, [
    ['shrub-1', 107.96, 17.49, .75, -.46], ['shrub-2', 108.43, 16.95, .86, .61, 'olive'],
    ['shrub-2', 107.04, 18.07, .60, 1.02], ['s04b', 107.81, 18.45, .51, -.43],
    ['g02', 107.34, 17.64, .49, -.20], [gravel, 106.85, 18.69, .16, -.36],
    ['g02', 109.35, 17.42, .43, .90],
  ]);
  // Lower shoulder, broadest drift nearest the player. The three lobes of the
  // grass bank turn obliquely across the sand with a gravel apron and an offset tail.
  place(add, [
    ['shrub-2', 111.15, 23.60, .75, -.55], ['shrub-1', 112.18, 23.95, .75, .07],
    ['s04b', 110.63, 22.89, .56, -.88], [twigs, 111.47, 23.06, .67, .16],
    ['g02', 112.59, 23.45, .54, .95], ['c04', 113.57, 24.45, .41, -.43],
    ['shrub-2', 114.40, 25.03, .58, 1.50], ['g02', 114.94, 25.30, .42, -.08],
    ['shrub-2', 118.15, 24.25, .92, .80, 'olive'], ['shrub-1', 118.53, 25.20, .82, 1.07],
    ['shrub-2', 119.69, 25.93, .79, -1.33], ['shrub-2', 117.47, 23.89, .62, -.28],
    [twigs, 119.21, 24.68, .75, .45], ['s04b', 118.69, 23.73, .64, -.85],
    ['g02', 117.44, 24.85, .62, .82], ['g02', 119.39, 26.67, .55, -1.16],
    [gravel, 119.54, 23.86, .17, -.14], ['s04b', 120.33, 26.59, .50, -.36],
    ['shrub-1', 121.25, 27.27, .59, .70], ['g02', 121.99, 27.78, .41, -.97],
    [gravel, 121.74, 26.62, .13, 1.13],
  ]);
  // Opposite shoulder is closer to the gate tree. The domes meet one another
  // below their middles while the dark branch ends show through their ochre edges.
  place(add, [
    ['shrub-2', 121.81, 14.95, .91, .30, 'olive'], ['shrub-1', 122.66, 14.91, .88, -.45],
    ['shrub-2', 123.61, 14.35, .70, -1.16], ['s04b', 121.42, 15.38, .56, .41],
    ['g02', 122.13, 15.47, .56, -.71], [twigs, 123.02, 15.44, .68, 1.23],
    ['g02', 123.88, 14.84, .47, .96], [gravel, 124.21, 15.14, .14, 1.27],
    ['shrub-1', 124.96, 13.79, .63, -.65], ['s04b', 125.86, 13.11, .47, .87],
    ['g02', 125.57, 13.98, .43, -1.39],
    ['shrub-2', 126.34, 10.74, .56, .20], ['s04b', 127.01, 10.05, .39, -.43],
  ]);
  // Upper sand lip: a wider and flatter flank, then only two small independent
  // pockets before the crest. The middle of the path and first lake sightline stay open.
  place(add, [
    ['shrub-1', 125.70, 25.45, .85, -.04], ['shrub-2', 126.68, 25.61, .87, -.67, 'olive'],
    ['shrub-2', 124.68, 25.58, .65, 1.45], ['s04b', 125.37, 24.93, .61, .71],
    [twigs, 126.25, 24.93, .70, -1.08], ['g02', 124.42, 25.97, .48, -.35],
    ['shrub-1', 127.94, 26.00, .62, .20], ['g02', 128.48, 26.20, .53, .07],
    [gravel, 127.81, 25.24, .16, -.36], ['s04b', 129.13, 26.14, .47, -.44],
    ['shrub-2', 131.62, 16.06, .75, .62], ['shrub-1', 132.47, 16.02, .65, -.27],
    ['g02', 132.10, 16.65, .52, -1.28], ['s04b', 133.36, 15.92, .48, .36],
    ['shrub-1', 138.87, 29.20, .54, 1.25], ['shrub-2', 139.39, 29.72, .46, -.62],
    ['s04b', 140.23, 29.80, .37, .41], ['shrub-2', 149.93, 27.37, .47, .83],
    ['s04b', 150.66, 27.77, .37, 1.51], ['s04b', 164.73, 11.47, .38, -.64],
    ['shrub-1', 178.96, 20.22, .40, .23],
  ]);
}

// Shoreline studs sampled in world metres from the approved four Bézier spans.
// Each interval advances four points in the original 160-point shoreline.
const shore = [
  [185.5, -100.1], [194.4, -102.4], [203.4, -104.0], [212.4, -104.9], [221.2, -105.0],
  [229.7, -104.4], [237.7, -102.8], [245.2, -100.4], [251.9, -97.0], [257.8, -92.6],
  [262.7, -87.2], [266.8, -81.1], [269.9, -74.2], [272.0, -66.7], [273.1, -58.7],
  [273.3, -50.4], [272.6, -41.9], [271.0, -33.3], [268.7, -24.9], [265.7, -16.7],
  [262.0, -9.0], [260.7, -16.0], [259.2, -22.8], [257.5, -29.3], [255.5, -35.5],
  [253.4, -41.4], [251.0, -47.1], [248.3, -52.5], [245.3, -57.6], [242.1, -62.4],
  [238.5, -66.9], [234.7, -71.2], [230.5, -75.3], [226.0, -79.1], [221.1, -82.6],
  [216.0, -86.0], [210.5, -89.2], [204.7, -92.1], [198.7, -95.0], [192.3, -97.6],
  [185.5, -100.1]
];

function bank(station: number, setback: number): [number, number] {
  const i = Math.min(39, Math.floor(station/4));
  const t = station/4-i, a = shore[i], b = shore[i+1];
  const dx = b[0]-a[0], dz = b[1]-a[1], length = Math.hypot(dx,dz);
  return [a[0]+t*dx+setback*dz/length, a[1]+t*dz-setback*dx/length];
}

function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Station 0 and 80 are the two tips, 0–80 follows the convex dune-facing shore.
// The paired trees share a pocket; the other two are separated by open lengths of sand.
const outerTrees = new Map<number,string>([[12.7,'大树10'],[14.4,'大树3'],[33,'大树3'],[69.7,'大树8']]);

function placeOuterGrass(add: AddPlacement) {
  // Each tuft uses the existing low grass mesh. Spacing along the shore and
  // distance from the water both vary, including two small pockets near trees.
  const pockets = [
    [4.4,1.8,2,.62], [13.3,7.7,7,1.05], [22.8,2.5,1,.63],
    [34.1,6.9,4,.96], [58.4,1.5,3,.70], [69.1,7.2,5,.90], [76.5,2.6,1,.64],
  ] as const;
  const offsets = [[0,0],[.54,.57],[-.31,.98],[.23,-.84],[-.72,.36],[.92,.07],[-.12,-1.41]] as const;
  const turn=seededRandom(0x528126);
  for (const [station,setback,count,scale] of pockets) {
    const handed=turn()<.5 ? -1 : 1;
    for (const [ds,dd] of offsets.slice(0,count)) {
      const [x,z]=bank(station+ds*scale*handed,setback+dd*scale);
      add('g02',x,z,(.40+turn()*.24)*scale,turn()*Math.PI*2,turn()<.55?'olive':'natural');
    }
  }
}

function placeOasis(add: AddPlacement) {
  const next = seededRandom(0x49b744);
  const between = (a: number, b: number) => a+(b-a)*next();
  function place(id: string, station: number, setback: number, height: number, tint: OasisTone) {
    // Consume the original orientation even for retired outer clumps: the
    // same authored seed also controls every inner-shore reed and valley patch.
    const yaw=between(-Math.PI,Math.PI);
    if (station<80 && outerTrees.get(station)!==id) return;
    let [x,z] = bank(station,setback);
    // Keep the foliage outside the pavilion's tight rear corner.
    if(station>123 && station<144 && setback>2) {
      const yaw=28*Math.PI/180, c=Math.cos(yaw), s=Math.sin(yaw);
      const localX=46+c*(x-210)-s*(z+43);
      const localZ=-9+s*(x-210)+c*(z+43);
      const clearance=Math.hypot(Math.max(23.75-localX,localX-70.25,0),
                                 Math.max(-33.325-localZ,localZ-3.25,0));
      if(clearance<1.6) [x,z]=bank(station,Math.max(.6,setback-(1.8-clearance)*1.5));
    }
    add(id,x,z,height,yaw,tint);
  }

  // On the concave shore five staggered levels step out of the shallows.
  // Keep the original station sequence so the seed reproduces that bank exactly.
  // W01's upright catkins rise between the broader, curving w01b leaves.
  const beds = [[.9,31.0],[31.8,61.6],[62.75,78.5],[81.6,112.6],[113.6,151.4],[152,158.9]];
  for(const [start,end] of beds) {
    for(let rank=0;rank<5;rank++) {
      for(let t=start+between(.05,.24);t<end-.07;t+=between(.39,.61)) {
        const undulation=.5+.5*Math.sin(t*.44+rank*.55);
        const distance=[-.32,.55,1.67,3.05,4.65][rank]
          +between(-.24,.29)+undulation*rank*.15;
        const verge= Math.min(1,(t-start+.45)/2.5,(end-t+.45)/2.5);
        const height=(1.68+.37*rank+undulation*.68)*between(.82,1.15)*(.77+.23*verge);
        const seedHead = (rank===0 || rank===3) && next()<.26;
        place(seedHead?'W01_水边芦苇':'w01b',t,distance,height*(seedHead?1.12:1),'fresh');
        if(rank===1 || rank===3) {
          // A broad, lower blade mass reads as green even at the distant bank.
          place('g02',t+between(-.16,.16),distance+between(-.28,.35),
            between(.84,1.40)*(rank===3?1.2:1),'fresh');
        }
      }
    }
    // Shrub crowns stitch the top of the reed belt into irregular shrub islands.
    for(let t=start+.28;t<end-.3;t+=between(.58,1.08)) {
      place(next()<.56?'shrub-1':'shrub-2',t,between(4.4,6.7),
        between(1.03,1.85),next()<.79?'fresh':'olive');
    }
  }

  // Crown groups run along, and behind, the far arc. At outer station 62
  // the player stands on the east bank and looks between two groves.
  const groves = [
    [4, 29, 7.4, 6.2], [32, 55.2, 6.3, 8.4], [68.8, 76.2, 5.4, 6.4],
    [83.8, 97.3, 5.6, 7.8], [139.1, 153.3, 6.0, 6.4],
  ];
  for (const [first,last,offset,meanHeight] of groves) {
    let i=0;
    for (let t=first;t<=last;t+=between(2.0,2.60),i++) {
      const id=i%6===2?'大树3':'大树11';
      place(id,t,offset+between(-1.0,1.10),meanHeight*between(.89,1.19),'fresh');
    }
  }
  // A looser second rank makes an olive margin against the open golden dunes.
  // Wide crowns stay on the back shore, away from the pavilion roofline.
  for(const [t,s,h,id] of [
    [9, 11.3, 7.6, '大树10'], [14.4, 12.6, 5.9, '大树3'], [21.8, 11.5, 8.5, '大树3'],
    [33, 13.6, 7.9, '大树3'], [39.7, 12.1, 9.0, '大树10'], [44.3, 12.5, 7.8, '大树11'],
    [50.2, 11.3, 8.3, '大树3'], [72, 10.0, 7.3, '大树10'],
    [88, 10.2, 5.9, '大树3'], [141.5, 10.1, 7.0, '大树3'], [149.8, 10.4, 6.1, '大树10'],
  ] as const) place(id,t,s,h,'olive');

  // Broad, overlapping heads mass up the skyline behind the avenue.
  for (const [t,offset,h,id] of [
    [6, 9.5, 7.4, '大树8'], [12.7, 9.4, 8.4, '大树10'], [18, 10.2, 8.8, '大树8'],
    [24.6, 10.6, 8.2, '大树10'], [28.3, 12.8, 7.4, '大树8'],
    [35.9, 8.8, 8.7, '大树10'], [42.0, 11, 9.6, '大树8'], [47.6, 9.0, 8.8, '大树10'],
    [53.3, 11.1, 7.9, '大树8'], [69.7, 10.5, 7.5, '大树8'], [75.4, 10.4, 7.0, '大树10'],
    [87, 7.6, 6.5, '大树8'], [93.4, 8.8, 6.2, '大树10'],
    [145.2, 9.8, 7.3, '大树10'], [152.9, 9.6, 6.0, '大树8'],
  ] as const) place(id,t,offset,h,'fresh');

  // Distinct green shrub pockets between the tree trunks. The open inner
  // shore opposite the pavilion carries only reeds and ankle-high plants.
  for(const [first,last,offset] of groves) {
    for(let t=first+.5;t<last-.4;t+=between(2.0,3.2)) {
      place('shrub-2',t,offset+between(.9,2.3),between(1.2,2.0),'olive');
      place('shrub-1',t+between(.35,.85),offset+between(1.8,3),between(.65,1.15),'olive');
    }
  }

  placeOuterGrass(add);

  // The valley floor links the lake to the pavilion gate and the descent.
  // Each group has a woody core and a loose, grassier toe towards the road.
  const transitionTrees: OasisPlacementRow[] = [
    ['t01', 174.2, 5.2, 3.8, .52, 'dry'],
    ['t02', 180.8, 3.8, 4.7, -.72, 'olive'],
    ['大树3', 185.5, 0.1, 5.8, .15, 'olive'],
    ['t01', 183.6, -2.0, 3.9, 1.34, 'olive'],
    ['大树11', 191.6, -9.2, 6.0, -.55, 'olive'],
    ['大树3', 193.9, -12.6, 5.4, .22, 'fresh'],
    ['大树11', 196.6, -14.0, 6.3, 1.68, 'fresh'],
    ['t02', 204.8, -16, 4.0, .95, 'olive'],
    ['大树11', 214.7, 3.3, 4.6, .67, 'olive'],
    ['t01', 217.6, 2.4, 3.4, -1.2, 'olive'],
    ['大树11', 231.2, -31.9, 6.9, .51, 'fresh'],
    ['大树3', 234.6, -30.5, 5.4, -.88, 'fresh'],
    ['大树11', 237.5, -33.6, 6.5, .17, 'fresh'],
    ['t02', 241.5, -35.8, 4.5, 1.19, 'fresh'],
  ];
  for(const args of transitionTrees) add(...args);
  const islands: [number, number, number, number, number, number, number, OasisTone][] = [
    // x,z, radius along the drift/across it, yaw, count, plant height scale, foliage
    [170.6, 7.5, 3.9, 1.2, -.23, 8, .50, 'dry'],
    [175.4, 5.5, 3.6, 1.0, -.53, 10, .65, 'olive'],
    [181.4, 2.9, 4.7, 1.65, -.46, 18, .74, 'olive'],
    [185.3, -1.1, 3.65, 1.8, -.67, 14, .80, 'olive'],
    [189.4, 16.7, 3.0, 1.4, -.12, 10, .61, 'dry'],
    [194.2, 12.7, 2.8, 1.1, -.46, 9, .57, 'olive'],
    [190.7, -7.8, 3.35, 1.3, -.57, 13, .88, 'olive'],
    [194.6, -12.8, 4.9, 2.5, -.72, 28, .94, 'olive'],
    [199.6, -17.5, 3.6, 1.5, -.33, 14, .98, 'fresh'],
    [204.3, -16.3, 2.45, 1.5, -.81, 14, .82, 'olive'],
    [206.0, -22.5, 1.45, .77, -.50, 7, .66, 'olive'],
    [214.6, 3.5, 3.0, 1.4, .11, 14, .80, 'olive'],
    [215.5, -1.1, 2.2, .87, -.35, 8, .65, 'olive'],
    [228.0, -30.4, 3.2, 1.5, -.63, 14, .78, 'fresh'],
    [233.4, -31.5, 4.0, 2.1, -.31, 24, 1.05, 'fresh'],
    [239.3, -33.7, 4.6, 2.0, -.51, 20, 1.07, 'fresh'],
    [243.6, -39.4, 3.1, 1.7, -1.09, 16, 1.10, 'fresh'],
    [244.7, -45.2, 2.4, 1.2, -.7, 10, .78, 'fresh'],
  ];
  // At the pavilion the planted apron broadens into the reeds, with a few
  // larger crowns behind the grasses and slivers of sand left between groups.
  for (const [id, x, z, height, yaw, tone] of [
    ['大树8', 239.1, -32.6, 6.65, -.50, 'fresh'],
    ['大树10', 232.0, -34.5, 5.75, .64, 'fresh'],
    ['大树10', 193.0, -13.9, 5.7, 1.26, 'olive'],
  ] as const) add(id, x, z, height, yaw, tone);
  islands.push([242.7,-35,4.1,2.0,-.78,30,1.28,'fresh'],
    [243.4, -41.5, 3.8, 1.85, -1.08, 26, 1.22, 'fresh'],
    [240.1, -36.7, 2.9, 1.45, -.77, 22, 1.11, 'fresh'],
    [246.2, -28.7, 5.3, 2.3, -.57, 32, 1.22, 'fresh'],
    [251.2, -27.4, 4.25, 1.4, -.70, 19, 1.14, 'fresh'],
    [249.2, -32.3, 4.0, 1.6, -.55, 24, 1.24, 'fresh'],
    [233.4, -26.9, 3.18, 1.4, -.51, 22, .99, 'olive']);
  for (const [x,z,along,across,angle,n,size,tint] of islands) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i=0;i<n;i++) {
      // An angular sequence spreads neighbouring clumps while leaving scalloped edges.
      const phi = i*2.39996+between(-.32,.32);
      const r = Math.sqrt((i+.4)/n)*between(.83,1.18);
      const u = along*r*Math.cos(phi), v = across*r*Math.sin(phi);
      const grass = next() < .22+.53*r;
      const id = grass?'g02':(next()<.56?'shrub-1':'shrub-2');
      const height = (grass?between(.29,.63):between(.59,1.23))*(1.17-.35*r)*size;
      add(id,x+u*c-v*s,z+u*s+v*c,height,between(-3,3),tint);
    }
  }
}

function placeCliff(add: AddPlacement) {
  // Sampled road centre in the current world. Positive offsets are on the
  // traveler's right when heading towards the cliff.
  const road = [
    [216.6, -19.1], [219.7, -13.3], [226.4, -3.2], [234.4, 7.4], [241.9, 14.0],
    [251.6, 19.0], [262.2, 23.1], [271.1, 26.4], [281.5, 29.8], [292.5, 33.2],
    [300.5, 37.0], [310.0, 45.1], [316, 51.5], [319.4, 60.9],
  ];
  const at = (station: number, offset: number, id: string, height: number, yaw: number, tone?: OasisTone) => {
    const index = Math.floor(station);
    const fraction = station - index;
    const a = road[index], b = road[index + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    add(id, a[0] + dx * fraction - offset * dz / length, a[1] + dz * fraction + offset * dx / length, height, yaw, tone);
  };
  // Stagger the trunks rather than making an avenue. Golden leaves and the
  // exposed branches belong to the same curved poplar meshes as the oasis.
  for(const args of [
    [.7, -8, '大树3', 6.5, .4], [1.35, 7.8, '大树11', 7.2, 2.1],
    [1.65, -8.5, 't03', 5.9, -.8], [2.1, -12, '大树3', 5.8, 1.3],
    [2.25, 7.4, 't02', 5.6, 1.2], [2.85, -7.6, '大树6', 6.8, -1.65],
    [3.25, 7.3, 't03', 6.2, 1.7, 'gold'], [3.55, -11.8, 't02', 5.1, .8],
    [4.05, -6.6, 't02', 6.3, -1.3, 'gold'], [4.72, 7.2, '大树6', 7.1, .35],
    [5.06, -12.4, 't03', 5.7, -2.5, 'gold'], [5.44, -6.5, 't02', 6.9, .1, 'bare'],
    [5.85, 13.4, 't02', 4.4, 2.3], [6.33, 7.0, 't03', 5.8, 2.25, 'gold'],
    [6.95, -8.2, 't02', 6.15, .9, 'bare'], [7.42, 8.4, 't02', 5.6, 1.95, 'bare'],
    [8.45, -11.9, 't03', 4.85, -2.4, 'gold'], [9.45, 13.9, 't02', 4.4, 2.1, 'bare']
  ] satisfies [number, number, string, number, number, OasisTone?][]) {
    const [station, offset, id, height, yaw, tone] = args;
    at(station, offset, id, height, yaw, tone);
  }
  const rand = seededRandom(1876);
  // Damp, sheltered patches give way to small windblown tufts, then slabs of sandstone.
  const stoneModels = ['r02', 'r04', 'c02', 'R05_碎石小群'];
  for (let station = .75; station < 12.6; station += .25 + rand() * .23) {
    const side = rand() < .52 ? -1 : 1;
    const offset = side * (3.1 + rand() * 5);
    const fade = Math.min(station / 10, 1);
    if (station < 6.5 || rand() > .65) {
      const plant = station < 3 ? 'shrub-2' : (rand() < .5 ? 's04b' : 'shrub-1');
      at(station, offset, plant, (.57 + rand() * .3) * (1.14 - .57 * fade), rand() * 6);
      if (station < 5) at(station + .08, offset + side * 1.25, 'g02', .42 + rand() * .2, rand() * 6);
    }
    if (station > 2.1) {
      const count = station > 7 ? 3 : 1;
      for (let k = 0; k < count; k++) {
        const id = stoneModels[Math.floor(rand() * stoneModels.length)];
        const setback = offset + side * (1 + rand() * 3.1);
        const height = (id === 'R05_碎石小群' ? .19 : .32 + rand() * .48) * (1 + .27 * fade);
        at(station + .1 * k, setback, id, height, rand() * 6);
      }
    }
  }
  const ledges = [[7.5, -13, 1.45], [9.9, 9.6, 1.85], [10.8, -14, 1.15], [11.5, -10.2, 1.50], [12.25, 13.3, 1.45]];
  for (const [station, offset, height] of ledges) at(station, offset, 'r02', height, rand() * 3);
}

// Coordinates identify specific existing instances after the valley's x/z shifts.
// Metres; columns are prototype, world X/Z, original height and reviewed height.
const reviewedTreeHeights: [string, number, number, number, number][] = [
  ['大树3', 184.425114, -0.082490, 5.80, 7.10],
  ['t03', 188.000000, -7.000000, 4.90, 6.65],
  ['大树3', 190.558196, -15.147969, 5.40, 9.25],
  ['大树11', 195.309172, -14.407820, 6.30, 8.25],
  ['大树11', 231.200000, -31.900000, 6.90, 10.35],
  ['大树8', 239.100000, -32.600000, 6.65, 9.55],
  ['大树3', 254.584722, -21.929396, 8.767257, 12.20],
  ['大树11', 256.164162, -14.795559, 8.656755, 10.65],
];

function adjustTreeHeight(id: string, x: number, z: number, h: number) {
  if (h < 4.9 || h > 8.8) return h;
  const match = reviewedTreeHeights.find(row => row[0] === id &&
    Math.abs(row[1] - x) < .001 && Math.abs(row[2] - z) < .001 &&
    Math.abs(row[3] - h) < .001);
  return match ? match[4] : h;
}

function buildOasisLayout(): OasisPlacement[] {
  const placements: OasisPlacement[] = [];
  let area: OasisRouteArea = 'entrance';
  const add: AddPlacement = (id, x, z, requestedHeight, yaw, tone = 'natural', burial) => {
    const height = adjustTreeHeight(id, x, z, requestedHeight);
    const placement = {area, id, x, z, height, yaw, tone, burial: burial ?? Math.min(.08, height * .06)};
    placements.push(id === '大树9' ? {...placement, baseY: 2.535} : placement);
  };
  // Translate the originally authored shrub patches to their approved game models.
  const plant: AddPlacement = (id, x, z, height, yaw, tone = 'natural') => {
    const variation = Math.abs(Math.sin(x * 10.72 + z * 51.39) * 13941.17) % 1;
    if (id === '大树6' && Math.hypot(x - 245.585, z - 24) < .2) {
      id = 'T03_展冠胡杨树';
      height = 12.6;
    }
    if (id === 'shrub-1') {
      if (x < 168 || z > 20) {
        if (variation < .35) id = 'c03b';
        else if (variation < .61) id = 'C04B_卧枝灌木与散石';
        else if (variation < .82) id = 's04b';
        else id = 'g02';
        height *= id === 'g02' ? .82 : .91;
      } else if (z < -26) {
        id = variation < .48 ? 'w01b' : variation < .82 ? 'g02' : 'S02_红柳灌木';
        height *= id === 'g02' ? .75 : 1.18;
      } else {
        id = variation < .43 ? 'c03b' : variation < .72 ? 'g02' : 'S02_红柳灌木';
        height *= .88;
      }
    }
    // Widen the dry-side tree groups to leave the view toward the gate open.
    if (x >= 174 && x < 206 && z >= -19 && z <= 6 && ['大树3', '大树11', 't01', 't02'].includes(id)) {
      x -= .9 + variation * 4.6;
      z -= variation * 4.8;
    }
    add(id, x, z, height, yaw, tone);
  };
  placeFirstGallery(plant);
  area = 'lake';
  placeOasis(plant);
  area = 'cliff';
  placeCliff(plant);
  area = 'lake';
  // Small islands in the bare side of the valley. Their footprint narrows outward.
  const patches=[
    [183, 6, .75, 7], [186, 4, .83, 6], [190, 4, .95, 9], [193, .5, .83, 8], [196, 0, .82, 6],
    [186, -8, .92, 13], [181, -9, .72, 9], [182, -17, .7, 6], [177, -18, .54, 5],
    [181, -27, .52, 3], [175, -29, .46, 2], [166, -29, .34, 1],
    [197, 18, .7, 8], [202, 19.6, .52, 4], [208, 23, .39, 2]
  ];
  const patchModels = ['g02', 'c03b', 's04b', 'g02', 'S02_红柳灌木'];
  for (const [x, z, height, count] of patches) {
    for (let i = 0; i < count; i++) {
      const yaw = i * 2.40 + .5 * x;
      const distance = Math.sqrt(i) * .77;
      const plantX = x + Math.cos(yaw) * distance * 1.45, plantZ = z + Math.sin(yaw) * distance;
      if (groundRoadClearance(plantX, plantZ) >= 1.2) {
        add(patchModels[i % 5], plantX, plantZ, height * (.54 + .11 * ((i + 2) % 5)), yaw, 'olive');
      }
    }
  }
  const valleyTrees = [
    [188, -7, 4.9, 't03', .7], [182, -15, 4.4, 't01', -.9], [176, -23, 3.6, 't02', 1.2],
    [169, -35, 2.5, 't01', .2], [197, 17.5, 3.6, 't01', -.5],
  ] as const;
  for (const [x, z, height, id, yaw] of valleyTrees) add(id, x, z, height, yaw, 'olive');
  area = 'cliff';
  // Near the tower steps and farther back at the foot of the rock pillars.
  for(const [x,z,h,id,a,tone] of [
    [304.5, 59.2, 6.4, 't03', -.5, 'gold'], [300.9, 63.1, 5.25, 't02', 1.5, 'bare'],
    [308.0, 65.1, 4.0, 't02', -.8, 'gold'], [327.3, 50.8, 6.0, 't03', 1.4, 'gold'],
    [329.3, 57.4, 5.4, 't02', -.3, 'bare'], [334.3, 54.1, 4.1, 't02', 2.1, 'gold'],
    [349.3, 38.8, 6.3, 't03', 1.2, 'gold'], [354.2, 42.1, 5.5, 't02', -1.8, 'bare'],
    [356.8, 36.4, 4.6, 't02', .4, 'gold'], [365, 47.1, 5.8, 't02', -.4, 'bare'],
    [376.5, 44.2, 5.5, 't03', 2.2, 'gold'], [383, 52.0, 4.8, 't02', -.8, 'bare'],
    [446, 62, 6.9, 't03', 1.3, 'gold'], [452, 65, 6.1, 't02', .5, 'bare'],
    [458, 74, 6.5, 't03', 2.0, 'gold'], [439, 71, 5.4, 't02', 1.7, 'bare']
  ] as const) add(id,x,z,h,a,tone);

  // Marching toward the tower, this is the poplar beside its staircase.
  add('T02_弯曲胡杨树', 313.07863, 72.74696, 25, 1.65);
  area = 'lake';
  placeValleyPlantsAndStones(add);
  // Courtyard coordinates (30.8,-6.8) on the left when facing in from the gate.
  // Centre offset accounts for the trunk and asymmetry of the original crown.
  const heightFromPavingToRidge = 17.7916525267;
  add('大树9', 198.2576402, -33.9241937, heightFromPavingToRidge * 1.5, 2.49582083);
  return placements;
}

/** The complete accepted landscape. View distance and draw budgets are applied by the renderer. */
export const DESERT_OASIS_PLACEMENTS: readonly OasisPlacement[] = buildOasisLayout();
