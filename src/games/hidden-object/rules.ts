import type {
  HiddenObjectBoard, HiddenObjectItem, HiddenObjectPool, HiddenObjectRecipe, HiddenObjectRound,
  HiddenObjectSession, HiddenObjectSprite, HiddenObjectTask,
} from './types';

function requireCondition(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`找物配置：${message}`);
}

function positive(value: number): boolean { return Number.isFinite(value) && value > 0; }
function integer(value: number, minimum = 0): boolean { return Number.isSafeInteger(value) && value >= minimum; }
function nonempty(value: string): boolean { return typeof value === 'string' && value.trim().length > 0; }

function randomFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function validate(recipe: HiddenObjectRecipe, pool: HiddenObjectPool): void {
  requireCondition(nonempty(recipe.poolId) && recipe.poolId === pool.id, '素材池编号不匹配。');
  const board = recipe.board;
  requireCondition(positive(board.width) && positive(board.height), '盘面宽高须为正数。');
  requireCondition(integer(board.columns, 1) && integer(board.rows, 1), '网格行列须为正整数。');
  requireCondition(Number.isFinite(board.inset) && board.inset >= 0 && Number.isFinite(board.jitter) && board.jitter >= 0, '安全边距与抖动须为非负数。');
  requireCondition(board.width / board.columns > board.inset * 2 && board.height / board.rows > board.inset * 2, '参考尺寸没有可用的安全区域。');
  requireCondition(positive(board.minScale ?? .7) && positive(board.maxScale ?? 1.08)
    && (board.minScale ?? .7) <= (board.maxScale ?? 1.08), '散放尺寸范围无效。');
  requireCondition(Number.isFinite(board.maxRotationDegrees ?? 24) && (board.maxRotationDegrees ?? 24) >= 0
    && (board.maxRotationDegrees ?? 24) <= 180, '散放旋转角度无效。');
  requireCondition(positive(recipe.timeLimitSeconds), '时限须为正数。');
  requireCondition(recipe.categoryQuotas.length > 0, '至少需要一个类别配额。');
  const categoryIds = recipe.categoryQuotas.map(quota => quota.categoryId);
  requireCondition(categoryIds.every(nonempty) && new Set(categoryIds).size === categoryIds.length, '类别配额编号不能为空或重复。');
  requireCondition(recipe.categoryQuotas.every(quota => integer(quota.count)), '类别配额须为非负整数。');
  const total = recipe.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0);
  requireCondition(integer(total, 1), '盘面物件总数须为正整数。');

  const groupIds = pool.groups.map(group => group.id);
  requireCondition(groupIds.every(nonempty) && new Set(groupIds).size === groupIds.length && pool.groups.every(group => nonempty(group.label)), '任务组编号或名称无效。');
  const requested = recipe.tasks;
  requireCondition(requested.groupIds.length > 0 && new Set(requested.groupIds).size === requested.groupIds.length, '候选任务组不能为空或重复。');
  requireCondition(requested.groupIds.every(id => groupIds.includes(id)), '候选任务组在素材池中不存在。');
  requireCondition(integer(requested.groupCount, 1) && requested.groupCount <= requested.groupIds.length, '任务组数量超出候选范围。');
  requireCondition(integer(requested.minCount, 1) && integer(requested.maxCount, requested.minCount), '每组目标数量范围无效。');
  requireCondition(requested.groupCount * requested.minCount <= total, '类别配额不足以容纳目标。');
  if (requested.totalCount !== undefined) {
    requireCondition(integer(requested.totalCount, requested.groupCount * requested.minCount)
      && requested.totalCount <= requested.groupCount * requested.maxCount && requested.totalCount <= total,
    '目标总数须位于各组数量范围内且不超过盘面物件数。');
  }

  const spriteIds = pool.sprites.map(sprite => sprite.id);
  requireCondition(spriteIds.every(nonempty) && new Set(spriteIds).size === spriteIds.length, '素材编号不能为空或重复。');
  for (const sprite of pool.sprites) {
    requireCondition(nonempty(sprite.categoryId) && nonempty(sprite.path), `素材 ${sprite.id} 缺少类别或路径。`);
    requireCondition(positive(sprite.width) && positive(sprite.height), `素材 ${sprite.id} 尺寸无效。`);
    requireCondition(new Set(sprite.groupIds).size === sprite.groupIds.length && sprite.groupIds.every(id => groupIds.includes(id)), `素材 ${sprite.id} 的任务分类无效。`);
    requireCondition(Number.isFinite(sprite.hitPoint.x) && Number.isFinite(sprite.hitPoint.y)
      && sprite.hitPoint.x >= 0 && sprite.hitPoint.x <= 1 && sprite.hitPoint.y >= 0 && sprite.hitPoint.y <= 1, `素材 ${sprite.id} 的命中参考点越界。`);
  }
}

