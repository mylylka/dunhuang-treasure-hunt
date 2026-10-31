import { BufferGeometry, Float32BufferAttribute } from 'three';

type Point = [number, number, number];

/** These meshes have a strict [-1,1] envelope, scaled only by scenery.ts. */
function facetedMesh(vertices: Point[], faces: number[][]): BufferGeometry {
  const positions: number[] = [];
  for (const face of faces) for (let i = 1; i < face.length - 1; i++) {
    positions.push(...vertices[face[0]], ...vertices[face[i]], ...vertices[face[i + 1]]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // Split triangle vertices deliberately retain the broad rock planes.
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function variation(seed: number, index: number) {
  const n = Math.sin(seed * 7.13 + index * 11.79) * 1847.17;
  return n - Math.floor(n);
}

/** A broad, asymmetric multi-peak ridge, not a stretched sphere or cylinder. */
export function createRidgeGeometry(seed: number, axis: 'x' | 'z' = 'x', cliff = false): BufferGeometry {
  const stations = [-1, -.82, -.57, -.31, -.05, .21, .48, .74, 1];
  const profile = [.14, .55, .86, .49, 1, .60, .84, .47, .16];
  const vertices: Point[] = [];
  const faces: number[][] = [];
  for (let i = 0; i < stations.length; i++) {
    const edge = i === 0 || i === stations.length - 1;
    const x = stations[i] + (edge ? 0 : (variation(seed, i) - .5) * .12);
    const peak = profile[i] * (.85 + variation(seed, i + 12) * .15);
    const crestZ = (variation(seed, i + 27) - .5) * .35;
    // The nearer cliff presents broken steep faces and shoulders. Distant
    // ridges retain long, triangular slopes and a zigzag mountain silhouette.
    const section: Point[] = cliff ? [
      [x, -1, -1], [x, peak * .57, -.81 + variation(seed, i + 40) * .13],
      [x, peak, crestZ], [x, peak * .65, .48 + variation(seed, i + 50) * .15], [x, -1, 1],
    ] : [
      [x, -.17, -1], [x, peak * .42, -.59 + variation(seed, i + 40) * .14],
      [x, peak, crestZ], [x, peak * .48, .54 + variation(seed, i + 50) * .13], [x, -.17, 1],
    ];
    for (const point of section) vertices.push(axis === 'x' ? point : [point[2], point[1], -point[0]]);
  }
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < 4; j++) {
    const a = i * 5 + j, b = a + 5;
    if ((i + j + seed) % 2) faces.push([a, a + 1, b], [a + 1, b + 1, b]);
    else faces.push([a, a + 1, b + 1], [a, b + 1, b]);
  }
  // Closed end sections and buried underside keep views from behind valid.
  faces.push([4, 3, 2, 1, 0], [40, 41, 42, 43, 44], [0, 40, 44, 4]);
  return facetedMesh(vertices, faces);
}

/** Angular broken stone with unequal shoulders and an offset top. */
export function createBoundaryStoneGeometry(seed: number): BufferGeometry {
  const vertices: Point[] = [], faces: number[][] = [];
  const count = 7;
  for (let row = 0; row < 3; row++) for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count + .17;
    const radius = (row === 2 ? .60 : row === 1 ? 1 : .85) * (.76 + variation(seed, i) * .22);
    const y = row === 0 ? -1 : row === 1 ? -.12 + variation(seed, i + 9) * .28 : .56 + variation(seed, i + 20) * .30;
    vertices.push([Math.cos(angle) * radius + (row === 2 ? .12 : 0), y, Math.sin(angle) * radius - (row === 2 ? .09 : 0)]);
  }
  vertices.push([.10, 1, -.12]);
  for (let row = 0; row < 2; row++) for (let i = 0; i < count; i++) {
    const a = row * count + i, b = row * count + (i + 1) % count;
    faces.push([a, a + count, b + count, b]);
  }
  for (let i = 0; i < count; i++) faces.push([14 + i, 21, 14 + (i + 1) % count]);
  faces.push([0, 1, 2, 3, 4, 5, 6]);
  return facetedMesh(vertices, faces);
}
