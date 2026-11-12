/* Progressive enhancement: the native select remains the fallback and route source. */
(() => {
 function enhanceNavigation(){
  const select=document.querySelector('#city-destination');
  if(!select||select.dataset.enhanced||typeof HTMLElement.prototype.showPopover!=='function')return;
  const nativeLabel=select.closest('.city-select-label');if(!nativeLabel)return;
  const options=[...select.options];if(!options.length)return;
  const picker=document.createElement('div');picker.className='section-picker';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='section-picker-trigger';
  trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','portfolio-section-menu');
  const icon=document.createElement('span');icon.className='section-picker-icon';icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="5" height="5" rx="1.4"/><rect x="12" y="3" width="5" height="5" rx="1.4"/><rect x="3" y="12" width="5" height="5" rx="1.4"/><path d="M12 14.5h5m-2.5-2.5v5"/></svg>';
  const label=document.createElement('span');label.className='section-picker-current';
  const chevron=document.createElement('span');chevron.className='section-picker-chevron';chevron.setAttribute('aria-hidden','true');
  chevron.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>';
  trigger.append(icon,label,chevron);
  const panel=document.createElement('div');panel.className='section-picker-panel';panel.id='portfolio-section-menu';panel.popover='auto';
  const header=document.createElement('div');header.className='section-picker-header';
  const title=document.createElement('p');title.id='portfolio-section-menu-title';title.textContent='Explore the portfolio';
  const count=document.createElement('span');count.textContent=String(options.length).padStart(2,'0');count.setAttribute('aria-hidden','true');header.append(title,count);
  const menu=document.createElement('div');menu.className='section-picker-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-labelledby',title.id);
  const items=options.map((option,index)=>{
   const item=document.createElement('button');item.type='button';item.className='section-picker-item';item.setAttribute('role','menuitemradio');item.tabIndex=-1;item.dataset.value=option.value;
   if(index===4||index===9)item.classList.add('section-picker-group-start');
   const number=document.createElement('span');number.className='section-picker-number';number.textContent=String(index).padStart(2,'0');number.setAttribute('aria-hidden','true');
   const name=document.createElement('span');name.className='section-picker-name';name.textContent=option.textContent;
   const check=document.createElement('span');check.className='section-picker-check';check.setAttribute('aria-hidden','true');check.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 8 2.5 2.5L12 5"/></svg>';
   item.append(number,name,check);menu.append(item);
   item.addEventListener('click',()=>{select.value=option.value;sync();close(true);select.dispatchEvent(new Event('change',{bubbles:true}));});
   return item;
  });
  panel.append(header,menu);nativeLabel.replaceWith(picker);picker.append(select,trigger,panel);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.dataset.enhanced='true';
  let query='',queryTimer;
  function sync(){
   const current=options.find(option=>option.value===select.value)||options[0];label.textContent=current.textContent;
   trigger.setAttribute('aria-label','Choose section. Current section: '+current.textContent);
   for(const item of items)item.setAttribute('aria-checked',String(item.dataset.value===current.value));
  }
  function position(){
   if(!panel.matches(':popover-open'))return;
   const bounds=trigger.getBoundingClientRect(),width=Math.min(290,innerWidth-24),left=Math.max(12,Math.min(bounds.right-width,innerWidth-width-12)),top=Math.min(bounds.bottom+10,innerHeight-150);
   panel.style.width=width+'px';panel.style.left=left+'px';panel.style.top=Math.max(12,top)+'px';panel.style.maxHeight=Math.max(120,innerHeight-top-16)+'px';
  }
  function focusItem(index){items[(index+items.length)%items.length].focus({preventScroll:true});items[(index+items.length)%items.length].scrollIntoView({block:'nearest'});}
  function open(direction){
   if(panel.matches(':popover-open'))return;
   sync();panel.showPopover();position();trigger.setAttribute('aria-expanded','true');
   const selected=items.findIndex(item=>item.dataset.value===select.value);
   focusItem(direction==='last'?items.length-1:Math.max(0,selected));
  }
  function close(restore){if(panel.matches(':popover-open'))panel.hidePopover();trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}
  trigger.addEventListener('click',()=>panel.matches(':popover-open')?close(true):open());
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open(event.key==='ArrowUp'?'last':undefined);}});
  menu.addEventListener('keydown',event=>{
   const index=items.indexOf(document.activeElement);
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();focusItem(event.key==='Home'?0:event.key==='End'?items.length-1:index+(event.key==='ArrowDown'?1:-1));
   }else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
   else if(event.key==='Tab'){
    event.preventDefault();close(false);(event.shiftKey?trigger:document.querySelector('.reading-toggle')||trigger).focus({preventScroll:true});
   }else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key!==' '){
    clearTimeout(queryTimer);query+=event.key.toLowerCase();queryTimer=setTimeout(()=>{query='';},650);
    const match=options.findIndex(option=>option.textContent.toLowerCase().startsWith(query));if(match>=0)focusItem(match);
   }
  });
  panel.addEventListener('toggle',event=>{const shown=event.newState==='open';trigger.setAttribute('aria-expanded',String(shown));if(!shown){clearTimeout(queryTimer);query='';}});
  // The popup scrolls independently and never changes the city route.
  for(const type of ['wheel','touchstart','touchmove'])panel.addEventListener(type,event=>event.stopPropagation(),{passive:true});
  select.addEventListener('destinationchange',sync);select.addEventListener('change',sync);
  document.querySelector('.reading-toggle')?.addEventListener('click',()=>close(false));
  addEventListener('resize',position);sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceNavigation,{once:true});else enhanceNavigation();
})();
