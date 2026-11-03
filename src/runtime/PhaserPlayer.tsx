import { useEffect, useRef, useState } from 'react';
import type * as PhaserTypes from 'phaser';
import type { ColoringLevel, GameCommand, GameEvent, RegionColors, SpotDifferenceLevel, PuzzleLevel, HiddenObjectLevel, ShadowMatchLevel } from '../types';
import type { HiddenObjectPool } from '../games/hidden-object/types';
import type { Viewport } from './geometry';
import { calculateLayout, type GameLayout } from './layout';
import { calculateColoringLayout } from '../games/coloring/rules';
import type { PuzzleLayout } from '../games/puzzle/rules';
import type { ShadowMatchLayout } from '../games/shadow-match/types';
import { soundPlayer } from '../services/sound';
import '../styles/player.css';

interface PlayerCommonProps {
  onEvent: (event: GameEvent) => void;
  command: GameCommand | null;
  imageAspectRatio?: number;
  reducedMotion?: boolean;
}
export interface SpotDifferencePlayerProps extends PlayerCommonProps {
  level: SpotDifferenceLevel;
  baseImageUrl: string;
  editedImageUrl: string;
}
export interface ColoringPlayerProps extends PlayerCommonProps {
  level: ColoringLevel;
  lineImageUrl: string;
  regionMapImageUrl: string;
  initialColors: RegionColors;
}
export interface PuzzlePlayerProps extends PlayerCommonProps {
  level: PuzzleLevel;
  imageUrl: string;
  onPuzzleLayout?: (layout: PuzzleLayout) => void;
}
export interface HiddenObjectPlayerProps extends PlayerCommonProps {
  level: HiddenObjectLevel;
  hiddenObjectPool: HiddenObjectPool;
}
export interface ShadowMatchPlayerProps extends PlayerCommonProps {
  level: ShadowMatchLevel;
  shadowImages: Record<string, string>;
  onShadowLayout?: (layout: ShadowMatchLayout) => void;
}
export type PhaserPlayerProps = SpotDifferencePlayerProps | ColoringPlayerProps | PuzzlePlayerProps | HiddenObjectPlayerProps | ShadowMatchPlayerProps;
interface RuntimeController {
  execute(command: GameCommand): void;
  resize(viewport: Viewport): void;
  setReducedMotion(reducedMotion: boolean): void;
  dispose(): void;
}

