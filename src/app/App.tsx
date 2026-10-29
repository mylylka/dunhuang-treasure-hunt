import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getAssetUrl } from '../content';
import { getLessonBook } from '../content/lessons';
import { getLevelChoices } from '../content/level-roadmap';
import type { LessonBook } from '../content/lessons/types';
import { ThemeCards } from './ThemeCards';
import { TeachingScreen } from './TeachingScreen';
import { GameSelectScreen } from './GameSelectScreen';
import { LevelSelectScreen } from './LevelSelectScreen';
import { gameNames, gamesPath, goTo, levelsPath, playPath, readRoute, routeKey as getRouteKey, themePath, type Route } from './navigation';
import { isLessonCompleted, lessonRecord, loadLearning, saveLearning, withCompletedLesson, withVisitedUnit, type LearningData } from '../services/learning';
import { ArtInspector } from './ArtInspector';
import { ColoringScreen } from './ColoringScreen';
import { PuzzleScreen } from './PuzzleScreen';
import { ColoringResult } from './ColoringResult';
import { SoundSettings } from './SoundSettings';
import { useSound } from './useSound';
import { artworkColors, hasOlderArtwork, loadArtworks, saveArtworks, withArtwork, type ArtworksData } from '../services/artworks';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import { loadProgress, saveProgress, withCompletedLevel } from '../services/progress';
import type { ContentCatalog, GameCommand, GameEvent, Level, LevelMetadata, ProgressData, RegionColors, ThemeDefinition } from '../types';

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
    <p className="result-reference-link"><a href={level.source.url} target="_blank" rel="noreferrer">{level.source.title}<span aria-hidden="true"> ↗</span></a></p>
    {level.source.note && <p>{level.source.note}</p>}
    {level.teachingNote && <p className="result-art-note">{level.teachingNote}</p>}
  </section>;
}

