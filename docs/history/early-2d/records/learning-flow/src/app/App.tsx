import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getAssetUrl } from '../content';
import { ArtInspector } from './ArtInspector';
import { PhaserPlayer } from '../runtime/PhaserPlayer';
import { isLevelUnlocked, loadProgress, saveProgress, withCompletedLevel } from '../services/progress';
import type { ContentCatalog, GameCommand, GameEvent, GameType, ProgressData, SpotDifferenceLevel, ThemeDefinition } from '../types';

type Route = { page: 'home' | 'help' | 'settings' | 'missing' } | { page: 'theme' | 'play' | 'result'; id: string };

const gameNames: Record<GameType, string> = {
  'spot-difference': '找不同', 'hidden-object': '线索找物', 'shadow-match': '影子配对', puzzle: '拼图', coloring: '填色',
};

function readRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { page: 'home' };
  if ((parts[0] === 'help' || parts[0] === 'settings') && parts.length === 1) return { page: parts[0] };
  if (['theme', 'play', 'result'].includes(parts[0]) && parts.length === 2) {
    try { return { page: parts[0] as 'theme' | 'play' | 'result', id: decodeURIComponent(parts[1]) }; } catch { return { page: 'missing' }; }
  }
  return { page: 'missing' };
}

function goTo(path: string) { window.location.hash = path; }
function themePath(themeId: string) { return `/theme/${encodeURIComponent(themeId)}`; }
function levelPath(levelId: string) { return `/play/${encodeURIComponent(levelId)}`; }

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

function SourceNote({ level }: { level: SpotDifferenceLevel }) {
  return <div className="source-note">
    <span className="small-label">文化参考</span>
    <p><a href={level.source.url} target="_blank" rel="noreferrer">{level.source.title}<span aria-hidden="true"> ↗</span></a></p>
    <p className="muted">{level.source.note}</p>
  </div>;
}

