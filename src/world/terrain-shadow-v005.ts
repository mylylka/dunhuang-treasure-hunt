import * as THREE from 'three';

export interface TerrainShadowPlacement {
  target:THREE.Vector3;
  position:THREE.Vector3;
  texelSize:THREE.Vector2;
}

/** Snap the orthographic image plane, whose axes differ from world X/Z.
 * Quantizing world X/Z (or ignoring a moving focus height) leaves fractional
 * shadow pixels on stationary walls. The unchanged depth component keeps the
 * requested near/far coverage centered on the terrain beneath the traveler.
 */
export function terrainShadowPlacement(
  focus:THREE.Vector3,offset:THREE.Vector3,extent:number,mapSize:THREE.Vector2,
):TerrainShadowPlacement {
  const orientation=new THREE.Matrix4().lookAt(offset,new THREE.Vector3(),new THREE.Vector3(0,1,0));
  const right=new THREE.Vector3().setFromMatrixColumn(orientation,0),up=new THREE.Vector3().setFromMatrixColumn(orientation,1);
  const texelSize=new THREE.Vector2(2*extent/mapSize.x,2*extent/mapSize.y);
  const horizontal=focus.dot(right),vertical=focus.dot(up);
  const target=focus.clone()
    .addScaledVector(right,Math.round(horizontal/texelSize.x)*texelSize.x-horizontal)
    .addScaledVector(up,Math.round(vertical/texelSize.y)*texelSize.y-vertical);
  return {target,position:target.clone().add(offset),texelSize};
}

export interface TerrainSunShadowOptions {
  extent:number;
  /** Vector from the focus to the light; retain the approved sun direction. */
  offset:THREE.Vector3;
  near?:number;
  far?:number;
  bias?:number;
  normalBias?:number;
}

/** World-space light and target must be direct children of the scene.
 * No maps, materials or lights are allocated; their existing owner still
 * controls quality, intensity, rendering and disposal.
 */
export function updateTerrainSunShadow(
  light:THREE.DirectionalLight,focus:THREE.Vector3,options:TerrainSunShadowOptions,
):TerrainShadowPlacement {
  const placement=terrainShadowPlacement(focus,options.offset,options.extent,light.shadow.mapSize);
  light.target.position.copy(placement.target);light.position.copy(placement.position);
  const camera=light.shadow.camera,extent=options.extent;
  const near=options.near??camera.near,far=options.far??camera.far;
  if(camera.left!==-extent||camera.right!==extent||camera.top!==extent||camera.bottom!==-extent||camera.near!==near||camera.far!==far){
    Object.assign(camera,{left:-extent,right:extent,top:extent,bottom:-extent,near,far});
    camera.updateProjectionMatrix();
  }
  if(options.bias!==undefined)light.shadow.bias=options.bias;
  if(options.normalBias!==undefined)light.shadow.normalBias=options.normalBias;
  return placement;
}

export interface TerrainShadowMaterialReport {
  closedMeshes:number;
  wallDecals:number;
  clonedMaterials:number;
}

/** glTF splits vertices at normal/UV seams. Weld their positions before
 * counting edges so a closed box is not mistaken for six unrelated planes.
 */
function closedGeometry(geometry:THREE.BufferGeometry):boolean {
  const positions=geometry.getAttribute('position');
  if(!positions)return false;
  const vertices=new Map<string,number>(),welded:number[]=[];
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(value=>Math.round(value*1e5)).join(',');
    let id=vertices.get(key);if(id===undefined){id=vertices.size;vertices.set(key,id);}welded.push(id);
  }
  const edges=new Map<string,number>(),index=geometry.index,count=index?.count??positions.count;
  for(let i=0;i+2<count;i+=3){
    const triangle=[0,1,2].map(axis=>welded[index?index.getX(i+axis):i+axis]);
    if(new Set(triangle).size<3)continue;
    for(let edge=0;edge<3;edge++){
      const a=triangle[edge],b=triangle[(edge+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
      edges.set(key,(edges.get(key)??0)+1);
    }
  }
  return edges.size>0&&[...edges.values()].every(count=>count===2);
}

/** A baked tilt gives a flat glTF decal three non-zero AABB dimensions.
 * Test its actual plane instead, using a wide baseline to tolerate Float32
 * export rounding. Closed geometry is excluded separately before this test.
 */
function planarGeometry(geometry:THREE.BufferGeometry):boolean {
  const positions=geometry.getAttribute('position');
  if(!positions||positions.count<3)return false;
  const origin=new THREE.Vector3().fromBufferAttribute(positions,0);
  const point=new THREE.Vector3(),baseline=new THREE.Vector3(),normal=new THREE.Vector3(),cross=new THREE.Vector3();
  let longest=0;
  for(let i=1;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).sub(origin);
    if(point.lengthSq()>longest){longest=point.lengthSq();baseline.copy(point);}
  }
  if(longest<=1e-12)return false;
  baseline.normalize();
  let widest=0;
  for(let i=1;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).sub(origin);cross.crossVectors(baseline,point);
    if(cross.lengthSq()>widest){widest=cross.lengthSq();normal.copy(cross);}
  }
  if(widest<=1e-12)return false;
  normal.normalize();
  for(let i=1;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).sub(origin);
    if(Math.abs(point.dot(normal))>1e-5)return false;
  }
  return true;
}

