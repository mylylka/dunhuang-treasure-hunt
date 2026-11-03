/** World contract: metres, Y up; horizontal positions use X/Z. No Phaser types. */
export interface WorldPoint { x: number; z: number }
export type DiscoveryId = 'caisson' | 'story-demo' | 'novice-story' | 'flying';
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
  overview?: boolean;
  observationTime?:number;
  caveLook?: number;
  buddhaVoice?: import('./flying-voice').FlyingVoiceState;
  hallArrival?: import('./hall-arrival').HallArrivalPhase;
  encounter?: import('./music-encounters').MusicEncounterState | null;
  encounterVoice?: import('./flying-voice').FlyingVoiceState;
  cinematic?: import('./character-cinematics').CinematicState | null;
  musicAudio?: { status: 'loading' | 'ready' | 'error'; unlocked: boolean; gain: number; playing: boolean; currentTime: number };
  flying?: { time: number; color: number; complete: boolean; awakened: boolean };
  flyingVoice?: import('./flying-voice').FlyingVoiceState;
}
export interface WorldRuntime {
  setPaused(paused: boolean): void;
  setOverview?(enabled: boolean): void;
  setView(view: WorldView): void;
  setJoystick(x: number, y: number): void;
  turnCamera(delta: number): void;
  tiltCamera?(delta: number): void;
  resetCameraLook?(): void;
  chooseHallDirection?(direction:'up'|'left'|'right'): void;
  setReducedMotion(reduced: boolean): void;
  resetToStart(): void;
  skipCinematic(): void;
  replayObservation(): void;
  setSound?(preferences: import('../services/sound-settings').SoundPreferences): void;
  retrySound?(): void;
  retryVoice?(): void;
  skipBuddhaVoice?(): void;
  retryBuddhaVoice?(): void;
  skipVoice?(): void;
  skipEncounter?(): void;
  retryEncounter?(): void;
  recordingAudio?(): MediaStream | null;
  captureFrame?(): string | undefined;
  inspect(): unknown;
  snapshot(): WorldSnapshot;
  dispose(): void;
}
export interface WorldRuntimeOptions {
  terrainVersion?: 'v001';
  terrainCaissonVersion?: 'v001';
  /** Transient preview view; never written into the world checkpoint. */
  initialLook?: number;
  initial: WorldCheckpoint;
  reducedMotion: boolean;
  onSnapshot(snapshot: WorldSnapshot): void;
  onInteract(): void;
  onError(message: string): void;
  onReady?(): void;
  mogao?: boolean;
  mogaoVersion?: 'v001' | 'v002' | 'v003' | 'v006' | 'v007' | 'v008' | 'v009' | 'v010' | 'v011' | 'v012';
  mogaoSurfaceVersion?: 'v004';
  mogaoFacadeVersion?: 'v005';
  musicPavilion?: boolean;
  musicVersion?: 'v001' | 'v002' | 'v003' | 'v004' | 'v005' | 'v006';
  flyingVoice?: boolean;
  sound?: import('../services/sound-settings').SoundPreferences;
  cinematics?: { seen: import('./character-cinematics').CinematicSeen; onSeen(seen: import('./character-cinematics').CinematicSeen): void };
}
