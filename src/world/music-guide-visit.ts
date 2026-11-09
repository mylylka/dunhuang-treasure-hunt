import { MUSIC_GUIDE_LINES, type MusicGuideLineId, type MusicGuideOutfitId } from '../content/world/music-guide-v001';

export interface MusicGuideSnapshot {
  outfit: MusicGuideOutfitId;
  nearby: boolean;
  atBirthplace: boolean;
  following: boolean;
  canDress: boolean;
  line: MusicGuideLineId | null;
  subtitleOnly?: boolean;
  invitation: boolean;
  approaching?: boolean;
  showcasing?: boolean;
}

export function createMusicGuideVisit(openWardrobe: () => void, options: { firstApproach?: boolean; captionSynchronized?: boolean } = {}) {
  const fresh = (): MusicGuideSnapshot => ({ outfit: 'plain', nearby: false, atBirthplace: false, following: false, canDress: false, line: null, invitation: false });
  let state = fresh();
  let welcomed = false, introduced = false, followed = false, upstairs = false;
  let lineRemaining = 0;
  let captionPresented = false, voicePlaying = false;
  let firstApproach = !!options.firstApproach, firstWelcome = false, approaching = false;

  function speak(line: MusicGuideLineId) {
    state.line = line;
    lineRemaining = MUSIC_GUIDE_LINES[line].seconds;
    captionPresented = voicePlaying = false;
  }

  function finishLine(expected?: MusicGuideLineId) {
    if (!state.line || (expected && state.line !== expected)) return;
    if (state.line === 'welcome' && firstWelcome) approaching = true;
    firstWelcome = false;
    if (state.line === 'intro' && state.nearby && state.atBirthplace) state.invitation = true;
    state.line = null;
  }

  function invite() {
    if (!introduced) { introduced = true; speak('intro'); }
    else state.invitation = true;
  }
  const subtitleOnly = () => !followed && state.line === 'upstairs';

  return {
    inspect: () => ({ ...state, nearby: !approaching && state.nearby, approaching, subtitleOnly: subtitleOnly(), following: followed, canDress: followed && state.nearby && state.atBirthplace }),
    get speechLine() { return subtitleOnly() ? null : state.line; },
    get following() { return followed; },
    get nearby() { return !approaching && state.nearby; },
    get approaching() { return approaching; },
    get waitingForApproach() { return firstWelcome || approaching; },
    finishApproach(arrived: boolean) {
      approaching = false;
      if (arrived) firstApproach = false;
    },
    setCaptionPresented(line: MusicGuideLineId, presented: boolean) {
      if (state.line === line) captionPresented = presented;
    },
    setVoicePlaying(line: MusicGuideLineId, playing: boolean) {
      if (state.line === line) voicePlaying = playing;
    },
    update(dt: number, context: { entered: boolean; nearby: boolean; atBirthplace: boolean; upstairs: boolean; onUpperFloor: boolean; canApproach?: boolean }) {
      state.nearby = context.nearby;
      state.atBirthplace = context.atBirthplace;
      if (!context.nearby || !context.atBirthplace) state.invitation = false;
      if (state.line === 'upstairs' && !context.onUpperFloor) state.line = null;
      if (state.line && (!options.captionSynchronized || (captionPresented && !voicePlaying)) && (lineRemaining -= dt) <= 0) finishLine();
      if (!welcomed && context.entered) {
        welcomed = true;
        firstWelcome = firstApproach && !!context.canApproach;
        speak('welcome');
      } else if (!state.line && !approaching) {
        if (welcomed && !introduced && context.nearby && context.atBirthplace) invite();
        else if (!upstairs && context.upstairs) {
          upstairs = true;
          speak('upstairs');
        }
      }
    },
    interact() {
      if (approaching || !state.nearby || !state.atBirthplace || !welcomed) return;
      if (followed) { state.line = null; openWardrobe(); }
      else if (!state.line) invite();
    },
    respond(response: 'dress' | 'plain' | 'dismiss') {
      const invited = state.invitation;
      state.invitation = false;
      if (!invited) return;
      if (response === 'dress' && state.atBirthplace && state.nearby) openWardrobe();
      if (response === 'plain') followed = true;
    },
    finishLine,
    cancelLine() { state.line = null; firstWelcome = false; },
    finishOutfitChange(outfit: MusicGuideOutfitId, revealing: boolean) {
      state.outfit = outfit;
      followed = true;
      if (revealing) state.line = null;
      else speak('ready');
    },
    announceOutfitReady() { speak('ready'); },
    reset() {
      state = fresh();
      welcomed = introduced = followed = upstairs = false;
      firstWelcome = approaching = false;
      lineRemaining = 0;
    },
  };
}
