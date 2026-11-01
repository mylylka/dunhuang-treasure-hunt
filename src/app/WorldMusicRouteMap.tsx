import { MUSIC_LAYOUT_V4, MUSIC_ROAD_V4 } from '../world/music-pavilion-rules-v004';
import { MUSIC_LAYOUT_V2, MUSIC_ROAD_V2 } from '../world/music-pavilion-rules-v002';
import { MUSIC_LAYOUT_V3 } from '../world/music-pavilion-rules-v003';
import { COURTYARD_ROAD } from '../world/road';
import type { WorldPoint } from '../world/types';

const x=(value:number)=>36+value*1.75,z=(value:number)=>61+value*1.75;
export function WorldMusicRouteMap({position,version='v002'}:{position:WorldPoint;version?:'v002'|'v003'|'v004'}) {
  const layout=version==='v004'?MUSIC_LAYOUT_V4:version==='v003'?MUSIC_LAYOUT_V3:MUSIC_LAYOUT_V2;
  const rear=layout.walls.find(w=>w.id==='music-back')!;
  return <aside className="world-map" aria-label="探索路线图"><h2>纹彩院 · 乐舞馆</h2>
    <svg viewBox="0 0 160 116" role="img" aria-label="从纹彩院出门，经两次石板弯道到达乐舞馆">
      <path d={`M${x(-15)} ${z(2)}H${x(-22)}V${z(-24)}H${x(-2)}V${z(2)}H${x(-9)}`} fill="none" stroke="#ab7660" strokeWidth="2"/>
      <rect x={x(-20)} y={z(-23)} width="28" height="18" fill="#ab7660"/>
      <text x={x(-12)} y={z(-26)} textAnchor="middle">纹彩院</text>
      <polygon points={layout.dune.footprint.map(([px,pz])=>`${x(px)},${z(pz)}`).join(' ')} fill="#cfb17e" opacity=".55"/>
      {[COURTYARD_ROAD.filter(p=>p.center.z<=26),version==='v004'?MUSIC_ROAD_V4:MUSIC_ROAD_V2].map((road,i)=><polyline key={i} points={road.map(p=>`${x(p.center.x)},${z(p.center.z)}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="3"/>)}
      {layout.walls.filter(w=>w.id.includes('court-')).map(w=><rect key={w.id} x={x(w.center[0]-w.size[0]/2)} y={z(w.center[2]-w.size[2]/2)} width={w.size[0]*1.75} height={w.size[2]*1.75} fill="#77958a"/>)}
      <rect x={x(rear.center[0]-rear.size[0]/2)} y={z(rear.center[2])} width={rear.size[0]*1.75} height="17.5" fill="#77958a"/>
      <text x={x(46)} y={z(-30)} textAnchor="middle">乐舞馆</text>
      <circle cx={x(position.x)} cy={z(position.z)} r="3.5" fill="#a13d2e" stroke="white" strokeWidth="1.5"/>
    </svg><p>沿石板曲径，循乐声入院。</p>
  </aside>;
}
