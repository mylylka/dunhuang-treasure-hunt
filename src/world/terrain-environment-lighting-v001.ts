import * as THREE from 'three';
import {TERRAIN_BOUNDS,TERRAIN_REGIONS} from '../content/world/terrain-layout-v001';
import {updateTerrainSunShadow} from './terrain-shadow-v005';

/** North is -Z; azimuth is clockwise from north. Elevation stays 30°. */
export const ENVIRONMENT_SUN_AZIMUTH_DEGREES = 250;
export const ENVIRONMENT_SUN_ELEVATION_DEGREES = 30;
const azimuth=THREE.MathUtils.degToRad(ENVIRONMENT_SUN_AZIMUTH_DEGREES);
const elevation=THREE.MathUtils.degToRad(ENVIRONMENT_SUN_ELEVATION_DEGREES);
export const ENVIRONMENT_SUN_DIRECTION = new THREE.Vector3(
  Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),-Math.cos(azimuth)*Math.cos(elevation),
);
const STATIC_LAYER=27,DYNAMIC_LAYER=28,BAKE_VIEW_LAYER=29;
const DETAIL_REGIONS=[['courtyard',45],['music',55],['cliff',90]] as const;
const KEY='environment-static-sun-v001';

interface ShadowTile {
  id:string;
  target:THREE.WebGLRenderTarget;
  matrix:THREE.Matrix4;
  parameters:THREE.Vector4;
  extent:THREE.Vector2;
  depthRange:number;
}
interface HookState {
  material:THREE.Material;
  before:THREE.Material['onBeforeCompile'];
  key:THREE.Material['customProgramCacheKey'];
  installed:THREE.Material['onBeforeCompile'];
}
export interface EnvironmentLighting {
  /** Call after every static asset and its world transform is ready, before showing the world. */
  prepare(renderer:THREE.WebGLRenderer,camera:THREE.Camera):Promise<void>;
  /** Queue updates to the existing tiles after an independently streamed region attaches. */
  refresh(renderer:THREE.WebGLRenderer):void;
  includeReceivers(root:THREE.Object3D):void;
  excludeReceivers(root:THREE.Object3D):void;
  /** Call after positioning/animating the traveler. The render hook also synchronizes its shadow proxy. */
  updateTraveler(position:THREE.Vector3):void;
  inspect():{
    status:string;sunDirection:number[];sunElevationDegrees:number;sunAzimuthDegrees:number;
    hemisphereIntensity:number;staticPasses:number;staticCasters:number;materials:number;
    avatarProxyMeshes:number;dynamicResolution:number;estimatedTargetBytes:number;
    tiles:{id:string;resolution:number;extent:number[];depthRange:number;matrix:number[]}[];
  };
  dispose():void;
}

