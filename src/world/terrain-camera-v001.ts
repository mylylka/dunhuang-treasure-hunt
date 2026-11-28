import * as THREE from 'three';
import { OASIS_OBSTACLES } from './desert-oasis-obstacles-v013';
import { isReplacedCourtyardRock } from '../content/world/courtyard-rock-refinement-v001';
import { CAMERA_CLEARANCE, COURTYARD_CAMERA_BOXES, followCameraPose, settleFollowCamera, type CameraSpace } from './camera';
import { MOGAO_SOLIDS } from './mogao-rules-v008';
import { mogaoCameraSpace, mogaoFollowPose, settleStairCamera } from './mogao-camera-v011';
import { musicCameraSpaceV4 } from './music-pavilion-v004';
import { MUSIC_LAYOUT_V4, musicPavilionCameraColliderTop } from './music-pavilion-rules-v004';
import { TERRAIN_REGIONS, TERRAIN_SCENERY_SOURCE_OVERRIDES, terrainCourtyardPartTransform, type TerrainRegion } from '../content/world/terrain-layout-v001';
import { TERRAIN_TOWER_TREES } from '../content/world/terrain-trees-v001';
import { CONNECTED_DESERT_VEGETATION } from '../content/world/desert-vegetation';
import { MUSIC_COURTYARD_TREE } from '../content/world/music-courtyard-tree-v001';
import {retiredCourtyardHallCameraBox,TERRAIN_FIRST_GALLERY_HALL_CAMERA_BOXES,TERRAIN_HALL_CAMERA_BOXES,TERRAIN_HALL_GEOMETRY} from './terrain-hall-v003';
import {TERRAIN_CAISSON_CAMERA_BOXES} from './terrain-caisson-v001';
import { PATTERN_STATIONS } from './pattern-interactives';
import { CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS } from './caisson-only-props';
import {
  toTerrainPoint, fromTerrainPoint, terrainRegionAt, terrainSurfaceHeight, isRetiredConnectedVegetation,
  TERRAIN_PLAYER_COLLIDERS, TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS, TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS,
  CONNECTED_TERRAIN_PLAYER_COLLIDERS, COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS,
  TERRAIN_COURTYARD_LOCAL_COLLIDERS, TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS, TERRAIN_MUSIC_LOCAL_SOLIDS,
} from './terrain-rules-v001';

