import * as THREE from 'three';
import { DESERT_OASIS_PLACEMENTS, type OasisPlacement } from '../content/world/desert-oasis-layout-v013';
import modelCatalog from '../content/world/desert-oasis-models-v013.json';
import { oasisModelV013 } from '../content/world/desert-oasis-assets-v013';
import { environmentSurfaceHeight } from '../content/world/environment-layout-v001';
import { LAKE_WATER_LEVEL } from '../content/world/terrain-layout-v001';
import { ENVIRONMENT_SUN_DIRECTION } from './terrain-environment-lighting-v001';

// The offline packer places the mesh albedo above the matching directional field.
const variants = [...Object.keys(modelCatalog).filter(id => id !== '大树9'), 't02:gold','t02:bare','t03:gold','t03:bare'];
const indices = new Map(variants.map((name,index) => [name,index]));
export const routeAtlasColumns = 8;
export const routeAtlasTile = 64;
export const routeAtlasRows = Math.ceil(variants.length * 2 / routeAtlasColumns);
export function routeAtlasPanel(p: OasisPlacement, axis: number) {
  return (indices.get(p.id + ':' + p.tone) ?? indices.get(p.id)!) * 2 + axis;
}

const downX = -ENVIRONMENT_SUN_DIRECTION.x / ENVIRONMENT_SUN_DIRECTION.y;
const downZ = -ENVIRONMENT_SUN_DIRECTION.z / ENVIRONMENT_SUN_DIRECTION.y;
const run = Math.hypot(downX,downZ);
const acrossX = -downZ/run, acrossZ = downX/run;
const xSteps = 4, ySteps = 5;

// The renderer already owns the sampled terrain. Read those vertices so a distant
// shadow on the shoreline stays on exactly the same triangles as the visible sand.
// Desktop provides one regular grid; mobile provides smaller tiles of that grid.
function renderedGroundHeight(scene: THREE.Scene) {
  const tiles = scene.getObjectsByProperty('name','continuous-sand-heightfield').flatMap(object => {
    if (!(object instanceof THREE.Mesh) || !object.geometry.index) return [];
    const vertices = object.geometry.getAttribute('position') as THREE.BufferAttribute;
    // Terrain indices begin [top-left, bottom-left, top-right].
    const columns = object.geometry.index.getX(1);
    const rows = vertices.count / columns;
    if (columns < 2 || rows < 2 || !Number.isInteger(rows)) return [];
    return [{vertices,columns,rows,minX:vertices.getX(0),minZ:vertices.getZ(0),
      maxX:vertices.getX(columns-1),maxZ:vertices.getZ(vertices.count-1)}];
  });
  let tile = tiles[0];
  return (x: number, z: number) => {
    if (!tile || x<tile.minX || x>tile.maxX || z<tile.minZ || z>tile.maxZ) {
      tile = tiles.find(t => x>=t.minX && x<=t.maxX && z>=t.minZ && z<=t.maxZ)!;
    }
    if (!tile) return environmentSurfaceHeight(x,z);
    const {vertices,columns,rows} = tile;
    let col = 0, row = 0, end = columns-1;
    while (end-col>1) {
      const mid = (col+end)>>1;
      if (vertices.getX(mid)<=x) col=mid; else end=mid;
    }
    end=rows-1;
    while (end-row>1) {
      const mid = (row+end)>>1;
      if (vertices.getZ(mid*columns)<=z) row=mid; else end=mid;
    }
    const a=row*columns+col, b=a+columns, c=a+1, d=b+1;
    const u=(x-vertices.getX(a))/(vertices.getX(c)-vertices.getX(a));
    const v=(z-vertices.getZ(a))/(vertices.getZ(b)-vertices.getZ(a));
    if (u+v<=1) return vertices.getY(a)*(1-u-v)+vertices.getY(c)*u+vertices.getY(b)*v;
    return vertices.getY(d)*(u+v-1)+vertices.getY(b)*(1-u)+vertices.getY(c)*(1-v);
  };
}

/**
 * A distant tree outside real shadow coverage projects its own branch/leaf alpha
 * onto the terrain. The caller admits either this projection or the real caster.
 * The atlas belongs to the route layer and is shared without a second request.
 */
