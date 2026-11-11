import { createMuralMist } from './mural-mist';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { worldAssetUrl } from '../content/world/assets';
import balcony from '../content/world/music-balcony-ensemble-v001.json';
import compactPlacement from '../content/world/music-balcony-ensemble-v002.json';
import { MUSIC_LAYOUT_V4 as MUSIC_LAYOUT, MUSIC_SOLIDS_V4 as MUSIC_SOLIDS } from './music-pavilion-rules-v004';
import { FLYING_DURATION, flyingColor } from './music-pavilion-rules';
import { CAMERA_CLEARANCE, COURTYARD_CAMERA_BOXES, type CameraSpace } from './camera';
import type { WorldPoint } from './types';
import type { FlyingHistoryLabel } from './flying-history';

export function musicCameraSpaceV4(): CameraSpace {
  return {
    subjectHeight:.65,
    shelters: MUSIC_LAYOUT.shelters as [number,number,number,number][],
    landmarkFraming: { bounds: MUSIC_LAYOUT.framing as [number,number,number,number], targetLift: 1.7 },
    boxes: [
      ...MUSIC_SOLIDS.filter(item=>!item.circle&&!item.polygon).map(item=>new THREE.Box3(new THREE.Vector3(item.minX,-.2,item.minZ),new THREE.Vector3(item.maxX,item.height,item.maxZ))),
      ...[...COURTYARD_CAMERA_BOXES,...MUSIC_LAYOUT.cameraBoxes,...MUSIC_LAYOUT.dune.cameraBoxes].map(item=>new THREE.Box3(new THREE.Vector3(...item.min as [number,number,number]),new THREE.Vector3(...item.max as [number,number,number]))),
    ].map(box=>box.expandByScalar(CAMERA_CLEARANCE)),
    cylinders:MUSIC_SOLIDS.flatMap(item=>item.circle?[{...item.circle,id:item.id??'music-prop',minY:-.2,maxY:item.height}]:[]),
  };
}
export function flyingCameraPoseV4(aspect:number) {
  // Reserve the lower part of the real 3D view for controls; never crop the art.
  const distance=Math.max(21.8,15.5/(2*Math.tan(THREE.MathUtils.degToRad(49/2))*aspect));
  const [x,y,z]=MUSIC_LAYOUT.mural.center;
  return {position:new THREE.Vector3(x,y+2.4,z+distance),target:new THREE.Vector3(x,y-.55,z)};
}

type MusicDetail = 'balcony' | 'flying';
type DetailStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** From the courtyard approach the open pavilion can already be seen.  Prepare
 * only its lightweight interior finishes here, not the instrument models or
 * the large stair murals, which retain their own closer approach boundaries. */
export function musicHallFinishApproach(position: WorldPoint, surfaceId?: string | null) {
  if (surfaceId === 'music-stair' || surfaceId === 'music-floor-2' || surfaceId === 'music-gallery') return true;
  const { x, z } = position;
  return x >= 14 && x <= 80 && z >= -38 && z <= 30;
}

export function musicPreviewDetailApproaches(position: WorldPoint, surfaceId?: string | null) {
  const { x, z } = position;
  const upperRoute = surfaceId === 'music-stair' || surfaceId === 'music-floor-2';
  const mural = MUSIC_LAYOUT.mural;
  const insideHall = x >= 32 && x <= 63 && z >= -33.1 && z <= -20.8;
  const inFrontOfBalcony = x >= 29 && x <= 55 && z >= -17.5 && z <= -5;
  return {
    balcony: upperRoute || insideHall || inFrontOfBalcony,
    flying: Math.abs(x - mural.center[0]) <= mural.width / 2 + 12 && z >= mural.center[2] - .3 && z <= 12,
    interiorMural: upperRoute || insideHall,
  };
}

