import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { worldAssetUrl } from '../../src/content/world/assets';
import { worldStoryPreview } from '../../src/content/world/stories';
import sourceManifest from '../../art-source/world/nine-colored-deer/v001/source-manifest.json';

const root = new URL('../../', import.meta.url);
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

// These preview derivatives deliberately use opaque RGB VP8 WebP, written by
// prepare-world-preview.py. Read their actual key-frame dimensions, not filenames.
function previewWebpSize(data: Buffer) {
  expect(data.toString('ascii', 0, 4)).toBe('RIFF');
  expect(data.toString('ascii', 8, 12)).toBe('WEBP');
  expect(data.toString('ascii', 12, 16)).toBe('VP8 ');
  expect([...data.subarray(23, 26)]).toEqual([0x9d, 0x01, 0x2a]);
  return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
}

describe('3D故事资源与原稿登记', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('相对路径随部署子目录生成，不跳回站点根目录', () => {
    vi.stubEnv('BASE_URL', '/dunhuang-treasure-hunt/');
    expect(worldAssetUrl('story/v001/full-scroll.webp'))
      .toBe('/dunhuang-treasure-hunt/assets/world/story/v001/full-scroll.webp');
    vi.stubEnv('BASE_URL', './');
    expect(worldAssetUrl('story/v001/full-scroll.webp')).toBe('./assets/world/story/v001/full-scroll.webp');
  });

  it.each([
    '', '/story/v001/full-scroll.webp', '//example.com/image.webp', 'https://example.com/image.webp',
    '../private.webp', 'story/../../private.webp', 'story/./full-scroll.webp',
    'story\\..\\private.webp', 'story/%2e%2e/private.webp', 'story/%252e%252e/private.webp',
    'story//full-scroll.webp', 'story/image.webp?redirect=../private',
  ])('拒绝绝对、空白或可逃逸路径 %j', path => {
    expect(() => worldAssetUrl(path)).toThrow(/relative/);
  });

  it('两段预览和全卷各指向独立存在的运行图，与归档哈希、尺寸和字节数一致', () => {
    expect(worldStoryPreview.segments.map(segment => segment.id))
      .toEqual(['rescue-and-promise', 'appeal-to-the-king']);
    const images = [worldStoryPreview.fullImage, ...worldStoryPreview.segments.map(segment => segment.image)];
    expect(new Set(images.map(image => image.url)).size).toBe(images.length);
    expect(images).toHaveLength(sourceManifest.files.length);

    for (const image of images) {
      const record = sourceManifest.files.find(file => image.url.endsWith(file.runtimeFile));
      expect(record, image.url).toBeDefined();
      if (!record) throw new Error(`Missing source record: ${image.url}`);
      const runtime = readFileSync(fileURLToPath(new URL(`public/${record.runtimeFile}`, root)));
      const archived = readFileSync(fileURLToPath(new URL(`art-source/world/nine-colored-deer/v001/${record.sourceFile}`, root)));
      expect(hash(runtime), record.runtimeFile).toBe(record.runtimeSha256);
      expect(hash(archived), record.sourceFile).toBe(record.sourceSha256);
      expect(runtime.byteLength).toBe(record.runtimeBytes);
      expect(archived.byteLength).toBe(record.sourceBytes);
      expect(previewWebpSize(runtime)).toEqual({ width: image.width, height: image.height });
      expect(image.width).toBe(record.runtimeWidth);
      expect(image.height).toBe(record.runtimeHeight);
      // At most one output pixel of rounding is allowed; the whole image stays intact.
      expect(Math.abs(image.height - image.width * record.sourceHeight / record.sourceWidth)).toBeLessThanOrEqual(1);
      expect(image.alt.length).toBeGreaterThan(0);
    }
  });
});