const VERTEX_HEADER=/* glsl */`
varying vec3 vEnvironmentShadowPosition;
varying vec3 vEnvironmentShadowNormal;
`;
const FRAGMENT_HEADER=/* glsl */`
varying vec3 vEnvironmentShadowPosition;
varying vec3 vEnvironmentShadowNormal;
uniform vec3 uEnvironmentSunDirection;
#if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF)
uniform sampler2DShadow uEnvironmentShadow0;
uniform sampler2DShadow uEnvironmentShadow1;
uniform sampler2DShadow uEnvironmentShadow2;
uniform sampler2DShadow uEnvironmentShadow3;
uniform mat4 uEnvironmentShadowMatrix0;
uniform mat4 uEnvironmentShadowMatrix1;
uniform mat4 uEnvironmentShadowMatrix2;
uniform mat4 uEnvironmentShadowMatrix3;
// inverse resolution, depth bias, world normal bias, filter radius in texels
uniform vec4 uEnvironmentShadowParameters0;
uniform vec4 uEnvironmentShadowParameters1;
uniform vec4 uEnvironmentShadowParameters2;
uniform vec4 uEnvironmentShadowParameters3;
vec3 environmentShadowCoord(mat4 matrix,vec4 parameters) {
  vec4 q=matrix*vec4(vEnvironmentShadowPosition+normalize(vEnvironmentShadowNormal)*parameters.z,1.0);
  q.xyz/=q.w;
  #ifdef USE_REVERSED_DEPTH_BUFFER
    q.z-=parameters.y;
  #else
    q.z+=parameters.y;
  #endif
  return q.xyz;
}
float environmentTileWeight(vec3 q,float fade) {
  float edge=min(min(q.x,1.0-q.x),min(q.y,1.0-q.y));
  return smoothstep(0.0,fade,edge)*step(0.0,q.z)*step(q.z,1.0);
}
vec2 environmentDepthGradient(vec3 q) {
  vec3 dx=dFdx(q),dy=dFdy(q);
  float determinant=dx.x*dy.y-dx.y*dy.x;
  if(abs(determinant)<1e-16)return vec2(0.0);
  return vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
}
float environmentCompareShadow(sampler2DShadow map,vec3 q,vec4 parameters,vec2 gradient) {
  // A fixed PCF footprint: no screen-space noise that changes when the camera turns.
  // Correct each tap for the receiver plane's depth slope. A 30-degree sun makes
  // even flat sand steep in light space; a constant tiny bias alone creates bands.
  float footprintBias=dot(abs(gradient),vec2(parameters.x*.55));
  #ifdef USE_REVERSED_DEPTH_BUFFER
    q.z+=footprintBias;
  #else
    q.z-=footprintBias;
  #endif
  vec2 d=vec2(parameters.x*parameters.w*.5);
  vec2 a=vec2(-d.x,-d.y),b=vec2(d.x,-d.y),c=vec2(-d.x,d.y),e=vec2(d.x,d.y);
  return .25*(texture(map,vec3(q.xy+a,q.z+dot(gradient,a)))
    +texture(map,vec3(q.xy+b,q.z+dot(gradient,b)))
    +texture(map,vec3(q.xy+c,q.z+dot(gradient,c)))
    +texture(map,vec3(q.xy+e,q.z+dot(gradient,e))));
}
float environmentStaticShadow() {
  vec3 q0=environmentShadowCoord(uEnvironmentShadowMatrix0,uEnvironmentShadowParameters0);
  vec3 q1=environmentShadowCoord(uEnvironmentShadowMatrix1,uEnvironmentShadowParameters1);
  vec3 q2=environmentShadowCoord(uEnvironmentShadowMatrix2,uEnvironmentShadowParameters2);
  vec3 q3=environmentShadowCoord(uEnvironmentShadowMatrix3,uEnvironmentShadowParameters3);
  // Evaluate derivatives before spatially varying tile branches.
  vec2 g0=environmentDepthGradient(q0),g1=environmentDepthGradient(q1),g2=environmentDepthGradient(q2),g3=environmentDepthGradient(q3);
  vec3 weights=vec3(environmentTileWeight(q1,.13),environmentTileWeight(q2,.13),environmentTileWeight(q3,.13));
  float total=weights.x+weights.y+weights.z;
  float base=1.0;
  if(total<.999)base=mix(1.0,environmentCompareShadow(uEnvironmentShadow0,q0,uEnvironmentShadowParameters0,g0),environmentTileWeight(q0,.025));
  float detail=0.0;
  if(weights.x>.0001)detail+=weights.x*environmentCompareShadow(uEnvironmentShadow1,q1,uEnvironmentShadowParameters1,g1);
  if(weights.y>.0001)detail+=weights.y*environmentCompareShadow(uEnvironmentShadow2,q2,uEnvironmentShadowParameters2,g2);
  if(weights.z>.0001)detail+=weights.z*environmentCompareShadow(uEnvironmentShadow3,q3,uEnvironmentShadowParameters3,g3);
  return (base*max(0.0,1.0-total)+detail)/max(1.0,total);
}
#endif
`;

