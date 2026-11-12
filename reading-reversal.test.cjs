const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),path=require('node:path');
const sourceRoot=process.env.READING_TEST_ROOT||process.cwd();
const source=fs.readFileSync(path.join(sourceRoot,'scroll-pacing.js'),'utf8');
const readingSource=fs.readFileSync(path.join(sourceRoot,'reading-experience.js'),'utf8');
const {buildTimeline,stageState,reverseBoundary}=require(path.join(sourceRoot,'reading-experience.js'));
const oldSource=cp.execFileSync('git',['show','fbfe6805273e818e7889d6dfe55855ccc28dff68:scroll-pacing.js'],{encoding:'utf8'});
const timeline=buildTimeline([400,1000,1800,500,1100],605,757),experience=timeline.chapters[2];
const stops=[...new Set(timeline.chapters.flatMap(ch=>ch.overflow?[ch.start,ch.start+ch.overflow]:[ch.start]).concat(timeline.total))].sort((a,b)=>a-b);
function fixture({code=source,position=0,immediate=false,resolve=false,blocked=false,quantize=Math.round}={}){
 let now=0,sequence=0,active=true,modal=false,paints=0;
 const events={},frames=new Map(),timers=new Map(),writes=[];
 class Element{constructor(kind=''){this.kind=kind;this.parentElement=null;this.scrollHeight=100;this.clientHeight=100;}closest(){return this.kind==='input'?this:null;}}
 const body=new Element(),target=new Element();
 const box={Element,window:{},document:{hidden:false,body,querySelector:()=>modal?{}:null,addEventListener(){}},getComputedStyle:()=>({overflowY:'visible'}),performance:{now:()=>now},innerHeight:757,scrollTo:({top})=>{writes.push(top);if(!blocked)position=quantize(top);},setTimeout:(fn,delay)=>{timers.set(++sequence,{fn,due:now+delay});return sequence;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 Object.defineProperty(box,'scrollY',{get:()=>position});vm.createContext(box);vm.runInContext(code,box);
 const controller=box.window.PortfolioScroll.create({active:()=>active,stops:()=>stops,gain:.85,speed:()=>2044,immediate,reverseBoundary:resolve?(y,d)=>reverseBoundary(timeline,y,d):undefined,onScroll:()=>paints++});
 return {box,events,writes,controller,get position(){return position;},get time(){return now;},get paints(){return paints;},get frames(){return frames.size;},get timers(){return timers.size;},idle(ms){now+=ms;},nativeScroll(y){position=y;this.emit('scroll');},emit(name,event={}){for(const fn of events[name]||[])fn(event);},step(){now+=16;for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn();}const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);},wheel(delta,extra={}){const e={target,deltaY:delta,deltaX:0,deltaMode:0,cancelable:true,prevented:false,preventDefault(){this.prevented=true;},...extra};for(const fn of events.wheel)fn(e);return e;},setActive:v=>active=v,setModal:v=>modal=v,input:new Element('input')};
}
function firstContentMotion({edge='end',old=false,idle=0}){
 const atEnd=edge==='end',edgeY=experience.start+(atEnd?experience.overflow:0),initialY=edgeY+(atEnd?30:-30),reverseDelta=atEnd?-120:120;
 const f=fixture({code:old?oldSource:source,position:initialY,immediate:!old,resolve:!old});
 // Establish the preceding direction without consuming another animation frame.
 f.wheel(-Math.sign(reverseDelta));f.idle(idle);const start=f.time;
 for(let count=0;count<80;count++){
  f.wheel(reverseDelta);f.step();
  const state=stageState(timeline,f.position).states[2];
  if(atEnd?state.read<experience.overflow-3:state.read>3)return f.time-start;
 }
 throw new Error('Reverse never resumed Experience content');
}
const oldEnd=firstContentMotion({old:true}),oldTop=firstContentMotion({old:true,edge:'top'});
assert(oldEnd>=400&&oldTop>=400,'Regression demonstrates the old easing-plus-second-boundary-hold dead zone');
for(const edge of ['end','top'])for(const idle of [0,500])assert.equal(firstContentMotion({edge,idle}),16,'Fresh and continuous reversal resumes content on the first animation frame');
console.log(`PASS Experience edge reversal: old end/top ${oldEnd}/${oldTop} ms; new 16/16 ms at 60 Hz, with identical transition geometry`);
// Every forward boundary still stops one arbitrarily large event. Continued
// input has the same finite release, and each reversal caps at content start/end.
for(const direction of [1,-1]){
 const ordered=direction>0?stops:[...stops].reverse();
 for(let index=0;index<ordered.length-1;index++){
  const f=fixture({position:ordered[index],immediate:true,resolve:true});
  assert(f.wheel(direction*90000).prevented);f.step();assert.equal(f.position,Math.round(ordered[index+1]));assert.equal(f.frames,0,'No queued animation tail after the bounded step');
 }
 const f=fixture({position:direction>0?stops[0]:stops.at(-1),immediate:true,resolve:true});
 for(let i=0;i<800;i++){f.wheel(direction*120);f.step();}
 assert.equal(f.position,Math.round(direction>0?stops.at(-1):stops[0]),'Uninterrupted input reaches the other end without a quiet-gap lock');
 f.wheel(-direction*120);f.step();assert(direction>0?f.position<stops.at(-1):f.position>stops[0],'Whole-story endpoint reversal moves immediately');
}
for(const direction of [1,-1]){
 const position=direction>0?experience.start-30:experience.start+experience.overflow+30;
 const f=fixture({position,immediate:true,resolve:true});f.wheel(-direction);f.wheel(direction*90000);f.step();
 assert.equal(f.position,Math.round(experience.start+(direction>0?experience.overflow:0)),'Large reversal resumes the chapter but cannot skip its opposite content boundary');
}
const held=fixture({position:experience.start,immediate:true,resolve:true});held.wheel(90000);held.step();const boundary=held.position;
held.wheel(120);held.step();assert.equal(held.position,boundary,'Ordinary forward end boundary retains deliberate hold');
for(let i=0;i<16;i++){held.wheel(120);held.step();}assert(held.position>boundary,'Continued input releases within the bounded interval');
console.log('PASS forward/reverse large-gesture caps, both content boundaries, finite continuous release, page endpoints and no queued tail');
// Preserve native input authority and the existing stalled-scroll fail-open.
for(const setup of [f=>f.setActive(false),f=>f.setModal(true)]){const f=fixture({immediate:true,resolve:true});setup(f);assert(!f.wheel(500).prevented);assert.equal(f.frames,0);}
const native=fixture({immediate:true,resolve:true});for(const extra of [{ctrlKey:true},{metaKey:true},{deltaX:900},{cancelable:false},{target:native.input}])assert(!native.wheel(500,extra).prevented);
native.wheel(500);for(const fn of native.events.touchstart)fn({});assert.equal(native.frames,0);assert.equal(native.events.touchmove,undefined);
const blocked=fixture({immediate:true,resolve:true,blocked:true});blocked.wheel(500);for(let i=0;i<20;i++)blocked.step();assert.equal(blocked.frames,0);assert(!blocked.wheel(500).prevented);
// Real input-controller replay comparison: callers which do not opt in retain
// exactly the prior scroll writes, frame schedule, and wheel prevention.
const before=fixture({code:oldSource}),after=fixture();let seed=19;
for(let i=0;i<1200;i++){
 seed=(1664525*seed+1013904223)>>>0;const delta=[-9000,-120,-4,0,4,120,9000][seed%7];
 assert.equal(before.wheel(delta).prevented,after.wheel(delta).prevented);
 if(i%19===0){before.idle(300);after.idle(300);}
 before.step();after.step();assert.equal(after.position,before.position);assert.equal(after.frames,before.frames);
}
assert.deepEqual(after.writes,before.writes,'Shared defaults remain behavior-identical for Laptop/other users');
console.log('PASS native bypasses, touch cancellation, stalled fail-open and exact shared-default replay parity');
// Run the complete Reading DOM fixture as well, not only isolated math.
const responsive=fs.readFileSync(path.join(sourceRoot,'reading-responsive.test.cjs'),'utf8');
const setup=responsive.slice(0,responsive.indexOf('function assertDocument('));
const redirectedFS={...fs,readFileSync(file,...args){if(file==='reading-experience.js'||file==='scroll-pacing.js')file=path.join(sourceRoot,file);return fs.readFileSync(file,...args);}};
const box={require:name=>name==='node:fs'?redirectedFS:require(name),console};vm.createContext(box);vm.runInContext(setup+';globalThis.makeFixture=fixture;',box);
const integrated=box.makeFixture({width:1440,height:757});integrated.navigate(2);const initial=integrated.box.scrollY;
assert(integrated.wheel(80).prevented);integrated.flush();assert(Math.abs(integrated.box.scrollY-initial-68)<1e-6);
assert.equal(integrated.sections[2].querySelector('.reading-scene-content').style.transform,'translate3d(0,-68.00px,0)','Bounded input paints the current content immediately');
assert(integrated.wheel(-40).prevented);integrated.flush();assert(Math.abs(integrated.box.scrollY-initial-34)<1e-6);assert.equal(integrated.pendingFrames,0);
for(const options of [{width:390},{width:1024},{width:1366,coarse:true},{width:1440,reduced:true}]){const f=box.makeFixture(options);assert(!f.wheel(300).prevented);assert(!f.view.classList.contains('reading-pinned'));}
assert.match(readingSource,/immediate:true/);assert.match(readingSource,/gain:\.85/);
console.log('PASS integrated pinned Reading paint/reversal and unchanged small/coarse/reduced native layouts');

