import type * as PhaserTypes from 'phaser';
import type { GameCommand, GameEvent, PuzzleLevel } from '../../types';
import type { Point, Rectangle, Viewport } from '../../runtime/geometry';
import { acceptsDrop, calculatePuzzleLayout, cellAt, contains, createPieceEdges, createPuzzleState, fullyWithin, isPuzzleComplete,
  placePiece, placedCount, rectangleIntersection, rotatePiece, scrollToPuzzlePiece, selectPiece, type PuzzleLayout } from './rules';
import { tracePiece } from './shapes';

export interface PuzzleController { execute(command: GameCommand): void; resize(viewport: Viewport): void; setReducedMotion(reduced: boolean): void; dispose(): void }
export interface PuzzleSceneOptions {
  level: PuzzleLevel; imageUrl: string; viewport: Viewport; imageAspectRatio: number; reducedMotion: boolean;
  emit(event: GameEvent): void; publishLayout(layout: PuzzleLayout): void;
}
interface PieceTexture { key: string; width: number; height: number; pad: number; alpha: Uint8Array }
interface Gesture { id: number; pieceId: number; start: Point; dragged: boolean; fromTray: boolean }
interface TrayScrollGesture { id: number; start: Point; startScroll: number }

/** Shared engine lifecycle belongs to PhaserPlayer; this scene owns only the current puzzle. */
export function createPuzzleScene(Phaser: typeof import('phaser'), options: PuzzleSceneOptions): { scene: PhaserTypes.Scene; controller: PuzzleController } {
  class PuzzleScene extends Phaser.Scene implements PuzzleController {
    private state = createPuzzleState(options.level);
    private viewport = options.viewport;
    private ratio = options.imageAspectRatio;
    private trayScroll = 0;
    private highlight: number | null = null;
    private layout = calculatePuzzleLayout(this.viewport.width, this.viewport.height, this.ratio, options.level, this.state);
    private reduced = options.reducedMotion;
    private ready = false;
    private disposed = false;
    private failed = false;
    private completed = false;
    private sequence: number | null = null;
    private pending: GameCommand[] = [];
    private texturesByPiece = new Map<number, PieceTexture>();
    private images = new Map<number, PhaserTypes.GameObjects.Image>();
    private gesture: Gesture | null = null;
    private scrollGesture: TrayScrollGesture | null = null;
    private sourceWidth = 0;
    private sourceHeight = 0;

    constructor() { super({ key: 'puzzle' }); }
    preload() { this.load.on('loaderror', this.loadError, this); this.load.image('puzzle-source', options.imageUrl); }
    create() {
      if (this.failed || this.disposed) return;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
      try {
        const frame = this.textures.getFrame('puzzle-source');
        if (!frame || frame.realWidth <= 0 || frame.realHeight <= 0) { this.loadError(); return; }
        this.sourceWidth = frame.realWidth; this.sourceHeight = frame.realHeight; this.ratio = frame.realWidth / frame.realHeight;
        this.prepareTextures(); this.ready = true;
        this.renderBoard(); this.emitChange();
        this.input.on('pointerdown', this.pointerDown, this); this.input.on('pointermove', this.pointerMove, this);
        this.input.on('pointerup', this.pointerUp, this); this.input.on('gameout', this.cancelGesture, this);
        this.game.canvas.addEventListener('wheel', this.wheel, { passive: false });
        options.emit({ type: 'ready', total: options.level.rows * options.level.columns });
        for (const command of this.pending.splice(0)) this.applyCommand(command);
      } catch {
        this.loadError();
      }
    }
    private loadError() {
      if (this.failed || this.disposed) return;
      this.failed = true; this.ready = false;
      options.emit({ type: 'error', message: '拼图图片暂时未能加载，请重试。' });
    }
    private prepareTextures() {
      const source = this.textures.get('puzzle-source').getSourceImage() as HTMLImageElement;
      const { rows, columns, mode, seed } = options.level;
      const width = this.sourceWidth / columns, height = this.sourceHeight / rows;
      const allEdges = createPieceEdges(rows, columns, seed);
      const guide = document.createElement('canvas'); guide.width = this.sourceWidth; guide.height = this.sourceHeight;
      const guideContext = guide.getContext('2d')!;
      // The backing image has no cut lines; empty slots should not reveal piece shapes.
      guideContext.globalAlpha = .055; guideContext.drawImage(source, 0, 0); guideContext.globalAlpha = 1;
      for (let id = 0; id < rows * columns; id++) {
        const row = Math.floor(id / columns), column = id % columns;
        const pad = mode === 'jigsaw' ? Math.ceil(Math.min(width, height) * .25) + 2 : 0;
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width + pad * 2); canvas.height = Math.ceil(height + pad * 2);
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.save(); context.translate(pad, pad);
        if (mode === 'jigsaw') { tracePiece(context, width, height, allEdges[id]); context.clip(); }
        else { context.beginPath(); context.rect(0, 0, width, height); context.clip(); }
        context.drawImage(source, -column * width, -row * height);
        context.restore();
        if (mode === 'jigsaw') {
          context.save(); context.translate(pad, pad); tracePiece(context, width, height, allEdges[id]);
          context.strokeStyle = 'rgba(79,55,29,.65)'; context.lineWidth = Math.max(1, width / 180); context.stroke(); context.restore();
        }
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for (let index = 0; index < alpha.length; index++) alpha[index] = pixels[index * 4 + 3];
        const key = `puzzle-piece-${id}`; this.textures.addCanvas(key, canvas);
        this.texturesByPiece.set(id, { key, width: canvas.width, height: canvas.height, pad, alpha });
      }
      this.textures.addCanvas('puzzle-guide', guide);
    }
    private renderBoard() {
      if (!this.ready || this.disposed) return;
      this.tweens.killAll(); this.children.removeAll(true); this.images.clear();
      this.layout = calculatePuzzleLayout(this.viewport.width, this.viewport.height, this.ratio, options.level, this.state, this.trayScroll, this.highlight);
      this.trayScroll = this.layout.trayScroll;
      const { board, tray } = this.layout;
      const decorations = this.add.graphics();
      decorations.fillStyle(0xfff9ec, .5).fillRect(board.x, board.y, board.width, board.height);
      decorations.lineStyle(1, 0xab946d, .7).strokeRect(board.x, board.y, board.width, board.height);
      if (tray) {
        decorations.lineStyle(1, 0xb59b73, .25).strokeRect(tray.x, tray.y, tray.width, tray.height);
        this.add.image(board.x, board.y, 'puzzle-guide').setOrigin(0).setDisplaySize(board.width, board.height);
      }
      // Placed pieces are drawn before the tray, so dragging can always rise above them.
      const ordered = [...this.layout.pieces].sort((a, b) => Number(b.placed) - Number(a.placed));
      const published = this.layout.pieces.map(piece => ({ ...piece }));
      for (const piece of ordered) {
        if (!piece.displayRect) continue;
        const texture = this.texturesByPiece.get(piece.id)!;
        let display = piece.displayRect;
        if (options.level.mode === 'rotation') {
          const image = this.add.image(display.x + display.width / 2, display.y + display.height / 2, texture.key)
            .setOrigin(.5).setDisplaySize(Math.max(1, display.width - 1), Math.max(1, display.height - 1)).setAngle(piece.turns * 90);
          this.images.set(piece.id, image);
        } else {
          const scale = piece.placed ? board.width / this.sourceWidth : Math.min(display.width / texture.width, display.height / texture.height) * .93;
          display = piece.placed
            ? { x: piece.targetRect.x - texture.pad * scale, y: piece.targetRect.y - texture.pad * scale, width: texture.width * scale, height: texture.height * scale }
            : { x: display.x + display.width / 2 - texture.width * scale / 2, y: display.y + display.height / 2 - texture.height * scale / 2, width: texture.width * scale, height: texture.height * scale };
          const image = this.add.image(display.x, display.y, texture.key).setOrigin(0).setDisplaySize(display.width, display.height);
          if (!piece.placed && tray) {
            // Texture-space cropping is supported by both Phaser 4 renderers. Legacy geometry masks are Canvas-only.
            const visible = rectangleIntersection(display, tray);
            if (!visible) { image.destroy(); published[piece.id].displayRect = null; published[piece.id].visible = false; published[piece.id].fullyVisible = false; continue; }
            if (!fullyWithin(display, tray)) image.setCrop((visible.x - display.x) / scale, (visible.y - display.y) / scale,
              visible.width / scale, visible.height / scale);
            published[piece.id].visible = true;
            published[piece.id].fullyVisible = fullyWithin(display, tray);
          }
          this.images.set(piece.id, image);
          published[piece.id].displayRect = display;
        }
      }
      const focus = this.add.graphics().lineStyle(2, 0xaa7432, 1);
      if (this.highlight !== null) {
        const target = this.layout.pieces[this.highlight]?.targetRect;
        if (target) focus.strokeRoundedRect(target.x + 1, target.y + 1, target.width - 2, target.height - 2, 3);
      }
      if (this.state.selectedId !== null) {
        const piece = published[this.state.selectedId];
        if (piece?.displayRect) {
          const rect = piece.displayRect;
          // The selection border is clipped too; it must never leak from a partially visible tray row.
          const outline = tray && !piece.placed ? rectangleIntersection(rect, tray) : rect;
          if (outline) focus.strokeRoundedRect(outline.x + 1, outline.y + 1, Math.max(1, outline.width - 2), Math.max(1, outline.height - 2), 4);
        }
      }
      this.layout = { ...this.layout, pieces: published };
      options.publishLayout(this.layout);
    }
    private emitChange() {
      options.emit({ type: 'puzzle-change', placedCount: placedCount(this.state, options.level.mode), total: this.state.turns.length });
    }
    private finishIfComplete() {
      if (!this.completed && isPuzzleComplete(this.state, options.level.mode)) {
        this.completed = true; options.emit({ type: 'completed', levelId: options.level.id });
      }
    }
    execute(command: GameCommand) {
      if (this.disposed || command.sequence === this.sequence) return;
      this.sequence = command.sequence;
      if (!this.ready) { this.pending.push(command); return; }
      this.applyCommand(command);
    }
    private applyCommand(command: GameCommand) {
      if (command.type === 'set-motion') { this.setReducedMotion(command.reducedMotion); return; }
      if (command.type === 'restart') {
        this.state = createPuzzleState(options.level); this.trayScroll = 0; this.highlight = null; this.completed = false; this.gesture = null; this.scrollGesture = null;
        this.renderBoard(); this.emitChange(); options.emit({ type: 'hint', message: '' }); return;
      }
      if (command.type === 'puzzle-scroll') { this.scrollTo(command.offset); return; }
      if (command.type !== 'hint' || this.completed) return;
      const id = options.level.mode === 'rotation' ? this.state.turns.findIndex(turn => turn !== 0)
        : this.state.selectedId ?? this.state.order.find(pieceId => !this.state.placedIds.includes(pieceId)) ?? -1;
      if (id < 0) return;
      this.highlight = id;
      options.emit({ type: 'feedback', cue: 'hint' });
      if (options.level.mode === 'rotation') options.emit({ type: 'hint', message: `比较高亮图块的朝向，再顺时针旋转 ${(4 - this.state.turns[id]) % 4} 次。` });
      else {
        this.state = selectPiece(this.state, id);
        this.trayScroll = scrollToPuzzlePiece(this.layout, this.state, id);
        options.emit({ type: 'hint', message: '把选中的碎片放到高亮位置。' });
      }
      this.renderBoard(); this.emitChange();
    }
    private hitTray(point: Point): number | null {
      // An image can extend beyond its clip viewport; clipped pixels can never begin a drag.
      if (!this.layout.tray || !contains(point, this.layout.tray)) return null;
      for (const piece of [...this.layout.pieces].reverse()) {
        if (piece.placed || !piece.displayRect || !contains(point, piece.displayRect)) continue;
        const texture = this.texturesByPiece.get(piece.id)!;
        const x = Math.min(texture.width - 1, Math.max(0, Math.floor((point.x - piece.displayRect.x) / piece.displayRect.width * texture.width)));
        const y = Math.min(texture.height - 1, Math.max(0, Math.floor((point.y - piece.displayRect.y) / piece.displayRect.height * texture.height)));
        if (texture.alpha[y * texture.width + x] > 100) return piece.id;
      }
      return null;
    }
    private pointerDown(pointer: PhaserTypes.Input.Pointer) {
      if (!this.ready || this.disposed || this.completed || this.gesture || this.scrollGesture) return;
      const point = { x: pointer.x, y: pointer.y };
      if (options.level.mode === 'rotation') {
        const id = cellAt(point, this.layout.board, options.level.rows, options.level.columns);
        if (id !== null) this.gesture = { id: pointer.id, pieceId: id, start: point, dragged: false, fromTray: false };
        return;
      }
      const id = this.hitTray(point);
      if (id !== null) {
        this.state = selectPiece(this.state, id); this.highlight = null; this.renderBoard();
        this.gesture = { id: pointer.id, pieceId: id, start: point, dragged: false, fromTray: true };
      } else if (this.layout.tray && contains(point, this.layout.tray)) {
        // Only empty tray space pans the tray. Starting on opaque piece pixels always picks up that piece.
        this.scrollGesture = { id: pointer.id, start: point, startScroll: this.trayScroll };
      } else if (this.state.selectedId !== null && contains(point, this.layout.board)) {
        this.gesture = { id: pointer.id, pieceId: this.state.selectedId, start: point, dragged: false, fromTray: false };
      }
    }
    private pointerMove(pointer: PhaserTypes.Input.Pointer) {
      if (this.scrollGesture?.id === pointer.id && pointer.isDown) {
        const distance = pointer.y - this.scrollGesture.start.y;
        if (Math.abs(distance) > 6) this.scrollTo(this.scrollGesture.startScroll - distance, true);
        return;
      }
      const gesture = this.gesture;
      if (!gesture || gesture.id !== pointer.id || !pointer.isDown || options.level.mode !== 'jigsaw' || !gesture.fromTray) return;
      if (Math.hypot(pointer.x - gesture.start.x, pointer.y - gesture.start.y) > 6) gesture.dragged = true;
      if (!gesture.dragged) return;
      const image = this.images.get(gesture.pieceId), texture = this.texturesByPiece.get(gesture.pieceId);
      if (!image || !texture) return;
      const scale = this.layout.board.width / this.sourceWidth;
      // Once picked up, the complete piece follows the pointer across the viewport boundary.
      image.setCrop().setDisplaySize(texture.width * scale, texture.height * scale)
        .setPosition(pointer.x - texture.width * scale / 2, pointer.y - texture.height * scale / 2).setDepth(10);
    }
    private pointerUp(pointer: PhaserTypes.Input.Pointer) {
      if (this.scrollGesture?.id === pointer.id) { this.scrollGesture = null; return; }
      const gesture = this.gesture;
      if (!gesture || gesture.id !== pointer.id) return;
      this.gesture = null;
      const point = { x: pointer.x, y: pointer.y };
      const moved = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 6;
      if (options.level.mode === 'rotation') {
        if (moved) return;
        this.state = rotatePiece(this.state, gesture.pieceId); this.highlight = null; this.renderBoard(); this.emitChange();
        const image = this.images.get(gesture.pieceId);
        if (image && !this.reduced) {
          const target = image.angle; image.setAngle(target - 90);
          this.tweens.add({ targets: image, angle: target, duration: 140, ease: 'Sine.Out' });
        }
        this.finishIfComplete();
        if (!this.completed) options.emit({ type: 'feedback', cue: 'rotate' });
        return;
      }
      if (gesture.fromTray && !gesture.dragged && !moved) return;
      const targetId = cellAt(point, this.layout.board, options.level.rows, options.level.columns);
      const target = this.layout.pieces[gesture.pieceId].targetRect;
      const accepted = targetId === gesture.pieceId && (!gesture.dragged || acceptsDrop(point, target));
      if (accepted) {
        const next = placePiece(this.state, gesture.pieceId, targetId);
        if (next !== this.state && !isPuzzleComplete(next, options.level.mode)) options.emit({ type: 'feedback', cue: 'success' });
        this.state = next; this.highlight = null;
        options.emit({ type: 'hint', message: '' });
      } else {
        // Letting go outside the board is a cancelled placement, not a wrong answer.
        if (targetId !== null) options.emit({ type: 'feedback', cue: 'error' });
        options.emit({ type: 'hint', message: '还没对上，比较图案和边缘后再试一次。' });
      }
      this.renderBoard(); this.emitChange(); this.finishIfComplete();
    }
    private scrollTo(offset: number, keepSwipe = false) {
      if (!this.ready || this.disposed || !this.layout.tray) return;
      const next = Math.max(0, Math.min(this.layout.trayMaxScroll, Number.isFinite(offset) ? offset : 0));
      // A wheel/scrollbar action cancels a pending piece gesture, never places it or increments progress.
      const hadPieceGesture = this.gesture !== null;
      this.gesture = null;
      if (!keepSwipe) this.scrollGesture = null;
      if (Math.abs(next - this.trayScroll) < .01 && !hadPieceGesture) return;
      this.trayScroll = next; this.renderBoard();
    }
    private wheel = (event: WheelEvent) => {
      if (!this.ready || this.disposed || !this.layout.tray) return;
      const bounds = this.game.canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const point = { x: (event.clientX - bounds.left) * this.viewport.width / bounds.width,
        y: (event.clientY - bounds.top) * this.viewport.height / bounds.height };
      if (!contains(point, this.layout.tray)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.layout.tray.height : 1;
      this.scrollTo(this.trayScroll + event.deltaY * unit);
    };
    private cancelGesture() {
      this.scrollGesture = null;
      if (this.gesture) { this.gesture = null; this.renderBoard(); }
    }
    resize(viewport: Viewport) {
      const previousRowHeight = this.layout.trayRowHeight;
      this.viewport = viewport; this.gesture = null; this.scrollGesture = null;
      if (this.ready) {
        const next = calculatePuzzleLayout(viewport.width, viewport.height, this.ratio, options.level, this.state);
        // Preserve the fractional tray row on a resize; placement state remains untouched.
        if (previousRowHeight > 0) this.trayScroll = this.trayScroll / previousRowHeight * next.trayRowHeight;
        this.renderBoard(); this.emitChange();
      }
    }
    setReducedMotion(reduced: boolean) { this.reduced = reduced; if (reduced && this.ready) this.renderBoard(); }
    dispose() {
      if (this.disposed) return;
      this.disposed = true; this.ready = false; this.pending = []; this.gesture = null; this.scrollGesture = null;
      this.input?.off('pointerdown', this.pointerDown, this); this.input?.off('pointermove', this.pointerMove, this);
      this.input?.off('pointerup', this.pointerUp, this); this.input?.off('gameout', this.cancelGesture, this);
      this.game?.canvas?.removeEventListener('wheel', this.wheel);
      this.load?.off('loaderror', this.loadError, this); this.tweens?.killAll(); this.images.clear(); this.texturesByPiece.clear();
    }
  }
  const scene = new PuzzleScene(); return { scene, controller: scene };
}
