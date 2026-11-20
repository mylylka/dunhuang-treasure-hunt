// Offline worker. The subset consists of original vertex indices so exposure and texture coordinates stay aligned.
import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [input, output, target, maxError] = process.argv.slice(2);
const data = readFileSync(input);
const [vertices, indices, channels] = new Uint32Array(data.buffer, data.byteOffset, 3);
let offset = data.byteOffset + 12;
const positions = new Float32Array(data.buffer, offset, vertices * 3);
offset += positions.byteLength;
const attributes = new Float32Array(data.buffer, offset, vertices * channels);
offset += attributes.byteLength;
const triangles = new Uint32Array(data.buffer, offset, indices);
await MeshoptSimplifier.ready;
offset += triangles.byteLength;
const lock = offset < data.byteOffset + data.byteLength ? new Uint8Array(data.buffer, offset, vertices) : null;
const [result] = MeshoptSimplifier.simplifyWithAttributes(
  triangles, positions, 3, attributes, channels,
  new Array(channels).fill(.075), lock, Number(target) * 3, Number(maxError), ['Permissive'],
);
writeFileSync(output, Buffer.from(result.buffer, result.byteOffset, result.byteLength));
