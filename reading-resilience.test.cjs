const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('reading-experience.js','utf8'),css=fs.readFileSync('reading-experience.css','utf8');
const lifecycle=source.slice(source.indexOf('  function resetDocument(){'),source.indexOf('  function queueMeasure(){'));
function fixture({height=500,stageHeight=800,paintError=false}={}){
 const classes=new Set(['reading-pinned']);
 const element=()=>({inert:true,attributes:{inert:'', 'aria-hidden':'true'},classList:{remove(){}},style:{opacity:'0',transform:'translateY(-20px)',removeProperty(key){delete this[key];}},removeAttribute(key){delete this.attributes[key];}});
 const section=element(),content=element();content.offsetHeight=height;
 const box={console:{warn(){}},Number,Error,frame:1,measureFrame:2,pinned:true,enabled:true,timeline:null,viewport:0,safeTop:0,viewTop:0,scrollY:0,storyFailed:false,fitDocument:false,safeBottom:32,fittedChapters:new Set(),paintCaches:[{visible:true}],paintedReads:[20],sections:[section],contents:[content],stage:{clientHeight:stageHeight},document:{hidden:false},modalOpen:()=>false,cancelAnimationFrame(){},pacing:{cancel(){}},progressFill:{style:{}},modeButton:{setAttribute(key,value){this[key]=value;}},view:{style:{height:'1000px'},classList:{remove(...keys){keys.forEach(k=>classes.delete(k));},add(key){classes.add(key);},contains(key){return classes.has(key);}}},getComputedStyle:()=>({paddingTop:'120',paddingBottom:'32'}),buildTimeline:require('./reading-experience.js').buildTimeline};
 box.view.getBoundingClientRect=()=>({top:0});
 box.draw=()=>{assert(!classes.has('reading-stage-ready'),'First paint precedes readiness');if(paintError)throw Error('Injected paint failure');box.painted=true;return true;};
 vm.createContext(box);vm.runInContext(lifecycle+'\nmeasure();',box);return {box,classes,section,content};
}
const good=fixture();assert(good.box.painted);assert(good.classes.has('reading-stage-ready'));assert(good.box.pinned);
for(const options of [{height:0},{height:NaN},{height:Infinity},{stageHeight:0},{stageHeight:NaN},{paintError:true}]){
 const {box,classes,section,content}=fixture(options);
 assert(!box.pinned);assert.equal(box.timeline,null);assert.equal(classes.size,0);assert.equal(box.view.style.height,'');
 assert.equal(section.inert,false);assert(!('inert' in section.attributes));assert(!('aria-hidden' in section.attributes));assert(!('opacity' in section.style));assert(!('transform' in content.style));assert.equal(box.storyFailed,true);
}
// A later animation-frame failure must restore the document too, not only startup.
const later=fixture();later.box.stageState=()=>{throw Error('Injected ongoing paint failure');};
const drawSource=source.slice(source.indexOf('  function draw(){'),source.indexOf('  function request(){'));
vm.runInContext(drawSource+'\ndraw();',later.box);
assert(!later.box.pinned);assert.equal(later.classes.size,0);assert.equal(later.section.inert,false);
const {buildTimeline,stageState}=require('./reading-experience.js');
assert(source.includes('{opacity:1,shift:-item.read}'),'Paint has no opacity animation or handoff slide');
assert(!/settleBoundary|settleTarget|pacing\?\.settle|ease\(/.test(source),'Reading has no forced settlement or fading math');
const timeline=buildTimeline([400,1400,500],600,800);
for(let i=0;i<=1000;i++){
 const state=stageState(timeline,timeline.total*i/1000);
 assert.equal(state.states.filter(item=>item.enter===1).length,1,'One fully visible chapter exists at every position');
 assert.equal(state.states[state.active].enter,1,'Accessibility follows the visible chapter');
 for(const item of state.states)assert([0,1].includes(item.enter)&&item.exit===0,'No intermediate opacity states remain');
}
assert(css.includes('.reading-pinned.reading-stage-ready .reading-stage>.reading-scene{visibility:hidden;opacity:0;pointer-events:none}'));
assert(!source.includes('sections.at('));assert(source.includes('else media.addListener(motionChanged)'));assert(source.includes("addEventListener('pageshow',restoreLayout)"));
assert.equal(source,fs.readFileSync('dist/reading-experience.js','utf8'));assert.equal(css,fs.readFileSync('dist/reading-experience.css','utf8'));
console.log('PASS atomic first paint, zero/nonfinite geometry and paint-exception fail-open, full accessibility/style reset, single fully visible chapter without fades or settlement, restoration hooks, Safari API fallback and source/dist parity');
