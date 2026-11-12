const {applyCopyChanges}=require('./copy-cleanup-v75.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=f=>fs.readFileSync(f,'utf8');
const html=read('index.html'),css=read('reading-experience.css'),js=read('reading-experience.js'),before=applyCopyChanges(cp.execFileSync('git',['show','676b7dbbcfc9a3c736edc6fbe5b1535a7c58cf3c:index.html'],{encoding:'utf8'}));
const section=(s,id)=>s.match(new RegExp('<section id="'+id+'".*?</section>','s'))[0];
const withoutRequestedCopy=s=>s.replace(/<a class="contact-tile" data-contact="whatsapp".*?<\/a>/gs,'').replace('<p class="arrival-summary">I’m Naveen, a software engineer building enterprise applications, connected systems and independent products.</p>','');
assert.equal(html.match(/<template id="city-template".*?<\/template>/s)[0],withoutRequestedCopy(before.match(/<template id="city-template".*?<\/template>/s)[0]),'Only requested WhatsApp and arrival-summary removals change City markup');
for(const file of ['city-route.js','section-navigation.js'])assert.equal(read(file),cp.execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'}));
assert(!section(html,'about').includes('type-intro'));assert(section(html,'contact').includes('type-intro'));
assert(section(html,'contact').indexOf('type-intro')>section(html,'contact').indexOf('contact-links'));
for(const id of ['skills','experience','codetrail','lumicare','golivescore','wishlist','jobhunt','ai'])assert.equal(section(html,id),section(before,id),'Content preserved: '+id);
assert.match(css,/\.reading-mode main\{margin-top:0!important/);
assert.match(js,/requestAnimationFrame\(draw\)/);assert(!/setInterval/.test(js));assert.match(js,/document.querySelector\('dialog\[open\]'\)/);assert.match(js,/PortfolioScroll\?\.create/,'Reading uses bounded gesture pacing');assert(!/scroll-snap-type:y|scroll-snap-stop:always|scroll-margin-bottom:-/.test(css),'No forced snap or modal snap toggle');assert.match(css,/scroll-snap-type:none;scroll-behavior:auto/);
assert.match(js,/if\(!enabled\|\|document.hidden\|\|modalOpen/);assert.match(js,/if\(next===enabled\)return/);
assert.match(js,/history.replaceState/);assert.match(js,/aria-current/);assert.match(js,/ResizeObserver/);
assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/opacity:1!important;transform:none!important/);
for(const file of ['index.html','typing.js','reading-experience.css','reading-experience.js'])assert.equal(read(file),read('dist/'+file));
const {buildTimeline,stageState}=require('./reading-experience.js');
const timeline=buildTimeline([400,1300,500],600,800);
for(const chapter of timeline.chapters){
 for(const read of [0,chapter.overflow/2,chapter.overflow]){
  const state=stageState(timeline,chapter.start+read);
  assert.equal(state.states[state.active].enter,1,'Long chapters stay fully visible');
  assert.equal(state.states[state.active].read,read,'All long content stays reachable');
 }
}
assert(!/settleBoundary|settleTarget|pacing\?\.settle/.test(js),'Reading never requests automatic completion');
assert(js.includes('{opacity:1,shift:-item.read}'),'Handoffs have neither an opacity animation nor a slide');
console.log('PASS Reading flow, source/dist parity, unchanged City source, preserved content, contact typing placement, navigation, frame coalescing, instant chapter swaps and reduced motion.');
const sharedCardCSS=read('project-refinement.css');
const sharedSurface=sharedCardCSS.match(/\.project-refined \.project-topic-trigger\{[^}]*?background:([^;]+)/)[1];
const readingSurface=css.match(/\.reading-mode \.project-refined \.project-topic-trigger\{[^}]*?background:([^;]+)/)[1];
assert.equal(readingSurface,sharedSurface,'Reading cards restore the original translucent portfolio surface');
assert(!css.includes('#142019f7'),'Removed the nearly opaque Reading-only green modal background');
assert.match(css,/dialog\.project-reveal\{transform:none;transition:none\}/,'Reading modal teardown has no 3D animation');
console.log('PASS translucent portfolio surface parity and stable Reading dialog rendering');

assert.match(css,/reading-stage\{display:block;position:sticky;top:0/);
assert(!/reading-line-mask|reading-line-content|headline-shift/.test(css+js),'Titles have no independent roll or mask');
assert.match(js,/section.inert=!active/);assert(!js.includes('reading-layout-toggle'), 'Manual document toggle is removed');
assert.match(js,/pacing\?\.cancel/,'Explicit navigation resets paced input');
assert.match(js,/document.addEventListener\('close',\(\)=>\{queueMeasure\(\);request\(\);\}/,'Modal close never triggers a scroll write');
console.log('PASS fixed pinned stage, consistent chapter titles, inactive focus protection, document fallback and bounded input routing');

assert(!/splitHeadlines|replaceChildren|heading\.textContent|headings\.forEach/.test(js), 'Authored headline content and line breaks are not rewritten');

assert.match(css,/\.reading-mode #contact \.typed-role\{color:#15d65b;border:0;border-bottom:2px solid #137c38;padding:0 0 8px\}/,'Restore the original green typed-role underline');
