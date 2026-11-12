const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('reading-demo.js','utf8');
function fixture({popover=true,reading=true}={}){
 let doc;const observers=[],windowEvents={};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.style={};this.events={};this.className='';this.textContent='';this.tabIndex=0;this.disabled=false;this.scrollHeight=148;this.open=false;this.classList={contains:name=>this.className.split(' ').includes(name)};}
  append(...nodes){nodes.forEach(n=>{if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(c=>c!==n);n.parentElement=this;this.children.push(n);});}
  replaceWith(node){const p=this.parentElement,i=p.children.indexOf(this);p.children[i]=node;node.parentElement=p;this.parentElement=null;}
  closest(selector){for(let n=this;n;n=n.parentElement)if(n.tagName.toLowerCase()===selector)return n;return null;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key];}
  removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,callback){(this.events[type]??=[]).push(callback);}
  dispatchEvent(event){event.target=this;for(const cb of this.events[event.type]||[])cb(event);return true;}
  fire(type,values={}){const e={type,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...values};this.dispatchEvent(e);return e;}
  focus(){doc.activeElement=this;}
  matches(selector){return selector===':popover-open'&&this.open;}
  getBoundingClientRect(){return {left:30,right:270,top:450,bottom:494};}
 }
 if(popover){Element.prototype.showPopover=function(){this.open=true;this.fire('toggle',{newState:'open'});};Element.prototype.hidePopover=function(){this.open=false;this.fire('toggle',{newState:'closed'});};}
 const body=new Element('body');body.className=reading?'reading-mode':'';
 const originalLabel=new Element('label'),select=new Element('select'),run=new Element('button');select.id='scenario';select.value='success';select.options=[['success','Successful request'],['slow','Slow network'],['error','Service unavailable']].map(([value,textContent])=>({value,textContent}));originalLabel.append(select);body.append(originalLabel,run);
 doc={body,activeElement:body,readyState:'complete',querySelector:q=>q==='#engineering #scenario'?select:q==='#engineering #run'?run:null,createElement:tag=>new Element(tag),addEventListener(){}};
 const context={document:doc,HTMLElement:Element,MutationObserver:class{constructor(cb){this.cb=cb;}observe(el,options){observers.push({el,options,cb:this.cb});}},addEventListener:(type,cb)=>(windowEvents[type]??=[]).push(cb),innerWidth:1100,innerHeight:757,Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}},setTimeout:()=>1,clearTimeout(){}};
 const descendants=()=>{const all=[];function visit(e){all.push(e);e.children.forEach(visit);}visit(body);return all;};
 const find=className=>descendants().find(e=>e.className===className),findAll=className=>descendants().filter(e=>e.className===className);
 const notify=el=>observers.filter(o=>o.el===el).forEach(o=>o.cb());
 const execute=()=>vm.runInNewContext(source,context);execute();return {doc,body,select,run,find,findAll,notify,execute,windowEvents,originalLabel};
}
{
 const f=fixture({popover:false});assert.equal(f.select.parentElement,f.originalLabel);assert.equal(f.select.hidden,undefined);assert.equal(f.find('reading-scenario-picker'),undefined,'Native control remains when Popover is unsupported');
}
{
 const f=fixture(),trigger=f.find('reading-scenario-trigger'),panel=f.find('reading-scenario-panel'),items=f.findAll('reading-scenario-item');
 assert.equal(f.select.hidden,true);assert.equal(trigger.getAttribute('aria-haspopup'),'menu');assert.equal(items.length,3);assert.equal(items[0].getAttribute('aria-checked'),'true');
 f.execute();assert.equal(f.findAll('reading-scenario-picker').length,1,'Repeat-safe enhancement');
 trigger.fire('click');assert.equal(panel.open,true);assert.equal(f.doc.activeElement,items[0]);
 panel.fire('keydown',{key:'ArrowUp'});assert.equal(f.doc.activeElement,items[2]);panel.fire('keydown',{key:'Home'});assert.equal(f.doc.activeElement,items[0]);panel.fire('keydown',{key:'End'});assert.equal(f.doc.activeElement,items[2]);
 panel.fire('keydown',{key:'s'});assert.equal(f.doc.activeElement,items[0]);
 panel.fire('keydown',{key:'Escape'});assert.equal(panel.open,false);assert.equal(f.doc.activeElement,trigger);
 let changes=0;f.select.addEventListener('change',()=>changes++);trigger.fire('click');items[1].fire('click');assert.equal(f.select.value,'slow');assert.equal(changes,1);assert.equal(panel.open,false);assert.equal(f.doc.activeElement,trigger);assert.equal(items[1].getAttribute('aria-checked'),'true');
 trigger.fire('click');f.select.disabled=true;f.notify(f.select);assert.equal(trigger.disabled,true);assert.equal(panel.open,false);assert.ok(items.every(i=>i.disabled));trigger.fire('click');items[2].fire('click');assert.equal(f.select.value,'slow','Disabled picker cannot change scenario');assert.equal(changes,1);
 f.select.disabled=false;f.notify(f.select);assert.equal(trigger.disabled,false);trigger.fire('click');panel.fire('keydown',{key:'Tab',shiftKey:false});assert.equal(f.doc.activeElement,f.run);assert.equal(panel.open,false);
 trigger.fire('click');panel.fire('keydown',{key:'Tab',shiftKey:true});assert.equal(f.doc.activeElement,trigger);
 trigger.fire('click');assert.equal(panel.open,true);f.windowEvents.scroll[0]();assert.equal(panel.open,false,'Scroll closes an obsolete top-layer popup');
 f.select.value='error';f.select.fire('change');assert.equal(items[2].getAttribute('aria-checked'),'true');
 f.body.className='city-mode';f.notify(f.body);assert.equal(f.select.hidden,false);assert.equal(f.select.tabIndex,0);assert.equal(f.select.getAttribute('aria-hidden'),undefined);
 f.body.className='reading-mode';f.notify(f.body);assert.equal(f.select.hidden,true);
}
assert.equal(fs.readFileSync('dist/reading-demo.js','utf8'),source,'Source and deployed demo match');
assert.equal(fs.readFileSync('dist/reading-experience.css','utf8'),fs.readFileSync('reading-experience.css','utf8'));
for(const file of ['index.html','dist/index.html'])assert.equal((fs.readFileSync(file,'utf8').match(/src="reading-demo.js"/g)||[]).length,1);
console.log('Reading demo: fallback, single enhancement, native select contract, disabled-state mirroring, keyboard, focus, close and parity pass');
