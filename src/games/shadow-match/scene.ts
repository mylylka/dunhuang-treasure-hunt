import type * as PhaserTypes from 'phaser';
import type { GameCommand, GameEvent, ShadowMatchLevel } from '../../types';
import type { Viewport } from '../../runtime/geometry';
import type { ShadowCardLayout, ShadowMatchLayout, ShadowMatchSnapshot } from './types';
import { calculateShadowLayout, createShadowMatchState, fitShadowImage, nextShadowHint, restartShadowMatchState, selectShadowOption } from './rules';

export interface ShadowMatchController {
  execute(command: GameCommand): void;
  setBlocked(blocked: boolean): void;
  resize(viewport: Viewport): void;
  setReducedMotion(reducedMotion: boolean): void;
  dispose(): void;
}
export interface ShadowMatchSceneOptions {
  level: ShadowMatchLevel;
  images: Record<string, string>;
  viewport: Viewport;
  reducedMotion: boolean;
  publishLayout(layout: ShadowMatchLayout): void;
  emit(event: GameEvent): void;
}

/** Owns the local answer state only; PhaserPlayer owns the engine lifecycle. */
export function createShadowMatchScene(Phaser: typeof import('phaser'), options: ShadowMatchSceneOptions): {
  scene: PhaserTypes.Scene; controller: ShadowMatchController;
} {
  class ShadowMatchScene extends Phaser.Scene implements ShadowMatchController {
    private blocked = false;
    private state = createShadowMatchState(options.level);
    private viewport = { ...options.viewport };
    private layout = calculateShadowLayout(this.viewport.width, this.viewport.height);
    private rendered: PhaserTypes.GameObjects.Image[] = [];
    private hintFrame: PhaserTypes.GameObjects.Graphics | null = null;
    private initialized = false;
    private disposed = false;
    private failed = false;
    private completedEmitted = false;
    private sequence = -1;
    private pending: GameCommand[] = [];
    private readonly assetIds = [...new Set([options.level.referenceAssetId, ...options.level.options.map(option => option.assetId)])];

    constructor() { super({ key: 'shadow-match' }); }

    preload() {
      this.load.on('loaderror', this.loadError, this);
      for (const assetId of this.assetIds) {
        const url = options.images[assetId];
        if (!url) { this.loadError(); return; }
        if (!this.textures.exists(this.textureKey(assetId))) this.load.image(this.textureKey(assetId), url);
      }
    }

    create() {
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
      if (this.failed || this.disposed) return;
      try {
        for (const assetId of this.assetIds) {
          const key = this.textureKey(assetId);
          if (!this.textures.exists(key)) throw new Error('缺少影子图片');
          const frame = this.textures.getFrame(key);
          if (!frame || frame.realWidth <= 0 || frame.realHeight <= 0) throw new Error('影子图片尺寸无效');
        }
        this.initialized = true;
        if (this.input) this.input.enabled = !this.blocked;
        this.hintFrame = this.add.graphics();
        this.render();
        options.emit({ type: 'ready', total: 1 });
        this.publish();
        for (const command of this.pending.splice(0)) this.apply(command);
      } catch { this.loadError(); }
    }

    private textureKey(assetId: string) { return `shadow-match-${assetId}`; }

    private loadError() {
      if (this.disposed || this.failed) return;
      this.failed = true; this.initialized = false; this.pending = [];
      options.emit({ type: 'error', message: '影子配对图片暂时未能加载，请重试。' });
    }

    private configureCamera() {
      const canvas = this.game?.canvas, camera = this.cameras?.main;
      if (!canvas || !camera) return;
      // All published coordinates remain CSS pixels, including on a DPR2 backing canvas.
      camera.setViewport(0, 0, canvas.width, canvas.height).setOrigin(0, 0)
        .setZoom(canvas.width / this.viewport.width, canvas.height / this.viewport.height).setScroll(0, 0);
    }

    private fitCard(card: ShadowCardLayout, assetId: string): ShadowCardLayout {
      const frame = this.textures.getFrame(this.textureKey(assetId));
      return { ...card, image: fitShadowImage(card.image, frame.realWidth, frame.realHeight) };
    }

    private render() {
      if (!this.initialized || this.disposed || this.failed) return;
      this.configureCamera();
      const base = calculateShadowLayout(this.viewport.width, this.viewport.height);
      const optionAssets = this.state.optionIds.map(id => options.level.options.find(option => option.id === id)!.assetId);
      this.layout = {
        ...base, reference: this.fitCard(base.reference, options.level.referenceAssetId),
        options: base.options.map((card, index) => this.fitCard(card, optionAssets[index])),
      };
      for (const image of this.rendered) image.destroy();
      this.rendered = [];
      const cards = [this.layout.reference, ...this.layout.options];
      const assets = [options.level.referenceAssetId, ...optionAssets];
      cards.forEach((card, index) => {
        const image = card.image;
        this.rendered.push(this.add.image(image.x, image.y, this.textureKey(assets[index])).setOrigin(0).setDisplaySize(image.width, image.height));
      });
      this.hintFrame?.clear().setDepth(1);
      if (this.state.hintIndex !== null) {
        const region = options.level.hints[this.state.hintIndex].region, image = this.layout.reference.image;
        this.hintFrame?.lineStyle(3, 0xb26738, .95).strokeEllipse(
          image.x + (region.x + region.width / 2) * image.width,
          image.y + (region.y + region.height / 2) * image.height,
          region.width * image.width, region.height * image.height);
      }
      options.publishLayout(this.layout);
    }

    private publish() {
      if (!this.initialized || this.disposed || this.failed) return;
      const snapshot: ShadowMatchSnapshot = { ...this.state, optionIds: [...this.state.optionIds], wrongOptionIds: [...this.state.wrongOptionIds] };
      options.emit({ type: 'shadow-match-change', snapshot });
    }

    execute(command: GameCommand) {
      if (this.disposed || this.failed || command.sequence <= this.sequence) return;
      this.sequence = command.sequence;
      if (this.blocked) return;
      if (!this.initialized) { this.pending.push(command); return; }
      this.apply(command);
    }

    private apply(command: GameCommand) {
      if (this.disposed || this.failed) return;
      if (command.type === 'set-motion') { this.setReducedMotion(command.reducedMotion); return; }
      if (this.blocked) return;
      if (command.type === 'restart') {
        this.state = restartShadowMatchState(options.level, this.state); this.completedEmitted = false;
        this.render(); this.publish(); options.emit({ type: 'hint', message: '' }); return;
      }
      if (this.state.completed) return;
      if (command.type === 'hint') {
        this.state = nextShadowHint(options.level, this.state);
        this.render(); this.publish();
        options.emit({ type: 'feedback', cue: 'hint' });
        options.emit({ type: 'hint', message: this.state.message }); return;
      }
      if (command.type !== 'shadow-select') return;
      const next = selectShadowOption(options.level, this.state, command.optionId);
      if (next === this.state) return;
      this.state = next; this.render(); this.publish();
      if (!next.completed) options.emit({ type: 'feedback', cue: 'error' });
      else if (!this.completedEmitted) {
        this.completedEmitted = true;
        options.emit({ type: 'completed', levelId: options.level.id });
      }
    }

    resize(viewport: Viewport) {
      if (this.disposed || this.blocked) return;
      this.viewport = { ...viewport };
      this.render();
    }
    setBlocked(blocked: boolean) {
      if (this.disposed) return;
      this.blocked = blocked;
      if (this.input) this.input.enabled = !blocked;
      if (blocked) this.pending = [];
    }
    setReducedMotion(_reducedMotion: boolean) { /* Hints are static; this game has no decorative animation. */ }
    dispose() {
      if (this.disposed) return;
      this.disposed = true; this.initialized = false; this.pending = [];
      this.load?.off('loaderror', this.loadError, this);
      for (const image of this.rendered) image.destroy();
      this.rendered = []; this.hintFrame?.destroy(); this.hintFrame = null;
    }
  }
  const scene = new ShadowMatchScene();
  return { scene, controller: scene };
}