export function terrainVector(region: TerrainRegion, point: THREE.Vector3, inverse = false) {
  const p = (inverse ? fromTerrainPoint : toTerrainPoint)(region, point);
  return new THREE.Vector3(p.x, p.y, p.z);
}
export function terrainPose(region: TerrainRegion, pose: { position: THREE.Vector3; target: THREE.Vector3 }) {
  return { position: terrainVector(region, pose.position), target: terrainVector(region, pose.target) };
}
function mappedBox(region: TerrainRegion, box: THREE.Box3) {
  const result = new THREE.Box3();
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    result.expandByPoint(terrainVector(region, new THREE.Vector3(x, y, z)));
  }
  return result;
}
const legacyMusicSpace = musicCameraSpaceV4(), legacyCliffSpace = mogaoCameraSpace();
const solidBox=(s:{minX:number;maxX:number;minZ:number;maxZ:number;height:number})=>new THREE.Box3(new THREE.Vector3(s.minX,-.2,s.minZ),new THREE.Vector3(s.maxX,s.height,s.maxZ)).expandByScalar(CAMERA_CLEARANCE);
const definitionBox=(b:{min:number[];max:number[]})=>new THREE.Box3(new THREE.Vector3(...b.min as [number,number,number]),new THREE.Vector3(...b.max as [number,number,number])).expandByScalar(CAMERA_CLEARANCE);
function musicCourtyardCameraSpace(openBalcony: boolean, connected = false): CameraSpace {
  const includeCourtyardTree = !connected || CONNECTED_DESERT_VEGETATION;
  return {
    ...legacyMusicSpace,
    boxes: [
      ...TERRAIN_MUSIC_LOCAL_SOLIDS.filter(s => !s.circle && (!connected || !isRetiredConnectedVegetation(s.id))).map(s => solidBox({ ...s, height: musicPavilionCameraColliderTop(s, openBalcony) })),
      ...MUSIC_LAYOUT_V4.cameraBoxes.map(definitionBox),
      ...(includeCourtyardTree ? [definitionBox({
        min: [...MUSIC_COURTYARD_TREE.trunkBounds.min], max: [...MUSIC_COURTYARD_TREE.trunkBounds.max],
      })] : []),
    ],
    cylinders: legacyMusicSpace.cylinders.filter(s => s.id.startsWith('music-')).map(s => ({ ...s, ...TERRAIN_SCENERY_SOURCE_OVERRIDES.music?.[s.id] })),
  };
}
const musicSpace = musicCourtyardCameraSpace(false);
const openMusicSpace = musicCourtyardCameraSpace(true);
const courtyardPerimeterBoxes=COURTYARD_CAMERA_BOXES.filter(box=>!retiredCourtyardHallCameraBox(box.id)).map(box=>{
  const transform=terrainCourtyardPartTransform(box.id,(box.min[0]+box.max[0])/2);
  return transform?{...box,min:[box.min[0]*transform.scaleX+transform.offsetX,...box.min.slice(1)],max:[box.max[0]*transform.scaleX+transform.offsetX,...box.max.slice(1)]}:box;
});
export const TERRAIN_COURTYARD_CAMERA_BOXES=[...courtyardPerimeterBoxes,...TERRAIN_HALL_CAMERA_BOXES];
const hall=TERRAIN_HALL_GEOMETRY.hall;
function courtyardCameraSpace(solids: typeof TERRAIN_COURTYARD_LOCAL_COLLIDERS, boxes: typeof TERRAIN_COURTYARD_CAMERA_BOXES): CameraSpace {
  return {
    subjectHeight: .65,
    shelters: [[hall.minX, hall.maxX, hall.minZ, hall.maxZ]],
    boxes: [...solids.filter(s => !s.circle).map(solidBox), ...boxes.map(definitionBox)],
    cylinders: solids.flatMap(s => s.circle ? [{ ...s.circle, ...TERRAIN_SCENERY_SOURCE_OVERRIDES.courtyard?.[s.id ?? ''], id: s.id ?? 'courtyard-prop', minY: -.2, maxY: s.height }] : []),
  };
}
const courtyardSpace = courtyardCameraSpace(TERRAIN_COURTYARD_LOCAL_COLLIDERS, TERRAIN_COURTYARD_CAMERA_BOXES);
const firstGalleryCameraBoxes = [...courtyardPerimeterBoxes, ...TERRAIN_FIRST_GALLERY_HALL_CAMERA_BOXES];
const firstGalleryCourtyardSpace = courtyardCameraSpace(TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS, firstGalleryCameraBoxes);
const caissonOnlyCourtyardSpace = courtyardCameraSpace(
  TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS.filter(solid => !CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS.has(solid.id ?? '')),
  firstGalleryCameraBoxes.filter(box => !CAISSON_ONLY_HIDDEN_COURTYARD_OBJECTS.has(box.id)),
);
const connectedCourtyardSolids = TERRAIN_FIRST_GALLERY_COURTYARD_LOCAL_COLLIDERS.filter(solid => !isRetiredConnectedVegetation(solid.id));
const connectedCourtyardBoxes = firstGalleryCameraBoxes.filter(box => !isRetiredConnectedVegetation(box.id));
const connectedCourtyardSpace = courtyardCameraSpace(connectedCourtyardSolids, connectedCourtyardBoxes);
const composedCourtyardSpace = courtyardCameraSpace(
  connectedCourtyardSolids.filter(solid => !isReplacedCourtyardRock(solid.id)), connectedCourtyardBoxes,
);
function selectCourtyardSpace(firstGallery: boolean, connected: boolean, composed: boolean, caissonOnly: boolean) {
  if (caissonOnly) return caissonOnlyCourtyardSpace;
  if (!firstGallery) return courtyardSpace;
  if (!connected) return firstGalleryCourtyardSpace;
  return composed ? composedCourtyardSpace : connectedCourtyardSpace;
}
// Each local region keeps only its own geometry. The retired route dune and
// the other two buildings must never shorten a camera in this new layout.
const localSpace:CameraSpace={subjectHeight:.65,boxes:legacyCliffSpace.boxes.slice(legacyMusicSpace.boxes.length),cylinders:MOGAO_SOLIDS.flatMap(s=>s.circle?[{...s.circle,id:s.id!,minY:-.2,maxY:s.height}]:[])};
const withoutRetiredVegetation = (space: CameraSpace): CameraSpace => ({
  ...space, cylinders: space.cylinders.filter(cylinder => !isRetiredConnectedVegetation(cylinder.id)),
});
const connectedMusicSpace = withoutRetiredVegetation(musicCourtyardCameraSpace(false, true));
const connectedOpenMusicSpace = withoutRetiredVegetation(musicCourtyardCameraSpace(true, true));
const connectedCliffSpace = withoutRetiredVegetation(localSpace);
export function terrainCameraSpace(includeCaisson=false, firstGallery=false, openMusicBalcony=false,
  connected=false, composedCourtyard=false, caissonOnly=false): CameraSpace {
  const orientedBoxes:NonNullable<CameraSpace['orientedBoxes']>[number][]=[];
  const courtyard = selectCourtyardSpace(firstGallery, connected, composedCourtyard, caissonOnly);
  const currentMusic = connected
    ? (openMusicBalcony ? connectedOpenMusicSpace : connectedMusicSpace)
    : (openMusicBalcony ? openMusicSpace : musicSpace);
  const currentCourtyard = includeCaisson ? { ...courtyard, boxes: [...courtyard.boxes, ...TERRAIN_CAISSON_CAMERA_BOXES.map(definitionBox)] } : courtyard;
  for(const [region,source] of [['courtyard',currentCourtyard],['music',currentMusic],['cliff',connected ? connectedCliffSpace : localSpace]] as const){
    const zero=toTerrainPoint(region,{x:0,y:0,z:0});
    const inverse=new THREE.Matrix4().makeRotationY(TERRAIN_REGIONS[region].yaw).setPosition(zero.x,zero.y,zero.z).invert();
    for(const bounds of source.boxes)orientedBoxes.push({bounds,inverse});
  }
  for (const { position, yaw, halfWidth, halfDepth, height } of PATTERN_STATIONS) {
    const origin = toTerrainPoint('courtyard', position);
    const inverse = new THREE.Matrix4().makeRotationY(TERRAIN_REGIONS.courtyard.yaw + yaw)
      .setPosition(origin.x, origin.y, origin.z).invert();
    const bounds = new THREE.Box3(new THREE.Vector3(-halfWidth, 0, -halfDepth),
      new THREE.Vector3(halfWidth, height, halfDepth)).expandByScalar(CAMERA_CLEARANCE);
    orientedBoxes.push({ bounds, inverse });
  }
  const connectedColliders = composedCourtyard ? COMPOSED_CONNECTED_TERRAIN_PLAYER_COLLIDERS : CONNECTED_TERRAIN_PLAYER_COLLIDERS;
  const firstGalleryColliders = firstGallery ? TERRAIN_FIRST_GALLERY_PLAYER_COLLIDERS : TERRAIN_PLAYER_COLLIDERS;
  const solids = caissonOnly ? TERRAIN_CAISSON_ONLY_PLAYER_COLLIDERS : connected ? connectedColliders : firstGalleryColliders;
  const grove = !caissonOnly && connected && composedCourtyard ? OASIS_OBSTACLES.map(item => {
    const ground = terrainSurfaceHeight(item.circle);
    return { ...item.circle, id: item.id!, minY: ground - .2, maxY: ground + item.height };
  }) : [];
  return { boxes:[],orientedBoxes,subjectHeight:.65,cylinders:solids.flatMap(s=>s.circle?[{
    ...s.circle,radius:TERRAIN_TOWER_TREES.find(tree=>tree.id===s.id)?.collisionRadii.camera??s.circle.radius,
    id:s.id??'terrain-prop',minY:terrainSurfaceHeight(s.circle)-.2,maxY:s.height,
  }]:[]).concat(grove) };
}

