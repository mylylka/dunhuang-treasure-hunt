import * as THREE from 'three';
import legacy from '../../src/content/world/music-interior-decoration-v002.json';
import config from '../../src/content/world/music-interior-decoration-v004.json';
import { toTerrainPoint, TERRAIN_REGIONS } from '../../src/content/world/terrain-layout-v001';
import { createMusicInteriorDecoration } from '../../src/world/music-interior-decoration';
import { createMusicInteriorLighting } from '../../src/world/music-interior-lighting';
import { createEnvironmentLighting } from '../../src/world/terrain-environment-lighting-v001';

const WIDTH = 512, HEIGHT = 256;
const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const luminance = (r: number, g: number, b: number) => .2126 * r + .7152 * g + .0722 * b;
interface Patch { id: string; center: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; width: number; height: number; kind?: 'rigid' | 'skinned' | 'instanced'; exterior?: boolean }
const horizontal = (id: string, x: number, y: number, z: number, width: number, height: number, exterior = false): Patch =>
  ({ id, center: vector(x, y, z), u: vector(1, 0, 0), v: vector(0, 0, -1), width, height, exterior });
const grade = (1.8 - 7.915375) / 9.42;
const patches: Patch[] = [
  horizontal('floor-one', 47.1, 1.8, -25.5, 23, 10.8),
  horizontal('floor-two', 40.5, 7.915375, -26.8, 9.8, 8.4),
  horizontal('upper-gallery', 39.5, 7.915375, -20, 7.8, 2.8),
  { id: 'rear-wall', center: vector(47, 7.25, -32.174), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 23, height: 10.5 },
  { id: 'right-wall', center: vector(59.423, 7.25, -25.5), u: vector(0, 0, 1), v: vector(0, 1, 0), width: 11.8, height: 10.5 },
  { id: 'west-wall', center: vector(34.764, 7.25, -25.5), u: vector(0, 0, -1), v: vector(0, 1, 0), width: 11.8, height: 10.5 },
  { id: 'stair-plane', center: vector(50.98, (1.8 + 7.915375) / 2, -30.225), u: vector(1, grade, 0).normalize(), v: vector(0, 0, -1), width: Math.hypot(9.42, 6.115375), height: 3.6 },
  { id: 'rear-wall-lower-skirt', center: vector(47, 2.105, -32.174), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 23, height: .6 },
  { id: 'right-wall-lower-skirt', center: vector(59.423, 2.105, -25.5), u: vector(0, 0, 1), v: vector(0, 1, 0), width: 11.8, height: .6 },
  { id: 'gallery-upper-skirt', center: vector(39.5, 8.22, -17.70), u: vector(-1, 0, 0), v: vector(0, 1, 0), width: 7.8, height: .6 },
  { id: 'corner-west-rear', center: vector(34.764, 7.1, -31.974), u: vector(0, 0, -1), v: vector(0, 1, 0), width: .4, height: 10.4 },
  { id: 'corner-right-rear', center: vector(59.423, 7.1, -31.974), u: vector(0, 0, 1), v: vector(0, 1, 0), width: .4, height: 10.4 },
  { id: 'rear-wall-top', center: vector(47, 13.3305, -32.174), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 23, height: .4 },
  { id: 'right-wall-top', center: vector(59.423, 13.3305, -25.5), u: vector(0, 0, 1), v: vector(0, 1, 0), width: 11.8, height: .4 },
  horizontal('floor-rear-corner', 47, 1.815, -31.974, 23, .4),
  { id: 'ceiling-main', center: vector(47, 13.5305, -25.5), u: vector(1, 0, 0), v: vector(0, 0, 1), width: 23, height: 10.8 },
  { id: 'ceiling-rear-corner', center: vector(47, 13.5305, -31.974), u: vector(1, 0, 0), v: vector(0, 0, 1), width: 23, height: .4 },
  horizontal('exterior-ground', 64, 1.8, -25.5, 4, 6, true),
  { id: 'exterior-front-shell', center: vector(42, 13.14, -17.60), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 1, height: .4, exterior: true },
  horizontal('exterior-roof-shell', 42.613, 13.709, -31.190, 1, .6, true),
  { id: 'rigid-receiver', kind: 'rigid', center: vector(35.9, 3, -25), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 1.2, height: 1.2 },
  { id: 'skinned-receiver', kind: 'skinned', center: vector(35.9, 3, -25), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 1.2, height: 1.2 },
  { id: 'instanced-receiver', kind: 'instanced', center: vector(35.9, 3, -25), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 1.2, height: 1.2 },
  { id: 'exterior-receiver', kind: 'rigid', center: vector(64, 3, -25), u: vector(1, 0, 0), v: vector(0, 1, 0), width: 1.2, height: 1.2, exterior: true },
];

