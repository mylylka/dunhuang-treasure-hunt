import { useLayoutEffect, useRef, useState } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import narration from '../content/world/mogao-narration-v001.json';
import type { SoundPreferences } from '../services/sound-settings';
import { createFlyingVoice } from '../world/flying-voice';
import type { MogaoExhibitHall } from '../world/types';
import { listenForSoundGestures } from './useSound';

export function useMogaoHallNarration(hall: MogaoExhibitHall | null, blocked: boolean, sound: SoundPreferences) {
  const voice = useRef<ReturnType<typeof createFlyingVoice> | null>(null);
  const [finishedHall, setFinishedHall] = useState<MogaoExhibitHall | null>(null);
  const settings = useRef({ blocked, sound });
  settings.current = { blocked, sound };

  useLayoutEffect(() => {
    setFinishedHall(null);
    if (!hall) return;
    const { path, duration } = narration[hall];
    const track = createFlyingVoice(() => new Audio(worldAssetUrl(path)), settings.current.sound, { keyboardSkip: false });
    voice.current = track;
    track.setBlocked(settings.current.blocked || document.hidden);
    track.enter();
    track.update(true);
    const release = listenForSoundGestures({
      unlock: async () => { if (track.inspect().status === 'blocked') track.retry(); },
      stop: () => track.setBlocked(true),
    });
    let elapsed = 0, stalled = 0, cursor = 0, previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const step = (now - previous) / 1000;
      previous = now;
      if (settings.current.blocked || document.hidden) return;
      const playback = track.inspect();
      elapsed += step;
      stalled = playback.currentTime === cursor ? stalled + step : 0;
      cursor = playback.currentTime;
      // An unavailable recording leaves the same amount of time to read the introduction.
      if (playback.ended || (elapsed >= duration && (stalled >= 4 || playback.status === 'error' || playback.status === 'blocked'))) {
        if (!playback.ended) track.exit();
        window.clearInterval(timer);
        setFinishedHall(hall);
      }
    }, 100);
    return () => { window.clearInterval(timer); release(); track.dispose(); voice.current = null; };
  }, [hall]);

  useLayoutEffect(() => {
    voice.current?.setPreferences(sound);
    voice.current?.setBlocked(blocked || document.hidden);
  }, [blocked, sound]);
  return !!hall && finishedHall === hall;
}
