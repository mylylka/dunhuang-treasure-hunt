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

export function rotatedItemBounds(item: Pick<HiddenObjectItem, 'x' | 'y' | 'width' | 'height' | 'rotation'>): { x: number; y: number; width: number; height: number } {
  const cosine = Math.abs(Math.cos(item.rotation)), sine = Math.abs(Math.sin(item.rotation));
  const width = item.width * cosine + item.height * sine;
  const height = item.width * sine + item.height * cosine;
  return { x: item.x + (item.width - width) / 2, y: item.y + (item.height - height) / 2, width, height };
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
  function remainingSpaces(spaces: ReturnType<typeof rotatedItemBounds>[], occupied: ReturnType<typeof rotatedItemBounds>): ReturnType<typeof rotatedItemBounds>[] {
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
    return split.filter((space, index) => !split.some((other, otherIndex) => otherIndex !== index
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
    const densityColumns = 3, densityRows = 6;
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
    for (const prototype of ordered) {
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
        const bounds = {
          x: space.x + random() * (space.width - prototype.bounds.width),
          y: space.y + random() * (space.height - prototype.bounds.height),
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
      if (attempt >= 2) freeSpaces = remainingSpaces(freeSpaces, accepted.bounds);
      for (const key of cellKeys(accepted.bounds)) {
        const bucket = buckets.get(key) ?? []; bucket.push(accepted); buckets.set(key, bucket);
      }
    }
    if (placed.size === prototypes.length) return prototypes.map(item => placed.get(item.id)!);
  }
  throw new Error('找物配置：散放空间不足，有限次重新布局后仍无法完整摆放全部物件。');
}

export function createHiddenObjectRound(recipe: HiddenObjectRecipe, pool: HiddenObjectPool, seed: number): HiddenObjectRound {
  validate(recipe, pool);
  requireCondition(Number.isSafeInteger(seed), '随机种子须为有限整数。');
  const normalizedSeed = seed >>> 0;
  const random = randomFromSeed(normalizedSeed);
  const selectedGroups = shuffled(recipe.tasks.groupIds, random).slice(0, recipe.tasks.groupCount);
  const required = selectedGroups.map(() => recipe.tasks.minCount + Math.floor(random() * (recipe.tasks.maxCount - recipe.tasks.minCount + 1)));
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
