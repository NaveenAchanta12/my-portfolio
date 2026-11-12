/* Wheel pacing for the two scroll stories, never document mode or dialogs.
   Boundaries pause briefly, never wait forever for a trackpad to go quiet.
   Touch, inertia, pinch zoom and keyboard movement stay browser-native. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function nextBoundary(stops,position,direction){
  if(direction>0)return stops.find(stop=>stop>position+1)??stops.at(-1);
  return [...stops].reverse().find(stop=>stop<position-1)??stops[0];
 }
 function createGestureState(){return {direction:0,last:-Infinity,boundary:null,target:null,arrivedAt:null};}
 function advanceGesture(state,{position,delta,time,stops,newGesture=false,gain=1,reverseBoundary}){
  const direction=Math.sign(delta);if(!direction)return state.target??position;
  const reverse=direction!==state.direction;
  const arrived=state.boundary!==null&&Math.abs(position-state.boundary)<=1.5;
  if(arrived&&state.arrivedAt===null)state.arrivedAt=time;
  if(!arrived)state.arrivedAt=null;
  const continued=arrived&&state.arrivedAt!==null&&time-state.arrivedAt>=240;
  if(reverse||newGesture||time-state.last>210||state.boundary===null||continued){
   // Fresh intent or 240ms of continued input releases the next boundary.
   // A burst before the previous animation arrives still ends there first.
   state.boundary=nextBoundary(stops,position,direction);state.arrivedAt=null;
   if(reverse&&state.direction!==0&&reverseBoundary){
    const boundary=reverseBoundary(position,direction);
    if(Number.isFinite(boundary)&&(boundary-position)*direction>0&&boundary>=stops[0]&&boundary<=stops.at(-1))state.boundary=boundary;
   }
   if(reverse||state.target===null)state.target=position;
  }
  state.direction=direction;state.last=time;
  state.target=clamp((state.target??position)+delta*gain,stops[0],stops.at(-1));
  state.target=direction>0?Math.min(state.target,state.boundary):Math.max(state.target,state.boundary);
  return state.target;
 }
 function smoothStep(position,target,dt,speed){
  const distance=target-position;
  if(Math.abs(distance)<3)return target;
  return position+Math.sign(distance)*Math.min(Math.abs(distance),Math.abs(distance)*(1-Math.exp(-16*dt)),speed*dt);
 }
 const api={nextBoundary,createGestureState,advanceGesture,smoothStep};
 if(typeof module==='object'&&module.exports){module.exports=api;return;}
 api.create=function(options){
  let state=createGestureState(),frame=0,lastFrame=0,writing=false,lastWritten=null,stalledAt=null,nativeUntil=0,settleTimer=0,settling=null,pointerHeld=false;
  const available=()=>performance.now()>=nativeUntil&&options.active()&&!document.hidden&&!document.querySelector('dialog[open]');
  function clearSettle(){if(settleTimer)clearTimeout(settleTimer);settleTimer=0;}
  function cancel(){clearSettle();settling=null;if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;state=createGestureState();lastWritten=null;stalledAt=null;}
  // Optional Reading-only idle completion. A wheel or other native input
  // cancels it; ordinary long-content positions never have a settle target.
  function queueSettle(){
   if(!options.settleTarget||settling||pointerHeld||!available())return;
   clearSettle();
   settleTimer=setTimeout(()=>{
    settleTimer=0;if(frame||pointerHeld||!available())return;
    const target=options.settleTarget(scrollY,state.direction),stops=options.stops();
    if(!Number.isFinite(target)||target<stops[0]||target>stops.at(-1)||Math.abs(target-scrollY)<=1)return;
    settling={from:scrollY,start:performance.now()};state.target=target;
    frame=requestAnimationFrame(tick);
   },100);
  }
  function nested(target){
   if(!(target instanceof Element))return false;
   if(target.closest('dialog,select,input,textarea,[contenteditable="true"],.section-picker-panel'))return true;
   for(let el=target;el&&el!==document.body;el=el.parentElement){
    const style=getComputedStyle(el);
    if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+2)return true;
   }
   return false;
  }
  function tick(now){
   frame=0;if(!available()){cancel();return;}
   const dt=lastFrame?Math.min(.032,(now-lastFrame)/1000):1/60;lastFrame=now;
   const progress=settling?clamp((now-settling.start)/180,0,1):0;
   const y=settling?settling.from+(state.target-settling.from)*(1-Math.pow(1-progress,3)):options.immediate?state.target:smoothStep(scrollY,state.target,dt,options.speed?.()||2400);
   const before=scrollY;
   writing=true;lastWritten=y;scrollTo({top:y,behavior:'instant'});writing=false;
   if(Math.abs(scrollY-before)<.1&&Math.abs(scrollY-state.target)>3){
    if(stalledAt===null)stalledAt=now;
    if(now-stalledAt>160){cancel();nativeUntil=now+700;return;}
   }else stalledAt=null;
   options.onScroll?.();
   if(settling?progress<1:Math.abs(scrollY-state.target)>(options.immediate?1:.75))frame=requestAnimationFrame(tick);
   else{lastFrame=0;lastWritten=scrollY;settling=null;queueSettle();}
  }
  function move(delta,newGesture=false){
   if(settling){const direction=state.direction;cancel();state.direction=direction;}else clearSettle();
   const stops=options.stops();if(stops.length<2||!stops.every(Number.isFinite))return false;
   advanceGesture(state,{position:scrollY,delta,time:performance.now(),stops,newGesture,gain:options.gain??.8,reverseBoundary:options.reverseBoundary});
   if(!frame)frame=requestAnimationFrame(tick);
   return true;
  }
  function wheel(event){
   if(!available()||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||nested(event.target))return;
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
   if(!delta||!event.cancelable)return;
   if(move(delta))event.preventDefault();
  }
  addEventListener('wheel',wheel,{passive:false});
  // Do not replace iOS/Android scrolling or momentum with a JS animation.
  // Starting any touch cancels an outstanding desktop-wheel animation.
  addEventListener('touchstart',cancel,{passive:true});
  // Keyboard, links, scrollbars and modal focus retain their native authority.
  addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')cancel();},{passive:true});
  addEventListener('keydown',cancel,{passive:true});
  addEventListener('scroll',()=>{if(!writing&&lastWritten!==null&&Math.abs(scrollY-lastWritten)>2)cancel();},{passive:true});
  if(options.settleTarget){
   addEventListener('scroll',queueSettle,{passive:true});
   addEventListener('blur',()=>{pointerHeld=false;cancel();});
   addEventListener('pointerdown',()=>{pointerHeld=true;clearSettle();},{passive:true});
   addEventListener('pointerup',()=>{pointerHeld=false;queueSettle();},{passive:true});
   addEventListener('pointercancel',()=>{pointerHeld=false;queueSettle();},{passive:true});
   addEventListener('touchstart',()=>{pointerHeld=true;clearSettle();},{passive:true});
   addEventListener('touchend',()=>{pointerHeld=false;queueSettle();},{passive:true});
   addEventListener('touchcancel',()=>{pointerHeld=false;queueSettle();},{passive:true});
  }
  document.addEventListener('visibilitychange',cancel);
  return {cancel,settle:queueSettle};
 };
 root.PortfolioScroll=api;
})(typeof window==='object'?window:globalThis);