/** A task's copies must all use one sprite/category; only different target types are drawn without replacement. */
function allocateTargets(required: number[], candidates: HiddenObjectSprite[][], quotas: HiddenObjectRecipe['categoryQuotas'], pool: HiddenObjectPool): HiddenObjectSprite[] {
  const categoryIndex = new Map(quotas.map((quota, index) => [quota.categoryId, index]));
  const remaining = quotas.map(quota => quota.count);
  const availableCounts = quotas.map(quota => pool.sprites.filter(sprite => sprite.categoryId === quota.categoryId).length);
  const selectedCounts = quotas.map(() => 0);
  const options = candidates.map((sprites, group) => sprites.flatMap(sprite => {
    const category = categoryIndex.get(sprite.categoryId);
    return category !== undefined && remaining[category] >= required[group] ? [{ sprite, category }] : [];
  }));
  const order = required.map((_, group) => group).sort((first, second) => options[first].length - options[second].length);
  const chosen: HiddenObjectSprite[] = Array(required.length);
  const used = new Set<string>();
  function search(depth: number): boolean {
    const pending = order.slice(depth);
    const viable = pending.map(group => options[group].filter(({ sprite, category }) => !used.has(sprite.id) && remaining[category] >= required[group]));
    if (viable.some(sprites => sprites.length === 0)) return false;
    // Repeated targets can cover a category whose quota exceeds its number of distinct sprites.
    for (let category = 0; category < quotas.length; category++) {
      const deficit = remaining[category] - (availableCounts[category] - selectedCounts[category]);
      const possibleCopies = pending.reduce((sum, group, index) => sum
        + (viable[index].some(option => option.category === category) ? required[group] - 1 : 0), 0);
      if (deficit > possibleCopies) return false;
    }
    if (depth === order.length) return true;
    const group = order[depth];
    for (const { sprite, category } of viable[0]) {
      chosen[group] = sprite; used.add(sprite.id);
      remaining[category] -= required[group]; selectedCounts[category]++;
      if (search(depth + 1)) return true;
      remaining[category] += required[group]; selectedCounts[category]--;
      used.delete(sprite.id);
    }
    return false;
  }
  requireCondition(search(0), '目标素材或类别配额不足，无法生成可完成的一局。');
  return chosen;
}

/** Validate every selectable target allocation without generating coordinates or consuming randomness. */
export function validateHiddenObjectRecipe(recipe: HiddenObjectRecipe, pool: HiddenObjectPool): void {
  validate(recipe, pool);
  const { tasks } = recipe;
  const totalItems = recipe.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0);
  requireCondition(tasks.totalCount !== undefined || tasks.groupCount * tasks.maxCount <= totalItems,
    '类别配额不足以容纳所有可能的目标数量。');
  const candidates = tasks.groupIds.map(group => pool.sprites.filter(sprite => sprite.groupIds.includes(group)));
  const selected: HiddenObjectSprite[][] = [], required: number[] = [];
  function counts(group: number, used: number): void {
    if (group === tasks.groupCount) {
      allocateTargets(required, selected, recipe.categoryQuotas, pool);
      return;
    }
    const pending = tasks.groupCount - group - 1;
    const minimum = tasks.totalCount === undefined ? tasks.minCount
      : Math.max(tasks.minCount, tasks.totalCount - used - pending * tasks.maxCount);
    const maximum = tasks.totalCount === undefined ? tasks.maxCount
      : Math.min(tasks.maxCount, tasks.totalCount - used - pending * tasks.minCount);
    for (let count = minimum; count <= maximum; count++) {
      required[group] = count;
      counts(group + 1, used + count);
    }
  }
  function groups(start: number): void {
    if (selected.length === tasks.groupCount) { counts(0, 0); return; }
    const pending = tasks.groupCount - selected.length;
    for (let group = start; group <= candidates.length - pending; group++) {
      selected.push(candidates[group]); groups(group + 1); selected.pop();
    }
  }
  groups(0);
}

