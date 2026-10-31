import type { WorldSnapshot } from '../world/types';

interface Props {
  state: WorldSnapshot['flying'];
  paused: boolean;
  onPause(): void;
  onReplay(): void;
  onClose(): void;
}
export function WorldFlyingObservation({state,paused,onPause,onReplay,onClose}:Props) {
  return <section className="world-flying-observation" data-testid="world-flying-observation" aria-label="飞天壁画观察">
    <div className="flying-caption"><p>乐舞馆 · 飞天壁画</p><h2>{state?.complete?'让视线跟随飘带':'壁画的色彩正在浮现'}</h2>
      <p>看看人物的姿态、手中的乐器，以及飘带的方向。<span>AI教学示意</span></p></div>
    <div className="flying-actions">
      <button type="button" data-testid="flying-pause" onClick={onPause}>{paused?'继续演出':'暂停演出'}</button>
      <button type="button" data-testid="flying-replay" onClick={onReplay}>重播</button>
      <button type="button" className="world-primary" data-testid="flying-exit" onClick={onClose}>继续漫游 <kbd>Esc</kbd></button>
    </div>
  </section>;
}
