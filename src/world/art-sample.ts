import { createMusicInteriorDecoration } from './music-interior-decoration';
import { isCaissonOnlyMode } from '../services/first-gallery';
import { CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS } from './caisson-only-props';
import { createMusicInteriorLighting } from './music-interior-lighting';
import { createMusicThreeWallMural } from './music-three-wall-mural';
import type { createMusicInstrumentDisplay } from './music-instrument-display';
import type { createMusicUpperWallRelief } from './music-upper-wall-relief';
import type { createMusicUpperFloorFinish } from './music-upper-floor-finish-v001';
import type { createMusicBalconyFloorFinish } from './music-balcony-floor-finish-v001';
import type { applyMusicBalconyRail } from './music-balcony-rail-v001';
import type { createMusicInteriorReliefCeiling } from './music-interior-relief-ceiling-v001';
import type { createMusicTransitionTrim } from './music-transition-trim-v001';
import type { createMusicTransitionCeiling } from './music-transition-ceiling-v001';
import type { createMusicGroundFloorWalls } from './music-ground-floor-walls-v001';
import type { createMusicGroundFloorCeiling } from './music-ground-floor-ceiling-v001';
import type { createMusicGroundFloorStone } from './music-ground-floor-stone-v001';
import type { createMusicGroundFloorStairFinish } from './music-ground-floor-stair-finish-v001';
import { isMusicInstrumentDisplayApproach } from '../content/world/music-instrument-display-layout-v001';
import musicInteriorLayout from '../content/world/music-interior-v005.json';
import { PATTERN_STATIONS } from './pattern-interactives';
import { addMuralStationShadow } from './mural-station-shadow';
import * as mogaoV8Rules from './mogao-rules-v008';
import {createCaveLighting} from './cave-lighting-v008';
import {caveEntryAdaptationTarget} from './cave-lighting-v012';
import * as mogaoV7Rules from './mogao-rules-v007';
import * as mogaoV6Rules from './mogao-rules-v006';
import * as mogaoV3Rules from './mogao-rules-v003';
import * as mogaoV1Rules from './mogao-rules-v001';
import * as mogaoV2Rules from './mogao-rules-v002';
import { createMusicPavilionV5, musicHallFinishApproach, musicPreviewDetailApproaches } from './music-pavilion-v005';
import { createMusicPavilionV4 } from './music-pavilion-v004';
import { MUSIC_LAYOUT_V4, MUSIC_PAVILION_BUILDINGS_V006, MUSIC_ROAD_V4 } from './music-pavilion-rules-v004';
import * as THREE from 'three';
import { createCompanionAvatar, type CompanionAvatarSnapshot } from './companion-avatar';
import { createMusicGuideAvatar, type MusicGuideAvatarPresentation, type PreparedMusicGuideOutfit } from './music-guide-avatar';
import { createMusicGuideSurfaceReveal } from './music-guide-surface-reveal';
import { MUSIC_GUIDE_DIRECTORY, type MusicGuideOutfitId } from '../content/world/music-guide-v001';
import { fitMogaoExhibitEntranceMeshes, isUpperHallAGrayboxMarker, isUpperRailing } from './mogao-upper-presentation';
import { addMogaoExhibitCaveGuidance, addMogaoExhibitShaftLining, addMogaoStairEntryLight, applyMogaoExhibitCaveFinish, fitMogaoExhibitFloorJoints, type MogaoCavePart, type MogaoCaveSurfaceCounts } from './mogao-exhibit-cave-finish';
import type { createMogaoExhibitScene } from './mogao-exhibit-scene';
import type { MogaoHallAScene } from './mogao-hall-a-scene';
import { isMogaoHallAApproach } from '../content/world/mogao-hall-a-layout-v001';
import {createEnvironmentLighting} from './terrain-environment-lighting-v001';
import {applyTerrainSandstoneMaterial} from './terrain-rock-material-v001';
import {hideConnectedCliffSandFoot} from './terrain-cliff-sand-v001';
import {createBactrianCaravans} from './terrain-bactrian-caravans-v001';
import {createTerrainScene} from './terrain-scene-v001';
import {applyFirstGalleryCourtyardPaving,applyFirstGalleryHallPaving,applyTerrainCourtyardExpansion} from './terrain-courtyard-v003';
import {refineCourtyardRocks} from './courtyard-rock-refinement-v001';
import {prepareTerrainCourtyardShadows,updateTerrainSunShadow} from './terrain-shadow-v005';
import {TERRAIN_CAISSON_CONFIG,loadCaissonCenterTexture,prepareTerrainCaisson,releaseCaissonTexture} from './terrain-caisson-v001';
import {placeMusicCourtyardTree,relocateMusicCourtyardFurnishings} from './music-courtyard-tree-v001';
import {MUSIC_COURTYARD_TREE} from '../content/world/music-courtyard-tree-v001';
import {placeTerrainTowerTrees} from './terrain-trees-v001';
import {TERRAIN_TOWER_TREES} from '../content/world/terrain-trees-v001';
import {fromTerrainPoint, terrainHeight, toTerrainPoint, TERRAIN_SCENERY_SOURCE_OVERRIDES, type TerrainRegion} from '../content/world/terrain-layout-v001';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { CAISSON_TRAVELER_MODEL, TERRAIN_COURTYARD_MODEL, TERRAIN_FIRST_GALLERY_COURTYARD_MODEL, TERRAIN_TRAVELER_MOBILE_MODEL, TERRAIN_TRAVELER_MODEL, TRIPO_TRAVELER_MODEL, WORLD_ART_SAMPLE, worldAssetUrl } from '../content/world/assets';
import { tripoTravelerClips } from './tripo-traveler';
import { connectedGalleryApproachGroups, connectedGalleryEntryGroups, firstGalleryApproachVenue, firstGalleryEntryVenue, firstGalleryStreamRegion, type FirstGalleryVenue } from './first-gallery-streaming';
import { previewApproachRegions, previewRegionAt, type PreviewResourceGroup, type WorldPreviewResourceProfile } from './preview-resource-profile';
import type { WorldPoint } from './types';
import { createGrayboxScene, type GrayboxScene } from './geometry';
import { RUN_SPEED, WALK_SPEED } from './movement';
import { createPreviewPaving } from './preview-paving';
import { createMusicPavilionV2 } from './music-pavilion-v002';
import { createMusicPavilionV3 } from './music-pavilion-v003';
import { MUSIC_LAYOUT_V3 } from './music-pavilion-rules-v003';
import { MUSIC_LAYOUT_V2, MUSIC_ROAD_V2 } from './music-pavilion-rules-v002';
import { createMusicPavilion } from './music-pavilion';
import { MUSIC_LAYOUT, MUSIC_ROAD } from './music-pavilion-rules';

type TravelerAction = 'Idle' | 'Walk' | 'Run' | 'Greeting' | 'HallLookUp' | 'LookAround';
type ArtSampleMusic = ReturnType<typeof createMusicPavilion> | ReturnType<typeof createMusicPavilionV2> |
  ReturnType<typeof createMusicPavilionV5>;
function hasMusicDetails(music: ArtSampleMusic | null): music is ReturnType<typeof createMusicPavilionV5> {
  return !!music && 'loadDetail' in music;
}
export interface ArtSampleSceneOptions {
  /** Explicit asset path for the chosen traveler or an isolated preview. */
  travelerPath?: string;
  /** Clip playback rate at the existing reference movement speeds. */
  animationRates?: { walk: number; run: number };
  presentationClips?: boolean;
  sampleNature?: boolean;
  mogao?: boolean;
  mogaoVersion?: 'v001'|'v002'|'v003'|'v006'|'v007'|'v008'|'v009'|'v010'|'v011'|'v012';
  mogaoSurfaceVersion?: 'v004';
  mogaoFacadeVersion?: 'v005';
  musicPavilion?: boolean;
  musicInteriorVersion?: 'v001';
  musicBalconyV2?: boolean;
  musicInstrumentDisplay?: { mobile: boolean; onChange(): void };
  musicMuralTextureLimit?: number;
  musicVersion?: 'v001' | 'v002' | 'v003' | 'v004' | 'v005' | 'v006';
  flyingAwakened?: boolean;
  terrainVersion?: 'v001';
  environmentVersion?: 'v001';
  terrainCaissonVersion?: 'v001';
  firstGalleryStart?: WorldPoint;
  connectedGalleries?: boolean;
  compactConnectedTerrain?: boolean;
  cliffUnlockedAtStart?: boolean;
  mogaoUpperVersion?: 'v002';
  previewResources?: WorldPreviewResourceProfile;
  previewStart?: WorldPoint;
  previewStartSurface?: string;
  mogaoExhibitVersion?: 'v001';
  mogaoExhibitInteriorPath?: string;
  mogaoExhibitGateLocked?: boolean;
  mogaoHallAGateLocked?: boolean;
  onMogaoExhibitChange?: () => void;
  /** Isolated second-hall prototype; normal world entries keep a single player. */
  companion?: boolean;
  musicGuide?: boolean;
}
export interface ArtSampleScene extends GrayboxScene {
  music: ArtSampleMusic | null;
  musicInstruments: ReturnType<typeof createMusicInstrumentDisplay> | null;
  mogaoExhibit: ReturnType<typeof createMogaoExhibitScene> | null;
  mogaoHallA: MogaoHallAScene | null;
  ready: Promise<void>;
  animationName(): TravelerAction;
  animatePresentation(name: 'Greeting' | 'HallLookUp' | 'LookAround', time: number): void;
  inspectInterior?(): unknown;
  buddhaVisibleAtCenter?(camera: THREE.PerspectiveCamera, point?: THREE.Vector2Like): boolean;
  inspectTraveler(): { visible: boolean; restHeight: number | null; animation: string; time: number; joints: { name: string; position: number[] }[] };
  updateCompanion?(position: THREE.Vector3, heading: number, speed: number, dt: number, reduced: boolean,
    presentation?: MusicGuideAvatarPresentation): void;
  readonly musicGuideRoot?: THREE.Object3D;
  selectMusicGuideOutfit?(id: MusicGuideOutfitId, progress: (fraction: number | null) => void, signal: AbortSignal,
    preparation?: { renderer: THREE.WebGLRenderer; camera: THREE.Camera; reveal?: boolean }): Promise<boolean>;
  commitMusicGuideOutfit?(id: MusicGuideOutfitId): boolean;
  setMusicGuideRevealProgress?(progress: number, elapsed: number): void;
  finishMusicGuideReveal?(): void;
  cancelMusicGuideOutfit?(): void;
  restoreMusicGuidePlain?(): void;
  inspectCompanion?(): CompanionAvatarSnapshot;
  updateCameraVisibility(target: THREE.Vector3, position: THREE.Vector3, dt: number, immediate: boolean, stairCamera?: boolean): void;
  updateTerrain?(dt: number): void;
  prepareEnvironment?(renderer:THREE.WebGLRenderer,camera:THREE.Camera):Promise<void>;
  loadGroundDetail?(): Promise<void>;
  updateFirstGalleryStreaming?(position: WorldPoint, musicUnlocked: boolean, cliffUnlocked?: boolean,
    surfaceId?: string | null, buddhaGateOpen?: boolean, hallAGateOpen?: boolean, prewarmCliffTower?: boolean): void;
  firstGalleryEntryStatus?(position: WorldPoint, surfaceId?: string | null,
    musicUnlocked?: boolean, cliffUnlocked?: boolean): 'loading' | 'failed' | null;
  firstGalleryCourtyardReady?(): boolean;
  updatePreviewStreaming?(position: WorldPoint, surfaceId?: string | null, buddhaGateOpen?: boolean, hallAGateOpen?: boolean): void;
  previewEntryStatus?(position: WorldPoint, surfaceId?: string | null): 'loading' | 'failed' | null;
  retryPreviewStreaming?(): void;
  musicCourtyardReady?(): boolean;
  musicFlyingReady?(): boolean;
  musicDetailsFailed?(): boolean;
  inspectTerrain?(): unknown;
}

/** One scene owns every loaded model, including results delivered after unmount. */
function releaseModel(model: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  const images = new Set<ImageBitmap>();
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) images.add(texture.source.data);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
  model.removeFromParent(); model.clear();
}

function modelOwnsTexture(model: THREE.Object3D, texture: THREE.Texture) {
  let attached = false;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || attached) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    attached = materials.some(material => Object.values(material).includes(texture));
  });
  return attached;
}

async function readGuideModel(body: ReadableStream<Uint8Array>, progress: (fraction: number | null) => void) {
  const reader = body.getReader();
  const header = new Uint8Array(12);
  let size = 0, bytes: Uint8Array<ArrayBuffer> | undefined;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      let chunk = value;
      if (!bytes) {
        const count = Math.min(header.length - size, chunk.length);
        header.set(chunk.subarray(0, count), size);
        size += count;
        if (size < header.length) continue;
        const data = new DataView(header.buffer);
        const total = data.getUint32(8, true);
        // Fetch exposes decoded bytes even when HTTP sends a compressed model.
        // The GLB header gives the matching, decoded total for the progress bar.
        if (data.getUint32(0, true) !== 0x46546c67 || total < 12 || total > 16 * 1024 * 1024) {
          throw new Error('music-guide-invalid-model-header');
        }
        bytes = new Uint8Array(total);
        bytes.set(header);
        chunk = chunk.subarray(count);
      }
      if (size + chunk.length > bytes.length) throw new Error('music-guide-invalid-model-length');
      bytes.set(chunk, size);
      size += chunk.length;
      progress(size / bytes.length);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!bytes || size !== bytes.length) throw new Error('music-guide-incomplete-model');
  return bytes.buffer;
}

