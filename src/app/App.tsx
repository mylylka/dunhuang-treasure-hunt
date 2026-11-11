import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getAssetUrl } from '../content';
import { getNextOpenLevel } from '../services/level-sequence';
import { artworkColors, artworkMaterials, hasOlderArtwork, loadArtworks, saveArtworks, withArtwork, type ArtworksData } from '../services/artworks';
import { loadProgress, saveProgress, withCompletedLevel } from '../services/progress';
import type { ContentCatalog, GameEvent, Level, LevelMetadata, ProgressData, RegionColors, RegionMaterials, ThemeDefinition } from '../types';
import { LevelAdvanceControl, LevelNavigationProvider } from './LevelAdvanceControl';
import { ThemeCards } from './ThemeCards';
import { GameSelectScreen } from './GameSelectScreen';
import { LevelSelectScreen } from './LevelSelectScreen';
import { gameNames, gamesPath, goTo, levelsPath, playPath, readRoute, routeKey as getRouteKey, type Route } from './navigation';
import { ColoringScreen } from './ColoringScreen';
import { PuzzleScreen } from './PuzzleScreen';
import { GalleryPuzzleScreen } from './GalleryPuzzleScreen';
import { GalleryPuzzleResult } from './GalleryPuzzleResult';
import { HiddenObjectScreen } from './HiddenObjectScreen';
import { ShadowMatchScreen } from './ShadowMatchScreen';
import { SpotDifferenceScreen } from './SpotDifferenceScreen';
import { MobileLandscapeGuard } from './MobileLandscapeGuard';
import { ColoringResult } from './ColoringResult';
import { SoundSettings } from './SoundSettings';
import { useSound } from './useSound';

function hasPlaceholder(catalog: ContentCatalog, ids: string[]) {
  return catalog.assets.some((asset) => ids.includes(asset.id) && asset.placeholder);
}

function Asset({ catalog, id, className = '', alt = '', eager = false }: { catalog: ContentCatalog; id: string; className?: string; alt?: string; eager?: boolean }) {
  const description = alt && hasPlaceholder(catalog, [id]) ? `${alt}（待替换的几何占位图）` : alt;
  return <img src={getAssetUrl(catalog, id)} alt={description} className={className} loading={eager ? 'eager' : 'lazy'} draggable={false} />;
}

function PlaceholderLabel({ catalog, assetIds, children = '待替换 · 几何占位图' }: { catalog: ContentCatalog; assetIds: string[]; children?: ReactNode }) {
  if (!hasPlaceholder(catalog, assetIds)) return null;
  return <span className="placeholder-label">{children}</span>;
}

function SourceNote({ level }: { level: LevelMetadata }) {
  return <section className="result-reference" aria-labelledby="result-reference-title" tabIndex={0}>
    <h2 id="result-reference-title">文化参考</h2>
    <p className="result-reference-link"><a href={level.source.url} target="_blank" rel="noreferrer">{level.source.title}</a></p>
    {level.source.note && <p>{level.source.note}</p>}
    {level.teachingNote && <p className="result-art-note">{level.teachingNote}</p>}
  </section>;
}

