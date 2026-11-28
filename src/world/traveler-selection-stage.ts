import {
  ACESFilmicToneMapping, AnimationMixer, Box3, DirectionalLight, Group, HemisphereLight, LoopOnce,
  Mesh, OrthographicCamera, Scene, Texture, Vector3, WebGLRenderer, type AnimationAction, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { travelerModelPath, worldAssetUrl, type TravelerId } from '../content/world/assets';
import { applySelectionComplexion } from './traveler-selection-complexion';
import { createTravelerSelectionClips } from './traveler-selection-clips';

type State = 'rest' | 'respond' | 'show';
interface Actor {
  scene: Scene;
  camera: OrthographicCamera;
  mixer: AnimationMixer;
  actions: Record<State, AnimationAction>;
  current: State;
  halfHeight: number;
  drawnState?: State;
  replayRequested: boolean;
}

function release(root: Object3D): void {
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose();
      }
      material.dispose();
    }
    if ('skeleton' in node) (node.skeleton as { dispose(): void }).dispose();
  });
}

function play(actor: Actor, state: State): void {
  const previous = actor.actions[actor.current];
  const next = actor.actions[state];
  if (previous === next) {
    // Clear this actor's previous blend before replaying a response.
    actor.mixer.stopAllAction();
    next.reset().play();
  } else {
    // Only the current pose can fade out. Rapid changes may interrupt an earlier fade.
    for (const action of Object.values(actor.actions)) {
      if (action !== previous) action.stop();
    }
    next.reset().play();
    previous.crossFadeTo(next, .14, false);
  }
  actor.current = state;
}

function prepareActor(root: Group, clips: ReturnType<typeof createTravelerSelectionClips>, id: TravelerId): Actor {
  const scene = new Scene();
  const mixer = new AnimationMixer(root);
  const actions = {
    rest: mixer.clipAction(clips.rest),
    respond: mixer.clipAction(clips.respond),
    show: mixer.clipAction(clips.show),
  };
  actions.respond.setLoop(LoopOnce, 1);
  actions.respond.clampWhenFinished = true;
  actions.rest.play();
  mixer.update(0);

  scene.add(root);
  const bounds = new Box3().setFromObject(root, true);
  const height = bounds.max.y - bounds.min.y;
  const center = bounds.getCenter(new Vector3());
  const forward = id === 'classic' ? -1 : 1;
  const halfHeight = height / 1.94;
  const camera = new OrthographicCamera(-1, 1, halfHeight, -halfHeight, .01 * height, 20 * height);
  camera.position.copy(center).addScaledVector(new Vector3(.14 * forward, .055, forward), height * 4);
  camera.lookAt(center);
  scene.add(new HemisphereLight(0xfff3e9, 0xd1b4a0, 1.42));
  const key = new DirectionalLight(0xffead5, 1.85);
  key.position.copy(center).addScaledVector(new Vector3(-.43 * forward, .65, forward), height);
  key.target.position.copy(center);
  const fill = new DirectionalLight(0xffeae0, .55);
  fill.position.copy(center).addScaledVector(new Vector3(.55 * forward, .18, forward), height);
  fill.target.position.copy(center);
  const rim = new DirectionalLight(0xffe6bd, .48);
  rim.position.copy(center).addScaledVector(new Vector3(.70 * forward, .32, -forward), height);
  rim.target.position.copy(center);
  scene.add(key, key.target, fill, fill.target, rim, rim.target);

  const actor: Actor = { scene, camera, mixer, actions, current: 'rest', halfHeight, replayRequested: false };
  mixer.addEventListener('finished', event => {
    if (event.action === actions.respond && actor.current === 'respond') play(actor, 'show');
  });
  return actor;
}

