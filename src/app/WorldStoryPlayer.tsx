import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {WorldSubtitle} from './WorldSubtitle';
import {registerSpeechSkip} from '../services/speech-skip';
import {deerStory,type WorldStoryDefinition} from '../content/world/deer-story';
import {contain,finishNarration,initialStoryFrame,interpolateRect,mappedRegion,previousStory,skipStory,storyExpansion,storyImageTargets,tickStory,type Rect} from '../world/story-playback';
import type {SoundPreferences} from '../services/sound-settings';
import '../styles/deer-story.css';

interface Props {story?:WorldStoryDefinition;backdrop?:string;paused:boolean;blocked?:boolean;reducedMotion?:boolean;sound:SoundPreferences;onClose():void;onComplete():void;onPause(paused:boolean):void;onExplore?():void}
/** One timeline, one narration element and one image stage for all five episodes. */
export function WorldStoryPlayer({story=deerStory,backdrop,paused,blocked=false,reducedMotion=false,sound,onClose,onComplete,onPause,onExplore}:Props){
 const [frame,setFrame]=useState(()=>initialStoryFrame(!!story.introduction)),[replay,setReplay]=useState(0);
 const [imagesReady,setImagesReady]=useState(false),[imageError,setImageError]=useState(false),[audioError,setAudioError]=useState(false),[backgroundError,setBackgroundError]=useState(false);
 const panel=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null);
 const [size,setSize]=useState({width:1,height:1,stage:{x:0,y:0,width:1,height:1} as Rect});
 const notified=useRef(false),latest=useRef({frame,paused,blocked});latest.current={frame,paused,blocked};
 const count=story.segments.length,segment=story.segments[frame.index];
 const introduction=frame.phase==='introduction';
 const current=introduction?story.introduction!:(segment??story.ending);
 const track=current.narration;
 const speaking=frame.phase==='introduction'||frame.phase==='narration'||frame.phase==='invitation';
 const expansion=storyExpansion(frame,reducedMotion);
 const background=contain(story.background.width,story.background.height,{x:0,y:0,width:size.width,height:size.height});
 const targets=storyImageTargets(segment?.images??[],size.stage);
 const paragraph=current.text;
 const cue=speaking?paragraph:'';
 const caption=useRef<HTMLDivElement>(null);

 useEffect(()=>{if(!blocked)panel.current?.focus({preventScroll:true});},[blocked]);
 useLayoutEffect(()=>{
  const element=panel.current,art=stage.current,measure=caption.current;if(!element||!art||!measure)return;
  function update(){element!.style.setProperty('--story-caption-height',`${measure!.getBoundingClientRect().height}px`);const p=element!.getBoundingClientRect(),a=art!.getBoundingClientRect();setSize({width:p.width,height:p.height,stage:{x:a.x-p.x,y:a.y-p.y,width:a.width,height:a.height}});}
  const observer=new ResizeObserver(update);observer.observe(element);observer.observe(art);observer.observe(measure);update();return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let disposed=false;setImagesReady(false);setImageError(false);
  const urls=[story.background.composite?story.fullImage.url:story.background.url,...(segment?.images.map(i=>i.url)??[])];
  void Promise.all(urls.map(url=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject();img.src=url;}))).catch(()=>{if(!disposed)setImageError(true);}).finally(()=>{if(!disposed)setImagesReady(true);});
  // Warm the next artwork without mounting another visible slide or audio player.
  story.segments[frame.index+1]?.images.forEach(i=>{const img=new Image();img.src=i.url;});
  return()=>{disposed=true;};
 },[frame.index,replay,segment]);
 useEffect(()=>{
  setAudioError(false);const current=audio.current;
  if(current){current.src=track.url;current.load();}
  return()=>{if(current){current.pause();current.removeAttribute('src');current.load();}};
 },[frame.index,replay,track.url]);
 useEffect(()=>{
  const current=audio.current;if(!current)return;let cancelled=false;
  current.volume=sound.volume;current.muted=!sound.enabled;
  if(paused||blocked||!speaking||!imagesReady||audioError){current.pause();return;}
  void current.play().catch(()=>{if(!cancelled)setAudioError(true);});
  return()=>{cancelled=true;current.pause();};
 },[paused,blocked,speaking,imagesReady,sound.enabled,sound.volume,audioError,frame.index,replay]);
 useEffect(()=>{
  if(!speaking||paused||blocked||audioError)return;
  // A stalled request must not strand the story in an endless silent wait.
  let last=-1,stalled=0;
  const timer=window.setInterval(()=>{const t=audio.current?.currentTime??0;stalled=t===last?stalled+1:0;last=t;if(stalled>=8){audio.current?.pause();setAudioError(true);}},1000);
  return()=>clearInterval(timer);
 },[speaking,paused,blocked,audioError,frame.index,replay]);
 useEffect(()=>{
  if(paused||blocked||!imagesReady||frame.phase==='finished')return;
  let raf=0,last=performance.now();
  const tick=(now:number)=>{
   const dt=Math.min(.1,(now-last)/1000);if(dt<1/35){raf=requestAnimationFrame(tick);return;}last=now;
   setFrame(s=>{
    if(s.phase==='introduction'||s.phase==='narration'||s.phase==='invitation'){
     const time=audioError?s.audioTime+dt:(audio.current?.currentTime??0);
     if(audioError&&time>=track.duration)return finishNarration(s);
     return {...s,audioTime:time};
    }
    return tickStory(s,dt,count,reducedMotion);
   });raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[paused,blocked,imagesReady,audioError,track,count,reducedMotion,frame.phase]);
 useEffect(()=>{if(frame.phase==='finished'&&!notified.current){notified.current=true;onComplete();}},[frame.phase,onComplete]);
 const skipRef=useRef<()=>boolean>(()=>false);
 skipRef.current=()=>{
  if(blocked||frame.phase==='finished')return false;
  audio.current?.pause();setFrame(s=>skipStory(s,count));onPause(false);return true;
 };
 useEffect(()=>registerSpeechSkip(()=>skipRef.current()),[]);
 function restart(){audio.current?.pause();setReplay(n=>n+1);setFrame(s=>({...s,phase:s.phase==='introduction'?'introduction':s.index===count?'overview':'highlight',time:0,audioTime:0,quick:false}));onPause(false);}
 function previous(){audio.current?.pause();setFrame(previousStory);onPause(false);}
 function endAudio(){if(!latest.current.blocked&&['introduction','narration','invitation'].includes(latest.current.frame.phase))setFrame(finishNarration);}
 function close(){audio.current?.pause();onClose();}
 const rectStyle=(r:Rect)=>({left:r.x,top:r.y,width:r.width,height:r.height});
 return <section className="world-story deer-story" role="dialog" aria-modal="true" aria-label={`${story.title}故事`} tabIndex={-1} ref={panel} data-story-id={story.id} data-testid="world-story" data-phase={frame.phase} data-audio-time={frame.audioTime.toFixed(2)} inert={blocked?true:undefined}
  onKeyDown={event=>{
   if(blocked)return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
   if(event.key==='Tab'){
    event.preventDefault();const controls=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(e=>e.getClientRects().length>0),i=controls.indexOf(document.activeElement as HTMLButtonElement);
    controls[i<0?(event.shiftKey?controls.length-1:0):(i+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
   }
  }}>
  <div className="deer-story-atmosphere" style={{backgroundImage:`url("${story.background.composite?(backdrop??''):story.background.url}")`}} aria-hidden="true"/>
  {story.background.composite?<img className="deer-story-background" data-testid="story-background" src={story.fullImage.url} alt={`${story.title}完整长卷`} style={{...rectStyle({x:background.x+story.background.scrollRect[0]*background.width/1920,y:background.y+story.background.scrollRect[1]*background.width/1920,width:story.background.scrollRect[2]*background.width/1920,height:story.background.scrollRect[3]*background.width/1920}),filter:`blur(${expansion*12}px) brightness(${1-expansion*.3})`}}/>:<img className="deer-story-background" data-testid="story-background" src={backgroundError?story.fullImage.url:story.background.url} alt="洞窟中浮现的九色鹿完整长卷" style={{...rectStyle(background),filter:`blur(${imageError?0:expansion*12}px) brightness(${1-expansion*.3})`}} onError={()=>setBackgroundError(true)}/>}
  <div ref={caption} className="world-subtitle deer-story-caption-measure" aria-hidden="true"><p>{paragraph}<span className="world-subtitle-skip">（空格跳过）</span></p></div>
  <div ref={stage} className="deer-story-stage" aria-hidden="true"/>
  {segment?.images.map((art,i)=>{
   const source=mappedRegion(background,story.background.scrollRect,story.coordinateSize,art.region);
   // Interpolate equal-aspect boxes: the supplied artwork never stretches in flight.
   const origin=contain(art.width,art.height,source),target=targets[i],rect=interpolateRect(origin,target,expansion);
   const shown=['advance','narration','return'].includes(frame.phase)&&!imageError;
   return <div key={`${art.id}-${replay}`}>
    {!backgroundError&&(frame.phase==='highlight'||(imageError&&speaking))&&<div className="deer-story-highlight" data-testid="story-highlight" style={rectStyle(source)} aria-label={`${art.alt}在长卷中的位置`}/>}
    {shown&&<img className="deer-story-detail" data-testid="story-detail" data-artwork={art.id} src={art.url} alt={art.alt} style={{...rectStyle(rect),opacity:Math.min(1,expansion*5),boxShadow:`0 ${expansion*16}px ${expansion*48}px #130b08a0`}} onError={()=>setImageError(true)}/>}
   </div>;
  })}
  <header className="deer-story-toolbar">
   <div className="deer-story-label"><span>{story.title}</span><span className="deer-story-count" aria-label={`第${Math.min(frame.index+1,count)}段，共${count}段`}>{introduction?'导语':`${Math.min(frame.index+1,count)} / ${count}`}</span></div>
   <nav aria-label="故事播放控制">
    <button type="button" onClick={()=>onPause(!paused)}>{paused?'继续播放':'暂停'}</button>
    <button type="button" onClick={restart}>重播</button>
   <button type="button" onClick={previous} disabled={introduction||frame.index===0}>上一段</button>
    <button type="button" onClick={()=>skipRef.current()}>跳过本段</button>
   {onExplore&&<button type="button" onClick={()=>{audio.current?.pause();onExplore();}}>探索更多</button>}
    <button type="button" onClick={close}>退出故事</button>
   </nav>
  </header>
  <div hidden data-testid="world-story-step" data-index={frame.index}/>
  <audio key={`${frame.index}-${replay}`} ref={audio} src={track.url} preload="auto" onEnded={endAudio} onError={()=>setAudioError(true)} data-testid="story-audio"/>
  {!imagesReady&&<div className="deer-story-status" role="status">正在展开长卷…</div>}
  {imageError&&<div className="deer-story-status" role="alert">局部图片暂未加载。<button type="button" onClick={restart}>重试图片</button></div>}
  {audioError&&speaking&&!blocked&&<div className="deer-story-audio-error" role="status">旁白暂不可用。<button type="button" onClick={restart}>重试旁白</button></div>}
  {cue&&!blocked&&<WorldSubtitle text={cue} onSkip={()=>skipRef.current()} testId="story-subtitle"/>}
 </section>;
}
