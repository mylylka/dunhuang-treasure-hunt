import { TERRAIN_REGIONS } from '../content/world/terrain-layout-v001';
import { terrainCanHearMusic, terrainMusicSpatial } from './terrain-events-v001';
import { TERRAIN_BOUNDS, TERRAIN_PLAYER_COLLIDERS, TERRAIN_SPAWN, TERRAIN_RUN_SPEED, TERRAIN_WALK_SPEED, fromTerrainPoint, terrainSurfaceHeight, terrainRegionAt, moveTerrainPlayer, sanitizeTerrainPosition } from './terrain-rules-v001';
import { terrainCameraSpace, terrainFollowPose, terrainPose, settleTerrainCamera, terrainLocalCamera, TERRAIN_OVERVIEW } from './terrain-camera-v001';
import {mogaoCameraSpace as mogaoCameraSpaceV11,mogaoFollowPose as mogaoFollowPoseV11,settleStairCamera} from './mogao-camera-v011';
import * as mogaoV11Rules from './mogao-rules-v011';
import {explorationLookTarget,MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK} from './exploration-look';
import buddhaNarration from '../content/world/buddha-narration-v001.json';
import {buddhaDominatesView,createBuddhaGaze} from './buddha-gaze';
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
import {caveLookTarget} from './cave-look';
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
import { worldAssetUrl } from '../content/world/assets';
import { createFlyingVoice } from './flying-voice';
import { createMusicArrivalAudio } from './music-arrival-audio';
import { defaultSoundPreferences } from '../services/sound-settings';
import * as THREE from 'three';
import { MUSIC_PLAYER_COLLIDERS, nearFlyingMural, musicSurfaceHeight } from './music-pavilion-rules';
import { musicCameraSpace, flyingCameraPose } from './music-pavilion';
import { createArtSampleScene } from './art-sample';
import { createWorldInput } from './input';
import { characterCameraPose, createCinematicDirector, openingHeading, openingDistance } from './character-cinematics';
import { caissonCameraPose, followCameraPose, settleFollowCamera } from './camera';
import { clampCameraYaw, movePlayer, movementVector, RUN_SPEED, sanitizePosition, surfaceHeight, WALK_SPEED, WORLD_SPAWN, WORLD_COLLIDERS } from './movement';
import type { DiscoveryId, WorldCheckpoint, WorldRuntime, WorldRuntimeOptions, WorldSnapshot, WorldView } from './types';