export default function App({ catalog }: { catalog: ContentCatalog }) {
  const [initialLoad] = useState(() => loadProgress());
  const [progress, setProgress] = useState<ProgressData>(initialLoad.data);
  const progressRef = useRef(progress);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [loadWarning, setLoadWarning] = useState(initialLoad.warning);
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
  const [levelPage, setLevelPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const [dialog, setDialog] = useState<{ title: string; body: ReactNode } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const commandSequence = useRef(0);
  const completedThisRun = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const levelListRef = useRef<HTMLDivElement>(null);
  const levelRowSizeRef = useRef({ width: 0, height: 0 });

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

  const routeKey = 'id' in route ? `${route.page}:${route.id}` : route.page;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
    setCommand(null);
    setDialog(null);
    setInspectorOpen(false);
    setLevelPage(0);
    setFoundIds([]);
    setGameError(null);
    setGameReady(false);
    setHintStatus('');
    completedThisRun.current = false;
  }, [routeKey]);

  useEffect(() => {
    const list = levelListRef.current;
    if (!list || route.page !== 'theme') return;
    const rows = [...list.querySelectorAll<HTMLElement>('.level-row')];
    if (!rows.length) return;
    const updateCapacity = () => {
      const bounds = list.getBoundingClientRect();
      const rowHeight = Math.max(...rows.map(row => row.getBoundingClientRect().height));
      if (bounds.height <= 0 || rowHeight <= 0) return;
      const previous = levelRowSizeRef.current;
      // Retain the largest card measured at this width, preventing page sizes
      // from alternating when later pages contain longer level titles.
      const height = Math.abs(previous.width - bounds.width) < 1 ? Math.max(previous.height, rowHeight) : rowHeight;
      levelRowSizeRef.current = { width: bounds.width, height };
      setPageSize(Math.max(1, Math.min(3, Math.floor(bounds.height / height))));
    };
    const observer = new ResizeObserver(updateCapacity);
    observer.observe(list);
    rows.forEach(row => observer.observe(row));
    updateCapacity();
    return () => observer.disconnect();
  }, [routeKey, levelPage, pageSize]);

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
    goTo(levelPath(levelId));
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

  function showLevelInfo(level: SpotDifferenceLevel) {
    setDialog({ title: '这次观察的发现', body: <>
      <div className="dialog-discoveries">{level.differences.map((difference, index) => <article key={difference.id}><span className="discovery-number">{index + 1}</span><p>{difference.explanation}</p></article>)}</div>
      <p>{level.teachingNote}</p>
      {hasPlaceholder(catalog, [level.baseAssetId, level.editedAssetId]) && <p>当前画面为待替换占位图，不代表敦煌文物原貌。</p>}
      <SourceNote level={level} />
    </> });
  }

  function renderHome() {
    return <div className="page page-home">
      <div className="section-heading"><h1>选择主题</h1></div>
      <div className="theme-list">{catalog.themes.map((theme, index) => {
        const available = catalog.levels.some((level) => level.themeId === theme.id);
        return <a href={`#${themePath(theme.id)}`} className={`theme-row theme-${theme.id} ${index === activeTheme ? 'is-active' : ''}`} data-selected={index === activeTheme} key={theme.id}>
          <div className="theme-image"><Asset catalog={catalog} id={theme.coverAssetId} alt={`${theme.title}主题封面`} eager /><PlaceholderLabel catalog={catalog} assetIds={[theme.coverAssetId]} /></div>
          <div className="theme-info"><h2>{theme.title}</h2>{!available && <span className="state-label">未开放</span>}</div>
        </a>;
      })}</div>
      <nav className="theme-pagination" aria-label="切换探索主题">{catalog.themes.map((theme, index) => <button key={theme.id} type="button" aria-label={`查看主题：${theme.title}`} aria-pressed={activeTheme === index} onClick={() => setActiveTheme(index)}><span>{theme.title}</span></button>)}</nav>
    </div>;
  }

  function renderTheme(theme: ThemeDefinition) {
    const levels = catalog.levels.filter((level) => level.themeId === theme.id).sort((left, right) => Number(right.id === theme.introLevelId) - Number(left.id === theme.introLevelId));
    const maxPage = Math.max(0, Math.ceil(levels.length / pageSize) - 1);
    const currentPage = Math.min(levelPage, maxPage);
    return <div className="page page-theme">
      <Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: theme.title }]} />
      <header className="theme-page-heading"><div><h1>{theme.title}</h1><div className="game-type-list">{theme.allowedGameTypes.map((type) => <span key={type}>{theme.id === 'stories' && type === 'puzzle' ? '故事拼图' : gameNames[type]}</span>)}</div></div><button className="text-link" type="button" onClick={() => setDialog({ title: theme.title, body: <><p>{theme.description}</p></> })}>主题介绍 <span aria-hidden="true">↗</span></button></header>
      <div className="theme-content"><div className="theme-banner"><Asset catalog={catalog} id={theme.coverAssetId} alt={`${theme.title}主题封面`} eager /><PlaceholderLabel catalog={catalog} assetIds={[theme.coverAssetId]} /></div>
      {levels.length === 0 ? <section className="coming-soon"><h2>主题尚未开放</h2><a className="button button-primary" href="#/theme/patterns">去看纹样与色彩 <span aria-hidden="true">↗</span></a></section> : <section className="theme-levels"><div className="section-heading"><h2>关卡</h2></div><div className="level-list" ref={levelListRef}>{levels.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((level) => {
        const unlocked = isLevelUnlocked(level, theme, progress);
        const completed = !!progress.completed[level.id];
        return <article className={`level-row ${!unlocked ? 'level-locked' : ''}`} key={level.id}><div className="level-row-image"><Asset catalog={catalog} id={level.thumbnailAssetId} alt="活动缩略图" /><PlaceholderLabel catalog={catalog} assetIds={[level.thumbnailAssetId]}>待替换</PlaceholderLabel></div><div className="level-row-copy"><h3>{level.title}</h3>{completed && <span className="completed-label"><Asset catalog={catalog} id="icon-completed" />已完成</span>}</div>{unlocked ? <a className="button button-primary" href={`#${levelPath(level.id)}`}>{completed ? '再次观察' : '开始观察'}<span aria-hidden="true"> ↗</span></a> : <div className="locked-reason"><Asset catalog={catalog} id="icon-locked" />先完成入门关</div>}</article>;
      })}</div>{maxPage > 0 && <nav className="level-pagination" aria-label="活动分页"><button className="button button-secondary button-small" disabled={currentPage === 0} onClick={() => setLevelPage(currentPage - 1)}>上一页</button><span>{currentPage + 1} / {maxPage + 1}</span><button className="button button-secondary button-small" disabled={currentPage === maxPage} onClick={() => setLevelPage(currentPage + 1)}>下一页</button></nav>}</section>}</div>
    </div>;
  }

  function renderLevel(level: SpotDifferenceLevel, theme: ThemeDefinition) {
    if (!isLevelUnlocked(level, theme, progress)) return <div className="page narrow-page empty-state"><h1>先从这个主题的入门关开始</h1><p>完成入门关后，可以自由选择本主题已制作的活动。</p><a href={`#${themePath(theme.id)}`} className="button button-primary">查看主题活动</a></div>;
    const total = gameReady ? gameTotal : level.differences.length;
    return <div className="page page-play">
      <div className="play-topline"><Breadcrumb catalog={catalog} items={[{ label: theme.title, href: `#${themePath(theme.id)}` }, { label: level.id === theme.introLevelId ? '入门观察' : '观察活动' }]} /><div className="play-view-actions"><button type="button" className="text-link" disabled={!gameReady} onClick={() => setInspectorOpen(true)}>放大观察</button></div></div>
      <header className="play-heading"><div><h1>{level.title}</h1></div><div className="observation-count" data-testid="game-progress" aria-label={`已找到 ${foundIds.length} 处，共 ${total} 处`}><span>{foundIds.length}</span><span className="count-divider">/</span><span>{total}</span><small>处变化</small></div></header>
      <section className="game-stage" aria-label="找不同游戏区"><div className="stage-topline"><span>点击任一幅图中发生变化的位置</span><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId, level.editedAssetId]}>待替换 · 功能占位图</PlaceholderLabel></div><PhaserPlayer key={`${level.id}-${playerRun}`} level={level} baseImageUrl={getAssetUrl(catalog, level.baseAssetId)} editedImageUrl={getAssetUrl(catalog, level.editedAssetId)} onEvent={onGameEvent} command={command} />{!gameReady && !gameError && <p className="game-loading" role="status">正在准备观察画面…</p>}</section>
      {gameError ? <div className="notice notice-error game-error" role="alert"><div><strong>画面暂时无法打开</strong><p>{gameError}</p></div><button type="button" className="button button-secondary button-small" onClick={() => { setGameError(null); setGameReady(false); setPlayerRun((value) => value + 1); }}>重新加载画面</button></div> : <div className="hint-note" role="status" aria-live="polite" data-testid="hint-status"><p>{hintStatus}</p></div>}
      {inspectorOpen && <ArtInspector referenceUrl={getAssetUrl(catalog, level.baseAssetId)} editedUrl={getAssetUrl(catalog, level.editedAssetId)} onClose={() => setInspectorOpen(false)} />}
      <div className="play-toolbar"><div className="play-actions"><button type="button" className="button button-secondary button-small" onClick={() => issueCommand('hint')} disabled={!gameReady || !!gameError}><Asset catalog={catalog} id="icon-hint" />给我提示</button><button type="button" className="button button-plain button-small" onClick={() => issueCommand('restart')} disabled={!gameReady || !!gameError}><Asset catalog={catalog} id="icon-restart" />重新开始</button></div></div>
    </div>;
  }

  function renderResult(level: SpotDifferenceLevel, theme: ThemeDefinition) {
    if (!progress.completed[level.id]) return <div className="page narrow-page empty-state"><h1>先完成活动，再回看发现</h1><a className="button button-primary" href={`#${levelPath(level.id)}`}>前往观察</a></div>;
    return <div className="page page-result">
      <Breadcrumb catalog={catalog} items={[{ label: theme.title, href: `#${themePath(theme.id)}` }, { label: '观察回顾' }]} />
      <header className="result-heading"><h1>这一轮观察，完成了。</h1></header>
      {renderSaveNotice()}
      <section className="result-review"><div className="result-image"><Asset catalog={catalog} id={level.baseAssetId} alt="本次观察参考图" eager /><PlaceholderLabel catalog={catalog} assetIds={[level.baseAssetId]} /></div><div className="result-summary"><strong className="result-count">{level.differences.length}<span>处发现</span></strong><button className="text-link" type="button" onClick={() => showLevelInfo(level)}>查看发现与文化来源 <span aria-hidden="true">↗</span></button></div></section>
      <div className="result-actions"><a className="button button-primary" href={`#${themePath(theme.id)}`}>返回主题<span aria-hidden="true"> ↗</span></a><button type="button" className="button button-secondary" onClick={() => replay(level.id)}>再观察一次</button></div>
    </div>;
  }

  function renderHelp() {
    return <div className="page narrow-page page-help"><Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '游玩指南' }]} /><div className="text-page-heading"><h1>游玩指南</h1></div><div className="text-scroll" tabIndex={0} aria-label="游玩指南正文"><div className="guide-list"><article><span>01</span><div><h2>每次只做一件事</h2><p>选择主题，从入门关开始。先读学习目标，再按照画面上的说明操作。一关只有一种玩法。</p></div></article><article><span>02</span><div><h2>卡住了，就用提示</h2><p>提示和重试都不限次数，也不会扣分。找不同可以点击任一幅图；已经找到的位置会在两幅图上标出。</p></div></article><article><span>03</span><div><h2>完成之后，再看一眼</h2><p>活动结束会给出简短解释和文化参考。完成表示参与过这次观察，不等于已经学会所有相关知识。</p></div></article><article><span>04</span><div><h2>记住探索的边界</h2><p>完成记录保存在当前设备、当前浏览器里。换浏览器、清除网站数据或使用无痕模式，可能无法保留记录。当前短关不保存中途进度。</p></div></article></div><section className="development-note"><h2>图像说明</h2><p>AI教学示意图用于学习与游戏，不是原壁画照片或历史原貌复原。文化参考见完成后的发现回顾。</p></section></div><div className="text-page-actions"><a className="button button-secondary" href="#/">回到探索首页 <span aria-hidden="true">↗</span></a></div></div>;
  }

  function renderSettings() {
    return <div className="page narrow-page page-settings"><Breadcrumb catalog={catalog} items={[{ label: '探索首页', href: '#/' }, { label: '体验设置' }]} /><div className="text-page-heading"><h1>设置</h1></div><div className="text-scroll"><div className="setting-row"><div><h2>减少动效</h2><p>减少页面过渡与按钮动效，让画面更安静。</p></div><label className="toggle"><input type="checkbox" checked={progress.settings.reducedMotion} onChange={(event) => persist({ ...progressRef.current, settings: { ...progressRef.current.settings, reducedMotion: event.target.checked } })} /><span className="toggle-track" aria-hidden="true" /><span className="visually-hidden">减少动效</span></label></div>{renderSaveNotice()}</div></div>;
  }

  let page: ReactNode;
  if (route.page === 'home') page = renderHome();
  else if (route.page === 'help') page = renderHelp();
  else if (route.page === 'settings') page = renderSettings();
  else if (route.page === 'theme') {
    const theme = catalog.themes.find((item) => item.id === route.id);
    if (theme) page = renderTheme(theme);
  } else if (route.page === 'play' || route.page === 'result') {
    const level = catalog.levels.find((item) => item.id === route.id);
    const theme = catalog.themes.find((item) => item.id === level?.themeId);
    if (level && theme) page = route.page === 'play' ? renderLevel(level, theme) : renderResult(level, theme);
  }
  if (!page) page = <div className="page narrow-page empty-state"><h1>页面不存在</h1><a className="button button-primary" href="#/">返回首页</a></div>;

  return <div className="app-shell" data-screen={route.page} data-reduced-motion={progress.settings.reducedMotion ? 'true' : 'false'} style={assetStyle}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>跳到主要内容</a>
    <header className="site-header"><a className="brand" href="#/" aria-label="敦煌寻宝记，返回首页"><span className="brand-mark" aria-hidden="true">敦</span><strong>敦煌寻宝记</strong></a><nav className="header-nav" aria-label="主导航"><a href="#/" aria-current={route.page === 'home' ? 'page' : undefined}>首页</a><a href="#/help" aria-current={route.page === 'help' ? 'page' : undefined}>指南</a><a href="#/settings" aria-current={route.page === 'settings' ? 'page' : undefined}>设置</a></nav></header>
    {loadWarning && <div className="global-notice notice" role="status"><p>{loadWarning}</p><button className="text-link" onClick={() => setLoadWarning(null)} type="button">知道了</button></div>}
    {saveError && route.page !== 'result' && route.page !== 'settings' && <div className="global-notice">{renderSaveNotice(true)}</div>}
    <main id="main-content" ref={mainRef} tabIndex={-1} key={routeKey}>{page}</main>
    {dialog && <InfoDialog title={dialog.title} onClose={() => setDialog(null)}>{dialog.body}</InfoDialog>}

  </div>;
}

function Breadcrumb({ catalog, items }: { catalog: ContentCatalog; items: { label: string; href?: string }[] }) {
  const parent = [...items].reverse().find(item => item.href);
  return <nav className="breadcrumb" aria-label="当前位置">{parent && <a className="breadcrumb-back" href={parent.href} aria-label={`返回${parent.label}`}><Asset catalog={catalog} id="icon-back" /><span>{parent.label}</span></a>}</nav>;
}


function InfoDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="info-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="info-dialog-title"><header><h2 id="info-dialog-title">{title}</h2><button className="dialog-close" type="button" onClick={onClose} aria-label="关闭说明">×</button></header><div className="dialog-scroll" tabIndex={0}>{children}</div><footer><button className="button button-secondary button-small" type="button" onClick={onClose}>返回</button></footer></dialog>;
}
