import type * as PhaserTypes from 'phaser';
import type { ColoringLevel, GameCommand, GameEvent, RegionColors } from '../../types';
import type { Point, Viewport } from '../../runtime/geometry';
import { prepareColoringArtwork, type ColoringArtworkRenderer } from './render';
import { calculateColoringLayout, clearColoring, createColoringState, imagePoint, interpolateColor,
  isColor, paintRegion, undoColoring, type ColoringLayout, type ColoringZoom } from './rules';

export interface ColoringController {
  execute(command: GameCommand): void;
  resize(viewport: Viewport): void;
  setReducedMotion(reducedMotion: boolean): void;
  dispose(): void;
}
export interface ColoringSceneOptions {
  level: ColoringLevel;
  lineImageUrl: string;
  regionMapImageUrl: string;
  initialColors: RegionColors;
  viewport: Viewport;
  imageAspectRatio: number;
  reducedMotion: boolean;
  emit(event: GameEvent): void;
  publishLayout(layout: ColoringLayout & { animating: boolean; reducedMotion: boolean }): void;
}

export function createColoringScene(Phaser: typeof import('phaser'), options: ColoringSceneOptions): {
  scene: PhaserTypes.Scene; controller: ColoringController;
} {
  class ColoringScene extends Phaser.Scene implements ColoringController {
    private readonly allowedIds = new Set(options.level.regions.map(region => region.id));
    private state = createColoringState(options.initialColors, this.allowedIds);
    private viewport = options.viewport;
    private ratio = options.imageAspectRatio;
    private zoom: ColoringZoom = 1;
    private pan: Point = { x: 0, y: 0 };
    private layout = calculateColoringLayout(this.viewport.width, this.viewport.height, this.ratio);
    private color: string | null = options.level.palette[0]?.color ?? '#b34d35';
    private reducedMotion = options.reducedMotion;
    private disposed = false;
    private ready = false;
    private failed = false;
    private completed = false;
    private animating = false;
    private readonly abort = new AbortController();
    private artwork: ColoringArtworkRenderer | null = null;
    private displayCanvas: HTMLCanvasElement | null = null;
    private texture: PhaserTypes.Textures.CanvasTexture | null = null;
    private picture: PhaserTypes.GameObjects.Image | null = null;
    private feedback = new Set<PhaserTypes.GameObjects.Arc>();
    private sequence: number | null = null;
    private pending: GameCommand[] = [];
    private gesture: { id: number; start: Point; startPan: Point; dragged: boolean } | null = null;

    constructor() { super({ key: 'coloring' }); }

    create() {
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
      void prepareColoringArtwork(options.lineImageUrl, options.regionMapImageUrl, this.abort.signal).then(renderer => {
        if (this.disposed) return;
        this.artwork = renderer;
        this.ratio = renderer.width / renderer.height;
        renderer.render(this.state.colors);
        // Keep the native artwork for hit testing/export; WebGL receives an overview-sized prefilter.
        this.displayCanvas = document.createElement('canvas');
        this.displayCanvas.width = 1;
        this.displayCanvas.height = 1;
        this.texture = this.textures.addCanvas('coloring-artwork', this.displayCanvas);
        if (!this.texture) throw new Error('填色画面未能创建，请重试。');
        this.picture = this.add.image(0, 0, 'coloring-artwork').setOrigin(0);
        this.ready = true;
        this.updateImage();
        this.input.on('pointerdown', this.pointerDown, this);
        this.input.on('pointermove', this.pointerMove, this);
        this.input.on('pointerup', this.pointerUp, this);
        this.input.on('gameout', this.cancelGesture, this);
        options.emit({ type: 'ready', total: options.level.regions.length });
        this.emitChange();
        const pending = this.pending.splice(0);
        for (const command of pending) this.applyCommand(command);
      }).catch(error => {
        if (this.disposed || this.abort.signal.aborted || this.failed) return;
        this.failed = true;
        this.ready = false;
        options.emit({ type: 'error', message: error instanceof Error ? error.message : '填色画面加载失败，请重新加载。' });
      });
    }

    execute(command: GameCommand) {
      if (this.disposed || command.sequence === this.sequence) return;
      this.sequence = command.sequence;
      if (!this.ready) { this.pending.push(command); return; }
      this.applyCommand(command);
    }

    private applyCommand(command: GameCommand) {
      if (command.type === 'set-motion') { this.setReducedMotion(command.reducedMotion); return; }
      if (command.type === 'select-color') {
        if (command.color === null || isColor(command.color)) this.color = command.color;
        return;
      }
      if (command.type === 'set-zoom') {
        this.zoom = command.zoom;
        this.gesture = null;
        this.updateImage();
        this.emitChange();
        return;
      }
      if (command.type === 'undo' || command.type === 'restart') {
        const next = command.type === 'undo' ? undoColoring(this.state) : clearColoring(this.state);
        if (next === this.state) return;
        this.state = next;
        this.completed = false;
        this.renderImmediate();
        this.emitChange();
        return;
      }
      if (command.type === 'finish') {
        if (this.completed || !Object.keys(this.state.colors).length) return;
        this.completed = true;
        this.renderImmediate();
        options.emit({ type: 'completed', levelId: options.level.id });
      }
    }

    private emitChange() {
      options.emit({ type: 'coloring-change', colors: { ...this.state.colors }, paintedCount: Object.keys(this.state.colors).length,
        canUndo: this.state.history.length > 0, zoom: this.zoom });
    }

    private renderImmediate() {
      this.tweens.killAll();
      this.animating = false;
      for (const circle of this.feedback) circle.destroy();
      this.feedback.clear();
      this.artwork?.render(this.state.colors);
      this.refreshDisplayTexture();
      this.publishLayout();
    }

    private paint(id: number, point: Point) {
      if (!this.allowedIds.has(id) || !this.artwork) return;
      const previous = this.state.colors[String(id)] ?? '#ffffff';
      const next = paintRegion(this.state, id, this.color);
      if (next === this.state) return;
      this.renderImmediate();
      this.state = next;
      this.completed = false;
      this.emitChange();
      options.emit({ type: 'feedback', cue: 'fill' });
      if (this.reducedMotion) { this.renderImmediate(); return; }
      const target = this.state.colors[String(id)] ?? '#ffffff';
      const transition = { progress: 0 };
      this.animating = true;
      this.publishLayout();
      this.tweens.add({ targets: transition, progress: 1, duration: 200, ease: 'Sine.Out',
        onUpdate: () => {
          if (this.disposed) return;
          this.artwork?.render({ ...this.state.colors, [String(id)]: interpolateColor(previous, target, transition.progress) });
          this.refreshDisplayTexture();
        },
        onComplete: () => { if (!this.disposed) {
          this.artwork?.render(this.state.colors); this.refreshDisplayTexture(); this.animating = false; this.publishLayout();
        } },
      });
      const ring = this.add.circle(point.x, point.y, 6).setStrokeStyle(1.5, 0xb98d48, 0.75);
      this.feedback.add(ring);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.6, duration: 200,
        onComplete: () => { this.feedback.delete(ring); ring.destroy(); } });
    }

    private pointerDown(pointer: PhaserTypes.Input.Pointer) {
      if (!this.ready || this.disposed || this.gesture) return;
      const point = { x: pointer.x, y: pointer.y };
      if (!this.artwork || !imagePoint(point, this.layout.image, this.artwork.width, this.artwork.height)) return;
      this.gesture = { id: pointer.id, start: point, startPan: { ...this.pan }, dragged: false };
    }

    private pointerMove(pointer: PhaserTypes.Input.Pointer) {
      if (!this.gesture || pointer.id !== this.gesture.id || !pointer.isDown) return;
      const dx = pointer.x - this.gesture.start.x;
      const dy = pointer.y - this.gesture.start.y;
      if (Math.hypot(dx, dy) > 6) this.gesture.dragged = true;
      if (this.gesture.dragged && this.zoom > 1) {
        this.pan = { x: this.gesture.startPan.x + dx, y: this.gesture.startPan.y + dy };
        this.updateImage();
      }
    }

    private pointerUp(pointer: PhaserTypes.Input.Pointer) {
      const gesture = this.gesture;
      if (!gesture || pointer.id !== gesture.id) return;
      this.gesture = null;
      if (gesture.dragged || Math.hypot(pointer.x - gesture.start.x, pointer.y - gesture.start.y) > 6 || !this.artwork) return;
      const point = { x: pointer.x, y: pointer.y };
      const source = imagePoint(point, this.layout.image, this.artwork.width, this.artwork.height);
      if (!source) return;
      const id = this.artwork.regionAt(source.x, source.y);
      if (id && this.allowedIds.has(id)) this.paint(id, point);
      else options.emit({ type: 'hint', message: '点击线条围成的区域；细节可放大后再填色。' });
    }

    private cancelGesture() { this.gesture = null; }

    private refreshDisplayTexture() {
      if (!this.artwork || !this.displayCanvas || !this.texture) return;
      const scale = Math.min(1, this.layout.image.width / this.artwork.width, this.layout.image.height / this.artwork.height);
      const width = Math.max(1, Math.round(this.artwork.width * scale));
      const height = Math.max(1, Math.round(this.artwork.height * scale));
      if (this.displayCanvas.width !== width || this.displayCanvas.height !== height) {
        this.texture.setSize(width, height);
        this.picture?.setSizeToFrame();
      }
      const context = this.displayCanvas.getContext('2d');
      if (!context) throw new Error('浏览器无法生成平滑的填色预览，请重新加载。');
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(this.artwork.canvas, 0, 0, this.artwork.width, this.artwork.height, 0, 0, width, height);
      this.texture.refresh();
      this.picture?.setPosition(this.layout.image.x, this.layout.image.y)
        .setDisplaySize(this.layout.image.width, this.layout.image.height);
    }

    private updateImage() {
      this.layout = calculateColoringLayout(this.viewport.width, this.viewport.height, this.ratio, this.zoom, this.pan);
      this.pan = this.layout.pan;
      this.refreshDisplayTexture();
      this.publishLayout();
    }

    private publishLayout() { options.publishLayout({ ...this.layout, animating: this.animating, reducedMotion: this.reducedMotion }); }

    resize(viewport: Viewport) {
      this.viewport = viewport;
      this.gesture = null;
      this.updateImage();
    }

    setReducedMotion(reducedMotion: boolean) {
      this.reducedMotion = reducedMotion;
      if (reducedMotion && this.ready) this.renderImmediate();
      else this.publishLayout();
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.ready = false;
      this.abort.abort();
      this.pending = [];
      this.gesture = null;
      this.input?.off('pointerdown', this.pointerDown, this);
      this.input?.off('pointermove', this.pointerMove, this);
      this.input?.off('pointerup', this.pointerUp, this);
      this.input?.off('gameout', this.cancelGesture, this);
      this.tweens?.killAll();
      for (const circle of this.feedback) circle.destroy();
      this.feedback.clear();
      this.artwork = null;
      this.displayCanvas = null;
      this.texture = null;
      this.picture = null;
    }
  }
  const scene = new ColoringScene();
  return { scene, controller: scene };
}
