const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('showcase-layout.js','utf8'),css=fs.readFileSync('project-refinement.css','utf8');
const clean=s=>s.replace(/<svg\b[\s\S]*?<\/svg>/g,'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const hrefs=s=>JSON.stringify([...s.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]));
assert.equal(hash(hrefs(html)),'4d1cdce84401e70c036d415235ec19f0d51c3fc2980aa0e2899fe1198bd46a5b','All reviewed destinations remain; the static Engineering lab navigation matches its chapter');
const guards={"city-controller.js":"017a03df304b06c87f02a148ca3a4c2045039dc4395e27a69c4625ad7d5b34ce","city-scene.js":"02b61bd24f8c12dfe941b6fefe01daa1d27a74015857d8f8b15764f509a8eaae","arrival-identity.mjs":"51d2ff48255aa279cc59ab55a1cae1ee214c414856d8ea1543ef220ab4bf7ad3","experience-timeline.css":"3e75cd79810f62485af086cb3183c975e4bbf2b3b47151557f1fce50bc0ca37c","showcase-layout.css":"0ee45c2bf4b8d694aa0f3e90ab2d610bc481ce519f2af473d3658edb6ded008c","contact-links.css":"a7856810403016503a5cefbfadb2ca96d54ea0ba08200ea3fbc080810241ec54","styles.css":"35bf941671776446c2510fb4d2d0a151f7914a17f87abc1ebe70dcd1cb62611b"};
for(const [file,digest] of Object.entries(guards))assert.equal(hash(fs.readFileSync(file)),digest,'Unrelated city/Experience/Tools behavior stays unchanged: '+file);
for(const a of html.matchAll(/<a\b[^>]*href="https:\/\/github.com\/[^\"]*"[^>]*>(.*?)<\/a>/gs)){
 assert.equal((a[1].match(/class="github-mark"/g)||[]).length,1);
 assert.match(a[1],/aria-hidden="true" focusable="false" fill="currentColor"/);
 const original=fs.readFileSync('assets/brand-marks/github-mark-24.svg','utf8').match(/<path d="([^"]+)"/)[1];
 assert(a[1].includes(original),'GitHub logo keeps the official unchanged geometry');
}
assert.equal((html.match(/class="github-mark"/g)||[]).length,8);
assert(!html.includes('https://github.com/Naveenachanta/NMAB'));
for(const f of ['index.html','showcase-layout.js','project-refinement.css','assets/brand-marks/github-mark-24.svg','assets/brand-marks/LICENSE','assets/brand-marks/PROVENANCE.md'])assert.equal(fs.readFileSync(f,'utf8'),fs.readFileSync('dist/'+f,'utf8'),'Source/dist parity: '+f);
assert.match(css,/max-width:700px/);assert.match(css,/max-width:360px/);assert.match(css,/max-height:550px/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/prefers-reduced-transparency/);assert.match(css,/focus-visible/);assert.match(css,/min-height:46px/);
assert(!/setInterval|requestAnimationFrame|fetch\(/.test(source),'No new runtime services or animation loops');
console.log('PASS reviewed source text and exact links, retained city/identity/toolkit behavior, eight official GitHub marks, licensing, responsive/keyboard/motion rules, no remote runtime dependency, source/dist parity');

// Modal content must stay in the document exactly once, with native keyboard semantics.
assert.match(source,/typeof HTMLDialogElement/);
assert.match(source,/dialog.showModal\(\)/);
assert.match(source,/dialog.close\(\)/);
assert.match(source,/aria-haspopup','dialog/);
assert.match(source,/aria-labelledby/);
assert.match(source,/event.preventDefault\(\);dismiss\('keyboard'\)/);
assert.match(source,/prefers-reduced-motion: reduce/);
assert.match(source,/event.stopPropagation\(\)/);
assert.match(source,/clearTimeout\(closeTimer\)/);
assert.match(source,/overview.append\(node\)/);
assert(!source.includes("topic('Project links'"));
assert(!source.includes("card.setAttribute('name'"));
assert(!source.includes('summary.scrollIntoView'));
assert(!source.includes('section.scrollTop+='));
assert(!css.includes('[open]>summary'));
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css,/overscroll-behavior:contain/);
assert.match(css,/body:has\(dialog.project-reveal\[open\]\)/);
assert.match(css,/pointer:fine/);
assert.match(css,/transform \.52s cubic-bezier/);
console.log('PASS compact non-reflowing card triggers, native modal semantics, reversible CSS reveal, reduced motion, no scroll-to-heading, no links card');

