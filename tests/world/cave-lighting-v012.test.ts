import { describe, expect, it } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { caveEntryAdaptationTarget } from '../../src/world/cave-lighting-v012';
import { createCaveLighting, caveSurfaceGain } from '../../src/world/cave-lighting-v008';

describe('entrance adaptation',()=>{
  it('stays dark outside, reveals within the tunnel, and retains the dim interior endpoint',()=>{
    expect(caveEntryAdaptationTarget(122,-61)).toBe(0);
    expect(caveEntryAdaptationTarget(122,-65.6)).toBeCloseTo(0);
    expect(caveEntryAdaptationTarget(122,-68)).toBeGreaterThan(.1);
    expect(caveEntryAdaptationTarget(122,-71)).toBeGreaterThan(.45);
    expect(caveEntryAdaptationTarget(122,-77)).toBe(1);
    expect(caveSurfaceGain(caveEntryAdaptationTarget(122,-79))).toBe(.484);
    // Walking beside the building is not entering the narrow passage.
    expect(caveEntryAdaptationTarget(130,-70)).toBe(0);
    expect(caveEntryAdaptationTarget(150,-79)).toBe(0);
  });
  it('has a continuous monotone spatial ramp in both travel directions',()=>{
    let previous=0;
    for(let depth=-5;depth<=12;depth+=.01){
      const next=caveEntryAdaptationTarget(122,-68-depth);
      expect(next).toBeGreaterThanOrEqual(previous);
      expect(next-previous).toBeLessThan(.002);
      previous=next;
    }
  });
  it('continues fading while standing still, reverses on exit, and never modifies the original material color',()=>{
    const material=new MeshStandardMaterial({color:0x907050});
    const base=material.color.clone(),root=new Group(),geometry=new BoxGeometry();
    root.add(new Mesh(geometry,material));
    const lighting=createCaveLighting(true,caveEntryAdaptationTarget);
    lighting.addCave(root);
    lighting.update(new Vector3(122,8,-61),0,true);
    const point=new Vector3(122,8,-71),desired=caveEntryAdaptationTarget(point.x,point.z);
    lighting.update(point,.1,false);const first=lighting.inspect().adaptation;
    expect(first).toBeGreaterThan(0);expect(first).toBeLessThan(desired);
    for(let i=0;i<100;i++)lighting.update(point,.05,false);
    expect(lighting.inspect().adaptation).toBeCloseTo(desired,2);
    const settled=lighting.inspect().gain;
    lighting.update(point,.05,true);
    expect(material.color.r).toBeCloseTo(base.r*lighting.inspect().gain);
    expect(lighting.inspect().gain).toBeGreaterThanOrEqual(settled);
    lighting.update(new Vector3(122,8,-61),.1,false);
    expect(lighting.inspect().adaptation).toBeLessThan(desired);
    lighting.update(new Vector3(122,8,-61),0,true);
    expect(lighting.inspect().gain).toBe(.004);
    geometry.dispose();material.dispose();
  });
});