export function createTravelerSelectionStage(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  onRendered: (id: TravelerId, state: State) => void,
  onFailure: (id: TravelerId) => void,
) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.autoClear = false;
  renderer.setClearColor(0, 0);
  const loader = new GLTFLoader();
  const abort = new AbortController();
  const actors = new Map<TravelerId, Actor>();
  const requests = new Map<TravelerId, Promise<void>>();
  const mobileLayout = stage.closest('[data-phone]') !== null;
  const figures = new Map(Array.from(stage.querySelectorAll<HTMLElement>('[data-figure]'))
    .map(figure => [figure.dataset.figure as TravelerId, figure]));
  let selected: TravelerId | undefined;
  let request = 0;
  let frame = 0;
  let startTimer = 0;
  let lastTime = 0;
  let width = 0, height = 0, pixelRatio = 0;

  function render(time: number): void {
    if (abort.signal.aborted) return;
    const stageRect = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (width !== stageRect.width || height !== stageRect.height || pixelRatio !== ratio) {
      width = stageRect.width;
      height = stageRect.height;
      pixelRatio = ratio;
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
    }
    const dt = lastTime ? Math.min(.1, (time - lastTime) / 1000) : 0;
    lastTime = time;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);

    for (const [id, actor] of actors) {
      if (mobileLayout && width > height && selected !== id) continue;
      const figure = figures.get(id);
      if (!figure) continue;
      const style = getComputedStyle(figure);
      if (style.visibility === 'hidden' || Number(style.opacity) < .02) continue;
      const rect = figure.getBoundingClientRect();
      if (!rect.height || !rect.width) continue;
      const viewWidth = Math.max(rect.width, rect.height * .81);
      const x = rect.left - stageRect.left - (viewWidth - rect.width) / 2;
      const y = stageRect.bottom - rect.bottom;
      const halfWidth = actor.halfHeight * viewWidth / rect.height;
      actor.camera.left = -halfWidth;
      actor.camera.right = halfWidth;
      actor.camera.updateProjectionMatrix();
      actor.mixer.update(dt);
      if (actor.current === 'show' && actor.replayRequested && actor.actions.show.time >= .25) {
        actor.replayRequested = false;
        play(actor, 'respond');
      }
      renderer.setViewport(x, y, viewWidth, rect.height);
      renderer.setScissor(x, y, viewWidth, rect.height);
      renderer.clearDepth();
      renderer.toneMappingExposure = selected === id ? .92 : .77;
      renderer.render(actor.scene, actor.camera);
      if (actor.drawnState !== actor.current) {
        actor.drawnState = actor.current;
        onRendered(id, actor.current);
      }
    }
    frame = requestAnimationFrame(render);
  }

  async function load(id: TravelerId, mobile: boolean): Promise<void> {
    const url = worldAssetUrl(travelerModelPath(id, mobile));
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`Failed to load traveler (${response.status})`);
    const gltf = await loader.parseAsync(await response.arrayBuffer(), '');
    if (abort.signal.aborted) {
      release(gltf.scene);
      return;
    }
    try {
      applySelectionComplexion(gltf.scene, id);
      const clips = createTravelerSelectionClips(gltf, id);
      actors.set(id, prepareActor(gltf.scene, clips, id));
    } catch (error) {
      release(gltf.scene);
      throw error;
    }
    if (!frame) frame = requestAnimationFrame(render);
  }

  return {
    respond(id: TravelerId, mobile: boolean): void {
      const turn = ++request;
      clearTimeout(startTimer);
      if (selected && selected !== id) {
        const previous = actors.get(selected);
        if (previous) {
          previous.replayRequested = false;
          play(previous, 'rest');
        }
      }
      selected = id;
      let pending = requests.get(id);
      if (!pending) {
        pending = load(id, mobile);
        requests.set(id, pending);
      }
      pending.then(() => {
        if (abort.signal.aborted || turn !== request) return;
        const actor = actors.get(id);
        if (!actor) return;
        if (actor.current === 'respond') actor.replayRequested = true;
        else if (actor.drawnState) play(actor, 'respond');
        else startTimer = window.setTimeout(() => play(actor, 'respond'), 270);
      }).catch(() => {
        requests.delete(id);
        if (!abort.signal.aborted && turn === request) onFailure(id);
      });
    },
    dispose(): void {
      abort.abort();
      clearTimeout(startTimer);
      cancelAnimationFrame(frame);
      for (const actor of actors.values()) {
        actor.mixer.stopAllAction();
        release(actor.scene);
      }
      actors.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
