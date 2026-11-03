/** A two-second, active-play-only arrival pause, once per hall entry. */
export type HallArrivalPhase = 'outside' | 'waiting' | 'guidance' | 'done';
export function createHallArrival() {
 let phase:HallArrivalPhase='outside',elapsed=0;
 return {
  get phase(){return phase;},
  update(inside:boolean,dt:number) {
   if(!inside){phase='outside';elapsed=0;return;}
   if(phase==='outside'){phase='waiting';elapsed=0;return;}
   if(phase==='waiting'){elapsed+=Math.max(0,dt);if(elapsed>=2)phase='guidance';}
  },
  dismiss(){if(phase==='guidance')phase='done';},
 };
}
