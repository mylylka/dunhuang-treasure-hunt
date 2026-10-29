import type * as PhaserTypes from 'phaser';
import type { GameCommand, GameEvent, SpotDifferenceLevel } from '../../types';
import { calculateLayout, type GameLayout } from '../../runtime/layout';
import type { Viewport } from '../../runtime/geometry';
import {
  containsPoint, createInitialState, discoverDifference, findDifferenceAtPoint,
  getNextHint, regionToRectangle,
} from './rules';

type PhaserModule = typeof import('phaser');
export interface SpotDifferenceController {
  execute(command: GameCommand): void;
  resize(viewport: Viewport): void;
  setReducedMotion(reducedMotion: boolean): void;
  dispose(): void;
}
export interface SpotDifferenceSceneOptions {
  level: SpotDifferenceLevel;
  baseImageUrl: string;
  editedImageUrl: string;
  layout: GameLayout;
  imageAspectRatio?: number;
  reducedMotion?: boolean;
  publishLayout?(layout: GameLayout): void;
  emit(event: GameEvent): void;
}

/** Phaser is supplied by the runtime's dynamic import, never loaded by the application shell. */
export function createSpotDifferenceScene(Phaser: PhaserModule, options: SpotDifferenceSceneOptions): {
  scene: PhaserTypes.Scene;
  controller: SpotDifferenceController;
} {
  class SpotDifferenceScene extends Phaser.Scene implements SpotDifferenceController {
    private layout = options.layout;
    private imageAspectRatio = options.imageAspectRatio ?? 1.5;
    private reducedMotion = options.reducedMotion ?? false;
    private state = createInitialState();
    private hintCounts: Record<string, number> = {};
    private highlightedId: string | null = null;
    private initialized = false;
    private disposed = false;
    private failed = false;
    private pendingCommands: GameCommand[] = [];
    private lastCommandSequence: number | null = null;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private markings: PhaserTypes.GameObjects.Graphics | null = null;

    constructor() { super({ key: 'spot-difference' }); }

    preload() {
      this.load.on('loaderror', this.handleLoadError, this);
      this.load.image('reference', options.baseImageUrl);
      this.load.image('edited', options.editedImageUrl);
    }

    create() {
      if (this.disposed || this.failed) return;
      try {
        if (!this.textures.exists('reference') || !this.textures.exists('edited')) {
          this.handleLoadError();
          return;
        }
        const reference = this.textures.getFrame('reference');
        const edited = this.textures.getFrame('edited');
        if (!reference || !edited || reference.realWidth !== edited.realWidth
          || reference.realHeight !== edited.realHeight || reference.realHeight <= 0) {
          this.reportError('两张关卡图片必须尺寸一致。请检查素材后点击“重来”。');
          return;
        }
        this.sourceWidth = reference.realWidth;
        this.sourceHeight = reference.realHeight;
        this.imageAspectRatio = this.sourceWidth / this.sourceHeight;
        this.layout = calculateLayout(this.layout.width, this.layout.height, this.imageAspectRatio);
        options.publishLayout?.(this.layout);
        this.initialized = true;
        this.renderBoard();
        this.input.on('pointerdown', this.handlePointer, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
        options.emit({ type: 'ready', total: options.level.differences.length });
        this.emitProgress();
        const pending = this.pendingCommands;
        this.pendingCommands = [];
        for (const command of pending) this.applyCommand(command);
      } catch {
        this.reportError('关卡画面未能启动，请点击“重来”重新加载。');
      }
    }

    private handleLoadError() {
      this.reportError('关卡图片暂时未能加载，请检查素材文件，点击“重来”重试。');
    }

    private reportError(message: string) {
      if (this.disposed || this.failed) return;
      this.failed = true;
      this.initialized = false;
      options.emit({ type: 'error', message });
    }

    execute(command: GameCommand) {
      if (this.disposed || this.lastCommandSequence === command.sequence) return;
      this.lastCommandSequence = command.sequence;
      if (!this.initialized) {
        this.pendingCommands.push(command);
        return;
      }
      this.applyCommand(command);
    }

    private applyCommand(command: GameCommand) {
      if (command.type === 'set-motion') { this.setReducedMotion(command.reducedMotion); return; }
      if (command.type === 'restart') {
        this.state = createInitialState();
        this.hintCounts = {};
        this.highlightedId = null;
        this.tweens.killAll();
        this.renderBoard();
        this.emitProgress();
        return;
      }
      if (command.type !== 'hint') return;
      const hint = getNextHint(options.level.differences, this.state.foundIds, this.hintCounts);
      if (!hint) {
        options.emit({ type: 'hint', message: '这一关已经完成，可以点击“重来”再观察一次。' });
        return;
      }
      this.hintCounts[hint.difference.id] = (this.hintCounts[hint.difference.id] ?? 0) + 1;
      this.highlightedId = hint.detailed ? hint.difference.id : null;
      this.renderMarkings();
      options.emit({ type: 'feedback', cue: 'hint' });
      options.emit({ type: 'hint', message: hint.message });
    }

    resize(viewport: Viewport) {
      this.layout = calculateLayout(viewport.width, viewport.height, this.imageAspectRatio);
      options.publishLayout?.(this.layout);
      if (this.initialized && !this.disposed) this.renderBoard();
    }

    setReducedMotion(reducedMotion: boolean) { this.reducedMotion = reducedMotion; }

    private renderBoard() {
      this.tweens.killAll();
      this.children.removeAll(true);
      this.markings = null;
      for (const rectangle of [this.layout.reference, this.layout.edited]) {
        this.add.image(rectangle.x, rectangle.y, 'reference').setOrigin(0)
          .setDisplaySize(rectangle.width, rectangle.height);
      }
      // Both sides share A. Only configured source rectangles can expose pixels from B.
      for (const { region } of options.level.differences) {
        this.add.image(this.layout.edited.x, this.layout.edited.y, 'edited')
          .setOrigin(0).setDisplaySize(this.layout.edited.width, this.layout.edited.height)
          .setCrop(region.x * this.sourceWidth, region.y * this.sourceHeight,
            region.width * this.sourceWidth, region.height * this.sourceHeight);
      }
      const borders = this.add.graphics().lineStyle(1, 0x998b70, 0.7);
      for (const rectangle of [this.layout.reference, this.layout.edited]) {
        borders.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      }
      this.markings = this.add.graphics();
      this.renderMarkings();
    }

    private renderMarkings() {
      if (!this.markings) return;
      this.markings.clear();
      for (const difference of options.level.differences) {
        const found = this.state.foundIds.includes(difference.id);
        const hinted = this.highlightedId === difference.id;
        if (!found && !hinted) continue;
        for (const image of [this.layout.reference, this.layout.edited]) {
          const rectangle = regionToRectangle(difference.region, image);
          if (hinted && !found) {
            this.markings.fillStyle(0xd0a64d, 0.14);
            this.markings.fillRoundedRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height, 5);
          }
          this.markings.lineStyle(found ? 3 : 2, found ? 0x357e77 : 0xbf8f35, 1);
          this.markings.strokeRoundedRect(rectangle.x + 1.5, rectangle.y + 1.5,
            Math.max(1, rectangle.width - 3), Math.max(1, rectangle.height - 3), 5);
        }
      }
    }

    private handlePointer(pointer: PhaserTypes.Input.Pointer) {
      if (!this.initialized || this.disposed || this.state.completed) return;
      const point = { x: pointer.x, y: pointer.y };
      const image = [this.layout.reference, this.layout.edited]
        .find((rectangle) => containsPoint(rectangle, point));
      // Labels and gutters are not wrong answers and cannot activate nearby targets.
      if (!image) return;
      const difference = findDifferenceAtPoint(options.level.differences, image, point);
      if (!difference) {
        options.emit({ type: 'feedback', cue: 'error' });
        if (this.reducedMotion) return;
        const ring = this.add.circle(point.x, point.y, 8).setStrokeStyle(2, 0x9b8c74, 0.75);
        this.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 320,
          onComplete: () => ring.destroy() });
        return;
      }
      const result = discoverDifference(this.state, difference.id, options.level.differences);
      if (!result.newlyFound) return;
      this.state = result.state;
      if (this.highlightedId === difference.id) this.highlightedId = null;
      this.renderMarkings();
      this.emitProgress();
      if (result.justCompleted) options.emit({ type: 'completed', levelId: options.level.id });
      else options.emit({ type: 'feedback', cue: 'success' });
    }

    private emitProgress() {
      options.emit({ type: 'progress', foundIds: [...this.state.foundIds], total: options.level.differences.length });
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.initialized = false;
      this.pendingCommands = [];
      this.input?.off('pointerdown', this.handlePointer, this);
      this.load?.off('loaderror', this.handleLoadError, this);
    }
  }
  const scene = new SpotDifferenceScene();
  return { scene, controller: scene };
}
