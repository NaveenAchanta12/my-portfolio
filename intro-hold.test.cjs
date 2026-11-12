const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element{constructor(){this.style={setProperty(name,value){this[name]=value}};this.content={cloneNode:()=>new Element()};this.dataset={};this.listeners={};this.classes=new Set();this.classList={contains:c=>this.classes.has(c),add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x)),toggle:(c,b)=>b?this.classes.add(c):this.classes.delete(c)};this.offsetHeight=3960;this.value='success';this.innerHTML='';}addEventListener(n,f){this.listeners[n]=f}setAttribute(){}append(){}replaceChildren(...x){this.children=x}focus(){this.focused=true}scrollIntoView(){this.scrolled=true}showModal(){this.open=true}close(){this.open=false;this.listeners.close?.()}getBoundingClientRect(){return {left:0,right:100,top:0,bottom:100}}}
const elements=new Map(),q=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s)}, nodes=Array.from({length:4},()=>new Element()), cards=['codetrail','lumicare','wishlist'].map(project=>Object.assign(new Element(),{dataset:{project}})), guides=['backend','projects','cloud'].map(answer=>Object.assign(new Element(),{dataset:{answer}})),motion={matches:false,addEventListener(){}};
const ctx={window:{dispatchEvent(){}},Event:class Event{},document:{querySelector:q,querySelectorAll:s=>s==='.node'?nodes:s==='[data-project]'?cards:guides,body:new Element(),createElement:()=>new Element()},matchMedia:()=>motion,innerWidth:1440,innerHeight:900,scrollY:0,requestAnimationFrame:f=>f(),addEventListener(){},scrollTo(){},setTimeout:f=>f(),console};q('.stage').offsetHeight=900;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx);

const at=p=>{ctx.scrollY=3060*p;vm.runInContext('render()',ctx)};
at(0);assert.equal(q('.hero-name').style.color,'#48555f');const left=q('.hero-name').style.left;
at(.36);assert.equal(q('.hero-name').style.opacity,0);assert.equal(q('.hero-name').style.left,left);assert.equal(vm.runInContext('welcome.style.opacity',ctx),1);
at(.40);const start=q('.laptop').style.transform;at(.42);assert.notEqual(q('.laptop').style.transform,start);
at(.75);assert.equal(vm.runInContext('welcome.style.opacity',ctx),0);at(.36);assert.equal(vm.runInContext('welcome.style.opacity',ctx),1);
motion.matches=true;at(0);assert.equal(vm.runInContext('welcome.style.opacity',ctx),0);
const css=fs.readFileSync('styles.css','utf8');assert(css.includes('body.enhanced:not(.reading-mode):not(.motion-off) .intro{height:240vh;height:240svh}'));
console.log('PASS stationary metallic name, welcome entry/exit/reverse, uninterrupted zoom, reduced motion and compact intro');
assert.ok(fs.readFileSync(__dirname+'/app.js','utf8').includes('Welcome to my portfolio.'));
assert.ok(fs.readFileSync(__dirname+'/app.js','utf8').includes('Scroll to learn more about me and the systems I’ve built.'));
