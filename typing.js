(()=>{
const phrases=['a Software Engineer','a Full-Stack Developer','building enterprise systems','connecting APIs and interfaces'];
const media=matchMedia('(prefers-reduced-motion: reduce)');
const states=[...document.querySelectorAll('.type-intro')].map(region=>({
 region,outputs:[...region.querySelectorAll('.typed-role')],index:0,count:phrases[0].length,
 deleting:true,remaining:1800,visible:typeof IntersectionObserver==='undefined',hovered:false,focused:false,pointerFocus:false,paused:false
}));
const paint=state=>state.outputs.forEach(el=>{el.textContent=phrases[state.index].slice(0,state.count)});
const reset=state=>{state.index=0;state.count=phrases[0].length;state.deleting=true;state.remaining=1800;paint(state)};
function mode(){
 document.body.classList.toggle('typing-paused',media.matches||states.every(s=>s.paused||s.hovered||s.focused));
 for(const state of states){
  const cursor=state.region.querySelector('.type-cursor');
  if(cursor)cursor.style.animationPlayState=media.matches||state.paused||state.hovered||state.focused?'paused':'running';
 }
}
for(const state of states){
 const {region}=state;
 // Hover and focus are temporary. A touch must never disable the animation.
 region.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;state.hovered=true;mode()});
 region.addEventListener('pointerleave',()=>{state.hovered=false;mode()});
 region.addEventListener('pointercancel',()=>{state.hovered=false;mode()});
 region.addEventListener('pointerdown',()=>{state.pointerFocus=true;state.focused=false;mode()});
 region.addEventListener('focusin',()=>{state.focused=!state.pointerFocus;mode()});
 region.addEventListener('focusout',event=>{if(region.contains(event.relatedTarget))return;state.focused=false;state.pointerFocus=false;mode()});
 region.addEventListener('keydown',event=>{
  if(event.key==='Tab'){state.pointerFocus=false;state.focused=true;mode()}
  if(event.key==='Escape'){state.paused=!state.paused;if(state.paused)reset(state);mode()}
 });
 reset(state);
}
// Reset pointer modality before keyboard focus moves into any introduction.
document.addEventListener('keydown',event=>{
 if(event.key==='Tab')states.forEach(state=>{state.pointerFocus=false});
},true);
if(typeof IntersectionObserver!=='undefined'){
 const byRegion=new Map(states.map(state=>[state.region,state]));
 const observer=new IntersectionObserver(entries=>{
  // Entries contain only changed targets, not the entire observed set.
  for(const entry of entries){const state=byRegion.get(entry.target);if(state)state.visible=entry.isIntersecting;}
 },{threshold:0});
 states.forEach(state=>observer.observe(state.region));
}
media.addEventListener('change',()=>{states.forEach(reset);mode()});mode();
let last=performance.now();
setInterval(()=>{
 const now=performance.now(),delta=Math.max(0,Math.min(now-last,100));last=now;
 if(media.matches||document.hidden||(!document.body.classList.contains('entered')&&!document.body.classList.contains('reading-mode')))return;
 for(const state of states){
  if(!state.visible||state.paused||state.hovered||state.focused)continue;
  state.remaining-=delta;if(state.remaining>0)continue;
  if(state.deleting){
   state.count--;state.remaining=45;
   if(state.count<=0){state.count=0;state.deleting=false;state.index=(state.index+1)%phrases.length;state.remaining=250;}
  }else{
   state.count++;state.remaining=85;
   if(state.count>=phrases[state.index].length){state.count=phrases[state.index].length;state.deleting=true;state.remaining=1800;}
  }
  paint(state);
 }
},40);
})();
