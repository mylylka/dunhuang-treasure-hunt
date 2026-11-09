import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createMusicInteriorDecoration } from '../../src/world/music-interior-decoration';
import { createMusicInteriorLighting, musicInteriorLightingShaderSource, musicInteriorAdaptationTarget, musicInteriorVolumeWeight } from '../../src/world/music-interior-lighting';
import { environmentShadowShaderSource } from '../../src/world/terrain-environment-lighting-v001';

function shader() {
  return { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }> };
}
async function fixture() {
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  root.position.set(17, 2.5, -8); root.rotation.y = THREE.MathUtils.degToRad(28);
  const wall = new THREE.MeshStandardMaterial({ color: '#e7d8b7', roughness: .91 }); wall.name = 'music-decor-plaster';
  root.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wall));
  const person = new THREE.MeshStandardMaterial({ color: '#74462e' }), outside = new THREE.MeshStandardMaterial({ color: '#a5bb8c' });
  const traveler = new THREE.SkinnedMesh(new THREE.BoxGeometry(), person), companion = new THREE.Mesh(new THREE.BoxGeometry(), person);
  scene.add(traveler, companion, new THREE.Mesh(new THREE.PlaneGeometry(), outside));
  const basic = new THREE.MeshBasicMaterial(); scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), basic));
  const sun = new THREE.DirectionalLight('#fff2d6', 2.4), sky = new THREE.HemisphereLight('#fff2d7', '#ab825a', .95);
  const external = new THREE.PointLight('#b7ccff', 3.7, 19, 2); external.position.set(300, 12, 80); scene.add(sun, sky, external);
  const decoration = createMusicInteriorDecoration(root, { loadFloralTexture: async () => ({ texture: new THREE.Texture() }) });
  await decoration.ready;
  return { scene, root, wall, person, outside, basic, sun, sky, external, decoration };
}

