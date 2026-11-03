import sand from '../content/world/mogao-surface-v004.json';
import {mogaoSurfaceHeight as baseHeight} from './mogao-rules-v003';
import type {WorldPoint} from './types';
/** Interpolate exported Blender mesh heights; no runtime terrain construction. */
export function mogaoSandHeightV4(p:WorldPoint){
 const x=(p.x-sand.origin[0]-sand.x0)/sand.step,y=(sand.origin[2]-p.z-sand.y0)/sand.step;
 const rows=sand.heights.length,columns=sand.heights[0].length;
 if(x<0||y<0||x>=columns-1||y>=rows-1)return 0;
 const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy;
 const a=sand.heights[iy][ix]*(1-tx)+sand.heights[iy][ix+1]*tx,b=sand.heights[iy+1][ix]*(1-tx)+sand.heights[iy+1][ix+1]*tx;
 return a*(1-ty)+b*ty;
}
export function mogaoSurfaceHeightV4(p:WorldPoint){return Math.max(baseHeight(p),mogaoSandHeightV4(p));}
