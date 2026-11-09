import * as THREE from 'three';
import {worldAssetUrl} from '../content/world/assets';
import {BACTRIAN_CARAVANS, BACTRIAN_SPRITE} from '../content/world/bactrian-caravans-v001';
import {environmentSurfaceHeight} from '../content/world/environment-layout-v001';

interface CamelPlacement {
  id: string;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  width: number;
  height: number;
  slope: number;
}

/** Fixed, alpha-cut scenic silhouettes. Unlike billboards these never rotate with
 * the player, so the sun can bake their real cutout shadows once during loading.
 */
export function createBactrianCaravans() {
  const root = new THREE.Group();
  root.name = 'bactrian-caravans-v001';
  const abort = new AbortController();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const placements: CamelPlacement[] = [];
  let disposed = false, loaded = false;
  let bitmap: ImageBitmap | null = null;
  let texture: THREE.Texture | null = null;
  const bounds = BACTRIAN_SPRITE.alphaBounds;
  const aspect = (bounds.right - bounds.left) / (bounds.bottom - bounds.top);

  function makeCamel(p: CamelPlacement, material: THREE.MeshStandardMaterial, depth: THREE.MeshDepthMaterial) {
    // A few vertical strips follow the very shallow ridge slope. The entire
    // silhouette is sheared consistently, rather than leaving its low feet afloat.
    const geometry = new THREE.PlaneGeometry(p.width, p.height, 12, 1);
    const vertices = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const ground = environmentSurfaceHeight(p.position.x + p.tangent.x * x, p.position.z + p.tangent.z * x);
      vertices.setY(i, vertices.getY(i) + p.height / 2 + ground - p.position.y - .018);
      uvs.setXY(i,
        (bounds.left + uvs.getX(i) * (bounds.right - bounds.left)) / BACTRIAN_SPRITE.imageWidth,
        1 - (bounds.bottom - uvs.getY(i) * (bounds.bottom - bounds.top)) / BACTRIAN_SPRITE.imageHeight,
      );
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = p.id;
    mesh.position.copy(p.position);
    mesh.rotation.y = Math.atan2(-p.tangent.z, p.tangent.x);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = depth;
    mesh.userData.scenicBactrian = true;
    root.add(mesh);
  }

  function tether(a: CamelPlacement, b: CamelPlacement, material: THREE.Material) {
    const start = a.position.clone().addScaledVector(a.tangent, a.width * .37);
    start.y += a.height * .73;
    const end = b.position.clone().addScaledVector(b.tangent, -b.width * .35);
    end.y += b.height * .47;
    const middle = start.clone().lerp(end, .5);
    middle.y -= Math.min(.28, start.distanceTo(end) * .07);
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const geometry = new THREE.TubeGeometry(curve, 8, .012, 3, false);
    geometries.push(geometry);
    const rope = new THREE.Mesh(geometry, material);
    rope.name = `${a.id}-lead-rope`;
    // Their subpixel shadows would add noise; only the animals cast shadows.
    rope.castShadow = false;
    root.add(rope);
  }

  const ready = (async () => {
    const response = await fetch(worldAssetUrl(BACTRIAN_SPRITE.asset), {signal: abort.signal});
    if (!response.ok) throw new Error(`bactrian-caravan-texture-${response.status}`);
    const image = await createImageBitmap(await response.blob(), {imageOrientation: 'flipY', premultiplyAlpha: 'none'});
    if (disposed) {image.close(); return;}
    bitmap = image;
    texture = new THREE.Texture(image);
    texture.name = 'bactrian-camel-original-alpha';
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const depth = new THREE.MeshDepthMaterial({map: texture, alphaTest: BACTRIAN_SPRITE.alphaTest,
      depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide});
    depth.name = 'bactrian-alpha-depth';
    materials.push(depth);
    const ropeMaterial = new THREE.MeshStandardMaterial({color: 0x6d5035, roughness: 1});
    ropeMaterial.name = 'bactrian-caravan-rope';
    materials.push(ropeMaterial);
    for (const caravan of BACTRIAN_CARAVANS) {
      const curve = new THREE.CatmullRomCurve3(caravan.points.map(p => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
      const group: CamelPlacement[] = [];
      caravan.spacing.forEach((fraction, i) => {
        const position = curve.getPointAt(fraction);
        const tangent = curve.getTangentAt(fraction).setY(0).normalize();
        position.y = environmentSurfaceHeight(position.x, position.z);
        const height = caravan.heights[i], width = height * aspect;
        const slope = (environmentSurfaceHeight(position.x + tangent.x * width / 2, position.z + tangent.z * width / 2)
          - environmentSurfaceHeight(position.x - tangent.x * width / 2, position.z - tangent.z * width / 2)) / width;
        const placement = {id: `${caravan.id}-camel-${i + 1}`, position, tangent, height, width, slope};
        placements.push(placement);
        group.push(placement);
        const material = new THREE.MeshStandardMaterial({
          map: texture, color: caravan.tones[i], roughness: .98,
          alphaTest: BACTRIAN_SPRITE.alphaTest, side: THREE.DoubleSide,
          transparent: false, depthWrite: true,
        });
        material.name = `${placement.id}-painted-cutout`;
        materials.push(material);
        makeCamel(placement, material, depth);
      });
      for (let i = 0; i < group.length - 1; i++) tether(group[i], group[i + 1], ropeMaterial);
    }
    loaded = true;
  })().catch(error => {dispose(); throw error;});

  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    root.removeFromParent();
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    texture?.dispose();
    bitmap?.close();
  }

  return {
    root, ready, dispose,
    inspect: () => ({
      version: 'v001', loaded, disposed, caravans: BACTRIAN_CARAVANS.length,
      camels: placements.length, representation: 'fixed-alpha-cutout', cameraFacing: false,
      asset: BACTRIAN_SPRITE.asset,
      animals: placements.map(p => ({id: p.id, position: p.position.toArray(), height: p.height,
        width: p.width, yaw: Math.atan2(-p.tangent.z, p.tangent.x), slope: p.slope})),
    }),
  };
}
