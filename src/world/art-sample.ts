import * as mogaoV8Rules from './mogao-rules-v008';
import {createCaveLighting} from './cave-lighting-v008';
import {caveEntryAdaptationTarget} from './cave-lighting-v012';
import * as mogaoV7Rules from './mogao-rules-v007';
import * as mogaoV6Rules from './mogao-rules-v006';
import * as mogaoV3Rules from './mogao-rules-v003';
import * as mogaoV1Rules from './mogao-rules-v001';
import * as mogaoV2Rules from './mogao-rules-v002';
import { createMusicPavilionV5 } from './music-pavilion-v005';
import { createMusicPavilionV4 } from './music-pavilion-v004';
import { MUSIC_LAYOUT_V4, MUSIC_ROAD_V4 } from './music-pavilion-rules-v004';
import * as THREE from 'three';
import {createTerrainScene} from './terrain-scene-v001';
import {applyTerrainCourtyardExpansion} from './terrain-courtyard-v003';
import {prepareTerrainCourtyardShadows,updateTerrainSunShadow} from './terrain-shadow-v005';
import {TERRAIN_CAISSON_CONFIG,loadCaissonCenterTexture,prepareTerrainCaisson,releaseCaissonTexture} from './terrain-caisson-v001';
import {placeMusicCourtyardTree,relocateMusicCourtyardFurnishings} from './music-courtyard-tree-v001';
import {MUSIC_COURTYARD_TREE} from '../content/world/music-courtyard-tree-v001';
import {placeTerrainTowerTrees} from './terrain-trees-v001';
import {TERRAIN_TOWER_TREES} from '../content/world/terrain-trees-v001';
import {fromTerrainPoint, terrainHeight, toTerrainPoint, TERRAIN_SCENERY_SOURCE_OVERRIDES, type TerrainRegion} from '../content/world/terrain-layout-v001';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { TERRAIN_COURTYARD_MODEL, WORLD_ART_SAMPLE, worldAssetUrl } from '../content/world/assets';
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
export interface ArtSampleSceneOptions {
  /** Explicit isolated-preview override; normal game entry keeps the approved asset. */
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
  musicVersion?: 'v001' | 'v002' | 'v003' | 'v004' | 'v005' | 'v006';
  flyingAwakened?: boolean;
  terrainVersion?: 'v001';
  terrainCaissonVersion?: 'v001';
}
export interface ArtSampleScene extends GrayboxScene {
  music: ReturnType<typeof createMusicPavilion> | ReturnType<typeof createMusicPavilionV2> | null;
  ready: Promise<void>;
  animationName(): TravelerAction;
  animatePresentation(name: 'Greeting' | 'HallLookUp' | 'LookAround', time: number): void;
  inspectInterior?(): unknown;
  buddhaVisibleAtCenter?(camera: THREE.PerspectiveCamera): boolean;
  inspectTraveler(): { visible: boolean; restHeight: number | null; animation: string; time: number; joints: { name: string; position: number[] }[] };
  updateCameraVisibility(target: THREE.Vector3, position: THREE.Vector3, dt: number, immediate: boolean): void;
  updateTerrain?(dt: number, reduced: boolean): void;
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

export function createArtSampleScene(options: ArtSampleSceneOptions = {}): ArtSampleScene {
  const v12=options.mogaoVersion==='v012',v11=v12||options.mogaoVersion==='v011',v10=v11||options.mogaoVersion==='v010',v9=v10||options.mogaoVersion==='v009',v8=v9||options.mogaoVersion==='v008',modern=v8||options.mogaoVersion==='v007';
  const caveLighting=v8?createCaveLighting(v9,v12?caveEntryAdaptationTarget:undefined):null;
  const {MOGAO_LAYOUT,MOGAO_ROAD}=v8?mogaoV8Rules:options.mogaoVersion==='v007'?mogaoV7Rules:options.mogaoVersion==='v006'?mogaoV6Rules:options.mogaoVersion==='v003'?mogaoV3Rules:options.mogaoVersion==='v002'?mogaoV2Rules:mogaoV1Rules;
  const v5=options.musicVersion==='v005'||options.musicVersion==='v006',v4=options.musicVersion==='v004'||v5,v3=options.musicVersion==='v003',v2=options.musicVersion==='v002'||v3||v4;
  const environment = createGrayboxScene({ artSample: true, musicPreview: options.musicPavilion, extendedMusic: v2 });
  if(options.mogao)environment.scene.fog=null;
  if(modern){
    const ground=environment.scene.getObjectByName('world-ground');
    if(ground){ground.position.set(65,-.22,-40);ground.scale.set(520,.4,430);}
  }
  const terrain = options.terrainVersion === 'v001' ? createTerrainScene(environment.scene) : null;
  const caissonEnabled=!!terrain&&options.terrainCaissonVersion==='v001';
  const music = options.musicPavilion ? (v5?createMusicPavilionV5:v4?createMusicPavilionV4:v3?createMusicPavilionV3:v2?createMusicPavilionV2:createMusicPavilion)(environment.scene, !!options.flyingAwakened) : null;
  const regionLayout=v4?MUSIC_LAYOUT_V4:v3?MUSIC_LAYOUT_V3:v2?MUSIC_LAYOUT_V2:MUSIC_LAYOUT;
  const traveler = new THREE.Group(); traveler.name = 'traveler';
  environment.scene.add(traveler);
  let disposed = false;
  let towerTrees:ReturnType<typeof placeTerrainTowerTrees>|null=null;
  let courtyardExpansion:ReturnType<typeof applyTerrainCourtyardExpansion>|null=null;
  let courtyardShadows:ReturnType<typeof prepareTerrainCourtyardShadows>|null=null;
  let caisson:ReturnType<typeof prepareTerrainCaisson>|null=null;
  let pendingCaissonTexture:THREE.Texture|null=null;
  let squareHall: { asset: string; parts: string[] } | null = null;
  let musicTree:ReturnType<typeof placeMusicCourtyardTree>|null=null;
  let musicFurniture:ReturnType<typeof relocateMusicCourtyardFurnishings>|null=null;
  let mixer: THREE.AnimationMixer | null = null;
  let character: THREE.Object3D | null = null;
  let actionName: TravelerAction = 'Idle';
  let restHeight:number|null=null;
  let previousElapsed: number | null = null;
  const models: THREE.Object3D[] = [];
  let buddhaSubject:THREE.Object3D|null=null;
  const buddhaOccluders:THREE.Object3D[]=[];
  const gazeRay=new THREE.Raycaster();
  const treesForCamera: THREE.Object3D[] = [];
  const canopyMaterials = new Set<THREE.Material>();
  const canopies: { bounds: THREE.Box3; materials: THREE.Material[]; opacity: number }[] = [];
  const actions = new Map<TravelerAction, THREE.AnimationAction>();
  const loader = new GLTFLoader();
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true;
    musicFurniture?.dispose();musicFurniture=null;
    music?.dispose();
    clearTimeout(timeout); controller.abort();
    if (mixer && character) { mixer.stopAllAction(); mixer.uncacheRoot(character); }
    actions.clear(); mixer = null; character = null;
    towerTrees?.dispose(); towerTrees=null;
    musicTree?.dispose();musicTree=null;
    if(pendingCaissonTexture){
      // Preparation may fail after assigning the map. Whichever model owns it
      // will release it below; an unattached decoded image has its own owner.
      let attached=false;
      for(const model of models)model.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(Object.values(material).includes(pendingCaissonTexture))attached=true;});
      if(!attached)releaseCaissonTexture(pendingCaissonTexture);pendingCaissonTexture=null;
    }
    for (const model of models) releaseModel(model);
    models.length = 0;
    for (const material of canopyMaterials) material.dispose();
    canopyMaterials.clear(); canopies.length = 0;
    terrain?.dispose();
    environment.dispose();
  }
  async function loadModel(path: string): Promise<GLTF> {
    const url = new URL(worldAssetUrl(path), document.baseURI);
    const response = await fetch(url, { signal: controller.signal });
    // Never include server response text in a player-visible error.
    if (!response.ok) throw new Error('model-request-failed');
    const bytes = await response.arrayBuffer();
    if (disposed || controller.signal.aborted) throw new Error('model-request-cancelled');
    const model = await loader.parseAsync(bytes, new URL('.', url).href);
    // Image decoding may finish after abort. Each result has its own owner check.
    if (disposed || controller.signal.aborted) {
      releaseModel(model.scene);
      throw new Error('model-decode-cancelled');
    }
    models.push(model.scene);
    return model;
  }
  const modelLoading = Promise.all([
    loadModel(terrain ? TERRAIN_COURTYARD_MODEL : WORLD_ART_SAMPLE.courtyard),
    loadModel(options.travelerPath ?? WORLD_ART_SAMPLE.traveler),
    ...(options.sampleNature ? ['tree-a', 'shrub-a', 'dunes'].map(name => loadModel(`environment-sample/v002/${name}.glb`)) : []),
    ...(v8 ? ['mogao/v008/mountain.glb','mogao/v008/interior.glb','mogao-massing/v003/tower.glb','mogao/v007/entry.glb','mogao/v008/buddha.glb'].map(path=>loadModel(v11&&(path.endsWith('/entry.glb')||path.endsWith('/mountain.glb'))?`mogao/v011/${path.split('/').pop()}`:v10&&(path.endsWith('/entry.glb')||path.endsWith('/interior.glb'))?`mogao/v010/${path.split('/').pop()}`:v9?path.replace('mogao/v008/','mogao/v009/'):path)) : options.mogaoVersion==='v007' ? ['mogao-sandstone/v001/mountain.glb','mogao/v003/interior.glb','mogao-massing/v003/tower.glb','mogao/v007/entry.glb'].map(loadModel) : options.mogao ? ['exterior','interior'].map(name=>loadModel(`mogao/${name==='exterior'?(options.mogaoFacadeVersion??options.mogaoSurfaceVersion??options.mogaoVersion??'v001'):(options.mogaoVersion==='v006'?'v003':options.mogaoVersion??'v001')}/${name}.glb`)) : []),
    ...(terrain?TERRAIN_TOWER_TREES.map(tree=>loadModel(tree.assetPath)):[]),
    ...(terrain?[loadModel(MUSIC_COURTYARD_TREE.assetPath)]:[]),
    ...(caissonEnabled?[loadModel(TERRAIN_CAISSON_CONFIG.asset)]:[]),
  ]);
  const centerTextureLoading=caissonEnabled?loadCaissonCenterTexture(new URL(worldAssetUrl(TERRAIN_CAISSON_CONFIG.centerPanel.texture),document.baseURI),controller.signal).then(texture=>{
    if(disposed){releaseCaissonTexture(texture);throw new Error('caisson-image-load-cancelled');}
    pendingCaissonTexture=texture;return texture;
  }):Promise.resolve(null);
  const loading=Promise.all([modelLoading,centerTextureLoading]).then(([loadedModels,texture])=>{
    if(disposed)throw new Error('caisson-model-load-cancelled');
    if(texture){caisson=prepareTerrainCaisson(loadedModels[loadedModels.length-1].scene,texture);pendingCaissonTexture=null;}
    return loadedModels;
  });
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('model-loading-timeout')), 30_000);
  });
  function groundNature(region: TerrainRegion, object: THREE.Object3D) {
    if (!terrain) return;
    const point = toTerrainPoint(region, object.position);
    object.position.y += terrainHeight(point.x, point.z) - point.y;
    terrain.attachRegionObject(region, object);
  }
  // Fail promptly if either model fails; release/abort its sibling immediately.
  const ready = Promise.all([Promise.race([loading, deadline]), music?.ready]).then(([[courtyard, avatar, tree, shrub, dunes, exterior, interior, tower, entry, buddha, ...towerTreeModels]]) => {
    if (disposed) return;
    const required: TravelerAction[] = ['Idle', 'Walk', 'Run'];
    if (options.presentationClips) required.push('Greeting', 'HallLookUp');
    if (v5) required.push('LookAround');
    if (required.some(name => !avatar.animations.some(clip => clip.name === name))) {
      throw new Error('model-animation-incomplete');
    }
    for (const model of [courtyard, avatar]) {
      model.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true; object.receiveShadow = true;
      });
    }
    courtyard.scene.position.set(-12, 0, 2);
    if(terrain)courtyardExpansion=applyTerrainCourtyardExpansion(courtyard.scene);
    if(terrain)courtyardShadows=prepareTerrainCourtyardShadows(courtyard.scene);
    if (terrain) {
      const parts = new Set<string>();
      courtyard.scene.traverse(object => {
        const id = String(object.userData.semanticGroup ?? object.name);
        // The user will redesign the ceiling later. Preserve the source asset,
        // but hide its low suspended caisson in this open-height hall preview.
        if (id.startsWith('caisson-')) object.visible = false;
        if (id.startsWith('hall-v003-')) parts.add(id);
      });
      squareHall = { asset: TERRAIN_COURTYARD_MODEL, parts: [...parts] };
    }
    environment.scene.add(courtyard.scene);
    if (options.sampleNature) {
      environment.scene.traverse(object => {
        const name = String(object.userData.semanticGroup ?? object.name);
        if (/^(tree-|shrub-|road-grass|dune-|cliff-|boundary-)/.test(name)) object.visible = false;
      });
      for (const model of [tree, shrub, dunes]) {
        model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        environment.scene.add(model.scene);
      }
      if(v2)treesForCamera.push(tree.scene);
      tree.scene.position.set(v2?3:4.8, 0, v2?5:13); shrub.scene.position.set(-2.9, 0, 16.2);
      groundNature('courtyard', tree.scene);
      if(terrain)terrain.placeOutdoorShrub(shrub.scene,'courtyard');else groundNature('courtyard', shrub.scene);
      dunes.scene.position.set(options.mogao?215:v2?105:55, 0, options.mogao?24:v2?0:12); dunes.scene.rotation.y = -Math.PI / 2;
      if (terrain) dunes.scene.visible = false;
      else {const paving = createPreviewPaving(); models.push(paving); environment.scene.add(paving);}
      if (options.musicPavilion) {
        // Geometry and materials stay shared with the approved A assets. The
        // source model remains their one resource owner, clones are scene-only.
        for (const [index,[x,z,scale]] of [...regionLayout.trees,...(options.mogao?MOGAO_LAYOUT.routeTrees:[])].entries()) {
          const region=index<regionLayout.trees.length?'music':'cliff';
          const id=region==='music'?`music-tree-${index}`:`mogao-v8-tree-${index-regionLayout.trees.length}`;
          const placed=terrain?TERRAIN_SCENERY_SOURCE_OVERRIDES[region]?.[id]:undefined;
          const instance=tree.scene.clone(true);instance.name=id;instance.position.set(placed?.x??x,0,placed?.z??z);instance.scale.setScalar(scale);environment.scene.add(instance);if(v2)treesForCamera.push(instance);
          groundNature(region, instance);
        }
        for (const [index,[x,z,scale]] of [...regionLayout.shrubs,...(options.mogao?MOGAO_LAYOUT.routeShrubs:[])].entries()) {
          const region=index<regionLayout.shrubs.length?'music':'cliff';
          const instance=shrub.scene.clone(true);instance.name=`${region}-outdoor-shrub-${index}`;instance.position.set(x,0,z);instance.scale.setScalar(scale);environment.scene.add(instance);
          if(terrain)terrain.placeOutdoorShrub(instance,region);else groundNature(region, instance);
        }
        const northDunes=dunes.scene.clone(true);northDunes.position.set(v2?20:0,0,-65);northDunes.rotation.y=0;environment.scene.add(northDunes);
        if (terrain) northDunes.visible = false;
        else {const branch=createPreviewPaving((v4?MUSIC_ROAD_V4:v2?MUSIC_ROAD_V2:MUSIC_ROAD).filter(section=>section.center.z> (v4?2.8:v2?-8.55:-2.55)),true);models.push(branch);environment.scene.add(branch);}
      }
      terrain?.addNatureTemplates(tree.scene, shrub.scene);
    }
    if(options.mogao&&!terrain){const road=createPreviewPaving(MOGAO_ROAD,true);models.push(road);environment.scene.add(road);}
    if(options.mogao){
      if(v10){buddhaSubject=buddha.scene;buddhaOccluders.push(interior.scene,entry.scene);}
      for(const model of (v8?[exterior,interior,tower,entry,buddha]:modern?[exterior,interior,tower,entry]:[exterior,interior])){
        model.scene.position.set(...MOGAO_LAYOUT.origin as [number,number,number]);
        if(modern&&model!==interior&&model!==buddha)model.scene.position.y=0;
        model.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;
          if(modern&&model===exterior)for(const material of (Array.isArray(object.material)?object.material:[object.material])){
            if(material instanceof THREE.MeshStandardMaterial)for(const map of [material.map,material.normalMap,material.roughnessMap,material.aoMap])if(map)map.anisotropy=8;
          }
        }});
        environment.scene.add(model.scene);
        terrain?.attachRegionObject('cliff', model.scene);
        if(v8&&(model===interior||model===buddha))caveLighting?.addCave(model.scene);
      }
    }
    if (terrain) {
      towerTrees=placeTerrainTowerTrees(towerTreeModels.slice(0,2).map(model=>model.scene));
      environment.scene.add(towerTrees.root);
      for(const tree of towerTrees.trees){
        const materials=[...new Set(tree.meshes.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]))];
        for(const material of materials)material.transparent=true;
        canopies.push({bounds:tree.worldBounds.clone().expandByScalar(.2),materials,opacity:1});
      }
      musicTree=placeMusicCourtyardTree(towerTreeModels[2].scene);environment.scene.add(musicTree.root);
      const musicTreeMaterials=[...new Set(musicTree.meshes.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]))];
      for(const material of musicTreeMaterials)material.transparent=true;
      // The hollow space below this tall crown includes most of the yard.
      // Only a camera entering the crown fades it; the measured trunk has its
      // own hard camera proxy, so a normal courtyard view keeps the tree opaque.
      const musicCrownBounds=musicTree.worldBounds.clone().expandByScalar(.2);
      musicCrownBounds.min.y=musicTree.root.position.y+MUSIC_COURTYARD_TREE.trunkBounds.max[1];
      canopies.push({bounds:musicCrownBounds,materials:musicTreeMaterials,opacity:1});
      terrain.groundCourtyardAttachments(courtyard.scene);
      terrain.attachRegionObject('courtyard', courtyard.scene);
      if(caissonEnabled)terrain.attachRegionObject('courtyard',towerTreeModels[towerTreeModels.length-1].scene);
      const musicRoot = environment.scene.children.find(object => object.name.startsWith('music-pavilion-'));
      if (musicRoot) {
        const pavilionModel=musicRoot.children.find(child=>{let found=false;child.traverse(object=>{if(object.userData.semanticGroup==='high-drapery')found=true;});return found;});
        if(!pavilionModel)throw new Error('music-furnishing-model-missing');
        musicFurniture=relocateMusicCourtyardFurnishings(pavilionModel);
        musicRoot.traverse(object => {if (object.name === 'accepted-central-dune') object.visible = false;});
        terrain.attachRegionObject('music', musicRoot);
      }
    }
    courtyard.scene.updateMatrixWorld(true);
    courtyard.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || (object.userData.cameraRole !== 'canopy' && !object.name.includes('-canopy'))) return;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const materials = originals.map(material => {
        canopyMaterials.add(material);
        const copy = material.clone(); copy.transparent = true;
        return copy;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      canopies.push({ bounds: new THREE.Box3().setFromObject(object, true).expandByScalar(.2), materials, opacity: 1 });
    });
    for(const treeRoot of treesForCamera){
      treeRoot.updateMatrixWorld(true);
      const bounds=new THREE.Box3(),copies=new Map<THREE.Material,THREE.Material>();
      treeRoot.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||!object.name.includes('-canopy-'))return;
        bounds.union(new THREE.Box3().setFromObject(object,true));
        const original=Array.isArray(object.material)?object.material:[object.material];
        const mapped=original.map(material=>{
          if(!copies.has(material)){const copy=material.clone();copy.transparent=true;copies.set(material,copy);
            canopyMaterials.add(material);if(treeRoot!==tree.scene)canopyMaterials.add(copy);}
          return copies.get(material)!;
        });
        object.material=Array.isArray(object.material)?mapped:mapped[0];
      });
      if(!bounds.isEmpty())canopies.push({bounds:bounds.expandByScalar(.2),materials:[...copies.values()],opacity:1});
    }
    character = avatar.scene; traveler.add(character);
    mixer = new THREE.AnimationMixer(character);
    for (const name of required) actions.set(name, mixer.clipAction(avatar.animations.find(clip => clip.name === name)!));
    actions.get('Idle')!.play();
    mixer.update(0);
    if(modern){
      // Measure in model space: runtime may already have placed its parent on a high platform.
      const placedAt=traveler.position.clone();traveler.position.set(0,0,0);traveler.updateMatrixWorld(true);
      character.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(character,true),scale=1.8/(bounds.max.y-bounds.min.y);
      character.scale.multiplyScalar(scale);character.position.y-=bounds.min.y*scale;
      character.updateMatrixWorld(true);restHeight=new THREE.Box3().setFromObject(character,true).getSize(new THREE.Vector3()).y;
      traveler.position.copy(placedAt);traveler.updateMatrixWorld(true);
    }
    caveLighting?.addTraveler(avatar.scene);
    clearTimeout(timeout);
  }).catch(() => {
    dispose();
    throw new Error('美术模型加载失败。请重新加载，或直接选择文化主题。');
  });
  return {
    scene: environment.scene, traveler, ready, music,
    animationName: () => actionName,
    animatePresentation(name, time) {
      if (!mixer) return;
      const action = actions.get(name);
      if (!action) throw new Error('Required character presentation clip is missing');
      if (actionName !== name) { mixer.stopAllAction(); action.reset().setLoop(THREE.LoopOnce, 1).play(); action.clampWhenFinished = true; actionName = name; }
      action.setEffectiveWeight(1); action.setEffectiveTimeScale(0); action.time = Math.min(time, action.getClip().duration); mixer.update(0);
    },
    inspectInterior:()=>caveLighting?.inspect(),
    updateTerrain:(dt,reduced)=>terrain?.update(dt,reduced),
    inspectTerrain:()=>terrain?{...terrain.inspect(),towerTrees:towerTrees?.inspect(),courtyardExpansion,courtyardShadows,caisson,squareHall,musicTree:musicTree?.inspect(),musicFurniture:musicFurniture?.inspect()}:undefined,
    buddhaVisibleAtCenter(camera){
      if(!buddhaSubject)return false;
      // Sample only while the inexpensive projected-landmark test qualifies.
      // A tunnel roof, wall or lintel in front must never count as viewing the statue.
      gazeRay.setFromCamera(new THREE.Vector2(0,0),camera);
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
    updateCameraVisibility(target, position, dt, immediate) {
      if(v2){
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
      const direction = position.clone().sub(target);
      const distance = direction.length();
      // A wall may shorten the arm to eye distance. Use a clear first-person
      // sightline there, rather than seeing through the avatar's layered meshes.
      if(v8)traveler.visible=distance>(traveler.visible?2.35:2.65);
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
