import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GALLERY_LABELS, type GalleryInteraction } from '../content/world/first-gallery-v001';
import { galleryNarratedLine, type FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import { completeGalleryCaisson, isFirstGalleryUnlocked, loadFirstGallery, markGalleryColoringFeedbackSeen, selectGalleryArtwork, subscribeFirstGallery, type FirstGalleryArtwork, type FirstGalleryMuralPart } from '../services/first-gallery';
import { getAssetUrl } from '../content';
import { renderColoringArtwork } from '../games/coloring/render';
import { ColoringResult } from './ColoringResult';
import { FirstGalleryCaisson } from './FirstGalleryCaisson';
import type { ContentCatalog } from '../types';
import type { WorldCheckpoint, WorldRuntime, WorldSnapshot } from '../world/types';
import '../styles/first-gallery.css';

export interface GalleryRequest { id: GalleryInteraction; object?: FirstGalleryMuralPart; serial: number }
interface Props {
  runtime: WorldRuntime | null; snapshot: WorldSnapshot; catalog: ContentCatalog; ready: boolean; blocked: boolean; reducedMotion: boolean;
  request: GalleryRequest | null;
  onInteract(id: GalleryInteraction): void;
  onColor(checkpoint: WorldCheckpoint, artworkId?: string): boolean;
  onOccupied(value: boolean): void;
  portalPending?: boolean;
  onPortalPresented?(): void;
  onPortalEnter(): void;
}
function GalleryDialog({ title, children, blocked, onClose, atPortal = false, dismissOnTap = false, testId }: {
  title: string; children: ReactNode; blocked: boolean; onClose(): void; atPortal?: boolean; dismissOnTap?: boolean; testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (blocked) ref.current?.close(); else if (!ref.current?.open) ref.current?.showModal(); }, [blocked]);
  return <dialog ref={ref} className={`first-gallery-dialog${atPortal ? ' gallery-portal-dialog' : ''}${dismissOnTap ? ' gallery-tap-dismiss' : ''}`}
    aria-label={title} data-testid={testId} onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={dismissOnTap ? onClose : undefined} onKeyDown={dismissOnTap ? event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClose(); }
    } : undefined}>
    <header><h2 className={dismissOnTap ? 'gallery-text-cue' : undefined}>{title}</h2>{!atPortal && <button aria-label="关闭，继续探索" onClick={onClose}>×</button>}</header>{children}
  </dialog>;
}

export function GalleryUnlockNotice({ title, children, blocked, onClose, testId, dismissOnTap = false }: {
  title: string; children?: ReactNode; blocked: boolean; onClose(): void; testId?: string; dismissOnTap?: boolean;
}) {
  return <GalleryDialog title={title} blocked={blocked} atPortal dismissOnTap={dismissOnTap} onClose={onClose} testId={testId}>
    {children}
    {!dismissOnTap && <div className="gallery-actions">
      <button type="button" className="gallery-primary" onClick={onClose}>继续探索</button>
    </div>}
  </GalleryDialog>;
}