export function applyCompactMusicBalcony(ensemble: THREE.Object3D) {
  for (const { id, anchor } of balcony.players) {
    const next = compactPlacement.players.find(player => player.id === id)!;
    const player = ensemble.getObjectByName(`ensemble-${id}`)!;
    // The GLB node origin includes the imported model's anchor offset.
    // Move the entire musician, instrument and furniture by the same delta.
    player.position.x += next.anchor[0] - anchor[0];
    player.position.z += next.anchor[2] - anchor[2];
  }
  const mat = ensemble.getObjectByName('ensemble-woven-mat');
  if (!mat) throw new Error('music-balcony-mat-missing');
  const old = balcony.mat, next = compactPlacement.mat;
  const fitAxis = (axis: 'x' | 'z', index: 0 | 2) => {
    const scale = (next.max[index] - next.min[index]) / (old.max[index] - old.min[index]);
    mat.scale[axis] *= scale;
    mat.position[axis] = next.min[index] + (mat.position[axis] - old.min[index]) * scale;
  };
  fitAxis('x', 0);
  fitAxis('z', 2);
}

function stabilizeCourtyardTrimDepth(pavilion: THREE.Object3D) {
  // The long rear courtyard cap is behind the indoor wall. At grazing angles,
  // MSAA can shade a partly covered pixel whose center is outside a cap triangle.
  // Evaluate its logarithmic depth inside the covered area to avoid drawing through.
  const centroidDepth = (chunk: string) => chunk.replace('varying float vFragDepth;', 'centroid varying float vFragDepth;');
  const vertex = centroidDepth(THREE.ShaderChunk.logdepthbuf_pars_vertex);
  const fragment = centroidDepth(THREE.ShaderChunk.logdepthbuf_pars_fragment);
  pavilion.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.userData.semanticGroup !== 'courtyard-enclosure') return;
    const original = object.material;
    if (!(original instanceof THREE.MeshStandardMaterial) || !['stone-light', 'teal', 'plaster'].includes(original.name)) return;
    const material = original.clone();
    const before = original.onBeforeCompile;
    const originalKey = original.customProgramCacheKey();
    material.customProgramCacheKey = () => `${originalKey}:music-courtyard-centroid-depth`;
    material.onBeforeCompile = function (shader, renderer) {
      before.call(this, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace('#include <logdepthbuf_pars_vertex>', vertex);
      shader.fragmentShader = shader.fragmentShader.replace('#include <logdepthbuf_pars_fragment>', fragment);
    };
    object.material = material;
  });
}

