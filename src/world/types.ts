/** World contract: metres, Y up; horizontal positions use X/Z. No Phaser types. */
export interface WorldPoint { x: number; z: number }
export type DiscoveryId = 'caisson' | 'story-demo' | 'novice-story' | 'flying';
export type WorldView = 'follow' | 'caisson' | 'story' | 'flying';
export type MogaoExhibitHall = 'hall-a' | 'hall-b';
export interface WorldCheckpoint {
  version: 1;
  position: WorldPoint;
  heading: number;
  cameraYaw: number;
  visitedEvents: DiscoveryId[];
  /** Stable walkable surface for independently versioned multilevel previews. */
  walkSurface?: string;
}
export interface WorldSnapshot {
  currentGallery?: import('./connected-gallery-session').ConnectedGallery;
  galleryGate?: string;
  gallery?: import('./first-gallery-events').FirstGallerySnapshot & {
    portal?: import('./first-gallery-portal').GalleryPortalPhase;
    portalReady?: boolean;
    caissonOffer?: boolean;
    caissonAssist?: boolean;
  };
  checkpoint: WorldCheckpoint;
  nearby: DiscoveryId | null;
  location: string;
  moving: boolean;
  overview?: boolean;
  upper?: { surface: string; label: string; height: number };
  stairAssist?: { up: boolean; down: boolean; active: string | null };
  previewEntry?: 'loading' | 'failed';
  companion?: import('./companion-follow').MusicCompanionState & { speech: ReturnType<ReturnType<typeof import('./companion-speech').createCompanionSpeech>['inspect']> };
  musicGuide?: import('./music-guide-visit').MusicGuideSnapshot;
  observationTime?:number;
  caveLook?: number;
  buddhaVoice?: import('./flying-voice').FlyingVoiceState;
  hallArrival?: import('./hall-arrival').HallArrivalPhase;
  mogaoGamePortalNearby?: boolean;
  musicGamePortalNearby?: boolean;
  mogaoHallArrival?: { hall: MogaoExhibitHall; phase: 'title' | 'entering' | 'intro' };
  encounter?: import('./music-encounters').MusicEncounterState | null;
  encounterVoice?: import('./flying-voice').FlyingVoiceState;
  cinematic?: import('./character-cinematics').CinematicState | null;
  musicAudio?: { status: 'loading' | 'ready' | 'error'; unlocked: boolean; gain: number; playing: boolean; currentTime: number };
  flying?: { time: number; color: number; complete: boolean; awakened: boolean };
  flyingVoice?: import('./flying-voice').FlyingVoiceState;
  flyingHistory?: import('./flying-history').FlyingHistorySnapshot;
}
export interface WorldRuntime {
  setMusicGalleryAccess?(unlocked: boolean, prewarmCliffTower: boolean): void;
  setGalleryInteractionBlocked?(blocked: boolean): void;
  setMogaoExhibitGateLocked?(locked: boolean): void;
  setMogaoHallAGateLocked?(locked: boolean): void;
  unlockMogaoGamePortal?(): void;
  unlockMusicGamePortal?(): void;
  finishHallArrival?(): void;
  retryPreviewStreaming?(): void;
  showGalleryCue?(lines: readonly import('../content/world/first-gallery-v001').GalleryLine[], retainWhileMoving?: boolean): void;
  playGalleryCaissonNarration?(id: import('../content/world/first-gallery-narration').FirstGalleryNarrationId, onFinish: () => void): void;
  skipGalleryCue?(): boolean;
  observeGalleryCaisson?(enabled: boolean): void;
  /** Original image UV corners TL, TR, BR, BL in viewport CSS pixels. */
  galleryCaissonQuad?(): readonly { x: number; y: number }[] | null;
  setGalleryArtwork?(canvas: HTMLCanvasElement): void;
  requestGalleryMural?(): void;
  startGalleryMural?(): void;
  declineGalleryMural?(): void;
  exitGalleryMural?(): void;
  startGalleryPortal?(): void;
  skipGalleryPortal?(): void;
  dismissGalleryPortal?(): void;
  setPaused(paused: boolean): void;
  setOverview?(enabled: boolean): void;
  setView(view: WorldView): void;
  setJoystick(x: number, y: number): void;
  turnCamera(delta: number): void;
  tiltCamera?(delta: number): void;
  resetCameraLook?(): void;
  setStairAssist?(direction: 'up' | 'down' | null): void;
  chooseHallDirection?(direction:'up'|'left'|'right'): void;
  setReducedMotion(reduced: boolean): void;
  resetToStart(): void;
  skipCinematic(): void;
  replayObservation(): void;
  setSound?(preferences: import('../services/sound-settings').SoundPreferences): void;
  retrySound?(): void;
  finishCompanionDialogue?(): void;
  replayCompanionDialogue?(): void;
  interactMusicGuide?(): void;
  respondMusicGuide?(response: 'dress' | 'plain' | 'dismiss'): void;
  selectMusicGuideOutfit?(id: import('../content/world/music-guide-v001').MusicGuideOutfitId,
    progress: (fraction: number | null) => void, signal: AbortSignal): Promise<boolean>;
  finishMusicGuideLine?(line?: import('../content/world/music-guide-v001').MusicGuideLineId): void;
  setMusicGuideCaptionPresented?(line: import('../content/world/music-guide-v001').MusicGuideLineId, presented: boolean): void;
  setMusicGuideVoicePlaying?(line: import('../content/world/music-guide-v001').MusicGuideLineId, playing: boolean): void;
  cancelMusicGuideLine?(): void;
  retryVoice?(): void;
  skipBuddhaVoice?(): void;
  skipVoice?(): void;
  controlFlyingHistory?(action: import('./flying-history').FlyingHistoryAction): void;
  setFlyingHistoryCaptionPresented?(phase: import('./flying-history').FlyingHistorySnapshot['phase'], chapter: number | null, presented: boolean): void;
  skipEncounter?(): void;
  retryEncounter?(): void;
  recordingAudio?(): MediaStream | null;
  captureFrame?(): string | undefined;
  inspect(): unknown;
  snapshot(): WorldSnapshot;
  dispose(): void;
}
export interface WorldRuntimeOptions {
  connectedGalleries?: boolean;
  musicGalleryUnlocked?: boolean;
  firstGallery?: boolean;
  onGalleryInteract?(id: import('../content/world/first-gallery-v001').GalleryInteraction, object?: 'lotus' | 'bird' | 'grapes'): void;
  mogaoExhibit?: {
    gateLocked: boolean;
    hallAGateLocked?: boolean;
    gamePortalUnlocked?: boolean;
    onGamePortal?(): void;
    onInteract(id: import('../content/world/mogao-exhibit-v001').MogaoExhibitTarget): void;
    onStory?(id: import('./mogao-hall-a-scene').MogaoHallAStoryId): void;
    onGateOpened(): void;
    onHallAGateOpened?(): void;
    canStartHallArrival?(hall: MogaoExhibitHall): boolean;
  };
  terrainVersion?: 'v001';
  environmentVersion?: 'v001';
  terrainCaissonVersion?: 'v001';
  mogaoUpperVersion?: 'v002';
  companionVersion?: 'v001' | 'v002';
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
  musicBalconyV2?: boolean;
  musicGuide?: boolean;
  musicGamePortal?: { unlocked: boolean; onEnter(): void };
  onMusicGuideWardrobe?(): void;
  onMusicInstrument?(id: import('../content/world/music-instruments-v001').MusicInstrumentId): void;
  onMusicFlyingChapter?(index: number): void;
  musicVersion?: 'v001' | 'v002' | 'v003' | 'v004' | 'v005' | 'v006';
  flyingVoice?: boolean;
  flyingHistory?: boolean;
  sound?: import('../services/sound-settings').SoundPreferences;
  cinematics?: { seen: import('./character-cinematics').CinematicSeen; onSeen(seen: import('./character-cinematics').CinematicSeen): void };
}
