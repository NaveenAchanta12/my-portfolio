/* Progressive enhancement. All project claims and links originate in the existing page. */
function enhanceShowcase(){
 const marks={'JavaScript':'javascript','HTML':'html5','CSS':'css3','React 18':'react','C#':'csharp','TypeScript':'typescript','TypeScript database schema':'typescript','.NET':'dotnet','ASP.NET':'dotnet','Angular':'angular','React':'react','React 19':'react','React Native':'react','Node.js':'nodejs','Node.js build tooling':'nodejs','PostgreSQL':'postgresql','Microsoft Azure':'azure','Azure DevOps':'azure'};
 function mark(name){const key=marks[name];if(!key)return null;const img=document.createElement('img');img.src='assets/technology-marks/'+key+'.svg';img.alt='';img.width=32;img.height=32;img.decoding='async';return img;}

 const groups=[
  {title:'Languages',label:'Languages',short:'Language'},
  {title:'Backend & APIs',label:'Backend & APIs',short:'Backend'},
  {title:'Frontend & Mobile',label:'Frontend',short:'Interface'},
  {title:'Data & Search',label:'Data & Storage',short:'Data'},
  {title:'Cloud, DevOps & Observability',label:'Cloud & DevOps',short:'Cloud'},
  {title:'AI & Testing',label:'AI & Testing',short:'AI & testing'}
 ];
 const toolkitMarks={...marks,Java:'java',JavaScript:'javascript',Git:'git',Terraform:'terraform','MongoDB (NoSQL)':'mongodb',HTML5:'html5',CSS3:'css3',Bootstrap:'bootstrap',jQuery:'jquery',Oracle:'oracle','SQL Server':'microsoftsqlserver'};
 const contexts={'C#':'.NET','Java':'Enterprise','JavaScript':'Web','TypeScript':'Typed','.NET':'Framework','ASP.NET':'Web API','ASP.NET MVC':'MVC pattern','Entity Framework':'ORM','React Native':'Mobile','Microsoft Azure':'Platform','AWS':'Platform','Kubernetes':'Orchestration','FastAPI':'Python API','Django':'Python framework','Spring':'Java framework','Next.js':'React framework','Redis':'Key-value store','Kafka':'Event streaming','OpenAI API':'Model integration','AI agents':'Orchestration','AI evaluations':'Evaluation','Azure DevOps':'Delivery','SQL Server':'Relational','Oracle':'Relational','PostgreSQL':'Relational','MongoDB (NoSQL)':'Document store','LLM APIs':'Integration','NUnit':'Testing','MSTest':'Testing','Moq':'Mocking','JUnit':'Testing','Mockito':'Mocking'};
 const overviewNames=['C#','Java','JavaScript','TypeScript','.NET','ASP.NET','Angular','React','Microsoft Azure','AWS'];
 // Distinct from brand logos: these original pictograms identify a tool's purpose.
 const pictograms={
  Language:'<path d="m9 6-6 6 6 6m6-12 6 6-6 6m-2-15-2 18"/>',
  Backend:'<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M12 7h5M12 17h5"/>',
  Interface:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 6.5h.01M9 6.5h.01M7 13l-2 2 2 2m10-4 2 2-2 2"/>',
  Data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  Cloud:'<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11Z"/>',
  'AI & testing':'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/>'
 };
 let toolkitIndex=0;
 for(const section of document.querySelectorAll('#skills,.city-stop[data-stop="skills"]')){
  if(section.classList.contains('engineering-toolkit'))continue;
  const originals=[...section.querySelectorAll(':scope > details')];if(!originals.length)continue;
  const entries=[];
  for(const group of groups){const detail=originals.find(d=>d.querySelector('summary')?.textContent.trim()===group.title);if(!detail)continue;
   for(const span of detail.querySelectorAll('.verified-tools > span'))entries.push({name:span.textContent.trim(),...group});
  }
  if(!entries.length)continue;
  section.classList.add('engineering-toolkit');
  const atlas=document.createElement('div');atlas.className='skill-atlas';
  const heading=document.createElement('div');heading.className='toolkit-heading';
  for(const node of section.querySelectorAll(':scope > .city-kicker,:scope > h2,:scope > p'))heading.append(node);
  atlas.append(heading);
  const filters=document.createElement('div');filters.className='atlas-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter engineering tools');atlas.append(filters);
  const board=document.createElement('div');board.className='atlas-board';
  const grid=document.createElement('ul');grid.className='atlas-grid';grid.id='toolkit-grid-'+(++toolkitIndex);grid.setAttribute('aria-label','Selected engineering tools');board.append(grid);
  const status=document.createElement('p');status.className='atlas-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');board.append(status);atlas.append(board);
  const overview=overviewNames.map(name=>entries.find(entry=>entry.name===name)).filter(Boolean);
  function render(family){
   const shown=family==='All tools'?overview:entries.filter(entry=>entry.label===family);
   grid.replaceChildren();grid.classList.toggle('atlas-grid-overview',family==='All tools');grid.setAttribute('aria-label',family==='All tools'?'Selected engineering tools':family+' tools');
   for(const entry of shown){
    const tile=document.createElement('li');tile.className='skill-element';tile.dataset.family=entry.label;
    const icon=document.createElement('span');icon.className='toolkit-icon';icon.setAttribute('aria-hidden','true');
    const key=toolkitMarks[entry.name];
    if(key){const logo=document.createElement('img');logo.src='assets/technology-marks/'+key+'.svg';logo.alt='';logo.width=38;logo.height=38;logo.decoding='async';icon.append(logo);}
    else{icon.classList.add('toolkit-pictogram');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+pictograms[entry.short]+'</svg>';}
    const name=document.createElement('span');name.className='toolkit-name';name.textContent=entry.name;
    const context=document.createElement('small');context.className='toolkit-context';context.textContent=entry.short+(contexts[entry.name]?' · '+contexts[entry.name]:'');
    tile.append(icon,name,context);grid.append(tile);
   }
   status.textContent=family==='All tools'?'Selected tools · Explore a discipline for more':family+' · '+shown.length+' tools';
  }
  for(const family of ['All tools',...groups.map(group=>group.label)]){
   const button=document.createElement('button');button.type='button';button.textContent=family;button.setAttribute('aria-controls',grid.id);button.setAttribute('aria-pressed',String(family==='All tools'));
   button.addEventListener('click',()=>{render(family);for(const item of filters.children)item.setAttribute('aria-pressed',String(item===button));});filters.append(button);
  }
  // The filtered toolkit replaces the duplicate full-toolkit disclosure.
  // Original source details remain the no-JavaScript fallback.
  section.replaceChildren(atlas);render('All tools');
 }
 
 // Leave the original accessible disclosures in place if modal dialogs are unavailable.
 if(typeof HTMLDialogElement==='undefined')return;
 let projectIndex=0;
 const topicIcons={
  build:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18m-13 4-2 2 2 2m8-4 2 2-2 2M8 5V3m8 2V3"/>',
  stack:'<path d="m12 3 10 5-10 5L2 8Zm-9 9 9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>',
  detail:'<rect x="8" y="3" width="8" height="5" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M12 8v4m-6.5 4v-4h13v4"/>',
 };
 let topicIndex=0;
  function topic(cards,groupName,projectName,label,icon,description){
   const card=document.createElement('div');card.className='project-topic';
   const trigger=document.createElement('button');trigger.type='button';trigger.className='project-topic-trigger';
   const graphic=document.createElement('span');graphic.className='project-topic-icon';graphic.setAttribute('aria-hidden','true');
   graphic.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+topicIcons[icon]+'</svg>';
   const title=document.createElement('span');title.className='project-topic-title';title.textContent=label;
   const hint=document.createElement('small');hint.className='project-topic-hint';hint.textContent=description;
   const arrow=document.createElement('span');arrow.className='project-topic-arrow';arrow.setAttribute('aria-hidden','true');
   arrow.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 8h10M8 3l5 5-5 5"/></svg>';
   trigger.append(graphic,title,hint,arrow);card.append(trigger);
   const dialog=document.createElement('dialog');dialog.className='project-reveal';dialog.id=groupName+'-'+(++topicIndex);
   trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);
   const header=document.createElement('header');header.className='project-reveal-header';
   const context=document.createElement('p');context.className='project-reveal-context';context.textContent=projectName;
   const heading=document.createElement('h2');heading.id=dialog.id+'-title';heading.textContent=label;dialog.setAttribute('aria-labelledby',heading.id);
   const close=document.createElement('button');close.type='button';close.className='project-reveal-close';close.setAttribute('aria-label','Close '+label);close.autofocus=true;
   close.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
   const revealIcon=document.createElement('span');revealIcon.className='project-reveal-icon';revealIcon.setAttribute('aria-hidden','true');revealIcon.innerHTML=graphic.innerHTML;
   header.append(revealIcon,context,heading,close);
   const content=document.createElement('div');content.className='project-topic-content';content.tabIndex=0;content.setAttribute('role','region');content.setAttribute('aria-label',label+' content');
   dialog.append(header,content);card.append(dialog);cards.append(card);
   let closing=false,closeTimer,closeInput='keyboard';
   // Safari does not always focus buttons on pointer clicks. Restore to the
   // trigger explicitly, not the previously focused chapter behind the modal.
   function clearRestoredFocus(){trigger.classList.remove('project-pointer-focus');trigger.classList.remove('project-keyboard-focus');}
   trigger.addEventListener('blur',clearRestoredFocus);
   trigger.addEventListener('pointerdown',clearRestoredFocus);
   trigger.addEventListener('keydown',clearRestoredFocus);
   function finishClose(){
    if(!closing)return;
    clearTimeout(closeTimer);closing=false;dialog.close();
    trigger.classList.add(closeInput==='pointer'?'project-pointer-focus':'project-keyboard-focus');
    trigger.focus({preventScroll:true});
   }
   function dismiss(input){
    if(!dialog.open||closing)return;
    closeInput=input;closing=true;dialog.classList.remove('is-revealed');
    // Reading uses immediate native close; no delayed top-layer teardown while scrolling.
    if(document.body.classList.contains('reading-mode')||matchMedia('(prefers-reduced-motion: reduce)').matches)finishClose();
    else closeTimer=setTimeout(finishClose,560);
   }
   trigger.addEventListener('click',()=>{
    if(dialog.open)return;
    clearRestoredFocus();trigger.focus({preventScroll:true});
    dialog.showModal();content.scrollTop=0;
    // Establish the front face before revealing it. CSS owns the entire transition.
    dialog.getBoundingClientRect();dialog.classList.add('is-revealed');
   });
   close.addEventListener('click',event=>dismiss(event?.detail===0?'keyboard':'pointer'));
   dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss('keyboard');});
   dialog.addEventListener('transitionend',event=>{if(event.target===dialog&&event.propertyName==='transform')finishClose();});
   dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dismiss(event.detail===0?'keyboard':'pointer');
   });
   // Prevent a detail-card gesture from reaching city navigation or the page behind it.
   for(const type of ['wheel','touchstart','touchmove'])dialog.addEventListener(type,event=>event.stopPropagation(),{passive:true});
   dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key!=='Tab')return;
    // Detail cards contain text only: keep their two focus stops in a closed loop.
    if(event.shiftKey&&document.activeElement===close){event.preventDefault();content.focus();}
    else if(!event.shiftKey&&document.activeElement===content){event.preventDefault();close.focus();}
   });
   dialog.addEventListener('close',()=>{
    // Native close events are queued. Do not let a prior close hide a newly reopened card.
    if(dialog.open)return;
    clearTimeout(closeTimer);closing=false;dialog.classList.remove('is-revealed');
   });
   return content;
  }
 for(const section of document.querySelectorAll('.project-showcase')){
  if(section.classList.contains('project-refined'))continue;
  const details=[...section.querySelectorAll(':scope > details.project-detail')];if(!details.length)continue;
  section.classList.add('project-refined');
  const layout=document.createElement('div');layout.className='project-layout';
  const overview=document.createElement('header');overview.className='project-overview';
  const kicker=section.querySelector(':scope > .city-kicker');if(kicker){kicker.classList.add('sr-only');overview.append(kicker);}
  for(const node of section.querySelectorAll(':scope > h2,:scope > .project-meta'))overview.append(node);
  const lede=section.querySelector(':scope > .project-lede');
  let remainingAbout='';
  if(lede){
   const text=lede.textContent.trim(),end=text.search(/[.!?](?:\s|$)/);
   if(end>=0&&end<text.length-1){remainingAbout=text.slice(end+1).trim();lede.textContent=text.slice(0,end+1);}
   const label=document.createElement('p');label.className='project-about-label';label.textContent='About';overview.append(label,lede);
  }
  const cards=document.createElement('div');cards.className='project-topics';cards.setAttribute('aria-label','Explore this project');
  const groupName='project-topics-'+(++projectIndex);
  const projectName=overview.querySelector('h2').textContent.trim();
  function retainDetail(detail,target){
   if(!detail)return;
   const summary=detail.querySelector(':scope > summary'),body=detail.querySelector('.project-detail-body');
   if(summary){const title=document.createElement('h3');title.className='project-subheading';title.textContent=summary.textContent.trim();target.append(title);}
   if(body)target.append(body);
   detail.remove();
  }
  const built=topic(cards,groupName,projectName,'What I built','build','Contributions');retainDetail(details[0],built);
  const stack=topic(cards,groupName,projectName,'Tech stack','stack','Tools & languages');retainDetail(details[1],stack);
  const technical=topic(cards,groupName,projectName,'Technical details','detail','Architecture & scope');
  if(remainingAbout){const p=document.createElement('p');p.className='project-about-continuation';p.textContent=remainingAbout;technical.append(p);}
  for(const detail of details.slice(2))retainDetail(detail,technical);
  for(const note of section.querySelectorAll(':scope > .project-scope-note'))technical.append(note);
  for(const node of section.querySelectorAll(':scope > .project-actions,:scope > .link-pending'))overview.append(node);
  const mark=section.querySelector(':scope > .project-mark');if(mark)mark.remove();
  layout.append(overview,cards);section.append(layout);
 }
 // The employment timeline stays still while its detailed cards open above it.
 let careerIndex=0;
 for(const section of document.querySelectorAll('.experience-section')){
  if(section.classList.contains('experience-refined'))continue;
  section.classList.add('experience-refined');
  for(const role of section.querySelectorAll('.employment')){
   role.classList.add('project-refined');
   const cards=role.querySelector('.experience-details');
   if(!cards)continue;
   const details=[...cards.querySelectorAll(':scope > details')];
   const context=role.querySelector('h3').textContent.trim()+' · '+role.querySelector('.experience-role').textContent.trim();
   cards.classList.add('project-topics');cards.setAttribute('aria-label','Explore '+context);
   for(const [i,detail] of details.entries()){
    const summary=detail.querySelector('summary');
    const content=topic(cards,'career-'+(++careerIndex),context,summary.textContent.trim(),i===0?'build':'stack',i===0?'Role & contributions':'Complete toolkit');
    const body=document.createElement('div');body.className='project-detail-body';
    for(const node of [...detail.children])if(node!==summary)body.append(node);
    content.append(body);detail.remove();
   }
  }
 }
 // Three familiar cards keep this chapter concise without losing evidence or scope.
 let aiIndex=0;
 for(const section of document.querySelectorAll('.ai-practice-section')){
  if(section.classList.contains('project-refined'))continue;
  const details=[...section.querySelectorAll(':scope > details')];if(details.length!==5)continue;
  section.classList.add('project-refined');
  const layout=document.createElement('div');layout.className='project-layout';
  const overview=document.createElement('header');overview.className='project-overview';
  const kicker=section.querySelector(':scope > .city-kicker');if(kicker){kicker.classList.add('sr-only');overview.append(kicker);}
  overview.append(section.querySelector(':scope > h2'));
  const lede=section.querySelector(':scope > p');lede.classList.add('project-lede');
  const sentences=lede.textContent.trim().split(' My focus is ');
  lede.textContent=sentences[0];overview.append(lede);
  const signature=document.createElement('p');signature.className='ai-practice-signature';signature.textContent='Context. Validation. User control.';overview.append(signature);
  const cards=document.createElement('div');cards.className='project-topics';cards.setAttribute('aria-label','Explore AI engineering');
  const name='ai-practice-'+(++aiIndex),context='AI engineering in practice';
  function moveDetail(detail,content){
   const summary=detail.querySelector('summary'),heading=document.createElement('h3');heading.className='project-subheading';heading.textContent=summary.textContent.trim();
   const body=document.createElement('div');body.className='project-detail-body';
   for(const node of [...detail.children])if(node!==summary)body.append(node);
   content.append(heading,body);detail.remove();
  }
  const approach=topic(cards,name,context,'Engineering practices','detail','Context & control');
  if(sentences[1]){const p=document.createElement('p');p.className='project-about-continuation';p.textContent='My focus is '+sentences[1];approach.append(p);}
  moveDetail(details[0],approach);
  const agents=topic(cards,name,context,'Agent workflows','build','JobHunt AI');moveDetail(details[1],agents);
  const products=topic(cards,name,context,'AI in products','stack','Learning & discovery');for(const detail of details.slice(2))moveDetail(detail,products);
  const footnote=section.querySelector(':scope > .ai-footnote');
  layout.append(overview,cards);section.append(layout);if(footnote)section.append(footnote);
 }

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceShowcase,{once:true});else enhanceShowcase();