export function PhaserPlayer(props: PhaserPlayerProps) {
  const { level, onEvent, command } = props;
  const baseImageUrl = 'baseImageUrl' in props ? props.baseImageUrl : '';
  const editedImageUrl = 'editedImageUrl' in props ? props.editedImageUrl : '';
  const lineImageUrl = 'lineImageUrl' in props ? props.lineImageUrl : '';
  const regionMapImageUrl = 'regionMapImageUrl' in props ? props.regionMapImageUrl : '';
  const imageUrl = 'imageUrl' in props ? props.imageUrl : '';
  const hiddenObjectPool = 'hiddenObjectPool' in props ? props.hiddenObjectPool : undefined;
  const shadowImages = 'shadowImages' in props ? props.shadowImages : undefined;
  const aspectRatio = props.imageAspectRatio ?? (level.gameType === 'spot-difference' ? 1.5 : 1);
  const hostRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [labelLayout, setLabelLayout] = useState<GameLayout | null>(null);
  const eventRef = useRef(onEvent);
  const commandRef = useRef(command);
  const controllerRef = useRef<RuntimeController | null>(null);
  const puzzleLayoutRef = useRef<PuzzlePlayerProps['onPuzzleLayout']>(undefined);
  puzzleLayoutRef.current = 'onPuzzleLayout' in props ? props.onPuzzleLayout : undefined;
  const shadowLayoutRef = useRef<ShadowMatchPlayerProps['onShadowLayout']>(undefined);
  shadowLayoutRef.current = 'onShadowLayout' in props ? props.onShadowLayout : undefined;
  const initialColorsRef = useRef<RegionColors>({});
  if ('initialColors' in props) initialColorsRef.current = props.initialColors;
  const pendingCommandsRef = useRef<GameCommand[]>([]);
  const processedSequenceRef = useRef<number | null>(null);
  const failedRef = useRef(false);
  const completedSoundRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const motionRef = useRef(false);
  motionRef.current = Boolean(props.reducedMotion || systemReducedMotion);
  eventRef.current = onEvent;
  commandRef.current = command;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let game: PhaserTypes.Game | null = null;
    let controller: RuntimeController | null = null;
    const highDensity = level.gameType === 'hidden-object' || level.gameType === 'shadow-match';
    const density = () => highDensity ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 1;
    let pixelRatio = density();
    failedRef.current = false;
    completedSoundRef.current = false;
    pendingCommandsRef.current = [];
    // A command from the previous level must not be replayed when opening this level.
    processedSequenceRef.current = commandRef.current?.sequence ?? null;
    const target = document.createElement('div');
    target.style.width = '100%';
    target.style.height = '100%';
    target.style.minHeight = '0';
    mountRef.current?.append(target);
    const initialBounds = host.getBoundingClientRect();
    let viewport: Viewport = { width: Math.max(1, Math.floor(initialBounds.width)), height: Math.max(1, Math.floor(initialBounds.height)) };
    let appliedWidth = 0;
    let appliedHeight = 0;
    let appliedPixelRatio = 0;
    const resizeGame = (activeGame: PhaserTypes.Game) => {
      if (cancelled) return;
      if (!highDensity) {
        activeGame.scale.resize(viewport.width, viewport.height);
        return;
      }
      // Phaser 4's documented ScaleManager zoom separates canvas backing pixels from CSS size.
      // Keep fractional DPR rounding out of logical layout and pointer coordinates.
      if (activeGame.scale.zoom !== 1 / pixelRatio) activeGame.scale.setZoom(1 / pixelRatio);
      activeGame.scale.resize(Math.round(viewport.width * pixelRatio), Math.round(viewport.height * pixelRatio));
      activeGame.canvas.style.width = `${viewport.width}px`;
      activeGame.canvas.style.height = `${viewport.height}px`;
      activeGame.scale.refresh();
      host.dataset.renderPixelRatio = String(pixelRatio);
    };
    const updateLayout = () => {
      if (cancelled) return;
      const bounds = host.getBoundingClientRect();
      const next = { width: Math.max(1, Math.floor(bounds.width)), height: Math.max(1, Math.floor(bounds.height)) };
      const nextPixelRatio = density();
      if (next.width === appliedWidth && next.height === appliedHeight && nextPixelRatio === appliedPixelRatio) return;
      appliedWidth = next.width;
      appliedHeight = next.height;
      appliedPixelRatio = nextPixelRatio;
      pixelRatio = nextPixelRatio;
      viewport = next;
      if (!controller) {
        const initialLayout = level.gameType === 'spot-difference' ? calculateLayout(viewport.width, viewport.height, aspectRatio)
          : level.gameType === 'coloring' ? calculateColoringLayout(viewport.width, viewport.height, aspectRatio) : viewport;
        host.dataset.layout = JSON.stringify(initialLayout);
        if (level.gameType === 'spot-difference') setLabelLayout(initialLayout as GameLayout);
      }
      if (game) resizeGame(game);
      controller?.resize(viewport);
    };
    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(host);
    // Moving a window between displays can change DPR without changing the host's CSS bounds.
    if (highDensity) window.addEventListener('resize', updateLayout);
    const emit = (event: GameEvent) => {
      if (cancelled) return;
      if (event.type === 'feedback') soundPlayer.play(event.cue);
      if (event.type === 'completed' && !completedSoundRef.current) {
        completedSoundRef.current = true;
        soundPlayer.play('complete');
      }
      if (event.type === 'error') failedRef.current = true;
      eventRef.current(event);
    };
    void (async () => {
      try {
        const Phaser = await import('phaser');
        if (cancelled) return;
        const publishLayout = (layout: unknown) => {
          if (cancelled) return;
          host.dataset.layout = JSON.stringify(layout);
          if (level.gameType === 'spot-difference') setLabelLayout(layout as GameLayout);
          if (level.gameType === 'puzzle') puzzleLayoutRef.current?.(layout as PuzzleLayout);
          if (level.gameType === 'shadow-match') shadowLayoutRef.current?.(layout as ShadowMatchLayout);
          const presentation = layout as { animating?: boolean; reducedMotion?: boolean };
          if (presentation.animating !== undefined) host.dataset.animating = String(presentation.animating);
          if (presentation.reducedMotion !== undefined) host.dataset.reducedMotion = String(presentation.reducedMotion);
        };
        let runtime: { scene: PhaserTypes.Scene; controller: RuntimeController };
        if (level.gameType === 'spot-difference') {
          const { createSpotDifferenceScene } = await import('../games/spot-difference/scene');
          if (cancelled) return;
          runtime = createSpotDifferenceScene(Phaser, { level, baseImageUrl, editedImageUrl,
            layout: calculateLayout(viewport.width, viewport.height, aspectRatio), imageAspectRatio: aspectRatio,
            reducedMotion: motionRef.current, publishLayout, emit });
        } else if (level.gameType === 'coloring') {
          const { createColoringScene } = await import('../games/coloring/scene');
          if (cancelled) return;
          runtime = createColoringScene(Phaser, { level, lineImageUrl, regionMapImageUrl,
            initialColors: initialColorsRef.current, viewport, imageAspectRatio: aspectRatio,
            reducedMotion: motionRef.current, publishLayout, emit });
        } else if (level.gameType === 'hidden-object' && hiddenObjectPool) {
          const { createHiddenObjectScene } = await import('../games/hidden-object/scene');
          if (cancelled) return;
          runtime = createHiddenObjectScene(Phaser, { level, pool: hiddenObjectPool, viewport,
            reducedMotion: motionRef.current, publishLayout, emit });
        } else if (level.gameType === 'shadow-match' && shadowImages) {
          const { createShadowMatchScene } = await import('../games/shadow-match/scene');
          if (cancelled) return;
          runtime = createShadowMatchScene(Phaser, { level, images: shadowImages, viewport,
            reducedMotion: motionRef.current, publishLayout, emit });
        } else {
          const { createPuzzleScene } = await import('../games/puzzle/scene');
          if (cancelled) return;
          if (level.gameType !== 'puzzle') throw new Error('缺少玩法资源');
          runtime = createPuzzleScene(Phaser, { level, imageUrl, viewport, imageAspectRatio: aspectRatio,
            reducedMotion: motionRef.current, publishLayout, emit });
        }
        controller = runtime.controller;
        controllerRef.current = controller;
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: target,
          width: Math.round(viewport.width * pixelRatio),
          height: Math.round(viewport.height * pixelRatio),
          transparent: true,
          banner: false,
          audio: { noAudio: true },
          canvasStyle: 'display: block;',
          scale: highDensity ? { mode: Phaser.Scale.NONE, zoom: 1 / pixelRatio } : { mode: Phaser.Scale.NONE },
          callbacks: highDensity ? { postBoot: resizeGame } : undefined,
          scene: [runtime.scene],
          input: { activePointers: 2 },
        });
        game.canvas.setAttribute('aria-label', level.gameType === 'spot-difference'
          ? '找不同游戏画布，点击参照图或变化图中的差异' : level.gameType === 'coloring' ? '填色画布，点击区域上色，放大后可拖动' : level.gameType === 'hidden-object' ? '计时找物画布，寻找任务物件，放大后可拖动查看' : level.gameType === 'shadow-match' ? '影子配对画布，对照彩色飞天选择完全一致的影子' : '拼图画布，旋转图块或将碎片放回图中');
        for (const pending of pendingCommandsRef.current.splice(0)) controller.execute(pending);
      } catch {
        emit({ type: 'error', message: '游戏运行组件未能加载，请点击“重来”重试。' });
      }
    })();
    return () => {
      cancelled = true;
      observer.disconnect();
      if (highDensity) window.removeEventListener('resize', updateLayout);
      controller?.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
      game?.destroy(true);
      target.remove();
    };
  }, [level, baseImageUrl, editedImageUrl, lineImageUrl, regionMapImageUrl, imageUrl, hiddenObjectPool, shadowImages, aspectRatio, attempt]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    controllerRef.current?.setReducedMotion(Boolean(props.reducedMotion || systemReducedMotion));
  }, [props.reducedMotion, systemReducedMotion]);

  useEffect(() => {
    if (!command || command.sequence === processedSequenceRef.current) return;
    processedSequenceRef.current = command.sequence;
    if (command.type === 'restart') completedSoundRef.current = false;
    if (command.type === 'restart' && failedRef.current) {
      setAttempt((value) => value + 1);
      return;
    }
    if (controllerRef.current) controllerRef.current.execute(command);
    else pendingCommandsRef.current.push(command);
  }, [command]);

  return <div ref={hostRef} data-testid="phaser-player" data-game-type={level.gameType} role="group"
    aria-label={level.gameType === 'coloring' ? '填色游戏区' : level.gameType === 'puzzle' ? '拼图游戏区' : level.gameType === 'hidden-object' ? '计时找物游戏区' : level.gameType === 'shadow-match' ? '影子配对游戏区' : '找不同游戏区'}
    style={{ position: 'relative', width: '100%', height: '100%', flex: '1 1 0', minWidth: 0,
      minHeight: 0, touchAction: level.gameType === 'spot-difference' ? 'manipulation' : 'none' }}>
    <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: 0 }} />
    {level.gameType === 'spot-difference' && labelLayout && <>
      <span className="game-image-label" data-testid="reference-label" style={{ left: labelLayout.referenceLabel.x, top: labelLayout.referenceLabel.y + 2 }}>参照图 A</span>
      <span className="game-image-label" data-testid="edited-label" style={{ left: labelLayout.editedLabel.x, top: labelLayout.editedLabel.y + 2 }}>变化图 B</span>
    </>}
  </div>;
}
