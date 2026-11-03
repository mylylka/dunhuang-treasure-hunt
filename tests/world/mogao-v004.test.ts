import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {MOGAO_ROAD,mogaoSurfaceHeight as oldHeight} from '../../src/world/mogao-rules-v003';
import {mogaoSandHeightV4,mogaoSurfaceHeightV4} from '../../src/world/mogao-surface-v004';
import sand from '../../src/content/world/mogao-surface-v004.json';

describe('Blender cliff-foot sand integration',()=>{
 it('leaves the full stone road and main staircase unobstructed',()=>{
  for(const section of MOGAO_ROAD)for(const p of [section.left,section.center,section.right]){
   expect(mogaoSandHeightV4(p)).toBe(0);
   expect(mogaoSurfaceHeightV4(p)).toBe(oldHeight(p));
  }
  for(const x of [118,119,122,124])for(let z=-39;z>=-70;z-=.25){
   expect(mogaoSandHeightV4({x,z})).toBe(0);
   expect(mogaoSurfaceHeightV4({x,z})).toBe(oldHeight({x,z}));
  }
 });
 it('keeps the accepted room floor and distant ground at their previous heights',()=>{
  for(const x of [111,122,133])for(const z of [-72,-80,-99])expect(mogaoSurfaceHeightV4({x,z})).toBe(oldHeight({x,z}));
  for(const p of [{x:0,z:0},{x:122,z:45},{x:40,z:-60},{x:200,z:-60}])expect(mogaoSurfaceHeightV4(p)).toBe(oldHeight(p));
 });
 it('has low continuous slopes that meet zero at all outside edges',()=>{
  const h=sand.heights;let maximum=0,gradient=0;
  for(let y=0;y<h.length;y++)for(let x=0;x<h[y].length;x++){
   maximum=Math.max(maximum,h[y][x]);
   if(!x||!y||x===h[y].length-1||y===h.length-1)expect(h[y][x]).toBe(0);
   if(x)gradient=Math.max(gradient,Math.abs(h[y][x]-h[y][x-1])/sand.step);
   if(y)gradient=Math.max(gradient,Math.abs(h[y][x]-h[y-1][x])/sand.step);
  }
  expect(maximum).toBeGreaterThan(1);expect(maximum).toBeLessThan(2);
  expect(gradient).toBeLessThan(.95);
 });
 it('loads an optimized two-batch model with its base at world zero and sand below two metres',()=>{
  const b=readFileSync('public/assets/world/mogao/v004/exterior.glb');
  const n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString());
  expect(g.meshes).toHaveLength(2);expect(b.length).toBeLessThan(6_000_000);
  const node=g.nodes.find((item:{name:string})=>item.name.startsWith('export-regional-sand-base'));
  const primitive=g.meshes[node.mesh].primitives[0],a=g.accessors[primitive.attributes.POSITION],v=g.bufferViews[a.bufferView];
  const offset=28+n+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12,heights=[];
  for(let i=0;i<a.count;i++)heights.push(b.readFloatLE(offset+i*stride+4)+node.translation[1]+sand.origin[1]);
  expect(Math.min(...heights)).toBeCloseTo(-.2,4);
  expect(Math.max(...heights)).toBeCloseTo(sand.maximumHeight,4);
  expect(heights.filter(h=>Math.abs(h)<.0001).length).toBeGreaterThanOrEqual(4);
 });
});
