import * as THREE from 'three';

/** Dimensions are pavilion-local metres; the border is painted into the floor. */
export interface MusicUpperFloorPatternOptions { inset?: number; band?: number; leftInsetExtra?: number }

export function musicUpperFloorPatternLayout(width: number, depth: number, options: MusicUpperFloorPatternOptions = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(depth) || width <= 2 || depth <= 2) {
    throw new RangeError('music-upper-floor-invalid-size');
  }
  const inset = options.inset ?? .30, band = options.band ?? .50, leftInsetExtra = options.leftInsetExtra ?? 0;
  if (!Number.isFinite(inset) || !Number.isFinite(band) || inset <= 0 || band <= 0 ||
      !Number.isFinite(leftInsetExtra) || leftInsetExtra < 0 ||
      2 * (inset + band) + leftInsetExtra >= width ||
      2 * (inset + band) >= depth) throw new RangeError('music-upper-floor-invalid-border');
  const scale = band / .50;
  return { width, depth, inset, band, leftInsetExtra, outerRadius: .27 * scale, innerRadius: .09 * scale } as const;
}

/** Rounded rectangular path, using only APIs supported by mobile Safari too. */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** A small, hand-drawn looking lotus with light trailing stems on both sides. */
function lotus(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, variant: number, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const gold = 'rgba(224, 200, 158, .70)', pale = 'rgba(231, 208, 172, .28)';
  ctx.lineWidth = .014; ctx.strokeStyle = gold; ctx.fillStyle = pale;
  // Five layered petals, each kept inside the half-metre band.
  for (const [px, py, spread, high] of [[0, -.015, .083, .15], [-.09, .012, .078, .102], [.09, .012, .078, .102], [-.145, .045, .057, .06], [.145, .045, .057, .06]] as const) {
    ctx.beginPath(); ctx.moveTo(px - spread, .075);
    ctx.bezierCurveTo(px - spread * .9, py - high * .22, px - spread * .35, py - high * .75, px, py - high);
    ctx.bezierCurveTo(px + spread * .35, py - high * .75, px + spread * .9, py - high * .22, px + spread, .075);
    ctx.quadraticCurveTo(px, .105, px - spread, .075); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-.16, .075); ctx.quadraticCurveTo(0, .145, .16, .075); ctx.stroke();

  // The fine scrolls sit on the band's centre line and do not form a solid fill.
  for (const sign of [-1, 1]) {
    ctx.save(); ctx.scale(sign, 1);
    ctx.lineWidth = .012; ctx.strokeStyle = gold;
    ctx.beginPath(); ctx.moveTo(.16, .055);
    ctx.bezierCurveTo(.29, .07, .36, -.075, .52, -.015);
    ctx.bezierCurveTo(.61, .02, .64, .07, .70, .04);
    ctx.bezierCurveTo(.76, .005, .70, -.055, .66, -.02); ctx.stroke();
    ctx.strokeStyle = 'rgba(144, 164, 147, .56)'; ctx.lineWidth = .012;
    ctx.beginPath(); ctx.moveTo(.29, .042);
    ctx.bezierCurveTo(.40, .015, .43, -.11 - variant * .025, .54, -.105);
    ctx.bezierCurveTo(.59, -.105, .59, -.04, .55, -.045); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function flowerKnot(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, variant: number, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(224, 199, 159, .56)'; ctx.fillStyle = 'rgba(231, 207, 171, .32)';
  ctx.lineWidth = .009;
  // A small knot between, rather than another full-sized lotus.
  const r = variant ? .032 : .040;
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-r * .55, -r * .48, 0, -r);
    ctx.quadraticCurveTo(r * .55, -r * .48, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(-.075, 0, .009, 0, Math.PI * 2); ctx.arc(.075, 0, .009, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function paintFloor(ctx: CanvasRenderingContext2D, width: number, depth: number, options: MusicUpperFloorPatternOptions) {
  const { inset, band, leftInsetExtra, outerRadius, innerRadius } = musicUpperFloorPatternLayout(width, depth, options);
  const detailScale = band / .50;
  ctx.fillStyle = '#c79062'; ctx.fillRect(0, 0, width, depth);
  // Broad, faint mineral mottling and small irregular flecks: no seams or tiles.
  let seed = 0x5c52a913;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 130; i++) {
    const x = random() * width, y = random() * depth, r = .16 + random() * .56;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, r);
    wash.addColorStop(0, i % 2 ? 'rgba(253,222,182,.035)' : 'rgba(117,76,50,.022)');
    wash.addColorStop(1, 'rgba(190,145,106,0)');
    ctx.fillStyle = wash; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.fillStyle = 'rgba(255,234,203,.045)';
  for (let i = 0; i < 3800; i++) {
    const x = random() * width, y = random() * depth, size = .005 + random() * .012;
    ctx.fillRect(x, y, size, size);
  }

  // Flat inlaid band; the even-odd hole preserves the same central stone.
  const outerX = inset + leftInsetExtra, outerY = inset;
  const outerW = width - 2 * inset - leftInsetExtra, outerH = depth - 2 * inset;
  const innerX = outerX + band, innerY = outerY + band, innerW = outerW - 2 * band, innerH = outerH - 2 * band;
  ctx.beginPath(); roundedRect(ctx, outerX, outerY, outerW, outerH, outerRadius);
  roundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius);
  ctx.fillStyle = 'rgba(120, 77, 54, .37)'; ctx.fill('evenodd');
  const lineInset = .035 * detailScale;
  ctx.strokeStyle = 'rgba(226, 199, 157, .64)'; ctx.lineWidth = .012 * detailScale;
  ctx.beginPath(); roundedRect(ctx, outerX + lineInset, outerY + lineInset, outerW - 2 * lineInset, outerH - 2 * lineInset, outerRadius - lineInset); ctx.stroke();
  ctx.beginPath(); roundedRect(ctx, innerX - lineInset, innerY - lineInset, innerW + 2 * lineInset, innerH + 2 * lineInset, innerRadius + lineInset); ctx.stroke();

  // One continuous fine line wraps each corner, giving the scroll a quiet
  // connection even where the motifs turn from one side to the next.
  ctx.strokeStyle = 'rgba(218, 190, 150, .34)'; ctx.lineWidth = .008 * detailScale;
  ctx.beginPath(); roundedRect(ctx, outerX + band / 2, outerY + band / 2,
    outerW - band, outerH - band, .16 * detailScale); ctx.stroke();

  const left = outerX + band / 2, right = outerX + outerW - band / 2, top = outerY + band / 2, bottom = depth - top;
  function corner(x: number, y: number, sx: number, sy: number) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx * detailScale, sy * detailScale);
    ctx.strokeStyle = 'rgba(222, 196, 157, .56)'; ctx.lineWidth = .011; ctx.lineCap = 'round';
    // The two curls turn into the neighbouring side without a separate tile.
    for (const flip of [false, true]) {
      ctx.save(); if (flip) ctx.transform(0, 1, 1, 0, 0, 0);
      ctx.beginPath(); ctx.moveTo(.02, .035);
      ctx.bezierCurveTo(.14, .055, .19, .16, .29, .14);
      ctx.bezierCurveTo(.35, .13, .34, .065, .30, .075); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  corner(left, top, 1, 1); corner(right, top, -1, 1);
  corner(right, bottom, -1, -1); corner(left, bottom, 1, -1);
  function side(length: number, emit: (position: number, index: number, spacing: number, count: number) => void) {
    const count = Math.max(detailScale < 1 ? 1 : 2, Math.floor((length - 1.4 * detailScale) / 2.15));
    const spacing = (length - 1.6 * detailScale) / count;
    for (let i = 0; i < count; i++) emit(.8 * detailScale + spacing * (i + .5), i, spacing, count);
  }
  side(right - left, (p, i, spacing, count) => {
    lotus(ctx, left + p, top, 0, i % 2, detailScale); lotus(ctx, right - p, bottom, Math.PI, (i + 1) % 2, detailScale);
    if (i < count - 1) { flowerKnot(ctx, left + p + spacing / 2, top, 0, i % 2, detailScale); flowerKnot(ctx, right - p - spacing / 2, bottom, Math.PI, (i + 1) % 2, detailScale); }
  });
  side(bottom - top, (p, i, spacing, count) => {
    lotus(ctx, right, top + p, Math.PI / 2, i % 2, detailScale); lotus(ctx, left, bottom - p, -Math.PI / 2, (i + 1) % 2, detailScale);
    if (i < count - 1) { flowerKnot(ctx, right, top + p + spacing / 2, Math.PI / 2, i % 2, detailScale); flowerKnot(ctx, left, bottom - p - spacing / 2, -Math.PI / 2, (i + 1) % 2, detailScale); }
  });
}

/** One low-resolution texture and one opaque material, designed for mobile.
 * The caller applies the material to a floor-aligned plane and owns no texture. */
export function createMusicUpperFloorMaterial(width: number, depth: number, options: MusicUpperFloorPatternOptions = {}) {
  musicUpperFloorPatternLayout(width, depth, options);
  const canvas = document.createElement('canvas');
  const scale = 1024 / Math.max(width, depth);
  canvas.width = Math.round(width * scale); canvas.height = Math.round(depth * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('music-upper-floor-canvas-unavailable');
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / depth, 0, 0);
  paintFloor(ctx, width, depth, options);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'music-upper-floor-sandstone-pattern-v001';
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  const material = new THREE.MeshStandardMaterial({ map: texture, color: '#ffffff', roughness: .98, metalness: 0 });
  return { material, dispose() { material.dispose(); texture.dispose(); } };
}
