import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { pickDiscoveryAt } from '../../src/world/discovery-picking';

function fixture(name='deer-door-head') {
  const scene=new Scene(), camera=new PerspectiveCamera(49,16/9,.1,100), traveler=new Group();
  camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const art=new Mesh(new PlaneGeometry(4,4),new MeshBasicMaterial());
  art.name=name;art.userData.semanticGroup='mogao-v009-interior';scene.add(art,traveler);
  const pick=()=>{scene.updateMatrixWorld(true);return pickDiscoveryAt(scene,camera,{x:0,y:0},traveler);};
  return {scene,traveler,art,pick};
}

describe('clicking world discoveries',()=>{
  it('distinguishes actual story surfaces even when their semantic group is shared',()=>{
    const f=fixture();expect(f.pick()).toBe('story-demo');
    f.art.name='novice-side-head';expect(f.pick()).toBe('novice-story');
    f.art.name='plain-wall';expect(f.pick()).toBeNull();
  });
  it('does not click a story through a visible wall or pillar',()=>{
    const f=fixture(), wall=new Mesh(new BoxGeometry(3,3,.3),new MeshBasicMaterial());
    wall.position.z=2;f.scene.add(wall);expect(f.pick()).toBeNull();
    wall.visible=false;expect(f.pick()).toBe('story-demo');
  });
  it('ignores the avatar, hidden ancestors and transparent awakening effect',()=>{
    const f=fixture('flying-original-art');
    const body=new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());body.position.z=3;f.traveler.add(body);
    const mist=new Mesh(new PlaneGeometry(4,4),new MeshBasicMaterial({transparent:true,opacity:.5}));
    mist.name='mural-awakening-mist';mist.position.z=.1;f.scene.add(mist);
    expect(f.pick()).toBe('flying');
    const hidden=new Group();f.scene.add(hidden);hidden.add(f.art);hidden.visible=false;
    expect(f.pick()).toBeNull();
  });
});
