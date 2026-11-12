import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {activeStop,journeyProgress,nextStop,smoother,stationFor,stops} from './city-route.js';

const source=fs.readFileSync('city-controller.js','utf8');
assert.equal(source,fs.readFileSync('dist/city-controller.js','utf8'),'Source and shipped controller match');
const v72=execFileSync('git',['show','fbfe6805273e818e7889d6dfe55855ccc28dff68:city-controller.js'],{encoding:'utf8'});
const expected=v72.replace(
 '// Begin as AI leaves its station window, just before Contact becomes visible.\n// Keep the final pose at the existing endpoint and use it for Contact selection.',
 '// Begin as AI leaves its station window and finish at the Contact destination.\n// Contact selection arrives with the identity fully in place, without extra travel.'
).replace('contactIdentityEnd=.995;','contactIdentityEnd=contactStop.p;');
assert.notEqual(expected,v72,'V72 endpoint replacement was found');
assert.equal(source,expected,'Only the authorized Contact endpoint and its two comments differ from V72; route, panels, journey and navigation logic are untouched');
const line=prefix=>source.split('\n').find(value=>value.startsWith(prefix));
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
class Element {
 constructor(){this.style={};this.dataset={};this.listeners={};this.attrs={};this.classes=new Set;this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
 addEventListener(type,listener){this.listeners[type]=listener;}
 setAttribute(name,value){this.attrs[name]=value;}
 dispatchEvent(event){this.listeners[event.type]?.(event);}
 getBoundingClientRect(){return {left:48,top:24};}
 querySelector(selector){return this.children[selector];}
}
function harness(width=1440,height=900){
 const nodes=new Map,element=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element);return nodes.get(selector);};
 const header=element('.wordmark'),identity=new Element;
 header.children={strong:new Element,span:new Element};
 header.children.strong.computed={fontSize:'19',lineHeight:'30.4',letterSpacing:'-.3',fontFamily:'Helvetica Neue',fontWeight:'400'};
 header.children.span.computed={fontSize:'8',lineHeight:'12.8',letterSpacing:'1',fontFamily:'Helvetica Neue',fontWeight:'400'};
 identity.children={strong:new Element,span:new Element,'.contact-statement':new Element};
 const panels=stops.map(stop=>Object.assign(new Element,{dataset:{stop:stop.id}})),events={};
 const box={
  current:0,target:0,reading:false,navigation:null,frame:0,last:0,scrollY:1260,now:0,
  innerWidth:width,innerHeight:height,window:{introProgress:1},reduced:{matches:false},
  stops,activeStop,nextStop,stationFor,smoother,journeyProgress,headerIdentity:header,contactIdentity:identity,
  typingControl:new Element,contactTyper:{update(){}},arrivalIdentity:{update(){}},portal:new Element,
  document:{hidden:false,querySelectorAll:selector=>selector==='.city-stop'?panels:[]},
  $:element,getComputedStyle:node=>node.computed,Event:class{constructor(type){this.type=type;}},
  performance:{now:()=>box.now},metrics:()=>({start:1260,distance:height*8.5}),
  scrollTo:({top})=>{box.scrollY=top;},renderCitySurface(){},draw(){},
  requestAnimationFrame(){return 1;},addEventListener:(type,listener)=>{events[type]=listener;},
  setReading:value=>{box.reading=value;}
 };
 vm.createContext(box);
 vm.runInContext([
  line('const contactStop='),
  between('function updateContactIdentity(){','function tick(time)'),
  between('function tick(time)','function setReading(value)'),
  line('function readTarget()'),
  line("$('.city-previous').addEventListener"),
  line("$('#city-destination').addEventListener"),
  line("for(const event of ['wheel'")
 ].join('\n'),box);
 const setProgress=progress=>{box.current=box.target=progress;box.scrollY=box.metrics().start+progress*box.metrics().distance;box.updateUI();};
 const select=value=>element('#city-destination').listeners.change({target:{value:String(value)}});
 const advance=milliseconds=>{const end=box.now+milliseconds;while(box.now<end){box.now+=16;box.tick(box.now);}};
 const rounded=value=>value?.replace(/-?\d+(?:\.\d+)?/g,number=>String(Number(Number(number).toFixed(8))));
 const pose=()=>({display:identity.style.display,transform:rounded(identity.style.transform),font:rounded(identity.children.strong.style.fontSize),role:rounded(identity.children.span.style.fontSize),header:header.style.opacity,tabIndex:header.tabIndex,statement:identity.children['.contact-statement'].style.opacity});
 return {box,element,header,identity,panels,events,setProgress,select,advance,pose};
}

