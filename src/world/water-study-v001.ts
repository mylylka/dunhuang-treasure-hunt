import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Water} from 'three/addons/objects/Water.js';
import './water-study-v001.css';

const mount=document.querySelector<HTMLDivElement>('#water-study')!;
mount.innerHTML=`<div class="water-host"></div><header class="water-heading"><p>敦煌 · 材质观察 01</p><h1>一弯静水</h1><span>独立水面小样 · 待确认</span></header><nav class="water-views" aria-label="观察视角"><button data-view="shore" aria-pressed="true">岸边近看</button><button data-view="low" aria-pressed="false">低处看倒影</button><button data-view="aerial" aria-pressed="false">高空俯瞰</button></nav><footer class="water-tools"><div><button id="water-pause" aria-pressed="false">暂停波纹</button><label>微风 <input id="water-wind" aria-label="微风强度" type="range" min="0" max="1" step="0.01" value="0.22"></label></div><p>拖动转动视角 · 滚轮 / 双指缩放<span>建筑与植被用于倒影参照，非最终布局</span></p></footer><div class="water-loading" role="status">正在准备湖岸与倒影…</div><div class="water-rotate"><strong>横过手机，近看湖水</strong><span>横屏后继续观察</span></div>`;
const host=mount.querySelector<HTMLDivElement>('.water-host')!;
const status=mount.querySelector<HTMLDivElement>('.water-loading')!;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label','静水材质3D观察画面');host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#71b8e6');scene.fog=new THREE.Fog('#b7d5df',130,320);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,650);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=5;controls.maxDistance=150;controls.maxPolarAngle=Math.PI*.485;controls.minPolarAngle=.1;controls.enablePan=false;
const sun=new THREE.DirectionalLight('#fff0d8',2.65);sun.position.set(-38,32,-45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.far=180;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);scene.add(new THREE.HemisphereLight('#bbdef9','#b1814e',1.6));

// Water and bank share this exact shoreline, not two approximations.
const outline=new THREE.Shape();outline.moveTo(-4,34);
outline.bezierCurveTo(12,27,26,14,25,0);outline.bezierCurveTo(25,-14,11,-28,-4,-34);
outline.bezierCurveTo(3,-22,7,-11,7,0);outline.bezierCurveTo(7,11,3,22,-4,34);
const shore=outline.getPoints(60).map(p=>new THREE.Vector2(p.x,-p.y));
function signedDistance(x:number,z:number){let closest=Infinity,inside=false;for(let i=0,j=shore.length-1;i<shore.length;j=i++){
 const a=shore[j],b=shore[i],dx=b.x-a.x,dz=b.y-a.y,q=dx*dx+dz*dz;
 const t=q?THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.y)*dz)/q,0,1):0;closest=Math.min(closest,Math.hypot(x-a.x-t*dx,z-a.y-t*dz));
 if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
}return inside?-closest:closest;}
const lakeY=.18;
const pavilionPad={x:-12,z:-3,halfX:7.3,halfZ:5.5,height:.78};
function groundHeight(x:number,z:number,d=signedDistance(x,z)){
 if(d<0)return lakeY-Math.min(3.5,(-d)*.62);
 const dune=(Math.sin(x*.045+z*.026)+Math.sin(z*.063-.7))*1.1;
 const natural=lakeY+.035+d*.035+THREE.MathUtils.smoothstep(d,3,35)*Math.max(0,dune);
 const edge=Math.hypot(Math.max(0,Math.abs(x-pavilionPad.x)-pavilionPad.halfX),Math.max(0,Math.abs(z-pavilionPad.z)-pavilionPad.halfZ));
 return THREE.MathUtils.lerp(natural,pavilionPad.height,1-THREE.MathUtils.smoothstep(edge,0,3.5));
}
const groundGeometry=new THREE.PlaneGeometry(220,180,220,180);groundGeometry.rotateX(-Math.PI/2);
const gpos=groundGeometry.attributes.position,colors=[];const sandA=new THREE.Color('#c6965c'),sandB=new THREE.Color('#e9ba78'),wet=new THREE.Color('#9b7b53');
for(let i=0;i<gpos.count;i++){const x=gpos.getX(i),z=gpos.getZ(i),d=signedDistance(x,z);gpos.setY(i,groundHeight(x,z,d));
 const n=.5+.20*Math.sin(x*.12+Math.sin(z*.08))+.11*Math.cos(z*.17-x*.05);const c=sandA.clone().lerp(sandB,n);if(d<1.65)c.lerp(wet,.68*(1-THREE.MathUtils.smoothstep(d,.1,1.65)));colors.push(c.r,c.g,c.b);}
groundGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeometry.computeVertexNormals();
const ground=new THREE.Mesh(groundGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));ground.receiveShadow=true;scene.add(ground);

