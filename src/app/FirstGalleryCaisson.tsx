import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { worldAssetUrl } from '../content/world/assets';
import { firstGalleryNarration, type FirstGalleryNarrationId } from '../content/world/first-gallery-narration';
import { soundPlayer } from '../services/sound';
import {
  CAISSON_ART, CAISSON_ART_VIEW, CAISSON_DETAIL_VIEW, caissonHotspot, caissonTargets,
  createCaissonState, hitCaissonTarget, selectCaissonTarget, type CaissonSelection,
} from '../world/first-gallery-puzzles';
import { CaissonGoldMarks } from './CaissonGoldMarks';
import '../styles/first-gallery-caisson.css';

type ScreenPoint = { x: number; y: number };
const detail = CAISSON_DETAIL_VIEW;
const flightSeconds = .8;
const settleSeconds = .54;
const fullView = CAISSON_ART_VIEW.join(' ');
const detailView = detail.join(' ');
const smooth = (t: number) => { const p = Math.min(1, Math.max(0, t)); return p * p * (3 - 2 * p); };

/** Map the original image rectangle to the four projected corners, including perspective. */
function quadTransform([tl, tr, br, bl]: readonly ScreenPoint[], side: number) {
  const ax = tr.x - br.x, bx = bl.x - br.x, cx = tl.x - tr.x + br.x - bl.x;
  const ay = tr.y - br.y, by = bl.y - br.y, cy = tl.y - tr.y + br.y - bl.y;
  const det = ax * by - bx * ay;
  if (Math.abs(det) < .001) return `translate(${tl.x}px,${tl.y}px)`;
  const u = (cx * by - bx * cy) / det, v = (ax * cy - cx * ay) / det;
  return `matrix3d(${(tr.x - tl.x + u * tr.x) / side},${(tr.y - tl.y + u * tr.y) / side},0,${u / side},${(bl.x - tl.x + v * bl.x) / side},${(bl.y - tl.y + v * bl.y) / side},0,${v / side},0,0,1,0,${tl.x},${tl.y},0,1)`;
}