describe('scoped continuous music interior illumination', () => {
  it('registers shared PBR receivers including both actors and exterior, without changing albedo or external lights', async () => {
    const f = await fixture(), materials = [f.wall, f.person, f.outside];
    const originals = materials.map(m => ({ color: m.color.clone(), map: m.map, emissive: m.emissive.clone(), roughness: m.roughness,
      before: m.onBeforeCompile, key: m.customProgramCacheKey }));
    const basicHook = f.basic.onBeforeCompile, materialDispose = vi.spyOn(f.person, 'dispose');
    const lightState = [f.sun, f.sky, f.external].map(l => ({ color: l.color.clone(), intensity: l.intensity, position: l.position.clone() }));
    const lighting = createMusicInteriorLighting(f.scene, f.root);
    expect(lighting.inspect().lanterns).toBe(4); expect(lighting.inspect().extraShadowMaps).toBe(0);
    expect(lighting.inspect().materials).toBeGreaterThanOrEqual(3); expect(f.basic.onBeforeCompile).toBe(basicHook);
    for (const [i, material] of materials.entries()) {
      expect(material.onBeforeCompile).not.toBe(originals[i].before);
      expect(material.color.equals(originals[i].color)).toBe(true); expect(material.map).toBe(originals[i].map);
      expect(material.emissive.equals(originals[i].emissive)).toBe(true); expect(material.roughness).toBe(originals[i].roughness);
      const compiled = shader(); material.onBeforeCompile(compiled as never, {} as THREE.WebGLRenderer);
      expect(compiled.fragmentShader).toContain('musicInteriorWeight()');
    }
    for (const [i, light] of [f.sun, f.sky, f.external].entries()) {
      expect(light.color.equals(lightState[i].color)).toBe(true); expect(light.intensity).toBe(lightState[i].intensity);
      expect(light.position.equals(lightState[i].position)).toBe(true);
    }
    lighting.dispose(); lighting.dispose();
    for (const [i, material] of materials.entries()) {
      expect(material.onBeforeCompile).toBe(originals[i].before); expect(material.customProgramCacheKey).toBe(originals[i].key);
    }
    expect(materialDispose).not.toHaveBeenCalled(); expect(f.external.parent).toBe(f.scene);
    f.decoration.dispose();
  });

  it('chains the previous material hook, uses actual transformed lanterns and restores its program owner', async () => {
    const f = await fixture();
    let priorReceiver: THREE.Material | undefined;
    const prior = vi.fn(function(this: THREE.Material, source: ReturnType<typeof shader>) {
      priorReceiver = this; source.uniforms.uPrior = { value: 7 };
    });
    f.person.onBeforeCompile = prior; const key = () => 'prior-skin-program'; f.person.customProgramCacheKey = key;
    // A measured light may be adjusted after its fixture is created. Compiling
    // from config positions would pass an unperturbed fixture but miss this.
    const movedLantern = f.root.getObjectByName('music-interior-fill-under-upper-floor') as THREE.PointLight;
    movedLantern.position.add(new THREE.Vector3(.37, .11, -.23));
    const lighting = createMusicInteriorLighting(f.scene, f.root), source = shader();
    f.person.onBeforeCompile(source as never, {} as THREE.WebGLRenderer);
    expect(prior).toHaveBeenCalledOnce(); expect(source.uniforms.uPrior.value).toBe(7);
    expect(priorReceiver).toBe(f.person);
    const inverse = source.uniforms.uMusicInteriorFromWorld.value as THREE.Matrix4;
    const local = new THREE.Vector3(41, 5, -27), world = f.root.localToWorld(local.clone());
    expect(world.applyMatrix4(inverse).distanceTo(local)).toBeLessThan(1e-8);
    const lanterns: THREE.PointLight[] = []; f.root.traverse(o => { if (o instanceof THREE.PointLight && o.userData.musicInteriorLantern) lanterns.push(o); });
    const positions = source.uniforms.uMusicLanternPositions.value as THREE.Vector3[];
    for (const [i, lamp] of lanterns.entries()) expect(positions[i].distanceTo(lamp.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-8);
    expect(f.person.customProgramCacheKey()).toContain('prior-skin-program|music-interior-diffuse-v004');
    lighting.dispose(); expect(f.person.onBeforeCompile).toBe(prior); expect(f.person.customProgramCacheKey).toBe(key);
    f.decoration.dispose();
  });

  it('composes with the outer static sunlight shader without replacing its directional-shadow entry', () => {
    const local = musicInteriorLightingShaderSource(THREE.ShaderLib.standard.vertexShader, THREE.ShaderLib.standard.fragmentShader);
    expect(local.fragment).toContain('#include <lights_fragment_begin>');
    const combined = environmentShadowShaderSource(local.vertex, local.fragment);
    expect(combined.fragment).toContain('musicLanternWeight(pointLight.position, geometryPosition, pointLight.decay)');
    expect(combined.fragment).toContain('directLight.color*=environmentStaticShadow()');
    expect(combined.fragment).toContain('RE_IndirectDiffuse');
    expect(() => musicInteriorLightingShaderSource('invalid', 'invalid')).toThrow('shader-anchor-missing');
  });

  it('keeps a subsequently installed outer hook intact and restores correctly in documented reverse order', async () => {
    const installOuter = (material: THREE.MeshStandardMaterial) => {
      const before = material.onBeforeCompile, key = material.customProgramCacheKey;
      const outer: THREE.Material['onBeforeCompile'] = function(this: THREE.Material, source, renderer) {
        before.call(this, source, renderer); source.uniforms.uOuter = { value: true };
      };
      const outerKey = () => `${key.call(material)}|outer-test-program`;
      material.onBeforeCompile = outer; material.customProgramCacheKey = outerKey;
      return { outer, outerKey, dispose() {
        if (material.onBeforeCompile === outer) {
          material.onBeforeCompile = before; material.customProgramCacheKey = key;
        }
      } };
    };
    const first = await fixture(), firstLighting = createMusicInteriorLighting(first.scene, first.root);
    const firstOuter = installOuter(first.person), compiled = shader();
    first.person.onBeforeCompile(compiled as never, {} as THREE.WebGLRenderer);
    expect(compiled.uniforms.uOuter.value).toBe(true); expect(compiled.uniforms.uMusicInteriorFromWorld).toBeDefined();
    firstLighting.dispose();
    expect(first.person.onBeforeCompile).toBe(firstOuter.outer);
    expect(first.person.customProgramCacheKey).toBe(firstOuter.outerKey);
    first.decoration.dispose();

    const second = await fixture(), original = second.person.onBeforeCompile, originalKey = second.person.customProgramCacheKey;
    const secondLighting = createMusicInteriorLighting(second.scene, second.root), secondOuter = installOuter(second.person);
    secondOuter.dispose(); secondLighting.dispose();
    expect(second.person.onBeforeCompile).toBe(original); expect(second.person.customProgramCacheKey).toBe(originalKey);
    second.decoration.dispose();
  });

  it('requires actual owned lanterns, so an unrelated point light cannot satisfy a missing fixture', async () => {
    const f = await fixture(); let altered = false;
    f.root.traverse(o => { if (!altered && o instanceof THREE.PointLight) { o.userData.musicInteriorLantern = false; altered = true; } });
    expect(() => createMusicInteriorLighting(f.scene, f.root)).toThrow('lantern-count-mismatch');
    f.decoration.dispose();
  });

  it('keeps actual wall corners, wall tops and skirt feet fully lit without leaking through the exterior shell', () => {
    for (const p of [
      new THREE.Vector3(34.764, 1.815, -32.174), new THREE.Vector3(59.423, 13.5305, -32.174),
      new THREE.Vector3(34.474, 7.93, -17.651), new THREE.Vector3(47, 13.5305, -32.174),
    ]) expect(musicInteriorVolumeWeight(p), p.toArray().join(',')).toBeCloseTo(1, 8);
    for (const p of [new THREE.Vector3(42, 13.14, -17.60), new THREE.Vector3(42.613, 13.709, -31.190), new THREE.Vector3(39.5, 0, -25)]) {
      expect(musicInteriorVolumeWeight(p), p.toArray().join(',')).toBe(0);
    }
  });

  it('uses the real door approach for a continuous target and distinguishes side walls, right room and stacked floors', () => {
    let previous = 0;
    for (let index = 0; index <= 120; index++) {
      const p = new THREE.Vector3(39.5, 1.8, -18.8 - index * .05), value = musicInteriorAdaptationTarget(p);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-10); expect(value - previous).toBeLessThan(.03);
      expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1); previous = value;
    }
    expect(previous).toBe(1);
    expect(musicInteriorAdaptationTarget(new THREE.Vector3(35.7, 1.8, -20.9))).toBe(0);
    expect(musicInteriorAdaptationTarget(new THREE.Vector3(43.7, 1.8, -20.9))).toBe(0);
    expect(musicInteriorAdaptationTarget(new THREE.Vector3(53, 1.8, -19.4))).toBe(1);
    expect(musicInteriorAdaptationTarget(new THREE.Vector3(39.5, 0, -20))).toBe(0);
    expect(musicInteriorAdaptationTarget(new THREE.Vector3(39.5, 7.915375, -20))).toBe(1);
  });

  it('adapts monotonically with stable elapsed time at 15/30/60FPS and reverses smoothly on exit', async () => {
    const f = await fixture(), lighting = createMusicInteriorLighting(f.scene, f.root);
    const outside = f.root.localToWorld(new THREE.Vector3(39.5, 1.8, -19.4));
    const inside = f.root.localToWorld(new THREE.Vector3(39.5, 1.8, -25));
    const outcomes: number[] = [];
    for (const fps of [15, 30, 60]) {
      lighting.update(outside, 0, true);
      const start = lighting.inspect().adaptation.gain;
      expect(start).toBeGreaterThan(0); expect(start).toBeLessThan(.4);
      let previous = start;
      for (let frame = 0; frame < fps * 1.2; frame++) {
        lighting.update(inside, 1 / fps);
        const gain = lighting.inspect().adaptation.gain;
        expect(gain).toBeGreaterThanOrEqual(previous); expect(gain).toBeLessThanOrEqual(1);
        expect(gain - previous).toBeLessThan(.13); previous = gain;
      }
      expect(previous).toBeGreaterThan(.9); outcomes.push(previous);
      for (let frame = 0; frame < fps * 1.2; frame++) {
        lighting.update(outside, 1 / fps);
        const gain = lighting.inspect().adaptation.gain;
        expect(gain).toBeLessThanOrEqual(previous); expect(gain).toBeGreaterThanOrEqual(start - 1e-10); previous = gain;
      }
    }
    expect(Math.max(...outcomes) - Math.min(...outcomes)).toBeLessThan(1e-8);
    lighting.dispose(); f.decoration.dispose();
  });

  it('uses the actual player transform rather than camera turns, ignores invalid elapsed time and stops after disposal', async () => {
    const f = await fixture(), lighting = createMusicInteriorLighting(f.scene, f.root), camera = new THREE.PerspectiveCamera(); f.scene.add(camera);
    const outside = f.root.localToWorld(new THREE.Vector3(39.5, 1.8, -19.4)), inside = f.root.localToWorld(new THREE.Vector3(39.5, 1.8, -25));
    lighting.update(outside, 0, true); const outsideGain = lighting.inspect().adaptation.gain;
    lighting.update(inside, Number.NaN); expect(lighting.inspect().adaptation.gain).toBe(outsideGain);
    lighting.update(inside, -1); expect(lighting.inspect().adaptation.gain).toBe(outsideGain);
    const playerBefore = inside.clone(); lighting.update(inside, 0, true); const before = lighting.inspect().adaptation;
    camera.position.set(-200, 90, 400); camera.rotation.set(1, -2, .7); camera.updateMatrixWorld(true);
    lighting.update(inside, 0); const turned = lighting.inspect().adaptation;
    expect(turned.gain).toBe(before.gain); expect(turned.target).toBe(before.target); expect(turned.sourcePlayer).toEqual(before.sourcePlayer);
    expect(inside.equals(playerBefore)).toBe(true);
    lighting.dispose(); lighting.update(outside, 1, true);
    expect(lighting.inspect().adaptation.gain).toBe(before.gain); expect(lighting.inspect().disposed).toBe(true);
    f.decoration.dispose();
  });
});
