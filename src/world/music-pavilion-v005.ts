import { createMuralMist } from './mural-mist';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { worldAssetUrl } from '../content/world/assets';
import { MUSIC_LAYOUT_V4 as MUSIC_LAYOUT, MUSIC_SOLIDS_V4 as MUSIC_SOLIDS } from './music-pavilion-rules-v004';
import { FLYING_DURATION, flyingColor } from './music-pavilion-rules';
import { CAMERA_CLEARANCE, COURTYARD_CAMERA_BOXES, type CameraSpace } from './camera';

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

/** Owns the region and its small texture set, including late async results. */
export function createMusicPavilionV5(scene:THREE.Scene, initiallyAwakened:boolean) {
  let disposed=false, active=false, time=0, awakened=initiallyAwakened, reduced=false;
  const controller=new AbortController();
  const root=new THREE.Group();root.name='music-pavilion-v005';scene.add(root);
  const mist=createMuralMist(MUSIC_LAYOUT.mural.center,MUSIC_LAYOUT.mural.width,MUSIC_LAYOUT.mural.height);root.add(mist.mesh);
  const textures:THREE.Texture[]=[],bitmaps:ImageBitmap[]=[];
  let mural:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>|null=null;
  const uniforms={uOriginal:{value:null as THREE.Texture|null},uRibbonMasks:{value:null as THREE.Texture|null},uTime:{value:0},uColor:{value:0},uMovement:{value:0}};
  const url=(name:string)=>new URL(worldAssetUrl(`music-pavilion/${name==='music-pavilion.glb'?'v005':'v002'}/${name}`),document.baseURI);
  async function bytes(name:string){const response=await fetch(url(name),{signal:controller.signal});if(!response.ok)throw new Error('music-asset-request-failed');return response;}
  async function texture(name:string,color=true){
    const blob=await (await bytes(name)).blob();const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none'});
    if(disposed){bitmap.close();throw new Error('music-load-cancelled');}
    bitmaps.push(bitmap);const result=new THREE.Texture(bitmap);result.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;result.needsUpdate=true;result.anisotropy=4;textures.push(result);return result;
  }
  function releaseObject(object:THREE.Object3D){
    const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),maps=new Set<THREE.Texture>();
    object.traverse(child=>{if(child instanceof THREE.Mesh){geometry.add(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)maps.add(value);}}});
    geometry.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());maps.forEach(item=>{if(item.source.data instanceof ImageBitmap&&!bitmaps.includes(item.source.data))item.source.data.close();item.dispose();});object.removeFromParent();
  }
  let terrain:THREE.Object3D|null=null;
  async function model(name='music-pavilion.glb'){
    const data=await (await bytes(name)).arrayBuffer();
    if(disposed)throw new Error('music-load-cancelled');
    const gltf=await new GLTFLoader().parseAsync(data,new URL('.',url(name)).href);
    if(disposed){releaseObject(gltf.scene);throw new Error('music-load-cancelled');}
    if(name==='route-dune.glb'){
      gltf.scene.position.set(...MUSIC_LAYOUT.dune.position as [number,number,number]);
      gltf.scene.scale.set(...MUSIC_LAYOUT.dune.scale as [number,number,number]);terrain=gltf.scene;
    }else gltf.scene.position.set(...MUSIC_LAYOUT.origin as [number,number,number]);
    gltf.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});root.add(gltf.scene);
  }
  let timeout:ReturnType<typeof setTimeout>;
  const ready=Promise.race([
    Promise.all([model(),model('route-dune.glb'),texture('mural-original.png'),texture('mural-underlay-crop.png'),texture('ribbon-masks-crop.png',false)]).then(([,,original,underlay,masks])=>{
      if(disposed)return;
      uniforms.uOriginal.value=original;uniforms.uRibbonMasks.value=masks;
      const material=new THREE.MeshStandardMaterial({map:underlay,roughness:1,metalness:0});
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms);
        shader.fragmentShader='uniform sampler2D uOriginal;\nuniform sampler2D uRibbonMasks;\nuniform float uTime;\nuniform float uColor;\nuniform float uMovement;\n'+shader.fragmentShader;
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
          diffuseColor *= vec4(mix(muted,art.rgb,uColor),art.a);
        `);
      };
      material.customProgramCacheKey=()=> 'dunhuang-flying-local-ribbons-v005';
      mural=new THREE.Mesh(new THREE.PlaneGeometry(MUSIC_LAYOUT.mural.width,MUSIC_LAYOUT.mural.height),material);
      mural.name='flying-original-art';mural.position.set(...MUSIC_LAYOUT.mural.center as [number,number,number]);mural.receiveShadow=true;root.add(mural);
    }),
    new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('music-loading-timeout')),30_000);}),
  ]).then(()=>{clearTimeout(timeout);}).catch(error=>{dispose();throw error;});
  function update(dt:number,isReduced:boolean){
    reduced=isReduced;
    if(active){time+=dt;if(reduced)time=Math.max(time,FLYING_DURATION);if(time>=FLYING_DURATION)awakened=true;}
    mist.update(time,FLYING_DURATION,active,reduced);
    uniforms.uColor.value=active?flyingColor(time,reduced):0;
    uniforms.uTime.value=time;
    uniforms.uMovement.value=active&&!reduced?THREE.MathUtils.smoothstep(time,.45,1.4):0;
  }
  function dispose(){
    if(disposed)return;disposed=true;clearTimeout(timeout);controller.abort();
    releaseObject(root);textures.forEach(item=>item.dispose());bitmaps.forEach(bitmap=>bitmap.close());textures.length=0;bitmaps.length=0;root.clear();
  }
  return {ready,dispose,update,
    enter(){active=true;time=0;update(0,reduced);},
    exit(){active=false;time=0;update(0,reduced);},
    replay(){active=true;time=0;update(0,reduced);},
    inspect:()=>({time,color:uniforms.uColor.value,complete:active&&time>=FLYING_DURATION,awakened,active,reduced,mist:mist.inspect(),movement:uniforms.uMovement.value}),
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
