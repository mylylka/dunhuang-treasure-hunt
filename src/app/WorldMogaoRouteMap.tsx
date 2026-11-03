import { MOGAO_ROAD as MOGAO_ROAD_V3 } from '../world/mogao-rules-v003';
import { MOGAO_ROAD as MOGAO_ROAD_V2 } from '../world/mogao-rules-v002';
import { MOGAO_ROAD } from '../world/mogao-rules-v001';
import { MUSIC_ROAD_V4 } from '../world/music-pavilion-rules-v004';
import type { WorldPoint } from '../world/types';
export function WorldMogaoRouteMap({position,version='v001',fictional=false}:{position:WorldPoint;fictional?:boolean;version?:'v001'|'v002'|'v003'}){
  const destination=fictional?'石窟':'莫高窟';
  const point=(p:WorldPoint)=>`${30+p.x*.9},${140+p.z*.9}`;
  return <aside className="world-map" aria-label="探索路线图"><h2>纹彩院 · 乐舞馆 · {destination}</h2>
    <svg viewBox="0 0 220 180" role="img" aria-label={`从乐舞馆出院，沿曲径向东北前往${destination}`}>
      <path d="M70 75H210V45H70Z" fill="#bd986d"/>
      <rect x="129" y="48" width="23" height="27" fill="#936b51"/>
      <polyline points={[...MUSIC_ROAD_V4,...(version==='v003'?MOGAO_ROAD_V3:version==='v002'?MOGAO_ROAD_V2:MOGAO_ROAD)].map(s=>point(s.center)).join(' ')} fill="none" stroke="#bda477" strokeWidth="4"/>
      <path d="M140 90V74" stroke="#bda477" strokeWidth="5"/>
      <rect x="10" y="120" width="20" height="20" fill="#aa6854"/><text x="4" y="114">纹彩院</text>
      <rect x="53" y="113" width="40" height="28" fill="#71968b"/><text x="55" y="105">乐舞馆</text>
      <text x="138" y="37" textAnchor="middle">{destination}</text>
      <circle cx={30+position.x*.9} cy={140+position.z*.9} r="4" fill="#a13d2e" stroke="white" strokeWidth="2"/>
    </svg>
  </aside>;
}
