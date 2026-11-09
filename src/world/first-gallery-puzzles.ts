const WORLD_ASSETS = 'first-gallery/v001';
export const MURAL_ROUNDS = ['lotus', 'bird', 'grapes'] as const;
export type MuralRoundId = typeof MURAL_ROUNDS[number];

export const FIRST_GALLERY_MURAL_TEXTURES = {
  full: `${WORLD_ASSETS}/mural-full.jpg`,
  worn: `${WORLD_ASSETS}/mural-worn.jpg`,
  masks: {
    lotus: `${WORLD_ASSETS}/mural-lotus-mask.png`,
    bird: `${WORLD_ASSETS}/mural-bird-mask.png`,
    grapes: `${WORLD_ASSETS}/mural-grapes-mask.png`,
  },
} as const;

type MuralRound = {
  title: string;
  prompt: string;
  hint: string;
  note: string;
  correctPiece: number;
  pieceLabels: readonly string[];
  width: number;
  height: number;
};

export const FIRST_GALLERY_MURAL_ROUNDS: Record<MuralRoundId, MuralRound> = {
  lotus: {
    title: '莲花 · 补一片花瓣',
    prompt: '看花心上方的缺口。哪片花瓣能顺着边缘补进去？',
    hint: '把尖端朝上，再看看花瓣两边的弧线。',
    note: '莲花纹常常围绕花心展开，既像真花，又比真花更整齐。',
    correctPiece: 2,
    pieceLabels: ['尖端朝左上', '尖端朝上', '尖端朝右上'],
    width: 698, height: 600,
  },
  bird: {
    title: '飞鸟 · 找到对称方向',
    prompt: '看右边的鸟。左边的鸟该朝哪边，才能和它相对？',
    hint: '看鸟喙指向哪里，再看看两只鸟是否一起朝向中央的花。',
    note: '飞鸟纹可以两两相对，也常和其他纹样一起在边饰上重复。',
    correctPiece: 2,
    pieceLabels: ['鸟喙向左', '鸟喙向右'],
    width: 1755, height: 253,
  },
  grapes: {
    title: '葡萄 · 接上卷曲的藤',
    prompt: '顺着葡萄上方的藤蔓看，哪一段能接住缺口两边？',
    hint: '比较两端的高低和卷曲方向。',
    note: '葡萄藤和卷叶常顺着一个方向连续展开，形成整条装饰。',
    correctPiece: 3,
    pieceLabels: ['第一段藤蔓', '第二段藤蔓', '第三段藤蔓'],
    width: 473, height: 295,
  },
};

export function nextMuralRound(completed: readonly string[]): MuralRoundId | null {
  return MURAL_ROUNDS.find(round => !completed.includes(round)) ?? null;
}

export function muralRoundArt(round: MuralRoundId) {
  return {
    board: `${WORLD_ASSETS}/mural-${round}-board.jpg`,
    pieces: FIRST_GALLERY_MURAL_ROUNDS[round].pieceLabels.map((label, index) => ({
      id: index + 1, label, path: `${WORLD_ASSETS}/mural-${round}-piece-${index + 1}.png`,
    })),
  };
}

type Point = readonly [number, number];
type Hotspot = { center: Point; contour: readonly Point[] };
export type RabbitId = 'top' | 'right' | 'bottom';
export type EarId = 'top-right' | 'right-bottom' | 'bottom-top';

export const CAISSON_ART = 'caisson-three-hares/v002/three-hares-center.jpg';
export const CAISSON_ART_VIEW = [0, 0, 767, 766] as const;
export const CAISSON_DETAIL_VIEW = [312, 319, 136, 136] as const;
export const CAISSON_RABBITS = ['top', 'right', 'bottom'] as const;
export const CAISSON_EARS = ['top-right', 'right-bottom', 'bottom-top'] as const;

export const CAISSON_RABBIT_HOTSPOTS: Record<RabbitId, Hotspot & {
  label: string; head: Point; ears: readonly [EarId, EarId];
}> = {
  top: {
    label: '上方的兔子', center: [356, 346], head: [357, 369], ears: ['top-right', 'bottom-top'],
    contour: [[322, 352], [333, 344], [337, 340], [344, 340], [353, 337], [362, 336],
      [369, 332], [383, 329], [394, 327], [401, 330], [395, 332], [389, 331], [384, 337],
      [391, 343], [383, 351], [371, 354], [362, 356], [350, 358], [349, 362], [353, 357],
      [359, 355], [363, 359], [366, 366], [366, 372], [362, 376], [353, 374], [348, 372],
      [349, 365], [344, 359], [339, 357], [331, 361], [323, 369], [321, 366], [329, 358],
      [338, 353], [335, 347], [329, 352], [322, 355]],
  },
  right: {
    label: '右侧的兔子', center: [422, 385], head: [403, 369], ears: ['top-right', 'right-bottom'],
    contour: [[415, 338], [420, 348], [422, 355], [417, 360], [423, 359], [430, 355],
      [429, 346], [431, 341], [433, 349], [435, 362], [433, 365], [430, 366], [433, 376],
      [432, 386], [430, 398], [428, 409], [426, 419], [421, 425], [421, 421], [423, 410],
      [421, 404], [415, 401], [415, 406], [413, 406], [415, 399], [412, 393], [413, 382],
      [411, 377], [404, 377], [399, 376], [396, 371], [398, 365], [403, 359], [406, 359],
      [412, 365], [413, 370], [415, 363], [413, 359], [418, 353]],
  },
  bottom: {
    label: '左下的兔子', center: [351, 420], head: [379, 408], ears: ['right-bottom', 'bottom-top'],
    contour: [[324, 393], [331, 401], [336, 401], [343, 405], [346, 405], [345, 401],
      [348, 400], [351, 405], [359, 408], [363, 413], [370, 418], [381, 421], [384, 422],
      [389, 429], [400, 431], [402, 433], [392, 434], [384, 430], [382, 426], [381, 435],
      [390, 442], [392, 448], [387, 444], [379, 440], [371, 438], [363, 434], [354, 429],
      [344, 421], [337, 417], [331, 410], [324, 403], [323, 398], [326, 400], [333, 406],
      [329, 399], [324, 396], [368, 414], [369, 408], [374, 402], [381, 401], [385, 405],
      [389, 411], [383, 416], [374, 417]],
  },
};

