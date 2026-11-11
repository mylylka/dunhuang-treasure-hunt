/** Read the dimensions advertised by a WebP image without decoding its pixels. */
export function readWebPSize(data: Buffer): [number, number] {
  if (data.length < 20 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('不是WebP图片');
  }
  for (let offset = 12; offset + 8 <= data.length;) {
    const chunk = data.toString('ascii', offset, offset + 4), length = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > data.length) throw new Error('WebP数据不完整');
    if (chunk === 'VP8X' && length >= 10) return [1 + data.readUIntLE(start + 4, 3), 1 + data.readUIntLE(start + 7, 3)];
    if (chunk === 'VP8 ' && length >= 10 && data.toString('hex', start + 3, start + 6) === '9d012a') {
      return [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
    }
    if (chunk === 'VP8L' && length >= 5 && data[start] === 0x2f) {
      const packed = data.readUInt32LE(start + 1);
      return [1 + (packed & 0x3fff), 1 + ((packed >>> 14) & 0x3fff)];
    }
    offset = start + length + (length % 2);
  }
  throw new Error('WebP缺少尺寸信息');
}