export function createWorldRuntime(container: HTMLElement, options: WorldRuntimeOptions): WorldRuntime {
  let disposed = false;
  let loaded = false;
  let failed = false;
  let paused = false;
  let view: WorldView = 'follow';
  const terrain = options.terrainVersion === 'v001';
  let overview = false;
  let reduced = options.reducedMotion;
  const mogao=!!options.mogao, mogaoV2=options.mogaoVersion==='v002',mogaoV3=options.mogaoVersion==='v003',mogaoV6=options.mogaoVersion==='v006',mogaoV7=options.mogaoVersion==='v007',mogaoV11=options.mogaoVersion==='v011'||options.mogaoVersion==='v012',mogaoV10=mogaoV11||options.mogaoVersion==='v010',mogaoV9=mogaoV10||options.mogaoVersion==='v009',mogaoV8=mogaoV9||options.mogaoVersion==='v008';
  const hallArrival=mogaoV9?createHallArrival():null;
  let lookPitch=Number.isFinite(options.initialLook)?THREE.MathUtils.clamp(options.initialLook!,MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK):0,lookIntent=lookPitch;
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
  const flyingPose=(aspect:number)=>terrain?terrainPose('music',baseFlyingPose(aspect)):baseFlyingPose(aspect);
  const nearMural=(p:{x:number;z:number})=>baseNearMural(localPoint('music',p));
  const cameraSpace=terrain?terrainCameraSpace(options.terrainCaissonVersion==='v001'):mogao?(mogaoV11?mogaoCameraSpaceV11:mogaoV8?mogaoCameraSpaceV8:mogaoV7?mogaoCameraSpaceV7:mogaoV6?mogaoCameraSpaceV6:mogaoV3?mogaoCameraSpaceV3:mogaoV2?mogaoCameraSpaceV2:mogaoCameraSpace)():musicPreview?(musicV4?musicCameraSpaceV4():musicV3?musicCameraSpaceV3():musicV2?musicCameraSpaceV2():musicCameraSpace()):undefined;
  const heightAt=(p: {x:number;z:number})=>terrain?terrainSurfaceHeight(p):mogao?(options.mogaoSurfaceVersion==='v004'?mogaoSurfaceHeightV4(p):mogaoSurfaceHeight(p)):surfaceHeight(p)+(musicPreview?(musicV4?musicSurfaceHeightV4:musicV2?musicSurfaceHeightV2:musicSurfaceHeight)(p):0);
  const followPose=(x:number,y:number,z:number,yaw:number)=>terrain?terrainFollowPose(x,y,z,yaw,cameraSpace!):mogao?(mogaoV11?mogaoFollowPoseV11:mogaoV8?mogaoFollowPoseV8:mogaoV7?mogaoFollowPoseV7:mogaoV6?mogaoFollowPoseV6:mogaoV3?mogaoFollowPoseV3:mogaoV2?mogaoFollowPoseV2:mogaoFollowPose)(x,y,z,yaw,cameraSpace!):followCameraPose(x,y,z,yaw,cameraSpace);
  let checkpoint: WorldCheckpoint = { ...options.initial, position: terrain ? sanitizeTerrainPosition(options.initial.position) : sanitizePosition(options.initial.position, musicPreview ? regionColliders : undefined, bounds), cameraYaw: yawLimit(options.initial.cameraYaw), visitedEvents: [...options.initial.visitedEvents] };
  let moving = false;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0, observationTime=0;
  let lastEmit = -Infinity;
  let poseSettled = false;
  // The open terrain sees centimetre-separated facade trim from 100–250 m.
  // A conventional .1–1400 m depth buffer cannot resolve those surfaces.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: terrain });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D探索画面，WASD或方向键移动，F键互动');
  canvas.dataset.worldCanvas = 'true';
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
  const cinematicPreview = !!options.cinematics || musicPreview;
  const director = !terrain && options.cinematics ? createCinematicDirector(options.cinematics.seen, options.cinematics.onSeen) : null;
  let earlyIntent = false, shotHeading = checkpoint.heading, snapFollow = false;
  const world = createArtSampleScene(cinematicPreview ? { travelerPath: 'traveler-tripo/v002/traveler.glb',
    animationRates: { walk: WALK_SPEED / 1.20591, run: RUN_SPEED / 4.39490 }, presentationClips: true, sampleNature: true, terrainVersion:options.terrainVersion, terrainCaissonVersion:options.terrainCaissonVersion, mogao, mogaoVersion:options.mogaoVersion, mogaoSurfaceVersion:options.mogaoSurfaceVersion, mogaoFacadeVersion:options.mogaoFacadeVersion, musicPavilion: musicPreview, musicVersion: options.musicVersion, flyingAwakened: checkpoint.visitedEvents.includes('flying') } : undefined);
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
  const cameraTarget = new THREE.Vector3();
  const spawnPose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
  camera.position.copy(spawnPose.position); cameraTarget.copy(spawnPose.target); camera.lookAt(cameraTarget);
  const buddhaInView=()=>buddhaDominatesView(terrain?terrainLocalCamera(camera,'cliff'):camera);
  const input = createWorldInput(canvas, () => { if (loaded && !paused && view === 'follow') options.onInteract(); }, delta => turnCamera(delta), () => { earlyIntent = true; skipCinematic(); });
  input.setEnabled(false);
  container.appendChild(canvas);
  const audio=musicV2?createMusicArrivalAudio(options.sound??defaultSoundPreferences(),terrain?terrainMusicSpatial:musicV4?MUSIC_LAYOUT_V4.audio:undefined):null;
  const encounters=musicV5?createMusicEncounters(localPoint('music',checkpoint.position),musicV6,terrain?terrainCanHearMusic:undefined,terrain?{useAudiblePlayback:true,hearingDuration:2.5}:undefined):null;
  const encounterVoices=musicV5?{
    music:createFlyingVoice(new Audio(worldAssetUrl(musicEncounters.music.audioPath)),options.sound??defaultSoundPreferences()),
    mural:createFlyingVoice(new Audio(worldAssetUrl(musicEncounters.mural.audioPath)),options.sound??defaultSoundPreferences()),
  }:null;
  audio?.setEnabled(terrain||!encounters||encounters.musicHeard);
  const voice=options.flyingVoice?createFlyingVoice(flyingDialogue.audioPath?new Audio(worldAssetUrl(flyingDialogue.audioPath)):null,options.sound??defaultSoundPreferences()):null;

  const buddhaGaze=mogaoV10?createBuddhaGaze():null;
  let buddhaSightTime=0,buddhaSightClear=false;
  const buddhaVoice=mogaoV10?createFlyingVoice(new Audio(worldAssetUrl(buddhaNarration.audioPath)),options.sound??defaultSoundPreferences()):null;

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
    if (!loaded || hallArrival?.phase==='waiting') return null;
    const p = checkpoint.position;
    if (musicPreview && nearMural(p) && (!encounters||encounters.muralReady)) return 'flying';
    const courtyardPoint=localPoint('courtyard',p);
    // The terrain hall's ceiling is reserved for the user's next design pass;
    // its low original caisson is temporarily hidden with the old observation.
    if (!terrain && Math.hypot(courtyardPoint.x + 12, courtyardPoint.z + 17) < 2.6) return 'caisson';
    if(mogaoV8)return mogaoV8Rules.nearStoryWall(localPoint('cliff',p));
    if (mogao ? nearDeerWall(p) : Math.hypot(p.x + 5, p.z + 6) < 2.25) return 'story-demo';
    return null;
  }
  function snapshot(): WorldSnapshot {
    const p = checkpoint.position;
    const terrainLocation = terrain ? inMogaoRoom(p)?'石窟内':terrainRegionAt(p)==='courtyard'?'纹彩院 · 山腰':terrainRegionAt(p)==='music'?'月牙泉 · 乐舞坊':terrainRegionAt(p)==='cliff'?'崖前古道':p.x<92?'沙丘坡脊':p.x<160?'下坡古道':'月牙谷地' : null;
    const location = terrainLocation ?? (mogao?mogaoLocation(p):null) ?? (p.x < -2 && p.x > -22 && p.z < 2 && p.z > -24
      ? p.z < -12.3 ? '藻井观赏厅' : '纹彩院'
      : musicPreview && (musicV4?inMusicCourtV4(p):musicV3?inMusicCourtV3(p):musicV2?inMusicCourtV2(p):p.x>8 && p.x<28 && p.z< -2 && p.z> -23) ? '乐舞馆' : p.z < -25 ? '洞窟远景 · 待制作' : !musicPreview && p.x > 10 && p.z < -8 ? '乐舞馆远景 · 待制作' : '沙漠道路');
    return { checkpoint: { ...checkpoint, position: { ...p }, visitedEvents: [...checkpoint.visitedEvents] }, nearby: overview?null:nearestDiscovery(), location, moving, overview, observationTime, caveLook:lookIntent, buddhaVoice:buddhaVoice?.inspect(), hallArrival:hallArrival?.phase, encounter:encounters?.state, encounterVoice:currentEncounterVoice()?.inspect(), cinematic: director?.state ?? null, flying: world.music?.inspect(), musicAudio: audio?.inspect(), flyingVoice: voice?.inspect() };
  }
  function emit() { options.onSnapshot(snapshot()); }
  function updateTraveler(speed: number) {
    world.traveler.position.set(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z);
    const shot = director?.state;
    world.traveler.rotation.y = shot?.id === 'opening' ? openingHeading(shot.time) : checkpoint.heading;
    const encounter=encounters?.state;
    if(encounter && !reduced) world.animatePresentation(encounter.id==='music'?'LookAround':'HallLookUp',encounter.id==='music'?3.5+Math.min(1,encounter.time/2.8)*8.4:Math.min(encounter.time,2.25));
    else if (shot?.id === 'opening' && shot.time < 1.75) world.animatePresentation('Greeting', shot.time);
    else if (shot?.id === 'hall') world.animatePresentation('HallLookUp', shot.time);
    else world.animateTraveler(speed, elapsed, reduced);
    canvas.dataset.animation = world.animationName();
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
  function render() {
    if (disposed || failed) return;
    try { renderer.render(world.scene, camera); }
    catch { fail('3D画面绘制失败。可以重新加载，或直接选择文化主题。'); }
  }
  function fail(message: string) {
    if (disposed || failed) return;
    failed = true; moving = false; buddhaVoice?.setBlocked(true); blockEncounterVoices(true); voice?.setBlocked(true); audio?.setDucked(false); audio?.setBlocked(true); stop(); input.setEnabled(false);
    world.dispose(); renderer.renderLists.dispose();
    emit(); options.onError(message);
  }
  function frame(time: number) {
    raf = 0;
    if (!canAnimate()) return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time; elapsed += dt; if(view!=='follow')observationTime+=dt;
    if(view==='follow'&&hallArrival){
      const before=hallArrival.phase;
      hallArrival.update(inMogaoRoom(checkpoint.position)&&(before!=='outside'||localPoint('cliff',checkpoint.position).z<=-76.5),dt);
      if(before!==hallArrival.phase&&(before==='waiting'||hallArrival.phase==='waiting')){input.setEnabled(hallArrival.phase!=='waiting');travelCamera?.reset();}
    }
    const wasMoving = moving;
    let speed = 0;
    if (view === 'follow' && !overview && !encounters?.state && hallArrival?.phase!=='waiting') {
      const control = input.read();
      if(control.camera||control.x||control.y)hallArrival?.dismiss();
      if(control.camera)travelCamera?.manual();
      checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + control.camera * dt * .65);
      const vector = travelCamera?travelCamera.vector(control.x,control.y,checkpoint.cameraYaw,dt):movementVector(control.x, control.y, checkpoint.cameraYaw);
      const desiredSpeed = terrain ? control.run ? TERRAIN_RUN_SPEED : TERRAIN_WALK_SPEED
        : cinematicPreview ? control.run ? 4.4 : 1.8 : control.run ? RUN_SPEED : WALK_SPEED;
      const delta={ x: vector.x * desiredSpeed * dt, z: vector.z * desiredSpeed * dt };
      const next = terrain ? moveTerrainPlayer(checkpoint.position,delta) : mogaoV8 ? mogaoV8Rules.moveMogaoPlayer(checkpoint.position,delta) : mogaoV7 ? mogaoV7Rules.moveMogaoPlayer(checkpoint.position,delta) : movePlayer(checkpoint.position,delta,colliders,bounds);
      const distance = Math.hypot(next.x - checkpoint.position.x, next.z - checkpoint.position.z);
      speed = dt ? distance / dt : 0;
      if (speed > .05) {
        const heading = Math.atan2(-vector.x, -vector.z);
        const delta = Math.atan2(Math.sin(heading - checkpoint.heading), Math.cos(heading - checkpoint.heading));
        checkpoint.heading += delta * (reduced ? 1 : 1 - Math.exp(-dt * 15));
      }
      checkpoint.position = next;
      moving = speed > .05;
      if(travelCamera)checkpoint.cameraYaw=travelCamera.yaw(checkpoint.cameraYaw,checkpoint.heading,moving,dt,reduced);
    } else moving = false;
    if(encounters && view==='follow' && !overview){
      const before=encounters.state, speech=currentEncounterVoice()?.inspect();
      const done=musicV6?!!speech?.ended:!speech||speech.ended||speech.status==='missing'||speech.status==='error'||speech.status==='blocked';
      encounters.update(localPoint('music',checkpoint.position),dt,done,terrain?audio?.inspect():undefined);
      const after=encounters.state;
      if(after&&!before){
        director?.skip();input.setEnabled(false);travelCamera?.reset();speed=0;moving=false;
        encounterVoices?.[after.id].enter();
      }else if(before&&!after){
        encounterVoices?.[before.id].exit();input.setEnabled(loaded&&!paused);travelCamera?.reset();
      }
      if(after){speed=0;moving=false;currentEncounterVoice()?.update(after.time>=(after.id==='music'?.35:.1));}
      audio?.setEnabled(terrain||encounters.musicHeard);
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
    world.music?.update(dt,reduced);
    world.updateTerrain?.(dt,reduced);
    voice?.update(view==='flying'&&(musicV5?!!world.music?.inspect().complete:(world.music?.inspect().time??0)>=flyingDialogue.startAt));
    audio?.setDucked(!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing);
    audio?.update(localPoint('music',checkpoint.position),checkpoint.cameraYaw-(terrain?TERRAIN_REGIONS.music.yaw:0));
    if(world.music?.inspect().awakened && !checkpoint.visitedEvents.includes('flying')) checkpoint.visitedEvents.push('flying');
    updateTraveler(speed);
    const desiredPose = overview ? TERRAIN_OVERVIEW : view === 'caisson' ? (terrain?terrainPose('courtyard',caissonCameraPose()):caissonCameraPose()) : view === 'flying' ? flyingPose(camera.aspect) : followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    const damping = reduced ? 1 : 1 - Math.exp(-dt * (view === 'caisson' ? 2 : 10));
    // Follow the current valid player anchor; easing an old anchor can cut through
    // an inside corner even when the player's collision path goes around it.
    if (view === 'follow') cameraTarget.copy(desiredPose.target);
    else cameraTarget.lerp(desiredPose.target, damping);
    camera.position.lerp(desiredPose.position, damping);
    if (view === 'follow' && !overview) {
      const subject=cameraSpace?.subjectHeight===undefined?undefined:new THREE.Vector3(checkpoint.position.x,heightAt(checkpoint.position)+cameraSpace.subjectHeight,checkpoint.position.z);
      camera.position.copy(terrain&&cameraSpace&&subject
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
    world.updateCameraVisibility(cameraTarget, camera.position, dt, reduced);
    if(!mogaoV11&&(!mogao||!inMogaoRoom(checkpoint.position))){lookIntent=0;lookPitch=0;}
    lookPitch=THREE.MathUtils.lerp(lookPitch,lookIntent,reduced?1:1-Math.exp(-dt*7));
    visualTarget.copy(!overview&&view==='follow'&&(mogaoV11||mogao&&inMogaoRoom(checkpoint.position))?(mogaoV11?explorationLookTarget:caveLookTarget)(camera.position,cameraTarget,lookPitch):cameraTarget);
    camera.lookAt(visualTarget);
    if(buddhaGaze&&buddhaVoice){
      const inside=inMogaoRoom(checkpoint.position);
      const eligible=view==='follow'&&hallArrival?.phase!=='waiting'&&!encounters?.state&&!director?.state&&!overview&&buddhaInView();
      buddhaSightTime-=dt;
      if(!eligible){buddhaSightClear=false;buddhaSightTime=0;}
      else if(!buddhaGaze.inspect().seen&&buddhaSightTime<=0){buddhaSightClear=!!world.buddhaVisibleAtCenter?.(camera);buddhaSightTime=.2;}
      if(buddhaGaze.update(inside,eligible&&buddhaSightClear,dt)){buddhaVoice.enter();buddhaVoice.update(true);}
      if(!inside&&buddhaVoice.inspect().active)buddhaVoice.exit();
      audio?.setDucked(!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||buddhaVoice.inspect().playing);
    }
    poseSettled = camera.position.distanceToSquared(desiredPose.position) < .00002 && cameraTarget.distanceToSquared(desiredPose.target) < .00002;
    render();
    if (time - lastEmit > 100 || moving !== wasMoving) { lastEmit = time; emit(); }
    // Caisson is static once the observation camera arrives; avoid wasteful idle renders.
    if (!(view === 'caisson' && poseSettled && observationTime>3.2)) schedule();
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth); const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  }
  function turnCamera(delta: number) {
    if (!loaded || paused || overview || view !== 'follow' || disposed || encounters?.state || hallArrival?.phase==='waiting') return;
    hallArrival?.dismiss();
    skipCinematic(); travelCamera?.manual(); checkpoint.cameraYaw = yawLimit(checkpoint.cameraYaw + delta); schedule();
  }
  function visibility() {
    buddhaVoice?.setBlocked(document.hidden||paused||view!=='follow');
    blockEncounterVoices(document.hidden||paused||view!=='follow');
    input.clear(); travelCamera?.reset(); voice?.setBlocked(document.hidden||paused||view!=='flying'); audio?.setDucked(!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing); audio?.setBlocked(document.hidden||paused||view==='story'); moving = false; previousTime = 0;
    if (document.hidden) { skipCinematic(); stop(); emit(); } else schedule();
  }
  function contextLost(event: Event) { event.preventDefault(); fail('浏览器暂停了3D画面。请重新加载，或直接选择文化主题。'); }
  const blur = () => { buddhaVoice?.setBlocked(true); blockEncounterVoices(true); skipCinematic(); input.clear(); travelCamera?.reset(); voice?.setBlocked(true); audio?.setDucked(false); audio?.setBlocked(true); };
  window.addEventListener('blur', blur);
  if(mogaoV10)window.addEventListener('focus',visibility);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  updateTraveler(0); resize(); emit();
  void world.ready.then(() => {
    if (disposed || failed) return;
    loaded = true; input.clear(); input.setEnabled(loaded && !paused && !overview && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting');
    updateTraveler(0);
    const loadedPose = followPose(checkpoint.position.x, heightAt(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    camera.position.copy(loadedPose.position); cameraTarget.copy(loadedPose.target); camera.lookAt(cameraTarget);
    world.updateCameraVisibility(cameraTarget, camera.position, 0, true);
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
  }).catch(error => {
    fail(error instanceof Error ? error.message : '美术模型加载失败。请重新加载，或直接选择文化主题。');
  });
  return {
    snapshot, skipCinematic,
    setOverview(enabled) {
      if(!terrain||!loaded||view!=='follow'||paused)return;
      overview=enabled;input.clear();input.setEnabled(!overview);moving=false;travelCamera?.reset();
      if(overview){lookIntent=0;lookPitch=0;camera.position.copy(TERRAIN_OVERVIEW.position);cameraTarget.copy(TERRAIN_OVERVIEW.target);camera.lookAt(cameraTarget);}
      else restoreFollow();
      world.updateCameraVisibility(cameraTarget,camera.position,0,true);render();emit();schedule();
    },
    setSound:preferences=>{buddhaVoice?.setPreferences(preferences);encounterVoices?.music.setPreferences(preferences);encounterVoices?.mural.setPreferences(preferences);voice?.setPreferences(preferences);audio?.setPreferences(preferences);audio?.setDucked(!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing);},
    skipBuddhaVoice:()=>{buddhaVoice?.skip();emit();},
    retryBuddhaVoice:()=>{buddhaVoice?.retry();emit();},
    skipVoice:()=>{voice?.skip();emit();},
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
    inspect: () => ({ ...snapshot(), view, paused, loaded, camera: { position: camera.position.toArray(), target: (lookPitch?visualTarget:cameraTarget).toArray() },
      buddhaGaze:buddhaGaze?.inspect(), buddhaInView:mogaoV10?buddhaInView():undefined, landmarkSight: !terrain&&world.music&&'auditSight' in world.music?world.music.auditSight(camera):undefined, traveler: world.inspectTraveler(), interiorLighting: world.inspectInterior?.(), terrain:terrain?{logarithmicDepth:renderer.capabilities.logarithmicDepthBuffer,height:heightAt(checkpoint.position),region:terrainRegionAt(checkpoint.position),cameraClearance:camera.position.y-terrainSurfaceHeight(camera.position),overview,scene:world.inspectTerrain?.()}:undefined, seen: director?.seen, stats: { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls } }),
    setPaused(value) {
      // React publishes readiness after model loading; an identical pause state
      // must not clear a key the player pressed during that handoff.
      if (disposed || paused === value) return;
      if (value) skipCinematic();
      paused = value; buddhaVoice?.setBlocked(paused||document.hidden||view!=='follow'); blockEncounterVoices(paused||document.hidden||view!=='follow'); travelCamera?.reset(); voice?.setBlocked(paused||document.hidden||view!=='flying'); audio?.setDucked(!!voice?.inspect().playing||!!currentEncounterVoice()?.inspect().playing||!!buddhaVoice?.inspect().playing); audio?.setBlocked(paused||document.hidden||view==='story'); input.setEnabled(loaded && !paused && !overview && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting'); moving = false; previousTime = 0;
      if (paused) stop(); else schedule(); emit();
    },
    setView(next) {
      if (disposed || view === next) return;
      buddhaVoice?.exit();
      if(encounters?.state)skipEncounter();
      skipCinematic(); if (next === 'caisson') director?.skipHall();
      const exitingFlying = view === 'flying';
      if(exitingFlying) {world.music?.exit();voice?.exit();audio?.setDucked(false);}
      if(next==='flying') { world.music?.update(0,reduced); world.music?.enter(); voice?.enter(); const pose=flyingPose(camera.aspect);camera.position.copy(pose.position);cameraTarget.copy(pose.target);camera.lookAt(cameraTarget); }
      view = next; overview=false; observationTime=0; buddhaVoice?.setBlocked(paused||document.hidden||view!=='follow'); blockEncounterVoices(paused||document.hidden||view!=='follow'); travelCamera?.reset(); voice?.setBlocked(paused||document.hidden||view!=='flying'); audio?.setBlocked(paused||document.hidden||view==='story'); if(next==='follow' && exitingFlying) restoreFollow(); input.setEnabled(loaded && !paused && !overview && view === 'follow' && !encounters?.state && hallArrival?.phase!=='waiting'); moving = false; poseSettled = false; previousTime = 0;
      if (view === 'story') { stop(); updateTraveler(0); render(); }
      else schedule();
      emit();
    },
    setJoystick(x, y) { if (loaded) input.setJoystick(x, y); },
    turnCamera,
    chooseHallDirection(direction){if(hallArrival?.phase!=='guidance'||paused||view!=='follow')return;hallArrival.dismiss();travelCamera?.manual();input.clear();checkpoint.cameraYaw=(direction==='left'?Math.PI/2:direction==='right'?-Math.PI/2:0)+(terrain?TERRAIN_REGIONS.cliff.yaw:0);lookIntent=direction==='up'?1.05:0;schedule();emit();},
    tiltCamera(delta){if(!loaded||paused||overview||view!=='follow'||(!mogaoV11&&(!mogao||!inMogaoRoom(checkpoint.position)))||hallArrival?.phase==='waiting')return;hallArrival?.dismiss();lookIntent=THREE.MathUtils.clamp(lookIntent+delta,mogaoV11?MIN_EXPLORATION_LOOK:0,MAX_EXPLORATION_LOOK);schedule();emit();},
    resetCameraLook(){hallArrival?.dismiss();lookIntent=0;schedule();emit();},
    setReducedMotion(value) { reduced = value; if (value) skipCinematic(); schedule(); },
    resetToStart() {
      if(mogaoV11){lookIntent=0;lookPitch=0;}
      buddhaVoice?.exit();buddhaGaze?.update(false,false,0);
      currentEncounterVoice()?.exit();encounters?.reset();audio?.setEnabled(terrain||!encounters);
      skipCinematic();
      world.music?.exit(); voice?.exit(); audio?.setDucked(false); travelCamera?.reset();
      const spawn=terrain?TERRAIN_SPAWN:WORLD_SPAWN,yaw=terrain?TERRAIN_REGIONS.courtyard.yaw:0;
      checkpoint = { ...checkpoint, position: { ...spawn }, heading: yaw, cameraYaw: yaw };
      overview=false;
      view = 'follow'; input.setEnabled(loaded && !paused); moving = false;
      const pose = followPose(spawn.x, heightAt(spawn), spawn.z, yaw);
      camera.position.copy(pose.position); cameraTarget.copy(pose.target); camera.lookAt(cameraTarget);
      updateTraveler(0); render(); emit(); schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true; buddhaVoice?.dispose(); unregisterEncounterSkip();encounterVoices?.music.dispose();encounterVoices?.mural.dispose();voice?.dispose(); audio?.dispose(); stop(); input.dispose(); resizeObserver.disconnect();
      window.removeEventListener('blur', blur);
      if(mogaoV10)window.removeEventListener('focus',visibility);
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', contextLost);
      world.dispose(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
