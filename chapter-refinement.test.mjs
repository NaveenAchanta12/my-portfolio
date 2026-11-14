import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=f=>readFileSync(f,'utf8'),html=read('index.html'),js=read('showcase-layout.js'),css=read('chapter-refinement.css');
const hash=s=>createHash('sha256').update(s).digest('hex');
const original={"roles":["011e2020bf5d07920a67de12c4e6201f7afe66a5750081d7de8b18208cb46f15","950a380adeaa6c4e9e7559683e68e00190668060d2498bda118ea7daca278bc2","011e2020bf5d07920a67de12c4e6201f7afe66a5750081d7de8b18208cb46f15","950a380adeaa6c4e9e7559683e68e00190668060d2498bda118ea7daca278bc2"],"aiDetails":["ac8e348aeaafa2cb05787c8b20f607d58c8f58342c9781dcd6a79ed77e4f498f","c9964b8598cd2c47d65d8f971984088072802f8f435ce81a9c974fc2014eba78","27a28cfbdcfad8765d297a803d2446eed32205d67fb160109741d13e578c5f2e","8b16e68eeada5a28bc458ec45a5e5a1255b6736541d0521b1fe84b986b9d3d69"]};
assert.deepEqual([...html.matchAll(/<article class="employment"[^>]*>(.*?)<\/article>/gs)].map(m=>hash(m[1])),original.roles,'Reviewed employer wording, role-specific duties, and tool lists remain intact');
for(const match of [html.match(/<section id="ai".*?<\/section>/s),html.match(/<article[^>]*data-stop="ai".*?<\/article>/s)])assert.deepEqual([...match[0].matchAll(/<details.*?<\/details>/gs)].map(m=>hash(m[0])),original.aiDetails,'Reviewed AI details remain intact, with the current CodeTrail product consolidated');
assert(!/My foundations|id="education"|data-stop="education"|href="#education"|>Education<\/option>/.test(html));
assert.equal((html.match(/class="experience-study"/g)||[]).length,2);
assert(!html.includes('experience-entry experience-education'));
assert.match(js,/topic\(cards,'career-/);assert.match(js,/topic\(cards,name,context,'Engineering practices'/);
assert.match(js,/topic\(cards,name,context,'Agent workflows'/);assert.match(js,/topic\(cards,name,context,'AI in products'/);
assert.equal((js.match(/function topic\(/g)||[]).length,1,'One shared reveal implementation serves every chapter');
for(const name of ['showcase-layout.js','chapter-refinement.css','index.html','city-route.js','city-route-v18.js'])assert.equal(read(name),read('dist/'+name));
assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/max-width:370px/);assert.match(css,/max-height:550px/);
console.log('PASS compact study context, Foundations removed, all role and AI facts preserved, shared dialog implementation, responsive layouts, source/dist parity');

for(const [,note] of html.matchAll(/<li class="experience-study"[^>]*>(.*?)<\/li>/gs)){
 assert.match(note,/<span class="experience-date">/);
 assert.match(note,/<span class="study-kind">Education<\/span>/);
 assert.match(note,/Master of Science in Computer Science · Campbellsville University, Kentucky, USA/);
 assert(!/<h3|employment|experience-role/.test(note),'Education remains a small note, not another job');
}
assert.match(css,/\.experience-study:before\{[^}]*width:11px;height:11px;border:2px solid var\(--experience-accent\);border-radius:50%/);
assert.match(css,/left:-24px;width:10px;height:10px/);
console.log('PASS matching white timeline dots and date pills, precise degree line, small education label, responsive alignment');

assert(!html.includes('Built around context, validation and user control. No model runs on this portfolio page.'));
assert(js.includes("signature.textContent='Context. Validation. User control.'"),'The separate requested-to-keep signature remains');
console.log('PASS exact AI footnote removed from both views, separate signature preserved');
