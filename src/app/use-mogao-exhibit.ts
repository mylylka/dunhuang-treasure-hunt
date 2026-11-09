import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { exhibitIdForPanel, type MogaoExhibitPanelId, type MogaoExhibitTarget, type MogaoExhibitWallId } from '../content/world/mogao-exhibit-v001';
import type { MogaoExhibitHall } from '../world/types';
import {
  emptyMogaoHallAProgress, finishedMogaoHallA, loadMogaoHallAProgress,
  saveMogaoHallAProgress, type MogaoHallAProgress, type MogaoMuralCompletionId,
} from '../services/mogao-hall-a-progress';
import {
  emptyMogaoExhibitProgress, finishedMogaoExhibit, loadMogaoExhibitProgress, openedMogaoExhibit,
  saveMogaoExhibitProgress, viewMogaoExhibit, type MogaoExhibitProgress,
} from '../services/mogao-exhibit-progress';

export function useMogaoExhibit(enabled: boolean, walkSurface: string | undefined, active: boolean, scriptedArrival: boolean) {
  const [initial] = useState(() => enabled ? loadMogaoExhibitProgress() : { data: emptyMogaoExhibitProgress(), warning: null });
  const [initialA] = useState(() => enabled ? loadMogaoHallAProgress() : { data: emptyMogaoHallAProgress(), warning: null });
  const progress = useRef(initial.data);
  const progressA = useRef(initialA.data);
  const awardOnGround = useRef(false);
  const [saveWarning, setSaveWarning] = useState(initial.warning);
  const [saveWarningA, setSaveWarningA] = useState(initialA.warning);
  const [gateLocked, setGateLocked] = useState(() => !finishedMogaoExhibit(initial.data));
  const [gateOpen, setGateOpen] = useState(() => finishedMogaoExhibit(initial.data));
  const [hallAGateLocked, setHallAGateLocked] = useState(() => !finishedMogaoHallA(initialA.data));
  const [hallAGateOpen, setHallAGateOpen] = useState(() => finishedMogaoHallA(initialA.data));
  const [intro, setIntro] = useState<{ hall: MogaoExhibitHall; first: boolean } | null>(null);
  const shownThisVisit = useRef<MogaoExhibitHall | null>(null);
  const [panelId, setPanelId] = useState<MogaoExhibitPanelId | null>(null);
  const [wallId, setWallId] = useState<MogaoExhibitWallId | null>(null);
  const inHall = walkSurface === 'hall-b';
  const inMuralHall = walkSurface === 'hall-a';
  const inExhibit = inHall || walkSurface === 'view-link-b' || walkSurface === 'view-b';
  const inMuralExhibit = inMuralHall || walkSurface === 'view-link-a' || walkSurface === 'view-a';
  const visitingHall = inMuralExhibit ? 'hall-a' : inExhibit ? 'hall-b' : null;
  const inHallRoom = inMuralHall || inHall;
  const showHallAWarning = inMuralExhibit || (walkSurface === 'ground' && !!saveWarningA);

  const save = useCallback((next: MogaoExhibitProgress) => {
    const saved = saveMogaoExhibitProgress(next);
    progress.current = saved.data;
    setSaveWarning(saved.warning);
  }, []);
  const saveA = useCallback((next: MogaoHallAProgress) => {
    const saved = saveMogaoHallAProgress(next);
    progressA.current = saved.data;
    setSaveWarningA(saved.warning);
  }, []);

  const completeStory = useCallback((id: MogaoMuralCompletionId) => {
    const previous = progressA.current;
    if (previous.completed.includes(id)) return;
    saveA({ ...previous, completed: [...previous.completed, id] });
    if ((id === 'story-demo' || id === 'novice-story') && !finishedMogaoHallA(previous) && finishedMogaoHallA(progressA.current)) {
      awardOnGround.current = true;
    }
  }, [saveA]);

  const hasOpenedArtwork = useCallback((hall: MogaoExhibitHall) => hall === 'hall-a'
    ? progressA.current.opened || loadMogaoHallAProgress().data.opened
    : openedMogaoExhibit(progress.current) || openedMogaoExhibit(loadMogaoExhibitProgress().data), []);

  const openStory = useCallback(() => {
    setIntro(null);
    if (!progressA.current.opened) saveA({ ...progressA.current, opened: true });
  }, [saveA]);

  useLayoutEffect(() => {
    if (!inHallRoom) {
      if (!visitingHall) shownThisVisit.current = null;
      setIntro(null);
      return;
    }
    if (!enabled || !active || scriptedArrival || !visitingHall || shownThisVisit.current === visitingHall) return;
    shownThisVisit.current = visitingHall;
    setIntro({ hall: visitingHall, first: !hasOpenedArtwork(visitingHall) });
  }, [enabled, active, scriptedArrival, visitingHall, inHallRoom, hasOpenedArtwork]);

  const dismissIntro = useCallback(() => setIntro(null), []);

  useLayoutEffect(() => {
    if (!enabled || !active || !finishedMogaoHallA(progressA.current)) return;
    setHallAGateLocked(false);
    if (awardOnGround.current) setHallAGateOpen(true);
  }, [enabled, active]);

  const select = useCallback((id: MogaoExhibitTarget) => {
    setIntro(null);
    if (id.startsWith('wall-')) {
      if (!openedMogaoExhibit(progress.current)) save({ ...progress.current, wallThemeOpened: true });
      setWallId(id.slice(5) as MogaoExhibitWallId);
      return;
    }
    const panel = id as MogaoExhibitPanelId;
    const updated = viewMogaoExhibit(progress.current, exhibitIdForPanel(panel));
    if (updated !== progress.current) save(updated);
    setPanelId(panel);
  }, [save]);

  const closeExhibit = useCallback(() => {
    setPanelId(null);
    if (finishedMogaoExhibit(progress.current)) setGateLocked(false);
  }, []);

  const canAwardHallAHere = inMuralExhibit || (walkSurface === 'ground' && awardOnGround.current);
  return {
    muralProgress: progressA.current, exhibitProgress: progress.current,
    intro: intro?.hall === walkSurface ? intro : null, dismissIntro, panelId, wallId, gateLocked, hallAGateLocked,
    saveWarning: showHallAWarning ? saveWarningA : saveWarning,
    occupied: panelId !== null || wallId !== null,
    earnedA: hallAGateOpen, earnedB: gateOpen,
    receivedBoth: progressA.current.noticeSeen && progress.current.noticeSeen,
    pendingAward: enabled && hallAGateOpen && canAwardHallAHere && !progressA.current.noticeSeen ? 'hall-a' as const
      : enabled && gateOpen && inExhibit && !progress.current.noticeSeen ? 'hall-b' as const : null,
    select, closeExhibit, hasOpenedArtwork, markIntroShown: (hall: MogaoExhibitHall) => { shownThisVisit.current = hall; },
    gateOpened: () => setGateOpen(true), hallAGateOpened: () => setHallAGateOpen(true), openStory, completeStory,
    retrySave: () => showHallAWarning ? saveA(progressA.current) : save(progress.current),
    closeWall: () => setWallId(null),
    receiveAward: (id: 'hall-a' | 'hall-b') => {
      if (id === 'hall-a') saveA({ ...progressA.current, noticeSeen: true });
      else save({ ...progress.current, noticeSeen: true });
    },
  };
}