export const CAISSON_EAR_HOTSPOTS: Record<EarId, Hotspot & { label: string }> = {
  'top-right': {
    label: '上方横向的耳朵', center: [380, 369],
    contour: [[365, 366], [375, 366], [386, 368], [394, 370], [396, 373], [387, 372], [376, 371], [365, 370]],
  },
  'right-bottom': {
    label: '斜向右上方的耳朵', center: [390, 387],
    contour: [[380, 401], [382, 394], [389, 385], [397, 376], [400, 376], [396, 382], [388, 391], [384, 399]],
  },
  'bottom-top': {
    label: '斜向左上方的耳朵', center: [365, 387],
    contour: [[360, 375], [365, 381], [369, 390], [372, 398], [372, 404], [369, 403], [365, 394], [362, 384]],
  },
};

export type CaissonSelection = { kind: 'rabbit'; id: RabbitId } | { kind: 'ear'; id: EarId };
export type CaissonState = { rabbits: readonly RabbitId[]; ears: readonly EarId[] } & (
  | { step: 'rabbit' }
  | { step: 'ears'; current: RabbitId; found: readonly EarId[] }
  | { step: 'reveal'; shared: EarId; remaining: RabbitId }
  | { step: 'complete'; shared: EarId }
);

export function createCaissonState(): CaissonState {
  return { step: 'rabbit', rabbits: [], ears: [] };
}

export function selectCaissonTarget(state: CaissonState, target: CaissonSelection): {
  state: CaissonState; result: 'accepted' | 'incorrect' | 'repeat';
} {
  const incorrect = { state, result: 'incorrect' as const };
  if (state.step === 'complete') return incorrect;
  if (state.step !== 'ears') {
    if (target.kind !== 'rabbit') return incorrect;
    if (state.rabbits.includes(target.id)) return { state, result: 'repeat' };
    const rabbits = [...state.rabbits, target.id];
    if (state.step === 'reveal') {
      if (target.id !== state.remaining) return incorrect;
      return { state: { step: 'complete', rabbits, ears: state.ears, shared: state.shared }, result: 'accepted' };
    }
    return { state: { step: 'ears', rabbits, ears: state.ears, current: target.id, found: [] }, result: 'accepted' };
  }

  const currentEars = CAISSON_RABBIT_HOTSPOTS[state.current].ears;
  if (target.kind !== 'ear' || !currentEars.includes(target.id)) return incorrect;
  if (state.found.includes(target.id)) return { state, result: 'repeat' };
  const found = [...state.found, target.id];
  // A lit physical ear still needs confirmation for each rabbit that uses it.
  const ears = state.ears.includes(target.id) ? state.ears : [...state.ears, target.id];
  if (found.length < 2) return { state: { ...state, ears, found }, result: 'accepted' };
  if (state.rabbits.length === 1) return { state: { step: 'rabbit', rabbits: state.rabbits, ears }, result: 'accepted' };

  const shared = CAISSON_RABBIT_HOTSPOTS[state.rabbits[0]].ears.find(ear => currentEars.includes(ear))!;
  const remaining = CAISSON_RABBITS.find(rabbit => !state.rabbits.includes(rabbit))!;
  return { state: { step: 'reveal', rabbits: state.rabbits, ears, shared, remaining }, result: 'accepted' };
}

export function caissonTargets(state: CaissonState): readonly CaissonSelection[] {
  if (state.step === 'complete') return [];
  if (state.step === 'ears') return CAISSON_EARS.map(id => ({ kind: 'ear', id }));
  return CAISSON_RABBITS.map(id => ({ kind: 'rabbit', id }));
}

export function caissonHotspot(selection: CaissonSelection): Hotspot & { label: string } {
  return selection.kind === 'rabbit' ? CAISSON_RABBIT_HOTSPOTS[selection.id] : CAISSON_EAR_HOTSPOTS[selection.id];
}

/** Use the trace when possible, with a modest pixel allowance for touch. */
export function hitCaissonTarget(
  state: CaissonState, point: Point, touchRadius: number,
): CaissonSelection | undefined {
  let nearest: CaissonSelection | undefined;
  let minimum = Infinity;
  for (const target of caissonTargets(state)) {
    const { contour, center } = caissonHotspot(target);
    let inside = false;
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      const [xi, yi] = contour[i], [xj, yj] = contour[j];
      if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    if (inside) return target;
    const distance = Math.hypot(point[0] - center[0], point[1] - center[1]);
    if (distance <= touchRadius && distance < minimum) {
      minimum = distance;
      nearest = target;
    }
  }
  return nearest;
}