function ArtworkThumb({ record, catalog, onChoose }: { record: FirstGalleryArtwork; catalog: ContentCatalog; onChoose(): void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const level = catalog.levels.find(item => item.id === record.levelId && item.gameType === 'coloring');
  const compatible = level?.gameType === 'coloring' && level.artworkVersion === record.artworkVersion;
  useEffect(() => {
    if (!compatible || level?.gameType !== 'coloring') return;
    const abort = new AbortController();
    renderColoringArtwork({ lineImageUrl: getAssetUrl(catalog, level.lineAssetId), regionMapImageUrl: getAssetUrl(catalog, level.regionMapAssetId), colors: record.colors, materials: record.materials, signal: abort.signal }).then(canvas => {
      if (!abort.signal.aborted && ref.current) { const ctx = ref.current.getContext('2d')!; ctx.drawImage(canvas, 0, 0, ref.current.width, ref.current.height); }
    }).catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [record, compatible, level, catalog]);
  return <button className="gallery-artwork" onClick={onChoose} disabled={!compatible || error}>
    <canvas ref={ref} width={120} height={170} aria-label={level?.title ?? '收藏画作'} /><strong>{level?.title ?? record.levelId}</strong>
    <small>{!compatible ? '线稿版本已更新，原作已保留' : error ? '预览暂未加载' : new Date(record.submittedAt).toLocaleDateString('zh-CN')}</small>
  </button>;
}

export function FirstGalleryOverlay(props: Props) {
  const { runtime, snapshot, catalog, ready, blocked, reducedMotion } = props;
  const [loaded, setLoaded] = useState(loadFirstGallery);
  const data = loaded.data, unlocked = isFirstGalleryUnlocked(data);
  const [panel, setPanel] = useState<'easel' | 'library' | 'artwork' | 'caisson' | 'scroll' | null>(null);
  const [caissonOrigin, setCaissonOrigin] = useState<readonly { x: number; y: number }[] | null>(null);
  const [selected, setSelected] = useState<FirstGalleryArtwork | null>(null);
  const [notice, setNotice] = useState('');
  const [libraryLimit, setLibraryLimit] = useState(6);
  const [displayReady, setDisplayReady] = useState(false);
  const lastRequest = useRef(-1), feedbackSeen = useRef(false), portalPresented = useRef(false);
  const portalNavigation = useRef(0);
  const nearby = snapshot.gallery?.nearby;
  const easelReady = nearby === 'easel' && snapshot.gallery?.easelReady;
  const mural = snapshot.gallery?.mural;
  const muralActive = mural?.active === true;
  const muralInvited = mural?.phase === 'invite';
  const muralSummary = mural?.phase === 'summary';
  const muralWide = muralSummary || mural?.phase === 'education';
  const muralVisible = muralInvited || muralActive;
  const muralRestored = data.muralParts.length === 3;
  const muralPreparation = nearby === 'mural' ? snapshot.gallery?.muralPreparation : undefined;
  const portal = snapshot.gallery?.portal;
  const portalWalking = portal === 'walking';
  const portalPlaying = portalWalking || portal === 'turning' || portal === 'revealing' || portal === 'question';
  const portalArrived = portal === 'arrived';
  const portalNotice = portalArrived || portal === 'skipped';
  const occupied = panel !== null || portalNotice;
  const caissonAssist = snapshot.gallery?.caissonAssist;
  const caissonView = panel === 'caisson' || caissonAssist;
  const caissonReady = nearby === 'caisson' && snapshot.gallery?.caissonOffer;
  const cue = snapshot.gallery?.line;
  useEffect(() => subscribeFirstGallery(() => setLoaded(loadFirstGallery())), []);
  useEffect(() => () => cancelAnimationFrame(portalNavigation.current), []);
  useEffect(() => { props.onOccupied(occupied || muralActive || portalPlaying); }, [occupied, muralActive, portalPlaying, props.onOccupied]);
  useEffect(() => { runtime?.setGalleryInteractionBlocked?.(occupied); }, [occupied, runtime]);
  useEffect(() => () => { runtime?.setGalleryInteractionBlocked?.(false); }, [runtime]);
  useEffect(() => {
    if (!runtime || !ready || document.getElementById('root')?.dataset.caissonOnly === 'v001') return;
    setDisplayReady(false);
    const record = data.displayedArtworkId ? data.artworks[data.displayedArtworkId] : null;
    const level = catalog.levels.find(item => item.id === (record?.levelId ?? 'coloring-feitian-lotus'));
    if (level?.gameType !== 'coloring' || (record && record.artworkVersion !== level.artworkVersion)) { setNotice('这幅收藏的线稿版本已更新，原画仍保留在作品库。'); return; }
    const abort = new AbortController();
    renderColoringArtwork({ lineImageUrl: getAssetUrl(catalog, level.lineAssetId), regionMapImageUrl: getAssetUrl(catalog, level.regionMapAssetId), colors: record?.colors ?? {}, materials: record?.materials ?? {}, signal: abort.signal }).then(canvas => {
      if (abort.signal.aborted) return;
      runtime.setGalleryArtwork?.(canvas);
      setDisplayReady(true);
    }).catch(() => { if (!abort.signal.aborted) setNotice('画架图像暂未加载。收藏仍在，请重新进入此画架重试。'); });
    return () => abort.abort();
  }, [ready, runtime, data.displayedArtworkId, catalog]);
  useEffect(() => {
    if (!displayReady || blocked || occupied || muralVisible || portalPlaying || nearby !== 'easel' || snapshot.moving || !data.coloringCompleted || data.firstSuccessSeen || feedbackSeen.current) return;
    feedbackSeen.current = true;
    runtime?.showGalleryCue?.([
      galleryNarratedLine('easel-hung', 'easel'), galleryNarratedLine('easel-color-note', 'easel'),
    ], true);
    const result = markGalleryColoringFeedbackSeen(); if (!result.ok) setNotice(result.message);
  }, [displayReady, blocked, occupied, muralVisible, portalPlaying, nearby, snapshot.moving, data.coloringCompleted, data.firstSuccessSeen, runtime]);
  useEffect(() => {
    if (!props.portalPending || !ready || blocked || occupied || muralVisible || !snapshot.gallery?.portalReady) return;
    const awaitingArtwork = nearby === 'easel' && !data.firstSuccessSeen && !feedbackSeen.current && !notice;
    if (!awaitingArtwork) runtime?.startGalleryPortal?.();
  }, [props.portalPending, ready, blocked, occupied, muralVisible, snapshot.gallery?.portalReady, nearby, data.firstSuccessSeen, displayReady, notice, runtime]);
  useEffect(() => {
    if (!ready || blocked || (portal !== 'arrived' && portal !== 'skipped') || portalPresented.current) return;
    portalPresented.current = true;
    props.onPortalPresented?.();
  }, [ready, blocked, portal, props.onPortalPresented]);
  function close() {
    setPanel(null);
    setCaissonOrigin(null);
    setNotice('');
    if (caissonView || caissonReady) runtime?.observeGalleryCaisson?.(false);
  }
  function beginColoring(artworkId?: string) {
    if (props.onColor(runtime?.snapshot().checkpoint ?? snapshot.checkpoint, artworkId)) close();
  }
  function magnifyCaisson() {
    const quad = runtime?.galleryCaissonQuad?.();
    if (!quad) return;
    setCaissonOrigin(quad);
    setPanel('caisson');
  }
  function playCaissonNarration(id: FirstGalleryNarrationId, onFinish: () => void) {
    if (runtime?.playGalleryCaissonNarration) runtime.playGalleryCaissonNarration(id, onFinish);
    else onFinish();
  }
  function skipCue() { return runtime?.skipGalleryCue?.() ?? false; }
  useEffect(() => {
    const request = props.request;
    if (!request || request.serial === lastRequest.current || blocked) return;
    lastRequest.current = request.serial;
    if (muralVisible || portalPlaying || portalNotice || (request.id === 'easel' && !easelReady)) return;
    setNotice('');
    if (request.id === 'easel') setPanel('easel');
    else if (request.id === 'mural') { if (muralRestored) runtime?.requestGalleryMural?.(); }
    else if (request.id === 'caisson') {
      if (caissonReady) magnifyCaisson();
      else runtime?.observeGalleryCaisson?.(true);
    } else if (unlocked) {
      cancelAnimationFrame(portalNavigation.current);
      // Finish the canvas tap before mounting any buttons under the finger.
      portalNavigation.current = requestAnimationFrame(() => {
        portalNavigation.current = requestAnimationFrame(props.onPortalEnter);
      });
    }
    else setPanel('scroll');
  }, [props.request, blocked, muralVisible, muralRestored, portalPlaying, portalNotice, unlocked, caissonReady, easelReady, props.onPortalEnter, runtime]);
  useEffect(() => {
    if (blocked || !caissonView) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [caissonView, blocked, runtime]);
  const muralText = mural?.text;
  const chooseArtwork = selected && catalog.levels.find(item => item.id === selected.levelId);
  return <div className="first-gallery-overlay" data-testid="first-gallery-overlay" data-caisson-view={caissonView || undefined}>
    {!muralVisible && !portalPlaying && !occupied && !blocked && cue && <aside className={`gallery-subtitle${cue.narration === 'easel-color-note' ? ' gallery-subtitle-wide' : ''}${cue.narration ? '' : ' gallery-text-cue'}`} role="status" onClick={skipCue}><p>{cue.text}</p></aside>}
    {!muralVisible && !occupied && !blocked && snapshot.gallery?.gate && <p className="gallery-gate gallery-text-cue" role="status">{snapshot.gallery.gate}</p>}
    {!muralVisible && !portalPlaying && !occupied && ready && !blocked && !snapshot.gallery?.cue && nearby && !muralPreparation && (nearby !== 'mural' || muralRestored) &&
      (nearby !== 'easel' || easelReady) &&
      (nearby !== 'caisson' || (!caissonAssist && !caissonReady)) &&
      <button className="gallery-interact gallery-text-cue" data-testid="gallery-interact" onClick={() => props.onInteract(nearby)}>{nearby === 'caisson' ? '抬头看看' : nearby === 'easel' && data.displayedArtworkId ? '欣赏或更换画作' : nearby === 'mural' ? '重看壁画' : nearby === 'scroll' && unlocked ? '进入游戏世界' : GALLERY_LABELS[nearby]}</button>}
    {!blocked && !occupied && muralPreparation && <p className="gallery-gate gallery-text-cue" role="status">{muralPreparation === 'loading' ? '壁画正在准备…' : '壁画暂时未能载入，可以继续探索。'}</p>}
    {portal === 'question' && !blocked && <aside className="gallery-mural-hud gallery-portal-question" data-testid="gallery-portal-question"><p className="gallery-skippable gallery-text-cue" role="status" onClick={skipCue}>发生了什么？</p></aside>}
    {portalWalking && !blocked && <aside className="gallery-mural-hud" data-testid="gallery-portal-guide">
      <button onClick={() => runtime?.skipGalleryPortal?.()}>跳过带路</button>
    </aside>}
    {portalNotice && <GalleryUnlockNotice title="第一馆通关！游戏世界已开启。" blocked={blocked} dismissOnTap testId="gallery-portal-notice" onClose={() => runtime?.dismissGalleryPortal?.()}>
      {portal === 'skipped' && <p className="gallery-text-cue">院子西侧的画卷已亮起，走到桌前点击画卷即可进入游戏世界。</p>}
    </GalleryUnlockNotice>}
    {muralInvited && !blocked && !occupied && <section className="gallery-mural-hud gallery-mural-invite" data-testid="gallery-mural-invite" aria-label="壁画邀请">
      <p className="gallery-text-cue" role="status">{muralText ?? (muralRestored ? '要再看看这面壁画吗？' : '前面有一面壁画，要过去看看吗？')}</p>
      <div className="gallery-mural-actions">
        <button className="gallery-primary" onClick={() => runtime?.startGalleryMural?.()}>{muralRestored ? '再看一遍' : '玩壁画'}</button>
        <button onClick={() => runtime?.declineGalleryMural?.()}>自由探索</button>
      </div>
    </section>}
    {!muralInvited && muralActive && !blocked && !occupied && <aside className={`gallery-mural-hud${muralWide ? ' gallery-mural-summary' : ''}`} data-testid="gallery-mural-guide" data-phase={mural?.phase} aria-label="壁画带看">
      {muralText && <p role="status" className={mural?.narration ? 'gallery-skippable' : muralWide ? undefined : 'gallery-text-cue'} onClick={mural?.narration ? skipCue : undefined}>{muralText}</p>}
    </aside>}
    {loaded.warning && !muralActive && <p className="gallery-warning gallery-text-cue" role="status">{loaded.warning}</p>}
    {notice && !muralVisible && !occupied && <p className="gallery-warning gallery-text-cue" role="alert">{notice}<button onClick={() => setNotice('')}>知道了</button></p>}
    {panel === 'caisson' && caissonOrigin && <FirstGalleryCaisson origin={caissonOrigin} completed={data.caissonCompleted}
      reducedMotion={reducedMotion} blocked={blocked} onClose={close} onComplete={() => completeGalleryCaisson().ok}
      onNarrate={playCaissonNarration} onSkipNarration={skipCue} />}
    {!panel && (caissonReady || caissonAssist) && !blocked && <section className="gallery-link-actions" role="group" aria-label="藻井寻秘">
      {caissonReady && <button className="gallery-primary" onClick={magnifyCaisson}>放大看看</button>}
      <button onClick={close}>继续漫游</button>
    </section>}
    {panel && panel !== 'caisson' && <GalleryDialog title={panel === 'scroll' ? '纹样游戏画卷' : panel === 'library' ? '我的填色作品库' : panel === 'artwork' ? '欣赏画作' : '画架设色'} blocked={blocked} onClose={close}>
      {panel === 'easel' && <><p className="gallery-text-cue">{data.displayedArtworkId ? '这幅画是你的创作。可以静静欣赏，也可以换一幅。' : '画稿和颜料都准备好了，试着给它添上颜色吧。'}</p><div className="gallery-actions">
        {data.displayedArtworkId && <button onClick={() => { setSelected(data.artworks[data.displayedArtworkId!]); setPanel('artwork'); }}>欣赏当前作品</button>}
        <button onClick={() => setPanel('library')}>从作品库更换画作</button>
        <button onClick={() => beginColoring()}> {data.displayedArtworkId ? '再画一幅' : '开始设色'} </button>
      </div></>}
      {panel === 'library' && <>{Object.keys(data.artworks).length ? <div className="gallery-artworks">{Object.values(data.artworks).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, libraryLimit).map(record => <ArtworkThumb key={record.artworkId} record={record} catalog={catalog} onChoose={() => { setSelected(record); setPanel('artwork'); }} />)}</div> : <p>还没有收藏。完成一幅填色作品后，它就会出现在这里。</p>}{Object.keys(data.artworks).length > libraryLimit && <button onClick={() => setLibraryLimit(limit => limit + 6)}>查看更多作品</button>}</>}
      {panel === 'artwork' && selected && chooseArtwork?.gameType === 'coloring' && <><ColoringResult catalog={catalog} level={chooseArtwork} colors={selected.colors} materials={selected.materials} /><button className="gallery-primary" onClick={() => { const result = selectGalleryArtwork(selected.artworkId); if (!result.ok) setNotice(result.message); else { close(); runtime?.showGalleryCue?.([{ text: '这幅画挂好了。', target: 'easel' }]); } }}>挂到画架上</button>{selected.levelId === 'coloring-feitian-lotus' && <button onClick={() => beginColoring(selected.artworkId)}>再配一版</button>}</>}
      {panel === 'scroll' && <p className="gallery-text-cue">完成馆内任务，会有惊喜发生！</p>}
      {notice && <p role="alert" className="gallery-notice gallery-text-cue">{notice}</p>}
    </GalleryDialog>}
  </div>;
}
