import { getAssetUrl } from '../content';
import type { ContentCatalog, GameType, ThemeDefinition } from '../types';
import '../styles/selection.css';

export interface GameSelectScreenProps {
  catalog: ContentCatalog;
  theme: ThemeDefinition;
  onBack: () => void;
  onReview: () => void;
  hrefForGame: (type: GameType) => string;
}

const names: Record<GameType, string> = {
  'spot-difference': '找不同', puzzle: '拼图', coloring: '填色',
  'hidden-object': '线索找物', 'shadow-match': '影子配对',
};

function GamePreview({ catalog, theme, type }: { catalog: ContentCatalog; theme: ThemeDefinition; type: GameType }) {
  const previewLevel = (type === 'coloring' || type === 'puzzle')
    && catalog.levels.find(level => level.themeId === theme.id && level.gameType === type);
  const image = getAssetUrl(catalog, previewLevel ? previewLevel.thumbnailAssetId : theme.coverAssetId);
  return <div className={`game-choice-picture preview-${type}`}>
    <img src={image} alt="" draggable={false} />
    {type === 'spot-difference' && <span className="difference-preview-marks" aria-hidden="true"><i /><i /></span>}
    {type === 'puzzle' && <span className="puzzle-preview-grid" aria-hidden="true" />}
    {type === 'coloring' && <img className="coloring-preview-overlay" src={image} alt="" draggable={false} />}
  </div>;
}

export function GameSelectScreen({ catalog, theme, onBack, onReview, hrefForGame }: GameSelectScreenProps) {
  return <div className="page selection-screen game-select-screen">
    <header className="selection-topbar">
      <button className="selection-back" type="button" onClick={onBack} aria-label="返回上一级">
        <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span>
      </button>
      <h1>选择游戏</h1>
      <button className="selection-review" type="button" onClick={onReview}>重看教学</button>
    </header>
    <div className="game-choice-stage">
      <div className="game-choice-grid" aria-label={`${theme.title}小游戏`}>
        {theme.allowedGameTypes.map(type => {
          const available = catalog.levels.some(level => level.themeId === theme.id && level.gameType === type);
          const content = <><GamePreview catalog={catalog} theme={theme} type={type} /><h2>{names[type]}</h2>{!available && <span className="selection-state">未开放</span>}</>;
          return available
            ? <a key={type} className={`game-choice-card game-choice-${type}`} href={hrefForGame(type)}>{content}</a>
            : <button key={type} className={`game-choice-card game-choice-${type}`} type="button" disabled>{content}</button>;
        })}
      </div>
    </div>
  </div>;
}
