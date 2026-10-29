import { inflateSync } from 'node:zlib';

/** Lossless RGB/RGBA PNG decoding for offline region-map checks; never resize ID pixels. */
export function readPng(data: Buffer): { width: number; height: number; channels: number; pixels: Uint8Array } {
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('区域图不是 PNG');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  const depth = data[24], type = data[25];
  const channels = type === 2 ? 3 : type === 6 ? 4 : 0;
  if (depth !== 8 || !channels || data[28] !== 0) throw new Error('区域图须为8位RGB/RGBA、非交错PNG');
  const chunks: Buffer[] = [];
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = data.readUInt32BE(offset);
    if (data.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(data.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error('区域图像素数据长度错误');
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error('区域图包含未知PNG滤波器');
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y ? pixels[row - stride + x] : 0;
      const upperLeft = y && x >= channels ? pixels[row - stride + x - channels] : 0;
      const p = left + up - upperLeft;
      const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upperLeft);
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft;
      pixels[row + x] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255;
    }
  }
  return { width, height, channels, pixels };
}
