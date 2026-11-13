import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { getAssetUrl } from '../content';
import { getLevelChoices, type LevelChoice } from '../content/level-roadmap';
import type { ContentCatalog, GameType, HiddenObjectLevel, ProgressData, ThemeDefinition } from '../types';
import '../styles/selection.css';

export interface LevelSelectScreenProps {
  catalog: ContentCatalog;
  theme: ThemeDefinition;
  gameType: GameType;
  focusLevelId?: string;
  progress: ProgressData;
  onBack: () => void;
  hrefForLevel: (levelId: string) => string;
}

const names: Record<GameType, string> = {
  'spot-difference': '找不同', puzzle: '拼图', coloring: '填色',
  'hidden-object': '计时找物', 'shadow-match': '影子配对',
};

export function calculateLevelGridLayout(width: number, height: number, screenHeight = height) {
  const availableWidth = Math.max(1, Number.isFinite(width) ? Math.floor(width) : 1);
  const availableHeight = Math.max(1, Number.isFinite(height) ? Math.floor(height) : 1);
  const compact = availableWidth < 600 || screenHeight < 560;
  const gap = compact ? 10 : 18;
  const columns = compact ? Math.max(1, Math.min(4, Math.floor((availableWidth + gap) / (192 + gap)))) : 3;
  const cardHeight = compact
    ? Math.round(Math.max(122, Math.min(154, availableHeight >= 254 ? (availableHeight - gap) / 2 : availableHeight * .6)))
    : Math.min(370, Math.max(280, (availableHeight - gap) / 2));
  return { columns, cardHeight, gap, compact };
}

export function calculateHiddenObjectChapterGridLayout(width: number, height: number, screenHeight = height) {
  const layout = calculateLevelGridLayout(width, height, screenHeight);
  const availableWidth = Math.max(1, Number.isFinite(width) ? Math.floor(width) : 1);
  return { ...layout,
    columns: Math.max(1, Math.min(3, Math.floor((availableWidth + layout.gap) / (170 + layout.gap)))),
    cardHeight: Math.min(layout.cardHeight, layout.compact ? 138 : 290),
  };
}

interface ChapterChoiceGroup {
  chapter: HiddenObjectLevel['chapter'] | null;
  entries: { choice: LevelChoice; offset: number }[];
}

export function groupHiddenObjectChoices(choices: LevelChoice[]): ChapterChoiceGroup[] {
  const groups = new Map<string, ChapterChoiceGroup>();
  choices.forEach((choice, offset) => {
    const chapter = choice.status === 'available' && choice.level.gameType === 'hidden-object' ? choice.level.chapter : undefined;
    const key = chapter?.id ?? '';
    const group = groups.get(key) ?? { chapter: chapter ?? null, entries: [] };
    group.entries.push({ choice, offset });
    groups.set(key, group);
  });
  return [...groups.values()];
}

function useLevelGridLayout(slotRef: RefObject<HTMLDivElement | null>, chaptered: boolean) {
  const [layout, setLayout] = useState(() => chaptered
    ? calculateHiddenObjectChapterGridLayout(1100, 700) : calculateLevelGridLayout(1100, 700));
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const measure = () => {
      // Exclude the native scrollbar and focus-safe padding from the actual grid width.
      const style = getComputedStyle(slot);
      const width = slot.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = slot.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (width <= 0 || height <= 0) return;
      // The outer screen height stays stable when compact spacing changes the list height.
      const calculate = chaptered ? calculateHiddenObjectChapterGridLayout : calculateLevelGridLayout;
      const next = calculate(width, height, slot.parentElement?.clientHeight ?? height);
      setLayout(previous => previous.columns === next.columns && previous.compact === next.compact
        && Math.abs(previous.cardHeight - next.cardHeight) < .5 ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    measure();
    return () => observer.disconnect();
  }, [slotRef, chaptered]);
  return layout;
}