export function createArtSampleScene(options: ArtSampleSceneOptions = {}): ArtSampleScene {
  const upper = options.mogaoUpperVersion === 'v002';
  const darkExhibit = options.mogaoExhibitVersion === 'v001';
  const v12=options.mogaoVersion==='v012',v11=v12||options.mogaoVersion==='v011',v10=v11||options.mogaoVersion==='v010',v9=v10||options.mogaoVersion==='v009',v8=v9||options.mogaoVersion==='v008',modern=v8||options.mogaoVersion==='v007';
  const caveLighting=v8?createCaveLighting(v9,upper?(x,z)=>x>=134&&x<=156&&z<=-75&&z>=-104?1:caveEntryAdaptationTarget(x,z):v12?caveEntryAdaptationTarget:undefined):null;
  const caveFinishCounts: Partial<Record<MogaoCavePart, MogaoCaveSurfaceCounts>> = {};
  let linedShaftFaces: readonly string[] = [];
  const {MOGAO_LAYOUT,MOGAO_ROAD}=v8?mogaoV8Rules:options.mogaoVersion==='v007'?mogaoV7Rules:options.mogaoVersion==='v006'?mogaoV6Rules:options.mogaoVersion==='v003'?mogaoV3Rules:options.mogaoVersion==='v002'?mogaoV2Rules:mogaoV1Rules;
  const v5=options.musicVersion==='v005'||options.musicVersion==='v006',v4=options.musicVersion==='v004'||v5,v3=options.musicVersion==='v003',v2=options.musicVersion==='v002'||v3||v4;
  const environment = createGrayboxScene({ artSample: true, musicPreview: options.musicPavilion, extendedMusic: v2 });
  if(options.mogao)environment.scene.fog=null;
  if(modern){
    const ground=environment.scene.getObjectByName('world-ground');
    if(ground){ground.position.set(65,-.22,-40);ground.scale.set(520,.4,430);}
  }
  const enhancedEnvironment=options.terrainVersion==='v001' && options.environmentVersion==='v001';
  const firstGallery = !!options.firstGalleryStart && enhancedEnvironment;
  const connectedGalleries = firstGallery && !!options.connectedGalleries;
  const currentFirstGalleryVisuals = connectedGalleries || (firstGallery && isCaissonOnlyMode());
  const compactConnectedTerrain = currentFirstGalleryVisuals && !!options.compactConnectedTerrain;
  const initialRegion = firstGalleryStreamRegion(options.firstGalleryStart ?? { x: 0, z: 0 });
  const firstGalleryInitialGroups: readonly PreviewResourceGroup[] = connectedGalleries
    ? connectedGalleryEntryGroups(options.firstGalleryStart!, options.previewStartSurface) : [initialRegion ?? 'courtyard'];
  const profile = options.previewResources;
  const deferMusicDetails = (connectedGalleries || profile?.mode === 'music') && !!options.musicInteriorVersion;
  // The hall is already visible from the music preview's outdoor spawn. Warm
  // just its three small visible textures while the scene loads. Share the
  // promises with the walls and ceiling so each image is downloaded once.
  // This never enters the player-ready await chain and is cancellable.
  let musicHallWarmup: AbortController | undefined;
  const musicHallAssets = new Map<string, Promise<Blob>>();
  function warmMusicHall() {
    if (!deferMusicDetails || !options.musicMuralTextureLimit || musicHallWarmup) return;
    const warmup = musicHallWarmup = new AbortController();
    for (const name of ['wall-front.webp', 'wall-left.webp', 'ceiling.webp']) {
      const request = fetch(worldAssetUrl(`music-ground-floor-mural/v001/${name}`), {
        signal: warmup.signal, priority: 'low',
      }).then(response => {
        if (!response.ok) throw new Error(`music-hall-warmup-failed: ${name}`);
        return response.blob();
      });
      musicHallAssets.set(name, request);
      void request.catch(() => { if (musicHallAssets.get(name) === request) musicHallAssets.delete(name); });
    }
    // A stalled warmup should not prevent the normal loader's retry path.
    const warmupTimeout = setTimeout(() => warmup.abort(), 15_000);
    void Promise.allSettled([...musicHallAssets.values()]).then(() => clearTimeout(warmupTimeout));
  }
  if (!connectedGalleries || firstGalleryInitialGroups.includes('music')) warmMusicHall();
  async function loadMusicHallAsset(name: string, signal: AbortSignal) {
    const warmed = musicHallAssets.get(name);
    if (warmed) {
      try {
        // A caller's 20-second timeout must still work if the shared warmup
        // stalls; cancelling one consumer does not cancel the other one.
        return await new Promise<Blob>((resolve, reject) => {
          if (signal.aborted) { reject(new Error('music-hall-load-cancelled')); return; }
          const abort = () => reject(new Error('music-hall-load-cancelled'));
          signal.addEventListener('abort', abort, { once: true });
          warmed.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
        });
      } catch (error) {
        if (signal.aborted) throw error;
      }
    }
    const response = await fetch(worldAssetUrl(`music-ground-floor-mural/v001/${name}`), { signal });
    if (!response.ok) throw new Error(`music-hall-load-failed: ${name}`);
    return response.blob();
  }
  const scoped = !!profile && profile.mode !== 'first-gallery' && profile.mode !== 'standalone';
  const hasTerrain = options.terrainVersion === 'v001';
  const previewContext = (position: WorldPoint, surfaceId?: string | null) => ({
    profile: profile!, position, terrain: hasTerrain, upper, exhibit: darkExhibit, surfaceId,
  });
  const restoredBuddhaView = upper && profile?.mode === 'cliff' &&
    (options.previewStartSurface === 'view-b' || options.previewStartSurface === 'view-link-b');
  const initialGroup = restoredBuddhaView ? 'cliff-interior' : scoped && options.previewStart
    ? previewRegionAt(previewContext(options.previewStart, options.previewStartSurface)) : null;
  let terrain: ReturnType<typeof createTerrainScene> | null = null;
  const courtyardPath = firstGallery ? TERRAIN_FIRST_GALLERY_COURTYARD_MODEL : hasTerrain ? TERRAIN_COURTYARD_MODEL : WORLD_ART_SAMPLE.courtyard;
  if(enhancedEnvironment)environment.scene.userData.environmentShadowBounds=new THREE.Box3(new THREE.Vector3(-160,-10,-270),new THREE.Vector3(815,175,400));
  const caissonEnabled=hasTerrain&&options.terrainCaissonVersion==='v001';
  const currentMusicBalcony = options.musicVersion === 'v006' ? (options.musicInteriorVersion ? 'interior' : 'exterior') : undefined;
  const createMusic = (): ArtSampleMusic | null => options.musicPavilion ? v5 ? createMusicPavilionV5(
    environment.scene, !!options.flyingAwakened,
    currentMusicBalcony ? MUSIC_PAVILION_BUILDINGS_V006[currentMusicBalcony] : options.musicInteriorVersion ? musicInteriorLayout.assets.building : undefined,
    currentMusicBalcony, deferMusicDetails, options.musicBalconyV2,
    options.musicGuide ? 'music-pavilion/v010/mural-color-poster.webp' : undefined,
    options.musicGuide ? 'music-pavilion/v010/mural-color-loop.mp4' : undefined,
  ) : (v4?createMusicPavilionV4:v3?createMusicPavilionV3:v2?createMusicPavilionV2:createMusicPavilion)(environment.scene, !!options.flyingAwakened) : null;
  let music = (firstGallery && !firstGalleryInitialGroups.includes('music')) || (scoped && initialGroup !== 'music') ? null : createMusic();
  const regionLayout=v4?MUSIC_LAYOUT_V4:v3?MUSIC_LAYOUT_V3:v2?MUSIC_LAYOUT_V2:MUSIC_LAYOUT;
  const traveler = new THREE.Group(); traveler.name = 'traveler';
  environment.scene.add(traveler);
  const environmentLighting=enhancedEnvironment?createEnvironmentLighting(environment.scene,traveler,compactConnectedTerrain):null;
  let bactrianCaravans=enhancedEnvironment&&!firstGallery&&!scoped?createBactrianCaravans():null;
  if(bactrianCaravans)environment.scene.add(bactrianCaravans.root);
  let musicDecoration:ReturnType<typeof createMusicInteriorDecoration>|null=null;
  let musicInteriorLighting:ReturnType<typeof createMusicInteriorLighting>|null=null;
  let musicThreeWallMural:ReturnType<typeof createMusicThreeWallMural>|null=null;
  let musicGroundWalls: ReturnType<typeof createMusicGroundFloorWalls> | null = null;
  let musicGroundCeiling: ReturnType<typeof createMusicGroundFloorCeiling> | null = null;
  let musicGroundStone: ReturnType<typeof createMusicGroundFloorStone> | null = null;
  let musicGroundStair: ReturnType<typeof createMusicGroundFloorStairFinish> | null = null;
  let musicGroundFinishImporting = false, musicGroundFinishFailed = false;
  let musicInstruments: ReturnType<typeof createMusicInstrumentDisplay> | null = null;
  let musicUpperWalls: ReturnType<typeof createMusicUpperWallRelief> | null = null;
  let musicUpperFloor: ReturnType<typeof createMusicUpperFloorFinish> | null = null;
  let musicBalconyFloor: ReturnType<typeof createMusicBalconyFloorFinish> | null = null;
  let musicBalconyRail: ReturnType<typeof applyMusicBalconyRail> | null = null;
  let musicUpperCeiling: ReturnType<typeof createMusicInteriorReliefCeiling> | null = null;
  let musicTransitionTrim: ReturnType<typeof createMusicTransitionTrim> | null = null;
  let musicTransitionCeiling: ReturnType<typeof createMusicTransitionCeiling> | null = null;
  let musicUpperReliefImporting = false;
  let musicUpperReliefFailed = false;
  let musicInstrumentsImporting = false;
  let musicInstrumentsImportFailed = false;
  let musicInstrumentPosition: { position: WorldPoint; surfaceId?: string | null } | null = null;
  let musicInteriorRoot:THREE.Object3D|null=null;
  let rockFinish:ReturnType<typeof applyTerrainSandstoneMaterial>|null=null;
  let disposed = false;
  let towerTrees:ReturnType<typeof placeTerrainTowerTrees>|null=null;
  let courtyardExpansion:ReturnType<typeof applyTerrainCourtyardExpansion>|null=null;
  let courtyardShadows:ReturnType<typeof prepareTerrainCourtyardShadows>|null=null;
  let caisson:ReturnType<typeof prepareTerrainCaisson>|null=null;
  let pendingCaissonTexture:THREE.Texture|null=null;
  let mogaoExhibit: ReturnType<typeof createMogaoExhibitScene> | null = null;
  let mogaoHallA: MogaoHallAScene | null = null;
  let hallARoot: THREE.Object3D | null = null;
  let hallAApproach = false, hallAImporting = false;
  let squareHall: { asset: string; parts: string[] } | null = null;
  let hiddenUpperRailings = 0;
  let musicTree:ReturnType<typeof placeMusicCourtyardTree>|null=null;
  let musicFurniture:ReturnType<typeof relocateMusicCourtyardFurnishings>|null=null;
  let mixer: THREE.AnimationMixer | null = null;
  let companion: ReturnType<typeof createCompanionAvatar> | null = null;
  let musicGuide: ReturnType<typeof createMusicGuideAvatar> | null = null;
  type GuideSurfaceReveal = ReturnType<typeof createMusicGuideSurfaceReveal>;
  let activeMusicGuideReveal: { model: THREE.Object3D; effect: GuideSurfaceReveal } | null = null;
  let stagedMusicGuideOutfit: {
    id: MusicGuideOutfitId;
    model?: GLTF;
    outfit: PreparedMusicGuideOutfit;
    reveal?: GuideSurfaceReveal;
  } | null = null;
  let character: THREE.Object3D | null = null;
  let actionName: TravelerAction = 'Idle';
  let restHeight:number|null=null;
  let previousElapsed: number | null = null;
  const models: THREE.Object3D[] = [];
  let buddhaSubject:THREE.Object3D|null=null;
  const buddhaOccluders:THREE.Object3D[]=[];
  const gazeRay=new THREE.Raycaster();
  const gazePoint = new THREE.Vector2();
  const treesForCamera: THREE.Object3D[] = [];
  const canopyMaterials = new Set<THREE.Material>();
  const canopies: { bounds: THREE.Box3; materials: THREE.Material[]; opacity: number }[] = [];
  const actions = new Map<TravelerAction, THREE.AnimationAction>();
  const loader = new GLTFLoader();
  const controller = new AbortController();
  type StreamStatus = 'idle' | 'loading' | 'ready' | 'failed';
  type StreamGroup = PreviewResourceGroup | 'music-exterior' | 'cliff-rocks' | 'cliff-trees' | 'cliff-tower';
  const stream: Record<StreamGroup, StreamStatus> = {
    courtyard: 'idle', music: 'idle', cliff: 'idle', 'cliff-interior': 'idle', 'cliff-galleries': 'idle', scenery: 'idle',
    'music-exterior': 'idle', 'cliff-rocks': 'idle', 'cliff-trees': 'idle', 'cliff-tower': 'idle',
  };
  const sceneryRetryAt: Partial<Record<StreamGroup, number>> = {};
  const streamControllers = new Map<StreamGroup, AbortController>();
  let lowMountain: THREE.Object3D | null = null;
  let cliffMountainAsset: string | undefined;
  let connectedCliffUnlocked = !!options.cliffUnlockedAtStart;
  let connectedCliffTower: THREE.Object3D | null = null;
  let musicSilhouette: THREE.Group | null = null;
  let distantMusic: { pavilion: ArtSampleMusic; root: THREE.Object3D } | null = null;
  let nearbyStream: FirstGalleryVenue | null = null;
  let previewApproach: readonly StreamGroup[] = [];
  let pendingPreviewGroup: StreamGroup | null = null;
  let requestedGround = false;
  let previousMusicApproaches: ReturnType<typeof musicPreviewDetailApproaches> | undefined;
  const connectedMusicDetails = { balcony: true, flying: true, interiorMural: true };
  let previousMusicHallFinishApproach = false;
  let streamReady = false;
  let lightingRenderer: THREE.WebGLRenderer | null = null;
  const streamTimings = { modelStart: performance.now(), modelsReady: 0, lightingStart: 0, lightingReady: 0 };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function disposeMusicInterior() {
    musicInteriorRoot = null;
    musicInteriorLighting?.dispose();musicInteriorLighting=null;
    musicUpperWalls?.dispose(); musicUpperWalls = null;
    musicUpperFloor?.dispose(); musicUpperFloor = null;
    musicBalconyFloor?.dispose(); musicBalconyFloor = null;
    musicBalconyRail?.dispose(); musicBalconyRail = null;
    musicUpperCeiling?.dispose(); musicUpperCeiling = null;
    musicTransitionTrim?.dispose(); musicTransitionTrim = null;
    musicTransitionCeiling?.dispose(); musicTransitionCeiling = null;
    musicThreeWallMural?.dispose();musicThreeWallMural=null;
    musicGroundWalls?.dispose(); musicGroundWalls = null;
    musicGroundCeiling?.dispose(); musicGroundCeiling = null;
    musicGroundStone?.dispose(); musicGroundStone = null;
    musicGroundStair?.dispose(); musicGroundStair = null;
    musicInstruments?.dispose(); musicInstruments = null;
    musicDecoration?.dispose();musicDecoration=null;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    musicHallWarmup?.abort();
    finishMusicGuideReveal();
    discardMusicGuideOutfit();
    environmentLighting?.dispose();
    disposeMusicInterior();
    musicFurniture?.dispose();musicFurniture=null;
    mogaoExhibit?.dispose();mogaoExhibit=null;
    mogaoHallA?.dispose();mogaoHallA=null;hallARoot=null;
    bactrianCaravans?.dispose();
    rockFinish?.dispose();rockFinish=null;
    music?.dispose();
    distantMusic?.pavilion.dispose(); distantMusic = null;
    for (const pending of streamControllers.values()) pending.abort();
    streamControllers.clear();
    clearTimeout(timeout); controller.abort();
    musicGuide?.dispose(); musicGuide = null;
    companion?.dispose(); companion = null;
    if (mixer && character) { mixer.stopAllAction(); mixer.uncacheRoot(character); }
    actions.clear(); mixer = null; character = null;
    towerTrees?.dispose(); towerTrees=null;
    musicTree?.dispose();musicTree=null;
    if(pendingCaissonTexture){
      // Preparation may fail after assigning the map. Whichever model owns it
      // will release it below; an unattached decoded image has its own owner.
      const texture = pendingCaissonTexture;
      if (!models.some(model => modelOwnsTexture(model, texture))) releaseCaissonTexture(texture);
      pendingCaissonTexture = null;
    }
    for (const model of models) releaseModel(model);
    models.length = 0;
    for (const material of canopyMaterials) material.dispose();
    canopyMaterials.clear(); canopies.length = 0;
    terrain?.dispose();
    environment.dispose();
  }
  async function loadModel(path: string, signal = controller.signal,
    progress?: (fraction: number | null) => void): Promise<GLTF> {
    try {
      return await loadSelectedModel(path, signal, progress);
    } catch (error) {
      if (path !== TERRAIN_TRAVELER_MOBILE_MODEL || disposed || signal.aborted) throw error;
      return loadSelectedModel(TERRAIN_TRAVELER_MODEL, signal, progress);
    }
  }
  async function loadSelectedModel(path: string, signal: AbortSignal,
    progress?: (fraction: number | null) => void): Promise<GLTF> {
    const url = new URL(worldAssetUrl(path), document.baseURI);
    const response = await fetch(url, { signal });
    // Never include server response text in a player-visible error.
    if (!response.ok) throw new Error('model-request-failed');
    const bytes = progress && response.body ? await readGuideModel(response.body, progress) : await response.arrayBuffer();
    if (disposed || signal.aborted) throw new Error('model-request-cancelled');
    progress?.(null);
    const model = await loader.parseAsync(bytes, new URL('.', url).href);
    // Image decoding may finish after abort. Each result has its own owner check.
    if (disposed || signal.aborted) {
      releaseModel(model.scene);
      throw new Error('model-decode-cancelled');
    }
    models.push(model.scene);
    return model;
  }
  function adoptModel(model: THREE.Object3D) {
    const index = models.indexOf(model);
    if (index >= 0) models.splice(index, 1);
  }
  function releaseGuideModel(model: THREE.Object3D) {
    environmentLighting?.excludeReceivers(model);
    musicInteriorLighting?.exclude(model);
    adoptModel(model);
    releaseModel(model);
  }
  function releaseGuideSurfaceReveal(model: THREE.Object3D, effect: GuideSurfaceReveal) {
    // Unregister the temporary materials while they are still assigned.
    environmentLighting?.excludeReceivers(model);
    musicInteriorLighting?.exclude(model);
    effect.restore();
    effect.dispose();
  }
  function finishMusicGuideReveal() {
    const active = activeMusicGuideReveal;
    if (!active) return;
    activeMusicGuideReveal = null;
    releaseGuideSurfaceReveal(active.model, active.effect);
    if (!disposed) updateGuideLighting();
  }
  function discardMusicGuideOutfit() {
    const staged = stagedMusicGuideOutfit;
    stagedMusicGuideOutfit = null;
    if (staged?.reveal) releaseGuideSurfaceReveal(staged.outfit.model, staged.reveal);
    staged?.outfit.discard();
    if (staged?.model) releaseGuideModel(staged.model.scene);
  }
  function includeGuideReceivers(model: THREE.Object3D) {
    musicInteriorLighting?.include(model);
    environmentLighting?.includeReceivers(model);
  }
  function modelTextures(model: THREE.Object3D) {
    const textures = new Set<THREE.Texture>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    return textures;
  }
  async function warmGuideOutfit(model: THREE.Object3D, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    includeGuideReceivers(model);
    for (const texture of modelTextures(model)) renderer.initTexture(texture);
    await renderer.compileAsync(model, camera, environment.scene);
  }
  async function warmCliffTextures(model: THREE.Object3D, renderer: THREE.WebGLRenderer, signal: AbortSignal) {
    for (const texture of modelTextures(model)) {
      if (disposed || signal.aborted || document.hidden || renderer.getContext().isContextLost()) return;
      // One upload per frame on the approach. Uploading every mural and the
      // Buddha together makes a single long render stall on a phone.
      await new Promise<void>(resolve => {
        const finish = () => {
          cancelAnimationFrame(frame);
          signal.removeEventListener('abort', finish);
          resolve();
        };
        const frame = requestAnimationFrame(finish);
        signal.addEventListener('abort', finish, { once: true });
      });
      if (disposed || signal.aborted || document.hidden || renderer.getContext().isContextLost()) return;
      renderer.initTexture(texture);
    }
  }
  function updateGuideLighting() {
    if (!musicGuide) return;
    includeGuideReceivers(musicGuide.root);
    musicInteriorLighting?.refreshAvatar(musicGuide.root);
  }
  const landscapePaths = ['rocks.glb','caravan.glb'].map(name=>`environment-world/v001/${name}`);
  const landscapeLoading=enhancedEnvironment&&!firstGallery&&!scoped?Promise.all(landscapePaths.map(path=>loadModel(path))):Promise.resolve([]);
  const upperAssetDir = darkExhibit ? 'mogao-upper/v003' : 'mogao-upper/v002';
  const upperAtStart = upper && (!connectedGalleries || firstGalleryInitialGroups.includes('cliff-galleries'));
  const upperLoading = upperAtStart ? loadModel(`${upperAssetDir}/upper.glb`) : Promise.resolve(null);
  const exhibitLoading = options.mogaoExhibitVersion && (!connectedGalleries || upperAtStart) ? import('./mogao-exhibit-scene') : undefined;
  const courtyardAtStart = firstGallery ? firstGalleryInitialGroups.includes('courtyard') : !scoped || initialGroup === 'courtyard';
  const patternLoading = hasTerrain && courtyardAtStart ? loadPatterns(loadModel) : Promise.resolve([]);
  const cliffPaths = v8 ? ['mogao/v008/mountain.glb','mogao/v008/interior.glb','mogao-massing/v003/tower.glb','mogao/v007/entry.glb','mogao/v008/buddha.glb'].map(path=>upper&&(path.endsWith('/mountain.glb')||path.endsWith('/interior.glb'))?`${upperAssetDir}/${path.split('/').pop()}`:enhancedEnvironment&&path.endsWith('/mountain.glb')?'mogao-strata/v001/mountain.glb':v11&&(path.endsWith('/entry.glb')||path.endsWith('/mountain.glb'))?`mogao/v011/${path.split('/').pop()}`:v10&&(path.endsWith('/entry.glb')||path.endsWith('/interior.glb'))?`mogao/v010/${path.split('/').pop()}`:v9?path.replace('mogao/v008/','mogao/v009/'):path)
    : options.mogaoVersion==='v007' ? ['mogao-sandstone/v001/mountain.glb','mogao/v003/interior.glb','mogao-massing/v003/tower.glb','mogao/v007/entry.glb']
    : options.mogao ? ['exterior','interior'].map(name => `mogao/${name==='exterior'?(options.mogaoFacadeVersion??options.mogaoSurfaceVersion??options.mogaoVersion??'v001'):(options.mogaoVersion==='v006'?'v003':options.mogaoVersion??'v001')}/${name}.glb`) : [];
  if (options.mogaoExhibitVersion && options.mogaoExhibitInteriorPath && cliffPaths[1]) {
    cliffPaths[1] = options.mogaoExhibitInteriorPath;
  }
  const cliffAtStart = firstGalleryInitialGroups.includes('cliff');
  const distantCliffPath = 'mogao-upper/v003/mountain-distant-v001.glb';
  if (compactConnectedTerrain && cliffPaths[0]) cliffPaths[0] = distantCliffPath;
  const cliffTowerAtStart = connectedGalleries && connectedCliffUnlocked && (cliffAtStart ||
    firstGalleryInitialGroups.includes('music') || firstGalleryStreamRegion(options.firstGalleryStart!, true) === 'music');
  const firstCliffPaths = connectedGalleries ? cliffPaths.map((path, index) => {
    if (index === 1 || index === 4) return firstGalleryInitialGroups.includes('cliff-interior') ? path : undefined;
    if (index === 2 || index === 3) return cliffTowerAtStart ? path : undefined;
    if (cliffAtStart) return path;
    if (index === 0 && !firstGalleryInitialGroups.includes('cliff-galleries')) return distantCliffPath;
    return undefined;
  }) : currentFirstGalleryVisuals ? [] : initialRegion === 'cliff' ? [cliffPaths[0], undefined, cliffPaths[2], cliffPaths[3]]
    : initialRegion === null ? ['mogao-massing/v003/mountain.glb'] : [];
  const scopedCliffPaths = cliffPaths.map((path, index) => {
    if (initialGroup === 'cliff-interior') return index === 1 || index === 4 ? path : undefined;
    if (initialGroup === 'cliff') return index === 1 || index === 4 ? undefined : path;
    return undefined;
  });
  const natureAtStart = options.sampleNature && (!scoped || profile.mode === 'terrain' ||
    (initialGroup !== null && (!upper || initialGroup === 'cliff')));
  const natureIncludesDunes = !hasTerrain || (!firstGallery && !scoped);
  const caissonAtStart = caissonEnabled && courtyardAtStart;
  const modelLoading = Promise.all([
    courtyardAtStart ? loadModel(courtyardPath) : undefined,
    loadModel(options.travelerPath ?? WORLD_ART_SAMPLE.traveler),
    Promise.all(natureAtStart ? ['tree-a', 'shrub-a', ...(natureIncludesDunes ? ['dunes'] : [])].map(name => loadModel(`environment-sample/v002/${name}.glb`)) : []),
    Promise.all((scoped ? scopedCliffPaths : firstGallery ? firstCliffPaths : cliffPaths).map(path => path ? loadModel(path) : undefined)),
    Promise.all(hasTerrain && !connectedGalleries && (scoped ? initialGroup === 'cliff' : !firstGallery || firstGalleryInitialGroups.includes('cliff')) ? TERRAIN_TOWER_TREES.map(tree => loadModel(tree.assetPath)) : []),
    hasTerrain && (scoped ? initialGroup === 'music' : !firstGallery || firstGalleryInitialGroups.includes('music')) ? loadModel(MUSIC_COURTYARD_TREE.assetPath) : undefined,
    caissonAtStart ? loadModel(TERRAIN_CAISSON_CONFIG.asset) : undefined,
  ] as const);
  const centerTextureLoading=caissonAtStart?loadCaissonCenterTexture(new URL(worldAssetUrl(TERRAIN_CAISSON_CONFIG.centerPanel.texture),document.baseURI),controller.signal).then(texture=>{
    if(disposed){releaseCaissonTexture(texture);throw new Error('caisson-image-load-cancelled');}
    pendingCaissonTexture=texture;return texture;
  }):Promise.resolve(null);
  const loading=Promise.all([modelLoading,centerTextureLoading]).then(([loadedModels,texture])=>{
    if(disposed)throw new Error('caisson-model-load-cancelled');
    if(texture&&loadedModels[6]){caisson=prepareTerrainCaisson(loadedModels[6].scene,texture);pendingCaissonTexture=null;}
    return loadedModels;
  });
  // Start the critical transfers before generating terrain and paving on the main thread.
  if (hasTerrain) terrain = createTerrainScene(environment.scene, enhancedEnvironment, firstGallery || scoped, compactConnectedTerrain);
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('model-loading-timeout')), firstGallery ? 60_000 : 30_000);
  });
  function groundNature(region: TerrainRegion, object: THREE.Object3D) {
    if (!terrain) return;
    const point = toTerrainPoint(region, object.position);
    object.position.y += terrainHeight(point.x, point.z) - point.y;
    terrain.attachRegionObject(region, object);
  }
  function attachLandscape(models: readonly GLTF[]) {
    for (const model of models) {
      model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      environment.scene.add(model.scene);
    }
  }
  function registerCavePart(root: THREE.Object3D, part: MogaoCavePart, lining?: THREE.MeshStandardMaterial) {
    if (!darkExhibit) {
      if (part !== 'entry') caveLighting?.addCave(root);
      return;
    }
    const finish = applyMogaoExhibitCaveFinish(root, part);
    caveFinishCounts[part] = finish.counts;
    if (lining) finish.materials.add(lining);
    caveLighting?.addCave(root, { colorsAtFullAdaptation: finish.materials, finishOnly: part === 'entry' });
  }
  function attachCliffModel(model: GLTF, kind: 'exterior' | 'interior' | 'tower' | 'entry' | 'buddha', detailed = true) {
    if (kind === 'exterior' && enhancedEnvironment && detailed) rockFinish = applyTerrainSandstoneMaterial(model.scene);
    if (v10 && kind === 'buddha') buddhaSubject = model.scene;
    if (v10 && (kind === 'interior' || kind === 'entry')) buddhaOccluders.push(model.scene);
    model.scene.position.set(...MOGAO_LAYOUT.origin as [number, number, number]);
    if (modern && kind !== 'interior' && kind !== 'buddha') model.scene.position.y = 0;
    model.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      if (modern && kind === 'exterior') for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial) for (const map of [material.map, material.normalMap, material.roughnessMap, material.aoMap]) {
          if (map) map.anisotropy = 8;
        }
      }
    });
    if (connectedGalleries && kind === 'exterior') hideConnectedCliffSandFoot(model.scene);
    environment.scene.add(model.scene);
    terrain?.attachRegionObject('cliff', model.scene);
    if (v8 && (kind === 'interior' || kind === 'entry')) registerCavePart(model.scene, kind);
    if (v8 && kind === 'buddha') caveLighting?.addCave(model.scene);
  }
  function attachConnectedCliffTower(tower: GLTF, entry: GLTF) {
    attachCliffModel(tower, 'tower');
    attachCliffModel(entry, 'entry');
    const building = new THREE.Group();
    building.name = 'connected-cliff-building';
    building.visible = connectedCliffUnlocked;
    building.add(tower.scene, entry.scene);
    terrain?.attachRegionObject('cliff', building);
    connectedCliffTower = building;
  }
  function releaseDistantCliff(finish: typeof rockFinish) {
    if (!lowMountain) return;
    environmentLighting?.excludeReceivers(lowMountain);
    finish?.dispose();
    adoptModel(lowMountain);
    releaseModel(lowMountain);
    lowMountain = null;
  }
  function attachUpperGalleries(model: GLTF, exhibit: typeof import('./mogao-exhibit-scene') | undefined, viewingRoomReady: boolean) {
    const root = model.scene;
    // The graybox keeps its original local inspection fills.
    if (!darkExhibit) for (const [x,y,z,power,range] of [[22,12.6,-17,320,20],[22,24.1,-17,320,20],[18.7,8,-27,190,15],[18.7,18,-27,190,15],[0,23,-8,950,44]]) {
      const lamp = new THREE.PointLight(0xffe3ba, power, range, 2);
      lamp.position.set(x,y,z);
      root.add(lamp);
    }
    root.position.set(...MOGAO_LAYOUT.origin as [number,number,number]);
    root.traverse(object => {
      if (darkExhibit && isUpperHallAGrayboxMarker(object.name)) {
        object.visible = false;
        object.raycast = () => {};
        return;
      }
      if (isUpperRailing(object.name)) {
        object.visible = false;
        object.raycast = () => {};
        hiddenUpperRailings++;
      }
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    if (darkExhibit) {
      fitMogaoExhibitEntranceMeshes(root);
      addMogaoExhibitCaveGuidance(root);
      addMogaoStairEntryLight(root);
    }
    const lining = darkExhibit ? addMogaoExhibitShaftLining(root, true) : undefined;
    if (lining) linedShaftFaces = lining.userData.faces;
    environment.scene.add(root);
    terrain?.attachRegionObject('cliff', root);
    registerCavePart(root, 'upper', lining?.material);
    if (darkExhibit) {
      fitMogaoExhibitFloorJoints(root, true);
      hallARoot = root;
    }
    buddhaOccluders.push(root);
    if (exhibit) {
      mogaoExhibit = exhibit.createMogaoExhibitScene(root, {
        gateLocked: options.mogaoExhibitGateLocked,
        hallAGateLocked: options.mogaoHallAGateLocked,
        viewingRoomReady,
        onChange: options.onMogaoExhibitChange,
      });
    }
  }
  function attachTowerTrees(loaded: readonly GLTF[]) {
    towerTrees = placeTerrainTowerTrees(loaded.map(model => model.scene));
    if (connectedGalleries) stream['cliff-trees'] = 'ready';
    environment.scene.add(towerTrees.root);
    for (const tree of towerTrees.trees) {
      const materials = [...new Set(tree.meshes.flatMap(mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material]))];
      for (const material of materials) material.transparent = true;
      canopies.push({ bounds: tree.worldBounds.clone().expandByScalar(.2), materials, opacity: 1 });
    }
  }
  function attachMusicTree(model: GLTF) {
    musicTree = placeMusicCourtyardTree(model.scene);
    environment.scene.add(musicTree.root);
    const materials = [...new Set(musicTree.meshes.flatMap(mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material]))];
    for (const material of materials) material.transparent = true;
    const bounds = musicTree.worldBounds.clone().expandByScalar(.2);
    // Fade only inside the crown. The trunk keeps its separate camera proxy.
    bounds.min.y = musicTree.root.position.y + MUSIC_COURTYARD_TREE.trunkBounds.max[1];
    canopies.push({ bounds, materials, opacity: 1 });
  }
  function currentMusicRoot() { return environment.scene.children.find(object => object.name.startsWith('music-pavilion-')); }
  function placeMusicBuilding(root: THREE.Object3D) {
    root.traverse(object => { if (object.name === 'accepted-central-dune') object.visible = false; });
    terrain?.attachRegionObject('music', root);
  }
  function attachMusicCourtyard(root: THREE.Object3D, tree?: GLTF) {
    const pavilion = root.children.find(child => {
      let found = false;
      child.traverse(object => { if (object.userData.semanticGroup === 'high-drapery') found = true; });
      return found;
    });
    if (!pavilion) throw new Error('music-furnishing-model-missing');
    musicFurniture = relocateMusicCourtyardFurnishings(pavilion);
    placeMusicBuilding(root);
    if (tree) attachMusicTree(tree);
  }
  async function attachMusicPavilionInterior(root: THREE.Object3D) {
    if (options.musicInteriorVersion) {
      musicInteriorRoot = root;
      musicDecoration = createMusicInteriorDecoration(root, {
        omitUpperLantern: !!options.musicInstrumentDisplay,
        hideLanternFixtures: !!options.musicInstrumentDisplay,
        avoidGroundMural: !!(deferMusicDetails && options.musicMuralTextureLimit),
      });
      // The front hall is visible from the preview's outdoor starting point.
      // Start only its lightweight finishes as soon as the building arrives;
      // do not await them in the player-ready chain.
      if (deferMusicDetails && options.musicMuralTextureLimit) {
        updateMusicGroundFinish(true);
        // These upper architectural elements are procedural and visible from
        // the same courtyard view; they do not load the instrument models.
        if (options.musicInstrumentDisplay) updateMusicUpperRelief(undefined, true);
      }
      if (!deferMusicDetails && currentMusicBalcony === 'interior' && options.musicMuralTextureLimit) {
        musicThreeWallMural = createMusicThreeWallMural(root, options.musicMuralTextureLimit);
      }
      await Promise.all([musicDecoration.ready, musicThreeWallMural?.ready]);
    }
  }
  function attachMusicGuide(model: GLTF) {
    musicGuide = createMusicGuideAvatar(model, releaseGuideModel);
    adoptModel(model.scene);
    environment.scene.add(musicGuide.root);
  }
  function attachMusicInteriorLighting() {
    if (!musicInteriorRoot) throw new Error('music-interior-lighting-root-missing');
    const guide = musicGuide?.root ?? companion?.root;
    const daylight = options.musicInstrumentDisplay && {
      avatars: guide ? [traveler, guide] : [traveler], mobile: options.musicInstrumentDisplay.mobile,
    };
    musicInteriorLighting = createMusicInteriorLighting(environment.scene, musicInteriorRoot, daylight);
    musicInteriorLighting.update(traveler.position, 0, true);
  }
  function showDistantMusicSilhouette() {
    const group = new THREE.Group(); group.name = 'first-gallery-distant-music';
    const walls = new THREE.MeshStandardMaterial({ color: 0xb1855b, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x673d31, roughness: 1 });
    const tiles = new THREE.MeshStandardMaterial({ color: 0x42483c, roughness: 1 });
    function box(width: number, height: number, depth: number, y: number, material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(47, y, -22); group.add(mesh);
    }
    box(25, 10.6, 10, 5.3, walls);
    box(26.5, .48, 11.4, 6.3, wood);
    box(27.5, .5, 12, 10.6, wood);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(.67, 1, 2.35, 4).rotateY(Math.PI / 4), tiles);
    roof.scale.set(19.4, 1, 8.5); roof.position.set(47, 11.95, -22); group.add(roof);
    terrain?.attachRegionObject('music', group);
    models.push(group); musicSilhouette = group;
  }
  function loadPatterns(load: (path: string) => Promise<GLTF>) {
    const stations = firstGallery && isCaissonOnlyMode() ? [] : PATTERN_STATIONS;
    return Promise.all(stations.map(async station => ({ station, model: (await load(station.asset)).scene })));
  }
  function attachCourtyard(courtyard: GLTF, patternModels: Awaited<ReturnType<typeof loadPatterns>>, caissonModel?: GLTF) {
    if (currentFirstGalleryVisuals) refineCourtyardRocks(courtyard.scene);
    courtyard.scene.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
      const name = String(object.userData.semanticGroup ?? object.name);
      if (firstGallery && isCaissonOnlyMode() && CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS.has(name)) object.visible = false;
      if (currentFirstGalleryVisuals && /^(tree-|shrub-)/.test(name)) {
        object.visible = false;
      }
    });
    courtyard.scene.position.set(-12, 0, 2);
    if(terrain)courtyardExpansion=applyTerrainCourtyardExpansion(courtyard.scene);
    if (compactConnectedTerrain) applyFirstGalleryCourtyardPaving(courtyard.scene);
    if (currentFirstGalleryVisuals) applyFirstGalleryHallPaving(courtyard.scene);
    if(terrain)courtyardShadows=prepareTerrainCourtyardShadows(courtyard.scene);
    if (terrain) {
      for (const { station, model } of patternModels) {
        const { x, y, z } = station.position;
        model.name = station.id;
        model.position.set(x, y, z);
        model.rotation.y = station.yaw;
        model.scale.setScalar(station.scale);
        model.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        if (station.id === 'mural-station') addMuralStationShadow(model);
        terrain.attachRegionObject('courtyard', model);
      }
      const parts = new Set<string>();
      courtyard.scene.traverse(object => {
        const id = String(object.userData.semanticGroup ?? object.name);
        // The user will redesign the ceiling later. Preserve the source asset,
        // but hide its low suspended caisson in this open-height hall preview.
        if (id.startsWith('caisson-')) object.visible = false;
        if (id.startsWith('hall-v003-')) parts.add(id);
      });
      squareHall = { asset: courtyardPath, parts: [...parts] };
    }
    environment.scene.add(courtyard.scene);
    if (terrain) {
      terrain.groundCourtyardAttachments(courtyard.scene);
      terrain.attachRegionObject('courtyard', courtyard.scene);
      if (caissonModel) terrain.attachRegionObject('courtyard', caissonModel.scene);
    }
    courtyard.scene.updateMatrixWorld(true);
    courtyard.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || (object.userData.cameraRole !== 'canopy' && !object.name.includes('-canopy'))) return;
      if (connectedGalleries) {
        for (let parent: THREE.Object3D | null = object; parent && parent !== courtyard.scene; parent = parent.parent) {
          if (!parent.visible) return;
        }
      }
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const materials = originals.map(material => {
        canopyMaterials.add(material);
        const copy = material.clone(); copy.transparent = true;
        return copy;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      canopies.push({ bounds: new THREE.Box3().setFromObject(object, true).expandByScalar(.2), materials, opacity: 1 });
    });
  }
  // Fail promptly if either model fails; release/abort its sibling immediately.
  const guidePath = `${MUSIC_GUIDE_DIRECTORY}/plain.glb`;
  const guideLoading = options.musicGuide && (!connectedGalleries || firstGalleryInitialGroups.includes('music')) ? loadModel(guidePath) : undefined;
  const ready = Promise.race([Promise.all([loading, music?.ready, terrain?.ready, landscapeLoading,bactrianCaravans?.ready,upperLoading,patternLoading,exhibitLoading,guideLoading]),deadline]).then(async ([[courtyard, avatar, [tree, shrub, dunes], [exterior, interior, tower, entry, buddha], towerTreeModels, musicTreeModel, caissonModel],,,landscapeModels,,upperModel,patternModels,exhibit,guideModel]) => {
    if (disposed) return;
    attachLandscape(landscapeModels);
    const isTripoTraveler = options.travelerPath === TRIPO_TRAVELER_MODEL || options.travelerPath === CAISSON_TRAVELER_MODEL;
    const travelerClips = isTripoTraveler ? tripoTravelerClips(avatar.animations) : avatar.animations;
    const required: TravelerAction[] = ['Idle', 'Walk', 'Run'];
    if (options.presentationClips) required.push('Greeting', 'HallLookUp');
    if (v5) required.push('LookAround');
    if (required.some(name => !travelerClips.some(clip => clip.name === name))) {
      throw new Error('model-animation-incomplete');
    }
    avatar.scene.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    if (options.sampleNature && tree && shrub && (dunes || terrain)) {
      environment.scene.traverse(object => {
        const name = String(object.userData.semanticGroup ?? object.name);
        if (/^(tree-|shrub-|road-grass|dune-|cliff-|boundary-)/.test(name)) object.visible = false;
      });
      for (const model of [tree, shrub, dunes]) {
        if (!model) continue;
        model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        environment.scene.add(model.scene);
      }
      if (courtyardAtStart || firstGallery) {
        if(v2)treesForCamera.push(tree.scene);
        tree.scene.position.set(v2?3:4.8, 0, v2?5:13); shrub.scene.position.set(-2.9, 0, 16.2);
        groundNature('courtyard', tree.scene);
        if(terrain)terrain.placeOutdoorShrub(shrub.scene,'courtyard');else groundNature('courtyard', shrub.scene);
      } else {
        tree.scene.removeFromParent(); shrub.scene.removeFromParent();
      }
      if (dunes) {
        dunes.scene.position.set(options.mogao ? 215 : v2 ? 105 : 55, 0, options.mogao ? 24 : v2 ? 0 : 12);
        dunes.scene.rotation.y = -Math.PI / 2;
        if (terrain) dunes.scene.visible = false;
        else { const paving = createPreviewPaving(); models.push(paving); environment.scene.add(paving); }
      }
      if (options.musicPavilion) {
        // Geometry and materials stay shared with the approved A assets. The
        // source model remains their one resource owner, clones are scene-only.
        for (const [index,[x,z,scale]] of [...regionLayout.trees,...(options.mogao?MOGAO_LAYOUT.routeTrees:[])].entries()) {
          const region=index<regionLayout.trees.length?'music':'cliff';
          if (scoped && profile.mode !== 'terrain' && region !== (profile.mode === 'music' ? 'music' : 'cliff')) continue;
          const id=region==='music'?`music-tree-${index}`:`mogao-v8-tree-${index-regionLayout.trees.length}`;
          const placed=terrain?TERRAIN_SCENERY_SOURCE_OVERRIDES[region]?.[id]:undefined;
          const instance=tree.scene.clone(true);instance.name=id;instance.position.set(placed?.x??x,0,placed?.z??z);instance.scale.setScalar(scale);environment.scene.add(instance);if(v2)treesForCamera.push(instance);
          groundNature(region, instance);
        }
        for (const [index,[x,z,scale]] of [...regionLayout.shrubs,...(options.mogao?MOGAO_LAYOUT.routeShrubs:[])].entries()) {
          const region=index<regionLayout.shrubs.length?'music':'cliff';
          if (scoped && profile.mode !== 'terrain' && region !== (profile.mode === 'music' ? 'music' : 'cliff')) continue;
          const instance=shrub.scene.clone(true);instance.name=`${region}-outdoor-shrub-${index}`;instance.position.set(x,0,z);instance.scale.setScalar(scale);environment.scene.add(instance);
          if(terrain)terrain.placeOutdoorShrub(instance,region);else groundNature(region, instance);
        }
        if (dunes) {
          const northDunes=dunes.scene.clone(true);northDunes.position.set(v2?20:0,0,-65);northDunes.rotation.y=0;environment.scene.add(northDunes);
          if (terrain) northDunes.visible = false;
          else if (!scoped || profile.mode === 'music') {const branch=createPreviewPaving((v4?MUSIC_ROAD_V4:v2?MUSIC_ROAD_V2:MUSIC_ROAD).filter(section=>section.center.z> (v4?2.8:v2?-8.55:-2.55)),true);models.push(branch);environment.scene.add(branch);}
        }
      }
      if (!scoped || profile.mode === 'terrain') terrain?.addNatureTemplates(tree.scene, shrub.scene);
    }
    if (courtyard) attachCourtyard(courtyard, patternModels, caissonModel);
    if(options.mogao&&!terrain){const road=createPreviewPaving(MOGAO_ROAD,true);models.push(road);environment.scene.add(road);}
    if(options.mogao){
      const distant = firstGallery && !cliffAtStart;
      if (exterior) {
        attachCliffModel(exterior, 'exterior', connectedGalleries || !distant);
        if (connectedGalleries) cliffMountainAsset = firstCliffPaths[0];
        if (compactConnectedTerrain) stream.cliff = 'ready';
        else if (distant) lowMountain = exterior.scene;
      }
      if (interior) attachCliffModel(interior, 'interior');
      if (connectedGalleries && tower && entry) {
        attachConnectedCliffTower(tower, entry);
        stream['cliff-tower'] = 'ready';
      } else {
        if (tower) attachCliffModel(tower, 'tower');
        if (entry) attachCliffModel(entry, 'entry');
      }
      if (buddha) attachCliffModel(buddha, 'buddha');
      if (upperModel) attachUpperGalleries(upperModel, exhibit, !!interior);
    }
    if (terrain) {
      if (towerTreeModels.length) attachTowerTrees(towerTreeModels);
      if (music) {
        const root = currentMusicRoot();
        if (!root) throw new Error('gallery-music-root-missing');
        attachMusicCourtyard(root, musicTreeModel);
        await attachMusicPavilionInterior(root);
        if (disposed) return;
      } else if (!currentFirstGalleryVisuals && (firstGallery || profile?.mode === 'terrain')) {
        showDistantMusicSilhouette();
      }
    }
    for(const treeRoot of treesForCamera){
      treeRoot.updateMatrixWorld(true);
      const bounds=new THREE.Box3(),copies=new Map<THREE.Material,THREE.Material>();
      treeRoot.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||!object.name.includes('-canopy-'))return;
        bounds.union(new THREE.Box3().setFromObject(object,true));
        const original=Array.isArray(object.material)?object.material:[object.material];
        const mapped=original.map(material=>{
          if(!copies.has(material)){const copy=material.clone();copy.transparent=true;copies.set(material,copy);
            canopyMaterials.add(material);if(treeRoot!==tree?.scene)canopyMaterials.add(copy);}
          return copies.get(material)!;
        });
        object.material=Array.isArray(object.material)?mapped:mapped[0];
      });
      if(!bounds.isEmpty())canopies.push({bounds:bounds.expandByScalar(.2),materials:[...copies.values()],opacity:1});
    }
    character = avatar.scene; traveler.add(character);
    // Align the supplied model to the movement and camera heading convention.
    if (isTripoTraveler) character.rotation.y += Math.PI;
    mixer = new THREE.AnimationMixer(character);
    for (const name of required) actions.set(name, mixer.clipAction(travelerClips.find(clip => clip.name === name)!));
    actions.get('Idle')!.play();
    mixer.update(0);
    if (modern || isTripoTraveler) {
      // Measure in model space: runtime may already have placed its parent on a high platform.
      const placedAt=traveler.position.clone();traveler.position.set(0,0,0);traveler.updateMatrixWorld(true);
      character.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(character,true),scale=1.8/(bounds.max.y-bounds.min.y);
      character.scale.multiplyScalar(scale);character.position.y-=bounds.min.y*scale;
      character.updateMatrixWorld(true);restHeight=new THREE.Box3().setFromObject(character,true).getSize(new THREE.Vector3()).y;
      traveler.position.copy(placedAt);traveler.updateMatrixWorld(true);
    }
    caveLighting?.addTraveler(avatar.scene);
    if (guideModel) attachMusicGuide(guideModel);
    else if (options.companion && !options.musicGuide) {
      companion=createCompanionAvatar(avatar.scene,travelerClips,{walkRate:options.animationRates?.walk,runRate:options.animationRates?.run,restHeight});
      environment.scene.add(companion.root);
    }
    if (options.musicInteriorVersion && (!connectedGalleries || music)) attachMusicInteriorLighting();
    clearTimeout(timeout);
    if (firstGallery) for (const group of firstGalleryInitialGroups) stream[group] = 'ready';
    if (connectedGalleries && music) stream['music-exterior'] = 'ready';
    if (scoped && initialGroup) stream[initialGroup] = 'ready';
    if (firstGallery || scoped) streamTimings.modelsReady = performance.now();
  }).catch(() => {
    dispose();
    throw new Error('美术模型加载失败。请重新加载。');
  });

  const sceneryDeferred = Symbol('defer-scenery-for-venue');
  function beginStream(group: StreamGroup) {
    const abort = new AbortController();
    stream[group] = 'loading'; streamControllers.set(group, abort);
    const deadline = setTimeout(() => abort.abort(), 60_000);
    const incoming: THREE.Object3D[] = [];
    let incomingMusic: ReturnType<typeof createMusic> = null;
    let incomingCaravans: ReturnType<typeof createBactrianCaravans> | null = null;
    let incomingCaissonTexture: THREE.Texture | null = null;
    const load = async (path: string) => {
      const model = await loadModel(path, abort.signal);
      incoming.push(model.scene);
      return model;
    };
    const assertLive = () => { if (disposed || abort.signal.aborted) throw new Error('gallery-region-load-cancelled'); };
    abort.signal.addEventListener('abort', () => {
      if (!disposed && group === 'music' && !music) {
        disposeMusicInterior();
        if (!distantMusic) { musicFurniture?.dispose(); musicFurniture = null; }
        musicGuide?.dispose(); musicGuide = null;
      }
      incomingMusic?.dispose();
      incomingCaravans?.dispose();
      if (incomingCaissonTexture) releaseCaissonTexture(incomingCaissonTexture);
      incomingCaissonTexture = null;
    }, { once: true });
    async function loadConnectedMusicExterior() {
      const candidate = createMusic(); incomingMusic = candidate;
      const root = currentMusicRoot();
      if (!candidate || !root) throw new Error('gallery-music-root-missing');
      root.visible = false;
      const [, tree] = await Promise.all([candidate.ready, load(MUSIC_COURTYARD_TREE.assetPath)]);
      assertLive();
      attachMusicCourtyard(root, tree);
      root.visible = true;
      const exterior = distantMusic = { pavilion: candidate, root };
      stream['music-exterior'] = 'ready';
      // The courtyard stays usable if loading the guide or interior fails.
      incoming.splice(incoming.indexOf(tree.scene), 1);
      incomingMusic = null;
      return exterior;
    }
    async function attach() {
      if (group === 'music-exterior') {
        await loadConnectedMusicExterior();
      } else if (group === 'music') {
        warmMusicHall();
        const guideLoading = options.musicGuide ? load(guidePath) : undefined;
        if (connectedGalleries) {
          const [exterior, guide] = await Promise.all([distantMusic ?? loadConnectedMusicExterior(), guideLoading]);
          assertLive();
          await attachMusicPavilionInterior(exterior.root); assertLive();
          if (guide) attachMusicGuide(guide);
          if (options.musicInteriorVersion) attachMusicInteriorLighting();
          music = exterior.pavilion; distantMusic = null;
          return;
        }
        const candidate = createMusic(); incomingMusic = candidate;
        const root = currentMusicRoot();
        if (!candidate || !root) throw new Error('gallery-music-root-missing');
        root.visible = false;
        const [, tree, guide] = await Promise.all([candidate.ready, load(MUSIC_COURTYARD_TREE.assetPath), guideLoading]);
        assertLive(); await attachMusicPavilionInterior(root); assertLive();
        attachMusicCourtyard(root);
        if (guide) attachMusicGuide(guide);
        if (options.musicInteriorVersion) attachMusicInteriorLighting();
        attachMusicTree(tree);
        if (musicSilhouette) musicSilhouette.visible = false;
        root.visible = true; music = candidate; incomingMusic = null;
      } else if (group === 'courtyard') {
        const [courtyard, patterns, caissonModel, texture] = await Promise.all([
          load(courtyardPath), terrain ? loadPatterns(load) : [],
          caissonEnabled ? load(TERRAIN_CAISSON_CONFIG.asset) : undefined,
          caissonEnabled ? loadCaissonCenterTexture(new URL(worldAssetUrl(TERRAIN_CAISSON_CONFIG.centerPanel.texture), document.baseURI), abort.signal).then(texture => {
            if (abort.signal.aborted || disposed) {
              releaseCaissonTexture(texture);
              assertLive();
            }
            incomingCaissonTexture = texture;
            return texture;
          }) : undefined,
        ]);
        assertLive();
        if (texture && caissonModel) {
          try { caisson = prepareTerrainCaisson(caissonModel.scene, texture); }
          finally {
            if (modelOwnsTexture(caissonModel.scene, texture)) incomingCaissonTexture = null;
          }
        }
        attachCourtyard(courtyard, patterns, caissonModel);
      } else if (group === 'cliff' && !scoped && !connectedGalleries) {
        const [mountain, tower, entry, trees] = await Promise.all([load(cliffPaths[0]), load(cliffPaths[2]), load(cliffPaths[3]),
          Promise.all(TERRAIN_TOWER_TREES.map(tree => load(tree.assetPath)))]);
        assertLive();
        attachCliffModel(mountain, 'exterior'); attachCliffModel(tower, 'tower'); attachCliffModel(entry, 'entry'); attachTowerTrees(trees);
        if (lowMountain) lowMountain.visible = false;
      } else if (group === 'cliff-tower') {
        const [tower, entry] = await Promise.all([load(cliffPaths[2]), load(cliffPaths[3])]);
        assertLive();
        attachConnectedCliffTower(tower, entry);
      } else if (group === 'cliff' || group === 'cliff-interior') {
        const kinds = ['exterior', 'interior', 'tower', 'entry', 'buddha'] as const;
        const selected = cliffPaths.flatMap((path, index) => {
          if (connectedGalleries && (index === 2 || index === 3)) return [];
          return (index === 1 || index === 4) === (group === 'cliff-interior') ? [{ path, kind: kinds[index] }] : [];
        });
        const loadParts = async () => {
          const renderer = lightingRenderer;
          if (group !== 'cliff-interior' || !compactConnectedTerrain || !renderer) {
            return Promise.all(selected.map(async ({ path, kind }) => ({ model: await load(path), kind })));
          }
          const parts: { model: GLTF; kind: (typeof kinds)[number] }[] = [];
          for (const { path, kind } of selected) {
            const model = await load(path);
            await warmCliffTextures(model.scene, renderer, abort.signal);
            assertLive();
            parts.push({ model, kind });
          }
          return parts;
        };
        const [parts, trees] = await Promise.all([
          loadParts(),
          group === 'cliff' && terrain && !connectedGalleries && !towerTrees ? Promise.all(TERRAIN_TOWER_TREES.map(tree => load(tree.assetPath))) : [],
        ]);
        assertLive();
        const distantFinish = rockFinish;
        for (const { model, kind } of parts) {
          attachCliffModel(model, kind);
          if (group === 'cliff-interior' && compactConnectedTerrain) environmentLighting?.includeReceivers(model.scene);
        }
        if (connectedGalleries && group === 'cliff') {
          releaseDistantCliff(distantFinish);
          cliffMountainAsset = cliffPaths[0];
        }
        if (trees.length) attachTowerTrees(trees);
        if (group === 'cliff' && lowMountain) lowMountain.visible = false;
      } else if (group === 'cliff-galleries') {
        const [model, exhibit] = await Promise.all([
          load(`${upperAssetDir}/upper.glb`), options.mogaoExhibitVersion ? import('./mogao-exhibit-scene') : undefined,
        ]);
        assertLive();
        attachUpperGalleries(model, exhibit, stream['cliff-interior'] === 'ready');
      } else if (group === 'cliff-rocks') {
        const rocks = await load(landscapePaths[0]);
        assertLive();
        attachLandscape([rocks]);
      } else if (group === 'cliff-trees') {
        const trees = await Promise.all(TERRAIN_TOWER_TREES.map(tree => load(tree.assetPath)));
        assertLive();
        attachTowerTrees(trees);
      } else {
        const caravans = createBactrianCaravans(); incomingCaravans = caravans;
        const [scenery] = await Promise.all([Promise.all((connectedGalleries ? [] : landscapePaths).map(load)), caravans.ready]);
        assertLive();
        attachLandscape(scenery); environment.scene.add(caravans.root);
        bactrianCaravans = caravans; incomingCaravans = null;
      }
    }
    void attach().then(() => {
      if (disposed) return;
      stream[group] = 'ready';
      if (group === 'cliff-interior' || group === 'cliff-galleries') {
        if (group === 'cliff-interior') mogaoExhibit?.setViewingRoomReady();
        if (mogaoExhibit) options.onMogaoExhibitChange?.();
      }
      if (lightingRenderer && (group !== 'cliff-tower' || connectedCliffTower?.visible)) {
        environmentLighting?.refresh(lightingRenderer);
      }
    }, () => {
      abort.abort();
      if (disposed) return;
      for (const model of incoming) {
        const index = models.indexOf(model);
        if (index >= 0) { models.splice(index, 1); releaseModel(model); }
      }
      stream[group] = abort.signal.reason === sceneryDeferred ? 'idle' : 'failed';
      if (connectedGalleries && stream[group] === 'failed' &&
        (group === 'music-exterior' || group === 'scenery' || group === 'cliff-rocks' || group === 'cliff-trees' || group === 'cliff-tower')) {
        sceneryRetryAt[group] = performance.now() + 20_000;
      }
    }).catch(error => { if (!disposed) console.warn('gallery-stream-shadow-refresh', error); }).finally(() => {
      clearTimeout(deadline); streamControllers.delete(group);
    });
  }
  function updateFirstGalleryStreaming(position: WorldPoint, musicUnlocked: boolean, cliffUnlocked = false,
    surfaceId?: string | null, buddhaGateOpen?: boolean, hallAGateOpen?: boolean, prewarmCliffTower = false) {
    if (!streamReady || disposed) return;
    if (!connectedGalleries && currentFirstGalleryVisuals) return;
    if (connectedGalleries) {
      if (connectedCliffUnlocked !== cliffUnlocked) {
        connectedCliffUnlocked = cliffUnlocked;
        if (connectedCliffTower) {
          connectedCliffTower.visible = cliffUnlocked;
          if (lightingRenderer) environmentLighting?.refresh(lightingRenderer);
        }
        if (!cliffUnlocked) streamControllers.get('cliff-tower')?.abort(sceneryDeferred);
      }
      const warmNearMusic = prewarmCliffTower && musicUnlocked && stream.music === 'ready' &&
        (surfaceId?.startsWith('music-') || firstGalleryEntryVenue(position) === 'music');
      // The last music challenge can finish beside the exit. Warm the tower
      // after the nearby venue is ready, then reveal only at the real unlock.
      if (options.mogao && (cliffUnlocked || warmNearMusic)) {
        if (stream['cliff-tower'] === 'failed' && performance.now() >= (sceneryRetryAt['cliff-tower'] ?? Infinity)) stream['cliff-tower'] = 'idle';
        if (stream['cliff-tower'] === 'idle') beginStream('cliff-tower');
      }
      if (distantMusic) {
        distantMusic.root.visible = musicUnlocked;
        if (musicTree) musicTree.root.visible = musicUnlocked;
      }
      if (!musicUnlocked) streamControllers.get('music-exterior')?.abort(sceneryDeferred);
      const approach = connectedGalleryApproachGroups(position, surfaceId, {
        courtyardReady: stream.courtyard === 'ready', musicUnlocked, cliffUnlocked, buddhaGateOpen, hallAGateOpen,
      });
      updateLocalExhibitStreaming(position, surfaceId, approach.includes('music'));
      updatePreviewApproach(approach);
      if (!streamControllers.size) {
        for (const group of ['music-exterior', 'cliff-rocks', 'cliff-trees', 'scenery'] as const) {
          if (group === 'music-exterior' && (!musicUnlocked || !options.musicPavilion || music)) continue;
          if (stream[group] === 'failed' && performance.now() >= (sceneryRetryAt[group] ?? Infinity)) stream[group] = 'idle';
          if (stream[group] === 'idle') { beginStream(group); break; }
        }
      }
      return;
    }
    const nearby = firstGalleryApproachVenue(position, stream.courtyard === 'ready', musicUnlocked);
    const arrived = nearby !== nearbyStream;
    nearbyStream = nearby;
    if (nearby && arrived && stream[nearby] === 'failed') stream[nearby] = 'idle';
    if (streamControllers.size) return;
    if (nearby && stream[nearby] === 'idle') beginStream(nearby);
    else if (stream.scenery === 'idle' && Math.hypot(position.x - 110, position.z - 12) > 55) beginStream('scenery');
  }
  function firstGalleryEntryStatus(position: WorldPoint, surfaceId?: string | null,
    musicUnlocked = true, cliffUnlocked = true) {
    if (!connectedGalleries && currentFirstGalleryVisuals) return null;
    if (connectedGalleries) return checkPreviewEntry(connectedGalleryEntryGroups(position, surfaceId).flatMap(group => {
      if (group === 'cliff' && cliffUnlocked) return ['cliff', 'cliff-tower'] as const;
      return group === 'courtyard' || (group === 'music' ? musicUnlocked : cliffUnlocked) ? [group] : [];
    }));
    const region = firstGalleryEntryVenue(position);
    if (!region || stream[region] === 'ready') return null;
    return stream[region] === 'failed' ? 'failed' as const : 'loading' as const;
  }
  function previewGroupEnabled(group: StreamGroup) {
    if (group === 'music') return !!options.musicPavilion;
    if (group === 'cliff' || group === 'cliff-interior' || group === 'cliff-galleries' || group === 'cliff-tower') return !!options.mogao;
    if (group === 'scenery') return enhancedEnvironment;
    return true;
  }
  function startPendingPreviewGroup() {
    if (!streamReady || disposed) return;
    const queue = pendingPreviewGroup ? [pendingPreviewGroup, ...previewApproach] : previewApproach;
    const group = queue.find(item => previewGroupEnabled(item) && stream[item] === 'idle');
    if (!group) return;
    if (group === 'cliff-tower') {
      if (connectedCliffUnlocked) beginStream(group);
      return;
    }
    if (streamControllers.size > Number(streamControllers.has('cliff-tower'))) {
      if (connectedGalleries) {
        for (const background of ['scenery', 'cliff-rocks', 'cliff-trees'] as const) {
          streamControllers.get(background)?.abort(sceneryDeferred);
        }
        // A nearby music entrance will use this exact building after it arrives.
        if (group !== 'music') streamControllers.get('music-exterior')?.abort(sceneryDeferred);
      }
      return;
    }
    beginStream(group);
  }
  function loadMusicDetailApproaches(approaches: ReturnType<typeof musicPreviewDetailApproaches>, retry = false) {
    const pavilion = music ?? distantMusic?.pavilion ?? null;
    if (!deferMusicDetails || !hasMusicDetails(pavilion)) return;
    const previous = previousMusicApproaches;
    previousMusicApproaches = approaches;
    for (const detail of ['flying', 'balcony'] as const) {
      if (!approaches[detail]) continue;
      const status = pavilion.detailStatus(detail);
      if (status !== 'idle' && !(status === 'failed' && (retry || !previous?.[detail]))) continue;
      void pavilion.loadDetail(detail, true).then(loaded => {
        if (!loaded || disposed) return;
        if (options.musicInstrumentDisplay && musicInteriorRoot) musicInteriorLighting?.include(musicInteriorRoot);
        if (lightingRenderer) environmentLighting?.refresh(lightingRenderer);
      }).catch(error => { if (!disposed) console.warn('music-detail-shadow-refresh', error); });
    }
    if (!approaches.interiorMural || !musicInteriorRoot || !options.musicMuralTextureLimit) return;
    const status = musicThreeWallMural?.inspect().status;
    if (!status || (status === 'failed' && (retry || !previous?.interiorMural))) {
      musicThreeWallMural?.dispose();
      musicThreeWallMural = createMusicThreeWallMural(musicInteriorRoot, options.musicMuralTextureLimit);
      if (options.musicInstrumentDisplay) {
        const mural = musicThreeWallMural;
        void mural.ready.then(() => {
          if (musicThreeWallMural === mural && musicInteriorRoot) musicInteriorLighting?.include(musicInteriorRoot);
        });
      }
    }
  }
  function updateMusicGroundFinish(approaching: boolean, retry = false) {
    if (!approaching) { musicGroundFinishFailed = false; return; }
    const parent = musicInteriorRoot, limit = options.musicMuralTextureLimit;
    if (!parent || !limit || musicGroundFinishImporting || (musicGroundFinishFailed && !retry)) return;
    if (musicGroundWalls?.inspect().status === 'failed' && retry) { musicGroundWalls.dispose(); musicGroundWalls = null; }
    if (musicGroundCeiling?.inspect().status === 'failed' && retry) { musicGroundCeiling.dispose(); musicGroundCeiling = null; }
    if (musicGroundWalls && musicGroundCeiling && musicGroundStone && musicGroundStair) return;
    musicGroundFinishImporting = true;
    void Promise.all([import('./music-ground-floor-walls-v001'), import('./music-ground-floor-ceiling-v001'),
      import('./music-ground-floor-stone-v001'), import('./music-ground-floor-stair-finish-v001')]).then(([walls, ceiling, stone, stair]) => {
      if (disposed || musicInteriorRoot !== parent) return;
      if (!musicGroundStone) {
        musicGroundStone = stone.createMusicGroundFloorStone(parent);
        musicInteriorLighting?.include(musicGroundStone.group);
      }
      if (!musicGroundStair) {
        musicGroundStair = stair.createMusicGroundFloorStairFinish(parent);
        musicInteriorLighting?.include(musicGroundStair.group);
      }
      if (!musicGroundWalls) {
        const mounted = walls.createMusicGroundFloorWalls(parent, limit, loadMusicHallAsset);
        musicGroundWalls = mounted;
        void mounted.ready.then(() => { if (!disposed && musicGroundWalls === mounted && mounted.inspect().status === 'ready') musicInteriorLighting?.include(mounted.group); });
      }
      if (!musicGroundCeiling) {
        const mounted = ceiling.createMusicGroundFloorCeiling(parent, limit, loadMusicHallAsset);
        musicGroundCeiling = mounted;
        void mounted.ready.then(() => { if (!disposed && musicGroundCeiling === mounted && mounted.inspect().status === 'ready') musicInteriorLighting?.include(mounted.group); });
      }
    }).catch(error => {
      if (!disposed) { musicGroundFinishFailed = true; console.warn('music-ground-finish-load-failed', error); }
    }).finally(() => { musicGroundFinishImporting = false; });
  }
  function updateLocalExhibitStreaming(position: WorldPoint, surfaceId?: string | null, prepareConnectedMusic = false) {
    if (hallARoot) updateHallA(position, surfaceId);
    const musicPosition = deferMusicDetails ? fromTerrainPoint('music', position) : null;
    const hallFinishApproach = prepareConnectedMusic || !!musicPosition && musicHallFinishApproach(musicPosition, surfaceId);
    if (musicPosition) {
      updateMusicGroundFinish(hallFinishApproach, hallFinishApproach && !previousMusicHallFinishApproach);
      previousMusicHallFinishApproach = hallFinishApproach;
      loadMusicDetailApproaches(prepareConnectedMusic ? connectedMusicDetails : musicPreviewDetailApproaches(musicPosition, surfaceId));
    }
    if (options.musicInstrumentDisplay) {
      // The upper finish is generated locally; let first-floor textures finish
      // first on the courtyard approach, but never delay an upstairs restore.
      const groundSettled = !!musicGroundWalls && !!musicGroundCeiling &&
        musicGroundWalls.inspect().status !== 'loading' && musicGroundCeiling.inspect().status !== 'loading';
      updateMusicUpperRelief(surfaceId, hallFinishApproach && (groundSettled || musicGroundFinishFailed));
      updateMusicInstruments(position, surfaceId);
    }
  }
  function updatePreviewApproach(groups: readonly StreamGroup[]) {
    const approach = groups.filter(previewGroupEnabled);
    for (const group of approach) {
      if (stream[group] === 'failed' && !previewApproach.includes(group)) stream[group] = 'idle';
    }
    if (connectedGalleries && pendingPreviewGroup && !approach.includes(pendingPreviewGroup)) pendingPreviewGroup = null;
    previewApproach = approach;
    startPendingPreviewGroup();
  }
  function updatePreviewStreaming(position: WorldPoint, surfaceId?: string | null, buddhaGateOpen?: boolean, hallAGateOpen?: boolean) {
    if (!streamReady || disposed) return;
    updateLocalExhibitStreaming(position, surfaceId);
    updatePreviewApproach(previewApproachRegions(previewContext(position, surfaceId), buddhaGateOpen, hallAGateOpen));
    const insideMusic = deferMusicDetails && (surfaceId === 'music-stair' || surfaceId === 'music-floor-2' ||
      (surfaceId === 'music-floor-1' && fromTerrainPoint('music', position).z <= -18.2));
    if (!requestedGround && terrain && !insideMusic && (profile?.mode !== 'cliff' || !surfaceId)) {
      requestedGround = true;
      void terrain.loadGroundDetail();
    }
  }
  function updateMusicUpperRelief(surfaceId?: string | null, visibleFromCourtyard = false) {
    const approaching = visibleFromCourtyard || isMusicInstrumentDisplayApproach(surfaceId);
    if (!approaching) musicUpperReliefFailed = false;
    const parent = musicInteriorRoot, presentation = options.musicInstrumentDisplay;
    if (!approaching || !parent || !presentation || musicUpperWalls || musicUpperReliefImporting || musicUpperReliefFailed) return;
    musicUpperReliefImporting = true;
    void Promise.all([import('./music-upper-wall-relief'), import('./music-interior-relief-ceiling-v001'),
      import('./music-transition-trim-v001'), import('./music-transition-ceiling-v001'),
      import('./music-upper-floor-finish-v001'), import('./music-balcony-floor-finish-v001'),
      import('./music-balcony-rail-v001')]).then(([walls, ceiling, trim, transitionCeiling, floor, balconyFloor, balconyRail]) => {
      if (disposed || musicInteriorRoot !== parent) return;
      let mountedWalls: ReturnType<typeof createMusicUpperWallRelief> | null = null;
      let mountedCeiling: ReturnType<typeof createMusicInteriorReliefCeiling> | null = null;
      let mountedTrim: ReturnType<typeof createMusicTransitionTrim> | null = null;
      let mountedTransitionCeiling: ReturnType<typeof createMusicTransitionCeiling> | null = null;
      let mountedFloor: ReturnType<typeof createMusicUpperFloorFinish> | null = null;
      let mountedBalconyFloor: ReturnType<typeof createMusicBalconyFloorFinish> | null = null;
      let mountedBalconyRail: ReturnType<typeof applyMusicBalconyRail> | null = null;
      try {
        mountedWalls = walls.createMusicUpperWallRelief(parent);
        mountedCeiling = ceiling.createMusicInteriorReliefCeiling(parent);
        mountedTrim = trim.createMusicTransitionTrim(parent);
        mountedTransitionCeiling = transitionCeiling.createMusicTransitionCeiling(parent);
        mountedFloor = floor.createMusicUpperFloorFinish(parent);
        mountedBalconyFloor = balconyFloor.createMusicBalconyFloorFinish(parent);
        mountedBalconyRail = balconyRail.applyMusicBalconyRail(parent);
        musicInteriorLighting?.include(mountedWalls.group);
        musicInteriorLighting?.include(mountedCeiling.group);
        musicInteriorLighting?.include(mountedTrim.group);
        musicInteriorLighting?.include(mountedTransitionCeiling.group);
        musicInteriorLighting?.include(mountedFloor.group);
        musicInteriorLighting?.include(mountedBalconyFloor.group);
        musicInteriorLighting?.include(mountedBalconyRail.group);
        musicUpperWalls = mountedWalls; musicUpperCeiling = mountedCeiling;
        musicTransitionTrim = mountedTrim; musicTransitionCeiling = mountedTransitionCeiling;
        musicUpperFloor = mountedFloor;
        musicBalconyFloor = mountedBalconyFloor;
        musicBalconyRail = mountedBalconyRail;
        presentation.onChange();
      } catch (error) {
        if (mountedWalls) { musicInteriorLighting?.exclude(mountedWalls.group); mountedWalls.dispose(); }
        if (mountedCeiling) { musicInteriorLighting?.exclude(mountedCeiling.group); mountedCeiling.dispose(); }
        if (mountedTrim) { musicInteriorLighting?.exclude(mountedTrim.group); mountedTrim.dispose(); }
        if (mountedTransitionCeiling) { musicInteriorLighting?.exclude(mountedTransitionCeiling.group); mountedTransitionCeiling.dispose(); }
        if (mountedFloor) { musicInteriorLighting?.exclude(mountedFloor.group); mountedFloor.dispose(); }
        if (mountedBalconyFloor) { musicInteriorLighting?.exclude(mountedBalconyFloor.group); mountedBalconyFloor.dispose(); }
        if (mountedBalconyRail) { musicInteriorLighting?.exclude(mountedBalconyRail.group); mountedBalconyRail.dispose(); }
        throw error;
      }
    }).catch(error => {
      if (!disposed) { musicUpperReliefFailed = true; console.warn('music-upper-relief-load-failed', error); }
    }).finally(() => { musicUpperReliefImporting = false; });
  }
  function updateMusicInstruments(position: WorldPoint, surfaceId?: string | null) {
    const approaching = isMusicInstrumentDisplayApproach(surfaceId);
    musicInstrumentPosition = approaching ? { position, surfaceId } : null;
    if (musicInstruments) {
      musicInstruments.update(position, surfaceId);
      return;
    }
    if (!approaching) musicInstrumentsImportFailed = false;
    const parent = musicInteriorRoot, presentation = options.musicInstrumentDisplay;
    if (!parent || !presentation || !approaching || musicInstrumentsImporting || musicInstrumentsImportFailed) return;
    musicInstrumentsImporting = true;
    void import('./music-instrument-display').then(({ createMusicInstrumentDisplay }) => {
      if (disposed || !musicInstrumentPosition) return;
      musicInstruments = createMusicInstrumentDisplay(parent, {
        mobile: presentation.mobile,
        onModelReady: model => musicInteriorLighting?.includeExhibit(model),
        onChange: () => {
          if (disposed) return;
          presentation.onChange();
        },
      });
      musicInstruments.update(musicInstrumentPosition.position, musicInstrumentPosition.surfaceId);
    }).catch(() => {
      if (!disposed) musicInstrumentsImportFailed = true;
    }).finally(() => { musicInstrumentsImporting = false; });
  }
  function updateHallA(position: WorldPoint, surfaceId?: string | null) {
    if (mogaoHallA) {
      mogaoHallA.update(position, surfaceId);
      return;
    }
    const previousApproach = hallAApproach;
    hallAApproach = isMogaoHallAApproach(surfaceId);
    if (!hallAApproach || previousApproach || hallAImporting) return;
    hallAImporting = true;
    void import('./mogao-hall-a-scene').then(({ createMogaoHallAScene }) => {
      if (disposed || !hallAApproach || !hallARoot) return;
      mogaoHallA = createMogaoHallAScene(hallARoot, { onChange: options.onMogaoExhibitChange });
      mogaoHallA.update(position, surfaceId);
      options.onMogaoExhibitChange?.();
    }).catch(error => {
      if (!disposed) console.warn('mogao-hall-a-scene-load', error);
    }).finally(() => { hallAImporting = false; });
  }
  function checkPreviewEntry(groups: readonly StreamGroup[]) {
    const group = groups.find(group => previewGroupEnabled(group) && stream[group] !== 'ready');
    if (!group) {
      pendingPreviewGroup = null;
      return null;
    }
    pendingPreviewGroup = group;
    startPendingPreviewGroup();
    return stream[group] === 'failed' ? 'failed' as const : 'loading' as const;
  }
  function previewEntryStatus(position: WorldPoint, surfaceId?: string | null) {
    const group = previewRegionAt(previewContext(position, surfaceId));
    return checkPreviewEntry(group ? [group] : []);
  }
  function retryPreviewStreaming() {
    if (previousMusicApproaches) loadMusicDetailApproaches(previousMusicApproaches, true);
    if (previousMusicHallFinishApproach) updateMusicGroundFinish(true, true);
    musicInstruments?.retry();
    if (musicUpperReliefFailed && (musicInstrumentPosition || previousMusicHallFinishApproach)) {
      musicUpperReliefFailed = false;
      updateMusicUpperRelief(musicInstrumentPosition?.surfaceId, previousMusicHallFinishApproach);
    }
    if (musicInstrumentsImportFailed && musicInstrumentPosition) {
      musicInstrumentsImportFailed = false;
      updateMusicInstruments(musicInstrumentPosition.position, musicInstrumentPosition.surfaceId);
    }
    const failed = pendingPreviewGroup ?? previewApproach.find(group => stream[group] === 'failed');
    if (failed && stream[failed] === 'failed') stream[failed] = 'idle';
    startPendingPreviewGroup();
  }
  const initialStreamRegion = connectedGalleries ? firstGalleryInitialGroups[0] ?? null : scoped ? initialGroup : initialRegion;
  return {
    scene: environment.scene, traveler, ready, get music() { return music; },
    get musicInstruments() { return musicInstruments; },
    get mogaoExhibit() { return mogaoExhibit; },
    get mogaoHallA() { return mogaoHallA; },
    ...(firstGallery ? { updateFirstGalleryStreaming, firstGalleryEntryStatus,
      firstGalleryCourtyardReady: () => stream.courtyard === 'ready', loadGroundDetail: terrain?.loadGroundDetail } : {}),
    ...(scoped ? { updatePreviewStreaming, previewEntryStatus } : {}),
    ...(scoped || connectedGalleries ? { retryPreviewStreaming } : {}),
    ...(connectedGalleries ? { musicCourtyardReady: () => stream['music-exterior'] === 'ready' } : {}),
    ...(deferMusicDetails ? {
      musicFlyingReady: () => hasMusicDetails(music) && music.detailStatus('flying') === 'ready',
      musicDetailsFailed: () => {
        if (musicInstrumentPosition && (musicUpperReliefFailed || musicInstrumentsImportFailed || musicInstruments?.hasFailure())) return true;
        if (previousMusicHallFinishApproach && (musicGroundFinishFailed || musicUpperReliefFailed ||
          musicGroundWalls?.inspect().status === 'failed' || musicGroundCeiling?.inspect().status === 'failed')) return true;
        const approaches = previousMusicApproaches;
        const current = music;
        if (!approaches || !hasMusicDetails(current)) return false;
        return (['flying', 'balcony'] as const).some(detail => approaches[detail] && current.detailStatus(detail) === 'failed') ||
          (approaches.interiorMural && musicThreeWallMural?.inspect().status === 'failed');
      },
    } : {}),
    ...(options.companion ? {
      updateCompanion(position: THREE.Vector3, heading: number, speed: number, dt: number, reduced: boolean,
        presentation?: MusicGuideAvatarPresentation) {
        if (musicGuide) musicGuide.update(position, heading, speed, dt, reduced, presentation);
        else companion?.update(position,heading,speed,dt,reduced);
      },
      inspectCompanion(): CompanionAvatarSnapshot {
        return musicGuide?.inspect() ?? companion?.inspect() ?? {visible:false,animation:'Idle',time:0,position:[0,0,0],heading:0,restHeight:null,playbackRate:1};
      },
    } : {}),
    get musicGuideRoot() { return musicGuide?.root; },
    async selectMusicGuideOutfit(id, progress, signal, preparation) {
      const guide = musicGuide;
      if (!guide || disposed || signal.aborted) return false;
      finishMusicGuideReveal();
      const model = id === 'plain' ? undefined : await loadModel(`${MUSIC_GUIDE_DIRECTORY}/${id}.glb`, signal, progress);
      if (signal.aborted || disposed) {
        if (model && !disposed) releaseGuideModel(model.scene);
        return false;
      }
      discardMusicGuideOutfit();
      let staged: NonNullable<typeof stagedMusicGuideOutfit> | undefined;
      try {
        const outfit = guide.prepareOutfit(id, model);
        if (!outfit) {
          if (model) releaseGuideModel(model.scene);
          return false;
        }
        staged = stagedMusicGuideOutfit = { id, model, outfit };
        if (preparation) {
          const { renderer, camera, reveal } = preparation;
          await warmGuideOutfit(outfit.model, renderer, camera);
          if (reveal && stagedMusicGuideOutfit === staged && !signal.aborted && !disposed) {
            const alphaToCoverage = renderer.getContext().getContextAttributes()?.antialias === true;
            const effect = createMusicGuideSurfaceReveal(outfit.model, guide.root, alphaToCoverage);
            staged.reveal = effect;
            effect.apply();
            effect.update(0, 0);
            includeGuideReceivers(outfit.model);
            await renderer.compileAsync(outfit.model, camera, environment.scene);
          }
        }
        if (stagedMusicGuideOutfit !== staged) return false;
        if (signal.aborted || disposed) {
          discardMusicGuideOutfit();
          return false;
        }
        return true;
      } catch (error) {
        if (staged && stagedMusicGuideOutfit === staged) discardMusicGuideOutfit();
        else if (!staged && model) releaseGuideModel(model.scene);
        throw error;
      }
    },
    commitMusicGuideOutfit(id) {
      const staged = stagedMusicGuideOutfit;
      if (!musicGuide || disposed || !staged || staged.id !== id) return false;
      try {
        if (!staged.outfit.commit(updateGuideLighting)) return false;
      } catch (error) {
        discardMusicGuideOutfit();
        try { updateGuideLighting(); }
        catch (recoveryError) { console.warn('music-guide-rollback-lighting', recoveryError); }
        throw error;
      }
      if (staged.model) adoptModel(staged.model.scene);
      if (staged.reveal) activeMusicGuideReveal = { model: staged.outfit.model, effect: staged.reveal };
      stagedMusicGuideOutfit = null;
      return true;
    },
    setMusicGuideRevealProgress(progress, elapsed) { activeMusicGuideReveal?.effect.update(progress, elapsed); },
    finishMusicGuideReveal,
    cancelMusicGuideOutfit: discardMusicGuideOutfit,
    restoreMusicGuidePlain() {
      finishMusicGuideReveal();
      discardMusicGuideOutfit();
      musicGuide?.replace('plain', undefined, updateGuideLighting);
    },
    animationName: () => actionName,
    animatePresentation(name, time) {
      if (!mixer) return;
      const action = actions.get(name);
      if (!action) throw new Error('Required character presentation clip is missing');
      if (actionName !== name) { mixer.stopAllAction(); action.reset().setLoop(THREE.LoopOnce, 1).play(); action.clampWhenFinished = true; actionName = name; }
      action.setEffectiveWeight(1); action.setEffectiveTimeScale(0); action.time = Math.min(time, action.getClip().duration); mixer.update(0);
    },
    inspectInterior:()=>darkExhibit ? { ...caveLighting?.inspect(), finish: { version: 'v005', surfaces: { ...caveFinishCounts }, linedShaftFaces } }
      : caveLighting?.inspect(),
    prepareEnvironment:environmentLighting||scoped?async(renderer,camera)=>{
      environmentLighting?.updateTraveler(traveler.position);
      if (firstGallery || scoped) streamTimings.lightingStart = performance.now();
      await environmentLighting?.prepare(renderer,camera);
      if ((firstGallery || scoped) && !disposed) {
        streamTimings.lightingReady = performance.now();
        lightingRenderer = renderer; streamReady = true;
      }
    }:undefined,
    updateTerrain:dt=>{environmentLighting?.updateTraveler(traveler.position);musicInteriorLighting?.update(traveler.position,dt);},
    inspectTerrain:()=>terrain?{...terrain.inspect(),lighting:environmentLighting?.inspect(),rockFinish:rockFinish?.inspect(),bactrianCaravans:bactrianCaravans?.inspect(),towerTrees:towerTrees?.inspect(),courtyardExpansion,courtyardShadows,caisson,squareHall,upper:upper?{version:'v002',hiddenRailings:hiddenUpperRailings}:undefined,musicTree:musicTree?.inspect(),musicFurniture:musicFurniture?.inspect(),musicDecoration:musicDecoration?.inspect(),musicInteriorLighting:musicInteriorLighting?.inspect(),musicThreeWallMural:musicThreeWallMural?.inspect(),musicGroundFloor:{walls:musicGroundWalls?.inspect(),ceiling:musicGroundCeiling?.inspect()},musicUpperRelief:musicUpperWalls?{...musicUpperWalls.inspect(),ceiling:!!musicUpperCeiling,transition:musicTransitionTrim?.inspect(),connectedCeiling:!!musicTransitionCeiling}:undefined,streaming:firstGallery||scoped?{
      ...stream, initialRegion: initialStreamRegion, musicSilhouetteVisible: !!musicSilhouette?.visible,
      musicBuildingVisible: !!music || !!distantMusic?.root.visible, timing: { ...streamTimings },
      cliffMountainAsset, cliffTowerVisible: !!connectedCliffTower?.visible,
    }:undefined}:undefined,
    buddhaVisibleAtCenter(camera, point){
      if(!buddhaSubject)return false;
      // Sample only while the inexpensive projected-landmark test qualifies.
      // A tunnel roof, wall or lintel in front must never count as viewing the statue.
      gazeRay.setFromCamera(gazePoint.set(point?.x ?? 0, point?.y ?? 0),camera);
      const statue=gazeRay.intersectObject(buddhaSubject,true)[0];
      if(!statue)return false;
      const cover=gazeRay.intersectObjects(buddhaOccluders,true)[0];
      return !cover||cover.distance>statue.distance;
    },
    inspectTraveler() {
      const joints: { name: string; position: number[] }[] = [];
      traveler.updateMatrixWorld(true);
      traveler.traverse(object => { if (object instanceof THREE.Bone && /(?:Head|RightHand|RightForeArm|Neck)$/.test(object.name)) joints.push({ name: object.name, position: object.getWorldPosition(new THREE.Vector3()).toArray() }); });
      return { visible:traveler.visible, restHeight, animation: actionName, time: actions.get(actionName)?.time ?? 0, joints };
    },
    updateCameraVisibility(target, position, dt, immediate, stairCamera = false) {
      if(v2 && !environmentLighting){
        // Translate the existing sun/shadow volume without changing its angle,
        // intensity or adding lights. Stable texel steps avoid shadow shimmer.
        const sun=environment.scene.children.find(item=>item instanceof THREE.DirectionalLight) as THREE.DirectionalLight|undefined;
        if(sun){
          if (terrain) {
            const landmark=target.x>300,scale=landmark?3:2;
            updateTerrainSunShadow(sun,new THREE.Vector3(target.x,terrainHeight(target.x,target.z),target.z),{
              extent:landmark?95:65,offset:new THREE.Vector3(-14,35,22).multiplyScalar(scale),
              near:1,far:landmark?250:180,bias:landmark?-.0003:-.0002,normalBias:landmark?.14:.04,
            });
          } else {
            const x=Math.round(target.x*25.6)/25.6,z=Math.round(target.z*25.6)/25.6;
            const landmark=modern&&x>74,scale=landmark?3:1,extent=landmark?95:40;
            sun.target.position.set(x,0,z);sun.position.set(x-14*scale,35*scale,z+22*scale);
            if(sun.shadow.camera.right!==extent){Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:landmark?250:100});sun.shadow.camera.updateProjectionMatrix();}
            sun.shadow.normalBias=landmark?.14:.04;sun.shadow.bias=landmark?-.0003:-.0002;
          }
        }
      }
      const adaptationPosition = v12?traveler.position:position;
      const localAdaptation = terrain ? fromTerrainPoint('cliff', adaptationPosition) : adaptationPosition;
      caveLighting?.update(new THREE.Vector3(localAdaptation.x,localAdaptation.y,localAdaptation.z),dt,immediate);
      if(options.mogao&&!v8){
        const sky=environment.scene.children.find(item=>item instanceof THREE.HemisphereLight) as THREE.HemisphereLight|undefined;
        const inside=target.x>110&&target.x<134?THREE.MathUtils.smoothstep(-target.z,68,68+MOGAO_LAYOUT.room.front+5):0;
        if(sky)sky.intensity=THREE.MathUtils.lerp(1.65,1.15,inside);
      }
      if(options.musicInteriorVersion)(musicGuide ?? companion)?.setCameraPosition(position);
      const direction = position.clone().sub(target);
      const distance = direction.length();
      // A wall may shorten the arm to eye distance. Use a clear first-person
      // sightline there, rather than seeing through the avatar's layered meshes.
      if(v8)traveler.visible=distance>(stairCamera?(traveler.visible?1.1:1.35):(traveler.visible?2.35:2.65));
      const ray = new THREE.Ray(target, direction.normalize());
      const hit = new THREE.Vector3();
      for (const canopy of canopies) {
        const intersects = ray.intersectBox(canopy.bounds, hit);
        const obscures = canopy.bounds.containsPoint(position) || !!intersects && target.distanceTo(hit) < distance + .3;
        const desired = obscures ? .12 : 1;
        canopy.opacity = immediate ? desired : THREE.MathUtils.lerp(canopy.opacity, desired, 1 - Math.exp(-dt * 14));
        for (const material of canopy.materials) { material.opacity = canopy.opacity; material.depthWrite = canopy.opacity > .98; }
      }
    },
    animateTraveler(speed, elapsed, reduced) {
      const dt = previousElapsed === null ? 0 : Math.min(.05, Math.max(0, elapsed - previousElapsed));
      previousElapsed = elapsed;
      if (!mixer) return;
      const next: TravelerAction = reduced || speed < .05 ? 'Idle' : speed > 4 ? 'Run' : 'Walk';
      if (next !== actionName) {
        const old = actions.get(actionName)!;
        const action = actions.get(next)!;
        action.reset().play();
        if (reduced) { old.stop(); action.setEffectiveWeight(1); }
        else old.crossFadeTo(action, .18, false);
        actionName = next;
      }
      const rate = next === 'Walk' ? options.animationRates?.walk ?? 1.5 : options.animationRates?.run ?? 1.25;
      const pace = next === 'Walk' ? rate * speed / WALK_SPEED : next === 'Run' ? rate * speed / RUN_SPEED : 1;
      const maxPace = options.animationRates ? rate * 1.8 : 1.8;
      actions.get(next)!.setEffectiveTimeScale(next === 'Idle' ? 1 : THREE.MathUtils.clamp(pace, .35, maxPace));
      mixer.update(reduced ? 0 : dt);
    },
    dispose,
  };
}
