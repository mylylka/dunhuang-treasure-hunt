import type * as PhaserTypes from 'phaser';
import type { ColoringLevel, ColoringMaterialId, GameCommand, GameEvent, RegionColors, RegionMaterials } from '../../types';
import type { Point, Viewport } from '../../runtime/geometry';
import { bindImageGestures } from '../../runtime/image-gestures';
import { clampImageView, imageViewRect, initialImageView, panImageView, pinchImageView, type ImageView } from '../../runtime/image-view';
import { applyLogicalCamera } from '../../runtime/render-coordinates';
import { prepareColoringArtwork, type ColoringArtworkRenderer } from './render';
import { calculateColoringLayout, clearColoring, createColoringState, imagePoint,
  coloringTextureSize, isColor, paintRegion, undoColoring, type ColoringLayout } from './rules';
import { isColoringMaterial } from './materials';

export interface ColoringController {
  execute(command: GameCommand): void;
  setBlocked(blocked: boolean): void;
  resize(viewport: Viewport): void;
  setReducedMotion(reducedMotion: boolean): void;
  dispose(): void;
}
export interface ColoringSceneOptions {
  level: ColoringLevel;
  lineImageUrl: string;
  regionMapImageUrl: string;
  initialColors: RegionColors;
  initialMaterials?: RegionMaterials;
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
    private blocked = false;
    private readonly allowedIds = new Set(options.level.regions.map(region => region.id));
    private state = createColoringState(options.initialColors, this.allowedIds, options.initialMaterials);
    private viewport = options.viewport;
    private ratio = options.imageAspectRatio;
    private view = initialImageView();
    private layout = calculateColoringLayout(this.viewport.width, this.viewport.height, this.ratio);
    private color: string | null = options.level.palette[0]?.color ?? '#b34d35';
    private material: ColoringMaterialId | undefined;
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
    private gestures: ReturnType<typeof bindImageGestures> | null = null;

    constructor() { super({ key: 'coloring' }); }

    create() {
      applyLogicalCamera(this, this.viewport);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
      void prepareColoringArtwork(options.lineImageUrl, options.regionMapImageUrl, this.abort.signal).then(renderer => {
        if (this.disposed) return;
        this.artwork = renderer;
        this.ratio = renderer.width / renderer.height;
        renderer.render(this.state.colors, this.state.materials);
        // Hit testing/export stay native; display filtering uses physical backing pixels.
        this.displayCanvas = document.createElement('canvas');
        this.displayCanvas.width = 1;
        this.displayCanvas.height = 1;
        this.texture = this.textures.addCanvas('coloring-artwork', this.displayCanvas);
        if (!this.texture) throw new Error('填色画面未能创建，请重试。');
        this.picture = this.add.image(0, 0, 'coloring-artwork').setOrigin(0);
        this.ready = true;
        this.updateImage();
        this.gestures = bindImageGestures(this.game.canvas, {
          viewport: () => this.viewport,
          enabled: () => this.ready && !this.disposed && !this.blocked && !this.completed,
          wheelZoom: true,
          // Track every finger on the canvas, including one starting in the margin,
          // so adding a second finger can never turn the first release into paint.
          canStart: point => point.x >= 0 && point.y >= 0 && point.x < this.viewport.width && point.y < this.viewport.height,
          onTap: point => this.tap(point),
          onPan: delta => {
            if (this.view.zoom <= 1) return;
            this.view = panImageView(this.currentView(), this.baseImage(), delta);
            this.updateImage();
          },
          onPinch: ({ from, to, scale }) => {
            this.view = pinchImageView(this.currentView(), this.baseImage(), from, to, scale);
            this.updateImage(); this.emitChange();
          },
        });
        this.input.enabled = !this.blocked;
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
      if (this.blocked) return;
      if (!this.ready) { this.pending.push(command); return; }
      this.applyCommand(command);
    }

    private applyCommand(command: GameCommand) {
      if (command.type === 'set-motion') { this.setReducedMotion(command.reducedMotion); return; }
      if (this.blocked) return;
      if (command.type === 'select-color') {
        if ((command.color === null || isColor(command.color)) && (command.material === undefined || isColoringMaterial(command.material))) {
          this.color = command.color;
          this.material = command.color === null ? undefined : command.material;
        }
        return;
      }
      if (command.type === 'set-zoom') {
        this.view = clampImageView({ ...this.view, zoom: command.zoom });
        this.gestures?.cancel();
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
        options.emit({ type: 'completed', levelId: options.level.id });
      }
    }

    private emitChange() {
      options.emit({ type: 'coloring-change', colors: { ...this.state.colors }, materials: { ...this.state.materials }, paintedCount: Object.keys(this.state.colors).length,
        canUndo: this.state.history.length > 0, zoom: this.view.zoom });
    }

    private renderImmediate() {
      this.tweens.killAll();
      this.animating = false;
      for (const circle of this.feedback) circle.destroy();
      this.feedback.clear();
      this.artwork?.render(this.state.colors, this.state.materials);
      this.refreshDisplayTexture();
      this.publishLayout();
    }

    private paint(id: number, point: Point) {
      if (this.blocked) return;
      if (!this.allowedIds.has(id) || !this.artwork) return;
      const previous = this.state;
      const next = paintRegion(this.state, id, this.color, this.material);
      if (next === this.state) return;
      this.renderImmediate();
      this.state = next;
      this.completed = false;
      this.emitChange();
      options.emit({ type: 'feedback', cue: 'fill' });
      if (this.reducedMotion) { this.renderImmediate(); return; }
      const target = this.state;
      const transition = { progress: 0 };
      this.animating = true;
      this.publishLayout();
      this.tweens.add({ targets: transition, progress: 1, duration: 200, ease: 'Sine.Out',
        onUpdate: () => {
          if (this.disposed) return;
          this.artwork?.renderTransition(previous.colors, previous.materials, target.colors, target.materials, transition.progress);
          this.refreshDisplayTexture();
        },
        onComplete: () => { if (!this.disposed) {
          this.artwork?.render(this.state.colors, this.state.materials); this.refreshDisplayTexture(); this.animating = false; this.publishLayout();
        } },
      });
      const ring = this.add.circle(point.x, point.y, 6).setStrokeStyle(1.5, 0xb98d48, 0.75);
      this.feedback.add(ring);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.6, duration: 200,
        onComplete: () => { this.feedback.delete(ring); ring.destroy(); } });
    }

