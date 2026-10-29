import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { getAssetUrl } from '../content';
import { getLevelChoices } from '../content/level-roadmap';
import type { ContentCatalog, GameType, ProgressData, ThemeDefinition } from '../types';
import '../styles/selection.css';

export interface LevelSelectScreenProps {
  catalog: ContentCatalog;
  theme: ThemeDefinition;
  gameType: GameType;
  progress: ProgressData;
  onBack: () => void;
  hrefForLevel: (levelId: string) => string;
}

const names: Record<GameType, string> = {
  'spot-difference': '找不同', puzzle: '拼图', coloring: '填色',
  'hidden-object': '线索找物', 'shadow-match': '影子配对',
};

function usePageLayout(slotRef: RefObject<HTMLDivElement | null>) {
  const [layout, setLayout] = useState({ pageSize: 6, columns: 3, rows: 2, cardHeight: 340, gap: 18, compact: false });
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const measure = () => {
      const { width, height } = slot.getBoundingClientRect();
      const mobile = width < 600;
      const compact = !mobile && height < 300;
      const pageSize = mobile || compact ? 2 : height < 570 ? 3 : 6;
      const columns = mobile ? 1 : compact ? 2 : 3;
      const rows = pageSize / columns;
      const gap = mobile || compact ? 12 : 18;
      const cardHeight = Math.max(1, Math.min(mobile ? 190 : 370, (height - gap * (rows - 1)) / rows));
      setLayout(previous => previous.pageSize === pageSize && previous.columns === columns && previous.compact === compact
        && Math.abs(previous.cardHeight - cardHeight) < 0.5 ? previous : { pageSize, columns, rows, cardHeight, gap, compact });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    measure();
    return () => observer.disconnect();
  }, [slotRef]);
  return layout;
}

/** Plans describe future content; only catalog levels can be launched or completed. */
export function LevelSelectScreen({ catalog, theme, gameType, progress, onBack, hrefForLevel }: LevelSelectScreenProps) {
  const [page, setPage] = useState(0);
  const slotRef = useRef<HTMLDivElement>(null);
  const layout = usePageLayout(slotRef);
  const choices = getLevelChoices(catalog, theme.id, gameType);
  const pageCount = Math.max(1, Math.ceil(choices.length / layout.pageSize));
  const index = Math.min(page, pageCount - 1);
  const visible = choices.slice(index * layout.pageSize, (index + 1) * layout.pageSize);
  const availableCount = choices.filter(choice => choice.status === 'available').length;
  const gridStyle = {
    '--level-card-height': `${layout.cardHeight}px`, '--level-card-gap': `${layout.gap}px`,
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
    height: `${layout.cardHeight * layout.rows + layout.gap * (layout.rows - 1)}px`,
  } as CSSProperties;
  return <div className={`page selection-screen level-select-screen${layout.compact ? ' is-compact' : ''}`} data-page-size={layout.pageSize}>
    <header className="selection-topbar">
      <button className="selection-back" type="button" onClick={onBack} aria-label="返回游戏选择">
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1>{names[gameType]}关卡</h1>
      {choices.length > 0 && <div className="level-catalog-summary" data-testid="level-catalog-summary"><span>共 {choices.length} 关</span><span>{availableCount} 关开放</span></div>}
    </header>
    <div className="level-choice-stage" ref={slotRef}>
      {choices.length ? <div className="level-choice-grid" style={gridStyle}>
        {visible.map((choice, offset) => {
          const completed = choice.status === 'available' && Boolean(progress.completed[choice.level.id]);
          const picture = <>
            {choice.status === 'available'
              ? <img src={getAssetUrl(catalog, choice.level.thumbnailAssetId)} alt={choice.level.title} draggable={false} />
              : <><span className={`planned-level-symbol motif-${choice.roadmap.motif}`} aria-hidden="true"><i /><i /><i /><i /></span><span className="unmade-label">待制作</span></>}
            <span className="level-card-number">{String(index * layout.pageSize + offset + 1).padStart(2, '0')}</span>
            {completed && <span className="selected-level-completed completed-label"><img src={getAssetUrl(catalog, 'icon-completed')} alt="" />已完成</span>}
          </>;
          return <article className={`selected-level-card level-choice-card${choice.status === 'available' ? ' level-row' : ' is-planned'}`}
            key={choice.id} data-level-id={choice.id} data-status={choice.status}>
            {choice.status === 'available'
              ? <a className="selected-level-picture selected-level-cover-link" href={hrefForLevel(choice.level.id)} aria-label={`进入关卡：${choice.title}`}>{picture}</a>
              : <div className="selected-level-picture is-unmade">{picture}</div>}
            <div className="selected-level-copy">
              <h2>{choice.status === 'available' ? <a className="selected-level-title-link" href={hrefForLevel(choice.level.id)}>{choice.title}</a> : choice.title}</h2>
              <p className="level-card-detail">{choice.status === 'available' ? choice.level.gameType === 'spot-difference' ? `${choice.level.differences.length}处差异` : choice.level.gameType === 'puzzle' ? `${choice.level.rows * choice.level.columns}块 · ${choice.level.mode === 'rotation' ? '旋转拼图' : '不规则碎片'}` : '自由配色' : choice.roadmap.gameType === 'puzzle' ? choice.roadmap.learningFocus : `拟设${choice.roadmap.plannedDifferenceCount}处`}
                {choice.roadmap?.gameType === 'spot-difference' && <><span aria-hidden="true"> · </span>{choice.roadmap.learningFocus}</>}</p>
              <div className="level-card-action">{choice.status === 'available'
                ? <a className="button button-primary selected-level-start" href={hrefForLevel(choice.level.id)}><span className="button-label">{choice.level.gameType === 'coloring' ? completed ? '继续创作' : '开始填色' : choice.level.gameType === 'puzzle' ? '开始拼图' : completed ? '再次观察' : '开始观察'}</span></a>
                : <span className="level-planned-status">筹备中</span>}</div>
            </div>
          </article>;
        })}
      </div> : <div className="selection-empty"><h2>尚未开放</h2></div>}
    </div>
    {pageCount > 1 && <nav className="selection-pagination" aria-label="关卡分页">
      <button className="button button-secondary button-small" type="button" disabled={index === 0} onClick={() => setPage(index - 1)}><span className="button-label">上一页</span></button>
      <span aria-live="polite">{index + 1} / {pageCount}</span>
      <button className="button button-secondary button-small" type="button" disabled={index === pageCount - 1} onClick={() => setPage(index + 1)}><span className="button-label">下一页</span></button>
    </nav>}
  </div>;
}
