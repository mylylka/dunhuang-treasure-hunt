import * as THREE from 'three';
import {worldAssetUrl} from '../content/world/assets';
import {
  ENVIRONMENT_GROUND_BOUNDS, ENVIRONMENT_GROUND_CONTROL_SIZE, sampleGroundControls, sampleGroundRegion,
} from '../content/world/environment-ground-v001';

const FRAGMENT_HEADER = /* glsl */`
varying vec3 vEnvGroundWorld;
uniform sampler2D uEnvGravelColor;
uniform sampler2D uEnvGravelSurface;
uniform sampler2D uEnvGobiColor;
uniform sampler2D uEnvGobiSurface;
uniform sampler2D uEnvGroundControl;
uniform vec4 uEnvGroundBounds;
uniform vec3 uEnvSandColor;
uniform vec3 uEnvOriginalVertexBase;

float envHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float envNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(envHash(i),envHash(i+vec2(1,0)),f.x),mix(envHash(i+vec2(0,1)),envHash(i+vec2(1,1)),f.x),f.y);
}
vec3 envLinear(vec3 c) {
  return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));
}
// Reduced world-coordinate mid-scale field. It never inherits the 2m micro UV.
vec3 envMeso(vec2 p) {
  vec2 w=p+vec2(.65*(envNoise(p/2.8+vec2(4,9))-.5),.8*(envNoise(p/3.1+vec2(7,2))-.5));
  float sediment=smoothstep(.25,.74,.72*envNoise(w/vec2(1.45,.65)+vec2(2,-1))+.28*envNoise(w/vec2(.68,.31)+9.0));
  float plate=smoothstep(.31,.66,.72*envNoise(w/vec2(1.05,.74)+vec2(13,7))+.28*envNoise(w/vec2(.49,.35)+19.0));
  float worn=smoothstep(.32,.68,envNoise(w/vec2(.38,.64)+vec2(4,-7)));
  return vec3(sediment,plate,worn);
}
mat3 envTangentFrame(vec3 eye,vec3 n,vec2 uv) {
  vec3 q0=dFdx(eye),q1=dFdy(eye);
  vec2 st0=dFdx(uv),st1=dFdy(uv);
  vec3 a=cross(q1,n),b=cross(n,q0),t=a*st0.x+b*st1.x,bit=a*st0.y+b*st1.y;
  float scale=inversesqrt(max(max(dot(t,t),dot(bit,bit)),1e-16));
  return mat3(t*scale,bit*scale,n);
}
vec3 envBump(vec3 eye,vec3 n,float height) {
  vec3 dx=dFdx(eye),dy=dFdy(eye),a=cross(dy,n),b=cross(n,dx);
  float det=dot(dx,a);
  return normalize(abs(det)*n-sign(det)*(dFdx(height)*a+dFdy(height)*b));
}
`;

