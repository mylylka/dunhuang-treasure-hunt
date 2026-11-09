import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { MOGAO_EXHIBIT, MOGAO_EXHIBIT_SCROLL } from '../content/world/mogao-exhibit-v001';
import { WORLD_REWARDS, type WorldRewardId } from '../content/world/mogao-rewards-v001';
import { MOGAO_WALL_PAPER_FLOORS, type MogaoPaperStory } from '../content/world/mogao-wall-paper-v001';
import { MogaoExhibitDialog } from './MogaoExhibitOverlay';
import { FirstGalleryFolioContent } from './FirstGalleryFolioContent';
import { MusicGalleryPaperContent } from './MusicGalleryPaperContent';

interface Props {
  award: WorldRewardId | null;
  earned: readonly WorldRewardId[];
  view: 'guide' | WorldRewardId | null;
  blocked: boolean;
  reducedMotion: boolean;
  onAcceptAward(id: WorldRewardId): void;
  onDismissAward(id: WorldRewardId): void;
  onOpenReward(id: WorldRewardId): void;
  onCloseView(): void;
}

interface DialogProps { blocked: boolean; onClose(): void }

function RewardMark() {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="mogao-reward-mark mogao-reward-mark-fallback" aria-hidden="true">卷轴</span>
    : <img className="mogao-reward-mark" src={worldAssetUrl(MOGAO_EXHIBIT_SCROLL)} alt="" decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

function RewardAward({ id, blocked, onClose, onRead }: DialogProps & {
  id: WorldRewardId; onRead(): void;
}) {
  const titleId = useId();
  const pressed = useRef(false);
  const reward = WORLD_REWARDS[id];
  return <MogaoExhibitDialog kind="award" rewardId={id} titleId={titleId} blocked={blocked} onClose={onClose}>
    <div className="mogao-award" onPointerDownCapture={() => { pressed.current = true; }}
      onPointerCancelCapture={() => { pressed.current = false; }} onClickCapture={event => {
        // The interaction which opened the award can still synthesize a click.
        if (event.detail > 0 && !pressed.current) { event.preventDefault(); event.stopPropagation(); }
        pressed.current = false;
      }}>
      <div className="mogao-award-copy" role="status">
        <p>{reward.opened}</p>
        <h2 id={titleId}>获得《{reward.title}》</h2>
      </div>
      <button type="button" className="mogao-award-paper" aria-label={`展开《${reward.title}》`} data-testid="mogao-reward-paper" onClick={onRead}>
        <span className="mogao-award-light" aria-hidden="true" />
        <RewardMark />
        <span className="mogao-award-paper-label">点击展开</span>
      </button>
      <div className="mogao-award-actions">
        <button type="button" className="mogao-award-dismiss" data-testid="mogao-reward-dismiss" onClick={onClose}>收下</button>
      </div>
    </div>
  </MogaoExhibitDialog>;
}

function RewardGuide({ earned, blocked, onClose, onOpen }: DialogProps & {
  earned: readonly WorldRewardId[]; onOpen(id: WorldRewardId): void;
}) {
  const titleId = useId();
  return <MogaoExhibitDialog kind="guide" titleId={titleId} blocked={blocked} onClose={onClose}>
    {close => <section className="mogao-reward-guide-paper">
      {close}
      <header><p>敦煌寻宝记</p><h2 id={titleId}>我的图鉴</h2></header>
      <div className="mogao-reward-guide-body">
        {earned.length === 0 ? <p className="mogao-reward-guide-empty">完成展厅观赏后，获得的手卷会收录在这里。</p> : <ul>
          {earned.map(id => <li key={id}>
            <button type="button" className="mogao-reward-card" data-testid={`mogao-reward-card-${id}`} onClick={() => onOpen(id)}>
              <RewardMark />
              <span className="mogao-reward-card-copy"><small>{WORLD_REWARDS[id].place}</small>
                <strong>{WORLD_REWARDS[id].title}</strong><span>{WORLD_REWARDS[id].summary}</span></span>
              <span className="mogao-reward-card-action" aria-hidden="true">阅读 ›</span>
            </button>
          </li>)}
        </ul>}
      </div>
    </section>}
  </MogaoExhibitDialog>;
}

function usePaperImages(blocked: boolean) {
  const body = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const root = body.current;
    if (!root || blocked) return;
    const images = [...root.querySelectorAll<HTMLElement>('[data-exhibit-thumb]')];
    const request = (elements: HTMLElement[]) => {
      if (!elements.length) return;
      setRequested(previous => {
        const next = new Set(previous);
        for (const element of elements) {
          if (element.dataset.exhibitThumb) next.add(element.dataset.exhibitThumb);
        }
        return next.size === previous.size ? previous : next;
      });
    };
    if (typeof IntersectionObserver === 'undefined') {
      const check = () => {
        const bounds = root.getBoundingClientRect();
        request(images.filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.top < bounds.bottom + 90 && rect.bottom > bounds.top - 90;
        }));
      };
      check();
      root.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check);
      return () => { root.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
    }
    const observer = new IntersectionObserver(entries => {
      const near = entries.filter(entry => entry.isIntersecting).map(entry => entry.target as HTMLElement);
      near.forEach(element => observer.unobserve(element));
      request(near);
    }, { root, rootMargin: '90px 0px' });
    images.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [blocked]);
  return { body, requested };
}