/** This insertion is deliberately limited to the real sun's directional direct-light term.
 * Hemisphere/caisson/cave fills and emissive artwork retain their existing behavior. */
export function environmentShadowShaderSource(vertex:string,fragment:string):{vertex:string;fragment:string} {
  const vertexAnchor='#include <shadowmap_vertex>',lightAnchor='#include <lights_fragment_begin>';
  if(!vertex.includes(vertexAnchor)||!fragment.includes(lightAnchor))throw new Error('environment-shadow-shader-anchor-missing');
  const lighting=THREE.ShaderChunk.lights_fragment_begin.replace(
    'getDirectionalLightInfo( directionalLight, directLight );',
    `getDirectionalLightInfo( directionalLight, directLight );
    #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF)
    if(receiveShadow && dot(directionalLight.direction,transformDirection(uEnvironmentSunDirection,viewMatrix))>.99999)
      directLight.color*=environmentStaticShadow();
    #endif`,
  );
  return {
    vertex:VERTEX_HEADER+vertex.replace(vertexAnchor,`${vertexAnchor}\n vEnvironmentShadowPosition=worldPosition.xyz;\n vEnvironmentShadowNormal=transformNormalByInverseViewMatrix(transformedNormal,viewMatrix);`),
    fragment:FRAGMENT_HEADER+fragment.replace(lightAnchor,lighting),
  };
}

/** R8 is an unused color attachment; WebGLRenderer still requires one in r187.
 * Depth-only count:0 targets are not safe in its setupDepthRenderbuffer path.
 * R8 + depth32 needs at most five bytes/pixel, instead of RGBA8 + depth32's eight. */
function depthTarget(size:number,name:string,reversed:boolean):THREE.WebGLRenderTarget {
  const depth=new THREE.DepthTexture(size,size,THREE.UnsignedIntType);
  depth.format=THREE.DepthFormat;depth.compareFunction=reversed?THREE.GreaterEqualCompare:THREE.LessEqualCompare;
  depth.minFilter=depth.magFilter=THREE.LinearFilter;depth.name=`${name}-depth`;
  const target=new THREE.WebGLRenderTarget(size,size,{format:THREE.RedFormat,type:THREE.UnsignedByteType,
    minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthTexture:depth});
  target.texture.name=`${name}-unused-r8`;
  return target;
}
function releaseTarget(target:THREE.RenderTarget|null) {
  if(!target)return;
  target.depthTexture?.dispose();target.depthTexture=null;target.dispose();
}
function boxCorners(box:THREE.Box3) {
  return [0,1,2,3,4,5,6,7].map(i=>new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z));
}

/** Four static shadow tiles are rendered once during loading. The existing sun
 * then renders only an independently layered avatar proxy, including first-person
 * views that hide the visible traveler. No static map follows the player. */