// Every handoff can remain exactly where the user releases it. Neither wheel
// nor native/keyboard input schedules delayed completion or changes the paint.
const fractions=[0,.05,.25,.49,.5,.51,.75,.95,1];
function assertSingleChapter(state){
 assert.equal(state.states.filter(item=>item.enter===1).length,1,'Every position has one complete visible chapter');
 assert.equal(state.states[state.active].enter,1,'Active chapter matches the visible chapter');
 for(const item of state.states)assert([0,1].includes(item.enter)&&item.exit===0,'Chapter swaps never have partial opacity');
}
for(let i=0;i<timeline.chapters.length-1;i++)for(const fraction of fractions)for(const direction of [-1,1]){
 const chapter=timeline.chapters[i],left=chapter.start+chapter.reading,right=timeline.chapters[i+1].start;
 const f=fixture({position:left+(right-left)*fraction,immediate:true,resolve:true});
 f.wheel(direction);f.step();const y=f.position,state=stageState(timeline,y),writes=f.writes.length;
 assertSingleChapter(state);assert.equal(f.frames,0);assert.equal(f.timers,0,'Reading does not request a release timer');
 for(let frame=0;frame<80;frame++)f.step();
 assert.equal(f.position,y,'Released handoffs remain exactly at the last input position');
 assert.equal(f.writes.length,writes,'No delayed scroll command runs after input ends');
 assert.deepEqual(stageState(timeline,f.position),state,'Paused output stays identical');
 f.wheel(-direction*30);f.step();
 if(y>stops[0]&&y<stops.at(-1))assert(direction>0?f.position<y:f.position>y,'Reverse motion is applied on the next frame');
 assertSingleChapter(stageState(timeline,f.position));
}
for(const fraction of fractions){
 const left=experience.start+experience.overflow,right=timeline.chapters[3].start;
 const f=fixture({immediate:true,resolve:true});f.emit('keydown',{key:'PageDown'});f.nativeScroll(left+(right-left)*fraction);const y=f.position;
 for(let i=0;i<80;i++)f.step();
 assert.equal(f.position,y,'Native and keyboard positions remain under the browser/user control');assert.equal(f.writes.length,0);assert.equal(f.frames,0);assert.equal(f.timers,0);
 assertSingleChapter(stageState(timeline,y));
}
for(const offset of [0,1,experience.overflow/2,experience.overflow-1,experience.overflow]){
 const f=fixture({position:experience.start+offset,immediate:true,resolve:true});f.wheel(1);f.step();const y=f.position;
 for(let i=0;i<80;i++)f.step();assert.equal(f.position,y,'Ordinary long content never auto-scrolls');
}
console.log('PASS pause at all sampled handoff fractions in both directions, exact release position, no timers/queued scrolls, immediate reversal and stable native/keyboard/long-content positions');

