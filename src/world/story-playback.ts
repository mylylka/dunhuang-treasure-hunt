import type {StoryArtwork,StoryCue,StoryRegion} from '../content/world/deer-story';
export type StoryPhase='opening'|'introduction'|'overview'|'highlight'|'advance'|'narration'|'return'|'invitation'|'finished';
export interface StoryFrame {index:number;phase:StoryPhase;time:number;audioTime:number}
export const initialStoryFrame=(introduction=false):StoryFrame=>({index:0,phase:introduction?'opening':'overview',time:0,audioTime:0});
export const STORY_TIMING={opening:.7,overview:.7,highlight:.85,advance:1.15,return:.85};
const phase=(s:StoryFrame,p:StoryPhase):StoryFrame=>({...s,phase:p,time:0,audioTime:0});
export function finishNarration(s:StoryFrame):StoryFrame{return phase(s,s.phase==='introduction'?'overview':s.phase==='invitation'?'finished':'return');}
export function isStoryPassage(phase:StoryPhase):boolean {
 return phase==='introduction'||phase==='narration'||phase==='invitation';
}
/** Prefer the author's punctuation and cap longer clauses for narrow screens. */
export function storyTextCues(text:string):StoryCue[] {
 const maxLength=30;
 const clauses=text.split(/([。！？；，：]+[”’」』）]?|\n+)/u);
 const cues:StoryCue[]=[];
 let line='',end=0;
 function appendCue(cue:string){
  if(!cue.trim())return;
  const start=end;
  end+=Math.max(3.5,1+[...cue.trim()].length/4.5);
  cues.push({start,end,text:cue.trim()});
 }
 for(let i=0;i<clauses.length;i+=2){
  const punctuation=clauses[i+1]??'';
  let clause=clauses[i]+punctuation;
  if(line.length+clause.trimEnd().length>maxLength){appendCue(line);line='';}
  while(clause.trimEnd().length>maxLength){appendCue(clause.slice(0,maxLength));clause=clause.slice(maxLength);}
  line+=clause;
  if(/[。！？\n]/u.test(punctuation)){appendCue(line);line='';}
 }
 appendCue(line);
 return cues;
}

export function tickStoryText(s:StoryFrame,dt:number,cues:readonly StoryCue[]):StoryFrame {
 if(!isStoryPassage(s.phase)||dt<=0)return s;
 const time=s.time+dt;
 return time>=(cues.at(-1)?.end??0)?finishNarration(s):{...s,time};
}
export function skipStory(s:StoryFrame,count:number):StoryFrame{
 if(!isStoryPassage(s.phase))return s;
 if(s.phase==='introduction')return phase(s,'highlight');
 if(s.phase==='invitation')return finishNarration(s);
 const index=s.index+1;
 return {...phase(s,index<count?'highlight':'overview'),index};
}
/** Visual phases advance separately from the narration or caption clock. */
export function tickStory(s:StoryFrame,dt:number,count:number,reduced=false,hasEnding=true):StoryFrame{
 if(isStoryPassage(s.phase)||s.phase==='finished')return s;
 const time=s.time+Math.max(0,dt),duration=STORY_TIMING[s.phase as keyof typeof STORY_TIMING];
 if(time<(reduced?Math.min(.18,duration):duration))return {...s,time};
 if(s.phase==='opening')return phase(s,'introduction');
 if(s.phase==='overview')return phase(s,s.index>=count?(hasEnding?'invitation':'finished'):'highlight');
 if(s.phase==='highlight')return phase(s,'advance');
 if(s.phase==='advance')return phase(s,'narration');
 return {...phase(s,'overview'),index:s.index+1};
}
export const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function storyExpansion(s:StoryFrame,reduced=false){
 if(s.phase==='narration')return 1;
 if(s.phase==='advance')return reduced?1:ease(s.time/STORY_TIMING.advance);
 if(s.phase==='return')return reduced?Math.max(0,1-s.time/.18):1-ease(s.time/STORY_TIMING.return);
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
