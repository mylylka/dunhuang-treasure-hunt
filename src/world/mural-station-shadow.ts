import * as THREE from 'three';
import contacts from '../content/world/mural-station-contacts-v003.json';

/** The roof already intercepts the sun. Approximate the missing diffuse
 * occlusion on the floor with a small mask tied to the actual supports. */
export function addMuralStationShadow(station: THREE.Object3D) {
  const width = 1.22, depth = .72;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(canvas.width / width, 0, 0, canvas.height / depth, canvas.width / 2, canvas.height / 2);

  function shade(x: number, z: number, radiusX: number, radiusZ: number, opacity: number) {
    if (!context) return;
    context.save();
    context.translate(x, z);
    context.scale(radiusX, radiusZ);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(255,255,255,${opacity})`);
    gradient.addColorStop(.4, `rgba(255,255,255,${opacity * .6})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  // Wide, faint under-table shade plus tighter patches where each foot lands.
  shade(-.04, .045, .50, .26, .17);
  for (const [minX, minZ, maxX, maxZ] of contacts) {
    shade((minX + maxX) / 2, (minZ + maxZ) / 2,
      (maxX - minX) / 2 + .035, (maxZ - minZ) / 2 + .035, .39);
  }

  const map = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map, color: '#302218', transparent: true, depthWrite: false, toneMapped: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  shadow.name = 'mural-station-floor-contact';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .002 / station.scale.y;
  shadow.raycast = () => {}; // Floor shading must never intercept object clicks.
  station.add(shadow);
}