export default function App({ catalog }: { catalog: ContentCatalog }) {
  const sound = useSound();
  const [initialLoad] = useState(() => loadProgress());
  const [initialArtworks] = useState(() => loadArtworks());
  const [progress, setProgress] = useState<ProgressData>(initialLoad.data);
  const progressRef = useRef(progress);
  const [artworks, setArtworks] = useState<ArtworksData>(initialArtworks.data);
  const artworksRef = useRef(artworks);
  const [loadWarning, setLoadWarning] = useState([initialLoad.warning, initialArtworks.warning].filter(Boolean).join(' ') || null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [artworkSaveError, setArtworkSaveError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(readRoute);
  const [activeTheme, setActiveTheme] = useState(0);
  const completedThisRun = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const routeKey = getRouteKey(route);

  const persist = useCallback((next: ProgressData) => {
    progressRef.current = next; setProgress(next);
    const saved = saveProgress(next); setSaveError(saved.ok ? null : saved.message); return saved.ok;
  }, []);
  const persistArtworks = useCallback((next: ArtworksData) => {
    artworksRef.current = next; setArtworks(next);
    const saved = saveArtworks(next); setArtworkSaveError(saved.ok ? null : saved.message); return saved.ok;
  }, []);
  useEffect(() => {
    const handleHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => { window.removeEventListener('hashchange', handleHash); window.removeEventListener('popstate', handleHash); };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' }); mainRef.current?.focus({ preventScroll: true }); completedThisRun.current = false;
  }, [routeKey]);
  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;
    root.dataset.inputModality = 'pointer';
    const pointer = () => { root.dataset.inputModality = 'pointer'; };
    const keyboard = (event: KeyboardEvent) => {
      if (['Tab', 'Enter', ' ', 'Escape', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key) || event.key.startsWith('Arrow')) root.dataset.inputModality = 'keyboard';
    };
    document.addEventListener('pointerdown', pointer, true); document.addEventListener('touchstart', pointer, { capture: true, passive: true }); document.addEventListener('keydown', keyboard, true);
    return () => { document.removeEventListener('pointerdown', pointer, true); document.removeEventListener('touchstart', pointer, true); document.removeEventListener('keydown', keyboard, true); delete root.dataset.inputModality; };
  }, []);
  const onGameEvent = useCallback((event: GameEvent) => {
    if (event.type === 'completed' && !completedThisRun.current) {
      const level = catalog.levels.find(item => item.id === event.levelId);
      if (!level) return;
      completedThisRun.current = true; persist(withCompletedLevel(progressRef.current, level.id)); goTo(`/result/${encodeURIComponent(level.id)}`);
    }
  }, [catalog, persist]);
  function replay(levelId: string) { completedThisRun.current = false; goTo(playPath(levelId)); }
  function skinSlice(id: string) { const slice = catalog.assets.find(asset => asset.id === id)!.slice!; return `${slice.top} ${slice.right} ${slice.bottom} ${slice.left}`; }
  const assetStyle = {
    '--background-landscape': `url("${getAssetUrl(catalog, 'bg-landscape')}")`,
    '--background-portrait': `url("${getAssetUrl(catalog, 'bg-portrait')}")`,
    '--panel-slice': skinSlice('panel'), '--primary-button-slice': skinSlice('button-primary'), '--secondary-button-slice': skinSlice('button-secondary'),
    '--panel-image': `url("${getAssetUrl(catalog, 'panel')}")`, '--primary-button-image': `url("${getAssetUrl(catalog, 'button-primary')}")`, '--secondary-button-image': `url("${getAssetUrl(catalog, 'button-secondary')}")`,
  } as CSSProperties;
  function renderSaveNotice(compact = false) {
    if (!saveError) return null;
    return <div className={`notice notice-error ${compact ? 'notice-compact' : ''}`} role="alert" data-testid="save-error"><div><strong>记录暂未保存</strong><p>{saveError} 当前页面仍保留本次记录，关闭后可能丢失。</p></div><button type="button" className="button button-secondary button-small" data-testid="retry-save" onClick={() => persist(progressRef.current)}>重试保存</button></div>;
  }
  function renderArtworkNotice() {
    return artworkSaveError && <div className="notice notice-error notice-compact" role="alert" data-testid="artwork-save-error"><p>{artworkSaveError}</p><button type="button" className="button button-secondary button-small" data-testid="retry-artwork-save" onClick={() => persistArtworks(artworksRef.current)}><span className="button-label">重试保存作品</span></button></div>;
  }
  function renderLevel(level: Level, theme: ThemeDefinition) {
    if (level.gameType === 'shadow-match') return <ShadowMatchScreen key={level.id} level={level} catalog={catalog} reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent} onBack={() => goTo(levelsPath(theme.id, 'shadow-match'))} />;
    if (level.gameType === 'hidden-object') return <HiddenObjectScreen key={level.id} level={level} catalog={catalog} reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent} onBack={() => goTo(levelsPath(theme.id, 'hidden-object'))} />;
    if (level.gameType === 'puzzle') return level.mode === 'gallery-order'
      ? <GalleryPuzzleScreen key={level.id} level={level} catalog={catalog} onEvent={onGameEvent} onBack={() => goTo(levelsPath(theme.id, 'puzzle'))} />
      : <PuzzleScreen key={level.id} level={level} catalog={catalog} reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent} onBack={() => goTo(levelsPath(theme.id, 'puzzle'))} />;
    if (level.gameType === 'coloring') {
      const save = (colors: RegionColors, materials: RegionMaterials, submitted = false) => persistArtworks(withArtwork(artworksRef.current, level, colors, submitted, submitted ? new Date().toISOString() : undefined, materials));
      return <ColoringScreen key={level.id} level={level} catalog={catalog} initialColors={artworkColors(artworks, level)} initialMaterials={artworkMaterials(artworks, level)} reducedMotion={progress.settings.reducedMotion}
        onChange={(colors, materials) => { save(colors, materials); }} onBack={() => goTo(levelsPath(theme.id, 'coloring'))}
        onComplete={(colors, materials) => { if (save(colors, materials, true)) onGameEvent({ type: 'completed', levelId: level.id }); }}
        saveNotice={<>{hasOlderArtwork(artworks, level) && <p className="notice" role="status">线稿版本已更新，旧作品已保留。本页使用新线稿。</p>}{renderArtworkNotice()}</>} />;
    }
    return <SpotDifferenceScreen key={level.id} level={level} catalog={catalog} reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent} onBack={() => goTo(levelsPath(theme.id, 'spot-difference'))} />;
  }
  function renderResult(level: Level, theme: ThemeDefinition) {
    const isColoring = level.gameType === 'coloring';
    const isPuzzle = level.gameType === 'puzzle';
    const nextLevel = getNextOpenLevel(catalog, level);
    const resultActions = (replayLabel: string) => <div className="result-actions">
      <LevelAdvanceControl completed className="button button-primary" />
      <button type="button" className="button button-secondary" onClick={() => replay(level.id)}><span className="button-label">{replayLabel}</span></button>
      {nextLevel && <a className="button button-secondary" href={`#${levelsPath(theme.id, level.gameType)}`}><span className="button-label">返回关卡</span></a>}
    </div>;
    if (isPuzzle && !progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>先完成拼图，再查看全图</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>前往拼图</a></div>;
    if (!progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>{isColoring ? '先完成活动，再回看作品' : '先完成活动，再回看发现'}</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>{isColoring ? '前往填色' : '前往观察'}</a></div>;
    if (level.gameType === 'puzzle' && level.mode === 'gallery-order') {
      return <GalleryPuzzleResult level={level} catalog={catalog} nextLevel={nextLevel}
        backHref={`#${levelsPath(theme.id, 'puzzle')}`}
        backLabel="返回关卡" onReplay={() => replay(level.id)} saveNotice={renderSaveNotice()} />;
    }
    if (level.gameType === 'hidden-object') return <div className="page page-result hidden-object-result-screen">
      <Breadcrumb catalog={catalog} items={[{ label: '找物关卡', href: `#${levelsPath(theme.id, 'hidden-object')}` }]} />
      <header className="result-heading"><h1>寻宝完成</h1></header>{renderSaveNotice()}
      <section className="result-review"><div className="result-image"><Asset catalog={catalog} id={level.thumbnailAssetId} alt="乐舞主题教学示意" eager /></div>
        <div className="result-summary"><SourceNote level={level} /></div></section>
      {resultActions('再找一局')}
    </div>;
    if (level.gameType === 'shadow-match') return <div className="page page-result shadow-result-screen">
      <Breadcrumb catalog={catalog} items={[{ label: '影子配对关卡', href: `#${levelsPath(theme.id, 'shadow-match')}` }]} />
      <header className="result-heading"><h1>配对完成</h1></header>{renderSaveNotice()}
      <section className="result-review"><div className="result-image shadow-result-images">
        <figure><Asset catalog={catalog} id={level.referenceAssetId} alt="彩色飞天完整图" eager /><figcaption>彩色飞天</figcaption></figure>
        <figure><Asset catalog={catalog} id={level.options.find(option => option.id === level.correctOptionId)!.assetId} alt="与飞天轮廓完全对应的影子" eager /><figcaption>对应影子</figcaption></figure>
      </div><div className="result-summary"><SourceNote level={level} /></div></section>
      {resultActions('再配一次')}
    </div>;
    if (level.gameType === 'coloring' && !Object.keys(artworkColors(artworks, level)).length) return <div className="page narrow-page empty-state"><h1>{hasOlderArtwork(artworks, level) ? '线稿已更新，旧作品已保留' : '当前作品还未着色'}</h1>{renderArtworkNotice()}<a className="button button-primary" href={`#${playPath(level.id)}`}>继续填色</a></div>;
    return <div className={`page page-result${isColoring || isPuzzle ? ' is-coloring-result' : ''}`}>
      <Breadcrumb catalog={catalog} items={[{ label: `${gameNames[level.gameType]}关卡`, href: `#${levelsPath(theme.id, level.gameType)}` }]} />
      <header className="result-heading"><h1>{isColoring ? '作品完成' : isPuzzle ? '拼图完成' : '观察完成'}</h1></header>
      {renderSaveNotice()}
      {isColoring && renderArtworkNotice()}
      <section className="result-review"><div className="result-image">{level.gameType === 'coloring' ? <ColoringResult level={level} catalog={catalog} colors={artworkColors(artworks, level)} materials={artworkMaterials(artworks, level)} /> : level.gameType === 'puzzle' ? <Asset catalog={catalog} id={level.imageAssetId} alt="拼合完成的完整图像" eager /> : <><Asset catalog={catalog} id={level.baseAssetId} alt="本次观察参考图" eager /><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId]} /></>}</div><div className="result-summary">{level.gameType === 'spot-difference' && <strong className="result-count">{level.differences.length}<span>处发现</span></strong>}<SourceNote level={level} /></div></section>
      {resultActions(isColoring ? '继续创作' : isPuzzle ? '再拼一次' : '再观察一次')}
    </div>;
  }

  function renderHelp() {
    return <div className="page narrow-page page-help"><Breadcrumb catalog={catalog} items={[{ label: '游戏首页', href: '#/' }, { label: '游玩指南' }]} /><div className="text-page-heading"><h1>游玩指南</h1></div><div className="text-scroll" tabIndex={0} aria-label="游玩指南正文"><div className="guide-list"><article><span>01</span><div><h2>每次只做一件事</h2><p>选择主题、玩法和关卡。一关只有一种玩法。</p></div></article><article><span>02</span><div><h2>卡住了，就用提示</h2><p>提示和重试都不限次数，也不会扣分。找不同可以点击任一幅图；已经找到的位置会在两幅图上标出。</p></div></article><article><span>03</span><div><h2>完成之后，再看一眼</h2><p>活动结束会给出简短解释和文化参考。完成表示参与过这次观察，不等于已经学会所有相关知识。</p></div></article><article><span>04</span><div><h2>记住探索的边界</h2><p>完成记录保存在当前设备、当前浏览器里。换浏览器、清除网站数据或使用无痕模式，可能无法保留记录。填色作品会自动保存，找不同不保存中途进度。</p></div></article></div><section className="development-note"><h2>图像说明</h2><p>AI教学示意图用于学习与游戏，不是原壁画照片或历史原貌复原。文化参考见完成后的发现回顾。</p></section></div><div className="text-page-actions"><a className="button button-secondary" href="#/">回到游戏首页</a></div></div>;
  }

  function renderSettings() {
    return <div className="page narrow-page page-settings">
      <Breadcrumb catalog={catalog} items={[{ label: '游戏首页', href: '#/' }, { label: '体验设置' }]} />
      <div className="text-page-heading"><h1>设置</h1></div>
      <div className="text-scroll">
        <SoundSettings sound={sound} />
        <div className="setting-row">
          <div><h2>减少动效</h2><p>减少页面过渡与按钮动效，让画面更安静。</p></div>
          <label className="toggle">
            <input type="checkbox" checked={progress.settings.reducedMotion} onChange={event => persist({
              ...progressRef.current, settings: { ...progressRef.current.settings, reducedMotion: event.target.checked },
            })} />
            <span className="toggle-track" aria-hidden="true" /><span className="visually-hidden">减少动效</span>
          </label>
        </div>
        {renderSaveNotice()}
      </div>
    </div>;
  }

  let page: ReactNode;
  if (route.page === 'home' || route.page === 'themes') page = <ThemeCards catalog={catalog} selectedIndex={activeTheme} onSelectIndex={setActiveTheme} hrefForTheme={theme => `#${gamesPath(theme.id)}`} />;
  else if (route.page === 'help') page = renderHelp();
  else if (route.page === 'settings') page = renderSettings();
  else if (route.page === 'games' || route.page === 'levels') {
    const theme = catalog.themes.find(item => item.id === route.themeId);
    if (theme && route.page === 'games') page = <GameSelectScreen catalog={catalog} theme={theme} onBack={() => goTo('/themes')} hrefForGame={type => `#${levelsPath(theme.id, type)}`} />;
    else if (theme && route.page === 'levels' && theme.allowedGameTypes.includes(route.gameType)) page = <LevelSelectScreen catalog={catalog} theme={theme} gameType={route.gameType} progress={progress} onBack={() => goTo(gamesPath(theme.id))} hrefForLevel={id => `#${playPath(id)}`} />;
  } else if (route.page === 'play' || route.page === 'result') {
    const level = catalog.levels.find(item => item.id === route.id);
    const theme = catalog.themes.find(item => item.id === level?.themeId);
    if (level && theme) page = <LevelNavigationProvider catalog={catalog} level={level}>{route.page === 'result' ? renderResult(level, theme) : renderLevel(level, theme)}</LevelNavigationProvider>;
  }
  if (!page) page = <div className="page narrow-page empty-state"><h1>页面不存在</h1><a className="button button-primary" href="#/">返回首页</a></div>;
  return <div ref={shellRef} className="app-shell" data-screen={route.page} data-reduced-motion={progress.settings.reducedMotion ? 'true' : 'false'} style={assetStyle} onClickCapture={sound.onInterfaceClick}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
    <header className="site-header"><a className="brand" href="#/" aria-label="敦煌寻宝记，返回首页"><span className="brand-mark" aria-hidden="true">敦</span><strong>敦煌寻宝记</strong></a><nav className="header-nav" aria-label="主导航"><a href="#/themes" aria-current={route.page === 'home' || route.page === 'themes' ? 'page' : undefined}>游戏世界</a><a href="#/help" aria-current={route.page === 'help' ? 'page' : undefined}>指南</a><a href="#/settings" aria-current={route.page === 'settings' ? 'page' : undefined}>设置</a></nav></header>
    {loadWarning && <div className="global-notice notice" role="status"><p>{loadWarning}</p><button className="text-link" onClick={() => setLoadWarning(null)} type="button">知道了</button></div>}
    {saveError && route.page !== 'result' && route.page !== 'settings' && <div className="global-notice">{renderSaveNotice(true)}</div>}
    <main id="main-content" ref={mainRef} tabIndex={-1} key={routeKey}>{['home', 'themes', 'games', 'levels', 'play', 'result'].includes(route.page) ? <MobileLandscapeGuard active>{page}</MobileLandscapeGuard> : page}</main>
  </div>;
}

function Breadcrumb({ catalog, items }: { catalog: ContentCatalog; items: { label: string; href?: string }[] }) {
  const parent = [...items].reverse().find(item => item.href);
  return <nav className="breadcrumb" aria-label="当前位置">{parent && <a className="breadcrumb-back" href={parent.href} aria-label={`返回${parent.label}`}><Asset catalog={catalog} id="icon-back" /><span>{parent.label}</span></a>}</nav>;
}
