import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './sandstone-study-v001.css';

// Inspection-only entry. It does not import App, change a map or write game state.
const viewport=document.querySelector<HTMLDivElement>('#viewport')!;
const status=document.querySelector<HTMLSpanElement>('#status')!;
for(const button of document.querySelectorAll<HTMLButtonElement>('button'))button.disabled=true;
const scene=new THREE.Scene();scene.background=new THREE.Color('#afcfdf');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
viewport.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(49,1,.1,250);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=38;controls.maxPolarAngle=Math.PI*.49;
// Identical art-sample light colours, intensities, direction, and shadow settings.
scene.add(new THREE.HemisphereLight('#fff2d7','#ab825a',1.65));
const sun=new THREE.DirectionalLight('#fff2d6',2.4);sun.position.set(-18,35,18);sun.target.position.set(-4,0,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:100});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#dfbd83',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
const clayMaterial=new THREE.MeshStandardMaterial({color:'#b58a55',roughness:.93});
const loader=new GLTFLoader();let rock:THREE.Group,traveler:THREE.Group,loaded=false,currentView='oblique',clay=false,detail=true;
let mixer:THREE.AnimationMixer,travelerGroundY=0,travelerMeasuredHeight=0;const materials=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
const views:Record<string,{eye:[number,number,number];target:[number,number,number]}>= {
  oblique:{eye:[7.3,5.2,8.7],target:[0,1.9,0]},front:{eye:[0,4.1,11.2],target:[0,1.9,0]},
  side:{eye:[9.6,4.3,.4],target:[0,1.9,0]},near:{eye:[3.8,3.7,7.1],target:[.6,2,0]},
  third:{eye:[0,3.5,14.4],target:[0,2.15,1.9]},
};
function view(name:string){currentView=name;camera.position.set(...views[name].eye);controls.target.set(...views[name].target);controls.update();if(traveler){traveler.visible=name==='third';traveler.position.set(0,travelerGroundY,7.7);traveler.rotation.y=0;}for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.onclick=()=>view(b.dataset.view!);
document.querySelector<HTMLButtonElement>('#clay')!.onclick=()=>{
  clay=!clay;for(const [mesh,original] of materials)mesh.material=clay?clayMaterial:original;
  const b=document.querySelector<HTMLButtonElement>('#clay')!;b.setAttribute('aria-pressed',String(clay));b.textContent=clay?'恢复材质':'查看素模';
};
document.querySelector<HTMLButtonElement>('#detail')!.onclick=()=>{
  detail=!detail;for(const original of materials.values())for(const m of Array.isArray(original)?original:[original])if(m instanceof THREE.MeshStandardMaterial){m.normalScale.setScalar(detail?.8:0);m.aoMapIntensity=detail?1:0;}
  const b=document.querySelector<HTMLButtonElement>('#detail')!;b.setAttribute('aria-pressed',String(detail));b.textContent=`表面细节：${detail?'开':'关'}`;
};
const asset=(path:string)=>new URL(`${import.meta.env.BASE_URL}assets/world/${path}`,document.baseURI).href;
Promise.all([loader.loadAsync(asset('sandstone-study/v001/sandstone.glb')),loader.loadAsync(asset('traveler-tripo/v002/traveler.glb'))]).then(([model,person])=>{
  rock=model.scene;scene.add(rock);rock.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;materials.set(o,o.material);}});
  traveler=person.scene;traveler.scale.multiplyScalar(1.8/2.017);scene.add(traveler);traveler.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  mixer=new THREE.AnimationMixer(traveler);const idle=person.animations.find(c=>c.name==='Idle');if(idle)mixer.clipAction(idle).play();mixer.update(0);
  traveler.updateMatrixWorld(true);const body=new THREE.Box3().setFromObject(traveler,true);const scale=1.8/(body.max.y-body.min.y);traveler.scale.multiplyScalar(scale);travelerGroundY=-body.min.y*scale;traveler.updateMatrixWorld(true);const measured=new THREE.Box3().setFromObject(traveler,true);travelerMeasuredHeight=measured.max.y-measured.min.y;
  loaded=true;for(const button of document.querySelectorAll<HTMLButtonElement>('button'))button.disabled=false;status.textContent='独立样片 · 待验收';const size=new THREE.Box3().setFromObject(rock).getSize(new THREE.Vector3());
  document.querySelector('#measure')!.textContent=`岩体 ${size.x.toFixed(1)} × ${size.z.toFixed(1)} × ${size.y.toFixed(1)} 米 · 人物 1.8 米`;
  const requested=new URLSearchParams(location.search).get('view')??'oblique';view(views[requested]?requested:'oblique');
}).catch(error=>{status.textContent='模型加载失败，请刷新重试';console.error(error);});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);resize();view('oblique');
const clock=new THREE.Clock();let frame=0;
function tick(){frame=requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.04);if(!document.hidden)mixer?.update(dt);controls.update();renderer.render(scene,camera);}tick();
Object.assign(window,{__sandstoneStudy:{inspect:()=>({loaded,view:currentView,clay,detail,rockBounds:rock?new THREE.Box3().setFromObject(rock):null,travelerNominalHeight:1.8,travelerMeasuredHeight,render:renderer.info.render,materials:[...materials.values()].flat().map(m=>{const s=m as THREE.MeshStandardMaterial;return{name:s.name,color:!!s.map,normal:!!s.normalMap,ao:!!s.aoMap,roughness:!!s.roughnessMap};})})}});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);controls.dispose();renderer.dispose();});
