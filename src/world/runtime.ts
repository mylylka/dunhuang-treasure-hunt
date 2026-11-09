import { createFirstGalleryGaze } from './first-gallery-gaze';
import { createFirstGalleryDisplay } from './first-gallery-display';
import { createFirstGalleryEvents, galleryBlockedRegion, galleryNearby } from './first-gallery-events';
import { connectedGalleryAt, connectedGalleryBlockedRegion, connectedGalleryStartCheckpoint, isMogaoWalkSurface, isMusicWalkSurface, sanitizeConnectedGalleryCheckpoint } from './connected-gallery-session';
import { createFirstGalleryMural, FIRST_GALLERY_MURAL_MARKER_KEY, MURAL_RENEW_SECONDS, muralObserver } from './first-gallery-mural';
import { firstGalleryCaissonCameraPose, GALLERY_CAISSON_CAMERA_SECONDS, galleryCaissonCoreVisible, projectGalleryCaissonQuad } from './first-gallery-caisson-camera';
import { firstGalleryMuralCameraTransition, type FirstGalleryMuralCameraPose } from './first-gallery-mural-camera';
import { createGalleryPortalWalk, GALLERY_PORTAL_PRELUDE, galleryPortalPreludePhase } from './first-gallery-portal';
import { GALLERY_INTRO, GALLERY_TARGETS, type GalleryTarget } from '../content/world/first-gallery-v001';
import { createFirstGalleryNarration } from './first-gallery-narration';
import type { FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import { completeGalleryMuralPart, loadFirstGallery, subscribeFirstGallery, isFirstGalleryUnlocked, markGalleryIntroductionSeen } from '../services/first-gallery';
import { createMusicCompanionV2 } from './companion-follow-v002';
import { companionPreviewCheckpointV2, musicGuidePreviewCheckpoint, sanitizeMusicCompanionCheckpoint } from './music-companion-session-v002';
import { createMusicGuideVisit } from './music-guide-visit';
import { hasApproachedMusicGalleryGuide, rememberMusicGalleryGuideApproach } from '../services/music-gallery-progress';
import { musicGuideBlockedByTraveler, musicGuideShowcasePose } from './music-guide-visibility';
import { MUSIC_GUIDE_STATION } from '../content/world/music-guide-v001';
import { createMusicInteriorNavigation, legacyMusicInteriorNavigation, MUSIC_INTERIOR_LAYOUT } from './music-interior-navigation';
import { createMusicInteriorCameraSpace, musicInteriorFollowPose, settleMusicInteriorCamera } from './music-interior-camera';
import { MUSIC_INSTRUMENT_DISPLAY_SOLIDS } from '../content/world/music-instrument-display-layout-v001';
import { getMusicInteriorStairOptions, startMusicInteriorStairAssist, advanceMusicInteriorStairAssistFrame, advanceMusicInteriorWalkAssistFrame, type MusicInteriorStairAssistState, type MusicInteriorWalkAssistState } from './music-interior-stair-assist';
import { getUpperStairOptions, startUpperStairAssist, advanceUpperStairAssistFrame, isUpperStairAssistArea, type UpperStairAssistState } from './mogao-upper-stair-assist';
import { createMogaoGroundGuidance } from './mogao-ground-guidance';
import upperLayout from '../content/world/mogao-upper-v002.json';
import { moveUpperPlayer, upperFloorHeight } from './mogao-upper-navigation';
import { UPPER_SESSION_OPTIONS, upperPreviewCheckpoint } from './mogao-upper-session';
import { createMogaoGamePortal, nearMogaoGamePortal } from './mogao-game-portal';
import { createGalleryGamePortal } from './first-gallery-portal-light';
import { MUSIC_GAME_PORTAL_CENTER, nearMusicGamePortal } from './music-game-portal';
import { mogaoExhibitStartCheckpoint, restrictMogaoExhibitCheckpoint } from './mogao-exhibit-session';
import { advanceMogaoHallArrival, createMogaoHallArrival, findMogaoHallArrival, isMogaoHallAtDoor, mogaoHallArrivalDelta, mogaoHallTitleCamera, mogaoHallTitleYaw, type MogaoHallArrival } from './mogao-exhibit-arrival';
import { worldPreviewResourceProfile } from './preview-resource-profile';
import { upperFollowPose, settleUpperCamera, isUpperStairSurface } from './mogao-upper-camera';
import { TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { toTerrainPoint } from '../content/world/terrain-layout-v001';
import companionConfig from '../content/world/music-companion-v001.json';
import { createMusicCompanion } from './companion-follow';
import { createCompanionSpeech } from './companion-speech';
import { companionPreviewCheckpoint } from './music-companion-session';
import { terrainCanHearMusic, terrainMusicSpatial } from './terrain-events-v001';
import { TERRAIN_BOUNDS, TERRAIN_PLAYER_COLLIDERS, TERRAIN_SPAWN, TERRAIN_RUN_SPEED, TERRAIN_WALK_SPEED, fromTerrainPoint, terrainSurfaceHeight, terrainRegionAt, moveTerrainPlayer, sanitizeTerrainPosition } from './terrain-rules-v001';
import { terrainCameraSpace, terrainFollowPose, terrainPose, settleTerrainCamera, terrainLocalCamera, TERRAIN_OVERVIEW, ENVIRONMENT_OVERVIEW } from './terrain-camera-v001';
import {mogaoCameraSpace as mogaoCameraSpaceV11,mogaoFollowPose as mogaoFollowPoseV11,settleStairCamera} from './mogao-camera-v011';
import * as mogaoV11Rules from './mogao-rules-v011';
import {explorationLookTarget,MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK} from './exploration-look';
import { cameraZoomOffset, zoomFollowPose } from './follow-camera-zoom';
import { pickDiscoveryAt } from './discovery-picking';
import { buddhaNarrationFor } from '../content/world/buddha-narration';
import { BUDDHA_HEAD, buddhaDominatesView, centeredBuddhaHead, createBuddhaGaze } from './buddha-gaze';
import {createHallArrival} from './hall-arrival';
import {mogaoCameraSpace as mogaoCameraSpaceV8,mogaoFollowPose as mogaoFollowPoseV8} from './mogao-camera-v008';
import * as mogaoV8Rules from './mogao-rules-v008';
import {mogaoCameraSpace as mogaoCameraSpaceV7,mogaoFollowPose as mogaoFollowPoseV7} from './mogao-camera-v007';
import * as mogaoV7Rules from './mogao-rules-v007';
import * as mogaoV6Rules from './mogao-rules-v006';
import {mogaoCameraSpace as mogaoCameraSpaceV6,mogaoFollowPose as mogaoFollowPoseV6} from './mogao-camera-v006';
import {mogaoSurfaceHeightV4} from './mogao-surface-v004';
import * as mogaoV3Rules from './mogao-rules-v003';
import {mogaoCameraSpace as mogaoCameraSpaceV3,mogaoFollowPose as mogaoFollowPoseV3} from './mogao-camera-v003';
import * as mogaoV1Rules from './mogao-rules-v001';
import * as mogaoV2Rules from './mogao-rules-v002';
import { mogaoCameraSpace as mogaoCameraSpaceV2, mogaoFollowPose as mogaoFollowPoseV2 } from './mogao-camera-v002';
import { mogaoCameraSpace, mogaoFollowPose } from './mogao-camera-v001';
import { createMusicEncounters, nearMuralSteps } from './music-encounters';
import { musicEncounters } from '../content/world/music-encounters';
import { registerSpeechSkip } from '../services/speech-skip';
import { MUSIC_PLAYER_COLLIDERS_V4, MUSIC_LAYOUT_V4, nearFlyingMuralV4, musicSurfaceHeightV4, inMusicCourtV4 } from './music-pavilion-rules-v004';
import { musicCameraSpaceV4, flyingCameraPoseV4 } from './music-pavilion-v004';
import { MUSIC_PLAYER_COLLIDERS_V2, MUSIC_LAYOUT_V2, nearFlyingMuralV2, musicSurfaceHeightV2, inMusicCourtV2 } from './music-pavilion-rules-v002';
import { MUSIC_PLAYER_COLLIDERS_V3, MUSIC_LAYOUT_V3, inMusicCourtV3 } from './music-pavilion-rules-v003';
import { musicCameraSpaceV3, flyingCameraPoseV3 } from './music-pavilion-v003';
import { musicCameraSpaceV2, flyingCameraPoseV2 } from './music-pavilion-v002';
import { createTravelCamera, normalizedYaw } from './travel-camera';
import { flyingDialogue } from '../content/world/flying-dialogue';
import { TERRAIN_TRAVELER_MODEL, worldAssetUrl } from '../content/world/assets';
import { createFlyingVoice } from './flying-voice';
import { createFlyingHistory } from './flying-history';
import { createMusicArrivalAudio } from './music-arrival-audio';
import { defaultSoundPreferences } from '../services/sound-settings';
import { soundPlayer } from '../services/sound';
import * as THREE from 'three';
import { MUSIC_PLAYER_COLLIDERS, nearFlyingMural, musicSurfaceHeight } from './music-pavilion-rules';
import { musicCameraSpace, flyingCameraPose } from './music-pavilion';
import { createArtSampleScene } from './art-sample';
import { createWorldInput, type WorldInputPoint } from './input';
import { characterCameraPose, createCinematicDirector, openingHeading, openingDistance } from './character-cinematics';
import { caissonCameraPose, clearCameraPosition, followCameraPose, settleFollowCamera } from './camera';
import { clampCameraYaw, movePlayer, movementVector, RUN_SPEED, sanitizePosition, surfaceHeight, WALK_SPEED, WORLD_SPAWN, WORLD_COLLIDERS } from './movement';
import type { DiscoveryId, MogaoExhibitHall, WorldCheckpoint, WorldRuntime, WorldRuntimeOptions, WorldSnapshot, WorldView } from './types';

export function createWorldRuntime(container: HTMLElement, options: WorldRuntimeOptions): WorldRuntime {
  let disposed = false;
  let loaded = false;
  let failed = false;
  let paused = false;
  let view: WorldView = 'follow';
  const terrain = options.terrainVersion === 'v001';
  const connected = !!options.connectedGalleries;
  let musicGalleryUnlocked = !!options.musicGalleryUnlocked;
  let prewarmCliffTower = false;
  const previewResources = worldPreviewResourceProfile(window.location.pathname, document.documentElement.dataset.previewResourceEntry);
  let exhibitGateLocked = options.mogaoExhibit?.gateLocked ?? false;
  let exhibitGateReported = !exhibitGateLocked;
  let hallAGateLocked = options.mogaoExhibit?.hallAGateLocked ?? false;
  let hallAGateReported = !hallAGateLocked;
  let startedViewingExhibits = !!options.mogaoExhibit && !exhibitGateLocked;
  const exhibitGateBlocks = () => !!options.mogaoExhibit &&
    (exhibitGateLocked || world.mogaoExhibit?.isGateBlocking() === true);
  const hallAGateBlocks = () => !!options.mogaoExhibit &&
    (hallAGateLocked || world.mogaoExhibit?.isHallAGateBlocking() === true);
  let previewEntry: WorldSnapshot['previewEntry'];
  let previewAttempt: { position: WorldCheckpoint['position']; surface?: string } | undefined;
  let galleryState = options.firstGallery ? loadFirstGallery().data : null;
  const firstGalleryUnlocked = () => !!galleryState && isFirstGalleryUnlocked(galleryState);
  const gallery = options.firstGallery ? createFirstGalleryEvents(galleryState?.introductionsSeen) : null;
  const galleryNarration = gallery ? createFirstGalleryNarration(options.sound ?? defaultSoundPreferences()) : null;
  const galleryCaissonGaze = gallery ? createBuddhaGaze() : null;
  let galleryCaissonStage: 'waiting' | 'speaking' | 'offered' | 'closed' = 'waiting';
  let galleryCaissonQuad: readonly { x: number; y: number }[] | null = null;
  let galleryCaissonSampleTime = 0;
  let galleryNarratedCueId = -1;
  let muralNarratedId: FirstGalleryNarrationId | null = null;
  let galleryWindowBlurred = false;
  let galleryBlocked = false, galleryCueId = -1;
  let galleryDisplay: ReturnType<typeof createFirstGalleryDisplay> | null = null;
  let galleryMuralPreparation: 'loading' | 'failed' | undefined = 'loading';
  let galleryArtwork: HTMLCanvasElement | null = null;
  let muralGazeTarget: GalleryTarget | null = null;
  let portalWalk: ReturnType<typeof createGalleryPortalWalk> = null;
  let portalPrelude: { time: number; yaw: number; route: ReturnType<typeof createGalleryPortalWalk> } | null = null;
  let portalNotice: 'arrived' | 'skipped' | undefined;
  let portalLightPending = false;
  const portalBusy = () => !!(portalPrelude || portalWalk);
  const portalLookTarget = new THREE.Vector3(GALLERY_TARGETS.scroll.x, GALLERY_TARGETS.scroll.y + .85, GALLERY_TARGETS.scroll.z);
  let portalStarted = false;
  let galleryStepped = false;
  let savedMuralMarker = false;
  if (gallery) {
    try { savedMuralMarker = sessionStorage.getItem(FIRST_GALLERY_MURAL_MARKER_KEY) === '1'; }
    catch { /* The invitation can still be remembered in this runtime. */ }
  }
  const mural = gallery ? createFirstGalleryMural((part, replayParts) => {
    if (replayParts) { galleryDisplay?.setParts(replayParts); return true; }
    return completeGalleryMuralPart(part).ok;
  }, savedMuralMarker) : null;
  let galleryCaissonView: { entry: FirstGalleryMuralCameraPose; time: number; returning: boolean } | null = null;
  const unsubscribeGallery = options.firstGallery ? subscribeFirstGallery(local => {
    const previouslyUnlocked = !!galleryState && isFirstGalleryUnlocked(galleryState);
    galleryState = loadFirstGallery().data;
    const unlocked = isFirstGalleryUnlocked(galleryState);
    if (local && unlocked && !previouslyUnlocked && !galleryState.ceremonySeen) portalLightPending = true;
    if (!unlocked || galleryState.ceremonySeen) portalLightPending = false;
    if (!mural?.replay) galleryDisplay?.setParts(galleryState.muralParts);
    if (!portalLightPending) galleryDisplay?.setPortalReveal(Number(unlocked));
  }) : () => {};
  const upper = options.mogaoUpperVersion === 'v002';
  const musicInterior = options.companionVersion === 'v002';
  const musicInstrumentDisplay = musicInterior && !!options.onMusicInstrument;
  const interiorNavigation = musicInterior && (options.musicBalconyV2 || musicInstrumentDisplay) ? createMusicInteriorNavigation({
    compactBalcony: options.musicBalconyV2,
    additionalSolids: musicInstrumentDisplay ? MUSIC_INSTRUMENT_DISPLAY_SOLIDS : undefined,
  }) : legacyMusicInteriorNavigation;
  const interiorCameraSpace = musicInterior ? createMusicInteriorCameraSpace(interiorNavigation.cameraSolids) : undefined;
  const companionV1 = options.companionVersion === 'v001' ? createMusicCompanion() : null;
  const guideVisit = options.musicGuide && musicInterior ? createMusicGuideVisit(() => {
    if (!reduced) void soundPlayer.prepare('guide-stardust');
    options.onMusicGuideWardrobe?.();
  }, { firstApproach: !hasApproachedMusicGalleryGuide(), captionSynchronized: true }) : null;
  const guideStation = guideVisit ? { position: toTerrainPoint('music', MUSIC_GUIDE_STATION), surfaceId: 'music-courtyard' } : undefined;
  const guideMeetingPoint = guideStation && { position: toTerrainPoint('music', { x: 38.4, z: 1.2 }), surfaceId: guideStation.surfaceId };
  let guideApproach: MusicInteriorWalkAssistState | 'facing' | null = null;
  const companionV2 = musicInterior ? createMusicCompanionV2(guideStation, interiorNavigation, { musicGuide: !!guideVisit }) : null;
  const companion = companionV2 ?? companionV1;
  const companionSpeech = companion ? createCompanionSpeech(options.sound ?? defaultSoundPreferences(), () => {
    if (disposed) return;
    companion.finishDialogue(); emit();
  }) : null;
  let companionLineId: number | null = null;
  let guideRequest: AbortController | null = null;
  const guideSurfaceRevealSeconds = 2;
  let guideSurfaceRevealElapsed: number | null = null;
  let guideRevealStartedAt: number | null = null;
  let guideRevealAudioStarted = false;
  let guideCloseup: { camera: THREE.PerspectiveCamera; target: THREE.Vector3 } | null = null;
  let guideCloseupAspect = 0;
  let shownGuideCloseup = false;
  let guidePlayerOccluding = false;
  let manualUpperLanding = false;
  let overview = false;
  let reduced = options.reducedMotion;
  const mogao=!!options.mogao, mogaoV2=options.mogaoVersion==='v002',mogaoV3=options.mogaoVersion==='v003',mogaoV6=options.mogaoVersion==='v006',mogaoV7=options.mogaoVersion==='v007',mogaoV11=options.mogaoVersion==='v011'||options.mogaoVersion==='v012',mogaoV10=mogaoV11||options.mogaoVersion==='v010',mogaoV9=mogaoV10||options.mogaoVersion==='v009',mogaoV8=mogaoV9||options.mogaoVersion==='v008';
  const exhibitGroundGuidance = upper && options.mogaoExhibit ? createMogaoGroundGuidance() : null;
  const hallArrival = mogaoV9 && !upper ? createHallArrival() : null;
  let lookPitch=Number.isFinite(options.initialLook)?THREE.MathUtils.clamp(options.initialLook!,MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK):0,lookIntent=lookPitch;
  let zoomOffset = 0;
  const visualTarget=new THREE.Vector3();
  const {MOGAO_LAYOUT,MOGAO_PLAYER_COLLIDERS,mogaoSurfaceHeight,nearDeerWall,mogaoLocation,inMogaoRoom:legacyInMogaoRoom}=mogaoV11?mogaoV11Rules:mogaoV8?mogaoV8Rules:mogaoV7?mogaoV7Rules:mogaoV6?mogaoV6Rules:mogaoV3?mogaoV3Rules:mogaoV2?mogaoV2Rules:mogaoV1Rules;
  const localPoint=(region:'courtyard'|'music'|'cliff',p:{x:number;z:number})=>terrain?fromTerrainPoint(region,p):p;
  const inMogaoRoom=(p:{x:number;z:number})=>legacyInMogaoRoom(localPoint('cliff',p));
  const musicPreview=!!options.musicPavilion;
  const musicV6=musicPreview&&options.musicVersion==='v006';
  const musicV5=musicPreview&&(options.musicVersion==='v005'||musicV6);
  const musicV4=musicPreview&&(options.musicVersion==='v004'||musicV5);
  const musicV3=musicPreview&&options.musicVersion==='v003';
  const musicV2=musicPreview&&(options.musicVersion==='v002'||musicV3||musicV4);
  const travelCamera=musicV2?createTravelCamera():null;
  const yawLimit=musicV2?normalizedYaw:clampCameraYaw;
  const bounds=terrain?TERRAIN_BOUNDS:mogao?MOGAO_LAYOUT.bounds:musicV4?MUSIC_LAYOUT_V4.bounds:musicV3?MUSIC_LAYOUT_V3.bounds:musicV2?MUSIC_LAYOUT_V2.bounds:undefined;
  const regionColliders=terrain?TERRAIN_PLAYER_COLLIDERS:mogao?MOGAO_PLAYER_COLLIDERS:musicV4?MUSIC_PLAYER_COLLIDERS_V4:musicV3?MUSIC_PLAYER_COLLIDERS_V3:musicV2?MUSIC_PLAYER_COLLIDERS_V2:MUSIC_PLAYER_COLLIDERS;
  const baseFlyingPose=musicV4?flyingCameraPoseV4:musicV3?flyingCameraPoseV3:musicV2?flyingCameraPoseV2:flyingCameraPose;
  const baseNearMural=musicV6?nearMuralSteps:musicV4?nearFlyingMuralV4:musicV2?nearFlyingMuralV2:nearFlyingMural;
  let viewportWidth = 1, viewportHeight = 1;
  function flyingPose(aspect: number, closeup = false) {
    let pose = baseFlyingPose(aspect);
    if (closeup) {
      const { center, width, height } = MUSIC_LAYOUT_V4.mural;
      const fov = Math.tan(THREE.MathUtils.degToRad(49 / 2));
      const compact = viewportHeight <= 470;
      const narrow = compact && viewportWidth <= 680;
      const footer = Math.max(narrow ? 88 : compact ? 70 : 52,
        viewportHeight * (narrow ? .27 : compact ? .21 : .16));
      const top = .045;
      const coverage = Math.max(.36, Math.min(.76, 1 - top - (footer + 8) / viewportHeight));
      const distance = Math.max(height / (2 * fov * coverage), width / (2 * fov * aspect * .92));
      const y = center[1] - height * ((1 - 2 * top - coverage) / (2 * coverage));
      pose = { position: new THREE.Vector3(center[0], y, center[2] + distance),
        target: new THREE.Vector3(center[0], y, center[2]) };
    }
    return terrain ? terrainPose('music', pose) : pose;
  }
  const nearMural=(p:{x:number;z:number})=>baseNearMural(localPoint('music',p));
  const cameraSpace=terrain?terrainCameraSpace(options.terrainCaissonVersion==='v001',!!options.firstGallery,musicV6):mogao?(mogaoV11?mogaoCameraSpaceV11:mogaoV8?mogaoCameraSpaceV8:mogaoV7?mogaoCameraSpaceV7:mogaoV6?mogaoCameraSpaceV6:mogaoV3?mogaoCameraSpaceV3:mogaoV2?mogaoCameraSpaceV2:mogaoCameraSpace)():musicPreview?(musicV4?musicCameraSpaceV4(musicV6):musicV3?musicCameraSpaceV3():musicV2?musicCameraSpaceV2():musicCameraSpace()):undefined;
  const usesMusicSurface = (surface?: string) => musicInterior && !!surface && (!connected || isMusicWalkSurface(surface));
  const usesUpperSurface = (surface?: string) => upper && !!surface && (!connected || isMogaoWalkSurface(surface));
  function heightAt(p: WorldCheckpoint['position']) {
    const surface = checkpoint.walkSurface;
    if (musicInterior && (!connected || usesMusicSurface(surface))) {
      return interiorNavigation.musicInteriorHeight({ position: p, surfaceId: surface ?? null });
    }
    const upperHeight = usesUpperSurface(surface) ? upperFloorHeight(p, surface, !!options.mogaoExhibit) : null;
    if (upperHeight !== null) return upperHeight;
    if (terrain) return terrainSurfaceHeight(p);
    if (mogao) return options.mogaoSurfaceVersion === 'v004' ? mogaoSurfaceHeightV4(p) : mogaoSurfaceHeight(p);
    const musicHeight = musicV4 ? musicSurfaceHeightV4 : musicV2 ? musicSurfaceHeightV2 : musicSurfaceHeight;
    return surfaceHeight(p) + (musicPreview ? musicHeight(p) : 0);
  }
  const followPose=(x:number,y:number,z:number,yaw:number)=>{
    if(checkpoint.walkSurface&&usesMusicSurface(checkpoint.walkSurface)){
      const pose=zoomFollowPose(musicInteriorFollowPose(x,y,z,yaw,checkpoint.walkSurface,poseSettled?camera.position:undefined,interiorCameraSpace),zoomOffset);
      pose.position=settleMusicInteriorCamera(pose.target,pose.position,interiorCameraSpace);
      return pose;
    }
    if(checkpoint.walkSurface&&usesUpperSurface(checkpoint.walkSurface)){
      const buddhaGateLocked = exhibitGateBlocks();
      const aLocked = hallAGateBlocks();
      const exhibit = !!options.mogaoExhibit;
      const pose=zoomFollowPose(upperFollowPose(x,y,z,yaw,{surfaceId:checkpoint.walkSurface,travelHeading:checkpoint.cameraYaw,assist:!!stairAssist&&elapsed>=assistLookUntil,previousPosition:camera.position,buddhaGateLocked,hallAGateLocked:aLocked,exhibit}),zoomOffset);
      pose.position=settleUpperCamera(pose.target,pose.position,buddhaGateLocked,exhibit,aLocked);
      return pose;
    }
    const original=terrain?terrainFollowPose(x,y,z,yaw,cameraSpace!,!!options.firstGallery,musicV6):mogao?(mogaoV11?mogaoFollowPoseV11:mogaoV8?mogaoFollowPoseV8:mogaoV7?mogaoFollowPoseV7:mogaoV6?mogaoFollowPoseV6:mogaoV3?mogaoFollowPoseV3:mogaoV2?mogaoFollowPoseV2:mogaoFollowPose)(x,y,z,yaw,cameraSpace!):followCameraPose(x,y,z,yaw,cameraSpace);
    const pose=zoomFollowPose(original,zoomOffset);
    const subject=cameraSpace?.subjectHeight===undefined?undefined:new THREE.Vector3(x,y+cameraSpace.subjectHeight,z);
    pose.position=terrain&&cameraSpace&&subject
      ?settleTerrainCamera(pose.target,pose.position,pose.position,cameraSpace,subject,terrainRegionAt({x,z})==='cliff')
      :mogaoV11&&cameraSpace&&subject?settleStairCamera(pose.target,pose.position,pose.position,cameraSpace,subject)
      :settleFollowCamera(pose.target,pose.position,pose.position,cameraSpace,subject);
    return pose;
  };
  let checkpoint: WorldCheckpoint = { ...options.initial, position: terrain ? sanitizeTerrainPosition(options.initial.position, !!options.firstGallery) : sanitizePosition(options.initial.position, musicPreview ? regionColliders : undefined, bounds), cameraYaw: yawLimit(options.initial.cameraYaw), visitedEvents: [...options.initial.visitedEvents] };
  if (connected) {
    checkpoint = sanitizeConnectedGalleryCheckpoint(options.initial, firstGalleryUnlocked(), musicGalleryUnlocked);
  } else {
    if (galleryState && galleryBlockedRegion(checkpoint.position, firstGalleryUnlocked())) checkpoint = { ...checkpoint, position: { ...TERRAIN_SPAWN }, heading: TERRAIN_REGIONS.courtyard.yaw, cameraYaw: TERRAIN_REGIONS.courtyard.yaw };
    if(musicInterior)checkpoint=sanitizeMusicCompanionCheckpoint(options.initial,interiorNavigation,!!guideVisit);
    if(upper)checkpoint=UPPER_SESSION_OPTIONS.sanitizeCheckpoint!(options.initial);
    if(options.mogaoExhibit)checkpoint=restrictMogaoExhibitCheckpoint(checkpoint, !exhibitGateLocked, !hallAGateLocked);
  }
  const inFirstGallery = () => !connected || connectedGalleryAt(checkpoint) === 'first';
  const inMusicGallery = () => !connected || connectedGalleryAt(checkpoint) === 'music';
  let stairAssist: UpperStairAssistState | null = null;
  let musicStairAssist: MusicInteriorStairAssistState | null = null;
  let exhibitArrival: MogaoHallArrival | null = null;
  let blockedArrival: MogaoExhibitHall | null = null;
  function cancelStairAssists(){stairAssist=null;musicStairAssist=null;}
  let assistLookUntil = 0;
  let moving = false;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0, observationTime=0;
  let lastEmit = -Infinity;
  let poseSettled = false;
  // The open terrain sees centimetre-separated facade trim from 100–250 m.
  // A conventional .1–1400 m depth buffer cannot resolve those surfaces.
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const mobileTerrain = terrain && coarsePointer;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobileTerrain, alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: terrain });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileTerrain ? 1.15 : coarsePointer ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D探索画面，WASD或方向键移动，按住鼠标左键或右键拖动或右侧触屏滑动观察，滚轮缩放，点击物品互动');
  canvas.dataset.worldCanvas = 'true';
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.touchAction = 'none';
  const cinematicPreview = !!options.cinematics || musicPreview;
  const director = !terrain && options.cinematics ? createCinematicDirector(options.cinematics.seen, options.cinematics.onSeen) : null;
  let earlyIntent = false, shotHeading = checkpoint.heading, snapFollow = false;
  const previewLoading = { previewResources, connectedGalleries: connected, previewStart: checkpoint.position, previewStartSurface: checkpoint.walkSurface,
    compactConnectedTerrain: connected && coarsePointer,
    cliffUnlockedAtStart: connected && firstGalleryUnlocked() && musicGalleryUnlocked,
    ...(options.mogaoExhibit ? {
      mogaoExhibitVersion: 'v001' as const,
      mogaoExhibitGateLocked: exhibitGateLocked,
      mogaoHallAGateLocked: hallAGateLocked,
      mogaoExhibitInteriorPath: coarsePointer ? 'mogao-upper/v003/interior-mobile.glb' : undefined,
      onMogaoExhibitChange: () => schedule(),
    } : {}) };
  const world = createArtSampleScene(cinematicPreview ? { travelerPath: TERRAIN_TRAVELER_MODEL, ...previewLoading,
    musicMuralTextureLimit: musicInterior ? Math.min(renderer.capabilities.maxTextureSize, coarsePointer ? 2048 : 4096) : undefined,
    musicBalconyV2: options.musicBalconyV2,
    musicGuide: !!guideVisit,
    musicInstrumentDisplay: musicInstrumentDisplay ? { mobile: coarsePointer, onChange: () => schedule() } : undefined,
    firstGalleryStart: options.firstGallery ? checkpoint.position : undefined, companion: !!companion, animationRates: { walk: WALK_SPEED / 1.20591, run: RUN_SPEED / 4.39490 }, presentationClips: true, sampleNature: true, terrainVersion:options.terrainVersion, environmentVersion:options.environmentVersion, terrainCaissonVersion:options.terrainCaissonVersion, mogao, mogaoVersion:options.mogaoVersion, mogaoUpperVersion:options.mogaoUpperVersion, mogaoSurfaceVersion:options.mogaoSurfaceVersion, mogaoFacadeVersion:options.mogaoFacadeVersion, musicPavilion: musicPreview, musicVersion: options.musicVersion, musicInteriorVersion:musicInterior?'v001':undefined, flyingAwakened: checkpoint.visitedEvents.includes('flying') } : previewLoading);
  let mogaoGamePortal = options.mogaoExhibit?.gamePortalUnlocked ? createMogaoGamePortal(world.scene) : null;
  const createMusicGamePortal = () => createGalleryGamePortal(world.scene, 'music-courtyard-game-portal', MUSIC_GAME_PORTAL_CENTER);
  let musicGamePortal = musicInterior && options.musicGamePortal?.unlocked ? createMusicGamePortal() : null;
  function disposeGamePortals() {
    mogaoGamePortal?.dispose();
    mogaoGamePortal = null;
    musicGamePortal?.dispose();
    musicGamePortal = null;
  }
  const galleryGaze = gallery ? createFirstGalleryGaze(world.traveler) : null;
  function cancelGalleryCue() {
    gallery?.cancel();
    galleryNarration?.cancel('cue');
    galleryGaze?.cancel();
    muralGazeTarget = null;
  }
  function cancelGalleryCueOnMotion() {
    const before = gallery?.snapshot().cueId;
    gallery?.cancelOnMotion();
    if (before !== gallery?.snapshot().cueId) {
      galleryNarration?.cancel('cue');
      galleryGaze?.cancel();
    }
  }
  function syncGalleryNarration() {
    if (!gallery || !galleryNarration) return;
    if (!inFirstGallery() || view !== 'follow') {
      galleryNarration.cancel();
      return;
    }
    if (overview) return;
    const muralId = mural?.snapshot().narration ?? null;
    if (muralId !== muralNarratedId) {
      muralNarratedId = muralId;
      if (muralId) galleryNarration.play('mural', muralId, reason => mural?.advanceNarration(reason));
      else galleryNarration.cancel('mural');
    }
    if (mural?.active || galleryNarration.inspect()?.owner === 'caisson') return;
    const { line, cueId } = gallery.snapshot();
    if (cueId === galleryNarratedCueId) return;
    galleryNarratedCueId = cueId;
    if (line?.narration) galleryNarration.play('cue', line.narration, () => gallery.advanceCue(), line.narration === 'easel-color-note');
    else galleryNarration.cancel('cue');
  }
  function skipGalleryNarration() {
    if (paused || document.hidden || galleryWindowBlurred || overview) return false;
    if (portalPrelude && galleryPortalPreludePhase(portalPrelude.time) === 'question') {
      portalPrelude.time = GALLERY_PORTAL_PRELUDE.walk;
      return true;
    }
    syncGalleryNarration();
    if (galleryNarration?.skip()) return true;
    if (mural?.active) return mural.advanceNarration();
    if (gallery?.snapshot().betweenLines) return true;
    return !!gallery?.advanceCue();
  }
  function galleryArtworkFeedbackActive() {
    const narration = gallery?.snapshot().cue?.narration;
    return narration === 'easel-hung' || narration === 'easel-color-note';
  }
  function updateGalleryCaissonObservation(dt: number) {
    if (!gallery || !galleryCaissonGaze || options.terrainCaissonVersion !== 'v001') return;
    const near = inFirstGallery() && galleryNearby(checkpoint.position) === 'caisson';
    if (!near) {
      galleryCaissonGaze.update(false, false, 0);
      galleryCaissonStage = 'waiting';
      galleryCaissonQuad = null;
      galleryCaissonSampleTime = 0;
      return;
    }
    if (galleryCaissonStage === 'speaking' && !gallery.snapshot().cue) galleryCaissonStage = 'offered';
    const eligible = !moving && !galleryBlocked && !mural?.active && mural?.phase !== 'invite' &&
      !portalBusy() && portalNotice !== 'arrived' && view === 'follow' && !overview &&
      !galleryCaissonView?.returning && !galleryWindowBlurred;
    if (!eligible) {
      galleryCaissonGaze.update(true, false, 0);
      galleryCaissonQuad = null;
      galleryCaissonSampleTime = 0;
      return;
    }
    galleryCaissonSampleTime += dt;
    if (galleryCaissonSampleTime < .1) return;
    const sampleTime = galleryCaissonSampleTime;
    galleryCaissonSampleTime = 0;
    if (galleryCaissonStage === 'waiting' &&
      galleryCaissonGaze.update(true, galleryCaissonCoreVisible(world.scene, camera), sampleTime)) {
      galleryCaissonStage = 'speaking';
      gallery.say(GALLERY_INTRO.caisson, true);
    }
    galleryCaissonQuad = galleryCaissonStage === 'offered'
      ? projectGalleryCaissonQuad(world.scene, camera, canvas.getBoundingClientRect()) : null;
  }
  function streamPreview(position: WorldCheckpoint['position'], surfaceId?: string | null) {
    if (connected) {
      // The unlocked pavilion is out of shot during the first gallery's ceremony.
      // Its streaming and shadow refresh can start when the traveler resumes.
      if (inFirstGallery() && (portalLightPending || portalBusy() || portalNotice)) return;
      const first = firstGalleryUnlocked();
      world.updateFirstGalleryStreaming?.(position, first, first && musicGalleryUnlocked, surfaceId,
        startedViewingExhibits, !hallAGateLocked, prewarmCliffTower);
      return;
    }
    world.updatePreviewStreaming?.(position, surfaceId, startedViewingExhibits,
      options.mogaoExhibit ? !hallAGateLocked : undefined);
  }
  const previewEntryStatus = (position: WorldCheckpoint['position'], surface?: string) => connected
    ? world.firstGalleryEntryStatus?.(position, surface, firstGalleryUnlocked(), firstGalleryUnlocked() && musicGalleryUnlocked)
    : world.previewEntryStatus?.(position, surface);
  // The isolated scene displays only approved tree A. Its low geometry reaches
  // 1.01 m from the trunk (measured below 2.1 m in the environment sample).
  // Remove hidden reference-tree obstacles along with those hidden models.
  const sampleColliders = [...WORLD_COLLIDERS.filter(box => !box.id?.startsWith('tree-')),
    { id: 'sample-tree-a', minX: 3.79, maxX: 5.81, minZ: 11.99, maxZ: 14.01, height: 2.1, circle: { x: 4.8, z: 13, radius: 1.01 } }];
  const colliders = musicPreview ? regionColliders : cinematicPreview ? sampleColliders.map(box => ({ ...box,
    minX: box.minX - .21, maxX: box.maxX + .21, minZ: box.minZ - .21, maxZ: box.maxZ + .21,
    ...(box.circle ? { circle: { ...box.circle, radius: box.circle.radius + .21 } } : {}),
  })) : WORLD_COLLIDERS;
  const camera = new THREE.PerspectiveCamera(49, 1, .1, terrain?1400:mogao?450:150);
  const companionMarker = companion && !guideVisit ? new THREE.Mesh(
    new THREE.RingGeometry(companionConfig.dialogueZone.radius - .06, companionConfig.dialogueZone.radius, 48),
    new THREE.MeshBasicMaterial({ color:0xd9ac62,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide }),
  ) : null;
  if(companionMarker){
    const center=toTerrainPoint('music',companionConfig.dialogueZone);
    companionMarker.position.set(center.x,terrainSurfaceHeight(center)+.035,center.z);
    companionMarker.rotation.x=-Math.PI/2;
    companionMarker.name='companion-test-dialogue-zone';
    world.scene.add(companionMarker);
  }
  function disposeCompanionMarker(){
    if(!companionMarker)return;
    companionMarker.removeFromParent();companionMarker.geometry.dispose();companionMarker.material.dispose();
  }
  const cameraTarget = new THREE.Vector3();
  const spawnPose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
  camera.position.copy(spawnPose.position); cameraTarget.copy(spawnPose.target); camera.lookAt(cameraTarget);
  const buddhaHead = terrain ? toTerrainPoint('cliff', BUDDHA_HEAD) : BUDDHA_HEAD;
  const buddhaHeadWorld = new THREE.Vector3(buddhaHead.x, buddhaHead.y, buddhaHead.z);
  const buddhaHeadProjection = new THREE.Vector3();
  const buddhaInView = () => options.mogaoExhibit
    ? centeredBuddhaHead(camera, buddhaHeadWorld, buddhaHeadProjection)
    : buddhaDominatesView(terrain ? terrainLocalCamera(camera, 'cliff') : camera);
  const input = createWorldInput(canvas, interact, delta => {if(delta&&!director?.state)turnCamera(delta);}, () => { earlyIntent = true; skipCinematic(); }, { onTilt:delta=>{if(delta&&!director?.state)tiltCamera(delta);}, onZoom:zoomCamera });
  input.setEnabled(false);
  container.appendChild(canvas);
  const musicAudioInScope = previewResources?.mode !== 'cliff' && previewResources?.mode !== 'courtyard';
  const audio=musicV2&&musicAudioInScope?createMusicArrivalAudio(options.sound??defaultSoundPreferences(),terrain?terrainMusicSpatial:musicV4?MUSIC_LAYOUT_V4.audio:undefined,!!previewResources):null;
  const encounters = musicV5 && musicAudioInScope && (!companion || connected) ? createMusicEncounters(
    localPoint('music', checkpoint.position), musicV6, terrain ? terrainCanHearMusic : undefined,
    terrain ? { useAudiblePlayback: true, hearingDuration: 2.5, musicAvailable: world.musicCourtyardReady } : undefined,
  ) : null;
  const encounterVoices=encounters?{
    music:createFlyingVoice(()=>new Audio(worldAssetUrl(musicEncounters.music.audioPath)),options.sound??defaultSoundPreferences()),
    mural:createFlyingVoice(()=>new Audio(worldAssetUrl(musicEncounters.mural.audioPath)),options.sound??defaultSoundPreferences()),
  }:null;
  let terrainMusicArmed = false;
  audio?.setEnabled(!terrain && (!encounters || encounters.musicHeard));
  audio?.update(localPoint('music',checkpoint.position),checkpoint.cameraYaw-(terrain?TERRAIN_REGIONS.music.yaw:0),!previewResources);
  const historyWall = () => {
    const music = world.music;
    return music && 'setHistoryArtwork' in music ? music : null;
  };
  const history = options.flyingHistory && musicV5 && musicAudioInScope ? createFlyingHistory({
    show: (texture, labels) => historyWall()?.setHistoryArtwork(texture, labels),
    reveal: amount => historyWall()?.setHistoryReveal(amount),
    highlight: caves => historyWall()?.setHistoryHighlight(caves),
  }, options.sound ?? defaultSoundPreferences(), options.onMusicFlyingChapter, true) : null;
  const voice=options.flyingVoice&&musicAudioInScope&&!history?createFlyingVoice(flyingDialogue.audioPath?()=>new Audio(worldAssetUrl(flyingDialogue.audioPath!)):null,options.sound??defaultSoundPreferences()):null;

  const buddhaGaze=mogaoV10&&(!upper||options.mogaoExhibit)?createBuddhaGaze():null;
  let buddhaSightTime=0,buddhaSightClear=false;
  const buddhaVoice=buddhaGaze&&previewResources?.mode!=='music'&&previewResources?.mode!=='courtyard'
    ?createFlyingVoice(()=>new Audio(worldAssetUrl(buddhaNarrationFor(!!options.mogaoExhibit).audioPath)),options.sound??defaultSoundPreferences()):null;

  const unregisterEncounterSkip=registerSpeechSkip(()=>{
    if(!encounters?.state||paused||view!=='follow')return false;
    skipEncounter();return true;
  });
  function currentEncounterVoice(){const id=encounters?.state?.id;return id?encounterVoices?.[id]:undefined;}
  function skipEncounter(){
    currentEncounterVoice()?.exit();encounters?.skip();
    input.setEnabled(loaded&&!paused&&view==='follow');travelCamera?.reset();moving=false;emit();
  }
  function blockEncounterVoices(blocked:boolean){encounterVoices?.music.setBlocked(blocked);encounterVoices?.mural.setBlocked(blocked);}
  function nearestDiscovery(): DiscoveryId | null {
    if (!loaded || exhibitArrival || hallArrival?.phase==='waiting') return null;
    const p = checkpoint.position;
    if(upper&&(upperFloorHeight(p,checkpoint.walkSurface,!!options.mogaoExhibit)??0)>17.1)return null;
    if (musicPreview && inMusicGallery() && musicAudioInScope && world.music && world.musicFlyingReady?.() !== false &&
      nearMural(p) && (!encounters || companion || encounters.muralReady)) return 'flying';
    const courtyardPoint=localPoint('courtyard',p);
    // The terrain hall's ceiling is reserved for the user's next design pass;
    // its low original caisson is temporarily hidden with the old observation.
    if (!terrain && Math.hypot(courtyardPoint.x + 12, courtyardPoint.z + 17) < 2.6) return 'caisson';
    if (connected && checkpoint.walkSurface !== 'ground' && checkpoint.walkSurface !== 'stair-entry') return null;
    if (mogaoV8) {
      const story = mogaoV8Rules.nearStoryWall(localPoint('cliff',p));
      if (story === 'novice-story' && options.mogaoExhibit && isUpperStairAssistArea({position:p,surfaceId:checkpoint.walkSurface??null}, true)) return null;
      return story;
    }
    if (mogao ? nearDeerWall(p) : Math.hypot(p.x + 5, p.z + 6) < 2.25) return 'story-demo';
    return null;
  }
  function enterGamePortal(portal: ReturnType<typeof createGalleryGamePortal> | null, enter: (() => void) | undefined, point?: WorldInputPoint) {
    if (!portal || !enter) return false;
    if (point) {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !portal.pick(camera, {
        x: (point.clientX - bounds.left) / bounds.width * 2 - 1,
        y: 1 - (point.clientY - bounds.top) / bounds.height * 2,
      })) return false;
    }
    enter();
    return true;
  }
  function interact(point?:WorldInputPoint) {
    if ((mural?.active || inFirstGallery()) && skipGalleryNarration()) { schedule(); emit(); return; }
    if (mural?.active) {
      if (paused || document.hidden || galleryBlocked) return;
      if (!point || mural.phase !== 'pick' || !galleryDisplay) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      world.scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const ndc = { x: (point.clientX - rect.left) / rect.width * 2 - 1, y: 1 - (point.clientY - rect.top) / rect.height * 2 };
      const part = galleryDisplay.pickMuralObject(camera, ndc, matchMedia('(pointer: coarse)').matches ? rect : undefined);
      if (part && mural.pick(part)) galleryDisplay.playTrail(part);
      if (part) emit();
      return;
    }
    if (!point && !paused && !galleryBlocked && inFirstGallery() && galleryCaissonStage === 'offered' && galleryCaissonQuad) {
      options.onGalleryInteract?.('caisson');
      return;
    }
    if(!canControlCamera())return;
    if (mogaoGamePortal && nearMogaoGamePortal(checkpoint) && enterGamePortal(mogaoGamePortal, options.mogaoExhibit?.onGamePortal, point)) return;
    if (musicGamePortal && nearMusicGamePortal(checkpoint) && enterGamePortal(musicGamePortal, options.musicGamePortal?.onEnter, point)) return;
    if (point && options.onMusicInstrument && world.musicInstruments && checkpoint.walkSurface === 'music-floor-2') {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (point.clientX - rect.left) / rect.width * 2 - 1;
      const y = 1 - (point.clientY - rect.top) / rect.height * 2;
      if (Math.abs(x) > 1 || Math.abs(y) > 1) return;
      const instrument = world.musicInstruments.pick(world.scene, camera, { x, y }, checkpoint.walkSurface, world.traveler);
      if (instrument) { guideVisit?.cancelLine(); options.onMusicInstrument(instrument); return; }
    }
    if (guideVisit?.nearby && inMusicGallery() && (!point || hitMusicGuide(point))) {
      guideVisit.interact();
      emit();
      return;
    }
    if (options.mogaoExhibit && (checkpoint.walkSurface === 'hall-a' || checkpoint.walkSurface === 'hall-b')) {
      if (!point) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (point.clientX - rect.left) / rect.width * 2 - 1;
      const y = 1 - (point.clientY - rect.top) / rect.height * 2;
      if (Math.abs(x) > 1 || Math.abs(y) > 1) return;
      world.scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      if (checkpoint.walkSurface === 'hall-a') {
        const story = world.mogaoHallA?.pick(world.scene, camera, { x, y }, checkpoint.walkSurface, world.traveler);
        if (story) options.mogaoExhibit.onStory?.(story);
        return;
      }
      const id = world.mogaoExhibit?.pick(world.scene, camera, { x, y }, checkpoint.walkSurface, world.traveler);
      if (id) {
        startedViewingExhibits = true;
        streamPreview(checkpoint.position, checkpoint.walkSurface);
        options.mogaoExhibit.onInteract(id);
      }
      return;
    }
    if (gallery && inFirstGallery()) {
      const { nearby, easelReady } = gallery.snapshot();
      if (nearby) {
        if (nearby === 'easel' && !easelReady) return;
        let picked: ReturnType<NonNullable<typeof galleryDisplay>['pick']> = null;
        if (point) {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          world.scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
          picked = galleryDisplay?.pick(camera, { x: (point.clientX - rect.left) / rect.width * 2 - 1, y: 1 - (point.clientY - rect.top) / rect.height * 2 }) ?? null;
          if (picked?.interaction !== nearby) return;
        }
        cancelGalleryCue(); options.onGalleryInteract?.(nearby, picked?.object); return;
      }
    }
    const nearby=nearestDiscovery();
    if(!nearby)return;
    if(point){
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=(point.clientX-rect.left)/rect.width*2-1,y=1-(point.clientY-rect.top)/rect.height*2;
      if(Math.abs(x)>1||Math.abs(y)>1)return;
      world.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      if(pickDiscoveryAt(world.scene,camera,{x,y},world.traveler)!==nearby)return;
    }
    options.onInteract();
  }
  function snapshot(): WorldSnapshot {
    const p = checkpoint.position;
    const terrainLocation = terrain ? inMogaoRoom(p)?'石窟内':terrainRegionAt(p)==='courtyard'?'纹彩院 · 山腰':terrainRegionAt(p)==='music'?'月牙泉 · 乐舞坊':terrainRegionAt(p)==='cliff'?'崖前古道':p.x<92?'沙丘坡脊':p.x<160?'下坡古道':'月牙谷地' : null;
    const musicSurface=musicInterior?MUSIC_INTERIOR_LAYOUT.surfaces.find(surface=>surface.id===checkpoint.walkSurface):undefined;
    const location = musicSurface?.label ?? terrainLocation ?? (mogao?mogaoLocation(p):null) ?? (p.x < -2 && p.x > -22 && p.z < 2 && p.z > -24
      ? p.z < -12.3 ? '藻井观赏厅' : '纹彩院'
      : musicPreview && (musicV4?inMusicCourtV4(p):musicV3?inMusicCourtV3(p):musicV2?inMusicCourtV2(p):p.x>8 && p.x<28 && p.z< -2 && p.z> -23) ? '乐舞馆' : p.z < -25 ? '洞窟远景 · 待制作' : !musicPreview && p.x > 10 && p.z < -8 ? '乐舞馆远景 · 待制作' : '沙漠道路');
    const upperSurface=upper?upperLayout.surfaces.find(surface=>surface.id===checkpoint.walkSurface):undefined;
    const walk = { position: p, surfaceId: checkpoint.walkSurface ?? null };
    const stairOptions = exhibitArrival ? null : musicInterior && (!connected || usesMusicSurface(checkpoint.walkSurface)) ? getMusicInteriorStairOptions(walk, interiorNavigation)
      : upper && (!options.mogaoExhibit || isUpperStairAssistArea(walk, true)) ? getUpperStairOptions(walk, !!options.mogaoExhibit) : null;
    const discovery = gallery?.snapshot();
    const portal = portalPrelude ? galleryPortalPreludePhase(portalPrelude.time) : portalWalk ? 'walking' as const : portalNotice;
    const gallerySnapshot = discovery && { ...discovery, mural: mural?.snapshot(), muralPreparation: galleryMuralPreparation, portal,
      portalReady: canStartGalleryPortal(), caissonOffer: galleryCaissonStage === 'offered' && !!galleryCaissonQuad,
      caissonAssist: !!galleryCaissonView && !galleryCaissonView.returning };
    const musicGuide = guideVisit && inMusicGallery() ? { ...guideVisit.inspect(), showcasing: guideSurfaceRevealElapsed !== null } : undefined;
    const hallArrivalPhase = exhibitGroundGuidance?.visible(checkpoint) ? 'guidance' as const : hallArrival?.phase;
    return { currentGallery: connected ? connectedGalleryAt(checkpoint) : undefined,
      galleryGate: connected ? discovery?.gate ?? undefined : undefined,
      gallery: gallerySnapshot, previewEntry: previewEntry ?? (inMusicGallery() && world.musicDetailsFailed?.() ? 'failed' : undefined), companion:companion?{...companion.state,speech:companionSpeech!.inspect()}:undefined, musicGuide, stairAssist:stairOptions?{up:stairOptions.up.available,down:stairOptions.down.available,active:musicStairAssist?.destination.label??stairAssist?.destination.label??null}:undefined, upper:upperSurface?{surface:upperSurface.id,label:upperSurface.label,height:heightAt(p)-16.85546875}:undefined, checkpoint: { ...checkpoint, position: { ...p }, visitedEvents: [...checkpoint.visitedEvents] }, nearby: overview?null:nearestDiscovery(), location, moving, overview, observationTime, caveLook:lookIntent, mogaoGamePortalNearby: !!mogaoGamePortal && nearMogaoGamePortal(checkpoint),
      musicGamePortalNearby: !!musicGamePortal && nearMusicGamePortal(checkpoint), buddhaVoice:buddhaVoice?.inspect(), hallArrival:hallArrivalPhase, mogaoHallArrival:exhibitArrival ? { hall: exhibitArrival.hall, phase: exhibitArrival.phase } : undefined, encounter:encounters?.state, encounterVoice:currentEncounterVoice()?.inspect(), cinematic: director?.state ?? null, flying: world.music?.inspect(), musicAudio: audio?.inspect(), flyingVoice: voice?.inspect(), flyingHistory: history?.snapshot() };
  }
  function emit() { options.onSnapshot(snapshot()); }
  function releaseExhibitArrival() {
    exhibitArrival = null;
    input.setEnabled(canControlCamera());
    moving = false;
    schedule();
  }
  function canStartGalleryPortal() {
    return !!(terrain && galleryState && inFirstGallery() && galleryDisplay && galleryStepped && !portalStarted && !moving && isFirstGalleryUnlocked(galleryState)
      && !galleryState.ceremonySeen && !gallery?.snapshot().cue && canControlCamera());
  }
  function finishGalleryPortal(phase: 'arrived' | 'skipped') {
    portalPrelude = null;
    portalWalk = null;
    portalNotice = phase;
    portalLightPending = false;
    galleryDisplay?.setPortalReveal(1);
    galleryGaze?.cancel();
    input.clear();
    moving = false;
  }
  function turnTravelerAndCamera(heading: number, dt: number, cameraHeading = heading) {
    const turn = normalizedYaw(heading - checkpoint.heading);
    const yaw = normalizedYaw(cameraHeading - checkpoint.cameraYaw);
    checkpoint.heading = normalizedYaw(checkpoint.heading + (reduced ? turn : THREE.MathUtils.clamp(turn, -dt * 3, dt * 3)));
    checkpoint.cameraYaw = normalizedYaw(checkpoint.cameraYaw + (reduced ? yaw : THREE.MathUtils.clamp(yaw, -dt * 1.8, dt * 1.8)));
  }
  function galleryPortalCameraYaw(bearing: number) {
    if (!cameraSpace) return bearing;
    const { x, z } = checkpoint.position;
    const y = heightAt(checkpoint.position);
    // Search at the current zoom for a sightline around adjacent pillars and walls.
    for (const degrees of [0, 12, -12, 24, -24, 42, -42, 65, -65, 80, -80]) {
      const yaw = normalizedYaw(bearing + degrees * Math.PI / 180);
      const eye = followPose(x, y, z, yaw).position;
      if (clearCameraPosition(eye, portalLookTarget, cameraSpace).distanceToSquared(portalLookTarget) < .01) return yaw;
    }
    return bearing;
  }
  function syncMuralMarker() {
    if (!mural) return;
    galleryDisplay?.setMuralMarker(mural.marker);
    if (mural.marker === savedMuralMarker) return;
    savedMuralMarker = mural.marker;
    try { sessionStorage.setItem(FIRST_GALLERY_MURAL_MARKER_KEY, mural.marker ? '1' : '0'); }
    catch { /* Session storage is optional for this visual cue. */ }
  }
  function restoreMuralControls() {
    input.clear();
    travelCamera?.reset();
    moving = false;
    cancelGalleryCue();
    galleryDisplay?.stopMuralLight();
    if (galleryState) galleryDisplay?.setParts(galleryState.muralParts, true);
  }
  function updateTraveler(speed: number, dt = 0) {
    galleryGaze?.beforeAnimation();
    world.traveler.position.set(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z);
    const shot = director?.state;
    world.traveler.rotation.y = shot?.id === 'opening' ? openingHeading(shot.time) : checkpoint.heading;
    const encounter=encounters?.state;
    if(encounter && !reduced) world.animatePresentation(encounter.id==='music'?'LookAround':'HallLookUp',encounter.id==='music'?3.5+Math.min(1,encounter.time/2.8)*8.4:Math.min(encounter.time,2.25));
    else if (shot?.id === 'opening' && shot.time < 1.75) world.animatePresentation('Greeting', shot.time);
    else if (shot?.id === 'hall') world.animatePresentation('HallLookUp', shot.time);
    else if (cinematicPreview && exhibitArrival?.phase === 'title') world.animatePresentation('HallLookUp', reduced ? 2.25 : exhibitArrival.seconds);
    else world.animateTraveler(speed, elapsed, reduced);
    galleryGaze?.update(dt, checkpoint.heading, reduced);
    canvas.dataset.animation = world.animationName();
  }
  function presentCompanion(dt:number){
    if(!companion)return;
    const state=companion.state;
    world.updateCompanion?.(new THREE.Vector3(state.position.x,companionV2?.state.height??terrainSurfaceHeight(state.position),state.position.z),state.heading,state.speed,dt,reduced,
      guideVisit ? { line: guideVisit.speechLine } : undefined);
  }
  const onMusicUpperFloor = (surface?: string | null) => surface === 'music-floor-2' || surface === 'music-gallery';
  function updateCompanion(dt:number,playerRunning=false,assistArrived=false,captionSeconds=dt){
    if(!companion||!inMusicGallery())return;
    const stationaryGuide = !!guideVisit && !guideVisit.following;
    const state=companion.update({player:checkpoint.position,playerHeading:checkpoint.heading,playerMoving:moving,playerRunning,dt,playerSurfaceId:checkpoint.walkSurface??null,assistArrived,blocked:stationaryGuide});
    if (guideVisit && companionV2) {
      const guide = companionV2.state;
      const player = localPoint('music', checkpoint.position);
      const stationDistance = Math.hypot(player.x - MUSIC_GUIDE_STATION.x, player.z - MUSIC_GUIDE_STATION.z);
      const upperFloor = onMusicUpperFloor(checkpoint.walkSurface);
      const sameHeight = Math.abs(guide.height - heightAt(checkpoint.position)) < .22;
      guideVisit.update(captionSeconds, {
        entered: !!checkpoint.walkSurface && player.z < 2.96 && !!world.musicGuideRoot?.visible,
        canApproach: checkpoint.walkSurface === 'music-courtyard',
        nearby: !!checkpoint.walkSurface && checkpoint.walkSurface !== 'music-stair' && sameHeight && guide.distance <= 2.4,
        atBirthplace: stationDistance <= 2.8,
        onUpperFloor: upperFloor,
        upstairs: upperFloor && !musicStairAssist && !!world.musicInstruments?.isReady() &&
          (stationaryGuide || (onMusicUpperFloor(guide.surfaceId) && sameHeight && guide.distance <= 2.6 && !guide.settling)),
      });
      if (stationaryGuide) companionV2.facePlayer(checkpoint.position);
    }
    if(state.dialogue){
      if(companionLineId!==state.dialogue.id){companionLineId=state.dialogue.id;companionSpeech?.speak(state.dialogue.id,state.dialogue.text);}
    }else if(companionLineId!==null){companionSpeech?.stop();companionLineId=null;}
    presentCompanion(dt);
  }
  function stopCompanion(){
    if(!companion)return;
    companionSpeech?.stop();companionLineId=null;companion.finishDialogue();
    companion.update({player:checkpoint.position,playerHeading:checkpoint.heading,playerMoving:false,dt:0,blocked:true,playerSurfaceId:checkpoint.walkSurface??null});
    presentCompanion(0);
  }
  function hitMusicGuide(point: WorldInputPoint) {
    const root = world.musicGuideRoot;
    const bounds = canvas.getBoundingClientRect();
    if (!root?.visible || !bounds.width || !bounds.height) return false;
    const ndc = new THREE.Vector2((point.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (point.clientY - bounds.top) / bounds.height * 2);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(world.scene, true).find(item => {
      for (let object: THREE.Object3D | null = item.object; object; object = object.parent) {
        if (!object.visible || object === world.traveler) return false;
      }
      return true;
    });
    for (let object = hit?.object; object; object = object.parent ?? undefined) if (object === root) return true;
    return false;
  }
  function skipCinematic() {
    if (!director?.state) { director?.skip(); return; }
    director.skip(); snapFollow = true;
    if (loaded) { updateTraveler(0); restoreFollow(); render(); emit(); }
  }
  function restoreFollow() {
    const pose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    camera.position.copy(pose.position); cameraTarget.copy(pose.target); camera.lookAt(cameraTarget); snapFollow = false;
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; previousTime = 0; }
  function canAnimate() { return loaded && !disposed && !failed && !paused && !document.hidden && view !== 'story'; }
  function schedule() { if (canAnimate() && !raf) raf = requestAnimationFrame(frame); }
  function finishGuideSurfaceReveal() {
    guideSurfaceRevealElapsed = null;
    guideRevealStartedAt = null;
    guideRevealAudioStarted = false;
    guideCloseup = null;
    world.finishMusicGuideReveal?.();
  }
  function stopGuideShowcase() {
    if (guideSurfaceRevealElapsed === null) return;
    soundPlayer.stopCue('guide-stardust');
    guideSurfaceRevealElapsed = guideSurfaceRevealSeconds;
    guideCloseup = null;
  }
  function finishGuideApproach(arrived: boolean) {
    if (!guideVisit?.approaching) return;
    guideApproach = null;
    guideVisit.finishApproach(arrived);
    if (arrived) rememberMusicGalleryGuideApproach();
  }
  function resetMusicGuideVisit() {
    if (!guideVisit) return;
    guideRequest?.abort(); guideRequest = null;
    stopGuideShowcase();
    finishGuideSurfaceReveal();
    finishGuideApproach(false);
    guideVisit.reset();
    companionV2?.reset();
    world.restoreMusicGuidePlain?.();
    manualUpperLanding = false;
  }
  function render(animationFrame = false) {
    if (disposed || failed) return;
    canvas.dataset.cameraYaw=checkpoint.cameraYaw.toFixed(4);
    canvas.dataset.cameraPitch=lookIntent.toFixed(4);
    canvas.dataset.cameraZoom=zoomOffset.toFixed(3);
    if (guideVisit) {
      const approaching = String(guideVisit.approaching);
      if (canvas.dataset.musicGuideApproaching !== approaching) canvas.dataset.musicGuideApproaching = approaching;
    }
    const firstReveal = animationFrame && guideSurfaceRevealElapsed === 0;
    if (firstReveal) guideSurfaceRevealElapsed = .002;
    const revealElapsed = guideSurfaceRevealElapsed;
    const revealComplete = revealElapsed !== null && (reduced || revealElapsed >= guideSurfaceRevealSeconds);
    try {
      const guide = world.musicGuideRoot;
      const showcasing = !revealComplete && revealElapsed !== null && revealElapsed > 0 && view === 'follow' && !overview;
      if (showcasing && guide && interiorCameraSpace && guideCloseupAspect !== camera.aspect) {
        const closeup = camera.clone();
        const pose = musicGuideShowcasePose(guide, closeup,
          (target, desired) => settleMusicInteriorCamera(target, desired, interiorCameraSpace));
        guideCloseupAspect = camera.aspect;
        guideCloseup = pose ? { camera: closeup, target: pose.target } : null;
        if (pose) { closeup.position.copy(pose.position); closeup.lookAt(pose.target); }
      }
      const renderCamera = showcasing && guideCloseup ? guideCloseup.camera : camera;
      shownGuideCloseup = renderCamera !== camera;
      if (revealComplete) finishGuideSurfaceReveal();
      else if (revealElapsed !== null) {
        world.setMusicGuideRevealProgress?.(revealElapsed / guideSurfaceRevealSeconds, revealElapsed);
      }
      const traveler = world.traveler;
      const travelerWasVisible = traveler.visible;
      const guideWasVisible = guide?.visible;
      if (shownGuideCloseup && guide) guide.visible = true;
      guidePlayerOccluding = showcasing && !!guide && musicGuideBlockedByTraveler(renderCamera, traveler, guide);
      if (shownGuideCloseup || guidePlayerOccluding) traveler.visible = false;
      try { renderer.render(world.scene, renderCamera); }
      finally {
        traveler.visible = travelerWasVisible;
        if (guide && guideWasVisible !== undefined) guide.visible = guideWasVisible;
      }
      if (firstReveal && !revealComplete) {
        guideRevealStartedAt = performance.now();
        guideRevealAudioStarted = soundPlayer.playPrepared('guide-stardust');
      }
      if (revealComplete) {
        input.clear();
        guideVisit?.announceOutfitReady();
        emit();
      }
    }
    catch { fail('3D画面绘制失败。请重新加载。'); }
  }
  function fail(message: string) {
    if (disposed || failed) return;
    if (portalPrelude) soundPlayer.stop();
    stopGuideShowcase();
    failed = true; moving = false; stopCompanion(); galleryNarration?.cancel(); buddhaVoice?.setBlocked(true); blockEncounterVoices(true); voice?.setBlocked(true); audio?.setDucked(false); audio?.setBlocked(true); stop(); input.setEnabled(false);
    history?.dispose();
    disposeGamePortals();
    world.dispose(); renderer.renderLists.dispose();
    emit(); options.onError(message);
  }
  function frame(time: number) {
    raf = 0;
    if (!canAnimate()) return;
    const activeSurface = checkpoint.walkSurface;
    const region = connected && !activeSurface ? terrainRegionAt(checkpoint.position) : null;
    const musicNavigation = musicInterior && (!connected || usesMusicSurface(activeSurface) || region === 'music');
    const upperNavigation = upper && (!connected || usesUpperSurface(activeSurface) || region === 'cliff');
    const frameSeconds = previousTime ? Math.max(0, (time - previousTime) / 1000) : 0;
    const dt = Math.min(frameSeconds, upperNavigation || musicNavigation || companionV1 ? .15 : portalBusy() ? .1 : .05);
    previousTime = time; elapsed += dt; if(view!=='follow')observationTime+=dt;
    if (guideRevealStartedAt !== null && guideSurfaceRevealElapsed !== null && guideSurfaceRevealElapsed < guideSurfaceRevealSeconds) {
      // Match the cue's real elapsed time even if movement dt is capped on a slow phone.
      guideSurfaceRevealElapsed = .002 + Math.max(0, performance.now() - guideRevealStartedAt) / 1000;
    }
    mogaoGamePortal?.update(dt, reduced);
    musicGamePortal?.update(dt, reduced);
    world.mogaoExhibit?.update(checkpoint.position, checkpoint.walkSurface, dt, exhibitGateLocked, reduced, hallAGateLocked);
    if (!exhibitGateLocked && !exhibitGateReported && world.mogaoExhibit && !world.mogaoExhibit.isGateBlocking()) {
      exhibitGateReported = true;
      options.mogaoExhibit?.onGateOpened();
    }
    if (!hallAGateLocked && !hallAGateReported && world.mogaoExhibit && !world.mogaoExhibit.isHallAGateBlocking()) {
      hallAGateReported = true;
      options.mogaoExhibit?.onHallAGateOpened?.();
    }
    streamPreview(checkpoint.position, checkpoint.walkSurface);
    if (previewAttempt) {
      previewEntry = previewEntryStatus(previewAttempt.position, previewAttempt.surface) ?? undefined;
      if (!previewEntry) previewAttempt = undefined;
    }
    if(view==='follow'&&hallArrival){
      const before=hallArrival.phase;
      const entered = before !== 'outside' || localPoint('cliff',checkpoint.position).z <= -76.5;
      hallArrival.update(inMogaoRoom(checkpoint.position) && entered, dt);
      if(before!==hallArrival.phase&&(before==='waiting'||hallArrival.phase==='waiting')){input.setEnabled(hallArrival.phase!=='waiting');travelCamera?.reset();}
    }
    const wasMoving = moving;
    let speed = 0, playerRunning = false, assistArrived = false, arrivalChanged = false;
    if (view === 'follow' && guideSurfaceRevealElapsed === null && guideVisit?.speechLine !== 'intro' && !overview && !galleryBlocked && !galleryCaissonView && !portalBusy() && !portalNotice && !galleryArtworkFeedbackActive() && !mural?.active && !encounters?.state && hallArrival?.phase!=='waiting') {
      const guided = exhibitArrival;
      const previousSurface = checkpoint.walkSurface;
      const walk = { position: checkpoint.position, surfaceId: previousSurface ?? null };
      if (guideVisit?.approaching && !guideApproach && guideMeetingPoint) {
        const route = walk.surfaceId === guideMeetingPoint.surfaceId && world.musicGuideRoot?.visible
          ? interiorNavigation.musicInteriorPath(walk, guideMeetingPoint) : null;
        if (route) {
          guideApproach = { waypoints: route.map(point => point.position), nextWaypoint: 0, stalledSeconds: 0 };
          input.clear();
          lookIntent = 0;
          zoomOffset = 0;
          cancelStairAssists();
        } else finishGuideApproach(false);
      }
      // Let the greeting finish at the gate, then move on the same collision
      // path as manual walking. A held entry key should not overshoot the guide.
      const control = guideVisit?.waitingForApproach ? { x: 0, y: 0, run: false, camera: 0 } : input.read();
      if (control.camera || control.x || control.y) cancelGalleryCueOnMotion();
      playerRunning = control.run;
      if (control.camera || control.x || control.y) hallArrival?.dismiss();
      if(control.camera)travelCamera?.manual();
      checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + control.camera * dt * .65);
      if (control.x || control.y) { cancelStairAssists(); companionV2?.cancelSettling(); }
      const stairTrip = stairAssist;
      const assisted = stairTrip ? advanceUpperStairAssistFrame(stairTrip,{position:checkpoint.position,surfaceId:checkpoint.walkSurface??null},dt,undefined,!!options.mogaoExhibit) : null;
      const musicAssisted = musicStairAssist ? advanceMusicInteriorStairAssistFrame(musicStairAssist,{position:checkpoint.position,surfaceId:checkpoint.walkSurface??null},dt,undefined,(walk,delta)=>companionV2!.constrainPlayerMove(walk,delta)) : null;
      if(musicAssisted){musicStairAssist=musicAssisted.assist;assistArrived=musicAssisted.done;if(musicAssisted.blocked)companionV2?.cancelSettling();}
      const guideWalk = guideApproach && guideApproach !== 'facing' && companionV2
        ? advanceMusicInteriorWalkAssistFrame(guideApproach, walk, dt, TERRAIN_WALK_SPEED, (state, delta) => companionV2.constrainPlayerMove(state, delta)) : null;
      const guidedDelta = guided ? mogaoHallArrivalDelta(guided, checkpoint.position, dt) : null;
      const vector = guidedDelta ?? guideWalk?.delta ?? (musicAssisted ? musicAssisted.delta : assisted ? assisted.delta : travelCamera?travelCamera.vector(control.x,control.y,checkpoint.cameraYaw,dt):movementVector(control.x, control.y, checkpoint.cameraYaw));
      const desiredSpeed = terrain ? control.run ? TERRAIN_RUN_SPEED : TERRAIN_WALK_SPEED
        : cinematicPreview ? control.run ? 4.4 : 1.8 : control.run ? RUN_SPEED : WALK_SPEED;
      // Manual collision solvers already substep. A slower frame can cover its
      // elapsed walking distance without stretching cinematic timers.
      const movementDt = terrain && !guidedDelta && !guideWalk && !musicAssisted && !assisted ? Math.min(frameSeconds, .15) : dt;
      const delta = guidedDelta ?? guideWalk?.delta ?? { x: vector.x * desiredSpeed * movementDt, z: vector.z * desiredSpeed * movementDt };
      const upperNext = assisted?.walk ?? (upperNavigation ? moveUpperPlayer(walk, delta, exhibitGateBlocks(), hallAGateBlocks(), !!options.mogaoExhibit) : null);
      const musicNext = guideWalk?.walk ?? musicAssisted?.walk ?? (musicNavigation ? companionV2?.constrainPlayerMove(walk, delta) : null);
      let next = musicNext?.position ?? (companionV1 ? companionV1.constrainPlayerMove(checkpoint.position,delta) : upperNext?.position ?? (terrain ? moveTerrainPlayer(checkpoint.position,delta,!!options.firstGallery) : mogaoV8 ? mogaoV8Rules.moveMogaoPlayer(checkpoint.position,delta) : mogaoV7 ? mogaoV7Rules.moveMogaoPlayer(checkpoint.position,delta) : movePlayer(checkpoint.position,delta,colliders,bounds)));
      let nextSurface = (musicNext ?? upperNext)?.surfaceId ?? undefined;
      const attemptedMove = nextSurface !== previousSurface || Math.hypot(next.x - checkpoint.position.x, next.z - checkpoint.position.z) > .00001;
      const galleryBlock = galleryState && attemptedMove ? connected
        ? connectedGalleryBlockedRegion(next, firstGalleryUnlocked(), musicGalleryUnlocked)
        : galleryBlockedRegion(next, firstGalleryUnlocked()) ?? world.firstGalleryEntryStatus?.(next) : null;
      const entryStatus = attemptedMove && !galleryBlock ? previewEntryStatus(next, nextSurface) : null;
      if (galleryBlock) {
        gallery?.block(connected && galleryBlock === 'stories' ? 'third-locked' : galleryBlock);
        next = checkpoint.position;
      } else if (entryStatus) {
        previewEntry = entryStatus;
        previewAttempt = { position: next, surface: nextSurface };
        streamPreview(next, nextSurface);
        next = checkpoint.position;
      } else {
        if (attemptedMove) { previewEntry = undefined; previewAttempt = undefined; }
        if (assisted) stairAssist = assisted.assist;
        const canStartArrival = options.mogaoExhibit?.canStartHallArrival;
        const completedUp = assisted?.done && !assisted.blocked && stairTrip?.direction === 'up'
          && stairTrip.destination.surfaceId === nextSurface;
        if (canStartArrival && !guided && (attemptedMove || completedUp) && canControlCamera()) {
          const before = { position: checkpoint.position, surfaceId: checkpoint.walkSurface ?? null };
          const after = { position: next, surfaceId: nextSurface ?? null };
          if (blockedArrival && !isMogaoHallAtDoor(after, blockedArrival)) blockedArrival = null;
          const candidate = (!stairTrip || completedUp) ? findMogaoHallArrival(before, after, completedUp) : null;
          if (candidate && candidate !== blockedArrival && canStartArrival(candidate)) {
            // Keep the last safe exterior point if the input stepped over the seam.
            if (nextSurface === candidate) { next = before.position; nextSurface = before.surfaceId ?? undefined; }
            exhibitArrival = createMogaoHallArrival(candidate, next);
            cancelStairAssists();
            lookIntent = 0; lookPitch = 0; zoomOffset = 0;
            input.setEnabled(false);
            arrivalChanged = true;
          }
        }
        if (upper || musicInterior) checkpoint.walkSurface = nextSurface;
      }
      if (guideVisit && previousSurface === 'music-stair' && onMusicUpperFloor(checkpoint.walkSurface)) {
        manualUpperLanding = !assistArrived;
      } else if (!onMusicUpperFloor(checkpoint.walkSurface)) manualUpperLanding = false;
      const beforePosition = checkpoint.position;
      const distance = Math.hypot(next.x - beforePosition.x, next.z - beforePosition.z);
      speed = movementDt ? distance / movementDt : 0;
      if (speed > .05) {
        const heading = Math.atan2(-vector.x, -vector.z);
        const delta = Math.atan2(Math.sin(heading - checkpoint.heading), Math.cos(heading - checkpoint.heading));
        checkpoint.heading += delta * (reduced ? 1 : 1 - Math.exp(-dt * 15));
      }
      checkpoint.position = next;
      if (exhibitGroundGuidance && (distance > .00001 || previousSurface !== checkpoint.walkSurface)) {
        exhibitGroundGuidance.update({ position: beforePosition, surfaceId: previousSurface ?? null },
          { position: next, surfaceId: checkpoint.walkSurface ?? null });
      }
      if (previousSurface === 'music-courtyard' && !checkpoint.walkSurface) resetMusicGuideVisit();
      moving = speed > .05;
      if (guideWalk) {
        if (guideWalk.blocked || galleryBlock || entryStatus || checkpoint.walkSurface !== guideMeetingPoint?.surfaceId) finishGuideApproach(false);
        else guideApproach = guideWalk.done ? 'facing' : guideWalk.assist;
      }
      if (guideApproach === 'facing' && guideStation) {
        const heading = Math.atan2(next.x - guideStation.position.x, next.z - guideStation.position.z);
        // Let the player face the guide while the over-the-shoulder view keeps
        // both actors separated, including in a wide mobile viewport.
        const cameraHeading = heading + .58;
        turnTravelerAndCamera(heading, dt, cameraHeading);
        if (Math.abs(normalizedYaw(heading - checkpoint.heading)) < .05 && Math.abs(normalizedYaw(cameraHeading - checkpoint.cameraYaw)) < .05) {
          finishGuideApproach(true);
          input.clear();
          travelCamera?.reset();
          arrivalChanged = true;
        }
      } else if (guideWalk && guideApproach && moving) {
        const turn = normalizedYaw(checkpoint.heading - checkpoint.cameraYaw);
        checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + (reduced ? turn : THREE.MathUtils.clamp(turn, -dt * 1.8, dt * 1.8)));
      } else if((assisted||musicAssisted)&&moving){
        if(elapsed>=assistLookUntil){
          const turn=Math.atan2(Math.sin(checkpoint.heading-checkpoint.cameraYaw),Math.cos(checkpoint.heading-checkpoint.cameraYaw));
          const eased=turn*(reduced?1:1-Math.exp(-dt*4));
          // One continuous switchback should not whip the camera even when the
          // waypoint heading changes quickly at the landing's two corners.
          checkpoint.cameraYaw=yawLimit(checkpoint.cameraYaw+(reduced?eased:THREE.MathUtils.clamp(eased,-dt*2.2,dt*2.2)));
        }
      }else if(travelCamera)checkpoint.cameraYaw=travelCamera.yaw(checkpoint.cameraYaw,checkpoint.heading,moving,dt,reduced);
      if (guided) {
        const oldPhase = guided.phase;
        const aim = guided.phase === 'title' ? mogaoHallTitleYaw(guided.hall, guided.start) : checkpoint.heading;
        const turn = (from: number) => Math.atan2(Math.sin(aim - from), Math.cos(aim - from)) * (reduced ? 1 : 1 - Math.exp(-dt * 9));
        if (guided.phase === 'title') checkpoint.heading += turn(checkpoint.heading);
        checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + turn(checkpoint.cameraYaw));
        const result = advanceMogaoHallArrival(guided, beforePosition, { position: next, surfaceId: checkpoint.walkSurface ?? null }, dt);
        if (result === 'blocked') { blockedArrival = guided.hall; releaseExhibitArrival(); }
        arrivalChanged = oldPhase !== guided.phase || result === 'blocked';
      }
    } else moving = false;
    const musicPoint = localPoint('music', checkpoint.position);
    audio?.update(musicPoint, checkpoint.cameraYaw - (terrain ? TERRAIN_REGIONS.music.yaw : 0),
      (!galleryState || isFirstGalleryUnlocked(galleryState)) && (!previewResources || (terrain ? terrainMusicArmed || moving : earlyIntent)));
    if (terrain && moving && !terrainMusicArmed) {
      terrainMusicArmed = true;
      audio?.setEnabled(true);
    }
    if(encounters && view==='follow' && !overview){
      const before=encounters.state, speech=currentEncounterVoice()?.inspect();
      const done=musicV6?!!speech?.ended:!speech||speech.ended||speech.status==='missing'||speech.status==='error'||speech.status==='blocked';
      encounters.update(musicPoint, dt, done, terrain ? audio?.inspect() : undefined, !companion && world.musicFlyingReady?.() !== false);
      const after=encounters.state;
      if(after&&!before){
        director?.skip();input.setEnabled(false);travelCamera?.reset();speed=0;moving=false;
        encounterVoices?.[after.id].enter();
      }else if(before&&!after){
        encounterVoices?.[before.id].exit();input.setEnabled(loaded&&!paused);travelCamera?.reset();
      }
      if(after){speed=0;moving=false;currentEncounterVoice()?.update(after.time>=(after.id==='music'?.35:.1));}
      if (!terrain) audio?.setEnabled(encounters.musicHeard);
    }
    const beforeShot = director?.state;
    if (director && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting') {
      const control = input.read();
      const intent = Math.hypot(control.x, control.y) > .01 || control.camera !== 0;
      const nearHall = nearestDiscovery() === 'caisson';
      const safeHall = nearHall && !director.seen.hall && !!characterCameraPose('hall', 0, checkpoint.position, heightAt(checkpoint.position), checkpoint.heading, checkpoint.cameraYaw);
      director.update(dt, nearHall, intent, reduced, safeHall);
      const shot = director.state;
      if (shot && !beforeShot) shotHeading = checkpoint.heading;
      if (shot?.id === 'opening') {
        const distance = openingDistance(shot.time) - openingDistance(beforeShot?.time ?? 0);
        const next = movePlayer(checkpoint.position, { x: 0, z: -distance }, colliders, bounds);
        speed = dt ? Math.hypot(next.x - checkpoint.position.x, next.z - checkpoint.position.z) / dt : 0;
        checkpoint.position = next; moving = speed > .05;
      }
      if (shot && shot.time >= shot.duration) { director.finish(); snapFollow = true; }
    }
    if (!history?.holdsVideo) world.music?.update(dt,reduced);
    const flying = world.music?.inspect();
    history?.update(dt, reduced, !!flying?.complete, poseSettled);
    voice?.update(view==='flying'&&(musicV5?!!flying?.complete:(flying?.time??0)>=flyingDialogue.startAt));
    audio?.setDucked(!!guideVisit?.speechLine||!!companion?.state.dialogue||!!history?.speaking||!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing||!!galleryNarration?.inspect()?.playing);
    if(flying?.awakened && !checkpoint.visitedEvents.includes('flying')) checkpoint.visitedEvents.push('flying');
    if (portalPrelude) {
      const previousTime = portalPrelude.time;
      portalPrelude.time += dt;
      const { time, yaw, route } = portalPrelude;
      const { turn, reveal, question, walk } = GALLERY_PORTAL_PRELUDE;
      if (previousTime < turn && time >= turn) galleryGaze?.start(portalLookTarget);
      if (time >= turn) {
        const heading = Math.atan2(checkpoint.position.x - portalLookTarget.x, checkpoint.position.z - portalLookTarget.z);
        turnTravelerAndCamera(heading, dt, yaw);
      }
      if (time >= reveal) galleryDisplay?.setPortalReveal(reduced ? 1 : THREE.MathUtils.clamp((time - reveal) / (question - reveal), 0, 1));
      if (time >= walk) {
        portalPrelude = null;
        galleryGaze?.cancel();
        if (route) portalWalk = route;
        else finishGalleryPortal('skipped');
      }
    } else if (portalWalk && view === 'follow' && !overview) {
      const { position, phase } = portalWalk.advance(checkpoint.position, dt);
      const dx = position.x - checkpoint.position.x, dz = position.z - checkpoint.position.z;
      checkpoint.position = position;
      if (phase === 'walking') {
        speed = dt ? Math.hypot(dx, dz) / dt : 0;
        moving = speed > .05;
        if (moving) turnTravelerAndCamera(Math.atan2(-dx, -dz), dt);
      } else {
        finishGalleryPortal(phase);
        speed = 0;
      }
    }
    if (portalNotice === 'arrived') {
      const target = GALLERY_TARGETS.scroll;
      turnTravelerAndCamera(Math.atan2(checkpoint.position.x - target.x, checkpoint.position.z - target.z), dt);
    }
    if (mural && galleryState) {
      const wasActive = mural.active;
      const previousPhase = mural.phase;
      const wall = GALLERY_TARGETS.wall;
      const wallHeading = Math.atan2(checkpoint.position.x - wall.x, checkpoint.position.z - wall.z);
      const head = previousPhase === 'face-wall' ? galleryGaze?.inspect().forward : null;
      const headHeading = head ? Math.atan2(-head[0], -head[2]) : wallHeading;
      const facingWall = Math.abs(normalizedYaw(wallHeading - checkpoint.heading)) <= THREE.MathUtils.degToRad(6)
        && Math.abs(normalizedYaw(wallHeading - world.traveler.rotation.y)) <= THREE.MathUtils.degToRad(8)
        && Math.abs(normalizedYaw(wallHeading - headHeading)) <= THREE.MathUtils.degToRad(12);
      const next = mural.update(checkpoint.position, dt, !galleryMuralPreparation && !galleryBlocked && !galleryCaissonView && !portalBusy() && !portalNotice && view === 'follow' && !overview,
        galleryState.muralParts, true, facingWall, galleryWindowBlurred ? 0 : frameSeconds);
      if (previousPhase === 'repair' && mural.phase !== 'repair') galleryDisplay?.stopMuralLight();
      if (mural.phase === 'renew') galleryDisplay?.renewMural(mural.elapsed / MURAL_RENEW_SECONDS);
      else if (previousPhase === 'renew') galleryDisplay?.renewMural(1);
      if (wasActive) {
        if (previousPhase !== mural.phase && (mural.phase === 'outbound' || mural.phase === 'returning')) {
          // Start the walk from the visible performance heading.
          checkpoint.heading = world.traveler.rotation.y;
          galleryGaze?.update(0, checkpoint.heading, true);
          muralGazeTarget = null;
        }
        const dx = next.x - checkpoint.position.x, dz = next.z - checkpoint.position.z;
        speed = dt ? Math.hypot(dx, dz) / dt : 0;
        moving = speed > .05;
        if (moving) {
          const heading = Math.atan2(-dx, -dz);
          const turn = Math.atan2(Math.sin(heading - checkpoint.heading), Math.cos(heading - checkpoint.heading));
          const eased = turn * (1 - Math.exp(-dt * 10));
          checkpoint.heading += reduced ? turn : THREE.MathUtils.clamp(eased, -dt * 2.8, dt * 2.8);
        } else if (previousPhase === 'face-wall' && mural.phase === 'pick') {
          checkpoint.heading = wallHeading;
        } else if (mural.phase === 'wall' || mural.phase === 'face-wall') {
          const turn = normalizedYaw(wallHeading - checkpoint.heading);
          checkpoint.heading = normalizedYaw(checkpoint.heading + (reduced ? turn : THREE.MathUtils.clamp(turn, -dt * 3, dt * 3)));
        }
        checkpoint.position = next;
        if (!mural.active) restoreMuralControls();
      }
      syncMuralMarker();
    }
    if (gallery && galleryState) {
      if (!connected) world.updateFirstGalleryStreaming?.(checkpoint.position, isFirstGalleryUnlocked(galleryState));
      prepareGalleryDisplay();
      gallery.update(checkpoint.position, moving, dt, { mural: galleryState.muralParts.length === 3, caisson: galleryState.caissonCompleted, easel: galleryState.coloringCompleted, unlocked: isFirstGalleryUnlocked(galleryState) },
        !galleryBlocked && !galleryCaissonView && !portalBusy() && !portalNotice && !mural?.active && mural?.phase !== 'invite' && view === 'follow' && !overview && !encounters?.state,
        true, galleryWindowBlurred ? 0 : frameSeconds);
      galleryStepped = true;
      const readIntroduction = gallery.consumeIntroduction();
      if (readIntroduction && readIntroduction !== 'scroll') markGalleryIntroductionSeen(readIntroduction);
      const cue = gallery.snapshot();
      if (mural?.active) {
        const targetId = mural.gaze();
        if (targetId !== muralGazeTarget) {
          muralGazeTarget = targetId;
          if (targetId) {
            const target = GALLERY_TARGETS[targetId];
            galleryGaze?.start(new THREE.Vector3(target.x, target.y, target.z));
          } else galleryGaze?.cancel();
        }
      } else if (!portalPrelude && cue.cueId !== galleryCueId) {
        galleryCueId = cue.cueId;
        if (cue.cue) { const target = GALLERY_TARGETS[cue.cue.target]; galleryGaze?.start(new THREE.Vector3(target.x, target.y, target.z), cue.cue.target === 'caisson' ? 'up' : 'object'); }
        else galleryGaze?.cancel();
      }
    }
    updateTraveler(speed, dt);
    galleryDisplay?.update(dt, reduced);
    if(companion){
      if (guideSurfaceRevealElapsed !== null) presentCompanion(dt);
      else if(view!=='follow'||overview||encounters?.state)stopCompanion();
      else {
        const settleAtUpperLanding = manualUpperLanding && !moving;
        if (settleAtUpperLanding) manualUpperLanding = false;
        updateCompanion(dt,playerRunning,assistArrived || settleAtUpperLanding,frameSeconds);
      }
    }
    world.updateTerrain?.(dt);
    const desiredPose = overview ? (options.environmentVersion?ENVIRONMENT_OVERVIEW:TERRAIN_OVERVIEW) : view === 'caisson' ? (terrain?terrainPose('courtyard',caissonCameraPose()):caissonCameraPose()) : view === 'flying' ? flyingPose(camera.aspect, history?.closeup) : followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    const damping = reduced ? 1 : 1 - Math.exp(-dt * (view === 'caisson' ? 2 : 10));
    // Follow the current valid player anchor; easing an old anchor can cut through
    // an inside corner even when the player's collision path goes around it.
    if (view === 'follow') cameraTarget.copy(desiredPose.target);
    else cameraTarget.lerp(desiredPose.target, damping);
    camera.position.lerp(desiredPose.position, damping);
    if (view === 'follow' && !overview) {
      const subject=cameraSpace?.subjectHeight===undefined?undefined:new THREE.Vector3(checkpoint.position.x,heightAt(checkpoint.position)+cameraSpace.subjectHeight,checkpoint.position.z);
      camera.position.copy(usesMusicSurface(checkpoint.walkSurface)
        ?settleMusicInteriorCamera(cameraTarget,camera.position,interiorCameraSpace)
        :usesUpperSurface(checkpoint.walkSurface)
        ?settleUpperCamera(cameraTarget,camera.position,exhibitGateBlocks(),!!options.mogaoExhibit,hallAGateBlocks())
        :terrain&&cameraSpace&&subject
        ?settleTerrainCamera(cameraTarget,camera.position,desiredPose.position,cameraSpace,subject,terrainRegionAt(checkpoint.position)==='cliff')
        :mogaoV11&&cameraSpace&&subject
        ?settleStairCamera(cameraTarget,camera.position,desiredPose.position,cameraSpace,subject)
        :settleFollowCamera(cameraTarget,camera.position,desiredPose.position,cameraSpace,subject));
    }
    const shot = director?.state;
    if (shot) {
      const pose = characterCameraPose(shot.id, shot.time, checkpoint.position, heightAt(checkpoint.position), shotHeading, checkpoint.cameraYaw);
      if (pose) { camera.position.copy(pose.position); cameraTarget.copy(pose.target); }
      else { director?.skip(); snapFollow = true; }
    }
    if (snapFollow && view === 'follow' && !overview) restoreFollow();
    const muralPose = mural?.camera(camera.aspect, reduced);
    let caissonPose: FirstGalleryMuralCameraPose | null = null;
    if (galleryCaissonView) {
      const observation = galleryCaissonView;
      observation.time = reduced ? GALLERY_CAISSON_CAMERA_SECONDS : Math.min(GALLERY_CAISSON_CAMERA_SECONDS, observation.time + dt);
      const goal = observation.returning ? {
        position: desiredPose.position,
        target: explorationLookTarget(desiredPose.position, desiredPose.target, lookIntent),
        fov: 49,
      } : firstGalleryCaissonCameraPose(camera.aspect);
      caissonPose = observation.time === GALLERY_CAISSON_CAMERA_SECONDS ? goal
        : firstGalleryMuralCameraTransition(observation.entry, goal, observation.time / GALLERY_CAISSON_CAMERA_SECONDS, { slerpView: true });
      if (observation.returning && observation.time === GALLERY_CAISSON_CAMERA_SECONDS) {
        galleryCaissonView = null;
        input.clear();
      }
    }
    const galleryPose = caissonPose ?? muralPose;
    if (galleryPose) {
      const anchor = new THREE.Vector3(checkpoint.position.x, heightAt(checkpoint.position) + 1.4, checkpoint.position.z);
      camera.position.copy(cameraSpace && (galleryCaissonView || muralPose)
        ? settleTerrainCamera(anchor, galleryPose.position, galleryPose.position, cameraSpace, anchor)
        : galleryPose.position);
      cameraTarget.copy(galleryPose.target);
    }
    const hallPose = exhibitArrival ? mogaoHallTitleCamera(exhibitArrival, reduced, exhibitGateBlocks(), hallAGateBlocks()) : null;
    if (hallPose) {
      const subject = new THREE.Vector3(checkpoint.position.x, heightAt(checkpoint.position) + 1.25, checkpoint.position.z);
      camera.position.lerp(hallPose.position, hallPose.weight);
      camera.position.copy(settleUpperCamera(subject, camera.position, exhibitGateBlocks(), true, hallAGateBlocks()));
      cameraTarget.lerp(hallPose.target, hallPose.weight);
    }
    const fov = galleryPose?.fov ?? (hallPose ? THREE.MathUtils.lerp(49, hallPose.fov, hallPose.weight) : THREE.MathUtils.lerp(camera.fov, 49, damping));
    if (Math.abs(camera.fov - fov) > .001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    world.updateCameraVisibility(cameraTarget, camera.position, dt, reduced,upper&&isUpperStairSurface(checkpoint.walkSurface));
    lookPitch=THREE.MathUtils.lerp(lookPitch,lookIntent,reduced?1:1-Math.exp(-dt*7));
    visualTarget.copy(!galleryPose&&!overview&&view==='follow'?explorationLookTarget(camera.position,cameraTarget,lookPitch):cameraTarget);
    if (portalPrelude) {
      const { turn, reveal, walk } = GALLERY_PORTAL_PRELUDE;
      const weight = THREE.MathUtils.smoothstep(portalPrelude.time, turn, reveal - .35) *
        (1 - THREE.MathUtils.smoothstep(portalPrelude.time, walk - .35, walk));
      visualTarget.lerp(portalLookTarget, weight);
    }
    camera.lookAt(visualTarget);
    updateGalleryCaissonObservation(dt);
    syncGalleryNarration();
    galleryNarration?.update(frameSeconds);
    if(buddhaGaze&&buddhaVoice){
      const inside=inMogaoRoom(checkpoint.position);
      const surface = checkpoint.walkSurface;
      const observationFloor = !options.mogaoExhibit || surface === 'ground' || !!surface?.startsWith('view-');
      const eligible=inside&&observationFloor&&view==='follow'&&hallArrival?.phase!=='waiting'&&!encounters?.state&&!director?.state&&!overview&&buddhaInView();
      buddhaSightTime-=dt;
      if(!eligible){buddhaSightClear=false;buddhaSightTime=0;}
      else if(!buddhaGaze.inspect().seen&&buddhaSightTime<=0){
        buddhaSightClear=!!world.buddhaVisibleAtCenter?.(camera, options.mogaoExhibit ? buddhaHeadProjection : undefined);
        buddhaSightTime=.2;
      }
      if(buddhaGaze.update(inside,eligible&&buddhaSightClear,dt)){buddhaVoice.enter();buddhaVoice.update(true);}
      if((!inside||!observationFloor)&&buddhaVoice.inspect().active)buddhaVoice.exit();
      audio?.setDucked(!!guideVisit?.speechLine||!!companion?.state.dialogue||!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||buddhaVoice.inspect().playing||!!galleryNarration?.inspect()?.playing);
    }
    poseSettled = camera.position.distanceToSquared(desiredPose.position) < .00002 && cameraTarget.distanceToSquared(desiredPose.target) < .00002;
    render(true);
    if (arrivalChanged || time - lastEmit > 100 || moving !== wasMoving) { lastEmit = time; emit(); }
    // Caisson is static once the observation camera arrives; avoid wasteful idle renders.
    if (!(view === 'caisson' && poseSettled && observationTime>3.2)) schedule();
  }
  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    if (disposed || !width || !height) return;
    viewportWidth = width;
    viewportHeight = height;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  }
  function turnCamera(delta: number) {
    if (!canControlCamera() || !Number.isFinite(delta)) return;
    finishGuideApproach(false);
    cancelGalleryCueOnMotion();
    hallArrival?.dismiss();
    if(stairAssist||musicStairAssist)assistLookUntil=elapsed+2;
    skipCinematic(); travelCamera?.manual(); checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + delta); schedule();
  }
  function canControlCamera() {
    return loaded && guideSurfaceRevealElapsed === null && guideVisit?.speechLine !== 'intro' && !disposed && !failed && !paused && !galleryBlocked && !galleryCaissonView && !portalBusy() && !portalNotice && !galleryArtworkFeedbackActive() && !mural?.active && !exhibitArrival && !document.hidden && !overview && view==='follow' && !encounters?.state && hallArrival?.phase!=='waiting';
  }
  function tiltCamera(delta:number) {
    if (!canControlCamera() || !Number.isFinite(delta)) return;
    finishGuideApproach(false);
    cancelGalleryCueOnMotion();hallArrival?.dismiss();skipCinematic();lookIntent=THREE.MathUtils.clamp(lookIntent+delta,MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK);schedule();emit();
  }
  function zoomCamera(delta:number) {
    if (!canControlCamera() || !Number.isFinite(delta)) return;
    cancelGalleryCueOnMotion();hallArrival?.dismiss();skipCinematic();zoomOffset=cameraZoomOffset(zoomOffset,delta);schedule();emit();
  }
  function setFlyingBlocked(blocked: boolean) {
    const music = world.music;
    if (music && 'setFlyingBlocked' in music) music.setFlyingBlocked(blocked);
  }
  function syncFlyingPlayback() {
    const blocked = paused || document.hidden || view !== 'flying';
    history?.setBlocked(blocked);
    setFlyingBlocked(blocked || !!history?.holdsVideo);
  }
  function visibility() {
    if(document.hidden){stopGuideShowcase();cancelStairAssists();stopCompanion();}
    galleryNarration?.setBlocked(document.hidden || paused || galleryWindowBlurred || view !== 'follow' || overview);
    syncFlyingPlayback();
    buddhaVoice?.setBlocked(document.hidden||paused||view!=='follow');
    blockEncounterVoices(document.hidden||paused||view!=='follow');
    input.clear(); travelCamera?.reset(); voice?.setBlocked(document.hidden||paused||view!=='flying'); audio?.setDucked(!!guideVisit?.speechLine||!!companion?.state.dialogue||!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing); audio?.setBlocked(document.hidden||paused||view==='story'); moving = false; previousTime = 0;
    if (document.hidden) { skipCinematic(); stop(); emit(); } else schedule();
  }
  function contextLost(event: Event) { event.preventDefault(); fail('浏览器暂停了3D画面。请重新加载。'); }
  const blur = () => { galleryWindowBlurred = true; galleryNarration?.setBlocked(true); history?.setBlocked(true); setFlyingBlocked(true); cancelStairAssists(); stopCompanion(); buddhaVoice?.setBlocked(true); blockEncounterVoices(true); skipCinematic(); input.clear(); travelCamera?.reset(); voice?.setBlocked(true); audio?.setDucked(false); audio?.setBlocked(true); };
  const focusGallery = () => { galleryWindowBlurred = false; galleryNarration?.setBlocked(document.hidden || paused || view !== 'follow' || overview); schedule(); };
  window.addEventListener('blur', blur);
  if (gallery) window.addEventListener('focus', focusGallery);
  if (guideVisit) window.addEventListener('focus', syncFlyingPlayback);
  if(mogaoV10)window.addEventListener('focus',visibility);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  updateTraveler(0); resize(); emit();
  function prepareGalleryDisplay() {
    if (!gallery || galleryDisplay || world.firstGalleryCourtyardReady?.() === false) return;
    galleryDisplay = createFirstGalleryDisplay(world.scene, world.traveler);
    galleryDisplay.setMuralMarker(false, { x: muralObserver.x, y: heightAt(muralObserver), z: muralObserver.z });
    if (galleryState) {
      galleryDisplay.setParts(galleryState.muralParts, true);
      galleryDisplay.setPortalReveal(Number(!portalLightPending && isFirstGalleryUnlocked(galleryState)));
    }
    if (galleryArtwork) galleryDisplay.setArtwork(galleryArtwork);
    void galleryDisplay.ready.then(() => {
      if (disposed || failed) return;
      galleryMuralPreparation = undefined;
      emit(); schedule();
    }, () => {
      if (disposed || failed) return;
      galleryMuralPreparation = 'failed';
      emit();
    });
  }
  void world.ready.then(async () => {
    if (disposed || failed) return;
    prepareGalleryDisplay();
    await world.prepareEnvironment?.(renderer,camera);
    if (disposed || failed) return;
    // A recovered award can pause the first frame. Start any authorized
    // viewing-room load before notifying the UI that it can show the award.
    if (options.mogaoExhibit) streamPreview(checkpoint.position, checkpoint.walkSurface);
    loaded = true; input.clear(); input.setEnabled(loaded && !paused && !galleryBlocked && !overview && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting');
    updateTraveler(0); if(companion)updateCompanion(0);
    const loadedPose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    camera.position.copy(loadedPose.position); cameraTarget.copy(loadedPose.target); camera.lookAt(cameraTarget);
    world.updateCameraVisibility(cameraTarget, camera.position, 0, true,upper&&isUpperStairSurface(checkpoint.walkSurface));
    director?.opening(Math.hypot(checkpoint.position.x - WORLD_SPAWN.x, checkpoint.position.z - WORLD_SPAWN.z) < .5, reduced, earlyIntent || paused);
    shotHeading = checkpoint.heading;
    const firstShot = director?.state;
    if (firstShot) {
      updateTraveler(0);
      const pose = characterCameraPose('opening', 0, checkpoint.position, heightAt(checkpoint.position), checkpoint.heading, checkpoint.cameraYaw);
      if (pose) { camera.position.copy(pose.position); cameraTarget.copy(pose.target); camera.lookAt(cameraTarget); }
      else director?.skip();
    }
    render();
    if (failed) return;
    emit(); options.onReady?.(); schedule();
    if (world.loadGroundDetail) requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!disposed && !failed) void world.loadGroundDetail?.().then(() => schedule());
    }));
  }).catch(error => {
    fail(error instanceof Error ? error.message : '美术模型加载失败。请重新加载。');
  });
  return {
    snapshot, skipCinematic,
    setMusicGalleryAccess(unlocked, prewarm) {
      if (!connected || (musicGalleryUnlocked === unlocked && prewarmCliffTower === prewarm)) return;
      musicGalleryUnlocked = unlocked;
      prewarmCliffTower = prewarm;
      streamPreview(checkpoint.position, checkpoint.walkSurface);
      schedule();
      emit();
    },
    setMogaoExhibitGateLocked(locked) {
      if (!options.mogaoExhibit || locked || !exhibitGateLocked) return;
      exhibitGateLocked = false;
      startedViewingExhibits = true;
      streamPreview(checkpoint.position, checkpoint.walkSurface);
      schedule();
    },
    setMogaoHallAGateLocked(locked) {
      if (!options.mogaoExhibit || locked || !hallAGateLocked) return;
      hallAGateLocked = false;
      streamPreview(checkpoint.position, checkpoint.walkSurface);
      schedule();
    },
    unlockMogaoGamePortal() {
      if (!options.mogaoExhibit || mogaoGamePortal || disposed || failed) return;
      mogaoGamePortal = createMogaoGamePortal(world.scene);
      schedule();
      emit();
    },
    unlockMusicGamePortal() {
      if (!musicInterior || !options.musicGamePortal || musicGamePortal || disposed || failed) return;
      musicGamePortal = createMusicGamePortal();
      schedule();
      emit();
    },
    retryPreviewStreaming() {
      world.retryPreviewStreaming?.();
      if (connected && previewAttempt) streamPreview(previewAttempt.position, previewAttempt.surface);
      schedule();
    },
    setGalleryInteractionBlocked(value) {
      if (!gallery || galleryBlocked === value) return;
      galleryBlocked = value;
      if (value && gallery.snapshot().cue) cancelGalleryCue();
      input.clear(); moving = false; travelCamera?.reset();
      input.setEnabled(loaded && !paused && !value && view === 'follow');
      if (!value) canvas.focus({ preventScroll: true });
      schedule(); emit();
    },
    showGalleryCue(lines, retainWhileMoving) {
      if (!gallery || !inFirstGallery()) return;
      gallery.say(lines, retainWhileMoving);
      if (galleryArtworkFeedbackActive()) { input.clear(); moving = false; }
      syncGalleryNarration();
      schedule(); emit();
    },
    playGalleryCaissonNarration(id, onFinish) {
      if (!inFirstGallery() || disposed || failed) return;
      galleryNarration?.play('caisson', id, onFinish, id === 'caisson-summary');
      schedule(); emit();
    },
    skipGalleryCue() {
      if (!skipGalleryNarration()) return false;
      schedule(); emit();
      return true;
    },
    setGalleryArtwork(artwork) { galleryArtwork = artwork; galleryDisplay?.setArtwork(artwork); schedule(); },
    requestGalleryMural() {
      if (!canControlCamera() || !galleryState || galleryMuralPreparation) return;
      mural?.request(checkpoint.position, galleryState.muralParts);
      emit();
    },
    startGalleryMural() {
      if (!mural || !galleryState || !canControlCamera() || galleryMuralPreparation) return;
      if (!mural.start(checkpoint.position, galleryState.muralParts, { position: camera.position.clone(), target: visualTarget.clone(), fov: camera.fov })) return;
      cancelGalleryCue();
      input.clear();
      travelCamera?.reset();
      if (mural.replay) galleryDisplay?.setParts([], true);
      syncMuralMarker();
      canvas.focus({ preventScroll: true });
      schedule(); emit();
    },
    declineGalleryMural() { mural?.decline(); canvas.focus({ preventScroll: true }); schedule(); emit(); },
    exitGalleryMural() {
      if (!mural?.active) return;
      galleryNarration?.cancel('mural');
      muralNarratedId = null;
      mural.exit();
      restoreMuralControls();
      canvas.focus({ preventScroll: true });
      schedule(); emit();
    },
    startGalleryPortal() {
      if (!canStartGalleryPortal()) return;
      portalStarted = true;
      input.clear();
      travelCamera?.reset();
      const heading = Math.atan2(checkpoint.position.x - portalLookTarget.x, checkpoint.position.z - portalLookTarget.z);
      portalPrelude = { time: 0, yaw: galleryPortalCameraYaw(heading), route: createGalleryPortalWalk(checkpoint.position) };
      lookIntent = 0;
      soundPlayer.play('gallery-unlock');
      schedule(); emit();
    },
    skipGalleryPortal() {
      if (!portalBusy() || paused) return;
      finishGalleryPortal('skipped');
      canvas.focus({ preventScroll: true });
      schedule(); emit();
    },
    dismissGalleryPortal() {
      if (!portalNotice) return;
      portalNotice = undefined;
      canvas.focus({ preventScroll: true });
      schedule(); emit();
    },
    observeGalleryCaisson(enabled) {
      if (!gallery || !terrain || options.terrainCaissonVersion !== 'v001' || !loaded || disposed || failed || view !== 'follow') return;
      if (enabled) {
        if (!canControlCamera() || !inFirstGallery() || galleryNearby(checkpoint.position) !== 'caisson') return;
        if (galleryCaissonStage === 'closed') galleryCaissonStage = 'offered';
      } else {
        galleryNarration?.cancel('caisson');
        if (galleryCaissonStage === 'speaking') cancelGalleryCue();
        if (galleryCaissonStage !== 'waiting') galleryCaissonStage = 'closed';
        galleryCaissonQuad = null;
        if (!galleryCaissonView || galleryCaissonView.returning) { emit(); return; }
      }
      galleryCaissonView = {
        entry: { position: camera.position.clone(), target: visualTarget.clone(), fov: camera.fov },
        time: 0,
        returning: !enabled,
      };
      input.clear();
      moving = false;
      schedule(); emit();
    },
    galleryCaissonQuad() {
      if (disposed || failed || galleryCaissonStage !== 'offered' || !inFirstGallery() || galleryCaissonView?.returning || paused || document.hidden) return null;
      return projectGalleryCaissonQuad(world.scene, camera, canvas.getBoundingClientRect());
    },
    finishCompanionDialogue(){companion?.finishDialogue();companionSpeech?.stop();emit();},
    replayCompanionDialogue(){const line=companion?.state.dialogue;if(line&&!paused&&view==='follow')companionSpeech?.speak(line.id,line.text);emit();},
    interactMusicGuide() {
      if (!canControlCamera()) return;
      guideVisit?.interact();
      emit();
    },
    respondMusicGuide(response) {
      if (disposed || failed) return;
      guideVisit?.respond(response);
      emit();
    },
    finishMusicGuideLine(line) { if (!disposed) { guideVisit?.finishLine(line); emit(); } },
    setMusicGuideCaptionPresented(line, presented) { if (!disposed) guideVisit?.setCaptionPresented(line, presented); },
    setMusicGuideVoicePlaying(line, playing) { if (!disposed) guideVisit?.setVoicePlaying(line, playing); },
    cancelMusicGuideLine() { if (!disposed) { guideVisit?.cancelLine(); emit(); } },
    async selectMusicGuideOutfit(id, progress, signal) {
      if (!guideVisit || !world.selectMusicGuideOutfit || !loaded || disposed || failed || signal.aborted) return false;
      if (guideVisit.inspect().outfit !== id) {
        guideRequest?.abort();
        const request = new AbortController();
        const abort = () => request.abort();
        const reveal = !reduced;
        guideRequest = request;
        signal.addEventListener('abort', abort, { once: true });
        try {
          const cue = reveal ? soundPlayer.prepare('guide-stardust') : null;
          const prepared = await world.selectMusicGuideOutfit(id, progress, request.signal, { renderer, camera, reveal });
          if (cue && prepared && !request.signal.aborted) {
            // A stalled optional audio request must not hold a ready outfit.
            let deadline: number | undefined;
            try { await Promise.race([cue, new Promise<void>(resolve => { deadline = window.setTimeout(resolve, 550); })]); }
            finally { window.clearTimeout(deadline); }
          }
          if (!prepared || guideRequest !== request || request.signal.aborted || disposed || failed) return false;
          if (!world.commitMusicGuideOutfit?.(id)) return false;
          guideSurfaceRevealElapsed = reveal && !reduced ? 0 : null;
          guideCloseupAspect = 0;
          guideCloseup = null;
          input.clear();
          if (reveal && reduced) world.finishMusicGuideReveal?.();
        } finally {
          signal.removeEventListener('abort', abort);
          if (guideRequest === request) {
            world.cancelMusicGuideOutfit?.();
            guideRequest = null;
          }
        }
      }
      guideVisit.finishOutfitChange(id, guideSurfaceRevealElapsed !== null);
      presentCompanion(0);
      world.updateTerrain?.(0);
      render();
      emit();
      schedule();
      return !failed;
    },
    setOverview(enabled) {
      if(!terrain||!loaded||view!=='follow'||paused)return;
      if (exhibitArrival) return;
      cancelStairAssists();overview=enabled;input.clear();input.setEnabled(!overview);moving=false;travelCamera?.reset();
      galleryNarration?.setBlocked(overview || document.hidden || galleryWindowBlurred);
      if(overview){lookIntent=0;lookPitch=0;const pose=options.environmentVersion?ENVIRONMENT_OVERVIEW:TERRAIN_OVERVIEW;camera.position.copy(pose.position);cameraTarget.copy(pose.target);camera.lookAt(cameraTarget);}
      else restoreFollow();
      world.updateCameraVisibility(cameraTarget,camera.position,0,true);render();emit();schedule();
    },
    setSound:preferences=>{galleryNarration?.setPreferences(preferences);history?.setSound(preferences);companionSpeech?.setPreferences(preferences);buddhaVoice?.setPreferences(preferences);encounterVoices?.music.setPreferences(preferences);encounterVoices?.mural.setPreferences(preferences);voice?.setPreferences(preferences);audio?.setPreferences(preferences);audio?.setDucked(!!guideVisit?.speechLine||!!companion?.state.dialogue||!!history?.speaking||!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing||!!galleryNarration?.inspect()?.playing);},
    skipBuddhaVoice:()=>{buddhaVoice?.skip();emit();},
    retryBuddhaVoice:()=>{buddhaVoice?.retry();emit();},
    skipVoice:()=>{voice?.skip();emit();},
    setFlyingHistoryCaptionPresented(phase, chapter, presented) { history?.setCaptionPresented(phase, chapter, presented); },
    controlFlyingHistory(action) {
      if (!history || disposed || failed) return;
      history.control(action);
      syncFlyingPlayback();
      emit();
      schedule();
    },
    skipEncounter, retryEncounter:()=>currentEncounterVoice()?.retry(),
    retryVoice:()=>voice?.retry(),
    retrySound:()=>audio?.retry(),
    recordingAudio:()=>audio?.recordingStream()??null,
    captureFrame() {
      if (disposed || !loaded || failed) return undefined;
      // Read immediately after rendering; WebGL may clear its buffer between frames.
      render();
      try { return canvas.toDataURL('image/jpeg', .75); } catch { return undefined; }
    },
    replayObservation() { if(view==='flying') { world.music?.replay(); voice?.enter(); audio?.setDucked(false); emit(); schedule(); } },
    inspect: () => ({ musicGuideSurfaceReveal: guideSurfaceRevealElapsed === null ? null : {
      progress: guideSurfaceRevealElapsed / guideSurfaceRevealSeconds, elapsed: guideSurfaceRevealElapsed, playerOccluding: guidePlayerOccluding,
      audioStarted: guideRevealAudioStarted, showcase: shownGuideCloseup && guideCloseup ? {
        position: guideCloseup.camera.position.toArray(), target: guideCloseup.target.toArray(), fov: guideCloseup.camera.fov,
      } : null,
    }, galleryNarration: galleryNarration?.inspect(), mogaoGamePortal: mogaoGamePortal?.inspect(),
    musicGamePortal: musicGamePortal ? { ...musicGamePortal.inspect(), position: MUSIC_GAME_PORTAL_CENTER } : undefined, exhibit: world.mogaoExhibit?.inspect(), hallA: world.mogaoHallA?.inspect(), musicInstruments: world.musicInstruments?.inspect(), galleryGaze: galleryGaze?.inspect(), galleryDisplay: galleryDisplay?.inspect(), ...snapshot(), mogaoHallArrivalSeconds: exhibitArrival?.seconds, view, paused, loaded, camera: { position: camera.position.toArray(), target: (portalPrelude || lookPitch ? visualTarget : cameraTarget).toArray(), zoomOffset, fov: camera.fov },
      buddhaGaze:buddhaGaze?.inspect(), buddhaInView:mogaoV10?buddhaInView():undefined, landmarkSight: !terrain&&world.music&&'auditSight' in world.music?world.music.auditSight(camera):undefined, traveler: world.inspectTraveler(), companionAvatar: world.inspectCompanion?.(), interiorLighting: world.inspectInterior?.(), terrain:terrain?{logarithmicDepth:renderer.capabilities.logarithmicDepthBuffer,height:heightAt(checkpoint.position),region:terrainRegionAt(checkpoint.position),cameraClearance:camera.position.y-terrainSurfaceHeight(camera.position),overview,scene:world.inspectTerrain?.()}:undefined, seen: director?.seen, stats: { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls } }),
    setPaused(value) {
      // React publishes readiness after model loading; an identical pause state
      // must not clear a key the player pressed during that handoff.
      if (disposed || paused === value) return;
      if (value) {
        stopGuideShowcase();
        if (portalPrelude && portalPrelude.time < GALLERY_PORTAL_PRELUDE.reveal) soundPlayer.stop();
        cancelStairAssists(); stopCompanion(); skipCinematic();
      } else if (portalPrelude && portalPrelude.time >= GALLERY_PORTAL_PRELUDE.turn) {
        galleryGaze?.start(portalLookTarget);
      }
      paused = value; buddhaVoice?.setBlocked(paused||document.hidden||view!=='follow'); blockEncounterVoices(paused||document.hidden||view!=='follow'); travelCamera?.reset(); voice?.setBlocked(paused||document.hidden||view!=='flying'); audio?.setDucked(!!guideVisit?.speechLine||!!companion?.state.dialogue||!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing); audio?.setBlocked(paused||document.hidden||view==='story'); input.setEnabled(loaded && !paused && !galleryBlocked && !overview && !exhibitArrival && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting'); moving = false; previousTime = 0;
      galleryNarration?.setBlocked(paused || document.hidden || galleryWindowBlurred || view !== 'follow' || overview);
      syncFlyingPlayback();
      if (paused) stop(); else schedule(); emit();
    },
    setView(next) {
      if (disposed || view === next) return;
      finishGuideApproach(false);
      if (next === 'story') exhibitGroundGuidance?.dismiss();
      if (guideSurfaceRevealElapsed !== null) {
        stopGuideShowcase();
        finishGuideSurfaceReveal();
      }
      exhibitArrival = null;
      galleryCaissonView = null;
      galleryNarration?.cancel();
      muralNarratedId = null;
      if (mural?.active) { mural.exit(); restoreMuralControls(); }
      cancelGalleryCue();
      cancelStairAssists();
      stopCompanion();
      buddhaVoice?.exit();
      if(encounters?.state)skipEncounter();
      skipCinematic(); if (next === 'caisson') director?.skipHall();
      const exitingFlying = view === 'flying';
      if(exitingFlying) {history?.leave();world.music?.exit();voice?.exit();audio?.setDucked(false);}
      if(next==='flying') { world.music?.update(0,reduced); world.music?.enter(); history?.enter(!!guideVisit?.following); voice?.enter(); const pose=flyingPose(camera.aspect);camera.position.copy(pose.position);cameraTarget.copy(pose.target);camera.lookAt(cameraTarget); }
      view = next; overview=false; observationTime=0; buddhaVoice?.setBlocked(paused||document.hidden||view!=='follow'); blockEncounterVoices(paused||document.hidden||view!=='follow'); travelCamera?.reset(); voice?.setBlocked(paused||document.hidden||view!=='flying'); audio?.setBlocked(paused||document.hidden||view==='story'); if(next==='follow' && exitingFlying) restoreFollow(); input.setEnabled(loaded && !paused && !galleryBlocked && !overview && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting'); moving = false; poseSettled = false; previousTime = 0;
      galleryNarration?.setBlocked(paused || document.hidden || galleryWindowBlurred || view !== 'follow');
      syncFlyingPlayback();
      if (view === 'story') { stop(); updateTraveler(0); render(); }
      else schedule();
      emit();
    },
    finishHallArrival() {
      if (disposed || exhibitArrival?.phase !== 'intro') return;
      releaseExhibitArrival();
      emit();
    },
    setStairAssist(direction) {
      if((!upper&&!musicInterior)||!canControlCamera())return;
      if(musicInterior&&(!connected||usesMusicSurface(checkpoint.walkSurface))){
        companionV2?.cancelSettling();
        musicStairAssist=direction?startMusicInteriorStairAssist({position:checkpoint.position,surfaceId:checkpoint.walkSurface??null},direction,interiorNavigation):null;
        input.clear();travelCamera?.reset();
        if(musicStairAssist){lookIntent=0;lookPitch=0;zoomOffset=0;assistLookUntil=0;}
        else stopCompanion();
        canvas.focus({preventScroll:true});emit();schedule();return;
      }
      if (!upper || (connected && !usesUpperSurface(checkpoint.walkSurface))) return;
      const walk = { position: checkpoint.position, surfaceId: checkpoint.walkSurface ?? null };
      if (direction && options.mogaoExhibit && !isUpperStairAssistArea(walk, true)) return;
      stairAssist=direction?startUpperStairAssist(walk,direction,!!options.mogaoExhibit):null;
      input.clear();travelCamera?.reset();
      if(stairAssist){lookIntent=0;lookPitch=0;zoomOffset=0;assistLookUntil=0;}
      canvas.focus({preventScroll:true});emit();schedule();
    },
    setJoystick(x, y) { if (loaded) input.setJoystick(x, y); },
    turnCamera,
    chooseHallDirection(direction) {
      const offered = exhibitGroundGuidance?.visible(checkpoint) ?? (hallArrival?.phase === 'guidance');
      if (!offered || !canControlCamera()) return;
      hallArrival?.dismiss();
      exhibitGroundGuidance?.dismiss();
      travelCamera?.manual();
      input.clear();
      checkpoint.cameraYaw = yawLimit((direction === 'left' ? Math.PI / 2 : direction === 'right' ? -Math.PI / 2 : 0) + (terrain ? TERRAIN_REGIONS.cliff.yaw : 0));
      lookIntent = direction === 'up' ? 1.05 : 0;
      canvas.focus({ preventScroll: true });
      schedule();
      emit();
    },
    tiltCamera,
    resetCameraLook(){if(!canControlCamera())return;cancelGalleryCue();hallArrival?.dismiss();skipCinematic();travelCamera?.manual();lookIntent=0;lookPitch=0;zoomOffset=0;checkpoint.cameraYaw=yawLimit(checkpoint.heading);restoreFollow();schedule();emit();},
    setReducedMotion(value) { reduced = value; if (value) { stopGuideShowcase(); skipCinematic(); } schedule(); },
    resetToStart() {
      const currentGallery = connected ? connectedGalleryAt(checkpoint) : undefined;
      if (connected && !currentGallery) return;
      exhibitArrival = null; blockedArrival = null;
      exhibitGroundGuidance?.dismiss();
      galleryCaissonView = null;
      galleryNarration?.cancel();
      muralNarratedId = null;
      if (mural?.active) { mural.exit(); restoreMuralControls(); }
      cancelGalleryCue();
      cancelStairAssists();
      stopCompanion();
      if (guideVisit) resetMusicGuideVisit();
      else companion?.reset();
      lookIntent=0;lookPitch=0;zoomOffset=0;
      previewEntry = undefined; previewAttempt = undefined;
      buddhaVoice?.exit();buddhaGaze?.update(false,false,0);
      currentEncounterVoice()?.exit();encounters?.reset();terrainMusicArmed=false;audio?.setEnabled(!terrain&&!encounters);
      skipCinematic();
      history?.leave(); world.music?.exit(); voice?.exit(); audio?.setDucked(false); travelCamera?.reset();
      const spawn=terrain?TERRAIN_SPAWN:WORLD_SPAWN,yaw=terrain?TERRAIN_REGIONS.courtyard.yaw:0;
      if (currentGallery === 'first') checkpoint = connectedGalleryStartCheckpoint();
      else if (currentGallery === 'music') checkpoint = sanitizeMusicCompanionCheckpoint(musicGuidePreviewCheckpoint(), interiorNavigation, true);
      else if (options.mogaoExhibit) checkpoint = mogaoExhibitStartCheckpoint();
      else checkpoint = guideVisit ? musicGuidePreviewCheckpoint() : musicInterior?companionPreviewCheckpointV2(interiorNavigation):companion?companionPreviewCheckpoint():upper?upperPreviewCheckpoint():{ ...checkpoint, position: { ...spawn }, heading: yaw, cameraYaw: yaw };
      overview=false;
      view = 'follow'; input.setEnabled(loaded && !paused); moving = false;
      const pose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
      camera.position.copy(pose.position); cameraTarget.copy(pose.target); camera.lookAt(cameraTarget);
      updateTraveler(0); if(companion)updateCompanion(0); render(); emit(); schedule();
    },
    dispose() {
      if (disposed) return;
      guideRequest?.abort(); guideRequest = null;
      if (portalPrelude) soundPlayer.stop();
      stopGuideShowcase();
      galleryNarration?.cancel();
      disposed = true; unsubscribeGallery(); galleryGaze?.dispose(); galleryDisplay?.dispose(); companionSpeech?.dispose(); disposeCompanionMarker(); buddhaVoice?.dispose(); unregisterEncounterSkip();encounterVoices?.music.dispose();encounterVoices?.mural.dispose();voice?.dispose(); audio?.dispose(); stop(); input.dispose(); resizeObserver.disconnect();
      window.removeEventListener('blur', blur);
      if (gallery) window.removeEventListener('focus', focusGallery);
      if (guideVisit) window.removeEventListener('focus', syncFlyingPlayback);
      if(mogaoV10)window.removeEventListener('focus',visibility);
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', contextLost);
      history?.dispose(); disposeGamePortals(); world.dispose(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
