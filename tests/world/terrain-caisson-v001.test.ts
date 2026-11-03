import {readFile} from 'node:fs/promises';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import geometry from '../../src/content/world/caisson-geometry-v001.json';
import {caissonArtSize,loadCaissonCenterTexture,prepareTerrainCaisson,TERRAIN_CAISSON_CAMERA_BOXES,TERRAIN_CAISSON_CONFIG,terrainCaissonCenter,terrainCaissonLookOffset} from '../../src/world/terrain-caisson-v001';
import {terrainCameraSpace,terrainFollowPose} from '../../src/world/terrain-camera-v001';
import {TERRAIN_REGIONS,terrainSurfaceHeight,toTerrainPoint,fromTerrainPoint} from '../../src/world/terrain-rules-v001';
import {explorationLookTarget,MAX_EXPLORATION_LOOK} from '../../src/world/exploration-look';

afterEach(()=>vi.unstubAllGlobals());
function simplePanel(shared=false){
  const root=new THREE.Group(),original=new THREE.MeshStandardMaterial({map:new THREE.Texture({width:767,height:766,close:vi.fn()})});
  original.name=TERRAIN_CAISSON_CONFIG.centerPanel.materialId;
  const plane=new THREE.PlaneGeometry(4.95,4.95*766/767).rotateX(Math.PI/2).translate(0,2.35,0);
  const panel=new THREE.Mesh(plane,original);panel.name=TERRAIN_CAISSON_CONFIG.centerPanel.nodeId;root.add(panel);
  const backing=new THREE.Mesh(new THREE.BoxGeometry(4.95,.077,4.95),shared?original:new THREE.MeshStandardMaterial());backing.position.y=2.3915;root.add(backing);
  return {root,panel,backing,original};
}
async function actualModel(){
  const bytes=await readFile(new URL('../../public/assets/world/caisson-three-hares/v001/three-hares-caisson.glb',import.meta.url));
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
  json.buffers[0].uri=`data:application/octet-stream;base64,${bytes.subarray(28+length).toString('base64')}`;
  // Decode actual geometry and metadata without introducing a DOM/image loader.
  json.materials=json.materials.map((material:{name:string})=>({name:material.name}));
  vi.stubGlobal('ProgressEvent',class ProgressEvent{});
  return (await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
}

describe('independent terrain caisson v001',()=>{
  it('contains complete landscape, portrait and rotated replacements in the square backing',()=>{
    expect(caissonArtSize(767,766)).toEqual({width:4.95,depth:4.95*766/767,rotation:0});
    expect(caissonArtSize(200,100)).toEqual({width:4.95,depth:2.475,rotation:0});
    expect(caissonArtSize(100,200)).toEqual({width:2.475,depth:4.95,rotation:0});
    for(const angle of [Math.PI/4,Math.PI/2]){
      const fit=caissonArtSize(200,100,4.95,angle),c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
      expect(fit.width*c+fit.depth*s).toBeLessThanOrEqual(4.950000001);
      expect(fit.width*s+fit.depth*c).toBeLessThanOrEqual(4.950000001);
    }
    expect(()=>caissonArtSize(0,10)).toThrow('caisson-image-size-invalid');
  });

  it('fits the actual independent GLB face and retains original UVs, structure and high lining clearance',async()=>{
    const root=await actualModel(),panel=root.getObjectByName(TERRAIN_CAISSON_CONFIG.centerPanel.nodeId) as THREE.Mesh;
    const uv=Array.from(panel.geometry.getAttribute('uv').array),backing=root.getObjectByName('three-hares-caisson-center-backing')!;
    root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(backing,true),texture=new THREE.Texture({width:1600,height:800});
    const report=prepareTerrainCaisson(root,texture);root.updateMatrixWorld(true);
    const fitted=new THREE.Box3().setFromObject(panel,true),after=new THREE.Box3().setFromObject(backing,true);
    expect(fitted.getSize(new THREE.Vector3()).x).toBeCloseTo(4.95,5);
    expect(fitted.getSize(new THREE.Vector3()).z).toBeCloseTo(2.475,5);
    expect(Array.from(panel.geometry.getAttribute('uv').array)).toEqual(uv);
    expect(after.getSize(new THREE.Vector3()).toArray()).toEqual(before.getSize(new THREE.Vector3()).toArray());
    expect(after.max.y).toBeLessThan(8.05);
    expect(report.cameraBoxes).toBe(geometry.cameraBoxes.length);
    expect(panel.castShadow).toBe(false);
    expect(panel.receiveShadow).toBe(true);
    expect((panel.material as THREE.MeshStandardMaterial).map).toBe(texture);
  });

  it.each([false,true])('releases only orphaned original center materials and images (shared=%s)',shared=>{
    const {root,original,backing}=simplePanel(shared),disposeMaterial=vi.spyOn(original,'dispose'),map=original.map!,disposeMap=vi.spyOn(map,'dispose'),close=(map.source.data as {close:ReturnType<typeof vi.fn>}).close;
    const texture=new THREE.Texture({width:100,height:200});prepareTerrainCaisson(root,texture);
    expect(disposeMaterial).toHaveBeenCalledTimes(shared?0:1);
    expect(disposeMap).toHaveBeenCalledTimes(shared?0:1);
    expect(close).toHaveBeenCalledTimes(shared?0:1);
    if(shared)expect(backing.material).toBe(original);
  });

  it('closes a decoded bitmap delivered after unmount and never constructs a live texture',async()=>{
    const controller=new AbortController(),close=vi.fn();let finish!:(bitmap:unknown)=>void;
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob()}));
    vi.stubGlobal('createImageBitmap',vi.fn(()=>new Promise(resolve=>{finish=resolve;})));
    const loading=loadCaissonCenterTexture('http://localhost/center.jpg',controller.signal);
    await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
    controller.abort();finish({width:767,height:766,close});
    await expect(loading).rejects.toThrow('caisson-image-load-cancelled');expect(close).toHaveBeenCalledOnce();
  });

  it('keeps old preview camera geometry unchanged unless the new version flag is enabled',()=>{
    const original=terrainCameraSpace(),enabled=terrainCameraSpace(true);
    expect(enabled.orientedBoxes!.length-original.orientedBoxes!.length).toBe(geometry.cameraBoxes.length);
    expect(terrainCameraSpace().orientedBoxes!.length).toBe(original.orientedBoxes!.length);
    for(const [i,box] of TERRAIN_CAISSON_CAMERA_BOXES.entries()){
      expect(box.min[1]-geometry.cameraBoxes[i].min[1]).toBeCloseTo(5.55,8);
      expect(box.min[0]-geometry.cameraBoxes[i].min[0]).toBeCloseTo(-12,8);
      expect(box.min[2]-geometry.cameraBoxes[i].min[2]).toBeCloseTo(-15,8);
    }
  });

  it('uses an unobstructed follow-camera ray to center the original art for the caisson station',async()=>{
    const p=toTerrainPoint('courtyard',{x:-12,z:-15}),space=terrainCameraSpace(true);
    const pose=terrainFollowPose(p.x,terrainSurfaceHeight(p),p.z,TERRAIN_REGIONS.courtyard.yaw,space),center=terrainCaissonCenter();
    const offset=terrainCaissonLookOffset(pose.position,pose.target);expect(offset).toBeGreaterThan(0);expect(offset).toBeLessThan(MAX_EXPLORATION_LOOK);
    const camera=new THREE.PerspectiveCamera(48,16/9,.1,1400);camera.position.copy(pose.position);camera.lookAt(explorationLookTarget(pose.position,pose.target,offset));camera.updateMatrixWorld(true);
    const projected=center.clone().project(camera);expect(Math.abs(projected.x)).toBeLessThan(1e-6);expect(Math.abs(projected.y)).toBeLessThan(1e-6);
    // Clearance-padded camera proxies intentionally extend below the image;
    // optical visibility must be tested against actual triangles instead.
    const root=await actualModel();prepareTerrainCaisson(root,new THREE.Texture({width:767,height:766}));
    root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])material.side=THREE.DoubleSide;});
    const localEye=fromTerrainPoint('courtyard',pose.position),localCenter=fromTerrainPoint('courtyard',center);
    const eye=new THREE.Vector3(localEye.x,localEye.y,localEye.z),aim=new THREE.Vector3(localCenter.x,localCenter.y,localCenter.z);
    const hits=new THREE.Raycaster(eye,aim.sub(eye).normalize()).intersectObject(root,true);
    expect(hits[0]?.object.name).toBe(TERRAIN_CAISSON_CONFIG.centerPanel.nodeId);

  });
});
