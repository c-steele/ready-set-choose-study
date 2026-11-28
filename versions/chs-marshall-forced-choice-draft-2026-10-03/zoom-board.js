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
  const schedule = window.ZoomAssignment;
  const cards = roleSets.flatMap(set => care.map(event => ({
    set, event, id:set.id + '-' + event.id,
    examples:[1,2,3,4].map(visit=>schedule.forCell(set.id,event.id,visit)).sort((a,b)=>a.visualPlan-b.visualPlan)
  })));
  const examples = cards.flatMap(card=>card.examples);
  const numberInput = byId('assignment-number');
  const incomingNumber = new URL(location.href).searchParams.get('assignment');
  if(incomingNumber !== null) numberInput.value = incomingNumber;
  let stagedNumber;
  function sessionURL(number,rehearsal) {
    const url = new URL('zoom.html',document.baseURI);
    url.searchParams.set('launch','1');
    url.searchParams.set('assignment',String(number));
    if(rehearsal) url.searchParams.set('rehearsal','1');
    return url.href;
  }
  function describe(assignment) {
    return roleNames[assignment.set]+' · '+care.find(event=>event.id===assignment.care).name+' · Plan '+assignment.visualPlan;
  }
  function enteredAssignment() {
    const value = numberInput.value;
    const number = Number(value);
    if(!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1) return null;
    return schedule.forNumber(number);
  }
  const checkKey = 'obligation-zoom-reviewed-layouts-1';
  let checked = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(checkKey) || '[]');
    if (Array.isArray(saved)) checked = new Set(saved.filter(number => examples.some(example=>example.number===number)));
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
  function planLink(example) {
    const wrapper=element('div','plan-example');
    wrapper.dataset.number=example.number;
    const link=element('a','','Plan '+example.visualPlan+' ↗');
    link.href=sessionURL(example.number,true);
    link.target='_blank';link.rel='noopener';
    link.setAttribute('aria-label','Rehearse assignment '+example.number+', '+describe(example));
    link.append(element('small','','Assignment '+example.number));
    const label=element('label','review-done');
    const check=element('input');check.type='checkbox';
    check.setAttribute('aria-label','Mark assignment '+example.number+', '+describe(example)+' reviewed');
    check.addEventListener('change',()=>{
      if(check.checked) checked.add(example.number); else checked.delete(example.number);
      saveChecks();update();
    });
    label.append(check,element('span','','Reviewed'));
    wrapper.append(link,label);
    return wrapper;
  }
  function card(entry) {
    const {set,event,id}=entry;
    const article=element('article','review-card');
    article.dataset.version=id;
    const top=element('div','review-card-topline');
    top.append(element('span','review-role',roleNames[set.id]));
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
    const links=element('div','plan-links');
    links.append(...entry.examples.map(planLink));
    article.append(top,heading,dl,details,links);
    return article;
  }
  const rendered=new Map(cards.map(entry=>{
    const article=card(entry); grid.append(article);
    return [entry.id,article];
  }));
  const empty=element('p','review-empty','No combinations match these filters.');
  grid.append(empty);
  function update() {
    let count=0;
    const set=byId('set-select').value, kind=byId('care-select').value, unreviewed=byId('unreviewed').checked;
    for(const entry of cards) {
      const article=rendered.get(entry.id);
      const allDone=entry.examples.every(example=>checked.has(example.number));
      article.hidden=(set!=='random' && set!==entry.set.id) || (kind!=='random' && kind!==entry.event.id) || (unreviewed && allDone);
      article.classList.toggle('is-reviewed',allDone);
      for(const preview of article.querySelectorAll('.plan-example')) {
        const done=checked.has(Number(preview.dataset.number));
        preview.querySelector('input').checked=done;
        preview.hidden=unreviewed && done;
      }
      if(!article.hidden) count++;
    }
    byId('visible-count').textContent=count+' '+(count===1?'combination':'combinations');
    byId('review-count').textContent=checked.size+' / '+examples.length;
    byId('review-bar').style.width=checked.size/examples.length*100+'%';
    empty.hidden=count>0;
  }
  function stage(assignment) {
    if(stagedNumber===assignment.number) return;
    stagedNumber=assignment.number;
    byId('rehearsal-assignment').value=String(assignment.number);
    byId('rehearsal-summary').textContent='Previewing assignment '+assignment.number+' · '+describe(assignment);
    window.dispatchEvent(new CustomEvent('zoom-rehearsal-selected',{detail:{number:assignment.number}}));
  }
  function stageFilterExample() {
    const set=byId('set-select').value, kind=byId('care-select').value;
    const eligible=examples.filter(example=>(set==='random'||set===example.set) && (kind==='random'||kind===example.care));
    stage(eligible[Math.floor(Math.random()*eligible.length)]);
  }
  const scheduleLength=216;
  function blockStart(number) {
    return number-(number-1)%scheduleLength;
  }
  function syncNumber() {
    const assignment=enteredAssignment();
    numberInput.setCustomValidity(numberInput.value && !assignment ? 'Enter a positive whole assignment number.' : '');
    byId('assignment-summary').textContent=assignment ? 'Assignment '+assignment.number+' · '+describe(assignment) : '';
    const first=blockStart(assignment?.number||1);
    byId('download-schedule').textContent='Download assignments '+first+'–'+Math.min(first+scheduleLength-1,Number.MAX_SAFE_INTEGER)+' (CSV)';
    if(assignment) stage(assignment); else stageFilterExample();
  }
  function downloadSchedule() {
    const first=blockStart(enteredAssignment()?.number||1);
    const count=Math.min(scheduleLength,Number.MAX_SAFE_INTEGER-first+1);
    const rows=[['Assignment number','Character set','Kind of care','Visual plan','Story order','First helper rated in story 1','Participant session','Rehearsal','Pilot or main collection','Testing status']];
    for(let offset=0;offset<count;offset++) {
      const n=first+offset, assignment=schedule.forNumber(n);
      const names=assignment.pairingOrder.map(id=>pairingDetails.get(id).label);
      rows.push([n,roleNames[assignment.set],care.find(event=>event.id===assignment.care).name,assignment.visualPlan,names.join(' / '),assignment.firstRatingSide,sessionURL(n,false),sessionURL(n,true),'','']);
    }
    const csv = rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
    const link=element('a');link.href=url;link.download='Who Has to Help - assignments '+first+'-'+(first+count-1)+'.csv';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  ['set-select','care-select'].forEach(id=>byId(id).addEventListener('change',()=>{update();stageFilterExample();}));
  byId('unreviewed').addEventListener('change',update);
  byId('reset-checks').addEventListener('click',()=>{checked.clear();saveChecks();update();});
  byId('download-schedule').addEventListener('click',downloadSchedule);
  numberInput.addEventListener('input',syncNumber);
  if(!byId('setup').hidden) syncNumber();
  // The reference review stylesheet includes document-level styles. Limit its
  // lifetime to the board, preserving the shared family's fonts and palette.
  function toggleTheme(){
    const hidden=byId('setup').hidden;
    byId('review-theme').disabled=hidden;
    if(!hidden && stagedNumber===undefined) syncNumber();
  }
  new MutationObserver(toggleTheme).observe(byId('setup'),{attributes:true,attributeFilter:['hidden']});
  toggleTheme();update();
})();
