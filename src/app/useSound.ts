import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { soundPlayer, type SoundPlayer } from '../services/sound';
import { loadSoundSettings, saveSoundSettings, type SoundPreferences } from '../services/sound-settings';

/** Touch activation happens on release; a touch pointerdown alone cannot unlock Safari audio. */
export function listenForSoundGestures(player: Pick<SoundPlayer, 'unlock' | 'stop'> = soundPlayer): () => void {
  const unlock = (event: Event) => { if (event.isTrusted) void player.unlock(); };
  const mouseDown = (event: PointerEvent) => { if (event.pointerType === 'mouse') unlock(event); };
  const pointerUp = (event: PointerEvent) => { if (event.pointerType !== 'mouse') unlock(event); };
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key.startsWith('Arrow') || /^Key[WASD]$/.test(event.code)) unlock(event);
  };
  const visibility = () => { if (document.hidden) player.stop(); };
  const leavePage = () => player.stop();
  document.addEventListener('pointerdown', mouseDown, true);
  document.addEventListener('pointerup', pointerUp, true);
  document.addEventListener('touchend', unlock, { capture: true, passive: true });
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', handleKey, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', leavePage);
  window.addEventListener('pagehide', leavePage);
  return () => {
    document.removeEventListener('pointerdown', mouseDown, true);
    document.removeEventListener('pointerup', pointerUp, true);
    document.removeEventListener('touchend', unlock, true);
    document.removeEventListener('click', unlock, true);
    document.removeEventListener('keydown', handleKey, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', leavePage);
    window.removeEventListener('pagehide', leavePage);
    player.stop();
  };
}

/** Audio preferences are independent from game progress, artwork and teaching records. */
export function useSound() {
  const [initial] = useState(() => loadSoundSettings());
  const [preferences, setPreferences] = useState(initial.data);
  const preferencesRef = useRef(preferences);
  const [warning, setWarning] = useState(initial.warning);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    soundPlayer.setPreferences(preferencesRef.current);
    return listenForSoundGestures();
  }, []);

  const persist = useCallback((next: SoundPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    // Muting applies immediately, even when browser storage refuses the write.
    soundPlayer.setPreferences(next);
    if (next.enabled && next.volume > 0) void soundPlayer.unlock();
    const result = saveSoundSettings(next);
    setSaveError(result.ok ? null : result.message);
    if (result.ok) setWarning(null);
  }, []);

  const onInterfaceClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('button, a[href], input[type="checkbox"]');
    if (!control || control.closest('[data-sound="none"]') || control.matches(':disabled, [aria-disabled="true"]')) return;
    soundPlayer.play('button');
  }, []);

  return {
    preferences, warning, saveError, onInterfaceClick,
    update: (change: Partial<Pick<SoundPreferences, 'enabled' | 'volume'>>) => persist({ ...preferencesRef.current, ...change }),
    retry: () => persist(preferencesRef.current),
    preview: () => { void soundPlayer.unlock(); soundPlayer.play('button'); },
  };
}
