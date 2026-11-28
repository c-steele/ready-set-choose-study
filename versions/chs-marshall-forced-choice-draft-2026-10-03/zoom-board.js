/* The board lists the role sets and pairings used by the live six-story pilot. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const {roleSets, pairings} = window.ObligationPairings;
  const pairingDetails = new Map(pairings.map(pair => [pair.id,pair]));
  const roleNames = {woman:'Mom and sister', man:'Dad and brother', family:'Family and teacher'};
  const care = [
    {id:'hug', name:'Giving a hug', need:'Feeling sad'},
    {id:'food', name:'Giving strawberries', need:'Feeling hungry'},
    {id:'help', name:'Lifting a heavy box', need:'Dropped a heavy box'}
  ];
  const cards = roleSets.flatMap((set,r) => care.map((event,c) => ({
    set, event, id:set.id + '-' + event.id, number:r*care.length+c+1
  })));
  const checkKey = 'obligation-zoom-reviewed-versions-1';
  let checked = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(checkKey) || '[]');
    if (Array.isArray(saved)) checked = new Set(saved.filter(id => cards.some(c => c.id===id)));
  } catch { /* Unavailable storage only affects the next visit's checkmarks. */ }
  const grid = byId('version-grid');

  function element(tag,cls,label) {
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(label) node.textContent=label;
    return node;
  }
  function saveChecks() {
    try { localStorage.setItem(checkKey,JSON.stringify([...checked])); } catch {}
  }
  function card(entry) {
    const {set,event,id,number}=entry;
    const article=element('article','review-card');
    article.dataset.version=id;
    const top=element('div','review-card-topline');
    const name=element('span','review-role','#'+String(number).padStart(2,'0')+' · '+roleNames[set.id]);
    const label=element('label','review-done');
    const input=element('input');
    input.type='checkbox';
    input.checked=checked.has(id);
    input.setAttribute('aria-label','Mark '+roleNames[set.id]+', '+event.name.toLowerCase()+' reviewed');
    const mark=element('span','','Reviewed');
    label.append(input,mark); top.append(name,label);
    const heading=element('h2','',event.name);
    const dl=element('dl'), row=element('div');
    row.append(element('dt','','Story event'),element('dd','',event.need)); dl.append(row);
    const details=element('details','review-pairings');
    details.append(element('summary','','See the six helper pairings'));
    const list=element('ul','review-pairing-list');
    for(const pairId of set.pairingIds) {
      const p=pairingDetails.get(pairId);
      const item=element('li'); item.append(element('strong','',p.label));
      item.append(element('span','','For '+p.recipient.description)); list.append(item);
    }
    details.append(list);
    const link=element('a','review-open','Open six-story pilot');
    const url=new URL(location.href);
    url.search=''; url.hash='';
    url.searchParams.set('launch','1'); url.searchParams.set('set',set.id); url.searchParams.set('care',event.id);
    link.href=url.href; link.target='_blank';link.rel='noopener';
    link.setAttribute('aria-label','Open six-story pilot: '+roleNames[set.id]+', '+event.name.toLowerCase());
    const arrow=element('span','','↗'); arrow.setAttribute('aria-hidden','true');link.append(arrow);
    article.append(top,heading,dl,details,link);
    input.addEventListener('change',()=>{
      if(input.checked) checked.add(id); else checked.delete(id);
      saveChecks(); update();
    });
    return article;
  }
  const rendered=new Map(cards.map(entry=>{
    const article=card(entry); grid.append(article);
    return [entry.id,article];
  }));
  const empty=element('p','review-empty','No versions match these filters.');
  grid.append(empty);
  function update() {
    let count=0;
    const set=byId('set-select').value, kind=byId('care-select').value, unreviewed=byId('unreviewed').checked;
    for(const entry of cards) {
      const article=rendered.get(entry.id), done=checked.has(entry.id);
      article.hidden=(set!=='random' && set!==entry.set.id) || (kind!=='random' && kind!==entry.event.id) || (unreviewed && done);
      article.classList.toggle('is-reviewed',done); article.querySelector('input').checked=done;
      if(!article.hidden) count++;
    }
    byId('visible-count').textContent=count+' '+(count===1?'version':'versions');
    byId('review-count').textContent=checked.size+' / '+cards.length;
    byId('review-bar').style.width=checked.size/cards.length*100+'%';
    byId('start').textContent=(set!=='random' && kind!=='random')?'Start selected version':(set!=='random' || kind!=='random')?'Draw from selected conditions':'Start random version';
    empty.hidden=count>0;
  }
  ['set-select','care-select','unreviewed'].forEach(id=>byId(id).addEventListener('change',update));
  byId('reset-checks').addEventListener('click',()=>{checked.clear();saveChecks();update();});
  // The reference review stylesheet includes document-level styles. Limit its
  // lifetime to the board, preserving the shared family's fonts and palette.
  function toggleTheme(){byId('review-theme').disabled=byId('setup').hidden;}
  new MutationObserver(toggleTheme).observe(byId('setup'),{attributes:true,attributeFilter:['hidden']});
  toggleTheme();update();
})();