export function createEnvironmentLighting(scene:THREE.Scene,traveler:THREE.Object3D,compact = false):EnvironmentLighting {
  const foundSun=scene.children.find((object):object is THREE.DirectionalLight=>object instanceof THREE.DirectionalLight);
  if(!foundSun)throw new Error('environment-sun-missing');
  const sun:THREE.DirectionalLight=foundSun;
  const hemisphere=scene.children.find((object):object is THREE.HemisphereLight=>object instanceof THREE.HemisphereLight);
  const oldSun={position:sun.position.clone(),target:sun.target.position.clone(),intensity:sun.intensity,layers:sun.layers.mask,
    autoUpdate:sun.shadow.autoUpdate,shadowLayers:sun.shadow.camera.layers.mask,normalBias:sun.shadow.normalBias,bias:sun.shadow.bias,
    mapSize:sun.shadow.mapSize.clone(),radius:sun.shadow.radius,camera:sun.shadow.camera.clone(),castShadow:sun.castShadow};
  const oldHemisphere=hemisphere?.intensity;
  const oldRender=scene.onBeforeRender;
  const tiles:ShadowTile[]=[],hooks:HookState[]=[],proxyPairs:{source:THREE.Mesh;proxy:THREE.Mesh}[]=[];
  const installedMaterials=new Set<THREE.Material>();
  const layers=new Map<THREE.Object3D,number>(),shadowSides=new Map<THREE.Material,THREE.Side|null>();
  const shadowProxy=new THREE.Group();shadowProxy.name='environment-traveler-shadow-only';
  let status='pending',disposed=false,prepared=false,preparing:Promise<void>|null=null;
  let staticPasses=0,staticCasters=0,dynamicResolution=1024,dynamicTarget:THREE.WebGLRenderTarget|null=null,pendingTile:THREE.WebGLRenderTarget|null=null;
  const pendingRefreshTiles=new Set<ShadowTile>();
  const refreshFocus=new THREE.Vector3();
  let refreshBounds:THREE.Box3|null=null;
  let refreshFrame:number|null=null,refreshDirty=false;
  let refreshDelay:ReturnType<typeof setTimeout>|undefined;
  let refreshScratch:THREE.WebGLRenderTarget|null=null;
  const refreshCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2);
  refreshCamera.layers.set(BAKE_VIEW_LAYER);
  const travelerPosition=new THREE.Vector3();traveler.getWorldPosition(travelerPosition);
  // Broad fixed shadows now cover the interiors too. Keep their painted reds
  // readable with warm sky fill while retaining a clearly stronger direct sun.
  sun.intensity=2.4;if(hemisphere)hemisphere.intensity=.95;
  sun.castShadow=true;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=false;
  sun.position.copy(sun.target.position).addScaledVector(ENVIRONMENT_SUN_DIRECTION,100);

  function syncProxy() {
    if(disposed||!proxyPairs.length)return;
    traveler.updateWorldMatrix(true,true);
    for(const {source,proxy}of proxyPairs){
      proxy.matrix.copy(source.matrixWorld);proxy.matrixWorldNeedsUpdate=true;
      proxy.visible=true;
      // Ignore only the outer first-person visibility flag, preserving genuinely hidden submeshes.
      for(let owner:THREE.Object3D|null=source;owner&&owner!==traveler;owner=owner.parent)if(!owner.visible){proxy.visible=false;break;}
      if(source.morphTargetInfluences&&proxy.morphTargetInfluences)proxy.morphTargetInfluences.splice(0,proxy.morphTargetInfluences.length,...source.morphTargetInfluences);
      proxy.updateMatrixWorld(true);
    }
  }
  const renderHook:THREE.Scene['onBeforeRender']=(...args)=>{
    oldRender.apply(scene,args);syncProxy();
  };

  function prepareObjects() {
    const avatarObjects=new Set<THREE.Object3D>();traveler.traverse(object=>avatarObjects.add(object));
    scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      layers.set(object,object.layers.mask);
      object.layers.disable(STATIC_LAYER);object.layers.disable(DYNAMIC_LAYER);
      if(!avatarObjects.has(object)&&object.castShadow&&!object.userData.excludeEnvironmentShadowBake){
        object.layers.enable(STATIC_LAYER);staticCasters++;
      }
      if(object.name==='continuous-sand-heightfield'){
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(!shadowSides.has(material))shadowSides.set(material,material.shadowSide);
          material.shadowSide=THREE.DoubleSide;
        }
      }
    });
    traveler.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!object.castShadow)return;
      const proxy=object.clone(false);proxy.name=`shadow-only-${object.name}`;proxy.layers.set(DYNAMIC_LAYER);
      proxy.matrixAutoUpdate=false;proxy.frustumCulled=false;proxy.castShadow=true;proxy.receiveShadow=false;
      shadowProxy.add(proxy);proxyPairs.push({source:object,proxy});
    });
    scene.add(shadowProxy);syncProxy();
  }

  function worldBounds():THREE.Box3 {
    const configured=scene.userData.environmentShadowBounds;
    if(configured instanceof THREE.Box3)return configured.clone();
    const bounds=new THREE.Box3(new THREE.Vector3(TERRAIN_BOUNDS.minX-100,-15,TERRAIN_BOUNDS.minZ-100),new THREE.Vector3(TERRAIN_BOUNDS.maxX+100,150,TERRAIN_BOUNDS.maxZ+100));
    const part=new THREE.Box3();
    scene.traverseVisible(object=>{
      if(!(object instanceof THREE.Mesh)||!object.layers.isEnabled(STATIC_LAYER)||object.name==='continuous-sand-heightfield')return;
      if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      if(object.geometry.boundingBox){part.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);bounds.union(part);}
    });
    return bounds;
  }

  function configureTile(focus:THREE.Vector3,extent:THREE.Vector2,bounds:THREE.Box3,size:number) {
    const projections=boxCorners(bounds).map(point=>point.sub(focus).dot(ENVIRONMENT_SUN_DIRECTION));
    const nearest=Math.max(...projections),farthest=Math.min(...projections);
    sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(ENVIRONMENT_SUN_DIRECTION,nearest+30);
    const camera=sun.shadow.camera;
    Object.assign(camera,{left:-extent.x,right:extent.x,top:extent.y,bottom:-extent.y,near:1,far:nearest-farthest+60});
    camera.updateProjectionMatrix();camera.layers.set(STATIC_LAYER);
    sun.shadow.mapSize.set(size,size);sun.shadow.normalBias=0;sun.shadow.bias=0;sun.shadow.needsUpdate=true;
    sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);
  }

  function installMaterials(root:THREE.Object3D=scene) {
    const materials=new Set<THREE.Material>();
    root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof THREE.MeshStandardMaterial)materials.add(material);});
    for(const material of materials){
      if(installedMaterials.has(material))continue;
      installedMaterials.add(material);
      const before=material.onBeforeCompile,key=material.customProgramCacheKey;
      // Three's default key reads onBeforeCompile, so capture it before wrapping.
      const originalKey=key===THREE.Material.prototype.customProgramCacheKey ? before.toString() : null;
      const installed:THREE.Material['onBeforeCompile']=function(this:THREE.Material,shader,renderer){
        before.call(this,shader,renderer);
        shader.uniforms.uEnvironmentSunDirection={value:ENVIRONMENT_SUN_DIRECTION};
        for(const [i,tile]of tiles.entries()){
          shader.uniforms[`uEnvironmentShadow${i}`]={value:tile.target.depthTexture};
          shader.uniforms[`uEnvironmentShadowMatrix${i}`]={value:tile.matrix};
          shader.uniforms[`uEnvironmentShadowParameters${i}`]={value:tile.parameters};
        }
        const source=environmentShadowShaderSource(shader.vertexShader,shader.fragmentShader);
        shader.vertexShader=source.vertex;shader.fragmentShader=source.fragment;
      };
      material.onBeforeCompile=installed;material.customProgramCacheKey=()=>`${originalKey??key.call(material)}|${KEY}`;
      material.needsUpdate=true;hooks.push({material,before,key,installed});
    }
  }

  function updateTraveler(position:THREE.Vector3) {
    travelerPosition.copy(position);
    if(!prepared||disposed)return;
    updateTerrainSunShadow(sun,travelerPosition,{extent:7,offset:ENVIRONMENT_SUN_DIRECTION.clone().multiplyScalar(30),
      near:1,far:65,bias:-.00016,normalBias:.018});
    sun.shadow.camera.layers.set(DYNAMIC_LAYER);sun.shadow.needsUpdate=true;
    syncProxy();
  }

  async function prepare(renderer:THREE.WebGLRenderer,_camera:THREE.Camera):Promise<void> {
    if(disposed)throw new Error('environment-lighting-disposed');
    if(preparing)return preparing;
    preparing=(async()=>{
      status='preparing';
      if(renderer.shadowMap.type!==THREE.PCFShadowMap)throw new Error('environment-lighting-requires-pcf');
      prepareObjects();scene.updateMatrixWorld(true);
      const bounds=worldBounds(),focus=bounds.getCenter(new THREE.Vector3());
      const orientation=new THREE.Matrix4().lookAt(ENVIRONMENT_SUN_DIRECTION,new THREE.Vector3(),new THREE.Vector3(0,1,0));
      const right=new THREE.Vector3().setFromMatrixColumn(orientation,0),up=new THREE.Vector3().setFromMatrixColumn(orientation,1);
      const relative=boxCorners(bounds).map(point=>point.sub(focus));
      const globalExtent=new THREE.Vector2(Math.max(...relative.map(p=>Math.abs(p.dot(right))))+8,Math.max(...relative.map(p=>Math.abs(p.dot(up))))+8);
      const specs=[{id:'world',focus,extent:globalExtent,size:2048},...DETAIL_REGIONS.map(([id,extent])=>({id,focus:new THREE.Vector3(TERRAIN_REGIONS[id].target.x,TERRAIN_REGIONS[id].target.y,TERRAIN_REGIONS[id].target.z),extent:new THREE.Vector2(extent,extent),size:1024}))];
      const max=renderer.capabilities.maxTextureSize;dynamicResolution=Math.min(1024,max);
      const bakeCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2);bakeCamera.layers.set(BAKE_VIEW_LAYER);
      const scratch=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false});
      const savedTarget=renderer.getRenderTarget(),savedFace=renderer.getActiveCubeFace(),savedMip=renderer.getActiveMipmapLevel();
      const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
      const savedBackground=scene.background,savedAutoUpdate=renderer.shadowMap.autoUpdate,savedEnabled=renderer.shadowMap.enabled;
      const reversed=renderer.capabilities.reversedDepthBuffer;
      releaseTarget(sun.shadow.map);sun.shadow.map=null;
      try{
        scene.background=null;sun.layers.enable(BAKE_VIEW_LAYER);
        renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;
        for(const spec of specs){
          if(disposed)throw new Error('environment-lighting-disposed');
          const size=Math.min(spec.size,max),target=depthTarget(size,`environment-static-${spec.id}`,reversed);pendingTile=target;
          configureTile(spec.focus,spec.extent,bounds,size);sun.shadow.map=target;
          // Normal renderer entry establishes the render state needed by shadow shaders.
          // The bake camera sees only the light: no Reflector, color meshes or mirror recursion.
          renderer.setRenderTarget(scratch);renderer.render(scene,bakeCamera);
          if(sun.shadow.map!==target)throw new Error('environment-shadow-target-replaced');
          const depthRange=sun.shadow.camera.far-sun.shadow.camera.near,texel=Math.max(spec.extent.x,spec.extent.y)*2/size;
          // The coarse landscape tile spans ~1.2 km. Curved dune crests need a
          // little extra depth clearance at grazing light; preserve the much
          // smaller indoor bias so columns and workshop props keep contact.
          const depthClearance=spec.id==='world'?Math.max(.035,texel*.22):Math.max(.014,texel*.045);
          tiles.push({id:spec.id,target,matrix:sun.shadow.matrix.clone(),extent:spec.extent.clone(),depthRange,
            parameters:new THREE.Vector4(1/size,-depthClearance/depthRange,Math.max(.022,texel*.28),1.1)});
          staticPasses++;sun.shadow.map=null;pendingTile=null;
          await new Promise<void>(resolve=>setTimeout(resolve,0));
        }
      }finally{
        sun.layers.mask=oldSun.layers;scene.background=savedBackground;
        renderer.shadowMap.autoUpdate=savedAutoUpdate;renderer.shadowMap.enabled=savedEnabled;
        if(!renderer.getContext().isContextLost()){
          renderer.setRenderTarget(savedTarget,savedFace,savedMip);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
        }
        scratch.dispose();
      }
      if(disposed)throw new Error('environment-lighting-disposed');
      dynamicTarget=depthTarget(dynamicResolution,'environment-dynamic-traveler',reversed);
      sun.shadow.map=dynamicTarget;sun.shadow.mapSize.set(dynamicResolution,dynamicResolution);
      sun.shadow.autoUpdate=true;sun.shadow.radius=1.25;
      installMaterials();scene.onBeforeRender=renderHook;prepared=true;status='ready';updateTraveler(travelerPosition);
    })().catch(error=>{if(!disposed)status='failed';releaseTarget(pendingTile);pendingTile=null;throw error;});
    return preparing;
  }

  function refresh(renderer:THREE.WebGLRenderer) {
    if(disposed||!prepared||!dynamicTarget||renderer.getContext().isContextLost())return;
    refreshDirty=true;
    if(refreshFrame!==null)return;
    if(!compact){refreshFrame=requestAnimationFrame(()=>refreshNextTile(renderer));return;}
    // Nearby streamed models usually arrive in a burst. Bake once after it settles.
    clearTimeout(refreshDelay);
    refreshDelay=setTimeout(()=>{
      refreshDelay=undefined;
      refreshFrame=requestAnimationFrame(()=>refreshNextTile(renderer));
    },650);
  }

  function refreshNextTile(renderer:THREE.WebGLRenderer) {
    refreshFrame=null;
    if(disposed||!dynamicTarget||renderer.getContext().isContextLost())return;
    if(refreshDirty){
      refreshDirty=false;
      scene.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||layers.has(object)||object.parent===shadowProxy)return;
        layers.set(object,object.layers.mask);
        if(object.castShadow&&!object.userData.excludeEnvironmentShadowBake){object.layers.enable(STATIC_LAYER);staticCasters++;}
      });
      scene.updateMatrixWorld(true);
      refreshBounds=worldBounds();refreshBounds.getCenter(refreshFocus);
      installMaterials();
      for(const tile of tiles)pendingRefreshTiles.add(tile);
    }
    const tile=pendingRefreshTiles.values().next().value;
    if(!tile||!refreshBounds)return;
    pendingRefreshTiles.delete(tile);
    // Allow the game to paint between tiles. Multiple streamed groups can share
    // the outstanding tiles instead of baking four shadow maps per attachment.
    if(pendingRefreshTiles.size)refreshFrame=requestAnimationFrame(()=>refreshNextTile(renderer));
    refreshScratch??=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false});
    const savedTarget=renderer.getRenderTarget(),savedFace=renderer.getActiveCubeFace(),savedMip=renderer.getActiveMipmapLevel();
    const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
    const savedBackground=scene.background,savedAutoUpdate=renderer.shadowMap.autoUpdate,savedEnabled=renderer.shadowMap.enabled;
    const sunLayers=sun.layers.mask;
    try{
      scene.background=null;sun.layers.enable(BAKE_VIEW_LAYER);
      renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;
      const landmark=DETAIL_REGIONS.find(([id])=>id===tile.id);
      const target=landmark?TERRAIN_REGIONS[landmark[0]].target:null;
      const tileFocus=target?new THREE.Vector3(target.x,target.y,target.z):refreshFocus;
      configureTile(tileFocus,tile.extent,refreshBounds,tile.target.width);sun.shadow.map=tile.target;
      renderer.setRenderTarget(refreshScratch);renderer.render(scene,refreshCamera);
      tile.matrix.copy(sun.shadow.matrix);staticPasses++;
    }catch(error){
      console.warn('gallery-stream-shadow-refresh',error);
    }finally{
      sun.layers.mask=sunLayers;scene.background=savedBackground;
      renderer.shadowMap.autoUpdate=savedAutoUpdate;renderer.shadowMap.enabled=savedEnabled;
      sun.shadow.map=dynamicTarget;sun.shadow.mapSize.set(dynamicResolution,dynamicResolution);
      updateTraveler(travelerPosition);
      if(!renderer.getContext().isContextLost()){
        renderer.setRenderTarget(savedTarget,savedFace,savedMip);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
      }
    }
  }

  return {
    prepare,refresh,updateTraveler,
    includeReceivers(root:THREE.Object3D) {
      if (prepared && !disposed) installMaterials(root);
    },
    excludeReceivers(root:THREE.Object3D) {
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        layers.delete(object);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          const index = hooks.findIndex(hook => hook.material === material);
          if (index < 0) continue;
          const [{ before, key, installed }] = hooks.splice(index, 1);
          installedMaterials.delete(material);
          if (material.onBeforeCompile === installed) {
            material.onBeforeCompile = before; material.customProgramCacheKey = key;
          }
        }
      });
    },
    inspect(){return {status,sunDirection:ENVIRONMENT_SUN_DIRECTION.toArray(),sunElevationDegrees:ENVIRONMENT_SUN_ELEVATION_DEGREES,sunAzimuthDegrees:ENVIRONMENT_SUN_AZIMUTH_DEGREES,
      hemisphereIntensity:hemisphere?.intensity??0,staticPasses,staticCasters,materials:hooks.length,avatarProxyMeshes:proxyPairs.length,dynamicResolution,
      estimatedTargetBytes:tiles.reduce((sum,tile)=>sum+tile.target.width*tile.target.height*5,0)+(dynamicTarget?dynamicResolution**2*5:0),
      tiles:tiles.map(tile=>({id:tile.id,resolution:tile.target.width,extent:tile.extent.toArray(),depthRange:tile.depthRange,matrix:tile.matrix.toArray()}))};},
    dispose(){
      if(disposed)return;disposed=true;status='disposed';
      if(refreshFrame!==null)cancelAnimationFrame(refreshFrame);
      clearTimeout(refreshDelay);
      pendingRefreshTiles.clear();refreshScratch?.dispose();
      if(scene.onBeforeRender===renderHook)scene.onBeforeRender=oldRender;
      for(const {material,before,key,installed}of hooks)if(material.onBeforeCompile===installed){material.onBeforeCompile=before;material.customProgramCacheKey=key;material.needsUpdate=true;}
      for(const [object,mask]of layers)object.layers.mask=mask;
      for(const [material,side]of shadowSides)material.shadowSide=side;
      // Proxy geometries, materials, skeletons and textures belong to the original avatar.
      shadowProxy.removeFromParent();shadowProxy.clear();proxyPairs.length=0;
      if(sun.shadow.map&&sun.shadow.map!==dynamicTarget&&sun.shadow.map!==pendingTile&&!tiles.some(tile=>tile.target===sun.shadow.map))releaseTarget(sun.shadow.map);
      for(const tile of tiles)releaseTarget(tile.target);tiles.length=0;releaseTarget(dynamicTarget);dynamicTarget=null;releaseTarget(pendingTile);pendingTile=null;
      sun.shadow.map=null;sun.castShadow=oldSun.castShadow;sun.shadow.autoUpdate=oldSun.autoUpdate;sun.shadow.camera.copy(oldSun.camera);sun.shadow.camera.layers.mask=oldSun.shadowLayers;
      sun.shadow.mapSize.copy(oldSun.mapSize);sun.shadow.normalBias=oldSun.normalBias;sun.shadow.bias=oldSun.bias;sun.shadow.radius=oldSun.radius;
      sun.position.copy(oldSun.position);sun.target.position.copy(oldSun.target);sun.intensity=oldSun.intensity;sun.layers.mask=oldSun.layers;
      if(hemisphere&&oldHemisphere!==undefined)hemisphere.intensity=oldHemisphere;
    },
  };
}
