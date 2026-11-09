import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '../styles/world-map-fog.css';

type FogRegion = 'music' | 'mogao';

const width = 512;
const height = 288;
let textures: Record<FogRegion, ImageData> | undefined;

function smoothstep(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function lattice(x: number, y: number, seed: number) {
  let h = Math.imul(x, 0x165667b1) ^ Math.imul(y, 0x27d4eb2d) ^ seed;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const u = smoothstep(ix, ix + 1, x);
  const v = smoothstep(iy, iy + 1, y);
  const north = lattice(ix, iy, seed) * (1 - u) + lattice(ix + 1, iy, seed) * u;
  const south = lattice(ix, iy + 1, seed) * (1 - u) + lattice(ix + 1, iy + 1, seed) * u;
  return north * (1 - v) + south * v;
}

function makeFogTextures() {
  const music = new ImageData(width, height);
  const mogao = new ImageData(width, height);

  for (let col = 0; col < width; col++) {
    const x = (col + .5) / width;
    // The edge skirts the courtyard roof and deepens toward the cliffs.
    const bank = .21 + .25 * smoothstep(-.10, .30, x) + .12 * smoothstep(.31, .71, x)
      + .25 * smoothstep(.49, 1.05, x) - .023 * (1 - smoothstep(.31, .43, x));
    const westHaze = .34 + .66 * smoothstep(-.04, .34, x);
    const edgeBend = .069 * (noise(x * 5, 1.7, 13) - .5);

    for (let row = 0; row < height; row++) {
      const y = (row + .5) / height;
      const swell = noise(x * 4.3 + 2.1, y * 6.8, 23);
      const distance = y - (bank + edgeBend + .035 * (swell - .5));
      const density = 1 - smoothstep(-.10, .085, distance);
      if (!density) continue;

      const depth = 7.4 * density ** 2 * westHaze;
      // Share optical depth across the two overlays. Their overlap combines
      // into the same fog bank, without a visible edge between the venues.
      const east = smoothstep(.47 + .06 * y, .72 + .04 * y, x + .028 * (swell - .5));
      const broadFold = noise(x * 4.4 + y * 2.2, y * 12.4 + 1.35 * swell, 37);
      const fineFold = noise(x * 7.7 + y * 3.4, y * 22.6 + 2.1 * swell, 61);
      const light = 246 - 11 * x + 53 * (broadFold - .5) + 14 * (fineFold - .5);
      const pixel = (row * width + col) * 4;

      for (const image of [music, mogao]) {
        image.data[pixel] = light;
        image.data[pixel + 1] = light + 2;
        image.data[pixel + 2] = light + 5;
      }
      music.data[pixel + 3] = 255 * (1 - Math.exp(-depth * (1 - east)));
      mogao.data[pixel + 3] = 255 * (1 - Math.exp(-depth * east));
    }
  }
  return { music, mogao };
}

function FogLayer({ area, locked, initialLocked, reducedMotion }: {
  area: FogRegion;
  locked: boolean;
  initialLocked?: boolean;
  reducedMotion?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seeded, setSeeded] = useState(() => !!initialLocked && !locked && !reducedMotion);
  const covered = locked || (seeded && !reducedMotion);

  useLayoutEffect(() => {
    if (!covered) return;
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    textures ??= makeFogTextures();
    context.putImageData(textures[area], 0, 0);
  }, [area, covered]);

  useEffect(() => {
    if (!seeded) return;
    // Paint the previously locked stage before starting its fade.
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setSeeded(false));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
    };
  }, [seeded]);

  return <canvas ref={canvas} className="world-map-fog-layer" width={width} height={height}
    data-fog-region={area} data-map-fog={locked ? area : undefined} data-fog-covered={covered || undefined} />;
}

interface Props {
  lockedMusic: boolean;
  lockedMogao: boolean;
  initialLockedMusic?: boolean;
  initialLockedMogao?: boolean;
  reducedMotion?: boolean;
}

export const WorldMapFog = memo(function WorldMapFog({
  lockedMusic, lockedMogao, initialLockedMusic, initialLockedMogao, reducedMotion,
}: Props) {
  return <div className="world-map-fog" aria-hidden="true" data-reduced-motion={reducedMotion || undefined}>
    <FogLayer area="music" locked={lockedMusic} initialLocked={initialLockedMusic} reducedMotion={reducedMotion} />
    <FogLayer area="mogao" locked={lockedMogao} initialLocked={initialLockedMogao} reducedMotion={reducedMotion} />
  </div>;
});
