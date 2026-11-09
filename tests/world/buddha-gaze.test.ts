import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {BUDDHA_HEAD,buddhaDominatesView,centeredBuddhaHead,createBuddhaGaze} from '../../src/world/buddha-gaze';

const camera=(target:THREE.Vector3,eye=new THREE.Vector3(122,9.355,-77))=>{
  const c=new THREE.PerspectiveCamera(49,1279/925,.1,450);c.position.copy(eye);c.lookAt(target);return c;
};
describe('Buddha presentation gaze',()=>{
 it('accepts the head inside the central half of both viewport dimensions',()=>{
  const head=new THREE.Vector3(BUDDHA_HEAD.x,BUDDHA_HEAD.y,BUDDHA_HEAD.z),projected=new THREE.Vector3();
  const c=camera(head);
  expect(centeredBuddhaHead(c,head,projected)).toBe(true);
  for(const [x,y,expected] of [[.49,.49,true],[.51,.49,false],[.49,-.51,false]] as const){
   const point=new THREE.Vector3(x,y,projected.z).unproject(c);
   expect(centeredBuddhaHead(c,point,new THREE.Vector3())).toBe(expected);
  }
 });
 it('accepts a front low-angle view with the face and chest visible',()=>{
  expect(buddhaDominatesView(camera(new THREE.Vector3(122,28,-90)))).toBe(true);
 });
 it('rejects the entrance, side wall, flat view and ceiling even if the up key was pressed',()=>{
  for(const t of [[122,25,-60],[108,25,-77],[122,9,-90],[122,40,-78]])
   expect(buddhaDominatesView(camera(new THREE.Vector3(...t)))).toBe(false);
 });
 it('does not narrate from outside or the narrow side passages',()=>{
  for(const p of [[122,9,-69],[134,9,-85],[122,9,-96]])
   expect(buddhaDominatesView(camera(new THREE.Vector3(122,28,-90),new THREE.Vector3(...p)))).toBe(false);
 });
 it('requires uninterrupted dwell and rearms only when physically leaving',()=>{
  const g=createBuddhaGaze();expect(g.update(true,true,.4)).toBe(false);
  g.update(true,false,.1);expect(g.update(true,true,.3)).toBe(false);
  for(let i=0;i<20;i++)expect(g.update(true,true,0)).toBe(false);
  expect(g.update(true,true,.36)).toBe(true);expect(g.update(true,true,30)).toBe(false);
  g.update(false,false,0);expect(g.update(true,true,.7)).toBe(true);
 });
});
