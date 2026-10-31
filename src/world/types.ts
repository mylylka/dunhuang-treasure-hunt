/** World contract: metres, Y up; horizontal positions use X/Z. No Phaser types. */
export interface WorldPoint { x: number; z: number }
export type DiscoveryId = 'caisson' | 'story-demo';
export type WorldView = 'follow' | 'caisson' | 'story';
export interface WorldCheckpoint {
  version: 1;
  position: WorldPoint;
  heading: number;
  cameraYaw: number;
  visitedEvents: DiscoveryId[];
}
export interface WorldSnapshot {
  checkpoint: WorldCheckpoint;
  nearby: DiscoveryId | null;
  location: string;
  moving: boolean;
  cinematic?: import('./character-cinematics').CinematicState | null;
}
export interface WorldRuntime {
  setPaused(paused: boolean): void;
  setView(view: WorldView): void;
  setJoystick(x: number, y: number): void;
  turnCamera(delta: number): void;
  setReducedMotion(reduced: boolean): void;
  resetToStart(): void;
  skipCinematic(): void;
  inspect(): unknown;
  snapshot(): WorldSnapshot;
  dispose(): void;
}
export interface WorldRuntimeOptions {
  initial: WorldCheckpoint;
  reducedMotion: boolean;
  onSnapshot(snapshot: WorldSnapshot): void;
  onInteract(): void;
  onError(message: string): void;
  onReady?(): void;
  cinematics?: { seen: import('./character-cinematics').CinematicSeen; onSeen(seen: import('./character-cinematics').CinematicSeen): void };
}
