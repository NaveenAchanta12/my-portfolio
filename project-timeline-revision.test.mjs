import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stops} from './city-route.js';
const read=f=>readFileSync(f,'utf8'),html=read('index.html'),css=read('project-refinement.css'),js=read('showcase-layout.js');
const projects=['codetrail','lumicare','golivescore','wishlist','jobhunt'];
assert.deepEqual(stops.slice(3,8).map(s=>s.id),projects);
for(const kind of ['reading','city']){
 const ids=kind==='reading'?[...html.matchAll(/<section id="([^"]+)"[^>]*project-showcase/g)].map(m=>m[1]):[...html.matchAll(/<article[^>]*project-showcase[^>]* data-stop="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,projects,kind+' project order');
}
assert.match(html,/<option value="0\.45">Lumicare<\/option><option value="0\.54">GoLivescore<\/option>/);
assert.match(html,/<a href="#codetrail">CodeTrail<\/a><a href="#lumicare">Lumicare<\/a><a href="#golivescore">GoLivescore<\/a>/);
const city=read('city-route-v18.js');
assert.match(city,/id:'lumicare',p:0\.45,index:12/);assert.match(city,/id:'golivescore',p:0\.54,index:15/);
for(const id of ['golivescore','jobhunt']){
 assert.match(html,new RegExp('<section id="'+id+'" class="[^"]*project-stack-right'));
 assert.match(html,new RegExp('<article class="[^"]*project-stack-right" data-stop="'+id+'"'));
}
const layout=css.slice(css.indexOf('/* Selected chapters'));
assert.match(layout,/display:flex;flex-direction:column;align-items:stretch/);
assert.match(layout,/left:auto;right:7%;width:min\(620px,49vw\)/);
assert.match(layout,/@media\(max-width:700px\)/);
assert(!/font-size/.test(layout),'The new layouts never reduce the existing type sizes');
const timelines=[...html.matchAll(/<ol class="experience-timeline"[^>]*>(.*?)<\/ol>/gs)].map(m=>m[1]);
assert.equal(timelines.length,2);assert.equal(timelines[0],timelines[1]);
const timeline=timelines[0];
assert.deepEqual([...timeline.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1]),['Deloitte','Prudential']);
const education=timeline.match(/<li class="experience-study"[^>]*>(.*?)<\/li>/s)[1];
assert.match(education,/<time datetime="2022">2022<\/time>/);assert.match(education,/<time datetime="2023">2023<\/time>/);
assert.match(education,/<span class="study-kind">Education<\/span>/);assert.match(education,/<span class="experience-date">/);assert(!education.includes("<h3>"));
assert.match(education,/Master of Science in Computer Science/);assert.match(education,/Kentucky, USA/);
assert(!/202[23]-\d\d|full.time|career break/i.test(education),'No unsupported months or study/employment status');
assert.match(html,/Career and education timeline, most recent first/);
assert.match(js,/clearRestoredFocus\(\);trigger.focus\(\{preventScroll:true\}\);\s+dialog.showModal/);
assert.match(js,/closeInput==='pointer'\?'project-pointer-focus':'project-keyboard-focus'/);
assert.match(js,/trigger.addEventListener\('blur',clearRestoredFocus\)/);
assert.match(js,/trigger.addEventListener\('keydown',clearRestoredFocus\)/);
assert.match(css,/project-pointer-focus:focus\{outline:none/);assert.match(css,/project-keyboard-focus:focus\{outline:2px solid #fff/);
for(const f of ['index.html','city-route.js','city-route-v18.js','project-refinement.css','experience-timeline.css','showcase-layout.js'])assert.equal(read(f),read('dist/'+f));
console.log('PASS project order in route/nav/views/3D labels, stacked right layout with unchanged fonts, truthful and identical education timeline, pointer/keyboard focus return rules, source/dist parity');