export function rotatedItemBounds(item: Pick<HiddenObjectItem, 'x' | 'y' | 'width' | 'height' | 'rotation'>): { x: number; y: number; width: number; height: number } {
  const cosine = Math.abs(Math.cos(item.rotation)), sine = Math.abs(Math.sin(item.rotation));
  const width = item.width * cosine + item.height * sine;
  const height = item.width * sine + item.height * cosine;
  return { x: item.x + (item.width - width) / 2, y: item.y + (item.height - height) / 2, width, height };
}

type ScatterBounds = ReturnType<typeof rotatedItemBounds>;

/** Repair only positions: a sparse patch must not be hidden by a dense neighbouring column. */
function repairLocalBalance(items: HiddenObjectItem[], board: HiddenObjectBoard, random: () => number): HiddenObjectItem[] | undefined {
  const boxes = items.map(rotatedItemBounds);
  const totalArea = boxes.reduce((sum, box) => sum + box.width * box.height, 0);
  const globalDensity = totalArea / (board.width * board.height);
  // Sparse test/custom recipes cannot populate every small window. The dense
  // production scrolls have enough objects for a meaningful local coverage floor.
  if (globalDensity <= .45) return items;
  const floor = globalDensity * .65;
  const windows: (ScatterBounds & { kind: 'local' | 300 | 600 })[] = [];
  const starts = (last: number, step: number): number[] => {
    const values = Array.from({ length: Math.floor(last / step) + 1 }, (_, index) => index * step);
    if (values.at(-1) !== last) values.push(last);
    return values;
  };
  const width = Math.min(320, board.width), height = Math.min(300, board.height);
  for (const y of starts(board.height - height, 75)) for (const x of starts(board.width - width, 80)) {
    windows.push({ x, y, width, height, kind: 'local' });
  }
  const localCount = windows.length;
  for (const h of [300, 600] as const) for (const y of starts(board.height - Math.min(h, board.height), 100)) {
    windows.push({ x: 0, y, width: board.width, height: Math.min(h, board.height), kind: h });
  }
  const overlap = (box: ScatterBounds, window: ScatterBounds) => Math.max(0, Math.min(box.x + box.width, window.x + window.width) - Math.max(box.x, window.x))
    * Math.max(0, Math.min(box.y + box.height, window.y + window.height) - Math.max(box.y, window.y));
  let densities = windows.map(window => boxes.reduce((sum, box) => sum + overlap(box, window), 0) / (window.width * window.height));
  const energy = (values: number[]) => values.slice(0, localCount).reduce((sum, value) => sum + Math.max(0, floor - value) ** 2, 0);
  const verticalPass = (values: number[]) => ([300, 600] as const).every(h => {
    const valuesForHeight = values.filter((_value, index) => windows[index].kind === h);
    return Math.max(...valuesForHeight) - Math.min(...valuesForHeight) < (h === 300 ? .25 : .15);
  });
  const holeLimit = 65, holeWeight = .05;
  const distanceSquared = (box: ScatterBounds, point: { x: number; y: number }) => Math.max(box.x - point.x, 0, point.x - box.x - box.width) ** 2
    + Math.max(box.y - point.y, 0, point.y - box.y - box.height) ** 2;
  const penalty = (squared: number) => Math.max(0, Math.sqrt(squared) / holeLimit - 1) ** 2;
  const measureHoles = () => {
    const points: { x: number; y: number; nearest: number; second: number; owner: number; penalty: number }[] = [];
    const bad: number[] = [], owners: number[][] = boxes.map(() => []);
    let maximum = { distance: 0, x: 0, y: 0 }, total = 0;
    // Sample the 2D free space, including the edges. These are measurement
    // points only; object positions remain continuous, with no snapping.
    for (const y of starts(board.height - board.inset * 2, 20)) for (const x of starts(board.width - board.inset * 2, 20)) {
      const point = { x: x + board.inset, y: y + board.inset, nearest: Infinity, second: Infinity, owner: -1, penalty: 0 };
      for (let index = 0; index < boxes.length; index++) {
        const squared = distanceSquared(boxes[index], point);
        if (squared < point.nearest) { point.second = point.nearest; point.nearest = squared; point.owner = index; }
        else if (squared < point.second) point.second = squared;
      }
      point.penalty = penalty(point.nearest); total += point.penalty;
      owners[point.owner].push(points.length);
      if (point.penalty > 0) bad.push(points.length);
      const distance = Math.sqrt(point.nearest);
      if (distance > maximum.distance) maximum = { distance, x: point.x, y: point.y };
      points.push(point);
    }
    return { points, bad, owners, maximum, total };
  };
  let holes = measureHoles();
  let currentEnergy = energy(densities) + holes.total * holeWeight;
  const output = [...items];
  for (let step = 0; step < 24; step++) {
    let worst = 0;
    for (let index = 1; index < localCount; index++) if (densities[index] < densities[worst]) worst = index;
    if (densities[worst] >= floor - 1e-10 && holes.maximum.distance <= holeLimit + 1e-10) return output;
    const fillHole = holes.maximum.distance / holeLimit - 1 > Math.max(0, (floor - densities[worst]) / floor);
    const target = fillHole ? { x: Math.max(0, Math.min(board.width - width, holes.maximum.x - width / 2)),
      y: Math.max(0, Math.min(board.height - height, holes.maximum.y - height / 2)), width, height } : windows[worst];
    const start = Math.floor(random() * boxes.length);
    let best: { index: number; next: ScatterBounds; values: number[]; score: number } | undefined;
    // At most two continuous random positions per existing object, per repair.
    // No fresh sprites, size changes or unbounded searches are introduced.
    for (let trial = 0; trial < boxes.length * 2; trial++) {
      const index = (start + Math.floor(trial / 2)) % boxes.length, old = boxes[index];
      if (overlap(old, target) > old.width * old.height * .2) continue;
      const minX = Math.max(board.inset, fillHole ? holes.maximum.x - old.width - holeLimit / 2 : target.x);
      const minY = Math.max(board.inset, fillHole ? holes.maximum.y - old.height - holeLimit / 2 : target.y);
      const maxX = Math.min(board.width - board.inset - old.width, fillHole ? holes.maximum.x + holeLimit / 2 : target.x + target.width - old.width);
      const maxY = Math.min(board.height - board.inset - old.height, fillHole ? holes.maximum.y + holeLimit / 2 : target.y + target.height - old.height);
      if (maxX < minX || maxY < minY) continue;
      const next = { x: minX + random() * (maxX - minX), y: minY + random() * (maxY - minY), width: old.width, height: old.height };
      if (boxes.some((other, otherIndex) => otherIndex !== index && next.x < other.x + other.width + 2
        && next.x + next.width + 2 > other.x && next.y < other.y + other.height + 2 && next.y + next.height + 2 > other.y)) continue;
      const values = densities.map((value, i) => value + (overlap(next, windows[i]) - overlap(old, windows[i])) / (windows[i].width * windows[i].height));
      // Other currently-safe samples cannot get worse when their nearest box
      // stays put. Only the donor's samples and existing holes need reevaluation.
      let holeEnergy = holes.total;
      for (const pointIndex of new Set([...holes.bad, ...holes.owners[index]])) {
        const point = holes.points[pointIndex];
        const squared = Math.min(point.owner === index ? point.second : point.nearest, distanceSquared(next, point));
        holeEnergy += penalty(squared) - point.penalty;
      }
      const score = energy(values) + holeEnergy * holeWeight;
      if (score < (best?.score ?? currentEnergy) - 1e-12 && verticalPass(values)) best = { index, next, values, score };
    }
    if (!best) break;
    densities = best.values; boxes[best.index] = best.next; holes = measureHoles();
    currentEnergy = energy(densities) + holes.total * holeWeight;
    const item = output[best.index];
    output[best.index] = { ...item, x: best.next.x + (best.next.width - item.width) / 2,
      y: best.next.y + (best.next.height - item.height) / 2 };
  }
  return densities.slice(0, localCount).every(value => value >= floor - 1e-10) && holes.maximum.distance <= holeLimit + 1e-10 ? output : undefined;
}

