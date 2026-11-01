import type { WorldSnapshot } from '../world/types';
import { flyingDialogue } from '../content/world/flying-dialogue';

interface Props {
  state: WorldSnapshot['flying'];
  voice?: WorldSnapshot['flyingVoice'];
  onRetryVoice?(): void;
  paused: boolean;
  onPause(): void;
  onReplay(): void;
  onClose(): void;
}
export function WorldFlyingObservation({state,voice,onRetryVoice,paused,onPause,onReplay,onClose}:Props) {
  return <section className={`world-flying-observation${voice?' has-dialogue':''}`} data-testid="world-flying-observation" aria-label="飞天壁画观察">
    {voice ? <div className="flying-dialogue">
      <p className="flying-speaker">{flyingDialogue.speaker}</p>
      <p className="flying-subtitle" data-testid="flying-subtitle">{flyingDialogue.text}</p>
      {voice.status==='missing' && <p className="flying-voice-note" role="status">字幕预览 · 神女配音待接入</p>}
      {(voice.status==='loading'||voice.status==='ready') && <p className="flying-voice-note">{flyingDialogue.voiceLabel}</p>}
      {(voice.status==='error'||voice.status==='blocked') && <p className="flying-voice-note" role="status">{voice.status==='blocked'?'点击即可播放飞天语音。':'语音暂未加载，可继续阅读字幕。'} <button type="button" onClick={onRetryVoice}>重试语音</button></p>}
    </div> : <div className="flying-caption"><p>乐舞馆 · 飞天壁画</p><h2>{state?.complete?'让视线跟随飘带':'壁画的色彩正在浮现'}</h2>
      <p>看看人物的姿态、手中的乐器，以及飘带的方向。<span>AI教学示意</span></p></div>}
    <div className="flying-actions">
      <button type="button" data-testid="flying-pause" onClick={onPause}>{paused?'继续演出':'暂停演出'}</button>
      <button type="button" data-testid="flying-replay" onClick={onReplay}>重播</button>
      <button type="button" className="world-primary" data-testid="flying-exit" onClick={onClose}>继续漫游 <kbd>Esc</kbd></button>
    </div>
  </section>;
}