const start=.892,end=.92;
for(const [width,height] of [[1440,900],[390,844],[844,390],[768,1024]]){
 const h=harness(width,height),{box,identity,header,setProgress,pose}=h;
 assert(Math.abs(vm.runInContext('contactIdentityStart',box)-start)<1e-12);
 assert.equal(vm.runInContext('contactIdentityEnd',box),end);
 for(const progress of [0,.09,.72,.865,start-.00001,start]){
  setProgress(progress);assert.equal(identity.style.display,'none','Identity stays in header through AI content');assert.equal(header.style.opacity,'1');
 }
 assert.equal(activeStop(start-.00001)?.id,'ai');
 setProgress(start+.00001);assert.equal(identity.style.display,'block','Movement starts immediately after AI finishes');
 setProgress(.89301);assert.equal(activeStop(box.current)?.id,'contact');assert.equal(identity.style.display,'block');
 const poses=[];
 let previousFont=0;
 for(let step=1;step<=100;step++){
  const progress=start+(end-start)*step/100;setProgress(progress);poses.push(pose());
  const font=parseFloat(pose().font);assert(font>=previousFont-1e-10,'Forward movement is monotonic');previousFont=font;
 }
 const complete=pose(),portrait=width<760&&height>width;
 assert(Math.abs(parseFloat(complete.font)-(portrait?Math.min(42,width*.10):Math.min(70,width*.042)))<1e-9,'Complete Contact name size');
 assert.equal(complete.header,'0');assert.equal(complete.tabIndex,-1);assert.equal(complete.statement,'1');
 assert.equal(activeStop(box.current)?.id,'contact','Identity finishes at the existing Contact destination');
 for(const progress of [.92,.94,.995,1]){setProgress(progress);assert.deepEqual(pose(),complete,'Final pose is complete throughout Contact, without extra travel');}
 for(let step=100;step>=1;step--){setProgress(start+(end-start)*step/100);assert.deepEqual(pose(),poses[step-1],'Reverse scrolling exactly retraces the forward pose');}
 setProgress(start);assert.equal(identity.style.display,'none');assert.equal(header.style.opacity,'1');assert.equal(header.tabIndex,0,'Header becomes focusable again');
 setProgress(.95);box.reading=true;box.updateContactIdentity();assert.equal(identity.style.display,'none');box.reading=false;
 box.window.introProgress=.5;box.updateContactIdentity();assert.equal(identity.style.display,'none');box.window.introProgress=1;
 box.reduced.matches=true;setProgress(start+.001);assert.deepEqual(pose(),complete,'Reduced motion uses the final pose immediately');
 assert.equal(box.typingControl.hidden,true);box.reduced.matches=false;

 // The real dropdown handler, travel(), tick(), route math and UI are exercised
 // together. Contact must animate through the journey instead of jumping to it.
 setProgress(.865);h.select(.92);assert.equal(box.navigation.to,end);assert.equal(box.current,.865,'Selection does not jump');
 h.advance(400);assert(box.current>.865&&box.current<end);assert(box.navigation,'Journey is still animating');
 h.advance(3000);assert.equal(box.navigation,null);assert(Math.abs(box.current-end)<1e-12);assert.deepEqual(pose(),complete);
 assert.equal(h.element('#city-destination').value,'0.92','The existing Contact option remains selected');
 assert(h.panels.find(panel=>panel.dataset.stop==='contact').classes.has('active'));

 // A newer selection wins, user scrolling can interrupt, and choosing Contact
 // again arrives fully transformed at its existing 0.920 station center.
 setProgress(.18);h.select(.92);h.advance(300);const interrupted=box.current;
 h.events.wheel();assert.equal(box.navigation,null);setProgress(interrupted-.01);h.advance(100);assert(box.current<interrupted);
 h.select(.92);h.advance(400);h.select(.27);assert.equal(box.navigation.to,.27);h.advance(4000);assert(Math.abs(box.current-.27)<1e-12);assert.equal(identity.style.display,'none');
 h.select(.92);h.select(.92);h.advance(4000);assert.deepEqual(pose(),complete);
 setProgress(1);h.select(.92);h.advance(2000);assert(Math.abs(box.current-end)<1e-12,'Contact also settles correctly when selected from after its endpoint');
 for(const destination of [0,...stops.filter(stop=>stop.id!=='contact').map(stop=>stop.p)]){
  setProgress(.45);h.select(destination);assert.equal(box.navigation.to,destination,'Every other dropdown destination is unchanged');
 }
 setProgress(.865);h.element('.city-next').listeners.click();assert.equal(box.navigation.to,.92,'Next button keeps its existing station destination');
 setProgress(.92);h.element('.city-previous').listeners.click();assert.equal(box.navigation.to,.865,'Previous button keeps its existing destination');
 box.reduced.matches=true;setProgress(.18);h.select(.92);assert.equal(box.current,end);assert.deepEqual(pose(),complete,'Reduced-motion Contact selection reaches the complete pose');
 console.log(`PASS ${width}x${height}: AI-end start, forward/reverse identity, animated Contact dropdown completion, interruption/reselection, other destinations and reduced motion`);
}

const navigation=fs.readFileSync('section-navigation.js','utf8');
assert.match(navigation,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/,'Enhanced dropdown routes through the tested native change handler');
assert.match(source,/if\(stop\)travel\(stop\.p\)/,'Hash navigation keeps its station coordinates');
console.log('PASS exact V72 controller parity except Contact completion at 0.920; DOM/state logic only, not GPU or physical-device rendering');
