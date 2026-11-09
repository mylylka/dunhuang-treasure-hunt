import { GALLERY_INTRO, GALLERY_TARGETS, type GalleryInteraction, type GalleryLine } from '../content/world/first-gallery-v001';
import { fromTerrainPoint } from './terrain-rules-v001';
import { muralObserver, type FirstGalleryMuralSnapshot } from './first-gallery-mural';
import type { WorldPoint } from './types';

export interface FirstGallerySnapshot {
  nearby: GalleryInteraction | null;
  easelReady: boolean;
  line: GalleryLine | null;
  cue: GalleryLine | null;
  cueId: number;
  gate: string | null;
  betweenLines: boolean;
  mural?: FirstGalleryMuralSnapshot;
  muralPreparation?: 'loading' | 'failed';
}
export function galleryNearby(point: WorldPoint): GalleryInteraction | null {
  const p = fromTerrainPoint('courtyard', point);
  const distance = (target: keyof typeof GALLERY_TARGETS) => Math.hypot(point.x - GALLERY_TARGETS[target].x, point.z - GALLERY_TARGETS[target].z);
  if (distance('easel') < 4.0) return 'easel';
  if (Math.hypot(point.x - muralObserver.x, point.z - muralObserver.z) <= .9) return 'mural';
  const caissonDepth = p.z + 15;
  // Extend only the entrance-facing edge, by two of the hall's 17/13 m tiles.
  const approachReach = caissonDepth > 0 ? 3.9 + 2 * (17 / 13) : 3.9;
  if (Math.hypot((p.x + 12) / 3.9, caissonDepth / approachReach) < 1) return 'caisson';
  if (distance('scroll') < 3.0) return 'scroll';
  return null;
}
/** Whole building footprints, including side/rear approaches, share the same
 * progress check as the routes. The path remains continuous outside them. */
export function galleryBlockedRegion(point: WorldPoint, unlocked: boolean, cliffUnlocked = false): 'music' | 'stories' | null {
  const cliff = fromTerrainPoint('cliff', point);
  if (!cliffUnlocked && cliff.x > 86 && cliff.x < 158 && cliff.z > -137 && cliff.z < 30) return 'stories';
  const music = fromTerrainPoint('music', point);
  if (!unlocked && music.x > 25 && music.x < 80 && music.z > -42 && music.z < 13) return 'music';
  return null;
}
/** One short cue at a time. No timers survive leaving or a new input. */
export function createFirstGalleryEvents(initialSeen: readonly GalleryInteraction[] = []) {
  const seen = new Set<GalleryInteraction>(initialSeen);
  let nearby: GalleryInteraction | null = null, queue: readonly GalleryLine[] = [], index = 0, time = 0, still = 0, cueId = 0;
  let introduction: GalleryInteraction | null = null, finishedIntroduction: GalleryInteraction | null = null;
  let gate: string | null = null, gateTime = 0;
  let easelCompleted = false;
  let retainWhileMoving = false;
  let pauseRemaining = 0;
  const current = () => queue[index] ?? null;
  function cancel() { introduction = null; queue = []; index = 0; time = 0; still = 0; pauseRemaining = 0; retainWhileMoving = false; cueId++; }
  function say(lines: readonly GalleryLine[], retain = false) { introduction = null; queue = lines; index = 0; time = 0; pauseRemaining = 0; cueId++; retainWhileMoving = retain; }
  function nextCue() {
    index++; time = 0; cueId++;
    if (!current()) {
      retainWhileMoving = false;
      if (introduction) {
        seen.add(introduction);
        finishedIntroduction = introduction;
        introduction = null;
      }
    }
  }
  function advanceCue() {
    const line = current();
    if (!line || pauseRemaining > 0) return false;
    if (line.pauseAfter && index + 1 < queue.length) {
      pauseRemaining = line.pauseAfter;
      cueId++;
    } else nextCue();
    return true;
  }
  return {
    cancel, say, advanceCue,
    cancelOnMotion() { if (!retainWhileMoving) cancel(); },
    consumeIntroduction() { const id = finishedIntroduction; finishedIntroduction = null; return id; },
    block(region: 'music' | 'stories' | 'third-locked' | 'loading' | 'failed') {
      gate = {
        music: '完成第一馆的三项探索，便可前往乐舞坊。',
        stories: '这座洞窟将在后续章节开放。',
        'third-locked': '完成第二馆的三项探索，便可前往九层楼。',
        loading: '前方场馆正在准备。',
        failed: '前方场馆暂未载入，可以继续探索附近。',
      }[region];
      gateTime = 3;
    },
    update(point: WorldPoint, moving: boolean, dt: number, completed: { mural: boolean; caisson: boolean; easel: boolean; unlocked: boolean }, allowIntroduction = true, audioManaged = false, elapsedSeconds = dt) {
      easelCompleted = completed.easel;
      const next = galleryNearby(point);
      if (next !== nearby) { cancel(); nearby = next; }
      gateTime -= dt; if (gateTime <= 0) gate = null;
      if (moving) {
        still = 0;
        if (!retainWhileMoving) { if (current()) cancel(); return; }
      } else still += dt;
      if (allowIntroduction && !current() && nearby === 'easel' && still > .7 && !easelCompleted && !seen.has('easel')) {
        say(GALLERY_INTRO.easel);
        introduction = 'easel';
      }
      if (current()) {
        if (pauseRemaining > 0) {
          pauseRemaining = Math.max(0, pauseRemaining - elapsedSeconds);
          if (pauseRemaining === 0) nextCue();
          return;
        }
        time += dt;
        const line = current()!;
        if (!(audioManaged && line.narration) && time > (line.duration ?? 3.8) + .55) advanceCue();
      }
    },
    snapshot(): FirstGallerySnapshot {
      const cue = current();
      const betweenLines = pauseRemaining > 0;
      return { nearby, easelReady: easelCompleted || seen.has('easel'),
        line: !betweenLines && (cue?.narration || time >= .55) ? cue : null, cue, cueId, gate, betweenLines };
    },
  };
}