function meshSemantics(mesh:THREE.Mesh,root:THREE.Object3D){
  // Multi-material glTF nodes can be Groups with their metadata on the parent.
  for(let owner:THREE.Object3D|null=mesh;owner&&owner!==root.parent;owner=owner.parent){
    if(owner.userData.cameraRole)return {role:String(owner.userData.cameraRole),id:String(owner.userData.semanticGroup??owner.name)};
  }
  return {role:'',id:mesh.name};
}

/** Keep normal rendering double-sided. Only closed solid/floor volumes cast
 * their back faces, following Three's usual opaque FrontSide shadow policy.
 * The workbench alone keeps its authored double-sided caster behavior so its
 * thin legs retain contact shadows. Wall-attached zero-thickness art receives
 * architecture shadows without
 * adding an unphysical floating wafer caster. Cloth and roof planes retain
 * their existing casting, even when tagged as decoration.
 *
 * The model must own its materials. A shared material is cloned only when its
 * users need different shadow sides; both original and clone remain reachable
 * from this model, so the existing releaseModel traversal releases each once.
 */
export function prepareTerrainCourtyardShadows(root:THREE.Object3D):TerrainShadowMaterialReport {
  root.updateMatrixWorld(true);
  const report:TerrainShadowMaterialReport={closedMeshes:0,wallDecals:0,clonedMaterials:0};
  const closed=new Map<THREE.BufferGeometry,boolean>();
  const entries:{mesh:THREE.Mesh;materials:THREE.Material[];back:boolean}[]=[];
  const materialUses=new Map<THREE.Material,{back:boolean;other:boolean}>();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const {role,id}=meshSemantics(object,root),geometry=object.geometry;
    if(!geometry.boundingBox)geometry.computeBoundingBox();
    const dimensions=geometry.boundingBox?.getSize(new THREE.Vector3()).multiply(new THREE.Vector3().setFromMatrixScale(object.matrixWorld));
    const thickness=dimensions?Math.min(dimensions.x,dimensions.y,dimensions.z):0;
    const wallArt=role==='decoration'&&/(?:mural|art|floral|decoration)/.test(id)&&!/(?:caisson|cloth|curtain|banner|ceiling|roof|lining)/.test(id);
    if(wallArt){
      if(!closed.has(geometry))closed.set(geometry,closedGeometry(geometry));
      if(!closed.get(geometry)&&planarGeometry(geometry)){object.castShadow=false;report.wallDecals++;}
    }
    let back=false;
    if((role==='solid'||role==='floor')&&id!=='hall-v003-workbench'&&thickness>1e-5){
      if(!closed.has(geometry))closed.set(geometry,closedGeometry(geometry));
      back=closed.get(geometry)!;
    }
    if(back)report.closedMeshes++;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    entries.push({mesh:object,materials,back});
    for(const material of materials){
      let uses=materialUses.get(material);if(!uses){uses={back:false,other:false};materialUses.set(material,uses);}
      if(back)uses.back=true;else uses.other=true;
    }
  });
  const variants=new Map<THREE.Material,THREE.Material>();
  for(const [material,uses]of materialUses){
    if(!uses.back||material.shadowSide===THREE.BackSide)continue;
    const variant=uses.other?material.clone():material;
    variant.shadowSide=THREE.BackSide;
    variants.set(material,variant);if(variant!==material)report.clonedMaterials++;
  }
  for(const {mesh,materials,back}of entries){
    if(!back)continue;
    const mapped=materials.map(material=>variants.get(material)??material);
    mesh.material=Array.isArray(mesh.material)?mapped:mapped[0];
  }
  return report;
}
