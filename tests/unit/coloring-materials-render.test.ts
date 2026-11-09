import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLORING_MATERIALS, getColoringMaterialTile, getMaterialPreviewDataUrl, isColoringMaterial,
  sampleColoringMaterial } from '../../src/games/coloring/materials';
import { createColoringArtworkRenderer } from '../../src/games/coloring/render';
import type { RegionMaterials } from '../../src/types';

class PixelImage {
  constructor(readonly naturalWidth: number, readonly naturalHeight: number, readonly pixels: Uint8ClampedArray) {}
}
class PixelCanvas {
  width = 0;
  height = 0;
  context = new PixelContext(this);
  getContext() { return this.context; }
  toDataURL() { return `data:image/png;base64,${Buffer.from(this.context.data).toString('base64')}`; }
}
/** Small native-pixel Canvas double: exercises the renderer, including multiply and region isolation. */
class PixelContext {
  data = new Uint8ClampedArray();
  globalCompositeOperation = 'source-over';
  imageSmoothingEnabled = true;
  operations: string[] = [];
  writes = 0;
  constructor(private canvas: PixelCanvas) {}
  private allocate() { if (this.data.length !== this.canvas.width * this.canvas.height * 4) this.data = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4); }
  createImageData(width: number, height: number) { return { data: new Uint8ClampedArray(width * height * 4), width, height }; }
  putImageData(image: { data: Uint8ClampedArray }) { this.allocate(); this.data.set(image.data); this.writes++; }
  getImageData() { this.allocate(); return { data: this.data.slice() }; }
  clearRect() { this.allocate(); this.data.fill(0); }
  drawImage(image: PixelImage | PixelCanvas) {
    this.allocate();
    const source = image instanceof PixelCanvas ? image.context.data : image.pixels;
    this.operations.push(this.globalCompositeOperation);
    for (let offset = 0; offset < source.length; offset += 4) {
      for (let channel = 0; channel < 3; channel++) this.data[offset + channel] = this.globalCompositeOperation === 'multiply'
        ? Math.round(this.data[offset + channel] * source[offset + channel] / 255) : source[offset + channel];
      this.data[offset + 3] = source[offset + 3];
    }
  }
}

