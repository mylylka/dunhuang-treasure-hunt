import { MUSIC_LAYOUT_V2, MUSIC_ROAD_V2 } from '../world/music-pavilion-rules-v002';
import { COURTYARD_ROAD } from '../world/road';
import type { WorldPoint } from '../world/types';

const x=(value:number)=>36+value*1.75,z=(value:number)=>61+value*1.75;
export function WorldMusicRouteMap({position}:{position:WorldPoint}) {
  return <aside className="world-map" aria-label="探索路线图"><h2>纹彩院 · 乐舞馆</h2>
    <svg viewBox="0 0 160 116" role="img" aria-label="从纹彩院出门，经两次石板弯道到达乐舞馆">
      <path d={`M${x(-15)} ${z(2)}H${x(-22)}V${z(-24)}H${x(-2)}V${z(2)}H${x(-9)}`} fill="none" stroke="#ab7660" strokeWidth="2"/>
      <rect x={x(-20)} y={z(-23)} width="28" height="18" fill="#ab7660"/>
      <text x={x(-12)} y={z(-26)} textAnchor="middle">纹彩院</text>
      <polygon points={MUSIC_LAYOUT_V2.dune.footprint.map(([px,pz])=>`${x(px)},${z(pz)}`).join(' ')} fill="#cfb17e" opacity=".55"/>
      {[COURTYARD_ROAD.filter(p=>p.center.z<=26),MUSIC_ROAD_V2].map((road,i)=><polyline key={i} points={road.map(p=>`${x(p.center.x)},${z(p.center.z)}`).join(' ')} fill="none" stroke="#bc9a68" strokeWidth="3"/>)}
      <path d={`M${x(39)} ${z(-8.2)}H${x(36.8)}V${z(-28)}H${x(55.2)}V${z(-8.2)}H${x(45.2)}`} fill="none" stroke="#77958a" strokeWidth="2"/>
      <rect x={x(38)} y={z(-28)} width="28" height="17" fill="#77958a"/>
      <text x={x(46)} y={z(-30)} textAnchor="middle">乐舞馆</text>
      <circle cx={x(position.x)} cy={z(position.z)} r="3.5" fill="#a13d2e" stroke="white" strokeWidth="1.5"/>
    </svg><p>沿石板曲径，循乐声入院。</p>
  </aside>;
}
