import { movementVector } from './movement';

export const normalizedYaw=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));

/** A held directional gesture keeps its world bearing while the camera orbits.
 * Automatic yaw must never feed back into that same gesture and make circles. */
export function createTravelCamera() {
  let referenceYaw=0,lastAngle:number|null=null,held=0,manualRemaining=0;
  return {
    reset(){lastAngle=null;held=0;manualRemaining=0;},
    manual(){manualRemaining=1.5;lastAngle=null;held=0;},
    vector(x:number,y:number,yaw:number,dt:number) {
      manualRemaining=Math.max(0,manualRemaining-dt);
      if(Math.hypot(x,y)<.08){lastAngle=null;held=0;return {x:0,z:0};}
      const angle=Math.atan2(y,x);
      if(lastAngle===null||Math.abs(normalizedYaw(angle-lastAngle))>.22){referenceYaw=yaw;held=0;lastAngle=angle;}
      held+=dt;
      return movementVector(x,y,referenceYaw);
    },
    yaw(current:number,heading:number,moving:boolean,dt:number,reduced:boolean){
      if(!moving||held<.18||manualRemaining>0)return current;
      const delta=normalizedYaw(heading-current);
      if(Math.abs(delta)<.012)return normalizedYaw(heading);
      // Reduced-motion users keep control without an automatic orbit.
      if(reduced)return current;
      return normalizedYaw(current+delta*(1-Math.exp(-dt*3.2)));
    },
  };
}