function scatterItems(selected: { sprite: HiddenObjectSprite; groupId?: string }[], board: HiddenObjectBoard, random: () => number): HiddenObjectItem[] {
  const referenceWidth = board.width / board.columns - board.inset * 2;
  const referenceHeight = board.height / board.rows - board.inset * 2;
  const minScale = board.minScale ?? .7, maxScale = board.maxScale ?? 1.08;
  const maxRotation = (board.maxRotationDegrees ?? 24) * Math.PI / 180;
  const prototypes = shuffled(selected, random).map(({ sprite, groupId }, index): HiddenObjectItem => {
    const scale = Math.min(referenceWidth / sprite.width, referenceHeight / sprite.height) * (minScale + random() * (maxScale - minScale));
    return {
      id: `item-${index}`, spriteId: sprite.id, categoryId: sprite.categoryId,
      ...(groupId ? { groupId } : {}), x: 0, y: 0,
      width: sprite.width * scale, height: sprite.height * scale, rotation: (random() * 2 - 1) * maxRotation,
    };
  });
  const ordered = prototypes.map(item => ({ item, bounds: rotatedItemBounds(item) }))
    .sort((first, second) => second.bounds.width * second.bounds.height - first.bounds.width * first.bounds.height);
  const usableWidth = board.width - board.inset * 2, usableHeight = board.height - board.inset * 2;
  requireCondition(ordered.every(({ bounds }) => bounds.width <= usableWidth && bounds.height <= usableHeight), '旋转后物件超出盘面，请调整尺寸配置。');
  const occupiedArea = ordered.reduce((area, { bounds }) => area + bounds.width * bounds.height, 0);
  requireCondition(occupiedArea <= usableWidth * usableHeight,
    '散放空间不足，不能完整摆放全部物件。');
  const cellWidth = board.width / board.columns, cellHeight = board.height / board.rows;
  const gap = 2;
  type Occupied = { item: HiddenObjectItem; bounds: ReturnType<typeof rotatedItemBounds> };
  function cellKeys(bounds: ReturnType<typeof rotatedItemBounds>): number[] {
    const left = Math.max(0, Math.floor(bounds.x / cellWidth)), top = Math.max(0, Math.floor(bounds.y / cellHeight));
    const right = Math.min(board.columns - 1, Math.floor((bounds.x + bounds.width) / cellWidth));
    const bottom = Math.min(board.rows - 1, Math.floor((bounds.y + bounds.height) / cellHeight));
    const keys: number[] = [];
    for (let row = top; row <= bottom; row++) for (let column = left; column <= right; column++) keys.push(row * board.columns + column);
    return keys;
  }
  const minimumWidth = Array<number>(ordered.length + 1).fill(Infinity), minimumHeight = Array<number>(ordered.length + 1).fill(Infinity);
  for (let index = ordered.length - 1; index >= 0; index--) {
    minimumWidth[index] = Math.min(minimumWidth[index + 1], ordered[index].bounds.width);
    minimumHeight[index] = Math.min(minimumHeight[index + 1], ordered[index].bounds.height);
  }
  function remainingSpaces(spaces: ScatterBounds[], occupied: ScatterBounds, nextIndex: number): ScatterBounds[] {
    if (nextIndex >= ordered.length) return [];
    const cut = { x: occupied.x - gap, y: occupied.y - gap, width: occupied.width + gap * 2, height: occupied.height + gap * 2 };
    const split = spaces.flatMap(space => {
      const right = space.x + space.width, bottom = space.y + space.height;
      const cutRight = cut.x + cut.width, cutBottom = cut.y + cut.height;
      if (cut.x >= right || cutRight <= space.x || cut.y >= bottom || cutBottom <= space.y) return [space];
      const pieces: ReturnType<typeof rotatedItemBounds>[] = [];
      if (cut.x > space.x) pieces.push({ ...space, width: cut.x - space.x });
      if (cutRight < right) pieces.push({ ...space, x: cutRight, width: right - cutRight });
      if (cut.y > space.y) pieces.push({ ...space, height: cut.y - space.y });
      if (cutBottom < bottom) pieces.push({ ...space, y: cutBottom, height: bottom - cutBottom });
      return pieces;
    });
    // This necessary fit condition cannot remove a space usable by any remaining
    // object. Prune before the quadratic containment check, without capping spaces.
    const useful = split.filter(space => space.width >= minimumWidth[nextIndex] && space.height >= minimumHeight[nextIndex]);
    return useful.filter((space, index) => !useful.some((other, otherIndex) => otherIndex !== index
      && other.x <= space.x && other.y <= space.y && other.x + other.width >= space.x + space.width
      && other.y + other.height >= space.y + space.height
      && (otherIndex < index || other.width > space.width || other.height > space.height)));
  }
  // Dense boards skip two costly global trials and keep the existing 14 free-space attempts.
  // Retrying changes positions only: no missing objects or progressively smaller sprites.
  const firstAttempt = occupiedArea / (usableWidth * usableHeight) > .55 ? 2 : 0;
  for (let attempt = firstAttempt; attempt < 16; attempt++) {
    const buckets = new Map<number, Occupied[]>();
    const placed = new Map<string, HiddenObjectItem>();
    // These regions measure occupied area only; positions never snap to their edges or centres.
    const densityColumns = 6, densityRows = 12;
    const densityWidth = board.width / densityColumns, densityHeight = board.height / densityRows;
    const coverage = Array<number>(densityColumns * densityRows).fill(0);
    const coverageParts = (box: ReturnType<typeof rotatedItemBounds>) => coverage.map((_, index) => {
      const x = (index % densityColumns) * densityWidth, y = Math.floor(index / densityColumns) * densityHeight;
      return Math.max(0, Math.min(box.x + box.width, x + densityWidth) - Math.max(box.x, x))
        * Math.max(0, Math.min(box.y + box.height, y + densityHeight) - Math.max(box.y, y));
    });
    const densityScore = (box: ReturnType<typeof rotatedItemBounds>) => coverageParts(box)
      .reduce((sum, area, index) => sum + area * coverage[index], 0)
      / (box.width * box.height * densityWidth * densityHeight);
    let freeSpaces = [{ x: board.inset, y: board.inset, width: usableWidth, height: usableHeight }];
    for (const [prototypeIndex, prototype] of ordered.entries()) {
      let accepted: Occupied | undefined;
      let bestScore = Infinity, validCandidates = 0;
      const available = attempt >= 2 ? freeSpaces.filter(candidate => candidate.width >= prototype.bounds.width
        && candidate.height >= prototype.bounds.height) : [];
      // Dense rounds may need closer-fitting spaces after the broad sampling attempts.
      // They still compete by coverage score, keeping position choice spatially balanced.
      if (attempt >= 8) available.sort((first, second) => Math.min(first.width - prototype.bounds.width, first.height - prototype.bounds.height)
        - Math.min(second.width - prototype.bounds.width, second.height - prototype.bounds.height));
      // Compare legal random candidates so the entire scroll stays evenly populated.
      for (let trial = 0; trial < (attempt < 2 ? 800 : 32) && validCandidates < 8; trial++) {
        let space = { x: board.inset, y: board.inset, width: usableWidth, height: usableHeight };
        if (attempt >= 2) {
          if (!available.length) break;
          space = available[Math.floor(random() * (attempt >= 8 ? Math.min(8, available.length) : available.length))];
        }
        // Keep large free rectangles connected on the fit-priority attempts.
        // A continuous offset near a random corner avoids the tiny unusable
        // slivers left by placing a large object in the middle of each space.
        const offset = (span: number) => {
          if (attempt < 8) return random() * span;
          const inset = Math.min(12, span / 2) * random() ** 2;
          return random() < .5 ? inset : span - inset;
        };
        const bounds = {
          x: space.x + offset(space.width - prototype.bounds.width),
          y: space.y + offset(space.height - prototype.bounds.height),
          width: prototype.bounds.width, height: prototype.bounds.height,
        };
        const nearby = new Set(cellKeys({ x: bounds.x - gap, y: bounds.y - gap, width: bounds.width + gap * 2, height: bounds.height + gap * 2 })
          .flatMap(key => buckets.get(key) ?? []));
        const collision = [...nearby].some(other => bounds.x < other.bounds.x + other.bounds.width + gap
          && bounds.x + bounds.width + gap > other.bounds.x && bounds.y < other.bounds.y + other.bounds.height + gap
          && bounds.y + bounds.height + gap > other.bounds.y);
        if (!collision) {
          validCandidates++;
          const score = densityScore(bounds);
          if (score < bestScore) {
            bestScore = score;
            accepted = {
              bounds,
              item: { ...prototype.item, x: bounds.x + (bounds.width - prototype.item.width) / 2, y: bounds.y + (bounds.height - prototype.item.height) / 2 },
            };
          }
        }
      }
      if (!accepted) break;
      placed.set(accepted.item.id, accepted.item);
      coverageParts(accepted.bounds).forEach((area, index) => { coverage[index] += area; });
      if (attempt >= 2) freeSpaces = remainingSpaces(freeSpaces, accepted.bounds, prototypeIndex + 1);
      for (const key of cellKeys(accepted.bounds)) {
        const bucket = buckets.get(key) ?? []; bucket.push(accepted); buckets.set(key, bucket);
      }
    }
    if (placed.size === prototypes.length) {
      const items = prototypes.map(item => placed.get(item.id)!);
      const boxes = items.map(rotatedItemBounds);
      // Check overlapping scroll windows as well as the coarse placement grid.
      // A packed board can otherwise leave a conspicuous gap across two cells.
      const balanced = ([{ height: 600, spread: .15 }, { height: 300, spread: .25 }]).every(window => {
        const height = Math.min(window.height, board.height), last = board.height - height;
        const starts = Array.from({ length: Math.floor(last / 100) + 1 }, (_, index) => index * 100);
        if (starts.at(-1) !== last) starts.push(last);
        const values = starts.map(y => boxes.reduce((sum, box) => sum
          + Math.max(0, Math.min(y + height, box.y + box.height) - Math.max(y, box.y)) * box.width, 0) / (board.width * height));
        return Math.max(...values) - Math.min(...values) < window.spread;
      });
      if (balanced) {
        const repaired = repairLocalBalance(items, board, random);
        if (repaired) return repaired;
      }
    }
  }
  throw new Error('找物配置：散放空间不足，有限次重新布局后仍无法完整摆放全部物件。');
}

