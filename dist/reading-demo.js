/* Reading-only progressive enhancement. app.js still owns the request simulation
   and the native select remains its value, change-event and disabled-state source. */
(() => {
 function enhanceScenario(){
  const select=document.querySelector('#engineering #scenario');
  if(!select||select.dataset.readingEnhanced||typeof HTMLElement.prototype.showPopover!=='function')return;
  const nativeLabel=select.closest('label'),options=[...select.options];
  if(!nativeLabel||!options.length)return;
  const control=document.createElement('div');control.className='reading-scenario-control';
  const caption=document.createElement('label');caption.htmlFor=select.id;caption.className='scenario-label';caption.textContent='Scenario';
  const picker=document.createElement('div');picker.className='reading-scenario-picker';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='reading-scenario-trigger';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','reading-scenario-menu');
  const label=document.createElement('span');label.className='reading-scenario-current';
  const chevron=document.createElement('span');chevron.className='reading-scenario-chevron';chevron.setAttribute('aria-hidden','true');chevron.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>';
  trigger.append(label,chevron);
  const panel=document.createElement('div');panel.className='reading-scenario-panel';panel.id='reading-scenario-menu';panel.popover='auto';panel.setAttribute('role','menu');panel.setAttribute('aria-label','Request scenario');
  const items=options.map(option=>{
   const item=document.createElement('button');item.type='button';item.className='reading-scenario-item';item.setAttribute('role','menuitemradio');item.tabIndex=-1;item.dataset.value=option.value;
   const name=document.createElement('span');name.textContent=option.textContent;
   const check=document.createElement('span');check.className='reading-scenario-check';check.textContent='✓';check.setAttribute('aria-hidden','true');item.append(name,check);panel.append(item);
   item.addEventListener('click',()=>{if(select.disabled)return;select.value=option.value;sync();close(true);select.dispatchEvent(new Event('change',{bubbles:true}));});
   return item;
  });
  nativeLabel.replaceWith(control);control.append(caption,select,picker);picker.append(trigger,panel);select.dataset.readingEnhanced='true';
  let query='',queryTimer;
  const isReading=()=>document.body.classList.contains('reading-mode');
  function sync(){
   const current=options.find(option=>option.value===select.value)||options[0];label.textContent=current.textContent;trigger.setAttribute('aria-label','Scenario. Current scenario: '+current.textContent);trigger.disabled=select.disabled;
   items.forEach(item=>{item.setAttribute('aria-checked',String(item.dataset.value===current.value));item.disabled=select.disabled;});
   if(select.disabled)close(false);
  }
  function position(){
   if(!panel.matches(':popover-open'))return;
   const bounds=trigger.getBoundingClientRect(),width=Math.min(270,innerWidth-24),height=Math.min(panel.scrollHeight,innerHeight-24),spaceBelow=innerHeight-bounds.bottom-12;
   panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(bounds.left,innerWidth-width-12))+'px';
   panel.style.top=Math.max(12,spaceBelow>=height?bounds.bottom+8:bounds.top-height-8)+'px';panel.style.maxHeight=(innerHeight-24)+'px';
  }
  function focusItem(index){items[(index+items.length)%items.length].focus({preventScroll:true});}
  function open(direction){
   if(!isReading()||select.disabled||panel.matches(':popover-open'))return;
   sync();panel.showPopover();position();trigger.setAttribute('aria-expanded','true');
   const selected=items.findIndex(item=>item.dataset.value===select.value);focusItem(direction==='last'?items.length-1:Math.max(0,selected));
  }
  function close(restore){if(panel.matches(':popover-open'))panel.hidePopover();trigger.setAttribute('aria-expanded','false');if(restore&&!trigger.disabled)trigger.focus({preventScroll:true});}
  function syncMode(){const reading=isReading();select.hidden=reading;select.tabIndex=reading?-1:0;caption.htmlFor=reading?'':select.id;if(reading)select.setAttribute('aria-hidden','true');else{select.removeAttribute('aria-hidden');close(false);}}
  trigger.addEventListener('click',()=>panel.matches(':popover-open')?close(true):open());
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open(event.key==='ArrowUp'?'last':undefined);}});
  panel.addEventListener('keydown',event=>{
   const index=items.indexOf(document.activeElement);
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();focusItem(event.key==='Home'?0:event.key==='End'?items.length-1:index+(event.key==='ArrowDown'?1:-1));}
   else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
   else if(event.key==='Tab'){event.preventDefault();close(false);(event.shiftKey?trigger:document.querySelector('#engineering #run')||trigger).focus({preventScroll:true});}
   else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key!==' '){clearTimeout(queryTimer);query+=event.key.toLowerCase();queryTimer=setTimeout(()=>{query='';},650);const match=options.findIndex(option=>option.textContent.toLowerCase().startsWith(query));if(match>=0)focusItem(match);}
  });
  panel.addEventListener('toggle',event=>{const shown=event.newState==='open';trigger.setAttribute('aria-expanded',String(shown));if(!shown){clearTimeout(queryTimer);query='';}});
  for(const type of ['wheel','touchstart','touchmove'])panel.addEventListener(type,event=>event.stopPropagation(),{passive:true});
  select.addEventListener('change',sync);
  new MutationObserver(sync).observe(select,{attributes:true,attributeFilter:['disabled']});
  new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',position);addEventListener('scroll',()=>close(false),{passive:true});
  sync();syncMode();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceScenario,{once:true});else enhanceScenario();
})();
