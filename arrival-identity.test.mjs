import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createArrivalIdentity,arrivalIdentityProgress,ARRIVAL_IDENTITY_END} from './arrival-identity.mjs';
let reads=0;
class Element {
 constructor(text='',x=0,y=0,size=60) {this.textContent=text;this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v}};this.rect={left:x,top:y};this.glyph={left:x,top:y-3};this.computed={fontSize:String(size),lineHeight:String(size*1.03),letterSpacing:String(-size*.05),fontWeight:'400',color:'rgb(255,247,233)',fontFamily:'Helvetica Neue, Arial, sans-serif'};this.classes=new Set;this.classList={toggle:(c,b)=>b?this.classes.add(c):this.classes.delete(c)};}
 append(el){this.children.push(el)} setAttribute(k,v){this.attrs[k]=v}
 getBoundingClientRect(){reads++;return this.rect} querySelector(s){return this.lookup?.[s]||null}
}
globalThis.document={createElement:()=>{throw Error('The title must not be copied')},createRange:()=>({selectNodeContents(el){this.el=el},getBoundingClientRect(){return this.el.glyph}})};let resize;
globalThis.addEventListener=(event,fn)=>{if(event==='resize')resize=fn};
globalThis.getComputedStyle=el=>el.computed;
const name=new Element('Naveen Achanta',100,230,60),role=new Element('Software Engineer',100,291.8,60),headerName=new Element('Naveen Achanta',70,22,19),headerRole=new Element('Software Engineer',70,53,8),heading=new Element,header=new Element,body=new Element,introduction=new Element,actions=new Element;
heading.children=[name,role];header.lookup={strong:headerName,span:headerRole};introduction.lookup={'.arrival-actions':actions};
headerName.glyph.top=26;headerRole.glyph.top=54;
const controller=createArrivalIdentity({header,heading,introduction,body});
const at=(progress,introProgress=1,extra={})=>controller.update({progress,introProgress,reading:false,reduced:false,...extra});
for(const introProgress of [0,.4,.55,.76,.85,1]) {at(0,introProgress);assert.equal(heading.style.opacity,'');assert.equal(name.style.transform,'');assert(header.inert);assert(body.classes.has('arrival-identity-pending'));}
assert.equal(body.children.length,0,'No replica or handoff layer');assert.equal(reads,0);
at(.003);assert.equal(name.style.transform,'');
at(.00300001);assert.equal(heading.style.opacity,'');assert.equal(reads,4);assert.equal(name.style.fontSize,undefined);assert.equal(name.style.fontWeight,undefined);assert.match(name.style.transform,/scale\(1\)/);
at(.0315);assert.equal(heading.style.opacity,'');assert(header.inert);assert(actions.inert);assert.equal(introduction.style['--arrival-details-opacity'],'0');assert.equal(reads,4);
const forward=[name,role].map(l=>l.style.transform);
for(let i=0;i<120;i++)at(.005+i*.0004);assert.equal(reads,4,'Geometry is cached throughout motion');
at(.0315);assert.deepEqual([name,role].map(l=>l.style.transform),forward,'Reverse scroll is deterministic');
at(ARRIVAL_IDENTITY_END);assert.equal(heading.style.opacity,'0');assert(!header.inert);assert(!body.classes.has('arrival-identity-pending'));
assert.equal(arrivalIdentityProgress(.05995),1,'Fractional endpoint settles');
for(const el of [name,role]){assert.equal(el.style.fontSize,undefined,'Never re-shape at new font sizes');assert.equal(el.style.fontWeight,undefined,'Never switch system font weights');}
at(.09);at(1);assert(!header.inert);
at(.0315);assert.deepEqual([name,role].map(l=>l.style.transform),forward);at(0);assert.equal(heading.style.opacity,'');assert.equal(name.style.transform,'');assert(!actions.inert);
resize();at(.0315);assert.equal(reads,8,'Resize refreshes untransformed geometry once');
at(.0315,1,{reading:true});assert(!header.inert);assert.equal(heading.style.opacity,'');assert.equal(name.style.transform,'');assert(!actions.inert);
at(.0315,1,{reduced:true});assert(!header.inert);assert.equal(name.style.transform,'');
at(.02,.55);assert.equal(name.style.transform,'');assert.equal(heading.style.opacity,'','The laptop retains its actual title');
for(const file of ['index.html','styles.css','city-controller.js','arrival-identity.mjs'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('dist/'+file,'utf8'));
const html=fs.readFileSync('index.html','utf8');assert(!html.includes('Thoughtful software.'));assert(!html.includes('Built for real use.'));assert(html.includes('class="arrival-role">Software Engineer'));
const css=fs.readFileSync('styles.css','utf8');assert.match(css,/wordmark strong,\.city-enabled \.wordmark span\{white-space:nowrap\}/);assert.match(css,/\.city-enabled \.wordmark\{font-weight:400\}/,'Same font face at header destination');
const contact=fs.readFileSync('city-controller.js','utf8');assert(contact.includes('contactName.style.lineHeight'));assert(contact.includes('contactRole.style.lineHeight'));assert(contact.includes('contactName.style.fontWeight=style.fontWeight'));
// Exercise the real mode-switch function without starting the renderer. Returning
// from a resized Reading view must not measure its hidden/stale city surface.
const modeEvents=[],scheduled=[],modeClasses=new Set;
const modeNode={setAttribute(){},focus(){}};
const modeContext={
 reading:false,savedProgress:0,current:.0315,frame:1,navigation:{},
 readTarget:()=>.0315,window:{introProgress:1},reduced:{matches:false},
 body:{classList:{toggle(name,on){on?modeClasses.add(name):modeClasses.delete(name);modeEvents.push(['class',on]);}}},
 arrivalIdentity:{
  invalidate(){modeEvents.push(['invalidate']);},
  update({reading}){modeEvents.push(['identity',reading,modeClasses.has('reading-mode')]);}
 },
 updateContactIdentity(){modeEvents.push(['contact']);},
 document:{querySelectorAll:()=>[]},$:()=>modeNode,portal:{setAttribute(){}},
 cancelAnimationFrame(){},scrollTo({top}){modeEvents.push(['scroll',top]);},
 requestAnimationFrame(callback){scheduled.push(callback);},
 metrics:()=>({start:100,distance:1000}),wake(){modeEvents.push(['wake']);}
};
const setReadingSource=contact.split('\n').find(line=>line.startsWith('function setReading(value)'));
assert(setReadingSource,'Reading-mode controller exists');
vm.runInNewContext(`${setReadingSource}\nsetReading(true);setReading(false);`,modeContext);
assert.deepEqual(modeEvents.slice(0,3),[['class',true],['invalidate'],['identity',true,true]],'Apply Reading layout and invalidate before the immediate reset');
assert.deepEqual(modeEvents.filter(event=>event[0]==='identity'),[['identity',true,true]],'Do not measure the city before its return frame');
assert.equal(modeEvents.filter(event=>event[0]==='invalidate').length,2,'Invalidate both mode transitions, including resize in Reading view');
assert(!modeClasses.has('reading-mode'),'Restore visible city layout before the return frame');
assert.equal(scheduled.length,1,'Return to city is deferred until layout can be synchronized');
scheduled[0]();
assert.deepEqual(modeEvents.slice(-2),[['scroll',131.5],['wake']],'Restore saved scroll before waking the renderer and identity measurement');
console.log('PASS original identity nodes, immutable font size/weight, glyph alignment, forward/reverse/replay, resizing, reading/reduced-motion, Reading return ordering, cached geometry, Contact starting typography and source/dist parity');
