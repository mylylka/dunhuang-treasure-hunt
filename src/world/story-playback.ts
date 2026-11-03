import type {StoryArtwork,StoryRegion} from '../content/world/deer-story';
export type StoryPhase='introduction'|'overview'|'highlight'|'advance'|'narration'|'return'|'invitation'|'finished';
export interface StoryFrame {index:number;phase:StoryPhase;time:number;audioTime:number;quick:boolean;returnFrom?:number}
export const initialStoryFrame=(introduction=false):StoryFrame=>({index:0,phase:introduction?'introduction':'overview',time:0,audioTime:0,quick:false});
/** Return to the prior episode, including from the closing invitation. */
export function previousStory(s:StoryFrame):StoryFrame {
 if(s.phase==='introduction'||s.index===0)return s;
 return {...initialStoryFrame(),index:s.index-1};
}
export const STORY_TIMING={overview:.7,highlight:.85,advance:1.15,return:.85,quickReturn:.22};
const phase=(s:StoryFrame,p:StoryPhase):StoryFrame=>({...s,phase:p,time:0,audioTime:0,returnFrom:undefined});
export function finishNarration(s:StoryFrame):StoryFrame{return phase(s,s.phase==='introduction'?'overview':s.phase==='invitation'?'finished':'return');}
export function skipStory(s:StoryFrame,count:number):StoryFrame{
 if(s.phase==='finished')return s;
 if(s.phase==='introduction')return phase(s,'overview');
 if(s.index>=count)return phase(s,'finished');
 if(s.phase==='return')return s;
 return s.phase==='invitation'?phase(s,'finished'):{...phase(s,'return'),quick:true,returnFrom:storyExpansion(s)};
}
/** Only visual phases use wall time. Spoken phases finish on the media ended event. */
export function tickStory(s:StoryFrame,dt:number,count:number,reduced=false):StoryFrame{
 if(['introduction','narration','invitation','finished'].includes(s.phase))return s;
 const time=s.time+Math.max(0,dt),duration=s.phase==='return'&&s.quick?STORY_TIMING.quickReturn:STORY_TIMING[s.phase as keyof typeof STORY_TIMING];
 if(time<(reduced?Math.min(.18,duration):duration))return {...s,time};
 if(s.phase==='overview')return phase(s,s.index>=count?'invitation':'highlight');
 if(s.phase==='highlight')return phase(s,'advance');
 if(s.phase==='advance')return phase(s,'narration');
 return {...phase(s,'overview'),index:s.index+1,quick:false};
}
export const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function storyExpansion(s:StoryFrame,reduced=false){
 if(s.phase==='narration')return 1;
 if(s.phase==='advance')return reduced?1:ease(s.time/STORY_TIMING.advance);
 if(s.phase==='return')return (s.returnFrom??1)*(reduced||s.quick?Math.max(0,1-s.time/(s.quick?STORY_TIMING.quickReturn:.18)):1-ease(s.time/STORY_TIMING.return));
 return 0;
}
export interface Rect {x:number;y:number;width:number;height:number}
export function contain(width:number,height:number,box:Rect):Rect{
 const k=Math.min(box.width/width,box.height/height);return{x:box.x+(box.width-width*k)/2,y:box.y+(box.height-height*k)/2,width:width*k,height:height*k};
}
export function mappedRegion(background:Rect,scroll:readonly number[],basis:readonly number[],region:StoryRegion):Rect{
 const scale=background.width/1920;
 const [sx,sy,sw,sh]=scroll,[x1,y1,x2,y2]=region;
 return{x:background.x+(sx+sw*x1/basis[0])*scale,y:background.y+(sy+sh*y1/basis[1])*scale,width:sw*(x2-x1)/basis[0]*scale,height:sh*(y2-y1)/basis[1]*scale};
}
/** Single images fill the available stage; paired images share ~half its area. */
export function storyImageTargets(images:Pick<StoryArtwork,'width'|'height'>[],box:Rect):Rect[]{
 if(!images.length)return [];
 if(images.length===1)return[contain(images[0].width,images[0].height,box)];
 const gap=Math.min(24,box.width*.025),ratios=images.map(i=>i.width/i.height),sum=ratios.reduce((a,b)=>a+b,0);
 const height=Math.min(box.height*.83,(box.width-gap)/sum,Math.sqrt(box.width*box.height*.52/sum));
 const total=sum*height+gap;let x=box.x+(box.width-total)/2;
 return images.map((_,i)=>{const r={x,y:box.y+(box.height-height)/2,width:ratios[i]*height,height};x+=r.width+gap;return r;});
}
export function interpolateRect(a:Rect,b:Rect,t:number):Rect{return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,width:a.width+(b.width-a.width)*t,height:a.height+(b.height-a.height)*t};}