// Verify the actual Reading controller's paint, inert state, nav and lifecycle,
// including repeated handoffs in reverse, rather than testing math alone.
const heights=[580,560,1100,680],fullTimeline=buildTimeline(heights,605,757);
const painted=box.makeFixture({width:1440,height:757,contentHeights:heights});
function assertPaint(f,position){
 const state=stageState(fullTimeline,position),visible=f.sections.filter(section=>section.classList.contains('is-on-stage'));
 assert.equal(visible.length,1,'The DOM exposes one chapter, with neither overlap nor a blank');
 assert.equal(visible[0],f.sections[state.active]);assert.equal(f.current,state.active);
 f.sections.forEach((section,index)=>{
  const active=index===state.active;
  assert.equal(section.inert,!active);assert.equal(section.getAttribute('aria-hidden'),String(!active));assert.equal(section.classList.contains('is-current'),active);
  if(active){assert.equal(section.style.opacity,'1.0000','Visible content is fully opaque');assert.equal(section.querySelector('.reading-scene-content').style.transform,'translate3d(0,'+(-state.states[index].read).toFixed(2)+'px,0)','Only genuine long-content scrolling translates a chapter');}
 });
}
for(const direction of [1,-1]){
 const ordered=direction>0?fractions:[...fractions].reverse();
 for(let i=0;i<fullTimeline.chapters.length-1;i++)for(const fraction of ordered){
  const chapter=fullTimeline.chapters[i],position=chapter.start+chapter.reading+chapter.transition*fraction;
  painted.box.scrollY=position;painted.emit('scroll');painted.flush();assertPaint(painted,position);
  const writes=painted.scrollWrites.length;painted.advance(1000);
  assert.equal(painted.box.scrollY,position,'The actual Reading integration does not settle a paused handoff');assert.equal(painted.scrollWrites.length,writes);assert.equal(painted.pendingFrames,0);assertPaint(painted,position);
 }
}
const long=fullTimeline.chapters[2];
for(let read=0;read<=long.overflow;read+=1){const y=long.start+read;painted.box.scrollY=y;painted.emit('scroll');painted.flush();assertPaint(painted,y);}
const midpoint=long.start+long.reading+long.transition/2;
for(const fraction of [.49,.5,.51]){
 const y=long.start+long.reading+long.transition*fraction;painted.box.scrollY=y;painted.emit('scroll');painted.flush();
 const writes=painted.scrollWrites.length;painted.openModal();painted.advance(500);painted.closeModal();painted.advance(1000);
 assert.equal(painted.box.scrollY,y);assert.equal(painted.scrollWrites.length,writes,'Card close and remeasurement do not settle a handoff');assertPaint(painted,y);
}
painted.box.scrollY=midpoint-1;painted.emit('scroll');painted.flush();painted.sections[2].focus();
painted.box.scrollY=midpoint+1;painted.emit('scroll');painted.flush();assert.equal(painted.box.document.activeElement,painted.box.document.body,'Focus is released only when its chapter actually disappears');assertPaint(painted,midpoint+1);
for(let i=0;i<painted.sections.length;i++){painted.navigate(i);assertPaint(painted,fullTimeline.chapters[i].start);assert.equal(painted.box.document.activeElement,painted.sections[i]);}
console.log('PASS integrated forward/reverse single-surface paint, full opacity, no handoff movement, accessibility/nav parity, every long-content pixel, stable modal remeasurement and explicit navigation/focus');