class Element{
 constructor(tag,text=''){this.tagName=tag;this.children=[];this.parentNode=null;this.className='';this._text=text;this.attributes={};this.events={};this.scrollTop=0;this.open=false;const self=this;this.classList={contains:c=>self.className.split(/\s+/).includes(c),add:c=>{if(!self.classList.contains(c))self.className+=' '+c;},remove:c=>{self.className=self.className.split(/\s+/).filter(x=>x!==c).join(' ');}};}
 set textContent(t){this._text=t;this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentNode=this;}}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){this.events[k]=fn;}
 getBoundingClientRect(){return this.bounds||{top:100,bottom:600};}
 focus(options){context.document.activeElement=this;this.focusOptions=options;}
 showModal(){this.open=true;this.showCalls=(this.showCalls||0)+1;}
 close(){this.open=false;this.closeCalls=(this.closeCalls||0)+1;this.events.close?.();}
 querySelectorAll(selector){return this.children.filter(n=>selector.split(',').some(sel=>{const s=sel.trim().replace(/^:scope > /,'');if(s==='details.project-detail')return n.tagName==='details'&&n.classList.contains('project-detail');if(s.startsWith('.'))return n.classList.contains(s.slice(1));return n.tagName===s;}));}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'");
const ids=['codetrail','golivescore','lumicare','wishlist','jobhunt'];
const sections=[],records=[];
for(const id of ids)for(const city of [false,true]){
 const regex=city?new RegExp('<article[^>]+data-stop="'+id+'".*?</article>','s'):new RegExp('<section id="'+id+'".*?</section>','s');
 const markup=html.match(regex)[0],section=new Element(city?'article':'section');section.className='project-showcase'+(city?' city-stop':'');
 for(const [tag,cls,re] of [['h2','',/<h2>(.*?)<\/h2>/s],['p','project-meta',/<p class="project-meta[^\"]*">(.*?)<\/p>/s],['p','project-lede',/<p class="project-lede">(.*?)<\/p>/s],['div','project-actions',/<div class="project-actions"[^>]*>(.*?)<\/div>/s],['p','project-scope-note',/<p class="project-scope-note">(.*?)<\/p>/s],['p','link-pending',/<p class="link-pending">(.*?)<\/p>/s]]){const m=markup.match(re);if(m){const n=new Element(tag,decode(m[1]));n.className=cls;section.append(n);}}
 const originalLede=section.querySelector('.project-lede').textContent,actions=section.querySelector('.project-actions');
 const bodies=[];
 for(const [,inside] of markup.matchAll(/<details class="city-detail project-detail">(.*?)<\/details>/gs)){
  const detail=new Element('details');detail.className='project-detail';const label=new Element('summary',decode(inside.match(/<summary>(.*?)<\/summary>/s)[1]));const body=new Element('div',decode(inside.slice(inside.indexOf('<div class="project-detail-body">'))));body.className='project-detail-body';bodies.push(body);detail.append(label,body);section.append(detail);
 }
 sections.push(section);records.push({section,city,originalLede,bodies,actions});
}