export default function App({ catalog }: { catalog: ContentCatalog }) {
  const sound = useSound();
  const [initialLoad] = useState(() => loadProgress());
  const [initialLearning] = useState(() => loadLearning());
  const [initialArtworks] = useState(() => loadArtworks());
  const [artworks, setArtworks] = useState<ArtworksData>(initialArtworks.data);
  const artworksRef = useRef(artworks);
  const [artworkSaveError, setArtworkSaveError] = useState<string | null>(null);
  const [learning, setLearning] = useState<LearningData>(initialLearning.data);
  const learningRef = useRef(learning);
  const [learningSaveError, setLearningSaveError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData>(initialLoad.data);
  const progressRef = useRef(progress);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [loadWarning, setLoadWarning] = useState([initialLoad.warning, initialLearning.warning, initialArtworks.warning].filter(Boolean).join(' ') || null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(readRoute);
  const [command, setCommand] = useState<GameCommand | null>(null);
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [gameTotal, setGameTotal] = useState(0);
  const [hintStatus, setHintStatus] = useState('');
  const [gameError, setGameError] = useState<string | null>(null);
  const [gameReady, setGameReady] = useState(false);
  const [playerRun, setPlayerRun] = useState(0);
  const [activeTheme, setActiveTheme] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const commandSequence = useRef(0);
  const completedThisRun = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  const persist = useCallback((next: ProgressData) => {
    progressRef.current = next;
    setProgress(next);
    const result = saveProgress(next);
    setSaveError(result.ok ? null : result.message);
    return result.ok;
  }, []);

  useEffect(() => {
    const handleHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const routeKey = getRouteKey(route);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
    setCommand(null);
    setInspectorOpen(false);
    setFoundIds([]);
    setGameError(null);
    setGameReady(false);
    setHintStatus('');
    completedThisRun.current = false;
  }, [routeKey]);

  const persistLearning = useCallback((next: LearningData) => {
    learningRef.current = next;
    setLearning(next);
    const result = saveLearning(next);
    setLearningSaveError(result.ok ? null : result.message);
  }, []);

  const persistArtworks = useCallback((next: ArtworksData) => {
    artworksRef.current = next;
    setArtworks(next);
    const result = saveArtworks(next);
    setArtworkSaveError(result.ok ? null : result.message);
  }, []);

  const onGameEvent = useCallback((event: GameEvent) => {
    if (event.type === 'ready') { setGameReady(true); setGameTotal(event.total); setGameError(null); }
    if (event.type === 'progress') { setFoundIds(event.foundIds); setGameTotal(event.total); }
    if (event.type === 'hint') setHintStatus(event.message);
    if (event.type === 'error') { setGameError(event.message); setGameReady(false); }
    if (event.type === 'completed' && !completedThisRun.current) {
      const level = catalogRef.current.levels.find((item) => item.id === event.levelId);
      if (!level) return;
      completedThisRun.current = true;
      persist(withCompletedLevel(progressRef.current, level.id));
      goTo(`/result/${encodeURIComponent(level.id)}`);
    }
  }, [persist]);

  function issueCommand(type: 'hint' | 'restart') {
    if (type === 'restart') {
      completedThisRun.current = false;
      setFoundIds([]);
      setHintStatus('');
    }
    setCommand({ type, sequence: ++commandSequence.current });
  }

  function replay(levelId: string) {
    completedThisRun.current = false;
    setPlayerRun((value) => value + 1);
    goTo(playPath(levelId));
  }

  function skinSlice(id: string) {
    const slice = catalog.assets.find(asset => asset.id === id)!.slice!;
    return `${slice.top} ${slice.right} ${slice.bottom} ${slice.left}`;
  }
  const assetStyle = {
    '--background-landscape': `url("${getAssetUrl(catalog, 'bg-landscape')}")`,
    '--background-portrait': `url("${getAssetUrl(catalog, 'bg-portrait')}")`,
    '--panel-slice': skinSlice('panel'),
    '--primary-button-slice': skinSlice('button-primary'),
    '--secondary-button-slice': skinSlice('button-secondary'),
    '--panel-image': `url("${getAssetUrl(catalog, 'panel')}")`,
    '--primary-button-image': `url("${getAssetUrl(catalog, 'button-primary')}")`,
    '--secondary-button-image': `url("${getAssetUrl(catalog, 'button-secondary')}")`,
  } as CSSProperties;

  function renderSaveNotice(compact = false) {
    if (!saveError) return null;
    return <div className={`notice notice-error ${compact ? 'notice-compact' : ''}`} role="alert" data-testid="save-error">
      <div><strong>记录暂未保存</strong><p>{saveError} 当前页面仍保留本次记录，关闭后可能丢失。</p></div>
      <button type="button" className="button button-secondary button-small" data-testid="retry-save" onClick={() => persist(progressRef.current)}>重试保存</button>
    </div>;
  }

  function renderHome() {
    return <ThemeCards catalog={catalog} selectedIndex={activeTheme} onSelectIndex={setActiveTheme}
      hrefForTheme={theme => `#${themePath(theme.id)}`} />;
  }

  function renderTeaching(book: LessonBook) {
    const record = lessonRecord(learning, book);
    return <TeachingScreen key={book.id} book={book} catalog={catalog} completed={isLessonCompleted(learning, book)}
      initialVisitedIds={record.visitedIds}
      onBack={() => goTo('/')}
      onSkip={() => goTo(gamesPath(book.themeId))}
      onUnitChange={unitId => {
        const next = withVisitedUnit(learningRef.current, book, unitId);
        if (next !== learningRef.current) persistLearning(next);
      }}
      onComplete={() => {
        // Only actual chapter visits can qualify a completed participation record.
        persistLearning(withCompletedLesson(learningRef.current, book));
        goTo(gamesPath(book.themeId));
      }} />;
  }

  function renderTheme(theme: ThemeDefinition) {
    const book = getLessonBook(theme.id);
    if (book) return renderTeaching(book);
    return <div className="page unavailable-theme"><Breadcrumb catalog={catalog} items={[{ label: '首页', href: '#/' }]} />
      <h1>{theme.title}</h1><div className="unavailable-theme-content">
        <Asset catalog={catalog} id={theme.coverAssetId} alt={`${theme.title}主题封面`} eager />
        <p>主题尚未开放</p></div></div>;
  }

  function renderArtworkNotice() {
    return artworkSaveError && <div className="notice notice-error notice-compact" role="alert" data-testid="artwork-save-error"><p>{artworkSaveError}</p><button type="button" className="button button-secondary button-small" data-testid="retry-artwork-save" onClick={() => persistArtworks(artworksRef.current)}><span className="button-label">重试保存作品</span></button></div>;
  }

  function renderLevel(level: Level, theme: ThemeDefinition) {
    if (level.gameType === 'puzzle') return <PuzzleScreen key={level.id} level={level} catalog={catalog}
      reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent}
      onBack={() => goTo(levelsPath(theme.id, 'puzzle'))} />;
    if (level.gameType === 'coloring') {
      const save = (colors: RegionColors, submitted = false) => persistArtworks(withArtwork(artworksRef.current, level, colors, submitted));
      return <ColoringScreen key={level.id} level={level} catalog={catalog} initialColors={artworkColors(artworks, level)}
        reducedMotion={progress.settings.reducedMotion} onChange={colors => save(colors)}
        onBack={() => goTo(levelsPath(theme.id, 'coloring'))}
        onComplete={() => { save(artworkColors(artworksRef.current, level), true); onGameEvent({ type: 'completed', levelId: level.id }); }}
        saveNotice={<>{hasOlderArtwork(artworks, level) && <p className="notice" role="status">线稿版本已更新，旧作品已保留。本页使用新线稿。</p>}{renderArtworkNotice()}</>} />;
    }
    const image = catalog.assets.find(asset => asset.id === level.baseAssetId)!;
    const total = gameReady ? gameTotal : level.differences.length;
    return <div className="page page-play">
      <div className="play-topline"><Breadcrumb catalog={catalog} items={[{ label: `${gameNames[level.gameType]}关卡`, href: `#${levelsPath(theme.id, level.gameType)}` }]} /><div className="play-view-actions"><button type="button" className="text-link" disabled={!gameReady} onClick={() => setInspectorOpen(true)}>放大观察</button></div></div>
      <header className="play-heading"><div><h1>{level.title}</h1></div><div className="observation-count" data-testid="game-progress" aria-label={`已找到 ${foundIds.length} 处，共 ${total} 处`}><span>{foundIds.length}</span><span className="count-divider">/</span><span>{total}</span><small>处变化</small></div></header>
      <section className="game-stage" aria-label="找不同游戏区"><div className="stage-topline"><span>点击任一幅图中发生变化的位置</span><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId, level.editedAssetId]}>待替换 · 功能占位图</PlaceholderLabel></div><PhaserPlayer key={`${level.id}-${playerRun}`} level={level} baseImageUrl={getAssetUrl(catalog, level.baseAssetId)} editedImageUrl={getAssetUrl(catalog, level.editedAssetId)} imageAspectRatio={image.width / image.height} reducedMotion={progress.settings.reducedMotion} onEvent={onGameEvent} command={command} />{!gameReady && !gameError && <p className="game-loading" role="status">正在准备观察画面…</p>}</section>
      {gameError ? <div className="notice notice-error game-error" role="alert"><div><strong>画面暂时无法打开</strong><p>{gameError}</p></div><button type="button" className="button button-secondary button-small" onClick={() => { setGameError(null); setGameReady(false); setPlayerRun((value) => value + 1); }}>重新加载画面</button></div> : <div className="hint-note" role="status" aria-live="polite" data-testid="hint-status"><p>{hintStatus}</p></div>}
      {inspectorOpen && <ArtInspector referenceUrl={getAssetUrl(catalog, level.baseAssetId)} editedUrl={getAssetUrl(catalog, level.editedAssetId)} imageAspectRatio={image.width / image.height} onClose={() => setInspectorOpen(false)} />}
      <div className="play-toolbar"><div className="play-actions"><button type="button" data-sound="none" className="button button-secondary button-small" onClick={() => issueCommand('hint')} disabled={!gameReady || !!gameError}><Asset catalog={catalog} id="icon-hint" /><span className="button-label">给我提示</span></button><button type="button" className="button button-plain button-small" onClick={() => issueCommand('restart')} disabled={!gameReady || !!gameError}><Asset catalog={catalog} id="icon-restart" /><span className="button-label">重新开始</span></button></div></div>
    </div>;
  }

  function renderResult(level: Level, theme: ThemeDefinition) {
    const isColoring = level.gameType === 'coloring';
    const isPuzzle = level.gameType === 'puzzle';
    const playablePuzzles = isPuzzle ? getLevelChoices(catalog, theme.id, 'puzzle')
      .filter(choice => choice.status === 'available') : [];
    const puzzleIndex = playablePuzzles.findIndex(choice => choice.id === level.id);
    const nextPuzzle = puzzleIndex >= 0 ? playablePuzzles[puzzleIndex + 1]?.level : undefined;
    if (isPuzzle && !progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>先完成拼图，再查看全图</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>前往拼图</a></div>;
    if (!progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>{isColoring ? '先完成活动，再回看作品' : '先完成活动，再回看发现'}</h1><a className="button button-primary" href={`#${playPath(level.id)}`}>{isColoring ? '前往填色' : '前往观察'}</a></div>;
    if (level.gameType === 'coloring' && !Object.keys(artworkColors(artworks, level)).length) return <div className="page narrow-page empty-state"><h1>{hasOlderArtwork(artworks, level) ? '线稿已更新，旧作品已保留' : '当前作品还未着色'}</h1>{renderArtworkNotice()}<a className="button button-primary" href={`#${playPath(level.id)}`}>继续填色</a></div>;
    return <div className={`page page-result${isColoring || isPuzzle ? ' is-coloring-result' : ''}`}>
      <Breadcrumb catalog={catalog} items={[{ label: `${gameNames[level.gameType]}关卡`, href: `#${levelsPath(theme.id, level.gameType)}` }]} />
      <header className="result-heading"><h1>{isColoring ? '作品完成' : isPuzzle ? '拼图完成' : '观察完成'}</h1></header>
      {renderSaveNotice()}
      {isColoring && renderArtworkNotice()}
      <section className="result-review"><div className="result-image">{level.gameType === 'coloring' ? <ColoringResult level={level} catalog={catalog} colors={artworkColors(artworks, level)} /> : level.gameType === 'puzzle' ? <Asset catalog={catalog} id={level.imageAssetId} alt="拼合完成的完整图像" eager /> : <><Asset catalog={catalog} id={level.baseAssetId} alt="本次观察参考图" eager /><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId]} /></>}</div><div className="result-summary">{level.gameType === 'spot-difference' && <strong className="result-count">{level.differences.length}<span>处发现</span></strong>}<SourceNote level={level} /></div></section>
      <div className={`result-actions${isPuzzle ? ' puzzle-result-actions' : ''}`}><a className="button button-primary" href={`#${levelsPath(theme.id, level.gameType)}`}><span className="button-label">返回关卡</span></a><button type="button" className="button button-secondary" onClick={() => replay(level.id)}><span className="button-label">{isColoring ? '继续创作' : isPuzzle ? '再拼一次' : '再观察一次'}</span></button>{nextPuzzle && <a className="button button-primary" href={`#${playPath(nextPuzzle.id)}`}><span className="button-label">下一关</span></a>}</div>
    </div>;
  }

  function renderHelp() {
    return <div className="page narrow-page page-help"><Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '游玩指南' }]} /><div className="text-page-heading"><h1>游玩指南</h1></div><div className="text-scroll" tabIndex={0} aria-label="游玩指南正文"><div className="guide-list"><article><span>01</span><div><h2>每次只做一件事</h2><p>进入主题先看文化导览，也可选择直接玩游戏，再选择玩法和关卡。一关只有一种玩法。</p></div></article><article><span>02</span><div><h2>卡住了，就用提示</h2><p>提示和重试都不限次数，也不会扣分。找不同可以点击任一幅图；已经找到的位置会在两幅图上标出。</p></div></article><article><span>03</span><div><h2>完成之后，再看一眼</h2><p>活动结束会给出简短解释和文化参考。完成表示参与过这次观察，不等于已经学会所有相关知识。</p></div></article><article><span>04</span><div><h2>记住探索的边界</h2><p>完成记录保存在当前设备、当前浏览器里。换浏览器、清除网站数据或使用无痕模式，可能无法保留记录。填色作品会自动保存，找不同不保存中途进度。</p></div></article></div><section className="development-note"><h2>图像说明</h2><p>AI教学示意图用于学习与游戏，不是原壁画照片或历史原貌复原。文化参考见完成后的发现回顾。</p></section></div><div className="text-page-actions"><a className="button button-secondary" href="#/">回到探索首页 <span aria-hidden="true">↗</span></a></div></div>;
  }

  function renderSettings() {
    return <div className="page narrow-page page-settings"><Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '体验设置' }]} /><div className="text-page-heading"><h1>设置</h1></div><div className="text-scroll"><SoundSettings sound={sound} /><div className="setting-row"><div><h2>减少动效</h2><p>减少页面过渡与按钮动效，让画面更安静。</p></div><label className="toggle"><input type="checkbox" checked={progress.settings.reducedMotion} onChange={(event) => persist({ ...progressRef.current, settings: { ...progressRef.current.settings, reducedMotion: event.target.checked } })} /><span className="toggle-track" aria-hidden="true" /><span className="visually-hidden">减少动效</span></label></div>{renderSaveNotice()}</div></div>;
  }

  let page: ReactNode;
  if (route.page === 'home') page = renderHome();
  else if (route.page === 'help') page = renderHelp();
  else if (route.page === 'settings') page = renderSettings();
  else if (route.page === 'theme') {
    const theme = catalog.themes.find(item => item.id === route.id);
    if (theme) page = renderTheme(theme);
  } else if (route.page === 'games' || route.page === 'levels') {
    const theme = catalog.themes.find(item => item.id === route.themeId);
    if (theme) {
      if (route.page === 'games') page = <GameSelectScreen catalog={catalog} theme={theme}
        onBack={() => goTo(themePath(theme.id))} onReview={() => goTo(themePath(theme.id))}
        hrefForGame={type => `#${levelsPath(theme.id, type)}`} />;
      else if (theme.allowedGameTypes.includes(route.gameType)) page = <LevelSelectScreen catalog={catalog} theme={theme}
        gameType={route.gameType} progress={progress} onBack={() => goTo(gamesPath(theme.id))}
        hrefForLevel={id => `#${playPath(id)}`} />;
    }
  } else if (route.page === 'play' || route.page === 'result') {
    const level = catalog.levels.find(item => item.id === route.id);
    const theme = catalog.themes.find(item => item.id === level?.themeId);
    if (level && theme) {
      page = route.page === 'result' ? renderResult(level, theme) : renderLevel(level, theme);
    }
  }
  if (!page) page = <div className="page narrow-page empty-state"><h1>页面不存在</h1><a className="button button-primary" href="#/">返回首页</a></div>;

  return <div className="app-shell" data-screen={route.page} data-reduced-motion={progress.settings.reducedMotion ? 'true' : 'false'} style={assetStyle} onClickCapture={sound.onInterfaceClick}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
    <header className="site-header"><a className="brand" href="#/" aria-label="敦煌寻宝记，返回首页"><span className="brand-mark" aria-hidden="true">敦</span><strong>敦煌寻宝记</strong></a><nav className="header-nav" aria-label="主导航"><a href="#/" aria-current={route.page === 'home' ? 'page' : undefined}>首页</a><a href="#/help" aria-current={route.page === 'help' ? 'page' : undefined}>指南</a><a href="#/settings" aria-current={route.page === 'settings' ? 'page' : undefined}>设置</a></nav></header>
    {loadWarning && <div className="global-notice notice" role="status"><p>{loadWarning}</p><button className="text-link" onClick={() => setLoadWarning(null)} type="button">知道了</button></div>}
    {saveError && route.page !== 'result' && route.page !== 'settings' && <div className="global-notice">{renderSaveNotice(true)}</div>}
    {learningSaveError && <div className="global-notice notice notice-error" role="alert" data-testid="learning-save-error"><p>{learningSaveError}</p><button className="button button-secondary button-small" type="button" onClick={() => persistLearning(learningRef.current)}>重试保存学习记录</button></div>}
    <main id="main-content" ref={mainRef} tabIndex={-1} key={routeKey}>{page}</main>

  </div>;
}

function Breadcrumb({ catalog, items }: { catalog: ContentCatalog; items: { label: string; href?: string }[] }) {
  const parent = [...items].reverse().find(item => item.href);
  return <nav className="breadcrumb" aria-label="当前位置">{parent && <a className="breadcrumb-back" href={parent.href} aria-label={`返回${parent.label}`}><Asset catalog={catalog} id="icon-back" /><span>{parent.label}</span></a>}</nav>;
}


