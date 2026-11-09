import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';
import { MOGAO_ENTRANCE_JAMB, MOGAO_ENTRANCE_PATTERN, MOGAO_EXHIBIT_ENTRANCES } from '../content/world/mogao-exhibit-entrance-v001';
import layoutData from '../content/world/mogao-exhibit-layout-v004.json';
import upperLayout from '../content/world/mogao-upper-v002.json';
import {
  exhibitIdForPanel, getMogaoExhibit, type MogaoExhibit, type MogaoExhibitId, type MogaoExhibitPanelId,
  type MogaoExhibitTarget, type MogaoExhibitWallId,
} from '../content/world/mogao-exhibit-v001';
import { MOGAO_BUDDHA_GATE, MOGAO_HALL_A_BUDDHA_GATE, type UpperSolid } from './mogao-upper-navigation';
import type { WorldPoint } from './types';

type ImageStatus = 'waiting' | 'loading' | 'ready' | 'missing' | 'failed';

const gateFadeSeconds = .72;
const labelColor = '#17120e';
const hall = upperLayout.rooms.find(room => room.id === 'hall-b')!;
const vault = upperLayout.solids.find(solid => solid.id === 'b-vault-ceiling')!;
const [minX, , minZ] = hall.min;
const [maxX, , maxZ] = hall.max;
const lotusPath = 'mogao-exhibit/v005/wall-lotus.webp';
// Match the Songti title's visible character height. Keep a 3 px margin
// around the WebP's painted bounds (19,14 to 271,184 in bottom-up UV space).
const lotusHeight = .373;
const lotusScale = lotusHeight / 170;
const lotusWidth = 252 * lotusScale;
const lotusMargin = 3 * lotusScale;
const lotusHitWidth = lotusWidth + 2 * lotusMargin, lotusHitHeight = lotusHeight + 2 * lotusMargin;
const titleGaps = { A: .082, B: .088, C: .025, D: .077 };
const titleBShift = -.025;
const hallBImageSurfaces = new Set(['flight-3', 'landing-3', 'flight-4', 'landing-4', 'hall-b']);

interface WallRect { x: number; y: number; w: number; h: number }
type Crop = readonly [left: number, top: number, right: number, bottom: number];
interface ExhibitWallLayout {
  id: MogaoExhibitWallId;
  width: number;
  opening?: WallRect;
  titleBox: WallRect;
  titleInk: WallRect;
  subtitleInk: WallRect;
  titlePath: string;
  plaque?: { rect: WallRect; path: string };
  panels: readonly { id: MogaoExhibitPanelId; rect: WallRect; crop: Crop }[];
}
const layout = layoutData as unknown as { height: number; floorWorldY: number; walls: readonly ExhibitWallLayout[] };

/** Local +X on every wall is the visitor's right when facing the artwork. */
export const MOGAO_EXHIBIT_WALLS = {
  A: { x: maxX, z: minZ, yaw: -Math.PI / 2 },
  B: { x: maxX, z: maxZ, yaw: Math.PI },
  C: { x: minX, z: maxZ, yaw: Math.PI / 2 },
  D: { x: minX, z: minZ, yaw: 0 },
} satisfies Record<MogaoExhibitWallId, { x: number; z: number; yaw: number }>;

interface ExhibitPanel {
  id: MogaoExhibitPanelId;
  exhibitId: MogaoExhibitId;
  wall: MogaoExhibitWallId;
  face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  image: MogaoExhibit['image'];
  crop: Crop;
  status: ImageStatus;
}

const gateVertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 veilUv;
  void main() {
    veilUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;
const gateFragment = `
  #include <logdepthbuf_pars_fragment>
  varying vec2 veilUv;
  uniform float clock;
  uniform float strength;
  void main() {
    #include <logdepthbuf_fragment>
    float rise = veilUv.y - clock * 0.22;
    float thread = sin(veilUv.x * 48.0 + sin(rise * 5.0) * 1.6) * 0.5 + 0.5;
    float flow = sin(rise * 14.0 + veilUv.x * 6.0) * 0.5 + 0.5;
    float border = min(min(veilUv.x, 1.0 - veilUv.x), min(veilUv.y, 1.0 - veilUv.y));
    float edge = 1.0 - smoothstep(0.012, 0.075, border);
    float glow = 0.40 + 0.22 * flow + 0.09 * thread + 0.26 * edge;
    vec3 color = mix(vec3(0.50, 0.17, 0.022), vec3(1.0, 0.90, 0.52), clamp(glow, 0.0, 1.0));
    gl_FragColor = vec4(color, strength);
    #include <colorspace_fragment>
  }
`;

const plaqueFragment = `
  #include <logdepthbuf_pars_fragment>
  varying vec2 veilUv;
  uniform vec3 bronzeShade;
  uniform vec3 champagneLight;
  float hairline(float key) { return fract(sin(key * 91.345) * 3478.294); }
  void main() {
    #include <logdepthbuf_fragment>
    float stripe = floor(veilUv.x * 520.0);
    float grain = (hairline(stripe) - 0.5) * (1.0 - smoothstep(0.001, 0.004, fwidth(veilUv.x)));
    float across = (veilUv.x - 0.59 + veilUv.y * 0.15) * 2.4;
    float band = exp(-across * across);
    float satin = clamp(0.18 + 0.38 * band + 0.23 * veilUv.y + 0.12 * grain, 0.0, 1.0);
    gl_FragColor = vec4(mix(bronzeShade, champagneLight, satin), 1.0);
    #include <colorspace_fragment>
  }
`;

function labelCanvas(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
}

function drawBlackText(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number) {
  context.fillStyle = labelColor;
  context.font = `900 ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x, y, maxWidth);
}

function makeCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The same soft wash is reused for each wall. Its quads are clipped against
 * the real openings and never participate in picking or shadow rendering. */
function softWashTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot(2 * x / (size - 1) - 1, 2 * y / (size - 1) - 1);
    const i = (y * size + x) * 4;
    data.set([255, 255, 255, Math.round(106 * (1 - THREE.MathUtils.smoothstep(radius, .14, 1)))], i);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function intersection(a: WallRect, b: WallRect): WallRect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

function aroundOpening(rect: WallRect, opening?: WallRect): WallRect[] {
  const hole = opening && intersection(rect, opening);
  if (!hole) return [rect];
  return [
    { x: rect.x, y: rect.y, w: hole.x - rect.x, h: rect.h },
    { x: hole.x + hole.w, y: rect.y, w: rect.x + rect.w - hole.x - hole.w, h: rect.h },
    { x: hole.x, y: rect.y, w: hole.w, h: hole.y - rect.y },
    { x: hole.x, y: hole.y + hole.h, w: hole.w, h: rect.y + rect.h - hole.y - hole.h },
  ].filter(part => part.w > 0 && part.h > 0);
}

function wallWashGeometry(wall: ExhibitWallLayout) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const bounds = { x: 0, y: 0, w: wall.width, h: layout.height };
  const sources = wall.panels.map(panel => panel.rect);
  if (wall.plaque) sources.push(wall.plaque.rect);
  for (const panel of sources) {
    const radiusX = panel.w * .69 + .28, radiusY = panel.h * .61 + .24;
    const wash = { x: panel.x + panel.w / 2 - radiusX, y: panel.y + panel.h / 2 + .13 - radiusY, w: radiusX * 2, h: radiusY * 2 };
    const clip = intersection(wash, bounds);
    if (!clip) continue;
    for (const part of aroundOpening(clip, wall.opening)) {
      const i = positions.length / 3;
      for (const [x, y] of [[part.x, part.y], [part.x + part.w, part.y], [part.x + part.w, part.y + part.h], [part.x, part.y + part.h]]) {
        positions.push(x, y, .007);
        uvs.push((x - wash.x) / wash.w, (y - wash.y) / wash.h);
      }
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
  }
  return new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    .setIndex(indices);
}

/** A fixed warm beam per print, multiplied after texture decode. The map
 * keeps its source pixels and crop transform independent from the falloff. */
function printFalloff(surface: THREE.PlaneGeometry) {
  const uv = surface.getAttribute('uv'), colors: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    const radius = Math.hypot((uv.getX(i) - .5) * 1.75, (uv.getY(i) - .57) * 1.55);
    const strength = .59 + .49 * Math.exp(-1.8 * radius * radius);
    colors.push(strength, strength * .975, strength * .928);
  }
  surface.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function vaultHeightAt(x: number, z: number) {
  const edge = Math.min(x - vault.min[0], vault.max[0] - x, z - vault.min[2], vault.max[2] - z);
  return vault.min[1] + hall.roofRise * THREE.MathUtils.clamp(edge / hall.roofInset, 0, 1);
}

function visibleIntersection(hit: THREE.Intersection, ignored: THREE.Object3D) {
  if (!(hit.object instanceof THREE.Mesh)) return false;
  for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
    if (!object.visible || object === ignored) return false;
  }
  const material: THREE.Material | undefined = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
  return !!material?.visible && material.opacity > .02;
}

/** A separate display in the authored B chamber. No artwork is part of the hall GLB. */
export function createMogaoExhibitScene(root: THREE.Object3D,
  options: { onChange?: () => void; gateLocked?: boolean; hallAGateLocked?: boolean; viewingRoomReady?: boolean } = {}) {
  const group = new THREE.Group();
  group.name = 'mogao-exhibit-v002';
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const fixtureBatches: THREE.InstancedMesh[] = [];
  const panels = new Map<THREE.Object3D, ExhibitPanel>();
  const wallMarkers = new Map<THREE.Object3D, MogaoExhibitWallId>();
  const decorations: { path: string; wall: MogaoExhibitWallId; face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> }[] = [];
  const controller = new AbortController();
  const hiddenGraybox = new Map<THREE.Object3D, boolean>();
  let disposed = false;
  let imagesStarted = false;

  function plane<T extends THREE.Material>(width: number, height: number, material: T, subdivisions = 1) {
    const surface = new THREE.PlaneGeometry(width, height, subdivisions, subdivisions);
    geometry.add(surface);
    materials.add(material);
    return new THREE.Mesh(surface, material);
  }

  function mountPlane<T extends THREE.Material>(wall: THREE.Group, name: string, rect: WallRect, inset: number, material: T, subdivisions = 1) {
    const mesh = plane(rect.w, rect.h, material, subdivisions);
    mesh.name = name;
    mesh.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, inset);
    wall.add(mesh);
    return mesh;
  }

  function mountInk(wall: THREE.Group, wallId: MogaoExhibitWallId, name: string, rect: WallRect, inset: number, path: string, subdivisions = 1) {
    const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .025, depthWrite: false, toneMapped: false });
    const face = mountPlane(wall, name, rect, inset, material, subdivisions);
    face.raycast = () => {};
    face.visible = false;
    decorations.push({ wall: wallId, path, face });
    return face;
  }

  function mountTitle(wallRoot: THREE.Group, wall: ExhibitWallLayout) {
    const { id, titleInk, subtitleInk, titlePath } = wall;
    const shift = id === 'B' ? titleBShift : 0;
    const title = { ...wall.titleBox, x: wall.titleBox.x + shift };
    const gap = titleGaps[id];
    const horizontal = id === 'C';
    const ink = horizontal ? {
      x: titleInk.x + titleInk.w + gap,
      y: titleInk.y + (titleInk.h - lotusHeight) / 2,
    } : {
      x: titleInk.x + shift + (titleInk.w - lotusWidth) / 2,
      y: titleInk.y - gap - lotusHeight,
    };
    const face = mountInk(wallRoot, id, `mogao-exhibit-title-${id}`, title, .024, titlePath, horizontal ? 3 : 1);
    if (horizontal) {
      // Stretch only the transparent interval between title and subtitle.
      // This opens a place for the lotus while retaining the existing ink.
      const columns = [0, titleInk.x + titleInk.w + .008 - title.x, subtitleInk.x - .008 - title.x, title.w];
      const subtitleOffset = ink.x + lotusWidth + .055 - subtitleInk.x;
      const { position, uv } = face.geometry.attributes;
      for (let vertex = 0; vertex < position.count; vertex++) {
        const column = vertex % columns.length;
        const x = columns[column];
        position.setX(vertex, x + (column >= 2 ? subtitleOffset : 0) - title.w / 2);
        uv.setX(vertex, x / title.w);
      }
    }
    return { x: ink.x - lotusMargin, y: ink.y - lotusMargin, w: lotusHitWidth, h: lotusHitHeight };
  }

  const entranceMaterial = () => new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .025, depthWrite: false, toneMapped: false });
  type EntranceAsset = {
    path: string;
    status: ImageStatus;
    faces: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
  };
  const jambs: EntranceAsset = { path: MOGAO_ENTRANCE_JAMB.path, status: 'waiting', faces: [] };
  const entrancePattern: EntranceAsset = { path: MOGAO_ENTRANCE_PATTERN.path, status: 'waiting', faces: [] };
  const jambMaterial = entranceMaterial();
  const patternMaterial = entranceMaterial();
  function entranceFace(name: string, center: readonly [number, number, number], width: number, height: number,
    material: THREE.MeshBasicMaterial, underRoof = false) {
    const face = plane(width, height, material);
    face.name = name;
    face.position.set(...center);
    if (underRoof) face.rotation.set(Math.PI / 2, 0, Math.PI);
    else face.rotation.y = Math.PI;
    face.raycast = () => {};
    face.visible = false;
    group.add(face);
    return face;
  }
  const entranceSigns = MOGAO_EXHIBIT_ENTRANCES.map(entrance => {
    const { id, center, width, height, underRoof, pattern } = entrance;
    const field = entranceFace(`mogao-entrance-${id}-scrollwork`, pattern.center, pattern.width, pattern.height, patternMaterial, underRoof);
    field.renderOrder = -1;
    const uv = field.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i,
      uv.getX(i) * pattern.width / MOGAO_ENTRANCE_PATTERN.width,
      uv.getY(i) * pattern.height / MOGAO_ENTRANCE_PATTERN.height);
    entrancePattern.faces.push(field);
    const face = entranceFace(`mogao-entrance-${id}`, center, width, height, entranceMaterial(), underRoof);
    entrance.jambs.forEach((jamb, index) => jambs.faces.push(entranceFace(`mogao-entrance-${id}-jamb-${index + 1}`, jamb,
      MOGAO_ENTRANCE_JAMB.width, MOGAO_ENTRANCE_JAMB.height, jambMaterial)));
    const asset: EntranceAsset = { path: entrance.path, status: 'waiting', faces: [face] };
    return { ...entrance, face, asset };
  });
  let currentEntrance: typeof entranceSigns[number] | undefined;

  root.traverse(object => {
    if (!/^hall-b-(?:mural-panel|placeholder-label|hall-label|bottom-label|exit-label|height-dimension|panel-dimension(?:[._]?\d+)?)$/.test(object.name)) return;
    hiddenGraybox.set(object, object.visible);
    object.visible = false;
  });

  function placeholder(title: string) {
    const label = labelCanvas(384, 512);
    if (!label) return null;
    const { canvas, context } = label;
    context.fillStyle = '#e5d2ae';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawBlackText(context, title, 192, 255, 32, 304);
    const texture = makeCanvasTexture(canvas);
    textures.add(texture);
    return texture;
  }

  const waitingTexture = placeholder('图像载入中');
  const missingTexture = placeholder('图像待补');
  const failedTexture = placeholder('图像暂未载入');
  const frameMaterial = new THREE.MeshBasicMaterial({ color: '#33271f', toneMapped: false });
  const lotusMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .03, depthWrite: false, toneMapped: false });
  const washTexture = softWashTexture();
  textures.add(washTexture);
  const washMaterial = new THREE.MeshBasicMaterial({ map: washTexture, color: '#c7a479', transparent: true, depthWrite: false, toneMapped: false });
  materials.add(washMaterial);
  const plaqueMaterial = new THREE.ShaderMaterial({
    vertexShader: gateVertex, fragmentShader: plaqueFragment, toneMapped: false,
    uniforms: { bronzeShade: { value: new THREE.Color('#a38b6a') }, champagneLight: { value: new THREE.Color('#ebdfc8') } },
  });
  const fixtures = { track: [] as THREE.Matrix4[], barrel: [] as THREE.Matrix4[], lens: [] as THREE.Matrix4[] };
  const fixtureRotation = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);

  function fixture(kind: keyof typeof fixtures, wall: THREE.Group, position: THREE.Vector3, scale: THREE.Vector3, direction?: THREE.Vector3) {
    if (direction) fixtureRotation.setFromUnitVectors(yAxis, direction);
    else fixtureRotation.identity();
    fixtures[kind].push(new THREE.Matrix4().compose(position, fixtureRotation, scale).premultiply(wall.matrix));
  }

  function mountTrack(wall: THREE.Group, wallLayout: ExhibitWallLayout) {
    const row = wallLayout.panels.map(panel => panel.rect);
    if (wallLayout.plaque) row.push(wallLayout.plaque.rect);
    const railMin = Math.max(.06, Math.min(...row.map(panel => panel.x)) - .1);
    const railMax = Math.min(wallLayout.width - .06, Math.max(...row.map(panel => panel.x + panel.w)) + .1);
    const high = wallLayout.id === 'B' || wallLayout.id === 'C';
    const inset = high ? 1.73 : 2.18;
    const underside = (x: number) => {
      const anchor = new THREE.Vector3(x, 0, inset).applyMatrix4(wall.matrix);
      return vaultHeightAt(anchor.x, anchor.z) - layout.floorWorldY;
    };
    // Put the B/C hardware above the sightlines to their revised titles. The
    // two rail systems cross at different levels and clear the folded soffit.
    const requestedHeight = { A: 5.62, B: 6.14, C: 6.23, D: 5.48 }[wallLayout.id];
    const h = Math.min(requestedHeight, underside(railMin) - .09, underside(railMax) - .09);
    fixture('track', wall, new THREE.Vector3((railMin + railMax) / 2, h, inset), new THREE.Vector3(railMax - railMin, .058, .065));
    for (const x of [railMin + .28, railMax - .28]) {
      // Bury the rod a centimetre into the actual sloping soffit or crown.
      const top = underside(x) + .012;
      fixture('track', wall, new THREE.Vector3(x, (h + top) / 2, inset), new THREE.Vector3(.028, top - h, .028));
    }
    const drop = high ? .079 : .16;
    const barrelLength = high ? .212 : .26;
    const barrelCenter = high ? .071 : .092;
    for (const rect of row) {
      const x = rect.x + rect.w / 2;
      const mount = new THREE.Vector3(x, h - drop, inset);
      const beam = new THREE.Vector3(0, rect.y + rect.h * .56 - mount.y, .03 - inset).normalize();
      fixture('track', wall, new THREE.Vector3(x, h - (high ? drop / 2 : .078), inset), new THREE.Vector3(.04, high ? drop * .73 : .115, .04));
      fixture('barrel', wall, mount.clone().addScaledVector(beam, barrelCenter), new THREE.Vector3(.073, barrelLength, .073), beam);
      fixture('lens', wall, mount.clone().addScaledVector(beam, barrelCenter + barrelLength / 2 + .003), new THREE.Vector3(.055, .014, .055), beam);
    }
  }

  function mountPlaque(wall: THREE.Group, wallId: MogaoExhibitWallId, plaque: NonNullable<ExhibitWallLayout['plaque']>) {
    const rect = plaque.rect;
    const bevel = .005, thickness = .082, gap = .010;
    const halfWidth = rect.w / 2 - bevel, halfHeight = rect.h / 2 - bevel;
    const outline = new THREE.Shape();
    outline.moveTo(-halfWidth, -halfHeight);
    outline.lineTo(halfWidth, -halfHeight);
    outline.lineTo(halfWidth, halfHeight);
    outline.lineTo(-halfWidth, halfHeight);
    outline.closePath();
    const metal = new THREE.ExtrudeGeometry(outline, {
      depth: thickness - 2 * bevel, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1,
    });
    const normals = metal.getAttribute('normal'), colors: number[] = [];
    for (let i = 0; i < normals.count; i++) {
      const shade = .61 + .26 * Math.max(0, normals.getY(i)) + .13 * Math.abs(normals.getX(i));
      colors.push(shade, shade, shade);
    }
    metal.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const sides = new THREE.MeshBasicMaterial({ color: '#b38e60', vertexColors: true, toneMapped: false });
    geometry.add(metal);
    materials.add(sides);
    const body = new THREE.Mesh(metal, sides);
    body.name = 'mogao-exhibit-plaque-metal-body';
    body.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, gap + bevel);
    wall.add(body);

    const front = { x: rect.x + bevel, y: rect.y + bevel, w: 2 * halfWidth, h: 2 * halfHeight };
    mountPlane(wall, 'mogao-exhibit-plaque-edge', rect, .008, frameMaterial);
    mountPlane(wall, 'mogao-exhibit-plaque-brushed-metal', front, gap + thickness + .002, plaqueMaterial);
    mountInk(wall, wallId, 'mogao-exhibit-plaque-ink', front, gap + thickness + .004, plaque.path);
  }

  for (const wall of layout.walls) {
    const wallId = wall.id;
    const placement = MOGAO_EXHIBIT_WALLS[wallId];
    const wallRoot = new THREE.Group();
    wallRoot.name = `mogao-exhibit-wall-${wallId}`;
    wallRoot.position.set(placement.x, layout.floorWorldY, placement.z);
    wallRoot.rotation.y = placement.yaw;
    wallRoot.updateMatrix();
    group.add(wallRoot);

    const washGeometry = wallWashGeometry(wall);
    geometry.add(washGeometry);
    const wash = new THREE.Mesh(washGeometry, washMaterial);
    wash.name = `mogao-exhibit-light-pools-${wallId}`;
    wash.raycast = () => {};
    wallRoot.add(wash);
    mountTrack(wallRoot, wall);
    const lotusRect = mountTitle(wallRoot, wall);
    const lotus = mountPlane(wallRoot, `mogao-exhibit-lotus-${wallId}`, lotusRect, .039, lotusMaterial);
    lotus.visible = false;
    wallMarkers.set(lotus, wallId);

    for (const { id, rect, crop } of wall.panels) {
      const exhibitId = exhibitIdForPanel(id);
      const item = getMogaoExhibit(exhibitId);
      const image = (id === 'C03-detail' ? item?.detailImage : item?.image) ?? null;
      const border = .018;
      mountPlane(wallRoot, `mogao-exhibit-frame-${id}`, { x: rect.x - border, y: rect.y - border, w: rect.w + 2 * border, h: rect.h + 2 * border }, .024, frameMaterial);
      const map = image ? waitingTexture : missingTexture;
      const material = new THREE.MeshBasicMaterial({ map, color: map ? '#ffffff' : '#d9c5a3', toneMapped: false, vertexColors: true });
      const face = mountPlane(wallRoot, `mogao-exhibit-image-${id}`, rect, .035, material, 10);
      printFalloff(face.geometry);
      panels.set(face, { id, exhibitId, wall: wallId, face, image, crop, status: image ? 'waiting' : 'missing' });
    }
    if (wall.plaque) mountPlaque(wallRoot, wallId, wall.plaque);
  }

  // Three batches for all four rail systems, with no extra shadow or light passes.
  const barrel = new THREE.CylinderGeometry(.96, 1, 1, 10);
  const normals = barrel.getAttribute('normal'), barrelColors: number[] = [];
  for (let i = 0; i < normals.count; i++) {
    const shade = .43 + .57 * Math.max(0, normals.getX(i) * .36 + normals.getZ(i) * .93);
    barrelColors.push(shade, shade, shade);
  }
  barrel.setAttribute('color', new THREE.Float32BufferAttribute(barrelColors, 3));
  const fixtureParts = {
    track: [new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: '#302720', toneMapped: false })],
    barrel: [barrel, new THREE.MeshBasicMaterial({ color: '#524237', vertexColors: true, toneMapped: false })],
    lens: [new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshBasicMaterial({ color: '#ffe9c5', toneMapped: false })],
  } as const;
  for (const kind of Object.keys(fixtures) as (keyof typeof fixtures)[]) {
    const [shape, material] = fixtureParts[kind];
    geometry.add(shape);
    materials.add(material);
    const batch = new THREE.InstancedMesh(shape, material, fixtures[kind].length);
    batch.name = `mogao-exhibit-light-${kind}`;
    fixtures[kind].forEach((matrix, index) => batch.setMatrixAt(index, matrix));
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    fixtureBatches.push(batch);
    group.add(batch);
  }

  function mountBuddhaGate({ min, max }: UpperSolid, name: string, initiallyLocked?: boolean) {
    let strength = initiallyLocked === false ? 0 : 1;
    let initialized = initiallyLocked !== undefined;
    const material = new THREE.ShaderMaterial({
      vertexShader: gateVertex, fragmentShader: gateFragment,
      uniforms: { clock: { value: 0 }, strength: { value: strength } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const face = plane(max[2] - min[2], max[1] - min[1], material);
    face.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    face.rotation.y = Math.PI / 2;
    face.name = name;
    face.visible = strength > 0;
    group.add(face);
    return {
      update(step: number, locked: boolean, reduced: boolean) {
        if (!initialized) {
          initialized = true;
          strength = Number(locked);
        }
        if (!locked) strength = reduced ? 0 : Math.max(0, strength - step / gateFadeSeconds);
        material.uniforms.strength.value = strength;
        face.visible = strength > 0;
        if (face.visible && !reduced) material.uniforms.clock.value += step;
      },
      blocking: () => strength > 0,
      inspect: () => ({ strength, visible: face.visible }),
    };
  }

  const bGate = mountBuddhaGate(MOGAO_BUDDHA_GATE, 'mogao-exhibit-gold-barrier', options.gateLocked);
  // The A barrier mounts with the upper room, independently of its lazy murals.
  const aGate = mountBuddhaGate(MOGAO_HALL_A_BUDDHA_GATE, 'mogao-hall-a-gold-barrier', options.hallAGateLocked ?? false);
  const recessMaterial = new THREE.MeshBasicMaterial({ color: '#2d251f', side: THREE.DoubleSide, toneMapped: false });
  function mountRecess({ min, max }: UpperSolid, hall: string) {
    // Mask only the matching opening while the main chamber is being loaded.
    const recess = plane(max[2] - min[2], max[1] - min[1], recessMaterial);
    recess.name = `mogao-${hall}-viewing-recess`;
    recess.position.set(14.05, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    recess.rotation.y = Math.PI / 2;
    recess.visible = options.viewingRoomReady === false;
    recess.raycast = () => {};
    group.add(recess);
    return recess;
  }
  const aRecess = mountRecess(MOGAO_HALL_A_BUDDHA_GATE, 'hall-a');
  const bRecess = mountRecess(MOGAO_BUDDHA_GATE, 'hall-b');
  root.add(group);

  async function loadTexture(path: string, crop?: Crop): Promise<THREE.Texture | null> {
    if (disposed) return null;
    const request = new AbortController();
    const cancel = () => request.abort();
    const timeout = setTimeout(cancel, 12_000);
    controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      const response = await fetch(worldAssetUrl(path), { signal: request.signal });
      if (!response.ok) throw new Error('exhibit-image-request-failed');
      const blob = await response.blob();
      if (disposed) return null;
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
      if (disposed || request.signal.aborted) { bitmap.close(); return null; }
      const texture = new THREE.Texture(bitmap);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      if (crop) {
        const [left, top, right, bottom] = crop;
        texture.offset.set(left, 1 - bottom);
        texture.repeat.set(right - left, bottom - top);
      }
      texture.needsUpdate = true;
      bitmaps.add(bitmap);
      textures.add(texture);
      return texture;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener('abort', cancel);
    }
  }

  async function loadPanel(panel: ExhibitPanel) {
    if (!panel.image || disposed) return;
    panel.status = 'loading';
    const map = await loadTexture(panel.image.path, panel.crop);
    if (disposed) return;
    panel.face.material.map = map ?? failedTexture;
    panel.face.material.color.set(map ? '#ffffff' : failedTexture ? '#ffffff' : '#d9c5a3');
    panel.face.material.needsUpdate = true;
    panel.status = map ? 'ready' : 'failed';
    options.onChange?.();
  }

  async function loadDecoration(decoration: typeof decorations[number]) {
    const map = await loadTexture(decoration.path);
    if (disposed || !map) return;
    decoration.face.material.map = map;
    decoration.face.material.needsUpdate = true;
    decoration.face.visible = true;
    options.onChange?.();
  }

  async function loadEntrance(asset: EntranceAsset) {
    if (asset.status !== 'waiting' && asset.status !== 'failed') return;
    asset.status = 'loading';
    const map = await loadTexture(asset.path);
    if (disposed) return;
    asset.status = map ? 'ready' : 'failed';
    if (!map) return;
    if (asset === entrancePattern) {
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.needsUpdate = true;
    }
    for (const face of asset.faces) {
      face.material.map = map;
      face.material.needsUpdate = true;
      face.visible = true;
    }
    options.onChange?.();
  }

  async function loadWallMarkers() {
    const map = await loadTexture(lotusPath);
    if (disposed || !map) return;
    map.offset.set(16 / 290, 11 / 200);
    map.repeat.set(258 / 290, 176 / 200);
    lotusMaterial.map = map;
    lotusMaterial.needsUpdate = true;
    for (const face of wallMarkers.keys()) face.visible = true;
    options.onChange?.();
  }

  function startImages() {
    imagesStarted = true;
    const available = [...panels.values()].filter(panel => panel.image);
    // The wall opposite the stairs becomes readable first. A slow reference
    // image never blocks the other walls, the camera, or opening its card.
    const queue = [
      loadWallMarkers,
      ...available.filter(panel => panel.wall === 'B').map(panel => () => loadPanel(panel)),
      ...decorations.map(decoration => () => loadDecoration(decoration)),
      ...available.filter(panel => panel.wall !== 'B').map(panel => () => loadPanel(panel)),
    ];
    let next = 0;
    async function loadNext() {
      while (!disposed && next < queue.length) await queue[next++]();
    }
    for (let worker = 0; worker < 3; worker++) void loadNext();
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return {
    update(_position: WorldPoint, surfaceId: string | null | undefined, dt: number, gateLocked: boolean,
      reduced: boolean, hallAGateLocked = options.hallAGateLocked ?? false) {
      if (disposed) return;
      const entrance = surfaceId ? entranceSigns.find(sign => sign.near.includes(surfaceId)) : undefined;
      if (entrance && entrance !== currentEntrance) {
        void loadEntrance(entrance.asset);
        void loadEntrance(jambs);
        void loadEntrance(entrancePattern);
      }
      currentEntrance = entrance;
      if (surfaceId && hallBImageSurfaces.has(surfaceId) && !imagesStarted) startImages();
      const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .15) : 0;
      bGate.update(step, gateLocked, reduced);
      aGate.update(step, hallAGateLocked, reduced);
    },
    isGateBlocking: () => !disposed && bGate.blocking(),
    isHallAGateBlocking: () => !disposed && aGate.blocking(),
    setViewingRoomReady() { aRecess.visible = bRecess.visible = false; },
    pick(scene: THREE.Object3D, camera: THREE.Camera, point: { x: number; y: number }, surfaceId: string | null | undefined, ignored: THREE.Object3D): MogaoExhibitTarget | null {
      if (disposed || surfaceId !== 'hall-b' || !Number.isFinite(point.x) || !Number.isFinite(point.y)
        || Math.abs(point.x) > 1 || Math.abs(point.y) > 1) return null;
      scene.updateMatrixWorld(true);
      camera.updateWorldMatrix(true, false);
      ray.layers.mask = camera.layers.mask;
      ray.setFromCamera(ndc.set(point.x, point.y), camera);
      const hit = ray.intersectObject(scene, true).find(candidate => visibleIntersection(candidate, ignored));
      if (!hit) return null;
      const wall = wallMarkers.get(hit.object);
      return wall ? `wall-${wall}` : panels.get(hit.object)?.id ?? null;
    },
    inspect() {
      return {
        gate: bGate.inspect(),
        hallAGate: aGate.inspect(),
        viewingRecess: { hallA: aRecess.visible, hallB: bRecess.visible },
        entranceSigns: entranceSigns.map(({ id, title, underRoof, asset, face }) => ({
          id, title, underRoof, status: asset.status, visible: face.visible, patternReady: entrancePattern.status === 'ready',
          center: face.getWorldPosition(new THREE.Vector3()).toArray(),
        })),
        imagesStarted,
        decorativeLights: { fixtures: fixtures.barrel.length, drawBatches: fixtureBatches.length, dynamicLights: 0 },
        panels: [...panels.values()].map(({ id, exhibitId, wall, face, status, crop }) => ({
          id, exhibitId, wall, status, crop, center: face.getWorldPosition(new THREE.Vector3()).toArray(),
          width: face.geometry.parameters.width, height: face.geometry.parameters.height,
        })),
        wallMarkers: [...wallMarkers].map(([face, wall]) => ({
          id: `wall-${wall}` as const, wall, visible: face.visible,
          center: face.getWorldPosition(new THREE.Vector3()).toArray(), width: lotusWidth, height: lotusHeight,
          hitWidth: lotusHitWidth, hitHeight: lotusHitHeight,
        })),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      group.removeFromParent();
      for (const [object, visible] of hiddenGraybox) object.visible = visible;
      hiddenGraybox.clear();
      for (const batch of fixtureBatches) batch.dispose();
      for (const surface of geometry) surface.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      for (const bitmap of bitmaps) bitmap.close();
      panels.clear();
      wallMarkers.clear();
      group.clear();
    },
  };
}
