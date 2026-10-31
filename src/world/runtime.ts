import * as THREE from 'three';
import { createArtSampleScene } from './art-sample';
import { createWorldInput } from './input';
import { caissonCameraPose, clearCameraPosition, followCameraPose } from './camera';
import { clampCameraYaw, movePlayer, movementVector, RUN_SPEED, sanitizePosition, surfaceHeight, WALK_SPEED, WORLD_SPAWN } from './movement';
import type { DiscoveryId, WorldCheckpoint, WorldRuntime, WorldRuntimeOptions, WorldSnapshot, WorldView } from './types';

export function createWorldRuntime(container: HTMLElement, options: WorldRuntimeOptions): WorldRuntime {
  let disposed = false;
  let loaded = false;
  let failed = false;
  let paused = false;
  let view: WorldView = 'follow';
  let reduced = options.reducedMotion;
  let checkpoint: WorldCheckpoint = { ...options.initial, position: sanitizePosition(options.initial.position), cameraYaw: clampCameraYaw(options.initial.cameraYaw), visitedEvents: [...options.initial.visitedEvents] };
  let moving = false;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0;
  let lastEmit = -Infinity;
  let poseSettled = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D探索画面，WASD或方向键移动，F键互动');
  canvas.dataset.worldCanvas = 'true';
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
  const world = createArtSampleScene();
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 150);
  const cameraTarget = new THREE.Vector3();
  const spawnPose = followCameraPose(checkpoint.position.x, surfaceHeight(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
  camera.position.copy(spawnPose.position); cameraTarget.copy(spawnPose.target); camera.lookAt(cameraTarget);
  const input = createWorldInput(canvas, () => { if (loaded && !paused && view === 'follow') options.onInteract(); }, delta => turnCamera(delta));
  input.setEnabled(false);
  container.appendChild(canvas);

  function nearestDiscovery(): DiscoveryId | null {
    if (!loaded) return null;
    const p = checkpoint.position;
    if (Math.hypot(p.x + 12, p.z + 17) < 2.6) return 'caisson';
    if (Math.hypot(p.x + 5, p.z + 6) < 2.25) return 'story-demo';
    return null;
  }
  function snapshot(): WorldSnapshot {
    const p = checkpoint.position;
    const location = p.x < -2 && p.x > -22 && p.z < 2 && p.z > -24
      ? p.z < -12.3 ? '藻井观赏厅' : '纹彩院'
      : p.z < -25 ? '洞窟远景 · 待制作' : p.x > 10 && p.z < -8 ? '乐舞馆远景 · 待制作' : '沙漠道路';
    return { checkpoint: { ...checkpoint, position: { ...p }, visitedEvents: [...checkpoint.visitedEvents] }, nearby: nearestDiscovery(), location, moving };
  }
  function emit() { options.onSnapshot(snapshot()); }
  function updateTraveler(speed: number) {
    world.traveler.position.set(checkpoint.position.x, surfaceHeight(checkpoint.position), checkpoint.position.z);
    world.traveler.rotation.y = checkpoint.heading;
    world.animateTraveler(speed, elapsed, reduced);
    canvas.dataset.animation = world.animationName();
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; previousTime = 0; }
  function canAnimate() { return loaded && !disposed && !failed && !paused && !document.hidden && view !== 'story'; }
  function schedule() { if (canAnimate() && !raf) raf = requestAnimationFrame(frame); }
  function render() {
    if (disposed || failed) return;
    try { renderer.render(world.scene, camera); }
    catch { fail('3D画面绘制失败。可以重新加载，或直接选择文化主题。'); }
  }
  function fail(message: string) {
    if (disposed || failed) return;
    failed = true; moving = false; stop(); input.setEnabled(false);
    world.dispose(); renderer.renderLists.dispose();
    emit(); options.onError(message);
  }
  function frame(time: number) {
    raf = 0;
    if (!canAnimate()) return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time; elapsed += dt;
    const wasMoving = moving;
    let speed = 0;
    if (view === 'follow') {
      const control = input.read();
      checkpoint.cameraYaw = clampCameraYaw(checkpoint.cameraYaw + control.camera * dt * .65);
      const vector = movementVector(control.x, control.y, checkpoint.cameraYaw);
      const desiredSpeed = control.run ? RUN_SPEED : WALK_SPEED;
      const next = movePlayer(checkpoint.position, { x: vector.x * desiredSpeed * dt, z: vector.z * desiredSpeed * dt });
      const distance = Math.hypot(next.x - checkpoint.position.x, next.z - checkpoint.position.z);
      speed = dt ? distance / dt : 0;
      if (speed > .05) {
        const heading = Math.atan2(-vector.x, -vector.z);
        const delta = Math.atan2(Math.sin(heading - checkpoint.heading), Math.cos(heading - checkpoint.heading));
        checkpoint.heading += delta * (reduced ? 1 : 1 - Math.exp(-dt * 15));
      }
      checkpoint.position = next;
      moving = speed > .05;
    } else moving = false;
    updateTraveler(speed);
    const desiredPose = view === 'caisson' ? caissonCameraPose() : followCameraPose(checkpoint.position.x, surfaceHeight(checkpoint.position), checkpoint.position.z, checkpoint.cameraYaw);
    const damping = reduced ? 1 : 1 - Math.exp(-dt * (view === 'caisson' ? 2 : 10));
    cameraTarget.lerp(desiredPose.target, damping);
    camera.position.lerp(desiredPose.position, damping);
    if (view === 'follow') camera.position.copy(clearCameraPosition(cameraTarget, camera.position));
    camera.lookAt(cameraTarget);
    poseSettled = camera.position.distanceToSquared(desiredPose.position) < .00002 && cameraTarget.distanceToSquared(desiredPose.target) < .00002;
    render();
    if (time - lastEmit > 100 || moving !== wasMoving) { lastEmit = time; emit(); }
    // Caisson is static once the observation camera arrives; avoid wasteful idle renders.
    if (!(view === 'caisson' && poseSettled)) schedule();
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth); const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  }
  function turnCamera(delta: number) {
    if (!loaded || paused || view !== 'follow' || disposed) return;
    checkpoint.cameraYaw = clampCameraYaw(checkpoint.cameraYaw + delta); schedule();
  }
  function visibility() {
    input.clear(); moving = false; previousTime = 0;
    if (document.hidden) { stop(); emit(); } else schedule();
  }
  function contextLost(event: Event) { event.preventDefault(); fail('浏览器暂停了3D画面。请重新加载，或直接选择文化主题。'); }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  updateTraveler(0); resize(); emit();
  void world.ready.then(() => {
    if (disposed || failed) return;
    loaded = true; input.clear(); input.setEnabled(loaded && !paused && view === 'follow');
    updateTraveler(0); render();
    if (failed) return;
    emit(); options.onReady?.(); schedule();
  }).catch(error => {
    fail(error instanceof Error ? error.message : '美术模型加载失败。请重新加载，或直接选择文化主题。');
  });
  return {
    snapshot,
    setPaused(value) {
      if (disposed) return;
      paused = value; input.setEnabled(loaded && !paused && view === 'follow'); moving = false; previousTime = 0;
      if (paused) stop(); else schedule(); emit();
    },
    setView(next) {
      if (disposed || view === next) return;
      view = next; input.setEnabled(loaded && !paused && view === 'follow'); moving = false; poseSettled = false; previousTime = 0;
      if (view === 'story') { stop(); updateTraveler(0); render(); }
      else schedule();
      emit();
    },
    setJoystick(x, y) { if (loaded) input.setJoystick(x, y); },
    turnCamera,
    setReducedMotion(value) { reduced = value; schedule(); },
    resetToStart() {
      checkpoint = { ...checkpoint, position: { ...WORLD_SPAWN }, heading: 0, cameraYaw: 0 };
      view = 'follow'; input.setEnabled(loaded && !paused); moving = false;
      const pose = followCameraPose(WORLD_SPAWN.x, 0, WORLD_SPAWN.z, 0);
      camera.position.copy(pose.position); cameraTarget.copy(pose.target); camera.lookAt(cameraTarget);
      updateTraveler(0); render(); emit(); schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true; stop(); input.dispose(); resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', contextLost);
      world.dispose(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
