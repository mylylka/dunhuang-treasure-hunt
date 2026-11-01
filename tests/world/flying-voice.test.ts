import { describe, expect, it, vi } from 'vitest';
import { createFlyingVoice } from '../../src/world/flying-voice';
import { defaultSoundPreferences } from '../../src/services/sound-settings';

class Media extends EventTarget {
  paused=true; currentTime=0; duration=12; readyState=4; volume=1; muted=false; preload='';
  play=vi.fn(async()=>{this.paused=false;});
  pause=vi.fn(()=>{this.paused=true;});
  load=vi.fn(); removeAttribute=vi.fn();
}
function fixture() {
  const media=new Media(), voice=createFlyingVoice(media as unknown as HTMLAudioElement,defaultSoundPreferences());
  media.dispatchEvent(new Event('canplay'));
  return {media,voice};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

describe('flying narration lifecycle',()=>{
  it('does not speak on approach; pause resumes the same position; exit and replay start at zero',async()=>{
    const {media,voice}=fixture();voice.update(true);expect(media.play).not.toHaveBeenCalled();
    voice.enter();voice.update(false);expect(media.play).not.toHaveBeenCalled();
    voice.update(true);await settle();expect(voice.inspect().playing).toBe(true);
    media.currentTime=4;voice.setBlocked(true);expect(media.paused).toBe(true);
    voice.setBlocked(false);await settle();expect(media.currentTime).toBe(4);expect(voice.inspect().playing).toBe(true);
    voice.exit();expect(media.paused).toBe(true);expect(media.currentTime).toBe(0);
    voice.update(true);expect(voice.inspect().playing).toBe(false);
    voice.enter();voice.update(true);await settle();expect(media.currentTime).toBe(0);
    media.currentTime=12;media.paused=true;media.dispatchEvent(new Event('ended'));
    const calls=media.play.mock.calls.length;voice.update(true);expect(media.play).toHaveBeenCalledTimes(calls);
    voice.dispose();expect(media.paused).toBe(true);expect(media.removeAttribute).toHaveBeenCalledWith('src');
  });
  it('honors mute and volume and exposes real media position rather than estimating subtitle timing',async()=>{
    const {media,voice}=fixture();voice.enter();voice.update(true);await settle();
    expect(media.volume).toBe(.4);media.currentTime=3.25;expect(voice.inspect().currentTime).toBe(3.25);
    voice.setPreferences({version:1,enabled:false,volume:.7});expect(media.muted).toBe(true);expect(voice.inspect().playing).toBe(false);
    voice.setPreferences({version:1,enabled:true,volume:.7});expect(voice.inspect().playing).toBe(true);expect(media.volume).toBe(.7);
    voice.setPreferences({version:1,enabled:true,volume:0});expect(voice.inspect().playing).toBe(false);
    voice.dispose();
  });
  it('stops a late play resolution after leaving instead of leaking narration into another page',async()=>{
    const {media,voice}=fixture();let resolve!:()=>void;
    media.play.mockImplementation(()=>new Promise<void>(r=>{resolve=()=>{media.paused=false;r();};}));
    voice.enter();voice.update(true);voice.exit();resolve();await settle();
    expect(media.paused).toBe(true);expect(voice.inspect().active).toBe(false);voice.dispose();
  });
  it('does not spin on autoplay rejection and allows a deliberate retry',async()=>{
    const {media,voice}=fixture();
    media.play.mockRejectedValueOnce(new DOMException('gesture required','NotAllowedError'));
    voice.enter();voice.update(true);await settle();expect(voice.inspect().status).toBe('blocked');
    for(let i=0;i<60;i++)voice.update(true);expect(media.play).toHaveBeenCalledTimes(1);
    voice.retry();await settle();expect(media.play).toHaveBeenCalledTimes(2);expect(voice.inspect().playing).toBe(true);
    media.dispatchEvent(new Event('error'));expect(voice.inspect().status).toBe('error');expect(media.paused).toBe(true);
    voice.retry();expect(media.load).toHaveBeenCalled();voice.dispose();
  });
  it('does not turn a quick pause/resume into an audio error when play rejects late',async()=>{
    const {media,voice}=fixture();let reject!:(error:Error)=>void;
    media.play.mockImplementationOnce(()=>new Promise<void>((_,r)=>{reject=r;}));
    voice.enter();voice.update(true);voice.setBlocked(true);voice.setBlocked(false);
    reject(new DOMException('interrupted by pause','AbortError'));await settle();
    expect(voice.inspect().status).toBe('ready');expect(media.play).toHaveBeenCalledTimes(2);voice.dispose();
  });
  it('handles missing audio honestly and keeps all observation controls usable',()=>{
    const voice=createFlyingVoice(null,defaultSoundPreferences());
    voice.enter();voice.update(true);voice.setBlocked(true);voice.retry();
    expect(voice.inspect()).toMatchObject({status:'missing',playing:false,currentTime:0});
    voice.exit();voice.dispose();
  });
});
