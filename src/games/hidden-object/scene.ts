import type * as PhaserTypes from 'phaser';
import type { GameCommand, GameEvent, HiddenObjectLevel, HiddenObjectSnapshot } from '../../types';
import type { Viewport } from '../../runtime/geometry';
import { getHiddenObjectRuntimeImagePath } from '../../content/hidden-object/runtime-images';
import type { HiddenObjectItem, HiddenObjectPool, HiddenObjectSession, HiddenObjectSprite } from './types';
import { advanceSession, createHiddenObjectRound, createSession, findItem, getHintItem, pauseSession, restartSession, resumeSession, rotatedItemBounds, startSession } from './rules';

type PhaserModule = typeof import('phaser');
interface Options {
  level: HiddenObjectLevel;
  pool: HiddenObjectPool;
  viewport: Viewport;
  reducedMotion: boolean;
  backgroundImageUrl?: string;
  publishLayout(layout: unknown): void;
  emit(event: GameEvent): void;
}
const seed = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
const spriteUrl = (sprite: HiddenObjectSprite) => new URL(`${import.meta.env.BASE_URL}${getHiddenObjectRuntimeImagePath(sprite.path).replace(/^\//, '')}`, document.baseURI).href;

export function createHiddenObjectScene(Phaser: PhaserModule, options: Options) {
  class HiddenObjectScene extends Phaser.Scene {
    private blocked = false;
    private state: HiddenObjectSession = createSession(createHiddenObjectRound(options.level, options.pool, seed()), options.level.timeLimitSeconds * 1000);
    private sprites = new Map(options.pool.sprites.map(sprite => [sprite.id, sprite]));
    private images = new Map<string, PhaserTypes.GameObjects.Image>();
    private alpha = new Map<string, { pixels: Uint8Array; width: number; height: number }>();
    private viewport = options.viewport;
    private zoom: 1 | 2 | 3 = 1;
    private pan = { x: 0 };
    private scrollTop = 0;
    private selectedTaskId = this.state.tasks[0]?.id ?? '';
    private initialized = false;
    private disposed = false;
    private failed = false;
    private pending: GameCommand[] = [];
    private sequence = -1;
    private lastTime = 0;
    private lastPublish = 0;
    private completed = false;
    private suspended = document.hidden;
    private highlight: string | null = null;
    private highlightUntil = 0;
    private frame: PhaserTypes.GameObjects.Graphics | null = null;
    private background: PhaserTypes.GameObjects.Image | null = null;
    private gesture: { id: number; x: number; y: number; panX: number; scrollTop: number; moved: boolean } | null = null;

    constructor() { super({ key: 'hidden-object' }); }

    preload() {
      // The real targets can be read while the rest of the board downloads.
      // This snapshot never starts the timer or enables input.
      this.publish();
      this.load.on('loaderror', this.loadError, this);
      this.queueImages();
    }
    private queueImages() {
      let count = 0;
      if (options.backgroundImageUrl && !this.textures.exists('hidden-object-background')) {
        this.load.image('hidden-object-background', options.backgroundImageUrl); count++;
      }
      const spriteIds = new Set([...this.state.tasks.map(task => task.previewSpriteId), ...this.state.round.items.map(item => item.spriteId)]);
      for (const spriteId of spriteIds) {
        if (!this.textures.exists(spriteId)) { this.load.image(spriteId, spriteUrl(this.sprites.get(spriteId)!)); count++; }
      }
      return count;
    }
    create() {
      if (this.disposed || this.failed) return;
      this.configureCamera();
      this.frame = this.add.graphics();
      this.input.on('pointerdown', this.pointerDown, this);
      this.input.on('pointermove', this.pointerMove, this);
      this.input.on('pointerup', this.pointerUp, this);
      this.input.on('pointerupoutside', this.cancelGesture, this);
      this.input.on('wheel', this.pointerWheel, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
      window.addEventListener('blur', this.suspend);
      window.addEventListener('focus', this.focus);
      document.addEventListener('visibilitychange', this.visibility);
      this.finishLoading();
    }
    // Pause synchronously at the browser event boundary, before React or RAF can be frozen.
    private suspend = () => {
      this.suspended = true;
      if (!this.initialized || this.disposed) return;
      this.advance(); this.state = pauseSession(this.state); this.gesture = null;
      this.lastTime = performance.now(); this.render(); this.publish();
    };
    private focus = () => { if (!document.hidden) this.suspended = false; };
    private visibility = () => { if (document.hidden) this.suspend(); else this.focus(); };
    private finishLoading() {
      if (this.disposed || this.failed) return;
      try {
        if (options.backgroundImageUrl && !this.background) {
          if (!this.textures.exists('hidden-object-background')) throw new Error('缺少章节底图');
          this.background = this.add.image(0, 0, 'hidden-object-background').setOrigin(0).setDepth(-2);
        }
        const previousKeys = new Set([...this.images.values()].map(image => image.texture.key));
        const currentKeys = new Set(this.state.round.items.map(item => item.spriteId));
        for (const image of this.images.values()) image.destroy();
        this.images.clear();
        for (const key of previousKeys) if (!currentKeys.has(key)) { this.textures.remove(key); this.alpha.delete(key); }
        for (const item of this.state.round.items) {
          if (!this.textures.exists(item.spriteId)) throw new Error('缺少图片');
          const image = this.add.image(0, 0, item.spriteId).setOrigin(0.5, 0.5);
          this.images.set(item.id, image);
        }
        this.initialized = true;
        if (this.input) this.input.enabled = !this.blocked;
        this.lastTime = performance.now();
        this.render();
        options.emit({ type: 'ready', total: this.state.tasks.reduce((n, task) => n + task.required, 0) });
        this.publish();
        for (const command of this.pending.splice(0)) this.apply(command);
      } catch { this.loadError(); }
    }
    private alphaMask(spriteId: string) {
      const cached = this.alpha.get(spriteId);
      if (cached) return cached;
      // Only a clicked bounding box needs an opaque-pixel mask. Reading all
      // 120 textures up front stalls phone startup and duplicates GPU image data.
      const source = this.textures.get(spriteId).getSourceImage() as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = source.width; canvas.height = source.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('无法准备图片');
      ctx.drawImage(source, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const pixels = new Uint8Array(canvas.width * canvas.height);
      for (let pixel = 0; pixel < pixels.length; pixel++) pixels[pixel] = rgba[pixel * 4 + 3];
      const mask = { pixels, width: canvas.width, height: canvas.height };
      this.alpha.set(spriteId, mask);
      return mask;
    }
    private loadError() {
      this.fail('找物图片未能加载，请重新加载后再开始。');
    }
    private fail(message: string) {
      if (this.disposed || this.failed) return;
      this.failed = true; this.initialized = false;
      this.state = pauseSession(this.state); this.gesture = null;
      if (this.input) this.input.enabled = false;
      options.emit({ type: 'error', message });
    }
    private pixelScale() {
      const canvas = this.game?.canvas;
      return { x: canvas ? canvas.width / this.viewport.width : 1, y: canvas ? canvas.height / this.viewport.height : 1 };
    }
    private configureCamera() {
      const camera = this.cameras?.main;
      const canvas = this.game?.canvas;
      if (!camera || !canvas) return;
      const pixels = this.pixelScale();
      // Game objects continue to use CSS pixels; the camera magnifies only their backing-store render.
      camera.setViewport(0, 0, canvas.width, canvas.height).setOrigin(0, 0).setZoom(pixels.x, pixels.y).setScroll(0, 0);
    }
    private pointerPosition(pointer: PhaserTypes.Input.Pointer) {
      // ScaleManager transforms DOM input to backing pixels before Scene input events are emitted.
      const pixels = this.pixelScale();
      return { x: pointer.x / pixels.x, y: pointer.y / pixels.y };
    }
    private transform() {
      // A long scrollable canvas fits width only; height never squeezes all objects into one screen.
      const scale = this.viewport.width / options.level.board.width * this.zoom;
      const maxX = Math.max(0, (options.level.board.width * scale - this.viewport.width) / 2);
      const scrollMax = Math.max(0, options.level.board.height * scale - this.viewport.height);
      this.pan.x = Math.max(-maxX, Math.min(maxX, this.pan.x));
      this.scrollTop = Math.max(0, Math.min(scrollMax, this.scrollTop));
      return { scale, x: (this.viewport.width - options.level.board.width * scale) / 2 + this.pan.x, y: -this.scrollTop, scrollMax };
    }
    private itemPoint(item: HiddenObjectItem, point: { x: number; y: number }) {
      const dx = (point.x - 0.5) * item.width, dy = (point.y - 0.5) * item.height;
      const cos = Math.cos(item.rotation), sin = Math.sin(item.rotation);
      return { x: item.x + item.width / 2 + dx * cos - dy * sin, y: item.y + item.height / 2 + dx * sin + dy * cos };
    }
    private render() {
      if (!this.initialized || this.disposed || !this.frame) return;
      const t = this.transform();
      this.frame.clear();
      if (this.background) this.background.setPosition(t.x, t.y)
        .setDisplaySize(options.level.board.width * t.scale, options.level.board.height * t.scale);
      else this.frame.fillStyle(0xfaf1df, 0.96).fillRect(0, 0, this.viewport.width, this.viewport.height);
      this.frame.lineStyle(1, 0xc3a774, 0.7).strokeRect(1, 1, this.viewport.width - 2, this.viewport.height - 2);
      const found = new Set(this.state.foundIds);
      const published = this.state.round.items.map(item => {
        const bounds = rotatedItemBounds(item);
        const rect = { x: t.x + bounds.x * t.scale, y: t.y + bounds.y * t.scale, width: bounds.width * t.scale, height: bounds.height * t.scale };
        this.images.get(item.id)?.setPosition(t.x + (item.x + item.width / 2) * t.scale, t.y + (item.y + item.height / 2) * t.scale)
          .setDisplaySize(item.width * t.scale, item.height * t.scale).setRotation(item.rotation).setVisible(!found.has(item.id));
        const point = this.itemPoint(item, this.sprites.get(item.spriteId)!.hitPoint);
        return { ...item, found: found.has(item.id), displayRect: rect, hitPoint: { x: t.x + point.x * t.scale, y: t.y + point.y * t.scale } };
      });
      const highlighted = published.find(item => item.id === this.highlight && !item.found);
      this.frame.setDepth(-1);
      const old = this.children.getByName('hint-outline');
      old?.destroy();
      this.children.getByName('timeout-outlines')?.destroy();
      const revealedIds: string[] = [];
      if (this.state.status === 'timeout') {
        const circles = this.add.graphics().setName('timeout-outlines').setDepth(3).lineStyle(3, 0xb13f2b, 1);
        for (const item of published) {
          if (!item.found && item.groupId && this.state.tasks.some(task => task.id === item.groupId && task.previewSpriteId === item.spriteId)) {
            revealedIds.push(item.id);
            const rect = item.displayRect;
            circles.strokeEllipse(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width + 14, rect.height + 14);
          }
        }
      }
      if (highlighted) {
        const rect = highlighted.displayRect;
        this.add.graphics().setName('hint-outline').setDepth(3).lineStyle(3, 0xb13f2b, 1)
          .strokeRoundedRect(rect.x - 4, rect.y - 4, rect.width + 8, rect.height + 8, 6);
      }
      options.publishLayout({ type: 'hidden-object', seed: this.state.round.seed, status: this.state.status, width: this.viewport.width, height: this.viewport.height, renderScale: this.pixelScale(), board: options.level.board, zoom: this.zoom, scale: t.scale, origin: { x: t.x, y: t.y }, scrollTop: this.scrollTop, scrollMax: t.scrollMax,
        ...(this.background ? { background: { assetId: options.level.chapter?.backgroundAssetId,
          bounds: { x: t.x, y: t.y, width: options.level.board.width * t.scale, height: options.level.board.height * t.scale } } } : {}), items: published, revealedIds });
    }
    private publish() {
      const snapshot: HiddenObjectSnapshot = {
        status: this.state.status, remainingMs: this.state.remainingMs,
        foundCount: this.state.foundIds.length, totalTargets: this.state.tasks.reduce((n, task) => n + task.required, 0),
        tasks: this.state.tasks, selectedTaskId: this.selectedTaskId, zoom: this.zoom,
        scrollTop: this.scrollTop, scrollMax: this.transform().scrollMax,
      };
      options.emit({ type: 'hidden-object-change', snapshot });
    }
    private advance(now = performance.now()) {
      if (this.blocked) { this.lastTime = now; return; }
      const previous = this.state.status;
      this.state = advanceSession(this.state, Math.max(0, now - this.lastTime));
      this.lastTime = now;
      if (previous !== this.state.status) {
        this.gesture = null; this.render(); this.publish();
      }
    }
    update() {
      if (!this.initialized || this.disposed || this.blocked) return;
      const now = performance.now();
      this.advance(now);
      if (this.highlight && now >= this.highlightUntil) { this.highlight = null; this.render(); }
      if (this.state.status === 'running' && now - this.lastPublish >= 100) { this.lastPublish = now; this.publish(); }
    }
    execute(command: GameCommand) {
      if (this.disposed || command.sequence === this.sequence) return;
      this.sequence = command.sequence;
      if (this.blocked) return;
      if (!this.initialized) { this.pending.push(command); return; }
      this.apply(command);
    }
    private apply(command: GameCommand) {
      if (this.blocked) return;
      this.advance();
      if (command.type === 'hidden-start' && !this.suspended && !document.hidden) this.state = startSession(this.state);
      else if (command.type === 'hidden-pause') { this.state = pauseSession(this.state); this.gesture = null; }
      else if (command.type === 'hidden-resume' && !this.suspended && !document.hidden) this.state = resumeSession(this.state);
      else if (command.type === 'hidden-select-task') {
        if (this.state.tasks.some(task => task.id === command.taskId)) this.selectedTaskId = command.taskId;
      } else if (command.type === 'restart') {
        this.state = restartSession(this.state);
        if (!this.suspended && !document.hidden) this.state = startSession(this.state);
        this.completed = false; this.highlight = null; this.gesture = null;
        options.emit({ type: 'hint', message: '' });
      } else if (command.type === 'hidden-new-round') {
        this.newRound(); return;
      } else if (command.type === 'set-zoom') {
        const before = this.transform();
        const centerY = (this.scrollTop + this.viewport.height / 2) / before.scale;
        this.zoom = command.zoom; if (this.zoom === 1) this.pan = { x: 0 };
        this.scrollTop = centerY * this.transform().scale - this.viewport.height / 2;
      } else if (command.type === 'hidden-scroll' && (this.state.status === 'running' || this.state.status === 'timeout')) {
        this.scrollTop = Number.isFinite(command.offset) ? command.offset : this.scrollTop;
      } else if (command.type === 'hint' && this.state.status === 'running') {
        const item = getHintItem(this.state, this.selectedTaskId) ?? getHintItem(this.state);
        if (item) {
          this.highlight = item.id; this.highlightUntil = performance.now() + 2000;
          const t = this.transform();
          this.pan.x = (options.level.board.width / 2 - item.x - item.width / 2) * t.scale;
          this.scrollTop = (item.y + item.height / 2) * t.scale - this.viewport.height / 2;
          options.emit({ type: 'feedback', cue: 'hint' });
          options.emit({ type: 'hint', message: '点击红框中的目标物件。' });
        }
      }
      this.lastTime = performance.now(); this.render(); this.publish();
    }
    private newRound() {
      if (this.blocked) return;
      try {
        this.initialized = false; this.completed = false; this.highlight = null; this.gesture = null;
        this.state = createSession(createHiddenObjectRound(options.level, options.pool, seed()), options.level.timeLimitSeconds * 1000);
        this.selectedTaskId = this.state.tasks[0]?.id ?? ''; this.zoom = 1; this.pan = { x: 0 }; this.scrollTop = 0;
        for (const image of this.images.values()) image.setVisible(false);
        options.emit({ type: 'hint', message: '' }); this.publish();
        const count = this.queueImages();
        if (count === 0) this.finishLoading();
        else { this.load.once(Phaser.Loader.Events.COMPLETE, this.finishLoading, this); this.load.start(); }
      } catch { this.fail('本局暂时无法布置，请重新加载后再试。'); }
    }
    private pointerDown(pointer: PhaserTypes.Input.Pointer) {
      if (!this.initialized || this.blocked || !['running', 'timeout'].includes(this.state.status) || this.gesture) return;
      const position = this.pointerPosition(pointer);
      this.gesture = { id: pointer.id, x: position.x, y: position.y, panX: this.pan.x, scrollTop: this.scrollTop, moved: false };
    }
    private pointerMove(pointer: PhaserTypes.Input.Pointer) {
      const gesture = this.gesture;
      if (this.blocked || !gesture || gesture.id !== pointer.id || !pointer.isDown || !['running', 'timeout'].includes(this.state.status)) return;
      const position = this.pointerPosition(pointer);
      if (Math.hypot(position.x - gesture.x, position.y - gesture.y) > 7) gesture.moved = true;
      if (gesture.moved) {
        if (this.zoom > 1) this.pan.x = gesture.panX + position.x - gesture.x;
        this.scrollTop = gesture.scrollTop - position.y + gesture.y;
        this.render(); this.publish();
      }
    }
    private pointerWheel(_pointer: PhaserTypes.Input.Pointer, _objects: unknown, deltaX: number, deltaY: number) {
      if (!this.initialized || this.disposed || this.blocked) return;
      this.advance();
      if (this.state.status !== 'running' && this.state.status !== 'timeout') return;
      if (this.gesture) this.gesture.moved = true;
      this.scrollTop += deltaY;
      if (this.zoom > 1) this.pan.x -= deltaX;
      this.render(); this.publish();
    }
    private cancelGesture() { this.gesture = null; }
    private pointerUp(pointer: PhaserTypes.Input.Pointer) {
      if (this.blocked) { this.gesture = null; return; }
      const gesture = this.gesture;
      if (!gesture || gesture.id !== pointer.id) return;
      this.gesture = null;
      if (gesture.moved || !this.initialized) return;
      this.advance();
      if (this.state.status !== 'running') return;
      const position = this.pointerPosition(pointer);
      const t = this.transform();
      const x = (position.x - t.x) / t.scale, y = (position.y - t.y) / t.scale;
      const available = this.state.round.items.filter(item => !this.state.foundIds.includes(item.id));
      let item: HiddenObjectItem | undefined;
      try { item = available.find(item => {
        const dx = x - item.x - item.width / 2, dy = y - item.y - item.height / 2;
        const cos = Math.cos(item.rotation), sin = Math.sin(item.rotation);
        const localX = dx * cos + dy * sin + item.width / 2, localY = -dx * sin + dy * cos + item.height / 2;
        if (localX < 0 || localY < 0 || localX >= item.width || localY >= item.height) return false;
        const mask = this.alphaMask(item.spriteId);
        const px = Math.min(mask.width - 1, Math.floor(localX / item.width * mask.width));
        const py = Math.min(mask.height - 1, Math.floor(localY / item.height * mask.height));
        return mask.pixels[py * mask.width + px] >= 128;
      }) ?? available.map(item => {
        const point = this.itemPoint(item, this.sprites.get(item.spriteId)!.hitPoint);
        const screenX = point.x * t.scale + t.x, screenY = point.y * t.scale + t.y;
        return { item, visible: screenX >= 0 && screenX <= this.viewport.width && screenY >= 0 && screenY <= this.viewport.height,
          distance: Math.hypot(screenX - position.x, screenY - position.y) };
      }).filter(candidate => candidate.visible && candidate.distance <= Math.min(22, 12 * t.scale)).sort((a,b) => a.distance - b.distance)[0]?.item;
      } catch { this.loadError(); return; }
      if (!item) return;
      const next = findItem(this.state, item.id);
      if (next === this.state) { options.emit({ type: 'feedback', cue: 'error' }); return; }
      this.state = next; this.highlight = null;
      if (next.tasks.find(task => task.id === this.selectedTaskId)?.found === next.tasks.find(task => task.id === this.selectedTaskId)?.required) {
        this.selectedTaskId = next.tasks.find(task => task.found < task.required)?.id ?? this.selectedTaskId;
      }
      if (next.status !== 'won') options.emit({ type: 'feedback', cue: 'success' });
      this.render(); this.publish();
      if (next.status === 'won' && !this.completed) { this.completed = true; options.emit({ type: 'completed', levelId: options.level.id }); }
    }
    resize(viewport: Viewport) {
      if (this.disposed || this.blocked) return;
      const logicalTop = this.scrollTop / this.transform().scale;
      this.viewport = viewport;
      this.scrollTop = logicalTop * this.transform().scale;
      this.configureCamera();
      this.render(); if (this.initialized) this.publish();
    }
    setBlocked(blocked: boolean) {
      if (this.disposed) return;
      if (this.input) this.input.enabled = !blocked;
      if (blocked) { this.pending = []; this.gesture = null; }
      if (this.blocked === blocked) return;
      const now = performance.now();
      if (blocked && this.initialized) this.advance(now);
      this.blocked = blocked;
      this.lastTime = now;
      if (blocked) this.state = pauseSession(this.state);
      // Unblocking leaves paused games paused; only an explicit resume starts the timer.
      if (this.initialized) { this.render(); this.publish(); }
    }
    setReducedMotion(_reducedMotion: boolean) { /* This mode uses no decorative animation. */ }
    dispose() {
      if (this.disposed) return;
      this.disposed = true; this.initialized = false; this.gesture = null; this.pending = [];
      this.load?.off('loaderror', this.loadError, this);
      this.load?.off(Phaser.Loader.Events.COMPLETE, this.finishLoading, this);
      this.input?.off('pointerdown', this.pointerDown, this);
      this.input?.off('pointermove', this.pointerMove, this);
      this.input?.off('pointerup', this.pointerUp, this);
      this.input?.off('pointerupoutside', this.cancelGesture, this);
      this.input?.off('wheel', this.pointerWheel, this);
      window.removeEventListener('blur', this.suspend);
      window.removeEventListener('focus', this.focus);
      document.removeEventListener('visibilitychange', this.visibility);
      this.alpha.clear(); this.images.clear();
    }
  }
  const scene = new HiddenObjectScene();
  return { scene, controller: scene };
}