const PrintingFolio = createContext(false);
const NO_REQUESTED_IMAGES: ReadonlySet<string> = new Set();

function PaperImage({ id, src, label, requested, ratio, placeholder = label, unavailable = '图像暂未载入' }: {
  id: string; src: string | null; label: string; requested: ReadonlySet<string>; ratio?: number;
  placeholder?: string; unavailable?: string;
}) {
  const [failed, setFailed] = useState(false);
  const printing = useContext(PrintingFolio);
  return <div className={`mogao-scroll-thumbnail${ratio ? ' mogao-scroll-full-picture' : ''}`}
    data-exhibit-thumb={src ? id : undefined} style={ratio ? { aspectRatio: ratio } : undefined}>
    {src && (printing || requested.has(id)) && !failed
      ? <img src={worldAssetUrl(src)} alt={label} decoding="async" fetchPriority="low" onError={() => setFailed(true)} />
      : <span>{src && !failed ? placeholder : unavailable}</span>}
  </div>;
}

function ExhibitPaperContent({ requested }: { requested: ReadonlySet<string> }) {
  return <>
    <div className="mogao-scroll-introduction">
      <h3>{MOGAO_EXHIBIT.title}</h3>
      <p>{MOGAO_EXHIBIT.entrance}</p>
    </div>
    {MOGAO_EXHIBIT.walls.map(wall => <section key={wall.id} className="mogao-scroll-chapter" aria-label={wall.title}>
      <header>
        <p className="mogao-scroll-era">{wall.id} · {wall.years}</p>
        <h3>{wall.title} <small>{wall.subtitle}</small></h3>
        <p>{wall.intro}</p>
      </header>
      <ol>
        {MOGAO_EXHIBIT.items.filter(item => item.wall === wall.id).map(item => <li key={item.id} data-exhibit-id={item.id}>
          <PaperImage id={item.id} src={item.thumb} label={item.title} requested={requested} placeholder={item.id} unavailable="图像待补" />
          <div className="mogao-scroll-exhibit-copy">
            <h4>{item.title}</h4>
            <p className="mogao-exhibit-meta">{item.period} · {item.cave} · {item.type}{item.referenceOnly && ' · 参考图'}</p>
            <p>{item.voice}</p>
            {item.image && item.note && <p className="mogao-scroll-note">{item.note}</p>}
            <a href={item.page} target="_blank" rel="noreferrer" aria-label={`${item.title}的出处`}>查看出处</a>
          </div>
        </li>)}
      </ol>
    </section>)}
  </>;
}

function PaperStoryChapter({ story, floor, requested }: {
  story: MogaoPaperStory;
  floor: string;
  requested: ReadonlySet<string>;
}) {
  return <section className="mogao-scroll-chapter" aria-label={story.title}>
    <header>
      <p className="mogao-scroll-era">{floor} · {story.source}</p>
      <h4>{story.title}</h4>
      {story.overview && <p>{story.overview}</p>}
    </header>
    <PaperImage id={`${story.id}-full`} src={story.full.path} label={`${story.title}全图`}
      ratio={story.full.width / story.full.height} requested={requested} />
    <ol>
      {story.segments.map((segment, index) => <li key={segment.id} data-story-segment={segment.id}>
        <div className="mogao-scroll-scene-pictures">
          {segment.images.map(image => <PaperImage key={image.id} id={`${story.id}-${image.id}`}
            src={image.path} label={image.alt} requested={requested} />)}
        </div>
        <div className="mogao-scroll-exhibit-copy">
          <h5>{index + 1} · {segment.title}</h5>
          {segment.text.split('\n').filter(Boolean).map((paragraph, line) => <p key={line}>{paragraph}</p>)}
        </div>
      </li>)}
    </ol>
    {story.ending && <div className="mogao-scroll-summary"><h5>回看全图</h5><p>{story.ending}</p></div>}
  </section>;
}