const SURFACE_FRAGMENT = /* glsl */`
vec2 envP=vec2(vEnvGroundWorld.x,-vEnvGroundWorld.z);
vec2 envMacroUv=(vEnvGroundWorld.xz-uEnvGroundBounds.xy)/uEnvGroundBounds.zw;
float envInside=step(0.0,envMacroUv.x)*step(envMacroUv.x,1.0)*step(0.0,envMacroUv.y)*step(envMacroUv.y,1.0);
vec4 envControl=texture2D(uEnvGroundControl,envMacroUv)*envInside;
vec2 envMicroUv=envP/2.0;
vec4 envGravel=texture2D(uEnvGravelColor,envMicroUv);
vec4 envGobi=texture2D(uEnvGobiColor,envMicroUv+vec2(.173,.281));
vec4 envGs=texture2D(uEnvGravelSurface,envMicroUv);
vec4 envBs=texture2D(uEnvGobiSurface,envMicroUv+vec2(.173,.281));
float envG=smoothstep(-.025,.025,envControl.r-envGravel.a)*step(.001,envControl.r);
float envB=smoothstep(-.025,.025,envControl.g-envGobi.a)*step(.001,envControl.g);
// Fine particles fade to their mean coverage before becoming subpixel speckles.
float envDetail=1.0-smoothstep(18.0,58.0,length(vViewPosition));
vec3 envNear=mix(mix(uEnvSandColor,envGravel.rgb,envG),envGobi.rgb,envB);
vec3 envFar=mix(mix(uEnvSandColor,envLinear(vec3(.755,.653,.494)),envControl.r*.378),envLinear(vec3(.75,.645,.48)),envControl.g*.294);
vec3 envColor=mix(envFar,envNear,envDetail);
vec3 envMid=envMeso(envP);
vec3 envSediment=envLinear(vec3(.81,.687,.50)+vec3((envMid.x-.5)*.028));
vec3 envHardpan=envLinear(vec3(.755,.642,.467)+(envMid.y-.5)*vec3(.055,.045,.033)+vec3(envMid.z*.015));
float envHardTotal=clamp(envControl.b+envControl.a,0.0,1.0);
vec3 envSubstrate=(envSediment*envControl.b+envHardpan*envControl.a)/max(envHardTotal,.0001);
envColor=mix(envColor,envSubstrate,envHardTotal);
// Dust is a small material tint, not a baked light-facing gradient.
float envDust=(1.0-envHardTotal)*max(envControl.r,envControl.g)*.22;
envColor=1.0-(1.0-envColor)*(1.0-vec3(.035,.025,.012)*envDust);
diffuseColor.rgb=envColor;
#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
  // Retain the original shore/distant tints without multiplying two sand bases.
  diffuseColor.rgb*=vColor.rgb/uEnvOriginalVertexBase;
#endif
float envRough=mix(mix(.93,envGs.b,envG),envBs.b,envB);
float envMidRough=((.89+.055*(1.0-envMid.x))*envControl.b+(.76+.16*(1.0-envMid.y)+.03*envMid.z)*envControl.a)/max(envHardTotal,.0001);
envRough=mix(envRough,envMidRough,envHardTotal);
vec2 envNormalXY=mix((envGs.rg*2.0-1.0)*envG,envBs.rg*2.0-1.0,envB)*(.8*envDetail);
float envMesoHeight=(envControl.b*(.0008*envMid.x)+envControl.a*(.0038*envMid.y+.0008*envMid.z))*.85;
`;

