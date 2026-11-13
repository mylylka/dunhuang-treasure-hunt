export interface ShadowMatchSnapshot {
  optionIds: string[];
  selectedOptionId: string | null;
  wrongOptionIds: string[];
  completed: boolean;
  hintIndex: number | null;
  message: string;
}

export interface ShadowImageLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShadowCardLayout extends ShadowImageLayout {
  /** Actual full-image drawing rectangle in CSS pixels; labels sit below it. */
  image: ShadowImageLayout;
}

export interface ShadowMatchLayout {
  width: number;
  height: number;
  reference: ShadowCardLayout;
  /** In the same order as ShadowMatchSnapshot.optionIds. */
  options: ShadowCardLayout[];
}
