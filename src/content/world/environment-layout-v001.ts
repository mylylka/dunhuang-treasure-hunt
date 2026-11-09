import {TERRAIN_BOUNDS, terrainHeight} from './terrain-layout-v001';

/** World metres, Three.js X/Z ground and Y up. The accepted playable map is immutable. */
export const ENVIRONMENT_VERSION = 'environment-world/v001';
export const ENVIRONMENT_GROUND_OFFSET = -.025;
export const ENVIRONMENT_CAMERA_BUFFER = 15;
const clamp = (x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth = (a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function environmentOutsideDistance(x:number,z:number) {
  const b=TERRAIN_BOUNDS;
  return Math.hypot(Math.max(b.minX-x,x-b.maxX,0),Math.max(b.minZ-z,z-b.maxZ,0));
}
export function environmentCaravanCrest(x:number) {return 237+2.2*Math.sin((x-205)*.032);}

/** Analytic vertex height. No added height anywhere inside TERRAIN_BOUNDS. */
export function environmentVisualHeight(x:number,z:number):number {
  const outside=environmentOutsideDistance(x,z);
  const acceptedBase=terrainHeight(x,z);
  if(outside===0)return acceptedBase;
  // The gameplay x-profile contains a narrow discovery ridge. Do not extrude
  // that cross-section through every distant dune: it ends in a broad basin.
  // Retain the already checked local caravan ridge, a bounded geographic patch.
  const caravanBase=(1-smooth(40,75,Math.abs(x-205)))*(1-smooth(20,55,Math.abs(z-237)));
  const broadBase=7+2*Math.sin(x*.003+z*.002)+1.5*Math.cos(z*.003-x*.001);
  const baseBlend=smooth(0,115,outside)*(1-caravanBase);
  const base=acceptedBase+(broadBase-acceptedBase)*baseBlend;
  const undulation=Math.sin(x*.012+.7)*32+Math.sin(z*.009-x*.004)*24;
  let distant=0;
  for(const [center,width,height,phase] of [[190,110,52,0],[390,160,78,1.7],[650,220,105,3.2]]) {
    const stagger=(Math.sin(x*.006+z*.004+phase*1.7)*42+Math.sin(x*.003-z*.005+phase*2.1)*24)
      *smooth(80,200,outside);
    const band=(outside-center-undulation*Math.sin(phase+x*.003)-stagger)/width;
    const crest=.76+.15*Math.sin(x*.014+z*.004+phase)+.09*Math.sin(z*.011-x*.005+phase);
    distant=Math.max(distant,height*crest*Math.exp(-band*band));
  }
  // A broad low basin behind the caravan leaves its real-sized silhouette against sky.
  // This is world geography, independent of the render camera.
  const basinDepth=Math.max(0,z-237);
  const skyBasin=smooth(255,310,z)*smooth(-30+basinDepth*.10,90+basinDepth*.10,x)
    *(1-smooth(375+basinDepth*.40,470+basinDepth*.40,x));
  distant*=1-.97*skyBasin;
  const northCrest=-190-16*Math.sin(x*.014);
  const north=32*Math.exp(-(((z-northCrest)/65)**2))*Math.exp(-(((x-95)/240)**2));
  const west=26*Math.exp(-(((x+135+12*Math.sin(z*.01))/70)**2))*Math.exp(-(((z-10)/260)**2));
  const southCrest=environmentCaravanCrest(x);
  const southDelta=z-southCrest;
  const south=33*Math.exp(-(Math.abs(southDelta/(southDelta<0?53:42))**1.7))*Math.exp(-(((x-205)/145)**4));
  const apron=Math.max(distant,north,west,south);
  return base+apron*smooth(0,42,outside);
}

/** Same near-field 2m vertex coordinates as the accepted terrain; add fine rows for the ridge. */
export function environmentSampleAxes():{xs:number[];zs:number[]} {
  function axis(min:number,max:number) {
    const count=Math.ceil((max-min)/2);
    const values=Array.from({length:count+1},(_,i)=>min+(max-min)*i/count);
    for(let distance=4;distance<=1400;) {
      values.push(min-distance,max+distance);
      distance+=distance<100?4:distance<320?12:24;
    }
    return values.sort((a,b)=>a-b);
  }
  return {xs:axis(TERRAIN_BOUNDS.minX,TERRAIN_BOUNDS.maxX),zs:axis(TERRAIN_BOUNDS.minZ,TERRAIN_BOUNDS.maxZ)};
}
const axes=environmentSampleAxes();
function interval(values:readonly number[],value:number) {
  let low=0,high=values.length-1;
  while(high-low>1){const middle=(low+high)>>1;if(values[middle]<=value)low=middle;else high=middle;}
  return Math.min(values.length-2,Math.max(0,low));
}
/** Exact height of the rendered a,b,a+1 / a+1,b,b+1 triangle pair, including ground offset. */
export function environmentSurfaceHeight(x:number,z:number):number {
  const i=interval(axes.xs,x),j=interval(axes.zs,z);
  const x0=axes.xs[i],x1=axes.xs[i+1],z0=axes.zs[j],z1=axes.zs[j+1];
  const u=clamp((x-x0)/(x1-x0)),v=clamp((z-z0)/(z1-z0));
  const a=environmentVisualHeight(x0,z0),b=environmentVisualHeight(x0,z1);
  const c=environmentVisualHeight(x1,z0),d=environmentVisualHeight(x1,z1);
  return (u+v<=1?a+(c-a)*u+(b-a)*v:d+(b-d)*(1-u)+(c-d)*(1-v))+ENVIRONMENT_GROUND_OFFSET;
}

/** Approved rock shapes are transplanted individually; dimensions refer to visible rock body. */
export const ENVIRONMENT_ROCKS = [
  {id:'east-01',template:1,x:485,z:90,radiusX:20,radiusZ:14,height:30,yaw:.12},
  {id:'east-02',template:4,x:512,z:166,radiusX:26,radiusZ:18,height:35,yaw:-.16},
  {id:'east-03',template:2,x:538,z:29,radiusX:27,radiusZ:19,height:42,yaw:.22},
  {id:'east-04',template:3,x:576,z:101,radiusX:33,radiusZ:23,height:48,yaw:-.12},
  {id:'east-05',template:6,x:620,z:190,radiusX:36,radiusZ:24,height:42,yaw:.3},
  {id:'south-east-01',template:7,x:400,z:248,radiusX:24,radiusZ:17,height:26,yaw:.18},
  {id:'south-east-02',template:8,x:478,z:286,radiusX:30,radiusZ:21,height:37,yaw:-.35},
  {id:'south-east-03',template:5,x:550,z:343,radiusX:37,radiusZ:25,height:44,yaw:.2},
  {id:'far-east-01',template:10,x:690,z:317,radiusX:44,radiusZ:28,height:48,yaw:-.25},
  {id:'far-east-02',template:11,x:664,z:55,radiusX:39,radiusZ:25,height:39,yaw:.15},
  {id:'far-east-03',template:12,x:740,z:174,radiusX:45,radiusZ:28,height:52,yaw:-.25},
  {id:'north-east-01',template:9,x:584,z:-73,radiusX:29,radiusZ:20,height:29,yaw:.28},
  {id:'outlier-01',template:17,x:450,z:231,radiusX:11,radiusZ:8,height:16,yaw:.1},
  {id:'outlier-02',template:15,x:544,z:236,radiusX:10,radiusZ:8,height:22,yaw:-.15},
  {id:'outlier-03',template:16,x:640,z:270,radiusX:12,radiusZ:9,height:25,yaw:.1},
] as const;
export const ENVIRONMENT_CARAVAN = {
  heights:[2.60,2.42,2.69,2.55,2.40,2.64,2.48],
  xs:[188,193.2,198.9,205.1,210.5,217,222.6],
  frames:[9,25,42,54,16,34,48],
  viewpoints:[{id:'crest',x:136,z:22},{id:'descent',x:150,z:35},{id:'valley',x:163,z:43}],
} as const;