function artwork(width = 12, height = 4, region = (x: number) => x < 4 ? 1 : x < 8 ? 2 : 0) {
  const ink = new Uint8ClampedArray(width * height * 4).fill(255);
  const ids = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    ids[offset] = region(x); ids[offset + 3] = 255;
  }
  return { line: new PixelImage(width, height, ink), map: new PixelImage(width, height, ids) };
}
function rendererFor(images = artwork()) {
  return createColoringArtworkRenderer(images.line as unknown as HTMLImageElement, images.map as unknown as HTMLImageElement);
}
function pixel(renderer: ReturnType<typeof rendererFor>, x: number, y = 0) {
  return [...(renderer.canvas as unknown as PixelCanvas).context.data.slice((y * renderer.width + x) * 4, (y * renderer.width + x) * 4 + 3)];
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('静态版本化金银箔纹', () => {
  it('纯Node import和采样无需DOM/随机数；两种材质各生成一次并保持周期锚定', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unseeded random texture'); });
    expect(COLORING_MATERIALS.map(material => material.id)).toEqual(['sparkle-gold-v001', 'sparkle-silver-v001']);
    expect(isColoringMaterial('sparkle-gold-v001')).toBe(true);
    expect(isColoringMaterial('sparkle-gold-v002')).toBe(false);
    for (const material of COLORING_MATERIALS) {
      const tile = getColoringMaterialTile(material.id);
      expect(getColoringMaterialTile(material.id)).toBe(tile);
      expect(tile.size).toBe(256);
      expect(tile.pixels).toHaveLength(256 * 256 * 4);
      expect([...tile.pixels.filter((_value, index) => index % 4 === 3)].every(value => value === 255)).toBe(true);
      for (const [x, y] of [[0, 0], [17, 51], [255, 255], [-1, -17]]) {
        expect(sampleColoringMaterial(material.id, x + tile.size, y - tile.size)).toEqual(sampleColoringMaterial(material.id, x, y));
      }
    }
  });

  it('箔片有成片明暗与稀疏高光，金暖银冷，区别于同密度独立白噪声', () => {
    for (const material of COLORING_MATERIALS) {
      const tile = getColoringMaterialTile(material.id), luminance: number[] = [], channels = [0, 0, 0];
      let near = 0, far = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const offset = (y * 256 + x) * 4;
        luminance.push((tile.pixels[offset] + tile.pixels[offset + 1] + tile.pixels[offset + 2]) / 3);
        for (let channel = 0; channel < 3; channel++) channels[channel] += tile.pixels[offset + channel];
        near += Math.abs(tile.pixels[offset] - tile.pixels[(y * 256 + (x + 1) % 256) * 4]);
        far += Math.abs(tile.pixels[offset] - tile.pixels[(y * 256 + (x + 19) % 256) * 4]);
      }
      luminance.sort((a, b) => a - b);
      expect(luminance[Math.floor(luminance.length * .95)] - luminance[Math.floor(luminance.length * .05)]).toBeGreaterThan(75);
      expect(luminance.filter(value => value > 230).length / luminance.length).toBeGreaterThan(.005);
      expect(luminance.filter(value => value < 110).length / luminance.length).toBeGreaterThan(.02);
      expect(near / far).toBeLessThan(.55);
      if (material.id === 'sparkle-gold-v001') expect(channels[0] / channels[2]).toBeGreaterThan(2);
      else expect(Math.abs(channels[0] - channels[2]) / luminance.length).toBeLessThan(25);
    }
  });

  it('预览同步生成且同ID复用一次data URL，不在每次UI渲染重建Canvas', () => {
    const create = vi.fn(() => new PixelCanvas());
    vi.stubGlobal('document', { createElement: create });
    for (const material of COLORING_MATERIALS) {
      const url = getMaterialPreviewDataUrl(material.id);
      expect(url.startsWith('data:image/png;base64,')).toBe(true);
      expect(getMaterialPreviewDataUrl(material.id)).toBe(url);
    }
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('原图坐标材质填色与缓存过渡', () => {
  beforeEach(() => vi.stubGlobal('document', { createElement: () => new PixelCanvas() }));

  it('只改蒙版内对应region，保留黑线/半透明感边缘的multiply和旧纯色表现', () => {
    const images = artwork();
    for (const channel of [0, 1, 2]) {
      images.line.pixels[(1 * 12 + 2) * 4 + channel] = 0;
      images.line.pixels[(1 * 12 + 3) * 4 + channel] = 128;
    }
    const renderer = rendererFor(images);
    renderer.render({ 1: '#ffffff', 2: '#336699' }, { 1: 'sparkle-gold-v001' });
    expect(pixel(renderer, 1)).toEqual(sampleColoringMaterial('sparkle-gold-v001', 1, 0));
    expect(pixel(renderer, 2, 1)).toEqual([0, 0, 0]);
    expect(pixel(renderer, 3, 1)).toEqual(sampleColoringMaterial('sparkle-gold-v001', 3, 1).map(value => Math.round(value * 128 / 255)));
    expect(pixel(renderer, 5)).toEqual([51, 102, 153]);
    expect(pixel(renderer, 10)).toEqual([255, 255, 255]);
    expect(renderer.regionAt(5, 1)).toBe(2);
    expect(renderer.regionAt(-1, 1)).toBe(0);
    expect((renderer.canvas as unknown as PixelCanvas).context.operations).toContain('multiply');
  });

  it('跨region、跨tile周期、重新创建作品始终采样相同原图像素；纯色覆盖与擦除清纹', () => {
    const images = artwork(520, 2, x => x < 260 ? 1 : 2);
    const renderer = rendererFor(images), other = rendererFor(images);
    const colors = { 1: '#d6a229', 2: '#d6a229' }, materials: RegionMaterials = { 1: 'sparkle-gold-v001', 2: 'sparkle-gold-v001' };
    renderer.render(colors, materials); other.render(colors, materials);
    expect(pixel(renderer, 4, 1)).toEqual(pixel(renderer, 260, 1));
    expect(pixel(renderer, 260, 1)).toEqual(pixel(renderer, 516, 1));
    expect(pixel(other, 517, 1)).toEqual(sampleColoringMaterial('sparkle-gold-v001', 517, 1));
    renderer.render({ 1: '#123456' });
    expect(pixel(renderer, 4)).toEqual([18, 52, 86]);
    expect(pixel(renderer, 260)).toEqual([255, 255, 255]);
    renderer.render({});
    expect(pixel(renderer, 4)).toEqual([255, 255, 255]);
  });

  it('纯色/金/银过渡端点精确，中点只混合改变region；中断后可准确回到同一个from状态', () => {
    const renderer = rendererFor();
    const from = { 1: '#003366', 2: '#3456ff' }, to = { 1: '#d6a229', 2: '#3456ff' };
    const gold: RegionMaterials = { 1: 'sparkle-gold-v001' }, silver: RegionMaterials = { 1: 'sparkle-silver-v001' };
    renderer.renderTransition(from, {}, to, gold, .5);
    expect(pixel(renderer, 1)).toEqual(sampleColoringMaterial('sparkle-gold-v001', 1, 0).map((value, channel) => Math.round([0, 51, 102][channel] * .5 + value * .5)));
    expect(pixel(renderer, 5)).toEqual([52, 86, 255]);
    renderer.render(from);
    expect(pixel(renderer, 1)).toEqual([0, 51, 102]);
    renderer.renderTransition(from, {}, to, gold, 1);
    expect(pixel(renderer, 1)).toEqual(sampleColoringMaterial('sparkle-gold-v001', 1, 0));
    renderer.renderTransition(to, gold, to, silver, .25);
    const a = sampleColoringMaterial('sparkle-gold-v001', 1, 0), b = sampleColoringMaterial('sparkle-silver-v001', 1, 0);
    expect(pixel(renderer, 1)).toEqual(a.map((value, channel) => Math.round(value * .75 + b[channel] * .25)));
    renderer.renderTransition(to, gold, to, silver, 1);
    expect(pixel(renderer, 1)).toEqual(b);
    renderer.renderTransition(to, silver, {}, {}, 1);
    expect(pixel(renderer, 1)).toEqual([255, 255, 255]);
    expect(pixel(renderer, 5)).toEqual([255, 255, 255]);
  });

  it('多帧复用固定tile，重复静态渲染不重写填充层，未知材质回退纯色', () => {
    const canvasFactory = vi.fn(() => new PixelCanvas());
    vi.stubGlobal('document', { createElement: canvasFactory });
    const renderer = rendererFor();
    const colors = { 1: '#bdc4cb' }, materials: RegionMaterials = { 1: 'sparkle-silver-v001' };
    renderer.render(colors, materials);
    const fill = canvasFactory.mock.results[1].value;
    const writes = fill.context.writes;
    renderer.render({ ...colors }, { ...materials });
    expect(fill.context.writes).toBe(writes);
    const tile = getColoringMaterialTile('sparkle-silver-v001');
    for (const t of [.1, .2, .4, .8]) renderer.renderTransition({}, {}, colors, materials, t);
    expect(getColoringMaterialTile('sparkle-silver-v001')).toBe(tile);
    expect(canvasFactory).toHaveBeenCalledTimes(3);
    renderer.render(colors, { 1: 'bad' } as unknown as RegionMaterials);
    expect(pixel(renderer, 1)).toEqual([189, 196, 203]);
  });
});
