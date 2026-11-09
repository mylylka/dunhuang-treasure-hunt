import { useState } from 'react';
import { getMogaoHallAStory, type MogaoHallAStoryId } from '../content/world/mogao-hall-a-story';
import type { SoundPreferences } from '../services/sound-settings';
import { WorldStoryPlayer } from './WorldStoryPlayer';

interface Props {
  id: MogaoHallAStoryId;
  backdrop?: string;
  blocked: boolean;
  reducedMotion: boolean;
  sound: SoundPreferences;
  onComplete(): void;
  onClose(): void;
}

export default function MogaoHallAStory({ id, backdrop, blocked, reducedMotion, sound, onComplete, onClose }: Props) {
  const [mobile] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  return <WorldStoryPlayer story={getMogaoHallAStory(id, mobile)} backdrop={backdrop} exhibitNarration
    blocked={blocked} paused={blocked} reducedMotion={reducedMotion} sound={sound}
    onClose={onClose} onComplete={onComplete} />;
}