for(const chapter of timeline.chapters)assert.equal(chapter.reading,chapter.overflow,'Fitted chapters have no extra stationary reading interval');
const fittedStart=fixture({position:timeline.chapters[0].start,immediate:true,resolve:true});fittedStart.wheel(40);fittedStart.step();const fittedY=fittedStart.position;assert(fittedY>0,'First input immediately moves the scroll position');
for(let i=0;i<80;i++)fittedStart.step();assert.equal(fittedStart.position,fittedY,'First input does not auto-complete the chapter');
const floored=fixture({position:0,immediate:true,resolve:true,quantize:Math.floor});
for(const delta of [1,200,-30]){floored.wheel(delta);for(let i=0;i<80;i++)floored.step();assert.equal(floored.frames,0,'Fractional input does not leave a RAF loop on floor-quantized engines');assert.equal(floored.timers,0);}
for(const resize of [{width:390},{motion:true}]){
 const f=box.makeFixture({width:1440,height:757});f.wheel(80);f.advance(144);f.resize(resize);const y=f.box.scrollY;f.advance(1000);assert.equal(f.box.scrollY,y,'Responsive/reduced-motion changes cannot cause a delayed desktop scroll');assert(!f.view.classList.contains('reading-pinned'));
}
assert(!/settleBoundary|settleTarget|pacing\?\.settle/.test(readingSource));
assert(readingSource.includes('{opacity:1,shift:-item.read}'));
assert.equal(readingSource,fs.readFileSync(path.join(sourceRoot,'dist/reading-experience.js'),'utf8'));
console.log('PASS immediate fitted-chapter input without completion, floor-quantized input without RAF loops, responsive/reduced native fallback and source/dist parity');
