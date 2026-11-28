/* Read-aloud pilot controls in a window separate from the one shared with the family. */
(() => {
  'use strict';
  const windowName = 'obligation-presenter-' + Math.random().toString(36).slice(2);
  let childWindow = null;
  let state = {active:false, stories:[]};
  let actions = {};
  let examined = null;
  let following = true;
  let expandedStories = new Set();
  let lastStoryTitles = '';
  const theme = `
    :root { font: 16px/1.45 system-ui,sans-serif; color: #192e37; background: #f5f8f9; }
    * { box-sizing: border-box; }
    body { max-width: 67rem; margin: 0 auto; padding: clamp(.75rem,2vw,1.6rem); }
    h1 { font-size: clamp(1.45rem,3.1vw,2rem); margin: .2rem 0 .8rem; }
    h2 { font-size: 1.15rem; margin: 0 0 .6rem; } p { margin: .35rem 0; }
    .muted,small { color: #4c626b; } .flag { color: #116c66; font-weight: 700; }
    .columns { display:grid; gap: 1rem; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); align-items: start; }
    .panel { padding: .9rem; border: 1px solid #cdd8dd; border-radius: .7rem; background:white; margin-bottom:.8rem; }
    .prompt { font-size: clamp(1.05rem,2.4vw,1.45rem); font-weight: 650; margin: .4rem 0 .8rem; }
    button,summary { font: inherit; cursor:pointer; }
    button { color:inherit; border:1px solid #a4b4bb; background:white; border-radius:.45rem; padding:.45rem .7rem; min-height:2.5rem; }
    button:hover:not(:disabled) { background:#e9f3f3; } button:disabled { opacity:.48; cursor:default; }
    button:focus-visible,summary:focus-visible { outline: 3px solid #1677ae; outline-offset: 2px; }
    .buttons { display:flex; align-items:center; flex-wrap:wrap; gap:.4rem; margin:.5rem 0; }
    button.primary { background:#136c62; color:#fff; border-color:#136c62; }
    button.primary:hover:not(:disabled) { background:#0d544b; }
    .rail { max-height:70vh; overflow:auto; scrollbar-gutter:stable; } details { border-top:1px solid #e0e6e8; }
    summary { padding:.55rem .2rem; font-weight:650; }
    .entry { display:flex; align-items:center; gap:.45rem; text-align:left; width:100%; border-radius:0; border:0; border-bottom:1px solid #edf0f2; }
    .entry[aria-current=step] { background:#e8f5f0; box-shadow:inset 3px 0 #188067; }
    .entry[aria-pressed=true] { outline:2px solid #6a8eaa; outline-offset:-2px; }
    .scene { position:relative; overflow:hidden; aspect-ratio:1920/840; display:block; background:white; }
    .scene img { position:absolute; left:0; top:-14.285714%; width:100%; height:128.571429%; max-width:none; }
    .thumb { width:3.6rem; flex:0 0 auto; }
    .still { width:min(100%,73vh); margin:.5rem auto; }
    @media(max-width:690px) { .columns{grid-template-columns:1fr;} .rail{max-height:45vh;} }
    `;
  const node = (tag, text, className) => {
    const e=childWindow.document.createElement(tag);
    if(text!==null && text!==undefined)e.textContent=text;
    if(className)e.className=className;
    return e;
  };
  const button=(label,fn,key,className='')=>{
    const e=node('button',label,className); e.type='button';e.dataset.key=key;
    e.addEventListener('click',fn);return e;
  };
  function action(name,...args){
    if(typeof actions[name]!=='function')return;
    const allowed={next:state.canNext,back:state.canBack,choose:state.active && !state.ended && (state.options||[])[args[0]]!==undefined,download:state.canSave,jumpBack:state.canBack};
    if(!allowed[name])return;
    if(name!=='download'){examined=null; following=true;}
    actions[name](...args);
  }
  function picture(src,alt,className){
    const box=node('span',null,'scene '+className);
    const e=node('img');e.src=new URL(src,location.href).href;e.alt=alt;e.loading=className==='thumb'?'lazy':'eager';
    box.append(e);return box;
  }
  function render(){
    if(!childWindow || childWindow.closed)return;
    let doc;
    try{doc=childWindow.document;}catch{childWindow=null;return;}
    if(!doc.getElementById('app'))return;
    const focus=doc.activeElement?.dataset.key;
    const railTop=doc.querySelector('.rail')?.scrollTop||0;
    const main=doc.getElementById('app');
    const groups=state.stories || [];
    const key=JSON.stringify(groups.map(g=>g.title));
    if(key!==lastStoryTitles){expandedStories=new Set(); examined=null; following=true;lastStoryTitles=key;}
    const columns=node('div',null,'columns'), left=node('div'),right=node('div',null,'panel');
    columns.append(left,right);
    const live=node('section',null,'panel');
    live.append(node('h2','On the shared slide'));
    const status=node('p',state.counter || (state.ended?'Pilot complete':state.active?'Pilot in progress':'Before the pilot'),'flag');
    live.append(status);
    live.append(node('p',state.prompt || (state.active?'Waiting for the study slide.':state.ended?'The pilot has ended.':'Choose a version and start the pilot in the study window.'),'prompt'));
    if(state.cue && state.cue!==state.prompt)live.append(node('p',state.cue));
    if(state.image)live.append(picture(state.image,'Current shared scene','still'));
    if(state.active && !state.ended){
      const answers=node('div',null,'buttons');
      (state.options||[]).forEach((label,i)=>answers.append(button((i+1)+'. '+label,()=>action('choose',i),'answer'+i)));
      live.append(answers);
      const controls=node('div',null,'buttons');
      const back=button('← Back',()=>action('back'),'back');back.disabled=!state.canBack;
      const next=button('Next →',()=>action('next'),'next','primary');next.disabled=!state.canNext;
      controls.append(back,next);live.append(controls);
    }
    if(state.canSave)live.append(button('Download responses',()=>action('download'),'save'));
    if(state.active && !state.ended)live.append(node('small','Use → or Space to advance, ← to go back, and 1–3 to record an answer.'));
    left.append(live);
    if(examined){
      const [g,s]=examined;
      const item=groups[g]?.slides?.[s];
      if(item){
        const inspect=node('section',null,'panel');
        inspect.append(node('h2','Private slide preview'),node('p',groups[g].title,'flag'));
        if(item.image)inspect.append(picture(item.image,'Study scene','still'));
        inspect.append(node('p',item.label,'prompt'));
        const controls=node('div',null,'buttons');
        if(!item.current && Number.isInteger(item.visitedIndex) && item.visitedIndex>=0 && state.active && state.canBack){
          controls.append(button('Return study to this slide',()=>{
            if(childWindow.confirm('Return the shared study to this slide? Answers recorded from this point onward will be removed.'))action('jumpBack',item.visitedIndex);
          },'jump'));
        }
        controls.append(button('Close preview',()=>{examined=null;following=true;render();},'close'));
        inspect.append(controls);left.append(inspect);
      }
    }
    right.append(node('h2','Slide navigator'));
    const rail=node('div',null,'rail');
    if(!groups.length)rail.append(node('p','The story slides will appear here when the pilot starts.','muted'));
    groups.forEach((group,g)=>{
      const slides=group.slides || [];
      const details=node('details');
      const summary=node('summary',group.title);summary.dataset.key='story'+g;
      const current=slides.some(s=>s.current);
      details.open=expandedStories.has(g) || (following && current);
      details.append(summary);
      const populate=()=>{
        if(details.childElementCount>1)return;
        slides.forEach((item,s)=>{
          const e=button('',()=>{examined=[g,s];following=false;expandedStories.add(g);render();},'s'+g+'-'+s,'entry');
          if(item.current)e.setAttribute('aria-current','step');
          e.setAttribute('aria-pressed',String(examined?.[0]===g && examined?.[1]===s));
          if(item.image)e.append(picture(item.image,'','thumb'));
          e.append(node('span',(item.current?'Showing · ':'')+item.label));
          details.append(e);
        });
      };
      if(details.open)populate();
      summary.addEventListener('click',()=>{following=false;if(details.open)expandedStories.delete(g);else{expandedStories.add(g);populate();}});
      rail.append(details);
    });
    right.append(rail);
    main.replaceChildren(columns);
    if(focus)Array.from(main.querySelectorAll('[data-key]')).find(e=>e.dataset.key===focus)?.focus({preventScroll:true});
    rail.scrollTop=railTop;
    if(following){
      const active=rail.querySelector('[aria-current=step]');
      if(active){
        const bounds=rail.getBoundingClientRect(), itemBounds=active.getBoundingClientRect();
        if(itemBounds.top<bounds.top)rail.scrollTop+=itemBounds.top-bounds.top;
        else if(itemBounds.bottom>bounds.bottom)rail.scrollTop+=itemBounds.bottom-bounds.bottom;
      }
    }
  }
  function handleKey(e){
    if(e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)return;
    if(e.key==='Escape' && examined){e.preventDefault();examined=null;following=true;render();return;}
    if(!state.active || state.ended)return;
    const target=e.target;
    if(target.matches?.('input,textarea,select,[contenteditable=true]'))return;
    if(e.key==='ArrowRight' || (e.code==='Space' && !target.closest?.('button,summary'))){e.preventDefault();action('next');}
    else if(e.key==='ArrowLeft'){e.preventDefault();action('back');}
    else if(/^[1-3]$/.test(e.key)){e.preventDefault();action('choose',Number(e.key)-1);}
  }
  function open(){
    if(childWindow && !childWindow.closed){childWindow.focus();render();return true;}
    childWindow=window.open('',windowName,'popup,width=900,height=760,resizable=yes,scrollbars=yes');
    if(!childWindow)return false;
    const doc=childWindow.document;
    doc.documentElement.lang='en';doc.title='Who Has to Help? — Private presenter';
    const style=doc.createElement('style');style.textContent=theme;doc.head.append(style);
    const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width, initial-scale=1';doc.head.append(meta);
    const heading=node('h1','Who Has to Help?');
    const main=node('main');main.id='app';
    doc.body.replaceChildren(node('p','Private presenter · Share the study window in Zoom','flag'),heading,main);
    childWindow.addEventListener('keydown',handleKey);
    render();return true;
  }
  window.ObligationZoomPresenter={open,register(value){actions=value || {};},update(value){state=value || {active:false,stories:[]};render();}};
  window.addEventListener('pagehide',()=>{if(childWindow && !childWindow.closed)childWindow.close();});
})();
