import { getAssetUrl } from '../content';
import type { ContentCatalog, ThemeDefinition } from '../types';
import '../styles/selection.css';

export interface ThemeCardsProps {
  catalog: ContentCatalog;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  hrefForTheme: (theme: ThemeDefinition) => string;
}

/** Each choice is one compact image-and-title group, never an elastic full-height image slot. */
export function ThemeCards({ catalog, selectedIndex, onSelectIndex, hrefForTheme }: ThemeCardsProps) {
  const selected = Math.max(0, Math.min(selectedIndex, catalog.themes.length - 1));
  return <div className="page selection-screen theme-select-screen">
    <header className="home-title-block">
      <h1>敦煌寻宝记</h1>
      <p>开启敦煌探索</p>
    </header>
    <div className="theme-choice-stage">
      <div className="theme-choice-grid" data-testid="theme-choice-grid">
        {catalog.themes.map((theme, index) => {
          const available = catalog.levels.some(level => level.themeId === theme.id);
          return <a key={theme.id} href={hrefForTheme(theme)}
            className={`select-theme-card theme-row theme-${theme.id}${selected === index ? ' is-active' : ''}`}
            data-selected={selected === index}>
            <div className="select-theme-picture" data-testid="theme-picture">
              <img src={getAssetUrl(catalog, theme.coverAssetId)} alt="" draggable={false} />
              {!available && <span className="selection-state">未开放</span>}
            </div>
            <h2>{theme.title}</h2>
          </a>;
        })}
      </div>
    </div>
    <nav className="theme-choice-switcher" aria-label="切换探索主题">
      {catalog.themes.map((theme, index) => <button type="button" key={theme.id}
        aria-label={`查看主题：${theme.title}`} aria-pressed={selected === index}
        onClick={() => onSelectIndex(index)}>{theme.title}</button>)}
    </nav>
  </div>;
}
