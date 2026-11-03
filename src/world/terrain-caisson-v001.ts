import * as THREE from 'three';
import config from '../content/world/caisson-three-hares-v002.json';
import geometry from '../content/world/caisson-geometry-v002.json';
import {toTerrainPoint} from '../content/world/terrain-layout-v001';
import {MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK} from './exploration-look';
import {prepareTerrainCourtyardShadows} from './terrain-shadow-v005';

export const TERRAIN_CAISSON_CONFIG=config;
/** Source courtyard coordinates. The camera's existing region matrix then
 * applies exactly the same translation/yaw as the independent GLB root.
 */
export const TERRAIN_CAISSON_CAMERA_BOXES=geometry.cameraBoxes.map(box=>({
  id:box.id,
  min:[box.min[0]+config.sourcePlacement.x,box.min[1]+config.sourcePlacement.y,box.min[2]+config.sourcePlacement.z],
  max:[box.max[0]+config.sourcePlacement.x,box.max[1]+config.sourcePlacement.y,box.max[2]+config.sourcePlacement.z],
}));

/** Rotation is in radians around local Y; fit the complete rotated image. */
export function caissonArtSize(imageWidth:number,imageHeight:number,maximum=config.centerPanel.width,rotation=config.centerPanel.rotation){
  if(![imageWidth,imageHeight,maximum,rotation].every(Number.isFinite)||imageWidth<=0||imageHeight<=0||maximum<=0)throw new Error('caisson-image-size-invalid');
  const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  const scale=maximum/Math.max(imageWidth*c+imageHeight*s,imageWidth*s+imageHeight*c);
  return {width:imageWidth*scale,depth:imageHeight*scale,rotation};
}

export function terrainCaissonCenter(){
  const p=toTerrainPoint('courtyard',{x:config.sourcePlacement.x,y:config.sourcePlacement.y+config.centerPanel.faceHeight,z:config.sourcePlacement.z});
  return new THREE.Vector3(p.x,p.y,p.z);
}
/** Reuse the existing upward-look mechanism; no observation event is started. */
export function terrainCaissonLookOffset(eye:THREE.Vector3,target:THREE.Vector3){
  const center=terrainCaissonCenter(),base=target.clone().sub(eye),up=center.sub(eye);
  return THREE.MathUtils.clamp(Math.atan2(up.y,Math.hypot(up.x,up.z))-Math.atan2(base.y,Math.hypot(base.x,base.z)),MIN_EXPLORATION_LOOK,MAX_EXPLORATION_LOOK);
}

function closeImage(image:unknown){
  const closable=image as {close?:()=>void}|null;
  if(typeof closable?.close==='function')closable.close();
}
/** For a decoded texture that has not yet transferred into the model graph. */
export function releaseCaissonTexture(texture:THREE.Texture){texture.dispose();closeImage(texture.source.data);}

/** Matches glTF's unflipped UV convention. The signal also covers the decode
 * race: a bitmap delivered after unmount is closed before any GPU texture exists.
 */
export async function loadCaissonCenterTexture(url:URL|string,signal:AbortSignal):Promise<THREE.Texture>{
  let texture:THREE.Texture;
  if(typeof createImageBitmap==='function'){
    const response=await fetch(url,{signal});if(!response.ok)throw new Error('caisson-image-request-failed');
    const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
    if(signal.aborted){bitmap.close();throw new Error('caisson-image-load-cancelled');}
    texture=new THREE.Texture(bitmap);
  }else{
    texture=await new THREE.TextureLoader().loadAsync(String(url));
    if(signal.aborted){releaseCaissonTexture(texture);throw new Error('caisson-image-load-cancelled');}
  }
  texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;
  return texture;
}

