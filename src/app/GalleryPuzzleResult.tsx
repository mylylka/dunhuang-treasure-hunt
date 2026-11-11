import { getAssetUrl } from '../content';
import type { ReactNode } from 'react';
import { playPath } from './navigation';
import type { ContentCatalog, Level, PuzzleLevel } from '../types';
import '../styles/gallery-puzzle-result.css';

interface Props {
  level: PuzzleLevel;
  catalog: ContentCatalog;
  nextLevel: Level | null;
  backHref: string;
  backLabel: string;
  onReplay: () => void;
  saveNotice?: ReactNode;
}

/** The completed original mural is kept on screen until the player chooses an action. */
export function GalleryPuzzleResult({ level, catalog, nextLevel, backHref, backLabel, onReplay, saveNotice }: Props) {
  return <div className="page page-result gallery-puzzle-result" data-testid="gallery-puzzle-result">
    {saveNotice}
    <div className="gallery-result-artwork">
      <img className="gallery-result-mural" data-testid="gallery-result-mural" src={getAssetUrl(catalog, level.imageAssetId)} alt={`${level.title}完整壁画`} />
    </div>
    <div className="gallery-result-congratulations" role="status">
      <h1>恭喜完成！</h1><p>一幅壁画，重新连成了完整的故事。</p>
    </div>
    <nav className="gallery-result-actions" aria-label="完成后的操作">
      <a className="button button-secondary" href={backHref}><span className="button-label">{backLabel}</span></a>
      {nextLevel ? <a className="button button-primary" href={`#${playPath(nextLevel.id)}`} data-testid="gallery-result-next"><span className="button-label">下一关</span></a>
        : <button className="button button-secondary" type="button" disabled data-testid="gallery-result-next"><span className="button-label">下一关</span></button>}
      <button className="button button-secondary" type="button" onClick={onReplay}><span className="button-label">重玩</span></button>
    </nav>
  </div>;
}