export function FirstGalleryCaisson({ origin, completed, reducedMotion, blocked, onClose, onComplete, onNarrate, onSkipNarration }: {
  origin: readonly ScreenPoint[];
  completed: boolean;
  reducedMotion: boolean;
  blocked: boolean;
  onClose(): void;
  onComplete(): boolean;
  onNarrate(id: FirstGalleryNarrationId, onFinish: () => void): void;
  onSkipNarration(): boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [state, setState] = useState(createCaissonState);
  const live = useRef(state);
  const [revealReady, setRevealReady] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (blocked) return;
    root.current?.focus({ preventScroll: true });
  }, [blocked]);

  useEffect(() => {
    if (blocked || !loaded) return;
    let frame = 0;
    let previous = performance.now();
    function paint() {
      const stage = root.current, surface = panel.current, drawing = art.current, backdrop = shade.current;
      if (!stage || !surface || !drawing || !backdrop) return;
      const rect = stage.getBoundingClientRect();
      const side = surface.clientWidth;
      if (!side) return;
      const left = (rect.width - side) / 2;
      const top = (rect.height - side) / 2;
      const goal = [{ x: left, y: top }, { x: left + side, y: top }, { x: left + side, y: top + side }, { x: left, y: top + side }];
      const travel = reducedMotion ? 1 : smooth(elapsed.current / flightSeconds);
      const detailProgress = reducedMotion ? 1 : smooth((elapsed.current - flightSeconds) / settleSeconds);
      if (travel === 1) surface.style.transform = `translate(${left}px,${top}px)`;
      else surface.style.transform = quadTransform(origin.map((point, index) => ({
        x: (point.x - rect.left) * (1 - travel) + goal[index].x * travel,
        y: (point.y - rect.top) * (1 - travel) + goal[index].y * travel,
      })), side);
      surface.style.opacity = '1';
      backdrop.style.opacity = String(reducedMotion ? 1 : smooth(elapsed.current / .6));
      drawing.setAttribute('viewBox', detailProgress === 1 ? detailView : CAISSON_ART_VIEW.map((value, index) => value + (detail[index] - value) * detailProgress).join(' '));
    }
    function tick(now: number) {
      elapsed.current += Math.min((now - previous) / 1000, .05);
      previous = now;
      paint();
      if (reducedMotion || elapsed.current >= flightSeconds + settleSeconds) {
        elapsed.current = flightSeconds + settleSeconds;
        setArrived(true);
      } else frame = requestAnimationFrame(tick);
    }
    paint();
    frame = requestAnimationFrame(tick);
    const resize = new ResizeObserver(paint);
    if (root.current) resize.observe(root.current);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [origin, loaded, reducedMotion, blocked]);

  const interactive = arrived && !blocked && !failed && state.step !== 'complete' && (state.step !== 'reveal' || revealReady);

  function choose(target: CaissonSelection) {
    if (!interactive || (live.current.step === 'reveal' && !revealReady)) return;
    const next = selectCaissonTarget(live.current, target);
    if (next.result !== 'accepted') {
      setFeedback(next.result === 'repeat' ? '这处已经点过了，再看看另一处。' : '再沿着兔子的轮廓看一看。');
      return;
    }
    if (next.state.step === 'complete' && !completed && !onComplete()) {
      setFeedback('这条手记暂时没有保存。再点一次最后那只兔子试试。');
      return;
    }
    live.current = next.state;
    setState(next.state);
    setFeedback('');
    soundPlayer.play(next.state.step === 'complete' ? 'complete' : 'success');
    if (next.state.step === 'reveal') onNarrate('caisson-ears', () => setRevealReady(true));
    if (next.state.step === 'complete') onNarrate('caisson-summary', onClose);
  }

  function hit(event: MouseEvent<SVGSVGElement>) {
    if (!interactive) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const target = hitCaissonTarget(live.current, [point.x, point.y], 22 / Math.hypot(matrix.a, matrix.b));
    if (target) choose(target);
    else setFeedback('直接点画上的兔身或耳朵。');
  }

  const text = failed ? '井心图暂未载入。返回展厅后可以再试。' : !arrived ? '' : feedback || (
    state.step === 'rabbit' ? (state.rabbits.length === 0 ? '点一只兔子的身体，仔细看看。' : '再点另一只兔子的身体。')
    : state.step === 'ears' ? (state.found.length ? '再找找这只兔子的另一只耳朵。' : '找找这只兔子的两只耳朵。')
    : state.step === 'reveal' ? (revealReady ? '再点最后那只兔子的身体。' : firstGalleryNarration['caisson-ears'].text)
    : firstGalleryNarration['caisson-summary'].text);

  return <section ref={root} className="caisson-float" role="dialog" aria-modal="true" aria-label="藻井寻秘"
    tabIndex={-1} hidden={blocked} data-testid="first-gallery-caisson-float" data-stage={arrived ? state.step : 'approach'}
    data-rabbits={state.rabbits.join(',')} data-ears={state.ears.join(',')} data-interactive={interactive || undefined}
    onClickCapture={event => {
      if (closeButton.current?.contains(event.target as Node) || !onSkipNarration()) return;
      event.preventDefault();
      event.stopPropagation();
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = [...event.currentTarget.querySelectorAll<HTMLElement | SVGElement>('button, [tabindex="0"]')];
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
      event.preventDefault();
      items[next]?.focus({ preventScroll: true });
    }}>
    <div ref={shade} className="caisson-float-background" aria-hidden="true" />
    <div ref={panel} className="caisson-float-panel">
      <svg ref={art} className="caisson-float-art" viewBox={arrived ? detailView : fullView} preserveAspectRatio="none" onClick={hit}
        data-testid="first-gallery-caisson-art" role="group" aria-label="三兔围绕井心的图案">
        <image href={worldAssetUrl(CAISSON_ART)} width={CAISSON_ART_VIEW[2]} height={CAISSON_ART_VIEW[3]}
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        {arrived && <CaissonGoldMarks state={state} reducedMotion={reducedMotion || blocked} />}
        {interactive && caissonTargets(state).map(target => {
          const { label, contour } = caissonHotspot(target);
          return <polygon key={target.id} className="caisson-float-focus" points={contour.map(point => point.join(',')).join(' ')}
            role="button" tabIndex={0} aria-label={label} onKeyDown={event => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              event.stopPropagation();
              choose(target);
            }} />;
        })}
      </svg>
    </div>
    <button ref={closeButton} className="caisson-float-close" type="button" aria-label="返回展厅" onClick={onClose}>×</button>
    {(text || failed) && <div className={`caisson-float-caption${state.step === 'complete' ? ' caisson-float-summary' : ''}${state.step === 'complete' || (state.step === 'reveal' && !revealReady) ? '' : ' gallery-text-cue'}`} role="status">
      <p>{text}</p>
    </div>}
  </section>;
}
