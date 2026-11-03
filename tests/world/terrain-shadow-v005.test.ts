import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {prepareTerrainCourtyardShadows,terrainShadowPlacement,updateTerrainSunShadow} from '../../src/world/terrain-shadow-v005';

function sun(extent:number){
  const light=new THREE.DirectionalLight(0xffffff,2.4);
  light.castShadow=true;light.shadow.mapSize.set(2048,2048);
  Object.assign(light.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:180});
  light.shadow.camera.updateProjectionMatrix();
  return light;
}
function shadowPixel(light:THREE.DirectionalLight,point:THREE.Vector3){
  light.updateMatrixWorld();light.target.updateMatrixWorld();light.shadow.updateMatrices(light);
  const p=point.clone().applyMatrix4(light.shadow.matrix);
  return new THREE.Vector2(p.x*light.shadow.mapSize.x,p.y*light.shadow.mapSize.y);
}
const fractionalDistance=(value:number)=>Math.abs(value-Math.round(value));

describe('terrain sun shadow image-plane stabilization v005',()=>{
  it.each([[65,2],[95,3]])('retains the actual shadow pixel phase while walking on sloping ground at extent %sm',(extent,scale)=>{
    const light=sun(extent),offset=new THREE.Vector3(-14,35,22).multiplyScalar(scale);
    const points=[new THREE.Vector3(110,15,-8),new THREE.Vector3(115,20,-18),new THREE.Vector3(104,12,2)];
    let previous:THREE.Vector2[]|undefined;
    for(let frame=0;frame<200;frame++){
      const focus=new THREE.Vector3(110+frame*.017,12+frame*.013,-8+Math.sin(frame*.07)*.5);
      updateTerrainSunShadow(light,focus,{extent,offset});
      const pixels=points.map(point=>shadowPixel(light,point));
      if(previous)for(let i=0;i<pixels.length;i++){
        expect(fractionalDistance(pixels[i].x-previous[i].x)).toBeLessThan(1e-8);
        expect(fractionalDistance(pixels[i].y-previous[i].y)).toBeLessThan(1e-8);
      }
      previous=pixels;
    }
  });

  it('detects the fractional drift left by the previous world-XZ grid and continuously changing ground height',()=>{
    const light=sun(65),point=new THREE.Vector3(110,15,-8),offset=new THREE.Vector3(-28,70,44);
    let previous:THREE.Vector2|undefined,maxDrift=0;
    for(let frame=0;frame<120;frame++){
      light.target.position.set(Math.round((110+frame*.017)*25.6)/25.6,12+frame*.013,Math.round(-8*25.6)/25.6);
      light.position.copy(light.target.position).add(offset);
      const pixel=shadowPixel(light,point);
      if(previous)maxDrift=Math.max(maxDrift,fractionalDistance(pixel.x-previous.x),fractionalDistance(pixel.y-previous.y));
      previous=pixel;
    }
    expect(maxDrift).toBeGreaterThan(.1);
  });

  it('uses the existing map dimensions and preserves the approved sun vector and requested focus depth',()=>{
    const focus=new THREE.Vector3(118.13,13.17,-4.53),offset=new THREE.Vector3(-28,70,44);
    const placement=terrainShadowPlacement(focus,offset,65,new THREE.Vector2(2048,1024));
    expect(placement.texelSize.x).toBe(130/2048);expect(placement.texelSize.y).toBe(130/1024);
    expect(placement.position.clone().sub(placement.target).distanceTo(offset)).toBeLessThan(1e-12);
    expect(placement.target.distanceTo(focus)).toBeLessThanOrEqual(placement.texelSize.length()/2+1e-12);
    expect(placement.target.clone().sub(focus).dot(offset.clone().normalize())).toBeCloseTo(0,12);
    expect(focus.toArray()).toEqual([118.13,13.17,-4.53]);expect(offset.toArray()).toEqual([-28,70,44]);
  });

  it('keeps a stationary surface on the same texel lattice after a large region or height change',()=>{
    const light=sun(65),offset=new THREE.Vector3(-28,70,44),point=new THREE.Vector3(112,15,-12);
    updateTerrainSunShadow(light,new THREE.Vector3(110,12,10),{extent:65,offset});
    const first=shadowPixel(light,point);
    updateTerrainSunShadow(light,new THREE.Vector3(185,2.5,15),{extent:65,offset});
    const next=shadowPixel(light,point);
    expect(fractionalDistance(next.x-first.x)).toBeLessThan(1e-8);
    expect(fractionalDistance(next.y-first.y)).toBeLessThan(1e-8);
  });

  it('updates the real shadow projection while retaining light intensity, map ownership and natural shadows',()=>{
    const light=sun(65),mapSize=light.shadow.mapSize,focus=new THREE.Vector3(330,10,90);
    const projection=light.shadow.camera.projectionMatrix.clone();
    updateTerrainSunShadow(light,focus,{extent:95,offset:new THREE.Vector3(-42,105,66),near:1,far:250,bias:-.0003,normalBias:.14});
    expect(light.shadow.camera.projectionMatrix.equals(projection)).toBe(false);
    expect(light.shadow.camera.left).toBe(-95);expect(light.shadow.camera.far).toBe(250);
    expect(light.shadow.bias).toBe(-.0003);expect(light.shadow.normalBias).toBe(.14);
    expect(light.intensity).toBe(2.4);expect(light.castShadow).toBe(true);
    expect(light.shadow.mapSize).toBe(mapSize);expect(mapSize.toArray()).toEqual([2048,2048]);
    expect(light.shadow.map).toBeNull();
  });
});

