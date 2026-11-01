import { WorldSubtitle } from './WorldSubtitle';
import { registerSpeechSkip } from '../services/speech-skip';
import { useEffect, useRef, useState } from 'react';
import { worldStoryPreview } from '../content/world/stories';
import type { SoundPreferences } from '../services/sound-settings';

interface Props { paused: boolean; blocked?: boolean; sound: SoundPreferences; onClose(): void; onComplete():void; onPause(paused: boolean): void }

/** The scene behind this overlay is frozen by WorldScreen. Images keep their original ratio. */
export function WorldStoryPlayer({ paused, blocked = false, sound, onClose, onComplete, onPause }: Props) {
  const [index, setIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [replay, setReplay] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const segment = index < 0 ? null : worldStoryPreview.segments[index];
  const artwork = segment?.image ?? worldStoryPreview.fullImage;
  const readingDuration = segment ? Math.max(14, segment.text.length / 5) : 0;

  // A global pause/orientation cover owns focus while present. Local story pause
  // keeps its controls usable; releasing the cover returns focus to this dialog.
  useEffect(() => { if (!blocked) panel.current?.focus({ preventScroll: true }); }, [blocked]);
  useEffect(() => { setElapsed(0); setImageError(false); setAudioError(false); }, [index, replay]);
  useEffect(() => {
    if (!segment?.audioUrl) return;
    const audio = new Audio(segment.audioUrl);
    audio.preload = 'auto';
    audioRef.current = audio;
    const failed = () => setAudioError(true);
    audio.addEventListener('error', failed);
    return () => {
      audio.pause(); audio.removeEventListener('error', failed);
      audio.removeAttribute('src'); audio.load(); audioRef.current = null;
    };
  }, [segment, replay]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = sound.volume; audio.muted = !sound.enabled;
    if (paused || audioError) audio.pause();
    else void audio.play().catch(() => { if (audioRef.current === audio) setAudioError(true); });
  }, [paused, sound, segment, replay, audioError]);
  useEffect(() => {
    if (paused || !segment) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(.3, (now - last) / 1000); last = now;
      setElapsed(value => Math.min(readingDuration, value + delta));
    }, 200);
    return () => clearInterval(timer);
  }, [paused, segment, replay, readingDuration]);
  const skipRef=useRef<()=>boolean>(()=>false);
  skipRef.current=()=>{
    if(!segment||blocked||paused)return false;
    audioRef.current?.pause();
    if(index<worldStoryPreview.segments.length-1)move(index+1);else onComplete();
    return true;
  };
  useEffect(()=>registerSpeechSkip(()=>skipRef.current()),[]);
  function move(next: number) { setIndex(next); onPause(false); }
  return <section className="world-story" role="dialog" aria-modal="true" aria-labelledby="world-story-title" tabIndex={-1} ref={panel} data-testid="world-story" inert={blocked ? true : undefined}
    onKeyDown={event => {
      if (blocked) return;
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header className="world-story-heading"><div><p>两段技术预览 · 正式旁白待配</p><h2 id="world-story-title">九色鹿 · 故事播放器预览</h2></div><button onClick={onClose} type="button">退出故事</button></header>
    <figure className={`world-story-art${segment ? '' : ' is-scroll'}`}>
      <img key={`${artwork.url}-${replay}`} src={artwork.url} alt={artwork.alt} onError={() => setImageError(true)} />
      {imageError && <div className="world-media-error" role="alert"><p>画面暂未加载，仍可阅读故事。</p><button type="button" onClick={() => setReplay(value => value + 1)}>重试图片</button></div>}
    </figure>
    <div hidden data-testid="world-story-step" data-index={index}/>
    {segment&&!blocked&&<WorldSubtitle text={segment.text} onSkip={()=>skipRef.current()}/>}
    {audioError&&!blocked&&<div className="world-speech-error" role="status">旁白暂不可用，可按空格继续。</div>}
    <footer className="world-story-controls">
      {segment ? <>
        <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>上一段</button>
        <button type="button" onClick={() => onPause(!paused)}>{paused ? '继续播放' : '暂停'}</button>
        <button type="button" onClick={() => { setReplay(value => value + 1); onPause(false); }}>重播</button>
        <div className="world-story-progress" aria-label={`第${index + 1}段，共2段`}><span>{index + 1} / 2 · 空格跳过当前段</span><progress value={elapsed} max={readingDuration} /></div>
        {index < worldStoryPreview.segments.length - 1 ? <button type="button" className="world-primary" onClick={() => move(index + 1)}>下一段</button> : <button type="button" className="world-primary" onClick={onComplete}>结束预览</button>}
      </> : <button type="button" className="world-primary" data-testid="world-story-start" onClick={() => move(0)}>开始两段预览</button>}
    </footer>
  </section>;
}
