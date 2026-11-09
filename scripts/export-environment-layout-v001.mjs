import fs from 'node:fs';
import crypto from 'node:crypto';
import {environmentVisualHeight,environmentSampleAxes,environmentCaravanCrest,ENVIRONMENT_ROCKS,ENVIRONMENT_CARAVAN,ENVIRONMENT_GROUND_OFFSET} from '../src/content/world/environment-layout-v001.ts';
import {terrainHeight,TERRAIN_BOUNDS} from '../src/content/world/terrain-layout-v001.ts';
const {xs,zs}=environmentSampleAxes();
const heights=zs.flatMap(z=>xs.map(x=>Math.fround(environmentVisualHeight(x,z)+ENVIRONMENT_GROUND_OFFSET)));
let protectedSamples=0;
for(let x=TERRAIN_BOUNDS.minX;x<=TERRAIN_BOUNDS.maxX;x+=3)for(let z=TERRAIN_BOUNDS.minZ;z<=TERRAIN_BOUNDS.maxZ;z+=3){
  if(environmentVisualHeight(x,z)!==terrainHeight(x,z))throw Error(`Protected terrain changed ${x},${z}`);
  protectedSamples++;
}
const data={coordinates:'Three X/Z ground, Y up; Blender [x,-z,y]',xs:xs.map(Math.fround),zs:zs.map(Math.fround),heights,
  rocks:ENVIRONMENT_ROCKS,caravan:{...ENVIRONMENT_CARAVAN,points:ENVIRONMENT_CARAVAN.xs.map(x=>({x,z:environmentCaravanCrest(x)})),
    viewpoints:ENVIRONMENT_CARAVAN.viewpoints.map(p=>({...p,y:terrainHeight(p.x,p.z)+1.8}))},
  bounds:TERRAIN_BOUNDS,protectedSamples,layoutHash:crypto.createHash('sha256').update(fs.readFileSync('src/content/world/environment-layout-v001.ts')).digest('hex')};
fs.mkdirSync('work/world',{recursive:true});
fs.writeFileSync('work/world/environment-layout-v001.json',JSON.stringify(data));
console.log(JSON.stringify({vertices:heights.length,protectedSamples,layoutHash:data.layoutHash}));
