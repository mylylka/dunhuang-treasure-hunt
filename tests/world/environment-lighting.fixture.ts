import * as THREE from 'three';
import {createEnvironmentLighting} from '../../src/world/terrain-environment-lighting-v001';
import {createEnvironmentGroundMaterial} from '../../src/world/terrain-environment-materials';

/** Small real-WebGL fixture; deliberately independent of game navigation and heavy GLBs. */
async function run() {
  const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,preserveDrawingBuffer:true});
  renderer.setSize(640,480);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  document.body.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d7e8');
  scene.userData.environmentShadowBounds=new THREE.Box3(new THREE.Vector3(-160,-10,-270),new THREE.Vector3(815,175,400));
  const sun=new THREE.DirectionalLight('#fff2d6',2.4);sun.castShadow=true;sun.position.set(-14,35,22);scene.add(sun,sun.target,new THREE.HemisphereLight('#fff2d7','#ab825a',1.65));
  const groundMaterial=createEnvironmentGroundMaterial();await groundMaterial.ready;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(45,45,30,30),groundMaterial.material);
  const vertexBase=new THREE.Color('#dcb77a'),colors=new Float32Array(ground.geometry.getAttribute('position').count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=vertexBase.r;colors[i+1]=vertexBase.g;colors[i+2]=vertexBase.b;}
  ground.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  ground.name='continuous-sand-heightfield';ground.rotation.x=-Math.PI/2;ground.position.set(110,0,12);ground.receiveShadow=true;ground.castShadow=true;scene.add(ground);
  const block=new THREE.Mesh(new THREE.BoxGeometry(2,6,2),new THREE.MeshStandardMaterial({color:'#bb7042'}));block.position.set(110,3,12);block.castShadow=true;block.receiveShadow=true;scene.add(block);
  const traveler=new THREE.Group();traveler.position.set(102,0,19);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.8,2.2,.8),new THREE.MeshStandardMaterial({color:'#742c20'}));body.position.y=1.1;body.castShadow=true;traveler.add(body);scene.add(traveler);
  let staticDraws=0,ordinaryDraws=0;
  ground.onBeforeShadow=()=>{staticDraws++;};block.onBeforeShadow=()=>{staticDraws++;};
  block.onBeforeRender=()=>{ordinaryDraws++;};
  const lighting=createEnvironmentLighting(scene,traveler);
  const camera=new THREE.PerspectiveCamera(48,640/480,.1,1500);camera.position.set(125,23,39);camera.lookAt(110,1,13);
  await lighting.prepare(renderer,camera);
  const before=lighting.inspect(),preparedDraws=staticDraws,bakeColorDraws=ordinaryDraws;
  const output=new THREE.WebGLRenderTarget(640,480),pixels=new Uint8Array(640*480*4);
  const draw=()=>{lighting.updateTraveler(traveler.position);renderer.setRenderTarget(output);renderer.render(scene,camera);renderer.readRenderTargetPixels(output,0,0,640,480,pixels);renderer.setRenderTarget(null);renderer.render(scene,camera);};
  function sample(x:number,z:number){
    const p=new THREE.Vector3(x,.01,z).project(camera),px=Math.floor((p.x*.5+.5)*640),py=Math.floor((p.y*.5+.5)*480);
    let sum=0,count=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const at=((py+dy)*640+px+dx)*4;sum+=(pixels[at]+pixels[at+1]+pixels[at+2])/3;count++;
    }
    return sum/count;
  }
  draw();
  const staticShadow=sample(114,16),sunlit=sample(106,16);
  traveler.visible=false;draw();const firstPersonShadow=sample(103.25,20.25);
  const proxy=scene.getObjectByName('environment-traveler-shadow-only')!;proxy.visible=false;draw();const withoutProxy=sample(103.25,20.25);proxy.visible=true;
  const quietPoints=[[100,5],[103,5],[106,5],[109,5],[112,5]];
  const litSamples=quietPoints.map(([x,z])=>sample(x,z));
  ground.receiveShadow=false;draw();const unshadowedSamples=quietPoints.map(([x,z])=>sample(x,z));ground.receiveShadow=true;
  const unoccludedShadowLoss=Math.max(...litSamples.map((value,i)=>Math.abs(value-unshadowedSamples[i])));
  for(let i=0;i<5;i++){traveler.position.x+=.15;camera.position.x+=.25;camera.lookAt(110,1,13);draw();}
  const after=lighting.inspect(),glError=renderer.getContext().getError();
  const report={before,after,staticDraws,preparedDraws,bakeColorDraws,staticShadow,sunlit,firstPersonShadow,withoutProxy,glError,unoccludedShadowLoss,
    ground:groundMaterial.inspect(),hookChain:groundMaterial.material.customProgramCacheKey()};
  lighting.dispose();output.dispose();
  const textureCountBeforeCancel=renderer.info.memory.textures;
  const canceledLighting=createEnvironmentLighting(scene,traveler),pending=canceledLighting.prepare(renderer,camera);
  canceledLighting.dispose();let cancelReason='';try{await pending;}catch(error){cancelReason=String(error);}
  const textureCountAfterCancel=renderer.info.memory.textures;
  groundMaterial.dispose();
  return {...report,cancelReason,textureCountBeforeCancel,textureCountAfterCancel};
}
(window as unknown as {environmentLightingCheck:Promise<unknown>}).environmentLightingCheck=run();
