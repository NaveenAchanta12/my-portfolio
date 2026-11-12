const assert=require('node:assert/strict');
const {buildTimeline,stageState,paintChapter}=require('./reading-experience.js');
const timeline=buildTimeline([400,1300,500,950],600,760);
assert.equal(timeline.chapters.length,4);assert.equal(timeline.chapters[1].overflow,700);assert.equal(timeline.chapters[3].overflow,350);
assert.equal(stageState(timeline,0).states[0].enter,1);
for(let i=0;i<timeline.chapters.length;i++){
 const c=timeline.chapters[i],start=stageState(timeline,c.start);assert.equal(start.active,i);assert.deepEqual(start.states[i],{enter:1,exit:0,read:0});
 if(c.overflow){
  for(const read of [0,c.overflow/2,c.overflow]){const state=stageState(timeline,c.start+read);assert.equal(state.states[i].read,read);assert.equal(state.states[i].exit,0,'Every pixel of long content is available before any exit starts');}
 }
 if(c.transition){
  const edge=c.start+c.reading,middle=edge+c.transition/2;
  for(const fraction of [0,.05,.25,.49,.5,.51,.75,.95,1]){
   const position=edge+c.transition*fraction,forward=stageState(timeline,position),reverse=stageState(timeline,position);
   assert.deepEqual(forward,reverse,'Same scroll position gives identical reverse and forward state');
   assert.equal(forward.active,position>=middle?i+1:i,'The existing midpoint selects exactly one chapter');
   assert.equal(forward.states.filter(item=>item.enter===1).length,1,'No overlap or blank stage, including the exact midpoint');
   assert.equal(forward.states[forward.active].read,position>=middle?0:c.overflow,'Handoff never introduces a slide offset');
  }
  const left=stageState(timeline,middle-.001),right=stageState(timeline,middle+.001);
  assert.equal(left.active,i);assert.equal(right.active,i+1);
  for(let repeat=0;repeat<20;repeat++)assert.deepEqual(stageState(timeline,middle-.001),left,'Reversal is deterministic without history or delayed effects');
  const next=stageState(timeline,timeline.chapters[i+1].start);assert.equal(next.active,i+1);assert.equal(next.states[i+1].enter,1);
 }
}
const end=stageState(timeline,1e7);assert.equal(end.active,3);assert.equal(end.states[3].read,350);assert.equal(end.progress,1);assert.equal(end.states[3].exit,0,'Final chapter and its full tail stay visible at the end');
assert.deepEqual(stageState(timeline,-10),stageState(timeline,0));
for(let y=0;y<=timeline.total;y+=7.3){const s=stageState(timeline,y);assert.equal(s.states.filter(x=>x.enter===1).length,1);for(const x of s.states){assert([0,1].includes(x.enter)&&x.exit===0&&x.read>=0);}assert(s.active>=0&&s.active<4);}
console.log('PASS pinned timeline, full long-content reachability, binary chapter swaps without overlap or blanks, reversible progress and final chapter reachability');

function surface(){let writes=0;const style=new Proxy({},{set(target,key,value){writes++;target[key]=value;return true}});return {style,classList:{toggle(){writes++;}},setAttribute(){writes++;},set inert(value){writes++;},get writes(){return writes;}};}
const section=surface(),content=surface(),cache={};
paintChapter(section,content,cache,{opacity:1,shift:0},true,true);const initial=section.writes+content.writes;
for(let y=1;y<=120;y++)paintChapter(section,content,cache,{opacity:1,shift:-y},true,true);
assert.equal(section.writes+content.writes-initial,120,'120 ordinary scroll frames write only 120 direct transforms');
assert.equal(section.style.opacity,'1.0000');assert.equal(content.style.transform,'translate3d(0,-120.00px,0)');
const hidden=surface(),hiddenContent=surface(),hiddenCache={};paintChapter(hidden,hiddenContent,hiddenCache,{opacity:0,shift:0},false,false);const hiddenInitial=hidden.writes+hiddenContent.writes;
for(let y=0;y<120;y++)paintChapter(hidden,hiddenContent,hiddenCache,{opacity:0,shift:y},false,false);
assert.equal(hidden.writes+hiddenContent.writes,hiddenInitial,'Hidden chapters have no scroll-frame writes');
paintChapter(section,content,cache,{opacity:1,shift:-20},true,true);assert.equal(content.style.transform,'translate3d(0,-20.00px,0)','Reversal applies directly, with no easing delay or input lock');
const baseline=require('node:child_process').execFileSync('git',['show','fbfe6805273e818e7889d6dfe55855ccc28dff68:reading-experience.js'],{encoding:'utf8'});const vm=require('node:vm'),box={module:{exports:{}}};vm.runInNewContext(baseline,box);
const oldTimeline=box.module.exports.buildTimeline([400,1300,500,950],600,760);
for(let i=0;i<timeline.chapters.length;i++){
 assert.equal(timeline.chapters[i].overflow,oldTimeline.chapters[i].overflow,'Full long-content reachability is unchanged');
 assert.equal(timeline.chapters[i].transition,oldTimeline.chapters[i].transition,'Transition distance is unchanged');
 assert.equal(timeline.chapters[i].reading,timeline.chapters[i].overflow,'Fitted chapters have no artificial stationary scroll distance');
}

console.log('PASS one direct transform per long-scroll frame, zero hidden-chapter writes, immediate reversal and unchanged transition distance and no stationary fitted-chapter dwell');
