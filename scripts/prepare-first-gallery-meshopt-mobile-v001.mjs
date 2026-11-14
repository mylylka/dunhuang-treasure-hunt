// Losslessly encode existing first-gallery GLB buffer views for phone streaming.
// No positions, topology, textures, nodes, materials, skins or animation values change.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const meshoptVersion = JSON.parse(await readFile('node_modules/meshoptimizer/package.json', 'utf8')).version;
const sha = (b) => createHash('sha256').update(b).digest('hex');
const extension = 'EXT_meshopt_compression';
const targets = [
  ['public/assets/world/courtyard/v007/courtyard.glb', 'public/assets/world/courtyard/v007/courtyard-meshopt-mobile.glb'],
  ['public/assets/world/traveler-tripo/v002/traveler.glb', 'public/assets/world/traveler-tripo/v002/traveler-meshopt-mobile.glb'],
];
const records = [];
for (const [source, output] of targets) {
  const data = await readFile(source);
  if (data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) throw Error(`Invalid GLB: ${source}`);
  const jsonLength = data.readUInt32LE(12), binStart = 20 + jsonLength;
  if (data.toString('ascii', binStart + 4, binStart + 8) !== 'BIN\0') throw Error('Missing BIN chunk');
  const meta = JSON.parse(data.toString('utf8', 20, binStart));
  if (meta.buffers.length !== 1 || meta.buffers[0].uri || meta.extensionsUsed?.includes(extension)) throw Error('Unsupported input buffer layout');
  const bin = data.subarray(binStart + 8);
  const imageViews = new Set((meta.images || []).map((i) => i.bufferView));
  let pieces = [], current = 0, fallback = 0, compressedViews = 0;
  const append = (bytes) => {
    const padding = (4 - current % 4) % 4;
    if (padding) { pieces.push(Buffer.alloc(padding)); current += padding; }
    const offset = current; pieces.push(Buffer.from(bytes)); current += bytes.length; return offset;
  };
  for (const [index, view] of meta.bufferViews.entries()) {
    if (view.buffer !== 0 || view.extensions) throw Error('Unexpected buffer view layout');
    const original = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    let best = null;
    if (!imageViews.has(index) && original.length >= 64 && original.length % 4 === 0) {
      const strides = [view.byteStride, 12, 16, 8, 4].filter((x, i, a) => x && x % 4 === 0 && x <= 256 && original.length % x === 0 && a.indexOf(x) === i);
      for (const stride of strides) {
        const count = original.length / stride;
        const encoded = MeshoptEncoder.encodeGltfBuffer(original, count, stride, 'ATTRIBUTES');
        if (!best || encoded.length < best.bytes.length) best = { bytes: encoded, count, stride };
      }
    }
    if (best && best.bytes.length + 100 < original.length) {
      const decoded = new Uint8Array(original.length);
      MeshoptDecoder.decodeGltfBuffer(decoded, best.count, best.stride, best.bytes, 'ATTRIBUTES');
      if (!Buffer.from(decoded).equals(original)) throw Error(`Non-lossless view ${index}`);
      const byteOffset = append(best.bytes);
      fallback += (4 - fallback % 4) % 4;
      view.buffer = 1; view.byteOffset = fallback; fallback += original.length;
      view.extensions = { [extension]: { buffer: 0, byteOffset, byteLength: best.bytes.length, byteStride: best.stride, count: best.count, mode: 'ATTRIBUTES' } };
      compressedViews++;
    } else {
      view.byteOffset = append(original);
    }
  }
  append(Buffer.alloc(0));
  meta.buffers = [{ byteLength: current }, { byteLength: fallback, extensions: { [extension]: { fallback: true } } }];
  meta.extensionsUsed = [...(meta.extensionsUsed || []), extension];
  meta.extensionsRequired = [...(meta.extensionsRequired || []), extension];
  let json = Buffer.from(JSON.stringify(meta)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const binary = Buffer.concat(pieces); const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8); header.writeUInt32LE(json.length, 12); header.write('JSON', 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.write('BIN\0', 4);
  const result = Buffer.concat([header, json, binHeader, binary]);
  await writeFile(output, result, { flag: 'wx' }).catch(async e => { if (e.code !== 'EEXIST' || !(await readFile(output)).equals(result)) throw e; });
  records.push({ source, sourceBytes: data.length, sourceSha256: sha(data), output, outputBytes: result.length, outputSha256: sha(result), compressedViews, verification: 'Every compressed buffer view was decoded and compared byte-for-byte. Original GLB preserved.' });
  console.log(`${source}: ${data.length} -> ${result.length} bytes; ${compressedViews} verified views`);
}
const manifest = 'art-source/world/first-gallery-mobile/v001/meshopt-manifest.json';
await mkdir(dirname(manifest), { recursive: true });
const manifestData = Buffer.from(JSON.stringify({ encoder: `meshoptimizer@${meshoptVersion}`, encoding: 'EXT_meshopt_compression lossless ATTRIBUTES', records }, null, 2) + '\n');
await writeFile(manifest, manifestData, { flag: 'wx' }).catch(async e => { if (e.code !== 'EEXIST' || !(await readFile(manifest)).equals(manifestData)) throw e; });
