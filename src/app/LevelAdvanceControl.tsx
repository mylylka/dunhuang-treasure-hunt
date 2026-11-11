import { createContext, useContext, type ReactNode } from 'react';
import type { ContentCatalog, Level } from '../types';
import { compactTitleWords, getNextOpenLevel, getPreviousOpenLevel } from '../services/level-sequence';
import { levelsPath, playPath } from './navigation';
import '../styles/level-advance.css';

interface LevelNavigation { previous: Level | null; next: Level | null; directory: string }
const LevelNavigationContext = createContext<LevelNavigation | null>(null);

export function LevelNavigationProvider({ catalog, level, children, restricted = false }: {
  catalog: Pick<ContentCatalog, 'levels'>; level: Level; children: ReactNode; restricted?: boolean;
}) {
  return <LevelNavigationContext value={{ previous: restricted ? null : getPreviousOpenLevel(catalog, level), next: restricted ? null : getNextOpenLevel(catalog, level), directory: levelsPath(level.themeId, level.gameType) }}>
    {children}
  </LevelNavigationContext>;
}

/** A navigation link only: skipping never dispatches a completion or submit command. */
export function LevelAdvanceControl({ className = 'button button-secondary button-small', completed = false }: {
  className?: string; completed?: boolean;
}) {
  const navigation = useContext(LevelNavigationContext);
  if (!navigation) return null;
  const plainClassName = className.split(/\s+/).filter(name => name !== 'button-primary' && name !== 'button-secondary').join(' ');
  if (!completed) return <nav className="level-navigation" aria-label="关卡切换">
    {navigation.previous ? <a className={`level-advance ${plainClassName}`} data-testid="level-previous" data-previous-level-id={navigation.previous.id}
      href={`#${playPath(navigation.previous.id)}`}><span className="button-label">上一关</span></a>
      : <button type="button" className={`level-advance ${plainClassName}`} data-testid="level-previous" disabled><span className="button-label">上一关</span></button>}
    {navigation.next ? <a className={`level-advance ${plainClassName}`} data-testid="level-advance" data-next-level-id={navigation.next.id}
      href={`#${playPath(navigation.next.id)}`}><span className="button-label">下一关</span></a>
      : <button type="button" className={`level-advance ${plainClassName}`} data-testid="level-advance" disabled><span className="button-label">下一关</span></button>}
  </nav>;
  const label = navigation.next ? '下一关' : '返回关卡';
  return <a className={`level-advance ${className}`} data-testid="result-primary-action"
    data-next-level-id={navigation.next?.id}
    href={`#${navigation.next ? playPath(navigation.next.id) : navigation.directory}`}>
    <span className="button-label">{label}</span>
  </a>;
}

export function GroupedLevelTitle({ title }: { title: string }) {
  return <>{compactTitleWords(title).map((word, index) => <span key={index} className="level-title-word">{word}</span>)}</>;
}
