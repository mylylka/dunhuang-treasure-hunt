import {afterEach,describe,expect,it,vi} from 'vitest';
import {createAudibleMusicClock,createMusicArrivalAudio,MIN_AUDIBLE_MUSIC_GAIN,musicSpatialGain} from '../../src/world/music-arrival-audio';
import {defaultSoundPreferences} from '../../src/services/sound-settings';

class Parameter {
  value=0;
  cancelScheduledValues=vi.fn();
  setTargetAtTime=vi.fn((value:number)=>{this.value=value;});
}
class Node {
  connect=vi.fn();disconnect=vi.fn();
}
class Source extends Node {buffer:unknown=null;loop=false;start=vi.fn();stop=vi.fn();}
class Context {
  static current:Context;
  state='suspended';currentTime=0;destination={};source:Source|null=null;
  constructor(){Context.current=this;}
  decodeAudioData=vi.fn(async()=>({}));
  createGain=()=>Object.assign(new Node(),{gain:new Parameter()});
  createStereoPanner=()=>Object.assign(new Node(),{pan:new Parameter()});
  createMediaStreamDestination=()=>Object.assign(new Node(),{stream:{}});
  createBufferSource=()=>this.source=new Source();
  resume=vi.fn(async()=>{this.state='running';});
  suspend=vi.fn(async()=>{this.state='suspended';});
  close=vi.fn(async()=>{this.state='closed';});
}
class Pointer extends Event {}
class Keyboard extends Event {metaKey=false;ctrlKey=false;altKey=false;}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function environment(fetcher=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}))){
  const window=new EventTarget(),document={hidden:false};
  vi.stubGlobal('window',window);vi.stubGlobal('document',document);
  vi.stubGlobal('PointerEvent',Pointer);vi.stubGlobal('KeyboardEvent',Keyboard);
  vi.stubGlobal('AudioContext',Context);vi.stubGlobal('fetch',fetcher);
  return {window,document};
}
const spatial={source:[0,0,0],innerRadius:2,outerRadius:20};
afterEach(()=>vi.unstubAllGlobals());

describe('real music playback evidence',()=>{
  it('never replaces media time with wall/game time across blocked or silent gaps',()=>{
    const clock=createAudibleMusicClock();
    expect(clock.sample(10,false)).toBe(0);
    expect(clock.sample(15,true)).toBe(0);
    expect(clock.sample(16.25,true)).toBe(1.25);
    expect(clock.sample(100,false)).toBe(1.25);
    expect(clock.sample(200,true)).toBe(1.25);
    expect(clock.sample(201.25,true)).toBe(2.5);
    expect(clock.sample(0,true)).toBe(2.5);
    expect(clock.sample(1,true)).toBe(3.5);
  });
  it('requires loaded, unlocked, running and actually audible audio; mute/pause/background preserve the count',async()=>{
    const {window,document}=environment(),player=createMusicArrivalAudio(defaultSoundPreferences(),spatial);
    player.update({x:0,z:0},0);await settle();
    expect(player.inspect()).toMatchObject({status:'ready',unlocked:false,playing:false,audible:false,audibleTime:0});
    window.dispatchEvent(new Pointer('pointerdown'));await settle();
    const context=Context.current;
    expect(player.inspect()).toMatchObject({playing:true,audible:true,audibleTime:0});
    context.currentTime=1.25;expect(player.inspect().audibleTime).toBeCloseTo(1.25);
    player.setBlocked(true);context.currentTime+=50;
    expect(player.inspect()).toMatchObject({audible:false,audibleTime:1.25});
    player.setBlocked(false);await settle();player.inspect();
    context.currentTime+=.5;expect(player.inspect().audibleTime).toBeCloseTo(1.75);
    player.setPreferences({version:1,enabled:false,volume:.4});context.currentTime+=30;
    expect(player.inspect()).toMatchObject({audible:false,audibleTime:1.75});
    player.setPreferences(defaultSoundPreferences());await settle();player.inspect();
    context.currentTime+=.25;expect(player.inspect().audibleTime).toBeCloseTo(2);
    document.hidden=true;context.currentTime+=100;expect(player.inspect().audibleTime).toBeCloseTo(2);
    document.hidden=false;player.inspect();context.currentTime+=.5;
    expect(player.inspect().audibleTime).toBeCloseTo(2.5);
    player.setPreferences({version:1,enabled:true,volume:0});context.currentTime+=20;
    expect(player.inspect()).toMatchObject({audible:false,audibleTime:2.5});
    player.dispose();expect(context.source?.stop).toHaveBeenCalledOnce();expect(context.close).toHaveBeenCalledOnce();
  });
  it('does not count out-of-range or sub-threshold notes, nor failed loading; retry begins real counting',async()=>{
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
    const {window}=environment(fetcher),player=createMusicArrivalAudio(defaultSoundPreferences(),spatial);
    player.update({x:0,z:0},0);await settle();window.dispatchEvent(new Pointer('pointerdown'));await settle();
    const context=Context.current;context.currentTime=20;
    expect(player.inspect()).toMatchObject({status:'error',playing:false,audibleTime:0});
    player.retry();await settle();player.inspect();context.currentTime+=.5;
    expect(player.inspect()).toMatchObject({status:'ready',audible:true,audibleTime:.5});
    player.update({x:19.9,z:0},0);context.currentTime+=5;
    expect(player.inspect().gain).toBeLessThan(MIN_AUDIBLE_MUSIC_GAIN);
    expect(player.inspect().audibleTime).toBe(.5);
    player.update({x:30,z:0},0);context.currentTime+=5;
    expect(player.inspect()).toMatchObject({gain:0,audible:false,audibleTime:.5});player.dispose();
  });
  it('preserves the old smooth distance curve unless an exponent/mask is explicitly supplied',()=>{
    expect(musicSpatialGain({x:11,z:0},spatial)).toBe(.5);
    expect(musicSpatialGain({x:11,z:0},{...spatial,falloffExponent:3})).toBe(.125);
    expect(musicSpatialGain({x:11,z:0},{...spatial,gainMultiplier:()=>.2})).toBe(.1);
  });
});
