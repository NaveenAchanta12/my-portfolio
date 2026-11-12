const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let now=0,position=0,active=true,modal=false,blocked=false;
 const events={},docEvents={},frames=new Map();let sequence=0;
 class Element {constructor(kind=''){this.kind=kind;this.parentElement=null;this.scrollHeight=100;this.clientHeight=100}closest(){return this.kind==='input'?this:null}}
 const target=new Element(),body=new Element();
 const box={Element,window:{},document:{hidden:false,body,querySelector:()=>modal?{}:null,addEventListener:(n,f)=>(docEvents[n]??=[]).push(f)},getComputedStyle:()=>({overflowY:'visible'}),performance:{now:()=>now},innerHeight:800,scrollTo:({top})=>{if(!blocked)position=Math.round(top)},requestAnimationFrame:f=>{frames.set(++sequence,f);return sequence},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(n,f)=>(events[n]??=[]).push(f)};
 Object.defineProperty(box,'scrollY',{get:()=>position});vm.createContext(box);vm.runInContext(fs.readFileSync('scroll-pacing.js','utf8'),box);
 box.window.PortfolioScroll.create({active:()=>active,stops:()=>[0,500,1500,2000],gain:1,speed:()=>2000});
 return {events,docEvents,target,setActive:v=>active=v,setModal:v=>modal=v,setBlocked:v=>blocked=v,get position(){return position},step(){now+=16;const callbacks=[...frames.values()];frames.clear();for(const f of callbacks)f(now)},wheel(delta,extra={}){const event={target,deltaX:0,deltaY:delta,deltaMode:0,cancelable:true,prevented:false,preventDefault(){this.prevented=true},...extra};for(const f of events.wheel)f(event);return event},touch(){for(const f of events.touchstart)f({});},get frameCount(){return frames.size},input:new Element('input')};
}
const f=fixture();assert(f.wheel(800).prevented);for(let i=0;i<100;i++)f.step();assert.equal(f.position,500);assert.equal(f.frameCount,0,'Animation settles without an RAF loop');
f.setModal(true);assert(!f.wheel(500).prevented);f.setModal(false);f.setActive(false);assert(!f.wheel(500).prevented,'Document/reduced-motion is native');f.setActive(true);assert(!f.wheel(500,{target:f.input}).prevented);assert(!f.wheel(500,{ctrlKey:true}).prevented,'Pinch/zoom untouched');assert(!f.wheel(500,{deltaX:900}).prevented,'Horizontal scroll untouched');assert(!f.wheel(500,{cancelable:false}).prevented);
f.wheel(500);f.touch();assert.equal(f.frameCount,0,'Touch cancels pending desktop pacing');assert.equal(f.events.touchmove,undefined,'Touch move and momentum are entirely native');
const blocked=fixture();blocked.setBlocked(true);blocked.wheel(800);for(let i=0;i<20;i++)blocked.step();assert.equal(blocked.frameCount,0);assert(!blocked.wheel(800).prevented,'A blocked animation fails open rather than swallowing input');
console.log('PASS actual input-controller lifecycle: idle settling, native touch, modal/document/reduced bypass, zoom, horizontal input, cancellation and stalled-scroll fail-open');