function modelMesh(geometry:THREE.BufferGeometry,material:THREE.Material,role:string,id:string){
  const mesh=new THREE.Mesh(geometry,material);
  mesh.userData={cameraRole:role,semanticGroup:id};mesh.castShadow=true;mesh.receiveShadow=true;
  return mesh;
}

describe('terrain courtyard physical shadow materials v005',()=>{
  it('retains natural shadows on closed walls and low floors without changing normal double-sided rendering',()=>{
    const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),root=new THREE.Group();
    const wall=modelMesh(new THREE.BoxGeometry(3,5,.6),material,'solid','hall-v003-rear-pier');
    const floor=modelMesh(new THREE.BoxGeometry(17,.28,17),material,'floor','hall-v003-platform');
    root.add(wall,floor);
    const report=prepareTerrainCourtyardShadows(root);
    expect(report).toEqual({closedMeshes:2,wallDecals:0,clonedMaterials:0});
    expect(material.side).toBe(THREE.DoubleSide);expect(material.shadowSide).toBe(THREE.BackSide);
    for(const mesh of [wall,floor]){expect(mesh.castShadow).toBe(true);expect(mesh.receiveShadow).toBe(true);}
    wall.geometry.dispose();floor.geometry.dispose();material.dispose();
  });

  it('removes only flat wall-art wafer casters and keeps their received shadows',()=>{
    const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),root=new THREE.Group();
    const mural=modelMesh(new THREE.PlaneGeometry(12.5,4.17),material,'decoration','hall-v003-lotus-mural');
    const border=modelMesh(new THREE.PlaneGeometry(3,.22),material,'decoration','hall-v003-front-beam-floral');
    root.add(mural,border);
    expect(prepareTerrainCourtyardShadows(root).wallDecals).toBe(2);
    for(const mesh of [mural,border]){expect(mesh.castShadow).toBe(false);expect(mesh.receiveShadow).toBe(true);}
    expect(material.shadowSide).toBeNull();
    mural.geometry.dispose();border.geometry.dispose();material.dispose();
  });

  it('recognizes the display art with its tilt baked into vertices, without flattening a closed thin board',()=>{
    const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),root=new THREE.Group();
    // The exported v004 art is a 10-degree tilted plane in source coordinates,
    // not an axis-aligned plane with an Object3D rotation.
    const artGeometry=new THREE.PlaneGeometry(.84,.84*214/248)
      .rotateY(-Math.PI/2).rotateZ(-Math.PI/18).translate(10.632766,.535039,-4.5);
    artGeometry.computeBoundingBox();
    const dimensions=artGeometry.boundingBox!.getSize(new THREE.Vector3());
    expect(Math.min(dimensions.x,dimensions.y,dimensions.z)).toBeGreaterThan(.12);
    const art=modelMesh(artGeometry,material,'decoration','hall-v003-pattern-display-art');
    const board=modelMesh(new THREE.BoxGeometry(.84,.84*214/248,.002)
      .rotateY(-Math.PI/2).rotateZ(-Math.PI/18),material,'decoration','hall-v003-display-art-backing');
    root.add(art,board);
    expect(prepareTerrainCourtyardShadows(root).wallDecals).toBe(1);
    expect(art.castShadow).toBe(false);expect(art.receiveShadow).toBe(true);
    expect(board.castShadow).toBe(true);expect(board.receiveShadow).toBe(true);
    art.geometry.dispose();board.geometry.dispose();material.dispose();
  });

  it('preserves cloth and roof planes and refuses to treat a thick open box as a closed volume',()=>{
    const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),root=new THREE.Group();
    const cloth=modelMesh(new THREE.PlaneGeometry(.9,2.5),material,'decoration','hall-v003-cloth-banner');
    const ceiling=modelMesh(new THREE.PlaneGeometry(16,16),material,'decoration','hall-v003-roof-lining-decoration');
    const openGeometry=new THREE.BoxGeometry(3,3,.2),indices=Array.from(openGeometry.index!.array).slice(6);openGeometry.setIndex(indices);
    const open=modelMesh(openGeometry,material,'solid','open-screen');
    const thinCloth=modelMesh(new THREE.BoxGeometry(.01,2.5,.9),material,'decoration','hall-v003-left-curtain');
    root.add(cloth,ceiling,open,thinCloth);
    expect(prepareTerrainCourtyardShadows(root)).toEqual({closedMeshes:0,wallDecals:0,clonedMaterials:0});
    for(const mesh of [cloth,ceiling,open,thinCloth])expect(mesh.castShadow).toBe(true);
    expect(material.shadowSide).toBeNull();
    for(const mesh of [cloth,ceiling,open,thinCloth])mesh.geometry.dispose();material.dispose();
  });

  it('isolates a material shared by a closed solid and cloth, with both variants owned by the original model',()=>{
    const texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,map:texture}),root=new THREE.Group();
    const wall=modelMesh(new THREE.BoxGeometry(3,5,.6),material,'solid','hall-v003-rear-pier');
    const cloth=modelMesh(new THREE.PlaneGeometry(.9,2.5),material,'decoration','hall-v003-banner');
    root.add(wall,cloth);
    expect(prepareTerrainCourtyardShadows(root)).toEqual({closedMeshes:1,wallDecals:0,clonedMaterials:1});
    expect(wall.material).not.toBe(material);expect(cloth.material).toBe(material);
    expect(wall.material.shadowSide).toBe(THREE.BackSide);expect(material.shadowSide).toBeNull();
    expect((wall.material as THREE.MeshStandardMaterial).map).toBe(texture);expect(wall.material.side).toBe(THREE.DoubleSide);
    // The existing releaseModel Set-based traversal can reach and release
    // both variants exactly once; the shared texture still has one owner.
    const owned=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();let releases=0;
    root.traverse(object=>{if(object instanceof THREE.Mesh)for(const item of Array.isArray(object.material)?object.material:[object.material]){owned.add(item);for(const value of Object.values(item))if(value instanceof THREE.Texture)textures.add(value);}});
    expect(owned.size).toBe(2);expect(textures.size).toBe(1);
    for(const item of owned)item.addEventListener('dispose',()=>releases++);
    expect(prepareTerrainCourtyardShadows(root).clonedMaterials).toBe(0);
    for(const item of owned)item.dispose();expect(releases).toBe(2);
    for(const item of textures)item.dispose();wall.geometry.dispose();cloth.geometry.dispose();
  });

  it('inherits multi-primitive glTF group semantics and keeps an existing non-caster disabled',()=>{
    const root=new THREE.Group(),part=new THREE.Group(),material=new THREE.MeshStandardMaterial();
    part.userData={cameraRole:'solid',semanticGroup:'hall-v003-solid-assembly'};
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,1,.6),material);mesh.castShadow=false;part.add(mesh);root.add(part);
    expect(prepareTerrainCourtyardShadows(root).closedMeshes).toBe(1);
    expect(mesh.material.shadowSide).toBe(THREE.BackSide);expect(mesh.castShadow).toBe(false);
    mesh.geometry.dispose();material.dispose();
  });

  it('keeps only the workbench double-sided when its wood is shared with a column',()=>{
    const root=new THREE.Group(),tableGroup=new THREE.Group(),material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});
    tableGroup.userData={cameraRole:'solid',semanticGroup:'hall-v003-workbench'};
    const table=new THREE.Mesh(new THREE.BoxGeometry(3.3,.18,1.4),material);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,.9,.16),material);
    table.castShadow=leg.castShadow=true;table.receiveShadow=leg.receiveShadow=true;
    tableGroup.add(table,leg);
    const column=modelMesh(new THREE.BoxGeometry(.78,5,.78),material,'solid','hall-v003-column-left-0-shaft');
    const other=modelMesh(new THREE.BoxGeometry(1,1,.6),material,'solid','hall-v003-workbench-other');
    root.add(tableGroup,column,other);
    expect(prepareTerrainCourtyardShadows(root)).toEqual({closedMeshes:2,wallDecals:0,clonedMaterials:1});
    expect(table.material).toBe(material);expect(leg.material).toBe(material);
    expect(material.side).toBe(THREE.DoubleSide);expect(material.shadowSide).toBeNull();
    expect(column.material).not.toBe(material);expect(column.material.shadowSide).toBe(THREE.BackSide);
    expect(other.material).toBe(column.material);
    for(const mesh of [table,leg,column,other]){expect(mesh.castShadow).toBe(true);expect(mesh.receiveShadow).toBe(true);}
    expect(prepareTerrainCourtyardShadows(root).clonedMaterials).toBe(0);
    const owned=new Set([table.material,leg.material,column.material,other.material]);
    expect(owned.size).toBe(2);
    for(const item of owned)item.dispose();
    for(const mesh of [table,leg,column,other])mesh.geometry.dispose();
  });
});
