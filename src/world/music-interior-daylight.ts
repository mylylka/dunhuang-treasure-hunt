import * as THREE from 'three';

const CASTERS = 26;
const DIRECTION = new THREE.Vector3(.47, .59, .65).normalize();

// Directional daylight uses the actual exhibit and animated character meshes.
// Its shadow pass sees only this layer, separate from the terrain sun and its bake.
export function createMusicInteriorDaylight(scene: THREE.Object3D, room: THREE.Object3D,
  avatars: readonly THREE.Object3D[], mobile: boolean) {
  const focus = new THREE.Vector3(40.45, 7.25, -25.05);
  const light = new THREE.DirectionalLight('#fff0dc', 2.65);
  light.name = 'music-terrace-daylight';
  light.position.copy(room.localToWorld(focus.clone().addScaledVector(DIRECTION, 25)));
  light.target.position.copy(room.localToWorld(focus));
  const direction = light.position.clone().sub(light.target.position).normalize();
  light.castShadow = true;
  const shadow = light.shadow;
  const resolution = mobile ? 512 : 1024;
  shadow.mapSize.set(resolution, resolution);
  shadow.camera.layers.set(CASTERS);
  Object.assign(shadow.camera, { left: -10.5, right: 10.5, top: 10.5, bottom: -10.5, near: 1, far: 49 });
  shadow.camera.updateProjectionMatrix();
  shadow.bias = -.00014;
  shadow.normalBias = .022;
  shadow.radius = 1.4;
  shadow.autoUpdate = false;
  shadow.needsUpdate = true;

  const proxyRoot = new THREE.Group();
  proxyRoot.name = 'music-daylight-avatar-casters';
  const castMeshes = new Set<THREE.Mesh>();
  const toLocal = room.matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  let activeAvatars = 0;
  function makeActor(root: THREE.Object3D) {
    const meshes: { source: THREE.Mesh; proxy: THREE.Mesh }[] = [];
    root.traverse(source => {
      if (!(source instanceof THREE.Mesh) || source.userData.musicGuideReveal) return;
      const proxy = source.clone(false);
      proxy.layers.set(CASTERS);
      proxy.castShadow = true;
      proxy.receiveShadow = false;
      proxy.userData.excludeEnvironmentShadowBake = true;
      proxy.matrixAutoUpdate = false;
      proxy.frustumCulled = false;
      proxy.visible = false;
      proxyRoot.add(proxy);
      meshes.push({ source, proxy });
    });
    return { root, meshes };
  }
  const actors = avatars.map(makeActor);
  scene.add(light, light.target, proxyRoot);

  return {
    direction,
    refreshAvatar(root: THREE.Object3D) {
      const index = actors.findIndex(actor => actor.root === root);
      if (index < 0) return;
      for (const { proxy } of actors[index].meshes) proxy.removeFromParent();
      actors[index] = makeActor(root);
      shadow.needsUpdate = true;
    },
    includeExhibit(model: THREE.Object3D) {
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow) return;
        object.layers.enable(CASTERS);
        object.userData.excludeEnvironmentShadowBake = true;
        castMeshes.add(object);
      });
      shadow.needsUpdate = true;
    },
    update() {
      const previous = activeAvatars;
      activeAvatars = 0;
      for (const { root, meshes } of actors) {
        root.getWorldPosition(point).applyMatrix4(toLocal);
        // A character outside either daylit room cannot cast into the local map.
        const upper = point.y >= 7.86 && point.x < 46.45 && point.z < -17.55;
        const lower = point.y >= 1.72 && point.y < 2.2 && point.x < 46.45 && point.z < -19.0 && point.z > -31.1;
        const casts = point.x >= 34.44 && point.z >= -32.22 && (upper || lower);
        if (casts) {
          activeAvatars++;
          root.updateWorldMatrix(true, true);
        }
        for (const { source, proxy } of meshes) {
          proxy.visible = casts && source.visible;
          if (proxy.visible) {
            proxy.matrix.copy(source.matrixWorld);
            proxy.matrixWorldNeedsUpdate = true;
          }
        }
      }
      if (activeAvatars || previous) shadow.needsUpdate = true;
    },
    inspect: () => ({ direction: direction.toArray(), resolution, activeAvatars, exhibitCasters: castMeshes.size }),
    dispose() {
      for (const mesh of castMeshes) {
        mesh.layers.disable(CASTERS);
        delete mesh.userData.excludeEnvironmentShadowBake;
      }
      castMeshes.clear();
      shadow.dispose();
      light.removeFromParent();
      light.target.removeFromParent();
      proxyRoot.removeFromParent().clear();
    },
  };
}
