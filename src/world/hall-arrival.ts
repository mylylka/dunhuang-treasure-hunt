/** Optional active-play-only arrival pause, once per hall entry. */
export type HallArrivalPhase = 'outside' | 'waiting' | 'guidance' | 'done';
export function createHallArrival(delay = 2) {
 let phase:HallArrivalPhase='outside',elapsed=0;
 return {
  get phase(){return phase;},
  update(inside:boolean,dt:number) {
   if(!inside){phase='outside';elapsed=0;return;}
   if(phase==='outside'){phase=delay>0?'waiting':'guidance';elapsed=0;return;}
   if(phase==='waiting'){elapsed+=Math.max(0,dt);if(elapsed>=delay)phase='guidance';}
  },
  dismiss(){if(phase==='guidance')phase='done';},
 };
}
