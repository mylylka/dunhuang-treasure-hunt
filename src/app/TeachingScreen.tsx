import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { getAssetUrl } from '../content';
import type { LessonBook, LessonPanel, LessonQuestion, LessonRegion } from '../content/lessons/types';
import type { ContentCatalog } from '../types';
import { LessonImageViewer } from './LessonImageViewer';
import '../styles/teaching.css';

export interface TeachingScreenProps {
  book: LessonBook;
  catalog: ContentCatalog;
  initialUnitId?: string;
  initialVisitedIds?: string[];
  completed?: boolean;
  onUnitChange?: (unitId: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const fullImage: LessonRegion = { x: 0, y: 0, width: 1, height: 1 };

function useFittedImage(slotRef: RefObject<HTMLDivElement | null>, ratio: number) {
  const [size, setSize] = useState({ width: 1, height: 1 });
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const resize = () => {
      const bounds = slot.getBoundingClientRect();
      const style = getComputedStyle(slot);
      const availableWidth = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const availableHeight = bounds.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const width = Math.max(1, Math.min(availableWidth, availableHeight * ratio));
      const height = width / ratio;
      setSize(previous => Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5
        ? previous : { width, height });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(slot);
    resize();
    return () => observer.disconnect();
  }, [slotRef, ratio]);
  return size;
}

function LessonFigure({ panel, catalog, onEnlarge }: { panel: LessonPanel; catalog: ContentCatalog; onEnlarge: () => void }) {
  const [emphasized, setEmphasized] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const slotRef = useRef<HTMLDivElement>(null);
  const asset = catalog.assets.find(item => item.id === panel.imageAssetId)!;
  const detail = emphasized && Boolean(panel.focus);
  const view = detail && panel.focus ? panel.focus : fullImage;
  const ratio = asset.width * view.width / (asset.height * view.height);
  const size = useFittedImage(slotRef, ratio);
  const regions = panel.highlights?.length ? panel.highlights : panel.focus ? [panel.focus] : [];
  const sourceUrl = getAssetUrl(catalog, panel.imageAssetId);
  const viewBox = [view.x * asset.width, view.y * asset.height, view.width * asset.width, view.height * asset.height].join(' ');
  const imageScale = size.width / (asset.width * view.width);

  return <figure className="lesson-figure" data-testid="lesson-figure">
    <div className="lesson-image-tools">
      <button type="button" className="lesson-tool" onClick={event => { event.currentTarget.focus({ preventScroll: true }); onEnlarge(); }}>放大查看</button>
      {regions.length > 0 && <button type="button" className="lesson-tool" aria-pressed={emphasized}
        onClick={() => setEmphasized(value => !value)}>{emphasized ? '返回全图' : '看重点'}</button>}
    </div>
    <div className="lesson-image-slot" ref={slotRef}>
      {failed ? <div className="lesson-image-error" role="alert"><p>图像暂时未能载入</p><button type="button" className="lesson-tool"
        onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新载入图片</button></div> : <svg
        className="lesson-image" data-testid="lesson-image" data-detail={detail ? 'true' : 'false'}
        role="group" aria-label={`${panel.imageCaption}${detail ? '，局部' : ''}`} viewBox={viewBox}
        style={size} preserveAspectRatio="xMidYMid meet">
        <image role="img" aria-label={panel.imageCaption} href={attempt ? `${sourceUrl}&retry=${attempt}` : sourceUrl} width={asset.width} height={asset.height}
          onError={() => setFailed(true)} />
        {emphasized && regions.map((region, index) => <rect key={index} data-testid="lesson-highlight"
          x={region.x * asset.width} y={region.y * asset.height} width={region.width * asset.width} height={region.height * asset.height}
          fill="#f5d47e" fillOpacity="0.12" stroke="#f9d578" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />)}
        {panel.focus && !detail && <g className="lesson-image-hotspot" role="button" tabIndex={0}
          data-testid="lesson-image-hotspot" aria-label={`查看${panel.label}局部`}
          transform={`translate(${(panel.focus.x + panel.focus.width / 2) * asset.width},${(panel.focus.y + panel.focus.height / 2) * asset.height})`}
          onClick={() => setEmphasized(true)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEmphasized(true); } }}>
          <rect x={-22 / imageScale} y={-22 / imageScale} width={44 / imageScale} height={44 / imageScale} fill="transparent" />
          <circle r={12 / imageScale} fill="#fbf5e6" fillOpacity="0.95" stroke="#963e2b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={19 / imageScale} fill="#963e2b" aria-hidden="true">+</text>
        </g>}
      </svg>}
    </div>
    <figcaption>{panel.imageCaption.split('。')[0]}{detail && <span> · 局部</span>}</figcaption>
  </figure>;
}

