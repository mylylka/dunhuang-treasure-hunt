import { MOGAO_SESSION_OPTIONS as previousOptions } from './mogao-rules-v010';
import { inMogaoRoom } from './mogao-rules-v008';
import type {WorldPoint} from './types';
export * from './mogao-rules-v008';
export const MOGAO_SESSION_KEY='dunhuang:mogao-preview:v11';
export const MOGAO_SESSION_OPTIONS={...previousOptions,key:MOGAO_SESSION_KEY};
export function mogaoLocation(p:WorldPoint):string|null {
  if(inMogaoRoom(p))return '石窟内';
  if(Math.abs(p.x-122)<10&&p.z< -39&&p.z> -75)return '窟口';
  return p.x>80&&p.z<45?'崖前古道':null;
}
