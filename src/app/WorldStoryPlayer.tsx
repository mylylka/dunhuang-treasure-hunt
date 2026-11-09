import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type SyntheticEvent} from 'react';
import {registerSpeechSkip} from '../services/speech-skip';
import {deerStory,type TextStoryDefinition,type WorldStoryDefinition} from '../content/world/deer-story';
import {getMogaoMuralNarration} from '../content/world/mogao-mural-audio-v001';
import {contain,finishNarration,initialStoryFrame,interpolateRect,isStoryPassage,mappedRegion,skipStory,storyExpansion,storyImageTargets,tickStory,tickStoryText,type Rect} from '../world/story-playback';
import type {SoundPreferences} from '../services/sound-settings';
import '../styles/deer-story.css';

interface Props {story?:WorldStoryDefinition|TextStoryDefinition;backdrop?:string;paused:boolean;blocked?:boolean;reducedMotion?:boolean;omitEnding?:boolean;exhibitNarration?:boolean;sound:SoundPreferences;onClose():void;onComplete():void}
interface StoryTap {pointerId:number;x:number;y:number;passage:string;button:Element|null}
/** A shared timeline and image stage for both narrated and text-led stories. */
export function WorldStoryPlayer({story=deerStory,backdrop,paused,blocked=false,reducedMotion=false,omitEnding=false,exhibitNarration=false,sound,onClose,onComplete}:Props){
 const [frame,setFrame]=useState(()=>initialStoryFrame(!!story.introduction)),[replay,setReplay]=useState(0);
 const [imagesReady,setImagesReady]=useState(false),[imageError,setImageError]=useState(false),[audioError,setAudioError]=useState(false),[backgroundError,setBackgroundError]=useState(false);
 const panel=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null);
 const continueButton=useRef<HTMLButtonElement>(null);
 const [size,setSize]=useState({width:1,height:1,stage:{x:0,y:0,width:1,height:1} as Rect});
 const notified=useRef(false),tap=useRef<StoryTap|null>(null),skipped=useRef<string|null>(null);
 const count=story.segments.length,segment=story.segments[frame.index];
 const introduction=frame.phase==='opening'||frame.phase==='introduction';
 const textPlayback=story.playback==='text';
 const exhibitLayout=textPlayback||exhibitNarration;
 const activeSegment=textPlayback&&introduction?undefined:segment;
 const current=introduction?story.introduction:segment??(omitEnding?undefined:story.ending);
 const recording=exhibitNarration&&current?getMogaoMuralNarration(story.id,current.id):undefined;
 const track=recording??current?.narration;
 const textCues=textPlayback&&current&&'cues' in current?current.cues:undefined;
 const speaking=isStoryPassage(frame.phase);
 const expansion=storyExpansion(frame,reducedMotion);
 const exhibitFull=contain(story.fullImage.width,story.fullImage.height,size.stage);
 const scroll=story.background.scrollRect,scale=exhibitFull.width/scroll[2];
 // Put the supplied scroll itself in the shared stage, then map authored
 // highlight coordinates back to it, including older 1920px backdrops.
 const background=exhibitLayout?{x:exhibitFull.x-scroll[0]*scale,y:exhibitFull.y-scroll[1]*scale,width:1920*scale,height:story.background.height*scale}:contain(story.background.width,story.background.height,{x:0,y:0,width:size.width,height:size.height});
 const targets=storyImageTargets(activeSegment?.images??[],size.stage);
 const paragraph=recording?.text??current?.text??'';
 const cue=speaking?(exhibitNarration||!textCues?paragraph:textCues.find(line=>frame.time<line.end)?.text??''):'';
 const finished=frame.phase==='finished';
 const passage=`${replay}:${frame.index}:${frame.phase}`;
 const recovery=textPlayback&&(imageError||backgroundError);
 const canSkip=!paused&&!blocked&&imagesReady&&!recovery&&speaking;
 const canClose=!blocked&&(speaking||finished||recovery);
 const caption=useRef<HTMLDivElement>(null);

 useEffect(()=>{tap.current=null;if(!blocked)panel.current?.focus({preventScroll:true});},[blocked,paused]);
 useLayoutEffect(()=>{
  const element=panel.current,art=stage.current,measure=caption.current;if(!element||!art)return;
  const update=()=>{
   if(measure){
    const height=`${measure.getBoundingClientRect().height}px`;
    if(element.style.getPropertyValue('--story-caption-height')!==height)element.style.setProperty('--story-caption-height',height);
   }
   const p=element.getBoundingClientRect(),a=art.getBoundingClientRect();
   setSize({width:p.width,height:p.height,stage:{x:a.x-p.x,y:a.y-p.y,width:a.width,height:a.height}});
  };
  let pending=0;
  // Changing the caption inset also changes the observed stage. Schedule that
  // write outside the observer delivery cycle so WebKit can settle the layout.
  const observer=new ResizeObserver(()=>{
   cancelAnimationFrame(pending);pending=requestAnimationFrame(update);
  });
  observer.observe(element);observer.observe(art);if(measure)observer.observe(measure);
  update();
  return()=>{observer.disconnect();cancelAnimationFrame(pending);};
 },[exhibitLayout]);
 useEffect(()=>{
  let disposed=false;setImagesReady(false);setImageError(false);
  const requests:HTMLImageElement[]=[];
  function prepare(url:string){return new Promise<boolean>((resolve,reject)=>{
   const img=new Image();requests.push(img);img.onload=()=>resolve(true);
   img.onerror=()=>textPlayback?resolve(false):reject(new Error('story-image-load-failed'));img.src=url;
  });}
  const overview=story.background.composite||exhibitLayout?story.fullImage.url:story.background.url;
  void Promise.all([prepare(overview),...(activeSegment?.images.map(i=>prepare(i.url))??[])]).then(([full,...details])=>{
   if(disposed)return;
   window.clearTimeout(timeout);
   if(textPlayback){setBackgroundError(!full);setImageError(details.includes(false));}
   setImagesReady(true);
  }).catch(()=>{
   if(disposed)return;
   setImageError(true);
   setImagesReady(true);
  });
  // Preserve the narrated stories' warm-up. Text-led stories fetch only the active segment.
  if(!textPlayback)story.segments[frame.index+1]?.images.forEach(i=>{const img=new Image();img.src=i.url;});
  const timeout=textPlayback?window.setTimeout(()=>{
   if(disposed)return;
   const [full,...details]=requests;
   setBackgroundError(!full.naturalWidth);
   setImageError(details.some(img=>!img.naturalWidth));
   setImagesReady(true);
  },10_000):undefined;
  return()=>{
   disposed=true;window.clearTimeout(timeout);
   if(textPlayback)for(const img of requests){img.onload=null;img.onerror=null;if(!img.complete)img.removeAttribute('src');}
  };
 },[frame.index,replay,activeSegment,story,textPlayback,exhibitLayout]);
 useEffect(()=>{
  setAudioError(false);const current=audio.current;
  if(current&&track&&current.getAttribute('src')!==track.url){current.src=track.url;current.load();}
  return()=>{if(current){current.pause();current.removeAttribute('src');current.load();}};
 },[frame.index,replay,track?.url]);
 useEffect(()=>{
  const current=audio.current;if(!current)return;let cancelled=false;
  current.volume=sound.volume;current.muted=!sound.enabled;
  if(paused||blocked||!speaking||!imagesReady||recovery||audioError){current.pause();return;}
  void current.play().catch(()=>{if(!cancelled)setAudioError(true);});
  return()=>{cancelled=true;current.pause();};
 },[paused,blocked,speaking,imagesReady,recovery,sound.enabled,sound.volume,audioError,track,frame.index,replay]);
 useEffect(()=>{
  if(!track||!speaking||paused||blocked||!imagesReady||recovery||audioError)return;
  // A stalled request must not strand the story in an endless silent wait.
  let last=-1,stalled=0;
  const timer=window.setInterval(()=>{const t=audio.current?.currentTime??0;stalled=t===last?stalled+1:0;last=t;if(stalled>=8){audio.current?.pause();setAudioError(true);}},1000);
  return()=>clearInterval(timer);
 },[track,speaking,paused,blocked,imagesReady,recovery,audioError,frame.index,replay]);
 useEffect(()=>{
  if(paused||blocked||!imagesReady||finished||recovery)return;
  let raf=0,last=performance.now();
  const tick=(now:number)=>{
   const dt=Math.min(.1,(now-last)/1000);if(dt<1/35){raf=requestAnimationFrame(tick);return;}last=now;
   setFrame(s=>{
    if(isStoryPassage(s.phase)){
     if(!track&&textCues)return tickStoryText(s,dt,textCues);
     const time=audioError?s.audioTime+dt:(audio.current?.currentTime??0);
     if(!track)return s;
     if(audioError&&time>=track.duration)return finishNarration(s);
     return {...s,audioTime:time};
    }
    return tickStory(s,dt,count,reducedMotion,!omitEnding);
   });raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[paused,blocked,imagesReady,finished,recovery,audioError,track,textCues,count,reducedMotion,omitEnding,frame.phase]);
 const reportComplete=useCallback(()=>{
  if(notified.current)return;
  notified.current=true;
  onComplete();
 },[onComplete]);
 useEffect(()=>{if(finished)reportComplete();},[finished,reportComplete]);
 useEffect(()=>{if(textPlayback&&finished&&!blocked)continueButton.current?.focus({preventScroll:true});},[textPlayback,finished,blocked]);
 const skipRef=useRef<()=>boolean>(()=>false);
 skipRef.current=()=>{
  if(!canSkip||skipped.current===passage)return false;
  skipped.current=passage;
  audio.current?.pause();
  setFrame(s=>s.index===frame.index&&s.phase===frame.phase?skipStory(s,count):s);
  return true;
 };
 useEffect(()=>registerSpeechSkip(()=>{
  if(!panel.current||panel.current.inert||document.activeElement?.closest('button'))return false;
  skipRef.current();
  // A protected frame owns Space as well, so a held key cannot spill into another encounter.
  return true;
 }),[]);
 function retry(){
  audio.current?.pause();setBackgroundError(false);setReplay(n=>n+1);
  setFrame(s=>({...s,audioTime:0}));
 }
 function endAudio(event:SyntheticEvent<HTMLAudioElement>){
  if(event.currentTarget!==audio.current||blocked||paused||recovery||!speaking||skipped.current===passage)return;
  setFrame(s=>s.index===frame.index&&s.phase===frame.phase?finishNarration(s):s);
 }
 function close(){
  if(!canClose)return;
  if(textPlayback&&finished)reportComplete();audio.current?.pause();onClose();
 }
 function clickClose(event:MouseEvent<HTMLButtonElement>){
  const start=tap.current;
  if(event.detail===0||(start?.passage===passage&&start.button===event.currentTarget))close();
 }
 function replayText(){
  reportComplete();notified.current=false;
  setReplay(n=>n+1);setFrame(initialStoryFrame(!!story.introduction));
  panel.current?.focus({preventScroll:true});
 }
 const rectStyle=(r:Rect)=>({left:r.x,top:r.y,width:r.width,height:r.height});
 const fullRect=exhibitLayout?exhibitFull:mappedRegion(background,story.background.scrollRect,story.coordinateSize,[0,0,story.coordinateSize[0],story.coordinateSize[1]]);
 return <section className={`world-story deer-story${exhibitLayout?' deer-story--text':''}`} role="dialog" aria-modal="true" aria-label={`${story.title}故事`} tabIndex={-1} ref={panel} data-story-id={story.id} data-story-mode={textPlayback?'text':undefined} data-testid="world-story" data-phase={frame.phase} data-can-skip={canSkip} data-audio-time={frame.audioTime.toFixed(2)} data-text-time={textPlayback?frame.time.toFixed(2):undefined} inert={blocked?true:undefined}
  onPointerDown={event=>{
   tap.current=null;
   if(!event.isPrimary||event.button!==0||event.defaultPrevented)return;
   const button=event.target instanceof Element?event.target.closest('button'):null;
   if(button){if(!canClose||!button.hasAttribute('data-story-close'))return;}
   else {event.currentTarget.focus({preventScroll:true});if(!canSkip)return;}
   tap.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,passage,button};
  }}
  onPointerMove={event=>{
   const start=tap.current;
   if(start?.pointerId===event.pointerId&&Math.hypot(start.x-event.clientX,start.y-event.clientY)>10)tap.current=null;
  }}
  onPointerCancel={()=>{tap.current=null;}}
  onPointerLeave={event=>{
   // Touch and pen leave the surface on lift, before the browser sends their click.
   if(event.pointerType==='mouse')tap.current=null;
  }}
  onClick={event=>{
   const start=tap.current;tap.current=null;
   if(start?.passage===passage&&!start.button&&event.detail>0&&!event.defaultPrevented
    &&Math.hypot(start.x-event.clientX,start.y-event.clientY)<=10)skipRef.current();
  }}
  onKeyDown={event=>{
   if(blocked)return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
   if(event.key==='Tab'){
    event.preventDefault();const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')].filter(e=>e.getClientRects().length>0),i=controls.indexOf(document.activeElement as HTMLElement);
    controls[i<0?(event.shiftKey?controls.length-1:0):(i+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
   }
  }}>
  <div className="deer-story-atmosphere" style={{backgroundImage:`url("${story.background.composite||exhibitLayout?(backdrop??''):story.background.url}")`}} aria-hidden="true"/>
  {story.background.composite||exhibitLayout?<img key={textPlayback?replay:undefined} className="deer-story-background" data-testid="story-background" src={story.fullImage.url} alt={`${story.title}完整长卷`} style={{...rectStyle(fullRect),visibility:textPlayback&&backgroundError?'hidden':undefined,filter:`blur(${expansion*12}px) brightness(${1-expansion*.3})`}}/>:<img className="deer-story-background" data-testid="story-background" src={backgroundError?story.fullImage.url:story.background.url} alt="洞窟中浮现的九色鹿完整长卷" style={{...rectStyle(background),filter:`blur(${imageError?0:expansion*12}px) brightness(${1-expansion*.3})`}} onError={()=>setBackgroundError(true)}/>}
  {!exhibitLayout&&<>
   <div ref={caption} className="world-subtitle deer-story-caption-measure" aria-hidden="true"><p>{paragraph}</p></div>
   <div ref={stage} className="deer-story-stage" aria-hidden="true"/>
  </>}
  {activeSegment?.images.map((art,i)=>{
   const source=mappedRegion(background,story.background.scrollRect,story.coordinateSize,art.region);
   const focus=art.focus?mappedRegion(background,story.background.scrollRect,story.coordinateSize,art.focus):source;
   // Interpolate equal-aspect boxes: the supplied artwork never stretches in flight.
   const origin=contain(art.width,art.height,focus),target=targets[i],rect=interpolateRect(origin,target,expansion);
   const shown=['advance','narration','return'].includes(frame.phase)&&!imageError;
   return <div key={`${art.id}-${replay}`}>
    {!backgroundError&&(frame.phase==='highlight'||(imageError&&speaking))&&<div className="deer-story-highlight" data-testid="story-highlight" style={rectStyle(source)} aria-label={`${art.alt}在长卷中的位置`}/>}
    {shown&&<img className="deer-story-detail" data-testid="story-detail" data-artwork={art.id} src={art.url} alt={art.alt} style={{...rectStyle(rect),opacity:Math.min(1,expansion*5),boxShadow:`0 ${expansion*16}px ${expansion*48}px #130b08a0`}} onError={()=>setImageError(true)}/>}
   </div>;
  })}
  {exhibitLayout?<div className="deer-story-text-layout">
   <header className="deer-story-text-heading">
    <div><h2>{story.title}</h2>{story.source&&<p>{story.source}</p>}</div>
    <button type="button" data-story-close onClick={clickClose} disabled={!canClose} aria-label="关闭故事">关闭</button>
   </header>
   <div ref={stage} className="deer-story-text-stage" aria-hidden="true"/>
   <div className="deer-story-text-footer">
    {finished&&textPlayback?<nav className="deer-story-text-actions" aria-label="故事已看完">
     <button type="button" onClick={replayText}>再看一次</button>
     <button ref={continueButton} type="button" data-story-close onClick={clickClose}>继续漫游</button>
    </nav>:<div className="deer-story-text-caption" aria-live="polite">
     {cue&&<p data-testid="story-subtitle">{cue}</p>}
    </div>}
   </div>
  </div>:<header className="deer-story-toolbar">
   <div className="deer-story-label"><span>{story.title}</span><span className="deer-story-count" aria-label={`第${Math.min(frame.index+1,count)}段，共${count}段`}>{introduction?'导语':`${Math.min(frame.index+1,count)} / ${count}`}</span></div>
   <button type="button" data-story-close onClick={clickClose} disabled={!canClose}>退出故事</button>
  </header>}
  <div hidden data-testid="world-story-step" data-index={frame.index}/>
  {track&&<audio key={`${track.url}-${replay}`} ref={audio} src={track.url} preload="auto" onEnded={endAudio} onError={event=>{if(event.currentTarget===audio.current)setAudioError(true);}} data-testid="story-audio"/>}
  {!imagesReady&&<div className="deer-story-status" role="status">正在展开长卷…</div>}
  {(imageError||(textPlayback&&backgroundError))&&<div className="deer-story-status" role="alert">{textPlayback&&backgroundError?'完整壁画暂未加载。':'局部图片暂未加载。'}<button type="button" onClick={retry}>重试图片</button></div>}
  {audioError&&speaking&&!blocked&&<div className="deer-story-audio-error" role="status">旁白暂不可用。<button type="button" onClick={retry}>重试旁白</button></div>}
  {!exhibitLayout&&cue&&!blocked&&<aside className="world-subtitle" data-testid="story-subtitle" aria-live="polite"><p>{cue}</p></aside>}
 </section>;
}
