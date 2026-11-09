import { useEffect, useRef, useState } from 'react';
import type * as PhaserTypes from 'phaser';
import type { GameCommand, GameEvent, SpotDifferenceLevel } from '../types';
import type { SpotDifferenceController } from '../games/spot-difference/scene';
import { calculateLayout } from './layout';

export interface PhaserPlayerProps {
  level: SpotDifferenceLevel;
  baseImageUrl: string;
  editedImageUrl: string;
  onEvent: (event: GameEvent) => void;
  command: GameCommand | null;
}

export function PhaserPlayer({ level, baseImageUrl, editedImageUrl, onEvent, command }: PhaserPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef(onEvent);
  const commandRef = useRef(command);
  const controllerRef = useRef<SpotDifferenceController | null>(null);
  const pendingCommandsRef = useRef<GameCommand[]>([]);
  const processedSequenceRef = useRef<number | null>(null);
  const failedRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  eventRef.current = onEvent;
  commandRef.current = command;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let game: PhaserTypes.Game | null = null;
    let controller: SpotDifferenceController | null = null;
    failedRef.current = false;
    pendingCommandsRef.current = [];
    // A command from the previous level must not be replayed when opening this level.
    processedSequenceRef.current = commandRef.current?.sequence ?? null;
    const target = document.createElement('div');
    target.style.width = '100%';
    host.append(target);
    let layout = calculateLayout(host.getBoundingClientRect().width);
    let appliedWidth = 0;
    const updateLayout = () => {
      if (cancelled) return;
      const next = calculateLayout(host.getBoundingClientRect().width);
      if (next.width === appliedWidth) return;
      appliedWidth = next.width;
      layout = next;
      host.style.height = `${layout.height}px`;
      host.dataset.layout = JSON.stringify(layout);
      if (game) game.scale.resize(layout.width, layout.height);
      controller?.resize(layout);
    };
    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(host);
    const emit = (event: GameEvent) => {
      if (cancelled) return;
      if (event.type === 'error') failedRef.current = true;
      eventRef.current(event);
    };
    void (async () => {
      try {
        const [Phaser, { createSpotDifferenceScene }] = await Promise.all([
          import('phaser'), import('../games/spot-difference/scene'),
        ]);
        if (cancelled) return;
        const runtime = createSpotDifferenceScene(Phaser, { level, baseImageUrl, editedImageUrl, layout, emit });
        controller = runtime.controller;
        controllerRef.current = controller;
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: target,
          width: layout.width,
          height: layout.height,
          transparent: true,
          banner: false,
          canvasStyle: 'display: block;',
          scale: { mode: Phaser.Scale.NONE },
          scene: [runtime.scene],
          input: { activePointers: 2 },
        });
        game.canvas.setAttribute('aria-label', '找不同游戏画布，点击参照图或变化图中的差异');
        for (const pending of pendingCommandsRef.current.splice(0)) controller.execute(pending);
      } catch {
        emit({ type: 'error', message: '游戏运行组件未能加载，请点击“重来”重试。' });
      }
    })();
    return () => {
      cancelled = true;
      observer.disconnect();
      controller?.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
      game?.destroy(true);
      target.remove();
    };
  }, [level, baseImageUrl, editedImageUrl, attempt]);

  useEffect(() => {
    if (!command || command.sequence === processedSequenceRef.current) return;
    processedSequenceRef.current = command.sequence;
    if (command.type === 'restart' && failedRef.current) {
      setAttempt((value) => value + 1);
      return;
    }
    if (controllerRef.current) controllerRef.current.execute(command);
    else pendingCommandsRef.current.push(command);
  }, [command]);

  return <div ref={hostRef} data-testid="phaser-player" role="group"
    aria-label="找不同游戏区" style={{ width: '100%', minWidth: 0, touchAction: 'manipulation' }} />;
}