async function run() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
  renderer.setSize(WIDTH, HEIGHT); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0, 0); document.body.append(renderer.domElement);
  const gallery = document.createElement('div'); gallery.style.cssText = 'display:grid;grid-template-columns:repeat(2,512px);gap:12px;background:#28231e;color:#fff;font:14px sans-serif;padding:12px'; document.body.append(gallery);
  function panel(label: string) { const item = document.createElement('div'), title = document.createElement('div'), image = document.createElement('img'); title.textContent = label; image.src = renderer.domElement.toDataURL('image/png'); image.width = WIDTH; image.height = HEIGHT; item.append(title, image); gallery.append(item); }

  if (!renderer.extensions.has('EXT_color_buffer_float')) throw new Error('lighting-probe-float-color-buffer-unavailable');
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const origin = toTerrainPoint('music', { x: 0, y: 0, z: 0 }); root.position.set(origin.x, origin.y, origin.z); root.rotation.y = TERRAIN_REGIONS.music.yaw;
  const decorationMaterial = new THREE.MeshStandardMaterial(); decorationMaterial.name = 'music-decor-plaster';
  const hidden = new THREE.Mesh(new THREE.PlaneGeometry(), decorationMaterial); hidden.visible = false; root.add(hidden);
  const decoration = createMusicInteriorDecoration(root, { loadFloralTexture: async () => ({ texture: new THREE.Texture() }) }); await decoration.ready;
  root.traverse(object => { if (object.userData.musicDecorationFixture) object.visible = false; });
  const lanterns: THREE.PointLight[] = []; root.traverse(object => { if (object instanceof THREE.PointLight && object.userData.musicInteriorLantern) lanterns.push(object); });
  const powers = lanterns.map(lamp => lamp.intensity); lanterns.forEach(lamp => { lamp.intensity = 0; });
  const oldSpots = legacy.lights.map(definition => {
    const lamp = new THREE.SpotLight(definition.color, definition.intensity, definition.distance, THREE.MathUtils.degToRad(definition.angleDegrees), definition.penumbra, definition.decay);
    lamp.position.fromArray(definition.position); lamp.target.position.fromArray(definition.target); lamp.visible = false; root.add(lamp, lamp.target); return lamp;
  });
  const sun = new THREE.DirectionalLight('#fff2d6', 2.4); sun.position.set(-14, 35, 22); sun.castShadow = true;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#fff2d7', '#ab825a', .95));
  const external = new THREE.PointLight('#b7ccff', 4, 8, 2); external.position.copy(root.localToWorld(vector(64, 5, -25))); scene.add(external);
  // A shadow-only roof keeps these diagnostic interior planes in the same
  // fixed sunlight shade. It is absent from the color pass, as in a cutaway view.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(70, .2, 50), new THREE.MeshStandardMaterial());
  roof.position.set(47, 14, -25); roof.castShadow = true; roof.layers.set(27); root.add(roof);
  root.updateWorldMatrix(true, true);
  scene.userData.environmentShadowBounds = new THREE.Box3(vector(10, -1, -52), vector(85, 17, 4)).applyMatrix4(root.matrixWorld);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(.5, .5, .5), roughness: 1, metalness: 0 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); plane.receiveShadow = true; root.add(plane);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1), rigid = new THREE.Mesh(boxGeometry, material); rigid.receiveShadow = true; root.add(rigid);
  const skinGeometry = boxGeometry.clone(), count = skinGeometry.getAttribute('position').count;
  skinGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
  skinGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const skinned = new THREE.SkinnedMesh(skinGeometry, material), bone = new THREE.Bone(); skinned.add(bone); skinned.position.set(33.9, 3, -25); root.add(skinned);
  root.updateWorldMatrix(true, true); skinned.bind(new THREE.Skeleton([bone])); bone.position.x = 2; skinned.receiveShadow = true;
  const instanced = new THREE.InstancedMesh(boxGeometry, material, 1); instanced.setMatrixAt(0, new THREE.Matrix4().makeTranslation(35.9, 3, -25)); instanced.receiveShadow = true; root.add(instanced);
  const traveler = new THREE.Group(); scene.add(traveler);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  function pose(patch: Patch) {
    plane.visible = !patch.kind; rigid.visible = patch.kind === 'rigid'; skinned.visible = patch.kind === 'skinned'; instanced.visible = patch.kind === 'instanced';
    const normal = patch.u.clone().cross(patch.v).normalize();
    if (!patch.kind) {
      plane.position.copy(patch.center); plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(patch.u, patch.v, normal)); plane.scale.set(patch.width / 2, patch.height / 2, 1);
    } else rigid.position.copy(patch.center);
    root.updateWorldMatrix(true, true); skinned.skeleton.update();
    const rotation = root.getWorldQuaternion(new THREE.Quaternion()), center = root.localToWorld(patch.center.clone());
    camera.position.copy(center).addScaledVector(normal.applyQuaternion(rotation), 40); camera.up.copy(patch.v).applyQuaternion(rotation); camera.lookAt(center);
    Object.assign(camera, { left: -patch.width / 2, right: patch.width / 2, top: patch.height / 2, bottom: -patch.height / 2 }); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  }
  pose(patches[0]);
  const output = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  output.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const raw = new Float32Array(WIDTH * HEIGHT * 4), screen = new Uint8Array(WIDTH * HEIGHT * 4);
  const percentile = (sorted: number[], p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  function draw(patch: Patch) {
    pose(patch); renderer.setRenderTarget(output); renderer.render(scene, camera); renderer.readRenderTargetPixels(output, 0, 0, WIDTH, HEIGHT, raw);
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    const gl = renderer.getContext(); gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, screen);
    const values: number[] = [], samples = new Float32Array(WIDTH * HEIGHT); samples.fill(NaN);
    let clipped = 0, sum = 0, square = 0;
    for (let y = 4; y < HEIGHT - 4; y++) for (let x = 4; x < WIDTH - 4; x++) {
      const pixel = y * WIDTH + x, at = pixel * 4;
      if (raw[at + 3] < .99) continue;
      const value = luminance(raw[at], raw[at + 1], raw[at + 2]);
      values.push(value); samples[pixel] = value; sum += value; square += value * value;
      if (screen[at] >= 250 && screen[at + 1] >= 250 && screen[at + 2] >= 250) clipped++;
    }
    values.sort((a, b) => a - b);
    const mean = sum / values.length, median = percentile(values, .5);
    let quarterMetreGradient = 0;
    const dx = Math.max(1, Math.round(.25 / patch.width * WIDTH)), dy = Math.max(1, Math.round(.25 / patch.height * HEIGHT));
    for (let y = 4; y < HEIGHT - 4; y++) for (let x = 4; x < WIDTH - 4; x++) {
      const at = y * WIDTH + x, value = samples[at]; if (!Number.isFinite(value)) continue;
      for (const next of [x + dx < WIDTH - 4 ? at + dx : -1, y + dy < HEIGHT - 4 ? at + dy * WIDTH : -1]) {
        if (next >= 0 && Number.isFinite(samples[next])) quarterMetreGradient = Math.max(quarterMetreGradient, Math.abs(samples[next] - value) / Math.max(median, 1e-6));
      }
    }
    return { summary: { id: patch.id, pixels: values.length, mean, minimum: values[0], maximum: values.at(-1)!, median,
      p05: percentile(values, .05), p95: percentile(values, .95), p95ToP05: percentile(values, .95) / Math.max(percentile(values, .05), 1e-6),
      cv: Math.sqrt(Math.max(0, square / values.length - mean * mean)) / Math.max(mean, 1e-6), quarterMetreGradient, clippedFraction: clipped / values.length }, samples, screen: screen.slice() };
  }
  const baseline = new Map<string, ReturnType<typeof draw>>(), old = new Map<string, ReturnType<typeof draw>>(), base = new Map<string, ReturnType<typeof draw>>();
  let environment = createEnvironmentLighting(scene, traveler); await environment.prepare(renderer, camera);
  for (const patch of patches) baseline.set(patch.id, draw(patch));
  oldSpots.forEach(lamp => { lamp.visible = true; }); for (const patch of patches.filter(p => !p.kind)) { old.set(patch.id, draw(patch)); panel(`Previous spots · ${patch.id}`); } oldSpots.forEach(lamp => { lamp.visible = false; });
  environment.dispose();
  lanterns.forEach((lamp, i) => { lamp.intensity = powers[i]; });
  const lighting = createMusicInteriorLighting(scene, root);
  lighting.update(root.localToWorld(vector(39.5, 1.8, -25)), 0, true);
  environment = createEnvironmentLighting(scene, traveler); await environment.prepare(renderer, camera);
  lanterns.forEach(lamp => { lamp.intensity = 0; });
  for (const patch of patches) base.set(patch.id, draw(patch));
  lanterns.forEach((lamp, i) => { lamp.intensity = powers[i]; });
  const full: Record<string, unknown>[] = [], brightSamples = new Map<string, ReturnType<typeof draw>>();
  for (const patch of patches) {
    const result = draw(patch), ambient = base.get(patch.id)!, before = baseline.get(patch.id)!; brightSamples.set(patch.id, result); panel(`Inside player · ${patch.id}`);
    let pointPeakFraction = 0, exteriorLinearDifference = 0, exteriorDisplayDifference = 0;
    for (let i = 0; i < result.samples.length; i++) if (Number.isFinite(result.samples[i]) && Number.isFinite(ambient.samples[i])) {
      pointPeakFraction = Math.max(pointPeakFraction, (result.samples[i] - ambient.samples[i]) / Math.max(result.samples[i], 1e-6));
      if (patch.exterior) {
        exteriorLinearDifference = Math.max(exteriorLinearDifference, Math.abs(result.samples[i] - before.samples[i]));
        for (let channel = 0; channel < 3; channel++) exteriorDisplayDifference = Math.max(exteriorDisplayDifference, Math.abs(result.screen[i * 4 + channel] - before.screen[i * 4 + channel]));
      }
    }
    full.push({ ...result.summary, kind: patch.kind ?? 'plane', exterior: !!patch.exterior,
      baseMedianLift: ambient.summary.median / Math.max(before.summary.median, 1e-6), pointPeakFraction,
      exteriorLinearDifference, exteriorDisplayDifference, legacy: old.get(patch.id)?.summary });
  }
  const insideState = lighting.inspect(), insideFixtures = decoration.inspect();
  lighting.update(root.localToWorld(vector(39.5, 1.8, -19.4)), 0, true);
  const outsideState = lighting.inspect(), expectedGainRatio = outsideState.adaptation.gain / insideState.adaptation.gain;
  for (const patch of patches) {
    const dim = draw(patch), bright = brightSamples.get(patch.id)!, before = baseline.get(patch.id)!, item = full.find(value => value.id === patch.id)!;
    if (patch.id === 'floor-one' || patch.id === 'upper-gallery') panel(`Outside player · ${patch.id}`);
    const ratios: number[] = []; let maximumRatioError = 0, exteriorAdaptationDifference = 0;
    for (let index = 0; index < dim.samples.length; index++) {
      if (!Number.isFinite(dim.samples[index]) || !Number.isFinite(bright.samples[index])) continue;
      if (patch.exterior) exteriorAdaptationDifference = Math.max(exteriorAdaptationDifference, Math.abs(dim.samples[index] - before.samples[index]));
      const contribution = bright.samples[index] - before.samples[index];
      if (!patch.exterior && contribution > 1e-4) {
        const ratio = (dim.samples[index] - before.samples[index]) / contribution;
        ratios.push(ratio); maximumRatioError = Math.max(maximumRatioError, Math.abs(ratio - expectedGainRatio));
      }
    }
    ratios.sort((a, b) => a - b); item.adaptedOutsideMean = dim.summary.mean;
    item.localGainRatio = ratios.length ? percentile(ratios, .5) : null; item.maximumGainRatioError = maximumRatioError;
    item.exteriorAdaptationDifference = exteriorAdaptationDifference;
  }
  const transition = [];
  for (const z of [config.adaptation.doorway.outsideZ + 1, config.adaptation.doorway.outsideZ, (config.adaptation.doorway.outsideZ + config.adaptation.doorway.insideZ) / 2, config.adaptation.doorway.insideZ, config.adaptation.doorway.insideZ - 1]) {
    lighting.update(root.localToWorld(vector(39.5, 1.8, z)), 0, true);
    const result = draw(patches[0]); panel(`Entry z=${z} · gain ${lighting.inspect().adaptation.gain.toFixed(3)}`);
    transition.push({ z, ...lighting.inspect().adaptation, mean: result.summary.mean });
  }
  const report = { renderer: { exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, colorSpace: renderer.outputColorSpace,
    linearTarget: 'RGBA Float32, linear-sRGB, no tone mapping', display: 'default framebuffer ACES 1.08 + sRGB', glError: renderer.getContext().getError() },
    lighting: insideState, decoration: insideFixtures, adaptation: { inside: insideState.adaptation, outside: outsideState.adaptation, expectedGainRatio, transition }, patches: full };
  environment.dispose(); lighting.dispose(); decoration.dispose(); output.dispose(); renderer.domElement.style.display = 'none';
  return report;
}
(window as unknown as { musicInteriorLightingCheckV004: Promise<unknown> }).musicInteriorLightingCheckV004 = run();
