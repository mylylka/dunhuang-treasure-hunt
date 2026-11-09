import { useId } from 'react';
import { CAISSON_RABBIT_HOTSPOTS, caissonHotspot, type CaissonSelection, type CaissonState } from '../world/first-gallery-puzzles';
import '../styles/caisson-gold-marks.css';

interface Props {
  state: CaissonState;
  reducedMotion: boolean;
}

type Point = readonly [number, number];
type Mark = { target: CaissonSelection; rounds: number[] };

const PALETTES = [
  { name: 'gold', stops: ['#a7652e', '#f2c476', '#ffedbc', '#d19a4f', '#ffd390', '#b77936'] },
  { name: 'red', stops: ['#a82e2a', '#e44c3b', '#ff9c86', '#ce4439', '#ff715e', '#a5282b'] },
  { name: 'blue', stops: ['#254584', '#427dcc', '#9bd6ff', '#3a68ac', '#6fbcf0', '#294c91'] },
] as const;
const METAL_STOPS = [0, .25, .43, .67, .86, 1];

const ORBIT_X = 382;
const ORBIT_Y = 385.5;
// The lower hare's generous touch contour doubles back over its forked hind
// legs. The colored trace follows the actual outside ink boundary.
const LOWER_HARE_INK: readonly Point[] = [
  [324, 392], [326, 396], [329, 399], [333, 400], [337, 400], [342, 403],
  [346, 403], [345, 400], [346, 398], [348, 401], [351, 403], [355, 404],
  [360, 408], [363, 413], [369, 415], [367, 411], [368, 406], [371, 402],
  [377, 400], [381, 400], [385, 404], [389, 409], [390, 411], [385, 415],
  [381, 416], [375, 417], [381, 420], [384, 421], [388, 428], [392, 430],
  [400, 431], [402, 433], [392, 434], [386, 432], [382, 428], [382, 436],
  [384, 439], [389, 443], [392, 447], [391, 449], [387, 445], [383, 442],
  [378, 440], [372, 439], [364, 436], [356, 431], [350, 425], [347, 420],
  [343, 418], [339, 414], [336, 410], [331, 408], [327, 406], [324, 402],
  [323, 398], [324, 397], [326, 401], [330, 404], [333, 404], [330, 403],
  [326, 399], [324, 396],
];

function inkPath(contour: readonly Point[]) {
  function near(point: Point, neighbor: Point) {
    const dx = neighbor[0] - point[0], dy = neighbor[1] - point[1];
    const weight = Math.min(.28, 1.5 / Math.hypot(dx, dy));
    return `${point[0] + dx * weight} ${point[1] + dy * weight}`;
  }
  const end = contour.length - 1;
  return `M ${near(contour[end], contour[0])} ${contour.map((point, index) => {
    const before = contour[index ? index - 1 : end], after = contour[index === end ? 0 : index + 1];
    return `L ${near(point, before)} Q ${point[0]} ${point[1]} ${near(point, after)}`;
  }).join(' ')} Z`;
}

function orbit(radius: number, angle = -90) {
  const rad = angle * Math.PI / 180;
  const x = Math.cos(rad) * radius, y = Math.sin(rad) * radius;
  return `M ${ORBIT_X + x} ${ORBIT_Y + y} a ${radius} ${radius} 0 1 1 ${-2 * x} ${-2 * y} a ${radius} ${radius} 0 1 1 ${2 * x} ${2 * y}`;
}

const RIBBONS = [
  { key: 'halo', radius: 62, angle: -90, dash: '25 75', width: 2.6, opacity: .22 },
  { key: 'silk', radius: 62, angle: -84, dash: '21 79', width: 1.12, opacity: .9 },
  { key: 'thread', radius: 60.7, angle: -72, dash: '14 86', width: .43, opacity: .68 },
  { key: 'glint', radius: 62.1, angle: -18, dash: '5 95', width: .64, opacity: .95 },
] as const;