/** The building owns navigation visuals. Detail requests can run after it is ready. */
export function createMusicPavilionV5(scene:THREE.Scene, initiallyAwakened:boolean, buildingPath?:string, balconyVariant?: keyof typeof balcony.floor, deferDetails = false, compactBalcony = false, colorArtworkPath?: string, colorVideoPath?: string) {
  let disposed=false, active=false, time=0, awakened=initiallyAwakened, reduced=false;
  const controller=new AbortController();
  const root=new THREE.Group();root.name='music-pavilion-v005';scene.add(root);
  const mist=createMuralMist(MUSIC_LAYOUT.mural.center,MUSIC_LAYOUT.mural.width,MUSIC_LAYOUT.mural.height);root.add(mist.mesh);
  const textures: THREE.Texture[] = [];
  const detailStatus: Record<MusicDetail, DetailStatus> = { balcony: balconyVariant ? 'idle' : 'ready', flying: 'idle' };
  const detailControllers = new Map<MusicDetail, AbortController>();
  const detailTasks = new Map<MusicDetail, Promise<boolean>>();
  let balconyEnsemble: { players: string[]; replacedLegacyMeshes: number; placement?: typeof compactPlacement.version } | undefined;
  const uniforms={uOriginal:{value:null as THREE.Texture|null},uRibbonMasks:{value:null as THREE.Texture|null},uTime:{value:0},uColor:{value:0},uMovement:{value:0}};
  let colorPoster: THREE.Texture | null = null;
  const colorArtwork = { value: null as THREE.Texture | null };
  const artworkIsVideo = { value: 0 };
  let colorVideo: THREE.VideoTexture | null = null;
  let videoWanted = false, flyingBlocked = true;
  let originalMural: THREE.Mesh | null = null;
  let historyMural: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  let historyLabels: readonly FlyingHistoryLabel[] = [];
  const historyReveal = { value: 1 };
  const historyPlaster = { value: new THREE.Color(0xe6d8c0) };
  const historyGlows: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  let litLabels = '';

  function setHistoryHighlight(caves: readonly string[]) {
    const key = caves.join(',');
    if (key === litLabels) return;
    litLabels = key;
    const { center, width, height } = MUSIC_LAYOUT.mural;
    const labels = historyLabels.filter(label => caves.includes(label.cave));
    historyGlows.forEach((glow, i) => {
      const label = labels[i];
      glow.visible = !!label && !!historyMural?.visible;
      if (!label) return;
      glow.scale.set(label.w * width, label.h * height, 1);
      glow.position.set(center[0] + (label.x + label.w / 2 - .5) * width,
        center[1] + (.5 - label.y - label.h / 2) * height, center[2] + .045);
    });
  }

  function setHistoryArtwork(texture: THREE.Texture | null, labels: readonly FlyingHistoryLabel[] = []) {
    if (!texture) {
      setHistoryHighlight([]);
      historyLabels = [];
      if (historyMural) {
        historyMural.visible = false;
        historyMural.material.map = null;
      }
      if (originalMural) originalMural.visible = true;
      return;
    }
    if (!historyMural) {
      const { center, width, height } = MUSIC_LAYOUT.mural;
      const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      material.onBeforeCompile = shader => {
        shader.uniforms.historyReveal = historyReveal;
        shader.uniforms.historyPlaster = historyPlaster;
        shader.fragmentShader = 'uniform float historyReveal; uniform vec3 historyPlaster;\n' + shader.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(historyPlaster, diffuseColor.rgb, historyReveal);');
      };
      historyMural = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      historyMural.name = 'flying-history-wall';
      historyMural.position.set(center[0], center[1], center[2] + .025);
      root.add(historyMural);
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xe2a951, transparent: true, opacity: .32,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glowGeometry = new THREE.PlaneGeometry(1, 1);
      for (let i = 0; i < 3; i++) {
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.name = 'flying-history-label-glow';
        glow.visible = false;
        historyGlows.push(glow);
        root.add(glow);
      }
    }
    setHistoryHighlight([]);
    historyLabels = labels;
    historyMural.material.map = texture;
    historyMural.visible = true;
    if (originalMural) originalMural.visible = false;
    releaseColorVideo();
  }

  function prepareColorVideo() {
    if (!colorVideoPath || colorVideo) return;
    const media = document.createElement('video');
    media.muted = true;
    media.defaultMuted = true;
    media.playsInline = true;
    media.loop = true;
    media.preload = 'auto';
    media.src = worldAssetUrl(colorVideoPath);
    colorVideo = new THREE.VideoTexture(media);
    colorVideo.colorSpace = THREE.SRGBColorSpace;
  }

  function showColorVideo() {
    if (!colorVideo) return;
    const media = colorVideo.image;
    const play = active && !flyingBlocked && uniforms.uColor.value === 1;
    if (play !== videoWanted) {
      videoWanted = play;
      if (play) void media.play().catch(() => { /* Keep the poster if playback is unavailable. */ });
      else media.pause();
    }
    const hasFrame = active && uniforms.uColor.value === 1 &&
      media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !media.error && (!media.paused || media.currentTime > 0);
    artworkIsVideo.value = Number(hasFrame);
    colorArtwork.value = hasFrame ? colorVideo : colorPoster;
  }

  function releaseColorVideo() {
    if (!colorVideo) return;
    const media = colorVideo.image;
    media.pause();
    media.removeAttribute('src');
    media.load();
    colorVideo.dispose();
    colorVideo = null;
    videoWanted = false;
    colorArtwork.value = colorPoster;
    artworkIsVideo.value = 0;
  }
  const url=(name:string)=>new URL(worldAssetUrl(name==='music-pavilion.glb' && buildingPath ? buildingPath : `music-pavilion/${name==='music-pavilion.glb'?'v005':'v002'}/${name}`),document.baseURI);
  async function request(source: URL, signal: AbortSignal) {
    const response = await fetch(source, { signal });
    if (!response.ok) throw new Error('music-asset-request-failed');
    return response;
  }
  async function texture(source: URL, color: boolean, signal: AbortSignal, owned: THREE.Texture[]) {
    const blob = await (await request(source, signal)).blob();
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    if (disposed || signal.aborted) {
      bitmap.close();
      throw new Error('music-load-cancelled');
    }
    const result = new THREE.Texture(bitmap);
    result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    result.needsUpdate = true;
    result.anisotropy = 4;
    owned.push(result);
    return result;
  }
  function releaseTextures(owned: THREE.Texture[]) {
    for (const texture of owned) {
      texture.dispose();
      (texture.source.data as ImageBitmap).close();
    }
    owned.length = 0;
  }
  function releaseObject(object:THREE.Object3D){
    const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),maps=new Set<THREE.Texture>();
    object.traverse(child=>{if(child instanceof THREE.Mesh){geometry.add(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)maps.add(value);}}});
    geometry.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());maps.forEach(item=>{if(textures.includes(item))return;if(item.source.data instanceof ImageBitmap)item.source.data.close();item.dispose();});object.removeFromParent();
  }
  let terrain:THREE.Object3D|null=null;
  async function loadModel(source: URL, visible = true, signal = controller.signal) {
    const data=await (await request(source, signal)).arrayBuffer();
    if(disposed || signal.aborted)throw new Error('music-load-cancelled');
    const gltf=await new GLTFLoader().parseAsync(data,new URL('.',source).href);
    if(disposed || signal.aborted){releaseObject(gltf.scene);throw new Error('music-load-cancelled');}
    gltf.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});
    gltf.scene.visible = visible;
    root.add(gltf.scene);
    return gltf.scene;
  }
  async function model(name='music-pavilion.glb'){
    const modelRoot=await loadModel(url(name));
    if(name==='route-dune.glb'){
      modelRoot.position.set(...MUSIC_LAYOUT.dune.position as [number,number,number]);
      modelRoot.scale.set(...MUSIC_LAYOUT.dune.scale as [number,number,number]);terrain=modelRoot;
    }else modelRoot.position.set(...MUSIC_LAYOUT.origin as [number,number,number]);
    return modelRoot;
  }
  const pavilionReady = model().then(pavilion => {
    if (!balconyVariant) return 0;
    if (balconyVariant === 'interior' && compactBalcony) stabilizeCourtyardTrimDepth(pavilion);
    const legacy: THREE.Mesh[] = [];
    pavilion.traverse(node => {
      if (node instanceof THREE.Mesh && node.userData.semanticGroup === 'gallery-musicians') legacy.push(node);
    });
    if (legacy.length !== 9) throw new Error('music-balcony-legacy-mesh-count');
    for (const mesh of legacy) {
      mesh.visible = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
    }
    return legacy.length;
  });

  async function prepareBalcony(signal: AbortSignal) {
    if (!balconyVariant) return;
    const [replacedLegacyMeshes, ensemble] = await Promise.all([
      pavilionReady,
      loadModel(new URL(worldAssetUrl(compactBalcony ? compactPlacement.asset : balcony.asset), document.baseURI), false, signal),
    ]);
    try {
      const players = balcony.players.map(({ id }) => {
        const musician = ensemble.getObjectByName(`ensemble-${id}`);
        let meshPresent = false;
        musician?.traverse(node => {
          if (node instanceof THREE.Mesh && node.geometry.getAttribute('position')?.count > 0) meshPresent = true;
        });
        if (!meshPresent) throw new Error(`music-balcony-performer-missing: ${id}`);
        return id;
      });
      if (disposed || signal.aborted) throw new Error('music-load-cancelled');
      if (compactBalcony) applyCompactMusicBalcony(ensemble);
      ensemble.name = 'music-balcony-ensemble';
      // The ensemble already contains pavilion-source X/Z and floor-relative Y.
      ensemble.position.y = balcony.floor[balconyVariant];
      balconyEnsemble = { players, replacedLegacyMeshes, ...(compactBalcony ? { placement: compactPlacement.version } : {}) };
      ensemble.visible = true;
    } catch (error) {
      releaseObject(ensemble);
      throw error;
    }
  }
  function installMural(original: THREE.Texture, underlay: THREE.Texture, masks: THREE.Texture, poster: THREE.Texture | null) {
    uniforms.uOriginal.value=original;uniforms.uRibbonMasks.value=masks;
    colorArtwork.value = colorPoster = poster;
    const material=new THREE.MeshStandardMaterial({map:underlay,roughness:1,metalness:0});
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.fragmentShader='uniform sampler2D uOriginal;\nuniform sampler2D uRibbonMasks;\nuniform float uTime;\nuniform float uColor;\nuniform float uMovement;\n'+shader.fragmentShader;
      if (poster) {
        shader.uniforms.uColorArtwork = colorArtwork;
        shader.uniforms.uArtworkIsVideo = artworkIsVideo;
        shader.fragmentShader = 'uniform sampler2D uColorArtwork;\nuniform float uArtworkIsVideo;\n' + shader.fragmentShader;
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        vec2 uv = vMapUv;
        vec4 fixedArt = texture2D(uOriginal, uv);
        float freeEnd = 1.0 - smoothstep(140.0/1448.0, 275.0/1448.0, uv.x);
        vec2 upperUv = uv - vec2(3.0*sin(uTime*1.55),20.0*sin(uTime*1.55+uv.x*4.0))*freeEnd*uMovement/vec2(1448.0,1086.0);
        vec2 lowerUv = uv - vec2(2.5*sin(uTime*1.31),17.0*sin(uTime*1.31+uv.x*5.0+.65))*freeEnd*uMovement/vec2(1448.0,1086.0);
        vec2 patchOrigin = vec2(48.0/1448.0,1.0-520.0/1086.0);
        vec2 patchSize = vec2(272.0/1448.0,460.0/1086.0);
        vec2 patchUv = (uv-patchOrigin)/patchSize;
        float inPatch = step(0.0,patchUv.x)*step(patchUv.x,1.0)*step(0.0,patchUv.y)*step(patchUv.y,1.0);
        vec4 localArt = mix(fixedArt,texture2D(map,patchUv),inPatch);
        localArt = mix(localArt,texture2D(uOriginal,upperUv),texture2D(uRibbonMasks,(upperUv-patchOrigin)/patchSize).r*inPatch);
        localArt = mix(localArt,texture2D(uOriginal,lowerUv),texture2D(uRibbonMasks,(lowerUv-patchOrigin)/patchSize).g*inPatch);
        vec4 art = mix(fixedArt,localArt,uMovement);
        float luminance = dot(art.rgb,vec3(.2126,.7152,.0722));
        vec3 muted = vec3(luminance)*vec3(1.04,1.0,.91);
        vec3 colorArt = ${poster ? 'texture2D(uColorArtwork, uv).rgb' : 'art.rgb'};
        ${poster && colorVideoPath ? 'if (uArtworkIsVideo > 0.5) colorArt = sRGBTransferEOTF(vec4(colorArt, 1.0)).rgb;' : ''}
        diffuseColor *= vec4(mix(muted,colorArt,uColor),art.a);
      `);
      if (poster) {
        // Add soft reflected light to the supplied color art while keeping the wall's shading.
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += colorArt * (0.12 * uColor);
        `);
      }
    };
    material.customProgramCacheKey=()=> colorVideoPath ? 'dunhuang-flying-color-loop-v008' :
      poster ? 'dunhuang-flying-outward-color-v007-fill' : 'dunhuang-flying-local-ribbons-v005';
    const mural=new THREE.Mesh(new THREE.PlaneGeometry(MUSIC_LAYOUT.mural.width,MUSIC_LAYOUT.mural.height),material);
    mural.name='flying-original-art';mural.position.set(...MUSIC_LAYOUT.mural.center as [number,number,number]);mural.receiveShadow=true;root.add(mural);
    originalMural = mural;
  }
  async function prepareFlying(load: AbortController) {
    const owned: THREE.Texture[] = [];
    try {
      const [original, underlay, masks, colorArtwork] = await Promise.all([
        texture(url('mural-original.png'), true, load.signal, owned),
        texture(url('mural-underlay-crop.png'), true, load.signal, owned),
        texture(url('ribbon-masks-crop.png'), false, load.signal, owned),
        colorArtworkPath ? texture(new URL(worldAssetUrl(colorArtworkPath), document.baseURI), true, load.signal, owned) : null,
      ]);
      if (disposed || load.signal.aborted) throw new Error('music-load-cancelled');
      installMural(original, underlay, masks, colorArtwork);
      textures.push(...owned);
    } catch (error) {
      load.abort();
      releaseTextures(owned);
      throw error;
    }
  }
  function loadDetail(detail: MusicDetail, retry = false): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (detailStatus[detail] === 'ready') return Promise.resolve(true);
    const pending = detailTasks.get(detail);
    if (pending) return pending;
    if (detailStatus[detail] === 'failed' && !retry) return Promise.resolve(false);
    const load = new AbortController();
    detailStatus[detail] = 'loading';
    detailControllers.set(detail, load);
    const deadline = setTimeout(() => load.abort(), 45_000);
    const task = (detail === 'balcony' ? prepareBalcony(load.signal) : prepareFlying(load)).then(() => {
      if (disposed) return false;
      if (load.signal.aborted) {
        detailStatus[detail] = 'failed';
        return false;
      }
      detailStatus[detail] = 'ready';
      return true;
    }).catch(() => {
      load.abort();
      if (!disposed) detailStatus[detail] = 'failed';
      return false;
    }).finally(() => {
      clearTimeout(deadline);
      detailControllers.delete(detail);
      detailTasks.delete(detail);
    });
    detailTasks.set(detail, task);
    return task;
  }

  let timeout: ReturnType<typeof setTimeout>;
  const detailsAtStart = deferDetails ? [] : [loadDetail('balcony'), loadDetail('flying')];
  const ready = Promise.race([
    Promise.all([pavilionReady, model('route-dune.glb'), Promise.all(detailsAtStart)]).then(([, , details]) => {
      if (details.some(result => !result)) throw new Error('music-detail-load-failed');
    }),
    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('music-loading-timeout')), 30_000); }),
  ]).then(() => { clearTimeout(timeout); }).catch(error => { dispose(); throw error; });
  function update(dt:number,isReduced:boolean){
    reduced=isReduced;
    if(active){time+=dt;if(reduced)time=Math.max(time,FLYING_DURATION);if(time>=FLYING_DURATION)awakened=true;}
    mist.update(time,FLYING_DURATION,active,reduced);
    uniforms.uColor.value=active?flyingColor(time,reduced):0;
    uniforms.uTime.value=time;
    uniforms.uMovement.value=active&&!reduced?THREE.MathUtils.smoothstep(time,.45,1.4):0;
    showColorVideo();
  }
  function dispose(){
    if(disposed)return;disposed=true;clearTimeout(timeout);controller.abort();
    for (const pending of detailControllers.values()) pending.abort();
    releaseColorVideo();
    releaseObject(root); releaseTextures(textures); root.clear();
  }
  return {ready,dispose,update,loadDetail,
    setHistoryArtwork, setHistoryHighlight,
    setHistoryReveal(amount: number) { historyReveal.value = amount; },
    detailStatus: (detail: MusicDetail) => detailStatus[detail],
    enter(){active=true;time=0;prepareColorVideo();update(0,reduced);},
    exit(){active=false;time=0;releaseColorVideo();update(0,reduced);},
    replay(){
      active=true;time=0;
      const media = colorVideo?.image;
      if (media?.error) { releaseColorVideo(); prepareColorVideo(); }
      else if (media?.readyState) media.currentTime = 0;
      update(0,reduced);
    },
    setFlyingBlocked(blocked: boolean) { flyingBlocked = blocked; showColorVideo(); },
    inspect:()=>{
      const media = colorVideo?.image;
      const video = colorVideoPath ? { showing: artworkIsVideo.value === 1,
        playing: !!media && !media.paused && !media.ended && !media.error, time: media?.currentTime ?? 0,
        duration: Number.isFinite(media?.duration) ? media!.duration : null, loop: media?.loop ?? false,
        readyState: media?.readyState ?? 0, failed: !!media?.error } : undefined;
      return {time,color:uniforms.uColor.value,complete:active&&time>=FLYING_DURATION,awakened,active,reduced,mist:mist.inspect(),movement:uniforms.uMovement.value*(colorArtworkPath ? 1-uniforms.uColor.value : 1),balconyEnsemble,details:{...detailStatus},video};
    },
    auditSight(camera:THREE.PerspectiveCamera){
      root.updateMatrixWorld(true);
      const samples=[[24,4.7,3],[46,4.7,3],[70,4.7,3],[34.4,14.2,-18],[46,14.2,-18],[57.6,14.2,-18],[46,16.8,-23],[34.4,16,-23],[57.6,16,-23]];
      return samples.map(point=>{
        const target=new THREE.Vector3(...point as [number,number,number]);
        const projected=target.clone().project(camera),distance=camera.position.distanceTo(target);
        const ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize(),0,distance-.3);
        const blocked=!!terrain&&ray.intersectObject(terrain,true).length>0;
        return {point,inFrame:Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1,blocked};
      });
    },
  };
}
