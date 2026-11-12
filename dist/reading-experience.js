/* Desktop keeps the pinned Reading stage. Small and touch-first screens use
   native document flow, with no chapter transforms or intercepted scrolling. */
(() => {
 function buildTimeline(heights,available,viewport){
  const transition=Math.max(240,Math.min(520,viewport*.65));
  let cursor=0;
  const chapters=heights.map((height,index)=>{
   const overflow=Math.max(0,height-available);
   const reading=overflow;
   const chapter={start:cursor,overflow,reading,transition:index<heights.length-1?transition:0};
   cursor+=index<heights.length-1?reading+transition:overflow;
   return chapter;
  });
  return {chapters,total:cursor};
 }
 // Reversing inside a handoff resumes the chapter's content, rather than
 // stopping a second time at the edge just crossed. The opposite content
 // boundary still caps a large gesture, and ordinary forward stops are kept.
 function reverseBoundary(timeline,position,direction){
  for(let index=0;index<timeline.chapters.length-1;index++){
   const chapter=timeline.chapters[index],next=timeline.chapters[index+1];
   if(position>chapter.start+chapter.reading&&position<next.start){
    return direction<0?chapter.start:next.start+next.overflow;
   }
  }
  return null;
 }
 function stageState(timeline,position){
  const chapters=timeline.chapters;
  const y=Math.max(0,Math.min(timeline.total,position));
  let index=0;
  for(let i=1;i<chapters.length;i++)if(y>=chapters[i].start)index=i;
  const chapter=chapters[index],local=Math.max(0,y-chapter.start);
  // One complete chapter is visible on either side of the same handoff point.
  // Position alone determines the swap, so pausing and reversing never animate
  // opacity, slide content, leave a blank stage or complete the scroll for you.
  const active=chapter.transition&&y>=chapter.start+chapter.reading+chapter.transition/2?index+1:index;
  const states=chapters.map(()=>({enter:0,exit:0,read:0}));
  states[active]={enter:1,exit:0,read:active===index?Math.min(chapter.overflow,local):0};
  return {states,active,progress:timeline.total?y/timeline.total:0};
 }
 // Direct compositor properties avoid changing inherited custom properties
 // throughout a long chapter's entire subtree on every scroll frame.
 function paintChapter(section,content,cache,paint,visible,active){
  if(cache.visible!==visible){section.classList.toggle('is-on-stage',visible);cache.visible=visible;}
  if(cache.active!==active){section.classList.toggle('is-current',active);section.inert=!active;section.setAttribute('aria-hidden',String(!active));cache.active=active;}
  if(!visible)return;
  const opacity=paint.opacity.toFixed(4),transform='translate3d(0,'+paint.shift.toFixed(2)+'px,0)';
  if(cache.opacity!==opacity){section.style.opacity=opacity;cache.opacity=opacity;}
  if(cache.transform!==transform){content.style.transform=transform;cache.transform=transform;}
 }
 // The timeline math is also exercised directly without a browser.
 if(typeof module==='object'&&module.exports){module.exports={buildTimeline,stageState,paintChapter,reverseBoundary};return;}
 function enhanceReading(){
  const view=document.querySelector('.reading-view');
  if(!view||view.dataset.enhanced)return;
  view.dataset.enhanced='true';
  // Keep the working lab immediately before the closing contact/typing scene
  // in both the pinned stage and the native document fallback.
  const lab=view.querySelector('#engineering'),contact=view.querySelector('#contact');
  if(lab)view.append(lab);
  if(contact)view.append(contact);
  const sections=[...view.querySelectorAll(':scope > section')];
  const nav=view.querySelector('.reading-index');
  if(lab&&![...nav.querySelectorAll('a')].some(link=>link.hash==='#engineering')){const link=document.createElement('a');link.href='#engineering';link.textContent='Engineering lab';nav.append(link);}
  const links=[...nav.querySelectorAll('a')];
  sections.forEach(section=>{const link=links.find(link=>link.hash==='#'+section.id);if(link)nav.append(link);});
  const labels={about:'About me',skills:'Engineering toolkit',experience:'Experience',codetrail:'Selected work · 01',lumicare:'Selected work · 02',golivescore:'Selected work · 03',wishlist:'Selected work · 04',jobhunt:'Selected work · 05',ai:'AI engineering',engineering:'Engineering lab',contact:'Start a conversation'};
  const navTitle=document.createElement('p');navTitle.className='reading-index-title';navTitle.textContent='In this portfolio';nav.prepend(navTitle);
  const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');
  const progressFill=document.createElement('span');progress.append(progressFill);view.prepend(progress);
  const stage=document.createElement('div');stage.className='reading-stage';view.append(stage);
  sections.forEach((section,index)=>{
   section.classList.add('reading-scene');section.tabIndex=-1;
   const heading=section.querySelector('h2');
   if(heading){heading.id=section.id+'-heading';section.setAttribute('aria-labelledby',heading.id);}
   const content=document.createElement('div');content.className='reading-scene-content';
   const eyebrow=document.createElement('div');eyebrow.className='reading-chapter';
   const number=document.createElement('span');number.className='reading-chapter-number';number.textContent=String(index+1).padStart(2,'0');number.setAttribute('aria-hidden','true');
   const label=document.createElement('span');label.textContent=labels[section.id]||links.find(link=>link.hash==='#'+section.id)?.textContent||heading?.textContent||section.id;eyebrow.append(number,label);content.append(eyebrow);
   for(const child of [...section.childNodes])content.append(child);
   if(index<sections.length-1){
    const next=document.createElement('a');next.className='reading-next-chapter';next.href='#'+sections[index+1].id;next.textContent='Next: '+links.find(link=>link.hash==='#'+sections[index+1].id).textContent+' →';content.append(next);
   }
   section.append(content);stage.append(section);
  });
  const footer=view.querySelector(':scope > footer');if(footer)sections[sections.length-1].querySelector('.reading-scene-content').append(footer);
  const contents=sections.map(section=>section.querySelector('.reading-scene-content'));
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen=matchMedia('(max-width: 1024px), (pointer: coarse)');
  const documentRequired=()=>media.matches||smallScreen.matches;
  let pendingLayout=false;
  const paintedReads=sections.map(()=>0),paintCaches=sections.map(()=>({}));
  let navCurrent=-1;
  let frame=0,measureFrame=0,enabled=false,pinned=false,storyFailed=false,fitDocument=false,current=0,timeline=null,viewTop=0,safeTop=120,safeBottom=32,viewport=innerHeight;
  const fittedChapters=new Set(['about','skills','codetrail','lumicare','golivescore','jobhunt','engineering']);
  const modalOpen=()=>!!document.querySelector('dialog[open]');
  const pacing=window.PortfolioScroll?.create({
   active:()=>enabled&&pinned&&!!timeline,
   stops:()=>[...new Set(timeline.chapters.flatMap(chapter=>chapter.overflow?[viewTop+chapter.start,viewTop+chapter.start+chapter.overflow]:[viewTop+chapter.start]).concat(viewTop+timeline.total))].sort((a,b)=>a-b),
   // Trackpads already provide a smooth stream. Apply bounded input on the
   // next frame, without a second animation queue or a delayed reverse tail.
   immediate:true,
   reverseBoundary:(position,direction)=>{
    const boundary=reverseBoundary(timeline,position-viewTop,direction);
    return boundary===null?null:viewTop+boundary;
   },
   gain:.85,onScroll:()=>{if(frame)cancelAnimationFrame(frame);draw();}
  });
  function setCurrent(index){
   current=index;if(navCurrent===index)return;navCurrent=index;
   links.forEach(link=>{if(link.hash==='#'+sections[index].id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  function resetDocument(){
   pacing?.cancel();pinned=false;timeline=null;
   cancelAnimationFrame(frame);cancelAnimationFrame(measureFrame);frame=0;measureFrame=0;
   view.classList.remove('reading-pinned','reading-stage-ready');view.style.height='';
   sections.forEach((section,index)=>{section.inert=false;section.removeAttribute('inert');section.removeAttribute('aria-hidden');section.classList.remove('is-on-stage','is-current');section.style.removeProperty('opacity');contents[index].style.removeProperty('transform');paintCaches[index]={};paintedReads[index]=0;});
   progressFill.style.transform='scaleX(0)';
  }
  function failOpen(error){
   resetDocument();
   storyFailed=true;
   console.warn('Reading story unavailable; document view restored.',error);
  }
  function measure(){
   measureFrame=0;if(!enabled||!pinned)return;
   // Never hide document content while waiting for a visible, measurable frame.
   if(document.hidden||modalOpen()){if(!view.classList.contains('reading-stage-ready'))resetDocument();return;}
   try{
    pacing?.cancel();
    viewport=stage.clientHeight;
    safeTop=parseFloat(getComputedStyle(sections[0]).paddingTop);
    safeBottom=parseFloat(getComputedStyle(sections[0]).paddingBottom);
    const heights=contents.map(content=>content.offsetHeight);
    viewTop=view.getBoundingClientRect().top+scrollY;
    if(!Number.isFinite(viewport)||viewport<=0||!Number.isFinite(safeTop)||!Number.isFinite(safeBottom)||!Number.isFinite(viewTop)||!Number.isFinite(scrollY)||heights.some(height=>!Number.isFinite(height)||height<=0))throw new Error('Invalid Reading geometry');
    const available=Math.max(120,viewport-safeTop-safeBottom);
    if(heights.some((height,index)=>fittedChapters.has(sections[index].id)&&height>available+2)){
     // Do not shrink text or clip an expanded chapter to enforce a one-screen
     // layout. Stay in document flow until a resize or a fresh Reading entry,
     // avoiding a pinned/document oscillation as filters change content height.
     fitDocument=true;resetDocument();
     sections[current].scrollIntoView({behavior:'instant',block:'start'});request();return;
    }
    timeline=buildTimeline(heights,available,viewport);
    if(!Number.isFinite(timeline.total))throw new Error('Invalid Reading timeline');
    view.style.height=(timeline.total+viewport)+'px';
    // Measurement, first paint and readiness commit happen in one task.
    if(!draw())throw new Error('Reading first paint did not complete');
    view.classList.add('reading-stage-ready');
   }catch(error){failOpen(error);}
  }
  function queueMeasure(){if(enabled&&pinned&&!measureFrame)measureFrame=requestAnimationFrame(()=>measure());}
  function draw(){
   frame=0;if(!enabled||document.hidden||modalOpen())return false;
   try{
   if(!pinned){
    let active=0;sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=innerHeight*.43)active=index;});setCurrent(active);progressFill.style.transform='scaleX(0)';return true;
   }
   if(!timeline)return false;
   if(!Number.isFinite(scrollY))throw new Error('Invalid Reading position');
   const state=stageState(timeline,scrollY-viewTop);
   state.states.forEach((item,index)=>{
    const section=sections[index],visible=item.enter===1,active=index===state.active;
    paintedReads[index]=item.read;
    // Only a chapter handoff changes focus/accessibility. Ordinary scrolling
    // updates only the current chapter's content position.
    if(paintCaches[index].active!==active&&!active&&section.contains(document.activeElement))document.activeElement.blur();
    paintChapter(section,contents[index],paintCaches[index],{opacity:1,shift:-item.read},visible,active);
   });
   setCurrent(state.active);progressFill.style.transform='scaleX('+state.progress+')';
   return true;
   }catch(error){failOpen(error);return false;}
  }
  function request(){if(enabled&&!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
  function applyLayout(){
   pacing?.cancel();fitDocument=false;
   pinned=enabled&&!documentRequired()&&!storyFailed;
   view.classList.remove('reading-stage-ready');
   view.classList.toggle('reading-pinned',pinned);
   if(pinned)measure();
   else{resetDocument();request();}
  }
  function syncMode(){
   const next=document.body.classList.contains('reading-mode');if(next===enabled)return;
   enabled=next;
   if(enabled)applyLayout();else{cancelAnimationFrame(frame);cancelAnimationFrame(measureFrame);frame=0;measureFrame=0;applyLayout();}
  }
  function navigate(event){
   const link=event.target.closest('a[href^="#"]');if(!link)return;
   const index=sections.findIndex(section=>'#'+section.id===link.hash);if(index<0)return;
   event.preventDefault();pacing?.cancel();
   if(pinned&&timeline){
    // Index navigation is explicit and is not limited to the adjacent chapter.
    window.scrollTo({top:viewTop+timeline.chapters[index].start,behavior:'instant'});draw();
   }else sections[index].scrollIntoView({behavior:'instant',block:'start'});
   sections[index].focus({preventScroll:true});history.replaceState(null,'',link.hash);request();
  }
  view.addEventListener('click',navigate);
  view.addEventListener('focusin',event=>{
   if(!pinned||!timeline||modalOpen()||event.target.closest('[popover]'))return;
   const section=event.target.closest('.reading-scene');if(!section||event.target===section)return;
   const index=sections.indexOf(section),chapter=timeline.chapters[index];
   // Native focus scrolling does not understand a pinned timeline. Use the
   // control's local content position and last painted reading offset, never
   // the browser's temporary root scroll position, to reveal it predictably.
   const rect=event.target.getBoundingClientRect(),contentRect=contents[index].getBoundingClientRect();
   const localTop=rect.top-contentRect.top,localBottom=localTop+rect.height,available=viewport-safeTop-safeBottom;
   let read=paintedReads[index];
   if(localTop<read+8)read=localTop-16;
   else if(localBottom>read+available-8)read=localBottom-available+16;
   read=Math.max(0,Math.min(chapter.overflow,read));
   const targetY=viewTop+chapter.start+read;
   pacing?.cancel();
   if(Math.abs(scrollY-targetY)>1){window.scrollTo({top:targetY,behavior:'instant'});draw();}
  });
  function resizeLayout(){
   if(!enabled)return;
   if(!fitDocument){queueMeasure();return;}
   if(modalOpen()){pendingLayout=true;return;}
   const index=current;applyLayout();
   if(pinned&&timeline){window.scrollTo({top:viewTop+timeline.chapters[index].start,behavior:'instant'});draw();}
   request();
  }
  addEventListener('scroll',request,{passive:true});addEventListener('resize',resizeLayout);
  function restoreLayout(){if(enabled&&!document.hidden){if(pinned)measure();else if(!storyFailed&&!fitDocument)applyLayout();request();}}
  document.addEventListener('visibilitychange',restoreLayout);addEventListener('pageshow',restoreLayout);
  const motionChanged=()=>{
   // Preserve the current chapter when crossing layout modes. A native dialog
   // keeps its focus and scroll position until it closes.
   if(enabled&&modalOpen()){pendingLayout=true;return;}
   pendingLayout=false;const index=current;applyLayout();
   if(enabled){if(pinned&&timeline)window.scrollTo({top:viewTop+timeline.chapters[index].start,behavior:'instant'});else sections[index].scrollIntoView({behavior:'instant',block:'start'});request();}
  };
  if(media.addEventListener)media.addEventListener('change',motionChanged);else media.addListener(motionChanged);
  if(smallScreen.addEventListener)smallScreen.addEventListener('change',motionChanged);else smallScreen.addListener(motionChanged);
  document.addEventListener('close',()=>{if(pendingLayout)motionChanged();},true);
  // Closing a card only resumes painting. No snapping or scroll command runs.
  document.addEventListener('close',()=>{queueMeasure();request();},true);
  if(typeof ResizeObserver!=='undefined'){const resize=new ResizeObserver(queueMeasure);contents.forEach(content=>resize.observe(content));}
  document.fonts?.ready.then(()=>{if(enabled&&pinned)measure();});
  new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['class']});syncMode();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceReading,{once:true});else enhanceReading();
})();