// Low-frequency gradients in a tiling normal texture, no painted reflection.
const normalSize=256,normalBytes=new Uint8Array(normalSize*normalSize*4);
for(let y=0;y<normalSize;y++)for(let x=0;x<normalSize;x++){
 let dx=0,dy=0;for(const [kx,ky,a,p] of [[3,2,.12,0],[5,-3,.065,1.4],[11,4,.024,2.3],[15,-8,.012,4.3],[23,19,.006,3.2]]){const q=(kx*x+ky*y)/normalSize*Math.PI*2+p;dx+=Math.cos(q)*a*kx*.1;dy+=Math.cos(q)*a*ky*.1;}
 const n=new THREE.Vector3(-dx,-dy,1).normalize(),i=(y*normalSize+x)*4;normalBytes[i]=(n.x*.5+.5)*255;normalBytes[i+1]=(n.y*.5+.5)*255;normalBytes[i+2]=(n.z*.5+.5)*255;normalBytes[i+3]=255;
}
const normals=new THREE.DataTexture(normalBytes,normalSize,normalSize);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;normals.magFilter=THREE.LinearFilter;normals.minFilter=THREE.LinearMipmapLinearFilter;normals.generateMipmaps=true;normals.needsUpdate=true;
const depthSize=256,depthData=new Uint8Array(depthSize*depthSize*4);
for(let y=0;y<depthSize;y++)for(let x=0;x<depthSize;x++){
 const wx=x/(depthSize-1)*100-50,wz=y/(depthSize-1)*100-50,d=signedDistance(wx,wz),i=(y*depthSize+x)*4;
 depthData[i]=Math.max(0,Math.min(1,-d*.62/3.5))*255;depthData[i+1]=depthData[i+2]=depthData[i];depthData[i+3]=255;
}
const depths=new THREE.DataTexture(depthData,depthSize,depthSize);depths.magFilter=depths.minFilter=THREE.LinearFilter;depths.needsUpdate=true;
const water=new Water(new THREE.ShapeGeometry(outline,80),{textureWidth:1024,textureHeight:1024,waterNormals:normals,sunDirection:sun.position.clone().normalize(),sunColor:'#fff1cf',waterColor:'#2b8b8e',distortionScale:.35});
water.rotation.x=-Math.PI/2;water.position.y=lakeY;water.name='calm-crescent-water';scene.add(water);
water.material.uniforms.depthSampler={value:depths};water.material.uniforms.wind={value:.22};
water.material.fragmentShader=`
 uniform sampler2D mirrorSampler,normalSampler,depthSampler;uniform float time,wind;
 uniform vec3 eye,sunDirection,sunColor;
 varying vec4 mirrorCoord;varying vec4 worldPosition;
 #include <common>
 #include <fog_pars_fragment>
 #include <logdepthbuf_pars_fragment>
 float grain(vec2 p){return fract(sin(dot(floor(p),vec2(12.9898,78.233)))*43758.5453);}
 void main(){
  #include <logdepthbuf_fragment>
  vec2 p=worldPosition.xz;float depth=texture2D(depthSampler,(p+50.0)/100.0).r*3.5;
  vec2 n1=texture2D(normalSampler,p/12.0+time*vec2(.0021,.0013)).rg*2.0-1.0;
  vec2 n2=texture2D(normalSampler,mat2(.82,-.57,.57,.82)*p/4.7+time*vec2(-.0014,.0018)).rg*2.0-1.0;
  vec2 n3=texture2D(normalSampler,mat2(.36,.93,-.93,.36)*p/2.2+time*vec2(.001,-.0017)).rg*2.0-1.0;
  vec2 slopes=(n1*.7+n2*.38+n3*.17)*(.42+wind*.72);
  vec3 N=normalize(vec3(slopes.x,1.0,slopes.y)),V=normalize(eye-worldPosition.xyz);
  float grazing=1.0-max(dot(N,V),0.0);float fresnel=.025+.975*pow(grazing,5.0);
  vec2 distort=slopes*.052;vec3 reflected=texture2D(mirrorSampler,mirrorCoord.xy/mirrorCoord.w+distort).rgb;
  vec3 trans=exp(-vec3(.95,.44,.29)*depth);
  vec3 bed=vec3(.40,.27,.14)*(1.0+.035*sin(p.x*3.1+p.y*2.4));
  vec3 body=vec3(.006,.085,.125);vec3 below=bed*trans+body*(1.0-trans);
  float glitter=pow(max(dot(reflect(-sunDirection,N),V),0.0),180.0);
  float softLight=pow(max(dot(reflect(-sunDirection,N),V),0.0),18.0);
  float rippleLight=(n1.x+n2.y*.6+n3.x*.25)*(.18+wind*.18);
  vec3 color=mix(below,reflected,clamp(.105+fresnel*.895,0.0,1.0));
  color*=1.0+rippleLight;
  color+=sunColor*(glitter*.42+softLight*.035);
  gl_FragColor=vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;
// A gradient sky is a real reflection subject, rather than a baked water image.
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,40,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 dir;
#include <common>
void main(){vec3 d=normalize(dir);float h=max(d.y,0.0);vec3 c=mix(vec3(.24,.50,.78),vec3(.025,.17,.46),pow(h,.45));float cloud=smoothstep(.53,.82,sin(d.x*17.0+d.z*5.0)*.4+sin(d.z*27.0-d.x*7.0)*.25+sin(d.x*43.0+d.z*31.0)*.12);cloud*=smoothstep(.09,.25,h)*(1.0-smoothstep(.45,.75,h));c=mix(c,vec3(.82,.88,.91),cloud*.55);gl_FragColor=vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));scene.add(sky);

let ready=false,disposed=false,paused=false,wind=.22,time=0,last=performance.now(),raf=0;
const errors:string[]=[];const loader=new GLTFLoader();
const asset=(p:string)=>`${import.meta.env.BASE_URL}assets/world/${p}`;
function settleModel(root:THREE.Object3D,x:number,z:number,scale:number,yaw=0){
 // Precise vertices matter: the transformed bounds of rotated furniture include
 // empty corners below the real ground and must not lift the whole courtyard.
 const bounds=new THREE.Box3().setFromObject(root,true),center=bounds.getCenter(new THREE.Vector3());root.position.set(-center.x,-bounds.min.y,-center.z);const wrapper=new THREE.Group();wrapper.add(root);wrapper.scale.setScalar(scale);wrapper.rotation.y=yaw;wrapper.position.set(x,groundHeight(x,z)-.025,z);wrapper.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(wrapper);return wrapper;
}
async function load(){
 try{
  const [tree,shrub,pavilion]=await Promise.all([loader.loadAsync(asset('environment-sample/v002/tree-a.glb')),loader.loadAsync(asset('environment-sample/v002/shrub-a.glb')),loader.loadAsync(asset('music-pavilion/v005/music-pavilion.glb'))]);
  if(disposed)return;
  for(const [x,z,s,r] of [[2,3,1.05,.2],[0,-15,.9,1],[-9,-30,1.1,.8],[18,-29,.85,.3],[30,-8,.8,1.5],[27,19,.9,2],[-3,27,1.2,.4],[-13,15,.8,1]])settleModel(tree.scene.clone(true),x,z,s,r);
  for(const [x,z,s] of [[2,8,.7],[0,-12,.8],[-3,-22,1.1],[21,-25,.8],[30,-4,1.1],[29,13,.65],[17,29,.7],[-9,29,.8],[-17,-14,1.1],[-17,11,.75]])settleModel(shrub.scene.clone(true),x,z,s);
  settleModel(pavilion.scene,pavilionPad.x,pavilionPad.z,.28,.05);
  ready=true;status.hidden=true;
 }catch(e){errors.push(String(e));status.innerHTML='湖岸参照暂未加载。<button type="button" onclick="location.reload()">重新加载</button>';}
}
const views={shore:{position:[38,8.5,35],target:[8,1.5,-2]},low:{position:[31,2.6,20],target:[2,1.8,-8]},aerial:{position:[62,80,69],target:[8,0,0]},texture:{position:[25,6.5,16],target:[18,0,6]}};
type View=keyof typeof views;
function setView(name:View){const v=views[name];camera.position.fromArray(v.position);controls.target.fromArray(v.target);controls.update();document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));}
setView((new URLSearchParams(location.search).get('view') as View) in views ? new URLSearchParams(location.search).get('view') as View:'shore');
for(const button of mount.querySelectorAll<HTMLButtonElement>('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view as View));
const pauseButton=mount.querySelector<HTMLButtonElement>('#water-pause')!;
pauseButton.addEventListener('click',()=>{paused=!paused;pauseButton.textContent=paused?'继续波纹':'暂停波纹';pauseButton.setAttribute('aria-pressed',String(paused));});
mount.querySelector<HTMLInputElement>('#water-wind')!.addEventListener('input',e=>{wind=Number((e.target as HTMLInputElement).value);water.material.uniforms.wind.value=wind;});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function render(now:number){if(disposed)return;const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused&&!document.hidden&&!matchMedia('(orientation: portrait)').matches&&!reduced.matches)time+=dt;water.material.uniforms.time.value=time;controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);controls.dispose();renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});normals.dispose();depths.dispose();});
Object.assign(window,{__waterStudy:{inspect:()=>({ready,paused,time,wind,errors,camera:camera.position.toArray(),target:controls.target.toArray(),stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},reflectionSize:1024}),setView,normalTexture:()=>({width:normalSize,height:normalSize,data:Array.from(normalBytes)})}});
void load();raf=requestAnimationFrame(render);
