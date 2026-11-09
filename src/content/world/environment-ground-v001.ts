import {fromTerrainPoint, lakeSignedDistance, LAKE_BOUNDS, relocateOasisPoint, TERRAIN_ROUTES, terrainHeight} from './terrain-layout-v001';

/** Appearance only. No function here changes a height, route or collider. */
export const ENVIRONMENT_GROUND_BOUNDS = {minX: -160, maxX: 720, minZ: -300, maxZ: 450} as const;
export const ENVIRONMENT_GROUND_CONTROL_SIZE = 512;
export interface GroundRegion {gravel: number; gobi: number}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {const t = clamp((v-a)/(b-a)); return t*t*(3-2*t);};
function hash(x: number, y: number, seed: number) {const v = Math.sin(x*127.1+y*311.7+seed*19.19)*43758.5453123; return v-Math.floor(v);}
export function groundNoise(x: number, y: number, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), sx = smooth(0, 1, x-ix), sy = smooth(0, 1, y-iy);
  return (hash(ix,iy,seed)*(1-sx)+hash(ix+1,iy,seed)*sx)*(1-sy)
    +(hash(ix,iy+1,seed)*(1-sx)+hash(ix+1,iy+1,seed)*sx)*sy;
}
function fbm(x: number, y: number, seed: number) {
  return .62*groundNoise(x,y,seed)+.26*groundNoise(x*2.07+11,y*2.07-7,seed+3)+.12*groundNoise(x*4.31-8,y*4.31+17,seed+7);
}

// Exact route segments in nearby bins, rather than a full route scan for every
// control-map texel. Only clearances <= 24m are used by the material layout.
interface RoadSegment {ax:number;az:number;dx:number;dz:number;length2:number;halfWidth:number}
const roadBins = new Map<string, RoadSegment[]>();
for (const route of TERRAIN_ROUTES) for (let i=1;i<route.points.length;i++) {
  const a=route.points[i-1], b=route.points[i], dx=b.x-a.x, dz=b.z-a.z;
  const segment={ax:a.x,az:a.z,dx,dz,length2:dx*dx+dz*dz,halfWidth:route.width/2};
  if (segment.length2 === 0) continue;
  const padding=24+segment.halfWidth;
  for(let bx=Math.floor((Math.min(a.x,b.x)-padding)/32);bx<=Math.floor((Math.max(a.x,b.x)+padding)/32);bx++)
    for(let bz=Math.floor((Math.min(a.z,b.z)-padding)/32);bz<=Math.floor((Math.max(a.z,b.z)+padding)/32);bz++) {
      const key=`${bx},${bz}`, bin=roadBins.get(key)??[];bin.push(segment);roadBins.set(key,bin);
    }
}
export function groundRoadClearance(x:number,z:number) {
  let result=Infinity;
  for(const s of roadBins.get(`${Math.floor(x/32)},${Math.floor(z/32)}`)??[]) {
    const t=clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.length2);
    result=Math.min(result,Math.hypot(x-s.ax-s.dx*t,z-s.az-s.dz*t)-s.halfWidth);
  }
  return result;
}
function rectangleClearance(x:number,z:number,region:'courtyard'|'music'|'cliff',box:readonly number[]) {
  const p=fromTerrainPoint(region,{x,z});
  return Math.hypot(Math.max(box[0]-p.x,p.x-box[1],0),Math.max(box[2]-p.z,p.z-box[3],0));
}

const oasisDeposits = relocateOasisPoint({x:215,z:28});
/** Quiet left dunes; restrained valley/road deposits; hardpan east/south of cliff. */
export function sampleGroundRegion(x:number,z:number):GroundRegion {
  const b=ENVIRONMENT_GROUND_BOUNDS;
  const boundary=smooth(b.minX,b.minX+35,x)*(1-smooth(b.maxX-60,b.maxX,x))
    *smooth(b.minZ,b.minZ+45,z)*(1-smooth(b.maxZ-65,b.maxZ,z));
  if(boundary===0||x<135)return {gravel:0,gobi:0};
  const warp=(groundNoise(x/53,z/47,101)-.5)*46;
  const gobi=smooth(265,345,x+warp)*smooth(-75,60,z+warp*.6)
    *(1-smooth(510,650,x))*(1-smooth(290,410,z))*.94;
  const road=groundRoadClearance(x,z);
  const roadBand=(1-smooth(8,23,road))*smooth(.6,3.5,road)*.28;
  const valley=Math.exp(-(((x-oasisDeposits.x)/104)**2+((z-oasisDeposits.z)/104)**2));
  const lowGround=valley>.015?1-smooth(7,22,terrainHeight(x,z)):0;
  let gravel=(valley*lowGround*.52+roadBand)*smooth(140,173,x)*(1-gobi*.75);
  let allowed=smooth(.35,2.8,road);
  if(x>LAKE_BOUNDS.minX-7&&x<LAKE_BOUNDS.maxX+7&&z>LAKE_BOUNDS.minZ-7&&z<LAKE_BOUNDS.maxZ+7)allowed*=smooth(1.5,6,lakeSignedDistance(x,z));
  if(x<155)allowed*=smooth(.5,3,rectangleClearance(x,z,'courtyard',[-24.8,.8,-27,3]));
  allowed*=smooth(.5,3,rectangleClearance(x,z,'music',[23.4,70.6,-29.4,3.5]));
  if(x>285&&x<390&&z>20&&z<150)allowed*=smooth(.5,3,rectangleClearance(x,z,'cliff',[105,139,-108,-38.7]));
  gravel=clamp(gravel)*allowed*boundary;
  const rock=clamp(gobi)*allowed*boundary, total=Math.max(1,gravel+rock);
  return {gravel:gravel/total,gobi:rock/total};
}

/** Approved v002 domain-warped field, evaluated in world metres only once. */
export function sampleGroundControls(x:number,z:number):readonly [number,number,number,number] {
  const weights=sampleGroundRegion(x,z);
  if(weights.gravel+weights.gobi===0)return [0,0,0,0];
  const y=-z;
  const qx=x+13*(fbm(x/24,y/27,2)-.5)+3*(fbm(x/7,y/13,29)-.5);
  const qy=y+15*(fbm(x/29+4,y/23,7)-.5)+4*(fbm(x/9,y/8,31)-.5);
  const low=fbm(qx/17+1.9,qy/20-.8,51), mid=fbm(qx/5.2-3,qy/9.1+2,67);
  const active=smooth(.40,.63,low), deposit=Math.exp(-(((mid-.49)/.051)**4));
  const grit=active*(.08+.80*deposit)+.05*smooth(.59,.73,mid)*active;
  const sandHard=smooth(.49,.72,low)*(.22+.34*smooth(.34,.66,mid));
  const gl=fbm(qx/20-.7,qy/15+.5,83), gm=fbm(qx/3.7+7,qy/5.3-1,89);
  const gobi=smooth(.29,.65,gl)*(.54+.43*smooth(.30,.69,gm));
  const rockHard=smooth(.30,.67,gl)*(.35+.65*smooth(.30,.68,gm));
  return [clamp(grit)*weights.gravel,clamp(gobi)*weights.gobi,sandHard*weights.gravel,rockHard*weights.gobi];
}
