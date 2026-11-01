import { worldAssetUrl } from '../content/world/assets';
import type { SoundPreferences } from '../services/sound-settings';
import { MUSIC_LAYOUT_V2 } from './music-pavilion-rules-v002';
import type { WorldPoint } from './types';

export interface MusicSpatialAudio {
  source: readonly number[]; outerRadius: number; innerRadius: number;
  departureFade?: { maxX:number; startZ:number; endZ:number };
}
export function musicSpatialGain(p:WorldPoint,spatial:MusicSpatialAudio){
  const distance=Math.hypot(p.x-spatial.source[0],p.z-spatial.source[2]);
  const t=Math.max(0,Math.min(1,(spatial.outerRadius-distance)/(spatial.outerRadius-spatial.innerRadius)));
  const fade=spatial.departureFade;
  const departure=fade&&p.x<fade.maxX?Math.max(0,Math.min(1,(p.z-fade.startZ)/(fade.endZ-fade.startZ))):1;
  return t*t*(3-2*t)*departure*departure*(3-2*departure);
}

/** Region-owned long audio. It never uses or crowds the shared UI effects pool. */
export function createMusicArrivalAudio(initial: SoundPreferences, spatial:MusicSpatialAudio = MUSIC_LAYOUT_V2.audio) {
  let disposed=false,unlocked=false,blocked=false,status:'loading'|'ready'|'error'='loading';
  let preferences=initial,point:WorldPoint={x:0,z:18},yaw=0,gainValue=0,ducked=false;
  let context:AudioContext|null=null,buffer:AudioBuffer|null=null,source:AudioBufferSourceNode|null=null;
  let gain:GainNode|null=null,pan:StereoPannerNode|null=null,recording:MediaStreamAudioDestinationNode|null=null;
  let bytes:ArrayBuffer|null=null,pending:Promise<void>|null=null;
  const abort=new AbortController();
  async function load(){
    status='loading';
    try{
      const response=await fetch(worldAssetUrl('music-pavilion/v002/arrival-plucks.wav'),{signal:abort.signal});
      if(!response.ok)throw new Error('music-unavailable');
      const data=await response.arrayBuffer();if(disposed)return;bytes=data;status='ready';
      if(unlocked)await start();
    }catch{if(!disposed)status='error';}
  }
  async function start(){
    if(disposed||!unlocked||!context||!bytes||pending)return;
    const current=context;
    pending=(async()=>{
      try{
        if(!buffer)buffer=await current.decodeAudioData(bytes!.slice(0));
        if(disposed||current!==context)return;
        if(!source){
          gain=current.createGain();gain.gain.value=0;pan=current.createStereoPanner();
          recording=current.createMediaStreamDestination();
          source=current.createBufferSource();source.buffer=buffer;source.loop=true;
          source.connect(gain);gain.connect(pan);pan.connect(current.destination);pan.connect(recording);source.start();
        }
        apply();
      }catch{if(!disposed)status='error';}
    })().finally(()=>{pending=null;});
    await pending;
  }
  function apply(){
    const silent=blocked||document.hidden||!preferences.enabled;
    gainValue=silent?0:musicSpatialGain(point,spatial)*preferences.volume*(ducked ? .22 : 1);
    if(!context)return;
    if(gain){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(gainValue,context.currentTime,silent ? .008 : .12);}
    if(pan){const dx=spatial.source[0]-point.x,dz=spatial.source[2]-point.z;
      pan.pan.setTargetAtTime(Math.max(-.65,Math.min(.65,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,Math.hypot(dx,dz)))),context.currentTime,.2);}
    if(silent&&context.state==='running')void context.suspend().catch(()=>{});
    else if(!silent&&unlocked&&context.state==='suspended')void context.resume().catch(()=>{});
  }
  function unlock(event:Event){
    if(disposed||unlocked||!(event instanceof PointerEvent||event instanceof KeyboardEvent))return;
    if(event instanceof KeyboardEvent&&(event.metaKey||event.ctrlKey||event.altKey))return;
    try{context??=new AudioContext();unlocked=true;void context.resume().then(()=>start()).catch(()=>{unlocked=false;});}
    catch{status='error';}
  }
  window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
  void load();
  return {
    update(next:WorldPoint,cameraYaw:number){point=next;yaw=cameraYaw;apply();},
    setBlocked(value:boolean){blocked=value;apply();},
    setDucked(value:boolean){if(value!==ducked){ducked=value;apply();}},
    setPreferences(value:SoundPreferences){preferences=value;apply();},
    retry(){if(status==='error'){bytes=null;buffer=null;void load();}},
    inspect:()=>({status,unlocked,gain:gainValue,playing:!!source&&context?.state==='running'&&gainValue>0,currentTime:context?.currentTime??0}),
    // Preview capture reads the real mix after attenuation; it cannot mutate audio.
    recordingStream:()=>recording?.stream??null,
    dispose(){if(disposed)return;disposed=true;abort.abort();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);
      source?.stop();source?.disconnect();gain?.disconnect();pan?.disconnect();recording?.disconnect();void context?.close().catch(()=>{});
      source=null;buffer=null;bytes=null;context=null;},
  };
}
