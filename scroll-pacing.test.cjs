const assert=require('node:assert/strict'),fs=require('node:fs');
const {nextBoundary,createGestureState,advanceGesture,smoothStep}=require('./scroll-pacing.js');
const stops=[0,500,1800,2300,2800],state=createGestureState();
const move=(position,delta,time,newGesture=false)=>advanceGesture(state,{position,delta,time,stops,newGesture});
assert.equal(move(0,9000,0),500,'Large wheel initially stops at next section');
assert.equal(move(500,500,20),500);assert.equal(move(500,500,200),500,'Briefly holds boundary');
assert.equal(move(500,500,270),1000,'Continued trackpad stream releases without quiet gap');
assert.equal(move(1000,9000,290),1800,'Current long section end is still honored');
assert.equal(move(1800,9000,310),1800);assert.equal(move(1800,9000,520),1800);
assert.equal(move(1800,9000,560),2300,'Continuous input cannot trap the long-section end');
assert.equal(move(2300,-9000,570),1800,'Reverse interrupts immediately');
assert.equal(move(1800,-9000,900),500,'Fresh reverse traverses long content');
assert.equal(move(500,-9000,1200),0);
assert.equal(nextBoundary(stops,800,1),1800);assert.equal(nextBoundary(stops,800,-1),500);
const pending=createGestureState();advanceGesture(pending,{position:0,delta:9000,time:0,stops});
assert.equal(advanceGesture(pending,{position:300,delta:9000,time:500,stops}),500,'Burst before arrival ends there first');
let position=0;for(let i=0;i<500;i++){const next=smoothStep(position,1000,.016,600);assert(next-position<=9.601);assert(next>=position&&next<=1000);position=next;}
assert.equal(position,1000);assert(smoothStep(500,0,.016,600)<500);
// Reproduce a Mac trackpad that never gives the old 210ms quiet interval.
const continuous=createGestureState();position=0;
for(let time=0;time<8000;time+=16){const target=advanceGesture(continuous,{position,delta:120,time,stops});position=smoothStep(position,target,.016,2200);}
assert.equal(position,2800,'An uninterrupted eight-second scroll can reach the end');
for(let time=8000;time<16000;time+=16){const target=advanceGesture(continuous,{position,delta:-120,time,stops});position=smoothStep(position,target,.016,2200);}
assert.equal(position,0,'An uninterrupted reverse can return to the start');
const code=fs.readFileSync('scroll-pacing.js','utf8');assert(!code.includes("addEventListener('touchmove'"),'No touchmove interception');assert(code.includes("addEventListener('touchstart',cancel,{passive:true})"));assert(code.includes('nativeUntil=now+700'),'Stalled animation fails open to native wheel');
assert.equal(code,fs.readFileSync('dist/scroll-pacing.js','utf8'));
console.log('PASS finite boundary dwell, continuous trackpad progress, long sections, reversal, native touch, speed bounds and fail-open guard');