/** Terrain is checked along the whole sight arm, including after camera easing. */
export function clearTerrainCamera(target: THREE.Vector3, eye: THREE.Vector3) {
  const candidate = eye.clone();
  candidate.y = Math.max(candidate.y, terrainSurfaceHeight(candidate) + .32);
  const length = target.distanceTo(candidate), steps = Math.max(1, Math.ceil(length / .24));
  for (let i = 1; i <= steps; i++) {
    const sample = target.clone().lerp(candidate, i / steps);
    if (sample.y < terrainSurfaceHeight(sample) + .24) return target.clone().lerp(candidate, Math.max(0, (i - 1) / steps));
  }
  return candidate;
}

export function terrainFollowPose(x: number, y: number, z: number, yaw: number, space: CameraSpace,
  firstGallery = false, openMusicBalcony = false, connected = false, composedCourtyard = false, caissonOnly = false) {
  const region = terrainRegionAt({ x, z });
  let pose: { position: THREE.Vector3; target: THREE.Vector3 };
  if (region) {
    const p = fromTerrainPoint(region, { x, y, z }), localYaw = yaw - TERRAIN_REGIONS[region].yaw;
    const musicCamera = connected
      ? (openMusicBalcony ? connectedOpenMusicSpace : connectedMusicSpace)
      : (openMusicBalcony ? openMusicSpace : musicSpace);
    const courtyardCamera = selectCourtyardSpace(firstGallery, connected, composedCourtyard, caissonOnly);
    const groundCamera = region === 'music' ? musicCamera : courtyardCamera;
    const original = region === 'cliff'
      ? mogaoFollowPose(p.x, p.y, p.z, localYaw, connected ? connectedCliffSpace : localSpace)
      : followCameraPose(p.x, p.y, p.z, localYaw, groundCamera);
    pose = terrainPose(region, original);
  } else {
    const target = new THREE.Vector3(x, y + 1.8, z);
    pose = { target, position: target.clone().add(new THREE.Vector3(Math.sin(yaw) * 8.5, 2.7, Math.cos(yaw) * 8.5)) };
  }
  pose.position = settleTerrainCamera(pose.target, pose.position, pose.position, space, new THREE.Vector3(x, y + .65, z), region === 'cliff');
  return pose;
}
export function settleTerrainCamera(target: THREE.Vector3, eye: THREE.Vector3, desired: THREE.Vector3, space: CameraSpace, subject: THREE.Vector3, stairs = false) {
  const settle = stairs ? settleStairCamera : settleFollowCamera;
  let safe = settle(target, eye, desired, space, subject);
  safe = clearTerrainCamera(target, safe);
  return settle(target, safe, safe, space, subject);
}

/** A temporary local camera preserves the existing projected Buddha-gaze rule. */
export function terrainLocalCamera(camera: THREE.PerspectiveCamera, region: TerrainRegion) {
  const local = camera.clone();
  local.position.copy(terrainVector(region, camera.position, true));
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const target = terrainVector(region, camera.position.clone().add(forward), true);
  local.lookAt(target); local.updateMatrixWorld(true);
  return local;
}

export const TERRAIN_OVERVIEW = {
  position: new THREE.Vector3(246, 210, 300), target: new THREE.Vector3(244, 17, 30),
};

/** The expanded landscape needs its own framing; older previews keep their view. */
export const ENVIRONMENT_OVERVIEW = {
  position:new THREE.Vector3(410,390,650),target:new THREE.Vector3(350,30,75),
};
