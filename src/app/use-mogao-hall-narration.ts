import { useLayoutEffect, useRef, useState } from 'react';
import narration from '../content/world/mogao-narration-v001.json';
import type { SoundPreferences } from '../services/sound-settings';
import { createRecordedNarration } from '../world/recorded-narration';
import type { MogaoExhibitHall } from '../world/types';

export function useMogaoHallNarration(hall: MogaoExhibitHall | null, blocked: boolean, sound: SoundPreferences) {
  const voice = useRef<ReturnType<typeof createRecordedNarration<'hall', MogaoExhibitHall>> | null>(null);
  const [finishedHall, setFinishedHall] = useState<MogaoExhibitHall | null>(null);
  const settings = useRef({ blocked, sound });
  settings.current = { blocked, sound };

  useLayoutEffect(() => {
    setFinishedHall(null);
    if (!hall) return;
    // Roaming input unlocks the shared context before the player reaches either hall.
    const track = createRecordedNarration<'hall', MogaoExhibitHall>(settings.current.sound, narration);
    voice.current = track;
    track.setBlocked(settings.current.blocked || document.hidden);
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const step = (now - previous) / 1000;
      previous = now;
      if (!settings.current.blocked && !document.hidden) track.update(step);
    }, 100);
    track.play('hall', hall, () => { window.clearInterval(timer); setFinishedHall(hall); });
    return () => { window.clearInterval(timer); track.cancel(); voice.current = null; };
  }, [hall]);

  useLayoutEffect(() => {
    voice.current?.setPreferences(sound);
    voice.current?.setBlocked(blocked || document.hidden);
  }, [blocked, sound]);
  return !!hall && finishedHall === hall;
}
