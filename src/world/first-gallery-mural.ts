import { firstGalleryNarration, galleryNarrationHoldSeconds, type FirstGalleryNarrationEnd, type FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import type { GalleryTarget } from '../content/world/first-gallery-v001';
import type { FirstGalleryMuralPart } from '../services/first-gallery';
import {
  FIRST_GALLERY_MURAL_OBSERVER, FIRST_GALLERY_MURAL_TABLE_OBSERVER,
  firstGalleryMuralCameraPose, firstGalleryMuralCameraTransition,
  type FirstGalleryMuralCameraPose,
} from './first-gallery-mural-camera';
import { muralLightTiming } from './first-gallery-mural-light';
import { moveTerrainPlayer, toTerrainPoint } from './terrain-rules-v001';
import type { WorldPoint } from './types';

export { FIRST_GALLERY_MURAL_MARKER_KEY } from '../services/first-gallery-entry';

type Phase = 'idle' | 'invite' | 'wall' | 'outbound' | 'table' | 'bird' | 'return-ready' | 'return-line' | 'returning' | 'face-wall'
  | 'pick' | 'repair' | 'education' | 'renew' | 'summary';
export interface FirstGalleryMuralSnapshot {
  phase: Phase;
  text: string | null;
  narration: FirstGalleryNarrationId | null;
  marker: boolean;
  active: boolean;
  replay: boolean;
}

export const muralObserver = toTerrainPoint('courtyard', FIRST_GALLERY_MURAL_OBSERVER);
const tableObserver = toTerrainPoint('courtyard', FIRST_GALLERY_MURAL_TABLE_OBSERVER);
const enterRadius = .9, leaveRadius = 1.25;
const muralPartCount = 3;
const education: Record<FirstGalleryMuralPart, FirstGalleryNarrationId> = {
  lotus: 'mural-lotus-note',
  bird: 'mural-bird-note',
  grapes: 'mural-grapes-note',
};
const wallSettling = .55, birdSettling = .9;
const tourLines: Partial<Record<Phase, { id: FirstGalleryNarrationId; delay: number; next: Phase }>> = {
  wall: { id: 'mural-wall', delay: wallSettling, next: 'outbound' },
  table: { id: 'mural-table', delay: .3, next: 'bird' },
  bird: { id: 'mural-bird', delay: birdSettling, next: 'return-ready' },
  'return-line': { id: 'mural-return', delay: 0, next: 'returning' },
};
export const MURAL_RENEW_SECONDS = 1.5;
const nextRoundPause = 1;
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const walkLength = distance(muralObserver, tableObserver);

export function createFirstGalleryMural(
  savePart: (part: FirstGalleryMuralPart, replayParts?: readonly FirstGalleryMuralPart[]) => boolean,
  rememberedMarker = false,
) {
  let phase: Phase = 'idle', time = 0, realTime = 0, progress = 0, stalled = 0;
  let replay = false, marker = rememberedMarker, declined = rememberedMarker, waitingForLeave = false;
  let parts: readonly FirstGalleryMuralPart[] = [], picked: FirstGalleryMuralPart | null = null;
  let entryPose: FirstGalleryMuralCameraPose | null = null;
  let feedback: string | null = null;
  let narrationStartedAt: number | null = null, narrationFinishedAt: number | null = null, summaryHold = 0;
  let wallIntroReady = false;
  const active = () => phase !== 'idle' && phase !== 'invite';
  const markerVisible = () => marker && !active();
  const remaining = () => parts.length < muralPartCount;
  const needsLotus = () => !parts.includes('lotus');
  function enter(next: Phase) {
    phase = next;
    time = realTime = progress = stalled = 0;
    feedback = null;
    narrationStartedAt = null;
    narrationFinishedAt = null;
    summaryHold = 0;
  }
  function decline() {
    if (phase !== 'invite') return;
    if (!replay) { declined = true; waitingForLeave = true; }
    replay = false;
    enter('idle');
  }
  function exit() {
    if (!active()) return;
    if (!replay && remaining()) { declined = true; waitingForLeave = true; }
    replay = false;
    entryPose = null;
    enter('idle');
  }
  function narration(): FirstGalleryNarrationId | null {
    if (narrationFinishedAt !== null) return null;
    const tour = tourLines[phase];
    if (tour) return time >= tour.delay && (phase !== 'wall' || wallIntroReady) ? tour.id : null;
    if (phase === 'pick' && remaining()) return needsLotus() ? 'mural-guess' : 'mural-missing';
    if (phase === 'education' && picked) return education[picked];
    return phase === 'summary' ? 'mural-summary' : null;
  }
  function text(line: FirstGalleryNarrationId | null) {
    if (line) return firstGalleryNarration[line].text;
    if (phase === 'summary') return firstGalleryNarration['mural-summary'].text;
    if (phase === 'pick' && narrationFinishedAt !== null && remaining()) {
      return feedback ?? (needsLotus() ? '点一下桌上的莲花试试。' : null);
    }
    return null;
  }
  function finishNarration(reason: FirstGalleryNarrationEnd) {
    narrationFinishedAt = realTime;
    if (phase === 'summary') summaryHold = galleryNarrationHoldSeconds(reason);
  }
  function walk(position: WorldPoint, goal: WorldPoint, dt: number, arrival: Phase) {
    const remaining = distance(position, goal);
    if (remaining < .025) { enter(arrival); return position; }
    if (dt <= 0) return position;
    const speed = Math.min(1.65, .3 + time * 3, Math.max(.28, remaining * 4));
    const scale = Math.min(1, speed * dt / remaining);
    const next = moveTerrainPlayer(position, { x: (goal.x - position.x) * scale, z: (goal.z - position.z) * scale }, true);
    stalled = distance(position, next) < .001 ? stalled + dt : 0;
    if (stalled > .5) exit();
    return next;
  }
  return {
    get active() { return active(); },
    get replay() { return replay; },
    get phase() { return phase; },
    get elapsed() { return time; },
    get marker() { return markerVisible(); },
    snapshot(): FirstGalleryMuralSnapshot {
      const line = narration();
      return { phase, text: text(line), narration: line, active: active(), marker: markerVisible(), replay };
    },
    advanceNarration(reason: FirstGalleryNarrationEnd = 'skipped') {
      if (!narration()) return false;
      // The next frame transitions so walking keeps the visible heading.
      finishNarration(reason);
      return true;
    },
    request(position: WorldPoint, saved: readonly FirstGalleryMuralPart[]) {
      if (phase !== 'idle' || saved.length !== muralPartCount || distance(position, muralObserver) > enterRadius) return;
      replay = true;
      enter('invite');
    },
    decline, exit,
    start(position: WorldPoint, saved: readonly FirstGalleryMuralPart[], pose: FirstGalleryMuralCameraPose) {
      if (phase !== 'invite' || distance(position, muralObserver) > leaveRadius) return false;
      replay = saved.length === muralPartCount;
      parts = replay ? [] : saved;
      marker = declined = waitingForLeave = false;
      entryPose = pose;
      wallIntroReady = false;
      enter('wall');
      return true;
    },
    pick(part: FirstGalleryMuralPart) {
      if (phase !== 'pick' || narration() || parts.includes(part) || (needsLotus() && part !== 'lotus')) return false;
      picked = part;
      enter('repair');
      return true;
    },
    update(position: WorldPoint, dt: number, canInvite: boolean, saved: readonly FirstGalleryMuralPart[], audioManaged = false, facingWall = true, elapsedRealSeconds = dt) {
      time += dt;
      realTime += elapsedRealSeconds;
      if (!active()) {
        const fromObserver = distance(position, muralObserver);
        if (fromObserver > leaveRadius) {
          if (phase === 'invite') enter('idle');
          waitingForLeave = false;
          if (declined && saved.length < muralPartCount) marker = true;
        }
        if (saved.length === muralPartCount) marker = false;
        if (phase === 'idle' && canInvite && !waitingForLeave && saved.length < muralPartCount && fromObserver <= enterRadius) {
          replay = false;
          enter('invite');
        }
        return position;
      }
      if (!replay && phase !== 'repair') parts = saved;
      if (phase === 'wall' && time >= wallSettling && facingWall) wallIntroReady = true;
      const tour = tourLines[phase];
      if (!audioManaged) {
        const line = narration();
        if (line) {
          narrationStartedAt ??= time;
          if (time - narrationStartedAt >= firstGalleryNarration[line].duration) finishNarration('finished');
        }
      }
      const narrationFinished = narrationFinishedAt !== null;
      const timeAfterNarration = narrationFinishedAt === null ? 0 : realTime - narrationFinishedAt;
      if (tour && narrationFinished) {
        enter(tour.next);
        return position;
      }
      switch (phase) {
        case 'outbound': {
          const next = walk(position, tableObserver, dt, 'table');
          progress = 1 - distance(next, tableObserver) / walkLength;
          return next;
        }
        case 'return-ready': if (time >= .85) enter('return-line'); break;
        case 'returning': {
          const next = walk(position, muralObserver, dt, 'face-wall');
          progress = 1 - distance(next, muralObserver) / walkLength;
          return next;
        }
        case 'face-wall':
          if (facingWall) enter('pick');
          break;
        case 'pick':
          if (!remaining()) enter('renew');
          else if (time >= 2.6) feedback = null;
          break;
        case 'repair': {
          if (!picked) break;
          const { awake, flow, wall } = muralLightTiming(picked);
          if (time >= awake + flow + wall) {
            const next = [...parts, picked];
            if (savePart(picked, replay ? next : undefined)) {
              parts = next;
              enter('education');
            } else {
              enter('pick');
              narrationFinishedAt = realTime;
              feedback = '这处暂时没能保存，请再点一次试试。';
            }
          }
          break;
        }
        case 'education':
          if (narrationFinished) {
            if (!remaining()) enter('renew');
            else if (timeAfterNarration >= nextRoundPause) enter('pick');
          }
          break;
        case 'renew': if (time >= MURAL_RENEW_SECONDS) enter('summary'); break;
        case 'summary': if (narrationFinished && timeAfterNarration >= summaryHold) exit(); break;
      }
      return position;
    },
    gaze(): GalleryTarget | null {
      switch (phase) {
        case 'wall': return 'wall';
        case 'table': return 'lotus';
        case 'bird': return 'bird';
        case 'return-ready':
        case 'return-line':
        case 'face-wall': return 'wall';
        case 'pick': return needsLotus() ? (narrationFinishedAt !== null ? 'lotus' : 'wall-lotus') : 'wall';
        case 'repair': return picked ? `wall-${picked}` : 'wall';
        case 'education': return 'wall';
        case 'summary': return 'wall';
        default: return null;
      }
    },
    camera(aspect: number, reduced: boolean) {
      if (!active() || !entryPose) return null;
      const shot = (name: Parameters<typeof firstGalleryMuralCameraPose>[0]) => firstGalleryMuralCameraPose(name, aspect);
      const blend = (from: FirstGalleryMuralCameraPose, to: FirstGalleryMuralCameraPose, t: number) => reduced ? to : firstGalleryMuralCameraTransition(from, to, t);
      switch (phase) {
        case 'wall': return reduced ? shot('wall') : firstGalleryMuralCameraTransition(entryPose, shot('wall'), time / wallSettling, { slerpView: true });
        case 'outbound': return blend(shot('wall'), shot('table'), progress);
        case 'table': return shot('table');
        case 'bird': return blend(shot('table'), shot('bird'), time / birdSettling);
        case 'return-ready': return blend(shot('bird'), shot('farewell'), time / .85);
        case 'return-line': return shot('farewell');
        case 'returning': return blend(shot('farewell'), shot('overview'), progress);
        default: return shot('overview');
      }
    },
  };
}