export function createHiddenObjectRound(recipe: HiddenObjectRecipe, pool: HiddenObjectPool, seed: number): HiddenObjectRound {
  validate(recipe, pool);
  requireCondition(Number.isSafeInteger(seed), '随机种子须为有限整数。');
  const normalizedSeed = seed >>> 0;
  const random = randomFromSeed(normalizedSeed);
  const selectedGroups = shuffled(recipe.tasks.groupIds, random).slice(0, recipe.tasks.groupCount);
  const required = selectedGroups.map(() => recipe.tasks.totalCount === undefined
    ? recipe.tasks.minCount + Math.floor(random() * (recipe.tasks.maxCount - recipe.tasks.minCount + 1))
    : recipe.tasks.minCount);
  if (recipe.tasks.totalCount !== undefined) {
    let remaining = recipe.tasks.totalCount - required.reduce((sum, count) => sum + count, 0);
    while (remaining > 0) {
      const eligible = required.map((count, index) => ({ count, index })).filter(item => item.count < recipe.tasks.maxCount);
      const chosen = eligible[Math.floor(random() * eligible.length)].index;
      required[chosen]++; remaining--;
    }
  }
  const candidates = selectedGroups.map(group => shuffled(pool.sprites.filter(sprite => sprite.groupIds.includes(group)), random));
  const targetSprites = allocateTargets(required, candidates, recipe.categoryQuotas, pool);
  const targetIds = new Set(targetSprites.map(sprite => sprite.id));
  const selected: { sprite: HiddenObjectSprite; groupId?: string }[] = [];
  const tasks: HiddenObjectTask[] = [];
  selectedGroups.forEach((groupId, group) => {
    const sprite = targetSprites[group];
    selected.push(...Array.from({ length: required[group] }, () => ({ sprite, groupId })));
    tasks.push({ id: groupId, label: pool.groups.find(item => item.id === groupId)!.label, required: required[group], found: 0, previewSpriteId: sprite.id });
  });
  recipe.categoryQuotas.forEach(quota => {
    const targetCount = selected.filter(item => item.groupId && item.sprite.categoryId === quota.categoryId).length;
    const count = quota.count - targetCount;
    const fill = shuffled(pool.sprites.filter(sprite => sprite.categoryId === quota.categoryId && !targetIds.has(sprite.id)), random).slice(0, count);
    requireCondition(fill.length === count, `类别 ${quota.categoryId} 的干扰素材不足。`);
    selected.push(...fill.map(sprite => ({ sprite })));
  });

  const { board } = recipe;
  const items = scatterItems(selected, board, random);
  return { poolId: pool.id, seed: normalizedSeed, board: { ...board }, items, tasks };
}