function ObservationQuestion({ question, value, onAnswer }: { question: LessonQuestion; value?: number; onAnswer: (index: number) => void }) {
  const correct = value === question.correctIndex;
  return <fieldset className="lesson-question" data-testid={`lesson-question-${question.id}`}>
    <legend>{question.prompt}</legend>
    <div className="lesson-question-options">{question.options.map((option, index) => <button type="button" key={option}
      aria-pressed={value === index} data-correct={value === index ? correct : undefined}
      onClick={() => onAnswer(index)}>{option}</button>)}</div>
    {value !== undefined && <p className="lesson-question-feedback" role="status"><strong>{correct ? '回答正确。' : '回答有误。'}</strong>{question.feedback}</p>}
  </fieldset>;
}

function LessonSources({ book, panel, onClose }: { book: LessonBook; panel?: LessonPanel; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const current = panel ? book.sources.filter(source => panel.sourceIds.includes(source.id)) : [];
  const supplementary = book.sources.filter(source => source.url.startsWith('/assets/'));
  const other = book.sources.filter(source => !current.some(item => item.id === source.id) && !supplementary.includes(source));
  const sourceUrl = (url: string) => url.startsWith('/assets/')
    ? new URL(`${import.meta.env.BASE_URL}${url.slice(1)}`, document.baseURI).href : url;
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} className="lesson-source-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="lesson-source-surface" data-testid="lesson-source-surface">
    <header><h2 id={titleId}>教学资料</h2><button type="button" className="lesson-dialog-close" onClick={onClose} aria-label="关闭教学资料">×</button></header>
    <div className="lesson-source-scroll" tabIndex={0}>
      {panel && <section><h3>当前图像</h3><p>{panel.imageCaption}</p>{current.map(source => <p key={source.id}><a href={sourceUrl(source.url)} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</section>}
      <section><h3>参考资料</h3>{other.map(source => <p key={source.id}><a href={sourceUrl(source.url)} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}</section>
      {supplementary.length > 0 && <section><h3>补充图像</h3><div className="lesson-source-figures">{supplementary.map(source => <figure key={source.id}>
        <a href={sourceUrl(source.url)} target="_blank" rel="noreferrer"><img src={sourceUrl(source.url)} alt={source.title} loading="lazy" /></a>
        <figcaption>{source.title}</figcaption></figure>)}</div></section>}
    </div>
    <footer><button type="button" className="button button-secondary" onClick={onClose}>返回教学</button></footer>
    </div>
  </dialog>;
}

/** A seven-screen image-led guide. Lesson interaction never touches game state. */
export function TeachingScreen({ book, catalog, initialUnitId, initialVisitedIds = [], onUnitChange, onComplete, onSkip, onBack }: TeachingScreenProps) {
  const [unitIndex, setUnitIndex] = useState(() => Math.max(0, book.units.findIndex(unit => unit.id === initialUnitId)));
  const [visited, setVisited] = useState(() => new Set(initialVisitedIds));
  const [panelIds, setPanelIds] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [viewerPanel, setViewerPanel] = useState<LessonPanel | null>(null);
  const callbacks = useRef({ onUnitChange });
  const contentRef = useRef<HTMLDivElement>(null);
  callbacks.current = { onUnitChange };
  const unit = book.units[Math.min(unitIndex, book.units.length - 1)];
  const panel = unit.panels.find(item => item.id === panelIds[unit.id]) ?? unit.panels[0];
  const isLast = unitIndex === book.units.length - 1;
  const reviewQuestions = book.units.find(item => item.kind === 'review')?.questions ?? [];
  const reviewId = book.units.find(item => item.kind === 'review')?.id ?? 'review';
  const allAnswered = reviewQuestions.every(question => answers[`${reviewId}:${question.id}`] !== undefined);
  const mayComplete = allAnswered;

  useEffect(() => {
    setVisited(previous => previous.has(unit.id) ? previous : new Set([...previous, unit.id]));
    callbacks.current.onUnitChange?.(unit.id);
    contentRef.current?.scrollTo({ top: 0 });
  }, [book.id, unit.id]);

  function selectUnit(index: number) {
    setSourcesOpen(false);
    setViewerPanel(null);
    setUnitIndex(index);
  }

  function answerQuestion(question: LessonQuestion, index: number) {
    setAnswers(previous => ({ ...previous, [`${unit.id}:${question.id}`]: index }));
  }

  return <div className="page page-teaching" data-testid="teaching-screen" data-unit-id={unit.id}>
    <section className="lesson-panel" data-testid="lesson-panel" aria-label={`${book.title}文化导览`}>
    <div className="lesson-content-surface" data-testid="lesson-content-surface">
    <header className="lesson-heading"><button type="button" className="lesson-back" onClick={onBack} aria-label="返回主题首页">
      <img src={getAssetUrl(catalog, 'icon-back')} alt="" /><span>返回</span></button>
      <div className="lesson-title"><p className="lesson-guide-label">文化导览<span> · {book.title}</span></p><h1>{unit.title}</h1></div><div className="lesson-heading-actions">
        <button type="button" className="lesson-tool" onClick={event => { event.currentTarget.focus({ preventScroll: true }); setSourcesOpen(true); }}>资料</button>
        <button type="button" className="lesson-skip" onClick={onSkip}>直接玩游戏</button>
      </div></header>
    <nav className="lesson-chapters" aria-label="教学章节">{book.units.map((item, index) => <button type="button" key={item.id}
      aria-label={`第${index + 1}页：${item.title}`} aria-current={index === unitIndex ? 'step' : undefined}
      data-visited={visited.has(item.id) || item.id === unit.id} onClick={() => selectUnit(index)}>
      <span className="lesson-chapter-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="lesson-chapter-name">{item.tabLabel}</span>
    </button>)}</nav>
    <div className={`lesson-body ${unit.kind === 'review' ? 'is-review' : ''}`}>
      {panel && <LessonFigure key={`${unit.id}:${panel.id}`} panel={panel} catalog={catalog} onEnlarge={() => setViewerPanel(panel)} />}
      <section className="lesson-explanation" aria-label="本页观察与互动">
        {unit.panels.length > 1 && <div className={`lesson-panel-choices ${unit.kind === 'colors' ? 'has-swatches' : ''}`} role="group" aria-label="选择观察内容">
          {unit.panels.map(item => <button type="button" key={item.id} aria-pressed={item.id === panel?.id}
            onClick={() => { setPanelIds(previous => ({ ...previous, [unit.id]: item.id })); contentRef.current?.scrollTo({ top: 0 }); }}>
            {item.swatch && <span className="lesson-swatch" aria-hidden="true" style={{ '--swatch': item.swatch } as CSSProperties} />}{item.label}
          </button>)}
        </div>}
        <div className="lesson-copy" ref={contentRef} tabIndex={0}>
          {unit.kind !== 'review' ? <>
            {panel && <h2>{panel.title}</h2>}
            {panel && <p>{panel.body}</p>}
            {unit.question && <ObservationQuestion question={unit.question} value={answers[`${unit.id}:${unit.question.id}`]}
              onAnswer={index => answerQuestion(unit.question!, index)} />}
          </> : <>
            <div className="lesson-review-questions">{(unit.questions ?? []).map(question => <ObservationQuestion key={question.id} question={question}
              value={answers[`${unit.id}:${question.id}`]} onAnswer={index => answerQuestion(question, index)} />)}</div>
          </>}
        </div>
      </section>
    </div>
    <footer className="lesson-navigation">
      <button type="button" className="button button-secondary" disabled={unitIndex === 0} onClick={() => selectUnit(unitIndex - 1)}>上一页</button>
      <span className="lesson-page-number" aria-label={`教学第 ${unitIndex + 1} 页，共 ${book.units.length} 页`}>{unitIndex + 1} / {book.units.length}</span>
      {isLast ? <button type="button" className="button button-primary" onClick={onComplete} disabled={!mayComplete}
        title={!mayComplete ? '作答六道题即可完成小考，也可随时直接玩游戏。' : undefined}>完成小考</button> : <button type="button" className="button button-primary" onClick={() => selectUnit(unitIndex + 1)}>下一页</button>}
    </footer>
    </div>
    </section>
    {sourcesOpen && <LessonSources book={book} panel={panel} onClose={() => setSourcesOpen(false)} />}
    {viewerPanel && <LessonImageViewer src={getAssetUrl(catalog, viewerPanel.imageAssetId)}
      imageWidth={catalog.assets.find(asset => asset.id === viewerPanel.imageAssetId)!.width}
      imageHeight={catalog.assets.find(asset => asset.id === viewerPanel.imageAssetId)!.height}
      title={viewerPanel.title} caption={viewerPanel.imageCaption} onClose={() => setViewerPanel(null)} />}
  </div>;
}