const enhancement=source.slice(source.indexOf(" if(typeof HTMLDialogElement"),source.lastIndexOf('\n}\nif(document.readyState'));
let reduced=false,timerSequence=0;const timers=new Map();
const context={HTMLDialogElement:function(){},matchMedia:()=>({matches:reduced}),setTimeout:fn=>{timers.set(++timerSequence,fn);return timerSequence;},clearTimeout:id=>timers.delete(id),document:{body:new Element('body'),createElement:t=>new Element(t),querySelectorAll:s=>s==='.project-showcase'?sections:[]}};
vm.runInNewContext('(()=>{'+enhancement+'})()',context);
function collect(node,predicate){return [...(predicate(node)?[node]:[]),...node.children.flatMap(n=>collect(n,predicate))];}
const dialogIds=[];
for(const {section,city,originalLede,bodies,actions} of records){
 const layout=section.querySelector('.project-layout'),intro=layout.querySelector('.project-overview'),cards=layout.querySelector('.project-topics');
 assert.equal(cards.children.length,3);assert.deepEqual(cards.children.map(c=>c.children[0].children[1].textContent),['What I built','Tech stack','Technical details']);
 assert.equal(collect(intro,n=>n===actions).length,actions?1:0,'Available original actions live once beneath About');
 assert.equal(collect(cards,n=>n===actions).length,0,'Cards contain no actions');
 for(const body of bodies)assert.equal(collect(cards,n=>n===body).length,1,'Every original detail body is preserved once');
 const remaining=collect(cards,n=>n.classList.contains('project-about-continuation'))[0]?.textContent;
 assert.equal(intro.querySelector('.project-lede').textContent+(remaining?' '+remaining:''),originalLede,'About copy stays complete');
 for(const card of cards.children){
  const trigger=card.children[0],dialog=card.children[1],header=dialog.children[0],close=header.children[3],content=dialog.children[1];
  dialogIds.push(dialog.id);assert.equal(trigger.tagName,'button');assert.equal(trigger.type,'button');assert.equal(dialog.tagName,'dialog');assert(!dialog.open);
  assert.equal(trigger.attributes['aria-controls'],dialog.id);assert.equal(trigger.attributes['aria-haspopup'],'dialog');assert.equal(dialog.attributes['aria-labelledby'],header.children[2].id);assert.equal(close.autofocus,true);assert.equal(content.tabIndex,0);
  content.scrollTop=90;trigger.events.click();assert(dialog.open);assert(dialog.classList.contains('is-revealed'));assert.equal(content.scrollTop,0);
  trigger.events.click();assert.equal(dialog.showCalls,1,'Repeated trigger never creates a second modal');
  let prevented=false;dialog.events.cancel({preventDefault:()=>prevented=true});assert(prevented);assert(!dialog.classList.contains('is-revealed'));assert(dialog.open,'Exit motion happens before closing');assert.equal(timers.size,1);
  close.events.click();assert.equal(timers.size,1,'Repeated close does not schedule extra work');
  dialog.events.transitionend({target:dialog,propertyName:'opacity'});assert(dialog.open);
  dialog.events.transitionend({target:dialog,propertyName:'transform'});assert(!dialog.open);assert.equal(timers.size,0);assert.equal(context.document.activeElement,trigger);assert(trigger.classList.contains('project-keyboard-focus'));
  reduced=true;trigger.events.click();close.events.click();assert(!dialog.open);assert.equal(timers.size,0,'Reduced motion closes immediately');assert.equal(context.document.activeElement,trigger);assert(trigger.classList.contains('project-pointer-focus'));assert.equal(trigger.focusOptions.preventScroll,true);trigger.events.keydown();assert(!trigger.classList.contains('project-pointer-focus'));reduced=false;
  trigger.events.click();dialog.bounds={left:10,right:100,top:10,bottom:100};dialog.events.click({target:dialog,clientX:50,clientY:50});assert(dialog.classList.contains('is-revealed'),'Padding clicks do not dismiss');dialog.events.click({target:dialog,clientX:5,clientY:50});assert(!dialog.classList.contains('is-revealed'));
  [...timers.values()][0]();assert(!dialog.open);assert.equal(timers.size,0,'Timer fallback closes if transitionend is interrupted');
  let stops=0;for(const type of ['wheel','touchstart','touchmove','keydown'])dialog.events[type]({stopPropagation:()=>stops++});assert.equal(stops,4);
 }
 for(const pointerType of ['mouse','touch','pen']){
  const trigger=cards.children[0].children[0],dialog=cards.children[0].children[1],close=dialog.children[0].children[3];
  reduced=true;trigger.events.pointerdown({pointerType});trigger.events.click({detail:1,pointerType});close.events.click({detail:1,pointerType});
  assert.equal(context.document.activeElement,trigger);assert(trigger.classList.contains('project-pointer-focus'),pointerType+' closes without a residual ring');
  trigger.events.blur();assert(!trigger.classList.contains('project-pointer-focus'));
  trigger.events.click({detail:0});close.events.click({detail:0});assert(trigger.classList.contains('project-keyboard-focus'),'Keyboard-activated close button retains an explicit ring');reduced=false;
 }
 assert.equal(section.scrollTop,0,'No project-scroll adjustment on reveal');
}
assert.equal(new Set(dialogIds).size,30,'All dialog labels and control IDs are unique across City and Reading');
vm.runInNewContext('(()=>{'+enhancement+'})()',context);assert(sections.every(s=>s.querySelectorAll('.project-layout').length===1),'Enhancement is repeat-safe');
console.log('PASS all ten projects / thirty dialogs, exact content and actions retained once, keyboard/Escape semantics, repeat and interrupted closing, backdrop bounds, reduced-motion immediate close, unique IDs, event isolation, no scroll mutation');

const triggerSurface=css.match(/\.project-refined \.project-topic-trigger\{[^}]*?background:([^;]+)/)[1];
const revealSurface=css.match(/\.project-refined dialog\.project-reveal\{[^}]*?background:([^;]+)/)[1];
assert.equal(revealSurface,triggerSurface,'Revealed card uses exactly the approved closed-card translucent surface');
assert.match(css,/width:min\(540px,calc\(100vw - 48px\)\)/);
assert.match(css,/max-height:min\(66dvh,480px\)/);
assert.match(css,/max-height:min\(68dvh,520px\)/);
assert(!css.includes('#354451e8'));
console.log('PASS identical trigger/reveal glass surface, smaller desktop and phone bounds, opaque panel removed');

// Reading closes synchronously with no animation timeout or forced page scroll.
context.document.body.classList.add('reading-mode');
for(const section of sections){
 const cards=section.querySelector('.project-layout').querySelector('.project-topics');
 for(const card of cards.children){
  const trigger=card.children[0],dialog=card.children[1],close=dialog.children[0].children[3];
  for(let i=0;i<5;i++){
   trigger.events.click();assert(dialog.open);close.events.click({detail:i%2});
   assert(!dialog.open);assert.equal(timers.size,0);assert.equal(context.document.activeElement,trigger);assert.equal(trigger.focusOptions.preventScroll,true);
  }
  trigger.events.click();dialog.events.close();assert(dialog.classList.contains('is-revealed'),'A queued earlier close event does not hide a reopened card');
  dialog.events.cancel({preventDefault(){}});assert(!dialog.open);assert.equal(timers.size,0);
 }
}
console.log('PASS Reading immediate close, repeated reopen, queued native close guard, focus restoration and no deferred closing work');
