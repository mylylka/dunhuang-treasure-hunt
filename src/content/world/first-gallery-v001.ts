import measured from './first-gallery-stations-v001.json';
import { PATTERN_STATIONS } from '../../world/pattern-interactives';
import { toTerrainPoint } from './terrain-layout-v001';
import { galleryNarratedLine, type FirstGalleryNarrationId } from './first-gallery-narration';

export type GalleryInteraction = 'mural' | 'caisson' | 'easel' | 'scroll';
export type GalleryTarget = 'wall-lotus' | 'wall-bird' | 'wall-grapes' | 'wall' | 'table' | 'lotus' | 'bird' | 'grapes' | 'caisson' | 'easel' | 'pigments' | 'scroll';
export interface GalleryLine { text: string; target: GalleryTarget; duration?: number; narration?: FirstGalleryNarrationId; pauseAfter?: number }
export const GALLERY_LABELS: Record<GalleryInteraction, string> = {
  mural: '借物补画', caisson: '藻井寻秘', easel: '给画添点颜色', scroll: '纹样游戏画卷',
};
/** Device anchors use the same normalized model frame as its GLB, then follow
 * both the installation transform and the courtyard's terrain transform. */
export function galleryStationPoint(id: string, p: readonly number[]) {
  const station = PATTERN_STATIONS.find(item => item.id === id)!;
  const c = Math.cos(station.yaw), s = Math.sin(station.yaw);
  return toTerrainPoint('courtyard', {
    x: station.position.x + (p[0] * c + p[2] * s) * station.scale,
    y: station.position.y + p[1] * station.scale,
    z: station.position.z + (-p[0] * s + p[2] * c) * station.scale,
  });
}
function muralPoint(x: number, y: number) {
  return toTerrainPoint('courtyard', { x: -18.25 + x / 2168 * 12.5, y: .65 + (1 - y / 725) * 4.1666667, z: -23.10 });
}
export const GALLERY_TARGETS = {
  'wall-lotus': muralPoint(1081.5, 352.6),
  'wall-bird': muralPoint(498.2, 175.2),
  'wall-grapes': muralPoint(1686, 478.1),
  wall: toTerrainPoint('courtyard', { x: -12, y: 2.9, z: -23.10 }),
  table: galleryStationPoint('mural-station', [0, .31, .10]),
  lotus: galleryStationPoint('mural-station', measured.muralObjects.lotus.center),
  bird: galleryStationPoint('mural-station', measured.muralObjects.bird.center),
  grapes: galleryStationPoint('mural-station', measured.muralObjects.grapes.center),
  easel: galleryStationPoint('coloring-station', [-.087, .40, -.02]),
  pigments: galleryStationPoint('coloring-station', [.23, .18, .11]),
  caisson: toTerrainPoint('courtyard', { x: -12, y: 7.90, z: -15 }),
  scroll: toTerrainPoint('courtyard', { x: -18.92, y: 1.041, z: -3.11 }),
};
export const GALLERY_INTRO: Record<GalleryInteraction, readonly GalleryLine[]> = {
  mural: [
    { text: '这面墙上的图案，怎么缺了几块？', target: 'wall' },
    { text: '旁边这些实物，好像也藏在壁画里。靠近桌案看看吧。', target: 'table', duration: 4.8 },
  ],
  caisson: [{ ...galleryNarratedLine('caisson-beauty', 'caisson'), pauseAfter: 1 }, galleryNarratedLine('caisson-rabbits', 'caisson')],
  easel: [
    { ...galleryNarratedLine('easel-discover', 'easel'), pauseAfter: 1 },
    galleryNarratedLine('easel-pigments', 'pigments'),
  ],
  scroll: [{ text: '三项发现都齐了！这卷纹样游戏也打开了。', target: 'scroll' }],
};
