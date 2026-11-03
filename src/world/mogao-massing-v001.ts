import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import './mogao-massing-v001.css';

// Dedicated inspection scene: no App, gameplay, collision or persistent state.
const viewport=document.querySelector<HTMLDivElement>('#viewport')!;
const status=document.querySelector<HTMLSpanElement>('#status')!;
const buttons=[...document.querySelectorAll<HTMLButtonElement>('button')];buttons.forEach(b=>b.disabled=true);
const scene=new THREE.Scene();scene.background=new THREE.Color('#afcfdf');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;viewport.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(49,1,.1,2000);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=350;controls.maxPolarAngle=Math.PI*.495;
scene.add(new THREE.HemisphereLight('#fff2d7','#ab825a',1.65));
// Same direction, colour, intensity and exposure as the current game. Shadow
// frustum alone grows to cover the 126m composition; no fog or postprocessing.
const sun=new THREE.DirectionalLight('#fff2d6',2.4);sun.position.set(-42,105,66);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:250});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#dfbd83',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.1;ground.receiveShadow=true;scene.add(ground);
const platform=6.85546875;
const views:Record<string,{eye:[number,number,number];target:[number,number,number]}>= {
 front:{eye:[0,45,170],target:[0,25,-8]},
 left:{eye:[-105,62,145],target:[0,25,-8]},
 right:{eye:[105,62,145],target:[0,25,-8]},
 back:{eye:[-95,70,-130],target:[0,24,-15]},
 third:{eye:[0,3.3,47],target:[0,18,0]},
};
let mountain:THREE.Group,tower:THREE.Group,foundation:THREE.Group,traveler:THREE.Group,mixer:THREE.AnimationMixer;
let loaded=false,currentView='front',showTower=true,groundY=0,personHeight=0;
const ruler=new THREE.Group();ruler.visible=false;scene.add(ruler);
function scaleLine(x:number,bottom:number,height:number,interval:number){
 const points=[new THREE.Vector3(x,bottom,10),new THREE.Vector3(x,bottom+height,10)];
 for(let h=0;h<=height+.001;h+=interval)points.push(new THREE.Vector3(x-.5,bottom+h,10),new THREE.Vector3(x+.5,bottom+h,10));
 const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#fff1cf',depthTest:false}));line.renderOrder=10;ruler.add(line);
}
scaleLine(16,platform,45,5);scaleLine(2,0,1.8,.3);
function view(name:string){
 currentView=name;camera.position.set(...views[name].eye);controls.target.set(...views[name].target);controls.update();
 if(traveler){traveler.position.set(name==='third'?0:3,groundY,name==='third'?38:31);traveler.rotation.y=0;}
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.onclick=()=>view(b.dataset.view!);
document.querySelector<HTMLButtonElement>('#tower')!.onclick=()=>{showTower=!showTower;tower.visible=showTower;const b=document.querySelector<HTMLButtonElement>('#tower')!;b.textContent=showTower?'隐藏九层楼':'显示九层楼';b.setAttribute('aria-pressed',String(showTower));};
document.querySelector<HTMLButtonElement>('#ruler')!.onclick=()=>{ruler.visible=!ruler.visible;document.querySelector('#ruler')!.setAttribute('aria-pressed',String(ruler.visible));};
const loader=new GLTFLoader();const asset=(s:string)=>new URL(`${import.meta.env.BASE_URL}assets/world/${s}`,document.baseURI).href;
function addModel(g:THREE.Group){scene.add(g);g.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
Promise.all(['mountain','tower','foundation'].map(n=>loader.loadAsync(asset(`mogao-massing/v001/${n}.glb`))).concat([loader.loadAsync(asset('traveler-tripo/v002/traveler.glb'))])).then(([a,b,c,p])=>{
 mountain=addModel(a.scene);tower=addModel(b.scene);foundation=addModel(c.scene);traveler=addModel(p.scene);
 mixer=new THREE.AnimationMixer(traveler);const idle=p.animations.find(c=>c.name==='Idle');if(idle)mixer.clipAction(idle).play();mixer.update(0);
 traveler.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(traveler,true);const scale=1.8/(box.max.y-box.min.y);traveler.scale.multiplyScalar(scale);groundY=-box.min.y*scale;
 traveler.updateMatrixWorld(true);const measured=new THREE.Box3().setFromObject(traveler,true);personHeight=measured.max.y-measured.min.y;
 const crest=new THREE.Box3().setFromObject(mountain).max.y;
 document.querySelector('#measure')!.textContent=`山顶 ${crest.toFixed(1)} 米 · 楼高 45 米 · 人物 1.8 米 · 25∶1`;
 loaded=true;buttons.forEach(b=>b.disabled=false);status.textContent='体量待确认 · 纹理尚未制作';
 const requested=new URLSearchParams(location.search).get('view')??'front';view(views[requested]?requested:'front');
}).catch(error=>{status.textContent='模型加载失败，请刷新重试';console.error(error);});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();view('front');
let frame=0;const clock=new THREE.Clock();function tick(){frame=requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.04);if(!document.hidden)mixer?.update(dt);controls.update();renderer.render(scene,camera);}tick();
Object.assign(window,{__mogaoMassing:{inspect:()=>({loaded,view:currentView,showTower,ruler:ruler.visible,personHeight,towerHeight:tower?new THREE.Box3().setFromObject(tower).max.y-platform:null,mountainBounds:mountain?new THREE.Box3().setFromObject(mountain):null,camera:camera.position.toArray(),render:renderer.info.render})}});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();});