export function createOasisGroundShadowsV013(scene: THREE.Scene, atlas: THREE.Texture) {
  const positions: number[] = [], uvs: number[] = [], localUV: number[] = [];
  const faces: number[] = [], trees: number[] = [];
  const stride = xSteps*ySteps*6;
  const groundHeight = renderedGroundHeight(scene);
  DESERT_OASIS_PLACEMENTS.forEach((p,index) => {
    if (p.id === '大树9' || !/^(大树|t0[123]$|T0[23]_)/.test(p.id)) return;
    const asset = oasisModelV013(p.id), scale = p.height/asset.height;
    const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
    const alongX = acrossX*cos - acrossZ*sin;
    const alongZ = acrossX*sin + acrossZ*cos;
    // Use the view nearest to the sun and preserve asymmetry when the sun
    // sees its reverse. The projected crown widens to its rotated footprint.
    const axis = Math.abs(alongX) >= Math.abs(alongZ) ? 0 : 1;
    const flip = (axis === 0 ? alongX : alongZ) < 0;
    const panel = routeAtlasPanel(p,axis);
    const width = scale*Math.hypot(asset.width*alongX,asset.depth*alongZ);
    const start = positions.length/3;
    const base = groundHeight(p.x,p.z) - p.burial;
    trees.push(index);
    for (let y=0; y<=ySteps; y++) {
      const v = y/ySteps;
      for (let x=0; x<=xSteps; x++) {
        const u = x/xSteps;
        const side = (u-.5)*width;
        const rootX = p.x + acrossX*side, rootZ = p.z + acrossZ*side;
        const elevation = base + v*p.height;
        let drop = v*p.height;
        // Adjust the 30° projection for a slope or a sunken bank underneath it.
        for (let step=0; step<2; step++) {
          drop = THREE.MathUtils.clamp(elevation - groundHeight(rootX+downX*drop,rootZ+downZ*drop),0,p.height*1.7);
        }
        const wx = rootX+downX*drop, wz = rootZ+downZ*drop;
        positions.push(wx,groundHeight(wx,wz)+.024,wz);
        localUV.push(u,v);
        const half = .5/routeAtlasTile;
        const imageU = flip ? 1-u : u;
        uvs.push((panel%routeAtlasColumns + half + imageU*(1-2*half))/routeAtlasColumns,
          1 - (Math.floor(panel/routeAtlasColumns)+half+(1-v)*(1-2*half))/(routeAtlasRows*2));
        if (x<xSteps && y<ySteps) {
          const a = start + y*(xSteps+1)+x, b = a+xSteps+1;
          faces.push(a,b,a+1,a+1,b,b+1);
        }
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('shadowUV',new THREE.Float32BufferAttribute(localUV,2));
  const allFaces = new Uint16Array(faces);
  const active = new Uint16Array(allFaces.length);
  const drawIndices = new THREE.BufferAttribute(active,1).setUsage(THREE.DynamicDrawUsage);
  geometry.setIndex(drawIndices);
  geometry.setDrawRange(0,0);
  const material = new THREE.MeshBasicMaterial({
    map:atlas,color:'#4e412f',opacity:.39,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:THREE.DoubleSide,
    forceSinglePass:true,
  });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute vec2 shadowUV; varying vec2 vShadowUV; varying float vShadowGround;\n' +
      shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvShadowUV = shadowUV; vShadowGround = position.y;');
    shader.fragmentShader = 'varying vec2 vShadowUV; varying float vShadowGround;\n' +
      shader.fragmentShader.replace('#include <map_fragment>', `
        float silhouette = texture2D(map,vMapUv).a;
        float foot = 1. - smoothstep(0.,1.,length((vShadowUV-vec2(.5,.025))*vec2(10.,15.)));
        diffuseColor.a *= max(silhouette*.80,foot*.86)
          * smoothstep(${(LAKE_WATER_LEVEL+.028).toFixed(3)},${(LAKE_WATER_LEVEL+.14).toFixed(3)},vShadowGround);
      `);
  };
  material.customProgramCacheKey = () => 'oasis-distant-ground-projection-v013';
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name = 'desert-oasis-distant-tree-shadows-v013';
  mesh.raycast = () => {};
  mesh.visible = false;
  scene.add(mesh);
  const visible = new Uint8Array(trees.length);
  return {
    present(isVisible: (placementIndex: number) => boolean) {
      let changed = false;
      for (let i=0; i<trees.length; i++) {
        const show = Number(isVisible(trees[i]));
        changed ||= show !== visible[i];
        visible[i] = show;
      }
      if (!changed) return;
      let length = 0;
      for (let i=0; i<trees.length; i++) if (visible[i]) {
        active.set(allFaces.subarray(i*stride,(i+1)*stride),length);
        length += stride;
      }
      geometry.setDrawRange(0,length);
      drawIndices.needsUpdate = true;
      mesh.visible = length>0;
    },
    cost() {
      return { draws: Number(mesh.visible), triangles: geometry.drawRange.count/3 };
    },
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