/** Four reusable PBR images + one nonrepeating runtime mask; one ground draw call. */
export function createEnvironmentGroundMaterial(deferDetail = false) {
  let status: 'waiting' | 'loading' | 'ready' | 'degraded' = 'waiting';
  let disposed=false,controlTimeMs=0,loadedFiles=0;
  let detail: Promise<void> | undefined;
  const abort=new AbortController(), textures:THREE.Texture[]=[], bitmaps:ImageBitmap[]=[];
  const b=ENVIRONMENT_GROUND_BOUNDS,size=ENVIRONMENT_GROUND_CONTROL_SIZE;
  const controlPixels=new Uint8Array(size*size*4);
  const control=new THREE.DataTexture(controlPixels,size,size,THREE.RGBAFormat);
  control.name='environment-world-nonrepeating-control';control.colorSpace=THREE.NoColorSpace;
  control.minFilter=THREE.LinearFilter;control.magFilter=THREE.LinearFilter;control.generateMipmaps=false;
  control.wrapS=control.wrapT=THREE.ClampToEdgeWrapping;control.needsUpdate=true;textures.push(control);
  const uniform={
    uEnvGravelColor:{value:null as THREE.Texture|null},uEnvGravelSurface:{value:null as THREE.Texture|null},
    uEnvGobiColor:{value:null as THREE.Texture|null},uEnvGobiSurface:{value:null as THREE.Texture|null},
    uEnvGroundControl:{value:control},uEnvGroundBounds:{value:new THREE.Vector4(b.minX,b.minZ,b.maxX-b.minX,b.maxZ-b.minZ)},
    uEnvSandColor:{value:new THREE.Color().setRGB(.84,.723,.537,THREE.SRGBColorSpace)},
    uEnvOriginalVertexBase:{value:new THREE.Color('#dcb77a')},
  };
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.93});
  material.name='environment-ground-v001';material.userData.environmentGround=true;
  material.onBeforeCompile=shader=>{
    if(status!=='ready')return;
    Object.assign(shader.uniforms,uniform);
    shader.vertexShader='varying vec3 vEnvGroundWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvEnvGroundWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=FRAGMENT_HEADER+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+SURFACE_FRAGMENT);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=envRough;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 envMapN=vec3(envNormalXY,sqrt(max(1.0-dot(envNormalXY,envNormalXY),.0001)));
       normal=normalize(envTangentFrame(-vViewPosition,normal,envMicroUv)*envMapN);
       normal=envBump(-vViewPosition,normal,envMesoHeight);`);
  };
  // The sun module may wrap this hook/key. Standard light/shadow chunks remain.
  material.customProgramCacheKey=()=>status==='ready'?'environment-ground-packed-v001':'environment-ground-vertex-v001';

  async function load(name:string,color:boolean) {
    const response=await fetch(worldAssetUrl(`environment-world/v001/ground-${name}.png`),{signal:abort.signal});
    if(!response.ok)throw new Error(`environment-ground-texture-${response.status}: ${name}`);
    const image=await response.blob();
    if(abort.signal.aborted)throw new Error('environment-ground-load-aborted');
    const bitmap=await createImageBitmap(image,{imageOrientation:'flipY',premultiplyAlpha:'none'});
    if(abort.signal.aborted){bitmap.close();throw new Error('environment-ground-load-aborted');}
    bitmaps.push(bitmap);
    const texture=new THREE.Texture(bitmap);texture.name=`ground-${name}`;
    texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    texture.needsUpdate=true;textures.push(texture);loadedFiles++;return texture;
  }
  async function buildControl() {
    const started=performance.now();
    for(let row=0;row<size;row++) {
      if(abort.signal.aborted)throw new Error('environment-ground-load-aborted');
      for(let col=0;col<size;col++) {
        // Texel centres agree with WebGL sampling at the edge of this rectangle.
        const x=b.minX+(col+.5)/size*(b.maxX-b.minX),z=b.minZ+(row+.5)/size*(b.maxZ-b.minZ);
        const value=sampleGroundControls(x,z),offset=(row*size+col)*4;
        for(let channel=0;channel<4;channel++)controlPixels[offset+channel]=Math.round(value[channel]*255);
      }
      // Yield during initial loading; no fields are evaluated on player movement.
      if(row%32===31)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    control.needsUpdate=true;controlTimeMs=performance.now()-started;
  }
  function loadDetail(): Promise<void> {
    if(disposed)return Promise.resolve();
    if(detail)return detail;
    status='loading';
    detail=Promise.all([load('gravel-color-id',true),load('gravel-surface',false),load('gobi-color-id',true),load('gobi-surface',false),buildControl()])
      .then(([gc,gs,bc,bs])=>{
        if(disposed)return;
        uniform.uEnvGravelColor.value=gc;uniform.uEnvGravelSurface.value=gs;
        uniform.uEnvGobiColor.value=bc;uniform.uEnvGobiSurface.value=bs;
        status='ready';material.needsUpdate=true;
      }).catch(error=>{
        if(!deferDetail){dispose();throw error;}
        if(disposed)return;
        status='degraded';releaseDetail();
      });
    return detail;
  }
  function releaseDetail() {
    abort.abort();
    textures.forEach(texture=>texture.dispose());textures.length=0;
    bitmaps.forEach(bitmap=>bitmap.close());bitmaps.length=0;
  }
  function dispose() {
    if(disposed)return;disposed=true;releaseDetail();material.dispose();
  }
  return {material,ready:deferDetail?Promise.resolve():loadDetail(),loadDetail,dispose,inspect:()=>({
    version:'v001',status,loaded:status==='ready',disposed,loadedFileTextures:loadedFiles,totalTextures:textures.length,
    microTileMetres:2,controlSize:size,controlWorldBounds:{...b},controlBuildMs:Math.round(controlTimeMs),
    approximateGpuMiB:22.33,geometryDisplacement:false,staticLightInBasecolor:false,
    regionSamples:[{x:110,z:12},{x:185,z:50},{x:310,z:170},{x:420,z:180}].map(p=>({...p,...sampleGroundRegion(p.x,p.z)})),
  })};
}