/** Plans describe future content; only catalog levels can be launched or completed. */
export function LevelSelectScreen({ catalog, theme, gameType, focusLevelId, progress, onBack, hrefForLevel }: LevelSelectScreenProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const choices = getLevelChoices(catalog, theme.id, gameType);
  const chaptered = gameType === 'hidden-object' && choices.some(choice => choice.status === 'available'
    && choice.level.gameType === 'hidden-object' && Boolean(choice.level.chapter));
  const chapters = chaptered ? groupHiddenObjectChoices(choices) : [];
  const layout = useLevelGridLayout(slotRef, chaptered);
  useLayoutEffect(() => {
    if (!focusLevelId) return;
    const focusedCard = Array.from(slotRef.current?.querySelectorAll<HTMLElement>('[data-level-id]') ?? [])
      .find(card => card.dataset.levelId === focusLevelId);
    focusedCard?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [focusLevelId, layout]);
  const availableCount = choices.filter(choice => choice.status === 'available').length;
  const gridStyle = {
    '--level-card-height': `${layout.cardHeight}px`, '--level-card-gap': `${layout.gap}px`,
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gridAutoRows: `minmax(${layout.cardHeight}px, auto)`,
  } as CSSProperties;
  const CardHeading = chaptered ? 'h3' : 'h2';
  const renderChoice = (choice: LevelChoice, offset: number) => {
    const completed = choice.status === 'available' && Boolean(progress.completed[choice.level.id]);
    const chapter = choice.status === 'available' && choice.level.gameType === 'hidden-object' ? choice.level.chapter : undefined;
    const picture = <>
      {choice.status === 'available'
        ? <img src={getAssetUrl(catalog, chapter?.backgroundAssetId ?? choice.level.thumbnailAssetId)} alt={choice.level.title} draggable={false} />
        : <><span className={`planned-level-symbol motif-${choice.roadmap.motif}`} aria-hidden="true"><i /><i /><i /><i /></span><span className="unmade-label">待制作</span></>}
      <span className="level-card-number">{String(offset + 1).padStart(2, '0')}</span>
      {completed && <span className="selected-level-completed completed-label"><img src={getAssetUrl(catalog, 'icon-completed')} alt="" />已完成</span>}
    </>;
    return <article className={`selected-level-card level-choice-card${choice.status === 'available' ? ' level-row' : ' is-planned'}`}
      key={choice.id} data-level-id={choice.id} data-status={choice.status}
      data-chapter-id={chapter?.id} data-chapter-level={chapter?.level}>
      {choice.status === 'available'
        ? <a className="selected-level-picture selected-level-cover-link" href={hrefForLevel(choice.level.id)} aria-label={`进入关卡：${choice.title}`}>{picture}</a>
        : <div className="selected-level-picture is-unmade">{picture}</div>}
      <div className="selected-level-copy">
        <CardHeading className="level-card-title">{choice.status === 'available' ? <a className="selected-level-title-link" href={hrefForLevel(choice.level.id)}>{choice.title}</a> : choice.title}</CardHeading>
        <p className="level-card-detail">{choice.status === 'available' ? choice.level.gameType === 'spot-difference' ? `${choice.level.differences.length}处差异` : choice.level.gameType === 'puzzle' ? choice.level.mode === 'gallery-order' ? `${choice.level.sliceCount}幅 · 排序` : `${choice.level.rows * choice.level.columns}块 · ${choice.level.mode === 'rotation' ? layout.compact ? '旋转' : '旋转拼图' : layout.compact ? '碎片' : '不规则碎片'}` : choice.level.gameType === 'hidden-object' ? `${choice.level.timeLimitSeconds}秒 · ${choice.level.tasks.totalCount ? `${choice.level.tasks.totalCount}件目标` : layout.compact ? '随机图' : '每局随机生成'}` : choice.level.gameType === 'shadow-match' ? layout.compact ? '4选1' : '4选1 · 轮廓配对' : '自由配色' : layout.compact ? '规划关卡' : choice.roadmap.gameType === 'puzzle' ? choice.roadmap.learningFocus : `拟设${choice.roadmap.plannedDifferenceCount}处`}
          {!layout.compact && choice.roadmap?.gameType === 'spot-difference' && <><span aria-hidden="true"> · </span>{choice.roadmap.learningFocus}</>}</p>
      </div>
      <div className="level-card-action">{choice.status === 'available'
        ? <a className="button button-primary selected-level-start" href={hrefForLevel(choice.level.id)}><span className="button-label">{choice.level.gameType === 'coloring' ? completed ? '继续创作' : '开始填色' : choice.level.gameType === 'puzzle' ? choice.level.mode === 'gallery-order' ? '开始排序' : '开始拼图' : choice.level.gameType === 'hidden-object' ? '开始找物' : choice.level.gameType === 'shadow-match' ? '开始配对' : completed ? '再次观察' : '开始观察'}</span></a>
        : <span className="level-planned-status">筹备中</span>}</div>
    </article>;
  };
  return <div className={`page selection-screen level-select-screen${layout.compact ? ' is-compact' : ''}${chaptered ? ' has-chapters' : ''}`}
    data-layout="scroll" data-columns={layout.columns} data-chapter-count={chaptered ? chapters.filter(group => group.chapter).length : undefined}>
    <header className="selection-topbar">
      <button className="selection-back" type="button" onClick={onBack} aria-label="返回游戏选择">
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1>{names[gameType]}关卡</h1>
      {choices.length > 0 && <div className="level-catalog-summary" data-testid="level-catalog-summary"><span>共 {choices.length} 关</span><span>{availableCount} 关开放</span></div>}
    </header>
    <div className="level-choice-stage" ref={slotRef} data-testid="level-choice-scroll" role="region" aria-label="全部关卡，向下滚动浏览" tabIndex={0}>
      {choices.length ? chaptered ? <div className="level-chapters">
        {chapters.map(group => group.chapter ? <section className="level-chapter" key={group.chapter.id}
          data-testid="hidden-object-chapter" data-chapter-id={group.chapter.id} data-chapter-order={group.chapter.order}
          aria-labelledby={`chapter-${group.chapter.id}`}>
          <header className="level-chapter-heading"><h2 id={`chapter-${group.chapter.id}`}><span>第{group.chapter.order}章</span>{group.chapter.title}</h2><span>{group.entries.length}关</span></header>
          <div className="level-choice-grid" style={gridStyle}>{group.entries.map(({ choice, offset }) => renderChoice(choice, offset))}</div>
        </section> : <div className="level-choice-grid" key="unchaptered" style={gridStyle}>{group.entries.map(({ choice, offset }) => renderChoice(choice, offset))}</div>)}
      </div> : <div className="level-choice-grid" style={gridStyle}>{choices.map(renderChoice)}</div>
        : <div className="selection-empty"><h2>尚未开放</h2></div>}
    </div>
  </div>;
}
