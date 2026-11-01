/** World contract: metres, Y up; horizontal positions use X/Z. No Phaser types. */
export interface WorldPoint { x: number; z: number }
export type DiscoveryId = 'caisson' | 'story-demo' | 'flying';
export type WorldView = 'follow' | 'caisson' | 'story' | 'flying';
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
  musicAudio?: { status: 'loading' | 'ready' | 'error'; unlocked: boolean; gain: number; playing: boolean; currentTime: number };
  flying?: { time: number; color: number; complete: boolean; awakened: boolean };
}
export interface WorldRuntime {
  setPaused(paused: boolean): void;
  setView(view: WorldView): void;
  setJoystick(x: number, y: number): void;
  turnCamera(delta: number): void;
  setReducedMotion(reduced: boolean): void;
  resetToStart(): void;
  skipCinematic(): void;
  replayObservation(): void;
  setSound?(preferences: import('../services/sound-settings').SoundPreferences): void;
  retrySound?(): void;
  recordingAudio?(): MediaStream | null;
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
  musicPavilion?: boolean;
  musicVersion?: 'v001' | 'v002' | 'v003';
  sound?: import('../services/sound-settings').SoundPreferences;
  cinematics?: { seen: import('./character-cinematics').CinematicSeen; onSeen(seen: import('./character-cinematics').CinematicSeen): void };
}
