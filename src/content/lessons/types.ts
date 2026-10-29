export interface LessonSource {
  id: string;
  title: string;
  url: string;
}

export interface LessonRegion { x: number; y: number; width: number; height: number }

export interface LessonPanel {
  id: string;
  label: string;
  title: string;
  body: string;
  imageAssetId: string;
  imageCaption: string;
  sourceIds: string[];
  focus?: LessonRegion;
  highlights?: LessonRegion[];
  swatch?: string;
}

export interface LessonQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  feedback: string;
}

export interface LessonUnit {
  id: string;
  kind: 'locations' | 'motifs' | 'geometry' | 'animals' | 'composition' | 'colors' | 'review';
  tabLabel: string;
  title: string;
  lead?: string;
  panels: LessonPanel[];
  question?: LessonQuestion;
  questions?: LessonQuestion[];
}

export interface LessonBook {
  id: string;
  themeId: string;
  version: number;
  title: string;
  sources: LessonSource[];
  units: LessonUnit[];
}
