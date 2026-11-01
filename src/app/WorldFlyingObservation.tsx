import type { WorldSnapshot } from '../world/types';
import { flyingDialogue } from '../content/world/flying-dialogue';
import { WorldSubtitle } from './WorldSubtitle';
interface Props {
  waitForColor?:boolean; onSkipVoice?():void; state:WorldSnapshot['flying'];
  voice?:WorldSnapshot['flyingVoice']; onRetryVoice?():void;
  paused:boolean; onPause():void; onReplay():void;
}
export function WorldFlyingObservation({state,voice,waitForColor,onSkipVoice,onRetryVoice,paused,onPause,onReplay}:Props){
 const due=!!voice&&(!waitForColor||state?.complete)&&!voice.ended;
 return <>
  {due&&<WorldSubtitle text={flyingDialogue.text} onSkip={()=>onSkipVoice?.()} testId="flying-subtitle"/>}
  {due&&(voice.status==='error'||voice.status==='blocked')&&<div className="world-speech-error" role="status">语音暂不可用 <button type="button" onClick={onRetryVoice}>重试</button></div>}
  <div className="world-observation-tools" data-testid="world-flying-observation" aria-label="壁画演出控制">
   <button type="button" data-testid="flying-pause" onClick={onPause}>{paused?'继续演出':'暂停演出'}</button>
   <button type="button" data-testid="flying-replay" onClick={onReplay}>重播</button>
  </div>
 </>;
}
