/* Read-aloud pilot controls in a window separate from the one shared with the family. */
(() => {
  'use strict';
  const windowName = 'obligation-presenter-' + Math.random().toString(36).slice(2);
  let childWindow = null;
  let state = {active:false, stories:[]};
  let actions = {};
  let examined = null;
  let following = true;
  let navigatorMode = false;
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
    .navigator-mode { grid-template-columns: minmax(12rem,.62fr) minmax(0,1.5fr); }
    .navigator-mode .navigator-list { grid-column:1; grid-row:1; }
    .navigator-mode .viewers { grid-column:2; grid-row:1; }
    .preview-viewport { width:100%; aspect-ratio:16/9; position:relative; overflow:hidden; margin:.5rem 0; background:white; border:1px solid #d6dfdc; border-radius:.35rem; }
    .preview-viewport iframe { position:absolute; left:0; top:0; width:1280px; height:720px; border:0; transform-origin:top left; pointer-events:none; }
    .full-thumb { width:3.6rem; aspect-ratio:16/9; object-fit:contain; flex:0 0 auto; }
    .thumb-title { display:grid; place-items:center; width:3.6rem; height:2rem; padding:1px 2px; box-shadow:0 0 0 1px #d9dddd; background:#fff; color:#354d49; font-weight:700; font-size:.45rem; text-align:center; overflow:hidden; flex:0 0 auto; }
    .rail .entry { font-size:.85rem; } .step-counter { color:#4b655a; font-size:.84rem; }
    .preview-controls { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; margin:.75rem 0; }
    .preview-controls button { font-weight:600; }
    @media(max-width:690px) { .navigator-mode { display:flex; flex-direction:column; } .navigator-mode .viewers,.navigator-mode .navigator-list { width:100%; } }
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
    const live = state.active && !state.ended && !state.previewing;
    const allowed={next:live && state.canNext,back:live && state.canBack,choose:live && (state.options||[])[args[0]]!==undefined,
      download:state.canSave,jumpBack:live && state.canBack,showPreview:state.active && !state.ended,returnToLive:state.previewing};
    if(!allowed[name])return;
    if(['next','back','choose','jumpBack'].includes(name)){examined=null; following=true;}
    actions[name](...args);
  }
  function picture(src,alt,className){
    const box=node('span',null,'scene '+className);
    const e=node('img');e.src=new URL(src,location.href).href;e.alt=alt;e.loading=className==='thumb'?'lazy':'eager';
    box.append(e);return box;
  }
  const noAction = () => {};
  function exactPreview(item, group){
    const viewport=node('div',null,'preview-viewport');
    const frame=node('iframe');
    frame.title='Private, read-only view of the selected family slide';
    frame.tabIndex=-1;
    frame.inert=true;
    // Reuse the family's slide renderers inside a separate, read-only document.
    // It has no participant session, recording, or response handlers.
    frame.addEventListener('load',()=>{
      try{
        const doc=frame.contentDocument;
        const base=doc.createElement('base');base.href=location.href;doc.head.append(base);
        for(const sheet of document.querySelectorAll('link[rel=stylesheet]')){
          const link=doc.createElement('link');link.rel='stylesheet';link.href=sheet.href;doc.head.append(link);
        }
        doc.body.className='child-view choice-box-preview';
        const article=doc.createElement('article');article.className='stage';article.id='stage';
        const main=doc.createElement('main'),study=doc.createElement('section');study.id='study';
        const bar=doc.createElement('div');bar.className='child-topbar';
        const label=doc.createElement('p');label.className='child-story-label';label.textContent=(group.title||'').split(' · ')[0];
        bar.append(label);study.append(bar,article);main.append(study);doc.body.append(main);
        if(item.finish){
          const finish=document.querySelector('#finish');
          if(finish){
            const copy=doc.importNode(finish,true);
            copy.hidden=false;
            copy.querySelector('.finish-actions')?.remove();
            const lede=copy.querySelector('.lede');
            if(lede)lede.textContent='That’s the end of our stories.';
            main.replaceChildren(copy);
          }
        }else if(Number.isInteger(item.parentIndex) && item.parentIndex < -1){
          study.classList.add('zoom-parent-step');
          window.ZoomParentSlides.render(article,item.parentIndex,noAction,noAction,noAction,item.parentIndex!==-4,state.count||6);
        }else {
          window.ZoomSlideVisuals.render({stage:article,step:item.step||null,line:item.line||0,prompt:item.label,
            options:item.options||item.step?.choices||[],onAnswer:noAction,onNext:noAction,onBack:noAction,onSave:noAction,canBack:true,canSave:false});
        }
      }catch{
        if(!frame.isConnected)return;
        const fallback=item.image?picture(item.image,item.label,'still'):node('p',item.body||item.label,'prompt');
        viewport.replaceChildren(fallback);
      }
    },{once:true});
    frame.src=new URL('zoom-navigator-frame.html',location.href).href;viewport.append(frame);
    // Each isolated visual retains the same 1280 x 720 design viewport.
    const observer=new ResizeObserver(()=>{
      if(!viewport.isConnected){observer.disconnect();return;}
      frame.style.transform='scale('+viewport.clientWidth/1280+')';
    });
    observer.observe(viewport);
    return viewport;
  }
  function slideOrder(){
    return (state.stories||[]).flatMap((group,g)=>(group.slides||[]).map((slide,s)=>({g,s,slide})));
  }
  function selectSlide(g,s){
    examined=[g,s];navigatorMode=true;following=false;expandedStories.add(g);render();
  }
  function browseBy(delta){
    if(!examined)return;
    const order=slideOrder();
    const index=order.findIndex(item=>item.g===examined[0] && item.s===examined[1]);
    const next=order[index+delta];
    if(next)selectSlide(next.g,next.s);
  }
  function returnToControls(){
    examined=null;navigatorMode=false;following=true;render();
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
    if(navigatorMode && !examined){
      const order=slideOrder(), initial=order.find(item=>item.slide.current) || order[0];
      if(initial){ examined=[initial.g,initial.s];expandedStories.add(initial.g);following=false; }
    }
    const columns=node('div',null,navigatorMode?'columns navigator-mode':'columns'), left=node('div',null,'viewers'),right=node('div',null,'panel navigator-list');
    columns.append(left,right);
    const live=node('section',null,'panel');
    live.append(node('h2','On the shared slide'));
    const status=node('p',state.counter || (state.ended?'Pilot complete':state.active?'Pilot in progress':'Before the pilot'),'flag');
    live.append(status);
    live.append(node('p',state.prompt || (state.active?'Waiting for the study slide.':state.ended?'The pilot has ended.':'Choose a version and start the pilot in the study window.'),'prompt'));
    if(state.cue && state.cue!==state.prompt)live.append(node('p',state.cue));
    if(state.image)live.append(picture(state.image,'Current shared scene','still'));
    if(state.previewing){
      live.append(node('p','The study window is showing a preview.','flag'));
      live.append(button('Return to live slide',()=>action('returnToLive'),'show-live','primary'));
    }
    if(state.active && !state.ended && !state.previewing){
      const answers=node('div',null,'buttons');
      (state.options||[]).forEach((label,i)=>answers.append(button((i+1)+'. '+label,()=>action('choose',i),'answer'+i)));
      live.append(answers);
      const controls=node('div',null,'buttons');
      const back=button('← Back',()=>action('back'),'back');back.disabled=!state.canBack;
      const next=button('Next →',()=>action('next'),'next','primary');next.disabled=!state.canNext;
      controls.append(back,next);live.append(controls);
    }
    if(state.canSave)live.append(button('Download responses',()=>action('download'),'save'));
    if(state.active && !state.ended && !state.previewing)live.append(node('small','Use → or Space to advance, ← to go back, and 1–4 to record an answer.'));
    if(!navigatorMode || !examined){
      if(groups.length)live.append(button('Browse slides',()=>{navigatorMode=true;render();},'browse'));
      left.append(live);
    }
    if(examined){
      const [g,s]=examined;
      const item=groups[g]?.slides?.[s];
      if(item){
        const inspect=node('section',null,'panel');
        const order=slideOrder(), index=order.findIndex(entry=>entry.g===g && entry.s===s);
        const current=order.findIndex(entry=>entry.slide.current);
        inspect.append(node('h2','Private slide preview'),node('p',groups[g].title,'flag'));
        inspect.append(node('p','Slide '+(index+1)+' of '+order.length+
          (current>=0 && state.active?' · Family is on slide '+(current+1):''),'step-counter'));
        if(item.step || Number.isInteger(item.parentIndex) || item.finish)inspect.append(exactPreview(item,groups[g]));
        else if(item.image)inspect.append(picture(item.image,'Study scene','still'));
        if(item.conditional)inspect.append(node('p','Only after “'+item.conditional+'”','flag'));
        inspect.append(node('p',item.label,'prompt'));
        if(item.body && item.body!==item.label) inspect.append(node('p',item.body));
        const controls=node('div',null,'preview-controls');
        const prev=button('← Previous slide',()=>browseBy(-1),'preview-prev');prev.disabled=index<=0;
        const next=button('Next slide →',()=>browseBy(1),'preview-next');next.disabled=index>=order.length-1;
        controls.append(prev,next);
        if(state.active && !state.ended && typeof actions.showPreview==='function'){
          controls.append(button('Show this slide in the study window',()=>action('showPreview',item),'shared-preview'));
          if(state.previewing)controls.append(button('Return to live slide',()=>action('returnToLive'),'show-live','primary'));
        }
        if(!state.previewing && !item.current && Number.isInteger(item.visitedIndex) && item.visitedIndex>=0 && state.active && state.canBack){
          controls.append(button('Return study to this slide',()=>{
            if(childWindow.confirm('Return the shared study to this slide? Answers recorded from this point onward will be removed.'))action('jumpBack',item.visitedIndex);
          },'jump'));
        }
        if(state.active || state.ended)controls.append(button('Presenter controls',returnToControls,'close'));
        else controls.append(button('Close navigator',()=>childWindow.close(),'close'));
        inspect.append(controls);left.append(inspect);
      }
    }
    right.append(node('h2','Slide navigator'));
    const rail=node('div',null,'rail');
    if(!groups.length)rail.append(node('p','Choose a version in the study window to see its slides.','muted'));
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
          const e=button('',()=>selectSlide(g,s),'s'+g+'-'+s,'entry');
          if(item.current)e.setAttribute('aria-current','step');
          e.setAttribute('aria-pressed',String(examined?.[0]===g && examined?.[1]===s));
          if(item.fullSlideImage){
            const img=node('img',null,'full-thumb');img.src=new URL(item.fullSlideImage,location.href).href;img.alt='';img.loading='lazy';e.append(img);
          }else if(item.image)e.append(picture(item.image,'','thumb'));
          else e.append(node('span',item.label,'thumb-title'));
          e.append(node('span',(item.current?'Showing · ':'')+(item.conditional?'If “'+item.conditional+'” · ':'')+item.label));
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
    if(following || navigatorMode){
      const active=rail.querySelector(navigatorMode?'[aria-pressed=true]':'[aria-current=step]');
      if(active){
        const bounds=rail.getBoundingClientRect(), itemBounds=active.getBoundingClientRect();
        if(itemBounds.top<bounds.top)rail.scrollTop+=itemBounds.top-bounds.top;
        else if(itemBounds.bottom>bounds.bottom)rail.scrollTop+=itemBounds.bottom-bounds.bottom;
      }
    }
  }
  function handleKey(e){
    if(e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)return;
    if(navigatorMode && examined){
      if(e.key==='Escape'){e.preventDefault();if(state.active || state.ended)returnToControls();else childWindow.close();}
      else if(e.key==='ArrowRight'){e.preventDefault();browseBy(1);}
      else if(e.key==='ArrowLeft'){e.preventDefault();browseBy(-1);}
      return;
    }
    if(!state.active || state.ended || state.previewing)return;
    const target=e.target;
    if(target.matches?.('input,textarea,select,[contenteditable=true]'))return;
    if(e.key==='ArrowRight' || (e.code==='Space' && !target.closest?.('button,summary'))){e.preventDefault();action('next');}
    else if(e.key==='ArrowLeft'){e.preventDefault();action('back');}
    else if(/^[1-4]$/.test(e.key)){e.preventDefault();action('choose',Number(e.key)-1);}
  }
  function openMode(browse){
    navigatorMode=browse;examined=null;following=true;
    if(childWindow && !childWindow.closed){childWindow.focus();render();return true;}
    childWindow=window.open('',windowName,'popup,width=900,height=760,resizable=yes,scrollbars=yes');
    if(!childWindow)return false;
    const doc=childWindow.document;
    doc.documentElement.lang='en';doc.title='Who Has to Help? — Private slide navigator';
    const style=doc.createElement('style');style.textContent=theme;doc.head.append(style);
    const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width, initial-scale=1';doc.head.append(meta);
    const heading=node('h1','Who Has to Help?');
    const main=node('main');main.id='app';
    doc.body.replaceChildren(node('p','Private presenter · Share the study window in Zoom','flag'),heading,main);
    childWindow.addEventListener('keydown',handleKey);
    render();return true;
  }
  window.ObligationZoomPresenter={open:()=>openMode(false),openNavigator:()=>openMode(true),register(value){actions=value || {};},update(value){state=value || {active:false,stories:[]};render();}};
  window.addEventListener('pagehide',()=>{if(childWindow && !childWindow.closed)childWindow.close();});
})();