function HallAPaperContent({ requested }: { requested: ReadonlySet<string> }) {
  return <>
    <div className="mogao-scroll-introduction">
      <p>同一幅敦煌壁画里可以画出发生在不同时间的情节。先看整幅壁画，再沿着人物、建筑和山林寻找各段故事的线索。</p>
    </div>
    {MOGAO_WALL_PAPER_FLOORS.map(({ label, introduction, stories }) => <section key={label} className="mogao-scroll-floor" aria-label={label}>
      <header>
        <h3>{label}</h3>
        {introduction && <p>{introduction}</p>}
      </header>
      {stories.map(story => <PaperStoryChapter key={story.id} story={story} floor={label} requested={requested} />)}
    </section>)}
  </>;
}

function RewardPaperContent({ id, requested }: { id: WorldRewardId; requested: ReadonlySet<string> }) {
  switch (id) {
    case 'first-gallery': return <FirstGalleryFolioContent requested={requested} PaperImage={PaperImage} />;
    case 'music-gallery': return <MusicGalleryPaperContent requested={requested} PaperImage={PaperImage} />;
    case 'hall-a': return <HallAPaperContent requested={requested} />;
    case 'hall-b': return <ExhibitPaperContent requested={requested} />;
  }
}

function RewardPaperHeading({ id, titleId }: { id: WorldRewardId; titleId?: string }) {
  return <div>
    <p>{WORLD_REWARDS[id].place}</p>
    <h2 id={titleId}>{WORLD_REWARDS[id].title}</h2>
  </div>;
}

/** Build-time export uses the same illustrated content without the in-game lazy image window. */
export function FolioPrintPage({ id }: { id: WorldRewardId }) {
  return <PrintingFolio.Provider value={true}>
    <article className="mogao-scroll-paper" data-folio={id}>
      <header className="mogao-scroll-header"><RewardPaperHeading id={id} /></header>
      <main className="mogao-scroll-body"><RewardPaperContent id={id} requested={NO_REQUESTED_IMAGES} /></main>
    </article>
  </PrintingFolio.Provider>;
}

const READER_DETAILS = {
  'first-gallery': ['first-scroll', '观艺卷', 'first-gallery-scroll-body'],
  'music-gallery': ['music-scroll', '见闻卷', 'music-gallery-scroll-body'],
  'hall-a': ['hall-a-scroll', '观壁笺', 'mogao-hall-a-scroll-body'],
  'hall-b': ['scroll', '观展手卷', 'mogao-exhibit-scroll-body'],
} as const satisfies Record<WorldRewardId, readonly [string, string, string]>;

function RewardReader({ id, blocked, onClose }: DialogProps & { id: WorldRewardId }) {
  const titleId = useId();
  const { body, requested } = usePaperImages(blocked);
  const [kind, name, testId] = READER_DETAILS[id];
  return <MogaoExhibitDialog kind={kind} rewardId={id} titleId={titleId} blocked={blocked} onClose={onClose}>
    <div className="mogao-scroll-paper">
      <header className="mogao-scroll-header has-folio-download">
        <a className="mogao-folio-download" data-testid="mogao-folio-download"
          href={worldAssetUrl(`folio-downloads/v001/${id}.pdf`)} download={`${WORLD_REWARDS[id].title}.pdf`}>下载 PDF</a>
        <RewardPaperHeading id={id} titleId={titleId} />
      </header>
      <div className="mogao-scroll-body" ref={body} tabIndex={0}
        aria-label={`可滚动的${name}正文`} data-testid={testId}>
        <RewardPaperContent id={id} requested={requested} />
      </div>
    </div>
  </MogaoExhibitDialog>;
}

export function MogaoRewardOverlay({ award, earned, view, blocked, reducedMotion, onAcceptAward, onDismissAward, onOpenReward, onCloseView }: Props) {
  if (!award && !view) return null;
  return <div className="mogao-exhibit-overlay mogao-reward-overlay" data-modal={!blocked || undefined} data-reduced-motion={reducedMotion || undefined}>
    {award ? <RewardAward key={award} id={award} blocked={blocked} onRead={() => onAcceptAward(award)} onClose={() => onDismissAward(award)} />
      : view === 'guide' ? <RewardGuide earned={earned} blocked={blocked} onOpen={onOpenReward} onClose={onCloseView} />
      : view && <RewardReader key={view} id={view} blocked={blocked} onClose={onCloseView} />}
  </div>;
}
