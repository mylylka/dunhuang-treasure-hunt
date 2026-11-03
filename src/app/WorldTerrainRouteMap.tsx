import { LAKE_SHORELINE, TERRAIN_ROUTES, TERRAIN_REGIONS, toTerrainPoint } from '../world/terrain-rules-v001';
import type { TerrainRegion } from '../content/world/terrain-layout-v001';
import type { WorldPoint } from '../world/types';

const footprints:Record<TerrainRegion,number[][]>={
  courtyard:[[-22,-24],[-2,-24],[-2,2],[-22,2]],
  music:[[22,-30],[70,-30],[70,3],[22,3]],
  cliff:[[57,-115],[187,-115],[187,-62],[57,-62]],
};
export function WorldTerrainRouteMap({ position }: { position: WorldPoint }) {
  const regionPoints=(region:TerrainRegion,points=footprints[region])=>points.map(([x,z])=>toTerrainPoint(region,{x,z}));
  const all=[...Object.keys(footprints).flatMap(region=>regionPoints(region as TerrainRegion)),...LAKE_SHORELINE,...TERRAIN_ROUTES.flatMap(route=>route.points)];
  const minX=Math.min(...all.map(p=>p.x))-14,maxX=Math.max(...all.map(p=>p.x))+14;
  const minZ=Math.min(...all.map(p=>p.z))-18,maxZ=Math.max(...all.map(p=>p.z))+15;
  const scale=Math.min(224/(maxX-minX),139/(maxZ-minZ));
  const px=(x:number)=>18+(224-(maxX-minX)*scale)/2+(x-minX)*scale;
  const pz=(z:number)=>18+(139-(maxZ-minZ)*scale)/2+(z-minZ)*scale;
  const point=(p:WorldPoint)=>`${px(p.x)},${pz(p.z)}`;
  const polygon=(region:TerrainRegion,points?:number[][])=>regionPoints(region,points).map(point).join(' ');
  const crest=TERRAIN_ROUTES[0].points.reduce((highest,p)=>p.y>highest.y?p:highest);
  return <aside className="world-map" aria-label="探索路线图"><h2>山腰 · 月牙谷地 · 高崖</h2>
    <svg viewBox="0 0 260 175" role="img" aria-label="从左侧纹彩院翻坡直接下到月牙泉，再沿圆弧前往右前方九层楼">
      <ellipse cx={px(crest.x)} cy={pz(crest.z)} rx="16" ry="25" fill="#d8b780"/>
      <polygon points={polygon('cliff')} fill="#b68e69"/>
      <polygon points={LAKE_SHORELINE.map(point).join(' ')} fill="#46868a"/>
      {TERRAIN_ROUTES.map(route=><polyline key={route.id} points={route.points.map(point).join(' ')} fill="none" stroke="#a28460" strokeWidth="3"/>)}
      <polygon points={polygon('courtyard')} fill="#a7624e"/>
      <polygon points={polygon('music')} fill="#a7624e"/>
      <polygon points={polygon('cliff',[[109,-75],[135,-75],[135,-59],[109,-59]])} fill="#8e5e48"/>
      {(['courtyard','music','cliff'] as const).map((region,i)=>{const p=TERRAIN_REGIONS[region].target;return <text key={region} x={px(p.x)} y={pz(p.z)-10} textAnchor="middle">{['纹彩院','乐舞坊','九层楼'][i]}</text>;})}
      <text x={px(crest.x)} y={pz(crest.z)+19} textAnchor="middle" fill="#8c673e">坡顶</text>
      <circle cx={px(position.x)} cy={pz(position.z)} r="3.5" fill="#a13d2e" stroke="white" strokeWidth="1.5"/>
    </svg>
  </aside>;
}
