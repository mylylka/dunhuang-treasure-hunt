import {useEffect,useRef,type KeyboardEvent} from 'react';
interface Props { blocked: boolean; onReturn():void; onGuide():void; onReplay?():void }
export function WorldCultureChoice({blocked,onReturn,onGuide,onReplay}:Props){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(!blocked)panel.current?.focus({preventScroll:true});},[blocked]);
 function key(event:KeyboardEvent){
  if(blocked)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onReturn();}
  if(event.key==='Tab'){
   event.preventDefault();const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
   const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
   buttons[current<0?(event.shiftKey?buttons.length-1:0):(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
  }
 }
 return <div className="world-culture-choice-cover" data-testid="world-culture-choice" inert={blocked?true:undefined}>
  <section className={`world-culture-choice${onReplay?' world-story-choice':''}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="接下来去哪里" onKeyDown={key}>
   {onReplay?<>
    <button type="button" className="world-primary" data-testid="world-enter-theme" onClick={onGuide}>探索更多</button>
    <button type="button" data-testid="world-choice-replay" onClick={onReplay}>再看一次</button>
    <button type="button" data-testid="world-choice-roam" onClick={onReturn}>继续漫游</button>
   </>:<>
    <button type="button" data-testid="world-choice-roam" onClick={onReturn}>返回漫游</button>
    <button type="button" className="world-primary" data-testid="world-enter-theme" onClick={onGuide}>进入文化导览</button>
   </>}
  </section>
 </div>;
}