export function createSession(round: HiddenObjectRound, durationMs: number): HiddenObjectSession {
  requireCondition(positive(durationMs), '本局时长须为正数。');
  requireCondition(round.tasks.length > 0 && round.tasks.every(task => integer(task.required, 1)), '本局缺少有效任务。');
  return { round, status: 'ready', durationMs, remainingMs: durationMs, foundIds: [], tasks: round.tasks.map(task => ({ ...task, found: 0 })) };
}

export function startSession(session: HiddenObjectSession): HiddenObjectSession {
  return session.status === 'ready' ? { ...session, status: 'running' } : session;
}

export function pauseSession(session: HiddenObjectSession): HiddenObjectSession {
  return session.status === 'running' ? { ...session, status: 'paused' } : session;
}

export function resumeSession(session: HiddenObjectSession): HiddenObjectSession {
  return session.status === 'paused' ? { ...session, status: 'running' } : session;
}

/** Call before handling input, using elapsed monotonic time since the last update. */
export function advanceSession(session: HiddenObjectSession, elapsedMs: number): HiddenObjectSession {
  requireCondition(Number.isFinite(elapsedMs) && elapsedMs >= 0, '计时间隔须为有限非负数。');
  if (session.status !== 'running' || elapsedMs === 0) return session;
  const remainingMs = Math.max(0, session.remainingMs - elapsedMs);
  return { ...session, remainingMs, status: remainingMs === 0 ? 'timeout' : 'running' };
}