function releaseReplacedMaterials(root:THREE.Object3D,replaced:readonly THREE.Material[]){
  const usedMaterials=new Set<THREE.Material>(),usedTextures=new Set<THREE.Texture>(),usedImages=new Set<unknown>();
  root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){usedMaterials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture){usedTextures.add(value);usedImages.add(value.source.data);}}});
  const orphanTextures=new Set<THREE.Texture>(),closedImages=new Set<unknown>();
  for(const material of new Set(replaced))if(!usedMaterials.has(material)){for(const value of Object.values(material))if(value instanceof THREE.Texture&&!usedTextures.has(value))orphanTextures.add(value);material.dispose();}
  for(const texture of orphanTextures){texture.dispose();if(!usedImages.has(texture.source.data)&&!closedImages.has(texture.source.data)){closeImage(texture.source.data);closedImages.add(texture.source.data);}}
}

/** Loaded GLB and replacement texture transfer to the existing releaseModel
 * owner. Only the independent image face is fitted; its square wood backing,
 * structural geometry and complete 0–1 UVs remain intact.
 */
export function prepareTerrainCaisson(root:THREE.Object3D,texture:THREE.Texture){
  const panel=root.getObjectByName(config.centerPanel.nodeId);
  if(!panel)throw new Error('caisson-center-node-missing');
  const faces:THREE.Mesh[]=[];
  panel.traverse(object=>{if(object instanceof THREE.Mesh)faces.push(object);});
  if(faces.length!==1)throw new Error('caisson-center-must-be-independent');
  const face=faces[0],originals=Array.isArray(face.material)?face.material:[face.material];
  if(!originals.every(material=>material.name===config.centerPanel.materialId&&(material instanceof THREE.MeshStandardMaterial||material instanceof THREE.MeshBasicMaterial)))throw new Error('caisson-center-material-missing');
  const image=texture.source.data as {width?:number;height?:number};
  const fitted=caissonArtSize(image?.width??0,image?.height??0);
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),position=face.geometry.getAttribute('position'),bounds=new THREE.Box3();
  for(let i=0;i<position.count;i++)bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(face.matrixWorld).applyMatrix4(inverse));
  const size=bounds.getSize(new THREE.Vector3());
  if(size.x<=0||size.z<=0||size.y>1e-4)throw new Error('caisson-center-plane-invalid');
  const wrapper=new THREE.Group();wrapper.name='three-hares-caisson-fitted-art';wrapper.position.copy(bounds.getCenter(new THREE.Vector3()));root.add(wrapper);wrapper.attach(panel);
  wrapper.scale.set(fitted.width/size.x,1,fitted.depth/size.z);wrapper.rotation.y=fitted.rotation;
  const replacements=originals.map(material=>{const copy=material.clone() as THREE.MeshStandardMaterial|THREE.MeshBasicMaterial;copy.map=texture;copy.needsUpdate=true;return copy;});
  face.material=Array.isArray(face.material)?replacements:replacements[0];
  root.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});
  face.castShadow=false;
  const shadows=prepareTerrainCourtyardShadows(root);
  releaseReplacedMaterials(root,originals);
  // The existing sun illuminates the roof from above. Four bounded upward
  // lights approximate diffuse courtyard/floor bounce on this recessed soffit;
  // their cones never illuminate the floor or the traveler below them. These
  // soft fill lights intentionally have no extra real-time shadow maps.
  for(const x of [-4.4,4.4])for(const z of [-4.4,4.4]){
    const light=new THREE.SpotLight(0xfff1d9,32,14,1.35,.15,2);
    light.name=`three-hares-caisson-bounce-${x}-${z}`;
    light.position.set(x,-1.35,z);light.target.position.set(x,3.5,z);
    light.castShadow=false;root.add(light,light.target);
  }
  root.position.set(config.sourcePlacement.x,config.sourcePlacement.y,config.sourcePlacement.z);
  root.updateWorldMatrix(true,true);
  return {asset:config.asset,sourcePlacement:{...config.sourcePlacement},cameraBoxes:TERRAIN_CAISSON_CAMERA_BOXES.length,shadows,
    centerPanel:{nodeId:config.centerPanel.nodeId,materialId:config.centerPanel.materialId,texture:config.centerPanel.texture,imageWidth:image.width,imageHeight:image.height,...fitted}};
}