function CaissonOrbit({ silk, reduced }: { silk: string; reduced: boolean }) {
  return <g className="caisson-gold-orbit" data-testid="caisson-gold-orbit">
    <path className="caisson-gold-orbit-rest" d={orbit(62)} fill="none" stroke={`url(#${silk})`} strokeWidth="1.35" />
    {!reduced && <g className="caisson-gold-orbit-sweep" fill="none" strokeLinecap="round">
      {RIBBONS.map(({ key, radius, angle, dash, width, opacity }) => (
        <path key={key} className="caisson-gold-orbit-run" d={orbit(radius, angle)} pathLength="100" strokeDasharray={dash}
          stroke={key === 'glint' ? '#ffedbc' : `url(#${silk})`} strokeWidth={width} opacity={opacity} />
      ))}
      <path className="caisson-gold-orbit-run" d={orbit(64, -83)} pathLength="100" strokeDasharray=".22 3.8 .46 4.1 .31 5.2 .2 85.71"
        stroke="#ffedbc" strokeWidth=".49" opacity=".8" />
      <path className="caisson-gold-orbit-run" d={orbit(59.8, -71)} pathLength="100" strokeDasharray=".2 5.4 .24 5.3 .16 88.7"
        stroke="#b4c7a1" strokeWidth=".42" opacity=".68" />
    </g>}
  </g>;
}

function selectedMarks(state: CaissonState): Mark[] {
  const bodies: Mark[] = [];
  const ears = new Map<CaissonState['ears'][number], Mark>();
  for (const [round, id] of state.rabbits.entries()) {
    bodies.push({ target: { kind: 'rabbit', id }, rounds: [round] });
    const found = state.step === 'ears' && state.current === id ? state.found : CAISSON_RABBIT_HOTSPOTS[id].ears;
    for (const ear of found) {
      const mark = ears.get(ear);
      if (mark) mark.rounds.push(round);
      else ears.set(ear, { target: { kind: 'ear', id: ear }, rounds: [round] });
    }
  }
  return [...bodies, ...ears.values()];
}

/** Presentation only. The active image and puzzle controls retain their hit areas. */
export function CaissonGoldMarks({ state, reducedMotion }: Props) {
  const id = useId();
  const silk = `${id}-caisson-silk`;
  const marks = selectedMarks(state);
  const complete = state.step === 'complete';
  if (!marks.length) return null;

  return <g className="caisson-gold-marks" data-reduced-motion={reducedMotion} pointerEvents="none" aria-hidden="true">
    <defs>
      {PALETTES.map(({ name, stops }) => <linearGradient key={name} id={`${id}-caisson-metal-${name}`} x1="0" y1=".1" x2="1" y2=".9">
        {stops.map((color, index) => <stop key={index} offset={METAL_STOPS[index]} stopColor={color} />)}
      </linearGradient>)}
      <linearGradient id={silk} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#e5a954" />
        <stop offset=".35" stopColor="#ffd390" />
        <stop offset=".63" stopColor="#ffedbc" />
        <stop offset="1" stopColor="#e8b768" />
      </linearGradient>
    </defs>
    {marks.map(({ target, rounds }) => {
      const contour = target.kind === 'rabbit' && target.id === 'bottom' ? LOWER_HARE_INK : caissonHotspot(target).contour;
      const path = inkPath(contour);
      const glints = [contour[Math.floor(contour.length * .17)], contour[Math.floor(contour.length * .63)]];
      const shared = target.kind === 'ear' && (complete || (state.step === 'reveal' && state.shared === target.id));
      const current = target.kind === 'ear' && state.step === 'ears' && state.found.includes(target.id);
      return <g key={`${target.kind}:${target.id}`} className="caisson-gold-mark"
        data-kind={target.kind} data-mark-id={target.id} data-tone={shared ? 'shared' : current ? 'current' : 'outline'}>
        {rounds.map((round, index) => {
          const { name } = PALETTES[round];
          const top = index === rounds.length - 1;
          const layer = rounds.length === 1 ? 'single' : top ? 'inner' : 'outer';
          return <g key={name} data-palette={name} data-layer={layer}>
            {index === 0 && <path className="caisson-gold-fill" d={path} />}
            <path className="caisson-gold-ink" d={path} pathLength="100" />
            <path className="caisson-gold-metal" d={path} pathLength="100" stroke={`url(#${id}-caisson-metal-${name})`} />
            <path className="caisson-gold-gilding" d={path} pathLength="100" />
            {top && glints.map(([x, y], index) => <path key={index} className="caisson-gold-spark" transform={`translate(${x} ${y})`}
              d="M 0 -1.7 Q .35 -.35 1.65 0 Q .35 .35 0 1.7 Q -.35 .35 -1.65 0 Q -.35 -.35 0 -1.7 Z" />)}
          </g>;
        })}
      </g>;
    })}
    {complete && <CaissonOrbit silk={silk} reduced={reducedMotion} />}
  </g>;
}