export function findItem(session: HiddenObjectSession, itemId: string): HiddenObjectSession {
  if (session.status !== 'running' || session.remainingMs <= 0 || session.foundIds.includes(itemId)) return session;
  const item = session.round.items.find(candidate => candidate.id === itemId);
  if (!item?.groupId) return session;
  const task = session.tasks.find(candidate => candidate.id === item.groupId);
  if (!task || item.spriteId !== task.previewSpriteId || task.found >= task.required) return session;
  const tasks = session.tasks.map(candidate => candidate.id === item.groupId ? { ...candidate, found: candidate.found + 1 } : candidate);
  return { ...session, tasks, foundIds: [...session.foundIds, itemId], status: tasks.every(candidate => candidate.found === candidate.required) ? 'won' : 'running' };
}

export function restartSession(session: HiddenObjectSession): HiddenObjectSession {
  return createSession(session.round, session.durationMs);
}

export function getHintItem(session: HiddenObjectSession, groupId?: string): HiddenObjectItem | undefined {
  if (session.status !== 'running' || session.remainingMs <= 0) return undefined;
  return session.round.items.find(item => item.groupId !== undefined && (!groupId || item.groupId === groupId)
    && !session.foundIds.includes(item.id) && session.tasks.some(task => task.id === item.groupId
      && item.spriteId === task.previewSpriteId && task.found < task.required));
}
