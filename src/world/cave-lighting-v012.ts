import { MathUtils } from 'three';
import layout from '../content/world/mogao-layout-v008.json';
import geometry from '../content/world/mogao-geometry-v007.json';

/** Begin adapting at the real doorway, using the traveler's world position.
 * A trailing/orbiting camera must not delay or reverse the player's adaptation.
 * The existing temporal easing and dim indoor material gain remain unchanged. */
export function caveEntryAdaptationTarget(x:number,z:number):number {
  const depth=layout.origin[2]-z;
  const halfWidth=depth<layout.room.front?geometry.passage.halfWidth:layout.room.width/2;
  if(Math.abs(x-layout.origin[0])>halfWidth||depth>layout.room.front+layout.room.depth)return 0;
  return MathUtils.smoothstep(depth,geometry.passage.front,layout.room.front+2);
}
