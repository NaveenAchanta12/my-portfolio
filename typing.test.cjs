const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function harness(reduced=false,observer=true){
 let now=0,tick,change,visibility;
 const regions=Array.from({length:2},()=>{
  const out={textContent:''},events={},cursor={style:{}};
  return {out,events,cursor,querySelectorAll:()=>[out],querySelector:()=>cursor,contains:()=>false,addEventListener(n,f){events[n]=f}};
 });
 const media={matches:reduced,addEventListener(_,f){change=f}};
 const body={classList:{toggle(){},contains(){return true}}};
 const doc={hidden:false,body,events:{},addEventListener(n,f){this.events[n]=f},querySelectorAll:()=>regions};
 const context={matchMedia:()=>media,performance:{now:()=>now},document:doc,setInterval:f=>tick=f};
 if(observer)context.IntersectionObserver=class{constructor(f){visibility=f}observe(){}};
 vm.runInNewContext(fs.readFileSync('typing.js','utf8'),context);
 return {regions,media,doc,change:()=>change(),visible:(index,b)=>visibility([{target:regions[index],isIntersecting:b}]),tick:(count=1)=>{for(let i=0;i<count;i++){now+=40;tick();}}};
}
const first='a Software Engineer';
const t=harness();t.visible(0,true);t.tick(40);assert.equal(t.regions[0].out.textContent,first,'Initial endpoint remains readable');t.tick(10);assert.notEqual(t.regions[0].out.textContent,first);
let next=false;for(let i=0;i<700;i++){t.tick();next ||= t.regions[0].out.textContent==='a Full-Stack Developer';}assert(next);
// A changed hidden target cannot stop another visible instance or reset its phrase.
t.visible(1,false);const before=t.regions[0].out.textContent;t.tick(100);assert.notEqual(t.regions[0].out.textContent,before);assert.equal(t.regions[1].out.textContent,first);
t.visible(0,false);const frozen=t.regions[0].out.textContent;t.tick(100);assert.equal(t.regions[0].out.textContent,frozen);t.visible(0,true);assert.equal(t.regions[0].out.textContent,frozen);
for(const [enter,leave] of [['pointerenter','pointerleave'],['focusin','focusout']]){
 const x=harness();x.visible(0,true);x.tick(50);x.regions[0].events[enter]({pointerType:'mouse'});const stopped=x.regions[0].out.textContent;x.tick(100);assert.equal(x.regions[0].out.textContent,stopped);x.regions[0].events[leave]({relatedTarget:null});x.tick(100);assert.notEqual(x.regions[0].out.textContent,stopped);
}
const touch=harness();touch.visible(0,true);touch.regions[0].events.pointerenter({pointerType:'touch'});touch.tick(50);assert.notEqual(touch.regions[0].out.textContent,first);touch.regions[0].events.pointerdown({pointerType:'touch'});touch.regions[0].events.focusin();const touched=touch.regions[0].out.textContent;touch.tick(100);assert.notEqual(touch.regions[0].out.textContent,touched,'Touch-induced focus must not pause typing');
touch.regions[0].events.focusout({relatedTarget:null});touch.regions[0].events.pointerdown({pointerType:'touch'});touch.doc.events.keydown({key:'Tab'});touch.regions[0].events.focusin();const keyboardFocused=touch.regions[0].out.textContent;touch.tick(100);assert.equal(touch.regions[0].out.textContent,keyboardFocused,'Later keyboard focus still pauses');
const x=harness(true);x.visible(0,true);x.tick(100);assert.equal(x.regions[0].out.textContent,first);x.media.matches=false;x.change();x.tick(50);assert.notEqual(x.regions[0].out.textContent,first);x.media.matches=true;x.change();assert.equal(x.regions[0].out.textContent,first);
const hidden=harness();hidden.visible(0,true);hidden.tick(50);hidden.doc.hidden=true;const stopped=hidden.regions[0].out.textContent;hidden.tick(500);assert.equal(hidden.regions[0].out.textContent,stopped);hidden.doc.hidden=false;hidden.tick(100);assert.notEqual(hidden.regions[0].out.textContent,stopped);
const escape=harness();escape.visible(0,true);escape.regions[0].events.keydown({key:'Escape'});escape.tick(500);assert.equal(escape.regions[0].out.textContent,first);escape.regions[0].events.keydown({key:'Escape'});escape.tick(50);assert.notEqual(escape.regions[0].out.textContent,first);
const fallback=harness(false,false);assert.equal(fallback.regions[0].out.textContent,first);fallback.tick(50);assert.notEqual(fallback.regions[0].out.textContent,first);
assert.equal(fs.readFileSync('typing.js','utf8'),fs.readFileSync('dist/typing.js','utf8'));
console.log('PASS typing endpoint holds, independent regions, visibility deltas, temporary hover/focus, touch, hidden document, reduced motion, explicit pause/resume, observer fallback and dist parity.');
