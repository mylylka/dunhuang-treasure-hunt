import { useCallback, useEffect, useRef, useState } from 'react';
import {
  finishedMusicGallery, loadMusicGalleryProgress, mergeMusicGalleryProgress, MUSIC_GALLERY_PROGRESS_KEY,
  saveMusicGalleryProgress, withMusicGalleryDiscovery, type MusicGalleryDiscovery, type MusicGalleryProgress,
} from '../services/music-gallery-progress';

export function useMusicGalleryProgress(enabled: boolean) {
  const [data, setData] = useState(() => enabled ? loadMusicGalleryProgress() : null);
  const latest = useRef(data);
  const [saveFailed, setSaveFailed] = useState(false);

  const publish = useCallback((next: MusicGalleryProgress) => {
    latest.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sync = (event: StorageEvent) => {
      if (latest.current && (!event.key || event.key.startsWith(`${MUSIC_GALLERY_PROGRESS_KEY}:`))) {
        publish(mergeMusicGalleryProgress(latest.current, loadMusicGalleryProgress()));
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [enabled, publish]);

  const record = useCallback((discovery: MusicGalleryDiscovery) => {
    const current = latest.current;
    if (!current) return;
    const next = withMusicGalleryDiscovery(current, discovery);
    if (next === current) return;
    const merged = mergeMusicGalleryProgress(next, loadMusicGalleryProgress());
    setSaveFailed(!saveMusicGalleryProgress(merged));
    publish(merged);
  }, [publish]);

  const retry = useCallback(() => {
    if (latest.current) setSaveFailed(!saveMusicGalleryProgress(latest.current));
  }, []);

  const reload = useCallback(() => {
    if (!enabled) return;
    publish(loadMusicGalleryProgress());
    setSaveFailed(false);
  }, [enabled, publish]);

  const unlocked = data !== null && finishedMusicGallery(data);
  return { progress: data, unlocked, pendingAward: unlocked && !data.awardReceived, record, saveFailed, retry, reload };
}

export type MusicGalleryExploration = ReturnType<typeof useMusicGalleryProgress>;
