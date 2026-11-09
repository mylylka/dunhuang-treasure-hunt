import { useState } from 'react';
import { getAssetUrl } from '../content';
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

/** One complete level card per page also keeps long titles and touch controls inside small screens. */
export function LevelSelectScreen({ catalog, theme, gameType, progress, onBack, hrefForLevel }: LevelSelectScreenProps) {
  const [page, setPage] = useState(0);
  const levels = catalog.levels.filter(level => level.themeId === theme.id && level.gameType === gameType);
  const index = Math.min(page, Math.max(0, levels.length - 1));
  const level = levels[index];
  const completed = level && Boolean(progress.completed[level.id]);
  return <div className="page selection-screen level-select-screen">
    <header className="selection-topbar">
      <button className="selection-back" type="button" onClick={onBack} aria-label="返回游戏选择">
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1>{names[gameType]}关卡</h1>
    </header>
    <div className="level-choice-stage">
      {level ? <article className="selected-level-card level-row" key={level.id} data-level-id={level.id}>
        <div className="selected-level-picture">
          <img src={getAssetUrl(catalog, level.thumbnailAssetId)} alt={level.title} draggable={false} />
        </div>
        <div className="selected-level-copy">
          <h2>{level.title}</h2>
          {completed && <span className="selected-level-completed completed-label"><img src={getAssetUrl(catalog, 'icon-completed')} alt="" />已完成</span>}
          <a className="button button-primary selected-level-start" href={hrefForLevel(level.id)}>
            <span className="button-label">{completed ? '再次观察' : '开始观察'}</span>
          </a>
        </div>
      </article> : <div className="selection-empty"><h2>尚未开放</h2></div>}
    </div>
    {levels.length > 1 && <nav className="selection-pagination" aria-label="关卡分页">
      <button className="button button-secondary button-small" type="button" disabled={index === 0} onClick={() => setPage(index - 1)}><span className="button-label">上一页</span></button>
      <span aria-live="polite">{index + 1} / {levels.length}</span>
      <button className="button button-secondary button-small" type="button" disabled={index === levels.length - 1} onClick={() => setPage(index + 1)}><span className="button-label">下一页</span></button>
    </nav>}
  </div>;
}