    private tap(point: Point) {
      if (!this.ready || this.disposed || this.blocked || this.completed || !this.artwork) return;
      const source = imagePoint(point, this.layout.image, this.artwork.width, this.artwork.height);
      if (!source) return;
      const id = this.artwork.regionAt(source.x, source.y);
      if (id && this.allowedIds.has(id)) this.paint(id, point);
      else options.emit({ type: 'hint', message: '点击线条围成的区域；细节可放大后再填色。' });
    }

    private baseImage() {
      return calculateColoringLayout(this.viewport.width, this.viewport.height, this.ratio).image;
    }

    private currentView(): ImageView {
      return { zoom: this.view.zoom, center: {
        x: (this.viewport.width / 2 - this.layout.image.x) / this.layout.image.width,
        y: (this.viewport.height / 2 - this.layout.image.y) / this.layout.image.height,
      } };
    }

    private pixelScale() {
      const canvas = this.game?.canvas;
      return { x: canvas ? canvas.width / this.viewport.width : 1, y: canvas ? canvas.height / this.viewport.height : 1 };
    }

    private refreshDisplayTexture() {
      if (!this.artwork || !this.displayCanvas || !this.texture) return;
      const density = this.pixelScale();
      const { width, height } = coloringTextureSize(this.artwork.width, this.artwork.height, this.layout.image, density.x, density.y);
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
      const requested = imageViewRect(this.baseImage(), this.view);
      this.layout = calculateColoringLayout(this.viewport.width, this.viewport.height, this.ratio, this.view.zoom, {
        x: requested.x - (this.viewport.width - requested.width) / 2,
        y: requested.y - (this.viewport.height - requested.height) / 2,
      });
      this.refreshDisplayTexture();
      this.publishLayout();
    }

    private publishLayout() { options.publishLayout({ ...this.layout, animating: this.animating, reducedMotion: this.reducedMotion }); }

    resize(viewport: Viewport) {
      if (this.disposed || this.blocked) return;
      this.viewport = viewport;
      this.gestures?.cancel();
      applyLogicalCamera(this, this.viewport);
      this.updateImage();
    }

    setBlocked(blocked: boolean) {
      if (this.disposed) return;
      this.blocked = blocked;
      if (this.input) this.input.enabled = !blocked;
      if (blocked) {
        this.pending = []; this.gestures?.cancel();
        // The color was committed before its transition; settle to that accepted state.
        if (this.ready) this.renderImmediate();
      }
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
      this.gestures?.dispose(); this.gestures = null;
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
